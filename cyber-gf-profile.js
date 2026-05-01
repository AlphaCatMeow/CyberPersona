const { createEmptyState } = require('./cyber-gf-state');

// Integer dimensions validated 0–100
const DIMENSION_MIN = 0;
const DIMENSION_MAX = 100;

// Each array: [ideal, min-acceptable, max-acceptable]
// L3 关系数值（新 5 维）
const STARTING_RANGES = {
  trust:          [30, 5, 70],
  security:       [30, 5, 70],
  closeness:      [15, 0, 50],
  neediness:      [15, 0, 50],
  possessiveness: [10, 0, 50]
};

const FALLBACK_DYNAMIC_STATE_INIT = {
  trust: 30,
  security: 30,
  closeness: 15,
  neediness: 15,
  possessiveness: 10
};

const FALLBACK_STRESS = 20;

const MINOR_MARGIN = 5;

function validateInitialProfile(output) {
  if (!output || typeof output !== 'object') {
    return { ok: false, error: 'Initial profile payload is not an object' };
  }
  const profile = output.profile;
  const dynamicStateInit = output.dynamicStateInit;
  const shortTermStateInit = output.shortTermStateInit;
  const revealedMemoryInit = output.revealedMemoryInit;
  const openingMessage = output.openingMessage;

  if (!profile || !dynamicStateInit || !shortTermStateInit || !revealedMemoryInit) {
    return { ok: false, error: 'Missing required top-level sections' };
  }

  const requiredProfileKeys = ['coreSummary', 'relationshipSummary', 'defenseSummary', 'startSummary', 'voiceSummary', 'appearance', 'voiceDescription', 'profileSummary'];
  for (const key of requiredProfileKeys) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) {
      return { ok: false, error: `Missing profile field: ${key}` };
    }
  }

  // Validate personalitySettings (L2)
  const ps = output.personalitySettings;
  if (ps) {
    const l2Keys = ['neuroticism', 'agreeableness', 'openness', 'conscientiousness', 'extraversion'];
    for (const key of l2Keys) {
      if (ps[key] !== undefined && (typeof ps[key] !== 'number' || !Number.isInteger(ps[key]) || ps[key] < 0 || ps[key] > 100)) {
        return { ok: false, error: `personalitySettings.${key} must be integer 0-100` };
      }
    }
  }

  const dimensionKeys = Object.keys(STARTING_RANGES);
  for (const key of dimensionKeys) {
    const value = dynamicStateInit[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < DIMENSION_MIN || value > DIMENSION_MAX) {
      return { ok: false, error: `Invalid dynamic state value for ${key}: must be integer ${DIMENSION_MIN}-${DIMENSION_MAX}` };
    }
  }

  // emotionalProfile is optional, but if present must have a baseline string
  if (output.emotionalProfile !== undefined) {
    if (!output.emotionalProfile || typeof output.emotionalProfile.baseline !== 'string' || !output.emotionalProfile.baseline.trim()) {
      return { ok: false, error: 'emotionalProfile.baseline must be a non-empty string when emotionalProfile is provided' };
    }
  }

  if (typeof openingMessage !== 'string' || !openingMessage.trim()) {
    return { ok: false, error: 'openingMessage is required' };
  }

  // Quantum State Enforcement: 初始记忆必须为空，留给后续对话坍缩
  const quantumFields = [
    { key: 'revealedFacts', label: '揭示的事实' },
    { key: 'emotionalMemories', label: '情绪记忆' },
    { key: 'importantEvents', label: '重要事件' },
  ];
  for (const { key, label } of quantumFields) {
    if (revealedMemoryInit[key] && revealedMemoryInit[key].length > 0) {
      return { ok: false, error: `Quantum State Violation: revealedMemoryInit.${key} 必须为空数组！${label}在初始状态下禁止预设，必须在后续对话中自然坍缩。` };
    }
  }

  return { ok: true, value: output };
}

function clampToRange(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value))));
}

function classifyInitialDynamicState(dynamicStateInit) {
  let minor = false;

  for (const [key, range] of Object.entries(STARTING_RANGES)) {
    const value = dynamicStateInit[key];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < DIMENSION_MIN || value > DIMENSION_MAX) {
      return { status: 'severe', reason: `Invalid integer initial dynamic state for ${key}` };
    }
    const [ideal, minAccept, maxAccept] = range;
    if (value === ideal) continue;
    if (value >= minAccept && value <= maxAccept) {
      minor = true;
    } else {
      return { status: 'severe', reason: `Initial dynamic state severely out of range for ${key}` };
    }
  }

  if (minor) return { status: 'minor', reason: 'Initial dynamic state slightly out of range' };
  return { status: 'ok', reason: null };
}

function normalizeInitialDynamicState(dynamicStateInit) {
  const next = { ...dynamicStateInit };
  for (const [key, range] of Object.entries(STARTING_RANGES)) {
    const [, minAccept, maxAccept] = range;
    next[key] = clampToRange(next[key], minAccept, maxAccept);
  }
  return next;
}

function applyFallbackInitialDynamicState(payload) {
  return {
    ...payload,
    dynamicStateInit: {
      ...FALLBACK_DYNAMIC_STATE_INIT
    }
  };
}

function resolveInitialProfilePayload(output, options = {}) {
  const attempt = Number(options.attempt || 1);
  const maxAttempts = Number(options.maxAttempts || 3);
  const validated = validateInitialProfile(output);
  if (!validated.ok) {
    return {
      ok: false,
      retryable: true,
      severe: true,
      reason: validated.error
    };
  }

  const payload = validated.value;
  const classification = classifyInitialDynamicState(payload.dynamicStateInit);
  if (classification.status === 'ok') {
    return {
      ok: true,
      value: payload,
      resolution: 'as_is'
    };
  }

  if (classification.status === 'minor') {
    return {
      ok: true,
      value: {
        ...payload,
        dynamicStateInit: normalizeInitialDynamicState(payload.dynamicStateInit)
      },
      resolution: 'minor_clamped'
    };
  }

  if (attempt >= maxAttempts) {
    return {
      ok: true,
      value: applyFallbackInitialDynamicState(payload),
      resolution: 'fallback_defaults'
    };
  }

  return {
    ok: false,
    retryable: true,
    severe: true,
    reason: classification.reason
  };
}

function buildInitialState(initialProfileOutput) {
  const base = createEmptyState();
  const state = {
    ...base,
    mode: {
      enabled: true,
      type: 'cyber_girlfriend'
    },
    meta: {
      ...base.meta,
      sessionCount: 1,
      turnCount: 0
    },
    profile: {
      ...base.profile,
      ...initialProfileOutput.profile
    },
    personalitySettings: {
      ...base.personalitySettings,
      ...(initialProfileOutput.personalitySettings || {})
    },
    dynamicState: {
      ...base.dynamicState,
      ...initialProfileOutput.dynamicStateInit
    },
    stress: initialProfileOutput.stressInit ?? FALLBACK_STRESS,
    shortTermState: {
      ...base.shortTermState,
      ...initialProfileOutput.shortTermStateInit
    },
    revealedMemory: {
      ...base.revealedMemory,
      ...initialProfileOutput.revealedMemoryInit
    },
    sessionSummaries: []
  };

  // Include emotionalProfile if the LLM provided one
  if (initialProfileOutput.emotionalProfile) {
    state.emotionalProfile = initialProfileOutput.emotionalProfile;
  }

  return state;
}

module.exports = {
  validateInitialProfile,
  classifyInitialDynamicState,
  normalizeInitialDynamicState,
  resolveInitialProfilePayload,
  STARTING_RANGES,
  FALLBACK_DYNAMIC_STATE_INIT,
  FALLBACK_STRESS,
  buildInitialState
};
