# Pixel Network Foundation v0.2.1 — Implementation Report

## Purpose

v0.2.1 is a focused audit-hardening release built from the independently approved v0.2.0 foundation. It does not add a new gameplay module or alter the approved Enhanced-only architecture.

## Completed work

### Release and validator hardening

- Added reverse `fxmanifest.lua` coverage checks: every file physically shipped under `resources/pixel_ui/web/dist` must be covered by `files {}`.
- Added clean missing-entry handling for `dist/index.html` and invalid build metadata.
- Added content-hash verification for every built JavaScript/CSS asset against the hash embedded in its filename.
- Added checksummed validation for the vendored React runtime, ReactDOM chunk, and MIT license.
- Retained Lua 5.4 parsing, token generation/drift checks, Enhanced-only scans, version checks, lockfile checks, source-hash checks, and release-document checks.

### Transactional deterministic build

- TypeScript compilation now occurs before any production bundle replacement.
- Builds are written to a staging directory and atomically swapped into `dist` only after every output is complete.
- A failed compiler/typecheck/build leaves the previous `dist` byte-for-byte unchanged.
- The builder accepts only the exact TypeScript version pinned in `package.json`/`package-lock.json` and writes the observed compiler version to `pixel-build.json`.
- Complete verification now builds before artifact-consistency tests, preventing legitimate source changes from failing against an intentionally stale pre-build artifact.

### Vendored runtime provenance

- Added `vendor/react-18.2.0/runtime-manifest.json` containing SHA-256 checksums, the extracted webpack queue name, React/ReactDOM module IDs, and the React alias requested by the extracted ReactDOM factory.
- Updated the builder and runtime test to consume that manifest rather than duplicating undocumented numeric IDs.
- Updated third-party documentation to identify the JupyterLab-derived packaging and the separate MIT license file accurately.

### Diagnostics/privacy bounds

- Added limits for nesting depth, per-table key count, total copied nodes, diagnostic key length, field strings, message text, resource/module names, and final encoded field output.
- Added exact sensitive-key coverage for `auth`, `pwd`, `apikey`/`api-key`, and `pin` while retaining the previous recursive sensitive roots.
- Forwarded the sanitized message returned by Pixel Core to NUI diagnostics and bounded the fallback path when Pixel Core is unavailable.

### Capability recovery

- Added a public client `RequestCapabilities()` export.
- Prevented overlapping/manual requests after readiness.
- Added a warning after each exhausted bounded retry cycle.
- Preserved session-start waiting, five-attempt bounds, server cooldown, player-drop cleanup, late-`pixel_ui` refresh, defensive copies, and version exports.

### Behavioral tests

- Removed regex-only readiness and diagnostics tests.
- Added Lua 5.4 behavioral tests that execute the shipped server readiness handler, client readiness flow, bounded failure/recovery path, and diagnostics implementation under mocked FiveM primitives.
- Updated React runtime tests to execute and validate the checksummed vendor manifest and alias mapping.
- Updated TypeScript core tests to resolve and verify the exact pinned compiler rather than requiring a populated local `node_modules` directory.

## Verified offline

- 22 automated tests passed.
- Strict TypeScript 5.8.3 typechecking passed.
- Lua 5.4 syntax parsing passed.
- Transactional production UI build passed.
- Two repeated rebuilds produced identical file hashes.
- Full release validation passed.
- Ten targeted fault injections were rejected, including reverse-manifest removal, built-asset tampering, vendor tampering, stale source, invalid Lua, undefined tokens, prohibited compatibility text, and version mismatch.
- A forced TypeScript failure preserved the previous production `dist` exactly.

Exact environment, commands, hashes, and fault-injection results are recorded in `TEST_REPORT.md`.

## Not verified live

No FiveM Enhanced server or client was launched during this implementation pass. The following remain live-QA gates:

- actual NUI callback transport and native focus/cursor behavior;
- Escape interaction with the FiveM pause menu;
- resource restart timing and multi-owner focus restoration in-game;
- controller and embedded-browser assistive-technology behavior;
- target-hardware performance measurements.

Use `LIVE_ENHANCED_QA_CHECKLIST.md` before declaring the foundation production-certified.
