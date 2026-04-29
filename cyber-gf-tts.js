const https = require('https');
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./cyber-gf-config');

const BUILTIN_VOICE_MODELS = new Set(['mimo-v2.5-tts', 'mimo-v2-tts']);
const VOICE_DESIGN_MODELS = new Set(['mimo-v2.5-tts-voicedesign']);
const VOICE_CLONE_MODELS = new Set(['mimo-v2.5-tts-voiceclone']);

function getTtsConfig() {
  const config = getConfig();
  return {
    ...config.tts,
    outputDir: config.ttsOutputDir
  };
}

function sanitizeNaturalStylePrompt(input) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  return text
    .replace(/(^|\s)(Role|Scene|Guidance)\s*:/gi, ' ')
    .replace(/导演模式|分镜|舞台调度|镜头感|角色小传|电影旁白腔/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function sanitizeTaggedTtsText(input) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const normalized = normalizeTaggedTtsText(text);
  return normalized.slice(0, 1000);
}

function splitLeadingTagAndBody(text) {
  const match = text.match(/^[（(\[]([^）)\]]+)[）)\]]\s*(.*)$/s);
  if (!match) return { tagContent: '', body: text.trim() };
  return {
    tagContent: String(match[1] || '').trim(),
    body: String(match[2] || '').trim()
  };
}

function normalizeTagList(tagContent) {
  const rawItems = String(tagContent || '')
    .split(/[，,、\s]+/)
    .map(x => x.trim())
    .filter(Boolean);

  const synonyms = new Map([
    ['放轻一点', '轻声'],
    ['声音轻一点', '轻声'],
    ['慢一点', '慢一点'],
    ['放慢一点', '慢一点'],
    ['温柔一点', '温柔'],
    ['带一点笑意', '笑意'],
    ['压着笑意', '笑意'],
    ['嘴硬地放软', '嘴硬'],
    ['轻轻心软', '心软'],
    ['贴近一点', '轻声']
  ]);

  const canonical = [];
  for (const item of rawItems) {
    const mapped = synonyms.get(item) || item;
    if (!canonical.includes(mapped)) canonical.push(mapped);
  }

  const allowPriority = ['轻声', '温柔', '委屈', '嘴硬', '开心', '悲伤', '害羞', '心软'];
  const filtered = canonical.filter(x => allowPriority.includes(x));
  const finalTags = (filtered.length ? filtered : canonical).slice(0, 2);
  return finalTags;
}

function normalizeBodyText(body) {
  return String(body || '')
    .replace(/\[(轻哼|停顿|沉默片刻|深呼吸|笑)\]/g, '')
    .replace(/（沉默片刻）/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTaggedTtsText(input) {
  const text = String(input || '').trim();
  if (!text) return '';

  const { tagContent, body } = splitLeadingTagAndBody(text);
  const cleanBody = normalizeBodyText(body || text);
  if (!cleanBody) return '';

  const tags = normalizeTagList(tagContent);
  if (!tags.length) return cleanBody;
  return `（${tags.join('，')}）${cleanBody}`;
}

function shouldUseStylePrompt(taggedTtsText, naturalStylePrompt) {
  const style = sanitizeNaturalStylePrompt(naturalStylePrompt);
  if (!style) return false;

  const config = getTtsConfig();
  if (BUILTIN_VOICE_MODELS.has(config.model)) {
    return false;
  }

  const tagged = sanitizeTaggedTtsText(taggedTtsText);
  const strongTags = /(哄睡|轻声|温柔|委屈|嘴硬|安抚|释然|悲伤|开心|兴奋)/;
  const repairLike = /(别慌|我在呢|闭上眼|陪你|慢慢说|先睡|晚安)/;

  if (strongTags.test(tagged) && !repairLike.test(tagged)) {
    return false;
  }

  return true;
}

function buildAudioConfig(config) {
  const audio = {
    format: config.format || 'mp3'
  };

  if (BUILTIN_VOICE_MODELS.has(config.model)) {
    audio.voice = config.voice || 'mimo_default';
  }

  return audio;
}

function buildTtsRequest(taggedTtsText, naturalStylePrompt) {
  const CONFIG = getTtsConfig();
  const cleanTaggedText = sanitizeTaggedTtsText(taggedTtsText);
  const cleanStylePrompt = sanitizeNaturalStylePrompt(naturalStylePrompt);
  const messages = [];

  if (!cleanTaggedText) {
    throw new Error('TTS target text is empty');
  }

  if (shouldUseStylePrompt(cleanTaggedText, cleanStylePrompt)) {
    messages.push({ role: 'user', content: cleanStylePrompt });
  } else if (VOICE_DESIGN_MODELS.has(CONFIG.model)) {
    throw new Error('MiMo voice design model requires a user style description');
  }

  messages.push({ role: 'assistant', content: cleanTaggedText });

  const payload = {
    model: CONFIG.model,
    messages,
    audio: buildAudioConfig(CONFIG)
  };

  if (VOICE_CLONE_MODELS.has(CONFIG.model) && !payload.audio.voice) {
    throw new Error('MiMo voice clone model requires audio.voice to contain the base64 reference sample');
  }

  return payload;
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
  sanitizeNaturalStylePrompt,
  sanitizeTaggedTtsText,
  normalizeTaggedTtsText,
  shouldUseStylePrompt,
  getTtsConfig,
  generateTtsAudio,
  generateFromLastTurn,
  requestTtsWithRetry,
  probeTtsChain
};
