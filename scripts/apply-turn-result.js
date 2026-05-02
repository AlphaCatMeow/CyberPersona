#!/usr/bin/env node
/**
 * CyberPersona Turn 流程 — Step 3: 应用 turn result
 * 
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/apply-turn-result.js [turn-result-file]
 * 
 * 参数：
 *   turn-result-file: TurnResultPayload JSON 文件路径（默认 /tmp/cyber-gf-turn-result.json）
 * 
 * 功能：
 *   1. 读取 TurnResultPayload
 *   2. 调用 applyTurnResult 应用状态变化
 *   3. 输出结果（visibleText、sendVoiceNow 等）
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const turnResultFile = process.argv[2] || '/tmp/cyber-gf-turn-result.json';
  
  if (!fs.existsSync(turnResultFile)) {
    console.error(`ERROR: Turn result file not found: ${turnResultFile}`);
    console.error('Please generate TurnResultPayload first and save to this file.');
    process.exit(1);
  }
  
  // 读取 TurnResultPayload
  let turnResult;
  try {
    const content = fs.readFileSync(turnResultFile, 'utf8');
    turnResult = JSON.parse(content);
  } catch (err) {
    console.error('ERROR: Failed to parse turn result file:', err.message);
    process.exit(1);
  }
  
  // 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'cyber-gf-controller'));
  
  // 应用 turn result
  try {
    const result = ctrl.applyTurnResultPayload(turnResult, turnResult.__userMessage || '');
    
    // 输出结果
    const output = {
      success: true,
      visibleText: result.turnOutput?.visibleText || turnResult.visibleText,
      sendVoiceNow: result.turnOutput?.sendVoiceNow || turnResult.sendVoiceNow,
      sendImageNow: result.turnOutput?.sendImageNow || turnResult.sendImageNow,
      sendGifNow: result.turnOutput?.sendGifNow || turnResult.sendGifNow,
      stateUpdated: true
    };
    
    console.log(JSON.stringify(output, null, 2));
  } catch (err) {
    console.error('ERROR: Failed to apply turn result:', err.message);
    process.exit(1);
  }
}

main();
