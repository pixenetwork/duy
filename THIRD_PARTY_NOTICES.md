# Third-Party Notices

## React runtime

`pixel_ui` vendors production module factories for React 18.2.0, ReactDOM
18.2.0, and Scheduler so the FiveM NUI runtime has no CDN dependency.

Copyright Meta Platforms, Inc. and affiliates.

License: MIT. The complete license text is included at:

```text
resources/pixel_ui/web/vendor/react-18.2.0/LICENSE.txt
```

The module factories were extracted from a JupyterLab production distribution,
not from an official standalone React UMD package. The extracted files include
license-sidecar references rather than complete inline copyright banners; the
full React MIT license is shipped separately at the path above.

Pixel Network records the source packaging assumption, module IDs, internal
React alias, and SHA-256 checksums in:

```text
resources/pixel_ui/web/vendor/react-18.2.0/runtime-manifest.json
```

The deterministic build validates that manifest before wrapping the modules in
a small local loader and combining them with Pixel's compiled TypeScript UI.
