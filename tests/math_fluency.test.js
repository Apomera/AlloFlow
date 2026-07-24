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

describe('getBenchmark — grade normalization (winter column)', () => {
  beforeEach(() => freezeMonth(0)); // Jan → winter
  it('K addition → grade K, winter target 10', () => {
    expect(M.getBenchmark('K', 'add')).toMatchObject({ grade: 'K', season: 'winter', target: 10 });
  });
  it('"0" normalizes to K', () => {
    expect(M.getBenchmark('0', 'add')).toMatchObject({ grade: 'K', target: 10 });
  });
  it('"Grade 5" → grade 5 addition winter 55', () => {
    expect(M.getBenchmark('Grade 5', 'add')).toMatchObject({ grade: '5', target: 55 });
  });
  it('empty grade defaults to grade 3 (target 40)', () => {
    expect(M.getBenchmark('', 'add')).toMatchObject({ grade: '3', target: 40 });
  });
  it('unknown grade "99" falls back to grade-3 DATA but keeps the 99 label', () => {
    // documents the current behavior: BENCHMARKS['99'] missing → grade-3 numbers, grade string still '99'
    expect(M.getBenchmark('99', 'add')).toMatchObject({ grade: '99', target: 40 });
  });
  it('grade 5 multiplication → winter 45', () => {
    expect(M.getBenchmark('5', 'mul').target).toBe(45);
  });
  it('K multiplication (no mul norms) falls back to addition (10)', () => {
    expect(M.getBenchmark('K', 'mul').target).toBe(10);
  });
  it('"mixed" operation maps to addition', () => {
    expect(M.getBenchmark('3', 'mixed').target).toBe(40);
  });
  it('unknown operation falls back to addition', () => {
    expect(M.getBenchmark('3', 'totallyBogus').target).toBe(40);
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

describe('getBenchmarkLabel — tier cut points', () => {
  const bm = { target: 50, strategic: 38 };
  it('dcpm at/above target → benchmark (green)', () => {
    expect(M.getBenchmarkLabel(50, bm)).toMatchObject({ tier: 'benchmark' });
    expect(M.getBenchmarkLabel(60, bm).tier).toBe('benchmark');
  });
  it('dcpm in [strategic, target) → strategic (yellow)', () => {
    expect(M.getBenchmarkLabel(49, bm).tier).toBe('strategic');
    expect(M.getBenchmarkLabel(38, bm).tier).toBe('strategic');
  });
  it('dcpm below strategic → intensive (red)', () => {
    expect(M.getBenchmarkLabel(37, bm).tier).toBe('intensive');
    expect(M.getBenchmarkLabel(0, bm).tier).toBe('intensive');
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
