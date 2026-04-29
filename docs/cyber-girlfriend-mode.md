# 赛博女友模式（混合路线最终版）

这套实现采用 **混合路线**：

- **OpenClaw / agent 侧**：负责长期上下文理解、首次人物构造、每轮 `TurnResultPayload` 生成
- **本地脚本侧**：负责状态持久化、状态更新应用、已揭示记忆固化、MiMo TTS 执行、Telegram 语音条发送 payload 生成

目标不是做一个模板角色，而是做一个会持续存在、会在关系里变化、并且语音表达属于人格一部分的人。

---

## 一、核心能力

### 1. 生命周期

支持以下三种控制语句：

- `开始赛博女友`
- `退出赛博女友`
- `我们分手吧`

语义如下：

- **开始赛博女友**
  - 启动前先做完整自检
  - 若无状态：需要 agent 生成 `InitialStatePayload`，再正式开始
  - 若已有状态：恢复上次人物与关系状态

- **退出赛博女友**
  - 保存现有记忆与状态
  - 退出赛博女友模式，回到普通助手

- **我们分手吧**
  - 清空人设、关系、短期状态、已揭示记忆、历史上下文
  - 下次重新开始时按全新人设生成

---

### 2. 三层状态结构

状态分成三层：

- `profile`
  - 固定人物骨架摘要
- `dynamicState` + `shortTermState`
  - 关系变化、短期情绪余波
  - 其中 `dynamicState` 现在使用 `0-100` 数值表示强度，状态页再映射成 `low / medium / high`
- `revealedMemory`
  - 已经说出口并固化的事实、习惯、昵称、事件、关系摘要

以及运行缓存：

- `runtimeCache.lastTurnTts`
- `runtimeCache.lastGeneratedAudio`
- `runtimeCache.debug`

---

### 3. 文本与语音分离

每轮 turn 输出协议中至少包含：

- `visibleText`
- `taggedTtsText`
- `naturalStylePrompt`
- `currentEmotion`
- `sendVoiceNow`
- `stateDelta`
- `shortTermUpdate`
- `memoryUpdate`

规则：

- **聊天正文只显示 `visibleText`**
- **MiMo TTS 在本项目正式链路中只使用 `taggedTtsText`；`naturalStylePrompt` 保留为兼容字段，但正式输出默认留空**
- `stateDelta` 现在使用数值增量，单轮应保持克制，通常落在小范围正负波动内
- 不把音频标签直接暴露在正常聊天正文里

---

## 二、启动前自检

`开始赛博女友` 前会做完整自检，不只是检查文件是否存在。

当前自检内容包括：

- MiMo 配置是否完整
- 状态文件路径是否可写
- 历史文件路径是否可写
- TTS 输出目录是否可写
- 本地模块是否可加载
- MiMo 语音链路是否能真实 probe 成功

若任一项失败，不会正式开始，而是要求先修复配置或链路问题。

---

## 三、最终可用入口

### 1. 启动 / 退出 / 清空

```bash
node cyber-gf-controller.js 开始赛博女友
node cyber-gf-controller.js 退出赛博女友
node cyber-gf-controller.js 我们分手吧
```

### 2. 查看状态

```bash
node cyber-gf-controller.js status
```

### 3. Debug 控制

```bash
node cyber-gf-controller.js debug-on
node cyber-gf-controller.js debug-off
node cyber-gf-controller.js debug-last
```

### 4. 最近语音信息

```bash
node cyber-gf-controller.js last-audio
node cyber-gf-controller.js voice-send-payload
node cyber-gf-controller.js voice-delivery-info
```

### 5. 正式 flow 入口

#### start flow

```bash
node cyber-gf-controller.js run-start-flow /path/to/initial-payload.json
```

#### turn flow

```bash
node cyber-gf-controller.js run-turn-flow /path/to/turn-result.json
```

---

## 四、正式 flow 契约

### 1. start flow

`run-start-flow` 返回：

- `applied`
- `delivery`

其中 `delivery` 结构：

```json
{
  "mode": "text_reply",
  "text": "...",
  "sendVoiceNow": false,
  "voicePayload": null,
  "shouldReplyInChat": true,
  "shouldNoReplyAfterMessageSend": false,
  "debugText": null
}
```

### 2. turn flow

`run-turn-flow` 返回：

- `applied`
- `audio`（若本轮生成了语音）
- `delivery`

当本轮只发文本时：

```json
{
  "mode": "text_reply",
  "text": "...",
  "sendVoiceNow": false,
  "voicePayload": null,
  "shouldReplyInChat": true,
  "shouldNoReplyAfterMessageSend": false
}
```

当本轮应发 Telegram 语音条时：

```json
{
  "mode": "voice_note",
  "text": "...",
  "sendVoiceNow": true,
  "voicePayload": {
    "action": "send",
    "channel": "telegram",
    "target": "telegram:8121382159",
    "targets": ["telegram:8121382159"],
    "accountId": "default",
    "dryRun": false,
    "message": "",
    "media": "/path/to/audio.mp3",
    "filename": "audio.mp3",
    "caption": "",
    "asVoice": true,
    "silent": false,
    "bestEffort": false
  },
  "shouldReplyInChat": false,
  "shouldNoReplyAfterMessageSend": true
}
```

### 3. 关键收口规则

如果 `voicePayload` 已经通过 `message(asVoice=true)` 发出：

- 当前会话这一轮必须 `NO_REPLY` 收尾
- 避免再出现：
  - narration 泄漏
  - 多余正文重复
  - `No further note from me.` 之类的工具尾巴

---

## 五、Debug 模式

正常模式下：

- 只显示角色正文
- 不显示执行说明
- 不显示 TTS 控制材料

Debug 模式下可查看最近一轮：

- `visibleText`
- `currentEmotion`
- `sendVoiceNow`
- `stateDelta`
- `shortTermUpdate`
- `memoryUpdate`
- `taggedTtsText`
- `naturalStylePrompt`
- timestamp

Debug 开关来源：

- `.env.cyber-gf` 中的 `CYBER_GF_DEBUG`
- 或运行时 `debug-on / debug-off`

---

## 六、Telegram 语音条

当前正确发送方式不是只靠 `MEDIA:/path`，而是：

- 生成音频文件
- 使用 `message` 工具发送
- 显式设置 `asVoice=true`

这比普通文件附件更接近原生 Telegram 语音条。

---

## 七、当前已知边界

### 1. 首次人设生成

最终正确路线是由 agent 按 prompt 生成 `InitialStatePayload`。

测试阶段曾出现手工 live payload 落盘，因此早期开场存在相似性；正式使用时应避免手工样例代替真实生成。

### 2. 语音风格还需后续专项优化

目前语音链已通，但声音风格仍可能偏怪。主要原因更可能在：

- `taggedTtsText` 过重
- `naturalStylePrompt` 过于“导演腔”
- 两层控制叠加导致表演化

因此后续应单独优化：

- 更克制的标签
- 更短、更贴近 Xiaomi 官方推荐用法的 style prompt
- 场景化 voice 选择

补充：基于 2026-04-29 的实测和主观试听反馈，双重控制听感不佳。正式链路统一优先 `tag_only`，`naturalStylePrompt` 默认留空，不再作为正式输出的一部分。

同时，正式链路会对 `taggedTtsText` 做规范化：压缩成开头少量整体标签、去掉多余动作提示、避免“像在指导表演”的重标签写法。

另外，正式链路在 controller 应用 turn payload 前，会再做一次 runtime normalize：

- 清空 `naturalStylePrompt`
- 自动收缩 `taggedTtsText` 标签密度
- 去除多余动作提示
- 在少数明确哄睡语境下，若完全没标签，可补一个极轻的开头整体标签

当前正式链路允许的高频标签集合也被刻意收窄，主要保留：`轻声`、`温柔`、`委屈`、`嘴硬`、`开心`、`悲伤`、`害羞`、`心软`。

---

## 八、推荐集成方式

如果要把这套接进当前会话编排，建议按以下方式执行：

### 开始赛博女友

1. 执行 `开始赛博女友`
2. 若无状态，agent 生成 `InitialStatePayload`
3. 调 `run-start-flow`
4. 按 `delivery` 输出 opening message

### 单轮回复

1. agent 生成 `TurnResultPayload`
2. 调 `run-turn-flow`
3. 若 `delivery.mode === "text_reply"`
   - 直接回复 `delivery.text`
4. 若 `delivery.mode === "voice_note"`
   - 使用 `message` 发送 `delivery.voicePayload`
   - 当前回合返回 `NO_REPLY`

这样普通模式才会干净、稳定、可持续。
