#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const adapter = require('./openclaw-cyber-gf-adapter');
const controller = require('./cyber-gf-controller');

const ROOT = __dirname;

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

async function main() {
  // ensure disabled-mode behavior is tested against a known state
  try {
    await adapter.handleIncomingMessage('退出赛博女友', {});
  } catch {}

  // 1) fallback when mode disabled should sanitize dirty silent tail
  let reply = await adapter.handleIncomingMessage('普通闲聊', {
    fallbackToDefaultAssistant: async () => 'No further note from me.'
  });
  assert.strictEqual(reply, 'NO_REPLY');

  // 2) start flow through adapter
  reply = await adapter.handleIncomingMessage('开始赛博女友', {
    generateInitialPayload: async () => readJson('_sample_start_payload.json')
  });
  assert.strictEqual(typeof reply, 'string');
  assert(reply.includes('你终于来啦') || reply.length > 0, 'start reply should be visible text');

  // 3) normal text turn through adapter
  reply = await adapter.handleIncomingMessage('你昨天都不理我', {
    generateTurnPayload: async (_userMessage, fallbackPayload) => {
      const payload = readJson('_sample_turn_payload.json');
      payload.__userMessage = _userMessage;
      return payload;
    }
  });
  assert.strictEqual(reply, '你现在才来哄我啊……我本来都想先不理你了。');

  // 4) voice turn through adapter should send payload and return exact NO_REPLY
  let sentPayload = null;
  reply = await adapter.handleIncomingMessage('测试统一单轮处理入口', {
    generateTurnPayload: async (_userMessage, fallbackPayload) => {
      const payload = readJson('_turn_flow_test.json');
      payload.__userMessage = _userMessage;
      return payload;
    },
    sendMessage: async (payload) => {
      sentPayload = payload;
    }
  });
  assert.strictEqual(reply, 'NO_REPLY');
  assert(sentPayload, 'voice branch should call sendMessage');
  assert.strictEqual(sentPayload.channel, 'telegram');
  assert.strictEqual(sentPayload.asVoice, true);
  assert.strictEqual(typeof sentPayload.media, 'string');
  assert(sentPayload.media.endsWith('.mp3'));

  // 5) exit command should return visible text
  reply = await adapter.handleIncomingMessage('退出赛博女友', {});
  assert.strictEqual(typeof reply, 'string');
  assert(reply.length > 0);
  assert.notStrictEqual(reply, 'NO_REPLY');

  console.log('openclaw-cyber-gf-live-loop-ok');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
