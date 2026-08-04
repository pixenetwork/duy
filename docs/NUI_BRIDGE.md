# Typed NUI Bridge Reference

**Protocol version:** 1  
**Public API version:** 0.2.1

## Lua to React events

Every event uses:

```json
{
  "version": 1,
  "event": "pixel.ui.state",
  "payload": {}
}
```

`NuiEventBus.receive` rejects malformed envelopes, ignores unknown events safely, and validates known payloads. `subscribe(name, listener, { once })` returns an unsubscribe function. Browser development can inject an event with `window.postMessage(envelope, '*')`.

Registered events:

| Event | Payload |
|---|---|
| `pixel.ui.state` | `UiStateSnapshot` |
| `pixel.ui.closeAll` | `{ reason: string }` |
| `pixel.diagnostics` | Redacted `DiagnosticEvent` in development mode |

## React to Lua callbacks

`NuiClient.request(name, payload, options)` sends one request to the central `pixel:ui:bridge` NUI callback:

```json
{
  "version": 1,
  "requestId": "px:correlation:id",
  "callback": "ui.acquire",
  "payload": {
    "owner": "pixel_inventory",
    "focus": true,
    "cursor": true
  }
}
```

Success and failure envelopes preserve the request ID:

```json
{ "version": 1, "requestId": "px:correlation:id", "ok": true, "data": {} }
```

```json
{
  "version": 1,
  "requestId": "px:correlation:id",
  "ok": false,
  "error": { "code": "BAD_REQUEST", "message": "Invalid NUI callback payload" }
}
```

The client supports configurable timeouts (default 5000 ms), `AbortSignal`, runtime response validation, duplicate-response rejection, bounded completed-ID history, and cleanup through `cancelPending` or `close`.

## Registered callbacks

| Name | Purpose |
|---|---|
| `ui.ready` | One-time NUI readiness handshake and authoritative state resync |
| `ui.acquire` | Add or promote one UI owner |
| `ui.release` / `ui.close` | Release one owner and restore the previous owner |
| `ui.closeAll` | Release every owner and all focus/cursor ownership |
| `ui.modalDepth` | Report bounded overlay nesting depth |
| `diagnostics.example` | Development-only, authority-free showcase callback |

Lua validates the version, correlation ID, callback allow-list, and callback-specific payload before invoking a handler. A guarded responder permits one response only. Handler failures become redacted `INTERNAL` responses.

## Typed React example

```ts
const result = await bridge.request(
  'ui.acquire',
  { owner: 'pixel_inventory', focus: true, cursor: true, panel: 'inventory' },
  { timeoutMs: 2500, signal: controller.signal },
);
```

## Browser mock mode

When `window.GetParentResourceName` is absent, `installBrowserMocks` registers local handlers for all public callbacks and opens only the browser showcase owner. This mode does not exist in FiveM NUI and has no production-authority action. Tests can pass a custom transport directly to `new NuiClient(transport)`.

## Versioning

Changing an envelope incompatibly requires a new `version`. Additive callback/event names may be introduced within protocol version 1 when older consumers can ignore them. Public component/bridge changes are recorded in `pixel_ui/CHANGELOG.md`.
