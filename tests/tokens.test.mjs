import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderTokenCss } from '../tools/generate-tokens.mjs';

test('token generator emits every leaf token and is deterministic', async () => {
  const root = resolve(import.meta.dirname, '..');
  const tokens = JSON.parse(await readFile(resolve(root, 'design/tokens/pixel.tokens.json'), 'utf8'));
  const first = renderTokenCss(tokens);
  const second = renderTokenCss(tokens);

  assert.equal(first, second);
  assert.match(first, /--pixel-color-electricBlue: #29A8FF;/);
  assert.match(first, /--pixel-radius-orbital: 24px;/);
  assert.match(first, /--pixel-motion-application: 300ms;/);
  assert.match(first, /--pixel-space-6: 24px;/);
  assert.match(first, /--pixel-font-body: Inter, Geist, system-ui, sans-serif;/);
  assert.match(first, /--pixel-elevation-overlay: 0 24px 90px rgba\(0, 0, 0, 0\.62\);/);
  assert.match(first, /--pixel-layer-toast: 200;/);
});
