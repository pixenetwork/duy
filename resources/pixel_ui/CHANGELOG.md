# Changelog — pixel_ui

## 0.2.1

- Added a checksummed vendored React runtime manifest and changed the deterministic loader to consume its documented module IDs and alias.
- Made production UI builds transactional so an unsuccessful compiler/typecheck run leaves the current `dist` untouched.
- Enforced the pinned TypeScript compiler version and writes the observed version to build metadata.
- Added reverse `fxmanifest.lua` coverage and content-hash validation for every shipped UI runtime asset.
- Bounded diagnostic messages forwarded to the NUI when Pixel Core is unavailable or returns sanitized text.
- Updated the generated production bundle and release metadata for v0.2.1.

## 0.2.0

- Added the typed, versioned NUI event/callback bridge with runtime guards, correlation, timeout, abort, duplicate protection, cleanup, and browser mocks.
- Added centralized Lua callback registration and ordered multi-consumer focus/cursor ownership.
- Added Button, IconButton, Input, Textarea, Select, Checkbox, Toggle, Slider, Badge, Tooltip, Card, Tabs, Modal, ConfirmDialog, Drawer, DataTable, ContextMenu, toast notifications, and loading/empty/error states.
- Added Stack, Row, Grid, Divider, ScrollArea, ApplicationShell, Header, Sidebar, ContentPanel, and OverlayLayer.
- Added focus trapping/restoration, top-most Escape handling, keyboard tabs/menus, hidden-shell inert behavior, live regions, and reduced-motion support.
- Added a production-disabled component/bridge showcase and redacted development diagnostics events.
- Expanded deterministic CSS token usage and retained the local React 18.2.0 runtime.
- Replaced the v0.1.2 generated asset hashes with v0.2.0 source-derived hashes and removed the stale generated files.
- Preserved v0.1.2 `SetVisible`, `IsVisible`, ready, and close behavior for existing Pixel callers.

## 0.1.2

- Replaced the unrelated hand-authored `dist` files with a deterministic build of the shipped React + TypeScript source.
- Added locally vendored React 18.2.0 production modules and license; no runtime CDN is used.
- Fixed generated design-token names in all source styles.
- Added hashed JavaScript/CSS assets and source-hash build metadata.
- Added an accurate package lock and source-level Content Security Policy.
- Split the one-time ready handshake from visibility listeners to remove redundant callback/focus cycles.
- Keeps the interface hidden and non-interactive until Lua explicitly opens it.

## 0.1.1

- Added the complete Lua-to-React visibility message bridge.
- Added NUI ready and close callbacks with Escape-to-close behavior.
- Added safe focus release on close and resource stop.
- Added generated design-token support.
- Added explicit button type and hidden-state pointer-event protection.

## 0.1.0

- Added the initial Enhanced-native React and TypeScript Pixel UI shell.