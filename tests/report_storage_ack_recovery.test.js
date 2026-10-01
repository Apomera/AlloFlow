import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const clientSource = readFileSync('allo_device_storage_module.js', 'utf8');
const bridgeOriginal = readFileSync('storage_bridge.html', 'utf8');
// An opt-in in-memory mutation lets the acknowledgement gate prove it detects
// premature success, without changing any live source or stored data.
const bridgeSource = process.env.ALLO_REPORT_STORAGE_MUTATION === 'premature-ack'
  ? bridgeOriginal.replace(
    'result = applyRecoveryMutation(request.result ? request.result.value : null, mutation);',
    'result = applyRecoveryMutation(request.result ? request.result.value : null, mutation); resolve(result);')
  : bridgeOriginal;
if (process.env.ALLO_REPORT_STORAGE_MUTATION === 'premature-ack' && bridgeSource === bridgeOriginal) throw Error('Acknowledgement mutation anchor missing');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const integrationSource = readFileSync('allo_recovery_vault_integration_module.js', 'utf8');
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const cleanups = [];
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.useRealTimers(); });

function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from || source.indexOf(start, from + start.length) >= 0) throw Error('Missing or ambiguous source boundary: ' + start);
  return source.slice(from, to);
}

// The mock controls transaction commit, not the production acknowledgement.
// Uncommitted puts remain private and an abort never changes the durable map.
function diskFixture() {
  const rows = new Map(), transactions = [];
  let automatic = false;
  const db = {
    transaction(_store, mode) {
      const writes = new Map();
      const transaction = {
        mode, error: null, done: false,
        objectStore() { return {
          get(key) { const request = {}; queueMicrotask(() => { request.result = clone(rows.get(key)); request.onsuccess?.(); }); return request; },
          put(row) { writes.set(row.k, clone(row)); },
        }; },
        commit() { if (this.done) return; this.done = true; writes.forEach((row, key) => rows.set(key, row)); this.oncomplete?.(); },
        abort(error = Error('Mock transaction rejected')) { if (this.done) return; this.done = true; this.error = error; queueMicrotask(() => this.onabort?.()); },
      };
      if (mode === 'readwrite') {
        transactions.push(transaction);
        if (automatic) queueMicrotask(() => queueMicrotask(() => transaction.commit()));
      }
      return transaction;
    },
  };
  const indexedDB = { open() { const request = {}; queueMicrotask(() => { request.result = db; request.onsuccess?.(); }); return request; } };
  const declarations = section(bridgeSource, '  var DB_NAME =', '  // ── Bridge mode');
  const operations = section(bridgeSource, '  function handleOp(msg)', '  if (isBridge)');
  const loadBridge = () => new Function('indexedDB', 'navigator', declarations + '\nvar RESERVED_NS_RE = /^__/;\n' + operations + '\nreturn { handleOp, kvGet, kvSet, kvMutateRecovery, kvCompareAndSwap };')(indexedDB, {});
  const fixture = { rows, transactions, bridge: loadBridge(), auto(value = true) { automatic = value; }, last: () => transactions.at(-1), reloadBridge() { this.bridge = loadBridge(); } };
  return fixture;
}

function clientFixture(disk) {
  const listeners = new Set(), sent = [];
  let bridgeWindow, frame, nonce;
  const origin = 'https://alloflow-cdn.pages.dev';
  const emit = (data, overrides = {}) => listeners.forEach(fn => fn({ source: bridgeWindow, origin, data, ...overrides }));
  bridgeWindow = { closed: false, postMessage(message, target) {
    sent.push({ message, target });
    if (message.type === 'allo-bridge-hello') {
      nonce = message.nonce;
      queueMicrotask(() => emit({ allo: 'ds1', type: 'allo-bridge-ready', nonce }));
      return;
    }
    disk.bridge.handleOp(message).then(value => emit({ allo: 'ds1', nonce: message.nonce, id: message.id, ok: true, value }), error => emit({ allo: 'ds1', nonce: message.nonce, id: message.id, ok: false, error: { code: error.code || 'mock/rejected', message: error.message } }));
  } };
  const document = { body: { appendChild(el) { el.isConnected = true; } }, createElement() {
    frame = { contentWindow: bridgeWindow, isConnected: false, style: {}, setAttribute() {}, removeAttribute() {}, remove() { this.isConnected = false; } };
    return frame;
  } };
  const window = {
    location: { origin: 'https://canvas.example', hostname: 'canvas.example', href: 'https://canvas.example/app' },
    crypto: webcrypto, addEventListener(type, fn) { if (type === 'message') listeners.add(fn); }, removeEventListener(type, fn) { if (type === 'message') listeners.delete(fn); },
  };
  new Function('window', 'document', 'navigator', 'crypto', clientSource)(window, document, {}, webcrypto);
  const api = window.alloDeviceStorage;
  api.init({ surface: 'canvas' });
  cleanups.push(() => api.disconnect());
  return { api, sent, emit, window, get nonce() { return nonce; }, get frame() { return frame; } };
}

function snapshot(id = 'pond-workspace', count = 15, at = '2026-09-30T22:00:00.000Z') {
  return { version: 1, id, title: 'Pond passage', savedAt: at, assetPolicy: 'full', workspace: {
    inputText: 'Plants in a pond use sunlight.', history: Array.from({ length: count }, (_, i) => ({ id: 'resource-' + i, type: i === 0 ? 'simplified' : 'glossary', title: 'Pond support ' + i, data: i === 0 ? 'Plants in a pond use sunlight.' : [{ word: 'pond', def: 'A small body of water.' }] })),
    units: [], profiles: [], activeResourceId: 'resource-0', activeView: 'simplified',
  } };
}
const mutation = value => ({ version: 1, action: 'upsert', snapshot: value });
const ns = 'workspace_recovery', key = 'store_v1';

const recoverySource = section(hostSource, 'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage');
const recovery = new Function('window', recoverySource + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const autosaveSource = section(hostSource,
  '  useEffect(() => {\n      if (!isCanvas || !canvasRecoveryDecisionMade || !isHistoryLoaded || isStorageDisabled',
  '  const getSkippedResources');

function autosaveFixture(storage) {
  const updates = [], timers = [], effects = [];
  const snapshotValue = snapshot();
  const env = {
    useEffect(fn) { effects.push(fn()); }, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {},
    isCanvas: true, canvasRecoveryDecisionMade: true, isHistoryLoaded: true, isStorageDisabled: false, isTeacherMode: true, activeSessionCode: null,
    history: snapshotValue.workspace.history, units: [], profiles: [], studentResponses: {}, inputText: snapshotValue.workspace.inputText, sourceTopic: 'Pond', guidedPlanBrief: null,
    generatedContent: null, canvasRecoveryVaultState: { enabled: false, locked: false },
    canvasRecoveryMutationInProgressRef: { current: false }, canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryCurrentIdRef: { current: snapshotValue.id },
    canvasRecoveryImmediateSaveRef: { current: true }, canvasRecoveryPendingSaveCountRef: { current: 0 }, canvasRecoveryStoreRef: { current: recovery.emptyStore() },
    _alloHasAnyStudentEntry: () => false, _alloMbBridgeActive: () => false,
    beginCanvasRecoveryPendingSave() { env.canvasRecoveryPendingSaveCountRef.current++; updates.push(['pending', true]); },
    setCanvasRecoverySaveStatus: value => updates.push(['status', value]), setCanvasRecoveryError: value => updates.push(['error', value]),
    setCanvasRecoveryStore: value => updates.push(['store', value]), setCanvasRecoveryStoreAuthoritative: value => updates.push(['authoritative', value]),
    setLastSaved: value => updates.push(['lastSaved', value]), setPendingSync: value => updates.push(['pending', value]),
    buildCanvasWorkspaceSnapshot: async () => clone(snapshotValue), queueCanvasRecoveryStorage: fn => fn(),
    _alloGetCanvasDeviceStorage: async () => storage, ALLO_WORKSPACE_RECOVERY: recovery,
    ALLO_WORKSPACE_RECOVERY_NAMESPACE: ns, ALLO_WORKSPACE_RECOVERY_KEY: key,
    warnLog() {}, addToast: (message, kind) => updates.push(['toast', message, kind]),
  };
  const scope = new Proxy(env, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
  new Function('scope', 'with(scope) {\n' + autosaveSource + '\n}')(scope);
  return { env, updates, run: () => timers[0](), cleanup: () => effects[0]?.() };
}

describe('real bridge commit acknowledgements and reload readback', () => {
  it('does not acknowledge a recovery write at request success; only transaction completion commits it', async () => {
    const disk = diskFixture(); let settled = false;
    const saving = disk.bridge.kvMutateRecovery(ns, key, mutation(snapshot())).then(result => { settled = true; return result; });
    await flush(); expect(disk.transactions).toHaveLength(1); expect(settled).toBe(false); expect(disk.rows.size).toBe(0);
    disk.last().commit(); const result = await saving;
    expect(result.applied).toBe(true); expect(result.store.snapshots[0].workspace.history).toHaveLength(15);
    expect((await disk.bridge.kvGet(ns, key)).snapshots[0].id).toBe('pond-workspace');
  });
  it('rejects an aborted transaction without replacing the last good workspace', async () => {
    const disk = diskFixture(); disk.auto(); await disk.bridge.kvMutateRecovery(ns, key, mutation(snapshot())); disk.auto(false);
    const rejected = disk.bridge.kvMutateRecovery(ns, key, mutation(snapshot('pond-workspace', 16, '2026-09-30T22:01:00Z')));
    const assertion = expect(rejected).rejects.toThrow('Quota mock'); await flush(); disk.last().abort(Error('Quota mock')); await assertion;
    expect((await disk.bridge.kvGet(ns, key)).snapshots[0].workspace.history).toHaveLength(15);
  });
  it('retains all resources through a fresh client and fresh bridge closure after an acknowledged save', async () => {
    const disk = diskFixture(), first = clientFixture(disk); disk.auto(); await first.api.ready();
    const result = await first.api.mutateRecovery(ns, key, mutation(snapshot()), { queue: false });
    expect(result.store.snapshots[0].resourceCount).toBe(15); first.api.disconnect(); disk.reloadBridge();
    const reloaded = clientFixture(disk); await reloaded.api.ready();
    const stored = await reloaded.api.get(ns, key);
    expect(recovery.normalizeStore(stored).snapshots[0].workspace.history).toEqual(snapshot().workspace.history);
    expect(reloaded.sent[0].message.channel).toBe('iframe'); expect(reloaded.nonce).not.toBe(first.nonce);
  });
  it('does not misreport a disconnected queue:false recovery save as saved or queued', async () => {
    const f = clientFixture(diskFixture());
    await expect(f.api.mutateRecovery(ns, key, mutation(snapshot()), { queue: false })).rejects.toMatchObject({ code: 'allo/storage-disconnected' });
    expect(f.api.status().queuedWrites).toBe(0);
  });
  it('rejects a missing bridge acknowledgement after its real request deadline', async () => {
    vi.useFakeTimers(); const disk = diskFixture(), f = clientFixture(disk); await f.api.ready();
    const save = f.api.mutateRecovery(ns, key, mutation(snapshot()), { queue: false });
    const assertion = expect(save).rejects.toMatchObject({ code: 'allo/storage-timeout' });
    await flush(); await vi.advanceTimersByTimeAsync(8001); await assertion;
    expect(disk.rows.size).toBe(0);
  });
  it('ignores forged response source, origin and nonce while waiting for the real commit', async () => {
    const disk = diskFixture(), f = clientFixture(disk); await f.api.ready(); let settled = false;
    const save = f.api.mutateRecovery(ns, key, mutation(snapshot()), { queue: false }).then(value => { settled = true; return value; }); await flush();
    const message = f.sent.at(-1).message, response = { allo: 'ds1', nonce: f.nonce, id: message.id, ok: true, value: true };
    f.emit(response, { origin: 'https://other.example' }); f.emit(response, { source: {} }); f.emit({ ...response, nonce: 'different' }); await flush();
    expect(settled).toBe(false); disk.last().commit(); expect((await save).applied).toBe(true);
  });
});

describe('actual Canvas autosave status and lifecycle', () => {
  it('stays saving during a delayed ACK and reports saved only after committed workspace readback', async () => {
    const disk = diskFixture(), client = clientFixture(disk); await client.api.ready(); const f = autosaveFixture(client.api);
    const running = f.run(); await flush(); expect(f.updates).toContainEqual(['status', 'saving']); expect(f.updates).not.toContainEqual(['status', 'saved']);
    disk.last().commit(); await running;
    expect(f.updates).toContainEqual(['status', 'saved']); expect(f.updates.at(-1)).toEqual(['pending', false]);
    expect((await client.api.get(ns, key)).snapshots[0].resourceCount).toBe(15); f.cleanup();
  });
  it('exposes rejected-save error and clears pending state while preserving the last good disk value', async () => {
    const disk = diskFixture(); disk.auto(); await disk.bridge.kvMutateRecovery(ns, key, mutation(snapshot('old-workspace'))); disk.auto(false);
    const client = clientFixture(disk); await client.api.ready(); const f = autosaveFixture(client.api), running = f.run(); await flush();
    disk.last().abort(Error('Mock storage refused write')); await running;
    expect(f.updates).toContainEqual(['status', 'error']); expect(f.updates).toContainEqual(['error', 'Mock storage refused write']); expect(f.updates).not.toContainEqual(['status', 'saved']);
    expect(f.updates.at(-1)).toEqual(['pending', false]); expect((await client.api.get(ns, key)).snapshots[0].id).toBe('old-workspace'); f.cleanup();
  });
  it('does not claim a different workspace was saved when navigation changes ownership before ACK', async () => {
    const disk = diskFixture(), client = clientFixture(disk); await client.api.ready(); const f = autosaveFixture(client.api), running = f.run(); await flush();
    f.env.canvasRecoveryCurrentIdRef.current = 'new-workspace'; disk.last().commit(); await running;
    expect(f.updates).not.toContainEqual(['status', 'saved']); expect(f.updates.at(-1)).toEqual(['pending', false]);
    expect((await client.api.get(ns, key)).snapshots[0].id).toBe('pond-workspace'); f.cleanup();
  });
  it('does not publish a successful save after effect cleanup invalidates the run token', async () => {
    const disk = diskFixture(), client = clientFixture(disk); await client.api.ready(); const f = autosaveFixture(client.api), running = f.run(); await flush();
    f.cleanup(); disk.last().commit(); await running; expect(f.updates).not.toContainEqual(['status', 'saved']); expect(f.updates.at(-1)).toEqual(['pending', false]);
  });
  it('keeps first-save recovery history private until the storage write actually succeeds', async () => {
    const disk = diskFixture(), client = clientFixture(disk); await client.api.ready(); const f = autosaveFixture(client.api), running = f.run(); await flush();
    expect(f.env.canvasRecoveryStoreRef.current.snapshots).toHaveLength(0); expect(f.updates.some(update => update[0] === 'lastSaved')).toBe(false);
    disk.last().commit(); await running; expect(f.env.canvasRecoveryStoreRef.current.snapshots[0].resourceCount).toBe(15); f.cleanup();
  });
});

describe('vault persistence acknowledgement', () => {
  it('waits for actual compare-and-swap commit and supports readback after a new repository instance', async () => {
    const disk = diskFixture(), client = clientFixture(disk); await client.api.ready(); const module = { exports: {} };
    new Function('module', integrationSource)(module); const api = module.exports;
    const first = api.createDeviceRepository(client.api); let done = false;
    const write = first.compareAndSwap({ mode: 'absent' }, { version: 1, encrypted: true, records: [{ id: 'pond-workspace' }] }).then(value => { done = true; return value; });
    await flush(); expect(done).toBe(false); disk.last().commit(); expect(await write).toBe(true);
    const read = await api.createDeviceRepository(client.api).read(); expect(read.revision).toBe(1); expect(read.store.records[0].id).toBe('pond-workspace');
  });
});

function pumpFixture(classes = new Set()) {
  vi.useFakeTimers();
  const events = {}, registry = {}, loads = [];
  const queue = Array.from({ length: 7 }, (_, i) => ({ name: 'Tool' + i, url: './tool-' + i + '.js' }));
  const names = Object.fromEntries(queue.map(item => [item.name, item]));
  const env = {
    window: { addEventListener: (type, fn) => { events[type] = fn; }, requestIdleCallback: fn => fn({ didTimeout: true, timeRemaining: () => 12 }) },
    document: { hidden: false, body: { classList: { contains: value => classes.has(value) } } }, navigator: {}, performance: { now: () => Date.now() },
    __alloDeferredModuleQueue: queue, __alloDeferredModuleNames: names, __alloModuleRegistry: registry,
    __alloLoadModuleNow(name) { loads.push(name); registry[name] = { status: 'loaded' }; },
    setTimeout, clearTimeout,
  };
  const source = section(hostSource, '    (function startDeferredModulePump() {', '    // -- STEAM Lab / SEL Hub');
  const scope = new Proxy(env, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
  new Function('scope', 'with(scope) {\n' + source + '\n}')(scope);
  return { env, loads, classes, events, queue };
}

describe('current module-loading and concealed-workspace interaction', () => {
  it.each(['alloflow-workspace-concealed', 'alloflow-launchpad-active'])('parks the actual background queue with %s and resumes when the class clears', async className => {
    const f = pumpFixture(new Set([className])); await vi.advanceTimersByTimeAsync(10000);
    expect(f.loads).toHaveLength(0); expect(f.queue).toHaveLength(7);
    f.classes.delete(className); await vi.advanceTimersByTimeAsync(2000);
    expect(f.loads).toHaveLength(7); expect(f.queue).toHaveLength(0);
  });
  it('bounds continuous keyboard input starvation and permits background progress after eight seconds', async () => {
    const f = pumpFixture();
    for (let i = 0; i < 12; i++) { f.events.keydown(); await vi.advanceTimersByTimeAsync(1000); }
    expect(f.loads.length).toBeGreaterThan(0); expect(f.loads.length).toBeLessThan(7);
  });
  it('promotes an explicitly opened queued tool immediately even while the background pump is parked', () => {
    const queued = { name: 'ReadingLibrary', url: './reading_library_module.js' }, calls = [], window = {};
    const env = {
      window, __alloBootstrappingModules: false, __alloDeferredModuleNames: { ReadingLibrary: queued }, __alloDeferredModuleQueue: [queued],
      __alloLoadModuleNow: (...args) => calls.push(args), __alloModuleRegistered: () => false, __alloModuleRegistry: {},
    };
    const source = section(hostSource, '    const loadModule = (name, url) => {', '    window.__alloRetryModule')
      + section(hostSource, '    window.__alloPromoteModule = function(name) {', '    // A #sel-hub');
    const scope = new Proxy(env, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
    new Function('scope', 'with(scope) {\n' + source + '\n}')(scope);
    expect(window.__alloPromoteModule('ReadingLibrary')).toBe(true);
    expect(calls).toEqual([['ReadingLibrary', './reading_library_module.js']]); expect(env.__alloDeferredModuleNames.ReadingLibrary).toBeUndefined();
  });
});
