# Pixel Network Foundation

**Version:** 0.2.1  
**Platform:** FiveM Enhanced only

This package establishes the shared architecture, visual language, resource conventions, validation process, and runnable starter resources for Pixel Network / Pixel OS.

## Core decisions

- FiveM Enhanced only; no legacy compatibility layer.
- No ESX, QBCore, pma-voice, or legacy Mumble integration.
- Lua is used for native FiveM runtime integration where appropriate.
- React + TypeScript power major NUI applications.
- NUI production assets are deterministic, hashed, local, and verified against their shipped source.
- SQL migrations are versioned and reversible where possible.
- Every resource is modular, server-authoritative, documented, and versioned.
- Existing Pixel work is migrated and improved—not discarded.

## Included

- Pixel architecture, Design Bible, Code Bible, roadmap, and ADR
- `pixel_core` capability/readiness foundation
- `pixel_ui` React + TypeScript NUI foundation
- Reusable Pixel UI component and layout library
- Typed, correlated, runtime-validated NUI bridge
- Multi-consumer UI focus/cursor ownership
- Pixel diagnostics and redaction baseline
- Production-disabled developer showcase
- Shared JSON-to-CSS design tokens
- Official branding references
- Transactional deterministic UI build tooling with pinned-compiler enforcement
- Lua, reverse-manifest, token, content-hash, artifact, vendor, lockfile, and changelog validation
- Release reports, validation results, and third-party notices

## Build and verify

```bash
cd Pixel-Network-Foundation-v0.2.1
npm --prefix resources/pixel_ui/web ci
npm run verify
```

The release ZIP includes verified `pixel_ui/web/dist` runtime files. See `docs/BUILD_AND_VALIDATION.md`, `docs/UI_COMPONENTS.md`, `docs/NUI_BRIDGE.md`, and `docs/RESOURCE_INTEGRATION.md`.

## Next milestone

1. Stage v0.2.1 on a live FiveM Enhanced server and client.
2. Migrate existing Character/Clothing/Tattoos/Admin interfaces without discarding their functionality.
3. Begin the Pixel Inventory vertical slice on the shared UI and bridge contracts.
