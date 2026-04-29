# Automation

更新时间：2026-04-29

## 1. 生产链路校验

```bash
node verify-production-readiness.js
```

用途：
- 检查正式样例 payload 是否仍符合当前主线
- 检查 runtime normalize 是否仍会清空 `naturalStylePrompt`
- 检查 built-in Xiaomi TTS 请求是否仍然只发送 assistant 文本
- 检查核心文档是否仍明确声明 `tag_only` 与 style 留空策略

成功输出：

```text
production-readiness-ok
```

## 2. 构建提交副本

```bash
node build-submission-bundle.js
```

用途：
- 生成一个不破坏当前工作区的、面向提交/评审的精简副本
- 自动排除本地 secret、runtime state、workspace memory、生成音频
- 保留主线代码、主线文档、精选样例、A/B 结论文档

输出目录：

```text
submission-bundle/
```

其中包含：
- `BUNDLE-MANIFEST.json`
- `README.md`
- 主线代码与文档副本

## 推荐使用顺序

```bash
node verify-production-readiness.js && node build-submission-bundle.js
```

说明：
- `verify-production-readiness.js` 现在已经会连带执行：
  - `test-openclaw-cyber-gf-adapter.js`
  - `test-openclaw-cyber-gf-live-loop.js`
- 也就是说，主校验通过时，adapter 与模拟 live 回路也必须同时通过

## 3. live adapter 冒烟测试

```bash
node test-openclaw-cyber-gf-adapter.js
```

成功输出：

```text
openclaw-cyber-gf-adapter-ok
```

## 4. 模拟 live chat 回路集成测试

```bash
node test-openclaw-cyber-gf-live-loop.js
```

用途：
- 在不依赖外部聊天 runtime 的前提下，串测 adapter 的关键分支
- 覆盖 disabled fallback / start / normal text turn / voice turn / exit
- 确认 voice send 后只返回精确 `NO_REPLY`

成功输出：

```text
openclaw-cyber-gf-live-loop-ok
```
