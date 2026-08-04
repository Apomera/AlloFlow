// Unit tests for the agentic-plan layer of AlloCommands (planUtterance /
// runPlan / looksMultiStep / runCommandById's awaitCompletion path,
// docs/AGENTIC_ALLOBOT_DESIGN.md). These pin the consent + safety contract:
// destructive steps never auto-run, unavailable steps stop the plan at run
// time, unknown planner ids reject the whole plan, a timed-out step HOLDS
// the remainder (never races a still-running generation), and the planner
// menu includes when-gated commands so "create lesson → quiz" chains stay
// plannable before content exists (the #1 regression, fixed 2026-07-10).

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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
afterAll(() => { vi.unstubAllGlobals(); });

// A teacher ctx with content loaded and async generate handlers whose
// completion order is observable.
function mkCtx(overrides = {}) {
  const log = [];
  const ctx = {
    t: (k, f) => f || k,
    isTeacherMode: true,
    hasSourceOrAnalysis: true,
    generateQuiz: () => new Promise((res) => setTimeout(() => { log.push('quiz-finished'); res(); }, 30)),
    generateGlossary: () => Promise.resolve().then(() => log.push('glossary-finished')),
    generateSimplified: () => Promise.resolve().then(() => log.push('simplified-finished')),
    generateSentenceFrames: () => Promise.resolve(),
    generateAnalysis: () => Promise.resolve(),
    setShowLearningHub: () => log.push('hub'),
    clearWorkspace: () => log.push('CLEARED'),
    callGemini: async () => JSON.stringify({
      steps: [
        { commandId: 'generate_simplified', params: { grade: '3' }, why: 'lower level' },
        { commandId: 'generate_quiz', params: {}, why: 'assess' },
      ],
      confidence: 0.9,
    }),
    ...overrides,
  };
  return { ctx, log };
}

describe('looksMultiStep', () => {
  it('flags then-chains and numbered lists, not single asks or openers', () => {
    expect(AC.looksMultiStep('simplify this to grade 3 then make a quiz')).toBe(true);
    expect(AC.looksMultiStep('1. simplify this\n2. make a quiz')).toBe(true);
    expect(AC.looksMultiStep('make a quiz')).toBe(false);
    expect(AC.looksMultiStep('hi')).toBe(false);
  });
  it('flags and-chains with two command verbs, not conversational ands', () => {
    expect(AC.looksMultiStep('simplify this and make a quiz')).toBe(true);
    expect(AC.looksMultiStep('what makes volcanoes erupt and why')).toBe(false);
  });
});

describe('planUtterance', () => {
  it('maps a multi-step ask to validated ordered steps', async () => {
    const { ctx } = mkCtx();
    const steps = await AC.planUtterance(ctx, 'simplify this to grade 3 then make a quiz');
    expect(steps).toHaveLength(2);
    expect(steps[0].commandId).toBe('generate_simplified');
    expect(steps[0].params).toEqual({ grade: '3' });
  });

  it('forwards AbortSignal and propagates cancellation from AI planning', async () => {
    const controller = new AbortController();
    const callGemini = vi.fn(async (_prompt, _json, _search, _temperature, _query, signal) => {
      expect(signal).toBe(controller.signal);
      controller.abort();
      const error = new Error('cancelled');
      error.name = 'AbortError';
      throw error;
    });
    const { ctx } = mkCtx({ callGemini });
    await expect(AC.planUtterance(ctx, 'simplify this then make a quiz', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(callGemini).toHaveBeenCalledOnce();
  });

  it('rejects a late planner response after cancellation even when the transport resolves', async () => {
    const controller = new AbortController();
    const { ctx } = mkCtx({
      callGemini: async () => {
        controller.abort();
        return JSON.stringify({
          steps: [
            { commandId: 'generate_simplified', params: { grade: '3' } },
            { commandId: 'generate_quiz', params: {} },
          ],
          confidence: 0.95,
        });
      },
    });
    await expect(AC.planUtterance(ctx, 'simplify this then make a quiz', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects the whole plan when ANY id is unknown', async () => {
    const { ctx } = mkCtx({
      callGemini: async () => JSON.stringify({
        steps: [{ commandId: 'rm_rf', params: {} }, { commandId: 'generate_quiz', params: {} }],
        confidence: 0.95,
      }),
    });
    expect(await AC.planUtterance(ctx, 'do things then more things')).toBeNull();
  });

  it('rejects low-confidence and single-step plans', async () => {
    const low = mkCtx({ callGemini: async () => JSON.stringify({ steps: [{ commandId: 'generate_quiz', params: {} }, { commandId: 'generate_glossary', params: {} }], confidence: 0.4 }) });
    expect(await AC.planUtterance(low.ctx, 'a then b')).toBeNull();
    const single = mkCtx({ callGemini: async () => JSON.stringify({ steps: [{ commandId: 'generate_quiz', params: {} }], confidence: 0.9 }) });
    expect(await AC.planUtterance(single.ctx, 'a then b')).toBeNull();
  });

  // Contract hardening (2026-07-13): gated commands stay visible to the
  // planner, but a wizard cannot pretend it produced source content.
  it('rejects a false create-lesson → quiz dependency while exposing requirements', async () => {
    const { ctx } = mkCtx({
      hasSourceOrAnalysis: false,
      startLessonFlow: () => {},
      callGemini: async (prompt) => {
        expect(prompt).toContain('generate_quiz');
        expect(prompt).toContain('not available in the live state');
        expect(prompt).toContain('requires source');
        expect(prompt).toContain('create_lesson');
        expect(prompt).toContain('must be final');
        return JSON.stringify({
          steps: [
            { commandId: 'create_lesson', params: { topic: 'volcanoes', grade: '5' }, why: 'make content' },
            { commandId: 'generate_quiz', params: {}, why: 'assess it' },
          ],
          confidence: 0.9,
        });
      },
    });
    expect(await AC.planUtterance(ctx, 'create a lesson about volcanoes then make a quiz')).toBeNull();
  });

  // Hardening (2026-07-10): destructive commands are excluded from plans
  // outright — they belong on explicitly-confirmed single-command surfaces.
  it('never shows destructive commands to the planner, and rejects plans using them', async () => {
    const { ctx } = mkCtx({
      callGemini: async (prompt) => {
        expect(prompt).not.toContain('clear_workspace');
        return JSON.stringify({
          steps: [{ commandId: 'clear_workspace', params: {} }, { commandId: 'generate_quiz', params: {} }],
          confidence: 0.95,
        });
      },
    });
    expect(await AC.planUtterance(ctx, 'clear everything then make a quiz')).toBeNull();
  });

  // Hardening (2026-07-10/16): model-returned params are sanitized to flat,
  // bounded primitives and filtered through each command's declared contract.
  it('sanitizes plan params to flat bounded contract params', async () => {
    const { ctx } = mkCtx({
      callGemini: async () => JSON.stringify({
        steps: [
          { commandId: 'generate_simplified', params: { grade: '3', junk: { nested: true }, list: [1, 2], big: 'x'.repeat(500), n: 7, flag: true, bad: Infinity } },
          { commandId: 'generate_quiz', params: null },
        ],
        confidence: 0.9,
      }),
    });
    const steps = await AC.planUtterance(ctx, 'simplify this then make a quiz');
    expect(steps[0].params.grade).toBe('3');
    expect(steps[0].params.junk).toBeUndefined();
    expect(steps[0].params.list).toBeUndefined();
    expect(steps[0].params.bad).toBeUndefined();
    expect(steps[0].params.big).toBeUndefined();
    expect(steps[0].params.n).toBeUndefined();
    expect(steps[0].params.flag).toBeUndefined();
    expect(steps[1].params).toEqual({});
  });

  it('keeps declared planner params while truncating allowed long strings', async () => {
    const { ctx } = mkCtx({
      callGemini: async () => JSON.stringify({
        steps: [
          { commandId: 'find_reading', params: { topic: 'climate', raw: 'x'.repeat(500), extra: 'drop me', junk: { nested: true } } },
          { commandId: 'open_learning_hub', params: { extra: 'drop me too' } },
        ],
        confidence: 0.9,
      }),
    });
    const steps = await AC.planUtterance(ctx, 'find readings about climate then open learning hub');
    expect(steps[0].params.topic).toBe('climate');
    expect(steps[0].params.raw).toHaveLength(200);
    expect(steps[0].params.extra).toBeUndefined();
    expect(steps[0].params.junk).toBeUndefined();
    expect(steps[1].params).toEqual({});
  });
});

describe('runPlan', () => {

describe('command contracts and plan validation', () => {
  it('marks the lesson wizard as interactive, terminal, and unsafe for automatic demos', () => {
    expect(AC.getCommandContract('create_lesson')).toMatchObject({
      demoSafe: false, interaction: 'guided', terminal: true, params: ['topic', 'grade'],
    });
  });

  it('blocks missing prerequisites and privacy-sensitive demo commands', () => {
    const { ctx } = mkCtx({ hasSourceOrAnalysis: false, startLessonFlow: () => {} });
    const missing = AC.validatePlan(ctx, [{ commandId: 'generate_quiz', params: {} }], { demoSafeOnly: true });
    expect(missing.ok).toBe(false);
    expect(missing.items[0].detail).toContain('Needs source');
    const unsafe = AC.validatePlan(ctx, [{ commandId: 'open_ai_settings', params: {} }], { demoSafeOnly: true });
    expect(unsafe.ok).toBe(false);
    expect(unsafe.items[0].status).toBe('block');
    const history = AC.validatePlan(ctx, [{ commandId: 'open_history', params: {} }], { demoSafeOnly: true });
    expect(history.ok).toBe(false);
    expect(history.items[0].status).toBe('block');
  });

  it('accepts a safe generation chain when source already exists', () => {
    const { ctx } = mkCtx({ hasSourceOrAnalysis: true });
    const report = AC.validatePlan(ctx, [
      { commandId: 'generate_simplified', params: { grade: '3' } },
      { commandId: 'generate_quiz', params: {} },
    ], { demoSafeOnly: true });
    expect(report.ok).toBe(true);
    expect(report.blockingCount).toBe(0);
  });
  it('keeps the recorder launch out of automatic demos while allowing safe launcher demos', () => {
    const { ctx } = mkCtx();
    const recorder = AC.validatePlan(ctx, [{ commandId: 'open_video_studio', params: {} }], { demoSafeOnly: true });
    expect(recorder.ok).toBe(false);
    expect(recorder.items[0].detail).toContain('recorder/editor');
    const timeline = AC.validatePlan(ctx, [{ commandId: 'open_timeline_studio', params: {} }], { demoSafeOnly: true });
    expect(timeline.ok).toBe(true);
    const research = AC.validatePlan(ctx, [{ commandId: 'open_research_hub', params: {} }], { demoSafeOnly: true });
    expect(research.ok).toBe(true);
    const live = AC.validatePlan({ ...ctx, activeSessionCode: 'ABC123', openLivePoll: () => {} }, [{ commandId: 'open_live_poll', params: {} }], { demoSafeOnly: true });
    expect(live.ok).toBe(false);
    expect(live.items[0].detail).toContain('not allowed');
  });

  it('removes demo-blocked commands from the AI planner menu', async () => {
    const { ctx } = mkCtx({
      callGemini: async (prompt) => {
        expect(prompt).not.toContain('create_lesson:');
        expect(prompt).not.toContain('open_ai_settings:');
        expect(prompt).not.toContain('open_history:');
        return JSON.stringify({ steps: [
          { commandId: 'generate_simplified', params: { grade: '3' } },
          { commandId: 'generate_quiz', params: {} },
        ], confidence: 0.9 });
      },
    });
    expect(await AC.planUtterance(ctx, 'simplify then quiz', { demoSafeOnly: true })).toHaveLength(2);
  });
});
  it('filters params by command contract before execution', async () => {
    const startLessonFlow = vi.fn();
    const { ctx } = mkCtx({ startLessonFlow });
    const pr = await AC.runPlan(ctx, [
      { commandId: 'create_lesson', params: { topic: 'volcanoes', grade: '5', extra: 'drop me' } },
    ]);
    expect(pr.ok).toBe(true);
    expect(startLessonFlow).toHaveBeenCalledWith({ topic: 'volcanoes', grade: '5' });
  });
  it('executes sequentially and AWAITS each async step to completion', async () => {
    const { ctx, log } = mkCtx();
    const events = [];
    const pr = await AC.runPlan(() => ctx, [
      { commandId: 'generate_simplified', params: { grade: '3' } },
      { commandId: 'generate_quiz', params: {} },
    ], { onStep: (i, ph, cmd) => events.push(ph + ':' + cmd.id) });
    expect(pr.ok).toBe(true);
    expect(log).toContain('quiz-finished'); // resolved BEFORE the plan reported done
    expect(events).toEqual([
      'start:generate_simplified', 'done:generate_simplified',
      'start:generate_quiz', 'done:generate_quiz',
    ]);
  });

  it('never auto-runs a destructive step', async () => {
    const { ctx, log } = mkCtx();
    const pr = await AC.runPlan(ctx, [
      { commandId: 'clear_workspace', params: {} },
      { commandId: 'generate_quiz', params: {} },
    ]);
    expect(pr.ok).toBe(false);
    expect(pr.failedStep).toBe(0);
    expect(log).not.toContain('CLEARED');
  });

  it('stops when a step is unavailable at RUN time (when-guard)', async () => {
    const { ctx } = mkCtx({ hasSourceOrAnalysis: false });
    const pr = await AC.runPlan(ctx, [{ commandId: 'generate_quiz', params: {} }]);
    expect(pr.ok).toBe(false);
  });

  // Regression (2026-07-26): the Video Studio demo runner passed a ctx factory that
  // closed over the render snapshot taken when recording started, so steps after the
  // first evaluated their when-guards against pre-demo state. "Make a glossary, then
  // open flashcards" passed preflight and then died mid-recording, because
  // launch_flashcards (when: contentIsGlossary) was filtered out of the rebuilt menu.
  it('re-reads ctx from the factory between steps, so a capability step 1 unlocks is visible to step 2', async () => {
    const log = [];
    let contentIsGlossary = false; // flips when step 1 runs, as React state would
    const getCtx = () => mkCtx({
      contentIsGlossary,
      generateGlossary: () => { log.push('glossary'); contentIsGlossary = true; },
      launchFlashcards: () => log.push('flashcards'),
    }).ctx; // a NEW ctx object on every call

    const pr = await AC.runPlan(getCtx, [
      { commandId: 'generate_glossary', params: {} },
      { commandId: 'launch_flashcards', params: {} },
    ]);
    expect(pr.ok).toBe(true);
    expect(log).toEqual(['glossary', 'flashcards']);
  });

  it('the same plan fails when the factory is pinned to a stale ctx (the bug this guards)', async () => {
    const log = [];
    let contentIsGlossary = false;
    const stale = mkCtx({
      contentIsGlossary: false, // never updated on this object, like a captured closure
      generateGlossary: () => { log.push('glossary'); contentIsGlossary = true; },
      launchFlashcards: () => log.push('flashcards'),
    }).ctx;

    const pr = await AC.runPlan(() => stale, [
      { commandId: 'generate_glossary', params: {} },
      { commandId: 'launch_flashcards', params: {} },
    ]);
    expect(pr.ok).toBe(false);
    expect(log).toEqual(['glossary']); // step 2 never ran
    expect(contentIsGlossary).toBe(true); // the capability really was unlocked
  });

  // Regression (2026-07-10): a timed-out step is still running — the plan
  // must HOLD the remaining steps, not start the next one alongside it.
  it('holds the remainder when a step times out instead of racing it', async () => {
    const { ctx, log } = mkCtx({
      generateSimplified: () => new Promise(() => {}), // never resolves
    });
    const pr = await AC.runPlan(ctx, [
      { commandId: 'generate_simplified', params: {} },
      { commandId: 'generate_quiz', params: {} },
    ], { timeoutMs: 40 });
    expect(pr.ok).toBe(false);
    expect(pr.timedOut).toBe(true);
    expect(pr.failedStep).toBe(0);
    expect(pr.results).toHaveLength(1); // quiz step never started
    expect(pr.remainingSteps.map((step) => step.commandId)).toEqual(['generate_quiz']);
    expect(log).not.toContain('quiz-finished');
  });

  it('honors shouldStop between steps', async () => {
    const { ctx } = mkCtx();
    let ran = 0;
    const pr = await AC.runPlan(ctx, [
      { commandId: 'generate_glossary', params: {} },
      { commandId: 'generate_quiz', params: {} },
    ], { onStep: () => { ran++; }, shouldStop: () => ran >= 2 }); // stop after step 1 completes
    expect(pr.ok).toBe(false);
    expect(pr.stopped).toBe(true);
    expect(pr.results).toHaveLength(1);
    expect(pr.remainingSteps.map((step) => step.commandId)).toEqual(['generate_quiz']);
  });

  it('preserves the failed step at the front of a resumable remainder', async () => {
    const { ctx } = mkCtx({ hasSourceOrAnalysis: false });
    const steps = [
      { commandId: 'generate_quiz', params: {} },
      { commandId: 'open_learning_hub', params: {} },
    ];
    const pr = await AC.runPlan(ctx, steps);
    expect(pr.ok).toBe(false);
    expect(pr.remainingSteps).toEqual(steps);
  });
});

describe('AlloBot plan recovery wiring', () => {
  it('offers the exact remaining sequence while preserving the original undo point', () => {
    // 2026-07-20: the planning layer lives in UdlChat — assert host + module.
    const app = readFileSync('AlloFlowANTI.txt', 'utf-8') + readFileSync('udl_chat_source.jsx', 'utf-8');
    expect(app).toContain('_pendingBotPlanRef.current = _preparePendingCommandWorkflow(_AC, _alloCmdCtx(), _remaining, _pendingPlan.originalText, { resume: true });');
    expect(app).toContain("value: '__allo_plan_run'");
    expect(app).toContain('if (!_pendingPlan.resume || !_planUndoRef.current)');
    expect(app).toContain('_pendingBotPlanRef.current = null;');
  });
  it('keeps AI command discovery single-flight and suppresses stale results in both app sources', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      // 2026-07-20: the planning layer lives ONCE in UdlChat (udl_chat_source),
      // shared by every host — assert host + module together.
      const app = readFileSync(path, 'utf-8') + readFileSync('udl_chat_source.jsx', 'utf-8');
      expect(app).toContain('const _botCommandPlanningRef = useRef({ controller: null, serial: 0 });');
      expect(app).toContain('_previousBotPlanning.controller.abort()');
      expect(app).toContain('{ allowAi: true, preview: true, signal: _botPlanningSignal }');
      expect(app).toContain('{ signal: _botPlanningSignal }');
      expect(app.match(/if \(!_isCurrentBotCommandPlanning\(\)\) return;/g)).toHaveLength(2);
      expect(app).toContain("error && error.name === 'AbortError'");
    }
  });
  it('cancels pending AI command discovery when AlloBot closes or unmounts', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      // 2026-07-20: the planning layer lives ONCE in UdlChat (udl_chat_source),
      // shared by every host — assert host + module together.
      const app = readFileSync(path, 'utf-8') + readFileSync('udl_chat_source.jsx', 'utf-8');
      expect(app).toContain('const _cancelBotCommandPlanning = () => {');
      expect(app).toContain('if (!showUDLGuide) _cancelBotCommandPlanning();');
      expect(app).toContain('useEffect(() => () => {\n    _cancelBotCommandPlanning();\n  }, []);');
    }
  });
});
describe('CommandWorkflow plan-card integration', () => {
  it('uses the Agent Core workflow lifecycle for dry-run, editing, and approval', () => {
    const chat = readFileSync('udl_chat_source.jsx', 'utf-8');
    expect(chat).toContain('createCommandWorkflowService');
    expect(chat).toContain('_commandWorkflowPlanCard');
    expect(chat).toContain("value: '__allo_plan_edit'");
    expect(chat).toContain('reviseFromText(_pendingPlan.workflow');
    expect(chat).toContain("approve(_pendingPlan.workflow, 'teacher-ui'");
    expect(chat).toContain('planExecution(_approved.value');
    expect(chat).toContain('Dry run passed. Run all steps, edit the workflow, or keep chatting.');
    expect(chat).toContain("value: '__allo_plan_save'");
    expect(chat).toContain("value: '__allo_plan_library'");
    expect(chat).toContain("'__allo_plan_load:'");
    expect(chat).toContain("'__allo_plan_delete:'");
    expect(chat).toContain('saveSaved(_pendingPlan.workflow');
    expect(chat).toContain('loadSaved(_savedWorkflowId');
    expect(chat).toContain('deleteSaved(_savedWorkflowId');
    expect(chat).toContain("_rawUtter === '__allo_plan_library'");
    expect(chat).toContain('libraryOnly: true');
    expect(chat).toContain('if (_pendingPlan.libraryOnly) return;');
    const host = readFileSync('AlloFlowANTI.txt', 'utf-8');
    expect(host).toContain('openCommandBlueprintLibrary: () => {');
    expect(host).toContain("handleSendUDLMessage('__allo_plan_library')");
  });
});

// Demo Autopilot premature-end fix (2026-08-04). Root cause: handleGenerate
// swallowed every failure (toast + resolve undefined) unless the caller passed
// rethrowErrors — which only blueprints did. A failed generation step therefore
// reported SUCCESS ("Quiz ready" in the demo captions), and the run died one
// step LATER on a when-guard with "isn't available right now" instead of the
// real reason. The ctx bindings in both ANTI copies now opt in.
describe('honest failure attribution for generation steps', () => {
  it('a rejecting generation step fails the plan AT that step with the real reason', async () => {
    const { ctx, log } = mkCtx({
      generateGlossary: () => Promise.reject(new Error('Daily Usage Limit Reached. Please try again later.')),
    });
    const pr = await AC.runPlan(ctx, [
      { commandId: 'generate_glossary', params: {} },
      { commandId: 'generate_quiz', params: {} },
    ]);
    expect(pr.ok).toBe(false);
    expect(pr.failedStep).toBe(0);
    expect(pr.reason).toContain('Daily Usage Limit Reached');
    expect(pr.remainingSteps.map((s) => s.commandId)).toEqual(['generate_glossary', 'generate_quiz']);
    expect(log).not.toContain('quiz-finished'); // the next step never started
  });

  it('the same failure SWALLOWED is misattributed to the next step — the bug rethrowErrors closes', async () => {
    // generateGlossary "succeeds" without producing anything, like the old
    // handleGenerate did on error. The plan dies at step 2's when-guard with a
    // message that blames the wrong step. This pins WHY the ANTI ctx bindings
    // must rethrow; if this test ever fails, the guard semantics changed.
    const getCtx = () => mkCtx({
      contentIsGlossary: false,
      generateGlossary: () => Promise.resolve(), // swallow: no rejection, no content
      launchFlashcards: () => {},
    }).ctx;
    const pr = await AC.runPlan(getCtx, [
      { commandId: 'generate_glossary', params: {} },
      { commandId: 'launch_flashcards', params: {} },
    ]);
    expect(pr.ok).toBe(false);
    expect(pr.failedStep).toBe(1);
    expect(pr.reason).toContain("isn’t available right now"); // the misleading message
  });

  it('both ANTI copies pass rethrowErrors from every generation ctx binding', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(path, 'utf-8');
      expect(app, path).toContain("generateQuiz: () => handleGenerate('quiz', null, false, null, { rethrowErrors: true })");
      expect(app, path).toContain("generateGlossary: () => handleGenerate('glossary', null, false, null, { rethrowErrors: true })");
      expect(app, path).toContain("generateSimplified: (cfg) => handleGenerate('simplified', null, false, null, Object.assign({ rethrowErrors: true }, cfg || {}))");
      expect(app, path).toContain("generateSentenceFrames: () => handleGenerate('sentence-frames', null, false, null, { rethrowErrors: true })");
      expect(app, path).toContain("generateAnalysis: () => handleGenerate('analysis', null, false, null, { rethrowErrors: true })");
      // Demo steps get 5 minutes, not the 3-minute default that killed
      // slow-but-honest generations mid-recording.
      expect(app, path).toContain('timeoutMs: 300000');
    }
  });

  it('the dispatcher rethrows on BOTH its catch paths, in source and both built copies', () => {
    // The multi-language batch path had its own catch that ignored
    // rethrowErrors entirely, so a teacher with several languages selected
    // kept the silent swallow. Count 2 = batch + single-language paths.
    // Checking the built module AND its mirror also guards the
    // forgot-to-rebuild trap (verify:source-pair does not catch it).
    for (const path of [
      'generate_dispatcher_source.jsx',
      'generate_dispatcher_module.js',
      'desktop/web-app/public/generate_dispatcher_module.js',
    ]) {
      const code = readFileSync(path, 'utf-8');
      const rethrows = code.match(/if \(configOverride && configOverride\.rethrowErrors\) throw err;/g) || [];
      expect(rethrows.length, path).toBe(2);
    }
  });
});

// Hands-free agent button (2026-08-04): the chat composer's access point for
// the voice command loop. Typed agentic control needs no mode — every chat
// message already routes through the command router — so the button's jobs are
// voice access and discoverability.
describe('AlloBot hands-free agent button', () => {
  it('both ANTI copies pass the voice-loop props to the chat modal', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(path, 'utf-8');
      expect(app, path).toContain('onToggleVoiceAgent: () => { const c = _alloCmdCtx(); if (alloVoiceActive) c.stopVoiceLoop(); else c.startVoiceLoop(); }');
      expect(app, path).toMatch(/voiceAvailable: !!\(window\.SpeechRecognition \|\| window\.webkitSpeechRecognition\) \|\| _isDesktopBundledApp/);
    }
  });
  it('the button is accessible, guarded, and present in source AND built module', () => {
    for (const path of ['view_misc_modals_source.jsx', 'view_misc_modals_module.js', 'desktop/web-app/public/view_misc_modals_module.js']) {
      const code = readFileSync(path, 'utf-8');
      expect(code, path).toContain('chat_agent_voice');       // help-key = spotlight/where-is reachable
      expect(code, path).toContain('aria-pressed');           // toggle semantics for AT
      expect(code, path).toContain('agent_voice_stop_aria');  // distinct label per state
      // One-time hint (the compiler normalizes quote style, so match either).
      expect(code, path).toMatch(/localStorage\.getItem\(["']allo_agent_voice_hint_v1["']\)/);
      // Hidden when speech recognition is unavailable, never a dead control.
      expect(code, path).toMatch(/!!voiceAvailable && typeof onToggleVoiceAgent === ["']function["']/);
    }
  });
  it('the first-enable hint teaches both voice and typed agentic control', () => {
    const src = readFileSync('view_misc_modals_source.jsx', 'utf-8');
    expect(src).toContain('stop listening');
    expect(src).toContain('plan card you review before anything runs');
  });
});

// Voice loop enhancements (2026-08-04): spoken replies + language-follows-UI.
describe('voice loop spoken replies and language', () => {
  it('toggle_voice_replies flips the persisted preference and says so', () => {
    const { ctx } = mkCtx({ voiceAvailable: true });
    try { localStorage.removeItem('allo_voice_speak_replies'); } catch (_) {}
    const off = AC.runCommandById(ctx, 'toggle_voice_replies', {}, {});
    expect(off.handled).toBe(true);
    expect(off.narration).toContain('off');
    expect(localStorage.getItem('allo_voice_speak_replies')).toBe('off');
    const on = AC.runCommandById(ctx, 'toggle_voice_replies', {}, {});
    expect(on.narration).toContain('out loud');
    expect(localStorage.getItem('allo_voice_speak_replies')).toBe('on');
  });

  it('the mic is muted while a reply is spoken, and the utterance restarts it', () => {
    const mod = readFileSync('allo_commands_module.js', 'utf-8');
    // rec.onend must NOT restart during speech; the utterance's end handler owns it.
    expect(mod).toMatch(/if \(active && !speaking\) \{/);
    const speak = mod.slice(mod.indexOf('const speakReply'), mod.indexOf('const announce'));
    expect(speak).toMatch(/speaking = true;\s*if \(active && rec\) \{ try \{ rec\.stop\(\); \} catch \(_\) \{\} \}/);
    expect(speak).toContain('u.onend = resume');
    expect(speak).toContain('setTimeout(resume, 15e3)'); // mic never left dead
    expect(speak).toContain('c.voiceSpeakReplies === false'); // opt-out respected
    expect(speak).toMatch(/speakSerial !== my/); // a cancelled utterance cannot restart mid-speech
    // Root and desktop copies stay identical.
    expect(readFileSync('desktop/web-app/public/allo_commands_module.js', 'utf-8')).toBe(mod);
  });

  it('both ANTI copies derive voiceLang from the UI language with a safe fallback', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(path, 'utf-8');
      expect(app, path).toContain("const s = String(currentUiLanguage || '').replace('_', '-');");
      expect(app, path).toMatch(/\^\[a-z\]\{2,3\}/); // BCP-47 shape guard, nonstandard slugs fall back
      expect(app, path).toContain("localStorage.getItem('allo_voice_speak_replies') !== 'off'");
      expect(app, path).not.toContain("voiceLang: 'en-US',"); // the hardcode is gone
    }
  });

  it('the enable hint now carries the privacy disclosure', () => {
    for (const path of ['view_misc_modals_source.jsx', 'view_misc_modals_module.js']) {
      const code = readFileSync(path, 'utf-8');
      expect(code, path).toContain('sends microphone audio to your browser');
      expect(code, path).toContain('Spoken replies are generated on this device');
    }
  });
});

// Coverage batch (2026-08-04): 10 commands from the audit's gap list.
describe('coverage batch commands', () => {
  it('generation trio is registered, source-gated, and awaits completion', async () => {
    const log = [];
    const { ctx } = mkCtx({
      generateNoteTaking: () => Promise.resolve().then(() => log.push('notes')),
      generateAnchorChart: () => Promise.resolve().then(() => log.push('chart')),
      generateConceptSort: () => Promise.resolve().then(() => log.push('sort')),
    });
    const pr = await AC.runPlan(ctx, [
      { commandId: 'generate_note_taking', params: {} },
      { commandId: 'generate_anchor_chart', params: {} },
      { commandId: 'generate_concept_sort', params: {} },
    ]);
    expect(pr.ok).toBe(true);
    expect(log).toEqual(['notes', 'chart', 'sort']);
    // And they vanish without source, like their siblings.
    const bare = mkCtx({ hasSourceOrAnalysis: false }).ctx;
    expect(AC.buildAlloCommands(bare).find((c) => c.id === 'generate_anchor_chart')).toBeUndefined();
  });

  it('glossary games are glossary-gated and run the host handler', () => {
    const log = [];
    const { ctx } = mkCtx({ contentIsGlossary: true, startMemoryGame: () => log.push('memory'), startMatchingGame: () => log.push('match'), startBingoGame: () => log.push('bingo') });
    for (const id of ['start_memory_game', 'start_matching_game', 'start_bingo_game']) {
      const r = AC.runCommandById(ctx, id, {}, {});
      expect(r.handled, id).toBe(true);
    }
    expect(log).toEqual(['memory', 'match', 'bingo']);
    const noGloss = mkCtx({ contentIsGlossary: false, startMemoryGame: () => {} }).ctx;
    expect(AC.buildAlloCommands(noGloss).find((c) => c.id === 'start_memory_game')).toBeUndefined();
  });

  it('display/read-aloud commands clamp and narrate real state', () => {
    let speed = 1.75;
    const { ctx } = mkCtx({
      cycleColorOverlay: () => 'blue',
      toggleAnimations: () => true,
      animationsDisabled: false,
      adjustVoiceSpeed: (d) => { speed = Math.max(0.5, Math.min(2, speed + d)); return speed; },
    });
    expect(AC.runCommandById(ctx, 'cycle_color_overlay', {}, {}).narration).toContain('blue');
    expect(AC.runCommandById(ctx, 'voice_speed_up', {}, {}).narration).toContain('2x');
    expect(AC.runCommandById(ctx, 'voice_speed_up', {}, {}).narration).toContain('2x'); // clamped
    // No bionic command: the header's "bionic" toggle IS toggle_focus_mode,
    // which already exists — the audit's bionic row was a false gap.
    expect(AC.buildAlloCommands(ctx).find((c) => c.id === 'toggle_bionic_text')).toBeUndefined();
    expect(AC.getCommandContract('generate_anchor_chart').demoSafe).not.toBe(false);
  });

  it('batch 2: crossword, scramble, and the glossary filter param contract', () => {
    const log = [];
    const { ctx } = mkCtx({
      contentIsGlossary: true,
      startCrosswordGame: () => log.push('crossword'),
      startWordScrambleGame: () => log.push('scramble'),
      setGlossaryFilterChoice: (tier) => log.push('filter:' + tier),
    });
    for (const id of ['start_crossword_game', 'start_word_scramble']) {
      expect(AC.runCommandById(ctx, id, {}, {}).handled, id).toBe(true);
    }
    expect(AC.runCommandById(ctx, 'filter_glossary', { tier: 'academic' }, {}).narration).toContain('academic');
    expect(AC.runCommandById(ctx, 'filter_glossary', { tier: 'evil' }, {}).narration).toContain('all'); // whitelist fallback
    expect(log).toEqual(['crossword', 'scramble', 'filter:academic', 'filter:all']);
    expect(AC.getCommandContract('filter_glossary').params).toEqual(['tier']);
  });

  it('batch 3: read-aloud, quiz answers (teacher-only), presentation, side-by-side', () => {
    const log = [];
    const base = {
      contentLoaded: true, contentIsQuiz: true, contentIsSimplified: true,
      openReadThisPage: () => log.push('read'),
      toggleQuizAnswers: () => log.push('answers'),
      togglePresentationMode: () => log.push('present'),
      toggleSideBySide: () => log.push('sbs'),
    };
    const { ctx } = mkCtx(base);
    for (const id of ['read_page_aloud', 'toggle_quiz_answers', 'toggle_presentation_mode', 'toggle_side_by_side']) {
      expect(AC.runCommandById(ctx, id, {}, {}).handled, id).toBe(true);
    }
    expect(log).toEqual(['read', 'answers', 'present', 'sbs']);
    // Answer key never surfaces for a student audience.
    const student = mkCtx({ ...base, isTeacherMode: false }).ctx;
    expect(AC.buildAlloCommands(student).find((c) => c.id === 'toggle_quiz_answers')).toBeUndefined();
    // Wrong content type hides the view-bound toggles.
    const noQuiz = mkCtx({ ...base, contentIsQuiz: false, contentIsSimplified: false }).ctx;
    expect(AC.buildAlloCommands(noQuiz).find((c) => c.id === 'toggle_quiz_answers')).toBeUndefined();
    expect(AC.buildAlloCommands(noQuiz).find((c) => c.id === 'toggle_side_by_side')).toBeUndefined();
  });

  it('batch 4: source topic, grade, faq/brainstorm, edit-this, review game, print', async () => {
    const log = [];
    const { ctx } = mkCtx({
      contentLoaded: true, contentIsQuiz: true,
      generateSourceText: (topic) => { log.push('src:' + topic); return Promise.resolve(); },
      generateFaq: () => Promise.resolve().then(() => log.push('faq')),
      generateBrainstorm: () => Promise.resolve().then(() => log.push('brainstorm')),
      setGradeLevelChoice: (g) => { log.push('grade:' + g); return /^\d/.test(g) || /^k/i.test(g) ? '5th Grade' : ''; },
      toggleContentEditing: () => { log.push('edit'); return 'quiz'; },
      toggleReviewGame: () => log.push('review'),
    });
    // The volcano case, end to end at the command layer: topic rides the
    // declared param into the host handler.
    const pr = await AC.runPlan(ctx, [{ commandId: 'generate_source_text', params: { topic: 'volcanoes' } }]);
    expect(pr.ok).toBe(true);
    expect(log).toContain('src:volcanoes');
    expect(AC.runCommandById(ctx, 'set_grade_level', { grade: '5' }, {}).narration).toContain('5th Grade');
    const miss = mkCtx({ setGradeLevelChoice: () => '' }).ctx;
    expect(AC.runCommandById(miss, 'set_grade_level', { grade: 'purple' }, {}).narration).toContain('K to 12');
    expect(AC.runCommandById(ctx, 'toggle_content_editing', {}, {}).narration).toContain('quiz');
    expect(AC.runCommandById(ctx, 'start_review_game', {}, {}).handled).toBe(true);
    const pr2 = await AC.runPlan(ctx, [
      { commandId: 'generate_faq', params: {} },
      { commandId: 'generate_brainstorm', params: {} },
    ]);
    expect(pr2.ok).toBe(true);
    expect(log).toContain('faq');
    expect(log).toContain('brainstorm');
    expect(AC.getCommandContract('generate_source_text').params).toEqual(['topic']);
    expect(AC.getCommandContract('print_page').demoSafe).toBe(false);
  });

  it('both ANTI copies carry the new ctx capabilities', () => {
    for (const path of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(path, 'utf-8');
      for (const cap of ['startMemoryGame:', 'startMatchingGame:', 'startBingoGame:', 'cycleColorOverlay:', 'toggleAnimations:', 'adjustVoiceSpeed:', 'generateNoteTaking:', 'generateAnchorChart:', 'generateConceptSort:', 'startCrosswordGame:', 'startWordScrambleGame:', 'setGlossaryFilterChoice:', 'generateSourceText:', 'generateFaq:', 'generateBrainstorm:', 'setGradeLevelChoice:', 'toggleContentEditing:', 'toggleReviewGame:', 'openReadThisPage:', 'toggleQuizAnswers:', 'togglePresentationMode:', 'toggleSideBySide:', 'contentIsQuiz:', 'contentIsSimplified:']) {
        expect(app, path + ' ' + cap).toContain(cap);
      }
      // Generation caps carry the honest-failure contract like their siblings.
      expect(app, path).toContain("handleGenerate('anchor-chart', null, false, null, { rethrowErrors: true })");
    }
  });
});

// On-device model cache (2026-08-04): Whisper weights in the DURABLE device
// storage bridge (the namespace shows up in the Storage & recovery manager),
// one-time download behind an explicit consent policy.
describe('model cache', () => {
  const store = new Map();
  const fakeDs = {
    ready: () => Promise.resolve(),
    get: (ns, key) => Promise.resolve(store.has(ns + '|' + key) ? store.get(ns + '|' + key) : null),
    set: (ns, key, value) => { store.set(ns + '|' + key, value); return Promise.resolve(true); },
    clearNamespace: (ns) => {
      let n = 0;
      for (const k of [...store.keys()]) if (k.startsWith(ns + '|')) { store.delete(k); n++; }
      return Promise.resolve(n);
    },
  };
  beforeAll(() => { window.alloDeviceStorage = fakeDs; });

  it('prefetch chunks big files into the bridge, tolerates a 404, and match() restores bytes exactly', async () => {
    store.clear();
    const big = new Uint8Array(6.5 * 1024 * 1024); // forces 2 chunks at the 6 MB ceiling
    big[0] = 7; big[big.length - 1] = 9;
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('encoder_model')) return new Response('nope', { status: 404 });
      if (url.includes("decoder_model")) return new Response(big, { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }));
    const r = await AC.modelCache.prefetchWhisper();
    expect(r.files).toBe(6); // 7 minus the tolerated 404
    expect(r.bytes).toBeGreaterThan(6 * 1024 * 1024);
    expect(await AC.modelCache.hasWhisper()).toBe(true);
    const res = await AC.modelCache.match('https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/onnx/decoder_model_merged_quantized.onnx');
    const back = new Uint8Array(await res.arrayBuffer());
    expect(back.length).toBe(big.length);
    expect(back[0]).toBe(7);
    expect(back[back.length - 1]).toBe(9);
    // The 404'd file is absent, honestly.
    expect(await AC.modelCache.match('https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/onnx/encoder_model_quantized.onnx')).toBeNull();
    vi.unstubAllGlobals();
  }, 20000);

  it('transformers.js adapter installs a Cache-API-shaped custom cache', async () => {
    const env = {};
    expect(AC.modelCache.installTransformersCache(env)).toBe(true);
    expect(env.useBrowserCache).toBe(false);
    expect(env.useCustomCache).toBe(true);
    await env.customCache.put("https://example.test/model.onnx", new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const hit = await env.customCache.match('https://example.test/model.onnx');
    expect(new Uint8Array(await hit.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('policy is ask by default, settable by command, and gates the download command', () => {
    try { localStorage.removeItem('allo_model_downloads'); } catch (_) {}
    expect(AC.modelCache.policy()).toBe('ask');
    const { ctx } = mkCtx();
    expect(AC.runCommandById(ctx, 'set_model_download_policy', { policy: 'auto' }, {}).narration).toContain('auto');
    expect(AC.modelCache.policy()).toBe('auto');
    AC.runCommandById(ctx, 'set_model_download_policy', { policy: 'garbage' }, {});
    expect(AC.modelCache.policy()).toBe('ask'); // whitelist fallback
    AC.runCommandById(ctx, 'set_model_download_policy', { policy: 'off' }, {});
    expect(AC.buildAlloCommands(ctx).find((c) => c.id === 'download_voice_models')).toBeUndefined(); // off hides it
    AC.modelCache.setPolicy('ask');
    expect(AC.getCommandContract('download_voice_models').demoSafe).toBe(false); // never auto-runs in a demo
  });

  it('replies prefer Kokoro (neural, on-device) and only fall back to speechSynthesis', () => {
    const mod = readFileSync('allo_commands_module.js', 'utf-8');
    const speak = mod.slice(mod.indexOf('const speakReply'), mod.indexOf('const announce'));
    // Kokoro branch comes FIRST and returns; speechSynthesis is the fallback.
    expect(speak.indexOf('_kokoroTTS')).toBeGreaterThan(-1);
    expect(speak.indexOf('_kokoroTTS')).toBeLessThan(speak.indexOf('speechSynthesis.cancel'));
    // Only when the model is actually loaded — a reply must never trigger a download.
    expect(speak).toContain('window._kokoroTTS.ready');
    // Mic-mute handshake keys off the Audio element lifecycle + a hard ceiling.
    expect(speak).toContain('a.onended = resume');
    expect(speak).toContain('setTimeout(resume, 30e3)');
    // A superseded reply can never resume the mic mid-new-speech.
    expect(speak).toContain('if (speakSerial !== my) return; // superseded while synthesizing');
    // Voice whitelist: Kokoro ids only, af_heart default.
    expect(speak).toMatch(/indexOf\("af_"\) === 0 \|\| sel\.indexOf\("am_"\) === 0/);
    // stop() silences a playing reply.
    expect(mod).toContain('if (replyAudio) { try { replyAudio.pause(); } catch (_) {} replyAudio = null; }');
  });

  it('storage byte estimator counts binary values in module, mirror, and bridge page', () => {
    for (const path of ['allo_device_storage_module.js', 'desktop/web-app/public/allo_device_storage_module.js']) {
      const code = readFileSync(path, 'utf-8');
      expect(code, path).toContain('bv instanceof ArrayBuffer) b.bytes += bv.byteLength');
      expect(code, path).toContain('ArrayBuffer.isView(bv)) b.bytes += bv.byteLength');
    }
    expect(readFileSync('storage_bridge.html', 'utf-8')).toContain('ArrayBuffer.isView(r.value)) ? r.value.byteLength');
  });

  it('voice loop auto-policy hook exists and stays silent on failure', () => {
    const mod = readFileSync('allo_commands_module.js', 'utf-8');
    const hook = mod.slice(mod.indexOf('Policy \'auto\': first voice use'), mod.indexOf('Policy \'auto\': first voice use') + 900);
    expect(hook).toContain('_modelPolicy() === "auto"');
    expect(hook).toContain('modelCache.hasWhisper()');
    expect(hook).toMatch(/catch\(function \(_\) \{\}\)/);
    expect(readFileSync('desktop/web-app/public/allo_commands_module.js', 'utf-8')).toBe(mod);
  });
});

// On-device Whisper engine + "hey Allo" standby (2026-08-04). The engine
// itself needs a live mic; these cover its pure parts and the privacy
// invariants the code must never lose.
describe('on-device voice engine', () => {
  it('downsampleAudio decimates with interpolation and never upsamples', () => {
    const { downsampleAudio } = AC._voicePure;
    const src = new Float32Array(48000);
    for (let i = 0; i < src.length; i++) src[i] = Math.sin(i / 10);
    const out = downsampleAudio(src, 48000, 16000);
    expect(out.length).toBe(16000);
    expect(Math.abs(out[0] - src[0])).toBeLessThan(1e-6);
    // Interpolated midpoints stay bounded by the signal.
    expect(Math.max(...out.slice(0, 100))).toBeLessThanOrEqual(1);
    expect(downsampleAudio(src, 8000, 16000)).toBe(src); // never upsample
    expect(downsampleAudio(null, 48000, 16000).length).toBe(0);
  });

  it('wake phrase matches whole words only, and carries the one-breath command', () => {
    const { detectWakeCommand } = AC._voicePure;
    expect(detectWakeCommand('hey allo, open the educator hub')).toEqual({ woke: true, command: 'open the educator hub' });
    expect(detectWakeCommand('Allo bigger text').woke).toBe(true);
    expect(detectWakeCommand('okay allobot')).toEqual({ woke: true, command: '' });
    expect(detectWakeCommand('AlloFlow make a quiz').woke).toBe(true);
    // The false-positive traps: substrings must never wake the mic router.
    expect(detectWakeCommand('hello everyone').woke).toBe(false);
    expect(detectWakeCommand('please allow me to explain').woke).toBe(false);
    expect(detectWakeCommand('she allotted ten minutes').woke).toBe(false);
    expect(detectWakeCommand('').woke).toBe(false);
  });

  it('VAD segmenter closes on silence, keeps pre-roll, drops sub-speech blips', () => {
    const { createVadSegmenter } = AC._voicePure;
    const seg = createVadSegmenter({ sampleRate: 1000, threshold: 0.05, minSpeechMs: 100, silenceMs: 200, maxMs: 5000, preRollMs: 50 });
    const quiet = new Float32Array(100); // 100ms of silence per frame
    const loud = new Float32Array(100).fill(0.5);
    expect(seg.push(quiet)).toBeNull();
    expect(seg.push(loud)).toBeNull();   // speech opens
    expect(seg.push(loud)).toBeNull();
    expect(seg.push(quiet)).toBeNull();  // 100ms silence — not yet
    const out = seg.push(quiet);         // 200ms silence — segment closes
    expect(out).toBeInstanceOf(Float32Array);
    // 200ms speech + 200ms trailing silence; the 100ms quiet frame was
    // trimmed from pre-roll (frame-granular, capped at 50ms) and the first
    // loud frame entered via pre-roll — no double count.
    expect(out.length).toBe(400);
    // A blip shorter than minSpeechMs yields nothing.
    const seg2 = createVadSegmenter({ sampleRate: 1000, threshold: 0.05, minSpeechMs: 300, silenceMs: 200, preRollMs: 0 });
    seg2.push(loud);
    seg2.push(quiet);
    expect(seg2.push(quiet)).toBeNull();
  });

  it('privacy invariants are pinned in source, root and mirror identical', () => {
    const mod = readFileSync('allo_commands_module.js', 'utf-8');
    // Standby NEVER runs on Web Speech (its mic streams to a cloud service).
    expect(mod).toMatch(/setStandby: \(on\) => \{\s*if \(on && engineName !== "whisper"\) return false;/);
    expect(mod).toContain('standby = false; // NEVER standby on Web Speech');
    // The kill phrase is checked BEFORE the standby gate.
    const h = mod.indexOf('const handleUtterance');
    expect(mod.indexOf('stop listening|stop voice|voice off', h)).toBeLessThan(mod.indexOf('standby && engineName === "whisper"', h));
    // Replies can't be transcribed: frames dropped + segmenter reset while speaking.
    expect(mod).toContain('if (speaking) { seg.reset(); return; }');
    // Whisper teardown stops mic tracks first.
    expect(mod).toMatch(/whisperState\.stream\.getTracks\(\)\.forEach[\s\S]{0,80}whisperState\.proc\.disconnect/);
    // Engine choice: cached model → whisper; otherwise fall back, plus a hard override.
    expect(mod).toContain('if (_voiceEnginePref() === "webspeech")');
    expect(mod).toMatch(/hasWhisper\(\)\.then\(function \(has\) \{\s*if \(!active\) return;\s*if \(!has\) \{ beginWebSpeech\(c, standbyWanted\); return; \}/);
    expect(readFileSync('desktop/web-app/public/allo_commands_module.js', 'utf-8')).toBe(mod);
  });

  it('toggle_wake_word persists, applies live only when the loop allows it, and is demo-unsafe', () => {
    const { ctx } = mkCtx({ voiceAvailable: true });
    try { localStorage.removeItem('allo_voice_standby'); } catch (_) {}
    let standbyCalls = [];
    window.__alloVoiceLoop = { isActive: () => true, setStandby: (v) => { standbyCalls.push(v); return false; } }; // engine = webspeech
    const r1 = AC.runCommandById(ctx, 'toggle_wake_word', {}, {});
    expect(localStorage.getItem('allo_voice_standby')).toBe('on');
    expect(r1.narration).toContain('download voice models'); // refused live → honest redirect
    window.__alloVoiceLoop = { isActive: () => true, setStandby: (v) => { standbyCalls.push(v); return true; } };
    const r2 = AC.runCommandById(ctx, 'toggle_wake_word', {}, {});
    expect(localStorage.getItem('allo_voice_standby')).toBe('off');
    expect(r2.narration).toContain('off');
    expect(standbyCalls).toEqual([true, false]);
    delete window.__alloVoiceLoop;
    expect(AC.getCommandContract('toggle_wake_word').demoSafe).toBe(false);
  });
});

describe('runCommandById awaitCompletion isolation', () => {
  it('keeps the sync path synchronous for existing surfaces', () => {
    const { ctx } = mkCtx();
    const r = AC.runCommandById(ctx, 'open_learning_hub', {}, {});
    expect(r && r.handled).toBe(true);
    expect(typeof r.then).toBe('undefined');
  });
});
