#!/usr/bin/env node
/**
 * Xiaomi MiMo TTS 官方风格控制 A/B 测试
 * 目标：严格按官方文档允许的两层控制，比较最小控制策略
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildTtsRequest, sanitizeNaturalStylePrompt, sanitizeTaggedTtsText } = require('./cyber-gf-tts');
const { getConfig } = require('./cyber-gf-config');

const TTS_CONFIG = getConfig().tts;

const CONFIG = {
  baseUrl: TTS_CONFIG.baseUrl,
  apiKey: TTS_CONFIG.apiKey,
  outputDir: '/root/.openclaw/workspace/tts-official-ab-test'
};

const SCENES = [
  {
    id: 'sleep_story',
    text: '今晚风很轻，你先慢慢闭上眼，我陪你待一会儿。',
    style: '温柔、放轻一点，像睡前哄人，语速偏慢，别太用力。',
    tagged: '（温柔）今晚风很轻，你先慢慢闭上眼，我陪你待一会儿。'
  },
  {
    id: 'soft_complaint',
    text: '你现在才来找我啊，我本来都想先不理你了。',
    style: '带一点委屈和嘴硬，别发脾气，后半句稍微软下来。',
    tagged: '（委屈，嘴硬）你现在才来找我啊，我本来都想先不理你了。'
  },
  {
    id: 'gentle_reassure',
    text: '没事，我在呢，你先别慌，慢慢跟我说。',
    style: '温柔、稳定，让人安心，语速适中，气息平一点。',
    tagged: '（温柔）没事，我在呢，你先别慌，慢慢跟我说。'
  }
];

const MODES = [
  {
    id: 'plain',
    build(scene) {
      return { user: null, assistant: scene.text };
    }
  },
  {
    id: 'style_only',
    build(scene) {
      return { user: scene.style, assistant: scene.text };
    }
  },
  {
    id: 'tag_only',
    build(scene) {
      return { user: null, assistant: scene.tagged };
    }
  },
  {
    id: 'style_plus_tag',
    build(scene) {
      return { user: scene.style, assistant: scene.tagged };
    }
  }
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function requestPayload(payload, basename) {
  return new Promise((resolve, reject) => {
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode || 0;
        try {
          const response = JSON.parse(data);
          if (response.detail) {
            return reject(new Error(`API error: ${JSON.stringify(response.detail).slice(0, 300)}`));
          }
          const audioData = response.choices?.[0]?.message?.audio?.data;
          if (!audioData) {
            return reject(new Error(`No audio data (status=${status})`));
          }
          const buffer = Buffer.from(audioData, 'base64');
          const filepath = path.join(CONFIG.outputDir, `${basename}.mp3`);
          fs.writeFileSync(filepath, buffer);
          resolve({ filepath, size: buffer.length, response });
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}; body=${String(data).slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Request error: ${err.message}`)));
    req.write(postData);
    req.end();
  });
}

function probeAudio(filepath) {
  try {
    const raw = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate,size',
      '-of', 'json',
      filepath
    ], { encoding: 'utf8' });
    const parsed = JSON.parse(raw);
    const fmt = parsed.format || {};
    return {
      durationSec: Number(fmt.duration || 0),
      bitRate: Number(fmt.bit_rate || 0),
      fileSize: Number(fmt.size || 0)
    };
  } catch (err) {
    return { probeError: err.message };
  }
}

async function run() {
  if (!CONFIG.apiKey) {
    throw new Error('Missing XIAOMI_API_KEY');
  }
  ensureDir(CONFIG.outputDir);

  const results = [];
  let index = 0;

  for (const scene of SCENES) {
    for (const mode of MODES) {
      index += 1;
      const built = mode.build(scene);
      const payload = buildTtsRequest(
        sanitizeTaggedTtsText(built.assistant),
        sanitizeNaturalStylePrompt(built.user || '')
      );
      const basename = `${String(index).padStart(2, '0')}_${scene.id}_${mode.id}`;
      process.stdout.write(`[${index}/${SCENES.length * MODES.length}] ${basename} ... `);
      try {
        const out = await requestPayload(payload, basename);
        const audioInfo = probeAudio(out.filepath);
        const item = {
          success: true,
          basename,
          scene: scene.id,
          mode: mode.id,
          filepath: out.filepath,
          size: out.size,
          userPrompt: built.user,
          assistantText: built.assistant,
          payload,
          audioInfo
        };
        results.push(item);
        console.log(`✅ ${(out.size / 1024).toFixed(1)} KB / ${audioInfo.durationSec?.toFixed?.(2) || 'n/a'}s`);
      } catch (err) {
        results.push({
          success: false,
          basename,
          scene: scene.id,
          mode: mode.id,
          userPrompt: built.user,
          assistantText: built.assistant,
          error: err.message
        });
        console.log(`❌ ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 1800));
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    scenes: SCENES,
    modes: MODES.map(({ id }) => id),
    summary: {
      total: results.length,
      success: results.filter(r => r.success).length,
      fail: results.filter(r => !r.success).length
    },
    results
  };

  const reportPath = path.join(CONFIG.outputDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 report: ${reportPath}`);
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
