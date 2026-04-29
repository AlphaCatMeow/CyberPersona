const fs = require('fs');
const { getConfig } = require('./cyber-gf-config');
const STATE_KEYS = ['relationshipWarmth', 'safety', 'trust', 'approachDesire', 'vulnerabilityWillingness', 'voiceEase'];
const STATE_SENSITIVITY = {
  relationshipWarmth: 1.0,
  safety: 0.8,
  trust: 0.7,
  approachDesire: 0.9,
  vulnerabilityWillingness: 0.6,
  voiceEase: 0.5
};

function nowIso() {
  return new Date().toISOString();
}

function getStatePath() {
  return getConfig().stateFile;
}

function createEmptyState() {
  return {
    version: 1,
    mode: {
      enabled: false,
      type: 'cyber_girlfriend'
    },
    meta: {
      createdAt: nowIso(),
      updatedAt: nowIso(),
      sessionCount: 0,
      turnCount: 0
    },
    profile: {
      coreSummary: '',
      relationshipSummary: '',
      defenseSummary: '',
      startSummary: '',
      voiceSummary: '',
      profileSummary: ''
    },
    dynamicState: {
      relationshipWarmth: 50,
      safety: 50,
      trust: 50,
      approachDesire: 50,
      vulnerabilityWillingness: 30,
      voiceEase: 20
    },
    shortTermState: {
      unresolvedEmotion: 'none',
      interactionTrend: 'steady',
      recentVoicePattern: 'none'
    },
    revealedMemory: {
      nicknameForUser: null,
      nicknameForSelf: null,
      sharedRoutines: [],
      revealedFacts: [],
      importantEvents: [],
      lastSummary: ''
    },
    runtimeCache: {
      debug: {
        enabled: false
      },
      lastGeneratedAudio: {
        filename: '',
        filepath: '',
        size: 0,
        createdAt: ''
      },
      lastTurnTts: {
        visibleText: '',
        taggedTtsText: '',
        naturalStylePrompt: '',
        currentEmotion: '',
        sendVoiceNow: false,
        timestamp: '',
        stateDelta: {},
        shortTermUpdate: {},
        memoryUpdate: {}
      }
    }
  };
}

function repairState(state) {
  const base = createEmptyState();
  const repaired = {
    ...base,
    ...state,
    mode: { ...base.mode, ...(state?.mode || {}) },
    meta: { ...base.meta, ...(state?.meta || {}) },
    profile: { ...base.profile, ...(state?.profile || {}) },
    dynamicState: { ...base.dynamicState, ...(state?.dynamicState || {}) },
    shortTermState: { ...base.shortTermState, ...(state?.shortTermState || {}) },
    revealedMemory: { ...base.revealedMemory, ...(state?.revealedMemory || {}) },
    runtimeCache: {
      ...base.runtimeCache,
      ...(state?.runtimeCache || {}),
      debug: {
        ...base.runtimeCache.debug,
        ...(state?.runtimeCache?.debug || {})
      },
      lastGeneratedAudio: {
        ...base.runtimeCache.lastGeneratedAudio,
        ...(state?.runtimeCache?.lastGeneratedAudio || {})
      },
      lastTurnTts: {
        ...base.runtimeCache.lastTurnTts,
        ...(state?.runtimeCache?.lastTurnTts || {})
      }
    }
  };

  for (const key of Object.keys(repaired.dynamicState)) {
    const value = Number(repaired.dynamicState[key]);
    repaired.dynamicState[key] = Number.isFinite(value) ? clampStateValue(value) : base.dynamicState[key];
  }

  return repaired;
}

function loadState() {
  try {
    const STATE_PATH = getStatePath();
    if (!fs.existsSync(STATE_PATH)) return null;
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    return repairState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveState(state) {
  const STATE_PATH = getStatePath();
  const next = repairState(state);
  next.meta.updatedAt = nowIso();
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
  return next;
}

function clearState() {
  const STATE_PATH = getStatePath();
  if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);
}

function setModeEnabled(state, enabled) {
  const next = repairState(state);
  next.mode.enabled = !!enabled;
  return next;
}

function incrementSessionCount(state) {
  const next = repairState(state);
  next.meta.sessionCount += 1;
  return next;
}

function incrementTurnCount(state) {
  const next = repairState(state);
  next.meta.turnCount += 1;
  return next;
}

function clampStateValue(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function applyStateResistance(current, rawDelta, key) {
  const sensitivity = STATE_SENSITIVITY[key] ?? 1;
  let adjusted = rawDelta * sensitivity;

  if (adjusted > 0) {
    if (current >= 85) adjusted *= 0.2;
    else if (current >= 70) adjusted *= 0.4;
    else if (current >= 60) adjusted *= 0.7;
  } else if (adjusted < 0) {
    if (current <= 15) adjusted *= 0.2;
    else if (current <= 30) adjusted *= 0.4;
    else if (current <= 40) adjusted *= 0.7;
  }

  if (adjusted > 0 && adjusted < 1) adjusted = 1;
  if (adjusted < 0 && adjusted > -1) adjusted = -1;

  return Math.round(adjusted);
}

function applyStateDelta(dynamicState, stateDelta = {}) {
  const current = { ...createEmptyState().dynamicState, ...(dynamicState || {}) };
  const next = { ...current };
  for (const key of Object.keys(current)) {
    const delta = Number(stateDelta[key] || 0);
    const effectiveDelta = Number.isFinite(delta) ? applyStateResistance(current[key], delta, key) : 0;
    next[key] = clampStateValue(current[key] + effectiveDelta);
  }
  return next;
}

function describeStateLevel(value) {
  const n = clampStateValue(value);
  if (n < 30) return 'low';
  if (n < 70) return 'medium';
  return 'high';
}

function applyShortTermUpdate(shortTermState, shortTermUpdate = {}) {
  const current = { ...createEmptyState().shortTermState, ...(shortTermState || {}) };
  return {
    unresolvedEmotion: typeof shortTermUpdate.unresolvedEmotion === 'string' && shortTermUpdate.unresolvedEmotion.trim()
      ? shortTermUpdate.unresolvedEmotion.trim()
      : current.unresolvedEmotion,
    interactionTrend: typeof shortTermUpdate.interactionTrend === 'string' && shortTermUpdate.interactionTrend.trim()
      ? shortTermUpdate.interactionTrend.trim()
      : current.interactionTrend,
    recentVoicePattern: typeof shortTermUpdate.recentVoicePattern === 'string' && shortTermUpdate.recentVoicePattern.trim()
      ? shortTermUpdate.recentVoicePattern.trim()
      : current.recentVoicePattern
  };
}

function dedupeStrings(items = []) {
  return [...new Set(items.filter(Boolean).map((x) => String(x).trim()).filter(Boolean))];
}

function mergeRevealedFacts(oldFacts = [], newFacts = []) {
  const byKey = new Map();
  for (const fact of oldFacts) {
    if (fact && fact.key && fact.value) byKey.set(String(fact.key), { key: String(fact.key), value: String(fact.value) });
  }
  for (const fact of newFacts || []) {
    if (!fact || !fact.key || !fact.value) continue;
    const key = String(fact.key);
    const value = String(fact.value);
    if (!byKey.has(key)) {
      byKey.set(key, { key, value });
      continue;
    }
    const current = byKey.get(key);
    if (current.value === value) continue;
    // 第一版不允许冲突覆盖，保留旧值
  }
  return [...byKey.values()];
}

function mergeMemoryUpdate(revealedMemory, memoryUpdate = {}) {
  const current = { ...createEmptyState().revealedMemory, ...(revealedMemory || {}) };
  const next = { ...current };

  if (typeof memoryUpdate.nicknameForUser === 'string' && memoryUpdate.nicknameForUser.trim()) {
    next.nicknameForUser = memoryUpdate.nicknameForUser.trim();
  }
  if (typeof memoryUpdate.nicknameForSelf === 'string' && memoryUpdate.nicknameForSelf.trim()) {
    next.nicknameForSelf = memoryUpdate.nicknameForSelf.trim();
  }

  next.sharedRoutines = dedupeStrings([...(current.sharedRoutines || []), ...(memoryUpdate.sharedRoutinesAdd || [])]);
  next.importantEvents = dedupeStrings([...(current.importantEvents || []), ...(memoryUpdate.importantEventsAdd || [])]).slice(-20);
  next.revealedFacts = mergeRevealedFacts(current.revealedFacts || [], memoryUpdate.revealedFactsAdd || []);

  if (typeof memoryUpdate.lastSummary === 'string' && memoryUpdate.lastSummary.trim()) {
    next.lastSummary = memoryUpdate.lastSummary.trim();
  }

  return next;
}

function storeLastTurnTts(state, turnOutput) {
  const next = repairState(state);
  next.runtimeCache.lastTurnTts = {
    visibleText: turnOutput.visibleText || '',
    taggedTtsText: turnOutput.taggedTtsText || '',
    naturalStylePrompt: turnOutput.naturalStylePrompt || '',
    currentEmotion: turnOutput.currentEmotion || '',
    sendVoiceNow: !!turnOutput.sendVoiceNow,
    timestamp: nowIso(),
    stateDelta: turnOutput.stateDelta || {},
    shortTermUpdate: turnOutput.shortTermUpdate || {},
    memoryUpdate: turnOutput.memoryUpdate || {}
  };
  return next;
}

function storeLastGeneratedAudio(state, audioResult) {
  const next = repairState(state);
  next.runtimeCache.lastGeneratedAudio = {
    filename: audioResult?.filename || '',
    filepath: audioResult?.filepath || '',
    size: Number(audioResult?.size || 0),
    createdAt: nowIso()
  };
  return next;
}

function setDebugEnabled(state, enabled) {
  const next = repairState(state);
  next.runtimeCache.debug.enabled = !!enabled;
  return next;
}

function isDebugEnabled(state) {
  const repaired = repairState(state || {});
  const cfg = getConfig();
  return !!(repaired.runtimeCache?.debug?.enabled || cfg.debug.enabled);
}

function applyTurnResult(state, turnOutput) {
  let next = repairState(state);
  next.dynamicState = applyStateDelta(next.dynamicState, turnOutput.stateDelta || {});
  next.shortTermState = applyShortTermUpdate(next.shortTermState, turnOutput.shortTermUpdate || {});
  next.revealedMemory = mergeMemoryUpdate(next.revealedMemory, turnOutput.memoryUpdate || {});
  next = storeLastTurnTts(next, turnOutput);
  next = incrementTurnCount(next);
  return next;
}

module.exports = {
  STATE_KEYS,
  getStatePath,
  createEmptyState,
  repairState,
  loadState,
  saveState,
  clearState,
  setModeEnabled,
  incrementSessionCount,
  incrementTurnCount,
  applyStateDelta,
  clampStateValue,
  applyStateResistance,
  describeStateLevel,
  applyShortTermUpdate,
  mergeMemoryUpdate,
  storeLastTurnTts,
  storeLastGeneratedAudio,
  setDebugEnabled,
  isDebugEnabled,
  applyTurnResult
};
