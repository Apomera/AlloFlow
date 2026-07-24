import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const moduleSrc = readFileSync(resolve(process.cwd(), 'allo_device_storage_module.js'), 'utf8');
const bridgeSrc = readFileSync(resolve(process.cwd(), 'storage_bridge.html'), 'utf8');
const mirrorSrc = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/allo_device_storage_module.js'), 'utf8');

describe('device storage bridge — file contracts', () => {
  it('keeps the root module and the deploy mirror byte-identical', () => {
    expect(mirrorSrc).toBe(moduleSrc);
  });

  it('bridge page is self-contained (no external resources, no network calls)', () => {
    expect(bridgeSrc).not.toMatch(/<script[^>]+src=/i);
    expect(bridgeSrc).not.toMatch(/<link[^>]+href=/i);
    expect(bridgeSrc).not.toContain('fetch(');
    expect(bridgeSrc).not.toContain('XMLHttpRequest');
    expect(bridgeSrc).toContain('name="robots" content="noindex');
  });

  it('module and bridge agree on the ds1 protocol and database name', () => {
    expect(moduleSrc).toContain("var PROTO = 'ds1'");
    expect(bridgeSrc).toContain("var PROTO = 'ds1'");
    expect(bridgeSrc).toContain("var DB_NAME = 'allo_device_storage'");
    expect(moduleSrc).toContain("var DIRECT_DB = 'allo_device_storage'");
  });

  it('bridge authenticates by nonce + source reference and supports iframe mode', () => {
    expect(bridgeSrc).toContain('msg.nonce !== nonce');
    expect(bridgeSrc).toContain('event.source !== client');
    expect(bridgeSrc).toContain('window.opener || (window.parent !== window ? window.parent : null)');
    expect(bridgeSrc).toContain('allo-ds=');
  });

  it('module targets the CDN origin, never prismflow', () => {
    expect(moduleSrc).toContain('https://alloflow-cdn.pages.dev/storage_bridge.html');
    expect(moduleSrc).not.toMatch(/prismflow/i);
    expect(bridgeSrc).not.toMatch(/prismflow/i);
  });

  it('supports namespace enumeration on both ends (in-panel review of the partitioned bucket)', () => {
    expect(bridgeSrc).toContain('namespaces:1');
    expect(bridgeSrc).toContain("case 'namespaces':");
    expect(moduleSrc).toContain("namespaces: function () { return guarded('namespaces', {}); }");
    expect(moduleSrc).toContain('View app data');
  });

  it('keeps recovery mutations atomic in both IndexedDB implementations', () => {
    expect(bridgeSrc).toContain('mutateRecovery:1');
    expect(bridgeSrc).toContain("case 'mutateRecovery': return kvMutateRecovery(ns, key, msg.mutation)");
    expect(moduleSrc).toContain("mutateRecovery: function (ns, key, mutation, opts)");
    expect(moduleSrc).toContain("guarded('mutateRecovery', { ns: ns, key: key, mutation: mutation }, opts)");

    const bridgeStart = bridgeSrc.indexOf('function kvMutateRecovery(');
    const bridgeEnd = bridgeSrc.indexOf('function kvDelete(', bridgeStart);
    const bridgeMutation = bridgeSrc.slice(bridgeStart, bridgeEnd);
    expect(bridgeMutation).toContain("db.transaction(STORE, 'readwrite')");
    expect(bridgeMutation).toContain('store.get(recKey(ns, key))');
    expect(bridgeMutation).toContain('applyRecoveryMutation(request.result ? request.result.value : null, mutation)');
    expect(bridgeMutation).toContain('value: result.store');

    const directStart = moduleSrc.indexOf("} else if (op === 'mutateRecovery') {");
    const directEnd = moduleSrc.indexOf("} else if (op === 'delete')", directStart);
    const directMutation = moduleSrc.slice(directStart, directEnd);
    expect(directMutation).toContain('store.get(k)');
    expect(directMutation).toContain('applyRecoveryMutation(recoveryGet.result ? recoveryGet.result.value : null, params.mutation)');
    expect(directMutation).toContain('value: result.store');
  });

  it('wires persona interview resume through the bridge', () => {
    const viewSource = readFileSync(resolve(process.cwd(), 'view_persona_chat_source.jsx'), 'utf8');
    const viewModule = readFileSync(resolve(process.cwd(), 'view_persona_chat_module.js'), 'utf8');
    const viewDeployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_persona_chat_module.js'), 'utf8');
    expect(viewDeployed).toBe(viewModule);
    for (const src of [viewSource, viewModule]) {
      expect(src).toContain("'persona_sessions'");
      expect(src).toContain('_handleResumeSnapshot');
      expect(src).toContain('_handleDiscardSnapshot');
      // both reflection Continue buttons clear the snapshot at session end
      expect(src.match(/_clearPersonaSnapshot\(\)/g).length).toBeGreaterThanOrEqual(3);
      expect(src).toContain('allo_device_storage_module.js?v=');
    }
  });

  it('mirrors the app-wide storageDB autosave layer through the bridge in Canvas', () => {
    const upSource = readFileSync(resolve(process.cwd(), 'utils_pure_source.jsx'), 'utf8');
    const upModule = readFileSync(resolve(process.cwd(), 'utils_pure_module.js'), 'utf8');
    const upDeployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/utils_pure_module.js'), 'utf8');
    expect(upDeployed).toBe(upModule);
    for (const src of [upSource, upModule]) {
      expect(src).toContain('_dsBridgeWanted');
      expect(src).toContain("'app_kv'");
      expect(src).toContain('_dsMirrorSet(key, valToStore)');
      expect(src).toContain("clearNamespace('app_kv')");
      expect(src).toContain('allo_device_storage_module.js?v=');
    }
  });

  it('deduplicates connection handshakes and preserves failed queued writes', () => {
    const connectStart = moduleSrc.indexOf('BridgeTransport.prototype.connect');
    const connectEnd = moduleSrc.indexOf('BridgeTransport.prototype.request', connectStart);
    const connect = moduleSrc.slice(connectStart, connectEnd);
    expect(connect).toContain('if (self.connectPromise) return self.connectPromise');
    expect(connect).toContain('self.connectTimer = timer');
    expect(connect).toContain('self.connectReject = reject');

    const flushStart = moduleSrc.indexOf('function flushQueue()');
    const flushEnd = moduleSrc.indexOf('function guarded(', flushStart);
    const flush = moduleSrc.slice(flushStart, flushEnd);
    expect(flush).toContain('if (state.flushPromise) return state.flushPromise');
    expect(flush).toContain('state.writeQueue = queued.slice(applied).concat(state.writeQueue)');
    expect(flush).not.toContain('backend.request(item.op, item.params).catch(function () {})');
    const guardedStart = moduleSrc.indexOf('function guarded(');
    const guardedEnd = moduleSrc.indexOf('var api =', guardedStart);
    const guarded = moduleSrc.slice(guardedStart, guardedEnd);
    expect(guarded).toContain('if (state.flushPromise) return state.flushPromise.then');

    const teardownStart = moduleSrc.indexOf('BridgeTransport.prototype.teardown');
    const teardownEnd = moduleSrc.indexOf('// ── Direct backend', teardownStart);
    const teardown = moduleSrc.slice(teardownStart, teardownEnd);
    expect(teardown).toContain("connectReject(storageError('allo/storage-disconnected'");
  });

  it('restores localStorage prefs in Canvas and gates first paint on hydration', () => {
    const upSource = readFileSync(resolve(process.cwd(), 'utils_pure_source.jsx'), 'utf8');
    const upModule = readFileSync(resolve(process.cwd(), 'utils_pure_module.js'), 'utf8');
    for (const src of [upSource, upModule]) {
      expect(src).toContain("'ls_prefs'");
      expect(src).toContain('__alloPrefsHydrated');
      expect(src).toContain('allo-prefs-hydrated');
      // hydration must never clobber values the session already wrote
      expect(src).toContain('localStorage.getItem(k) === null');
    }
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('_isCanvasEnv && !window.__alloPrefsHydrated');
    expect(anti).toContain("window.addEventListener('allo-prefs-hydrated', _alloGo, { once: true })");
    expect(anti).toContain('setTimeout(_alloGo, 1500)');
  });

  it('bridges adventure scene images on Canvas (replaces the cloud archive need)', () => {
    const ehModule = readFileSync(resolve(process.cwd(), 'export_handlers_module.js'), 'utf8');
    expect(ehModule).toContain('_advBridgeWanted');
    expect(ehModule).toContain("'adventure_images'");
    expect(ehModule).toContain("clearNamespace('adventure_images')");
    // 30-day expiry mirrors the cloud archive convention
    expect(ehModule).toContain('30 * 24 * 60 * 60 * 1000');
    expect(ehModule).toContain('allo_device_storage_module.js?v=');
  });

  it('ships the on-screen probe panel and its keyboard bootstrap', () => {
    expect(moduleSrc).toContain('__openProbePanel');
    const tuSource = readFileSync(resolve(process.cwd(), 'text_utility_helpers_source.jsx'), 'utf8');
    const tuModule = readFileSync(resolve(process.cwd(), 'text_utility_helpers_module.js'), 'utf8');
    const tuDeployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/text_utility_helpers_module.js'), 'utf8');
    for (const src of [tuSource, tuModule]) {
      expect(src).toContain('__alloOpenDeviceStorageProbe');
      expect(src).toContain('__alloDeviceStorageProbeArmed');
      expect(src).toMatch(/e\.ctrlKey && e\.altKey && e\.shiftKey && \(e\.key === ["']D["']/);
      expect(src).toContain('allo_device_storage_module.js?v=');
    }
    expect(tuDeployed).toBe(tuModule);
  });

  // 2026-07-20: slots 3 → 8 with a size budget. The eviction rule lives in
  // THREE independent copies (app monolith, this adapter, the bridge page);
  // drift means the bridge silently discards workspaces the app still shows.
  it('all three copies of the recovery cap agree (8 slots + size budget)', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('const MAX_SNAPSHOTS = 8;');
    expect(anti).toContain('const MAX_TOTAL_BYTES = 150 * 1024 * 1024;');
    for (const src of [moduleSrc, bridgeSrc]) {
      expect(src).toContain('var RECOVERY_MAX_SNAPSHOTS = 8;');
      expect(src).toContain('var RECOVERY_MAX_TOTAL_BYTES = 150 * 1024 * 1024;');
      expect(src).toContain('snapshots: capRecoverySnapshots(snapshots)');
      expect(src).toContain('function capRecoverySnapshots(snapshots)');
      // the incoming record is weighed once, at write time
      expect(src).toContain('snapshot.approximateBytes = JSON.stringify(snapshot).length;');
    }
    // no stale count-only slice survives in either copy
    expect(moduleSrc).not.toContain('snapshots.slice(0, RECOVERY_MAX_SNAPSHOTS)');
    expect(bridgeSrc).not.toContain('snapshots.slice(0, RECOVERY_MAX_SNAPSHOTS)');
  });

  it('the bridge cache-buster was bumped so caches refetch the new rule', () => {
    // The bridge is loaded from the CDN, so a stale ?v= would keep enforcing
    // the OLD 3-slot cap for anyone whose browser cached the page.
    expect(moduleSrc).toContain('storage_bridge.html?v=ds2-slots8');
    expect(moduleSrc).not.toContain('ds1-recovery-atomic1');
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('allo_device_storage_module.js?v=ds2-slots8');
    expect(anti).not.toContain('ds1-recovery-atomic1');
  });

  it('teacher-facing copy states the real number instead of a hardcoded 3', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).not.toContain('AlloFlow keeps the 3 most recent device workspaces');
    expect(anti).toContain('AlloFlow keeps the {ALLO_WORKSPACE_RECOVERY.MAX_SNAPSHOTS} most recent device workspaces');
    expect(anti).toContain('Manage saved work ({canvasRecoveryStore.snapshots.length} of {ALLO_WORKSPACE_RECOVERY.MAX_SNAPSHOTS})');
    // and it explains WHY an old workspace disappears, in teacher language
    expect(anti).toContain('erases the oldest workspace rather than dropping the newest one');
    expect(anti).toContain('const _alloFormatWorkspaceBytes = (bytes) => {');
  });
});

describe('device storage adapter — behavior', () => {
  let api;
  beforeAll(() => {
    global.window = {};
    // eslint-disable-next-line no-eval
    eval(moduleSrc);
    api = global.window.alloDeviceStorage;
  });

  it('registers the API and module flag', () => {
    expect(api).toBeTruthy();
    expect(global.window.AlloModules.DeviceStorageModule).toBe(true);
  });

  it('validates namespaces and keys', () => {
    const v = api._internal;
    expect(v.validateNs('persona_sessions')).toBe(true);
    expect(v.validateNs('a/b')).toBe(false);
    expect(v.validateNs('')).toBe(false);
    expect(v.validateNs('x'.repeat(65))).toBe(false);
    expect(v.validateKey('k1')).toBe(true);
    expect(v.validateKey('')).toBe(false);
    expect(v.validateKey('x'.repeat(513))).toBe(false);
  });

  it('builds ds1 envelopes and recognizes responses', () => {
    const v = api._internal;
    const msg = v.buildEnvelope('nonce123', 'r1', 'set', { ns: 'n', key: 'k', value: 42 });
    expect(msg).toEqual({ allo: 'ds1', nonce: 'nonce123', id: 'r1', op: 'set', ns: 'n', key: 'k', value: 42 });
    expect(v.isValidResponse({ allo: 'ds1', id: 'r1', ok: true })).toBe(true);
    expect(v.isValidResponse({ allo: 'other', id: 'r1', ok: true })).toBe(false);
    expect(v.isValidResponse(null)).toBe(false);
  });

  it('forwards recovery mutations in ds1 envelopes', () => {
    const mutation = { version: 1, action: 'remove', snapshotId: 'workspace-a' };
    const msg = api._internal.buildEnvelope('nonce123', 'r2', 'mutateRecovery', {
      ns: 'workspace_recovery', key: 'store_v1', mutation
    });
    expect(msg).toEqual({ allo: 'ds1', nonce: 'nonce123', id: 'r2', op: 'mutateRecovery', ns: 'workspace_recovery', key: 'store_v1', mutation });
  });

  it('memory backend round-trips get/set/list/clear', async () => {
    await api.useMemory();
    expect(api.status().backend).toBe('memory');
    await api.set('unit_ns', 'alpha', { a: 1 });
    await api.set('unit_ns', 'beta', 'two');
    expect(await api.get('unit_ns', 'alpha')).toEqual({ a: 1 });
    expect((await api.list('unit_ns')).sort()).toEqual(['alpha', 'beta']);
    await api.remove('unit_ns', 'alpha');
    expect(await api.get('unit_ns', 'alpha')).toBe(null);
    expect(await api.clearNamespace('unit_ns')).toBe(1);
    expect(await api.list('unit_ns')).toEqual([]);
  });

  it('atomically merges recovery snapshots, caps history, and rejects stale writes', async () => {
    await api.useMemory();
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    await api.set(ns, key, { version: 1, legacyMigrationComplete: false, removedSnapshotIds: {}, snapshots: [] });
    const snapshot = (id, savedAt, marker) => ({ version: 1, id, savedAt, marker, workspace: { history: [{ id: marker }] } });

    // 2026-07-20: nine saves against the 8-slot cap — only the oldest goes.
    const days = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
    for (let i = 0; i < days.length; i++) {
      const id = 'workspace-' + String.fromCharCode(97 + i); // a..i
      const result = await api.mutateRecovery(ns, key, {
        version: 1,
        action: 'upsert',
        snapshot: snapshot(id, `2026-07-${days[i]}T12:00:00.000Z`, id)
      }, { queue: false });
      expect(result).toMatchObject({ applied: true, reason: 'upserted' });
    }
    const capped = await api.get(ns, key);
    expect(capped.snapshots).toHaveLength(8);
    expect(capped.snapshots.map(item => item.id)).toEqual([
      'workspace-i', 'workspace-h', 'workspace-g', 'workspace-f',
      'workspace-e', 'workspace-d', 'workspace-c', 'workspace-b'
    ]);
    expect(capped.snapshots.some(item => item.id === 'workspace-a')).toBe(false);
    // every stored record carries its measured size for byte-aware eviction
    expect(capped.snapshots.every(item => Number(item.approximateBytes) > 0)).toBe(true);

    // A workspace bigger than the whole budget still lands, and still evicts
    // older ones rather than being refused (the newest is never dropped).
    const huge = snapshot('workspace-huge', '2026-07-10T12:00:00.000Z', 'huge');
    huge.approximateBytes = 400 * 1024 * 1024;
    const heavy = await api.mutateRecovery(ns, key, { version: 1, action: 'upsert', snapshot: huge }, { queue: false });
    expect(heavy).toMatchObject({ applied: true, reason: 'upserted' });
    expect(heavy.store.snapshots.map(item => item.id)).toEqual(['workspace-huge']);
    // clean slate for the stale-write assertions below
    await api.set(ns, key, { version: 1, legacyMigrationComplete: false, removedSnapshotIds: {}, snapshots: [] });
    await api.mutateRecovery(ns, key, {
      version: 1, action: 'upsert', snapshot: snapshot('workspace-d', '2026-07-04T12:00:00.000Z', 'workspace-d')
    }, { queue: false });

    const stale = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: snapshot('workspace-d', '2026-07-03T00:00:00.000Z', 'stale')
    }, { queue: false });
    expect(stale).toMatchObject({ applied: false, reason: 'stale-snapshot' });
    expect(stale.store.snapshots.find(item => item.id === 'workspace-d').marker).toBe('workspace-d');

    const equalTimestamp = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: snapshot('workspace-d', '2026-07-04T12:00:00.000Z', 'same-time-other-tab')
    }, { queue: false });
    expect(equalTimestamp).toMatchObject({ applied: false, reason: 'stale-snapshot' });
    expect(equalTimestamp.store.snapshots.find(item => item.id === 'workspace-d').marker).toBe('workspace-d');
  });

  it('persists removal tombstones so another tab cannot resurrect a snapshot', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    const removed = await api.mutateRecovery(ns, key, {
      version: 1, action: 'remove', snapshotId: 'workspace-d', removedAt: '2026-07-05T00:00:00.000Z'
    }, { queue: false });
    expect(removed).toMatchObject({ applied: true, reason: 'removed' });
    expect(removed.store.removedSnapshotIds['workspace-d']).toBe('2026-07-05T00:00:00.000Z');
    expect(removed.store.snapshots.some(item => item.id === 'workspace-d')).toBe(false);

    const resurrection = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: { version: 1, id: 'workspace-d', savedAt: '2026-07-06T00:00:00.000Z', workspace: { history: [{}] } }
    }, { queue: false });
    expect(resurrection).toMatchObject({ applied: false, reason: 'removed-snapshot' });
    expect(resurrection.store.removedSnapshotIds).toHaveProperty('workspace-d');
  });

  it('marks legacy migration exactly once and can insert its snapshot atomically', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    await api.set(ns, key, { version: 1, snapshots: [] });
    const first = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'markLegacyMigrated',
      snapshot: { version: 1, id: 'workspace-legacy-a', savedAt: '2026-07-01T00:00:00.000Z', workspace: { history: [{}] } }
    }, { queue: false });
    expect(first).toMatchObject({ applied: true, reason: 'legacy-migrated' });
    expect(first.store.legacyMigrationComplete).toBe(true);
    expect(first.store.snapshots.map(item => item.id)).toEqual(['workspace-legacy-a']);

    const second = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'markLegacyMigrated',
      snapshot: { version: 1, id: 'workspace-legacy-b', savedAt: '2026-07-02T00:00:00.000Z', workspace: { history: [{}] } }
    }, { queue: false });
    expect(second).toMatchObject({ applied: false, reason: 'already-migrated' });
    expect(second.store.snapshots.map(item => item.id)).toEqual(['workspace-legacy-a']);
  });

  it('rejects future recovery versions without changing the authoritative store', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    const before = await api.get(ns, key);
    await expect(api.mutateRecovery(ns, key, {
      version: 2, action: 'remove', snapshotId: 'workspace-legacy-a'
    }, { queue: false })).rejects.toMatchObject({ code: 'allo/recovery-version-unsupported' });
    expect(await api.get(ns, key)).toEqual(before);

    await expect(api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: { version: 2, id: 'workspace-future', savedAt: '2026-07-03T00:00:00.000Z' }
    }, { queue: false })).rejects.toMatchObject({ code: 'allo/recovery-version-unsupported' });
    expect(await api.get(ns, key)).toEqual(before);

    const futureStore = { version: 2, snapshots: [{ version: 2, id: 'future-current' }] };
    await api.set(ns, key, futureStore);
    await expect(api.mutateRecovery(ns, key, {
      version: 1, action: 'markLegacyMigrated'
    }, { queue: false })).rejects.toMatchObject({ code: 'allo/recovery-version-unsupported' });
    expect(await api.get(ns, key)).toEqual(futureStore);

    await api.set(ns, key, before);
    await expect(api.mutateRecovery(ns, key, {
      version: 1, schemaVersion: 2, action: 'markLegacyMigrated'
    }, { queue: false })).rejects.toMatchObject({ code: 'allo/recovery-version-unsupported' });
  });

  it('rejects invalid namespaces and keys at the API boundary', async () => {
    await expect(api.get('bad ns!', 'k')).rejects.toMatchObject({ code: 'allo/bad-namespace' });
    await expect(api.set('okns', '', 1)).rejects.toMatchObject({ code: 'allo/bad-key' });
    await expect(api.mutateRecovery('other', 'store_v1', { version: 1, action: 'markLegacyMigrated' }, { queue: false }))
      .rejects.toMatchObject({ code: 'allo/recovery-target-invalid' });
  });

  it('queues writes while a bridge backend is disconnected', async () => {
    api.init({ surface: 'canvas' });
    expect(api.status().backend).toBe('bridge-iframe'); // iframe = default since the 2026-07-14 probe verdict
    const res = await api.set('queued_ns', 'k1', 'v1');
    expect(res).toEqual({ queued: true });
    expect(api.status().queuedWrites).toBe(1);
    await expect(api.get('queued_ns', 'k1')).rejects.toMatchObject({ code: 'allo/storage-disconnected' });
    await expect(api.mutateRecovery('workspace_recovery', 'store_v1',
      { version: 1, action: 'markLegacyMigrated' }, { queue: false }))
      .rejects.toMatchObject({ code: 'allo/storage-disconnected' });
    // memory fallback flushes the queue
    await api.useMemory();
    expect(api.status().queuedWrites).toBe(0);
    expect(await api.get('queued_ns', 'k1')).toBe('v1');
  });
});
