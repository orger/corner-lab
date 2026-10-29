import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { buildWeb } from '../scripts/build-web.mjs';

const workerSource = await readFile(new URL('../app/sw.js', import.meta.url), 'utf8');
const pwaSource = await readFile(new URL('../app/pwa.js', import.meta.url), 'utf8');

function workerHarness({ failDownload = false } = {}) {
  const listeners = new Map(), stores = new Map(), network = [], deleted = [];
  let claimed = false, skipped = false;
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(requests) {
        if (failDownload) throw new Error('Disconnected during installation');
        for (const request of requests) store.set(request.url, new Response(`saved:${request.url}`));
      },
      async match(request) { return store.get(typeof request === 'string' ? request : request.url)?.clone(); },
      async put(request, response) { store.set(typeof request === 'string' ? request : request.url, response.clone()); },
    };
  };
  const context = vm.createContext({
    URL, Request, Response, Set, Promise,
    caches: {
      async open(name) { return cache(name); },
      async keys() { return [...stores.keys()]; },
      async delete(name) { deleted.push(name); return stores.delete(name); },
    },
    self: {
      registration: { scope: 'https://example.test/corner/' },
      addEventListener(name, callback) { listeners.set(name, callback); },
      clients: { async claim() { claimed = true; } },
      async skipWaiting() { skipped = true; },
    },
    async fetch(request) { network.push(request.url); return new Response('network'); },
  });
  vm.runInContext(`${workerSource}\nglobalThis.workerConfig = {CACHE_NAME, PRECACHE};`, context);
  return {
    stores, network, deleted, config: context.workerConfig,
    get claimed() { return claimed; }, get skipped() { return skipped; },
    async emit(name, properties = {}) {
      const waits = [];
      let response;
      listeners.get(name)({ ...properties, waitUntil(value) { waits.push(value); }, respondWith(value) { response = value; } });
      await Promise.all(waits);
      return response ? await response : undefined;
    },
  };
}

test('web build caches every published runtime asset, ships credits, and preserves root-relative hosting', async () => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'corner-lab-pwa-'));
  try {
    const outputDirectory = path.join(temporary, 'web');
    const result = await buildWeb({ outputDirectory });
    const second = await buildWeb({ outputDirectory });
    assert.equal(result.version, second.version, 'unchanged source produces a stable offline version');
    assert.equal((await readFile(path.join(outputDirectory, 'CNAME'), 'utf8')).trim(), 'cubing.orger.org');
    assert.ok(result.files.includes('.nojekyll'));
    for (const name of ['LICENSE', 'NOTICE', 'docs/SOURCES.md', 'docs/USER-GUIDE.md', 'docs/5X5-GUIDE.md']) assert.ok(result.files.includes(name));
    for (const name of result.files.filter(name => /\.(js|css|html|png|svg|webmanifest)$/.test(name) && name !== 'sw.js')) {
      assert.ok(result.precache.includes(`./${name}`), `${name} is available offline before its first visit`);
    }
    assert.ok(!result.files.some(name => /data\.json|\.previous\.|\.pdf$|\.DS_Store|native\/|tests\//.test(name)));
    const builtWorker = await readFile(path.join(outputDirectory, 'sw.js'), 'utf8');
    assert.ok(builtWorker.includes(`const CACHE_VERSION = '${result.version}'`));
    const manifest = JSON.parse(await readFile(path.join(outputDirectory, 'manifest.webmanifest'), 'utf8'));
    assert.equal(manifest.scope, './');
    assert.equal(manifest.start_url, './');
    for (const icon of manifest.icons) {
      const png = await readFile(path.join(outputDirectory, icon.src));
      assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
    }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('worker serves all trainers offline and does not intercept backups, external URLs, or writes', async () => {
  const worker = workerHarness();
  await worker.emit('install');
  assert.equal(worker.skipped, false, 'installing never forces an update');
  for (const name of ['index.html', 'catalog.js', 'catalog5.js', 'catalog-centres.js', 'centres-drill.js', 'lte.js', 'progress.js']) {
    const response = await worker.emit('fetch', { request: { method: 'GET', url: `https://example.test/corner/${name}` } });
    assert.equal(await response.text(), `saved:https://example.test/corner/${name}`);
  }
  const root = await worker.emit('fetch', { request: { method: 'GET', url: 'https://example.test/corner/?from=home-screen' } });
  assert.equal(await root.text(), 'saved:https://example.test/corner/');
  for (const request of [
    { method: 'GET', url: 'https://example.test/corner/my-backup.json' },
    { method: 'GET', url: 'https://elsewhere.test/corner/index.html' },
    { method: 'GET', url: 'https://example.test/another-app/index.html' },
    { method: 'POST', url: 'https://example.test/corner/index.html' },
  ]) assert.equal(await worker.emit('fetch', { request }), undefined);
  assert.deepEqual(worker.network, []);
});

test('activation cleans only Corner Lab static caches and updates require a message', async () => {
  const worker = workerHarness();
  worker.stores.set('corner-lab-static-old', new Map());
  worker.stores.set('another-app-static-old', new Map());
  worker.stores.set('corner-lab-user-data', new Map());
  await worker.emit('install');
  await worker.emit('activate');
  assert.deepEqual(worker.deleted, ['corner-lab-static-old']);
  assert.equal(worker.claimed, true);
  assert.equal(worker.skipped, false);
  await worker.emit('message', { data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(worker.skipped, true);
});

test('a same-version install never replaces assets underneath an active app', async () => {
  const worker = workerHarness();
  await worker.emit('install');
  const store = worker.stores.get(worker.config.CACHE_NAME);
  store.set('https://example.test/corner/app.js', new Response('already active'));
  await worker.emit('install');
  assert.equal(await store.get('https://example.test/corner/app.js').clone().text(), 'already active');
});

test('failed installation preserves the previous cache and readiness checks detect eviction', async () => {
  const failed = workerHarness({ failDownload: true });
  const oldStore = new Map([['existing', new Response('old app')]]);
  failed.stores.set('corner-lab-static-old', oldStore);
  await assert.rejects(failed.emit('install'), /Disconnected/);
  assert.equal(failed.stores.get('corner-lab-static-old'), oldStore);
  assert.equal(failed.skipped, false);
  const worker = workerHarness();
  await worker.emit('install');
  const replies = [];
  const request = () => worker.emit('message', { data: { type: 'OFFLINE_STATUS' }, ports: [{ postMessage: reply => replies.push(reply) }] });
  await request();
  assert.equal(replies.at(-1).ready, true);
  worker.stores.get(worker.config.CACHE_NAME).delete('https://example.test/corner/lte.js');
  await request();
  assert.equal(replies.at(-1).ready, false, 'readiness is based on cache contents, not merely worker installation');
  await worker.emit('message', { data: { type: 'REPAIR_OFFLINE' }, ports: [{ postMessage: reply => replies.push(reply) }] });
  assert.equal(replies.at(-1).ready, true);
});

async function pwaHarness({ native = false, waiting = false, failUpdate = false } = {}) {
  const windowListeners = new Map(), serviceListeners = new Map(), elements = [], sent = [];
  let timer = false, reloads = 0, persistenceRequests = 0;
  function element() {
    const listeners = new Map();
    const node = { dataset: {}, children: [], textContent: '', hidden: false, disabled: false,
      append(...children) { this.children.push(...children); },
      insertBefore(child) { this.children.unshift(child); }, setAttribute() {},
      addEventListener(name, callback) { listeners.set(name, callback); }, click() { listeners.get('click')?.(); },
    };
    elements.push(node);
    return node;
  }
  const registration = {
    active: { postMessage(data, ports) { ports[0].postMessage({ ready: true }); } },
    waiting: waiting ? { postMessage(data) { if (failUpdate) throw new Error('Worker unavailable'); sent.push(data); } } : null,
    addEventListener() {}, update: async () => {},
  };
  const document = { createElement: element, body: element(), head: element(), getElementById: () => null, querySelector: () => null, addEventListener() {} };
  const context = vm.createContext({
    document, MessageChannel, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: { cornerlabNative: native ? {} : undefined, isSecureContext: true, cornerlabTimerActive: () => timer,
      addEventListener(name, callback) { windowListeners.set(name, callback); },
      dispatchEvent(event) { windowListeners.get(event.type)?.(event); },
    },
    location: { protocol: 'https:', reload() { reloads++; } },
    navigator: { onLine: true, storage: { async persist() { persistenceRequests++; return true; } }, serviceWorker: { ready: Promise.resolve(registration), async register() { return registration; }, addEventListener(name, callback) { serviceListeners.set(name, callback); } } },
    setTimeout, clearTimeout,
  });
  const source = pwaSource.replace('  startOfflineSupport();', '  globalThis.started = startOfflineSupport();');
  vm.runInContext(source, context);
  await context.started;
  return {
    elements, sent, registration,
    get status() { return elements.find(node => node.id === 'offline-status'); },
    get reloads() { return reloads; },
    get persistenceRequests() { return persistenceRequests; },
    get firstBodyChild() { return document.body.children[0]; },
    setTimer(active) { timer = active; windowListeners.get('cornerlab-timer-state')?.({ detail: { active } }); },
    controllerChange() { serviceListeners.get('controllerchange')?.(); },
  };
}

test('native shell skips PWA setup and updates cannot reload a running timer', async () => {
  const native = await pwaHarness({ native: true });
  assert.equal(native.status, undefined);
  const pwa = await pwaHarness({ waiting: true });
  const [label, button] = pwa.status.children;
  assert.equal(pwa.firstBodyChild, pwa.status, 'status appears above content and the fixed bottom navigation');
  assert.equal(pwa.persistenceRequests, 1);
  assert.equal(label.textContent, 'Update ready');
  pwa.setTimer(true);
  assert.equal(button.disabled, true);
  button.click();
  assert.equal(pwa.sent.length, 0);
  pwa.setTimer(false);
  button.click();
  assert.equal(pwa.sent[0].type, 'ACTIVATE_UPDATE');
  assert.equal(pwa.reloads, 0);
  pwa.setTimer(true);
  pwa.controllerChange();
  assert.equal(pwa.reloads, 0, 'a timer started during activation is also protected');
  pwa.setTimer(false);
  assert.equal(pwa.reloads, 0, 'finishing a solve does not trigger a surprise reload');
  button.click();
  assert.equal(pwa.reloads, 1);
});

test('an unavailable update worker recovers its button without reloading', async () => {
  const pwa = await pwaHarness({ waiting: true, failUpdate: true });
  const [label, button] = pwa.status.children;
  button.click();
  assert.equal(pwa.reloads, 0);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Update');
  assert.match(label.textContent, /try again/);
});
