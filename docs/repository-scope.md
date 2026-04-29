# Repository Scope

This repository intentionally contains only the CyberPersona project subset.

Current production assumption:

- the formal TTS path is `tag_only`
- `naturalStylePrompt` stays empty in the production path

It does **not** include:

- local workspace memory
- live `.env` secrets
- generated state or history
- generated audio artifacts
- throwaway test payloads
- unrelated OpenClaw workspace files

In the current workspace, that specifically means things like:

- `.env.cyber-gf` → local secret config, not for commit
- `.cyber-gf-state.json` / `.cyber-gf-history.json` → runtime state, not source
- `.openclaw/` → local runtime metadata
- `memory/` → private workspace memory
- `tts-output/` / `tts-cyber-gf/` → generated voice output
- `tts-official-ab-test/*.mp3` and similar test audio directories → generated artifacts, not canonical source
- `_live_*.json`, `_sample_*.json`, `*_test.json` → local/debug payload examples unless intentionally curated for repo use

The goal is to keep this repository focused, portable, and safe to maintain.

## Recommended repository core

If you want a clean submission-oriented snapshot, the center of the repo should be:

- mainline JS runtime files
- stable docs describing the current production path
- one example env file
- a small number of intentionally curated payload examples
- optional experiment reports in text/JSON form

The repo should **not** be shaped around local artifacts or generated audio output.
