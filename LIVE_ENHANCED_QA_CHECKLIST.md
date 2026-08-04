# Pixel Network Foundation v0.2.1 — Live FiveM Enhanced QA Checklist

This is the remaining release gate. Perform it on a development Enhanced server, not the production server.

## 1. Install

Copy these folders into the development server resources directory:

```text
resources/pixel_core
resources/pixel_ui
```

Place the development-only convars before the resource starts:

```cfg
setr pixel_diagnostics 1
setr pixel_ui_showcase 1

ensure pixel_core
ensure pixel_ui
```

`pixel_core` must start before `pixel_ui`.

## 2. Startup checks

- Start/restart the server.
- Confirm both resources report `started` with no manifest, Lua, NUI, CSP, or missing-file errors.
- Join and inspect the F8 console for JavaScript or callback errors.
- Confirm the UI is invisible and does not capture keyboard or mouse input before an explicit open.
- Confirm `exports.pixel_core:AreCapabilitiesReady()` becomes true from a temporary client test resource.
- Confirm `GetCapabilities()` reports `core = 0.2.1`, `ui = 0.2.1`, and `platform = fivem-enhanced`.

## 3. Showcase and component pass

Run:

```text
pixel_ui_showcase
```

Verify:

- the Pixel shell opens once with no duplicate panel;
- mouse and keyboard focus enter the NUI;
- every control renders without missing styles;
- inputs, select, checkbox, toggle, slider, tabs, table, menu, tooltips, modal, confirm dialog, drawer, toasts, loading, empty, and error states behave;
- Tab and Shift+Tab cycle correctly inside overlays;
- nested Escape closes only the top overlay;
- the final Escape closes the shell;
- the FiveM pause menu does not open unexpectedly or remain stuck;
- cursor and keyboard control return to the game after closing.

Also close with:

```text
pixel_ui_showcase_close
```

## 4. Repeated lifecycle checks

Repeat open/close at least 20 times:

- open with `pixel_ui_showcase`;
- close by button;
- close by Escape;
- close by `pixel_ui_showcase_close`;
- confirm no growing callback count, duplicate UI, stuck cursor, or console spam.

## 5. Resource restart checks

While the showcase is open:

1. `restart pixel_ui`
2. Confirm focus/cursor immediately release.
3. Confirm the interface stays hidden after restart until explicitly opened.
4. Open it again and verify normal behavior.
5. `restart pixel_core`
6. Confirm the client reacquires a valid capability snapshot without a permanent not-ready state.

## 6. Multi-owner stack

Use the optional development snippet in `qa/multi-owner-client-snippet.lua` inside a temporary client-only resource.

Run:

```text
pixelqa_a
pixelqa_b
pixelqa_state
pixelqa_release_b
pixelqa_state
```

Expected:

- owner B becomes active after `pixelqa_b`;
- owner B requests no focus/cursor;
- releasing B restores owner A and its focus/cursor state;
- acquiring A twice with the same values does not increase the revision;
- releasing a non-top owner does not disturb the active owner;
- `pixelqa_closeall` releases everything;
- stopping the temporary QA resource automatically removes its prefixed owners.

Remove the temporary QA resource after testing.

## 7. Diagnostics/privacy checks

- With `pixel_diagnostics 1`, verify debug diagnostics appear only during meaningful actions, not in a loop.
- Send a development diagnostic containing `authorization`, `token`, `auth`, `pwd`, `api-key`, and `pin`; confirm all values display as `[REDACTED]`.
- Send oversized strings/tables from a temporary test resource; confirm output is truncated and the client remains responsive.
- Set `pixel_diagnostics 0`, restart the resources, and confirm debug diagnostics stop.

## 8. Performance observation

Record client and server resource usage while:

- idle and hidden;
- showcase open;
- modal/menu interactions active;
- repeatedly opening/closing.

Do not publish exact performance claims unless measured on the actual target build and hardware.

## 9. Pass criteria

The foundation passes live QA only when:

- no resource/F8 errors remain;
- no invisible overlay captures input;
- no cursor/focus lock remains after close or restart;
- Escape behavior is acceptable with the pause menu;
- ownership restoration and resource-stop cleanup work;
- capabilities recover after resource restart;
- diagnostics redact and truncate correctly;
- no permanent loops or escalating resource usage are observed.

After passing, remove or disable both development convars before production use.
