# pixel_ui

Shared Pixel OS React + TypeScript UI kit and typed NUI bridge for FiveM Enhanced.

## Runtime behavior

- Hidden, inert, and non-interactive on startup.
- Opens only through explicit `Acquire` or preserved `SetVisible(true)`.
- Uses ordered owners so one module cannot permanently steal focus from another.
- Releases keyboard/cursor focus on final close and resource stop.
- Resynchronizes authoritative Lua state during the one-time ready handshake.
- Cancels pending bridge requests on close/stop.
- Loads all JavaScript and CSS locally from content-hashed, validator-checked assets.
- Builds transactionally; a failed compiler/typecheck run cannot delete the last known-good `dist`.

## Public Lua exports

```lua
exports.pixel_ui:Acquire(owner, focus, cursor, panel)
exports.pixel_ui:Release(owner)
exports.pixel_ui:CloseAll(reason)
exports.pixel_ui:GetState()
exports.pixel_ui:GetVersion()

-- Preserved v0.1.2 calls:
exports.pixel_ui:SetVisible(visible)
exports.pixel_ui:IsVisible()
```

## Development

```bash
npm --prefix web ci
npm run ui:typecheck
npm run ui:build
npm run validate
```

The showcase is disabled unless `setr pixel_ui_showcase 1` is set, then opened with `pixel_ui_showcase`. See the root `docs/` references for the component API, bridge protocol, integration rules, accessibility behavior, and validation workflow.
