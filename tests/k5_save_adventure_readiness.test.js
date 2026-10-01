import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
function between(start, end) {
  const a = host.indexOf(start), b = host.indexOf(end, a + start.length);
  if (a < 0 || b < a || host.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous handler: ' + start);
  return host.slice(a, b);
}
const boundaries = {
  save: ['  const projectSaveRequestRef =', '  const _studentSavePrivateFilenameTokens =', 'executeSaveFile', 'PhaseKHelpers'],
  start: ['  const adventureStartRequestRef =', '  const handleResumeAdventure =', 'handleStartAdventure', 'AdventureHandlers'],
  dice: ['  const diceCompleteRequestRef =', '  const detectClimaxArchetype =', 'handleDiceRollComplete', 'AdventureSessionHandlers'],
};
const fields = {
  save: ['showSaveModal', 'saveType', 'saveFileName', 'saveEncryptPassword', 'inputText', 'history', 'generatedContent', 'studentNickname', 'studentProjectSettings', 'isTeacherMode', 'isIndependentMode', 'activeSessionCode', 'activeSessionAppId'],
  start: ['activeView', 'inputText', 'history', 'generatedContent', 'adventureState', 'showNewGameSetup', 'isProcessing', 'isTeacherMode', 'isIndependentMode', 'activeSessionCode', 'activeSessionAppId'],
  dice: ['pendingAdventureUpdate', 'scene', 'turn', 'activeView', 'showDice', 'activeSessionCode', 'activeSessionAppId', 'isTeacherMode', 'adventureChanceMode', 'adventureDifficulty', 'adventureInputMode', 'adventureFreeResponseEnabled'],
};
function make(kind) {
  let deferred;
  const resetLoader = () => { deferred = {}; deferred.promise = new Promise((resolve, reject) => Object.assign(deferred, { resolve, reject })); };
  resetLoader();
  const hooks = [], cleanups = [], stateUpdates = [];
  let hookIndex = 0;
  const env = {
    window: { AlloModules: {} },
    useRef: value => hooks[hookIndex++] ||= { current: value },
    useState: value => { const index = hookIndex++; hooks[index] ||= { value }; return [hooks[index].value, next => { hooks[index].value = next; stateUpdates.push(next); }]; },
    useEffect: fn => { const index = hookIndex++; if (!hooks[index]) { hooks[index] = true; cleanups.push(fn()); } },
    _alloAwaitModules: vi.fn(() => deferred.promise), warnLog: vi.fn(),
    showSaveModal: true, saveType: 'teacher', saveFileName: 'lesson-A', saveEncryptPassword: '',
    inputText: 'Lesson A', history: [{ id: 'lesson-A' }], generatedContent: { id: 'lesson-A' },
    studentNickname: 'codename-A', studentProjectSettings: {}, isTeacherMode: true, isIndependentMode: false,
    activeSessionCode: '', activeSessionAppId: 'app-A', activeView: 'adventure', showDice: true,
    adventureState: { currentScene: { text: 'First scene' }, turnCount: 1 }, pendingAdventureUpdate: { scene: { text: 'Next scene' } },
    showNewGameSetup: false, isProcessing: false, adventureChanceMode: false, adventureDifficulty: 'Normal',
    adventureInputMode: 'choice', adventureFreeResponseEnabled: false, studentResponses: {}, marker: 'original',
  };
  const deps = () => ({ marker: env.marker, inputText: env.inputText, history: env.history, adventureState: env.adventureState, pendingAdventureUpdate: env.pendingAdventureUpdate, studentResponses: env.studentResponses, saveFileName: env.saveFileName });
  Object.assign(env, { _alloPhaseKHelpersDeps: deps, _alloAdventureHandlersDeps: deps, _alloAdventureSessionHandlersDeps: deps });
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : globalThis[key] });
  const [start, end, name, moduleKey] = boundaries[kind];
  const source = between(start, end);
  const render = () => { hookIndex = 0; return new Function('scope', 'with(scope) { ' + source + '\nreturn ' + name + '; }')(scope); };
  const dispatch = vi.fn(() => 'dispatched');
  const load = () => { env.window.AlloModules[moduleKey] = { [name]: dispatch }; deferred.resolve(); };
  const change = field => {
    if (field === 'scene') env.adventureState = { ...env.adventureState, currentScene: { text: 'New story' } };
    else if (field === 'turn') env.adventureState = { ...env.adventureState, turnCount: 2 };
    else env[field] = typeof env[field] === 'boolean' ? !env[field] : typeof env[field] === 'string' ? env[field] + '-changed' : { changed: true };
    render();
  };
  const handler = render();
  return { env, handler, dispatch, load, change, render, resetLoader, reject: error => deferred.reject(error), stateUpdates, unmount: () => cleanups.forEach(fn => fn?.()) };
}

describe.each(['save', 'start', 'dice'])('%s startup readiness', kind => {
  it('waits for the correct module and dispatches once', async () => {
    const f = make(kind), pending = f.handler();
    expect(f.dispatch).not.toHaveBeenCalled();
    const expected = { save: ['PhaseKHelpersModule', 'PhaseKHelpers', 'project save'], start: ['AdventureHandlersModule', 'AdventureHandlers', 'adventure setup'], dice: ['AdventureSessionHandlersModule', 'AdventureSessionHandlers', 'adventure turn'] }[kind];
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([[expected[0], expected[1]]], expected[2]);
    f.load(); expect(await pending).toBe('dispatched'); expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it.each(fields[kind])('discards a delayed request after %s changes', async field => {
    const f = make(kind), pending = f.handler(); f.change(field); f.load();
    const result = await pending;
    expect(kind === 'save' ? result.reason : result).toBe(kind === 'save' ? 'save-context-changed' : false);
    expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('rejects a changed context even if its values return to the original ones', async () => {
    const f = make(kind), pending = f.handler(), original = f.env.activeView;
    const key = kind === 'save' ? 'showSaveModal' : 'activeView';
    const value = f.env[key]; f.change(key); f.env[key] = value; f.render(); f.load();
    await pending; expect(f.dispatch).not.toHaveBeenCalled(); expect(f.env.activeView).toBe(original);
  });
  it('does not dispatch after unmount', async () => {
    const f = make(kind), pending = f.handler(); f.unmount(); f.load();
    await pending; expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('ignores an old callback invoked after unmount', async () => {
    const f = make(kind); f.unmount();
    const result = await f.handler();
    expect(kind === 'save' ? result.cancelled : result).toBe(kind === 'save' ? true : false);
    expect(f.env._alloAwaitModules).not.toHaveBeenCalled(); expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('handles loader rejection and permits an explicit retry', async () => {
    const f = make(kind), pending = f.handler(); f.reject(new Error('Connection failed'));
    const result = await pending;
    expect(kind === 'save' ? result.ok : result).toBe(false); expect(f.dispatch).not.toHaveBeenCalled();
    f.resetLoader(); const retry = f.handler(); f.load(); expect(await retry).toBe('dispatched');
  });
  it('uses the latest dependency factory without replaying stale props', async () => {
    const f = make(kind), pending = f.handler();
    f.env.marker = 'current'; f.env.studentResponses = { answer: 2 }; f.render(); f.load();
    await pending; expect(f.dispatch.mock.calls[0][0]).toMatchObject({ marker: 'current', studentResponses: { answer: 2 } });
  });
});

describe('project save coordination', () => {
  it('waits for encryption whenever a password was requested', async () => {
    const f = make('save'); f.env.saveEncryptPassword = 'test-password'; const handler = f.render();
    const pending = handler();
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([['PhaseKHelpersModule', 'PhaseKHelpers'], ['AlloCrypto', 'AlloCrypto']], 'project save');
    f.load(); await pending;
  });
  it('blocks duplicate pointer, keyboard or voice saves while waiting', async () => {
    const f = make('save'), first = f.handler();
    expect(await f.handler({ privacyConfirmed: true })).toMatchObject({ ok: false, reason: 'save-in-progress' });
    f.load(); await first; expect(f.dispatch).toHaveBeenCalledOnce(); expect(f.stateUpdates).toEqual([true, false]);
  });
  it('keeps Save busy until the module finishes its async download', async () => {
    const f = make('save'); let finish;
    f.dispatch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = f.handler({ privacyConfirmed: true }); f.load(); await Promise.resolve();
    expect(f.stateUpdates).toEqual([true]);
    expect(await f.handler()).toMatchObject({ reason: 'save-in-progress' });
    expect(f.dispatch.mock.calls[0][1]).toEqual({ privacyConfirmed: true });
    finish({ ok: true }); expect(await first).toEqual({ ok: true }); expect(f.stateUpdates).toEqual([true, false]);
  });
  it('lets the module detect Cancel during privacy confirmation or encryption', async () => {
    const f = make('save'), pending = f.handler(); f.load(); await pending;
    const current = f.dispatch.mock.calls[0][0].isSaveRequestCurrent;
    expect(current()).toBe(true); f.change('showSaveModal'); expect(current()).toBe(false);
  });
});

describe('adventure request coordination', () => {
  it('opens one setup for duplicate early clicks', async () => {
    const f = make('start'), first = f.handler(); expect(await f.handler()).toBe(false);
    f.load(); await first; expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('retains the start guard through restart confirmation', async () => {
    const f = make('start'), pending = f.handler(); f.load(); await pending;
    const current = f.dispatch.mock.calls[0][0].isAdventureStartCurrent;
    expect(current()).toBe(true); f.change('adventureState'); expect(current()).toBe(false);
  });
  it('applies only the latest pending dice completion', async () => {
    const f = make('dice'), first = f.handler(), last = f.handler(); f.load();
    expect(await first).toBe(false); await last; expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('allows an image-only refresh while retaining the current turn', async () => {
    const f = make('dice'), pending = f.handler();
    f.env.adventureState = { ...f.env.adventureState, sceneImage: 'new-image' }; f.render(); f.load();
    expect(await pending).toBe('dispatched');
  });
});
