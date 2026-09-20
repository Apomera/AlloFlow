import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
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

function harness({ ready = false, throwing = false, rejecting = false, withoutEnsure = false } = {}) {
  vi.useFakeTimers();
  const listeners = new Set();
  const events = new EventTarget();
  const api = { handleRestoreView: vi.fn(() => {
    if (throwing) throw new Error('Restore failed');
    if (rejecting) return false;
  }) };
  const window = {
    AlloModules: ready ? { MiscHandlers: api } : {}, __alloModuleRegistry: {},
    __alloRetryFailedModules: vi.fn(),
    addEventListener: (name, fn) => { listeners.add(fn); events.addEventListener(name, fn); },
    removeEventListener: (name, fn) => { listeners.delete(fn); events.removeEventListener(name, fn); }
  };
  window.__alloLazyFileIntake = vi.fn(() => { window.__alloModuleRegistry.MiscHandlersModule = { status: 'pending' }; });
  if (!withoutEnsure) new Function('window', 'setTimeout', 'clearTimeout', ensure)(window, setTimeout, clearTimeout);
  const addToast = vi.fn(), warnLog = vi.fn(), deps = { marker: 'current-host-deps' };
  let pending, cleanup, restore;
  const generationRef = { current: 0 };
  const setPending = vi.fn(value => { pending = typeof value === 'function' ? value(pending) : value; });
  const notify = () => events.dispatchEvent(new Event('alloflow:module-registry-changed'));
  return {
    window, api, addToast, warnLog, listeners, setPending, get pending() { return pending; },
    run(item, teacher = false) {
      cleanup?.(); pending = item; let callback;
      restore = new Function('window', '_alloMiscHandlersDeps', 'useRef', 'useEffect', 'pendingQrAssignmentResource', 'isTeacherMode', 'setPendingQrAssignmentResource', 'addToast', 'warnLog',
        wrapper + '\n' + effect + '\nreturn handleRestoreView;')(window, () => deps, () => generationRef, fn => { callback = fn; }, item, teacher, setPending, addToast, warnLog);
      cleanup = callback();
    },
    manualOpen(item) { return restore(item); },
    cleanup() { cleanup?.(); cleanup = null; },
    ready() { window.AlloModules.MiscHandlers = api; window.__alloModuleRegistry.MiscHandlersModule = { status: 'loaded' }; notify(); },
    fail() { window.__alloModuleRegistry.MiscHandlersModule = { status: 'failed' }; notify(); },
    notify
  };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('cold student assignment restore', () => {
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

});
