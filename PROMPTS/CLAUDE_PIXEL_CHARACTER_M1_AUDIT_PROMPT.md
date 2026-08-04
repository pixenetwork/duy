# Claude Prompt — Pixel Character Milestone 1 Final Audit

Act as an independent release auditor. Audit only the currently uploaded Pixel Network v0.3.0 Pixel Character Milestone 1 package.

## Scope lock

Before proceeding, verify:

- Root package version is `0.3.0`.
- `resources/pixel_core`, `resources/pixel_ui`, and `resources/pixel_character` exist.
- The package is not Pixel Admin v5.x.
- Active source contains no ESX, QBCore, Qbox, pma-voice, Mumble, or legacy compatibility.

Stop if the scope is wrong.

## Audit method

Do not trust reports or changelogs. Verify implementation directly. Do not modify the uploaded package. Use disposable copies for fault injection.

Audit:

- All requirements under `MILESTONES/pixel_character/`.
- Database migration/query consistency and transaction safety.
- Account resolution and absence of raw identifier leakage.
- Slot limits and override authority.
- Character ownership, list revision, session nonce, rate limiting, source reuse, and async re-checks.
- Creation validation, dates/ages, names, slots, NaN/infinity, and malformed payloads.
- Soft deletion, exact-name confirmation, one-use token, expiry, stale list, and absence of player-facing permanent deletion.
- Activation phase machine and exactly-once character-ready behavior.
- Logout, disconnect, resource restart, and failed transition cleanup.
- Preview ped/camera/model timeout/fallback and leak prevention.
- HUD/radar/focus/cursor restoration.
- Typed NUI bridge, DTO guards, callbacks, duplicate/late responses, cleanup, and browser mocks.
- Multi-input parity, modal Escape behavior, focus trap, reduced motion, semantics, and hidden-shell safety.
- Enhanced-only compliance.
- Deterministic source-derived dist and no runtime network dependency.
- Tests and validator quality using fault injection, including every item in `SECURITY_AND_TEST_PLAN.md`.
- Documentation truthfulness and version/changelog consistency.

## Required output

Return one Markdown file named:

`pixel-network-v0.3.0-pixel-character-m1-claude-final-audit.md`

Include:

1. Executive verdict.
2. Commands/environment actually used.
3. Objective verification matrix.
4. Confirmed bugs.
5. Confirmed gaps.
6. Security findings.
7. Database/data-integrity findings.
8. UI/NUI/preview lifecycle findings.
9. Accessibility/input findings.
10. Build/test/validator findings.
11. Enhanced-only compliance.
12. Documentation accuracy.
13. Issues ranked Critical/High/Medium/Low.
14. Live-runtime risks not verified.
15. Release-readiness verdict.

Do not produce a modified ZIP.
