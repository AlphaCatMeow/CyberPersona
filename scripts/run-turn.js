#!/usr/bin/env node
/**
 * CyberPersona 完整 Turn 流程脚本
 * 
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/run-turn.js "你在干嘛呀？"
 * 
 * 功能：
 *   1. 调用 turn-payload 获取 prompt
 *   2. 调用 LLM 生成 TurnResultPayload
 *   3. 调用 apply-turn-payload 应用状态变化
 *   4. 输出结果（包含 visibleText、sendVoiceNow 等）
 * 
 * 依赖：
 *   - cyber-gf-controller.js
 *   - LLM API（通过环境变量配置）
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function main() {
  const userMessage = process.argv[2];
  
  if (!userMessage) {
    console.error('用法: node scripts/run-turn.js "用户消息"');
    process.exit(1);
  }
  
  console.log('=== CyberPersona Turn Flow ===');
  console.log('User message:', userMessage);
  console.log('');
  
  // 1. 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'cyber-gf-controller'));
  
  // 2. buildTurnPayload
  console.log('[1/4] Building turn payload...');
  const turnPayload = ctrl.buildTurnPayload(userMessage);
  
  if (!turnPayload || !turnPayload.prompt) {
    console.error('ERROR: Failed to build turn payload');
    console.error('Is CyberPersona mode enabled? Run: node cyber-gf-controller.js 开始赛博女友');
    process.exit(1);
  }
  
  console.log('  Prompt length:', turnPayload.prompt.length, 'chars');
  console.log('');
  
  // 3. 调用 LLM
  console.log('[2/4] Calling LLM...');
  
  // 将 prompt 写入临时文件
  const promptFile = '/tmp/cyber-gf-turn-prompt.txt';
  fs.writeFileSync(promptFile, turnPayload.prompt);
  
  // 调用 LLM（这里需要根据实际的 LLM API 进行调整）
  // 示例：使用 curl 调用 OpenAI 兼容 API
  const llmResponse = callLLM(turnPayload.prompt);
  
  if (!llmResponse) {
    console.error('ERROR: LLM call failed');
    process.exit(1);
  }
  
  console.log('  LLM response length:', llmResponse.length, 'chars');
  console.log('');
  
  // 4. 解析 TurnResultPayload
  console.log('[3/4] Parsing TurnResultPayload...');
  
  let turnResult;
  try {
    // 提取 JSON（可能包含在 ```json ... ``` 中）
    const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                      llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      turnResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      throw new Error('No JSON found in LLM response');
    }
  } catch (err) {
    console.error('ERROR: Failed to parse TurnResultPayload:', err.message);
    console.error('LLM response:', llmResponse.substring(0, 500));
    process.exit(1);
  }
  
  console.log('  visibleText:', turnResult.visibleText?.substring(0, 50) + '...');
  console.log('  sendVoiceNow:', turnResult.sendVoiceNow);
  console.log('  sendImageNow:', turnResult.sendImageNow);
  console.log('');
  
  // 5. 应用状态变化
  console.log('[4/4] Applying turn result...');
  
  // 将 turnResult 写入临时文件
  const turnResultFile = '/tmp/cyber-gf-turn-result.json';
  fs.writeFileSync(turnResultFile, JSON.stringify(turnResult, null, 2));
  
  // 调用 apply-turn-payload
  try {
    const result = execSync(
      `cd "${PROJECT_ROOT}" && node cyber-gf-controller.js apply-turn-payload "${turnResultFile}"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    console.log('  State updated successfully');
  } catch (err) {
    console.error('ERROR: Failed to apply turn result:', err.message);
    process.exit(1);
  }
  console.log('');
  
  // 6. 输出结果
  console.log('=== Turn Result ===');
  console.log('visibleText:', turnResult.visibleText);
  console.log('sendVoiceNow:', turnResult.sendVoiceNow);
  console.log('sendImageNow:', turnResult.sendImageNow);
  console.log('sendGifNow:', turnResult.sendGifNow);
  console.log('');
  console.log('Next steps:');
  if (turnResult.sendVoiceNow) {
    console.log('1. Generate voice using MiMo TTS');
    console.log('2. Send voice message');
  }
  if (turnResult.sendImageNow) {
    console.log('3. Generate image using image-api');
    console.log('4. Send image message');
  }
  console.log('5. Send visibleText as text message');
  
  // 输出 JSON 结果供脚本使用
  const output = {
    success: true,
    userMessage,
    turnResult,
    turnResultFile
  };
  
  const outputPath = '/tmp/cyber-gf-turn-output.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('');
  console.log('Result written to:', outputPath);
}

/**
 * 调用 LLM API
 * 注意：这里需要根据实际的 LLM API 进行调整
 */
function callLLM(prompt) {
  // 示例：使用 curl 调用 OpenAI 兼容 API
  // 实际实现需要根据用户的 LLM 配置进行调整
  
  const apiKey = process.env.LLM_API_KEY;
  const apiBase = process.env.LLM_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.LLM_MODEL || 'gpt-4';
  
  if (!apiKey) {
    console.error('ERROR: LLM_API_KEY environment variable not set');
    console.error('Please set LLM_API_KEY, LLM_API_BASE, and LLM_MODEL');
    return null;
  }
  
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  };
  
  const curlCmd = `curl -s "${apiBase}/chat/completions" \\
    -H "Content-Type: application/json" \\
    -H "Authorization: Bearer ${apiKey}" \\
    -d '${JSON.stringify(requestBody)}'`;
  
  try {
    const response = execSync(curlCmd, { encoding: 'utf8', timeout: 60000 });
    const data = JSON.parse(response);
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('LLM API call failed:', err.message);
    return null;
  }
}

main();
