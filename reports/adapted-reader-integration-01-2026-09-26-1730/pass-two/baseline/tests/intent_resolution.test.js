// Intent resolution: give the reasoning step the context it was missing, and
// let a goal-shaped ask become a plan instead of one lonely command.
//
// Three defects this pins:
//   1. The command router and the planner sent the model a flat command menu
//      and the raw utterance, and nothing else. Thirteen state signals already
//      existed on the command context, spent entirely on ranking the palette.
//   2. "Make a comprehensive lesson on volcanoes" matched create_lesson and
//      stopped there. The chat only reaches the planner when the router finds
//      NOTHING and looksMultiStep() is true, and a single goal clause is
//      neither, so it could never expand.
//   3. A plan ran underneath whatever modal happened to be open, so the agent
//      looked broken because nothing visible happened.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AC;
beforeAll(() => {
  const noop = () => {};
  vi.stubGlobal('React', {
    createElement: noop,
    useState: () => [undefined, noop],
    useEffect: noop,
    useRef: () => ({ current: null }),
    useMemo: noop,
    useCallback: (f) => f,
  });
  loadAlloModule('allo_commands_module.js');
  AC = window.AlloModules.AlloCommands;
  if (!AC) throw new Error('AlloCommands failed to register');
});

const teacherCtx = (over = {}) => ({
  t: (k, fb) => (fb === undefined ? k : fb),
  isTeacherMode: true,
  ...over,
});

describe('a goal-shaped ask is treated as a goal', () => {
  it('recognises a single-clause goal as multi-step work', () => {
    // These have no "and"/"then" chain, which is all looksMultiStep used to
    // look for, so the planner never got a chance at them.
    expect(AC.looksMultiStep('make a comprehensive lesson about volcanoes')).toBe(true);
    expect(AC.looksMultiStep('make a full lesson pack on the water cycle')).toBe(true);
    expect(AC.looksMultiStep('build a complete unit on fractions')).toBe(true);
    expect(AC.looksMultiStep('prepare materials for tomorrow')).toBe(true);
  });

  it('still ignores ordinary chatter and narrow asks', () => {
    expect(AC.looksMultiStep('what is photosynthesis')).toBe(false);
    expect(AC.looksMultiStep('open the stem lab')).toBe(false);
    // A plain lesson ask keeps its precise single-command match.
    expect(AC.looksMultiStep('create a lesson about volcanoes for grade 5')).toBe(false);
    expect(AC.looksMultiStep('hi')).toBe(false);
  });

  it('keeps recognising genuine sequences', () => {
    expect(AC.looksMultiStep('simplify this and make a quiz')).toBe(true);
    expect(AC.looksMultiStep('translate it then export the pack')).toBe(true);
  });
});

describe('the chat hands a goal to the planner instead of a seed command', () => {
  it('declines the seed match so the caller can plan', async () => {
    // The chat only plans when the router returns nothing. create_lesson has a
    // regex grammar that fires before the scorer, so without this the ask was
    // answered by one command every time.
    const createLesson = vi.fn();
    const ctx = teacherCtx({ createLesson, startLessonFlow: createLesson });
    const res = await AC.routeUtterance(ctx, 'make a comprehensive lesson about volcanoes', { allowAi: false, preview: true });
    expect(res, 'router deferred to the planner').toBeNull();
  });

  it('does NOT defer for voice or the palette, which have no planner branch', async () => {
    // preview is the chat. Voice runs the match directly, so deferring there
    // would turn a working command into silence. Drive the AI lane so the same
    // breadth-flagged ask produces a match on both paths.
    const goal = 'make a comprehensive lesson about volcanoes';
    const reply = () => Promise.resolve('{"commandId":"create_lesson","params":{},"confidence":0.95}');
    const startLessonFlow = vi.fn();
    const voice = await AC.routeUtterance(
      teacherCtx({ startLessonFlow, callGemini: reply }), goal, { allowAi: true, preview: false });
    expect(voice, 'voice still acted on the match').not.toBeNull();

    const chat = await AC.routeUtterance(
      teacherCtx({ startLessonFlow: vi.fn(), callGemini: reply }), goal, { allowAi: true, preview: true });
    expect(chat, 'the chat deferred the same ask to the planner').toBeNull();
  });

  it('keeps the precise match for a plain lesson ask, params and all', async () => {
    // The create_lesson grammar extracts topic AND grade. Expanding every
    // lesson request into a plan would throw that away, so only an explicit
    // breadth signal ("comprehensive", "full", "materials") triggers planning.
    const res = await AC.routeUtterance(
      teacherCtx({ startLessonFlow: vi.fn() }), 'create a lesson about volcanoes for grade 5',
      { allowAi: false, preview: true });
    expect(res && res.commandId, 'still a direct create_lesson proposal').toBe('create_lesson');
    expect(res.params, 'grammar params survived').toMatchObject({ topic: 'volcanoes', grade: '5' });
  });

  it('leaves an ordinary single command alone even in the chat', async () => {
    const openStemLab = vi.fn();
    const ctx = teacherCtx({ openStemLab });
    const res = await AC.routeUtterance(ctx, 'open the stem lab', { allowAi: false, preview: true });
    expect(res && res.commandId, 'normal commands still resolve').toBe('open_stem_lab');
  });
});

describe('the model is told what the user is doing', () => {
  it('sends live app state, not just a command menu', async () => {
    let prompt = '';
    const callGemini = vi.fn((p) => { prompt = String(p); return Promise.resolve('{"commandId":null,"params":{},"confidence":0}'); });
    const ctx = teacherCtx({
      callGemini,
      stemLabOpen: true,
      stemLabTool: 'beehive',
      contentLoaded: true,
      contentIsGlossary: true,
    });
    await AC.routeUtterance(ctx, 'make this easier for them', { allowAi: true, preview: false });

    expect(callGemini, 'the AI route ran').toHaveBeenCalled();
    expect(prompt, 'names the open surface').toContain('STEAM Lab');
    expect(prompt, 'names the active tool').toContain('beehive');
    expect(prompt, 'says what content is loaded').toContain('glossary');
    expect(prompt, 'identifies the audience').toMatch(/Audience: teacher/);
  });

  it('adds nothing when there is no state worth reporting', async () => {
    let prompt = '';
    const callGemini = vi.fn((p) => { prompt = String(p); return Promise.resolve('{"commandId":null,"params":{},"confidence":0}'); });
    await AC.routeUtterance({ t: (k, fb) => fb, callGemini }, 'do the thing please', { allowAi: true, preview: false });
    // A brief is a summary, never a dump: with nothing open it must not claim
    // a surface is. (The command MENU naturally names panels, so assert on the
    // brief's own labels rather than on panel names appearing anywhere.)
    expect(prompt).not.toContain('Open right now:');
    expect(prompt).toContain('Content loaded: none yet');
  });
});

describe('a plan clears the stage before it runs', () => {
  it('closes blocking modals so the work is visible', async () => {
    const closeOtherPanels = vi.fn();
    const openStemLab = vi.fn();
    const ctx = teacherCtx({ closeOtherPanels, openStemLab });
    await AC.runPlan(ctx, [{ commandId: 'open_stem_lab', params: {} }]);
    // The stage clear is the call that keeps nothing; open_stem_lab separately
    // calls closeOtherPanels('stemLab') as it runs.
    expect(closeOtherPanels.mock.calls.some((c) => !c[0]), 'stage cleared first').toBe(true);
  });

  it('honours a caller that owns its own surface', async () => {
    const closeOtherPanels = vi.fn();
    const ctx = teacherCtx({ closeOtherPanels, openStemLab: vi.fn() });
    await AC.runPlan(ctx, [{ commandId: 'open_stem_lab', params: {} }], { keepPanels: true });
    expect(closeOtherPanels.mock.calls.some((c) => !c[0]), 'no stage clear').toBe(false);
  });

  it('does not break when the host predates closeOtherPanels', async () => {
    const openStemLab = vi.fn();
    const res = await AC.runPlan(teacherCtx({ openStemLab }), [{ commandId: 'open_stem_lab', params: {} }]);
    expect(res, 'plan still returned a result').toBeTruthy();
  });
});
