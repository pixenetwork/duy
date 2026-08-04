# Codex Prompt — Pixel Character Milestone 1

You are implementing Pixel Network v0.3.0 on top of the included, independently audited Pixel Network Foundation v0.2.1 baseline.

## First actions

1. Read `START-HERE-PIXEL-CHARACTER.md`.
2. Read every file under `MILESTONES/pixel_character/`.
3. Read the foundation architecture, design, code, bridge, build, security, accessibility, and migration documentation.
4. Read `AUDITS/pixel-network-foundation-v0.2.1-claude-final-audit.md`.
5. Verify the workspace is writable by creating and deleting a temporary test file.
6. Do not begin implementation if the baseline is incomplete or the workspace is read-only.

## Objective

Create the first complete `pixel_character` module implementing the exact Milestone 1 specification. Target suite version `0.3.0`.

## Non-negotiable architecture

- FiveM Enhanced only.
- No ESX, QBCore, Qbox, pma-voice, Mumble, or legacy compatibility.
- Server authoritative.
- TypeScript/React for NUI and reusable application logic where appropriate.
- Lua only for FiveM runtime integration.
- SQL migrations with parameterized queries.
- Reuse `pixel_core` and `pixel_ui`; do not duplicate their bridge, diagnostics, tokens, ownership, focus, or component systems.
- Do not copy competitor code, protected UI, imagery, scenes, or assets.
- Preserve existing audited foundation behavior.
- Existing future Pixel Character/Clothing/Admin work is to be migrated, not discarded; since no separate legacy module is included in this baseline, create clean integration contracts and document future migration boundaries.

## Required implementation

Implement all requirements in:

- `PRODUCT_SPEC.md`
- `ARCHITECTURE_AND_DATA_MODEL.md`
- `UI_UX_SPEC.md`
- `SECURITY_AND_TEST_PLAN.md`
- `IMPLEMENTATION_ROADMAP.md`

Add at minimum:

- `resources/pixel_character/fxmanifest.lua`
- Server, client, shared/config, SQL migration, README, CHANGELOG.
- Typed NUI source integrated into the existing Pixel UI application architecture.
- Account resolver, slot resolver, character repository, state machine, list revisioning, session nonce, rate limits, deletion token, activation lock, logout, cleanup, and safe fallbacks.
- Local preview ped/camera manager with bounded model load and guaranteed cleanup.
- Sanitized DTOs and runtime guards on both sides of every trust boundary.
- Exports and events documented in the architecture spec.
- Automated behavioral tests and the specified fault injections.

## Database requirement

Use an explicit project-local database adapter abstraction. Do not introduce a gameplay framework. Document the selected SQL-driver dependency and resource start order. All queries must be parameterized. Character creation and slot allocation must be transaction-safe and constrained by the database.

## UI requirement

Use the approved Pixel OS visual language and existing Pixel UI primitives. Build a cinematic full-screen selector with the slot rail, character panel, creation steps, deletion confirmation, loading/error/retry states, keyboard/controller/mouse parity, reduced motion, and hidden-shell safety described in the UI spec.

Do not create a full appearance or clothing editor. Use the documented provider contract and fallback freemode preview.

## Build and tooling

- Fix the remaining Low v0.2.1 audit note by making vendor-checksum build failures print a clean error without a raw stack trace.
- Keep the transactional deterministic build.
- Keep exact TypeScript pin enforcement.
- Extend validation to cover `pixel_character`, migrations, queries, runtime files, version consistency, Enhanced-only compliance, and sensitive-data scans.
- Do not weaken any existing test or validator to make the new implementation pass.

## Required reports

Produce:

- `IMPLEMENTATION_REPORT.md`
- `TEST_REPORT.md`
- `SECURITY_REVIEW.md`
- `ACCESSIBILITY_REVIEW.md`
- `KNOWN_LIMITATIONS.md`
- `MIGRATION_REPORT.md`
- `LIVE_ENHANCED_QA_CHECKLIST.md`
- Root and per-resource changelogs.

Clearly distinguish static/browser tests from live FiveM Enhanced tests. Never claim live testing unless it was actually performed.

## Deliverable

Create one ZIP named:

`Pixel-Network-v0.3.0-Pixel-Character-M1.zip`

The ZIP must contain the complete project, source, deterministic built assets, migrations, tests, reports, prompts, and changelogs. Also provide its SHA-256 checksum and a concise implementation summary.
