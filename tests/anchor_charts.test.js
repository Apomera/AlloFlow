// Smoke test for the Anchor Charts pure helpers.
//
// Loads the COMPILED anchor_charts_module.js into the vitest+jsdom harness
// and exercises the internal helpers exposed via the _testing namespace.
// The React components themselves (AnchorChartView, AnchorChartSection,
// AnchorChartCritiqueOverlay) require a full DOM render to test meaningfully
// and are NOT covered here; the goal is to lock down the pure math + string
// helpers that are most prone to regression as features get added.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let H;  // shorthand for the _testing namespace

beforeAll(() => {
  // The compiled IIFE bails if window.React is missing. Provide a stub.
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useContext: () => null,
    memo: (c) => c,
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('anchor_charts_module.js');
  H = window.AlloModules.AnchorCharts && window.AlloModules.AnchorCharts._testing;
  if (!H) throw new Error('AnchorCharts._testing namespace not exposed');
});

describe('_reorderSections — pure reorder math', () => {
  const A = { id: 'A', label: 'A' };
  const B = { id: 'B', label: 'B' };
  const C = { id: 'C', label: 'C' };
  const D = { id: 'D', label: 'D' };
  const E = { id: 'E', label: 'E' };

  it('returns the input unchanged when fromIdx === toIdx', () => {
    const s = [A, B, C];
    expect(H._reorderSections(s, 1, 1)).toBe(s);
  });

  it('returns input unchanged for out-of-bounds indices', () => {
    const s = [A, B, C];
    expect(H._reorderSections(s, -1, 1)).toBe(s);
    expect(H._reorderSections(s, 0, -1)).toBe(s);
    expect(H._reorderSections(s, 5, 0)).toBe(s);
    expect(H._reorderSections(s, 0, 99)).toBe(s);
  });

  it('moves a section forward (smaller idx -> larger idx)', () => {
    // [A, B, C, D, E] move idx 1 -> idx 4 should yield [A, C, D, B, E]
    // because after removing B at idx 1, the SHORTENED array is [A, C, D, E]
    // and toIdx=4 maps to adjustedTo=3 (insertion before original idx 4 = E).
    const r = H._reorderSections([A, B, C, D, E], 1, 4);
    expect(r.map((s) => s.id)).toEqual(['A', 'C', 'D', 'B', 'E']);
  });

  it('moves a section to the end (toIdx === sections.length)', () => {
    // toIdx = 5 (one past the last index) is the "append" semantic.
    const r = H._reorderSections([A, B, C, D, E], 0, 5);
    expect(r.map((s) => s.id)).toEqual(['B', 'C', 'D', 'E', 'A']);
  });

  it('moves a section backward (larger idx -> smaller idx)', () => {
    // [A, B, C, D, E] move idx 3 -> idx 1 should yield [A, D, B, C, E]
    const r = H._reorderSections([A, B, C, D, E], 3, 1);
    expect(r.map((s) => s.id)).toEqual(['A', 'D', 'B', 'C', 'E']);
  });

  it('moves a section to the front (toIdx === 0)', () => {
    const r = H._reorderSections([A, B, C], 2, 0);
    expect(r.map((s) => s.id)).toEqual(['C', 'A', 'B']);
  });

  it('returns a NEW array (does not mutate the input)', () => {
    const s = [A, B, C];
    const r = H._reorderSections(s, 0, 2);
    expect(r).not.toBe(s);
    // Original array untouched
    expect(s.map((x) => x.id)).toEqual(['A', 'B', 'C']);
  });

  it('handles non-array input gracefully', () => {
    expect(H._reorderSections(null, 0, 1)).toBeNull();
    expect(H._reorderSections(undefined, 0, 1)).toBeUndefined();
  });
});

describe('_markerFor — color palette rotation', () => {
  it('cycles through the palette by index', () => {
    const c0 = H._markerFor(0);
    const c5 = H._markerFor(5);
    const cWrap = H._markerFor(6);   // wraps back to 0
    expect(c0).toBeTruthy();
    expect(c0.hex).toBe(cWrap.hex);
    expect(c0).not.toBe(c5);
  });

  it('every palette entry has name + hex + soft + ink fields', () => {
    H.MARKER_PALETTE.forEach((entry) => {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('hex');
      expect(entry).toHaveProperty('soft');
      expect(entry).toHaveProperty('ink');
      expect(entry.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('returns a usable entry even for huge indices', () => {
    expect(H._markerFor(1000)).toBeTruthy();
    expect(H._markerFor(1000).hex).toMatch(/^#/);
  });
});

describe('_jitterFor — stable per-section rotation', () => {
  it('returns the same jitter for the same id across calls', () => {
    const j1 = H._jitterFor('sec-abc-123', 'WRITING');
    const j2 = H._jitterFor('sec-abc-123', 'WRITING');
    expect(j1).toBe(j2);
  });

  it('returns numbers in a small range (~±0.9 degrees)', () => {
    for (let i = 0; i < 50; i++) {
      const j = H._jitterFor('sec-' + i, 'LABEL');
      expect(typeof j).toBe('number');
      expect(j).toBeGreaterThanOrEqual(-0.9);
      expect(j).toBeLessThanOrEqual(0.9);
    }
  });

  it('falls back to the label when id is missing', () => {
    const jA = H._jitterFor(null, 'PLAN');
    const jB = H._jitterFor(null, 'PLAN');
    expect(jA).toBe(jB);
  });
});

describe('_iconPromptBiased — appends marker-style direction', () => {
  it('includes the marker color name in the prompt', () => {
    const p = H._iconPromptBiased('a spiral notebook', 'red');
    expect(p.toLowerCase()).toContain('red');
  });

  it('always references hand-drawn marker style', () => {
    const p = H._iconPromptBiased('a tree', 'green');
    expect(p.toLowerCase()).toMatch(/hand-drawn/);
    expect(p.toLowerCase()).toMatch(/marker/);
  });

  it('forbids text/letters in the icon (anti-style guidance)', () => {
    const p = H._iconPromptBiased('a beaker', 'blue');
    expect(p.toLowerCase()).toMatch(/no text|no letters/);
  });

  it('handles empty / nullish base prompt', () => {
    const p = H._iconPromptBiased('', 'blue');
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(0);
  });
});

describe('_slugify — safe filename derivation', () => {
  it('lowercases + replaces spaces with hyphens', () => {
    expect(H._slugify('Steps in the Writing Process')).toBe('steps-in-the-writing-process');
  });

  it('strips punctuation', () => {
    expect(H._slugify('Q: What\'s a Verb? (Quick Guide)')).toBe('q-what-s-a-verb-quick-guide');
  });

  it('trims leading/trailing hyphens', () => {
    expect(H._slugify('---hello---')).toBe('hello');
  });

  it('caps length at 50 chars', () => {
    const long = 'x'.repeat(120);
    expect(H._slugify(long).length).toBeLessThanOrEqual(50);
  });

  it('falls back to "anchor-chart" for empty/garbage input', () => {
    expect(H._slugify('')).toBe('anchor-chart');
    expect(H._slugify(null)).toBe('anchor-chart');
    expect(H._slugify('!!!---')).toBe('anchor-chart');
  });
});
