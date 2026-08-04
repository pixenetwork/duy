# Pixel UI Accessibility Guide

The v0.2.1 UI kit provides an accessibility baseline; it is not a claim of independent WCAG certification.

## Implemented behavior

- Native buttons, inputs, labels, select, checkbox, range, table, and output elements.
- Required accessible label for `IconButton`.
- Dialog names/descriptions, `aria-modal`, and `alertdialog` for confirmation.
- Focus trap and focus restoration for modal, dialog, and drawer.
- Only the top-most nested overlay handles Escape.
- Tab roles with roving focus and Left/Right/Home/End controls.
- Menu roles with Arrow Up/Down/Home/End and Escape controls.
- Visible `:focus-visible` treatment.
- Disabled native controls.
- Hidden application shell uses visibility, pointer-event blocking, `aria-hidden`, and `inert`.
- Toast live region and error alert state.
- Reduced-motion media query collapses animation and transition durations.
- Text accompanies every status color.

## Consumer requirements

- Supply concise visible labels and useful error text.
- Never use an icon alone without an accessible name.
- Keep heading levels logical inside the host application.
- Do not place focusable content behind a modal.
- Test at the intended in-game resolution and UI scale.
- Preserve keyboard behavior when composing components.
- Provide non-color status text.

## Manual test checklist

1. Open with keyboard focus on the trigger.
2. Confirm focus enters the overlay.
3. Tab and Shift+Tab through every enabled control.
4. Open a nested dialog; Escape closes only the top dialog.
5. Close the parent and confirm focus returns to the original trigger.
6. Navigate tabs and menus using documented keys.
7. Enable operating-system reduced motion.
8. Check high-risk text/background pairs with a contrast tool.
9. Verify no hidden shell or empty overlay captures pointer input.

Live FiveM pause-menu interaction and controller navigation are untested in this environment.
