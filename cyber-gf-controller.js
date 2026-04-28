#!/usr/bin/env node
const fs = require('fs');
const { getConfig, ENV_PATH, validateConfig } = require('./cyber-gf-config');
const {
  loadState,
  saveState,
  clearState,
  setModeEnabled,
  incrementSessionCount,
  applyTurnResult,
  setDebugEnabled,
  isDebugEnabled,
  storeLastGeneratedAudio
} = require('./cyber-gf-state');
const { buildInitialState, validateInitialProfile } = require('./cyber-gf-profile');
const { validateTurnOutput, createFallbackTurnOutput } = require('./cyber-gf-turn');
const { generateTtsAudio, generateFromLastTurn, probeTtsChain } = require('./cyber-gf-tts');
const { buildInitialProfileAgentPrompt, buildTurnAgentPrompt } = require('./cyber-gf-prompts');

function getHistoryPath() {
  return getConfig().historyFile;
}

function loadHistory() {
  try {
    const HISTORY_PATH = getHistoryPath();
    if (!fs.existsSync(HISTORY_PATH)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  const HISTORY_PATH = getHistoryPath();
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history.slice(-40), null, 2));
}

function appendHistory(role, text) {
  const history = loadHistory();
  history.push({ role, text, timestamp: new Date().toISOString() });
  saveHistory(history);
}

function getRecentContext(limit = 4) {
  return loadHistory().slice(-limit).map(({ role, text }) => ({ role, text }));
}

function formatStatus(state) {
  return [
    '💗 赛博女友状态',
    '========================',
    `已开启: ${state.mode.enabled ? '是' : '否'}`,
    `人设摘要: ${state.profile.profileSummary || '暂无'}`,
    `关系摘要: ${state.revealedMemory.lastSummary || '暂无'}`,
    `关系温度: ${state.dynamicState.relationshipWarmth}`,
    `安全感: ${state.dynamicState.safety}`,
    `信任感: ${state.dynamicState.trust}`,
    `主动靠近意愿: ${state.dynamicState.approachDesire}`,
    `暴露意愿: ${state.dynamicState.vulnerabilityWillingness}`,
    `语音自然度: ${state.dynamicState.voiceEase}`,
    `最近未解情绪: ${state.shortTermState.unresolvedEmotion}`,
    '========================'
  ].join('\n');
}

function buildTurnDebugInfo(turnOutput) {
  const state = loadState();
  const cfg = getConfig();
  if (!(isDebugEnabled(state) || cfg.debug.enabled)) return null;
  const lines = ['[cyber-gf debug]'];
  lines.push(`currentEmotion: ${turnOutput.currentEmotion}`);
  lines.push(`sendVoiceNow: ${turnOutput.sendVoiceNow ? 'true' : 'false'}`);
  if (cfg.debug.showTtsControls) {
    lines.push(`taggedTtsText: ${turnOutput.taggedTtsText}`);
    lines.push(`naturalStylePrompt: ${turnOutput.naturalStylePrompt}`);
  }
  return lines.join('\n');
}

function setCyberGfDebug(flag) {
  const state = loadState();
  const base = state || {
    version: 1,
    runtimeCache: { debug: { enabled: false } }
  };
  const next = saveState(setDebugEnabled(base, flag));
  return {
    kind: 'debug_toggle',
    state: next,
    visibleText: `cyber-gf debug 已${flag ? '开启' : '关闭'}。`
  };
}

function getLastVoiceDeliveryInfo() {
  const state = loadState();
  if (!state?.runtimeCache?.lastTurnTts?.taggedTtsText) {
    return {
      kind: 'voice_delivery_info',
      visibleText: '当前没有可发送的最近一轮语音缓存。'
    };
  }
  return {
    kind: 'voice_delivery_info',
    visibleText: [
      '[cyber-gf voice delivery]',
      'Telegram 语音条发送建议：使用 message 工具发送最近生成的音频文件，并设置 asVoice=true。',
      '这样比普通 MEDIA 附件更接近原生语音条。',
      '',
      '注意：是否显示为语音条，核心取决于发送接口语义，而不只是文件扩展名。'
    ].join('\n')
  };
}

function getLastGeneratedAudioInfo() {
  const state = loadState();
  const audio = state?.runtimeCache?.lastGeneratedAudio;
  if (!audio?.filepath) {
    return {
      kind: 'audio_info',
      visibleText: '当前还没有最近生成的语音文件记录。'
    };
  }
  return {
    kind: 'audio_info',
    visibleText: [
      '[cyber-gf last audio]',
      `filename: ${audio.filename}`,
      `filepath: ${audio.filepath}`,
      `size: ${audio.size}`,
      `createdAt: ${audio.createdAt}`
    ].join('\n')
  };
}

function buildVoiceSendPayloadFromAudio(audio, target = 'telegram:8121382159') {
  if (!audio?.filepath) return null;
  return {
    action: 'send',
    channel: 'telegram',
    target,
    targets: [target],
    accountId: 'default',
    dryRun: false,
    message: '',
    media: audio.filepath,
    filename: audio.filename || '',
    caption: '',
    asVoice: true,
    silent: false,
    bestEffort: false
  };
}

function getTelegramVoiceSendPayload(target = 'telegram:8121382159') {
  const state = loadState();
  const audio = state?.runtimeCache?.lastGeneratedAudio;
  if (!audio?.filepath) {
    return {
      kind: 'voice_send_payload',
      visibleText: '当前还没有最近生成的语音文件记录。'
    };
  }
  return {
    kind: 'voice_send_payload',
    payload: buildVoiceSendPayloadFromAudio(audio, target)
  };
}

function buildUnifiedDelivery(turnOutput, options = {}) {
  const state = loadState();
  const debugText = buildTurnDebugInfo(turnOutput);
  const target = options.target || 'telegram:8121382159';
  const audio = state?.runtimeCache?.lastGeneratedAudio;
  const voicePayload = turnOutput.sendVoiceNow ? buildVoiceSendPayloadFromAudio(audio, target) : null;

  return {
    mode: voicePayload ? 'voice_note' : 'text_reply',
    text: debugText ? `${turnOutput.visibleText}\n\n${debugText}` : turnOutput.visibleText,
    sendVoiceNow: !!turnOutput.sendVoiceNow,
    voicePayload,
    shouldReplyInChat: !voicePayload,
    shouldNoReplyAfterMessageSend: !!voicePayload,
    debugText: debugText || null
  };
}

function buildStartDelivery(openingMessage) {
  return {
    mode: 'text_reply',
    text: openingMessage,
    sendVoiceNow: false,
    voicePayload: null,
    shouldReplyInChat: true,
    shouldNoReplyAfterMessageSend: false,
    debugText: null
  };
}

function getLastTurnDebug() {
  const state = loadState();
  if (!state) {
    return {
      kind: 'debug',
      visibleText: '当前没有赛博女友状态记录。'
    };
  }
  const last = state.runtimeCache?.lastTurnTts;
  if (!last || !last.visibleText) {
    return {
      kind: 'debug',
      visibleText: '当前还没有最近一轮的语音调试信息。'
    };
  }
  return {
    kind: 'debug',
    visibleText: [
      '[cyber-gf debug]',
      `visibleText: ${last.visibleText}`,
      `currentEmotion: ${last.currentEmotion}`,
      `sendVoiceNow: ${last.sendVoiceNow ? 'true' : 'false'}`,
      `stateDelta: ${JSON.stringify(last.stateDelta || {})}`,
      `shortTermUpdate: ${JSON.stringify(last.shortTermUpdate || {})}`,
      `memoryUpdate: ${JSON.stringify(last.memoryUpdate || {})}`,
      `taggedTtsText: ${last.taggedTtsText}`,
      `naturalStylePrompt: ${last.naturalStylePrompt}`,
      `timestamp: ${last.timestamp}`
    ].join('\n')
  };
}

function getStatePayload() {
  const state = loadState();
  return {
    state,
    recentContext: getRecentContext()
  };
}

function buildTurnContextPayload(userMessage) {
  const { state, recentContext } = getStatePayload();
  if (!state) return null;
  return {
    mode: state.mode,
    profile: state.profile,
    dynamicState: state.dynamicState,
    shortTermState: state.shortTermState,
    revealedMemory: state.revealedMemory,
    recentContext,
    userMessage
  };
}

function buildStartPayload() {
  return {
    prompt: buildInitialProfileAgentPrompt(),
    envPath: ENV_PATH,
    note: '让 agent 使用这个 prompt 生成 InitialStatePayload，然后调用 applyInitialStatePayload(payload) 即可落盘。'
  };
}

async function runHybridSelfCheck() {
  const configCheck = validateConfig();
  const result = {
    ok: false,
    issues: [],
    checks: {
      config: false,
      statePathWritable: false,
      historyPathWritable: false,
      ttsOutputWritable: false,
      modulesLoadable: false,
      ttsProbe: false
    }
  };

  if (!configCheck.ok) {
    result.issues.push(...configCheck.issues.map((x) => `${x.key}: ${x.message}`));
  } else {
    result.checks.config = true;
  }

  try {
    const cfg = getConfig();
    fs.mkdirSync(require('path').dirname(cfg.stateFile), { recursive: true });
    fs.writeFileSync(cfg.stateFile + '.check.tmp', 'ok');
    fs.unlinkSync(cfg.stateFile + '.check.tmp');
    result.checks.statePathWritable = true;
  } catch (err) {
    result.issues.push(`STATE_PATH_WRITABLE: ${err.message}`);
  }

  try {
    const cfg = getConfig();
    fs.mkdirSync(require('path').dirname(cfg.historyFile), { recursive: true });
    fs.writeFileSync(cfg.historyFile + '.check.tmp', 'ok');
    fs.unlinkSync(cfg.historyFile + '.check.tmp');
    result.checks.historyPathWritable = true;
  } catch (err) {
    result.issues.push(`HISTORY_PATH_WRITABLE: ${err.message}`);
  }

  try {
    const cfg = getConfig();
    fs.mkdirSync(cfg.ttsOutputDir, { recursive: true });
    fs.writeFileSync(require('path').join(cfg.ttsOutputDir, '.check.tmp'), 'ok');
    fs.unlinkSync(require('path').join(cfg.ttsOutputDir, '.check.tmp'));
    result.checks.ttsOutputWritable = true;
  } catch (err) {
    result.issues.push(`TTS_OUTPUT_WRITABLE: ${err.message}`);
  }

  try {
    require('./cyber-gf-state');
    require('./cyber-gf-profile');
    require('./cyber-gf-turn');
    require('./cyber-gf-tts');
    require('./cyber-gf-prompts');
    result.checks.modulesLoadable = true;
  } catch (err) {
    result.issues.push(`MODULE_LOAD: ${err.message}`);
  }

  if (result.checks.config) {
    try {
      await probeTtsChain();
      result.checks.ttsProbe = true;
    } catch (err) {
      result.issues.push(`TTS_PROBE: ${err.message}`);
    }
  }

  result.ok = Object.values(result.checks).every(Boolean);
  return result;
}

function formatConfigIssues(result) {
  const lines = [
    '赛博女友模式启动前自检未通过。',
    '',
    `请先创建并补全配置文件：${result.envPath}`,
    '',
    '缺少的项目：'
  ];
  for (const issue of result.issues) {
    lines.push(`- ${issue.key}: ${issue.message}`);
  }
  lines.push('', '补全后再次说“开始赛博女友”，我会重新自检。');
  return lines.join('\n');
}

function formatSelfCheckIssues(result) {
  const lines = [
    '赛博女友模式启动前自检未通过。',
    '',
    `请检查并补全配置文件：${ENV_PATH}`,
    '',
    '失败项目：'
  ];
  for (const issue of result.issues) {
    lines.push(`- ${issue}`);
  }
  lines.push('', '修复后再次说“开始赛博女友”，我会重新自检。');
  return lines.join('\n');
}

function readJsonArg(fileOrJson) {
  if (!fileOrJson) throw new Error('Missing JSON payload or file path');
  const trimmed = String(fileOrJson).trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  if (!fs.existsSync(trimmed)) throw new Error(`Payload file not found: ${trimmed}`);
  return JSON.parse(fs.readFileSync(trimmed, 'utf8'));
}

function buildTurnPayload(userMessage) {
  const turnContext = buildTurnContextPayload(userMessage);
  if (!turnContext) return null;
  return {
    prompt: buildTurnAgentPrompt(turnContext),
    context: turnContext,
    envPath: ENV_PATH,
    note: '让 agent 生成 TurnResultPayload，然后调用 applyTurnResultPayload(payload, userMessage) 落盘；如 sendVoiceNow=true，再调用 speakLastTurn()。'
  };
}

function applyInitialStatePayload(initialPayload) {
  const validated = validateInitialProfile(initialPayload);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  let state = buildInitialState(validated.value);
  state = saveState(state);
  return {
    state,
    openingMessage: validated.value.openingMessage
  };
}

function applyTurnResultPayload(turnResultPayload, userMessage = '') {
  const validated = validateTurnOutput(turnResultPayload);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  let state = loadState();
  if (!state) {
    throw new Error('No cyber girlfriend state exists');
  }
  if (userMessage) appendHistory('user', userMessage);
  appendHistory('assistant', validated.value.visibleText);
  state = applyTurnResult(state, validated.value);
  state.mode.enabled = true;
  state = saveState(state);
  return {
    state,
    turnOutput: validated.value,
    debugText: buildTurnDebugInfo(validated.value)
  };
}

async function speakLastTurn() {
  const state = loadState();
  if (!state) throw new Error('No cyber girlfriend state exists');
  const audio = await generateFromLastTurn(state);
  const next = saveState(storeLastGeneratedAudio(state, audio));
  return { ...audio, state: next };
}

async function speakTurnPayload(turnResultPayload) {
  const validated = validateTurnOutput(turnResultPayload);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  const audio = await generateTtsAudio(validated.value.taggedTtsText, validated.value.naturalStylePrompt);
  const state = loadState();
  if (state) saveState(storeLastGeneratedAudio(state, audio));
  return audio;
}

async function runTurnResultFlow(turnResultPayload, options = {}) {
  const userMessage = options.userMessage || turnResultPayload.__userMessage || '';
  const applied = applyTurnResultPayload(turnResultPayload, userMessage);
  let audio = null;
  if (applied.turnOutput.sendVoiceNow) {
    audio = await speakTurnPayload(applied.turnOutput);
  }
  const delivery = buildUnifiedDelivery(applied.turnOutput, { target: options.target });
  return {
    kind: 'turn_flow',
    applied,
    audio,
    delivery
  };
}

async function runStartFlow(initialPayload) {
  const applied = applyInitialStatePayload(initialPayload);
  return {
    kind: 'start_flow',
    applied,
    delivery: buildStartDelivery(applied.openingMessage)
  };
}

async function startCyberGfHybrid() {
  const configCheck = validateConfig();
  if (!configCheck.ok) {
    return {
      kind: 'config_incomplete',
      visibleText: formatConfigIssues(configCheck),
      configCheck
    };
  }
  const selfCheck = await runHybridSelfCheck();
  if (!selfCheck.ok) {
    return {
      kind: 'self_check_failed',
      visibleText: formatSelfCheckIssues(selfCheck),
      selfCheck
    };
  }
  let state = loadState();
  if (!state) {
    return {
      kind: 'need_profile_generation',
      ...buildStartPayload()
    };
  }
  state = incrementSessionCount(setModeEnabled(state, true));
  state = saveState(state);
  return {
    kind: 'restored',
    state,
    visibleText: `回来了。\n\n${state.profile.profileSummary}\n\n${state.revealedMemory.lastSummary}`
  };
}

function exitCyberGfHybrid() {
  const state = loadState();
  if (!state) {
    return {
      kind: 'noop',
      visibleText: '现在还没有赛博女友状态。'
    };
  }
  const next = saveState(setModeEnabled(state, false));
  return {
    kind: 'exited',
    state: next,
    visibleText: '已退出赛博女友模式，记忆已经保存。'
  };
}

function breakupCyberGfHybrid() {
  clearState();
  const historyPath = getHistoryPath();
  if (fs.existsSync(historyPath)) fs.unlinkSync(historyPath);
  return {
    kind: 'cleared',
    visibleText: '她安静了一下，然后真的走了。赛博女友的身份、关系和记忆都已经清空。'
  };
}

function getCyberGfStatus() {
  const state = loadState();
  return {
    kind: 'status',
    state,
    visibleText: state ? formatStatus(state) : '当前没有赛博女友状态记录。'
  };
}

function fallbackTurn(userMessage) {
  const output = createFallbackTurnOutput(userMessage);
  const applied = applyTurnResultPayload(output, userMessage);
  return {
    kind: 'fallback_turn',
    visibleText: output.visibleText,
    state: applied.state,
    turnOutput: output
  };
}

async function handleHybridCommand(command, arg = '') {
  if (command === 'start') return startCyberGfHybrid();
  if (command === 'exit') return exitCyberGfHybrid();
  if (command === 'breakup') return breakupCyberGfHybrid();
  if (command === 'status') return getCyberGfStatus();
  if (command === 'debug-last') return getLastTurnDebug();
  if (command === 'debug-on') return setCyberGfDebug(true);
  if (command === 'debug-off') return setCyberGfDebug(false);
  if (command === 'voice-delivery-info') return getLastVoiceDeliveryInfo();
  if (command === 'last-audio') return getLastGeneratedAudioInfo();
  if (command === 'voice-send-payload') return getTelegramVoiceSendPayload(arg || 'telegram:8121382159');
  if (command === 'run-start-flow') {
    const payload = readJsonArg(arg);
    return runStartFlow(payload);
  }
  if (command === 'run-turn-flow') {
    const payload = readJsonArg(arg);
    return runTurnResultFlow(payload, { userMessage: payload.__userMessage || '', target: 'telegram:8121382159' });
  }
  if (command === 'turn-payload') {
    const payload = buildTurnPayload(arg || '在吗');
    if (!payload) {
      return {
        kind: 'error',
        visibleText: '赛博女友模式当前未开启，无法生成 turn payload。'
      };
    }
    return {
      kind: 'turn_payload',
      payload
    };
  }
  if (command === 'apply-start-payload') {
    const payload = readJsonArg(arg);
    const result = applyInitialStatePayload(payload);
    return {
      kind: 'applied_start_payload',
      visibleText: result.openingMessage,
      state: result.state
    };
  }
  if (command === 'apply-turn-payload') {
    const payload = readJsonArg(arg);
    const result = applyTurnResultPayload(payload, payload.__userMessage || '');
    return {
      kind: 'applied_turn_payload',
      visibleText: result.debugText ? `${result.turnOutput.visibleText}\n\n${result.debugText}` : result.turnOutput.visibleText,
      state: result.state,
      turnOutput: result.turnOutput
    };
  }
  if (command === 'fallback-turn') {
    return fallbackTurn(arg || '在吗');
  }
  if (command === 'tts-last') {
    return {
      kind: 'tts_last',
      note: '请调用 speakLastTurn() 执行最近一轮语音生成。'
    };
  }
  return {
    kind: 'error',
    visibleText: `未知命令: ${command}`
  };
}

async function main() {
  const arg1 = process.argv[2] || '';
  const arg2 = process.argv[3] || '';
  const commandMap = new Map([
    ['开始赛博女友', 'start'],
    ['退出赛博女友', 'exit'],
    ['我们分手吧', 'breakup'],
    ['status', 'status'],
    ['debug-last', 'debug-last'],
    ['debug-on', 'debug-on'],
    ['debug-off', 'debug-off'],
    ['voice-delivery-info', 'voice-delivery-info'],
    ['last-audio', 'last-audio'],
    ['voice-send-payload', 'voice-send-payload'],
    ['run-start-flow', 'run-start-flow'],
    ['run-turn-flow', 'run-turn-flow'],
    ['turn-payload', 'turn-payload'],
    ['apply-start-payload', 'apply-start-payload'],
    ['apply-turn-payload', 'apply-turn-payload'],
    ['fallback-turn', 'fallback-turn']
  ]);

  const command = commandMap.get(arg1);
  if (!command) {
    console.log('可用命令：开始赛博女友 / 退出赛博女友 / 我们分手吧 / status / debug-last / debug-on / debug-off / voice-delivery-info / last-audio / voice-send-payload / run-start-flow / run-turn-flow / turn-payload / apply-start-payload / apply-turn-payload / fallback-turn');
    process.exit(0);
  }

  const result = await handleHybridCommand(command, arg2);
  if (result.visibleText) {
    console.log(result.visibleText);
  } else if (result.payload) {
    console.log(JSON.stringify(result.payload, null, 2));
  } else if (result.note) {
    console.log(result.note);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = {
  getStatePayload,
  buildStartPayload,
  buildTurnPayload,
  buildVoiceSendPayloadFromAudio,
  buildUnifiedDelivery,
  applyInitialStatePayload,
  applyTurnResultPayload,
  speakLastTurn,
  speakTurnPayload,
  runStartFlow,
  runTurnResultFlow,
  startCyberGfHybrid,
  exitCyberGfHybrid,
  breakupCyberGfHybrid,
  getCyberGfStatus,
  fallbackTurn,
  handleHybridCommand
};
