# Maintainer Checklist

更新时间：2026-04-29

这份清单给未来维护这条 TTS 链路的人用。每次改动后，按顺序过一遍，避免回归。

## 1. 先确认你改的是哪一层

- Prompt 层：`cyber-gf-prompts.js`
- Payload 校验/回退层：`cyber-gf-turn.js`
- Runtime normalize / flow 层：`cyber-gf-controller.js`
- TTS request / tag normalize 层：`cyber-gf-tts.js`
- 文档层：`PROJECT-STATUS.md` / `XIAOMI-TTS-CONFIG.md` / `TTS-TAG-STYLE-GUIDE.md`

不要只改一层就以为全链路都对了。

## 2. 每次改动后至少检查这些原则

### 正式链路原则
- 正式链路是否仍然是 **tag_only**
- `naturalStylePrompt` 是否仍然默认留空
- 标签是否仍然是少量开头整体标签
- 是否没有把实验能力误引回正式链路

### 标签原则
- 默认最多 2 个标签
- 是否去掉了正文动作提示（如 `[轻哼]`）
- 是否避免了导演式长标签

## 3. 最小代码验证

至少跑这些：

```bash
node -e "require('./cyber-gf-controller'); require('./cyber-gf-tts'); require('./cyber-gf-turn'); require('./cyber-gf-prompts'); console.log('ok')"
```

再检查 normalize：

```bash
node - <<'NODE'
const ctl = require('./cyber-gf-controller');
console.log(ctl.normalizeTurnPayloadForRuntime({
  visibleText: '你现在才来找我啊。',
  taggedTtsText: '（委屈，嘴硬，声音轻一点）你现在才来找我啊。[轻哼]',
  naturalStylePrompt: '带一点委屈和嘴硬。',
  currentEmotion: '委屈',
  sendVoiceNow: false,
  stateDelta: { relationshipWarmth: 0, safety: 0, trust: 0, approachDesire: 0, vulnerabilityWillingness: 0, voiceEase: 0 },
  shortTermUpdate: {},
  memoryUpdate: {}
}, '你昨天都不理我'));
NODE
```

预期：
- `naturalStylePrompt === ""`
- `taggedTtsText` 被压成短标签版本

再跑 live adapter 相关测试：

```bash
node test-openclaw-cyber-gf-adapter.js
node test-openclaw-cyber-gf-live-loop.js
```

预期：
- `openclaw-cyber-gf-adapter-ok`
- `openclaw-cyber-gf-live-loop-ok`

## 4. 样例一致性检查

检查这些文件是否仍然符合正式链路：

- `_sample_turn_payload.json`
- `_turn_flow_test.json`
- `_live_turn_payload_1.json` ~ `_live_turn_payload_7.json`

重点看：
- 是否还有 `slight_up/slight_down/keep`
- 是否还有非空 `naturalStylePrompt`
- 是否还有重标签/动作提示

## 5. 文档一致性检查

至少检查：
- `PROJECT-STATUS.md`
- `CYBER_GIRLFRIEND.md`
- `docs/cyber-girlfriend-mode.md`
- `docs/architecture.md`
- `XIAOMI-TTS-CONFIG.md`
- `TTS-TAG-STYLE-GUIDE.md`
- `TTS-TESTS.md`

确认这些文件没有互相打架。

## 6. 如果你做了实验

先问自己：

- 这是正式链路变更，还是实验结论？
- 如果只是实验，是否应该只改 `TTS-TESTS.md` / 实验脚本，而不要碰主链？
- 如果要进入正式链路，是否已有 A/B 证据和试听反馈？

## 7. 最后再决定是否提交

提交前看：
- `SUBMISSION-GUIDE.md`
- `PROJECT-STATUS.md`
- `RELEASE-NOTES-2026-04-29.md`

目标是让提交内容：
- 代表当前正式真相
- 不混入本地状态和音频产物
- 不把实验脚本误装成正式策略
