# TTS Tests Map

更新时间：2026-04-29

这份文件用来明确区分：

- **正式链路**：当前项目实际采用的语音策略
- **实验链路**：用于理解 Xiaomi MiMo 能力边界的测试脚本

## 正式链路

当前正式链路规则：

- 模型：`mimo-v2.5-tts`
- 音色：`茉莉`
- 控制：**tag_only**
- `naturalStylePrompt`：默认留空
- 标签：只保留开头少量整体标签，默认最多 2 个

核心文件：

- `cyber-gf-controller.js`
- `cyber-gf-turn.js`
- `cyber-gf-tts.js`
- `CYBER_GIRLFRIEND.md`
- `XIAOMI-TTS-CONFIG.md`
- `TTS-TAG-STYLE-GUIDE.md`

## 实验链路

以下脚本属于实验用途，不代表正式链路推荐策略：

### 1. `xiaomi-tts-official-ab-test.js`
用途：
- 官方结构下的 A/B 对比
- 比较 plain / tag_only / style_only / style_plus_tag

结论：
- 已用于确认正式链路应采用 `tag_only`

### 2. `xiaomi-tts-compare-test.js`
用途：
- 早期风格控制对比实验

状态：
- 历史脚本
- 可保留参考，但不再作为正式策略依据

### 3. `xiaomi-tts-style-test.js`
用途：
- 标签解析能力实验
- 包含方言、角色扮演、唱歌、导演式标签等边界情况

状态：
- 实验脚本
- 不代表正式链路允许这些标签进入会话

### 4. `xiaomi-tts-emotion-test.js`
用途：
- 多段情绪切换实验

状态：
- 实验脚本
- 用于理解模型表现，不直接映射正式策略

### 5. `xiaomi-tts-voicedesign-test.js`
用途：
- `mimo-v2.5-tts-voicedesign` 模型实验

状态：
- 独立实验路线
- 与当前正式链路无关

### 6. `xiaomi-tts-direct.js`
用途：
- 直接调 API 的便捷入口

状态：
- **默认模拟正式链路**
- 只有显式传 style 参数时，才进入实验性风格提示模式

## 维护原则

1. 不删除历史实验，避免丢失经验
2. 但必须明确标记“正式”与“实验”身份
3. 新的正式规则先改主链：controller / turn / tts / docs
4. 实验脚本可以落后，但不能误导正式策略
