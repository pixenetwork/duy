# Pixel Code Bible v0.1

## Naming

- Resources: `pixel_<module>`
- Network events: `pixel:<module>:<direction>:<action>`
- Internal events: `pixel:<module>:internal:<action>`
- Exports: verbs in PascalCase where Lua convention allows, documented in README.
- Database tables: `pixel_<domain>_<entity>`

## Security

- Never trust NUI or client-supplied prices, quantities, permissions, ownership, coordinates, or metadata.
- Validate payload shape, value bounds, state, authorization, and operation ordering server-side.
- Sensitive mutations require idempotency/operation IDs where replay is possible.
- Inventory transfers and crafting must be atomic.
- Rate-limit abuse-prone endpoints.

## Performance

- Avoid permanent zero-delay loops.
- Cache immutable configuration.
- Paginate or virtualize large datasets.
- Send minimal NUI payloads and use incremental updates.
- Profile before introducing external native services.

## Resource release requirements

Every release must include:
- `README.md`
- `CHANGELOG.md`
- version in `fxmanifest.lua`
- configuration reference
- migration notes when applicable
- installation and rollback instructions
- test/validation results
