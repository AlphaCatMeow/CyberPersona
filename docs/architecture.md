# CyberPersona Architecture

## Overview

CyberPersona is a hybrid runtime for long-lived AI personas.

It is designed around a strict separation of concerns:

- the **agent/runtime layer** is responsible for character reasoning
- the **local execution layer** is responsible for deterministic state application and side effects

This architecture prevents the local script layer from quietly becoming the “brain” of the system while still keeping state persistence, TTS, and delivery reliable and inspectable.

---

## System goals

CyberPersona is not intended to be a one-shot roleplay prompt.

It is intended to support:

- persistent character identity
- relationship continuity across turns
- controlled relationship drift
- durable revealed facts and shared memories
- voice behavior as part of personality
- inspectable and replayable local execution behavior

---

## Layered responsibility model

## 1. Agent / runtime layer

The agent side is responsible for:

- initial persona construction
- long-context reasoning
- interpreting user intent in context
- deciding how the character should respond
- deciding whether voice is natural for the current turn
- outputting structured payloads

### Agent outputs

Two core payloads are expected:

#### `InitialStatePayload`
Used when a persona is created for the first time.

Expected sections:
- `profile`
- `dynamicStateInit`
- `shortTermStateInit`
- `revealedMemoryInit`
- `openingMessage`

#### `TurnResultPayload`
Used for every normal turn after persona creation.

Expected sections:
- `visibleText`
- `taggedTtsText`
- `naturalStylePrompt`
- `currentEmotion`
- `sendVoiceNow`
- `stateDelta`
- `shortTermUpdate`
- `memoryUpdate`

---

## 2. Local execution layer

The local side is responsible for:

- validating structured payloads
- reading and writing persistent state
- applying state transitions
- merging revealed memory updates
- caching last-turn TTS material
- generating TTS audio
- probing the TTS chain during self-check
- preparing Telegram voice-note delivery payloads
- exposing debug inspection helpers

This layer should not invent character behavior on its own except for explicit fallback/debug cases.

---

## Persistent state model

CyberPersona currently uses the following main structure:

```json
{
  "profile": {},
  "dynamicState": {},
  "shortTermState": {},
  "revealedMemory": {},
  "runtimeCache": {}
}
```

## 1. `profile`
Stable, durable character summaries.

Examples:
- core personality
- relationship style
- defense / boundary style
- starting relationship summary
- voice style summary
- overall persona summary

## 2. `dynamicState`
Slow-moving relationship state.

Examples:
- relationship warmth
- safety
- trust
- approach desire
- vulnerability willingness
- voice ease

These currently use bounded discrete levels:
- `low`
- `medium`
- `high`

## 3. `shortTermState`
Short-lived emotional aftereffects.

Examples:
- unresolved emotion
- interaction trend
- recent voice pattern

## 4. `revealedMemory`
Durable facts that have already been revealed or formed.

Examples:
- nicknames
- shared routines
- revealed facts
- important events
- last relationship summary

## 5. `runtimeCache`
Operational caches, not core persona truth.

Examples:
- last turn TTS materials
- last generated audio metadata
- debug flags

---

## Design principles

## 1. Persona generation is not slot-machine randomness

CyberPersona prefers coherent persona construction from a strong prompt over enum-like pseudo-random trait assembly.

## 2. The past is generated on demand, then hardened

The system does not need a fully pre-written fictional biography.

Instead:
- if the user asks about past facts,
- the agent generates a response consistent with current persona and relationship state,
- then the revealed fact becomes durable memory.

## 3. Voice is not a product bolt-on

`sendVoiceNow` means:
- would this character naturally choose voice in this moment?

It is not a generic UX optimization switch.

## 4. Text and voice controls stay separated

Normal chat output uses `visibleText`.

TTS uses:
- `taggedTtsText`
- `naturalStylePrompt`

These should not leak into normal user-visible chat unless debug is explicitly enabled.

---

## Unified flow contract

CyberPersona currently exposes two main local execution flows:

## `runStartFlow(initialPayload)`
Applies first-time persona creation and returns:
- applied state result
- unified delivery contract

## `runTurnResultFlow(turnResultPayload)`
Applies a turn result, optionally generates TTS audio, and returns:
- applied state result
- generated audio metadata when relevant
- unified delivery contract

---

## Delivery contract

The delivery contract tells the outer runtime how to deliver the turn.

### Text turn

```json
{
  "mode": "text_reply",
  "text": "...",
  "shouldReplyInChat": true,
  "shouldNoReplyAfterMessageSend": false
}
```

### Voice-note turn

```json
{
  "mode": "voice_note",
  "text": "...",
  "voicePayload": { "asVoice": true },
  "shouldReplyInChat": false,
  "shouldNoReplyAfterMessageSend": true
}
```

This structure exists to prevent:
- narration leakage
- duplicate sends
- extra fallback tail text after message-tool sends

---

## Current implementation boundary

The local execution layer and flow contracts are implemented.

The remaining system-level integration task is wiring the live runtime/session layer so incoming chat messages automatically:
- generate the correct payload
- call the correct flow
- deliver text or voice-note according to the returned contract

---

## Expected future evolution

Likely next architecture steps:

- generalize `cyber-gf-*` naming into broader CyberPersona modules
- introduce a mode/persona registry
- support multiple persona modes under one runtime
- further isolate runtime integration from mode-specific logic
- improve TTS style generation and delivery strategy
