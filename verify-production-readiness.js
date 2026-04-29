#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { normalizeTaggedTtsText, buildTtsRequest } = require('./cyber-gf-tts');
const { normalizeTurnPayloadForRuntime } = require('./cyber-gf-controller');
const { validateTurnOutput } = require('./cyber-gf-turn');

const ROOT = __dirname;
const REQUIRED_SAMPLE_JSONS = [
  '_sample_turn_payload.json',
  '_turn_flow_test.json',
];

const OPTIONAL_LIVE_SAMPLE_JSONS = [
  '_live_turn_payload_1.json',
  '_live_turn_payload_2.json',
  '_live_turn_payload_3.json',
  '_live_turn_payload_4.json',
  '_live_turn_payload_5.json',
  '_live_turn_payload_6.json',
  '_live_turn_payload_7.json'
];

const DOCS = [
  'PROJECT-STATUS.md',
  'RELEASE-NOTES-2026-04-29.md',
  'SUBMISSION-GUIDE.md',
  'MAINTAINER-CHECKLIST.md',
  'TTS-TESTS.md',
  'TTS-TAG-STYLE-GUIDE.md',
  'XIAOMI-TTS-CONFIG.md',
  'CYBER_GIRLFRIEND.md',
  path.join('docs', 'architecture.md'),
  path.join('docs', 'repository-scope.md')
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyJsonSamples() {
  const forbidden = ['slight_up', 'slight_down', 'keep', '[轻哼]', '声音轻一点', '带一点笑意', '压着笑意', '轻轻心软'];
  const sampleJsons = [
    ...REQUIRED_SAMPLE_JSONS,
    ...OPTIONAL_LIVE_SAMPLE_JSONS.filter((rel) => fs.existsSync(path.join(ROOT, rel)))
  ];

  for (const rel of REQUIRED_SAMPLE_JSONS) {
    assert(fs.existsSync(path.join(ROOT, rel)), `${rel} is required for production readiness verification`);
  }

  for (const rel of sampleJsons) {
    const raw = readText(rel);
    for (const needle of forbidden) {
      assert(!raw.includes(needle), `${rel} still contains forbidden legacy marker: ${needle}`);
    }

    const payload = readJson(rel);
    const validated = validateTurnOutput(payload);
    assert(validated.ok, `${rel} failed validateTurnOutput: ${validated.error}`);
    assert(payload.naturalStylePrompt === '', `${rel} naturalStylePrompt must be empty in production samples`);

    const normalized = normalizeTurnPayloadForRuntime(payload, payload.__userMessage || '');
    assert(normalized.naturalStylePrompt === '', `${rel} runtime normalize must clear naturalStylePrompt`);
    assert(/^（[^）]+）/.test(normalized.taggedTtsText), `${rel} normalized taggedTtsText should start with compact leading tag`);

    const tagCount = (() => {
      const m = normalized.taggedTtsText.match(/^（([^）]+)）/);
      if (!m) return 0;
      return m[1].split(/[，,、\s]+/).filter(Boolean).length;
    })();
    assert(tagCount >= 1 && tagCount <= 2, `${rel} should use 1-2 leading tags after normalize`);
  }
}

function verifyNormalization() {
  const raw = '（委屈，嘴硬，声音轻一点）你现在才来找我啊。[轻哼]';
  const normalized = normalizeTaggedTtsText(raw);
  assert(normalized === '（委屈，嘴硬）你现在才来找我啊。', `unexpected normalizeTaggedTtsText result: ${normalized}`);

  const sleepPayload = {
    visibleText: '好。那你现在别再想别的了，慢一点，把眼睛闭上。',
    taggedTtsText: '好。那你现在别再想别的了，慢一点，把眼睛闭上。',
    naturalStylePrompt: '保持自然、安稳、克制。',
    currentEmotion: '温柔安抚',
    sendVoiceNow: true,
    stateDelta: { relationshipWarmth: 0, safety: 0, trust: 0, approachDesire: 0, vulnerabilityWillingness: 0, voiceEase: 0 },
    shortTermUpdate: { unresolvedEmotion: 'none', interactionTrend: 'steady', recentVoicePattern: 'comforting_voice' },
    memoryUpdate: { nicknameForUser: null, nicknameForSelf: null, sharedRoutinesAdd: [], revealedFactsAdd: [], importantEventsAdd: [], lastSummary: 'test' }
  };
  const next = normalizeTurnPayloadForRuntime(sleepPayload, '哄我睡');
  assert(next.naturalStylePrompt === '', 'sleep normalization must clear naturalStylePrompt');
  assert(next.taggedTtsText.startsWith('（轻声，温柔）'), 'sleep normalization should repair missing leading tag');
}

function verifyTtsRequestPolicy() {
  const payload = buildTtsRequest('（轻声，温柔）晚安。', '请更温柔一点');
  assert(Array.isArray(payload.messages), 'TTS request must contain messages');
  assert(payload.messages.length === 1, 'builtin production TTS request should only send assistant text');
  assert(payload.messages[0].role === 'assistant', 'builtin production TTS request should send assistant role only');
}

function verifyDocs() {
  for (const rel of DOCS) {
    const text = readText(rel);
    assert(/tag_only|只使用 `taggedTtsText`/.test(text), `${rel} should mention tag_only production strategy`);
    assert(/默认留空|left empty|stays empty|leaves `naturalStylePrompt` empty/.test(text), `${rel} should mention empty naturalStylePrompt production policy`);
  }
}

function runNodeScript(rel, expectedToken) {
  const output = cp.execFileSync(process.execPath, [path.join(ROOT, rel)], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  assert(output.includes(expectedToken), `${rel} did not produce expected token: ${expectedToken}`);
}

function verifyLiveAdapter() {
  assert(fs.existsSync(path.join(ROOT, 'openclaw-cyber-gf-adapter.js')), 'openclaw-cyber-gf-adapter.js is required');
  assert(fs.existsSync(path.join(ROOT, 'test-openclaw-cyber-gf-adapter.js')), 'test-openclaw-cyber-gf-adapter.js is required');
  assert(fs.existsSync(path.join(ROOT, 'test-openclaw-cyber-gf-live-loop.js')), 'test-openclaw-cyber-gf-live-loop.js is required');
  runNodeScript('test-openclaw-cyber-gf-adapter.js', 'openclaw-cyber-gf-adapter-ok');
  runNodeScript('test-openclaw-cyber-gf-live-loop.js', 'openclaw-cyber-gf-live-loop-ok');
}

function main() {
  verifyJsonSamples();
  verifyNormalization();
  verifyTtsRequestPolicy();
  verifyDocs();
  verifyLiveAdapter();
  console.log('production-readiness-ok');
}

main();
