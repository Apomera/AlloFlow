// chemBalance: the Gibbs free-energy explorer (Thermo) and the buffer designer
// (Acids & Bases).
//
// WHY THIS FILE EXISTS
// THERMO.concepts stated dG = dH - T dS as text and THERMO.examples said CaCO3 is
// "No at room T, yes at high T" without ever showing WHERE that flips - the flip being
// the entire concept. ACIDS_BASES listed twelve pKa values and Henderson-Hasselbalch as
// a formula string.
//
// Both panels are tab-gated, so dev-tools/check_stem_render.cjs (default state = the
// hub) never builds them and the render goldens never see them.
//
// Every numeric expectation is a PUBLISHED value or an exact algebraic identity. Two of
// them cross-check against figures already displayed in the tool's own tables, which is
// the strongest available check that the new model and the old prose agree.

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

function section(subtool, state = {}) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Gibbs free-energy model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('converts J/(mol K) to kJ/mol exactly once', () => {
    // The 1000x factor between dH (kJ) and dS (J) is the classic arithmetic slip.
    // dH = 100 kJ, dS = 100 J/K, T = 1000 K -> 100 - 1000*0.1 = 0 exactly.
    expect(pure.gibbsFreeEnergy(100, 100, 1000)).toBeCloseTo(0, 10);
    // At absolute zero dG is just dH, whatever the entropy.
    expect(pure.gibbsFreeEnergy(178, 160, 0)).toBeCloseTo(178, 10);
  });

  it('agrees with the tool\'s own tabulated dG values', () => {
    // THERMO.examples displays CaCO3 at +130 kJ/mol and C + O2 at -394.4 kJ/mol,
    // both at 298 K. If the model disagreed with the prose beside it, one of the
    // two would be teaching the wrong number.
    expect(pure.gibbsFreeEnergy(178, 160, 298)).toBeCloseTo(130.3, 1);
    expect(pure.gibbsFreeEnergy(-393.5, 2.9, 298)).toBeCloseTo(-394.4, 1);
  });

  it('finds the crossover where the sign flips', () => {
    // CaCO3 decomposes around 1110-1170 K in practice; dH/dS puts it at 1113 K.
    expect(pure.gibbsCrossoverK(178, 160)).toBeCloseTo(1112.5, 0);
    // Haber: spontaneous only below ~465 K, which is why industry trades yield
    // for rate at higher temperature.
    expect(pure.gibbsCrossoverK(-92.4, -198.7)).toBeCloseTo(465, 0);
    // dG must actually be zero at the crossover.
    const t = pure.gibbsCrossoverK(178, 160);
    expect(pure.gibbsFreeEnergy(178, 160, t)).toBeCloseTo(0, 8);
  });

  it('classifies all four sign combinations', () => {
    expect(pure.spontaneityRegime(-100, 50).key).toBe('always');   // exo + disorder
    expect(pure.spontaneityRegime(100, -50).key).toBe('never');    // endo + order
    expect(pure.spontaneityRegime(-100, -50).key).toBe('lowT');    // exo + order
    expect(pure.spontaneityRegime(100, 50).key).toBe('highT');     // endo + disorder
  });

  it('agrees with itself: the regime predicts the sign either side of crossover', () => {
    for (const [dh, ds] of [[178, 160], [-92.4, -198.7], [44, 118.9], [-6.01, -22]]) {
      const cross = pure.gibbsCrossoverK(dh, ds);
      const regime = pure.spontaneityRegime(dh, ds);
      const below = pure.gibbsFreeEnergy(dh, ds, cross - 50);
      const above = pure.gibbsFreeEnergy(dh, ds, cross + 50);
      if (regime.key === 'highT') {
        expect(below, `${dh}/${ds} below`).toBeGreaterThan(0);
        expect(above, `${dh}/${ds} above`).toBeLessThan(0);
      } else if (regime.key === 'lowT') {
        expect(below, `${dh}/${ds} below`).toBeLessThan(0);
        expect(above, `${dh}/${ds} above`).toBeGreaterThan(0);
      }
    }
  });

  it('refuses impossible inputs', () => {
    expect(Number.isNaN(pure.gibbsFreeEnergy(1, 1, -5))).toBe(true);
    expect(Number.isNaN(pure.gibbsCrossoverK(100, 0))).toBe(true);
    expect(pure.spontaneityRegime(NaN, 1)).toBeNull();
  });
});

describe('Buffer model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('gives pH = pKa at a 1:1 ratio, for every acid in the table', () => {
    // The defining property. log10(1) = 0, so the ratio term vanishes.
    for (const acid of [4.76, 3.75, 6.35, 9.25, 12.35]) {
      expect(pure.hendersonHasselbalch(acid, 1, 1)).toBeCloseTo(acid, 12);
    }
  });

  it('moves one pH unit per factor of ten', () => {
    // Acetic acid, pKa 4.76.
    expect(pure.hendersonHasselbalch(4.76, 10, 1)).toBeCloseTo(5.76, 10);
    expect(pure.hendersonHasselbalch(4.76, 1, 10)).toBeCloseTo(3.76, 10);
    expect(pure.hendersonHasselbalch(4.76, 100, 1)).toBeCloseTo(6.76, 10);
  });

  it('marks the useful buffering window as pKa +/- 1', () => {
    expect(pure.bufferCapacityOk(4.76, 4.76)).toBe(true);
    expect(pure.bufferCapacityOk(4.76, 5.76)).toBe(true);   // exactly 10:1
    expect(pure.bufferCapacityOk(4.76, 3.76)).toBe(true);   // exactly 1:10
    expect(pure.bufferCapacityOk(4.76, 5.77)).toBe(false);
    expect(pure.bufferCapacityOk(4.76, 2.76)).toBe(false);
  });

  it('relates pH and pOH through pKw at 25 C', () => {
    expect(pure.PKW_25C).toBe(14);
    expect(pure.pOHFromPH(7)).toBe(7);
    expect(pure.pOHFromPH(4.76)).toBeCloseTo(9.24, 10);
  });

  it('refuses concentrations that cannot exist', () => {
    expect(Number.isNaN(pure.hendersonHasselbalch(4.76, 0, 1))).toBe(true);
    expect(Number.isNaN(pure.hendersonHasselbalch(4.76, 1, 0))).toBe(true);
    expect(Number.isNaN(pure.hendersonHasselbalch(4.76, -1, 1))).toBe(true);
  });
});

describe('Thermo section — the Gibbs explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('offers a reaction picker and a temperature slider, both named', () => {
    const el = section('thermo');
    const picker = el.querySelector('#gibbs-preset');
    const slider = el.querySelector('#gibbs-temp');
    expect(picker).toBeTruthy();
    expect(slider.getAttribute('type')).toBe('range');
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
    expect(picker.querySelectorAll('option').length).toBeGreaterThanOrEqual(5);
  });

  it('shows CaCO3 as non-spontaneous at room temperature', () => {
    const el = section('thermo');
    expect(testid(el, 'chem-gibbs-dg')).toContain('+130.3');
    expect(testid(el, 'chem-gibbs-verdict')).toContain('will not run on its own');
  });

  it('flips the same reaction to spontaneous in a kiln', () => {
    // This IS the concept the static table gestured at without showing.
    const el = section('thermo', { gibbs: { preset: 'caco3', tempK: 1200 } });
    expect(testid(el, 'chem-gibbs-dg')).toContain('-14.0');
    expect(testid(el, 'chem-gibbs-verdict')).toContain('runs on its own');
  });

  it('names the crossover temperature in K and C', () => {
    const el = section('thermo');
    const cross = testid(el, 'chem-gibbs-crossover');
    expect(cross).toContain('1113 K');
    expect(cross).toContain('839');
    expect(cross).toContain('ABOVE');
  });

  it('says plainly when temperature can never change the answer', () => {
    // Combustion: exothermic AND entropy-increasing, so no crossover exists.
    const el = section('thermo', { gibbs: { preset: 'comb', tempK: 298 } });
    expect(el.querySelector('[data-testid="chem-gibbs-crossover"]')).toBeNull();
    const regime = testid(el, 'chem-gibbs-regime');
    expect(regime).toContain('Spontaneous at every temperature');
    expect(regime).toContain('pull the same way');
  });

  it('matches the dG the tool already prints for combustion', () => {
    // THERMO.examples shows -394.4 kJ/mol for C + O2.
    const el = section('thermo', { gibbs: { preset: 'comb', tempK: 298 } });
    expect(testid(el, 'chem-gibbs-dg')).toContain('-394.4');
  });

  it('keeps the reference cards that were already there', () => {
    const el = section('thermo');
    expect(el.textContent).toContain('Four Laws of Thermodynamics');
    expect(el.textContent).toContain('Key Concepts');
    expect(el.textContent).toContain('Example Reactions');
  });

  it('never leaks NaN across the full temperature range', () => {
    for (const tempK of [100, 298, 800, 1500]) {
      for (const preset of ['caco3', 'haber', 'comb', 'boil', 'freeze']) {
        const text = section('thermo', { gibbs: { preset, tempK } }).textContent;
        expect(text, `${preset} @ ${tempK}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
      }
    }
  });
});

describe('Acids & Bases — the buffer designer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('offers every tabulated weak acid, plus a named ratio slider', () => {
    const el = section('acids_bases');
    const picker = el.querySelector('#buf-acid');
    const slider = el.querySelector('#buf-ratio');
    expect(picker).toBeTruthy();
    expect(slider.getAttribute('type')).toBe('range');
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
    // All twelve acids from ACIDS_BASES.weakAcids must be choosable.
    expect(picker.querySelectorAll('option').length).toBe(12);
  });

  it('lands exactly on the pKa at a 1:1 ratio', () => {
    const el = section('acids_bases');
    expect(testid(el, 'chem-buffer-ph')).toContain('4.76');
    expect(testid(el, 'chem-buffer-atpka')).toContain('pH = pKa exactly');
  });

  it('holds that identity for a different acid too', () => {
    // Ammonium, pKa 9.25 - index 9 in the table.
    const el = section('acids_bases', { buffer: { idx: 9, ratio: 0 } });
    expect(testid(el, 'chem-buffer-ph')).toContain('9.25');
  });

  it('moves one pH unit per factor of ten in the ratio', () => {
    const up = section('acids_bases', { buffer: { idx: 0, ratio: 1 } });
    expect(testid(up, 'chem-buffer-ph')).toContain('5.76');
    const down = section('acids_bases', { buffer: { idx: 0, ratio: -1 } });
    expect(testid(down, 'chem-buffer-ph')).toContain('3.76');
  });

  it('warns when the buffer is pushed outside its useful window', () => {
    const el = section('acids_bases', { buffer: { idx: 0, ratio: -2 } });
    const note = testid(el, 'chem-buffer-capacity');
    expect(note).toContain('More than 1 pH unit');
    expect(note).toContain('swings the pH sharply');
  });

  it('does not warn while still inside the window', () => {
    const el = section('acids_bases', { buffer: { idx: 0, ratio: 1 } });
    expect(testid(el, 'chem-buffer-capacity')).toContain('still buffers well');
  });

  it('describes the pH scale diagram for screen readers', () => {
    const svg = section('acids_bases').querySelector('[data-testid="chem-buffer-scale"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('Acetic acid');
    expect(label).toContain('pH 4.76');
  });

  it('the marker tracks the ratio along the pH scale', () => {
    const acidic = section('acids_bases', { buffer: { idx: 0, ratio: -2 } })
      .querySelector('[data-testid="chem-buffer-scale"] circle');
    const basic = section('acids_bases', { buffer: { idx: 0, ratio: 2 } })
      .querySelector('[data-testid="chem-buffer-scale"] circle');
    expect(Number(basic.getAttribute('cx'))).toBeGreaterThan(Number(acidic.getAttribute('cx')));
  });

  it('keeps the reference cards that were already there', () => {
    const el = section('acids_bases');
    expect(el.textContent).toContain('Three Acid/Base Theories');
    expect(el.textContent).toContain('Strong Acids');
    expect(el.textContent).toContain('Weak Acids');
    expect(el.textContent).toContain('Key Equations');
  });

  it('never leaks NaN across every acid at both extremes', () => {
    for (const idx of [0, 5, 11]) {
      for (const ratio of [-2, 0, 2]) {
        const text = section('acids_bases', { buffer: { idx, ratio } }).textContent;
        expect(text, `acid ${idx} @ ${ratio}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
      }
    }
  });
});
