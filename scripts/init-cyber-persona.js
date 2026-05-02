#!/usr/bin/env node
/**
 * CyberPersona 标准化初始化脚本
 * 
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/init-cyber-persona.js
 * 
 * 功能：
 *   1. 运行 random_character_seed.py 生成种子数据
 *   2. 调用 applyInitialStatePayload 应用状态
 *   3. 输出结果（包含 openingMessage 和 characterCard）
 * 
 * 依赖：
 *   - python3（用于运行种子脚本）
 *   - cyber-gf-controller.js（用于应用状态）
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SEED_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'random_character_seed.py');

function main() {
  console.log('[1/2] 生成随机种子...');
  
  // 运行种子脚本
  let seedOutput;
  try {
    seedOutput = execSync(`python3 "${SEED_SCRIPT}"`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      timeout: 30000
    });
  } catch (err) {
    console.error('种子脚本执行失败:', err.message);
    process.exit(1);
  }
  
  let seed;
  try {
    seed = JSON.parse(seedOutput);
  } catch (err) {
    console.error('种子脚本输出不是有效 JSON:', seedOutput);
    process.exit(1);
  }
  
  console.log('  人格原型:', seed.systemBase.personalityArchetype);
  console.log('  开场策略:', seed.systemBase.openingStrategy);
  console.log('  开场白:', seed.openingMessage || '(静默)');
  
  console.log('[2/2] 应用初始状态...');
  
  // 加载 controller 并应用状态
  const controller = require(path.join(PROJECT_ROOT, 'src/controller'));
  const result = controller.applyInitialStatePayload({ seed });
  
  console.log('  状态已保存到 session 文件');
  console.log('');
  console.log('=== 初始化完成 ===');
  console.log('开场白:', result.openingMessage || '(无)');
  console.log('人格原型:', seed.systemBase.personalityArchetype);
  console.log('外貌:', seed.appearance.hair, '/', seed.appearance.skin, '/', seed.appearance.eye);
  console.log('声音:', seed.voice.voiceStyle.substring(0, 30) + '...');
  console.log('');
  console.log('下一步：');
  console.log('1. 生成证件照: 调用 image-api skill');
  console.log('2. 生成语音样本: 调用 mimo-tts skill');
  console.log('3. 发送给用户: 证件照 + 语音样本 + 开场白');
  
  // 输出 JSON 结果供脚本使用
  const output = {
    success: true,
    seed,
    openingMessage: result.openingMessage,
    characterCard: {
      systemBase: result.state.characterCard.systemBase,
      appearance: result.state.characterCard.appearance,
      voice: result.state.characterCard.voice
    }
  };
  
  // 写入 /tmp 供其他脚本使用
  const outputPath = '/tmp/cyber-gf-init-result.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('');
  console.log('结果已写入:', outputPath);
}

main();
