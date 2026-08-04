import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

test('vendored React runtime manifest, checksums, module aliases, and exports are valid', async () => {
  const root = resolve(import.meta.dirname, '..');
  const vendor = resolve(root, 'resources/pixel_ui/web/vendor/react-18.2.0');
  const manifest = JSON.parse(await readFile(resolve(vendor, 'runtime-manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 1);
  assert.equal(manifest.reactVersion, '18.2.0');
  assert.equal(manifest.webpackGlobal, 'webpackChunk_jupyterlab_application_top');

  const reactBytes = await readFile(resolve(vendor, manifest.files.react.path));
  const reactDomBytes = await readFile(resolve(vendor, manifest.files.reactDom.path));
  const licenseBytes = await readFile(resolve(vendor, manifest.files.license.path));
  assert.equal(sha256(reactBytes), manifest.files.react.sha256);
  assert.equal(sha256(reactDomBytes), manifest.files.reactDom.sha256);
  assert.equal(sha256(licenseBytes), manifest.files.license.sha256);

  const context = vm.createContext({
    console,
    Date,
    Error,
    Map,
    Math,
    Object,
    Promise,
    Set,
    Symbol,
    clearTimeout,
    performance,
    queueMicrotask,
    setTimeout,
  });
  context.self = context;
  context.globalThis = context;
  vm.runInContext(`${reactBytes.toString('utf8')}\n${reactDomBytes.toString('utf8')}`, context);

  const queue = context[manifest.webpackGlobal];
  assert.ok(Array.isArray(queue) && queue.length > 0, 'vendored webpack queue was not created');
  const modules = Object.assign({}, ...queue.map((entry) => entry[1]));
  assert.equal(typeof modules[manifest.modules.react], 'function');
  assert.equal(typeof modules[manifest.modules.reactDom], 'function');

  const cache = new Map();
  const aliases = new Map([[manifest.modules.reactAlias, manifest.modules.react]]);
  const requireModule = (requestedId) => {
    const id = aliases.get(requestedId) ?? requestedId;
    if (cache.has(id)) return cache.get(id).exports;
    const factory = modules[id];
    assert.equal(typeof factory, 'function', `missing vendored module ${id}`);
    const module = { exports: {} };
    cache.set(id, module);
    factory(module, module.exports, requireModule);
    return module.exports;
  };

  const React = requireModule(manifest.modules.react);
  const ReactDOM = requireModule(manifest.modules.reactDom);
  assert.equal(React.version, '18.2.0');
  assert.match(ReactDOM.version, /^18\.2\.0/);
  assert.equal(typeof React.createElement, 'function');
  assert.equal(typeof React.useEffect, 'function');
  assert.equal(typeof ReactDOM.createRoot, 'function');
});
