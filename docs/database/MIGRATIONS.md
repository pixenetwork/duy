# Pixel Database Migration Convention

Pixel resources that own persistent data must place migrations under `database/migrations/` inside that resource.

Naming:

```text
0001_create_inventory_tables.up.sql
0001_create_inventory_tables.down.sql
```

Rules:
- Migrations are applied in numeric order.
- An `up` migration must have a matching `down` migration unless rollback is unsafe; exceptions must be documented.
- A resource may only modify tables it owns.
- Schema changes require release notes and rollback instructions.
- Runtime code must never silently mutate production schema.

The migration runner will be selected before the first schema-bearing Pixel resource ships.
