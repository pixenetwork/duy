# pixel_core

Enhanced-native foundation resource for Pixel Network. It owns the framework version, capability-readiness flow, and shared diagnostics baseline while keeping identity, permissions, callbacks, and persistence contracts separated into future versioned modules.

## Public client exports

```lua
exports.pixel_core:GetVersion()
exports.pixel_core:GetCapabilities()
exports.pixel_core:AreCapabilitiesReady()
exports.pixel_core:RequestCapabilities()
exports.pixel_core:Log(level, moduleName, message, fields)
exports.pixel_core:RedactDiagnostics(fields)
```

`GetCapabilities()` returns a defensive copy. Consumers that require module-version data should wait until `AreCapabilitiesReady()` returns `true`. `RequestCapabilities()` starts another bounded handshake cycle only when the client is not already ready or requesting.

## Public server exports

```lua
exports.pixel_core:GetVersion()
exports.pixel_core:GetCapabilities()
exports.pixel_core:Log(level, moduleName, message, fields)
exports.pixel_core:RedactDiagnostics(fields)
```

Capability versions are read from each resource's `fxmanifest.lua` metadata rather than duplicated manually.

Diagnostics redact sensitive keys recursively. Debug output requires `setr pixel_diagnostics 1`; other levels are intended for bounded operational events, never loops.

## Readiness lifecycle

1. The client waits for the network session to start.
2. It announces readiness to the server.
3. The server applies a per-player cooldown and sends a capability snapshot.
4. The client retries a bounded number of times if no snapshot arrives.
5. Exhaustion emits a warning and leaves an explicit bounded `RequestCapabilities()` recovery path.
6. When `pixel_ui` starts after `pixel_core`, the server refreshes connected players' snapshots.
7. Cooldown state is removed when the player disconnects.

## Security notes

- The server uses FiveM's implicit `source`; the client cannot supply another player ID.
- The readiness event accepts no client payload.
- Capability snapshots contain resource/platform versions only.
- Exports return copies rather than mutable internal tables.
