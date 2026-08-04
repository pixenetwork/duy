# Pixel Network Foundation v0.2.1 — Security Review

## Verdict

No known Critical or High issue remains in the reviewed v0.2.1 source. This is an offline code review, not a live penetration test.

## Trust boundaries reviewed

- Browser payloads are treated as untrusted.
- One central Lua NUI callback validates protocol version, correlation ID, allow-listed callback name, and callback-specific payload.
- Callback handlers return through a one-response guard; failures return bounded structured errors without internal details.
- UI callbacks control presentation/focus only. No callback grants permissions, moves items, changes money, establishes ownership, or commits durable state.
- The diagnostic example callback is gated by the disabled-by-default showcase convar and has no authority action.
- Future durable mutations must be revalidated server-side under the owning resource.

## Lifecycle and denial-of-service controls

- No polling loop was added.
- Request timeouts are bounded and configurable.
- Abort and UI-close/resource-stop cleanup reject pending requests.
- Completed request IDs are capped at 256 to avoid unbounded duplicate-response history.
- Lua request IDs, owner IDs, message length, and modal depth are bounded.
- Duplicate owner acquisition is a no-op.
- Existing capability retries remain bounded, exhaustion is logged, a manual bounded re-request export is available, and readiness events remain rate-limited.

## Data handling

- Diagnostics redact the documented sensitive roots plus exact short aliases such as `auth`, `pwd`, `apikey`, and `pin`.
- Nested/cyclic fields, table breadth, total nodes, key/string/message lengths, and final encoded output are bounded.
- Normal logs do not include raw NUI payloads.
- NUI diagnostics are emitted only in development mode and receive already-redacted fields.

## CSP and runtime dependencies

- NUI scripts/styles are local, content-hashed, and re-hashed during validation.
- CSP blocks objects and external scripts; the checksummed vendored React runtime avoids a CDN dependency.
- No prohibited framework or voice dependency exists in active runtime code.

## Remaining runtime risks

- Live FiveM callback spoofing/rate behavior, restart timing, and focus contention require staging verification.
- Resource consumers must use stable owner IDs and must still release ownership on ordinary close paths.
- Server resources remain responsible for permissions, ownership, prices, quantities, and durable state validation.
