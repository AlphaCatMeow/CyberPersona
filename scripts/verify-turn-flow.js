#!/usr/bin/env node
/**
 * CyberPersona 完整 Turn 流程验证脚本
 * 
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/verify-turn-flow.js "你在干嘛呀？"
 * 
 * 功能：
 *   1. 调用 turn-payload 获取 prompt
 *   2. 显示 prompt 内容（验证上下文组装）
 *   3. 显示预期的输出格式
 * 
 * 注意：实际的 LLM 调用需要通过 Hermes Agent 工具链完成
 */

const path = require('path');
const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const userMessage = process.argv[2] || '你在干嘛呀？';
  
  console.log('=== CyberPersona Turn Flow Verification ===');
  console.log('User message:', userMessage);
  console.log('');
  
  // 1. 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'cyber-gf-controller'));
  
  // 2. buildTurnPayload
  console.log('[1/3] Building turn payload...');
  const turnPayload = ctrl.buildTurnPayload(userMessage);
  
  if (!turnPayload || !turnPayload.prompt) {
    console.error('ERROR: Failed to build turn payload');
    process.exit(1);
  }
  
  console.log('  Prompt length:', turnPayload.prompt.length, 'chars');
  console.log('  Context keys:', Object.keys(turnPayload.context || {}));
  console.log('');
  
  // 3. 显示 prompt 摘要
  console.log('[2/3] Prompt summary:');
  const promptLines = turnPayload.prompt.split('\n');
  const stateSection = promptLines.find(l => l.includes('当前女友心理状态'));
  if (stateSection) {
    console.log('  State section found');
  }
  
  const outputFormat = promptLines.find(l => l.includes('只输出JSON'));
  if (outputFormat) {
    console.log('  Output format section found');
  }
  console.log('');
  
  // 4. 显示预期输出格式
  console.log('[3/3] Expected TurnResultPayload format:');
  console.log(`
{
  "analysis": "分析这句话对关系的影响...",
  "visibleText": "角色回复文字",
  "currentEmotion": "happy",
  "sendVoiceNow": true/false,
  "sendImageNow": false,
  "imagePrompt": "",
  "imageCaption": "",
  "sendGifNow": false,
  "gifKeyword": "",
  "stateDelta": {
    "trust": "neutral/minor_increase/minor_decrease/major_increase/major_decrease",
    "security": "...",
    "closeness": "...",
    "neediness": "...",
    "possessiveness": "..."
  },
  "stressDelta": "neutral/minor_increase/minor_decrease",
  "shortTermUpdate": { ... },
  "memoryUpdate": { ... },
  "characterCardUpdate": { ... }
}
`);
  
  console.log('=== Verification Complete ===');
  console.log('');
  console.log('Next steps:');
  console.log('1. Use the prompt to call LLM');
  console.log('2. Get TurnResultPayload from LLM');
  console.log('3. Call: node cyber-gf-controller.js apply-turn-payload <json>');
  console.log('4. Send response based on TurnResultPayload');
}

main();
