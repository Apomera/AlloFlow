import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadHostHandlersFactory, hostDeps } from './helpers/host_source.js';

const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const a = host.indexOf(start), b = host.indexOf(end, a + start.length);
  if (a < 0 || b < a) throw Error('Missing Learning Web host boundary: ' + start);
  return host.slice(a, b);
}
// Evaluate the actual render order: the callback is assigned before its async
// opener is declared, and called later by the real HostHandlers timer.
const body = section('  const pendingQrAssignmentOpenGenerationRef = useRef(0);', '  useEffect(() => {\n      if (!pendingQrAssignmentResource || isTeacherMode) return;');
const factory = loadHostHandlersFactory();
const resource = id => ({ id, type: 'simplified', data: id + ' reading', sourceSnapshot: { text: id + ' source' }, readingSupports: { annotations: [{ text: id + ' support' }] } });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function make({ throwing = false, handlerReady = false } = {}) {
  vi.useFakeTimers();
  const hooks = [], cleanups = []; let index = 0, resolve, reject;
  const load = new Promise((yes, no) => { resolve = yes; reject = no; });
  const dispatch = vi.fn(() => { if (throwing) throw Error('Reader failed'); });
  const env = {
    window: { AlloModules: handlerReady ? { MiscHandlers: { handleRestoreView: dispatch } } : {} }, inputText: '', history: [resource('A'), resource('B')], generatedContent: null,
    activeView: 'input', activeSidebarTab: 'history', workspacePane: 'history', isTeacherMode: true,
    isParentMode: false, isIndependentMode: false, activeSessionCode: '', activeSessionAppId: 'project-A',
    learningWebRestoreViewRef: { current: null }, learningWebOpenContextRef: { current: null }, learningWebOpenTimerRef: { current: null },
    _alloLearningWebScopeId: () => env.activeSessionAppId, setShowLearningWebExplorer: vi.fn(),
    _alloMiscHandlersDeps: () => ({ marker: 'live deps' }), _alloAwaitModules: vi.fn(() => load),
    supportDraftSessionRef: { current: null }, requestReadingSupportTransition: vi.fn(run => run()),
    setPendingQrAssignmentResource: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), t: key => key,
    useRef: value => hooks[index++] ||= { current: value },
    useState: value => { const slot = index++; hooks[slot] ||= { value }; return [hooks[slot].value, next => { hooks[slot].value = next; }]; },
    useEffect: fn => { const slot = index++; if (!hooks[slot]) { hooks[slot] = true; cleanups.push(fn()); } },
  };
  env._alloHostHandlers = () => factory(hostDeps(env));
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
  const render = () => { index = 0; return new Function('scope', 'with(scope) {' + body + '\nreturn handleOpenLearningWebResource; }')(scope); };
  const open = render();
  return { env, dispatch, open, render, generation: hooks[0],
    ready() { env.window.AlloModules = { MiscHandlers: { handleRestoreView: dispatch }, PureHelpers: {}, PhaseNHelpers: {}, TextUtilityHelpers: {} }; resolve(); },
    fail: () => reject(Error('Reader dependency failed')), unmount: () => cleanups.forEach(fn => fn?.()),
  };
}
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Learning Web saved-resource readiness', () => {
  it('accepts a selection synchronously and waits for the complete reader chain through the production bridge', async () => {
    const f = make({ handlerReady: true }), item = f.env.history[0];
    expect(f.open({ resourceId: 'A' })).toBe(true); expect(f.env.setShowLearningWebExplorer).toHaveBeenCalledWith(false);
    await vi.advanceTimersByTimeAsync(50);
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([['MiscHandlersModule', 'MiscHandlers'], ['PureHelpersModule', 'PureHelpers'], ['PhaseNHelpersModule', 'PhaseNHelpers'], ['TextUtilityHelpersModule', 'TextUtilityHelpers']], 'saved resource');
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.generation.current).toBe(1);
    f.ready(); await flush();
    expect(f.dispatch).toHaveBeenCalledExactlyOnceWith(item, {}, { marker: 'live deps' });
    expect(f.dispatch.mock.calls[0][0].sourceSnapshot).toBe(item.sourceSnapshot);
    expect(f.dispatch.mock.calls[0][0].readingSupports).toBe(item.readingSupports);
    expect(f.env.setPendingQrAssignmentResource).toHaveBeenCalledWith(null);
  });
  it('opens the latest resource after a replacement before the timer runs', async () => {
    const f = make(); f.open({ resourceId: 'A' });
    const replacement = resource('A'); replacement.data = 'Updated reading'; f.env.history = [replacement]; f.render();
    await vi.advanceTimersByTimeAsync(50); f.ready(); await flush();
    expect(f.dispatch).toHaveBeenCalledExactlyOnceWith(replacement, {}, expect.any(Object));
  });
  it('coalesces selections before and during module loading', async () => {
    const f = make(); f.open({ resourceId: 'A' }); await vi.advanceTimersByTimeAsync(50);
    f.open({ resourceId: 'B' }); await vi.advanceTimersByTimeAsync(50); f.ready(); await flush();
    expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.dispatch.mock.calls[0][0]).toBe(f.env.history[1]);
  });
  it('cancels after a workspace edit during module loading', async () => {
    const f = make(); f.open({ resourceId: 'A' }); await vi.advanceTimersByTimeAsync(50);
    f.env.inputText = 'New source'; f.render(); f.ready(); await flush();
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
  });
  it('keeps an obsolete loading failure quiet after navigation', async () => {
    const f = make(); f.open({ resourceId: 'A' }); await vi.advanceTimersByTimeAsync(50);
    f.env.activeView = 'create'; f.render(); f.fail(); await flush();
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.env.addToast).not.toHaveBeenCalled();
  });
  it('contains an unexpected opener exception without an uncaught timer rejection', async () => {
    const f = make({ throwing: true }); f.open({ resourceId: 'A' }); await vi.advanceTimersByTimeAsync(50); f.ready(); await flush();
    expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.env.addToast).toHaveBeenCalledWith(expect.stringContaining('Could not open'), 'error');
    expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
  });
  it('does not open after a project switch before the timer fires', async () => {
    const f = make(); f.open({ resourceId: 'A' }); f.env.activeSessionAppId = 'project-B'; f.render();
    await vi.advanceTimersByTimeAsync(50); f.ready(); await flush();
    expect(f.env._alloAwaitModules).not.toHaveBeenCalled(); expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('does not open after unmount during loading', async () => {
    const f = make(); f.open({ resourceId: 'A' }); await vi.advanceTimersByTimeAsync(50); f.unmount(); f.ready(); await flush();
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
  });
});
