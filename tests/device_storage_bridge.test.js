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

  it('bridge authenticates by approved source + origin + nonce and supports iframe mode', () => {
    expect(bridgeSrc).toContain('msg.nonce !== nonce');
    expect(bridgeSrc).toContain('event.source !== client');
    expect(bridgeSrc).toContain('window.opener || (window.parent !== window ? window.parent : null)');
    expect(bridgeSrc).toContain("bridgeParams.get('allo-ds')");
    expect(moduleSrc).toContain('event.source !== self.win || event.origin !== self.bridgeOrigin');
  });

  // Replaces the old assertion that a cross-origin iframe is refused with
  // 'allo/approval-required'. It no longer fails closed: it asks its own
  // storage partition whether a human already approved this browser profile.
  // What must stay true is that a cross-origin client is never authorized
  // without EITHER a stored grant or a fresh answer from a person.
  it('cross-origin clients need a stored grant or a human, never neither', () => {
    // Consent lives in the same partition as the data, so it cannot be
    // replayed from another top-level site.
    expect(bridgeSrc).toContain("var CONSENT_NS = '__bridge'");
    expect(bridgeSrc).toContain('function readConsent()');
    // Auto-approve is still same-origin only.
    expect(bridgeSrc).toContain("origin !== 'null' && origin === location.origin");
    // The only paths out of a hello from a cross-origin client.
    expect(bridgeSrc).toContain('if (record && record.v === 1 && !denied)');
    expect(bridgeSrc).toContain('showApproval(helloSource, observedOrigin)');
    // The grant is written by the approve handler, never by a message.
    expect(bridgeSrc).toContain('writeConsent(approved.origin)');
    // And it is revocable from the review UI without erasing any work.
    expect(bridgeSrc).toContain('function forgetConsent()');
    expect(bridgeSrc).toContain("getElementById('btn-forget')");
  });

  it('bridge bookkeeping namespaces are off the client op surface', () => {
    // NS_RE allows a leading "__", so the consent record and probe counters
    // would otherwise be readable and writable through ordinary get/set.
    expect(bridgeSrc).toContain('RESERVED_NS_RE');
    expect(bridgeSrc).toContain("'allo/reserved-namespace'");
  });

  it('the consent prompt is shown, and only shown, by revealing the bridge frame', () => {
    // The bridge paints the prompt in its own cross-origin document; the app
    // may size that frame but can neither read nor click it.
    expect(bridgeSrc).toContain("type: 'allo-bridge-consent-required'");
    expect(moduleSrc).toContain("msg.type === 'allo-bridge-consent-required'");
    expect(moduleSrc).toContain('CONSENT_FRAME_CSS');
    // Revealed for the question, hidden again the moment the grant lands.
    expect(moduleSrc).toContain('HIDDEN_FRAME_CSS');
  });

  it('connectWithApproval retries the iframe and never switches Canvas to the popup', () => {
    // A popup is top-level, so it reads the UNPARTITIONED bucket. Switching
    // channels mid-session would show an empty store and read as data loss.
    const fn = moduleSrc.slice(moduleSrc.indexOf('connectWithApproval: function ()'));
    const body = fn.slice(0, fn.indexOf('disconnect:'));
    expect(body).not.toContain("state.backendName = 'bridge-popup'");
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
    expect(connect).toContain('self.connectTimer = setTimeout');
    expect(connect).toContain('self.helloTimer = setInterval(sendHello, 250)');
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
      // Default hydration preserves current-session values; the explicit
      // approval path may replace boot defaults before workspace entry.
      expect(src).toContain("const replaceExisting = options?.replaceExisting === true");
      expect(src).toContain('if (currentValue === null || replaceExisting)');
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

  // Standard now keeps up to 20 snapshots with a size budget. The eviction rule lives in
  // THREE independent copies (app monolith, this adapter, the bridge page);
  // drift means the bridge silently discards workspaces the app still shows.
  it('all three copies agree on Standard, Compact, and pin-aware caps', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('const MAX_SNAPSHOTS = 20;');
    expect(anti).toContain('const MAX_TOTAL_BYTES = 150 * 1024 * 1024;');
    expect(anti).toContain('const COMPACT_MAX_SNAPSHOTS = 4;');
    expect(anti).toContain('const COMPACT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;');
    for (const src of [moduleSrc, bridgeSrc]) {
      expect(src).toContain('var RECOVERY_MAX_SNAPSHOTS = 20;');
      expect(src).toContain('var RECOVERY_MAX_TOTAL_BYTES = 150 * 1024 * 1024;');
      expect(src).toContain('var RECOVERY_COMPACT_MAX_SNAPSHOTS = 4;');
      expect(src).toContain('var RECOVERY_COMPACT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;');
      expect(src).toContain('snapshots: capRecoverySnapshots(snapshots, policy, options.nowMs)');
      expect(src).toContain('function capRecoverySnapshots(snapshots, policy, nowMs)');
      expect(src).toContain('snapshot.pinned || index === 0');
      // the incoming record is weighed once, at write time
      expect(src).toContain('snapshot.approximateBytes = JSON.stringify(snapshot).length;');
    }
    // no stale count-only slice survives in either copy
    expect(moduleSrc).not.toContain('snapshots.slice(0, RECOVERY_MAX_SNAPSHOTS)');
    expect(bridgeSrc).not.toContain('snapshots.slice(0, RECOVERY_MAX_SNAPSHOTS)');
  });

  it('the bridge cache-buster was bumped so caches refetch the manager protocol', () => {
    // The bridge is loaded from the CDN, so a stale ?v= would keep enforcing
    // the prior fixed-only policy for anyone whose browser cached the page.
    expect(moduleSrc).toContain('storage_bridge.html?v=ds5-partition-consent');
    expect(moduleSrc).not.toContain('ds2-slots8');
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).toContain('allo_device_storage_module.js?v=ds5-partition-consent');
    expect(anti).not.toContain('ds2-slots8');
    const sharedLoaders = [
      'utils_pure_source.jsx',
      'utils_pure_module.js',
      'desktop/web-app/public/utils_pure_module.js',
      'view_persona_chat_source.jsx',
      'view_persona_chat_module.js',
      'desktop/web-app/public/view_persona_chat_module.js',
      'export_handlers_module.js',
      'desktop/web-app/public/export_handlers_module.js'
    ];
    for (const file of sharedLoaders) {
      const loaderSource = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(loaderSource).toContain('allo_device_storage_module.js?v=ds5-partition-consent');
      expect(loaderSource).not.toContain('allo_device_storage_module.js?v=ds1');
    }
  });

  it('preserves media-only drafts in both durable recovery implementations', () => {
    for (const src of [moduleSrc, bridgeSrc]) {
      expect(src).toContain('var normalizedStripped = normalizeRecoverySnapshot(stripped, false);');
      expect(src).toContain("reason: 'would-empty-workspace'");
    }
  });

  it('teacher-facing copy explains named policies without a raw MB slider', () => {
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(anti).not.toContain('AlloFlow keeps the 3 most recent device workspaces');
    expect(anti).toContain('Storage and recovery manager');
    expect(anti).toContain("id: 'automatic'");
    expect(anti).toContain("id: 'compact'");
    expect(anti).toContain("id: 'standard'");
    expect(anti).toContain('Choose a tested policy instead of a manual MB limit.');
    expect(anti).not.toMatch(/type="range"[^>]+(?:storage|retention|quota)/i);
    expect(anti).toContain('Pinned work and the newest workspace are never automatically removed.');
    expect(anti).toContain('const _alloFormatWorkspaceBytes = (bytes) => {');
  });

  it('reports persistence without requesting it merely by opening status', () => {
    expect(moduleSrc).toContain("estimate: function () { return guarded('estimate', {}); }");
    expect(bridgeSrc).toContain('navigator.storage.persisted()');
    expect(bridgeSrc).not.toContain('navigator.storage.persist()');
    expect(bridgeSrc).toContain("case 'estimate': return storageFacts()");
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

    // Twenty-one saves against the current 20-slot Standard cap: only the oldest goes.
    const days = Array.from({ length: 21 }, (_, index) => String(index + 1).padStart(2, '0'));
    for (let i = 0; i < days.length; i++) {
      const id = 'workspace-' + String.fromCharCode(97 + i); // a..u
      const result = await api.mutateRecovery(ns, key, {
        version: 1,
        action: 'upsert',
        snapshot: snapshot(id, `2026-07-${days[i]}T12:00:00.000Z`, id)
      }, { queue: false });
      expect(result).toMatchObject({ applied: true, reason: 'upserted' });
    }
    const capped = await api.get(ns, key);
    expect(capped.snapshots).toHaveLength(20);
    expect(capped.snapshots.map(item => item.id)).toEqual(
      Array.from({ length: 20 }, (_, index) =>
        'workspace-' + String.fromCharCode('u'.charCodeAt(0) - index))
    );
    expect(capped.snapshots.some(item => item.id === 'workspace-a')).toBe(false);
    // every stored record carries its measured size for byte-aware eviction
    expect(capped.snapshots.every(item => Number(item.approximateBytes) > 0)).toBe(true);

    // A workspace bigger than the whole budget still lands, and still evicts
    // older ones rather than being refused (the newest is never dropped).
    const huge = snapshot('workspace-huge', '2026-07-22T12:00:00.000Z', 'huge');
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

  it('atomically applies named policies and preserves pinned work', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    await api.set(ns, key, { version: 1, snapshots: [] });
    const make = (id, day) => ({
      version: 1,
      id,
      savedAt: `2026-07-${day}T12:00:00.000Z`,
      workspace: { history: [{ id: id + '-resource' }] }
    });
    for (const [index, id] of ['a', 'b', 'c', 'd', 'e', 'f'].entries()) {
      await api.mutateRecovery(ns, key, {
        version: 1,
        action: 'upsert',
        snapshot: make('workspace-' + id, String(index + 1).padStart(2, '0'))
      }, { queue: false });
    }
    const pinned = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'setPinned',
      snapshotId: 'workspace-a',
      pinned: true
    }, { queue: false });
    expect(pinned).toMatchObject({ applied: true, reason: 'pinned' });

    const compact = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'setPolicy',
      policyId: 'compact',
      effectivePolicyId: 'compact'
    }, { queue: false });
    expect(compact.store).toMatchObject({
      retentionPolicy: 'compact',
      effectiveRetentionPolicy: 'compact'
    });
    expect(compact.store.snapshots).toHaveLength(4);
    expect(compact.store.snapshots.some(item => item.id === 'workspace-a' && item.pinned)).toBe(true);

    await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'setPinned',
      snapshotId: 'workspace-a',
      pinned: false
    }, { queue: false });
    const afterNewSave = await api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: make('workspace-g', '07')
    }, { queue: false });
    expect(afterNewSave.store.snapshots).toHaveLength(4);
    expect(afterNewSave.store.snapshots.some(item => item.id === 'workspace-a')).toBe(false);
  });

  it('keeps pin state atomic across same-ID autosaves until setPinned changes it', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    await api.set(ns, key, { version: 1, snapshots: [] });
    const make = (savedAt, pinned, marker) => ({ version: 1, id: 'workspace-pin', savedAt, pinned, marker, workspace: { history: [{}] } });

    await api.mutateRecovery(ns, key, { version: 1, action: 'upsert', snapshot: make('2026-07-01T00:00:00.000Z', false, 'first') }, { queue: false });
    await api.mutateRecovery(ns, key, { version: 1, action: 'setPinned', snapshotId: 'workspace-pin', pinned: true }, { queue: false });
    const pinnedAutosave = await api.mutateRecovery(ns, key, {
      version: 1, action: 'upsert', snapshot: make('2026-07-02T00:00:00.000Z', false, 'later')
    }, { queue: false });
    expect(pinnedAutosave.store.snapshots[0]).toMatchObject({ pinned: true, marker: 'later' });

    await api.mutateRecovery(ns, key, { version: 1, action: 'setPinned', snapshotId: 'workspace-pin', pinned: false }, { queue: false });
    const unpinnedAutosave = await api.mutateRecovery(ns, key, {
      version: 1, action: 'upsert', snapshot: make('2026-07-03T00:00:00.000Z', true, 'latest')
    }, { queue: false });
    expect(unpinnedAutosave.store.snapshots[0]).toMatchObject({ pinned: false, marker: 'latest' });
  });

  it('atomically removes media, preserves remote content, and rejects empty drafts', async () => {
    const ns = 'workspace_recovery';
    const key = 'store_v1';
    await api.set(ns, key, { version: 1, snapshots: [] });
    const media = {
      version: 1,
      id: 'workspace-media',
      savedAt: '2026-07-20T12:00:00.000Z',
      pinned: true,
      workspace: { history: [{ data: {
        imageUrl: 'data:image/png;base64,AAAA',
        remoteImage: 'https://example.edu/keep.png',
        prompt: 'Keep this text'
      } }] }
    };
    await api.mutateRecovery(ns, key, { version: 1, action: 'upsert', snapshot: media }, { queue: false });
    const removed = await api.mutateRecovery(ns, key, {
      version: 1, action: 'removeMedia', snapshotId: 'workspace-media'
    }, { queue: false });
    expect(removed).toMatchObject({ applied: true, reason: 'media-removed' });
    const saved = removed.store.snapshots[0];
    expect(saved.pinned).toBe(true);
    expect(saved.workspace.history[0].data.imageUrl).toBeNull();
    expect(saved.workspace.history[0].data.remoteImage).toBe('https://example.edu/keep.png');
    expect(saved.workspace.history[0].data.prompt).toBe('Keep this text');
    expect(saved.omittedAssetManifest.some(item => item.reason === 'user-remove-media')).toBe(true);

    const repeated = await api.mutateRecovery(ns, key, {
      version: 1, action: 'removeMedia', snapshotId: 'workspace-media'
    }, { queue: false });
    expect(repeated).toMatchObject({ applied: false, reason: 'no-media' });
    expect(repeated.store.snapshots[0].omittedAssetManifest).toEqual(saved.omittedAssetManifest);


    const noMediaUpsert = await api.mutateRecovery(ns, key, { version: 1, action: 'upsert', snapshot: {
      version: 1, id: 'workspace-no-media', savedAt: '2026-07-21T00:00:00.000Z', workspace: { history: [{ data: { prompt: 'text only' } }] }
    } }, { queue: false });
    const noMedia = await api.mutateRecovery(ns, key, { version: 1, action: 'removeMedia', snapshotId: 'workspace-no-media' }, { queue: false });
    expect(noMedia).toMatchObject({ applied: false, reason: 'no-media' });
    expect(noMedia.store).toEqual(noMediaUpsert.store);
    const mediaOnlyUpsert = await api.mutateRecovery(ns, key, { version: 1, action: 'upsert', snapshot: {
      version: 1,
      id: 'workspace-media-only',
      savedAt: '2026-07-22T00:00:00.000Z',
      workspace: { history: [], builderDraft: { imageUrl: 'data:image/png;base64,AAAA' } }
    } }, { queue: false });
    const mediaOnly = await api.mutateRecovery(ns, key, {
      version: 1, action: 'removeMedia', snapshotId: 'workspace-media-only'
    }, { queue: false });
    expect(mediaOnly).toMatchObject({ applied: false, reason: 'would-empty-workspace' });
    expect(mediaOnly.store).toEqual(mediaOnlyUpsert.store);

    await expect(api.mutateRecovery(ns, key, {
      version: 1,
      action: 'upsert',
      snapshot: { version: 1, id: 'empty', savedAt: '2026-07-21T00:00:00.000Z', workspace: { history: [], inputText: ' ', builderDraft: { html: ' ' } } }
    }, { queue: false })).rejects.toMatchObject({ code: 'allo/recovery-mutation-invalid' });
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
