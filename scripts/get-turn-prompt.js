#!/usr/bin/env node
/**
 * CyberPersona Turn 流程 — Step 1: 获取 prompt
 * 
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/get-turn-prompt.js "你在干嘛呀？"
 * 
 * 功能：
 *   1. 调用 buildTurnPayload 获取完整 prompt
 *   2. 输出 prompt 到 /tmp/cyber-gf-turn-prompt.txt
 *   3. 输出上下文摘要供 Agent 参考
 * 
 * 后续步骤（由 Agent 执行）：
 *   1. 使用 prompt 调用 LLM
 *   2. 将 LLM 输出保存到 /tmp/cyber-gf-turn-result.json
 *   3. 调用 node scripts/apply-turn-result.js
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const userMessage = process.argv[2];
  
  if (!userMessage) {
    console.error('用法: node scripts/get-turn-prompt.js "用户消息"');
    process.exit(1);
  }
  
  // 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'cyber-gf-controller'));
  
  // buildTurnPayload
  const turnPayload = ctrl.buildTurnPayload(userMessage);
  
  if (!turnPayload || !turnPayload.prompt) {
    console.error('ERROR: Failed to build turn payload');
    console.error('Is CyberPersona mode enabled? Run: node cyber-gf-controller.js 开始赛博女友');
    process.exit(1);
  }
  
  // 输出 prompt 到文件
  const promptFile = '/tmp/cyber-gf-turn-prompt.txt';
  fs.writeFileSync(promptFile, turnPayload.prompt);
  
  // 输出上下文摘要
  const ctx = turnPayload.context || {};
  const summary = {
    promptFile,
    promptLength: turnPayload.prompt.length,
    userMessage: ctx.userMessage,
    dynamicState: ctx.dynamicState,
    characterCardKeys: Object.keys(ctx.characterCard || {}),
    recentContextLength: (ctx.recentContext || []).length
  };
  
  console.log(JSON.stringify(summary, null, 2));
}

main();
