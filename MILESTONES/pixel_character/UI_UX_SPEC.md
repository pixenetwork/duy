# Pixel Character — UI/UX Specification

## Visual direction

Use the approved Pixel OS chrome, obsidian, electric-blue, violet, and restrained-glass design system. The selector must feel like the opening screen of a premium game, not a framework form.

## Desktop composition

- Full-screen live 3D scene.
- Active preview character positioned near center-left or center depending on camera composition.
- Compact vertical slot rail on the left.
- Character identity and primary actions in a right-side information panel.
- Thin top status bar for server/selector state only.
- Bottom hints for keyboard/controller controls.

Avoid covering the preview ped with a large opaque card.

## Slot states

- Active character.
- Occupied but not selected.
- Empty/create.
- Locked.
- Soft-deleted, only when configuration permits showing a recoverable state.
- Loading/error/retry.

Each state needs icon, text, and shape treatment; do not rely on color alone.

## Character creation flow

Use a short stepped flow inside the same Pixel application shell:

1. Identity.
2. Personal details.
3. Review and confirm.

Do not open the future clothing editor inside this milestone. After successful creation, use the configured fallback preview and mark appearance setup as pending for future `pixel_clothing` integration.

## Cinematic scene

- Configurable staging coordinates and camera presets.
- Local non-networked preview ped.
- Smooth camera interpolation with reduced-motion fallback.
- Bounded model-load timeout.
- Fallback ped and visible warning if the desired model/appearance cannot load.
- Hide radar/HUD elements during selection and restore their exact prior state afterward.
- Freeze and protect the real player entity while selection is active.
- Always destroy preview entities and cameras on close, logout completion, resource stop, disconnect, and error recovery.

## Input and accessibility

- Full keyboard navigation.
- Controller-friendly focus order and visible focus ring.
- Mouse support.
- Escape only closes the current top-most modal; it must not bypass a pending destructive confirmation.
- Enter/Space activation for focused controls.
- Character slot navigation using arrows or shoulder controls through one shared code path.
- No separate mouse-only validation path.
- Use semantic labels, live regions for loading/errors, and reduced-motion behavior.

## Deletion confirmation

- Destructive action visually separated from Play/Edit.
- First modal explains soft deletion.
- Second confirmation requires typing the exact character display name.
- Show token expiry/retry without exposing the token.
- On success, refresh the list from the server and replace the entire local list revision.

## Error states

Dedicated messages for:

- Unable to resolve account.
- Character list timed out.
- Stale list; refreshing.
- Slot limit changed.
- Character no longer available.
- Preview unavailable; fallback loaded.
- Spawn provider unavailable; safe spawn used.
- Activation already in progress.

Errors must never leave an invisible input-capturing overlay.
