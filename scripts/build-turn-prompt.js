#!/usr/bin/env node
/**
 * CyberPersona Turn 流程 — 模块一：上下文构建
 *
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/build-turn-prompt.js "用户消息"
 *
 * 功能：
 *   1. 读取 .cyber-gf-state.json 获取当前状态
 *   2. 组装 prompt（状态叙事 + 角色指令 + 枚举约束 + JSON 模板）
 *   3. 输出 prompt 到 /tmp/cyber-gf-turn-prompt.txt
 *   4. 输出上下文摘要供 Agent 参考
 *
 * 后续步骤（由 Agent 执行）：
 *   1. read_file /tmp/cyber-gf-turn-prompt.txt
 *   2. Agent 生成 TurnResultPayload JSON
 *   3. write_file /tmp/cyber-gf-turn-result.json
 *   4. node scripts/apply-turn-result.js
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const userMessage = process.argv[2];

  if (!userMessage) {
    console.error('用法: node scripts/build-turn-prompt.js "用户消息"');
    process.exit(1);
  }

  // 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'src/controller'));

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
