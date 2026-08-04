# Pixel Network Architecture

## Principles

1. **Enhanced-native:** Build against FiveM Enhanced and avoid compatibility compromises for legacy FiveM.
2. **Server authority:** Currency, inventory, crafting, permissions, ownership, and progression are validated and committed server-side.
3. **Modular boundaries:** Resources communicate through documented exports, callbacks, events, and schemas—not direct internal file coupling.
4. **Typed UI:** Major NUI applications use React and TypeScript with runtime validation at trust boundaries.
5. **Single design system:** All interfaces consume shared Pixel design tokens and components.
6. **Observable operations:** Important actions produce structured logs with correlation IDs.
7. **Safe evolution:** Database and API changes are versioned with migration notes.

## Initial resource graph

```text
pixel_core
├── identity/session contracts
├── permissions contracts
├── callbacks/events
├── logging interface
└── version/capability registry

pixel_ui
├── design tokens
├── reusable React components
├── NUI bridge
└── interaction/motion standards

Future modules
├── pixel_voice
├── pixel_character
├── pixel_inventory
├── pixel_admin
├── pixel_phone
├── pixel_bank
├── pixel_vehicle
└── pixel_property
```

## Language policy

- Lua: FiveM natives, entity control, runtime glue, lightweight server/client resources.
- TypeScript: NUI, validation, tooling, SDKs, code generation, complex deterministic application logic where supported.
- SQL: persistent schemas and migrations.
- Go/Rust: external services only when measurable performance or concurrency requirements justify them.

Language selection must reduce complexity rather than advertise complexity.

## v0.2.1 runtime flow

```text
Pixel resource
  | Acquire / Release export
  v
pixel_ui Lua ownership + callback registry
  | versioned SendNUIMessage       ^ one central validated NUI callback
  v                                |
React event bus <-------------> typed NuiClient
  |
  +-- ApplicationShell
  +-- shared components/layouts
  +-- scoped OverlayProvider / ToastProvider

pixel_core diagnostics
  +-- client adapter
  +-- server adapter
  +-- redacted development event -> pixel_ui NUI
```

The Lua ownership stack is authoritative for NUI visibility, keyboard focus, and cursor focus. React owns only presentation state and scoped overlay/toast providers. Durable gameplay authority remains in the owning server resource.
