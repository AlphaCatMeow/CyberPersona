# Runtime Integration Design

## Purpose

This document describes how a live chat runtime should integrate with CyberPersona's existing local execution flows.

The goal is to make live conversation behavior deterministic and clean:

- no narration leakage
- no duplicate visible outputs
- no stray tail text after voice-note sends
- explicit text vs voice-note delivery decisions

---

## Main runtime entry cases

Incoming messages should be classified into four main categories:

1. `开始赛博女友`
2. `退出赛博女友`
3. `我们分手吧`
4. normal chat turn

---

## Case 1: Start

When the user says:

```text
开始赛博女友
```

The runtime should:

1. call startup self-check logic
2. if prior state exists:
   - restore mode
   - reply with restored opening text
3. if no prior state exists:
   - generate `InitialStatePayload` on the agent side
   - call `runStartFlow(initialPayload)`
   - use the returned delivery contract to send the opening message

### Desired behavior

- startup should be blocked if self-check fails
- startup should not proceed until config and execution chain are ready
- persona creation should come from the agent, not be hardcoded locally

---

## Case 2: Exit

When the user says:

```text
退出赛博女友
```

The runtime should:

1. disable mode
2. preserve state
3. return a normal text confirmation

---

## Case 3: Breakup / clear

When the user says:

```text
我们分手吧
```

The runtime should:

1. clear state
2. clear local interaction history for this mode
3. return a normal text confirmation

---

## Case 4: Normal chat turn

When the user sends a normal message and CyberPersona mode is enabled:

1. build turn context from current state + recent history
2. generate `TurnResultPayload` on the agent side
3. call `runTurnResultFlow(turnPayload)`
4. inspect returned `delivery`
5. deliver according to delivery mode

---

## Delivery rules

## Text reply mode

If:

```json
{ "mode": "text_reply" }
```

Then the outer runtime should:
- reply with `delivery.text`
- not call message-tool voice delivery
- not append extra system narration

## Voice-note mode

If:

```json
{ "mode": "voice_note" }
```

Then the outer runtime should:
1. use `message(action=send, asVoice=true, ...)` with `delivery.voicePayload`
2. if that message-tool send succeeds, return `NO_REPLY` for the current assistant turn

### Why this matters

This prevents:
- duplicated text plus voice-note confusion
- accidental plain-text tails like “No further note from me.”
- tool execution leakage into visible chat

---

## Debug mode behavior

## Debug off

Normal user-visible output must contain only:
- the intended persona text reply
- or the intended voice-note send

It must not contain:
- tool narration
- execution commentary
- hidden TTS control text
- flow debugging notes

## Debug on

Debug mode may additionally expose:
- current emotion
- `sendVoiceNow`
- `stateDelta`
- `shortTermUpdate`
- `memoryUpdate`
- `taggedTtsText`
- `naturalStylePrompt`

This should still be explicit and structured, not ad hoc narration.

---

## Suggested integration pseudocode

```js
async function handleIncomingMessage(userMessage) {
  if (userMessage === '开始赛博女友') {
    const startStatus = await startCyberGfHybrid();
    if (startStatus.kind === 'config_incomplete' || startStatus.kind === 'self_check_failed') {
      return reply(startStatus.visibleText);
    }

    if (startStatus.kind === 'restored') {
      return reply(startStatus.visibleText);
    }

    if (startStatus.kind === 'need_profile_generation') {
      const initialPayload = await agentGenerateInitialPayload(startStatus.prompt);
      const result = await runStartFlow(initialPayload);
      return reply(result.delivery.text);
    }
  }

  if (userMessage === '退出赛博女友') {
    return reply(exitCyberGfHybrid().visibleText);
  }

  if (userMessage === '我们分手吧') {
    return reply(breakupCyberGfHybrid().visibleText);
  }

  if (!cyberPersonaModeEnabled()) {
    return continueNormalAssistantHandling(userMessage);
  }

  const turnPayload = await agentGenerateTurnPayload(userMessage);
  const result = await runTurnResultFlow(turnPayload);

  if (result.delivery.mode === 'text_reply') {
    return reply(result.delivery.text);
  }

  if (result.delivery.mode === 'voice_note') {
    await messageSend(result.delivery.voicePayload);
    return NO_REPLY;
  }
}
```

---

## Current implementation status

Already implemented locally:
- self-checking
- payload validation
- state transitions
- unified start flow
- unified turn flow
- TTS generation
- voice-note payload preparation
- debug inspection helpers

Not yet fully embedded in runtime core:
- automatic live session wiring of all incoming chat turns to these flows

---

## Recommended next implementation step

The next real runtime milestone is not another helper function.

It is:

- embedding these flow calls into the live session turn loop
- enforcing the delivery contract at message-send time
- guaranteeing clean `NO_REPLY` behavior after successful voice-note sends

## Workspace adapter

This workspace now includes a small adapter layer:

- `openclaw-cyber-gf-adapter.js`

Its purpose is to help the outer OpenClaw/live-chat runtime do the last-mile routing cleanly:

- map `开始赛博女友` / `退出赛博女友` / `我们分手吧`
- route normal turns into the existing local flow
- dispatch `voice_note` delivery through a caller-provided send hook
- return the exact silent token `NO_REPLY` after successful voice-note sends
- collapse known leaked fallback text like `No further note from me.` back into a silent reply

This does **not** replace runtime-core integration, but it narrows the last-mile gap and makes the intended delivery contract executable instead of purely documentary.
