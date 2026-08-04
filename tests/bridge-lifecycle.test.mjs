import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const web = resolve(root, 'resources/pixel_ui/web');
const uiPackage = JSON.parse(await readFile(resolve(web, 'package.json'), 'utf8'));
const expectedTypeScript = uiPackage.devDependencies.typescript;

function resolveTsc() {
  const local = resolve(web, 'node_modules/.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
  const candidates = [process.env.PIXEL_TSC, local, 'tsc'].filter(Boolean);
  for (const command of candidates) {
    const result = spawnSync(command, ['--version'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (result.error?.code === 'ENOENT' || result.status !== 0) continue;
    const version = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.match(/(?:Version\s+)?(\d+\.\d+\.\d+)/i)?.[1];
    if (version !== expectedTypeScript) {
      throw new Error(`TypeScript ${expectedTypeScript} required; ${command} reports ${version ?? 'unknown'}`);
    }
    return command;
  }
  throw new Error(`TypeScript ${expectedTypeScript} was not found`);
}

const compile = spawnSync(
  resolveTsc(),
  ['--project', resolve(web, 'tsconfig.core-tests.json')],
  { cwd: web, encoding: 'utf8', shell: process.platform === 'win32' },
);
assert.equal(compile.status, 0, compile.stderr || compile.stdout);

class FakeElement {
  constructor(name) {
    this.name = name;
    this.isConnected = true;
    this.listeners = new Map();
    this.children = [];
  }
  addEventListener(name, listener) { this.listeners.set(name, listener); }
  removeEventListener(name, listener) {
    if (this.listeners.get(name) === listener) this.listeners.delete(name);
  }
  querySelectorAll() { return this.children; }
  getAttribute() { return null; }
  focus() { fakeDocument.activeElement = this; }
}

const fakeDocument = { activeElement: null };
const fakeWindow = {
  setTimeout,
  clearTimeout,
};
const context = vm.createContext({
  AbortController,
  Array,
  Date,
  Error,
  Map,
  Math,
  Number,
  Object,
  Promise,
  Set,
  console,
  document: fakeDocument,
  fetch: async () => { throw new Error('Unexpected fetch'); },
  HTMLElement: FakeElement,
  window: fakeWindow,
});
context.globalThis = context;
vm.runInContext(await readFile(resolve(web, '.build/pixel-core-tests.js'), 'utf8'), context);
await rm(resolve(web, '.build'), { recursive: true, force: true });
const {
  NuiClient,
  NuiEventBus,
  UiOwnershipState,
  activateFocusTrap,
  nextKeyboardIndex,
  shouldCloseOnEscape,
} = context.PixelUI;

function stateResponse(overrides = {}) {
  return {
    visible: true,
    activeOwner: 'test',
    focus: true,
    cursor: true,
    modalDepth: 0,
    showcaseEnabled: false,
    owners: [{ id: 'test', focus: true, cursor: true }],
    revision: 1,
    ...overrides,
  };
}

test('event envelopes validate, unsubscribe, and support one-shot listeners', () => {
  const diagnostics = [];
  const bus = new NuiEventBus((level, message) => diagnostics.push([level, message]));
  let persistent = 0;
  let once = 0;
  const unsubscribe = bus.subscribe('pixel.ui.state', () => { persistent += 1; });
  bus.subscribe('pixel.ui.state', () => { once += 1; }, { once: true });

  assert.equal(bus.receive({ version: 1, event: 'pixel.ui.state', payload: stateResponse() }), true);
  assert.equal(bus.receive({ version: 1, event: 'pixel.ui.state', payload: stateResponse({ revision: 2 }) }), true);
  unsubscribe();
  assert.equal(persistent, 2);
  assert.equal(once, 1);
  assert.equal(bus.receive({ version: 1, event: 'pixel.unknown', payload: {} }), false);
  assert.equal(bus.receive({ version: 1, event: 'pixel.ui.state', payload: { visible: 'yes' } }), false);
  assert.ok(diagnostics.length >= 2);
});

test('correlated request succeeds and validates its response payload', async () => {
  let captured;
  const client = new NuiClient(async (envelope) => {
    captured = envelope;
    return {
      version: 1,
      requestId: envelope.requestId,
      ok: true,
      data: { accepted: true, state: stateResponse() },
    };
  });
  const response = await client.request('ui.acquire', {
    owner: 'test',
    focus: true,
    cursor: true,
  });
  assert.equal(response.accepted, true);
  assert.match(captured.requestId, /^px:/);
  assert.equal(captured.callback, 'ui.acquire');
  assert.equal(client.pendingCount, 0);
});

test('request rejects on timeout and cleans pending state', async () => {
  const client = new NuiClient(() => new Promise(() => undefined));
  await assert.rejects(
    client.request('ui.ready', {}, { timeoutMs: 10 }),
    (error) => error.code === 'TIMEOUT',
  );
  assert.equal(client.pendingCount, 0);
});

test('request supports AbortSignal cancellation', async () => {
  const controller = new AbortController();
  const client = new NuiClient(() => new Promise(() => undefined));
  const request = client.request('ui.ready', {}, { timeoutMs: 1000, signal: controller.signal });
  controller.abort();
  await assert.rejects(request, (error) => error.code === 'ABORTED');
  assert.equal(client.pendingCount, 0);
});

test('invalid request and response payloads are rejected', async () => {
  const neverCalled = new NuiClient(async () => { throw new Error('transport should not run'); });
  await assert.rejects(
    neverCalled.request('ui.acquire', { owner: '', focus: true, cursor: true }),
    (error) => error.code === 'BAD_REQUEST',
  );

  const invalidResponse = new NuiClient(async (envelope) => ({
    version: 1,
    requestId: envelope.requestId,
    ok: true,
    data: { accepted: 'yes' },
  }));
  await assert.rejects(
    invalidResponse.request('ui.release', { owner: 'test' }),
    (error) => error.code === 'INVALID_RESPONSE',
  );
});

test('structured unknown-callback error is propagated', async () => {
  const client = new NuiClient(async (envelope) => ({
    version: 1,
    requestId: envelope.requestId,
    ok: false,
    error: { code: 'NOT_FOUND', message: 'Unknown NUI callback' },
  }));
  await assert.rejects(
    client.request('ui.ready', {}),
    (error) => error.code === 'NOT_FOUND' && /Unknown/.test(error.message),
  );
});

test('duplicate responses are ignored after the first settlement', async () => {
  let captured;
  const diagnostics = [];
  const client = new NuiClient(
    (envelope) => {
      captured = envelope;
      return new Promise(() => undefined);
    },
    (level, message) => diagnostics.push([level, message]),
  );
  const pending = client.request('ui.release', { owner: 'test' });
  await Promise.resolve();
  const envelope = {
    version: 1,
    requestId: captured.requestId,
    ok: true,
    data: { accepted: true, state: stateResponse({ visible: false, activeOwner: null, focus: false, cursor: false, owners: [] }) },
  };
  assert.equal(client.receiveResponse(envelope), true);
  assert.equal(client.receiveResponse(envelope), false);
  assert.equal((await pending).accepted, true);
  assert.ok(diagnostics.some(([, message]) => /duplicate/i.test(message)));
});

test('pending requests are rejected together on UI cleanup', async () => {
  const client = new NuiClient(() => new Promise(() => undefined));
  const first = client.request('ui.ready', {}, { timeoutMs: 1000 });
  const second = client.request('ui.closeAll', {}, { timeoutMs: 1000 });
  assert.equal(client.pendingCount, 2);
  client.cancelPending('UI closed');
  await assert.rejects(first, (error) => error.code === 'CLOSED');
  await assert.rejects(second, (error) => error.code === 'CLOSED');
  assert.equal(client.pendingCount, 0);
});

test('ownership state prevents duplicate opens and restores prior focus owner', () => {
  const state = new UiOwnershipState();
  const first = state.acquire({ owner: 'inventory', focus: true, cursor: true });
  const duplicate = state.acquire({ owner: 'inventory', focus: true, cursor: true });
  assert.equal(duplicate.revision, first.revision);

  const admin = state.acquire({ owner: 'admin', focus: false, cursor: false });
  assert.equal(admin.activeOwner, 'admin');
  assert.equal(admin.focus, false);

  const restored = state.release('admin');
  assert.equal(restored.activeOwner, 'inventory');
  assert.equal(restored.focus, true);
  assert.equal(restored.cursor, true);

  const closed = state.closeAll();
  assert.equal(closed.visible, false);
  assert.equal(closed.owners.length, 0);
  assert.equal(closed.modalDepth, 0);
});

test('keyboard helpers wrap tabs and menus and gate Escape by top-most overlay', () => {
  assert.equal(nextKeyboardIndex(2, 3, 'ArrowRight', 'horizontal'), 0);
  assert.equal(nextKeyboardIndex(0, 3, 'ArrowLeft', 'horizontal'), 2);
  assert.equal(nextKeyboardIndex(1, 3, 'Home', 'vertical'), 0);
  assert.equal(nextKeyboardIndex(1, 3, 'End', 'vertical'), 2);
  assert.equal(shouldCloseOnEscape('Escape', true), true);
  assert.equal(shouldCloseOnEscape('Escape', false), false);
  assert.equal(shouldCloseOnEscape('Enter', true), false);
});

test('focus trap cycles Tab, handles Escape, and restores prior focus', () => {
  const outside = new FakeElement('outside');
  const panel = new FakeElement('panel');
  const first = new FakeElement('first');
  const last = new FakeElement('last');
  panel.children = [first, last];
  outside.focus();
  let closes = 0;

  const trap = activateFocusTrap(panel, () => { closes += 1; }, () => true);
  assert.equal(fakeDocument.activeElement, first);
  const listener = panel.listeners.get('keydown');
  let prevented = 0;
  fakeDocument.activeElement = last;
  listener({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented += 1; } });
  assert.equal(fakeDocument.activeElement, first);
  fakeDocument.activeElement = first;
  listener({ key: 'Tab', shiftKey: true, preventDefault: () => { prevented += 1; } });
  assert.equal(fakeDocument.activeElement, last);
  listener({ key: 'Escape', shiftKey: false, preventDefault: () => { prevented += 1; } });
  assert.equal(closes, 1);
  assert.equal(prevented, 3);
  trap.deactivate();
  assert.equal(fakeDocument.activeElement, outside);
  assert.equal(panel.listeners.size, 0);
});
