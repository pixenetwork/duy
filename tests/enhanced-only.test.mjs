import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'vendor') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && ['.lua', '.ts', '.tsx', '.json'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

test('active runtime and configuration remain Enhanced-only', async () => {
  const files = [
    ...await walk(resolve(root, 'resources')),
  ];
  const forbidden = [
    /\bESX\b/i,
    /\bQBCore\b/i,
    /\bqb-core\b/i,
    /\bpma[-_]voice\b/i,
    /\bMumble\b/i,
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${relative(root, file)} contains ${pattern}`);
    }
  }
});
