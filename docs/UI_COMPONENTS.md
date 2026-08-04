# Pixel UI Component Reference

**Public API version:** 0.2.1

All components live in the `PixelUI` TypeScript namespace, consume generated Pixel tokens, and are demonstrated by the developer showcase. Components do not perform gameplay-authority mutations.

## Controls

| Component | Required contract | Notes |
|---|---|---|
| `Button` | `children` | Tones: primary, neutral, success, warning, danger. Supports size, loading, disabled, and full-width states. |
| `IconButton` | `label`, `icon` | `label` becomes the accessible name; the icon is decorative. |
| `Input` | `label` | Supports hint, error, and native input attributes. |
| `Textarea` | `label` | Supports hint, error, and native textarea attributes. |
| `Select` | `label`, `options` | Options use typed `{ value, label, disabled? }` records. |
| `Checkbox` | `label` | Native checkbox semantics with optional description. |
| `Toggle` | `label` | Native checkbox with `role="switch"`. |
| `Slider` | `label`, `value`, `min`, `max` | Native range input and visible value output. |
| `Badge` | `children` | Compact status label with semantic text, not color alone. |
| `Tooltip` | `content`, one child | Appears on hover and focus; uses `role="tooltip"`. |

## Content and state

- `Card`: titled surface with optional eyebrow and actions.
- `DataTable<Row>`: typed columns, row keys, caption, aligned cells, and empty fallback.
- `LoadingState`: polite live status with reduced-motion-safe spinner.
- `EmptyState`: title, description, and optional action.
- `ErrorState`: alert semantics plus title, description, and action.

## Navigation and overlays

- `Tabs`: native tab roles, roving focus, Left/Right/Home/End behavior, and disabled tabs.
- `ContextMenu`: menu roles, Arrow Up/Down/Home/End, Escape, outside-click close, and disabled/destructive items.
- `Modal`: portal-rendered modal dialog with focus trap, focus restoration, and top-most Escape handling.
- `ConfirmDialog` (also exported as `Dialog`): `alertdialog` specialization with explicit confirm/cancel actions.
- `Drawer`: left/right overlay using the same focus and nesting rules.
- `ToastProvider` / `useToast`: scoped notification state with info, success, warning, and error tones. Timers are cleared on unmount.

## Layout primitives

- `Stack`, `Row`, and `Grid` use tokenized gaps.
- `Divider` supports horizontal or vertical presentation.
- `ScrollArea` is a labeled, keyboard-focusable overflow region.
- `ApplicationShell` owns hidden/visible and inert behavior.
- `Header`, `Sidebar`, and `ContentPanel` form the application frame.
- `OverlayLayer` portals into `#pixel-overlays`; it is pointer-inert until an overlay exists.

## Example

```tsx
<Card title="Inventory action" eyebrow="Pixel Inventory">
  <Stack gap={3}>
    <Input label="Item label" value={label} onChange={onLabelChange} />
    <Row justify="end">
      <Button tone="neutral" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}>Save local draft</Button>
    </Row>
  </Stack>
</Card>
```

Server-authoritative actions must still travel through a resource-specific validated server path. A button click is never proof of permission, ownership, price, quantity, or durable state.
