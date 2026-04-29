const {
  startCyberGfHybrid,
  exitCyberGfHybrid,
  breakupCyberGfHybrid,
  getStatePayload,
  buildStartPayload,
  buildTurnPayload,
  runStartFlow,
  runTurnResultFlow
} = require('./cyber-gf-controller');

const EXACT_SILENT = 'NO_REPLY';

function exactSilentReply() {
  return EXACT_SILENT;
}

function sanitizeVisibleAssistantText(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  if (/^NO_REPLY$/i.test(value)) return EXACT_SILENT;
  if (/^No further note from me\.?$/i.test(value)) return EXACT_SILENT;
  return value;
}

function unwrapState(statePayload) {
  if (!statePayload || typeof statePayload !== 'object') return null;
  return statePayload.state && typeof statePayload.state === 'object'
    ? statePayload.state
    : statePayload;
}

function isModeEnabled() {
  const state = unwrapState(getStatePayload());
  return !!state?.mode?.enabled;
}

async function dispatchDelivery(delivery, deps) {
  const safeDelivery = delivery || {};
  const sendMessage = deps.sendMessage;

  if (safeDelivery.mode === 'voice_note' && safeDelivery.voicePayload) {
    if (typeof sendMessage !== 'function') {
      throw new Error('voice_note delivery requires deps.sendMessage(payload)');
    }
    await sendMessage(safeDelivery.voicePayload);
    return exactSilentReply();
  }

  return sanitizeVisibleAssistantText(safeDelivery.text || '');
}

async function handleStart(userMessage, deps) {
  const startStatus = await startCyberGfHybrid();

  if (startStatus.kind === 'config_incomplete' || startStatus.kind === 'self_check_failed') {
    return sanitizeVisibleAssistantText(startStatus.visibleText || '');
  }

  if (startStatus.kind === 'restored') {
    return sanitizeVisibleAssistantText(startStatus.visibleText || '');
  }

  if (startStatus.kind !== 'need_profile_generation') {
    return sanitizeVisibleAssistantText(startStatus.visibleText || '');
  }

  if (typeof deps.generateInitialPayload !== 'function') {
    throw new Error('start flow requires deps.generateInitialPayload(prompt, userMessage)');
  }

  const initialPayload = await deps.generateInitialPayload(startStatus.prompt, userMessage);
  const result = await runStartFlow(initialPayload);
  return dispatchDelivery(result.delivery, deps);
}

async function handleNormalTurn(userMessage, deps) {
  const promptPayload = buildTurnPayload(userMessage);
  if (!promptPayload) {
    return typeof deps.fallbackToDefaultAssistant === 'function'
      ? sanitizeVisibleAssistantText(await deps.fallbackToDefaultAssistant(userMessage))
      : exactSilentReply();
  }

  if (typeof deps.generateTurnPayload !== 'function') {
    throw new Error('normal turn requires deps.generateTurnPayload(userMessage, promptPayload) to produce a TurnResultPayload');
  }

  const turnPayload = await deps.generateTurnPayload(userMessage, promptPayload);
  const result = await runTurnResultFlow(turnPayload, { userMessage });
  return dispatchDelivery(result.delivery, deps);
}

async function handleIncomingMessage(userMessage, deps = {}) {
  const text = String(userMessage || '').trim();
  if (!text) return exactSilentReply();

  if (text === '开始赛博女友') {
    return handleStart(text, deps);
  }

  if (text === '退出赛博女友') {
    const result = exitCyberGfHybrid();
    return sanitizeVisibleAssistantText(result.visibleText || '');
  }

  if (text === '我们分手吧') {
    const result = breakupCyberGfHybrid();
    return sanitizeVisibleAssistantText(result.visibleText || '');
  }

  if (!isModeEnabled()) {
    return typeof deps.fallbackToDefaultAssistant === 'function'
      ? sanitizeVisibleAssistantText(await deps.fallbackToDefaultAssistant(text))
      : exactSilentReply();
  }

  return handleNormalTurn(text, deps);
}

module.exports = {
  EXACT_SILENT,
  exactSilentReply,
  sanitizeVisibleAssistantText,
  dispatchDelivery,
  handleIncomingMessage
};
