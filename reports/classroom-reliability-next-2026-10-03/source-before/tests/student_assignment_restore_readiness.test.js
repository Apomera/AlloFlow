import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const { createSession } = createRequire(import.meta.url)('../reader_support_drafts.js');

const source = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error('Missing student restore source boundary: ' + start);
  return source.slice(from, to);
}
const wrapper = section(source.includes('  const pendingQrAssignmentOpenGenerationRef = useRef(0);') ? '  const pendingQrAssignmentOpenGenerationRef = useRef(0);' : '  const handleRestoreView = (item, options = {}) => {', '  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE');
const effect = section('  useEffect(() => {\n      if (!pendingQrAssignmentResource || isTeacherMode) return;', '  useEffect(() => {');
const ensure = section('    var __alloLazyEnsurePromises =', '    // Teaching-script research and editor load');
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const resource = id => ({
  id, type: 'simplified', data: 'Good and bad seem reversed.',
  sourceSnapshot: { schemaVersion: 1, text: 'Fair is foul.\r\nAnd foul is fair.' },
  readingSupports: { annotations: [{ quote: 'Fair', text: 'Teacher-selected meaning', origin: 'educator', pinned: true }] }
});

describe('automatic homework during unsaved reading-support edits', () => {
  function draftHarness() {
    const session = createSession(); let dirty = true, transition;
    session.register({ hasChanges: () => dirty, defer: next => { transition = next; } });
    return { h: harness({ ready: true, draftSession: session }), get transition() { return transition; }, save() { dirty = false; } };
  }
  it('asks once without a false failure and opens after Save and continue updates the workspace', async () => {
    const f = draftHarness(), item = resource('save-and-open'); f.h.run(item); await flush(); f.h.notify();
    expect(f.h.requestReadingSupportTransition).toHaveBeenCalledOnce(); expect(f.h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(f.h.pending).toBe(item); expect(f.h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0);
    f.save(); f.h.changeContext(); f.transition.run(); await flush();
    expect(f.h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(item, { suppressLiveFollow: true }, expect.any(Object));
    expect(f.h.pending).toBeNull(); f.h.cleanup(); expect(f.h.listeners.size).toBe(0);
  });
  it('keeps homework recoverable when the learner chooses Keep editing', async () => {
    const f = draftHarness(), item = resource('keep-editing'); f.h.run(item); await flush(); f.transition.cancel(); f.h.notify();
    expect(f.h.pending).toBe(item); expect(f.h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(f.h.requestReadingSupportTransition).toHaveBeenCalledOnce();
    expect(f.h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0); f.h.cleanup();
  });
  it('does not open a replaced packet when an old confirmation is accepted', async () => {
    const f = draftHarness(), old = resource('old-prompt'), next = resource('new-packet');
    f.h.run(old); await flush(); const oldTransition = f.transition; f.h.run(next); await flush();
    f.save(); oldTransition.run(); await flush();
    expect(f.h.api.handleRestoreView).not.toHaveBeenCalled(); expect(f.h.pending).toBe(next); f.h.cleanup();
  });
  it('does not run a deferred automatic open after unmount', async () => {
    const f = draftHarness(), item = resource('unmounted-prompt'); f.h.run(item); await flush(); f.h.cleanup();
    f.save(); f.transition.run(); await flush(); expect(f.h.api.handleRestoreView).not.toHaveBeenCalled(); expect(f.h.pending).toBe(item);
  });
  it('lets a successful manual open supersede the queued automatic transition', async () => {
    const f = draftHarness(), item = resource('pending-prompt'), chosen = resource('manual-choice');
    f.h.run(item); await flush(); f.save(); f.h.manualOpen(chosen); f.transition.run(); await flush();
    expect(f.h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(chosen, {}, expect.any(Object));
    expect(f.h.pending).toBeNull(); f.h.cleanup();
  });
});

function harness({ ready = false, missingHelpers = [], throwing = false, rejecting = false, withoutEnsure = false, draftSession = null } = {}) {
  vi.useFakeTimers();
  const listeners = new Set();
  const events = new EventTarget();
  const api = { handleRestoreView: vi.fn(() => {
    if (throwing) throw new Error('Restore failed');
    if (rejecting) return false;
  }) };
  const window = {
    AlloModules: { ...(ready ? { MiscHandlers: api } : {}), ...Object.fromEntries(['PureHelpers', 'PhaseNHelpers', 'TextUtilityHelpers'].filter(key => !missingHelpers.includes(key)).map(key => [key, {}])) }, __alloModuleRegistry: {},
    __alloRetryFailedModules: vi.fn(),
    __alloPromoteModule: vi.fn(name => { window.__alloModuleRegistry[name] = { status: 'pending' }; }),
    addEventListener: (name, fn) => { listeners.add(fn); events.addEventListener(name, fn); },
    removeEventListener: (name, fn) => { listeners.delete(fn); events.removeEventListener(name, fn); }
  };
  window.__alloLazyFileIntake = vi.fn(() => { window.__alloModuleRegistry.MiscHandlersModule = { status: 'pending' }; });
  if (!withoutEnsure) new Function('window', 'setTimeout', 'clearTimeout', ensure)(window, setTimeout, clearTimeout);
  const addToast = vi.fn(), warnLog = vi.fn(), deps = { marker: 'current-host-deps' };
  let pending, cleanup, restore;
  const generationRef = { current: 0 };
  const supportDraftSessionRef = { current: draftSession };
  const historyOpenContextRef = { current: {} };
  const bootHistoryHydrationRef = { current: null };
  const requestReadingSupportTransition = vi.fn(run => supportDraftSessionRef.current ? supportDraftSessionRef.current.request(run) : run());
  const setPending = vi.fn(value => { pending = typeof value === 'function' ? value(pending) : value; });
  const notify = () => events.dispatchEvent(new Event('alloflow:module-registry-changed'));
  return {
    window, api, addToast, warnLog, listeners, setPending, requestReadingSupportTransition, get pending() { return pending; },
    run(item, teacher = false) {
      cleanup?.(); pending = item; let callback;
      restore = new Function('window', '_alloMiscHandlersDeps', 'useRef', 'useEffect', 'pendingQrAssignmentResource', 'isTeacherMode', 'setPendingQrAssignmentResource', 'addToast', 'warnLog',
        'supportDraftSessionRef', 'requestReadingSupportTransition', 'historyOpenContextRef', 'bootHistoryHydrationRef', 'receivedDeliveryResources',
        wrapper + '\n' + effect + '\nreturn handleRestoreView;')(
        window, () => deps, () => generationRef, fn => { callback = fn; }, item, teacher, setPending, addToast, warnLog,
        supportDraftSessionRef, requestReadingSupportTransition, historyOpenContextRef, bootHistoryHydrationRef, item ? [item] : [],
      );
      cleanup = callback();
    },
    manualOpen(item) { return restore(item); },
    cleanup() { cleanup?.(); cleanup = null; },
    ready(key = 'MiscHandlers') { window.AlloModules[key] = key === 'MiscHandlers' ? api : {}; window.__alloModuleRegistry[key + 'Module'] = { status: 'loaded' }; notify(); },
    fail(key = 'MiscHandlers') { window.__alloModuleRegistry[key + 'Module'] = { status: 'failed' }; notify(); },
    changeContext() { historyOpenContextRef.current = {}; },
    hydrate(item, next, navigated = false) {
      const previous = [{ ...item, artifactInstanceId: 'canonical-instance' }], current = [next], values = ['source', previous, null, 'input'];
      Object.assign(historyOpenContextRef.current, { values });
      bootHistoryHydrationRef.current = { previous, current };
      historyOpenContextRef.current = { values: ['source', current, null, navigated ? 'dashboard' : 'input'] };
    },
    notify
  };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('cold student assignment restore', () => {
  it('opens the normalized legacy packet after the actual startup history upgrade', async () => {
    const h = harness(), item = resource('legacy-packet'), normalized = { ...item, data: 'Hydrated reading', dataEncoding: 'text/v1' };
    h.run(item); await flush(); h.hydrate(item, normalized); h.ready(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(normalized, { suppressLiveFollow: true }, expect.any(Object));
    expect(h.api.handleRestoreView.mock.calls[0][0].sourceSnapshot).toBe(item.sourceSnapshot);
    expect(h.api.handleRestoreView.mock.calls[0][0].readingSupports).toBe(item.readingSupports);
    expect(h.pending).toBeNull(); h.cleanup();
  });
  it('still cancels a workspace change that accompanies startup history normalization', async () => {
    const h = harness(), item = resource('navigated-legacy'), normalized = { ...item, dataEncoding: 'text/v1' };
    h.run(item); await flush(); h.hydrate(item, normalized, true); h.ready(); await flush();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled(); expect(h.pending).toBe(item);
    expect(h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0); h.cleanup();
  });
  it.each(['PureHelpers', 'PhaseNHelpers', 'TextUtilityHelpers'])('waits for %s even when the resource handler is ready', async key => {
    const h = harness({ ready: true, missingHelpers: [key] }), item = resource('waiting-for-' + key);
    h.run(item); await flush();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled(); expect(h.pending).toBe(item);
    expect(h.window.__alloPromoteModule).toHaveBeenCalledWith(key + 'Module');
    h.ready(key); await flush(); h.notify();
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(item, { suppressLiveFollow: true }, expect.any(Object));
    expect(h.pending).toBeNull(); h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('waits for the complete rendering chain rather than whichever helper registers first', async () => {
    const h = harness({ ready: true, missingHelpers: ['PureHelpers', 'PhaseNHelpers', 'TextUtilityHelpers'] }), item = resource('complete-chain');
    h.run(item); await flush(); h.ready('PureHelpers'); await flush(); h.ready('PhaseNHelpers'); await flush();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled(); expect(h.pending).toBe(item);
    h.ready('TextUtilityHelpers'); await flush(); expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('retains the packet after a rendering-helper failure and recovers after retry', async () => {
    const h = harness({ ready: true, missingHelpers: ['PureHelpers'] }), item = resource('reader-retry');
    h.run(item); await flush(); h.fail('PureHelpers'); await flush();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled(); expect(h.pending).toBe(item);
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Retry'), 'warning');
    h.ready('PureHelpers'); await flush(); expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.pending).toBeNull(); h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('stops a late automatic open when the workspace changes and leaves homework recoverable', async () => {
    const h = harness(), item = resource('navigation-cancelled'); h.run(item); await flush();
    h.changeContext(); h.ready(); await flush(); h.notify();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled(); expect(h.pending).toBe(item);
    expect(h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0);
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('cancels obsolete helper failures quietly after a workspace change', async () => {
    const h = harness({ ready: true, missingHelpers: ['PureHelpers'] }), item = resource('quiet-cancel');
    h.run(item); await flush(); h.changeContext(); h.fail('PureHelpers'); await flush();
    expect(h.pending).toBe(item); expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0);
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('promotes the opener and retains exact source/support payload until ready, opening once', async () => {
    const h = harness(), item = resource('selected-companion');
    expect(() => h.run(item)).not.toThrow();
    await flush();
    expect(h.window.__alloLazyFileIntake).toHaveBeenCalledOnce();
    expect(h.pending).toBe(item);
    expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Opening homework'), 'info');
    h.ready(); await flush(); h.notify();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.api.handleRestoreView).toHaveBeenCalledWith(item, { suppressLiveFollow: true }, expect.any(Object));
    expect(h.api.handleRestoreView.mock.calls[0][0].sourceSnapshot).toBe(item.sourceSnapshot);
    expect(h.api.handleRestoreView.mock.calls[0][0].readingSupports).toBe(item.readingSupports);
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('opens immediately when the handler is already registered without requesting a load', async () => {
    const h = harness({ ready: true }), item = resource('ready');
    h.run(item); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.pending).toBeNull();
    expect(h.window.__alloLazyFileIntake).not.toHaveBeenCalled();
    expect(h.addToast).not.toHaveBeenCalled();
  });

  it('keeps the homework after a load failure and opens after the existing module retry succeeds', async () => {
    const h = harness(), item = resource('failed-then-retried');
    h.run(item); await flush(); h.fail(); await flush();
    expect(h.pending).toBe(item);
    expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Retry'), 'warning');
    h.ready(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('bounds a stalled load and keeps its original and glosses available for recovery', async () => {
    const h = harness(), item = resource('slow');
    h.run(item); await flush();
    await vi.advanceTimersByTimeAsync(64999);
    expect(h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1); await flush();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Retry'), 'warning');
    expect(h.pending).toBe(item);
    expect(vi.getTimerCount()).toBe(0);
    h.ready(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledWith(item, { suppressLiveFollow: true }, expect.any(Object));
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('does not open or clear a replaced pending assignment when the earlier load completes', async () => {
    const h = harness(), oldItem = resource('old'), newItem = resource('new');
    h.run(oldItem); await flush();
    h.run(newItem); await flush();
    h.ready(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.api.handleRestoreView.mock.calls[0][0]).toBe(newItem);
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('ignores late registration or failure after unmount or a switch to teacher mode', async () => {
    const h = harness(), item = resource('cancelled');
    h.run(item); await flush(); h.run(item, true); await flush();
    h.ready(); await flush();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(h.pending).toBe(item);
    expect(h.addToast.mock.calls.filter(([, level]) => level === 'warning')).toHaveLength(0);
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('contains an opener error without losing the packet or repeatedly reopening it on registry events', async () => {
    const h = harness({ ready: true, throwing: true }), item = resource('bad-opener');
    expect(() => h.run(item)).not.toThrow();
    await flush(); h.notify(); h.notify();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.pending).toBe(item);
    expect(h.warnLog).toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('History'), 'warning');
  });

  it('retains an explicitly rejected automatic open without treating it as success or retrying on registry noise', async () => {
    const h = harness({ ready: true, rejecting: true }), item = resource('rejected');
    expect(() => h.run(item)).not.toThrow();
    await flush(); h.notify(); h.notify();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.pending).toBe(item);
    expect(h.setPending).not.toHaveBeenCalled();
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('History'), 'warning');
    expect(h.warnLog).toHaveBeenCalled();
  });

  it('keeps a valid waiting assignment when an explicit manual open is rejected', async () => {
    const h = harness(), waiting = resource('waiting-after-rejection');
    h.run(waiting); await flush();
    h.window.AlloModules.MiscHandlers = h.api;
    h.api.handleRestoreView.mockReturnValueOnce(false);
    expect(h.manualOpen({ id: 'invalid-aac', type: 'aac-board', data: {} })).toBe(false);
    expect(h.pending).toBe(waiting);
    expect(h.setPending).not.toHaveBeenCalled();
    h.notify(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledTimes(2);
    expect(h.api.handleRestoreView.mock.calls[1][0]).toBe(waiting);
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('reports unavailable readiness infrastructure without throwing or discarding the assignment', async () => {
    const h = harness({ withoutEnsure: true }), item = resource('no-loader');
    expect(() => h.run(item)).not.toThrow(); await flush();
    expect(h.pending).toBe(item);
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('Retry'), 'warning');
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });
  it('clears a failed pending restore after a successful manual History open so later role switches cannot reopen it', async () => {
    const h = harness({ ready: true, throwing: true }), item = resource('failed-original'), chosen = resource('history-choice');
    h.run(item); await flush();
    expect(h.pending).toBe(item);
    h.api.handleRestoreView.mockImplementation(() => {});
    h.manualOpen(chosen);
    expect(h.pending).toBeNull();
    h.run(h.pending, true); h.run(h.pending, false); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledTimes(2);
    expect(h.api.handleRestoreView.mock.calls[1][0]).toBe(chosen);
  });

  it('cancels the waiting open immediately when History succeeds, before React effect cleanup runs', async () => {
    const h = harness(), waiting = resource('waiting'), chosen = resource('manual-choice');
    h.run(waiting); await flush();
    h.window.AlloModules.MiscHandlers = h.api;
    h.manualOpen(chosen);
    h.notify(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledOnce();
    expect(h.api.handleRestoreView.mock.calls[0][0]).toBe(chosen);
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('retains the pending packet when a manual History open fails and still recovers it on registration', async () => {
    const h = harness(), waiting = resource('waiting-after-failed-manual');
    h.run(waiting); await flush();
    h.window.AlloModules.MiscHandlers = h.api;
    h.api.handleRestoreView.mockImplementationOnce(() => { throw new Error('Manual restore failed'); });
    expect(() => h.manualOpen(resource('bad-manual-choice'))).toThrow('Manual restore failed');
    expect(h.pending).toBe(waiting);
    h.notify(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledTimes(2);
    expect(h.api.handleRestoreView.mock.calls[1][0]).toBe(waiting);
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

  it('keeps waiting homework when a draft transition is cancelled, then lets a clean manual open supersede it', async () => {
    const session = createSession();
    let dirty = true, transition;
    session.register({ hasChanges: () => dirty, defer: next => { transition = next; } });
    const h = harness({ draftSession: session }), waiting = resource('waiting-with-draft'), chosen = resource('manual-after-editing');
    h.run(waiting); await flush();
    h.window.AlloModules.MiscHandlers = h.api;
    expect(h.manualOpen(chosen)).toBe(false);
    expect(h.requestReadingSupportTransition).toHaveBeenCalledOnce();
    expect(h.api.handleRestoreView).not.toHaveBeenCalled();
    expect(h.pending).toBe(waiting);
    expect(h.setPending).not.toHaveBeenCalled();
    transition.cancel();
    expect(transition.run()).toBe(false);
    expect(h.pending).toBe(waiting);
    dirty = false;
    h.manualOpen(chosen);
    h.ready(); await flush();
    expect(h.api.handleRestoreView).toHaveBeenCalledExactlyOnceWith(chosen, {}, expect.any(Object));
    expect(h.pending).toBeNull();
    h.cleanup(); expect(h.listeners.size).toBe(0);
  });

});
