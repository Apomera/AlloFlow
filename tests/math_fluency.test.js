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
