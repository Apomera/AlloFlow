// waterCycle content invariants.
//
// Two defect classes found 2026-08-10 and pinned here:
//  1. Answer-position bias. The authored banks put 59% of correct answers at
//     index 1 and NEVER at index 3, and the draw passed opts through
//     unshuffled — so "always pick the second option" scored most of the quiz
//     without reading it. Options are now shuffled at draw time; these tests
//     verify the shuffle is uniform and answer-preserving rather than
//     re-ordering 32 authored arrays by hand.
//  2. var(--allo-stem-*) strings used as data colors. The main cycle canvas
//     assigns them to ctx.fillStyle (which cannot parse var(), so the label
//     silently inherits the previous fill) and the stage-tab ink picker runs
//     parseInt() over them, scoring the stage as pure black.

// Source-literal extraction rather than loadTool: this file is 920K and takes
// ~45s to evaluate, which blows the hook timeout. Both targets are pure (the
// quiz literal contains no t() calls), so slicing them out and evaluating just
// those exercises the REAL shipped code without the tool's runtime. Same
// pattern as the Punnett Lab engine tests.
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_watercycle.js';
let pure;
const BANDS = ['K-2', '3-5', '6-8', '9-12'];

beforeAll(() => {
  const src = fs.readFileSync(SRC_PATH, 'utf8');
  const fnStart = src.indexOf('function wcShuffleOpts');
  const fnEnd = src.indexOf('\n  }', fnStart);
  const litStart = src.indexOf('var WATER_CYCLE_QUIZZES = {');
  const litEnd = src.indexOf('\n  };', litStart);
  if (fnStart < 0 || litStart < 0) throw new Error('waterCycle source markers not found');
  pure = new Function(
    src.slice(fnStart, fnEnd + 4) + '\n' + src.slice(litStart, litEnd + 4) +
    '\nreturn { wcShuffleOpts: wcShuffleOpts, WATER_CYCLE_QUIZZES: WATER_CYCLE_QUIZZES };'
  )();
});

describe('waterCycle — quiz bank shape', () => {
  it('every grade band has a pool of well-formed questions', () => {
    for (const band of BANDS) {
      const pool = pure.WATER_CYCLE_QUIZZES[band];
      expect(Array.isArray(pool), band).toBe(true);
      expect(pool.length, band).toBeGreaterThanOrEqual(6);
      for (const q of pool) {
        expect(q.opts.length, q.q).toBe(4);
        expect(new Set(q.opts).size, q.q).toBe(4);
        expect(typeof q.concept, q.q).toBe('string');
      }
    }
  });

  it('the correct answer is always present among the options', () => {
    for (const band of BANDS) {
      for (const q of pure.WATER_CYCLE_QUIZZES[band]) {
        expect(q.opts, q.q).toContain(q.a);
      }
    }
  });

  it('wrongFeedback keys name real distractors, never the correct answer', () => {
    for (const band of BANDS) {
      for (const q of pure.WATER_CYCLE_QUIZZES[band]) {
        for (const key of Object.keys(q.wrongFeedback || {})) {
          expect(q.opts, q.q + ' / ' + key).toContain(key);
          expect(key, q.q + ' feedback must not target the correct answer').not.toBe(q.a);
        }
      }
    }
  });
});

describe('waterCycle — option shuffle defeats position bias', () => {
  it('preserves the exact option set (answer never lost or duplicated)', () => {
    const opts = ['alpha', 'bravo', 'charlie', 'delta'];
    for (let i = 0; i < 50; i++) {
      const out = pure.wcShuffleOpts(opts);
      expect(out.slice().sort()).toEqual(opts.slice().sort());
      expect(opts).toEqual(['alpha', 'bravo', 'charlie', 'delta']); // no mutation
    }
  });

  it('lands the correct answer on all four positions over many draws', () => {
    const q = pure.WATER_CYCLE_QUIZZES['3-5'][0];
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 400; i++) counts[pure.wcShuffleOpts(q.opts).indexOf(q.a)]++;
    for (let p = 0; p < 4; p++) {
      // uniform expectation is 100 each; a wide band still catches a dead slot
      expect(counts[p], 'position ' + p + ' of ' + counts.join(',')).toBeGreaterThan(40);
    }
  });

  it('is deterministic when given a seeded generator', () => {
    const seeded = () => { let a = 42; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
    const one = pure.wcShuffleOpts(['a', 'b', 'c', 'd'], seeded());
    const two = pure.wcShuffleOpts(['a', 'b', 'c', 'd'], seeded());
    expect(one).toEqual(two);
  });
});

describe('waterCycle — data colors are concrete', () => {
  it('uses no var(--allo-stem-*) strings (canvas fillStyle and parseInt cannot read them)', () => {
    const src = fs.readFileSync(SRC_PATH, 'utf8');
    expect((src.match(/var\(--allo-stem/g) || []).length).toBe(0);
  });

  it('routes every quiz construction site through the shuffle', () => {
    const src = fs.readFileSync(SRC_PATH, 'utf8');
    expect((src.match(/opts: wcShuffleOpts\(/g) || []).length).toBeGreaterThanOrEqual(3);
    // The biased comparator shuffle must not come back. Match the sort()
    // comparator specifically — bare "Math.random() - 0.5" is also how this
    // file jitters lightning branches and particle spread, which is fine.
    expect(src).not.toMatch(/\.sort\(\s*function\s*\(\s*\)\s*\{\s*return\s+Math\.random\(\)\s*-\s*0\.5/);
  });
});
