# Pixel Network Foundation v0.2.1 — Test Report

## Verdict

All available offline verification passed. No live FiveM Enhanced server/client test was performed, so this report does not claim in-game certification.

## Environment

```text
Node.js:       v22.16.0
npm:           10.9.2
TypeScript:    5.8.3
Python:        3.13.5
Lua library:   liblua5.4.so.0
```

The UI builder verified that the compiler it actually invoked was exactly TypeScript 5.8.3.

## Complete verification

```text
npm run verify
```

Execution order:

```text
tokens -> strict typecheck -> transactional UI build -> tests -> release validation
```

Result:

```text
22 tests passed
0 failed
Pixel resource validation passed
```

## Automated coverage

### TypeScript/React bridge and lifecycle

- event envelope validation, unknown-event rejection, unsubscribe, and one-shot listeners;
- correlated callback success;
- timeout, abort, transport failure, invalid request, invalid response, and structured errors;
- duplicate/late response handling and pending-request cleanup;
- multi-owner state, duplicate-open suppression, focus/cursor restoration, close-all, and modal depth;
- tab/menu keyboard helpers, top-most Escape, focus trap, listener cleanup, and focus restoration;
- required component/layout exports, ARIA contracts, and showcase gating.

### Lua 5.4 behavioral execution

- first server readiness request accepted at uptime zero;
- cooldown rejection, exact boundary acceptance, per-player isolation, player-drop cleanup, and late `pixel_ui` refresh;
- client network-session wait, successful bounded retry, defensive snapshots, and version exports;
- five-attempt failure bound, warning emission, and manual `RequestCapabilities()` recovery cycle;
- recursive sensitive-key redaction, exact short-key aliases, cycle truncation, table breadth limits, string/message limits, debug gating, and encoded-output truncation.

### Build, vendor, and release integrity

- generated design tokens and undefined-variable checks;
- vendored React/ReactDOM/license SHA-256 validation;
- runtime manifest module IDs and React alias execution;
- current source-to-`dist` source hash;
- built JavaScript syntax and content-hashed filenames;
- root/UI/resource version consistency;
- active-runtime Enhanced-only dependency scan.

## Deterministic build

Three consecutive production states (initial verified build plus two additional rebuilds) produced identical sorted SHA-256 sets:

```text
1ec6e3f254e29f11bf7ad2bd7b76a19fc3df318a2d4a351ac5576316ce4d8740  assets/index-1ec6e3f254e2.css
b2f01207936b63b71f4b802adfe5afed39e026d894b4161c9e7cb71e3391fd20  assets/index-b2f01207936b.js
a53b383b52217876949233b785b5fa30f68be2b9d5a495dc7ad8b74a7e3dd07e  index.html
0181ee4309d0968358a982e2b61522735acea7472127dddba14a44377a50a7db  pixel-build.json
```

Result: **PASS — byte-for-byte reproducible.**

## Fault injection

Every mutation was performed in a disposable copy; the release tree was not altered.

| Injected defect | Result |
|---|---|
| Removed `web/dist/pixel-build.json` from manifest while file remained on disk | Rejected by reverse manifest coverage |
| Deleted `dist/index.html` | Rejected with clean validator messages and no raw stack trace |
| Modified built JavaScript without renaming it | Rejected by asset content-hash validation |
| Modified vendored React chunk | Rejected by vendor checksum and source-hash validation |
| Added invalid Lua syntax | Rejected by real Lua 5.4 parser |
| Referenced an undefined Pixel CSS token | Rejected by token validation |
| Changed UI source without rebuilding | Rejected by source-to-dist hash validation |
| Added prohibited ESX text to active runtime source | Rejected by Enhanced-only scan |
| Mismatched `pixel_core` manifest version | Rejected by changelog/version validation |
| Forced TypeScript compile failure | Build failed and prior `dist` remained byte-identical |

Result: **10/10 expected failures detected.**

## Static-only / untested

- No FiveM Enhanced client/server was launched.
- Native `SetNuiFocus`, actual NUI callback routing, pause-menu Escape behavior, and resource restart timing remain unverified in-game.
- Controller and screen-reader behavior inside FiveM CEF remain unverified.
- No new automated browser session was run in this environment; production bundle syntax, source derivation, React runtime execution, and component logic were covered offline.

See `LIVE_ENHANCED_QA_CHECKLIST.md` for the remaining gate.
