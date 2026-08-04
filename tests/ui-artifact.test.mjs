import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { computeUiSourceHash } from '../tools/write-ui-build-metadata.mjs';

test('shipped UI artifact matches current React and TypeScript source', async () => {
  const root = resolve(import.meta.dirname, '..');
  const web = resolve(root, 'resources/pixel_ui/web');
  const metadata = JSON.parse(await readFile(resolve(web, 'dist/pixel-build.json'), 'utf8'));
  const index = await readFile(resolve(web, 'dist/index.html'), 'utf8');
  const bundle = await readFile(resolve(web, 'dist', metadata.assets.javascript), 'utf8');
  const css = await readFile(resolve(web, 'dist', metadata.assets.stylesheet), 'utf8');

  assert.equal(metadata.sourceHash, await computeUiSourceHash());
  assert.equal(metadata.toolchain.builder, 'pixel-deterministic-ui-builder');
  assert.equal(metadata.toolchain.react, '18.2.0');
  assert.match(index, /Content-Security-Policy/);
  assert.match(index, new RegExp(metadata.assets.javascript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(index, new RegExp(metadata.assets.stylesheet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(bundle.length > 100000);
  assert.match(bundle, /React 18\.2\.0 runtime/);
  assert.match(bundle, /PixelUI/);
  assert.match(bundle, /pixel\.ui\.state/);
  assert.match(bundle, /pixel:ui:bridge/);
  assert.match(bundle, /Pixel UI Kit/);
  assert.match(css, /--pixel-color-electricBlue: #29A8FF;/);
  assert.doesNotMatch(css, /var\(--pixel-(?:chrome|panel|blue|radius-sm|white-core)\)/);
});
