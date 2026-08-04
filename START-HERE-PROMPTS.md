# START HERE — Pixel Network Foundation v0.2.1

This ZIP is the v0.2.1 audit-hardening release built from the Claude-approved v0.2.0 foundation.

## Send to Claude first

Upload the complete ZIP in a fresh Claude conversation and send:

```text
Open PROMPTS/CLAUDE_FINAL_AUDIT_PROMPT.md inside the uploaded ZIP and follow it exactly. Audit only Pixel Network Foundation v0.2.1. Do not modify the project.
```

Expected output:

```text
pixel-network-foundation-v0.2.1-claude-final-audit.md
```

Reject any response about Pixel Admin v5.x, ESX, QBCore, pma-voice, Mumble, reports, bans, F9, or lb-tablet. This project contains `pixel_core` and `pixel_ui` and targets FiveM Enhanced only.

## Send to Codex after Claude

Extract this ZIP into a writable workspace. Add Claude's returned audit Markdown to the workspace root, then send:

```text
Open PROMPTS/CODEX_POST_AUDIT_FIX_PROMPT.md and the Claude v0.2.1 audit Markdown in the current writable workspace. Follow the prompt exactly. Independently verify every finding before changing code.
```

Codex must not begin a new feature milestone until confirmed audit blockers are resolved and the foundation is tested on a live FiveM Enhanced development server.
