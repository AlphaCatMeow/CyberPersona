#!/usr/bin/env node
const assert = require('assert');
const {
  EXACT_SILENT,
  exactSilentReply,
  sanitizeVisibleAssistantText,
  dispatchDelivery,
  handleIncomingMessage
} = require('./openclaw-cyber-gf-adapter');

async function main() {
  assert.strictEqual(exactSilentReply(), 'NO_REPLY');
  assert.strictEqual(sanitizeVisibleAssistantText(' NO_REPLY '), 'NO_REPLY');
  assert.strictEqual(sanitizeVisibleAssistantText('No further note from me.'), 'NO_REPLY');
  assert.strictEqual(sanitizeVisibleAssistantText('你好呀'), '你好呀');

  // ensure disabled-mode behavior is tested against a known state
  try {
    await handleIncomingMessage('退出赛博女友', {});
  } catch {}

  let sent = null;
  const silent = await dispatchDelivery({
    mode: 'voice_note',
    text: '这句不该再显示',
    voicePayload: { action: 'send', channel: 'telegram', target: 'telegram:8121382159', asVoice: true }
  }, {
    sendMessage: async (payload) => { sent = payload; }
  });
  assert.strictEqual(silent, EXACT_SILENT);
  assert.deepStrictEqual(sent, { action: 'send', channel: 'telegram', target: 'telegram:8121382159', asVoice: true });

  const textReply = await dispatchDelivery({ mode: 'text_reply', text: '正常文本回复' }, {});
  assert.strictEqual(textReply, '正常文本回复');

  const fallbackSilent = await handleIncomingMessage('随便聊聊', {
    fallbackToDefaultAssistant: async () => 'No further note from me.'
  });
  assert.strictEqual(fallbackSilent, EXACT_SILENT);

  // smoke on current wrapped state payload shape
  const controller = require('./cyber-gf-controller');
  const payload = controller.getStatePayload();
  assert(payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'state'), 'controller state payload should expose wrapped state key');

  // when mode is disabled, missing generator should not fabricate a visible reply
  const disabledReply = await handleIncomingMessage('你昨天都不理我', {});
  assert.strictEqual(disabledReply, EXACT_SILENT);

  // when mode is enabled, missing generator should fail loudly instead of misusing prompt payload as final payload
  await handleIncomingMessage('开始赛博女友', {
    generateInitialPayload: async () => require('./_sample_start_payload.json')
  });
  let threw = false;
  try {
    await handleIncomingMessage('你昨天都不理我', {});
  } catch (err) {
    threw = /generateTurnPayload/.test(String(err && err.message || err));
  }
  assert.strictEqual(threw, true);

  console.log('openclaw-cyber-gf-adapter-ok');
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
