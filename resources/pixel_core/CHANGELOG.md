# Changelog — pixel_core

## 0.2.1

- Added bounded diagnostic payload processing for depth, breadth, total nodes, key/string lengths, message length, and final encoded output.
- Expanded sensitive-key redaction for `auth`, `pwd`, `apikey`/`api-key`, and `pin` while preserving the existing recursive key roots.
- Added a manual `RequestCapabilities` export and a warning after each exhausted bounded readiness cycle.
- Replaced readiness and diagnostics source-text checks with behavioral Lua 5.4 tests that execute the shipped client, server, and diagnostics code.

## 0.2.0

- Added shared client/server diagnostics with debug, info, warn, and error levels.
- Added resource/module context, structured fields, development gating, and recursive sensitive-key redaction.
- Added client/server `Log` and `RedactDiagnostics` exports.
- Preserved capability readiness, defensive snapshots, cooldown cleanup, and version exports.

## 0.1.2

- Fixed the ready cooldown so a player's first request is never rejected during early server uptime.
- Restored the client session-start guard and added bounded retries until capabilities arrive.
- Restored the server-side `GetVersion` export.
- Derives the framework version from `fxmanifest.lua` metadata.
- Re-broadcasts capabilities when `pixel_ui` starts after `pixel_core`.
- Preserves per-player cooldown cleanup on disconnect.

## 0.1.1

- Replaced invalid JavaScript syntax in `shared/version.lua` with valid Lua.
- Added dynamic capability version discovery from resource metadata.
- Added client capability readiness state and export.
- Added a cooldown for repeated client-ready events.
- Cleans per-player cooldown state on disconnect.

## 0.1.0

- Added the initial Enhanced-native Pixel Core starter and capability snapshot flow.