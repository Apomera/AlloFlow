// chemBalance correctness — the molar-mass calculator (parseFormula), exercised
// through the rendered Stoichiometry tab. Locks the formula parser (nested
// parentheses + the newly-fixed hydrate dot) so the molar masses students rely on
// stay right. Element masses are the tool's own ELEMENTS table (H 1.008, O 15.999,
// Na 22.990, S 32.065, Ca 40.078, Cu 63.546). The 12 balance presets were verified
// correct by hand in docs/chem_balance_review.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// chemBalance reads ctx.toolData.chemBalance with per-field defaults, so a partial
// state is fine. The stoich tab parses _stoichFormula and shows "Molar Mass: X g/mol".
function stoich(formula) {
  return renderTool('chemBalance', { chemBalance: { subtool: 'stoich', _stoichFormula: formula } });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance'); });

describe('chemBalance — molar mass (parseFormula)', () => {
  it('H2O = 18.015 g/mol', () => {
    expect(stoich('H2O')).toContain('Molar Mass: 18.015 g/mol');
  });
  it('NaCl = 58.443 g/mol', () => {
    expect(stoich('NaCl')).toContain('Molar Mass: 58.443 g/mol');
  });
  it('Ca(OH)2 = 74.092 g/mol (nested parentheses)', () => {
    expect(stoich('Ca(OH)2')).toContain('Molar Mass: 74.092 g/mol');
  });
  it('hydrate CuSO4·5H2O = 249.682 g/mol (all 5 waters, not 1)', () => {
    const html = stoich('CuSO4·5H2O');
    expect(html).toContain('Molar Mass: 249.682 g/mol');
    expect(html).not.toContain('177.622');        // the old one-water bug value
  });
  it('hydrate also parses with a period separator (CuSO4.5H2O)', () => {
    expect(stoich('CuSO4.5H2O')).toContain('Molar Mass: 249.682 g/mol');
  });
});

// The general balancer is deterministic ground truth (exact rational Gaussian
// elimination on the element-conservation matrix) — never the LLM. Exposed on
// window.__alloChemPure by the tool IIFE for direct unit testing.
const chem = () => window.__alloChemPure;

describe('chemBalance — general equation balancer (deterministic)', () => {
  it('H2 + O2 → H2O = 2,1,2', () => {
    const r = chem().balanceEquation('H2 + O2 -> H2O');
    expect(r.ok).toBe(true);
    expect(r.coefficients).toEqual([2, 1, 2]);
    expect(r.balancedString).toBe('2H2 + O2 → 2H2O');
  });
  it('methane combustion CH4 + O2 → CO2 + H2O = 1,2,1,2', () => {
    expect(chem().balanceEquation('CH4 + O2 -> CO2 + H2O').coefficients).toEqual([1, 2, 1, 2]);
  });
  it('octane combustion needs 25 O2 (NO coefficient cap)', () => {
    expect(chem().balanceEquation('C8H18 + O2 -> CO2 + H2O').coefficients).toEqual([2, 25, 16, 18]);
  });
  it('rusting Fe + O2 → Fe2O3 = 4,3,2', () => {
    expect(chem().balanceEquation('Fe + O2 -> Fe2O3').coefficients).toEqual([4, 3, 2]);
  });
  it('Al + HCl → AlCl3 + H2 = 2,6,2,3', () => {
    expect(chem().balanceEquation('Al + HCl -> AlCl3 + H2').coefficients).toEqual([2, 6, 2, 3]);
  });
  it('Haber process N2 + H2 → NH3 = 1,3,2', () => {
    expect(chem().balanceEquation('N2 + H2 -> NH3').coefficients).toEqual([1, 3, 2]);
  });
  it('parentheses: Ca(OH)2 + HCl → CaCl2 + H2O = 1,2,1,2', () => {
    expect(chem().balanceEquation('Ca(OH)2 + HCl -> CaCl2 + H2O').coefficients).toEqual([1, 2, 1, 2]);
  });
  it('flags an already-balanced equation', () => {
    const r = chem().balanceEquation('C + O2 -> CO2');
    expect(r.coefficients).toEqual([1, 1, 1]);
    expect(r.alreadyBalanced).toBe(true);
  });
  it('accepts the unicode arrow →', () => {
    expect(chem().balanceEquation('H2 + O2 → H2O').coefficients).toEqual([2, 1, 2]);
  });
  it('ignores state labels (s)/(g)/(aq)', () => {
    expect(chem().balanceEquation('H2(g) + O2(g) -> H2O(l)').coefficients).toEqual([2, 1, 2]);
  });
  it('rejects an unsupported element', () => {
    const r = chem().balanceEquation('U + O2 -> UO2');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unsupported|element/i);
  });
  it('rejects an element appearing on only one side', () => {
    const r = chem().balanceEquation('H2 -> H2O');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/one side/i);
  });
  it('rejects input with no arrow', () => {
    expect(chem().balanceEquation('H2 + O2').ok).toBe(false);
  });
  it('rejects malformed formulas instead of silently dropping characters', () => {
    const punctuation = chem().balanceEquation('H2O! -> H2 + O2');
    expect(punctuation.ok).toBe(false);
    expect(punctuation.error).toMatch(/Invalid formula|unsupported characters/i);

    const parentheses = chem().balanceEquation('Ca(OH2 + HCl -> CaCl2 + H2O');
    expect(parentheses.ok).toBe(false);
    expect(parentheses.error).toMatch(/unmatched parentheses/i);

    const lowercase = chem().balanceEquation('Nacl -> Na + Cl2');
    expect(lowercase.ok).toBe(false);
    expect(lowercase.error).toMatch(/misplaced lowercase/i);
  });

  it('rejects zero subscripts and zero leading coefficients', () => {
    expect(chem().balanceEquation('H0 + O2 -> H2O').error).toMatch(/positive whole numbers/i);
    expect(chem().balanceEquation('0H2 + O2 -> H2O').error).toMatch(/positive whole numbers/i);
  });

  it('refuses ionic notation rather than ignoring electrical charge', () => {
    const r = chem().balanceEquation('Na+ + Cl- -> NaCl');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Ionic charge notation is not supported/i);
    expect(r.error).toMatch(/charge must be conserved separately/i);
  });

  it('shows validation errors in the calculated, non-AI UI surface', () => {
    const r = chem().balanceEquation('H2O! -> H2 + O2');
    const html = renderTool('chemBalance', {
      chemBalance: { _everPicked: true, subtool: 'balance', _balanceInput: 'H2O! -> H2 + O2', _balanceResult: r }
    });
    expect(html).toContain('Invalid formula');
    expect(html).toContain('unsupported characters');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Ionic equations require separate charge conservation');
  });
  it('renders the balanced result in a "Calculated · not AI" panel (UI surface)', () => {
    const r = chem().balanceEquation('H2 + O2 -> H2O');
    const html = renderTool('chemBalance', {
      chemBalance: { _everPicked: true, subtool: 'balance', _balanceInput: 'H2 + O2 -> H2O', _balanceResult: r }
    });
    expect(html).toContain('2H2 + O2 → 2H2O'); // the computed equation is shown
    expect(html).toContain('not AI');           // distinctness badge — measured, not model judgment
  });
});

describe('chemBalance — stoichiometry (limiting reagent + yield)', () => {
  it('identifies the limiting reagent and moles of product', () => {
    const b = chem().balanceEquation('N2 + H2 -> NH3'); // 1,3,2
    const s = chem().stoichiometry({
      coefficients: b.coefficients, species: b.species,
      given: [{ index: 0, moles: 1 }, { index: 1, moles: 2 }], productIndex: 2
    });
    expect(s.limitingFormula).toBe('H2');          // 2/3 < 1/1 → H2 limits
    expect(s.molesProduct).toBeCloseTo(4 / 3, 5);  // (2/3) * 2
  });
  it('yield calculator UI shows the limiting reagent (stoich tab render)', () => {
    const b = chem().balanceEquation('N2 + H2 -> NH3'); // 1,3,2
    const html = renderTool('chemBalance', {
      chemBalance: {
        subtool: 'stoich', _stoichFormula: 'H2O',
        _yieldInput: 'N2 + H2 -> NH3', _yieldResult: b,
        _yieldGrams: { 0: '28', 1: '2' } // N2 ~1 mol, H2 ~1 mol -> H2 limits
      }
    });
    expect(html).toContain('Limiting reagent');
    expect(html).toContain('Calculated'); // deterministic badge
  });
  it('computes theoretical grams and percent yield', () => {
    const b = chem().balanceEquation('N2 + H2 -> NH3');
    const s = chem().stoichiometry({
      coefficients: b.coefficients, species: b.species,
      given: [{ index: 0, moles: 1 }, { index: 1, moles: 3 }], productIndex: 2, actualGrams: 17.031
    });
    expect(s.molesProduct).toBeCloseTo(2, 5);        // exact stoichiometric → 2 mol NH3
    expect(s.theoreticalGrams).toBeCloseTo(34.062, 2); // 2 × 17.031
    expect(s.percentYield).toBeCloseTo(50, 1);       // 17.031 / 34.062
  });
});
