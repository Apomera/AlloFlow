import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { applyPatch } from 'diff';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mediaCandidate = process.env.ALLO_REPORT_STORAGE_MEDIA_PROPOSAL === '1';
const hostActual = readFileSync('AlloFlowANTI.txt', 'utf8');
const hostCandidate = mediaCandidate ? applyPatch(hostActual, readFileSync('reports/report-fixes-2026-09-30/storage-media-host-proposal.patch', 'utf8')) : hostActual;
if (hostCandidate === false) throw Error('Review-only media proposal no longer applies');
const host = hostCandidate.replace(/\r\n/g, '\n');
const utils = readFileSync('utils_pure_source.jsx', 'utf8');
const bridgeSource = readFileSync('storage_bridge.html', 'utf8');
const clientSource = readFileSync('allo_device_storage_module.js', 'utf8');
const require = createRequire(import.meta.url);
const cryptoApi = require('../allo_crypto_module.js');
const vaultApi = require('../allo_device_vault_module.js');
const integration = require('../allo_recovery_vault_integration_module.js');
const flush = async () => { for (let i = 0; i < 45; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const clone = value => JSON.parse(JSON.stringify(value));
afterEach(() => vi.useRealTimers());
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from || source.indexOf(start, from + start.length) >= 0) throw Error('Missing/ambiguous boundary ' + start);
  return source.slice(from, to);
}
const recovery = new Function('window', section(host, 'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage') + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const inventory = new Function(section(host, 'const ALLO_STORAGE_INVENTORY = (() => {', '\nconst _alloCreateDefaultStudentProjectSettings') + '\nreturn ALLO_STORAGE_INVENTORY;')();

function mixedHistory() {
  const text = 'Plants in a pond use sunlight. Animals migrate between habitats.';
  return [
    { id: 'original', type: 'simplified', title: 'Pond source', dataEncoding: 'text/v1', data: text, originalText: text, originalAnnotations: [{ start: 0, end: 6, explanation: 'Plants are living things.', image: { src: 'data:image/png;base64,AA==' } }] },
    { id: 'adapted', type: 'simplified', title: 'Pond reading', data: 'Plants use sunlight.', sourceSnapshot: { originalText: text, sourceTitle: 'Pond source' } },
    { id: 'glossary', type: 'glossary', data: [{ word: 'migrate', def: 'Move between places.', image: 'data:image/png;base64,AQ==' }, { word: 'pond', def: 'A small body of water.' }] },
    { id: 'quiz', type: 'quiz', data: [{ question: 'Which source of energy do plants use?', options: ['Sunlight', 'Stone'], correctAnswer: 'Sunlight', explanation: 'The source says sunlight.' }] },
    { id: 'faq', type: 'faq', data: [{ question: 'What is a pond?', answer: 'A small body of water.' }] },
    { id: 'frames', type: 'scaffolds', data: { frames: ['Plants need ___ because ___.'] } },
    { id: 'notes', type: 'cornell', data: { cues: ['What gives plants energy?'], notes: 'Sunlight', summary: 'Pond plants use sunlight.' } },
    { id: 'memory', type: 'memoryaid', data: { prompts: [{ cue: 'Plant energy', answer: 'Sunlight' }], transfer: 'Compare another habitat.' } },
    { id: 'discussion', type: 'discussion', data: { questions: ['Why might an animal migrate?'] } },
    { id: 'challenge', type: 'appliedchallenge', data: { task: 'Explain a pond food chain.', rubric: [{ criterion: 'Uses source evidence.' }] } },
    { id: 'organizer', type: 'interactiveorganizer', data: { nodes: [{ id: 'sun', label: 'Sunlight' }, { id: 'plants', label: 'Plants' }], edges: [{ from: 'sun', to: 'plants' }] } },
    { id: 'sequence', type: 'sequence', data: [{ id: 'step1', text: 'Observe the pond.' }, { id: 'step2', text: 'Record evidence.' }] },
    { id: 'directions', type: 'directions', data: { body: 'Read the original passage first.', choiceBoard: [{ resourceId: 'notes' }, { resourceId: 'memory' }] } },
    { id: 'analysis', type: 'analysis', data: { teacherOnly: true, vocabulary: ['migrate'] } },
    { id: 'visual', type: 'visualsupports', data: { panels: [{ label: 'Pond habitat', image: 'data:image/png;base64,Ag==' }], narration: { audio: 'data:audio/wav;base64,Aw==', preview: 'blob:https://canvas.example/session-only' } } },
  ];
}

async function buildMixedSnapshot(history = mixedHistory(), previousStore = recovery.emptyStore()) {
  const env = {
    window: {}, ALLO_WORKSPACE_RECOVERY: recovery, history, units: [{ id: 'unit', resources: history.map(item => item.id) }], profiles: [{ id: 'learner', name: 'Demo' }], selectedProfileId: 'learner',
    generatedContent: history[0], activeView: 'simplified', inputText: history[0].data, sourceTopic: 'Pond',
    canvasRecoveryCurrentIdRef: { current: 'mixed-pond' }, canvasRecoveryStoreRef: { current: previousStore },
    _alloCaptureCanvasSelAuthoringState: () => ({ stations: [], toolData: {}, snapshots: [] }),
    _alloNormalizeResearchSettings: value => value, _alloNormalizeStudentProjectSettings: value => value,
    studentProjectSettings: { hideStudentAiFeatures: true }, studentResponses: { quiz: { response: 'Sunlight' } }, studentProgressLog: [{ resourceId: 'quiz', completed: true }], stickers: [],
    wordSoundsHistory: [{ word: 'migrate', activity: 'blend' }], wordSoundsAudioLibrary: { clip: 'data:audio/wav;base64,BA==' },
    guidedMode: true, guidedStep: 3, guidedSelectedIds: ['original', 'notes', 'memory'], guidedCompletedIds: ['original'], guidedSkippedIds: [], guidedCreatedHistoryIds: history.map(item => item.id), guidedDeliveryEvidence: {}, guidedPlanBrief: { goal: 'Understand pond habitats' },
  };
  const scope = new Proxy(env, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
  const source = section(host, '  const buildCanvasWorkspaceSnapshot = async ', '  const restoreCanvasWorkspaceSnapshot');
  return new Function('scope', 'with(scope) {\n' + source + '\nreturn buildCanvasWorkspaceSnapshot();\n}')(scope);
}

function durableBridgeFixture() {
  const rows = new Map(), clients = [];
  const indexedDB = { open() { const request = {}; queueMicrotask(() => { request.result = {
    transaction(_store, mode) {
      const writes = [], transaction = { objectStore() { return {
        get(key) { const request = {}; queueMicrotask(() => { request.result = rows.has(key) ? structuredClone(rows.get(key)) : undefined; request.onsuccess?.(); }); return request; },
        put(row) { writes.push(structuredClone(row)); },
      }; }, abort() { transaction.aborted = true; queueMicrotask(() => transaction.onabort?.()); } };
      if (mode === 'readwrite') queueMicrotask(() => queueMicrotask(() => { if (!transaction.aborted) { writes.forEach(row => rows.set(row.k, row)); transaction.oncomplete?.(); } }));
      return transaction;
    },
  }; request.onsuccess?.(); }); return request; } };
  const declarations = section(bridgeSource, '  var DB_NAME =', '  // ── Bridge mode');
  const operationSource = section(bridgeSource, '  function handleOp(msg)', '  if (isBridge)');
  const freshClient = async () => {
    const bridge = new Function('indexedDB', 'navigator', declarations + '\nvar RESERVED_NS_RE = /^__/;\n' + operationSource + '\nreturn handleOp;')(indexedDB, {});
    const listeners = new Set(); let frame;
    const bridgeWindow = { postMessage(message) {
      const emit = data => listeners.forEach(fn => fn({ source: bridgeWindow, origin: 'https://alloflow-cdn.pages.dev', data }));
      if (message.type === 'allo-bridge-hello') { queueMicrotask(() => emit({ allo: 'ds1', nonce: message.nonce, type: 'allo-bridge-ready' })); return; }
      bridge(message).then(value => emit({ allo: 'ds1', nonce: message.nonce, id: message.id, ok: true, value }), error => emit({ allo: 'ds1', nonce: message.nonce, id: message.id, ok: false, error: { code: error.code, message: error.message } }));
    } };
    const document = { body: { appendChild(el) { el.isConnected = true; } }, createElement() { frame = { contentWindow: bridgeWindow, style: {}, setAttribute() {}, removeAttribute() {}, remove() { this.isConnected = false; } }; return frame; } };
    const window = { crypto: webcrypto, location: { hostname: 'demo.googleusercontent.com', origin: 'https://demo.googleusercontent.com', href: 'https://demo.googleusercontent.com' }, addEventListener: (_name, fn) => listeners.add(fn), removeEventListener: (_name, fn) => listeners.delete(fn) };
    new Function('window', 'document', 'navigator', 'crypto', clientSource)(window, document, {}, webcrypto);
    window.alloDeviceStorage.init({ surface: 'canvas' }); await window.alloDeviceStorage.ready(); clients.push(window.alloDeviceStorage); return window.alloDeviceStorage;
  };
  return { rows, freshClient, cleanup: () => clients.forEach(api => api.disconnect()) };
}

function reloadFixture(storage, { legacy = null } = {}) {
  const updates = [], stopped = { current: false }, env = {
    isStorageDisabled: false, cancelled: false, _alloGetCanvasDeviceStorage: async () => storage, _alloGetRecoveryVaultStack: async () => ({ vault: vaultApi }),
    ALLO_WORKSPACE_RECOVERY: recovery, ALLO_WORKSPACE_RECOVERY_NAMESPACE: 'workspace_recovery', ALLO_WORKSPACE_RECOVERY_KEY: 'store_v1',
    storageDB: { get: async () => legacy }, hydrateHistory: items => items, isCanvasStudentEntry: () => false,
    canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryStoreRef: { current: recovery.emptyStore() }, canvasRecoveryCurrentIdRef: { current: null },
    getCanvasRecoveryVaultController: () => integration.createController(storage, { vaultModule: vaultApi, crypto: cryptoApi, cryptoOptions: { iterations: cryptoApi.MIN_PBKDF2_ITERATIONS } }), clearCanvasRecoveryVaultSecrets() {},
    warnLog() {},
  };
  for (const name of ['setCanvasRecoveryDecisionMade', 'setCanvasRecoveryDialogMode', 'setCanvasRecoverySaveStatus', 'setCanvasRecoveryError', 'setCanvasRecoveryErrorCode', 'setCanvasRecoveryVaultState', 'setCanvasRecoveryStore', 'setCanvasRecoveryStoreAuthoritative', 'setLastSaved', 'setIsHistoryLoaded']) env[name] = value => updates.push([name, value]);
  Object.defineProperty(env, 'cancelled', { get: () => stopped.current });
  const scope = new Proxy(env, { has: () => true, get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
  const source = section(host, '        const loadCanvasWorkspace = async () => {', '        loadCanvasWorkspace();');
  const run = new Function('scope', 'with(scope) {\n' + source + '\nreturn loadCanvasWorkspace;\n}')(scope);
  return { updates, env, run, unmount: () => { stopped.current = true; } };
}

function prefsFixture({ existing = {} } = {}) {
  vi.useFakeTimers();
  const ready = deferred(), saved = { 'allo_saved_notes': 'Last-good teacher notes', 'alloflow_theme': 'dark' }, current = new Map(Object.entries(existing)), writes = [], events = {};
  let durable = clone(saved);
  const storage = {
    getItem: key => current.has(key) ? current.get(key) : null, setItem: (key, value) => current.set(key, String(value)),
    get length() { return current.size; }, key: index => [...current.keys()][index] ?? null,
  };
  const ds = {
    ready: vi.fn(() => ready.promise), get: vi.fn(async () => clone(durable)), set: vi.fn(async (_ns, _key, value) => { writes.push(clone(value)); durable = clone(value); return true; }),
  };
  const window = { location: { hostname: 'demo.googleusercontent.com', href: 'https://demo.googleusercontent.com/' }, alloDeviceStorage: ds,
    addEventListener: (name, callback) => { events[name] = callback; }, dispatchEvent() {} };
  const document = { addEventListener: (name, callback) => { events[name] = callback; }, visibilityState: 'visible' };
  const source = section(utils, 'const _dsBridgeWanted =', 'const storageDB =');
  new Function('window', 'document', 'localStorage', 'warnLog', 'setInterval', 'CustomEvent', source)(window, document, storage, () => {}, setInterval, class { constructor(type, detail) { this.type = type; this.detail = detail; } });
  return { ready, writes, current, events, window, ds, get durable() { return durable; }, saved };
}

describe('actual mixed-resource workspace construction and serialization', () => {
  it('preserves all 15 distinct resources, exact source text, original annotations and selected activity after serialization', async () => {
    const snapshot = await buildMixedSnapshot(); const roundTrip = recovery.normalizeSnapshot(clone(snapshot));
    expect(roundTrip.resourceCount).toBe(15); expect(roundTrip.workspace.history.map(item => item.id)).toEqual(mixedHistory().map(item => item.id));
    expect(roundTrip.workspace.history[0].data).toBe(mixedHistory()[0].data); expect(roundTrip.workspace.history[0].originalAnnotations).toEqual(mixedHistory()[0].originalAnnotations);
    expect(roundTrip.workspace.activeResourceId).toBe('original'); expect(roundTrip.workspace.guidedProgress.selectedIds).toEqual(['original', 'notes', 'memory']);
    expect(roundTrip.workspace.projectState.responses).toEqual({ quiz: { response: 'Sunlight' } });
    expect(roundTrip.workspace.history[12].data.choiceBoard).toEqual([{ resourceId: 'notes' }, { resourceId: 'memory' }]);
  });
  it('retains persistent data-URI supports while removing only session blob URLs with an omission record', async () => {
    const snapshot = await buildMixedSnapshot(), visual = snapshot.workspace.history.at(-1);
    expect(visual.data.panels[0].image).toBe('data:image/png;base64,Ag=='); expect(visual.data.narration.audio).toBe('data:audio/wav;base64,Aw=='); expect(visual.data.narration.preview).toBeNull();
    expect(snapshot.omittedAssetManifest).toContainEqual(expect.objectContaining({ path: 'snapshot.workspace.history[14].data.narration.preview', reason: 'session-only-url' }));
    expect(snapshot.workspace.history).toHaveLength(15); expect(snapshot.assetPolicy).toBe('text-only');
  });
  it('demonstrates why Saved work category totals do not establish populated recovery workspaces', () => {
    const entries = Array.from({ length: 42 }, (_, index) => ({ key: 'allo_saved_item_' + index, value: 'Evidence ' + index + ' ' + 'x'.repeat(530) }));
    const summary = inventory.summarizeEntries(entries); expect(summary).toContainEqual(expect.objectContaining({ id: 'user-content', count: 42 }));
    expect(summary[0].approximateBytes).toBeGreaterThan(22000);
    expect(recovery.normalizeStore({ version: 1, snapshots: [], legacyMigrationComplete: true }).snapshots).toHaveLength(0);
  });
  it.skipIf(mediaCandidate)('characterizes a second-save media omission after a session-only URL marks the prior snapshot text-only', async () => {
    const first = await buildMixedSnapshot(); const second = await buildMixedSnapshot(mixedHistory(), recovery.upsert(recovery.emptyStore(), first));
    expect(first.workspace.history[2].data[0].image).toBe('data:image/png;base64,AQ==');
    expect(second.workspace.history[2].data[0].image).toBeNull();
    expect(second.omittedAssetManifest).toContainEqual(expect.objectContaining({ reason: 'device-quota', kind: 'image/png' }));
    expect(second.resourceCount ?? second.workspace.history.length).toBe(15);
  });
  it.skipIf(!mediaCandidate)('preserves valid media on the next save after a session-only blob omission', async () => {
    const first = await buildMixedSnapshot(), second = await buildMixedSnapshot(mixedHistory(), recovery.upsert(recovery.emptyStore(), first));
    expect(second.workspace.history[2].data[0].image).toBe('data:image/png;base64,AQ==');
    expect(second.workspace.history[0].originalAnnotations[0].image.src).toBe('data:image/png;base64,AA==');
    expect(second.workspace.history.at(-1).data.narration.audio).toBe('data:audio/wav;base64,Aw==');
    expect(second.workspace.history.at(-1).data.narration.preview).toBeNull(); expect(second.workspace.history).toHaveLength(15);
    expect(second.omittedAssetManifest.some(item => item.reason === 'device-quota')).toBe(false);
    expect(second.omittedAssetManifest.some(item => item.reason === 'session-only-url')).toBe(true);
  });
  it('preserves explicit teacher media-removal policy on subsequent saves', async () => {
    const first = recovery.stripLargeAssets(await buildMixedSnapshot(), 'user-remove-media');
    const second = await buildMixedSnapshot(mixedHistory(), recovery.upsert(recovery.emptyStore(), first));
    expect(second.workspace.history[2].data[0].image).toBeNull();
    expect(second.omittedAssetManifest.some(item => item.reason === 'user-remove-media')).toBe(true);
  });
  it('records device-quota omissions only after an actual quota rejection in the existing save fallback', async () => {
    const snapshot = await buildMixedSnapshot(), writer = vi.fn(async candidate => ({ applied: true, store: recovery.upsert(recovery.emptyStore(), candidate) }));
    writer.mockRejectedValueOnce(Object.assign(Error('Device storage quota exceeded'), { name: 'QuotaExceededError' }));
    const saved = await recovery.saveWithQuotaFallback(snapshot, writer);
    expect(writer).toHaveBeenCalledTimes(2); expect(saved.degraded).toBe(true); expect(saved.savedSnapshot.workspace.history).toHaveLength(15);
    expect(saved.savedSnapshot.omittedAssetManifest.some(item => item.reason === 'device-quota')).toBe(true);
    expect(saved.savedSnapshot.workspace.history[2].data[0].image).toBeNull();
  });
  it('does not classify a rejected network write as quota or strip media to hide it', async () => {
    const snapshot = await buildMixedSnapshot(), writer = vi.fn(async () => { throw Error('Connection interrupted'); });
    await expect(recovery.saveWithQuotaFallback(snapshot, writer)).rejects.toThrow('Connection interrupted'); expect(writer).toHaveBeenCalledTimes(1);
    expect(snapshot.workspace.history[2].data[0].image).toBe('data:image/png;base64,AQ==');
  });
});

describe('mixed pack bridge/vault reload and actual Canvas recovery bootstrap', () => {
  it('reads all mixed resources through a fresh bridge/client and offers the actual restore choice', async () => {
    const disk = durableBridgeFixture(); try {
      const snapshot = await buildMixedSnapshot(), first = await disk.freshClient();
      await first.mutateRecovery('workspace_recovery', 'store_v1', { version: 1, action: 'upsert', snapshot }, { queue: false }); first.disconnect();
      const second = await disk.freshClient(), f = reloadFixture(second); await f.run();
      expect(f.env.canvasRecoveryStoreRef.current.snapshots[0].workspace.history).toEqual(snapshot.workspace.history);
      expect(f.updates).toContainEqual(['setCanvasRecoveryDialogMode', 'choice']); expect(f.updates).toContainEqual(['setCanvasRecoveryStoreAuthoritative', true]);
      expect(f.env.canvasRecoveryCurrentIdRef.current).toBe('mixed-pond');
    } finally { disk.cleanup(); }
  });
  it('authenticates encrypted mixed resources after fresh-client reload and preserves locked bootstrap behavior', async () => {
    const disk = durableBridgeFixture(); try {
      const snapshot = await buildMixedSnapshot(), first = await disk.freshClient();
      await first.mutateRecovery('workspace_recovery', 'store_v1', { version: 1, action: 'upsert', snapshot }, { queue: false });
      const controller = integration.createController(first, { vaultModule: vaultApi, crypto: cryptoApi, cryptoOptions: { iterations: cryptoApi.MIN_PBKDF2_ITERATIONS } });
      await controller.enableProtection('local-test-password'); controller.lock(); first.disconnect();
      const second = await disk.freshClient(), f = reloadFixture(second); await f.run();
      expect(f.updates).toContainEqual(['setCanvasRecoveryDialogMode', 'vault-locked']); expect(f.updates).toContainEqual(['setCanvasRecoverySaveStatus', 'locked']);
      const reopened = integration.createController(second, { vaultModule: vaultApi, crypto: cryptoApi, cryptoOptions: { iterations: cryptoApi.MIN_PBKDF2_ITERATIONS } }); await reopened.unlock('local-test-password');
      expect((await reopened.restoreSnapshot('mixed-pond')).workspace.history).toEqual(snapshot.workspace.history);
      expect(JSON.stringify([...disk.rows.values()])).not.toContain(snapshot.workspace.inputText);
    } finally { disk.cleanup(); }
  });
  it('exposes rejected reload checks as non-authoritative errors instead of an empty saved-work decision', async () => {
    const f = reloadFixture({ get: async () => { throw Object.assign(Error('Read acknowledgement rejected'), { code: 'mock/read-rejected' }); } }); await f.run();
    expect(f.updates).toContainEqual(['setCanvasRecoveryStoreAuthoritative', false]); expect(f.updates).toContainEqual(['setCanvasRecoveryDialogMode', 'error']);
    expect(f.updates).toContainEqual(['setCanvasRecoveryErrorCode', 'mock/read-rejected']); expect(f.updates).toContainEqual(['setIsHistoryLoaded', true]);
    expect(f.updates).not.toContainEqual(['setCanvasRecoverySaveStatus', 'idle']);
  });
  it('does not publish storage/history state after a delayed read settles following unmount', async () => {
    const pending = deferred(), f = reloadFixture({ get: () => pending.promise }), running = f.run(); await flush(); const before = clone(f.updates);
    f.unmount(); pending.resolve(recovery.emptyStore()); await running; expect(f.updates).toEqual(before);
  });
});

describe('preference hydration versus delayed storage acknowledgement', () => {
  it('preserves last-good preferences when a periodic snapshot occurs before delayed approval', async () => {
    const f = prefsFixture(); await vi.advanceTimersByTimeAsync(30001); expect(f.writes).toHaveLength(0);
    f.ready.resolve(); await flush();
    expect(f.current.get('allo_saved_notes')).toBe('Last-good teacher notes');
    expect(f.durable).toEqual(f.saved); expect(f.writes).toHaveLength(0);
    f.events.pagehide(); await flush(); expect(f.durable).toEqual(f.saved);
  });
  it('never overwrites available saved notes with boot defaults captured before hydration', async () => {
    const f = prefsFixture({ existing: { alloflow_theme: 'light' } }); f.events.pagehide(); f.ready.resolve(); await flush();
    expect(f.current.get('allo_saved_notes')).toBe('Last-good teacher notes'); expect(f.current.get('alloflow_theme')).toBe('light');
    expect(f.durable).toEqual(f.saved); expect(f.writes).toHaveLength(0);
    f.events.pagehide(); await flush(); expect(f.durable).toEqual({ ...f.saved, alloflow_theme: 'light' });
  });
  it('does not snapshot after rejected hydration until an explicit successful retry', async () => {
    const f = prefsFixture(); f.ds.get.mockRejectedValueOnce(Error('Mock failed read')); f.ready.resolve(); await flush();
    expect(f.window.__alloPrefsHydrationStatus).toBe('unavailable'); f.events.pagehide(); await vi.advanceTimersByTimeAsync(60001); await flush();
    expect(f.writes).toHaveLength(0); expect(f.durable).toEqual(f.saved);
    await f.window.__alloRetryPrefsHydration(); expect(f.window.__alloPrefsHydrationStatus).toBe('ready');
    f.current.set('allo_saved_notes', 'Teacher edit after retry'); f.events.pagehide(); await flush();
    expect(f.durable.allo_saved_notes).toBe('Teacher edit after retry');
  });
  it('captures values after storage readiness and persists legitimate edits made during a delayed reconnect', async () => {
    const f = prefsFixture(); f.ready.resolve(); await flush();
    const reconnect = deferred(); f.ds.ready.mockImplementation(() => reconnect.promise);
    f.current.set('allo_saved_notes', 'First edit'); f.events.pagehide(); await flush(); f.current.set('allo_saved_notes', 'Newest edit');
    reconnect.resolve(); await flush(); expect(f.durable.allo_saved_notes).toBe('Newest edit');
  });
  it('serializes repeated pagehide writes and drains a newer edit after the first acknowledgement', async () => {
    const f = prefsFixture(); f.ready.resolve(); await flush(); const pending = deferred(), originalSet = f.ds.set.getMockImplementation();
    f.ds.set.mockImplementationOnce(async (...args) => { await pending.promise; return originalSet(...args); });
    f.current.set('allo_saved_notes', 'First edit'); f.events.pagehide(); await flush(); f.current.set('allo_saved_notes', 'Second edit'); f.events.pagehide(); await flush();
    expect(f.ds.set).toHaveBeenCalledTimes(1); pending.resolve(); await flush();
    expect(f.durable.allo_saved_notes).toBe('Second edit'); expect(f.ds.set).toHaveBeenCalledTimes(2);
  });
  it('leaves failed snapshot signatures retryable and preserves last-good disk values', async () => {
    const f = prefsFixture(); f.ready.resolve(); await flush(); f.ds.set.mockRejectedValueOnce(Error('Mock failed write'));
    f.current.set('allo_saved_notes', 'Teacher edit'); f.events.pagehide(); await flush(); expect(f.durable).toEqual(f.saved);
    f.events.pagehide(); await flush(); expect(f.durable.allo_saved_notes).toBe('Teacher edit');
  });
});
