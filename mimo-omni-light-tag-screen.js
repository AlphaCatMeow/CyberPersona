#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateTtsAudio, normalizeTaggedTtsText } = require('./cyber-gf-tts');
const { loadEnvFile } = require('./cyber-gf-config');
const https = require('https');
const { getConfig } = require('./cyber-gf-config');

loadEnvFile();
const cfg = getConfig();
const BASE_URL = cfg.tts.baseUrl;
const API_KEY = cfg.tts.apiKey;
const OMNI_MODEL = process.env.XIAOMI_OMNI_MODEL || 'mimo-v2-omni';
const OUT_DIR = path.join(__dirname, 'mimo-omni-light-tag-screen');

const CASES = [
  {
    id: 'sleep',
    userIntent: '哄我睡',
    text: '好。那你先闭眼，我陪你待一会儿。',
    variants: [
      { mode: 'plain', tagged: '好。那你先闭眼，我陪你待一会儿。' },
      { mode: 'light_voice', tagged: '（轻声）好。那你先闭眼，我陪你待一会儿。' },
      { mode: 'light_gentle', tagged: '（轻声，温柔）好。那你先闭眼，我陪你待一会儿。' },
      { mode: 'gentle_only', tagged: '（温柔）好。那你先闭眼，我陪你待一会儿。' }
    ]
  },
  {
    id: 'complaint',
    userIntent: '你都不理我',
    text: '你现在才来找我啊，我本来都想先不理你了。',
    variants: [
      { mode: 'plain', tagged: '你现在才来找我啊，我本来都想先不理你了。' },
      { mode: 'hurt_only', tagged: '（委屈）你现在才来找我啊，我本来都想先不理你了。' },
      { mode: 'hurt_tsundere', tagged: '（委屈，嘴硬）你现在才来找我啊，我本来都想先不理你了。' },
      { mode: 'tsundere_only', tagged: '（嘴硬）你现在才来找我啊，我本来都想先不理你了。' }
    ]
  },
  {
    id: 'soften',
    userIntent: '那你最好说话算话',
    text: '……那你最好说话算话。',
    variants: [
      { mode: 'plain', tagged: '……那你最好说话算话。' },
      { mode: 'shy_only', tagged: '（害羞）……那你最好说话算话。' },
      { mode: 'soft_only', tagged: '（心软）……那你最好说话算话。' },
      { mode: 'shy_soft', tagged: '（害羞，心软）……那你最好说话算话。' }
    ]
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function mimeFromPath(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
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
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, json: JSON.parse(data), raw: data });
        } catch (err) {
          reject(new Error(`parse error: ${err.message}; body=${String(data).slice(0, 500)}`));
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
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch {}
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch {}
  }
  return null;
}

function fallbackEval(text, expectedTags) {
  const s = String(text || '');
  const recognized = [];
  for (const tag of ['轻声', '温柔', '委屈', '嘴硬', '开心', '悲伤', '害羞', '心软']) {
    if (s.includes(tag)) recognized.push(tag);
  }
  return {
    naturalness: /非常自然|很自然|自然度高/.test(s) ? 5 : /自然|流畅|真人/.test(s) ? 4 : /不自然|生硬|机械/.test(s) ? 2 : 3,
    weirdness: /明显奇怪|很奇怪|非常奇怪/.test(s) ? 4 : /奇怪|违和|发腔|僵硬|过演/.test(s) ? 3 : /不奇怪|没有奇怪/.test(s) ? 1 : 2,
    tag_match: expectedTags.length ? Math.min(5, Math.max(1, recognized.filter(x => expectedTags.includes(x)).length + 2)) : 3,
    overacted: /过演|表演感强|发腔/.test(s),
    recognized_style: recognized,
    short_reason: '模型未严格按 JSON 输出，使用文本回退提取。',
    detail: s.slice(0, 120)
  };
}

async function evalAudio(file, expectedTags, caseId, mode) {
  const buf = fs.readFileSync(file);
  const dataUrl = `data:${mimeFromPath(file)};base64,${buf.toString('base64')}`;
  const payload = {
    model: OMNI_MODEL,
    messages: [
      { role: 'system', content: '你是严格的中文语音质检员，不要展示思考过程，只输出一行 JSON。' },
      {
        role: 'user',
        content: [
          { type: 'input_audio', input_audio: { data: dataUrl } },
          { type: 'text', text: [
            '请听这段中文音频，只输出一行 JSON。',
            `case_id: ${caseId}`,
            `variant: ${mode}`,
            `expected_tags: ${expectedTags.join('、') || '无'}`,
            '重点判断这段音频：1）是否自然；2）是否奇怪/发腔；3）是否体现了预期轻标签。',
            '返回 JSON 字段：{"naturalness":0-5,"weirdness":0-5,"tag_match":0-5,"overacted":true/false,"recognized_style":["词1"],"short_reason":"一句中文","detail":"一句中文"}'
          ].join('\n') }
        ]
      }
    ],
    max_completion_tokens: 180,
    temperature: 0.1
  };
  const { status, json, raw } = await postJson(payload);
  if (status < 200 || status >= 300) throw new Error(`HTTP ${status}: ${raw.slice(0, 500)}`);
  const text = extractText(json);
  const parsed = tryParseJson(text) || fallbackEval(text, expectedTags);
  return { evaluation: parsed, rawText: text };
}

function mean(values) {
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

async function main() {
  ensureDir(OUT_DIR);
  const outputs = [];
  for (const c of CASES) {
    for (const v of c.variants) {
      const normalized = normalizeTaggedTtsText(v.tagged);
      console.log(`generating ${c.id}/${v.mode} ...`);
      const audio = await generateTtsAudio(normalized, '');
      console.log(`evaluating ${c.id}/${v.mode} ...`);
      const expectedTags = (() => {
        const m = normalized.match(/^（([^）]+)）/);
        return m ? m[1].split(/[，,、\s]+/).filter(Boolean) : [];
      })();
      const judged = await evalAudio(audio.filepath, expectedTags, c.id, v.mode);
      outputs.push({
        caseId: c.id,
        text: c.text,
        mode: v.mode,
        tagged: normalized,
        audio,
        expectedTags,
        ...judged
      });
    }
  }

  const byCase = {};
  for (const item of outputs) {
    byCase[item.caseId] ||= [];
    byCase[item.caseId].push(item);
  }

  const summary = {};
  for (const [caseId, items] of Object.entries(byCase)) {
    summary[caseId] = items
      .map(x => ({
        mode: x.mode,
        tagged: x.tagged,
        naturalness: Number(x.evaluation.naturalness || 0),
        weirdness: Number(x.evaluation.weirdness || 0),
        tag_match: Number(x.evaluation.tag_match || 0),
        overacted: !!x.evaluation.overacted,
        recognized_style: x.evaluation.recognized_style || [],
        short_reason: x.evaluation.short_reason || ''
      }))
      .sort((a, b) => (b.naturalness - a.naturalness) || (a.weirdness - b.weirdness) || (a.overacted - b.overacted));
  }

  const aggregate = {
    naturalness_avg: mean(outputs.map(x => Number(x.evaluation.naturalness || 0))),
    weirdness_avg: mean(outputs.map(x => Number(x.evaluation.weirdness || 0))),
    tag_match_avg: mean(outputs.map(x => Number(x.evaluation.tag_match || 0))),
    overacted_count: outputs.filter(x => x.evaluation.overacted === true).length
  };

  const report = {
    generatedAt: new Date().toISOString(),
    omniModel: OMNI_MODEL,
    count: outputs.length,
    aggregate,
    summary,
    results: outputs
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# MiMo Omni Light Tag Screen');
  lines.push('');
  lines.push(`- 时间: ${report.generatedAt}`);
  lines.push(`- omniModel: ${OMNI_MODEL}`);
  lines.push(`- 样本数: ${outputs.length}`);
  lines.push('');
  lines.push('## 总体');
  lines.push(`- naturalness_avg: ${aggregate.naturalness_avg}`);
  lines.push(`- weirdness_avg: ${aggregate.weirdness_avg}`);
  lines.push(`- tag_match_avg: ${aggregate.tag_match_avg}`);
  lines.push(`- overacted_count: ${aggregate.overacted_count}/${outputs.length}`);
  lines.push('');
  for (const [caseId, items] of Object.entries(summary)) {
    lines.push(`## ${caseId}`);
    lines.push('');
    for (const item of items) {
      lines.push(`### ${item.mode}`);
      lines.push(`- tagged: ${item.tagged}`);
      lines.push(`- naturalness: ${item.naturalness}`);
      lines.push(`- weirdness: ${item.weirdness}`);
      lines.push(`- tag_match: ${item.tag_match}`);
      lines.push(`- overacted: ${item.overacted}`);
      lines.push(`- recognized_style: ${item.recognized_style.join('、')}`);
      lines.push(`- short_reason: ${item.short_reason}`);
      lines.push('');
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), lines.join('\n'));
  console.log(`mimo-omni-light-tag-screen-ready: ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
