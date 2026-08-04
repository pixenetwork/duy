# Build, Test, and Validation

## Prerequisites

- Node.js supported by TypeScript 5.8.3
- npm
- Python plus a Lua 5.4 shared library, or `luac` 5.4

Install the pinned UI compiler:

```bash
npm --prefix resources/pixel_ui/web ci
```

## Complete verification

```bash
npm run verify
```

The command generates CSS tokens, performs strict TypeScript checking, creates a transactional deterministic production build, runs behavioral/static tests against that build, validates manifests/Lua/tokens/content hashes/vendor files/artifacts/release documents, and scans active runtime code for prohibited compatibility dependencies.

## Individual commands

```bash
npm run tokens
npm run test
npm run ui:typecheck
npm run ui:build
npm run validate
```

Set `PIXEL_PYTHON` to an explicit Python executable when Windows application aliases interfere with discovery.

## Determinism check

Run `npm run ui:build` twice and hash every file under `resources/pixel_ui/web/dist`. The two sorted hash sets must match byte-for-byte. The builder compiles into temporary locations, validates the pinned TypeScript and vendored React inputs, writes content-hashed assets, and atomically swaps `dist` only after the full build succeeds. A failed typecheck leaves the last known-good runtime bundle untouched.

## Release packaging

- Include `resources/pixel_ui/web/dist`.
- Exclude every `node_modules` and temporary `.build` directory.
- Include root and resource changelogs, licenses, reports, and known limitations.
- Keep the release ZIP under one `Pixel-Network-Foundation-v0.2.1/` root.


## Compiler and vendor guarantees

- `tools/build-ui.mjs` accepts only the exact TypeScript version pinned in `resources/pixel_ui/web/package.json` and `package-lock.json`.
- `PIXEL_TSC` may point to that exact compiler when the local `node_modules/.bin/tsc` is unavailable.
- `vendor/react-18.2.0/runtime-manifest.json` records the extracted module IDs and SHA-256 checksums used by the local React loader.
- Validation recomputes asset hashes from bytes and verifies that every shipped `web/dist` file is covered by `fxmanifest.lua` `files {}`.
