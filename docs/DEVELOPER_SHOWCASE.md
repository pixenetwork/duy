# Developer Showcase

The showcase renders every v0.2.1 component and layout primitive using the production library.

## FiveM development mode

Add this only to a development configuration:

```cfg
setr pixel_ui_showcase 1
setr pixel_diagnostics 1
```

Then run:

```text
pixel_ui_showcase
```

Close with the UI close control, Escape when no overlay is open, or:

```text
pixel_ui_showcase_close
```

With the convar omitted or set to `0`, the open command is rejected. The showcase exposes no currency, item, permission, ownership, or durable-state mutation.

## Browser mode

Build the UI and serve `resources/pixel_ui/web/dist` from a local static server. When the FiveM-only `GetParentResourceName` function is absent, browser-safe callback mocks are installed and the showcase opens. Lua events can be exercised with a versioned `window.postMessage` envelope.

Browser mode proves DOM/component behavior only. It does not prove FiveM focus, cursor, callback transport, or Enhanced runtime behavior.
