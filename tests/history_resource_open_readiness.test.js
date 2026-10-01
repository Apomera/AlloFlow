import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parse } from '@babel/parser';
import { createRequire } from 'node:module';

const { createSession } = createRequire(import.meta.url)('../reader_support_drafts.js');

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

function make({ ready = false, pureReady = true, phaseReady = true, textReady = true, rejectOpen = false, throwing = false, draftBlocked = false, draftSession = null } = {}) {
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
    setPendingQrAssignmentResource: vi.fn(), supportDraftSessionRef: { current: draftSession || { blocked: () => draftBlocked } },
    requestReadingSupportTransition: vi.fn(run => { if (draftSession) return draftSession.request(run, env.generatedContent); queued = run; return false; }),
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

describe('manual resource opening through the real unsaved-support session', () => {
  function fixture(options = {}) {
    const session = createSession(); let dirty = true, transition;
    const defer = vi.fn(next => { transition = next; });
    session.register({ hasChanges: () => dirty, defer });
    const h = make({ ready: true, ...options, draftSession: session });
    return { h, session, defer, get transition() { return transition; }, clean() { dirty = false; } };
  }
  it.each(['Save and continue', 'Discard changes'])('opens once after %s using current dependencies', async () => {
    const f = fixture(), item = f.h.env.history[1], options = { suppressLiveFollow: true };
    expect(await f.h.open(item, options)).toBe(false); expect(f.defer).toHaveBeenCalledOnce();
    f.h.env.marker = 'latest'; f.h.render(); f.clean(); f.transition.run();
    expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(item, options, { marker: 'latest' });
    f.transition.run(); expect(f.h.dispatch).toHaveBeenCalledOnce(); expect(f.h.env.addToast).not.toHaveBeenCalled();
  });
  it('opens the latest selection behind an existing confirmation instead of losing it', async () => {
    const f = fixture(), a = f.h.env.history[0], b = f.h.env.history[1];
    await f.h.open(a); await Promise.resolve(); const prompt = f.transition;
    await f.h.open(b); expect(f.defer).toHaveBeenCalledOnce();
    f.clean(); prompt.run();
    expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(b, {}, expect.any(Object));
    expect(f.h.pendingUpdates).toEqual([a, null, b, null]);
  });
  it('coalesces rapid requests behind a confirmation into one actual open', async () => {
    const f = fixture(), a = f.h.env.history[0], b = f.h.env.history[1];
    await Promise.all([f.h.open(a), f.h.open(b), f.h.open(b)]);
    f.clean(); f.transition.run(); expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(b, {}, expect.any(Object));
  });
  it('keeps editing and allows a fresh explicit retry after cancellation', async () => {
    const f = fixture(), a = f.h.env.history[0], b = f.h.env.history[1];
    await f.h.open(a); const old = f.transition; old.cancel(); expect(old.run()).toBe(false);
    expect(f.h.dispatch).not.toHaveBeenCalled(); expect(f.session.hasChanges()).toBe(true);
    await f.h.open(b); f.clean(); f.transition.run(); expect(f.defer).toHaveBeenCalledTimes(2);
    expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(b, {}, expect.any(Object));
  });
  it.each(fields.filter(field => !['history', 'generatedContent'].includes(field)))('cancels a confirmed open when %s changes while the prompt waits', async field => {
    const f = fixture(); await f.h.open(f.h.env.history[1]); f.h.change(field); f.clean(); f.transition.run();
    expect(f.h.dispatch).not.toHaveBeenCalled(); expect(f.h.env.addToast).not.toHaveBeenCalled();
    expect(f.h.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
  });
  it('cancels a confirmed open after departure and return to the original workspace', async () => {
    const f = fixture(); await f.h.open(f.h.env.history[1]); const original = f.h.env.activeView;
    f.h.change('activeView'); f.h.env.activeView = original; f.h.render(); f.clean(); f.transition.run();
    expect(f.h.dispatch).not.toHaveBeenCalled();
  });
  it('does not run a deferred manual open after unmount', async () => {
    const f = fixture(); await f.h.open(f.h.env.history[1]); const pending = [...f.h.pendingUpdates];
    f.h.unmount(); f.clean(); f.transition.run();
    expect(f.h.dispatch).not.toHaveBeenCalled(); expect(f.h.pendingUpdates).toEqual(pending);
    expect(f.h.env.addToast).not.toHaveBeenCalled();
  });
  it('lets a successful synchronous open supersede the old confirmation', async () => {
    const f = fixture(), selected = f.h.env.history[1]; await f.h.open(f.h.env.history[0]);
    f.clean(); f.h.restore(selected); f.transition.run();
    expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(selected, {}, expect.any(Object));
  });
  it('uses the saved support payload when Save and continue updates the selected reading', async () => {
    const f = fixture(), original = f.h.env.history[0]; f.h.env.generatedContent = original; f.h.render();
    await f.h.open(original);
    const saved = { ...original, readingSupports: { annotations: [{ text: 'Saved word help' }] } };
    f.h.env.history = [saved, f.h.env.history[1]]; f.h.env.generatedContent = saved; f.h.render();
    f.clean(); f.transition.run();
    expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(saved, {}, expect.any(Object));
    expect(f.h.dispatch.mock.calls[0][0]).toBe(saved);
  });
  it('allows Save and continue to update the current reading before opening another saved resource', async () => {
    const f = fixture(), original = f.h.env.history[0], selected = f.h.env.history[1];
    f.h.env.generatedContent = original; f.h.render(); await f.h.open(selected);
    const saved = { ...original, readingSupports: { annotations: [{ text: 'Saved current support' }] } };
    f.h.env.generatedContent = saved; f.h.env.history = [saved, selected]; f.h.render();
    f.clean(); f.transition.run(); expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(selected, {}, expect.any(Object));
  });
  it.each(['id', 'type', 'data', '_artifactInstanceId'])('cancels when the current reading changes its %s before confirmation', async field => {
    const f = fixture(), original = f.h.env.history[0]; f.h.env.generatedContent = original; f.h.render();
    await f.h.open(f.h.env.history[1]); f.h.env.generatedContent = { ...original, [field]: 'different' }; f.h.render();
    f.clean(); f.transition.run(); expect(f.h.dispatch).not.toHaveBeenCalled();
  });
  it('does not reopen a saved resource that disappeared while confirmation was pending', async () => {
    const f = fixture(); await f.h.open(f.h.env.history[1]); f.h.env.history = f.h.env.history.slice(0, 1); f.h.render();
    f.clean(); f.transition.run(); expect(f.h.dispatch).not.toHaveBeenCalled();
  });
  it('contains a restore failure inside a deferred confirmation and supports a fresh retry', async () => {
    const f = fixture({ throwing: true }), item = f.h.env.history[1]; await f.h.open(item); f.clean();
    expect(() => f.transition.run()).not.toThrow();
    expect(f.h.env.addToast).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Could not open'), 'error');
    expect(f.h.env.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    f.h.dispatch.mockImplementation(() => undefined); await f.h.open(item);
    expect(f.h.dispatch).toHaveBeenCalledTimes(2); expect(f.h.env.setPendingQrAssignmentResource).toHaveBeenCalledWith(null);
  });
  it('waits for the complete reader chain before requesting a draft decision', async () => {
    const f = fixture({ pureReady: false }), item = f.h.env.history[1], pending = f.h.open(item);
    expect(f.defer).not.toHaveBeenCalled(); f.h.load(); await pending; expect(f.defer).toHaveBeenCalledOnce();
    f.clean(); f.transition.run(); expect(f.h.dispatch).toHaveBeenCalledExactlyOnceWith(item, {}, expect.any(Object));
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
