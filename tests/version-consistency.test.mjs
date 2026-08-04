import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('root, resource manifests, and UI package share the release version', async () => {
  const root = resolve(import.meta.dirname, '..');
  const rootPackage = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const uiPackage = JSON.parse(await readFile(resolve(root, 'resources/pixel_ui/web/package.json'), 'utf8'));
  const coreManifest = await readFile(resolve(root, 'resources/pixel_core/fxmanifest.lua'), 'utf8');
  const uiManifest = await readFile(resolve(root, 'resources/pixel_ui/fxmanifest.lua'), 'utf8');

  const readManifestVersion = (text) => text.match(/(?:^|\n)\s*version\s+['"]([^'"]+)['"]/)?.[1];
  assert.equal(uiPackage.version, rootPackage.version);
  assert.equal(readManifestVersion(coreManifest), rootPackage.version);
  assert.equal(readManifestVersion(uiManifest), rootPackage.version);
});
