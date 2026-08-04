import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const runner = resolve(root, 'tools/run-lua-tests.py');
const cases = [
  'core-server-readiness.lua',
  'core-client-readiness.lua',
  'core-client-bounded-failure.lua',
  'diagnostics-behavior.lua',
];

function pythonCandidates() {
  if (process.platform === 'win32') {
    return [
      ...(process.env.PIXEL_PYTHON ? [[process.env.PIXEL_PYTHON]] : []),
      ['python'],
      ['py', '-3'],
    ];
  }
  return [
    ...(process.env.PIXEL_PYTHON ? [[process.env.PIXEL_PYTHON]] : []),
    ['python3'],
    ['python'],
  ];
}

for (const file of cases) {
  test(`Lua behavior: ${file}`, () => {
    const path = resolve(root, 'tests/lua', file);
    let attempted = false;
    for (const [command, ...prefix] of pythonCandidates()) {
      const result = spawnSync(command, [...prefix, runner, path], { encoding: 'utf8' });
      if (result.error?.code === 'ENOENT') continue;
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      if (result.status === 2 && /Lua 5\.4 library was not found|Python was not found/i.test(output)) continue;
      attempted = true;
      assert.equal(result.status, 0, output);
      assert.match(result.stdout, /PASS/);
      break;
    }
    assert.equal(attempted, true, 'No Python + Lua 5.4 test runtime was available');
  });
}
