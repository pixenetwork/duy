# Pixel Network Foundation v0.2.1 — Accessibility Review

## Verdict

The component library has a documented and tested accessibility baseline. No WCAG certification is claimed.

## Confirmed in source/tests

- Native form controls and visible labels.
- Required accessible names for icon-only buttons.
- Table caption/headers and labeled scroll regions.
- Tab, menu, dialog, alertdialog, switch, status, alert, and tooltip semantics.
- Roving keyboard navigation for tabs and menus.
- Focus trap, Shift+Tab/Tab wrap, focus restoration, and top-most Escape behavior.
- Modal nesting through a scoped overlay stack.
- Visible focus treatment and native disabled behavior.
- Hidden shell is invisible, pointer-inert, `aria-hidden`, and inert.
- Toast live region and text labels alongside status colors.
- Reduced-motion media query.

## Visual review scope

The showcase preserves the approved obsidian, chrome, electric-blue, and violet direction. Text uses chrome/white or muted tokens over dark opaque surfaces; warning, success, and danger states include text or symbols. The UI was browser-rendered and inspected, but no independent contrast laboratory or assistive-technology matrix was available.

## Not verified

- Screen-reader behavior in the FiveM embedded browser.
- Controller navigation.
- FiveM pause-menu interaction with Escape.
- High zoom and every in-game safe-area/resolution combination.
- Independent WCAG conformance.

See `docs/ACCESSIBILITY.md` for consumer rules and the manual staging checklist.
