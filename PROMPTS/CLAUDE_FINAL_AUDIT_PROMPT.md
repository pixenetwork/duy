# Claude Final Verification Prompt — Pixel Network Foundation v0.2.1

You are the independent release auditor for **Pixel Network Foundation v0.2.1**, an Enhanced-only FiveM framework foundation.

Do not modify any file. Audit the complete ZIP and output one Markdown report.

## Scope lock

Before auditing, confirm all of the following:

- The coherent root is `Pixel-Network-Foundation-v0.2.1/`.
- Root `package.json` reports `0.2.1`.
- `resources/pixel_core` and `resources/pixel_ui` exist.
- This is not Pixel Admin v5.x.
- No active ESX, QBCore, pma-voice, or legacy Mumble compatibility exists.

Stop if the package does not satisfy those checks.

## Prior audit context

Read `AUDITS/pixel-network-foundation-v0.2.0-claude-final-audit.md`, but do not trust the v0.2.1 changelog or reports without inspecting and executing the implementation.

v0.2.1 is intended to close these v0.2.0 findings:

1. Reverse manifest coverage: every shipped `web/dist` file must be included by `fxmanifest.lua` `files {}`.
2. Clean validation failure when `dist/index.html` is absent.
3. Diagnostic breadth, total-node, string/message/name, and encoded-output bounds.
4. Expanded exact redaction for `auth`, `pwd`, `apikey`/`api-key`, and `pin`.
5. Behavioral Lua tests replacing regex-only readiness and diagnostics checks.
6. Documented and checksummed React runtime module IDs and alias.
7. Transactional UI build that preserves the prior `dist` on compiler/typecheck/build failure.
8. Exact TypeScript compiler pin enforcement and truthful build metadata.
9. Built JS/CSS content hash verification against asset filenames.
10. Manual bounded capability recovery and exhaustion logging.

## Required verification

- Run every available test and validation command.
- Verify the real TypeScript compiler version used.
- Rebuild `pixel_ui` twice and compare every `dist` byte/hash.
- Confirm the shipped `dist` matches current source and vendor inputs.
- Confirm `runtime-manifest.json` checksums and module IDs are consumed by both the builder and runtime test.
- Fault-inject each item below on temporary copies:
  - remove a `files {}` entry while leaving its runtime file on disk;
  - remove `dist/index.html`;
  - tamper with built JS without changing its filename;
  - tamper with a vendored React chunk;
  - introduce invalid Lua;
  - introduce an undefined Pixel CSS variable;
  - change source without rebuilding;
  - add an active ESX/QBCore/pma-voice/Mumble reference;
  - mismatch root/resource/UI versions;
  - force TypeScript compilation to fail and verify the old `dist` remains byte-identical.
- Execute or closely verify the Lua behavioral tests for:
  - first readiness request at server uptime zero;
  - cooldown boundary and per-player isolation;
  - player-drop cleanup and late `pixel_ui` refresh;
  - session wait, bounded retries, successful readiness, failed-cycle warning, and manual re-request;
  - recursive redaction, exact short-key redaction, cycles, breadth, total nodes, string limits, message limits, and encoded-output limits.
- Review typed bridge request/response validation, correlation, timeout, abort, duplicate/late handling, cleanup, ownership/focus stack, modal depth, and resource-stop behavior.
- Review component accessibility, listener/timer cleanup, hidden-shell behavior, and developer showcase gating.
- Confirm no live FiveM Enhanced test is falsely claimed.

## Classification

Clearly distinguish:

- confirmed bug;
- confirmed gap;
- unverified live-runtime risk;
- suggestion.

Rank remaining issues Critical, High, Medium, or Low. Do not recommend legacy compatibility or an architecture redesign unless a confirmed blocker requires it.

## Output

Output only one file named:

```text
pixel-network-foundation-v0.2.1-claude-final-audit.md
```

Include:

1. Executive verdict
2. Environment and commands executed
3. v0.2.0 finding closure matrix
4. New regressions
5. Build/validator review
6. Lua/diagnostics/security review
7. Typed bridge and ownership review
8. React/component/accessibility review
9. Enhanced-only compliance
10. Documentation accuracy
11. Remaining issues ranked
12. Release-readiness verdict
