import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTokenCss } from './generate-tokens.mjs';
import { computeUiSourceHash } from './write-ui-build-metadata.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const resourcesRoot = resolve(projectRoot, 'resources');
let failed = false;

function fail(message) {
  console.error(message);
  failed = true;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walkFiles(directory, predicate = () => true) {
  if (!await exists(directory)) return [];
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(absolute, predicate));
    else if (entry.isFile() && predicate(absolute)) files.push(absolute);
  }

  return files;
}

function extractManifestReferences(manifest) {
  const references = new Set();
  const singular = /(?:client_script|server_script|shared_script|ui_page|file)\s+(['"])([^'"]+)\1/g;
  const blocks = /(?:client_scripts|server_scripts|shared_scripts|files)\s*\{([\s\S]*?)\}/g;

  for (const match of manifest.matchAll(singular)) references.add(match[2]);
  for (const block of manifest.matchAll(blocks)) {
    for (const match of block[1].matchAll(/(['"])([^'"]+)\1/g)) references.add(match[2]);
  }

  return [...references];
}

function extractManifestFileReferences(manifest) {
  const references = new Set();
  for (const match of manifest.matchAll(/\bfile\s+(['"])([^'"]+)\1/g)) references.add(match[2]);
  for (const block of manifest.matchAll(/\bfiles\s*\{([\s\S]*?)\}/g)) {
    for (const match of block[1].matchAll(/(['"])([^'"]+)\1/g)) references.add(match[2]);
  }
  return [...references];
}

function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`);
}

function manifestReferenceCovers(reference, path) {
  const normalizedReference = reference.replaceAll('\\', '/');
  const normalizedPath = path.replaceAll('\\', '/');
  return normalizedReference.includes('*')
    ? wildcardToRegExp(normalizedReference).test(normalizedPath)
    : normalizedReference === normalizedPath;
}

async function manifestReferenceExists(resourcePath, reference) {
  if (!reference.includes('*')) return exists(join(resourcePath, reference));

  const normalized = reference.replaceAll('\\', '/');
  const slash = normalized.lastIndexOf('/');
  const directory = slash >= 0 ? normalized.slice(0, slash) : '.';
  const pattern = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const directoryPath = join(resourcePath, directory);

  if (!await exists(directoryPath)) return false;
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const matcher = wildcardToRegExp(pattern);
  return entries.some((entry) => entry.isFile() && matcher.test(entry.name));
}

async function validateManifestCoverage(resourcePath, resourceName, manifest) {
  const distRoot = join(resourcePath, 'web/dist');
  if (!await exists(distRoot)) return;

  const fileReferences = extractManifestFileReferences(manifest);
  const distFiles = await walkFiles(distRoot);
  for (const file of distFiles) {
    const resourceRelative = relative(resourcePath, file).replaceAll('\\', '/');
    if (!fileReferences.some((reference) => manifestReferenceCovers(reference, resourceRelative))) {
      fail(`${resourceName}: shipped runtime file is not covered by files {}: ${resourceRelative}`);
    }
  }
}

async function validateLuaFiles(resourcePath, resourceName) {
  const luaFiles = await walkFiles(resourcePath, (file) => file.endsWith('.lua'));
  if (luaFiles.length === 0) return;

  for (const file of luaFiles) {
    const source = await readFile(file, 'utf8');
    const display = `${resourceName}/${relative(resourcePath, file).replaceAll('\\', '/')}`;
    if (/\bObject\.freeze\b/.test(source)) fail(`${display}: JavaScript Object.freeze is invalid in Pixel Lua code`);
  }

  const configuredPython = process.env.PIXEL_PYTHON;
  const candidates = process.platform === 'win32'
    ? [
        { command: 'luac5.4', prefix: ['-p'] },
        { command: 'luac54', prefix: ['-p'] },
        { command: 'luac', prefix: ['-p'] },
        ...(configuredPython ? [{ command: configuredPython, prefix: [resolve(projectRoot, 'tools/validate-lua.py')] }] : []),
        { command: 'python', prefix: [resolve(projectRoot, 'tools/validate-lua.py')] },
        { command: 'py', prefix: ['-3', resolve(projectRoot, 'tools/validate-lua.py')] },
      ]
    : [
        { command: 'luac5.4', prefix: ['-p'] },
        { command: 'luac', prefix: ['-p'] },
        { command: 'python3', prefix: [resolve(projectRoot, 'tools/validate-lua.py')] },
        { command: 'python', prefix: [resolve(projectRoot, 'tools/validate-lua.py')] },
      ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, ...luaFiles], { encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') continue;
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
    if (result.status !== 0 && /Python was not found|Lua 5\.4 library was not found/i.test(output)) continue;
    if (result.status !== 0) {
      fail(`${resourceName}: Lua 5.4 syntax validation failed: ${(result.stderr || result.stdout || 'unknown error').trim()}`);
    }
    return;
  }

  fail(`${resourceName}: no Lua 5.4 syntax validator found (install luac 5.4 or Python with liblua5.4)`);
}

async function validateTokens() {
  const tokenJsonPath = resolve(projectRoot, 'design/tokens/pixel.tokens.json');
  const tokenCssPath = resolve(projectRoot, 'resources/pixel_ui/web/src/styles/tokens.css');
  const tokens = JSON.parse(await readFile(tokenJsonPath, 'utf8'));
  const expected = renderTokenCss(tokens);
  const actual = await readFile(tokenCssPath, 'utf8');

  if (actual !== expected) fail('pixel_ui: generated tokens.css differs from pixel.tokens.json');

  const cssRoot = resolve(projectRoot, 'resources/pixel_ui/web/src');
  const cssFiles = await walkFiles(cssRoot, (file) => file.endsWith('.css'));
  const definitions = new Set();
  const uses = new Map();

  for (const file of cssFiles) {
    const css = await readFile(file, 'utf8');
    for (const match of css.matchAll(/--(pixel-[\w-]+)\s*:/g)) definitions.add(match[1]);
    for (const match of css.matchAll(/var\(--(pixel-[\w-]+)/g)) {
      if (!uses.has(match[1])) uses.set(match[1], []);
      uses.get(match[1]).push(relative(projectRoot, file).replaceAll('\\', '/'));
    }
  }

  for (const [variable, files] of uses) {
    if (!definitions.has(variable)) fail(`pixel_ui: undefined CSS token --${variable} used in ${[...new Set(files)].join(', ')}`);
  }
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function validateVendorRuntime(webRoot) {
  const vendorRoot = resolve(webRoot, 'vendor/react-18.2.0');
  const manifestPath = resolve(vendorRoot, 'runtime-manifest.json');
  if (!await exists(manifestPath)) {
    fail('pixel_ui: missing vendored React runtime-manifest.json');
    return;
  }

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema !== 1 || manifest.reactVersion !== '18.2.0') {
    fail('pixel_ui: invalid vendored React runtime manifest');
  }
  for (const [label, entry] of Object.entries(manifest.files ?? {})) {
    if (typeof entry?.path !== 'string' || typeof entry?.sha256 !== 'string') {
      fail(`pixel_ui: invalid vendored runtime file record for ${label}`);
      continue;
    }
    const file = resolve(vendorRoot, entry.path);
    if (!await exists(file)) {
      fail(`pixel_ui: missing vendored runtime file ${entry.path}`);
      continue;
    }
    const actual = sha256(await readFile(file));
    if (actual !== entry.sha256) fail(`pixel_ui: vendored runtime checksum mismatch for ${entry.path}`);
  }
  for (const key of ['react', 'reactAlias', 'reactDom']) {
    if (!Number.isInteger(manifest.modules?.[key])) fail(`pixel_ui: vendored runtime manifest is missing module id ${key}`);
  }
}

async function validateUiArtifact() {
  const webRoot = resolve(projectRoot, 'resources/pixel_ui/web');
  const lockfile = resolve(webRoot, 'package-lock.json');
  if (!await exists(lockfile)) {
    fail('pixel_ui: missing package-lock.json');
  } else {
    const packageJson = JSON.parse(await readFile(resolve(webRoot, 'package.json'), 'utf8'));
    const lock = JSON.parse(await readFile(lockfile, 'utf8'));
    if (lock.lockfileVersion !== 3) fail('pixel_ui: package-lock.json must use lockfileVersion 3');
    if (lock.packages?.['']?.version !== packageJson.version) fail('pixel_ui: lockfile root version differs from package.json');
    for (const [name, version] of Object.entries(packageJson.devDependencies ?? {})) {
      const lockedPackage = lock.packages?.[`node_modules/${name}`];
      if (lockedPackage?.version !== version) fail(`pixel_ui: lockfile does not pin ${name}@${version}`);
      if (!lockedPackage?.resolved || !lockedPackage?.integrity) {
        fail(`pixel_ui: lockfile is missing resolved/integrity metadata for ${name}`);
      }
    }
  }

  await validateVendorRuntime(webRoot);

  const sourceIndexPath = resolve(webRoot, 'index.html');
  if (!await exists(sourceIndexPath)) {
    fail('pixel_ui: missing source index.html');
    return;
  }
  const sourceIndex = await readFile(sourceIndexPath, 'utf8');
  if (!/Content-Security-Policy/i.test(sourceIndex)) fail('pixel_ui: source index.html is missing a Content-Security-Policy');

  const metadataPath = resolve(webRoot, 'dist/pixel-build.json');
  if (!await exists(metadataPath)) {
    fail('pixel_ui: missing dist/pixel-build.json');
    return;
  }

  const distIndexPath = resolve(webRoot, 'dist/index.html');
  if (!await exists(distIndexPath)) {
    fail('pixel_ui: missing dist/index.html');
    return;
  }

  let metadata;
  try {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  } catch (error) {
    fail(`pixel_ui: invalid dist/pixel-build.json: ${error.message}`);
    return;
  }

  const expectedHash = await computeUiSourceHash();
  if (metadata.sourceHash !== expectedHash) fail('pixel_ui: dist was not built from the current shipped source');

  const packageJson = JSON.parse(await readFile(resolve(webRoot, 'package.json'), 'utf8'));
  if (metadata.version !== packageJson.version) fail('pixel_ui: build metadata version differs from package.json');

  const distIndex = await readFile(distIndexPath, 'utf8');
  const assetReferences = [...distIndex.matchAll(/(?:src|href)="\.\/(assets\/[^"?#]+)"/g)].map((match) => match[1]);
  if (assetReferences.length === 0) fail('pixel_ui: dist/index.html does not reference built assets');

  for (const asset of assetReferences) {
    const filenameMatch = asset.match(/-([a-f0-9]{12})\.(?:js|css)$/i);
    if (!filenameMatch) {
      fail(`pixel_ui: expected content-hashed production asset, found ${asset}`);
      continue;
    }
    const assetPath = resolve(webRoot, 'dist', asset);
    if (!await exists(assetPath)) {
      fail(`pixel_ui: dist/index.html references missing ${asset}`);
      continue;
    }
    const actualHash = sha256(await readFile(assetPath)).slice(0, 12);
    if (actualHash !== filenameMatch[1].toLowerCase()) {
      fail(`pixel_ui: asset content hash does not match filename for ${asset}`);
    }
  }

  const assetDirectory = resolve(webRoot, 'dist/assets');
  if (!await exists(assetDirectory)) {
    fail('pixel_ui: missing dist/assets directory');
    return;
  }
  const shippedAssets = (await readdir(assetDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `assets/${entry.name}`)
    .sort();
  const expectedAssets = [...new Set(assetReferences)].sort();
  if (JSON.stringify(shippedAssets) !== JSON.stringify(expectedAssets)) {
    fail('pixel_ui: dist/assets contains stale or unreferenced build output');
  }

  if (!metadata.toolchain || metadata.toolchain.builder !== 'pixel-deterministic-ui-builder') {
    fail('pixel_ui: build metadata does not identify the deterministic Pixel UI builder');
  }
  if (metadata.toolchain?.react !== '18.2.0') fail('pixel_ui: unexpected vendored React runtime version');
  if (metadata.toolchain?.typescript !== packageJson.devDependencies?.typescript) {
    fail('pixel_ui: build metadata TypeScript version differs from package.json');
  }
  if (!assetReferences.includes(metadata.assets?.javascript) || !assetReferences.includes(metadata.assets?.stylesheet)) {
    fail('pixel_ui: build metadata asset references do not match dist/index.html');
  }

  const jsFiles = await walkFiles(resolve(webRoot, 'dist'), (file) => file.endsWith('.js'));
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) fail(`pixel_ui: invalid built JavaScript ${relative(webRoot, file)}: ${result.stderr.trim()}`);
    const bundle = await readFile(file, 'utf8');
    if (bundle.length < 100000) fail(`pixel_ui: React production bundle is unexpectedly small: ${relative(webRoot, file)}`);
    if (!bundle.includes('18.2.0') || !bundle.includes('PixelUI')) {
      fail(`pixel_ui: production bundle is missing the React runtime or compiled Pixel source: ${relative(webRoot, file)}`);
    }
  }
}

async function validateEnhancedOnly() {
  const activeFiles = [
    ...await walkFiles(resourcesRoot, (file) => /\.(?:lua|ts|tsx|json)$/i.test(file)
      && !file.includes(`${join('web', 'dist')}`)
      && !file.includes(`${join('web', 'vendor')}`)),
  ];
  const forbidden = [
    { label: 'ESX', pattern: /\bESX\b/i },
    { label: 'QBCore', pattern: /\b(?:QBCore|qb-core)\b/i },
    { label: 'pma-voice', pattern: /\bpma[-_]voice\b/i },
    { label: 'legacy Mumble', pattern: /\bMumble\b/i },
  ];

  for (const file of activeFiles) {
    const source = await readFile(file, 'utf8');
    for (const entry of forbidden) {
      if (entry.pattern.test(source)) {
        fail(`Enhanced-only scan: ${entry.label} reference in ${relative(projectRoot, file).replaceAll('\\', '/')}`);
      }
    }
  }
}

async function validateReleaseDocuments() {
  for (const file of [
    'CHANGELOG.md',
    'IMPLEMENTATION_REPORT.md',
    'TEST_REPORT.md',
    'KNOWN_LIMITATIONS.md',
    'SECURITY_REVIEW.md',
    'ACCESSIBILITY_REVIEW.md',
    'V0.2.1_HARDENING_PLAN.md',
  ]) {
    if (!await exists(resolve(projectRoot, file))) fail(`release: missing ${file}`);
  }
}

const resourceEntries = await readdir(resourcesRoot, { withFileTypes: true });
for (const entry of resourceEntries.filter((item) => item.isDirectory())) {
  const resourcePath = join(resourcesRoot, entry.name);

  for (const required of ['fxmanifest.lua', 'README.md', 'CHANGELOG.md']) {
    try {
      await stat(join(resourcePath, required));
    } catch {
      fail(`${entry.name}: missing ${required}`);
    }
  }

  const manifestPath = join(resourcePath, 'fxmanifest.lua');
  if (!await exists(manifestPath)) continue;
  const manifest = await readFile(manifestPath, 'utf8');
  const versionMatch = manifest.match(/(?:^|\n)\s*version\s+['"]([^'"]+)['"]/);

  if (!versionMatch) {
    fail(`${entry.name}: manifest is missing a version`);
  } else {
    const changelog = await readFile(join(resourcePath, 'CHANGELOG.md'), 'utf8');
    if (!changelog.includes(`## ${versionMatch[1]}`)) fail(`${entry.name}: changelog is missing version ${versionMatch[1]}`);
  }

  for (const reference of extractManifestReferences(manifest)) {
    if (reference.startsWith('@')) continue;
    if (!await manifestReferenceExists(resourcePath, reference)) fail(`${entry.name}: manifest references missing ${reference}`);
  }

  await validateManifestCoverage(resourcePath, entry.name, manifest);
  await validateLuaFiles(resourcePath, entry.name);
}

await validateTokens();
await validateUiArtifact();
await validateEnhancedOnly();
await validateReleaseDocuments();

const rootPackage = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'));
const rootChangelog = await readFile(resolve(projectRoot, 'CHANGELOG.md'), 'utf8');
if (!rootChangelog.includes(`## ${rootPackage.version}`)) fail(`root changelog is missing version ${rootPackage.version}`);

const uiPackage = JSON.parse(await readFile(resolve(projectRoot, 'resources/pixel_ui/web/package.json'), 'utf8'));
if (uiPackage.version !== rootPackage.version) fail('release: pixel_ui package version differs from root package');
for (const resourceName of ['pixel_core', 'pixel_ui']) {
  const manifest = await readFile(resolve(resourcesRoot, resourceName, 'fxmanifest.lua'), 'utf8');
  const version = manifest.match(/(?:^|\n)\s*version\s+['"]([^'"]+)['"]/)?.[1];
  if (version !== rootPackage.version) fail(`release: ${resourceName} manifest version differs from root package`);
}

if (failed) process.exit(1);
console.log('Pixel resource validation passed.');
