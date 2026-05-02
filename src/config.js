const fs = require('fs');
const path = require('path');

const ENV_PATH = process.env.CYBER_GF_ENV_FILE || path.resolve(process.cwd(), '.env.cyber-gf');
let loaded = false;

function loadEnvFile() {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getConfig() {
  loadEnvFile();
  return {
    stateFile: process.env.CYBER_GF_STATE_FILE || path.resolve(process.cwd(), 'data', 'state.json'),
    historyFile: process.env.CYBER_GF_HISTORY_FILE || path.resolve(process.cwd(), 'data', 'history.json'),
    ttsOutputDir: process.env.CYBER_GF_TTS_OUTPUT_DIR || path.resolve(process.cwd(), 'data', 'tts'),
    imageOutputDir: process.env.CYBER_GF_IMAGE_OUTPUT_DIR || path.resolve(process.cwd(), 'data', 'img'),
    debug: {
      enabled: /^(1|true|yes|on)$/i.test(process.env.CYBER_GF_DEBUG || ''),
      showTtsControls: /^(1|true|yes|on)$/i.test(process.env.CYBER_GF_DEBUG_TTS || process.env.CYBER_GF_DEBUG || '')
    }
  };
}

function validateConfig() {
  const config = getConfig();
  const issues = [];

  if (!config.stateFile) {
    issues.push({ key: 'CYBER_GF_STATE_FILE', message: '缺少状态文件路径' });
  }

  return {
    ok: issues.length === 0,
    issues,
    config,
    envPath: ENV_PATH
  };
}

module.exports = {
  ENV_PATH,
  loadEnvFile,
  getConfig,
  validateConfig
};
