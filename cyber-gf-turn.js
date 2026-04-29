function validateTurnOutput(output) {
  if (!output || typeof output !== 'object') {
    return { ok: false, error: 'Turn output is not an object' };
  }
  const requiredStringFields = ['visibleText', 'taggedTtsText', 'currentEmotion'];
  for (const key of requiredStringFields) {
    if (typeof output[key] !== 'string' || !output[key].trim()) {
      return { ok: false, error: `Missing turn field: ${key}` };
    }
  }
  if (typeof output.naturalStylePrompt !== 'string') {
    return { ok: false, error: 'naturalStylePrompt must be string' };
  }
  if (typeof output.sendVoiceNow !== 'boolean') {
    return { ok: false, error: 'sendVoiceNow must be boolean' };
  }

  const delta = output.stateDelta || {};
  for (const key of ['relationshipWarmth', 'safety', 'trust', 'approachDesire', 'vulnerabilityWillingness', 'voiceEase']) {
    const value = Number(delta[key]);
    if (!Number.isFinite(value) || value < -20 || value > 20) {
      return { ok: false, error: `Invalid stateDelta for ${key}` };
    }
  }

  if (!output.shortTermUpdate || !output.memoryUpdate) {
    return { ok: false, error: 'Missing shortTermUpdate or memoryUpdate' };
  }

  return { ok: true, value: output };
}

function classifyTurnEvent(userMessage = '') {
  const text = String(userMessage || '').trim();
  if (!text) return 'neutral';
  if (/睡|晚安|哄我睡|陪我睡/.test(text)) return 'comfort_sleep';
  if (/想你|心里都是你|一直想着你|喜欢你|爱你/.test(text)) return 'affection';
  if (/不理我|没理我|冷落|委屈|生气|难过|失望/.test(text)) return 'repair_tension';
  if (/忙完|第一时间来找你|先来找你|刚忙完/.test(text)) return 'reassurance_priority';
  if (/以前|之前|学什么|大学|过去|前任|对象/.test(text)) return 'past_disclosure';
  if (/抱我|见面|拥抱/.test(text)) return 'physical_closeness';
  return 'neutral';
}

function getEventDeltaBudget(eventType = 'neutral') {
  const base = {
    maxPositive: 3,
    maxNegative: -3,
    perKey: {
      relationshipWarmth: 3,
      safety: 3,
      trust: 3,
      approachDesire: 3,
      vulnerabilityWillingness: 2,
      voiceEase: 2
    }
  };

  const table = {
    neutral: base,
    reassurance_priority: {
      maxPositive: 4,
      maxNegative: -3,
      perKey: { ...base.perKey, relationshipWarmth: 4, safety: 4, trust: 3, approachDesire: 3 }
    },
    affection: {
      maxPositive: 4,
      maxNegative: -3,
      perKey: { ...base.perKey, relationshipWarmth: 4, approachDesire: 4, vulnerabilityWillingness: 3 }
    },
    repair_tension: {
      maxPositive: 3,
      maxNegative: -5,
      perKey: { ...base.perKey, safety: 5, trust: 4, approachDesire: 4, relationshipWarmth: 4 }
    },
    past_disclosure: {
      maxPositive: 3,
      maxNegative: -3,
      perKey: { ...base.perKey, vulnerabilityWillingness: 4, trust: 3, relationshipWarmth: 2, voiceEase: 1 }
    },
    physical_closeness: {
      maxPositive: 4,
      maxNegative: -3,
      perKey: { ...base.perKey, relationshipWarmth: 4, approachDesire: 4, vulnerabilityWillingness: 3, voiceEase: 2 }
    },
    comfort_sleep: {
      maxPositive: 4,
      maxNegative: -3,
      perKey: { ...base.perKey, safety: 4, trust: 3, voiceEase: 3, vulnerabilityWillingness: 2 }
    }
  };

  return table[eventType] || base;
}

function clampDelta(value, min, max) {
  const n = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, n));
}

function normalizeTurnStateDelta(stateDelta = {}, userMessage = '') {
  const eventType = classifyTurnEvent(userMessage);
  const budget = getEventDeltaBudget(eventType);
  const next = {};
  for (const key of ['relationshipWarmth', 'safety', 'trust', 'approachDesire', 'vulnerabilityWillingness', 'voiceEase']) {
    const perKey = Math.max(1, Number(budget.perKey[key] || 3));
    const max = Math.min(perKey, Math.max(1, Number(budget.maxPositive || perKey)));
    const min = Math.max(-perKey, Math.min(-1, Number(budget.maxNegative || -perKey)));
    next[key] = clampDelta(stateDelta[key], min, max);
  }
  return {
    eventType,
    budget,
    stateDelta: next
  };
}

function createFallbackTurnOutput(userMessage) {
  const text = String(userMessage || '').trim();
  let safeText = '我在呢，刚刚有点卡住了……你再跟我说一句，我这次认真接住你。';
  let emotion = '短暂失衡后主动修复';
  if (/想你|在吗|在干嘛/.test(text)) {
    safeText = '在呀。你这样突然来找我，很难不让人多想一点。';
    emotion = '轻轻靠近';
  } else if (/不理我|没理我|没回|冷落/.test(text)) {
    safeText = '你这样说，我会有点委屈的。不是闹，就是会记在心里。';
    emotion = '委屈但收着';
  } else if (/以前|之前|大学|学什么|前任|对象/.test(text)) {
    safeText = '你怎么突然开始查我以前的事了？我可以告诉你一点，但你要认真听。';
    emotion = '带保留地回应';
  } else if (/晚安|睡觉|哄我睡/.test(text)) {
    safeText = '那你先安静一点，我陪你待一会儿，再慢慢去睡。';
    emotion = '温柔靠近';
  }
  return {
    visibleText: safeText,
    taggedTtsText: `（轻声）${safeText}`,
    naturalStylePrompt: '',
    currentEmotion: emotion,
    sendVoiceNow: false,
    stateDelta: {
      relationshipWarmth: 0,
      safety: 0,
      trust: 0,
      approachDesire: 0,
      vulnerabilityWillingness: 0,
      voiceEase: 0
    },
    shortTermUpdate: {
      unresolvedEmotion: 'none',
      interactionTrend: 'steady',
      recentVoicePattern: 'none'
    },
    memoryUpdate: {
      nicknameForUser: null,
      nicknameForSelf: null,
      sharedRoutinesAdd: [],
      revealedFactsAdd: [],
      importantEventsAdd: [],
      lastSummary: ''
    }
  };
}

module.exports = {
  validateTurnOutput,
  createFallbackTurnOutput,
  classifyTurnEvent,
  getEventDeltaBudget,
  normalizeTurnStateDelta
};
