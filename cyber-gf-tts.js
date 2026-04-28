const https = require('https');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./cyber-gf-config');

function getTtsConfig() {
  const config = getConfig();
  return {
    ...config.tts,
    outputDir: config.ttsOutputDir
  };
}

function buildTtsRequest(taggedTtsText, naturalStylePrompt) {
  const CONFIG = getTtsConfig();
  const messages = [];
  if (naturalStylePrompt && naturalStylePrompt.trim()) {
    messages.push({ role: 'user', content: naturalStylePrompt.trim() });
  }
  messages.push({ role: 'assistant', content: taggedTtsText });
  return {
    model: CONFIG.model,
    messages,
    audio: {
      format: CONFIG.format,
      voice: CONFIG.voice
    }
  };
}

function ensureOutputDir() {
  const CONFIG = getTtsConfig();
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

function generateTtsAudio(taggedTtsText, naturalStylePrompt) {
  return requestTtsWithRetry(taggedTtsText, naturalStylePrompt, 2);
}

function requestTtsOnce(taggedTtsText, naturalStylePrompt) {
  return new Promise((resolve, reject) => {
    const CONFIG = getTtsConfig();
    const payload = buildTtsRequest(taggedTtsText, naturalStylePrompt);
    const postData = JSON.stringify(payload);
    const url = new URL(CONFIG.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname.replace(/\/$/, '')}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': CONFIG.apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = res.statusCode || 0;
        const contentType = res.headers['content-type'] || '';
        try {
          const response = JSON.parse(data);
          if (response.detail) {
            reject(new Error(`API error: ${JSON.stringify(response.detail)}`));
            return;
          }
          const audioData = response.choices?.[0]?.message?.audio?.data;
          if (!audioData) {
            reject(new Error(`No audio data (status=${status}, content-type=${contentType})`));
            return;
          }
          const buffer = Buffer.from(audioData, 'base64');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `cyber-gf-${timestamp}.mp3`;
          ensureOutputDir();
          const filepath = path.join(CONFIG.outputDir, filename);
          fs.writeFileSync(filepath, buffer);
          resolve({ filename, filepath, size: buffer.length });
        } catch (err) {
          const preview = String(data).slice(0, 300).replace(/\s+/g, ' ');
          reject(new Error(`Parse error: ${err.message}; status=${status}; content-type=${contentType}; body=${preview}`));
        }
      });
    });

    req.on('error', err => reject(new Error(`Request error: ${err.message}`)));
    req.write(postData);
    req.end();
  });
}

async function requestTtsWithRetry(taggedTtsText, naturalStylePrompt, attempts = 2) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await requestTtsOnce(taggedTtsText, naturalStylePrompt);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

function generateFromLastTurn(state) {
  const last = state?.runtimeCache?.lastTurnTts;
  if (!last?.taggedTtsText) {
    throw new Error('No cached TTS turn available');
  }
  return generateTtsAudio(last.taggedTtsText, last.naturalStylePrompt || '');
}

async function probeTtsChain() {
  const testTagged = '（轻声，平稳）这是赛博女友模式启动前的语音链路自检。';
  const testPrompt = '保持自然、简短、不要夸张，只验证语音接口可正常返回音频。';
  return generateTtsAudio(testTagged, testPrompt);
}

module.exports = {
  buildTtsRequest,
  getTtsConfig,
  generateTtsAudio,
  generateFromLastTurn,
  requestTtsWithRetry,
  probeTtsChain
};
