# Release Notes — 2026-04-29

## Summary

This update turns the Cyber Girlfriend TTS path from a mixed experimental setup into a clearer production-oriented pipeline.

The main outcome is a deliberate shift to a **tag_only** production strategy for Xiaomi MiMo TTS with the built-in `茉莉` voice.

In this production path, `naturalStylePrompt` is intentionally left empty.

## Key changes

### 1. Production TTS strategy narrowed

The runtime now treats the following as the active production path:

- model: `mimo-v2.5-tts`
- voice: `茉莉`
- delivery control: `taggedTtsText` only
- `naturalStylePrompt`: kept for compatibility, but cleared in production

### 2. Runtime normalize layer added

Turn payloads are normalized before application/delivery:

- clears `naturalStylePrompt`
- compresses heavy leading tags
- removes inline action cues like `[轻哼]`
- lightly repairs sleep/comfort cases when no useful tag is present

### 3. Tag vocabulary reduced

The production tag vocabulary was narrowed to a small, stable set:

- `轻声`
- `温柔`
- `委屈`
- `嘴硬`
- `开心`
- `悲伤`
- `害羞`
- `心软`

### 4. Payload contract aligned

Sample and live payloads were updated to match the current runtime contract:

- numeric `stateDelta`
- empty `naturalStylePrompt` in production examples
- lighter `taggedTtsText`

### 5. Docs split into production vs experiment

The workspace now clearly distinguishes:

- production path
- experiment scripts
- historical snapshot/export content

New/updated guidance files:

- `PROJECT-STATUS.md`
- `TTS-TESTS.md`
- `TTS-TAG-STYLE-GUIDE.md`
- `XIAOMI-TTS-CONFIG.md`
- `CYBER_GIRLFRIEND.md`
- `docs/cyber-girlfriend-mode.md`
- `docs/architecture.md`

### 6. Export snapshot explicitly downgraded

`CyberPersona-export/` is now marked as a historical snapshot instead of a parallel source of truth.

## Evidence used for the strategy change

The strategy shift was based on:

1. Xiaomi official documentation review
2. A/B generation tests across:
   - plain
   - tag_only
   - style_only
   - style_plus_tag
3. Human listening feedback

Conclusion:

- double control remains useful as an experiment
- double control is not the preferred production path for this project

## Current status

The main workspace is now the canonical source of truth.

The TTS path is in a significantly more consistent state across:

- code
- payloads
- tests
- docs
- workspace structure
