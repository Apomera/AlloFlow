// Logic-characterization tests for math_fluency_module.js — the CBM (curriculum-
// based measurement) DCPM scoring core.
//
// WHY: this is an assessment-integrity surface — it maps a student's
// digits-correct-per-minute to grade/season-normed benchmark tiers
// (At/Above / Strategic / Intensive) that teachers read as a screening result.
// The norm table, grade normalization, season selection, the strategic/
// frustration multipliers, and the tier cut points are pure and had ZERO
// coverage. A silent typo in a benchmark number or a flipped multiplier would
// re-tier a student with no detection. We pin the math against hand-computed
// fixtures (a wrong number is exactly what a markup snapshot can't catch).
//
// The scoring fns are closure-private; the module exposes them for testing via
// the window.AlloModules.MathFluencyInternals seam (read-only, zero behavior
// change). getSeason() reads new Date(), so Date is frozen per test.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

let M;
beforeAll(() => {
  // Math Fluency components reference React; install the real one before the IIFE runs.
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = React;
  window.React = React;
  loadAlloModule('math_fluency_module.js');
  M = window.AlloModules.MathFluencyInternals;
});

// Freeze the clock so getSeason()/getBenchmark() are deterministic. month is 0-indexed.
function freezeMonth(month) { vi.setSystemTime(new Date(2026, month, 15)); }
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('exposes the scoring internals via the test seam', () => {
  expect(typeof M.getBenchmark).toBe('function');
  expect(typeof M.getBenchmarkLabel).toBe('function');
  expect(typeof M.analyzeErrors).toBe('function');
  expect(typeof M.getSeason).toBe('function');
  expect(typeof M.normalizeGrade).toBe('function');
  expect(typeof M.generateProblems).toBe('function');
  expect(typeof M.generatePracticeProblems).toBe('function');
  expect(typeof M.buildFocusedProblems).toBe('function');
  expect(typeof M.buildReviewSchedule).toBe('function');
  expect(typeof M.buildSmartReviewProblems).toBe('function');
  expect(typeof M.buildTeacherReport).toBe('function');
  expect(typeof M.buildTeacherReportCsv).toBe('function');
  expect(typeof M.buildOperationGrowth).toBe('function');
  expect(typeof M.buildNextPracticeRecommendation).toBe('function');
  expect(typeof M.buildSessionGoal).toBe('function');
  expect(typeof M.evaluateSessionGoal).toBe('function');
  expect(typeof M.findMazePathDistance).toBe('function');
  expect(typeof M.updateFactMastery).toBe('function');
  expect(typeof M.parseStudentAnswer).toBe('function');
  expect(typeof M.countCorrectDigits).toBe('function');
  expect(M.BENCHMARKS && M.BENCHMARKS['3']).toBeTruthy();
});

describe('getSeason — month → season boundaries', () => {
  const cases = [
    [0, 'winter'], [1, 'winter'], [2, 'winter'],      // Jan-Mar
    [3, 'spring'], [5, 'spring'], [6, 'spring'],       // Apr-Jul
    [7, 'fall'], [9, 'fall'], [10, 'fall'],            // Aug-Nov
    [11, 'winter'],                                     // Dec
  ];
  for (const [month, season] of cases) {
    it(`month ${month} → ${season}`, () => { freezeMonth(month); expect(M.getSeason()).toBe(season); });
  }
});

describe('getBenchmark - strict grade and operation support (winter column)', () => {
  beforeEach(() => freezeMonth(0));
  it('normalizes K labels without falling through to grade 3', () => {
    expect(M.getBenchmark('K', 'add')).toMatchObject({ grade: 'K', season: 'winter', target: 10, available: true });
    expect(M.getBenchmark('Kindergarten', 'add')).toMatchObject({ grade: 'K', target: 10, available: true });
    expect(M.getBenchmark('0', 'add')).toMatchObject({ grade: 'K', target: 10, available: true });
  });
  it('normalizes ordinal and Grade N labels', () => {
    expect(M.normalizeGrade('3rd Grade')).toBe('3');
    expect(M.getBenchmark('Grade 5', 'add')).toMatchObject({ grade: '5', target: 55, available: true });
  });
  it('does not silently substitute grade-3 data for missing or unsupported grades', () => {
    expect(M.getBenchmark('', 'add')).toMatchObject({ target: null, available: false, reason: 'unsupported-grade' });
    expect(M.getBenchmark('9th Grade', 'add')).toMatchObject({ grade: '9', target: null, available: false, reason: 'unsupported-grade' });
    expect(M.getBenchmark('College', 'add')).toMatchObject({ target: null, available: false, reason: 'unsupported-grade' });
  });
  it('does not substitute addition references for unsupported operations', () => {
    expect(M.getBenchmark('K', 'mul')).toMatchObject({ target: null, available: false, reason: 'unsupported-operation' });
    expect(M.getBenchmark('3', 'mixed')).toMatchObject({ target: null, available: false, reason: 'unsupported-operation' });
    expect(M.getBenchmark('3', 'totallyBogus')).toMatchObject({ target: null, available: false, reason: 'unsupported-operation' });
  });
  it('retains supported operation references', () => {
    expect(M.getBenchmark('5', 'mul')).toMatchObject({ target: 45, available: true });
  });
  it('does not treat a zero placeholder as an achieved reference', () => {
    freezeMonth(7);
    expect(M.getBenchmark('1', 'mul')).toMatchObject({ target: null, available: false, reason: 'no-season-reference' });
  });
});

describe('getBenchmark — strategic/frustration multipliers', () => {
  beforeEach(() => freezeMonth(0)); // winter
  it('grade 5 add: strategic = round(55*0.75)=41, frustration = round(55*0.5)=28', () => {
    const b = M.getBenchmark('5', 'add');
    expect(b).toMatchObject({ target: 55, strategic: 41, frustration: 28 });
  });
  it('K add: strategic = round(10*0.75)=8, frustration = round(10*0.5)=5', () => {
    const b = M.getBenchmark('K', 'add');
    expect(b).toMatchObject({ target: 10, strategic: 8, frustration: 5 });
  });
  it('strategic and frustration are always derived from the same season target', () => {
    freezeMonth(7); // fall — grade 3 add fall = 30
    const b = M.getBenchmark('3', 'add');
    expect(b.season).toBe('fall');
    expect(b.target).toBe(30);
    expect(b.strategic).toBe(Math.round(30 * 0.75));
    expect(b.frustration).toBe(Math.round(30 * 0.5));
  });
});

describe('getBenchmarkLabel - instructional reference bands', () => {
  const reference = { target: 50, strategic: 38, available: true };
  it('labels scores at or above the instructional reference', () => {
    expect(M.getBenchmarkLabel(50, reference).tier).toBe('reference-met');
    expect(M.getBenchmarkLabel(60, reference).tier).toBe('reference-met');
  });
  it('labels scores approaching the instructional reference', () => {
    expect(M.getBenchmarkLabel(49, reference).tier).toBe('reference-approaching');
    expect(M.getBenchmarkLabel(38, reference).tier).toBe('reference-approaching');
  });
  it('labels scores below the instructional reference without diagnostic tier language', () => {
    expect(M.getBenchmarkLabel(37, reference).tier).toBe('reference-below');
    expect(M.getBenchmarkLabel(0, reference).tier).toBe('reference-below');
  });
  it('returns a descriptive result when no reference is available', () => {
    expect(M.getBenchmarkLabel(90, { target: null, available: false }).tier).toBe('descriptive');
  });
});

describe('strict answer and correct-digit scoring', () => {
  it('accepts safe whole numbers and rejects blanks, decimals, and exponent notation', () => {
    expect(M.parseStudentAnswer('-12')).toEqual({ valid: true, value: -12 });
    expect(M.parseStudentAnswer('')).toEqual({ valid: false, value: null });
    expect(M.parseStudentAnswer('3.9')).toEqual({ valid: false, value: null });
    expect(M.parseStudentAnswer('3e2')).toEqual({ valid: false, value: null });
  });
  it('awards place-aligned partial digit credit', () => {
    expect(M.countCorrectDigits(37, 38)).toBe(1);
    expect(M.countCorrectDigits(137, 37)).toBe(2);
    expect(M.countCorrectDigits(42, 42)).toBe(2);
    expect(M.countCorrectDigits(42, 'SKIP')).toBe(0);
  });
});

describe('problem-generator difficulty contracts', () => {
  it('uses two-digit operands for extended addition and subtraction', () => {
    for (const op of ['add', 'sub']) {
      const items = M.generateProblems(op, 'double', 40);
      expect(items).toHaveLength(40);
      expect(items.every((item) => item.a >= 10 && item.a <= 99 && item.b >= 10 && item.b <= 99)).toBe(true);
    }
  });
  it('uses extended fact ranges for multiplication and division', () => {
    const mul = M.generateProblems('mul', 'double', 40);
    expect(mul.every((item) => item.a >= 10 && item.a <= 20 && item.b >= 0 && item.b <= 12)).toBe(true);
    const div = M.generateProblems('div', 'double', 40);
    expect(div.every((item) => item.b >= 1 && item.b <= 15 && item.answer >= 0 && item.answer <= 20 && item.a === item.b * item.answer)).toBe(true);
  });
});

describe('grade-aligned practice sets and personalized fact helpers', () => {
  it('maps grade bands to developmentally narrower recommended sets', () => {
    expect(M.getRecommendedPracticeSet('1st Grade', 'add')).toBe('within10');
    expect(M.getRecommendedPracticeSet('2', 'sub')).toBe('within20');
    expect(M.getRecommendedPracticeSet('3', 'add')).toBe('within100');
    expect(M.getRecommendedPracticeSet('3', 'mul')).toBe('facts10');
    expect(M.getRecommendedPracticeSet('4', 'div')).toBe('facts12');
  });

  it('keeps early-grade mixed recommendations within addition and subtraction', () => {
    const items = M.generatePracticeProblems('mixed', 'recommended', '1st Grade', 80);
    expect(items).toHaveLength(80);
    expect(items.every((item) => ['add', 'sub'].includes(item.op))).toBe(true);
    expect(items.every((item) => item.answer >= 0 && item.answer <= 10)).toBe(true);
  });

  it('honors operation-specific grade recommendations and explicit within-20 sets', () => {
    const multiplication = M.generatePracticeProblems('mul', 'recommended', '3', 60);
    expect(multiplication).toHaveLength(60);
    expect(multiplication.every((item) => item.a >= 0 && item.a <= 10 && item.b >= 0 && item.b <= 10)).toBe(true);

    const addition = M.generatePracticeProblems('add', 'within20', '5', 60);
    const subtraction = M.generatePracticeProblems('sub', 'within20', '5', 60);
    expect(addition.every((item) => item.a + item.b === item.answer && item.answer <= 20)).toBe(true);
    expect(subtraction.every((item) => item.a - item.b === item.answer && item.a <= 20 && item.answer >= 0)).toBe(true);
  });

  it('accumulates canonical fact mastery and rebuilds a focused retry set', () => {
    const attempts = [
      { a: 5, b: 4, op: 'add', symbol: '+', answer: 9, studentAnswer: 8, correct: false, responseMs: 4200 },
      { a: 4, b: 5, op: 'add', symbol: '+', answer: 9, studentAnswer: 9, correct: true, responseMs: 2800 },
      { a: 6, b: 7, op: 'mul', symbol: '×', answer: 42, studentAnswer: 42, correct: true, responseMs: 7200 },
      { a: 7, b: 6, op: 'mul', symbol: '×', answer: 42, studentAnswer: 42, correct: true, responseMs: 6800 },
    ];
    const mastery = M.updateFactMastery({}, attempts, '2026-07-25T12:00:00.000Z');
    expect(mastery['add|4|5']).toMatchObject({ attempts: 2, correct: 1, timedAttempts: 2, responseMsTotal: 7000 });
    expect(mastery['mul|6|7']).toMatchObject({ attempts: 2, correct: 2, timedAttempts: 2, responseMsTotal: 14000 });

    const focusFacts = M.getMasteryFocusFacts(mastery, 10);
    expect(focusFacts.map((fact) => M.getFactKey(fact))).toEqual(expect.arrayContaining(['add|4|5', 'mul|6|7']));
    const focused = M.buildFocusedProblems(focusFacts, 12);
    expect(focused).toHaveLength(12);
    expect(focused.every((item) => item.studentAnswer === null && item.correct === null && item.responseMs === null)).toBe(true);
    expect(new Set(focused.map((item) => M.getFactKey(item))).size).toBe(2);
  });
});
describe('Strategy Coach and mastery dashboard helpers', () => {
  it('provides graduated operation-specific strategies before revealing the answer', () => {
    const addition = { a: 8, b: 7, op: 'add', symbol: '+', answer: 15 };
    expect(M.getStrategyHint(addition, 1)).toMatchObject({ stage: 'strategy', title: 'Use a nearby double' });
    expect(M.getStrategyHint(addition, 2)).toMatchObject({ stage: 'model', title: 'Build the addition' });
    expect(M.getStrategyHint(addition, 3)).toMatchObject({ stage: 'reveal', reveal: true });
    expect(M.getStrategyHint(addition, 3).message).toContain('15');

    expect(M.getStrategyHint({ a: 13, b: 8, op: 'sub', symbol: '−', answer: 5 }, 1).title).toContain('related addition');
    expect(M.getStrategyHint({ a: 6, b: 7, op: 'mul', symbol: '×', answer: 42 }, 1).message).toContain('6 × 5');
    expect(M.getStrategyHint({ a: 42, b: 6, op: 'div', symbol: '÷', answer: 7 }, 1).message).toContain('6 × what number');
  });

  it('counts coached retries as individual mastery attempts', () => {
    const summary = M.summarizeFactResults([{
      a: 2, b: 3, op: 'add', symbol: '+', answer: 5,
      attemptLog: [
        { studentAnswer: 4, correct: false, responseMs: 3000 },
        { studentAnswer: 6, correct: false, responseMs: 2500 },
      ],
      studentAnswer: 5, correct: true, responseMs: 1500,
    }]);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({ attempts: 3, correct: 1, accuracy: 33, timedAttempts: 3, responseMsTotal: 7000 });
  });

  it('classifies persistent facts conservatively across all four dashboard groups', () => {
    const mastery = {
      secure: { a: 2, b: 3, op: 'add', symbol: '+', answer: 5, attempts: 5, correct: 5, timedAttempts: 5, responseMsTotal: 15000 },
      developing: { a: 9, b: 4, op: 'sub', symbol: '−', answer: 5, attempts: 2, correct: 2, timedAttempts: 2, responseMsTotal: 5000 },
      slow: { a: 6, b: 7, op: 'mul', symbol: '×', answer: 42, attempts: 5, correct: 5, timedAttempts: 5, responseMsTotal: 35000 },
      focus: { a: 42, b: 6, op: 'div', symbol: '÷', answer: 7, attempts: 5, correct: 2, timedAttempts: 5, responseMsTotal: 20000 },
    };
    const dashboard = M.buildFactMasteryDashboard(mastery);
    expect(dashboard.totalFacts).toBe(4);
    expect(dashboard.categories.secure.count).toBe(1);
    expect(dashboard.categories.developing.count).toBe(1);
    expect(dashboard.categories.slow.count).toBe(1);
    expect(dashboard.categories.focus.count).toBe(1);
    expect(dashboard.operations.add).toEqual({ total: 1, secure: 1 });
    expect(dashboard.operations.div).toEqual({ total: 1, secure: 0 });
  });
});
describe('analyzeErrors', () => {
  const P = (op, symbol, a, b, answer, studentAnswer, correct) => ({ op, symbol, a, b, answer, studentAnswer, correct });
  it('counts errors/skips, groups by operation, and surfaces specific facts (<=8)', () => {
    const problems = [
      P('add', '+', 2, 3, 5, 5, true),     // correct → not error
      P('add', '+', 4, 5, 9, 8, false),    // error (Addition)
      P('mul', '×', 6, 7, 42, 40, false),  // error (Multiplication)
      P('sub', '-', 9, 1, 8, 'SKIP', false), // skip
      P('add', '+', 1, 1, 2, null, false), // null (unanswered) → not error, not skip
    ];
    const r = M.analyzeErrors(problems);
    expect(r.errors).toBe(2);
    expect(r.skips).toBe(1);
    expect(r.opErrors).toEqual({ Addition: 1, Multiplication: 1 });
    expect(r.patterns.some((p) => /Most errors in Addition/.test(p))).toBe(true);
    expect(r.patterns.some((p) => /Specific facts to practice/.test(p))).toBe(true);
    expect(r.factErrors).toHaveLength(2);
  });
  it('flags excessive skips (>3)', () => {
    const problems = Array.from({ length: 4 }, () => P('add', '+', 1, 1, 2, 'SKIP', false));
    const r = M.analyzeErrors(problems);
    expect(r.skips).toBe(4);
    expect(r.patterns.some((p) => /skipped/.test(p))).toBe(true);
  });
  it('switches to a count message when errors exceed 8 (no per-fact list)', () => {
    const problems = Array.from({ length: 9 }, (_, i) => P('add', '+', i, i, i + i, i, false));
    const r = M.analyzeErrors(problems);
    expect(r.errors).toBe(9);
    expect(r.patterns.some((p) => /errors total — consider reducing/.test(p))).toBe(true);
    expect(r.patterns.some((p) => /Specific facts to practice/.test(p))).toBe(false);
  });
  it('clean run → zero errors/skips, no patterns', () => {
    const problems = [P('add', '+', 2, 2, 4, 4, true), P('sub', '-', 5, 1, 4, 4, true)];
    const r = M.analyzeErrors(problems);
    expect(r.errors).toBe(0);
    expect(r.skips).toBe(0);
    expect(r.patterns).toHaveLength(0);
  });
});

describe('probe timing and comparison integrity contract', () => {
  it('uses a monotonic deadline and excludes incomplete or interrupted runs', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain("typeof performance.now === 'function'");
    expect(source).toContain('deadlineRef.current - nowMs()');
    expect(source).toContain("finishProbe('time')");
    expect(source).toContain("finishProbe('early')");
    expect(source).toContain("completionStatus === 'complete'");
    expect(source).toContain('item.validForComparison !== false && Number.isFinite(item.dcpm)');
  });

  it('suppresses coaching cues during fixed comparable forms', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain('!isFixedRun && soundEnabled');
    expect(source).toContain("runConfigRef.current.mode === 'benchmark')) return");
    expect(source).toContain("config.mode !== 'benchmark'");
  });
});

describe('Accuracy Focus and responsive probe contract', () => {
  it('keeps untimed practice out of speed comparisons while preserving completion XP', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain("completionStatus === 'complete' && !isUntimed");
    expect(source).toContain('if (!config.untimed)');
    expect(source).toContain("untimed: timeLimit === 0");
    expect(source).toContain("Math.max(1, Math.round(correct.length / 5))");
    expect(source).toContain("tt('math_fluency.accuracy_focus_practice', 'Accuracy Focus Practice')");
  });

  it('provides scoped small-screen layouts for setup, active practice, and results', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain('@media (max-width: 640px), (max-height: 700px)');
    expect(source).toContain("className: 'mf-active-probe fixed inset-0'");
    expect(source).toContain("className: 'mf-problem-card'");
    expect(source).toContain("className: 'mf-results-metrics'");
    expect(source).toContain("className: 'mf-config-grid'");
    expect(source).toContain('min-height: 100dvh');
  });
});
describe('fluency maze integrity helpers', () => {
  it('finds a shortest first step without crossing maze walls', () => {
    const cell = (top, right, bottom, left) => ({ walls: { top, right, bottom, left } });
    const maze = [
      [cell(true, true, false, true), cell(true, true, false, true)],
      [cell(false, false, true, true), cell(false, true, true, false)],
    ];
    expect(M.findMazePathStep(maze, { r: 0, c: 0 }, { r: 0, c: 1 })).toEqual({ direction: 'down', r: 1, c: 0 });
    expect(M.findMazePathStep(maze, { r: 0, c: 0 }, { r: 0, c: 0 })).toBeNull();
    expect(M.findMazePathDistance(maze, { r: 0, c: 0 }, { r: 0, c: 1 })).toBe(3);
    expect(M.findMazePathDistance(maze, { r: 0, c: 0 }, { r: 0, c: 0 })).toBe(0);
    expect(M.findMazePathDistance(maze, { r: -1, c: 0 }, { r: 0, c: 0 })).toBeNull();
  });

  it('segments personal bests by control and chase mode', () => {
    expect(M.buildMazeBestKey('mul', 'medium', 'double', 'classic', false)).toBe('mul|medium|double|classic|standard');
    expect(M.buildMazeBestKey('mul', 'medium', 'double', 'explorer', true)).toBe('mul|medium|double|explorer|chase');
  });

  it('makes extended multiplication and division materially harder', () => {
    const multiplication = Array.from({ length: 60 }, () => M.generateMazeProblem('mul', 'double'));
    expect(multiplication.every((item) => {
      const parts = item.text.trim().split(/\s+/);
      const factors = [Number(parts[0]), Number(parts[2])];
      return parts.length === 3 && factors.every((value) => value >= 10 && value <= 20) && item.answer === factors[0] * factors[1];
    })).toBe(true);

    const division = Array.from({ length: 60 }, () => M.generateMazeProblem('div', 'double'));
    expect(division.every((item) => {
      const parts = item.text.trim().split(/\s+/);
      const values = [Number(parts[0]), Number(parts[2])];
      return parts.length === 3 && values[1] >= 10 && values[1] <= 15 && item.answer >= 10 && item.answer <= 20 && values[0] === values[1] * item.answer;
    })).toBe(true);
  });
});

describe('fluency maze UX contract', () => {
  it('freezes hazards for overlays and gates, exposes visible input, and disposes WebGL resources', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain('monsterBlockedRef.current = timerBlockedRef.current || !!currentProblem');
    expect(source).toContain("findMazePathStep(newMaze, mp, playerPosRef.current)");
    expect(source).toContain("type: 'text', value: userInput");
    expect(source).toContain("disabled: !mazeDirectionAvailable('up')");
    expect(source).toContain('var has3D = !!window.THREE && !performance2D');
    expect(source).toContain('math_fluency.maze_hint_announcement');
    expect(source).toContain('hintDir === dir');
    expect(source).toContain('math_fluency.objective_find_key');
    expect(source).toContain("'aria-current': hintDir === 'up' ? 'step' : undefined");
    expect(source).toContain('eng.renderer.dispose');
    expect(source).toContain("className: 'mf-maze-quest'");
    expect(source).toContain("className: 'mf-maze-hud'");
    expect(source).toContain("className: 'mf-maze-minimap'");
    expect(source).toContain('objectiveDistanceLabel');
    expect(source).toContain('.mf-maze-action-label { display: none; }');
  });
});

describe('active probe accessibility contract', () => {
  it('uses modal dialog semantics, preserves Tab navigation, and exposes progress values', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain("role: 'dialog'");
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("e.key !== 'Tab'");
    expect(source).not.toContain('Tab = Skip');
    expect(source).toContain("'aria-valuenow': Math.round(timerPct)");
    expect(source).toContain("role: 'group'");
    expect(source).toContain("tt('math_fluency.run_again', 'Run again')");
  });
});

describe('3D math maze canvas accessibility contract', () => {
  it('provides a focusable, described keyboard interaction surface with visible focus', () => {
    const source = readFileSync(resolve(process.cwd(), 'math_fluency_module.js'), 'utf8');
    expect(source).toContain('cnv.tabIndex = 0');
    expect(source).toContain("cnv.setAttribute('role', 'application')");
    expect(source).toContain("cnv.setAttribute('aria-roledescription'");
    expect(source).toContain("cnv.setAttribute('aria-label'");
    expect(source).toContain("cnv.setAttribute('aria-keyshortcuts'");
    expect(source).toContain('[data-math-maze-canvas]:focus-visible');
    expect(source).toContain('try { cnv.focus(); }');
    expect(source).toContain('Nearby movement buttons provide an alternative.');
  });
});


describe('Smart Review scheduling and teacher reporting', () => {
  const fact = (op, a, b, answer, attempts, correct, responseMsTotal, timedAttempts, lastSeen) => ({
    key: op + '|' + a + '|' + b, op, a, b, answer,
    symbol: op === 'add' ? '+' : op === 'sub' ? '-' : op === 'mul' ? 'x' : '/',
    attempts, correct, responseMsTotal, timedAttempts, lastSeen,
  });

  it('marks facts due using status-specific review intervals', () => {
    const now = new Date('2026-07-26T12:00:00.000Z');
    const rows = [
      fact('add', 1, 1, 2, 4, 1, 4000, 4, '2026-07-26T10:00:00.000Z'),
      fact('add', 2, 2, 4, 2, 2, 3000, 2, '2026-07-24T12:00:00.000Z'),
      fact('mul', 3, 3, 9, 4, 4, 12000, 4, '2026-07-18T12:00:00.000Z'),
      fact('mul', 4, 4, 16, 4, 4, 12000, 4, '2026-07-25T12:00:00.000Z'),
    ];
    const mastery = Object.fromEntries(rows.map((row) => [row.key, row]));
    const schedule = M.buildReviewSchedule(mastery, now);
    expect(schedule.dueCount).toBe(3);
    expect(schedule.byStatus).toMatchObject({ focus: 1, developing: 1, secure: 1 });
    expect(schedule.dueFacts.map((row) => row.key)).toEqual(expect.arrayContaining(['add|1|1', 'add|2|2', 'mul|3|3']));
    expect(schedule.nextDueDays).toBe(6);
  });

  it('builds a 20-item 60/25/15 Smart Review mix without adjacent duplicates when pools allow it', () => {
    const mastery = {};
    for (let i = 1; i <= 12; i += 1) {
      const row = fact('add', i, 1, i + 1, 4, 1, 4000, 4, '2026-07-26T10:00:00.000Z');
      mastery[row.key] = row;
    }
    for (let i = 1; i <= 5; i += 1) {
      const row = fact('sub', 20 + i, i, 20, 2, 2, 3000, 2, '2026-07-24T12:00:00.000Z');
      mastery[row.key] = row;
    }
    for (let i = 1; i <= 3; i += 1) {
      const row = fact('mul', i, 5, i * 5, 4, 4, 12000, 4, '2026-07-18T12:00:00.000Z');
      mastery[row.key] = row;
    }
    const problems = M.buildSmartReviewProblems(mastery, 20, new Date('2026-07-26T12:00:00.000Z'));
    expect(problems).toHaveLength(20);
    expect(problems.filter((row) => row.reviewBand === 'needs')).toHaveLength(12);
    expect(problems.filter((row) => row.reviewBand === 'developing')).toHaveLength(5);
    expect(problems.filter((row) => row.reviewBand === 'review')).toHaveLength(3);
    for (let i = 1; i < problems.length; i += 1) {
      expect(M.getFactKey(problems[i])).not.toBe(M.getFactKey(problems[i - 1]));
    }
  });

  it('redistributes missing Smart Review pools without mislabeling fact bands', () => {
    const secure = fact('mul', 6, 7, 42, 4, 4, 12000, 4, '2026-07-18T12:00:00.000Z');
    const problems = M.buildSmartReviewProblems({ [secure.key]: secure }, 6, new Date('2026-07-26T12:00:00.000Z'));
    expect(problems).toHaveLength(6);
    expect(problems.every((row) => row.reviewBand === 'review')).toBe(true);
  });

  it('filters teacher metrics without mixing Accuracy Focus into DCPM comparisons', () => {
    const masteryRow = fact('add', 2, 3, 5, 4, 1, 5000, 4, '2026-07-26T10:00:00.000Z');
    const history = [
      { date: '2026-07-25T12:00:00.000Z', mode: 'practice', untimed: true, operation: 'add', accuracy: 80, dcpm: null, totalCorrect: 8, totalAttempted: 10, difficulty: 'focus', completionStatus: 'complete', validForComparison: false },
      { date: '2026-07-20T12:00:00.000Z', mode: 'practice', untimed: false, operation: 'add', accuracy: 90, dcpm: 30, totalCorrect: 9, totalAttempted: 10, difficulty: 'within20', completionStatus: 'complete', validForComparison: true },
      { date: '2026-07-15T12:00:00.000Z', mode: 'benchmark', untimed: false, operation: 'mul', accuracy: 70, dcpm: 22, totalCorrect: 7, totalAttempted: 10, difficulty: 'fixed-form', completionStatus: 'complete', validForComparison: true },
      { date: '2026-01-01T12:00:00.000Z', mode: 'practice', untimed: true, operation: 'add', accuracy: 10, dcpm: null, totalCorrect: 1, totalAttempted: 10 },
    ];
    const report = M.buildTeacherReport(history, { [masteryRow.key]: masteryRow }, { days: 30, mode: 'accuracy-focus', operation: 'add' }, '3', { gatesUnlocked: 12 }, new Date('2026-07-26T12:00:00.000Z'));
    expect(report).toMatchObject({ sessionCount: 1, avgAccuracy: 80, latestDcpm: null, totalCorrect: 8, totalAttempted: 10, grade: '3' });
    expect(report.suggestedTargets.map((row) => row.key)).toContain('add|2|3');
    expect(report.mazeLifetime.gatesUnlocked).toBe(12);
  });

  it('exports report sessions as escaped CSV', () => {
    const csv = M.buildTeacherReportCsv({ sessions: [{
      date: '2026-07-25T12:00:00.000Z', mode: 'practice', untimed: false, operation: 'add',
      difficulty: 'Within 20, custom', accuracy: 90, dcpm: 30, totalCorrect: 9, totalAttempted: 10, completionStatus: 'complete', timeLimit: 60,
    }] });
    expect(csv).toContain('Date,Mode,Operation,Practice Set');
    expect(csv).toContain('"Within 20, custom"');
    expect(csv).toContain('Timed Practice');
    expect(csv).toContain('Completion,Goal,Goal Result');
  });
});


describe('operation growth synthesis and Next Best Step', () => {
  const makeFact = (op, a, b, answer, attempts, correct, totalMs, timedAttempts, lastSeen) => ({
    key: op + '|' + a + '|' + b, op, a, b, answer, symbol: op === 'add' ? '+' : op === 'sub' ? '-' : op === 'mul' ? 'x' : '/',
    attempts, correct, responseMsTotal: totalMs, timedAttempts, lastSeen,
  });

  it('keeps recent accuracy broad while calculating DCPM trend only from a comparable series', () => {
    const masteryRows = [
      makeFact('add', 2, 3, 5, 4, 1, 4000, 4, '2026-07-26T10:00:00.000Z'),
      makeFact('mul', 3, 4, 12, 4, 4, 28000, 4, '2026-07-23T10:00:00.000Z'),
      makeFact('sub', 9, 4, 5, 4, 4, 12000, 4, '2026-07-25T10:00:00.000Z'),
    ];
    const mastery = Object.fromEntries(masteryRows.map((row) => [row.key, row]));
    const history = [
      { date: '2026-07-25T12:00:00.000Z', operation: 'add', accuracy: 80, dcpm: 25, validForComparison: true, comparisonKey: 'add-series', completionStatus: 'complete' },
      { date: '2026-07-22T12:00:00.000Z', operation: 'add', accuracy: 70, dcpm: 20, validForComparison: true, comparisonKey: 'add-series', completionStatus: 'complete' },
      { date: '2026-07-20T12:00:00.000Z', operation: 'add', accuracy: 60, dcpm: null, validForComparison: false, untimed: true, completionStatus: 'complete' },
      { date: '2026-07-24T12:00:00.000Z', operation: 'mul', accuracy: 95, dcpm: 30, validForComparison: true, comparisonKey: 'mul-series', completionStatus: 'complete' },
    ];
    const rows = M.buildOperationGrowth(history, mastery, new Date('2026-07-26T12:00:00.000Z'));
    const addition = rows.find((row) => row.op === 'add');
    expect(addition).toMatchObject({ focusFacts: 1, recentSessions: 3, recentAccuracy: 70, latestDcpm: 25, trendDelta: 5, recommendation: 'Build accuracy' });
    const multiplication = rows.find((row) => row.op === 'mul');
    expect(multiplication).toMatchObject({ slowFacts: 1, latestDcpm: 30, trendDelta: null, recommendation: 'Build efficient recall' });
  });

  it('recommends the highest-priority operation with ready-to-launch facts', () => {
    const add = makeFact('add', 2, 3, 5, 4, 1, 4000, 4, '2026-07-26T10:00:00.000Z');
    const mul = makeFact('mul', 3, 4, 12, 4, 4, 28000, 4, '2026-07-23T10:00:00.000Z');
    const recommendation = M.buildNextPracticeRecommendation({ [add.key]: add, [mul.key]: mul }, [], new Date('2026-07-26T12:00:00.000Z'));
    expect(recommendation).toMatchObject({ op: 'add', label: 'Addition', title: 'Addition: Build accuracy', action: 'focus' });
    expect(recommendation.facts.map((row) => row.key)).toContain('add|2|3');
  });
});


describe('session goal integrity', () => {
  it('resolves accuracy goals and evaluates them from recorded accuracy', () => {
    const goal = M.buildSessionGoal('accuracy-90', [], { comparisonKey: 'series', grade: '3', operation: 'add', untimed: true });
    expect(goal).toMatchObject({ metric: 'accuracy', target: 90, available: true });
    expect(M.evaluateSessionGoal(goal, { accuracy: 92, dcpm: null, completionStatus: 'complete', validForComparison: false })).toMatchObject({ met: true, status: 'met', value: 92, progress: 100 });
    expect(M.evaluateSessionGoal(goal, { accuracy: 84, dcpm: null, completionStatus: 'complete', validForComparison: false })).toMatchObject({ met: false, status: 'building', gap: 6 });
  });

  it('sets personal-best targets from matching comparable sessions only', () => {
    const history = [
      { comparisonKey: 'same', validForComparison: true, dcpm: 31 },
      { comparisonKey: 'same', validForComparison: true, dcpm: 28 },
      { comparisonKey: 'other', validForComparison: true, dcpm: 99 },
      { comparisonKey: 'same', validForComparison: false, dcpm: 80 },
    ];
    const goal = M.buildSessionGoal('personal-best', history, { comparisonKey: 'same', grade: '3', operation: 'add', untimed: false });
    expect(goal).toMatchObject({ metric: 'dcpm', previousBest: 31, target: 32, available: true });
    expect(M.evaluateSessionGoal(goal, { accuracy: 90, dcpm: 33, completionStatus: 'complete', validForComparison: true })).toMatchObject({ met: true, status: 'met' });
  });

  it('never evaluates a speed goal from untimed or incomplete evidence', () => {
    const goal = { id: 'personal-best', metric: 'dcpm', target: 30, available: true, label: 'Beat 29 DCPM' };
    expect(M.evaluateSessionGoal(goal, { accuracy: 100, dcpm: null, completionStatus: 'complete', validForComparison: false })).toMatchObject({ met: false, status: 'not-comparable' });
    expect(M.evaluateSessionGoal(goal, { accuracy: 100, dcpm: 40, completionStatus: 'incomplete', validForComparison: false })).toMatchObject({ met: false, status: 'incomplete' });
  });

  it('summarizes goal attainment in filtered teacher evidence', () => {
    const report = M.buildTeacherReport([
      { date: '2026-07-25T12:00:00.000Z', mode: 'practice', operation: 'add', accuracy: 95, totalCorrect: 9, totalAttempted: 10, goalResult: { met: true, status: 'met' } },
      { date: '2026-07-24T12:00:00.000Z', mode: 'practice', operation: 'add', accuracy: 85, totalCorrect: 8, totalAttempted: 10, goalResult: { met: false, status: 'building' } },
      { date: '2026-07-23T12:00:00.000Z', mode: 'practice', operation: 'add', accuracy: 70, totalCorrect: 7, totalAttempted: 10, goalResult: { met: false, status: 'incomplete' } },
    ], {}, { days: 30, mode: 'all', operation: 'all' }, '3', {}, new Date('2026-07-26T12:00:00.000Z'));
    expect(report).toMatchObject({ goalsMet: 1, goalSessions: 2, goalRate: 50 });
  });
});
