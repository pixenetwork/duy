# Pixel Character — Architecture and Data Model

## Resource boundaries

`pixel_character` owns identity, slots, selection, activation, logout, and character-session state.

It must not own appearance editing, clothing inventory, spawn-location UI, apartments, economy, jobs, starter items, or inventory mutation.

## Dependencies

Required:

- `pixel_core`
- `pixel_ui`
- A documented SQL driver abstraction selected by the project; do not introduce a framework dependency.

Optional future providers:

- `pixel_clothing`
- `pixel_spawn`

Provider absence must activate safe fallbacks, not a black screen.

## Proposed database tables

### `pixel_characters`

- `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
- `character_uuid` CHAR(36) NOT NULL UNIQUE
- `account_key` VARCHAR(96) NOT NULL
- `slot` SMALLINT UNSIGNED NOT NULL
- `first_name` VARCHAR(24) NOT NULL
- `last_name` VARCHAR(24) NOT NULL
- `date_of_birth` DATE NOT NULL
- `nationality` VARCHAR(48) NOT NULL
- `body_archetype` VARCHAR(16) NOT NULL
- `pronouns` VARCHAR(32) NULL
- `biography` VARCHAR(280) NULL
- `appearance_ref` VARCHAR(64) NULL
- `last_position` JSON NULL
- `metadata` JSON NULL
- `status` VARCHAR(16) NOT NULL DEFAULT 'active'
- `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
- `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
- `last_played_at` TIMESTAMP NULL
- `deleted_at` TIMESTAMP NULL
- UNIQUE `(account_key, slot)`
- INDEX `(account_key, status)`

Allowed status values are enforced in application code and migration documentation: `active`, `deleted`, `locked`.

### `pixel_character_slot_overrides`

- `account_key` VARCHAR(96) PRIMARY KEY
- `slot_limit` SMALLINT UNSIGNED NOT NULL
- `reason` VARCHAR(128) NULL
- `updated_by` VARCHAR(96) NULL
- `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### Optional `pixel_character_history`

A compact append-only lifecycle history may be included for create/select/logout/delete/restore/denial events. It must not store raw licenses in client-visible data.

## Account identity

Add or reuse a server-only Pixel Core account resolver:

- Prefer the configured canonical FiveM license identifier.
- Normalize and hash or namespace it for internal use when appropriate.
- Never accept an account key from the client.
- Never send the raw account key to NUI.
- Re-resolve the account after asynchronous database work before committing a source-sensitive action.

## Runtime state

Server memory:

- `sessionsBySource[source]`
- `sourceByCharacterId[id]`
- `selectorSessions[source]`
- Per-source rate limit buckets.

Each selector session contains:

- Account fingerprint.
- Random/session nonce.
- Character-list revision.
- Current phase.
- Expiry.
- Pending operation lock.

All maps must be cleaned on `playerDropped`, resource stop, logout completion, and failed activation.

## Public server exports

Recommended stable interface:

- `GetActiveCharacter(source)` — defensive copy or `nil`.
- `GetCharacterId(source)` — internal numeric ID or `nil`.
- `GetCharacterUuid(source)` — UUID or `nil`.
- `IsCharacterLoaded(source)` — boolean.
- `GetCharacterIdentity(source)` — sanitized defensive copy.
- `RegisterCharacterReadyHook(resourceName, callbackName)` or a documented event contract.
- `ForceLogout(source, reason)` — permission remains the caller's responsibility; server re-validates state.

Do not expose functions that mutate arbitrary character records without a separate future admin authorization layer.

## Event contracts

Use namespaced, versioned events. Every client request carries:

- Protocol version.
- Request ID.
- Selector session nonce.
- Current list revision.
- Minimal action payload.

The server response carries a success/failure envelope and a sanitized character-list DTO. Unknown or stale revisions are rejected with a refresh-required result.

## Character DTO sent to NUI

Allowed:

- UUID.
- Slot.
- Display name.
- DOB display value.
- Nationality/origin label.
- Body archetype.
- Optional pronouns/biography.
- Status.
- Last-played timestamp.
- Sanitized preview descriptor.

Never send:

- Account identifiers.
- Database numeric IDs unless required internally by Lua.
- Raw metadata JSON.
- Administrative notes.
- Other module balances, inventory, property, or permissions.

## Preview and spawn adapters

Appearance provider contract:

- `GetPreviewDescriptor(characterUuid)`
- `ApplyPreviewDescriptor(localPed, descriptor)`
- `ApplyActiveCharacterAppearance(source, characterUuid)`

Spawn provider contract:

- `ResolveSpawnOptions(source, characterUuid)`
- `FinalizeSpawn(source, characterUuid, option)`

Fallbacks:

- Preview: configured freemode model, neutral outfit, documented model-load timeout.
- Spawn: validated last position or configured safe default coordinates.
