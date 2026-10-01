import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as e from '../lesson_board_engine.js';
import { learningSummary, moveDetails, planningSummary, unlockPath } from '../lesson_board_insights.js';
const { makeBoard, source } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');
const context = { attemptId: 'attempt', active: true, paused: false };
const apply = (run, patch) => e.merge(run, patch);
const open = (board, run, id) => apply(run, e.begin(board, run, id));
const advance = (board, run) => apply(run, e.advance(board, run));
function submit(board, run, value, uid = 'solo', requestId = e.requestId(run, 'test')) {
  return apply(run, e.processAction(board, run, { attemptId: 'attempt', turn: run.turn, requestId, kind: 'answer', targetId: e.stepOf(run).targetId, value }, uid, context));
}
function answer(board, run, correct = true) {
  const node = board.locations.find(item => item.id === e.stepOf(run).targetId), value = correct ? e.solution(node) : node.kind === 'choice' ? String((node.answer + 1) % node.options.length) : e.initialDraft(node);
  const submitted = submit(board, run, value); return apply(submitted, e.resolve(board, submitted, { solo: {} }));
}
function explore(board, run, id) { return answer(board, open(board, run, id)); }
function allLocations(board) { let run = e.emptyRun(); for (const node of board.locations) { if (e.stepOf(run).phase === 'review') run = advance(board, run); run = explore(board, run, node.id); } return run; }
function firstTwoProjects(board, run) { for (const project of board.projects.slice(0, 2)) { run = advance(board, run); run = open(board, run, project.id); } return run; }

describe('Board mission progression', () => {
  it('preserves legacy goal identity and completion while explicit goals round-trip', () => {
    const board = makeBoard(); expect(e.prepareBoard(board)).not.toHaveProperty('goal'); expect(e.goalOf(board)).toBe('core');
    for (const goal of e.GOALS) expect(e.prepareBoard({ ...board, goal }).goal).toBe(goal);
    expect(e.validateBoard({ ...board, goal: 'unknown' })).not.toEqual([]);
    expect(e.derive(board, firstTwoProjects(board, allLocations(board))).complete).toBe(true);
  });
  it('keeps all expedition activities available after the core objective is met', () => {
    const board = { ...makeBoard(), goal: 'expedition' }; let run = e.emptyRun();
    for (const id of ['heater', 'cloud', 'river']) { if (e.stepOf(run).phase === 'review') run = advance(board, run); run = explore(board, run, id); }
    run = firstTwoProjects(board, run);
    expect(e.missionProgress(board, run)).toMatchObject({ complete: false, explored: 3, remainingLocations: 5, remainingConcepts: 0, remainingProjects: 0 });
    expect(e.derive({ ...board, goal: 'core' }, run).complete).toBe(true);
    run = advance(board, run); expect(e.targets(board, run).some(node => node.id === 'rain')).toBe(true);
    for (const node of board.locations.filter(node => !e.derive(board, run).visited.includes(node.id))) { run = explore(board, run, node.id); if (!e.derive(board, run).complete) run = advance(board, run); }
    expect(e.derive(board, run).complete).toBe(true);
  });
  it('requires the third architect project and rejects economies unable to fund it', () => {
    const board = { ...makeBoard(), goal: 'architect' }; let run = firstTwoProjects(board, allLocations(board));
    expect(e.missionProgress(board, run)).toMatchObject({ complete: false, remainingProjects: 1, requiredProjects: 3 });
    run = open(board, advance(board, run), 'network'); expect(e.derive(board, run).complete).toBe(true);
    const scarce = { ...board, locations: board.locations.map(node => ({ ...node, reward: [1, 1] })), projects: board.projects.map(project => ({ ...project, cost: [3, 3] })) };
    expect(e.validateBoard({ ...scarce, goal: 'core' })).toEqual([]);
    expect(e.validateBoard(scarce).join(' ')).toContain('all three');
  });
  it('enforces the chosen generated goal even when the provider omits or contradicts it', async () => {
    const provider = vi.fn().mockResolvedValue(JSON.stringify({ ...makeBoard(), goal: 'core' }));
    expect((await e.generateBoard(provider, source)).goal).toBe('expedition');
    expect((await e.generateBoard(provider, source, { goal: 'architect' })).goal).toBe('architect');
    expect(e.promptFor(source, { goal: 'architect' })).toContain('ALL THREE projects together');
  });
});

describe('Retry-safe board learning', () => {
  it('allows more than 48 failed attempts without consuming another move or growing history', () => {
    const board = makeBoard(); let run = open(board, e.emptyRun(), 'heater');
    for (let count = 0; count < 60; count++) { run = answer(board, run, false); run = apply(run, e.retry(board, run)); }
    expect(run.turn).toBe(0); expect(Object.keys(run.steps)).toEqual(['t0']); expect(JSON.stringify(run).length).toBeLessThan(900);
    expect(e.derive(board, run).performance.solo).toEqual({ answered: 60, correct: 0 });
    run = answer(board, run);
    expect(e.derive(board, run)).toMatchObject({ visited: ['heater'], balance: [2, 1], performance: { solo: { answered: 61, correct: 1 } } });
    expect(learningSummary(board, run, { solo: {} }).learners[0].locations[0]).toMatchObject({ answered: 61, firstCorrect: false, lastCorrect: true, retries: 60, improved: true });
    expect(() => e.retry(board, run)).toThrow('unsuccessful');
  });
  it('rejects delayed earlier-round requests even after new-round receipts change', () => {
    const board = makeBoard(); let run = open(board, e.emptyRun(), 'heater');
    run = answer(board, run, false); run = apply(run, e.retry(board, run)); const roundOneId = e.requestId(run, 'old');
    run = answer(board, run, false); run = apply(run, e.retry(board, run));
    run = submit(board, run, '1', 'solo', roundOneId); expect(e.stepOf(run).answers).toEqual({});
    const currentId = e.requestId(run, 'new'), stale = { attemptId: 'attempt', turn: 0, requestId: roundOneId, kind: 'answer', targetId: 'heater', value: '1' };
    expect(e.validAction(stale, 'attempt', 0, 2)).toBe(false);
    run = submit(board, run, '1', 'solo', currentId); expect(e.stepOf(run).answers.solo.correct).toBe(true);
  });
  it('keeps the current answer and receipt when a round-zero host leaf patch arrives after the retry response', () => {
    const board = makeBoard(); let run = open(board, e.emptyRun(), 'heater');
    const oldAction = { attemptId: 'attempt', turn: 0, requestId: 'old_delayed', kind: 'answer', targetId: 'heater', value: '0' };
    const oldPatch = e.processAction(board, run, oldAction, 'solo', context);
    run = apply(run, oldPatch); run = apply(run, e.resolve(board, run, { solo: {} })); run = apply(run, e.retry(board, run));
    const newId = e.requestId(run, 'fresh'); run = submit(board, run, '1', 'solo', newId); run = apply(run, oldPatch);
    expect(run.steps.t0.answers.solo.value).toBe('0');
    expect(e.stepOf(run).answers.solo).toEqual({ value: '1', correct: true });
    expect(e.stepOf(run).seen.solo).toEqual({ requestId: newId, code: 'answer-recorded' });
    expect(e.processAction(board, run, oldAction, 'solo', context)).toEqual({});
    run = apply(run, e.resolve(board, run, { solo: {} })); expect(e.stepOf(run).result).toMatchObject({ success: true, attempts: { solo: { answered: 2, correct: 1, firstCorrect: false, lastCorrect: true } } });
  });
  it('does not count or block on stale flat answers before a retry response arrives', () => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false); run = apply(run, e.retry(board, run));
    run = apply(run, { 'steps.t0.answers.solo': { value: '0', correct: false }, 'steps.t0.seen.solo': { requestId: 'old', code: 'answer-recorded' } });
    expect(e.stepOf(run).answers).toEqual({}); expect(e.stepOf(run).seen).toEqual({}); expect(() => e.resolve(board, run, { solo: {} })).toThrow('at least one');
    run = submit(board, run, '1'); expect(e.stepOf(run).answers.solo.correct).toBe(true);
  });
  it('isolates delayed earlier retry-round writes and prunes old round branches on the next retry', () => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false); run = apply(run, e.retry(board, run));
    const delayed = e.processAction(board, run, { attemptId: 'attempt', turn: 0, requestId: e.requestId(run, 'late'), kind: 'answer', targetId: 'heater', value: '0' }, 'solo', context);
    expect(Object.keys(delayed).every(key => key.includes('.responseRounds.r1.'))).toBe(true);
    run = apply(run, delayed); run = apply(run, e.resolve(board, run, { solo: {} })); run = apply(run, e.retry(board, run));
    const currentId = e.requestId(run, 'current'); run = submit(board, run, '0', 'solo', currentId); run = apply(run, delayed);
    expect(e.stepOf(run).seen.solo.requestId).toBe(currentId); expect(Object.keys(run.steps.t0.responseRounds).sort()).toEqual(['r1', 'r2']);
    run = apply(run, e.resolve(board, run, { solo: {} })); run = apply(run, e.retry(board, run));
    expect(Object.keys(run.steps.t0.responseRounds)).toEqual(['r3']); expect(e.derive(board, run).performance.solo.answered).toBe(3);
  });
  it('retains prior learners when they do not respond in the retry and never counts missing responses as wrong', () => {
    const board = makeBoard(); let run = open(board, e.emptyRun(), 'heater');
    run = submit(board, run, '0', 'a'); run = submit(board, run, '0', 'b'); run = apply(run, e.resolve(board, run, { a: {}, b: {}, absent: {} }));
    run = apply(run, e.retry(board, run)); run = submit(board, run, '1', 'a'); run = apply(run, e.resolve(board, run, { a: {}, b: {}, absent: {} }));
    const summary = learningSummary(board, run, { a: {}, b: {}, absent: {} });
    expect(summary.learners.map(item => [item.answered, item.correct])).toEqual([[2, 1], [1, 0], [0, 0]]);
    expect(summary.learners[1].locations[0].lastCorrect).toBe(false);
  });
  it('keeps chronological first/latest evidence across legacy retry turns', () => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false);
    run = explore(board, advance(board, run), 'heater'); const learner = learningSummary(board, run, { solo: {} }).learners[0];
    expect(learner).toMatchObject({ answered: 2, correct: 1, firstCorrectCount: 0, latestCorrectCount: 1, attemptedLocations: 1, retries: 1 });
  });
  it('recomputes submitted correctness from the canonical solution at resolution', () => {
    const board = makeBoard(), run = open(board, e.emptyRun(), 'heater'); e.stepOf(run).answers.solo = { value: '0', correct: true };
    expect(e.resolve(board, run, { solo: {} })['steps.t0.result'].success).toBe(false);
  });
  it('makes a legacy final-turn limitation explicit while still permitting retry', () => {
    const board = makeBoard(), run = { turn: 47, steps: { t47: { phase: 'review', targetId: 'heater', result: { success: false, marks: { solo: false } } } } };
    expect(e.turnLimit(board, run)).toMatchObject({ reached: true, remaining: 0, canAdvance: false, canRetry: true });
    expect(e.retry(board, run)['steps.t47'].phase).toBe('answer');
  });
});

describe('Retry save replay', () => {
  it('restores mid-retry and resolved retry state, including after compaction', () => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false); run = apply(run, e.retry(board, run));
    expect(e.stepOf(e.restoreRun(board, run))).toMatchObject({ phase: 'answer', retryRound: 1, retryStats: e.stepOf(run).retryStats });
    expect(e.derive(board, e.restoreRun(board, run))).toEqual(e.derive(board, run));
    run = answer(board, run); expect(e.derive(board, e.restoreRun(board, run))).toEqual(e.derive(board, run));
    run = advance(board, run); expect(e.restoreRun(board, run)).toEqual(run);
  });
  it('migrates legacy flat retry answers and ignores stale flat answers in scoped saves', () => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false); run = apply(run, e.retry(board, run)); run = answer(board, run);
    const legacy = structuredClone(run); legacy.steps.t0.answers = legacy.steps.t0.responseRounds.r1.answers; delete legacy.steps.t0.responseRounds;
    expect(e.stepOf(e.restoreRun(board, legacy)).answers.solo).toEqual({ value: '1', correct: true });
    run.steps.t0.answers = { solo: { value: '0', correct: false } };
    const restored = e.restoreRun(board, run); expect(e.stepOf(restored).answers.solo).toEqual({ value: '1', correct: true }); expect(restored.steps.t0.answers).toBeUndefined();
  });
  it('preserves the submitted answer during review and rejects contradictory saved response text', () => {
    const board = makeBoard(), run = explore(board, e.emptyRun(), 'heater');
    expect(e.stepOf(e.restoreRun(board, run)).answers.solo).toEqual({ value: '1', correct: true });
    e.stepOf(run).answers.solo.value = '0'; expect(() => e.restoreRun(board, run)).toThrow('Invalid saved response');
  });
  it.each(['counter', 'count', 'correct', 'first', 'outsider', 'unreachable', 'success'])('rejects corrupted %s retry evidence', kind => {
    const board = makeBoard(); let run = answer(board, open(board, e.emptyRun(), 'heater'), false); run = apply(run, e.retry(board, run)); run = answer(board, run);
    const step = run.steps['t' + run.turn];
    if (kind === 'counter') step.retryRound = -1;
    if (kind === 'count') step.result.attempts.solo.answered = 99;
    if (kind === 'correct') step.result.attempts.solo.correct = 2;
    if (kind === 'first') step.result.attempts.solo.firstCorrect = true;
    if (kind === 'outsider') step.result.attempts.outsider = step.result.attempts.solo;
    if (kind === 'unreachable') step.targetId = 'weather';
    if (kind === 'success') step.result.success = false;
    expect(() => e.restoreRun(board, run)).toThrow();
  });
});

describe('Board route and resource strategy', () => {
  it('finds shortest activity routes and accounts for constructed shortcuts', () => {
    const board = makeBoard(); expect(unlockPath(board, e.emptyRun(), 'sequence').map(item => item.id)).toEqual(['cloud', 'rain', 'sequence']);
    let run = explore(board, e.emptyRun(), 'heater'); run = explore(board, advance(board, run), 'cloud'); run = open(board, advance(board, run), 'bridge');
    expect(unlockPath(board, run, 'sequence').map(item => item.id)).toEqual(['sequence']);
  });
  it('ranks available learning moves by exact contributions without exposing solutions', () => {
    const board = makeBoard(), plan = planningSummary(board, e.emptyRun(), 'research');
    expect(plan.shortfall).toEqual([3, 1]); expect(plan.reachable).toHaveLength(2);
    expect(plan.reachable[0]).toMatchObject({ reward: [2, 1], contribution: [2, 1], newConcept: true });
    expect(plan.reachable[0]).not.toHaveProperty('answer'); expect(plan.remainingRewards).toEqual([16, 8]);
  });
  it('reports yield opportunity as a conditional remaining payoff, never repeated rewards', () => {
    const board = makeBoard(), run = explore(board, e.emptyRun(), 'heater');
    expect(moveDetails(board, run, 'research')).toMatchObject({ yieldRemaining: 7, yieldPotential: [7, 0], yieldBreakEven: 3 });
    expect(moveDetails(board, run, 'heater').reward).toEqual([0, 0]);
  });
});
