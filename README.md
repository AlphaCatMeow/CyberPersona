# CyberPersona / Cyber Girlfriend Runtime

更新时间：2026-04-29

这是一个围绕 **长期关系型 persona + Xiaomi MiMo TTS** 构建的本地运行时子项目。

## 它和 OpenClaw 是什么关系？

简单说：

- **这个项目不是 OpenClaw 本体**
- **它是一个可以接进 OpenClaw 的 persona/runtime 子系统**

当前分工是：

- **OpenClaw / agent 侧**
  - 负责理解上下文
  - 负责生成 `InitialStatePayload` / `TurnResultPayload`
  - 负责把 live chat 消息路由到这套 flow

- **CyberPersona 本地运行层**
  - 负责状态持久化
  - 负责 turn payload 应用
  - 负责 Xiaomi MiMo TTS
  - 负责 Telegram voice-note payload 准备

所以答案是：

## 可以接入 OpenClaw 吗？

**可以，而且当前仓库已经保留了接入骨架。**

目前相关文件包括：

- `docs/runtime-integration.md`
- `openclaw-cyber-gf-adapter.js`
- `test-openclaw-cyber-gf-adapter.js`
- `test-openclaw-cyber-gf-live-loop.js`

当前状态更准确地说是：

- **本地正式主线已可用**
- **OpenClaw 适配层已实现并可测试**
- **还没有把它完全做成 OpenClaw runtime core 的内建功能**

也就是说，它已经不是“纯概念上的能接”，而是已经到了“有可执行适配层和集成测试骨架”的阶段。

当前这条主线已经收敛到一个明确的正式策略：

- 模型：`mimo-v2.5-tts`
- 音色：`茉莉`
- 控制方式：**tag_only**
- `naturalStylePrompt`：保留为兼容字段，但正式链路默认留空
- runtime normalize：在应用 turn payload 前自动做标签减负与输出收口

## 先看哪里

如果你是第一次接手，建议按这个顺序看：

1. `PROJECT-STATUS.md`
2. `CYBER_GIRLFRIEND.md`
3. `XIAOMI-TTS-CONFIG.md`
4. `TTS-TAG-STYLE-GUIDE.md`
5. `AUTOMATION.md`
6. `SUBMISSION-GUIDE.md`

## 主线文件

### 代码
- `cyber-gf-controller.js`
- `cyber-gf-turn.js`
- `cyber-gf-tts.js`
- `cyber-gf-prompts.js`
- `cyber-gf-state.js`
- `cyber-gf-profile.js`
- `cyber-gf-config.js`

### 文档
- `CYBER_GIRLFRIEND.md`
- `PROJECT-STATUS.md`
- `RELEASE-NOTES-2026-04-29.md`
- `AUTOMATION.md`
- `SUBMISSION-GUIDE.md`
- `MAINTAINER-CHECKLIST.md`

## 快速开始

### 1. 配置

```bash
cp .env.cyber-gf.example .env.cyber-gf
```

填入你自己的实际配置。

### 2. 校验正式链路

```bash
node verify-production-readiness.js
```

预期输出：

```text
production-readiness-ok
```

### 3. 构建提交副本（可选）

```bash
node build-submission-bundle.js
```

输出目录：

```text
submission-bundle/
```

## 常用命令

```bash
node cyber-gf-controller.js status
node cyber-gf-controller.js 开始赛博女友
node cyber-gf-controller.js run-start-flow ./_sample_start_payload.json
node cyber-gf-controller.js run-turn-flow ./_sample_turn_payload.json
```

## 当前项目边界

### 正式链路
- 当前唯一事实来源：主工作区
- TTS 正式策略：`tag_only`
- `naturalStylePrompt` 默认留空

### 实验资产
以下脚本保留，但不代表正式链路推荐策略：
- `xiaomi-tts-compare-test.js`
- `xiaomi-tts-style-test.js`
- `xiaomi-tts-emotion-test.js`
- `xiaomi-tts-voicedesign-test.js`
- `xiaomi-tts-official-ab-test.js`

### 历史快照
- `CyberPersona-export/` 当前只作为历史导出快照与参考资料
- 它不是当前事实来源

## 自动化

见：
- `AUTOMATION.md`
- `verify-production-readiness.js`
- `build-submission-bundle.js`

## Live runtime 适配层

如果要把本地 flow 接进 OpenClaw / live chat 的最后一跳收口，见：

- `openclaw-cyber-gf-adapter.js`
- `docs/runtime-integration.md`

这层专门负责：
- 文本 / 语音分流
- voice-note send 后返回精确 `NO_REPLY`
- 压掉已知的尾句泄露（如 `No further note from me.`）
