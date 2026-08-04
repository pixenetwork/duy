# Migration from v0.1.2 to v0.2.0

## Preserved behavior

- `exports.pixel_ui:SetVisible(boolean)` and `IsVisible()` remain available.
- The old `pixel:ui:ready` and `pixel:ui:close` callback handlers remain for the existing Pixel UI caller.
- Initial hidden state, ready resync, close behavior, local React runtime, deterministic build, capability readiness, and server version export remain.

## Preferred v0.2.0 integration

Replace boolean-only visibility calls with:

```lua
exports.pixel_ui:Acquire(GetCurrentResourceName(), true, true, 'your-panel')
exports.pixel_ui:Release(GetCurrentResourceName())
```

Use the typed `NuiClient` rather than direct scattered `fetch` calls. Use versioned `NuiEventEnvelope` values rather than unvalidated `{ type, payload }` messages.

## Configuration additions

Both are disabled by default:

```cfg
setr pixel_ui_showcase 0
setr pixel_diagnostics 0
```

No database migration is required. Existing Character, Clothing, Tattoos/Barber, and Admin resources are not included or removed; their later migration remains on the roadmap.
