# CyberPersona

CyberPersona is a hybrid runtime for long-lived AI personas and companion-style characters.

It is designed for characters that persist across sessions, evolve through interaction, maintain relationship continuity, and optionally express themselves through voice as part of personality rather than as a bolt-on feature.

## Current status

This repository is the **first working implementation** of CyberPersona.

The first implemented mode is:
- **Cyber Girlfriend mode**

The long-term goal is broader:
- romantic personas
- companion personas
- comfort / support personas
- custom long-lived characters
- multiple relationship styles and persona modes

---

## Architecture

CyberPersona uses a **hybrid model**:

### Agent / runtime layer
Responsible for:
- long-context understanding
- initial persona construction
- per-turn structured generation
- relationship-aware reasoning

### Local execution layer
Responsible for:
- persistent state storage
- deterministic state transition application
- revealed memory consolidation
- MiMo TTS execution
- Telegram voice-note payload generation
- startup self-checks
- debug inspection

This separation keeps the character's “mind” with the agent while keeping local state and side effects deterministic and inspectable.

---

## Repository layout

```text
.
├── cyber-gf-config.js
├── cyber-gf-controller.js
├── cyber-gf-profile.js
├── cyber-gf-prompts.js
├── cyber-gf-state.js
├── cyber-gf-tts.js
├── cyber-gf-turn.js
├── docs/
│   └── cyber-girlfriend-mode.md
├── examples/
│   └── .env.cyber-gf.example
├── CYBER_GIRLFRIEND.md
├── .gitignore
└── README.md
```

Notes:
- Current file names still use the `cyber-gf-*` prefix because the first mode is Cyber Girlfriend.
- The next refactor should move toward a broader `cyberpersona-*` or `modes/` layout.

---

## What each file does

- `cyber-gf-controller.js` — main local controller and unified flow entrypoints
- `cyber-gf-state.js` — persistent state model and transition logic
- `cyber-gf-profile.js` — initial payload validation and state construction
- `cyber-gf-turn.js` — turn payload validation and fallback behavior
- `cyber-gf-tts.js` — MiMo TTS execution with retry and diagnostics
- `cyber-gf-prompts.js` — prompt builders for agent-side generation
- `cyber-gf-config.js` — env/config loading and startup validation
- `docs/cyber-girlfriend-mode.md` — mode-specific behavior and flow contract

---

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/harrylarryxyz/CyberPersona.git
cd CyberPersona
```

### 2. Create local config

```bash
cp examples/.env.cyber-gf.example .env.cyber-gf
```

Then fill in your real MiMo / local runtime values.

### 3. Required local config fields

At minimum:

- `XIAOMI_BASE_URL`
- `XIAOMI_API_KEY`
- `XIAOMI_TTS_MODEL`
- `XIAOMI_TTS_VOICE`
- `XIAOMI_TTS_FORMAT`
- `CYBER_GF_STATE_FILE`
- `CYBER_GF_HISTORY_FILE`
- `CYBER_GF_TTS_OUTPUT_DIR`

Optional debug flags:

- `CYBER_GF_DEBUG`
- `CYBER_GF_DEBUG_TTS`

### 4. Start / exit / clear

```bash
node cyber-gf-controller.js 开始赛博女友
node cyber-gf-controller.js 退出赛博女友
node cyber-gf-controller.js 我们分手吧
```

### 5. Inspect state

```bash
node cyber-gf-controller.js status
```

### 6. Debug tools

```bash
node cyber-gf-controller.js debug-on
node cyber-gf-controller.js debug-last
node cyber-gf-controller.js debug-off
```

### 7. Voice-related helpers

```bash
node cyber-gf-controller.js last-audio
node cyber-gf-controller.js voice-send-payload
node cyber-gf-controller.js voice-delivery-info
```

---

## Flow model

### Start flow

If no state exists:
1. Run startup self-check
2. Generate `InitialStatePayload` on the agent side
3. Apply it through `run-start-flow`
4. Deliver the opening message

### Turn flow

For each user turn:
1. Build context from saved state and recent history
2. Generate `TurnResultPayload` on the agent side
3. Apply it through `run-turn-flow`
4. If `sendVoiceNow=true`, generate audio and prepare Telegram voice-note delivery
5. Deliver either text or voice-note according to the unified delivery contract

---

## Main commands

### Build agent-facing payloads

```bash
node cyber-gf-controller.js turn-payload "你在干嘛"
```

### Apply generated payloads

```bash
node cyber-gf-controller.js apply-start-payload /path/to/initial-payload.json
node cyber-gf-controller.js apply-turn-payload /path/to/turn-payload.json
```

### Run unified flows

```bash
node cyber-gf-controller.js run-start-flow /path/to/initial-payload.json
node cyber-gf-controller.js run-turn-flow /path/to/turn-payload.json
```

---

## Telegram voice notes

CyberPersona does not rely on file extension alone for Telegram voice-note delivery.

Correct delivery uses:
- generated audio file
- `message` send payload
- `asVoice=true`

The controller can prepare this payload from the latest generated audio.

---

## Current limitations

### 1. Naming is still first-mode-specific
Current source files still use `cyber-gf-*` names.

### 2. Full session auto-wiring is not yet embedded in runtime core
The local execution layer is ready, but the surrounding runtime still needs to invoke `run-start-flow` and `run-turn-flow` automatically inside the final chat loop.

### 3. TTS naturalness still needs refinement
The TTS chain works, but prompt/style control still needs dedicated tuning so audio sounds less over-directed.

---

## Security notes

Do **not** commit:
- real `.env` files
- generated state/history files
- audio output
- workspace memory
- local secrets or tokens

This repository intentionally excludes those files.

---

## Roadmap

1. Generalize the current Cyber Girlfriend implementation into a multi-mode persona runtime
2. Rename / reorganize code into a broader CyberPersona structure
3. Finish runtime auto-wiring for live chat usage
4. Improve TTS style generation and voice selection strategy
5. Add mode registry / persona registry abstractions
