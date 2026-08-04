import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const here = dirname(currentFile);
const root = resolve(here, '..');
const webRoot = resolve(root, 'resources/pixel_ui/web');

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (['dist', 'node_modules', '.build', '.dist-staging', '.dist-backup'].includes(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }

  return files;
}

export async function computeUiSourceHash() {
  const sourceFiles = await walkFiles(webRoot);
  sourceFiles.push(resolve(root, 'design/tokens/pixel.tokens.json'));
  sourceFiles.push(resolve(root, 'tools/generate-tokens.mjs'));
  sourceFiles.push(resolve(root, 'tools/build-ui.mjs'));

  const uniqueFiles = [...new Set(sourceFiles)].sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');

  for (const file of uniqueFiles) {
    hash.update(relative(root, file).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(await readFile(file));
    hash.update('\0');
  }

  return hash.digest('hex');
}
