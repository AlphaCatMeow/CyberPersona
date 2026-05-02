#!/usr/bin/env node
/**
 * CyberPersona Turn 流程 — 模块三：校验与结算
 *
 * 用法：
 *   cd ~/.hermes/CyberPersona-hermes
 *   node scripts/apply-turn-result.js [turn-result-file]
 *
 * 参数：
 *   turn-result-file: TurnResultPayload JSON 文件路径（默认 /tmp/cyber-gf-turn-result.json）
 *
 * 功能：
 *   1. 安全解析 JSON（解析失败 → 兜底模板）
 *   2. 分级字段校验（数值逐字段独立校验，台词能用就用）
 *   3. useReferencePhoto=true 时自动追加人物一致性指令
 *   4. 结算状态 → 写入 .cyber-gf-state.json
 *   5. 输出投递清单 JSON
 *
 * 后续步骤（由 Agent 执行）：
 *   根据投递清单调用 send_message / mimo-tts / image-api
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const FALLBACK_TEXT = '刚刚没看到，你说啥？';

/**
 * 分级容错：尝试解析 JSON，失败则返回兜底模板
 */
function safeParseTurnResult(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return { ok: true, data: parsed };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 构建兜底投递清单
 */
function buildFallbackManifest() {
  return {
    ok: true,
    visibleText: FALLBACK_TEXT,
    sendVoiceNow: false,
    sendImageNow: false,
    imagePrompt: '',
    imageWaitText: '',
    imageFailedText: '',
    useReferencePhoto: false,
    sendGifNow: false,
    gifKeyword: '',
    _fallback: true
  };
}

/**
 * 构建投递清单（从 apply 结果中提取 agent 需要的字段）
 */
function buildManifest(applied, payload) {
  const output = applied.turnOutput || payload;
  return {
    ok: true,
    visibleText: output.visibleText || FALLBACK_TEXT,
    sendVoiceNow: !!output.sendVoiceNow,
    sendImageNow: !!output.sendImageNow,
    imagePrompt: output.imagePrompt || '',
    imageWaitText: output.imageWaitText || '',
    imageFailedText: output.imageFailedText || '',
    useReferencePhoto: !!output.useReferencePhoto,
    sendGifNow: !!output.sendGifNow,
    gifKeyword: output.gifKeyword || ''
  };
}

function main() {
  const turnResultFile = process.argv[2] || '/tmp/cyber-gf-turn-result.json';

  // Step 1: 安全解析
  const parsed = safeParseTurnResult(turnResultFile);
  let payload;

  if (!parsed.ok) {
    console.error(`WARN: JSON parse failed (${parsed.error}), using fallback`);
    console.log(JSON.stringify(buildFallbackManifest(), null, 2));
    return;
  }

  payload = parsed.data;

  // Step 2: 加载 controller
  const ctrl = require(path.join(PROJECT_ROOT, 'src/controller'));

  // Step 3: 应用 turn result（controller 内部会调 validateTurnOutput 做校验）
  let applied;
  try {
    applied = ctrl.applyTurnResultPayload(payload, payload.__userMessage || '');
  } catch (err) {
    console.error(`WARN: applyTurnResultPayload failed (${err.message}), using fallback`);
    console.log(JSON.stringify(buildFallbackManifest(), null, 2));
    return;
  }

  // Step 4: 构建投递清单
  const manifest = buildManifest(applied, payload);

  // Step 5: useReferencePhoto=true 时自动追加人物一致性指令
  if (manifest.useReferencePhoto && manifest.imagePrompt) {
    manifest.imagePrompt = manifest.imagePrompt + ', maintain character consistency, same person';
  }

  console.log(JSON.stringify(manifest, null, 2));
}

main();
