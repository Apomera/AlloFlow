// universe tool content invariants — pins the cosmic quiz bank's shape and its
// anti-bias machinery (seeded question/option shuffling), and forbids
// host-theme var(--allo-stem-*) strings in this file: the tool themes itself
// via its own d.isDark toggle, and two such strings previously fed canvas
// fillStyle, which cannot parse var() — the H-R diagram's "White Dwarfs"
// marker silently rendered in the previous fillStyle (Proxima Centauri red).

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let pure;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_universe.js', 'universe');
  pure = window.__universePure;
});

describe('universe — cosmic quiz bank', () => {
  it('is well-formed: unique questions, 4 unique options, correct index, explanation', () => {
    expect(pure.COSMIC_QUIZ.length).toBeGreaterThanOrEqual(20);
    const qs = [];
    for (const q of pure.COSMIC_QUIZ) {
      expect(q.options.length, q.q).toBe(4);
      expect(new Set(q.options).size, q.q).toBe(4);
      expect(q.correct, q.q).toBeGreaterThanOrEqual(0);
      expect(q.correct, q.q).toBeLessThanOrEqual(3);
      expect(typeof q.why, q.q).toBe('string');
      expect(q.why.length, q.q).toBeGreaterThan(0);
      qs.push(q.q);
    }
    expect(new Set(qs).size).toBe(qs.length);
  });

  it('options stay length-matched so answer length carries no signal', () => {
    for (const q of pure.COSMIC_QUIZ) {
      const lens = q.options.map(o => o.length);
      const ratio = Math.max(...lens) / Math.min(...lens);
      expect(ratio, q.q + ' (' + lens.join(',') + ')').toBeLessThanOrEqual(2.1);
    }
  });
});

describe('universe — seeded shuffle machinery', () => {
  it('decks are deterministic per seed, 10 unique valid indices', () => {
    for (const seed of [0, 1, 7, 12345]) {
      const a = pure.quizDeck(seed);
      const b = pure.quizDeck(seed);
      expect(a).toEqual(b);
      expect(a.length).toBe(pure.QUIZ_PER_ATTEMPT);
      expect(new Set(a).size).toBe(a.length);
      for (const i of a) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(pure.COSMIC_QUIZ.length);
      }
    }
    expect(pure.quizDeck(1)).not.toEqual(pure.quizDeck(2));
  });

  it('correct answers land on every position across seeds (no position bias)', () => {
    const counts = [0, 0, 0, 0];
    for (let seed = 0; seed < 100; seed++) {
      const view = pure.quizView(seed, 0);
      expect(view.order.slice().sort().join('')).toBe('0123');
      expect(view.q.options[view.order[view.correctPos]]).toBe(view.q.options[view.q.correct]);
      counts[view.correctPos]++;
    }
    for (let p = 0; p < 4; p++) {
      expect(counts[p], 'position ' + p + ' of ' + counts.join(',')).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('universe — theming discipline', () => {
  it('contains no host-theme var(--allo-stem-*) strings (own isDark toggle; canvas cannot parse var())', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
    expect((src.match(/var\(--allo-stem/g) || []).length).toBe(0);
  });

  it('renders', () => {
    const html = renderTool('universe', {});
    expect(html.length).toBeGreaterThan(1000);
  });
});
