#!/bin/bash
# 测试 CyberPersona 性能

echo "=== 测试开始 ==="
echo ""

# 1. 测试 buildTurnPayload
echo "1. 测试 buildTurnPayload"
cd ~/.hermes/CyberPersona-hermes
node cyber-gf-controller.js turn-payload "测试消息" 2>&1 | grep -E "\[perf\]"
echo ""

# 2. 测试 applyInitialStatePayload
echo "2. 测试 applyInitialStatePayload"
node cyber-gf-controller.js apply-start-payload /tmp/cyber-gf-init-payload.json 2>&1 | grep -E "\[perf\]"
echo ""

# 3. 测试 applyTurnResultPayload
echo "3. 测试 applyTurnResultPayload"
# 需要先有一个 turn result payload
# 这里只是示例，实际需要 LLM 生成的结果
echo "需要在实际对话中测试"
echo ""

echo "=== 测试完成 ==="
