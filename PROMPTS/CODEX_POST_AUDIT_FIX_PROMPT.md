# Codex Post-Audit Prompt — Pixel Network Foundation v0.2.1

You are the implementation engineer working inside a writable workspace.

## First steps

1. Confirm the root package version is `0.2.1`.
2. Confirm `resources/pixel_core` and `resources/pixel_ui` exist.
3. Read all architecture, ADR, Code Bible, Design Bible, changelog, implementation, test, security, accessibility, limitations, and build documents.
4. Read the Claude v0.2.1 audit Markdown in the workspace root.
5. Independently reproduce every claimed finding before modifying files.

## Constraints

- FiveM Enhanced only.
- No legacy compatibility.
- No ESX, QBCore, pma-voice, or legacy Mumble code.
- Preserve the approved Pixel architecture and chrome/obsidian/electric-blue/violet design direction.
- Do not silently remove public APIs, resources, components, tests, documentation, or generated runtime assets.
- Do not copy proprietary code or assets.
- Use Lua for FiveM runtime integration and TypeScript/React where appropriate.
- Every changed resource and release ZIP must contain an accurate `CHANGELOG.md`.
- Do not claim live FiveM verification unless it was actually performed.

## Work rule

- If Claude confirms a bug, fix it with the smallest architecture-consistent change and add a regression test.
- If a finding is incorrect, document why with file/line and executed evidence.
- Run `npm run verify` after changes.
- Rebuild twice and confirm identical `dist` hashes.
- Repeat fault injection for any validator/build issue changed.

## Versioning

- Runtime/build/validator/API changes: produce v0.2.2.
- Documentation-only handoff correction: retain v0.2.1 and record a packaging addendum.
- If the audit passes with no confirmed blockers, do not start v0.3.0 feature work yet. Produce or update `LIVE_ENHANCED_QA_CHECKLIST.md` and wait for the live Enhanced staging results.

## Deliverables

- Corrected project tree, when needed.
- Accurate root and per-resource changelogs.
- `IMPLEMENTATION_REPORT.md`.
- `TEST_REPORT.md`.
- `KNOWN_LIMITATIONS.md`.
- `Pixel-Network-Foundation-v0.2.2.zip` only when runtime/build/validator/API behavior changes.
