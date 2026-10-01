import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8');
function between(start, end) {
  const a = host.indexOf(start), b = host.indexOf(end, a + start.length);
  if (a < 0 || b < a || host.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous handler: ' + start);
  return host.slice(a, b);
}
function make(kind) {
  let release, reject;
  const ready = new Promise((resolve, fail) => { release = resolve; reject = fail; });
  const refs = [], cleanups = [];
  const env = {
    window: { AlloModules: {} }, React: { useCallback: fn => fn, useEffect: fn => { cleanups.push(fn()); } },
    useRef: initial => { const ref = { current: initial }; refs.push(ref); return ref; },
    _alloAwaitModules: vi.fn(() => ready), autoFixLoadRequestRef: { current: 0 },
    pdfFixResultRef: { current: { accessibleHtml: '<p>A</p>' } }, pdfHtmlRevisionRef: { current: 1 },
    pdfAutoContinueAbortRef: { current: false }, pdfAutoContinueAbortCtrlRef: { current: null }, saveProjectToFileRef: { current: vi.fn() },
    generatedContent: { id: 'cards-A', data: [{ text: 'First' }] }, flashcardIndex: 0, flashcardLang: 'en', flashcardMode: 'study', standardDeckLang: 'en',
    selectedVoice: 'voice-A', activeView: 'flashcards', isInteractiveFlashcards: true, playbackSessionRef: { current: 12 },
    Object, Number, Array, undefined,
  };
  const scope = new Proxy(env, { has: () => true, get: (target, key) => key === Symbol.unscopables ? undefined : key in target ? target[key] : vi.fn() });
  const source = kind === 'audio' ? between('  const cardAudioLoadRequestRef = useRef(0);', '  const handleGlossaryChange =') : between('  const autoFixLoadRequestRef = useRef(0);', '  const saveProjectToFile =');
  const handler = new Function('scope', 'with(scope) { ' + source + '\nreturn ' + (kind === 'audio' ? 'handleCardAudioSequence' : 'runAutoFixLoop') + '; }')(scope);
  const dispatch = vi.fn(() => 'dispatched');
  const load = () => { env.window.AlloModules[kind === 'audio' ? 'AudioHelpers' : 'MiscHandlers'] = { [kind === 'audio' ? 'handleCardAudioSequence' : 'runAutoFixLoop']: dispatch }; release(); };
  return { env, handler, dispatch, load, reject, refs, unmount: () => cleanups.forEach(fn => fn?.()) };
}
describe('early flashcard audio', () => {
  it('stops propagation immediately and waits for the real module key', async () => {
    const f = make('audio'), event = { stopPropagation: vi.fn() }, pending = f.handler(event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([['AudioHelpersModule', 'AudioHelpers']], 'flashcard audio');
    expect(f.dispatch).not.toHaveBeenCalled(); f.load();
    expect(await pending).toBe('dispatched'); expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('rejects changed context field %i', async index => {
    const f = make('audio'), pending = f.handler();
    f.refs[1].current = [...f.refs[1].current]; f.refs[1].current[index] = 'new-context';
    f.load(); await pending; expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('respects Stop during loading', async () => {
    const f = make('audio'), pending = f.handler(); f.env.playbackSessionRef.current++;
    f.load(); await pending; expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('dispatches only the latest early click', async () => {
    const f = make('audio'), first = f.handler(), last = f.handler(); f.load();
    await Promise.all([first, last]); expect(f.dispatch).toHaveBeenCalledOnce();
  });
  it('does not replay after unmount', async () => {
    const f = make('audio'), pending = f.handler(); f.unmount(); f.load();
    await pending; expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('preserves connection failures and leaves playback untouched', async () => {
    const f = make('audio'), pending = f.handler(), error = new Error('Module connection failed');
    const assertion = expect(pending).rejects.toBe(error); f.reject(error); await assertion;
    expect(f.dispatch).not.toHaveBeenCalled(); expect(f.env.playbackSessionRef.current).toBe(12);
  });
});
describe('document auto-continue startup', () => {
  it('waits then passes the round limit and current result ref', async () => {
    const f = make('document'), pending = f.handler(4);
    expect(f.env._alloAwaitModules).toHaveBeenCalledWith([['MiscHandlersModule', 'MiscHandlers']], 'document auto-continue');
    expect(f.dispatch).not.toHaveBeenCalled(); f.load(); expect(await pending).toBe('dispatched');
    expect(f.dispatch.mock.calls[0][0]).toBe(4); expect(f.dispatch.mock.calls[0][1].pdfFixResultRef).toBe(f.env.pdfFixResultRef);
  });
  it.each(['generation', 'result', 'revision'])('rejects a changed document (%s)', async kind => {
    const f = make('document'), pending = f.handler();
    if (kind === 'generation') f.env.window.__alloPdfRunGen = 1;
    if (kind === 'result') f.env.pdfFixResultRef.current = { accessibleHtml: '<p>B</p>' };
    if (kind === 'revision') f.env.pdfHtmlRevisionRef.current++;
    f.load(); expect(await pending).toEqual({ started: false, reason: 'document-changed' }); expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('reports Stop during startup', async () => {
    const f = make('document'), pending = f.handler(); f.env.pdfAutoContinueAbortRef.current = true;
    f.load(); expect(await pending).toEqual({ started: false, reason: 'user-stopped' }); expect(f.dispatch).not.toHaveBeenCalled();
  });
  it('permits an explicit restart after an earlier stopped run', async () => {
    const f = make('document'); f.env.pdfAutoContinueAbortRef.current = true;
    const pending = f.handler(); f.load(); expect(await pending).toBe('dispatched');
  });
  it('supersedes old startup without spending a round', async () => {
    const f = make('document'), first = f.handler(), last = f.handler(); f.load();
    expect(await first).toEqual({ started: false, reason: 'superseded' }); expect(await last).toBe('dispatched'); expect(f.dispatch).toHaveBeenCalledOnce();
  });
});
