# Resource Integration Guide

## Dependencies

Start resources in this order:

```cfg
ensure pixel_core
ensure pixel_ui
```

Any resource using Pixel UI declares:

```lua
dependency 'pixel_ui'
```

## Acquire and release UI ownership

Use a stable owner name, normally the resource name. Repeating the same acquisition is idempotent.

```lua
local accepted, state = exports.pixel_ui:Acquire(
    GetCurrentResourceName(),
    true,  -- keyboard focus
    true,  -- cursor focus
    'inventory'
)

-- Release only this resource. The previous owner, if any, regains focus.
exports.pixel_ui:Release(GetCurrentResourceName())
```

When a consumer resource stops, `pixel_ui` releases owners matching that resource or its `resource:subview` prefix. `CloseAll(reason)` is reserved for explicit global shutdown flows. `SetVisible(boolean)` remains available for the v0.1.2 Pixel UI caller and maps to the internal `pixel_ui:legacy` owner.

## Ownership rules

1. Owners form an ordered stack.
2. Only the top owner controls keyboard and cursor focus.
3. Reacquiring promotes that owner; an identical top acquisition is a no-op.
4. Releasing the top owner restores the next owner.
5. Closing the final owner clears modal depth and calls `SetNuiFocus(false, false)`.
6. A resource stop releases its ownership; stopping `pixel_ui` releases all focus unconditionally.

Consumer code must release ownership on every normal close path. It must not call FiveM focus natives directly while using this shared manager.

## UI callback example

React code uses the typed `NuiClient`; Lua handlers stay in the central registry. A future resource-specific callback should:

1. Add its TypeScript request/response contract and guards.
2. Register one Lua allow-list handler with a payload guard.
3. Treat browser input as untrusted.
4. Forward durable or authoritative work to the server.
5. Return a bounded, structured response.

No undocumented Enhanced API is used by this milestone. Live Enhanced behavior, pause-menu Escape interaction, and resource timing still require staging QA.
