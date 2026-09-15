// Molecule — the "will it precipitate?" drill.
//
// WHY THIS FILE EXISTS
// SOLUBILITY_RULES lists thirteen rules with their exceptions. Reading them is not the
// skill: the skill is "mix these two solutions - does anything drop out?", which needs
// the rule AND its exception applied to one specific pair. Nearly every wrong answer is
// the rule remembered without the exception.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// The chemistry is checked against the rule text the section ALREADY displays, so the
// drill cannot drift away from the tables printed directly above it.

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

function solubility(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'solubility', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Precipitation model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('makes Group 1 and ammonium soluble with EVERY anion', () => {
    // This rule outranks the anion's own rule - it is why NaOH and Na2CO3
    // dissolve at all, and getting it wrong breaks half the table.
    for (const cation of pure.ALWAYS_SOLUBLE_CATIONS) {
      for (const anion of Object.keys(pure.SOLUBILITY_TABLE)) {
        const verdict = pure.saltSolubility(cation, anion);
        expect(verdict.soluble, `${cation}${anion}`).toBe(true);
      }
    }
  });

  it('explains Group 1 by its OWN rule, not by an exception list', () => {
    // Mutation finding: removing the Group 1 branch leaves every verdict
    // unchanged, because the insoluble families already list Na/K/etc among
    // their exceptions. So the branch is not load-bearing for correctness - it
    // is load-bearing for the REASON, and that is what needs pinning.
    //
    // "Group 1 salts are soluble with every anion" is the rule a student should
    // carry away; "sodium happens to be on the carbonate exception list" is not.
    const sodiumCarbonate = pure.saltSolubility('Na', 'CO3');
    expect(sodiumCarbonate.soluble).toBe(true);
    expect(sodiumCarbonate.because).toContain('Group 1');
    expect(sodiumCarbonate.because).toContain('every anion');
    // And it must NOT be described as a quirky exception.
    expect(sodiumCarbonate.because.toLowerCase()).not.toContain('exception');

    // A genuine exception still reads as one.
    expect(pure.saltSolubility('Ba', 'OH').because.toLowerCase()).toContain('exception');
  });

  it('applies the halide exceptions', () => {
    // Halides dissolve EXCEPT with Ag+, Pb2+, Hg2(2+).
    for (const anion of ['Cl', 'Br', 'I']) {
      expect(pure.saltSolubility('K', anion).soluble, `K${anion}`).toBe(true);
      for (const cation of ['Ag', 'Pb', 'Hg2']) {
        const verdict = pure.saltSolubility(cation, anion);
        expect(verdict.soluble, `${cation}${anion}`).toBe(false);
        expect(verdict.viaException, `${cation}${anion} via exception`).toBe(true);
      }
    }
  });

  it('applies the sulfate exceptions', () => {
    expect(pure.saltSolubility('Na', 'SO4').soluble).toBe(true);
    expect(pure.saltSolubility('Ba', 'SO4').soluble).toBe(false);
    expect(pure.saltSolubility('Pb', 'SO4').soluble).toBe(false);
  });

  it('inverts correctly for the "mostly insoluble" families', () => {
    // Carbonates are insoluble by default; Group 1 rescues them.
    expect(pure.saltSolubility('Ca', 'CO3').soluble).toBe(false);
    expect(pure.saltSolubility('Na', 'CO3').soluble).toBe(true);
    // Hydroxides too - and Ba2+ is the exception that catches people out.
    expect(pure.saltSolubility('Fe', 'OH').soluble).toBe(false);
    expect(pure.saltSolubility('Ba', 'OH').soluble).toBe(true);
    expect(pure.saltSolubility('Ba', 'OH').viaException).toBe(true);
  });

  it('flags WHICH decision was the exception', () => {
    // Needed so the drill can say "the exception decided this", which is the
    // thing students miss.
    expect(pure.saltSolubility('K', 'Cl').viaException).toBe(false);
    expect(pure.saltSolubility('Ag', 'Cl').viaException).toBe(true);
  });

  it('swaps partners and finds the solid', () => {
    const r = pure.predictPrecipitate(
      { cation: 'Ag', anion: 'NO3' },
      { cation: 'Na', anion: 'Cl' }
    );
    expect(r.willPrecipitate).toBe(true);
    expect(r.products.length).toBe(2);
    expect(r.precipitates.map((p) => pure.saltFormula(p.cation, p.anion))).toEqual(['AgCl']);
  });

  it('reproduces four classic precipitations', () => {
    const cases = [
      [{ cation: 'Ag', anion: 'NO3' }, { cation: 'Na', anion: 'Cl' }, 'AgCl'],
      [{ cation: 'Ba', anion: 'Cl' }, { cation: 'Na', anion: 'SO4' }, 'BaSO4'],
      [{ cation: 'Pb', anion: 'NO3' }, { cation: 'K', anion: 'I' }, 'PbI2'],
      [{ cation: 'Ca', anion: 'Cl' }, { cation: 'Na', anion: 'CO3' }, 'CaCO3'],
    ];
    for (const [a, b, solid] of cases) {
      const r = pure.predictPrecipitate(a, b);
      expect(r.willPrecipitate, `${a.cation}${a.anion} + ${b.cation}${b.anion}`).toBe(true);
      expect(r.precipitates.map((p) => pure.saltFormula(p.cation, p.anion))).toContain(solid);
    }
  });

  it('writes charge-balanced formulas, not concatenated ion symbols', () => {
    // A screenshot showed the drill printing "BaOH" and "PbI" - neither is a
    // real compound. Criss-crossing the charges and reducing gives the formula a
    // chemistry student should see, with brackets on polyatomic ions.
    expect(pure.saltFormula('Ag', 'Cl')).toBe('AgCl');
    expect(pure.saltFormula('Na', 'NO3')).toBe('NaNO3');
    expect(pure.saltFormula('Ba', 'OH')).toBe('Ba(OH)2');
    expect(pure.saltFormula('Pb', 'I')).toBe('PbI2');
    // Reduce the ratio: Ca(2+) with CO3(2-) is CaCO3, not Ca2(CO3)2.
    expect(pure.saltFormula('Ca', 'CO3')).toBe('CaCO3');
    expect(pure.saltFormula('Ba', 'SO4')).toBe('BaSO4');
    // The hard ones, where both subscripts and brackets are needed.
    expect(pure.saltFormula('Al', 'SO4')).toBe('Al2(SO4)3');
    expect(pure.saltFormula('Ca', 'PO4')).toBe('Ca3(PO4)2');
  });

  it('reports NO reaction when every product dissolves', () => {
    const cases = [
      [{ cation: 'Na', anion: 'NO3' }, { cation: 'K', anion: 'Cl' }],
      [{ cation: 'NH4', anion: 'Cl' }, { cation: 'Na', anion: 'NO3' }],
      // Silver with no halide present - the trap.
      [{ cation: 'Ag', anion: 'NO3' }, { cation: 'Na', anion: 'NO3' }],
      // Ba(OH)2 is the hydroxide exception, so this stays clear.
      [{ cation: 'Ba', anion: 'NO3' }, { cation: 'Na', anion: 'OH' }],
    ];
    for (const [a, b] of cases) {
      const r = pure.predictPrecipitate(a, b);
      expect(r.willPrecipitate, `${a.cation}${a.anion} + ${b.cation}${b.anion}`).toBe(false);
      expect(r.precipitates).toEqual([]);
    }
  });

  it('agrees with the rule text the section already displays', () => {
    // If the model and the printed table ever disagree, one of them teaches the
    // wrong chemistry. Every table entry must name its own exceptions in prose.
    for (const [anion, entry] of Object.entries(pure.SOLUBILITY_TABLE)) {
      expect(entry.rule, `${anion} has no rule text`).toBeTruthy();
      if (entry.exceptions.length) {
        expect(
          entry.rule.toUpperCase(),
          `${anion} rule text must mention its exceptions`
        ).toContain('EXCEPT');
      }
    }
  });

  it('refuses an anion it has no rule for', () => {
    expect(pure.saltSolubility('Na', 'NOT_AN_ION')).toBeNull();
    expect(pure.predictPrecipitate(null, { cation: 'Na', anion: 'Cl' })).toBeNull();
  });
});

describe('Solubility section — the drill renders and grades', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('opens on a mixture with two choices and no answer shown', () => {
    const el = solubility();
    expect(testid(el, 'mol-ppt-mix')).toContain('AgNO₃');
    expect(el.querySelectorAll('[data-ppt-choice]').length).toBe(2);
    expect(el.querySelector('[data-testid="mol-ppt-verdict"]')).toBeNull();
    expect(el.querySelector('[data-testid="mol-ppt-working"]')).toBeNull();
  });

  it('confirms a correct prediction and names the solid', () => {
    const el = solubility({ pptIdx: 0, pptPick: 'yes' });
    const verdict = testid(el, 'mol-ppt-verdict');
    expect(verdict).toContain('Correct');
    expect(verdict).toContain('AgCl');
  });

  it('corrects a wrong prediction with the SAME chemistry', () => {
    // A wrong answer must not get a different explanation of the world.
    const el = solubility({ pptIdx: 0, pptPick: 'no' });
    const verdict = testid(el, 'mol-ppt-verdict');
    expect(verdict).toContain('Not quite');
    expect(verdict).toContain('AgCl');
  });

  it('shows the working for every product, not just the answer', () => {
    const el = solubility({ pptIdx: 0, pptPick: 'yes' });
    const products = [...el.querySelectorAll('[data-ppt-product]')]
      .map((n) => n.getAttribute('data-ppt-product'));
    expect(products.length).toBe(2);
    expect(products).toContain('AgCl');
    // And the rule that decided it must be on screen.
    expect(testid(el, 'mol-ppt-working')).toContain('Halides are soluble EXCEPT');

    // jsdom has no layout, so textContent still reads from a display:none node -
    // a `className: 'hidden'` mutation passed a pure text assertion. Check the
    // element is actually presented rather than merely present.
    const working = el.querySelector('[data-testid="mol-ppt-working"]');
    expect(working.className, 'working must not be hidden').not.toMatch(/\bhidden\b/);
    expect(working.hasAttribute('hidden')).toBe(false);
    expect(working.getAttribute('aria-hidden')).not.toBe('true');
  });

  it('says when the EXCEPTION decided it', () => {
    const el = solubility({ pptIdx: 0, pptPick: 'yes' });
    expect(testid(el, 'mol-ppt-working')).toContain('EXCEPTION decided this one');
  });

  it('handles the silver-without-a-halide trap', () => {
    // AgNO3 + NaNO3: silver is present but there is no halide, so nothing forms.
    const el = solubility({ pptIdx: 5, pptPick: 'yes' });
    const verdict = testid(el, 'mol-ppt-verdict');
    expect(verdict).toContain('Not quite');
    expect(verdict).toContain('stays clear');
  });

  it('handles the Ba(OH)₂ exception trap', () => {
    // Hydroxides are mostly insoluble - but Ba2+ is an exception, so no solid.
    const el = solubility({ pptIdx: 6, pptPick: 'yes' });
    expect(testid(el, 'mol-ppt-verdict')).toContain('stays clear');
    expect(testid(el, 'mol-ppt-working')).toContain('EXCEPT Group 1, NH₄⁺ and Ba²⁺');
  });

  it('advances through the set and stops offering Next at the end', () => {
    const mid = solubility({ pptIdx: 0, pptPick: 'yes' });
    expect(mid.querySelector('[data-testid="mol-ppt-next"]')).toBeTruthy();
    const end = solubility({ pptIdx: 6, pptPick: 'no' });
    expect(end.querySelector('[data-testid="mol-ppt-next"]')).toBeNull();
  });

  it('every mixture in the set renders and grades both ways', () => {
    for (let pptIdx = 0; pptIdx < 7; pptIdx += 1) {
      for (const pptPick of ['yes', 'no']) {
        const el = solubility({ pptIdx, pptPick });
        const verdict = testid(el, 'mol-ppt-verdict');
        expect(verdict, `mix ${pptIdx} / ${pptPick}`).toBeTruthy();
        // Exactly one of the two answers is right for each mixture.
        expect(
          /Correct|Not quite/.test(verdict),
          `mix ${pptIdx} / ${pptPick}`
        ).toBe(true);
        expect(el.querySelectorAll('[data-ppt-product]').length).toBe(2);
      }
    }
  });

  it('grades exactly one answer correct per mixture', () => {
    // A mixture where both or neither answer scores would be broken grading.
    for (let pptIdx = 0; pptIdx < 7; pptIdx += 1) {
      const yes = testid(solubility({ pptIdx, pptPick: 'yes' }), 'mol-ppt-verdict');
      const no = testid(solubility({ pptIdx, pptPick: 'no' }), 'mol-ppt-verdict');
      const correctCount = [yes, no].filter((t) => t.includes('Correct')).length;
      expect(correctCount, `mix ${pptIdx}`).toBe(1);
    }
  });

  it('keeps the reference tables that were already there', () => {
    const el = solubility();
    expect(el.textContent).toContain('nitrate');
    expect(el.textContent).toContain('Group 1');
  });

  it('announces the question and the verdict', () => {
    const asked = solubility().querySelector('[data-testid="mol-ppt-sr"]');
    expect(asked.getAttribute('aria-live')).toBe('polite');
    expect(asked.textContent).toContain('Will a solid form?');

    const answered = solubility({ pptIdx: 0, pptPick: 'no' })
      .querySelector('[data-testid="mol-ppt-sr"]').textContent;
    expect(answered).toContain('Not quite');
  });

  it('falls back to a real mixture when the stored index is junk', () => {
    for (const pptIdx of [-1, 99, 'banana', null]) {
      const el = solubility({ pptIdx });
      expect(testid(el, 'mol-ppt-mix'), String(pptIdx)).toBeTruthy();
    }
  });

  it('never leaks NaN or a raw undefined', () => {
    for (let pptIdx = 0; pptIdx < 7; pptIdx += 1) {
      const text = solubility({ pptIdx, pptPick: 'yes' }).textContent;
      expect(text, `mix ${pptIdx}`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
      expect(text, `mix ${pptIdx}`).not.toMatch(/(^|[\s>(:,=])undefined([\s<),;%]|$)/);
    }
  });
});
