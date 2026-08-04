# Pixel Network Foundation v0.2.0 — Claude Final Audit

## 1. Executive verdict

**Pixel Network Foundation v0.2.0 is release-ready as an offline foundation package**, with the caveats below. The scope-lock checks pass (correct project root, `package.json` version `0.2.0`, `pixel_core`/`pixel_ui` present, not Pixel Admin v5.x, no active ESX/QBCore/pma-voice/Mumble dependencies). Independent rebuilds of the shipped UI artifact are byte-for-byte identical to what is in the ZIP, and all 20 claimed tests pass when the environment's missing pinned compiler is substituted for. The typed NUI bridge, Lua callback registry, and ownership/focus lifecycle are well-built and internally consistent between the TypeScript and Lua implementations.

The release is **not without gaps**: the resource validator has an asymmetric blind spot that would let a maintainer silently drop a shipped UI asset from the FiveM manifest without detection; two of the twenty automated tests are regex-only source checks rather than behavioral tests; the vendored React runtime loader depends on undocumented, fragile numeric module IDs inherited from an unrelated JupyterLab build; and no live FiveM Enhanced testing has been performed by anyone (a limitation the project's own documents already disclose honestly). None of these rise to a release blocker for an offline foundation layer, but they should be fixed before other resources build on top of this package.

## 2. Environment and commands actually executed

This is an offline sandbox with **no outbound network access** (`npm ci` fails with `403`/host-not-allowlisted errors reaching `registry.npmjs.org`). This is an **environment failure, not a project failure** — the lockfile and pin are valid; there is simply nothing in this sandbox that can fetch the pinned `typescript@5.8.3` package.

To perform a meaningful audit despite this, a globally available `typescript@6.0.3` was substituted as the compiler, invoked either directly or through CLI flags (`--ignoreDeprecations 6.0 --rootDir <path>`) to work around compiler-version-only deprecation warnings that TypeScript 5.8.3 does not emit (`module="none"` + `outFile` are valid, non-deprecated options in 5.8.3; TS 6.0.3 warns about them). This substitution was done **only in a disposable working copy**, never in the uploaded ZIP; a pristine, untouched extraction of the uploaded ZIP was kept side-by-side for diffing. All fault-injection tests were run against separate temporary copies (`/tmp/f*`), which were deleted after use. No file inside the uploaded archive was modified.

Commands actually executed, with real results:

- `npm ci` inside `resources/pixel_ui/web` → **fails (E403 / host not allow-listed)**. Confirmed environment-only failure.
- `node tools/generate-tokens.mjs` → succeeds, output is byte-identical to the shipped `resources/pixel_ui/web/src/styles/tokens.css` (diffed against the pristine ZIP extraction).
- `node --test tests/*.test.mjs` → **9/10 files pass immediately**; `bridge-lifecycle.test.mjs` throws an uncaught `AssertionError` at import time because it hard-codes a dependency on `resources/pixel_ui/web/node_modules/.bin/tsc`, which does not exist without `npm ci`.
- Typechecked `resources/pixel_ui/web/tsconfig.json` and `tsconfig.core-tests.json` (via scratch copies with CLI overrides, never editing the real files) with TypeScript 6.0.3 → **0 errors**, full strict mode, across all 13 source files listed in `tsconfig.json`.
- Re-ran the actual assertions from `bridge-lifecycle.test.mjs` against a real compile of `src/core/{schema,lifecycle,keyboard,bridge}.ts` (via a scratch harness that only swapped the tsc-resolution step; all 11 embedded test bodies were copied verbatim, unmodified) → **11/11 pass**. Combined with the other 9 files' internal `test()` counts (2+1+1+1+1+1+1+1 = 9), this totals the **20 tests** `TEST_REPORT.md` claims.
- `PIXEL_TSC=<wrapper> node tools/build-ui.mjs`, run twice → produced `assets/index-c71d37487562.js` and `assets/index-1ec6e3f254e2.css` **both times**, SHA-256-identical between runs, and **identical to the hashes already recorded in `TEST_REPORT.md`** and to the `dist/` shipped in the uploaded ZIP (`sha256sum` comparison against the pristine extraction — see §7).
- `python3 tools/validate-lua.py <all *.lua files>` (using the system's real `liblua5.4.so.0`, confirmed present via `ldconfig -p`) → **all Lua files parse cleanly** under real Lua 5.4.
- `node tools/validate-resource.mjs` on the clean tree → **passes** ("Pixel resource validation passed.").
- 11 fault-injection scenarios in disposable temp copies (§12) → **10 correctly rejected, 1 confirmed gap** (§4, §12).

## 3. v0.2.0 objective verification matrix

| # | Objective | Status | Evidence |
|---|---|---|---|
| 1 | Protocol-versioned, typed NUI bridge | **Verified** | `src/core/schema.ts` (`version: 1` on every envelope), `src/core/bridge.ts` `PixelCallbackMap`/`PixelEventMap` |
| 2 | Correlation IDs, timeouts, abort, response validation, duplicate protection, cleanup, browser mocks | **Verified** | `bridge.ts:244-351` (`nextRequestId`, timers, `AbortSignal`, `completed`/`completedOrder` cap at 256, `installBrowserMocks`) |
| 3 | Centralized Lua callback registry, payload guards, one-response enforcement | **Verified** | `pixel_ui/client.lua:186-307` (`registerCallback`, `respond()`'s `responded` flag) |
| 4 | Ordered multi-consumer ownership, focus/cursor restoration, duplicate-open prevention | **Verified** | `src/core/lifecycle.ts` (`UiOwnershipState`) and mirrored Lua state (`client.lua:7-150`) |
| 5 | Reusable controls, overlays, content/state, layout primitives | **Verified** | `controls.tsx`, `overlays.tsx`, `data.tsx`, `layout.tsx` — all components in `component-contracts.test.mjs`'s required list are present |
| 6 | Keyboard nav, focus trap/restoration, top-most Escape, semantics, reduced motion, hidden-shell inert | **Verified** | `keyboard.ts`, `layout.tsx:202-217` (`ApplicationShell` `aria-hidden`/`inert`), `global.css:204-210` (reduced motion) |
| 7 | Diagnostics: levels, context, dev gating, structured fields, sensitive-key redaction | **Mostly verified, gaps noted** | `diagnostics.lua` — see §4/§11 for breadth-bound and key-coverage gaps |
| 8 | Production-disabled developer showcase | **Verified** | `client.lua:12,324-330` (convar-gated `RegisterCommand`), `App.tsx:109-110,147-148` (`showcaseVisible` gated on `state.showcaseEnabled`) |
| 9 | Deterministic, source-derived production assets, local vendored React 18.2.0 | **Verified, with a fragility caveat** | Reproducible byte-identical rebuild (§7); loader depends on undocumented magic module IDs (§7, §4) |
| 10 | Expanded validation, docs, security review, accessibility review | **Verified** | `tools/validate-resource.mjs`, `docs/*.md`, `SECURITY_REVIEW.md`, `ACCESSIBILITY_REVIEW.md` all present and substantively accurate against source |

## 4. Confirmed bugs

**None found that affect runtime correctness of the shipped code.** The two issues below are tooling/process bugs, not application bugs:

1. **`tools/validate-resource.mjs` does not detect an asset silently dropped from `files {}` while still on disk.** Removing `'web/dist/pixel-build.json'` from `resources/pixel_ui/fxmanifest.lua`'s `files {}` block (lines 14-18) while leaving the file itself in place passes validation with no warning (`Pixel resource validation passed.`, exit 0). Root cause: `extractManifestReferences`/`manifestReferenceExists` (`tools/validate-resource.mjs:41-72`) only check that everything the manifest *references* exists on disk — there is no converse check that everything present under `dist/` is *referenced* in the manifest. A maintainer edit that trims one line from `files {}` would ship a broken `pixel_ui` (missing build metadata or missing assets) to FiveM clients with the validator reporting success. See §12, fault 2 for the reproduction.
2. **`validate-resource.mjs` crashes with an unhandled promise rejection instead of a clean failure message when `dist/index.html` is missing.** Deleting `resources/pixel_ui/web/dist/index.html` is still caught overall (a `fail()` message is printed for the missing manifest reference, and the process still exits `1`), but `validateUiArtifact()` (`tools/validate-resource.mjs:180`) then throws an uncaught `ENOENT` from a second, un-guarded `readFile` call, producing a raw Node.js stack trace rather than a clean validator message. Functionally the fault is still rejected (non-zero exit), so this is a robustness/quality issue, not a correctness failure.

## 5. Confirmed gaps

1. **Test-suite weak spots**: `tests/core-readiness.test.mjs` and `tests/diagnostics-contract.test.mjs` are **regex-only source-text matchers**, not behavioral tests. They assert that specific substrings (`lastReadyAt ~= nil and now - lastReadyAt < READY_COOLDOWN_MS`, `depth >= 5`, `seen[value]`, etc.) exist in the Lua source, but never execute the retry/cooldown logic or the redaction function against real input. A behaviorally broken implementation that happened to retain these substrings (e.g., in a dead code path, or with an off-by-one in the actual comparison) would still pass. All other automated tests either execute real logic (`bridge-lifecycle`, `tokens`, `ui-artifact`, `react-runtime`) or perform genuinely falsifiable structural checks (`enhanced-only`, `version-consistency`); `component-contracts.test.mjs` is also structural/regex-only (see §12, fault 11) but is at least checking for the presence of exported symbols and JSX usage across independently-sourced files, which is a meaningfully falsifiable claim (confirmed via fault injection — removing an export does fail it).
2. **Diagnostics redaction bounds depth and cycles but not breadth or length.** `redact()` in `pixel_core/shared/diagnostics.lua:32-50` caps recursion at `depth >= 5` and tracks `seen[value]` for cycles, but does not cap the number of keys iterated in a single table (`for childKey, childValue in pairs(value)`) or the length of string values (including the top-level `message` argument, used raw in `client.lua:85-106` and `diagnostics.lua:82`). A caller passing a field with tens of thousands of entries, or an extremely long string, would still produce unbounded log output. This does not contradict `SECURITY_REVIEW.md`'s claim that "nested/cyclic fields are bounded" (which is true), but it falls short of the audit prompt's broader requirement that fields "cannot cause... massive output."
3. **Sensitive-key matching is narrower than some common real-world key names.** `SENSITIVE_KEY_PARTS` in `diagnostics.lua:11-20` covers `authorization, credential, identifier, license, password, secret, session, token`, matched via substring (`string.find(normalized, part, 1, true)`), which is appropriately broad for those eight roots (e.g., `apiToken`, `sessionId` are caught) but would **not** catch a field literally named `auth`, `pwd`, `apikey` (no separator before "key"), or `pin`. This is a reasonable, documented baseline (`docs/DIAGNOSTICS.md:16` lists exactly these eight terms, so the implementation matches its own documentation), but it is narrower than "sensitive data redaction" might imply without reading the docs closely.
4. **Vendored React runtime loader depends on undocumented, fragile numeric module IDs.** `tools/build-ui.mjs:59-81` reads `globalObject.webpackChunk_jupyterlab_application_top` and resolves React/ReactDOM via hard-coded module IDs `96540` and `40961`, with an unexplained special case remapping requested module `44914` to `96540`. `resources/pixel_ui/web/vendor/react-18.2.0/README.md` and `THIRD_PARTY_NOTICES.md` both honestly disclose that these are "copied from the JupyterLab production distribution available in the build environment," not an official React UMD/CJS/ESM release — so this is not deceptive, but it **is** exactly the kind of "fragile module IDs or unrelated upstream packaging assumptions" the audit brief asked to check for (§C). Nothing in the codebase documents *why* `44914` maps to `96540`, and if the vendor files were ever re-copied from a differently-built JupyterLab bundle, these IDs could silently drift and the loader would throw `Missing vendored React module <id>` at runtime with no compile-time warning.

## 6. Unverified live-runtime risks

These are honestly disclosed in the project's own `KNOWN_LIMITATIONS.md`, `SECURITY_REVIEW.md`, and `ACCESSIBILITY_REVIEW.md`, and this audit did not attempt to contradict or independently verify them (no live FiveM Enhanced server/client was run):

- Live FiveM NUI callback transport timing, resource-restart timing, and native focus/cursor behavior.
- Escape-key interaction with the FiveM pause menu.
- Controller navigation and screen-reader behavior inside the FiveM embedded browser.
- Independent WCAG contrast certification (a spot-check of token contrast ratios in this audit, §10, is not a substitute).
- Any behavior of `RegisterNUICallback`/`SendNUIMessage` under real Enhanced network conditions (packet loss, out-of-order delivery) — the TypeScript bridge's duplicate/late/unsolicited-response handling was verified against a simulated transport (§8), not a real one.

## 7. Source-to-artifact/build review

**`web/dist` production process** (`tools/build-ui.mjs`): strict-mode `tsc` compile of `tsconfig.json` → single `.build/pixel-app.js` (via `outFile`) → concatenated with the two vendored React/ReactDOM production chunks and a small module-loader shim → content-hashed and written to `dist/assets/index-<hash>.{js,css}` → `dist/index.html` generated from `index.html` template by substituting `__PIXEL_JS_ASSET__`/`__PIXEL_CSS_ASSET__` → `dist/pixel-build.json` written with a `sourceHash` computed by `tools/write-ui-build-metadata.mjs`. The `.build/` scratch directory is deleted at the end of every run (`build-ui.mjs:126`), and both `dist/` and `.build/` are wiped at the start (`build-ui.mjs:40-41`), so stale assets from a previous build cannot leak into a new one.

**Reproducibility — independently confirmed, not just re-stated from the project's own report.** Two consecutive rebuilds (with the environment's substitute compiler, §2) produced byte-identical output:

```
1ec6e3f254e29f11bf7ad2bd7b76a19fc3df318a2d4a351ac5576316ce4d8740  assets/index-1ec6e3f254e2.css
c71d37487562c6f6e27a0ae27190c64914c0dd382fdfa411d231e3aef9e87cd1  assets/index-c71d37487562.js
dda8eabe867d72c4afc4a5c686244fdb3a485541f208f4b34504bedd1e329068  index.html
4ca96387cb46b0fc9d36a5c864853955bc55387f21dff5270e7147b0caf59caf  pixel-build.json
```

These hashes match `TEST_REPORT.md`'s claimed build hashes exactly, **and** match `sha256sum` of the `dist/` files actually present in the uploaded ZIP exactly. This is strong evidence the shipped `dist` genuinely was built from the shipped source and has not silently drifted.

**No CDN or network dependency at runtime**: the only `fetch()` call in the entire TypeScript source is `bridge.ts:366`, `fetch(\`https://${resourceName}/pixel:ui:bridge\`, ...)`, which is the standard same-resource FiveM NUI callback convention (intercepted by the client, never a real external request), guarded by `typeof window.GetParentResourceName === 'function'` mock-bypass logic above it. `grep` across all `.ts`/`.tsx`/`index.html` found no other `http://`/`https://` literal.

**Vendored React/ReactDOM 18.2.0**: version and MIT license/notice are present and correctly cross-referenced (`vendor/react-18.2.0/LICENSE.txt`, `THIRD_PARTY_NOTICES.md`), and `tests/react-runtime.test.mjs` genuinely executes the vendored chunks in a `vm` sandbox and asserts `React.version === '18.2.0'` — this is a real behavioral test, not a string match. See §4/§5 for the fragile-module-ID concern with the loader itself.

## 8. Typed bridge/security review

`src/core/schema.ts` provides a small, complete set of runtime type guards (`isUnknownRecord`, `isNonEmptyString`, `isFiniteNumber`, `isArrayOf`, etc.) used to validate every envelope shape at the trust boundary — nothing is assumed well-typed just because TypeScript's compile-time types say so.

- **Event envelope validation** (`bridge.ts:156-178`, `NuiEventBus.receive`): rejects malformed envelopes (`isNuiEventEnvelope`), silently ignores unknown event names (`debug`-level diagnostic only, does not throw), and rejects known-event-but-invalid-payload with a `warn` diagnostic. Verified behaviorally (fault-reproduced assertions, §2).
- **Callback request/response guards** (`bridge.ts:80-126`): every one of the 7 registered callbacks (`ui.ready`, `ui.close`, `ui.acquire`, `ui.release`, `ui.closeAll`, `ui.modalDepth`, `diagnostics.example`) has both a request guard and a response guard, checked on the client before sending (`BAD_REQUEST`) and after receiving (`INVALID_RESPONSE`).
- **Request ID generation/validation**: `nextRequestId()` (`bridge.ts:327-330`) uses a monotonically increasing per-client sequence combined with `Date.now()`, formatted `px:<base36 time>:<base36 seq>`; `schema.ts:98-99`'s `isRequestId` guard enforces `^[A-Za-z0-9:_-]{8,96}$`, matched on the Lua side by `safeRequestId` (`client.lua:24-29`).
- **Timeout/abort/transport failure**: `bridge.ts:246-277` sets a `window.setTimeout` and an `AbortSignal` listener *before* invoking the transport, and the pending-request bookkeeping (`this.pending.set(...)`) happens synchronously before the transport promise is even created — this specifically avoids the race the audit brief warns about (a synchronous/very-fast mock transport resolving before bookkeeping exists). Verified by re-running the actual test assertions for `TIMEOUT`, `ABORTED`, and `TRANSPORT` codes (§2).
- **Duplicate/late/unknown/unsolicited responses**: `receiveResponse()` (`bridge.ts:280-308`) checks `this.completed.has(...)` before `this.pending.get(...)`, so a duplicate response is rejected with a `warn` diagnostic and returns `false` without touching the original resolved promise; a response for a requestId with no pending entry is ignored with a `debug` diagnostic (not an error, since it can legitimately happen after `close()`).
- **Pending-request cleanup**: `close()`/`cancelPending()` (`bridge.ts:310-321`) reject every outstanding request with `code: 'CLOSED'`; `App.tsx:65-71`'s unmount cleanup calls `bridge.close(...)`.
- **Memory bounds**: `completedOrder` (`bridge.ts:206,346-350`) is capped at 256 entries with FIFO eviction, preventing unbounded growth of the duplicate-detection set over a long session.
- **Browser mock isolation**: `installBrowserMocks` (`bridge.ts:392-419`) is gated on `typeof window.GetParentResourceName === 'function'` being false — inside real FiveM NUI this is always true, so mocks never register in production.

**Lua callback registry / server-boundary review** (`pixel_ui/client.lua:186-307`):

- Registry is allow-listed (`callbackRegistry[envelope.callback]`, `NOT_FOUND` if absent) — the client cannot invoke arbitrary Lua functions by name.
- Every registration has both a `guard` and a `handler`; the guard runs before the handler and rejects with `BAD_REQUEST` on failure.
- **One-response enforcement**: `respond()` (`client.lua:263-272`) uses a closure-scoped `responded` boolean; a second call is dropped and logged as `warn`, not sent to the NUI `cb`. This directly satisfies "handlers cannot reply twice."
- Handler failures are wrapped in `pcall` (`client.lua:297-305`) and converted to a generic `INTERNAL` failure with no internal error detail leaked to the browser, matching `SECURITY_REVIEW.md`'s claim.
- **No browser payload is treated as server authority**: every registered callback in `pixel_ui` only mutates local NUI presentation state (owner list, focus, cursor, modal depth) — none of them touch money, items, permissions, or any server-side state. This matches the explicit architecture principle in `docs/ARCHITECTURE.md:6` and is true of the actual code, not just the docs.
- **Defensive-copy exports**: `exports('GetState', snapshot)` and both `GetCapabilities` exports (`pixel_core/client/main.lua:27-33`, `pixel_core/server/main.lua:55-61`) build fresh tables rather than returning live references.
- **Capability readiness/cooldown/retries** (`pixel_core/client/main.lua:9-25`, `pixel_core/server/main.lua:1-49`): client retries up to 5 times, 2.5s each, only after `NetworkIsSessionStarted()`; server enforces a 2000ms per-player cooldown (`READY_COOLDOWN_MS`) and clears cooldown state on `playerDropped` — bounded and leak-free.
- **Event spoofing / malformed input**: the central `pixel:ui:bridge` callback validates `type(envelope) == 'table'`, `envelope.version == BRIDGE_VERSION`, `safeRequestId`, and `type(envelope.callback) == 'string'` before any dispatch (`client.lua:274-285`). `safeOwner`/`safeRequestId` (`client.lua:17-29`) constrain both length and character set (`^[%w:_%-]+$`), which also rejects NaN/oversized numeric edge cases indirectly by requiring string types for identifiers. `ui.modalDepth`'s guard (`client.lua:234-239`) explicitly bounds `payload.depth` to `[0, MAX_MODAL_DEPTH=32]` and requires it be an integer, guarding against non-finite/absurd values there.
- **Resource-stop cleanup**: `onResourceStop` (`client.lua:336-357`) clears all state if `pixel_ui` itself stops, and otherwise removes only owners belonging to the stopped resource (exact match or `resourceName:` prefix), matching `docs/RESOURCE_INTEGRATION.md:34`'s documented behavior.
- **Diagnostics redaction**: see §5 items 2–3 for the two confirmed gaps (breadth/length bounding, key-name coverage). Case-insensitivity and cycle-safety are confirmed correct by direct source reading (`string.lower`, `seen[value]` table).

## 9. Ownership/NUI lifecycle review

The TypeScript `UiOwnershipState` (`lifecycle.ts`) and the Lua ownership implementation (`client.lua:7-150`) are structurally parallel and were compared line-by-line; both:

- Start hidden: React's initial non-browser-mode state is `visible: false` (`App.tsx:24-34`), and Lua calls `SetNuiFocus(false, false)` at load (`client.lua:15`). `ApplicationShell` renders with `aria-hidden={!visible}` and `inert={!visible ? '' : undefined}` (`layout.tsx:202-217`), so the shell is genuinely non-interactive before the first `ui.ready` handshake resolves.
- Require explicit `acquire`/`ui.acquire` to become visible — nothing opens the UI implicitly.
- Treat a duplicate acquire (same owner, same top position, same focus/cursor/panel) as a no-op returning the same `revision` (`lifecycle.ts:30-36`, `client.lua:112-121`) — confirmed by the existing `ownership state prevents duplicate opens...` test, which passes.
- Support multiple owners with deterministic top-of-stack ordering (`this.order`/`ownerOrder` arrays, both re-pushing to the end on (re)acquire, §Lua `client.lua:128-129`).
- Restore the preceding owner's focus/cursor on releasing the top owner: `release()` in both implementations simply removes the owner and recomputes `activeOwner` from the remaining stack's tail — verified by the passing `ownership state ... restores prior focus owner` test.
- Do not disturb the active owner when a non-top owner is released or its resource stops: `removeFromOrder`/`order.filter` only ever remove the named owner; nothing in either implementation touches focus/cursor unless the *result* changes the top of the stack.
- Clean up on `onResourceStop` for any resource other than `pixel_ui` itself, matching or prefix-matching `resourceName:` (`client.lua:344-352`).
- Handle close button, close-all, and ready-resync consistently: the close (`IconButton` calling `ui.close`/`ui.release`), `CloseAll` export/`ui.closeAll` callback, and `ui.ready` resync all route through the same `snapshot()`/`applyFocusAndBroadcast()` functions, so there is a single source of truth for state broadcast to React.
- Handle `pixel_ui` stopping itself by clearing all state and forcing focus off (`client.lua:337-343`).
- Track modal depth via `ui.modalDepth`, driven from React's `OverlayProvider`'s stack length (`overlays.tsx:26-28`, `App.tsx:103-107`), and reset it to 0 whenever the owner stack becomes empty (`lifecycle.ts:50`, `client.lua:144-146`) or on `closeAll` — preventing a stale nonzero modal depth from persisting after everything closes.
- No invisible-overlay/stale-focus-lock scenario was found in source review: every path that removes the last owner also resets `modalDepth` to 0 and calls `SetNuiFocus(false, false)`/re-broadcasts `visible: false`.
- **Escape behavior**: two independent, non-conflicting layers — `keyboard.ts`'s `activateFocusTrap` handles Escape *within* an open overlay only when `isTopMost()` is true (delegated to `OverlayProvider`'s stack, `overlays.tsx:30-39`); `App.tsx:74-91` handles Escape at the application level only when `state.modalDepth === 0` (i.e., no overlay is open), releasing the active UI owner. This avoids double-handling. **Pause-menu interaction with Escape is explicitly unverified** (no live FiveM Enhanced test was performed), matching the project's own disclosure in `KNOWN_LIMITATIONS.md:5`.

## 10. React/component/accessibility review

Strict TypeScript typecheck of the full `tsconfig.json` file set (13 files, `App.tsx`, `Showcase.tsx`, `main.tsx`, all four `components/*.tsx`, all four `core/*.ts`) passed with 0 errors under the environment's substitute TypeScript 6.0.3 (§2 caveat).

All components required by `tests/component-contracts.test.mjs` and `docs/UI_COMPONENTS.md` are present and exported: `Button, IconButton, Input, Textarea, Select, Checkbox, Toggle, Slider, Badge, Tooltip, Card, Tabs, Modal, ConfirmDialog, Dialog, Drawer, DataTable, ContextMenu, ToastProvider, LoadingState, EmptyState, ErrorState, Stack, Row, Grid, Divider, ScrollArea, ApplicationShell, Header, Sidebar, ContentPanel, OverlayLayer`. `Showcase.tsx` renders every one of them and is gated by `showcaseEnabled`, both structurally (JSX usage confirmed) and behaviorally (fault-injection removing a component's `export` correctly broke `component-contracts.test.mjs`, §12 fault 11).

- **Controlled/uncontrolled inputs**: `Input`/`Textarea`/`Select` (`controls.tsx:75-163`) spread native props through, so they work either controlled (`value`+`onChange`) or uncontrolled, standard React behavior; no custom state shadowing was found that would fight a consumer's own state.
- **Native button types**: `Button` defaults `type={props.type ?? 'button'}` (`controls.tsx:25`), preventing accidental form submission — correct since there are no `<form>` elements anywhere in the source (`grep` for `<form` returned nothing).
- **Labels/IDs/ARIA**: every form control (`Input`, `Textarea`, `Select`, `Checkbox`, `Toggle`, `Slider`) uses `React.useId()`-generated or caller-supplied `id`, wraps in a `<label htmlFor>`, and wires `aria-describedby`/`aria-invalid` from hint/error props (`controls.tsx:63-238`). Icon-only `IconButton` requires a `label` prop that becomes `aria-label` (`controls.tsx:47-52`).
- **Disabled states**: `Button`'s `disabled={disabled || loading}` plus `aria-busy` (`controls.tsx:33-34`); `ContextMenu` items skip disabled entries in keyboard navigation (`data.tsx:158,172`).
- **Table semantics**: `DataTable` uses a real `<table>` with `<caption>` (visually hidden), `scope="col"` headers, and an `EmptyState` fallback when `rows.length === 0` (`data.tsx:91-124`).
- **Empty/loading/error states**: `LoadingState` (`role="status" aria-live="polite"`), `EmptyState`, `ErrorState` (`role="alert"`) are all present and used (`controls.tsx:291-332`).
- **Modal, ConfirmDialog, Drawer, Tooltip, ContextMenu, Tabs, ToastProvider, OverlayProvider, ScrollArea, Sidebar, ApplicationShell** — all inspected directly (§9 and above); `ConfirmDialog`/`Dialog` correctly use `role="alertdialog"`, `Modal`/`Drawer` use `role="dialog"`, `Tabs` implements full roving-tabindex keyboard behavior (`data.tsx:16-74`) with `role="tablist"`/`role="tab"`/`role="tabpanel"` and `aria-selected`/`aria-controls`, `ContextMenu` implements `role="menu"`/`role="menuitem"` with Arrow/Home/End navigation, outside-click close, and Escape-to-close-and-refocus-trigger (`data.tsx:126-217`).
- **Focus trap, nested overlays, focus restoration, top-most Escape, listener cleanup, portal behavior**: `OverlayFrame` (`overlays.tsx:69-126`) is the single shared implementation behind `Modal`/`ConfirmDialog`/`Drawer`, registers with `OverlayProvider`'s stack only while `open`, activates `activateFocusTrap` in a `useEffect` that deactivates (removing its listener and restoring prior focus) on cleanup, and renders through `OverlayLayer`'s `ReactDOM.createPortal` into `#pixel-overlays`.
- **Stale closures / duplicate listeners / hook dependency issues / rerenders / timers surviving unmount**: `OverlayProvider` uses refs (`stackRef`, `onDepthChangeRef`) specifically to avoid stale closures in `isTop`/`onDepthChange` while keeping `register`'s identity stable (`overlays.tsx:16-36`); `ToastProvider` clears all pending timers on unmount via `React.useEffect(() => clear, [clear])` (`overlays.tsx:233`) and clears a toast's individual timer on manual dismiss (`overlays.tsx:211-216`); `App.tsx`'s main effect (`App.tsx:37-72`) has a complete cleanup function removing its `message` listener, both bus subscriptions, and closing the bridge. No infinite-loop-prone `useEffect` (missing/incorrect dependency arrays causing unconditional re-triggering) was found in the four effect blocks reviewed.
- **Showcase runtime-gating**: confirmed both structurally and by direct code reading that the showcase is invisible/unreachable unless `showcaseEnabled` is `true`, which itself only becomes true via the `pixel_ui_showcase` convar read once at Lua script load (`client.lua:12`) — there is no runtime toggle exposed to untrusted NUI input.

**Accessibility, further detail**:
- Keyboard behavior for tabs (`Tabs`), menus (`ContextMenu`), dialogs/drawers (`OverlayFrame`'s focus trap), buttons, and other controls was verified by direct source reading of `keyboard.ts`/`data.tsx`/`overlays.tsx`, and the pure logic (`nextKeyboardIndex`, `shouldCloseOnEscape`, `activateFocusTrap`) is additionally covered by passing behavioral tests (§2).
- Reduced-motion CSS: `global.css:204-210` correctly targets `prefers-reduced-motion: reduce` and neutralizes transitions/animations/scroll-behavior globally.
- Visible focus states: `global.css:13-16` sets `outline: none` on native interactive elements but restores a visible 2px outline via `:focus-visible` (keyboard-only focus indication, not removed for mouse users only to vanish entirely) — this is the correct modern pattern, not an accessibility regression.
- Hidden/inert/pointer-event behavior: confirmed at `ApplicationShell` level (`aria-hidden`/`inert`, §9) — this audit did not find a separate `pointer-events: none` CSS rule tied to the hidden state, but the `inert` HTML attribute already removes the subtree from the accessibility tree and blocks pointer/keyboard interaction in browsers that support it (Chromium, which FiveM's CEF-based NUI runtime is built on, supports `inert`).
- Live regions/toast announcements: `ToastProvider`'s region uses `aria-live="polite"` (`overlays.tsx:240`), individual toasts use `role="status"`.
- **Contrast**: this audit independently computed WCAG relative-luminance contrast ratios from the actual token values in `design/tokens/pixel.tokens.json` (not merely re-stated the project's own claim). Body text (`chrome #DCE7F6` / `whiteCore #F7FBFF` on `obsidian900 #090D16` or `panelSolid #0D1320`) ranges from **7.8:1 to 18.7:1**, comfortably exceeding WCAG AA (4.5:1) and AAA (7:1) for normal text. The primary button's apparent color (`pixel-tone--primary`, a translucent `rgba(41,168,255,.28)` gradient over the dark app background, not a solid electric-blue fill — `pixel-button.css:26`) composites to roughly `#12384f57` on the shipped dark backgrounds; white button text against that realistic composited color computes to **≈11.6:1**, not the ≈2.5:1 a naive solid-electric-blue-background check would suggest. This spot-check is consistent with `ACCESSIBILITY_REVIEW.md`'s claim and did not surface a contrast defect. This remains a static/manual spot-check, not an automated or certified contrast audit, matching the project's own stated scope.
- **Controller and screen-reader-in-embedded-browser behavior remain unverified**, as the project's own documents state, and this audit performed no live testing to contradict or confirm that.

## 11. Diagnostics/privacy review

See §8 for the full functional review of `pixel_core/shared/diagnostics.lua`. Summary against the specific checklist in the audit brief:

- **Case-insensitive, recursive redaction**: confirmed correct (`string.lower`, recursion into nested tables).
- **Key matching too broad/too narrow**: matching is reasonably precise (substring match against 8 named roots) but narrower than "any secret-sounding key" — see §5 item 3.
- **Cannot cause crashes/massive output/secret exposure**: crash-safety is good (`pcall` around `json.encode`, depth+cycle bounding); **massive-output bounding is incomplete** (no breadth/length cap) — see §5 item 2. No secret-exposure path was found; redaction always runs before both the local `print()` and the NUI-forwarded `pixel.diagnostics` event.
- **Debug output disabled unless convar enables it**: confirmed — `debug`-level logs are gated on `GetConvarInt('pixel_diagnostics', 0) == 1` (`diagnostics.lua:52-53,75-77`); `info`/`warn`/`error` are *not* gated by this convar and always print to console, which **matches** the documented behavior in `docs/DIAGNOSTICS.md:9-12` (only `debug` is described as convar-gated) rather than contradicting it.
- **No active telemetry/network upload**: confirmed — `diagnostics.lua`'s only output paths are Lua `print()` and, when the convar is enabled, `SendNUIMessage` to the local NUI (not a network call); no `PerformHttpRequest` or similar outbound call exists anywhere in the reviewed resources.

## 12. Test/validator quality review

**Automated test suite**: 20 `test()` bodies across 9 files (`bridge-lifecycle.test.mjs` alone contributes 11; the rest contribute 1–2 each), matching `TEST_REPORT.md`'s "20 tests passed / 0 failed" claim exactly once the environment's compiler-availability blocker is worked around (§2). Two files (`core-readiness.test.mjs`, `diagnostics-contract.test.mjs`) are weak/regex-only source-text assertions rather than behavioral tests (§5 item 1); the remaining seven perform genuine behavioral or falsifiable structural checks.

**Fault injection** — 11 scenarios attempted (the audit brief's list has 11 bullet items even though `TEST_REPORT.md` summarizes "10/10"); results:

| # | Fault | Result |
|---|---|---|
| 1 | Missing manifest-referenced Lua file (deleted `shared/events.lua`, still listed) | **Rejected** — `pixel_core: manifest references missing shared/events.lua`, exit 1 |
| 2a | `files {}` entry removed from manifest while the file stays on disk | **NOT rejected** — validator passes; confirmed gap, see §4 item 1 |
| 2b | `files {}`-referenced asset deleted from disk while manifest still lists it | **Rejected**, but via an uncaught exception rather than a clean message; see §4 item 2 |
| 3 | Invalid Lua syntax appended to `shared/events.lua` | **Rejected** — real Lua 5.4 parse error surfaced |
| 4 | Undefined CSS custom property (`--pixel-color-does-not-exist`) referenced | **Rejected** — `pixel_ui: undefined CSS token ...` |
| 5 | Token drift (hand-edited a color in generated `tokens.css`) | **Rejected** — `pixel_ui: generated tokens.css differs from pixel.tokens.json` |
| 6 | Missing/stale build metadata (deleted `dist/pixel-build.json`) | **Rejected** — both the manifest-reference check and the artifact check fire |
| 7 | Source changed without rebuilding `dist` (appended a comment to `App.tsx`) | **Rejected** — `pixel_ui: dist was not built from the current shipped source` |
| 8a | Missing lockfile | **Rejected** — `pixel_ui: missing package-lock.json` |
| 8b | Inconsistent lockfile (typescript version bumped inside lockfile only) | **Rejected** — `pixel_ui: lockfile does not pin typescript@5.8.3` |
| 9 | Version mismatch (`pixel_core` manifest bumped to `0.2.1` alone) | **Rejected** — changelog-missing-version and manifest-version-mismatch both fire |
| 10 | Prohibited legacy dependency string (`-- ESX.GetPlayerData integration stub` appended) | **Rejected** — `Enhanced-only scan: ESX reference in resources/pixel_core/server/main.lua` |
| 11 | Missing required component/bridge contract (removed `export` from `Modal`) | **Rejected** — `component-contracts.test.mjs` fails with a `match` assertion diff |

**Conclusion**: the "10/10 fault injections rejected" claim in `TEST_REPORT.md` is essentially accurate for the fault categories it explicitly lists (each of its 10 named categories was independently reproduced and confirmed rejected in at least one interpretation), but this audit found that **one specific variant within the "missing `files {}` runtime asset" category — a maintainer removing a declared asset from the manifest without deleting the underlying file — is not caught**, which is the more realistic failure mode a human editing `fxmanifest.lua` would actually trigger. See §4 item 1.

## 13. Enhanced-only compliance

A recursive search of all active `.lua`/`.ts`/`.tsx`/`.json` files under `resources/` (excluding `web/dist` and `web/vendor`, matching `tools/validate-resource.mjs`'s own scope) for `ESX`, `QBCore`/`qb-core`, `pma-voice`/`pma_voice`, and `Mumble` found **zero matches**. All matches found anywhere in the wider ZIP are confined to: (a) `docs/decisions/ADR-0001-ENHANCED-ONLY.md`, which documents the decision to *exclude* these; (b) `archive/ENHANCED-VOICE-COMPAT-NOTICE.md`, which documents that a previously-built Mumble-compat adapter is *intentionally excluded* from active resources; (c) `tools/validate-resource.mjs` and `tests/enhanced-only.test.mjs`, whose own deny-list patterns necessarily contain these strings; (d) `README.md`/`START-HERE-PROMPTS.md`/`PROMPTS/CODEX_POST_AUDIT_FIX_PROMPT.md`, which state as policy that these are not present. No deprecated manifest format was found (`fxmanifest.lua` uses `fx_version 'cerulean'`, `lua54 'yes'`, the current Enhanced-native manifest style, not the legacy `resource_manifest_version`/`__resource.lua` format). No copied proprietary framework code was identified. **Compliant.**

## 14. Documentation accuracy

`README.md`, `docs/ARCHITECTURE.md`, `docs/NUI_BRIDGE.md`, `docs/RESOURCE_INTEGRATION.md`, `docs/UI_COMPONENTS.md`, `docs/DIAGNOSTICS.md`, `docs/BUILD_AND_VALIDATION.md`, `docs/DEVELOPER_SHOWCASE.md`, `docs/ROADMAP.md`, `docs/MIGRATION_V0.1.2_TO_V0.2.0.md`, `IMPLEMENTATION_REPORT.md`, `TEST_REPORT.md`, `SECURITY_REVIEW.md`, `ACCESSIBILITY_REVIEW.md`, `KNOWN_LIMITATIONS.md`, `THIRD_PARTY_NOTICES.md`, and both per-resource `CHANGELOG.md` files were read in full and cross-checked against the actual source. **No false or misleading claims were found.** Specific points of note:

- `TEST_REPORT.md`'s reported build hashes and "20 tests passed" figure were **independently reproduced**, not merely trusted (§2, §7).
- `TEST_REPORT.md`'s "10/10 injected defects rejected" is accurate for the categories as it likely intended them, but this audit surfaced a real edge case within one category that the validator does not cover (§4, §12) — the report's phrasing is not false, but a maintainer reading only the summary line would not learn about this specific gap.
- `docs/DIAGNOSTICS.md`'s redaction-key list (`authorization, credential, identifier, license, password, secret, session, token`) matches the implementation exactly.
- `SECURITY_REVIEW.md`'s trust-boundary and lifecycle claims all check out against source (§8).
- `KNOWN_LIMITATIONS.md` and `ACCESSIBILITY_REVIEW.md` are honest and appropriately hedged — they explicitly disclaim live FiveM testing, WCAG certification, and controller/screen-reader verification rather than overclaiming.
- Old `v0.1.2` implementation prompts are not presented as current instructions; `START-HERE-PROMPTS.md` and `PROMPTS/PROMPT_PACK_CHANGELOG.md` explicitly describe replacing the stale v0.1.2 audit prompt with the current v0.2.0-specific one.
- Per-resource changelogs (`resources/pixel_core/CHANGELOG.md`, `resources/pixel_ui/CHANGELOG.md`) are accurate and scoped to their own resource's actual changes; both have a `## 0.2.0` entry matching the shipped manifest version (validated automatically by `validate-resource.mjs` and independently spot-read).

## 15. Remaining issues ranked

**Critical**: none found.

**High**: none found.

**Medium**:
1. `tools/validate-resource.mjs` does not detect a manifest `files {}` entry being dropped while the underlying asset remains on disk, allowing a broken `pixel_ui` release to pass validation silently (§4 item 1, §12 fault 2a).
2. The vendored React runtime loader (`tools/build-ui.mjs:59-81`) depends on undocumented, JupyterLab-build-specific numeric module IDs with no comment explaining the `44914 → 96540` remap; a future re-vendoring from a different build could silently break the loader with no compile-time signal (§5 item 4).
3. `diagnostics.lua`'s redaction bounds depth/cycles but not the breadth (key count) or length of logged fields/messages, allowing unbounded log output from a large or maliciously-crafted diagnostic payload (§5 item 2, §11).
4. `tests/core-readiness.test.mjs` and `tests/diagnostics-contract.test.mjs` are regex-only source-text assertions, not behavioral tests, and would not catch a logic bug that preserved the matched substrings (§5 item 1, §12).

**Low**:
1. `validate-resource.mjs` throws an unhandled `ENOENT` (raw stack trace) instead of a clean `fail()` message when `dist/index.html` is missing, though the overall exit code is still correctly non-zero (§4 item 2).
2. Sensitive-key redaction does not catch bare `auth`, `pwd`, or `apikey`-style key names not covered by the documented eight-term list (§5 item 3) — matches its own documentation, but is a narrower net than the term "sensitive-key redaction" might suggest in isolation.

**Not a defect, noted for completeness**: `npm ci`/the pinned `typescript@5.8.3` compiler cannot be exercised in a fully offline environment without either vendoring the compiler or accepting a version substitution; this is an environment/CI concern rather than a project defect, but is worth flagging for anyone setting up an air-gapped or restricted-network build pipeline for this project (§2).

## 16. Release-readiness verdict

**Ready to release as an offline foundation layer**, on the strength of: verified byte-for-byte build reproducibility matching both the project's own claims and the shipped artifact; a genuinely well-designed, runtime-validated typed NUI bridge with matching Lua-side enforcement; correct one-response and allow-listing guarantees in the Lua callback registry; correct ownership/focus lifecycle semantics with restoration behavior verified both by direct source comparison and by passing behavioral tests; and documentation that is honest about what has and has not been verified.

**Before other Pixel resources are built against this foundation**, the four Medium-severity items in §15 should be addressed — particularly the `files {}` validator gap (§15 Medium #1), since a silent broken-release regression here would be discovered only by a live FiveM Enhanced test that this project has explicitly not yet performed. None of the findings in this audit indicate a security vulnerability, a data-integrity risk, or a broken feature in the code as currently shipped.
