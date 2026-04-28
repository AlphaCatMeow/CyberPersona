const { createEmptyState } = require('./cyber-gf-state');

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

  const requiredProfileKeys = ['coreSummary', 'relationshipSummary', 'defenseSummary', 'startSummary', 'voiceSummary', 'profileSummary'];
  for (const key of requiredProfileKeys) {
    if (typeof profile[key] !== 'string' || !profile[key].trim()) {
      return { ok: false, error: `Missing profile field: ${key}` };
    }
  }

  const allowedLevels = new Set(['low', 'medium', 'high']);
  for (const key of ['relationshipWarmth', 'safety', 'trust', 'approachDesire', 'vulnerabilityWillingness', 'voiceEase']) {
    if (!allowedLevels.has(dynamicStateInit[key])) {
      return { ok: false, error: `Invalid dynamic state level for ${key}` };
    }
  }

  if (typeof openingMessage !== 'string' || !openingMessage.trim()) {
    return { ok: false, error: 'openingMessage is required' };
  }

  return { ok: true, value: output };
}

function buildInitialState(initialProfileOutput) {
  const base = createEmptyState();
  return {
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
    dynamicState: {
      ...base.dynamicState,
      ...initialProfileOutput.dynamicStateInit
    },
    shortTermState: {
      ...base.shortTermState,
      ...initialProfileOutput.shortTermStateInit
    },
    revealedMemory: {
      ...base.revealedMemory,
      ...initialProfileOutput.revealedMemoryInit
    }
  };
}

module.exports = {
  validateInitialProfile,
  buildInitialState
};
