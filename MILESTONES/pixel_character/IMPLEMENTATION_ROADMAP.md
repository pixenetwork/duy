# Pixel Character — Implementation Roadmap

## Phase 0 — Baseline safety

- Preserve the audited v0.2.1 foundation behavior.
- Apply the remaining Low audit polish: clean vendor-checksum build error output.
- Add v0.2.1 Claude audit to `AUDITS/`.
- Bump suite/resource versions consistently to 0.3.0 only when the new module is implemented.

## Phase 1 — Server domain and migrations

- Account resolver.
- Character repository.
- Slot resolver and overrides.
- Runtime session state machine.
- Rate limits and async source/account re-check helpers.
- SQL migration and database contract validation.

## Phase 2 — Client selector runtime

- Selection isolation and cleanup.
- Camera and local preview ped manager.
- HUD/radar state preservation.
- Model timeout and fallback.
- Server lifecycle integration.

## Phase 3 — Pixel UI application

- Typed DTO and callback/event contracts.
- Slot rail, details panel, create flow, deletion flow, states.
- Keyboard/controller/mouse parity.
- Reduced motion and accessibility.
- Developer mock/showcase mode disabled in production.

## Phase 4 — Activation and fallback spawn

- Character activation lock.
- Appearance provider detection by explicit capability, not framework auto-detection.
- Safe fallback appearance.
- Spawn provider contract and safe last-position/default fallback.
- Final `pixel:character:ready` event after spawn finalization.

## Phase 5 — Verification and handoff

- Automated tests and fault injections.
- Deterministic build and validation.
- Implementation, test, security, accessibility, migration, and limitations reports.
- CHANGELOG entries in root, `pixel_core`, `pixel_ui`, and `pixel_character` as applicable.
- Complete ZIP plus Claude audit prompt.
- No claim of live Enhanced certification unless actually tested.
