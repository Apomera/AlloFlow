import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const start = host.indexOf('  useEffect(() => {\n    if (!lzLoaded) return;');
const end = host.indexOf('  const offlineHistoryWriteRef =', start);
if (start < 0 || end < start) throw Error('Missing local recovery effect');
const effect = host.slice(start, end);
const packet = [{ id: 'homework-A', type: 'simplified', data: 'Delivered reading' }];
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function make({ entry = true, delivered = true, canvas = false, saved = null } = {}) {
  let callback, cleanup;
  const env = {
    lzLoaded: true, isCanvas: canvas, isTeacherMode: true, isStorageDisabled: false, activeSessionCode: '', isHistoryLoaded: false,
    entry, receivedDeliveryResources: delivered ? packet : [], history: delivered ? packet : [], generatedContent: delivered ? packet[0] : null,
    _alloHasAnyStudentEntry: () => env.entry, _alloMbBridgeActive: () => false, _alloReadMailboxEntryParam: () => '',
    canvasRecoveryBootCheckedRef: { current: false }, studentEntryRecoveryProtectedRef: { current: false }, isStudentWorkLoaded: { current: true },
    canvasRecoverySaveTokenRef: { current: 0 }, canvasRecoveryPendingSaveCountRef: { current: 0 },
    canvasRecoveryStoreRef: { current: {} }, canvasRecoveryCurrentIdRef: { current: '' }, localDataHydrationGenerationRef: { current: 0 },
    ALLO_WORKSPACE_RECOVERY: { emptyStore: () => ({ snapshots: [] }), newId: () => 'fresh-id' },
    setIsHistoryLoaded: vi.fn(value => { env.isHistoryLoaded = value; }),
    clearCanvasWorkspaceState: vi.fn(() => { env.history = []; env.generatedContent = null; }),
    setHistory: vi.fn(value => { env.history = value; }), hydrateHistory: vi.fn(items => items),
    storageDB: { get: vi.fn(key => Promise.resolve(key === 'allo_offline_history' ? saved : null)) },
    warnLog: vi.fn(), addToastRef: { current: vi.fn() }, t: key => key,
    useEffect: fn => { callback = fn; },
  };
  const setters = ['setGlobalPoints', 'setPointHistory', 'setHasSavedAdventure', 'setCanvasRecoveryStore', 'setCanvasRecoveryStoreAuthoritative', 'setCanvasRecoveryDecisionMade', 'setCanvasRecoveryDialogMode', 'setCanvasRecoverySaveStatus', 'setCanvasRecoveryError', 'setLastSaved', 'setPendingSync', 'setProfiles', 'setUnits'];
  setters.forEach(key => { env[key] = vi.fn(); });
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
  return { env, run() { cleanup?.(); new Function('scope', 'with(scope) {' + effect + '}')(scope); cleanup = callback(); }, deliver() { env.history = packet; env.generatedContent = packet[0]; env.receivedDeliveryResources = packet; } };
}

describe('student-entry recovery and homework startup', () => {
  it.each([false, true])('keeps an already delivered packet when recovery starts late (Canvas=%s)', async canvas => {
    const f = make({ canvas, saved: { items: [{ id: 'old-teacher-work' }] } }); f.run(); await flush();
    expect(f.env.clearCanvasWorkspaceState).not.toHaveBeenCalled(); expect(f.env.storageDB.get).not.toHaveBeenCalled();
    expect(f.env.history).toBe(packet); expect(f.env.generatedContent).toBe(packet[0]); expect(f.env.isHistoryLoaded).toBe(true);
    expect(f.env.setCanvasRecoverySaveStatus).toHaveBeenCalledWith('inactive');
  });
  it('clears prior workspace state once when student entry precedes delivery', async () => {
    const f = make({ delivered: false }); f.run(); expect(f.env.clearCanvasWorkspaceState).toHaveBeenCalledOnce();
    f.deliver(); f.env.isTeacherMode = false; f.run(); await flush();
    expect(f.env.clearCanvasWorkspaceState).toHaveBeenCalledOnce(); expect(f.env.history).toBe(packet); expect(f.env.generatedContent).toBe(packet[0]);
    expect(f.env.setGlobalPoints).toHaveBeenCalledOnce(); expect(f.env.storageDB.get).not.toHaveBeenCalled();
  });
  it('does not clear again while the learner is waiting for delivery', () => {
    const f = make({ delivered: false }); f.run(); f.env.isTeacherMode = false; f.run();
    expect(f.env.clearCanvasWorkspaceState).toHaveBeenCalledOnce(); expect(f.env.setGlobalPoints).toHaveBeenCalledOnce();
  });
  it('preserves ordinary local-history recovery outside student entry', async () => {
    const cached = [{ id: 'cached-reading' }], f = make({ entry: false, delivered: false, saved: { items: cached } });
    f.run(); await flush(); expect(f.env.setHistory).toHaveBeenCalledWith(cached); expect(f.env.history).toBe(cached);
    expect(f.env.clearCanvasWorkspaceState).not.toHaveBeenCalled(); expect(f.env.isHistoryLoaded).toBe(true);
  });
  it('ignores a cached read that resolves after student delivery replaces its effect', async () => {
    let resolve; const f = make({ entry: false, delivered: false });
    f.env.storageDB.get.mockImplementationOnce(() => new Promise(done => { resolve = done; })); f.run();
    f.env.entry = true; f.deliver(); f.env.isTeacherMode = false; f.run(); resolve({ items: [{ id: 'obsolete-cache' }] }); await flush();
    expect(f.env.setHistory).not.toHaveBeenCalled(); expect(f.env.history).toBe(packet); expect(f.env.clearCanvasWorkspaceState).not.toHaveBeenCalled();
  });
});

describe('production startup history upgrade tracking', () => {
  function bridge(items) {
    const a = host.indexOf('  const bootHistoryHydrationRef = useRef(null);');
    const b = host.indexOf('  useEffect(() => {\n    if (!lzLoaded) return;', a);
    const h = host.indexOf('function _alloRehydrateShimHistory(items) {');
    const e = host.indexOf('\n}', h) + 2;
    if (a < 0 || b < a || h < 0 || e < h) throw Error('Missing startup upgrade bridge');
    let current = items, cleanup; const window = new EventTarget();
    const hydrateHistory = vi.fn(rows => rows.map(item => ({ ...item, data: 'Normalized reading', dataEncoding: 'text/v1' })));
    const normalize = new Function('hydrateHistory', host.slice(h, e) + '; return _alloRehydrateShimHistory;')(hydrateHistory);
    const setHistory = vi.fn(update => { current = update(current); });
    const canonicalize = vi.fn(rows => rows.map(item => ({ ...item, artifactInstanceId: 'canonical-instance' })));
    const ref = new Function('window', 'useRef', 'useEffect', '_setHistory', '_alloRehydrateShimHistory', 'normalizeArtifactInstanceIds', host.slice(a, b) + '\nreturn bootHistoryHydrationRef;')(
      window, value => ({ current: value }), fn => { cleanup = fn(); }, setHistory, normalize, canonicalize,
    );
    return { ref, setHistory, get current() { return current; }, upgrade: () => window.dispatchEvent(new Event('allo-firestore-sync-upgraded')), cleanup: () => cleanup() };
  }
  it('records the exact previous and normalized arrays from the real module upgrade event', () => {
    const items = [{ id: 'legacy', data: 'Legacy encoded reading' }], f = bridge(items); f.upgrade();
    expect(f.ref.current).toMatchObject({ previous: items, current: f.current });
    expect(f.ref.current.previous).toBe(items); expect(f.ref.current.current).toBe(f.current);
    expect(f.current[0].data).toBe('Normalized reading'); expect(f.current[0].dataEncoding).toBe('text/v1'); f.cleanup();
  });
  it('tracks the canonical artifact array when the reading already has current encoding', () => {
    const items = [{ id: 'current', data: 'Current reading', dataEncoding: 'text/v1' }], f = bridge(items); f.upgrade();
    expect(f.current[0].data).toBe(items[0].data); expect(f.ref.current.previous).toBe(items); expect(f.ref.current.current).toBe(f.current); f.cleanup();
  });
  it('removes the startup listener when the host unmounts', () => {
    const f = bridge([{ id: 'late', data: 'Late reading' }]); f.cleanup(); f.upgrade();
    expect(f.setHistory).not.toHaveBeenCalled(); expect(f.ref.current).toBeNull();
  });
});
