import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const here = dirname(currentFile);
const root = resolve(here, '..');
const input = resolve(root, 'design/tokens/pixel.tokens.json');
const output = resolve(root, 'resources/pixel_ui/web/src/styles/tokens.css');

export function renderTokenCss(tokens) {
  const lines = [':root {'];

  const walk = (node, path = []) => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue;

      if (value && typeof value === 'object' && '$value' in value) {
        lines.push(`  --pixel-${[...path, key].join('-')}: ${value.$value};`);
      } else if (value && typeof value === 'object') {
        walk(value, [...path, key]);
      }
    }
  };

  walk(tokens);
  lines.push('}', '');
  return lines.join('\n');
}

export async function generateTokens() {
  const tokens = JSON.parse(await readFile(input, 'utf8'));
  await writeFile(output, renderTokenCss(tokens));
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  const generatedPath = await generateTokens();
  console.log(`Generated ${generatedPath}`);
}
