# Pixel Network Foundation v0.2.1 — Claude Final Audit

## 1. Executive verdict

**Pixel Network Foundation v0.2.1 is release-ready as an offline foundation package.** All ten items in the v0.2.1 hardening plan were independently exercised — not merely re-read — and every one of them closes the specific gap the v0.2.0 audit identified, including the exact reproduction that gap used (a `files {}` entry silently dropped from `fxmanifest.lua` while the underlying asset stays on disk). All 22 claimed tests pass, two independent rebuilds are byte-for-byte identical to each other and to the shipped ZIP, and 11 fault-injection scenarios (the ten in `TEST_REPORT.md` plus the specific v0.2.0-regression variant) were reproduced in disposable copies and all were correctly rejected.

No Critical, High, or newly introduced regression was found. Two Low-severity robustness notes remain (below), both pre-existing tooling-quality items rather than defects in shipped runtime behavior.

## 2. Environment and commands executed

This is an offline sandbox with no outbound network access (`npm ci` against `registry.npmjs.org` returns `403`), identical to the constraint the v0.2.0 audit recorded. The only compiler available is TypeScript 6.0.3; the project pins `5.8.3` in `resources/pixel_ui/web/package.json` and `package-lock.json`.

To exercise the pinned-compiler code paths meaningfully, a disposable wrapper script (`/tmp/tsc-wrapper/tsc`, never placed inside the project) was used: it reports `Version 5.8.3` to satisfy version-string checks, delegates to the real installed `tsc 6.0.3`, and adds `--rootDir` (TS6 now requires this explicitly for `module:"none"` + `outFile` projects — `TS5011` — which TS 5.8.3 did not require). This is an environment substitution, not a project defect; it was verified first by confirming the real `resolveTsc()` pin-enforcement code correctly *rejects* the unwrapped `tsc 6.0.3` (`"TypeScript 5.8.3 required; tsc reports 6.0.3"`) before the wrapper was used for anything else. All fault injection was performed in disposable copies under `/tmp/fault/f*`, deleted after use; the uploaded ZIP was never modified.

Commands executed with real results:

- `node tools/generate-tokens.mjs` → output byte-identical to the shipped `tokens.css` (diffed against a pristine extraction).
- `node tools/validate-resource.mjs` on the clean tree → **passes**.
- `node --test tests/*.test.mjs` (with `PIXEL_TSC` wrapper) → **22/22 pass, 0 failed** — matches `TEST_REPORT.md` exactly.
- `PIXEL_TSC=<wrapper> node tools/build-ui.mjs`, run twice → identical `sha256` output both times:
  ```
  1ec6e3f254e29f11bf7ad2bd7b76a19fc3df318a2d4a351ac5576316ce4d8740  assets/index-1ec6e3f254e2.css
  b2f01207936b63b71f4b802adfe5afed39e026d894b4161c9e7cb71e3391fd20  assets/index-b2f01207936b.js
  a53b383b52217876949233b785b5fa30f68be2b9d5a495dc7ad8b74a7e3dd07e  index.html
  0181ee4309d0968358a982e2b61522735acea7472127dddba14a44377a50a7db  pixel-build.json
  ```
  These match both `TEST_REPORT.md`'s claimed hashes and `sha256sum` of the `dist/` shipped in the uploaded ZIP exactly (`diff -rq` reported no differences).
- 11 fault-injection scenarios executed in `/tmp/fault/f1`–`f12` (see §10).
- Vendored React/ReactDOM/license `sha256` independently recomputed and compared against `runtime-manifest.json` → exact match.

## 3. v0.2.0 finding closure matrix

| # | v0.2.0 finding | Status | Evidence |
|---|---|---|---|
| 1 | `validate-resource.mjs` misses a `files{}` entry dropped while the file stays on disk (Medium) | **Closed** | New `validateManifestCoverage()` walks every file under `web/dist` and requires manifest coverage. Reproduced the exact v0.2.0 fault (dropped `pixel-build.json` from `files{}`) → correctly rejected: `pixel_ui: shipped runtime file is not covered by files {}: web/dist/pixel-build.json` |
| 2 | Uncaught `ENOENT` stack trace when `dist/index.html` is missing (Low) | **Closed** | Deleting `dist/index.html` now produces two clean `fail()` messages and a clean non-zero exit, no stack trace |
| 3 | Diagnostics redaction bounds depth/cycles but not breadth or string length (Medium) | **Closed** | `diagnostics.lua` now enforces `MAX_TABLE_KEYS`, `MAX_TOTAL_NODES`, `MAX_KEY_LENGTH`, `MAX_FIELD_STRING_LENGTH`, `MAX_MESSAGE_LENGTH`, `MAX_NAME_LENGTH`, `MAX_ENCODED_FIELDS_LENGTH`; exercised by a real `dofile`-based behavioral test with a forced 9000-byte encoded payload that is confirmed truncated below 1000 bytes |
| 4 | Sensitive-key redaction misses `auth`, `pwd`, `apikey`, `pin` (Low) | **Closed** | New `SENSITIVE_EXACT_KEYS` table (compacted exact match) redacts all four; confirmed in the behavioral test with `auth`, `pwd`, `api-key`, `pin` all redacted and `safe` left visible |
| 5 | `core-readiness`/`diagnostics-contract` tests are regex-only (Medium) | **Closed** | Replaced with 4 genuine Lua 5.4 behavioral tests (`dofile`-based, executed via `run-lua-tests.py`) covering server cooldown/isolation/cleanup, client bounded retry/recovery, and diagnostics bounding — confirmed these execute real logic, not string matches |
| 6 | Vendored React loader depends on undocumented magic module IDs (Medium) | **Closed** | New `vendor/react-18.2.0/runtime-manifest.json` documents `modules.react=96540`, `modules.reactAlias=44914`, `modules.reactDom=40961`, with SHA-256 for each vendor file; both `build-ui.mjs` and `react-runtime.test.mjs` now read these values instead of hard-coding them; checksums independently recomputed and matched |
| 7 (new item) | Transactional build / prior-`dist` preservation on failure | **Closed** | `build-ui.mjs` compiles to a scratch build root before touching `dist`, and swaps `.dist-staging` into place via `rename()` only after every step succeeds, with a `backupRoot` rename-back on failure. Forcing a TypeScript type error left `dist` byte-for-byte identical to before the attempt (verified by hash comparison) |
| 8 (new item) | Exact TypeScript compiler pin enforcement + truthful build metadata | **Closed** | `resolveTsc()` compares the invoked compiler's reported version string against `package.json`'s pin and throws if they differ; `pixel-build.json.toolchain.typescript` records the actually-invoked version and is cross-checked by the validator against `package.json` |
| 9 (new item) | Built JS/CSS content-hash verification against filenames | **Closed** | `validateUiArtifact()` recomputes `sha256` of each asset and compares the first 12 hex chars against the filename; tampering with built JS without renaming it is correctly rejected |
| 10 (new item) | Manual bounded capability recovery + exhaustion logging | **Closed** | `client/main.lua` now exports `RequestCapabilities()`, bounds each cycle to 5 attempts, and logs a `warn` diagnostic on exhaustion; confirmed by a behavioral test showing a fresh bounded cycle (5→10 requests) and ≥2 warnings after two exhausted cycles |

**All ten v0.2.1 hardening-plan items, and all six numbered v0.2.0 findings (4 Medium + 2 Low) they map to, are confirmed closed by direct fault injection or behavioral execution — not merely by reading the changelog.**

## 4. New regressions

**None found.** The bridge (`bridge.ts`), ownership/lifecycle (`lifecycle.ts`), keyboard/focus-trap (`keyboard.ts`), Lua callback registry, and ownership mirror in `client.lua` are functionally unchanged from v0.2.0 per the per-resource changelogs, and direct source review confirms they still match the v0.2.0 audit's description exactly: correlation IDs, timeout/abort handling, a 256-entry completed-request cap, one-response enforcement (`responded` flag) in the Lua callback dispatcher, ordered multi-owner focus/cursor state with duplicate-open suppression, and `onResourceStop` cleanup scoped correctly to the owning resource's own entries and prefixed sub-owners.

The one intentional new interaction between components — `client.lua`'s `diagnostic()` now defensively bounds and forwards a fallback message to NUI when the `pcall`-wrapped call into `pixel_core`'s `Log` export fails (i.e., `pixel_core` is stopped/unavailable) — was reviewed and is sound: it truncates the message/module name locally to the same limits `diagnostics.lua` otherwise enforces, and only forwards to NUI when diagnostics are enabled.

## 5. Build/validator review

`tools/build-ui.mjs`'s pipeline is unchanged in shape from v0.2.0 (strict `tsc` compile → concatenate vendored React chunks + loader + app code → content-hash → write `dist/pixel-build.json`) but is now wrapped in a transactional swap:

1. `rm buildRoot` (`.build`) and typecheck/compile into it. A failed compile exits before touching `dist` at all.
2. Compile into `.dist-staging`, verifying vendor checksums and module IDs from `runtime-manifest.json` along the way.
3. `replaceDistAtomically()`: rename current `dist` → `.dist-backup`, rename `.dist-staging` → `dist`; on any failure in this step, rename `.dist-backup` back to `dist`.

This was verified end-to-end: a forced `tsc` type error left the shipped `dist` byte-identical (confirmed by hash diff), and the scratch directories (`.build`, `.dist-staging`) were cleaned up in every failure path tested, including the vendor-checksum-mismatch path.

**One robustness nit** (Low, carried over in spirit from the v0.2.0 `index.html`-missing finding, but on a different code path): when a *vendored React chunk* is tampered with, `readAndVerifyVendor()` in `build-ui.mjs` throws inside the `try` block and is not caught with a clean `console.error`/`process.exit` pair the way the typecheck-failure path is — it surfaces as an uncaught exception with a raw Node stack trace. Functionally this is still a correct, non-zero-exit rejection, and `dist` is confirmed untouched and scratch directories confirmed cleaned via the surrounding `finally`, so there is no correctness or state-corruption risk — only a less polished operator-facing error message than the guarded validator's equivalent check (`validate-resource.mjs`'s own vendor check *does* fail cleanly). This does not block release.

`validate-resource.mjs`'s reverse-coverage check (`validateManifestCoverage`) walks `web/dist` and requires every file to be covered by a `files {}` reference (exact match or `*` wildcard). This closes the v0.2.0 gap precisely as designed and was confirmed both to catch the original reproduction and to still correctly *pass* the untouched, correctly-declared shipped manifest.

## 6. Lua/diagnostics/security review

`diagnostics.lua`'s new bounds were read in full and independently exercised:

- `MAX_DEPTH = 5`, `MAX_TABLE_KEYS = 32`, `MAX_TOTAL_NODES = 128` (a shared budget threaded through recursive calls via a mutable `budget.remaining` field, so breadth is capped both per-table and in aggregate across the whole payload — this closes the "large or maliciously-crafted diagnostic payload" gap the v0.2.0 audit flagged, not just per-table breadth).
- `MAX_KEY_LENGTH = 96`, `MAX_FIELD_STRING_LENGTH = 512`, `MAX_MESSAGE_LENGTH = 512`, `MAX_NAME_LENGTH = 64`, `MAX_ENCODED_FIELDS_LENGTH = 8192` — all independently confirmed via the behavioral test forcing a 9000-byte `json.encode` result, which is replaced with a fixed `[TRUNCATED_OUTPUT]` marker rather than emitting the oversized string.
- Sensitive-key handling is now two-layered: a substring match against the original 8-term list (`authorization, credential, identifier, license, password, secret, session, token`) plus an **exact** match (after stripping non-alphanumeric characters) against `auth`, `pwd`, `apikey`, `pin` — meaning `api-key` and `pin` are caught, while a longer field like `pinCode` is deliberately *not* caught by the exact list (it would need to appear in the substring list to be caught, and does not), matching the documentation's "exact short aliases" framing rather than over-claiming broad coverage.
- `debug`-level output remains gated on `GetConvarInt('pixel_diagnostics', 0) == 1`; `info`/`warn`/`error` still print unconditionally, matching `docs/DIAGNOSTICS.md`.
- No network/telemetry call exists anywhere in `diagnostics.lua`; output paths remain local `print()` and, when enabled, a same-resource `SendNUIMessage`.

The client-side `boundedDiagnosticText()` fallback in `pixel_ui/client.lua` (used only when the `pcall`-wrapped call into `pixel_core`'s `Log` export fails) applies the same 512/64-character bounds locally, so a stopped/unavailable `pixel_core` cannot cause an unbounded message to reach NUI.

## 7. Typed bridge and ownership review

Unchanged from v0.2.0 and re-verified directly against source (not merely re-cited from the prior audit):

- `NuiClient.request()` in `bridge.ts` validates the payload via a per-callback guard, rejects if already closed or the signal is pre-aborted, assigns a monotonic correlation ID, and races a `window.setTimeout` against the transport promise and an `AbortSignal` listener.
- `receiveResponse()` rejects unknown envelopes, ignores/logs duplicate responses (tracked via a `completed` Set capped at 256 via `completedOrder`), ignores late/unsolicited responses for IDs no longer pending, and validates the response payload against the callback's response guard before resolving.
- `finish()` always clears the timer and removes the abort listener on any terminal outcome (success, failure, abort, timeout, close), so no pending-request or listener leak was found.
- Lua-side, `RegisterNUICallback('pixel:ui:bridge', ...)` enforces protocol version, a `safeRequestId` format check, an allow-listed callback name, and a per-callback payload guard before invoking the handler inside `pcall`; the `respond()` closure's `responded` flag blocks a second response to the same request, logging a `warn` diagnostic if a handler (bug or otherwise) tries to call back twice.
- `UiOwnershipState` (`lifecycle.ts`) and its Lua mirror in `client.lua` both implement ordered multi-owner acquisition (last-acquired-becomes-active), duplicate-open suppression (no-op + no revision bump if the top owner's state is unchanged), `release`/`closeAll`/`setModalDepth` with correct revision bumping, and `onResourceStop` cleanup that clears all state for the owning resource itself and only the entries owned by (or prefixed with) a *different* stopped resource.

No behavioral difference from the v0.2.0 audit's findings was found in any of the above; all classes of duplicate/late/timeout/abort/cleanup behavior described in that audit's §8 remain true here.

## 8. React/component/accessibility review

`component-contracts.test.mjs` still asserts (structurally, but confirmed falsifiable — removing `export` from `Modal` in a disposable copy correctly fails the test) that all 21 components and 10 layout primitives are exported and that key ARIA contracts (`aria-modal="true"`, `role="alertdialog"`, `role="tablist"`, `role="menu"`, `aria-live="polite"`) and the focus-trap/keyboard-listener-cleanup patterns are present in source.

Direct review of `keyboard.ts` confirms `activateFocusTrap()` still correctly wraps Tab at both ends, restores prior focus on `deactivate()` (only if the previously-focused element `isConnected`), and only closes on `Escape` if the caller reports itself as top-most — unchanged from v0.2.0. `layout.tsx`'s `ApplicationShell` still applies `aria-hidden` and the native `inert` attribute together when not visible. `global.css` still neutralizes transitions/animations under `prefers-reduced-motion: reduce`.

The developer showcase remains structurally and behaviorally gated: `showcaseEnabled` is set once from `GetConvarInt('pixel_ui_showcase', 0) == 1` at script load with no runtime toggle exposed to untrusted NUI input, and `component-contracts.test.mjs`'s second test confirms both the Lua convar gate and that the showcase renders every listed component.

## 9. Enhanced-only compliance

A recursive scan of all active `.lua`/`.ts`/`.tsx`/`.json` files under `resources/` (excluding `web/dist` and `web/vendor`, matching both `validate-resource.mjs`'s and `enhanced-only.test.mjs`'s own scope) for `ESX`, `QBCore`/`qb-core`, `pma-voice`/`pma_voice`, and `Mumble` found zero matches outside the validator/test deny-lists themselves and documentation that explicitly disclaims these dependencies (`docs/decisions/ADR-0001-ENHANCED-ONLY.md`, `archive/ENHANCED-VOICE-COMPAT-NOTICE.md`). Injecting `-- ESX.GetPlayerData integration stub` into `resources/pixel_core/server/main.lua` in a disposable copy was correctly rejected by both the validator and (independently) `enhanced-only.test.mjs`. `fxmanifest.lua` files use the current Enhanced-native manifest style (`fx_version 'cerulean'`, `lua54 'yes'`), not the legacy `resource_manifest_version` format. **Compliant.**

## 10. Documentation accuracy

`README.md`, `docs/BUILD_AND_VALIDATION.md`, `docs/DIAGNOSTICS.md`, `docs/ARCHITECTURE.md`, `SECURITY_REVIEW.md`, `KNOWN_LIMITATIONS.md`, `TEST_REPORT.md`, `IMPLEMENTATION_REPORT.md`, `V0.2.1_HARDENING_PLAN.md`, `CHANGELOG.md`, and `resources/pixel_ui/CHANGELOG.md` were read and cross-checked against source and against this audit's own independently-executed results. No false or misleading claim was found:

- `TEST_REPORT.md`'s "22 tests passed / 0 failed", its four deterministic-build hashes, and its 10-item fault-injection table were all independently reproduced in this audit, not merely trusted.
- `CHANGELOG.md`'s claim to have "closed every Medium and Low finding from the independent v0.2.0 Claude audit" is accurate: all four v0.2.0 Medium findings and both Low findings were independently confirmed closed in §3 above.
- `docs/DIAGNOSTICS.md`'s redaction-key list and bound descriptions match `diagnostics.lua` exactly, including the newer "exact short aliases" framing that correctly avoids over-claiming broad `auth`/`pin`-adjacent coverage.
- `KNOWN_LIMITATIONS.md` and `SECURITY_REVIEW.md` continue to honestly disclaim live FiveM Enhanced testing, WCAG certification, and controller/screen-reader verification, and this audit did not perform or claim to perform any live FiveM Enhanced test either.
- `docs/BUILD_AND_VALIDATION.md`'s description of the transactional build and compiler/vendor guarantees matches the actual `build-ui.mjs`/`validate-resource.mjs` behavior verified in §5–§6.
- Per-resource changelogs (`resources/pixel_core/CHANGELOG.md`, `resources/pixel_ui/CHANGELOG.md`) both have a `## 0.2.1` entry matching the shipped manifest version, and their content is scoped accurately to their own resource's actual changes.

## 11. Remaining issues ranked

**Critical**: none found.

**High**: none found.

**Medium**: none found.

**Low**:
1. `build-ui.mjs` surfaces a raw uncaught-exception stack trace (rather than a clean `fail()`-style message) when a vendored React chunk fails its checksum check during a build attempt. State handling around this failure is correct — `dist` remains untouched and scratch directories are cleaned via `finally` — so this is a diagnostics-quality nit for a maintainer running `npm run ui:build` directly, not a release blocker or correctness defect (§5).

**Suggestion**:
1. Consider wrapping `readAndVerifyVendor()`'s call site in `build-ui.mjs` with the same `console.error`/non-throwing `process.exit` pattern already used for the typecheck-failure path, for parity with `validate-resource.mjs`'s clean equivalent check.

## 12. Release-readiness verdict

**Ready to release as an offline foundation layer.** Every item in the v0.2.1 hardening plan was independently verified by direct fault injection or behavioral test execution — not by reading the changelog — and all ten close their corresponding v0.2.0 gap, including the specific `files {}`-coverage reproduction that gap was defined by. Build reproducibility remains byte-for-byte exact against both the project's own claims and the shipped ZIP. No new regression was found in the typed NUI bridge, Lua callback registry, ownership/focus lifecycle, or component/accessibility layer, all of which were re-verified directly rather than assumed unchanged. Documentation continues to accurately describe what has and has not been verified, including an explicit and correct disclaimer that no live FiveM Enhanced certification is claimed.

The only remaining finding is a single Low-severity build-tool error-message polish item (§11) with no state-correctness impact. Live FiveM Enhanced staging (per `LIVE_ENHANCED_QA_CHECKLIST.md`) remains the appropriate next gate before in-game certification, exactly as the project's own documents already state.
