# Changelog

## 0.2.1 — Audit Hardening and Behavioral QA

- Closed every Medium and Low finding from the independent v0.2.0 Claude audit.
- Added reverse manifest coverage checks so every shipped `web/dist` runtime file must be included by `files {}`.
- Added clean missing-artifact errors and content-hash verification for built JavaScript and CSS.
- Made the deterministic UI build transactional so failed typechecks cannot delete the last known-good `dist`.
- Enforced the exact pinned TypeScript compiler version and recorded the observed compiler version in build metadata.
- Added a checksummed React runtime manifest documenting the JupyterLab-derived module IDs and alias used by the local loader.
- Bounded diagnostic depth, breadth, total nodes, key length, field strings, message length, names, and encoded output.
- Expanded exact sensitive-key redaction to include `auth`, `pwd`, `apikey`/`api-key`, and `pin`.
- Replaced regex-only readiness and diagnostics tests with Lua 5.4 behavioral execution tests.
- Added a bounded manual `RequestCapabilities` recovery export and warning when the initial readiness cycle is exhausted.
- Reordered complete verification so source is typechecked and built before artifact-consistency tests run.
- Updated handoff prompts, reports, and per-resource changelogs for v0.2.1.
- No live FiveM Enhanced runtime certification is claimed.

## 0.2.0 Audit-Handoff Packaging Addendum

- Replaced stale v0.1.2 handoff prompts with v0.2.0 Claude audit and Codex post-audit prompts.
- Repackaged the archive with portable forward-slash entry paths.
- No runtime resources, generated assets, dependencies, tests, tools, or product version changed.

## 0.2.0 — Pixel UI Kit, Typed Bridge, and Diagnostics

- Added a strict TypeScript, runtime-validated NUI event and callback protocol with correlation IDs, timeouts, abort support, structured errors, duplicate-response protection, cleanup, and browser mocks.
- Added centralized Lua callback registration, payload guards, safe error responses, and one-response enforcement.
- Added 21 reusable UI components and 10 shared application/layout primitives using generated Pixel tokens.
- Added focus traps, focus restoration, top-most Escape handling, keyboard tabs/menus, labels, live regions, hidden-shell inert behavior, and reduced-motion support.
- Added ordered multi-consumer visibility/focus/cursor ownership, duplicate-open prevention, modal depth, close-all, resync, and resource-stop cleanup.
- Added shared client/server diagnostics with levels, contexts, structured fields, development gating, and recursive sensitive-key redaction.
- Added a production-disabled developer showcase using the actual component library and browser-safe bridge mocks.
- Expanded deterministic tokens, builds, tests, validation, public references, integration guidance, security review, and accessibility review.
- Replaced the two v0.1.2 generated hashed UI assets with v0.2.0 source-derived assets; the builder intentionally removes stale `dist/assets` files.
- Preserved the v0.1.2 visibility exports and callback behavior for existing Pixel callers.
- No live FiveM Enhanced runtime certification is claimed.

## 0.1.2 Prompt-Pack Packaging Addendum

- Added embedded Claude and Codex instruction files under `PROMPTS/`.
- Added `START-HERE-PROMPTS.md` for simple handoff instructions.
- No framework runtime code, dependencies, resources, tests, generated assets, or product version changed.

## 0.1.2 — Verified Foundation Repair

- Replaced the divergent hand-authored NUI artifact with a deterministic React + TypeScript production build generated from the shipped source.
- Vendored the React 18.2.0 production runtime locally under its MIT license so FiveM NUI never depends on a CDN.
- Fixed every generated design-token consumer and added undefined-token validation.
- Fixed the first-request ready cooldown edge case.
- Restored the session-ready wait, bounded capability retry, and server-side `GetVersion` export.
- Added capability refresh when `pixel_ui` starts after `pixel_core`.
- Added a real `package-lock.json`, source CSP, required `dist` tracking, and hashed build assets.
- Added deterministic source/build metadata so stale or unrelated `dist` files fail validation.
- Added Lua 5.4 syntax validation, plural manifest/files validation, JavaScript syntax checks, lockfile checks, and token checks.
- Fixed the React ready handshake so it runs once instead of on every visibility toggle.
- Added implementation, test, known-limitations, and third-party-notice reports.

## 0.1.1 — Foundation Audit Fixes

- Fixed the invalid JavaScript-style `Object.freeze` expression in Lua.
- Completed the NUI visibility, focus, close, and ready-handshake bridge.
- Added generated CSS design tokens from the JSON source of truth.
- Added capability readiness, dynamic resource version discovery, and a ready-event cooldown.
- Added database migration conventions, root scripts, and `.gitignore`.
- Split root and per-resource changelogs so each records only its own changes.

## 0.1.0 — Initial Foundation

- Added the Enhanced-only Pixel Network foundation, documentation, branding references, `pixel_core`, and `pixel_ui` starters.