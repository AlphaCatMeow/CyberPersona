# Project Status

更新时间：2026-04-29

## 当前结论

这个项目当前已经从“探索 Xiaomi MiMo TTS 怎么调”收敛到一条明确的正式链路。

同时，它和 OpenClaw 的关系也已经比较明确：

- 这不是 OpenClaw 本体
- 这是一个可接入 OpenClaw 的 persona/runtime 子系统
- 当前工作区已经包含 OpenClaw 适配层与模拟 live chat 回路测试

### 正式链路

- 模型：`mimo-v2.5-tts`
- 音色：`茉莉`
- 控制方式：**tag_only**
- `naturalStylePrompt`：保留为兼容字段，但正式输出默认留空
- 标签风格：开头少量整体标签，默认最多 2 个
- runtime normalize：已接入 controller

### 为什么这样定

原因不是拍脑袋，而是两步一起收敛出来的：

1. **Xiaomi 官方文档能力边界核对**
   - 确认了 `role:user` / `role:assistant` / `audio.voice` 的正确用法
2. **A/B 实测 + 主观试听**
   - 双重控制虽然官方支持，但正式链路听感不佳，更容易过演

所以当前正式策略是：

- **只保留 `taggedTtsText`**
- **禁用双重控制**
- **让系统自动做标签减负和输出规范化**

## 当前主线文件

### 正式链路核心
- `cyber-gf-controller.js`
- `cyber-gf-turn.js`
- `cyber-gf-tts.js`
- `cyber-gf-prompts.js`

### 正式说明文档
- `README.md`
- `CYBER_GIRLFRIEND.md`
- `XIAOMI-TTS-CONFIG.md`
- `TTS-TAG-STYLE-GUIDE.md`
- `TTS-TESTS.md`
- `RELEASE-NOTES-2026-04-29.md`
- `SUBMISSION-GUIDE.md`
- `COMMIT-CANDIDATES.md`
- `MAINTAINER-CHECKLIST.md`
- `AUTOMATION.md`
- `REPO-REORG-PLAN.md`

### 自动化入口
- `verify-production-readiness.js`
- `build-submission-bundle.js`

### Live runtime adapter
- `openclaw-cyber-gf-adapter.js`
- `test-openclaw-cyber-gf-adapter.js`
- `test-openclaw-cyber-gf-live-loop.js`

### 正式样例
- `_sample_turn_payload.json`
- `_turn_flow_test.json`
- `_live_turn_payload_1.json` ~ `_live_turn_payload_7.json`

## 实验资产

这些文件保留，但不代表正式链路推荐策略：

- `xiaomi-tts-official-ab-test.js`
- `xiaomi-tts-compare-test.js`
- `xiaomi-tts-style-test.js`
- `xiaomi-tts-emotion-test.js`
- `xiaomi-tts-voicedesign-test.js`

## 历史快照

- `CyberPersona-export/`

这个目录当前被视为：
- 历史导出快照
- 参考资料
- **不是当前事实来源**

最新持续维护版本在主工作区：
- `/root/.openclaw/workspace`

## 当前完成度

目前已经完成：

- 正式 TTS 策略收敛
- runtime normalize 接入
- 标签词表收缩
- 基于 `mimo-v2-omni` 的轻标签候选辅助筛选
- payload 样例统一
- 实验/正式分层说明
- export 历史快照标记

## 后续如果继续优化

最值得继续做的方向：

1. 更细的标签-场景映射
2. live runtime 自动接线
3. 修掉 live delivery 中断/静默分支下偶发的尾句泄露（例如 `No further note from me.`）
4. 更彻底的命名清理（`cyber-gf-*` → 更泛化的 `cyberpersona-*`）
5. 将主工作区整理成更适合外部提交的仓库结构
