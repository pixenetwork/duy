# Pixel Diagnostics Reference

**Public API version:** 0.2.1

`pixel_core/shared/diagnostics.lua` provides the common client and server implementation.

## Levels

- `debug`: emitted only when `setr pixel_diagnostics 1` is configured.
- `info`: meaningful lifecycle or operational change.
- `warn`: rejected input, degraded operation, or recoverable misuse.
- `error`: failed operation that requires investigation.

## Fields and redaction

Logs include a resource and module context plus optional structured fields. Keys containing authorization, credential, identifier, license, password, secret, session, or token are replaced with `[REDACTED]`. Exact short aliases `auth`, `pwd`, `apikey`/`api-key`, and `pin` are also redacted. Nested fields are bounded by depth, per-table key count, a total-node budget, key length, string length, and cycle detection.

```lua
exports.pixel_core:Log('info', 'inventory', 'Container opened', {
    containerType = 'vehicle',
    identifier = playerIdentifier -- redacted before output
})
```

`exports.pixel_core:RedactDiagnostics(fields)` returns a defensive redacted copy for adapters.

## NUI diagnostics

When `pixel_diagnostics` is enabled, `pixel_ui` forwards already-redacted diagnostic records as `pixel.diagnostics` events. Production debug logging is disabled by default. There is no timer or polling loop.

Do not log raw callback payloads, access tokens, player identifiers, license values, session material, payment data, or full item metadata. Prefer a correlation ID and bounded categorical fields.


## Output limits

The shared implementation currently enforces:

- maximum nesting depth: 5;
- maximum keys copied per table: 32;
- maximum total copied nodes: 128;
- maximum diagnostic key length: 96 bytes;
- maximum field string and message length: 512 bytes;
- maximum resource/module name length: 64 bytes;
- maximum encoded field output: 8192 bytes.

Values exceeding a limit are replaced or suffixed with `[TRUNCATED]`; oversized encoded field output is replaced with a fixed `[TRUNCATED_OUTPUT]` marker.
