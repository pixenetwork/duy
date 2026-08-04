# Pixel Character — Security and Test Plan

## Trust boundaries

The client and NUI are presentation layers only. The server decides:

- Account identity.
- Slot limit.
- Character ownership.
- Character status.
- Selected slot.
- Deletion eligibility.
- Activation eligibility.
- Last-position validity.
- Session phase.

## Required defenses

- Parameterized SQL only.
- Unique database constraint on `(account_key, slot)`.
- Per-source and per-account operation throttles.
- Bounded request payloads and strict runtime guards.
- Session nonce and character-list revision on every mutating action.
- One-use expiring deletion token.
- Source/account re-check after every asynchronous query before side effects.
- Character activation lock preventing double selection and double player-ready events.
- Reject selecting a character active on another source.
- Defensive-copy exports.
- No raw account identifiers in NUI messages or diagnostics.
- Cleanup for disconnect, resource restart, failed model load, failed spawn, and timed-out operations.
- No permanent loop and no idle `Wait(0)` thread.

## Position validation

Last-position data must be validated before use:

- Finite numbers only.
- Configured world bounds.
- Valid heading range.
- Reject malformed JSON.
- Reject known invalid/interior states when the provider cannot support them.
- Fall back to configured safe spawn.

## Required automated tests

### Lua behavioral tests

- Account resolution and identifier precedence.
- First character-list request accepted at low server uptime.
- Rate limiting and cleanup.
- Slot limit and override resolution.
- Concurrent create attempts cannot occupy the same slot.
- Source reuse after async database callback is rejected.
- Selection state machine cannot skip phases.
- Double selection emits ready once.
- Logout cleans session maps.
- Deletion token expires, is one-use, and is account-bound.
- Stale list revision is rejected.
- Invalid names, dates, ages, slots, positions, NaN, and infinity are rejected.

### TypeScript behavioral tests

- Character DTO guards.
- State reducer and revision replacement.
- Loading/error/retry transitions.
- Keyboard and controller navigation share the same action path.
- Modal top-most Escape behavior.
- Delete confirmation cannot submit until the exact display name matches.
- UI bridge timeout, abort, duplicate response, and unmount cleanup remain intact.

### Database contract tests

- Migration references exist.
- Every query column exists in the migration.
- Required indexes and uniqueness constraints exist.
- Rollback documentation does not drop unrelated module data.

### Artifact and validation tests

- `pixel_character` manifest references every runtime file.
- No unreferenced shipped runtime asset.
- Lua syntax validation.
- TypeScript pin and deterministic UI build.
- Enhanced-only deny-list.
- No prohibited framework dependencies.
- No secrets or raw account identifiers in shipped client/NUI source.

## Fault injections

The validator/test suite must reject at least:

1. Missing manifest Lua file.
2. Unreferenced shipped UI asset.
3. Invalid Lua syntax.
4. Undefined design token.
5. Source change without rebuilt dist.
6. Stale build metadata.
7. Version mismatch.
8. Prohibited ESX/QB/Qbox/pma-voice/Mumble reference in active code.
9. Missing database migration.
10. Query referencing a nonexistent column.
11. Removed server payload guard.
12. Deleted source/account re-check after async query.
13. Duplicate character-ready emission.
14. Character list revision ignored.
15. Permanent-delete SQL added to player-facing delete path.

## Live Enhanced QA

- First join with zero characters.
- Create first character.
- Reconnect and select existing character.
- Create up to slot limit.
- Slot override increase/decrease.
- Delete and immediately refresh.
- Attempt stale second delete.
- Force model-load failure.
- Stop optional appearance/spawn providers.
- Restart `pixel_character` while selector is open.
- Restart `pixel_ui` while selector is open.
- Disconnect during create, delete, select, and spawn phases.
- Escape/pause-menu behavior.
- Mouse, keyboard, and controller navigation.
- HUD/radar restoration.
- Focus/cursor restoration.
- Confirm no preview ped/camera/entity leak.
- Measure idle and active resmon without inventing performance claims.
