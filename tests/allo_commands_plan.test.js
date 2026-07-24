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

describe('runCommandById awaitCompletion isolation', () => {
  it('keeps the sync path synchronous for existing surfaces', () => {
    const { ctx } = mkCtx();
    const r = AC.runCommandById(ctx, 'open_learning_hub', {}, {});
    expect(r && r.handled).toBe(true);
    expect(typeof r.then).toBe('undefined');
  });
});
