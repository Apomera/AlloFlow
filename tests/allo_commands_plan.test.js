// Unit tests for the agentic-plan layer of AlloCommands (planUtterance /
// runPlan / looksMultiStep / runCommandById's awaitCompletion path,
// docs/AGENTIC_ALLOBOT_DESIGN.md). These pin the consent + safety contract:
// destructive steps never auto-run, unavailable steps stop the plan at run
// time, unknown planner ids reject the whole plan, a timed-out step HOLDS
// the remainder (never races a still-running generation), and the planner
// menu includes when-gated commands so "create lesson → quiz" chains stay
// plannable before content exists (the #1 regression, fixed 2026-07-10).

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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
});

describe('planUtterance', () => {
  it('maps a multi-step ask to validated ordered steps', async () => {
    const { ctx } = mkCtx();
    const steps = await AC.planUtterance(ctx, 'simplify this to grade 3 then make a quiz');
    expect(steps).toHaveLength(2);
    expect(steps[0].commandId).toBe('generate_simplified');
    expect(steps[0].params).toEqual({ grade: '3' });
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

  // Regression (2026-07-10): the planner menu must include when-gated
  // commands — before this fix, generate_quiz was invisible with no content
  // loaded, so "create a lesson then quiz it" could never be planned.
  it('plans steps whose commands only unlock AFTER an earlier step (gated menu)', async () => {
    const { ctx } = mkCtx({
      hasSourceOrAnalysis: false, // generate_quiz is when-gated OFF right now
      startLessonFlow: () => {},
      callGemini: async (prompt) => {
        // The menu shown to the model must still contain the gated command,
        // annotated as not-yet-available.
        expect(prompt).toContain('generate_quiz');
        expect(prompt).toContain('[not available yet');
        return JSON.stringify({
          steps: [
            { commandId: 'create_lesson', params: { topic: 'volcanoes', grade: '5' }, why: 'make content' },
            { commandId: 'generate_quiz', params: {}, why: 'assess it' },
          ],
          confidence: 0.9,
        });
      },
    });
    const steps = await AC.planUtterance(ctx, 'create a lesson about volcanoes then make a quiz');
    expect(steps).toHaveLength(2);
    expect(steps[1].commandId).toBe('generate_quiz');
  });
});

describe('runPlan', () => {
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
