# Vendored React runtime

This directory contains the React 18.2.0, ReactDOM 18.2.0, and Scheduler
production modules used by the `pixel_ui` deterministic NUI build.

The module chunks were extracted from a JupyterLab production distribution
available in the original build environment and are redistributed under the
React MIT license included here. The chunks contain webpack module factories,
not official standalone UMD files.

`runtime-manifest.json` records:

- SHA-256 checksums for every vendored file;
- the webpack queue global used by the extracted chunks;
- the React and ReactDOM module IDs;
- the React alias requested internally by the extracted ReactDOM chunk.

The alias `44914 -> 96540` is required because the extracted ReactDOM factory
requests React as module `44914`, while the accompanying React factory is
stored as module `96540` in this JupyterLab build. The deterministic builder and
runtime test both consume the manifest rather than duplicating these IDs.

The modules are never loaded from a CDN. `tools/build-ui.mjs` validates their
checksums, wraps them with Pixel's small local loader, and combines them with
the TypeScript-generated application code.

Replacing any vendored file requires updating `runtime-manifest.json`, running
the React runtime test, rebuilding `dist`, and completing release validation.
