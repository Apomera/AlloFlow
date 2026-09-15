// Molecule — how strong is strong?
//
// WHY THIS FILE EXISTS
// ACID_BASE_REF lists Ka as strings ('1.8 × 10⁻⁵', '~10⁷') spanning fourteen orders of
// magnitude. Two things hide in that spread and neither survives as text: pKa turns an
// unreadable exponent into a comparable number, and at the strong end the differences
// STOP MATTERING because water levels every strong acid to H₃O⁺.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// The pH values are checked against published worked examples, and the levelling result
// is checked as a RELATIONSHIP (same pH despite a huge Ka gap) rather than a magic number.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOLECULE = 'stem_lab/stem_tool_molecule.js';

function frag(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

function acidbase(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'acidbase', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Acid strength model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('carries the Ka values the reference table prints', () => {
    expect(pure.ACID_KA.ch3cooh.ka).toBeCloseTo(1.8e-5, 6);
    expect(pure.ACID_KA.hf.ka).toBeCloseTo(6.6e-4, 5);
    expect(pure.ACID_KA.h2co3.ka).toBeCloseTo(4.3e-7, 8);
    // Strong acids are flagged as such, not inferred from a threshold.
    expect(pure.ACID_KA.hcl.strong).toBe(true);
    expect(pure.ACID_KA.ch3cooh.strong).toBe(false);
  });

  it('converts Ka to pKa, negative for the strong acids', () => {
    // pKa = -log10(Ka). Acetic acid's 4.74 is the number every buffer question
    // uses, and it must match the chembalance buffer designer's table.
    expect(pure.pKaOf(1.8e-5)).toBeCloseTo(4.74, 2);
    expect(pure.pKaOf(6.6e-4)).toBeCloseTo(3.18, 2);
    // A negative pKa is what "stronger than H3O+" looks like as a number.
    expect(pure.pKaOf(1e7)).toBeCloseTo(-7, 6);
    expect(pure.pKaOf(20)).toBeLessThan(0);
  });

  it('solves the weak-acid equilibrium EXACTLY, not by the sqrt shortcut', () => {
    // 0.10 M acetic acid is pH 2.87-2.88 in every textbook.
    expect(pure.weakAcidPH(1.8e-5, 0.10)).toBeCloseTo(2.87, 1);
    // The shortcut x = sqrt(Ka*C) drifts once dissociation is more than a few
    // percent. HF at 0.10 M is ~8% dissociated, where the two diverge.
    const shortcut = -Math.log10(Math.sqrt(6.6e-4 * 0.10));
    const exact = pure.weakAcidPH(6.6e-4, 0.10);
    expect(Math.abs(exact - shortcut)).toBeGreaterThan(0.01);
    expect(exact).toBeCloseTo(2.11, 1);
  });

  it('saturates a strong acid at full dissociation', () => {
    // A strong acid cannot give more H+ than it has: pH = -log10(C).
    expect(pure.weakAcidPH(1e7, 0.10)).toBeCloseTo(1.0, 2);
    expect(pure.weakAcidPH(1e7, 0.01)).toBeCloseTo(2.0, 2);
    expect(pure.percentDissociated(1e7, 0.10)).toBeCloseTo(100, 1);
  });

  it('never lets [H+] exceed the acid concentration, even at absurd Ka', () => {
    // The exact solve approaches C from below as Ka grows, but floating-point
    // error near that asymptote pushes it OVER at some values (Ka = 1e10 and
    // 1e12 with C = 0.01, for instance). Unclamped, -log10(x) then reports a pH
    // BELOW the true floor - a wrong number rather than a crash, which is worse.
    for (const ka of [1e7, 1e9, 1e10, 1e11, 1e12, 1e13]) {
      for (const conc of [0.01, 0.1, 1]) {
        const floor = -Math.log10(conc);
        expect(
          pure.weakAcidPH(ka, conc),
          `Ka=${ka} C=${conc} reported a pH below the fully-dissociated floor`
        ).toBeGreaterThanOrEqual(floor - 1e-9);
        expect(pure.percentDissociated(ka, conc), `Ka=${ka} C=${conc}`)
          .toBeLessThanOrEqual(100);
      }
    }
  });

  it('reports percent dissociation, which is what strong and weak MEAN', () => {
    // Invisible in a Ka string, and the actual definition.
    expect(pure.percentDissociated(1.8e-5, 0.10)).toBeGreaterThan(1);
    expect(pure.percentDissociated(1.8e-5, 0.10)).toBeLessThan(2);
    expect(pure.percentDissociated(4.3e-7, 0.10)).toBeLessThan(0.5);
    // Never above 100%.
    for (const key of Object.keys(pure.ACID_KA)) {
      const pct = pure.percentDissociated(pure.ACID_KA[key].ka, 0.10);
      expect(pct, `${key} over 100%`).toBeLessThanOrEqual(100);
    }
  });

  it('dilution raises percent dissociation (Ostwald)', () => {
    // A weak acid dissociates MORE when diluted - counterintuitive and real.
    const strongConc = pure.percentDissociated(1.8e-5, 1.0);
    const weakConc = pure.percentDissociated(1.8e-5, 0.01);
    expect(weakConc).toBeGreaterThan(strongConc);
  });

  it('shows the LEVELLING effect: same pH despite a vast Ka gap', () => {
    // HCl and HNO3 differ by ~500,000x in Ka and give the SAME pH, because
    // water converts anything stronger than H3O+ into H3O+.
    const lv = pure.levelledTogether('hcl', 'hno3', 0.10);
    expect(lv.kaRatio).toBeGreaterThan(1e5);
    expect(lv.gap).toBeLessThan(0.05);
    expect(lv.levelled).toBe(true);
  });

  it('does NOT level two weak acids', () => {
    // Acetic vs carbonic differ by only ~42x - far less than HCl vs HNO3 - and
    // are clearly distinguishable. Ka only stops mattering once BOTH are strong.
    const lv = pure.levelledTogether('ch3cooh', 'h2co3', 0.10);
    expect(lv.kaRatio).toBeLessThan(100);
    expect(lv.gap).toBeGreaterThan(0.5);
    expect(lv.levelled).toBe(false);
  });

  it('every strong pair levels, and no weak pair does', () => {
    const strong = Object.keys(pure.ACID_KA).filter((k) => pure.ACID_KA[k].strong);
    const weak = Object.keys(pure.ACID_KA).filter((k) => !pure.ACID_KA[k].strong);
    for (const a of strong) {
      for (const b of strong) {
        if (a === b) continue;
        expect(pure.levelledTogether(a, b, 0.10).levelled, `${a} vs ${b}`).toBe(true);
      }
    }
    for (const a of weak) {
      for (const b of weak) {
        if (a === b) continue;
        expect(pure.levelledTogether(a, b, 0.10).levelled, `${a} vs ${b}`).toBe(false);
      }
    }
  });

  it('refuses impossible inputs', () => {
    expect(Number.isNaN(pure.pKaOf(0))).toBe(true);
    expect(Number.isNaN(pure.pKaOf(-1))).toBe(true);
    expect(Number.isNaN(pure.weakAcidPH(1.8e-5, 0))).toBe(true);
    expect(Number.isNaN(pure.percentDissociated(0, 0.1))).toBe(true);
    expect(pure.levelledTogether('nope', 'hcl', 0.1)).toBeNull();
  });
});

describe('Acid/base section — the strength explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('offers a named acid picker and a concentration field', () => {
    const el = acidbase();
    const picker = el.querySelector('#ka-acid');
    const conc = el.querySelector('#ka-conc');
    expect(picker).toBeTruthy();
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(conc.getAttribute('type')).toBe('number');
    expect(conc.getAttribute('aria-label')).toBeTruthy();
    expect(picker.querySelectorAll('option').length).toBe(6);
  });

  it('shows pKa, pH and percent dissociation together', () => {
    // Acetic acid at the default 0.10 M.
    const el = acidbase();
    expect(testid(el, 'mol-ka-pka')).toContain('4.74');
    expect(testid(el, 'mol-ka-ph')).toContain('2.88');
    expect(testid(el, 'mol-ka-pct')).toContain('1.3');
  });

  it('shows a NEGATIVE pKa for a strong acid', () => {
    const el = acidbase({ kaAcid: 'hcl' });
    expect(testid(el, 'mol-ka-pka')).toContain('-7');
    expect(testid(el, 'mol-ka-pct')).toContain('100');
  });

  it('demonstrates levelling rather than asserting it', () => {
    const el = acidbase({ kaAcid: 'hcl', kaCompare: 'hno3' });
    const note = testid(el, 'mol-ka-levelling');
    // The numbers must be on screen: same pH, huge Ka ratio.
    expect(note).toContain('pH 1.00 vs 1.00');
    expect(note).toContain('5.0e+5');
    expect(note).toContain('LEVELS strong acids');
  });

  it('says plainly when two acids are NOT levelled', () => {
    const el = acidbase({ kaAcid: 'ch3cooh', kaCompare: 'h2co3' });
    const note = testid(el, 'mol-ka-levelling');
    expect(note).toContain('2.88');
    expect(note).toContain('3.68');
    expect(note).toContain('Ka still decides');
  });

  it('hides the comparison when both sides are the same acid', () => {
    const el = acidbase({ kaAcid: 'hcl', kaCompare: 'hcl' });
    expect(el.querySelector('[data-testid="mol-ka-levelling"]')).toBeNull();
  });

  it('warns that weak is not the same as safe', () => {
    // HF is a weak acid that dissolves glass and causes deep burns. The table
    // says "Weak (but dangerous)"; the panel must not lose that.
    const el = acidbase({ kaAcid: 'hf' });
    const note = testid(el, 'mol-ka-note');
    expect(note).toContain('WEAK');
    expect(note.toLowerCase()).toContain('not "safe"'.toLowerCase());
  });

  it('marks pKa on a line where negative reads as stronger', () => {
    const cx = (kaAcid) => Number(acidbase({ kaAcid })
      .querySelector('[data-testid="mol-ka-line"] circle').getAttribute('cx'));
    // Stronger acid (lower pKa) must sit further LEFT.
    expect(cx('hcl')).toBeLessThan(cx('ch3cooh'));
    expect(cx('ch3cooh')).toBeLessThan(cx('h2co3'));
  });

  it('recomputes when the concentration changes', () => {
    const tenth = testid(acidbase({ kaAcid: 'hcl', kaConc: 0.1 }), 'mol-ka-ph');
    const hundredth = testid(acidbase({ kaAcid: 'hcl', kaConc: 0.01 }), 'mol-ka-ph');
    expect(tenth).toContain('1.00');
    expect(hundredth).toContain('2.00');
  });

  it('describes the pKa line for screen readers', () => {
    const svg = acidbase({ kaAcid: 'ch3cooh' }).querySelector('[data-testid="mol-ka-line"]');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('Acetic acid');
    expect(label).toContain('pKa 4.74');
    expect(label).toContain('percent');
  });

  it('keeps the reference table that was already there', () => {
    const el = acidbase();
    expect(el.textContent).toContain('Hydrochloric acid');
    expect(el.textContent).toContain('Carbonic acid');
  });

  it('clamps a nonsense concentration instead of breaking', () => {
    for (const kaConc of [0, -5, 999, 'banana', null]) {
      const ph = testid(acidbase({ kaAcid: 'ch3cooh', kaConc }), 'mol-ka-ph');
      expect(ph, String(kaConc)).toBeTruthy();
      expect(ph).not.toContain('NaN');
    }
  });

  it('never leaks NaN for any acid', () => {
    for (const kaAcid of Object.keys(window.__alloMoleculePure.ACID_KA)) {
      const text = acidbase({ kaAcid }).textContent;
      expect(text, kaAcid).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
    }
  });
});
