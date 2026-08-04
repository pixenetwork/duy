# Pixel Character — Competitor Research

Research date: 2026-07-24

## Scope

This review covers public FiveM multicharacter, identity, appearance, and spawn-selection systems. It compares feature patterns, integration approaches, public issue reports, and common operational complaints. It does not copy proprietary code, artwork, layouts, or protected assets.

## Market patterns

### QBCore `qb-multicharacter`

Publicly advertises up to five characters, character information during selection, and tight dependencies on separate spawn, apartment, clothing, and weather resources. That decomposition is simple, but it makes the login path sensitive to missing or misordered dependencies.

Public issues repeatedly mention stale character lists after deletion, black screens, invisible or default preview peds, missing start controls, localization failures, and errors caused by integration drift.

**Takeaway for Pixel:** keep module boundaries clean, but expose explicit capability contracts and fail-safe fallbacks rather than silently assuming every downstream module is ready.

### Qbox `qbx_core`

Provides multicharacter inside the core and allows an external character manager to replace it. Its public issue history shows how early player-loaded signals and missing spawn dependencies can create black screens or save character state before the spawn transition is complete.

**Takeaway for Pixel:** character selection, character activation, world spawn, and final player-ready must be separate state-machine phases. Never fire the final loaded event before spawn finalization.

### ESX multicharacter

Recent ESX releases include a full multicharacter UI/backend overhaul and fixes for stale player objects and waiting for NUI readiness before setup.

**Takeaway for Pixel:** the NUI must explicitly acknowledge readiness before receiving character state, and reconnect/logout paths must invalidate stale player/session objects.

### `illenium-appearance` and `fivem-appearance`

These projects demonstrate the expected breadth of a mature appearance ecosystem: clothing, tattoos, facial customization, outfits, access restrictions, migration tools, and external integrations. Public issues also show recurring failure classes: initial-creation menus not opening, NUI callback timeouts, invisible/default peds, framework-event conflicts, and blacklist bypasses through alternate input paths.

**Takeaway for Pixel:** keep identity/character lifecycle separate from appearance, define one strict adapter contract, validate every input path consistently, and never let appearance failure trap the player in a permanent black screen.

### Paid cinematic multicharacter products

Current paid releases commonly market cinematic preview scenes, animated peds, smooth camera transitions, dynamic or premium slots, spawn previews, photo galleries, starter packages, and broad auto-detected integrations. Some also add partner systems or loading screens.

**Takeaway for Pixel:** cinematic presentation and dynamic slots are now baseline expectations for a premium system. Photo galleries, partner systems, starter-item logic, and broad compatibility bridges are feature creep for Milestone 1 and should remain out of scope.

## Public complaint patterns

1. **Black screens and dead-end loading states** caused by missing dependencies, NUI timing, model-load failures, or firing lifecycle events in the wrong order.
2. **Preview-ped failures** including invisible characters, default GTA peds, stale appearance, and model load timeouts.
3. **Stale UI state after deletion or refresh**, sometimes causing a second action against an already-deleted character.
4. **Focus, HUD, radar, or minimap leakage** while the selector is open.
5. **Integration drift** when appearance, spawn, apartments, framework, or inventory APIs change.
6. **Client-trusted actions** around deletion, slot count, starter items, or appearance values.
7. **Escrow/encrypted code limiting recovery**, leaving server owners unable to fix integration bugs locally.
8. **Weak keyboard/controller parity**, where mouse paths enforce restrictions but arrow-key paths bypass or break them.

## Pixel design response

- Explicit server-authoritative phase machine.
- Bounded timeouts with visible retry/recovery states.
- Local, non-networked preview peds with model timeout and fallback.
- NUI-ready handshake before state delivery.
- Character list revision numbers to reject stale actions.
- Soft deletion with one-use confirmation token.
- Dynamic slots resolved only on the server.
- No starter items, inventory mutation, apartment assignment, or full appearance editing in Milestone 1.
- Adapter contracts for future `pixel_clothing` and `pixel_spawn`, with safe built-in fallbacks.
- Open, auditable source within this project.

## Sources

- QBCore `qb-multicharacter` repository and issue tracker — GitHub.
- Qbox `qbx_core` repository, FAQ, releases, and issue tracker — GitHub.
- ESX Core releases and multicharacter changes — GitHub.
- iLLenium Studios `illenium-appearance` repository, releases, and issues — GitHub.
- `fivem-appearance` repository and issues — GitHub.
- Cfx.re release threads for UM, CodeM, Bablo, Turbo, iZaap, 4bit, Myxel, and current cinematic multicharacter products.
- Cfx.re discussions describing minimap leakage, starter-item failures, integration breakage, and character-creator dissatisfaction.
