#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const { loadEnvFile, getConfig } = require('./cyber-gf-config');

loadEnvFile();
const config = getConfig();
const BASE_URL = config.tts.baseUrl || 'https://api.xiaomimimo.com/v1';
const API_KEY = config.tts.apiKey;
const MODEL = process.env.XIAOMI_OMNI_MODEL || 'mimo-v2-omni';
const REPORT_PATH = path.join(__dirname, 'tts-official-ab-test', 'report.json');
const OUT_DIR = path.join(__dirname, 'mimo-omni-eval');

if (!API_KEY) {
  console.error('Missing XIAOMI_API_KEY in .env.cyber-gf');
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function mimeFromPath(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.ogg') return 'audio/ogg';
  return 'application/octet-stream';
}

function postJson(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname.replace(/\/$/, '')}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode || 0, json, raw: data });
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}; body=${String(data).slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function extractText(resp) {
  return resp?.choices?.[0]?.message?.content || resp?.choices?.[0]?.message?.reasoning_content || '';
}

function tryParseJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {}
  }
  return null;
}

async function evaluateOne(item) {
  const fileBuffer = fs.readFileSync(item.filepath);
  const dataUrl = `data:${mimeFromPath(item.filepath)};base64,${fileBuffer.toString('base64')}`;
  const expectedTags = (() => {
    const text = String(item.assistantText || '');
    const m = text.match(/^（([^）]+)）/);
    return m ? m[1].split(/[，,、\s]+/).filter(Boolean) : [];
  })();

  const prompt = [
    '你是中文语音质检评审员。请听这段中文音频。不要展示思考过程，不要解释，只输出一行 JSON。',
    `场景ID: ${item.scene}`,
    `生成模式: ${item.mode}`,
    `预期文本: ${item.payload?.messages?.[item.payload.messages.length - 1]?.content || item.assistantText}`,
    `预期标签: ${expectedTags.length ? expectedTags.join('、') : '无显式标签'}`,
    '',
    '请判断：',
    '1. 音频内容和预期文本是否基本一致',
    '2. 如果有标签，音频是否体现了这些标签对应的语气',
    '3. 最重要：整体是否自然、像真人正常说话，而不是奇怪、过演、发腔、僵硬',
    '',
    '请返回严格 JSON，字段如下：',
    '{',
    '  "transcript_match": 0-5,',
    '  "tag_match": 0-5,',
    '  "naturalness": 0-5,',
    '  "weirdness": 0-5,',
    '  "overacted": true/false,',
    '  "recognized_style": ["词1","词2"],',
    '  "short_reason": "一句中文总结",',
    '  "detail": "一句中文说明"',
    '}',
    '分数含义：5=非常强/非常好；0=完全没有或非常差。weirdness 越高表示越奇怪。不要输出 Markdown，不要输出代码块，不要输出字段解释。'
  ].join('\n');

  const payload = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: '你是严谨的中文音频质检助手，只输出 JSON，不要解释。'
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: { data: dataUrl }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ],
    max_completion_tokens: 220,
    temperature: 0.1
  };

  const { status, json, raw } = await postJson(payload);
  if (status < 200 || status >= 300) {
    throw new Error(`HTTP ${status}: ${raw.slice(0, 500)}`);
  }
  if (json.detail) {
    throw new Error(`API detail: ${JSON.stringify(json.detail)}`);
  }

  const text = extractText(json);
  const parsed = tryParseJson(text);
  if (!parsed) {
    const fallback = buildFallbackFromText(text, expectedTags);
    if (fallback) {
      return {
        basename: item.basename,
        scene: item.scene,
        mode: item.mode,
        expectedTags,
        filepath: item.filepath,
        evaluation: fallback,
        rawText: text,
        fallbackParsed: true
      };
    }
    throw new Error(`Model did not return parseable JSON: ${String(text).slice(0, 1200)}`);
  }

  return {
    basename: item.basename,
    scene: item.scene,
    mode: item.mode,
    expectedTags,
    filepath: item.filepath,
    evaluation: parsed,
    rawText: text
  };
}

function buildFallbackFromText(text, expectedTags = []) {
  const s = String(text || '');
  if (!s.trim()) return null;

  const transcriptMatch = /转写|transcript|听到/.test(s) ? 4 : 3;

  let naturalness = 3;
  if (/自然|流畅|像真实|真人/.test(s)) naturalness = 4;
  if (/非常自然|很自然|自然度高/.test(s)) naturalness = 5;
  if (/不自然|生硬|机械/.test(s)) naturalness = 2;

  let weirdness = 2;
  if (/没有奇怪|不奇怪|奇怪程度低/.test(s)) weirdness = 1;
  if (/奇怪|违和|发腔|僵硬|过演/.test(s)) weirdness = 3;
  if (/明显奇怪|很奇怪|非常奇怪/.test(s)) weirdness = 4;

  const recognized = [];
  for (const tag of ['轻声', '温柔', '委屈', '嘴硬', '开心', '悲伤', '害羞', '心软']) {
    if (s.includes(tag)) recognized.push(tag);
  }
  const tagMatch = expectedTags.length ? Math.min(5, Math.max(1, recognized.filter(x => expectedTags.includes(x)).length + 2)) : 3;
  const overacted = /过演|表演感强|发腔/.test(s);

  return {
    transcript_match: transcriptMatch,
    tag_match: tagMatch,
    naturalness,
    weirdness,
    overacted,
    recognized_style: recognized,
    short_reason: '模型返回未严格 JSON，已按文本结论回退提取。',
    detail: s.slice(0, 120)
  };
}

function mean(values) {
  if (!values.length) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function summarize(results) {
  const byMode = {};
  for (const r of results) {
    byMode[r.mode] ||= [];
    byMode[r.mode].push(r);
  }
  const modeSummary = {};
  for (const [mode, items] of Object.entries(byMode)) {
    modeSummary[mode] = {
      count: items.length,
      transcript_match_avg: mean(items.map(x => Number(x.evaluation.transcript_match || 0))),
      tag_match_avg: mean(items.map(x => Number(x.evaluation.tag_match || 0))),
      naturalness_avg: mean(items.map(x => Number(x.evaluation.naturalness || 0))),
      weirdness_avg: mean(items.map(x => Number(x.evaluation.weirdness || 0))),
      overacted_count: items.filter(x => x.evaluation.overacted === true).length
    };
  }
  return modeSummary;
}

function buildMarkdown(results, modeSummary) {
  const lines = [];
  lines.push('# MiMo Omni Audio Evaluation');
  lines.push('');
  lines.push(`- 时间: ${new Date().toISOString()}`);
  lines.push(`- 模型: ${MODEL}`);
  lines.push(`- 样本数: ${results.length}`);
  lines.push('');
  lines.push('## 按模式汇总');
  lines.push('');
  for (const mode of Object.keys(modeSummary).sort()) {
    const s = modeSummary[mode];
    lines.push(`### ${mode}`);
    lines.push(`- transcript_match_avg: ${s.transcript_match_avg}`);
    lines.push(`- tag_match_avg: ${s.tag_match_avg}`);
    lines.push(`- naturalness_avg: ${s.naturalness_avg}`);
    lines.push(`- weirdness_avg: ${s.weirdness_avg}`);
    lines.push(`- overacted_count: ${s.overacted_count}/${s.count}`);
    lines.push('');
  }

  const sorted = [...results].sort((a, b) => a.basename.localeCompare(b.basename));
  lines.push('## 单条结果');
  lines.push('');
  for (const r of sorted) {
    const e = r.evaluation;
    lines.push(`### ${r.basename}`);
    lines.push(`- scene: ${r.scene}`);
    lines.push(`- mode: ${r.mode}`);
    lines.push(`- expectedTags: ${r.expectedTags.join('、') || '无'}`);
    lines.push(`- transcript_match: ${e.transcript_match}`);
    lines.push(`- tag_match: ${e.tag_match}`);
    lines.push(`- naturalness: ${e.naturalness}`);
    lines.push(`- weirdness: ${e.weirdness}`);
    lines.push(`- overacted: ${e.overacted}`);
    lines.push(`- recognized_style: ${(e.recognized_style || []).join('、')}`);
    lines.push(`- short_reason: ${e.short_reason}`);
    lines.push(`- detail: ${e.detail}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  ensureDir(OUT_DIR);
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const items = (report.results || []).filter(x => x.success && x.filepath && fs.existsSync(x.filepath));
  const results = [];
  for (const item of items) {
    console.log(`evaluating ${item.basename} ...`);
    const out = await evaluateOne(item);
    results.push(out);
  }
  const modeSummary = summarize(results);
  const full = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    baseUrl: BASE_URL,
    sourceReport: REPORT_PATH,
    count: results.length,
    modeSummary,
    results
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(full, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), buildMarkdown(results, modeSummary));
  console.log(`mimo-omni-eval-ready: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
