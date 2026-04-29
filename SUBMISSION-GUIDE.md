# Submission Guide

更新时间：2026-04-29

这份文件从“准备提交/整理仓库”的角度说明：

- 哪些文件建议进入仓库
- 哪些文件建议只留本地
- 哪些文件属于实验资产
- 当前推荐的最小提交面是什么

当前默认前提：

- 本项目**正式链路**采用 `tag_only`
- `naturalStylePrompt` 在正式链路默认留空
- 提交内容应反映这个当前真相，而不是把历史实验状态重新带回主线

## 建议进入仓库的内容

### 1. 主线代码
- `cyber-gf-config.js`
- `cyber-gf-controller.js`
- `cyber-gf-profile.js`
- `cyber-gf-prompts.js`
- `cyber-gf-state.js`
- `cyber-gf-tts.js`
- `cyber-gf-turn.js`

### 2. 主线文档
- `README.md`
- `CYBER_GIRLFRIEND.md`
- `PROJECT-STATUS.md`
- `RELEASE-NOTES-2026-04-29.md`
- `COMMIT-CANDIDATES.md`
- `TTS-TESTS.md`
- `TTS-TAG-STYLE-GUIDE.md`
- `XIAOMI-TTS-CONFIG.md`
- `docs/architecture.md`
- `docs/cyber-girlfriend-mode.md`
- `docs/runtime-integration.md`
- `docs/setup-and-run.md`
- `docs/repository-scope.md`

### 3. 示例配置
- `.env.cyber-gf.example`

### 4. 少量样例 payload（可选）
保留少量最能说明当前协议的样例即可，例如：
- `_sample_start_payload.json`
- `_sample_turn_payload.json`
- `_turn_flow_test.json`

如果希望仓库更干净，`_live_turn_payload_*.json` 也可以不提交，只在本地保留。

## 建议不要进入仓库的内容

### 1. 真实配置 / 密钥 / 本地状态
- `.env.cyber-gf`
- `.cyber-gf-state.json`
- `.cyber-gf-history.json`
- `.openclaw/`
- `memory/`

### 2. 生成音频 / 测试产物
- `tts-cyber-gf/`
- `tts-output/`
- `tts-compare-test/*.mp3`
- `tts-emotion-test/*.mp3`
- `tts-style-test/*.mp3`
- `tts-voicedesign-test/*.mp3`
- `tts-official-ab-test/*.mp3`

### 3. 纯本地测试截图/输出
- `out/`
- `*.log`

## 实验资产如何处理

以下内容是否提交，取决于你想把仓库做成多“研究型”：

### 如果偏产品化 / 干净交付
建议不提交或移到 `experiments/`：
- `xiaomi-tts-compare-test.js`
- `xiaomi-tts-style-test.js`
- `xiaomi-tts-emotion-test.js`
- `xiaomi-tts-voicedesign-test.js`
- `xiaomi-tts-batch-test.js`

### 如果偏研究型 / 保留探索过程
可以提交，但建议明确放进：
- `experiments/`
- 或 `research/tts/`

并保留 `TTS-TESTS.md` 说明身份。

## `CyberPersona-export/` 如何处理

当前推荐：

### 方案 A：不提交
如果主工作区已经是唯一事实来源，最干净的方式是：
- 不提交 `CyberPersona-export/`

### 方案 B：保留，但明确是历史快照
如果想保留设计历史：
- 提交 `CyberPersona-export/`
- 保留 `STATUS.md`
- 明确写它不是当前事实来源

当前我更推荐 **方案 A**，除非你确实需要保留历史阶段痕迹。

## 推荐的最小提交面

如果现在就要做一个最干净的提交，建议至少包含：

- 7 个主线 JS 文件
- 主线 docs
- `.env.cyber-gf.example`
- `.gitignore`
- 1~3 个最小样例 payload

如果希望提交包更稳定、可复验，建议额外包含：

- `verify-production-readiness.js`
- `build-submission-bundle.js`
- `AUTOMATION.md`

这样既能复现主线逻辑，又不会把大量本地产物带进去。
