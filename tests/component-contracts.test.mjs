import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('component library exposes required controls, layouts, and accessible semantics', async () => {
  const files = await Promise.all([
    'controls.tsx',
    'layout.tsx',
    'overlays.tsx',
    'data.tsx',
  ].map((file) => readFile(resolve(root, 'resources/pixel_ui/web/src/components', file), 'utf8')));
  const source = files.join('\n');
  const required = [
    'Button', 'IconButton', 'Input', 'Textarea', 'Select', 'Checkbox', 'Toggle',
    'Slider', 'Badge', 'Tooltip', 'Card', 'Tabs', 'Modal', 'ConfirmDialog', 'Dialog',
    'Drawer', 'DataTable', 'ContextMenu', 'ToastProvider', 'LoadingState',
    'EmptyState', 'ErrorState', 'Stack', 'Row', 'Grid', 'Divider', 'ScrollArea',
    'ApplicationShell', 'Header', 'Sidebar', 'ContentPanel', 'OverlayLayer',
  ];
  for (const name of required) {
    assert.match(source, new RegExp(`export (?:function|const|class) ${name}\\b`), `missing ${name}`);
  }
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /role="alertdialog"/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="menu"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /activateFocusTrap/);
  assert.match(source, /const stackRef = React\.useRef\(stack\)/);
  assert.match(source, /const isTopMost = React\.useCallback/);
  assert.match(source, /event\.stopPropagation\(\)/);
});

test('developer showcase uses every public component and remains runtime gated', async () => {
  const showcase = await readFile(resolve(root, 'resources/pixel_ui/web/src/Showcase.tsx'), 'utf8');
  const lua = await readFile(resolve(root, 'resources/pixel_ui/client.lua'), 'utf8');
  for (const component of [
    'Button', 'IconButton', 'Input', 'Textarea', 'Select', 'Checkbox', 'Toggle',
    'Slider', 'Badge', 'Tooltip', 'Card', 'Tabs', 'Modal', 'ConfirmDialog',
    'Drawer', 'DataTable', 'ContextMenu', 'LoadingState', 'EmptyState',
    'ErrorState', 'Stack', 'Row', 'Grid', 'Divider', 'ScrollArea', 'ContentPanel',
  ]) {
    assert.match(showcase, new RegExp(`<${component}\\b`), `showcase missing ${component}`);
  }
  assert.match(lua, /GetConvarInt\('pixel_ui_showcase', 0\) == 1/);
  assert.match(lua, /RegisterCommand\('pixel_ui_showcase'/);
  assert.match(lua, /if not showcaseEnabled then/);
});
