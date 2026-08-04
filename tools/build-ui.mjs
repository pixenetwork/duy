import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { computeUiSourceHash } from './write-ui-build-metadata.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const webRoot = resolve(root, 'resources/pixel_ui/web');
const buildRoot = resolve(webRoot, '.build');
const distRoot = resolve(webRoot, 'dist');
const stagingRoot = resolve(webRoot, '.dist-staging');
const backupRoot = resolve(webRoot, '.dist-backup');
const stagingAssetsRoot = resolve(stagingRoot, 'assets');

function runVersion(command) {
  const result = spawnSync(command, ['--version'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) return null;
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  return text.match(/(?:Version\s+)?(\d+\.\d+\.\d+)/i)?.[1] ?? null;
}

function resolveTsc(expectedVersion) {
  const local = resolve(webRoot, 'node_modules/.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  const candidates = [process.env.PIXEL_TSC, local, 'tsc'].filter(Boolean);
  for (const candidate of candidates) {
    const version = runVersion(candidate);
    if (version === null) continue;
    if (version !== expectedVersion) {
      throw new Error(
        `TypeScript ${expectedVersion} is required, but ${candidate} reports ${version}. `
        + 'Run `npm ci` in resources/pixel_ui/web or set PIXEL_TSC to the pinned compiler.',
      );
    }
    return { command: candidate, version };
  }
  throw new Error(
    `TypeScript ${expectedVersion} was not found. `
    + 'Run `npm ci` in resources/pixel_ui/web or set PIXEL_TSC to the pinned compiler.',
  );
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function shortHash(content) {
  return sha256(content).slice(0, 12);
}

function normalizeCss(css) {
  return css
    .replace(/^@import\s+['"]\.\/tokens\.css['"];?\s*/m, '')
    .trim();
}

async function readAndVerifyVendor(vendorRoot, entry, label) {
  if (typeof entry?.path !== 'string' || typeof entry?.sha256 !== 'string') {
    throw new Error(`Invalid vendored runtime manifest entry: ${label}`);
  }
  const content = await readFile(resolve(vendorRoot, entry.path));
  const actualHash = sha256(content);
  if (actualHash !== entry.sha256) {
    throw new Error(`Vendored runtime checksum mismatch for ${entry.path}`);
  }
  return content.toString('utf8');
}

async function replaceDistAtomically() {
  await rm(backupRoot, { recursive: true, force: true });
  let hadExistingDist = false;
  try {
    await rename(distRoot, backupRoot);
    hadExistingDist = true;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  try {
    await rename(stagingRoot, distRoot);
    if (hadExistingDist) await rm(backupRoot, { recursive: true, force: true });
  } catch (error) {
    if (hadExistingDist) {
      await rm(distRoot, { recursive: true, force: true });
      await rename(backupRoot, distRoot);
    }
    throw error;
  }
}

const packageJson = JSON.parse(await readFile(resolve(webRoot, 'package.json'), 'utf8'));
const expectedTypeScript = packageJson.devDependencies?.typescript;
if (typeof expectedTypeScript !== 'string') {
  throw new Error('resources/pixel_ui/web/package.json must pin TypeScript exactly');
}
const tsc = resolveTsc(expectedTypeScript);

// Compile first. A failed typecheck must never delete the last known-good runtime bundle.
await rm(buildRoot, { recursive: true, force: true });
const typecheck = spawnSync(tsc.command, ['--project', resolve(webRoot, 'tsconfig.json')], {
  cwd: webRoot,
  encoding: 'utf8',
  shell: process.platform === 'win32',
});
if (typecheck.status !== 0) {
  process.stderr.write(typecheck.stdout ?? '');
  process.stderr.write(typecheck.stderr ?? '');
  await rm(buildRoot, { recursive: true, force: true });
  process.exit(typecheck.status ?? 1);
}

await rm(stagingRoot, { recursive: true, force: true });
await mkdir(stagingAssetsRoot, { recursive: true });

try {
  const vendorRoot = resolve(webRoot, 'vendor/react-18.2.0');
  const runtimeManifest = JSON.parse(await readFile(resolve(vendorRoot, 'runtime-manifest.json'), 'utf8'));
  if (runtimeManifest.schema !== 1 || runtimeManifest.reactVersion !== '18.2.0') {
    throw new Error('Unsupported vendored React runtime manifest');
  }

  const reactChunk = await readAndVerifyVendor(vendorRoot, runtimeManifest.files?.react, 'react');
  const reactDomChunk = await readAndVerifyVendor(vendorRoot, runtimeManifest.files?.reactDom, 'reactDom');
  await readAndVerifyVendor(vendorRoot, runtimeManifest.files?.license, 'license');
  const appCode = await readFile(resolve(buildRoot, 'pixel-app.js'), 'utf8');

  const reactModuleId = runtimeManifest.modules?.react;
  const reactAliasId = runtimeManifest.modules?.reactAlias;
  const reactDomModuleId = runtimeManifest.modules?.reactDom;
  if (![reactModuleId, reactAliasId, reactDomModuleId].every(Number.isInteger)) {
    throw new Error('Vendored React runtime manifest has invalid module IDs');
  }

  const runtimeLoader = `
;(function bootstrapPixelReactRuntime(globalObject) {
  'use strict';
  const queueName = ${JSON.stringify(runtimeManifest.webpackGlobal)};
  const queue = globalObject[queueName] || [];
  const modules = Object.assign({}, ...queue.map((entry) => entry[1]));
  const cache = Object.create(null);
  const aliases = { ${JSON.stringify(String(reactAliasId))}: ${reactModuleId} };

  function pixelRequire(requestedId) {
    // The extracted ReactDOM chunk requests the alias recorded in runtime-manifest.json.
    const moduleId = aliases[requestedId] || requestedId;
    if (cache[moduleId]) return cache[moduleId].exports;
    const factory = modules[moduleId];
    if (typeof factory !== 'function') throw new Error('Missing vendored React module ' + moduleId);
    const module = { exports: {} };
    cache[moduleId] = module;
    factory(module, module.exports, pixelRequire);
    return module.exports;
  }

  globalObject.React = pixelRequire(${reactModuleId});
  globalObject.ReactDOM = pixelRequire(${reactDomModuleId});
  delete globalObject[queueName];
})(globalThis);
`;

  const bundle = [
    `/*! Pixel UI v${packageJson.version} | React ${runtimeManifest.reactVersion} runtime | Enhanced-only */`,
    reactChunk,
    reactDomChunk,
    runtimeLoader,
    appCode,
  ].join('\n');

  const cssParts = await Promise.all([
    readFile(resolve(webRoot, 'src/styles/tokens.css'), 'utf8'),
    readFile(resolve(webRoot, 'src/styles/global.css'), 'utf8'),
    readFile(resolve(webRoot, 'src/components/pixel-button.css'), 'utf8'),
    readFile(resolve(webRoot, 'src/styles/components.css'), 'utf8'),
    readFile(resolve(webRoot, 'src/styles/layout.css'), 'utf8'),
    readFile(resolve(webRoot, 'src/styles/overlays.css'), 'utf8'),
  ]);
  const cssBundle = `${cssParts.map(normalizeCss).join('\n\n')}\n`;

  const jsAsset = `assets/index-${shortHash(bundle)}.js`;
  const cssAsset = `assets/index-${shortHash(cssBundle)}.css`;
  await writeFile(resolve(stagingRoot, jsAsset), bundle);
  await writeFile(resolve(stagingRoot, cssAsset), cssBundle);

  const htmlTemplate = await readFile(resolve(webRoot, 'index.html'), 'utf8');
  const html = htmlTemplate
    .replace('__PIXEL_CSS_ASSET__', cssAsset)
    .replace('__PIXEL_JS_ASSET__', jsAsset);
  await writeFile(resolve(stagingRoot, 'index.html'), html);

  const metadata = {
    schema: 1,
    resource: 'pixel_ui',
    version: packageJson.version,
    sourceHash: await computeUiSourceHash(),
    toolchain: {
      builder: 'pixel-deterministic-ui-builder',
      typescript: tsc.version,
      react: runtimeManifest.reactVersion,
    },
    vendorManifest: 'vendor/react-18.2.0/runtime-manifest.json',
    assets: { javascript: jsAsset, stylesheet: cssAsset },
  };
  await writeFile(resolve(stagingRoot, 'pixel-build.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  await replaceDistAtomically();
  console.log(`Built pixel_ui: ${jsAsset}, ${cssAsset}`);
} finally {
  await rm(buildRoot, { recursive: true, force: true });
  await rm(stagingRoot, { recursive: true, force: true });
}
