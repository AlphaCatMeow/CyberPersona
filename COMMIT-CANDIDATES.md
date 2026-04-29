# Commit Candidates

更新时间：2026-04-29

这份文件直接按“建议提交 / 可选提交 / 不建议提交”整理当前工作区内容。

当前默认前提：

- 正式链路采用 `tag_only`
- `naturalStylePrompt` 在正式链路默认留空
- 提交内容应围绕当前正式真相组织

## 一、建议提交

### 主线代码
- `cyber-gf-config.js`
- `cyber-gf-controller.js`
- `cyber-gf-profile.js`
- `cyber-gf-prompts.js`
- `cyber-gf-state.js`
- `cyber-gf-tts.js`
- `cyber-gf-turn.js`

### 核心文档
- `README.md`
- `PROJECT-STATUS.md`
- `RELEASE-NOTES-2026-04-29.md`
- `CYBER_GIRLFRIEND.md`
- `XIAOMI-TTS-CONFIG.md`
- `TTS-TAG-STYLE-GUIDE.md`
- `TTS-TESTS.md`
- `AUTOMATION.md`
- `SUBMISSION-GUIDE.md`
- `MAINTAINER-CHECKLIST.md`
- `REPO-REORG-PLAN.md`
- `docs/architecture.md`
- `docs/cyber-girlfriend-mode.md`
- `docs/runtime-integration.md`
- `docs/setup-and-run.md`
- `docs/repository-scope.md`

### 配置与自动化
- `.env.cyber-gf.example`
- `.gitignore`
- `verify-production-readiness.js`
- `build-submission-bundle.js`

### 精选样例
- `_sample_start_payload.json`
- `_sample_turn_payload.json`
- `_turn_flow_test.json`

### 结论型实验产物
- `tts-official-ab-test/report.json`
- `tts-official-ab-test/CONCLUSION.md`

## 二、可选提交

### 可选 live payload 示例
如果你希望展示更多真实对话风格样例，可选加入：
- `_live_turn_payload_1.json`
- `_live_turn_payload_2.json`
- `_live_turn_payload_3.json`
- `_live_turn_payload_4.json`
- `_live_turn_payload_5.json`
- `_live_turn_payload_6.json`
- `_live_turn_payload_7.json`

### 研究型脚本
如果仓库希望保留探索过程，可选加入：
- `xiaomi-tts-official-ab-test.js`
- `xiaomi-tts-direct.js`
- `xiaomi-tts-compare-test.js`
- `xiaomi-tts-style-test.js`
- `xiaomi-tts-emotion-test.js`
- `xiaomi-tts-voicedesign-test.js`
- `xiaomi-tts-batch-test.js`

建议未来放进 `experiments/`。

## 三、不建议提交

### 私有/本地状态
- `.env.cyber-gf`
- `.cyber-gf-state.json`
- `.cyber-gf-history.json`
- `.openclaw/`
- `memory/`

### 生成产物
- `tts-cyber-gf/`
- `tts-output/`
- `tts-compare-test/*.mp3`
- `tts-style-test/*.mp3`
- `tts-emotion-test/*.mp3`
- `tts-voicedesign-test/*.mp3`
- `tts-official-ab-test/*.mp3`
- `out/`
- `*.log`

### 默认不建议进主仓的内容
- `CyberPersona-export/`（除非你想显式保留历史快照）
- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `TOOLS.md`
- `HEARTBEAT.md`
- `IDENTITY.md`

这些文件更像当前 OpenClaw 工作区配置或人格运行上下文，不属于 CyberPersona 项目本身。
