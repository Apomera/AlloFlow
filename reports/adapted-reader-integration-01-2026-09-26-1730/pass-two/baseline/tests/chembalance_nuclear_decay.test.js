// chemBalance Nuclear: the live decay curve.
//
// WHY THIS FILE EXISTS
// The Nuclear section listed nine isotopes and their half-lives as strings. Half-life
// is the one idea in that section that IS a curve, and a table cannot show that the
// SHAPE is identical for a 6-hour tracer and a 4.5-billion-year isotope.
//
// Like the rest of chemBalance's domain sections this lives behind a tab, so
// dev-tools/check_stem_render.cjs (default state = the hub) never builds it and the
// render goldens never see it. A throw here ships silently.
//
// Every numeric expectation is a PUBLISHED value or an exact mathematical identity,
// never the model's own output.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const CHEMBALANCE = 'stem_lab/stem_tool_chembalance.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function nuclear(state = {}) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool: 'nuclear', _everPicked: true, ...state },
  }));
}

describe('Radioactive decay model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('halves exactly once per half-life', () => {
    // The defining identity. A base/exponent slip shows up here immediately.
    expect(pure.decayFraction(30, 30)).toBeCloseTo(0.5, 12);
    expect(pure.decayFraction(60, 30)).toBeCloseTo(0.25, 12);
    expect(pure.decayFraction(90, 30)).toBeCloseTo(0.125, 12);
    // Ten half-lives is 1/1024 - the "it's basically gone" misconception.
    expect(pure.decayFraction(300, 30)).toBeCloseTo(1 / 1024, 12);
  });

  it('is 1 at t = 0 and never reaches zero', () => {
    expect(pure.decayFraction(0, 30)).toBe(1);
    // Decay is asymptotic: small, but strictly positive.
    expect(pure.decayFraction(3000, 30)).toBeGreaterThan(0);
  });

  it('uses lambda = ln2 / half-life, so the mean life is longer', () => {
    const halfLife = 30.08;
    expect(pure.decayConstant(halfLife)).toBeCloseTo(Math.LN2 / halfLife, 12);
    // Mean life = 1/lambda = t_half / ln2 = 1.4427 x t_half. Confusing the two
    // is a standard exam error, so the relationship is pinned.
    const meanLife = 1 / pure.decayConstant(halfLife);
    expect(meanLife / halfLife).toBeCloseTo(1.442695, 5);
    expect(meanLife).toBeGreaterThan(halfLife);
  });

  it('inverts: the time to reach a fraction round-trips', () => {
    for (const fraction of [0.9, 0.5, 0.25, 0.1, 0.01]) {
      const t = pure.decayTimeFor(fraction, 5700);
      expect(pure.decayFraction(t, 5700)).toBeCloseTo(fraction, 10);
    }
    expect(pure.decayTimeFor(0.5, 5700)).toBeCloseTo(5700, 6);
  });

  it('dates a radiocarbon sample against published half-life', () => {
    // C-14 = 5700 yr (current NNDC evaluation). Half the C-14 left = one
    // half-life old; a quarter = two.
    expect(pure.radiocarbonAge(0.5)).toBeCloseTo(5700, 6);
    expect(pure.radiocarbonAge(0.25)).toBeCloseTo(11400, 6);
    // A sample with ~52.5% left is roughly Otzi-era (~5300 years).
    expect(pure.radiocarbonAge(0.5249)).toBeGreaterThan(5000);
    expect(pure.radiocarbonAge(0.5249)).toBeLessThan(5600);
  });

  it('carries the nine isotopes with defensible half-lives', () => {
    const table = pure.HALF_LIFE_YEARS;
    for (const iso of ['C-14', 'U-238', 'U-235', 'Pu-239', 'I-131', 'Tc-99m', 'Sr-90', 'Cs-137', 'K-40']) {
      expect(table[iso], iso).toBeGreaterThan(0);
    }
    // Spot-checks against evaluated data, in years.
    expect(table['U-238']).toBeCloseTo(4.468e9, -6);
    expect(table['Cs-137']).toBeCloseTo(30.08, 2);
    // Tc-99m is 6.0072 HOURS - the unit conversion is where this goes wrong.
    expect(table['Tc-99m'] * 365.25 * 24).toBeCloseTo(6.0072, 3);
    // I-131 is 8.0252 days.
    expect(table['I-131'] * 365.25).toBeCloseTo(8.0252, 3);
  });

  it('refuses impossible inputs instead of returning a number', () => {
    expect(Number.isNaN(pure.decayFraction(10, 0))).toBe(true);
    expect(Number.isNaN(pure.decayFraction(-1, 30))).toBe(true);
    expect(Number.isNaN(pure.decayConstant(0))).toBe(true);
    expect(Number.isNaN(pure.decayTimeFor(0, 30))).toBe(true);
    expect(Number.isNaN(pure.decayTimeFor(1.5, 30))).toBe(true);
  });
});

describe('Nuclear section — the decay curve renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('draws a curve and offers both controls', () => {
    const el = nuclear();
    expect(el.querySelector('[data-testid="chem-decay-curve"]')).toBeTruthy();

    const picker = el.querySelector('#nuc-isotope');
    const slider = el.querySelector('#nuc-halves');
    expect(picker).toBeTruthy();
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('type')).toBe('range');
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();

    // All nine isotopes are choosable.
    expect(el.querySelectorAll('#nuc-isotope option').length).toBe(9);
  });

  it('keeps the reference cards that were already there', () => {
    const el = nuclear();
    expect(el.textContent).toContain('Common Half-Lives');
    expect(el.textContent).toContain('Types of Radiation');
    expect(el.textContent).toContain('Fission');
  });

  it('the curve is described for screen readers, not just drawn', () => {
    const svg = nuclear().querySelector('[data-testid="chem-decay-curve"]');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('C-14');
    expect(label).toContain('50.0 percent');
  });

  it('reports the real elapsed time in units a student can hold', () => {
    // Same 3 half-lives, wildly different clocks - the point of the panel.
    const fast = nuclear({ nuclear: { isotope: 'Tc-99m', halves: 3 } });
    expect(fast.textContent).toContain('18.0 hours');
    expect(fast.textContent).toContain('12.5 %');

    const slow = nuclear({ nuclear: { isotope: 'U-238', halves: 3 } });
    expect(slow.textContent).toContain('billion years');
    // Identical fraction remaining, because the curve is the same shape.
    expect(slow.textContent).toContain('12.5 %');
  });

  it('says ten half-lives is 1/1024, not "gone"', () => {
    const el = nuclear({ nuclear: { isotope: 'C-14', halves: 10 } });
    expect(el.textContent).toContain('never exactly zero');
    expect(el.textContent).not.toMatch(/\b0\.0 %/);
  });

  it('shows the mean lifetime below ten half-lives', () => {
    const el = nuclear({ nuclear: { isotope: 'Cs-137', halves: 2 } });
    expect(el.textContent).toContain('Mean lifetime');
    expect(el.textContent).toContain('longer than the half-life');
  });

  it('uses singular grammar for exactly one half-life', () => {
    const one = nuclear({ nuclear: { isotope: 'C-14', halves: 1 } });
    expect(one.querySelector('[role="status"]').textContent).toContain('1 half-life,');
    const two = nuclear({ nuclear: { isotope: 'C-14', halves: 2 } });
    expect(two.querySelector('[role="status"]').textContent).toContain('2 half-lives,');
  });

  it('never leaks NaN at the extremes of both controls', () => {
    for (const halves of [0, 10]) {
      for (const isotope of ['Tc-99m', 'U-238']) {
        const text = nuclear({ nuclear: { isotope, halves } }).textContent;
        expect(text, `${isotope} @ ${halves}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
        expect(text).not.toContain('undefined');
      }
    }
  });

  it('the marker tracks the slider along the curve', () => {
    // The dot must MOVE, or the curve is decorative rather than live.
    const at0 = nuclear({ nuclear: { isotope: 'C-14', halves: 0 } })
      .querySelector('[data-testid="chem-decay-curve"] circle');
    const at4 = nuclear({ nuclear: { isotope: 'C-14', halves: 4 } })
      .querySelector('[data-testid="chem-decay-curve"] circle');
    expect(at0).toBeTruthy();
    expect(at4).toBeTruthy();
    expect(Number(at4.getAttribute('cx'))).toBeGreaterThan(Number(at0.getAttribute('cx')));
    // y grows downward: more decayed = lower on the chart.
    expect(Number(at4.getAttribute('cy'))).toBeGreaterThan(Number(at0.getAttribute('cy')));
  });
});
