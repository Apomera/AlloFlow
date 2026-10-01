import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parse } from '@babel/parser';

const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
function section(start, end) {
  const a = host.indexOf(start), b = host.indexOf(end, a + start.length);
  if (a < 0 || b < a || host.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous source: ' + start);
  return host.slice(a, b);
}
const wrapper = section('  const pendingQrAssignmentOpenGenerationRef = useRef(0);', '  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE');
const opener = section('  const historyOpenRequestRef = useRef(0);', '  useEffect(() => {\n      if (!pendingQrAssignmentResource || isTeacherMode) return;');
const fields = ['inputText', 'history', 'generatedContent', 'activeView', 'activeSidebarTab', 'workspacePane', 'isTeacherMode', 'isParentMode', 'isIndependentMode', 'activeSessionCode', 'activeSessionAppId'];
const resource = id => ({ id, type: 'simplified', data: id + ' body', sourceSnapshot: { text: id + ' source' }, readingSupports: { annotations: [{ text: id + ' support' }] } });

function make({ ready = false, pureReady = true, phaseReady = true, textReady = true, rejectOpen = false, throwing = false, draftBlocked = false } = {}) {
  const hooks = [], cleanups = [], pendingUpdates = [];
  let index = 0, deferred, queued;
  const resetLoader = () => { deferred = {}; deferred.promise = new Promise((resolve, reject) => Object.assign(deferred, { resolve, reject })); };
  resetLoader();
  const env = {
    window: { AlloModules: {} }, inputText: 'Current source', history: [resource('A'), resource('B')], generatedContent: null,
    activeView: 'input', activeSidebarTab: 'history', workspacePane: 'history', isTeacherMode: true, isParentMode: false,
    isIndependentMode: false, activeSessionCode: '', activeSessionAppId: 'app-A', marker: 'original',
    useRef: value => hooks[index++] ||= { current: value },
    useState: value => { const slot = index++; hooks[slot] ||= { value }; return [hooks[slot].value, next => { hooks[slot].value = next; pendingUpdates.push(next); }]; },
    useEffect: fn => { const slot = index++; if (!hooks[slot]) { hooks[slot] = true; cleanups.push(fn()); } },
    _alloAwaitModules: vi.fn(() => ready && pureReady && phaseReady && textReady ? Promise.resolve() : deferred.promise),
    _alloMiscHandlersDeps: () => ({ marker: env.marker }), warnLog: vi.fn(), addToast: vi.fn(), t: key => key,
    setPendingQrAssignmentResource: vi.fn(), supportDraftSessionRef: { current: { blocked: () => draftBlocked } },
    requestReadingSupportTransition: vi.fn(run => { queued = run; return false; }),
  };
  const dispatch = vi.fn(() => { if (throwing) throw Error('Opener failed'); return rejectOpen ? false : undefined; });
  const api = { handleRestoreView: dispatch };
  if (ready) env.window.AlloModules.MiscHandlers = api;
  if (pureReady) env.window.AlloModules.PureHelpers = {};
  if (phaseReady) env.window.AlloModules.PhaseNHelpers = {};
  if (textReady) env.window.AlloModules.TextUtilityHelpers = {};
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
  const render = () => { index = 0; return new Function('scope', 'with(scope) { ' + wrapper + '\n' + opener + '\nreturn { open: handleOpenHistoryResource, restore: handleRestoreView }; }')(scope); };
  const handlers = render();
  return { env, dispatch, ...handlers, render, resetLoader, pendingUpdates,
    generation: hooks[0], load: () => { env.window.AlloModules.MiscHandlers = api; env.window.AlloModules.PureHelpers = {}; env.window.AlloModules.PhaseNHelpers = {}; env.window.AlloModules.TextUtilityHelpers = {}; deferred.resolve(); },
    reject: error => deferred.reject(error), unmount: () => cleanups.forEach(fn => fn?.()),
    unblockDraft: () => { draftBlocked = false; return queued?.(); },
    change: field => { env[field] = typeof env[field] === 'boolean' ? !env[field] : typeof env[field] === 'string' ? env[field] + '-changed' : {}; render(); },
  };
}

describe('History resource opening', () => {
  it('waits for the real module and preserves the exact saved payload and options', async () => {
    const f = make(), item = resource('A'), options = { suppressLiveFollow: true }, pending = f.open(item, options);
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([['MiscHandlersModule', 'MiscHandlers'], ['PureHelpersModule', 'PureHelpers'], ['PhaseNHelpersModule', 'PhaseNHelpers'], ['TextUtilityHelpersModule', 'TextUtilityHelpers']], 'saved resource');
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.pendingUpdates).toEqual([item]);
    f.load(); await pending;
    expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.dispatch).toHaveBeenCalledWith(item, options, { marker: 'original' });
    expect(f.dispatch.mock.calls[0][0].sourceSnapshot).toBe(item.sourceSnapshot);
    expect(f.dispatch.mock.calls[0][0].readingSupports).toBe(item.readingSupports);
    expect(f.pendingUpdates).toEqual([item, null]);
  });
  it('waits for shared reader helpers when the resource handler is already ready', async () => {
    const f = make({ ready: true, pureReady: false }), item = resource('A'), pending = f.open(item);
    expect(f.env._alloAwaitModules.mock.calls[0][0]).toContainEqual(['PureHelpersModule', 'PureHelpers']);
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.pendingUpdates).toEqual([item]);
    f.load(); await pending; expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.pendingUpdates.at(-1)).toBeNull();
  });
  it('waits for shared formatting helpers when the resource handler is already ready', async () => {
    const f = make({ ready: true, phaseReady: false }), pending = f.open(resource('A'));
    expect(f.env._alloAwaitModules.mock.calls[0][0]).toContainEqual(['PhaseNHelpersModule', 'PhaseNHelpers']);
    expect(f.dispatch).not.toHaveBeenCalled(); f.load(); await pending; expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('waits for glossary highlighting helpers when the resource handler is already ready', async () => {
    const f = make({ ready: true, textReady: false }), pending = f.open(resource('A'));
    expect(f.env._alloAwaitModules.mock.calls[0][0]).toContainEqual(['TextUtilityHelpersModule', 'TextUtilityHelpers']);
    expect(f.dispatch).not.toHaveBeenCalled(); f.load(); await pending; expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('opens only the latest resource selected during loading', async () => {
    const f = make(), a = resource('A'), b = resource('B'), first = f.open(a), last = f.open(b);
    f.load(); expect(await first).toBe(false); await last;
    expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.dispatch.mock.calls[0][0]).toBe(b);
    expect(f.pendingUpdates).toEqual([a, b, null]);
  });
  it('coalesces rapid repeat requests into one actual open', async () => {
    const f = make(), item = resource('A'), first = f.open(item), last = f.open(item);
    f.load(); await Promise.all([first, last]); expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it.each(fields)('discards a request when %s changes while loading', async field => {
    const f = make(), pending = f.open(resource('A')); f.change(field); f.load();
    expect(await pending).toBe(false); expect(f.dispatch).not.toHaveBeenCalled(); expect(f.pendingUpdates.at(-1)).toBeNull();
  });
  it('rejects a departure and return to the original view', async () => {
    const f = make(), pending = f.open(resource('A')), original = f.env.activeView;
    f.change('activeView'); f.env.activeView = original; f.render(); f.load();
    expect(await pending).toBe(false); expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('uses the latest synchronous dependency adapter after a harmless re-render', async () => {
    const f = make(), pending = f.open(resource('A')); f.env.marker = 'current'; f.render(); f.load(); await pending;
    expect(f.dispatch.mock.calls[0][2]).toEqual({ marker: 'current' });
  });
  it('does not dispatch or update pending state after unmount', async () => {
    const f = make(), item = resource('A'), pending = f.open(item); f.unmount(); f.load();
    expect(await pending).toBe(false); expect(f.dispatch).not.toHaveBeenCalled(); expect(f.pendingUpdates).toEqual([item]);
    expect(await f.open(item)).toBe(false); expect(f.env._alloAwaitModules).toHaveBeenCalledOnce();
  });
  it('releases the pending state after a loading failure and supports an explicit retry', async () => {
    const f = make(), item = resource('A'), pending = f.open(item); f.reject(Error('Could not finish loading saved resource.'));
    expect(await pending).toBe(false); expect(f.dispatch).not.toHaveBeenCalled(); expect(f.pendingUpdates.at(-1)).toBeNull();
    f.resetLoader(); const retry = f.open(item); f.load(); await retry; expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('contains an unexpected opener failure and shows an actionable message', async () => {
    const f = make({ ready: true, throwing: true });
    expect(await f.open(resource('A'))).toBe(false);
    expect(f.env.addToast).toHaveBeenCalledWith('Could not open this saved resource. Check the connection and try again.', 'error');
    expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled(); expect(f.pendingUpdates.at(-1)).toBeNull();
  });
  it('does not clear recoverable homework when the saved-resource opener rejects', async () => {
    const f = make({ ready: true, rejectOpen: true });
    expect(await f.open(resource('A'))).toBe(false); expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
  });
  it('reserves a manual selection before loading so an earlier homework opener cannot override it', async () => {
    const f = make(), original = f.generation.current, pending = f.open(resource('A'));
    expect(f.generation.current).toBe(original + 1); expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    f.load(); await pending; expect(f.env.setPendingQrAssignmentResource).toHaveBeenCalledWith(null);
  });
  it('honors explicit preservation of a pending assignment', async () => {
    const f = make(), original = f.generation.current, item = resource('A'), pending = f.open(item, { preservePendingAssignment: true });
    expect(f.generation.current).toBe(original); f.load(); await pending;
    expect(f.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    expect(f.dispatch).toHaveBeenCalledWith(item, {}, { marker: 'original' });
  });
  it('retains the unsaved reading-support confirmation flow', async () => {
    const f = make({ ready: true, draftBlocked: true }), item = resource('A');
    expect(await f.open(item)).toBe(false); expect(f.dispatch).not.toHaveBeenCalled();
    expect(f.env.requestReadingSupportTransition).toHaveBeenCalledOnce();
    f.unblockDraft(); expect(f.dispatch).toHaveBeenCalledWith(item, {}, { marker: 'original' });
  });
  it('preserves the synchronous return contract of the original warm opener', () => {
    const f = make({ ready: true }), result = f.restore(resource('A'));
    expect(result).toBeUndefined(); expect(f.env._alloAwaitModules).not.toHaveBeenCalled(); expect(f.dispatch).toHaveBeenCalledOnce();
  });
});

describe('History production wiring', () => {
  it('passes the loading-safe opener and its pending resource to the actual HistoryPanel', () => {
    const ast = parse(host, { sourceType: 'module', plugins: ['jsx'] });
    const panels = [];
    function visit(value) { if (!value || typeof value !== 'object') return; if (value.type === 'JSXOpeningElement' && value.name?.name === 'HistoryPanel') panels.push(value); for (const key of Object.keys(value)) { if (key === 'loc') continue; if (Array.isArray(value[key])) value[key].forEach(visit); else if (value[key] && typeof value[key] === 'object') visit(value[key]); } }
    visit(ast); expect(panels).toHaveLength(1);
    const attributes = Object.fromEntries(panels[0].attributes.filter(a => a.type === 'JSXAttribute').map(a => [a.name.name, a.value?.expression?.name]));
    expect(attributes.handleRestoreView).toBe('handleOpenHistoryResource'); expect(attributes.pendingHistoryResource).toBe('pendingHistoryResource');
  });
});
