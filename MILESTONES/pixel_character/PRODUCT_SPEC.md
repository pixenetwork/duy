# Pixel Character Milestone 1 — Product Specification

Target release: Pixel Network v0.3.0
Resource: `pixel_character`

## Product goal

Deliver a premium, server-authoritative character identity, slot, selection, creation, deletion, activation, and logout foundation that feels native to Pixel OS and can safely support later Clothing, Inventory, Phone, Banking, Property, Vehicle, and Admin modules.

## Milestone 1 scope

### Included

- Account-to-character ownership.
- Configurable base slots plus per-account slot overrides.
- Character list, empty slots, locked slots, and disabled/deleted states.
- Character creation with identity validation.
- Character selection and activation.
- Soft deletion with explicit confirmation and one-use server token.
- Safe logout back to character selection.
- Last-position persistence contract and safe fallback spawn.
- Cinematic selector scene with local preview ped and camera transitions.
- Server-authoritative lifecycle and sanitized replicated state.
- Integration hooks for future `pixel_clothing` and `pixel_spawn`.
- Database migration, rollback notes, tests, diagnostics, and documentation.

### Explicitly excluded

- Full face/body/clothing editor.
- Clothing stores, wardrobes, tattoos, barber, surgery, or outfits.
- Inventory, starter items, jobs, money, apartments, housing, vehicles, or phone setup.
- Partner/friend systems.
- Photo gallery or screenshot storage.
- Tebex logic inside the character module.
- ESX, QBCore, Qbox, pma-voice, or legacy compatibility.
- Permanent deletion from the player-facing UI.

## Identity fields

Required:

- First name.
- Last name.
- Date of birth.
- Nationality or origin label.
- Body archetype used only to select a supported base freemode model.

Optional and configurable:

- Pronouns.
- Short biography.

Identity data and model archetype must remain separate concepts.

## Validation defaults

- First/last name: trimmed, 2–24 characters each.
- Allowed default name characters: Latin letters, spaces, apostrophes, and hyphens.
- Collapse repeated spaces and reject leading/trailing punctuation.
- Configurable minimum age: 18.
- Configurable maximum age: 100.
- Date parsing must correctly handle leap years and future dates.
- Nationality/origin: 2–48 characters.
- Biography, if enabled: maximum 280 characters.
- Configurable reserved/prohibited-name list.

The server must repeat all validation and is authoritative.

## Slot behavior

- Default slot limit is configuration-driven; recommended initial value: 3.
- Per-account overrides are stored in the database.
- NUI never decides the slot limit.
- Occupied and soft-deleted slots count according to explicit configuration.
- Slot changes must be visible after refresh without reconnecting.
- Character creation uses a transaction and a unique `(account_key, slot)` constraint.

## Deletion behavior

- Player-facing delete is always soft delete.
- Require a server-issued, one-use, expiring deletion token.
- Require the user to type the exact displayed character name.
- Re-check ownership, character status, list revision, active-session state, and token at commit time.
- Deleted records remain available to future admin restore tooling.
- Never cascade-delete inventory, property, vehicles, banking, or phone data in this milestone.

## Activation and ready lifecycle

Required phases:

1. `network_ready`
2. `account_resolved`
3. `selector_preparing`
4. `selector_ready`
5. `character_transition_locked`
6. `character_loaded_server`
7. `spawn_finalizing`
8. `character_ready`

`character_ready` must not fire before spawn finalization completes or times out into a safe fallback.

## Failure experience

Every asynchronous stage must have:

- A visible loading state.
- A bounded timeout.
- A retry action where safe.
- A cancel/back path where safe.
- A recovery path that restores camera, focus, HUD/radar state, player visibility, and controls.

No black screen may be used as an indefinite state.
