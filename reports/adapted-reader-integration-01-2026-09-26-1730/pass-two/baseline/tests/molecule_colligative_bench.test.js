// Molecule — the live colligative-properties bench.
//
// WHY THIS FILE EXISTS
// COLLIGATIVE_PROPS stated four formulas as strings. Each is one multiplication, and
// every one of them turns on i, the van 't Hoff factor - which IS what "colligative"
// means: the property counts PARTICLES, not molecules. A table of formulas cannot show
// that 1 m NaCl and 1 m sugar behave differently, or that 6 m NaCl and 4 m CaCl2 behave
// identically.
//
// The section is tab-gated, so dev-tools/check_stem_render.cjs (molecule opens with
// expSection = null) never builds it and the render goldens never see it.
//
// Every numeric expectation is a published value or an exact identity, never the
// model's own output. Kb/Kf are CRC values for each solvent.

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

function collig(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'colligative', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Colligative model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    pure = window.__alloMoleculePure;
  });

  it('carries CRC constants for each solvent', () => {
    const water = pure.COLLIG_SOLVENTS.water;
    expect(water.kb).toBeCloseTo(0.512, 3);
    expect(water.kf).toBeCloseTo(1.86, 2);
    expect(water.bp).toBe(100);
    expect(water.fp).toBe(0);
    // Benzene's Kf is much larger, which is why it is the classic lab solvent
    // for freezing-point molar-mass determination.
    expect(pure.COLLIG_SOLVENTS.benzene.kf).toBeCloseTo(5.12, 2);
  });

  it('uses ideal van \'t Hoff factors that match the dissociation', () => {
    expect(pure.COLLIG_SOLUTES.sugar.i).toBe(1);
    expect(pure.COLLIG_SOLUTES.nacl.i).toBe(2);
    expect(pure.COLLIG_SOLUTES.cacl2.i).toBe(3);
    expect(pure.COLLIG_SOLUTES.alcl3.i).toBe(4);
  });

  it('reproduces the textbook 1 m NaCl case', () => {
    // 1 m NaCl in water: bp +1.02 C, fp -3.72 C.
    expect(pure.boilingPointElevation(2, 0.512, 1)).toBeCloseTo(1.024, 3);
    expect(pure.freezingPointDepression(2, 1.86, 1)).toBeCloseTo(3.72, 2);
  });

  it('returns freezing-point depression as a POSITIVE magnitude', () => {
    // The caller subtracts it. Returning a negative here is where the sign
    // classically gets applied twice and the freezing point goes UP.
    expect(pure.freezingPointDepression(2, 1.86, 1)).toBeGreaterThan(0);
  });

  it('scales linearly with particles, not with formula units', () => {
    // The defining property: what matters is i x m, however you get there.
    const viaSalt = pure.freezingPointDepression(2, 1.86, 6);   // 6 m NaCl
    const viaCalcium = pure.freezingPointDepression(3, 1.86, 4); // 4 m CaCl2
    expect(viaSalt).toBeCloseTo(viaCalcium, 10);
    expect(pure.particleMolality(2, 6)).toBeCloseTo(pure.particleMolality(3, 4), 10);
  });

  it('distinguishes an ionic solute from a molecular one at the same molality', () => {
    const salt = pure.freezingPointDepression(2, 1.86, 1);
    const sugar = pure.freezingPointDepression(1, 1.86, 1);
    expect(salt / sugar).toBeCloseTo(2, 10);
  });

  it('computes osmotic pressure in atm against a published value', () => {
    // Blood is about 0.30 M in total particles at 310 K -> ~7.7 atm.
    expect(pure.osmoticPressure(1, 0.30, 310)).toBeCloseTo(7.63, 1);
  });

  it('is zero at zero concentration for every property', () => {
    expect(pure.boilingPointElevation(2, 0.512, 0)).toBe(0);
    expect(pure.freezingPointDepression(2, 1.86, 0)).toBe(0);
    expect(pure.osmoticPressure(2, 0, 298)).toBe(0);
  });

  it('refuses impossible inputs instead of returning a number', () => {
    expect(Number.isNaN(pure.boilingPointElevation(0, 0.512, 1))).toBe(true);
    expect(Number.isNaN(pure.freezingPointDepression(2, 1.86, -1))).toBe(true);
    expect(Number.isNaN(pure.osmoticPressure(2, 1, 0))).toBe(true);
    expect(Number.isNaN(pure.particleMolality(-1, 1))).toBe(true);
  });
});

describe('Colligative section — the bench renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('offers both pickers and the molality slider, all named', () => {
    const el = collig();
    for (const id of ['cg-solute', 'cg-solvent']) {
      const picker = el.querySelector(`#${id}`);
      expect(picker, `missing #${id}`).toBeTruthy();
      expect(picker.getAttribute('aria-label')).toBeTruthy();
    }
    const slider = el.querySelector('#cg-molality');
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
  });

  it('gives every control a real accessible name', () => {
    // No existing molecule ratchet counts controls in this section, so the name
    // check has to live here: a range input or select with no accessible name is
    // silent to a screen reader, and nothing else in the repo would catch it.
    const el = collig();
    const accessibleName = (control) => {
      const aria = (control.getAttribute('aria-label') || '').trim();
      const labelled = [...(control.labels || [])]
        .map((label) => label.textContent || '')
        .join(' ')
        .trim();
      return aria || labelled;
    };
    const controls = el.querySelectorAll('#cg-solute, #cg-solvent, #cg-molality');
    expect(controls.length).toBe(3);
    for (const control of controls) {
      expect(
        accessibleName(control),
        `unnamed ${control.tagName.toLowerCase()} #${control.id}`
      ).not.toBe('');
    }
  });

  it('shows the i multiplication explicitly', () => {
    // The whole point: the student must SEE molality become particle molality.
    const el = collig();
    const line = testid(el, 'mol-collig-particles');
    expect(line).toContain('i = 2');
    expect(line).toContain('2.00 mol/kg of particles');
  });

  it('works the textbook 1 m NaCl numbers', () => {
    const el = collig();
    expect(testid(el, 'mol-collig-bp')).toContain('101.02');
    expect(testid(el, 'mol-collig-fp')).toContain('-3.72');
  });

  it('halves the effect for a molecular solute at the same molality', () => {
    const el = collig({ cgSolute: 'sugar' });
    expect(testid(el, 'mol-collig-particles')).toContain('i = 1');
    expect(testid(el, 'mol-collig-fp')).toContain('-1.86');
  });

  it('gives IDENTICAL results for equal particle counts by different routes', () => {
    // 6 m NaCl and 4 m CaCl2 are both 12 mol/kg in particles. If the bench
    // showed different answers, it would be teaching the opposite of
    // "colligative".
    const salt = collig({ cgSolute: 'nacl', cgMolality: 6 });
    const calcium = collig({ cgSolute: 'cacl2', cgMolality: 4 });
    expect(testid(salt, 'mol-collig-fp')).toBe(testid(calcium, 'mol-collig-fp'));
    expect(testid(salt, 'mol-collig-bp')).toBe(testid(calcium, 'mol-collig-bp'));
  });

  it('switches solvent constants, not just the label', () => {
    // Benzene: Kf 5.12 vs water 1.86, so 1 m NaCl drops it 10.24 C.
    const el = collig({ cgSolvent: 'benzene' });
    expect(testid(el, 'mol-collig-fp')).toContain('10.24');
    // And benzene's own freezing point is 5.5 C, not 0.
    expect(testid(el, 'mol-collig-fp')).toContain('-4.74');
  });

  it('explains road salting, and where it stops working', () => {
    const mild = collig({ cgSolute: 'nacl', cgMolality: 1 });
    expect(testid(mild, 'mol-collig-roadsalt')).toContain('road salting');

    // Past the NaCl/water eutectic (-21 C) no extra salt helps.
    const hard = collig({ cgSolute: 'nacl', cgMolality: 6 });
    expect(testid(hard, 'mol-collig-roadsalt')).toContain('eutectic');
  });

  it('keeps the eutectic claim scoped to NaCl, whose number it is', () => {
    // -21 C is the NaCl/water eutectic specifically. Showing it while CaCl2 is
    // selected would state a NaCl fact about a different salt.
    const calcium = collig({ cgSolute: 'cacl2', cgMolality: 4 });
    expect(calcium.querySelector('[data-testid="mol-collig-roadsalt"]')).toBeNull();
    // And it is a water fact, so not for benzene either.
    const benzene = collig({ cgSolvent: 'benzene', cgSolute: 'nacl', cgMolality: 6 });
    expect(benzene.querySelector('[data-testid="mol-collig-roadsalt"]')).toBeNull();
  });

  it('only quotes osmotic pressure where molality ≈ molarity, and says so', () => {
    // π = iMRT needs MOLARITY (mol/L); this bench works in MOLALITY (mol/kg).
    // In dilute water they nearly coincide. At 6 mol/kg they do not, and feeding
    // molality straight in printed a confident, meaningless "293.6 atm".
    const dilute = collig({ cgSolute: 'nacl', cgMolality: 1 });
    const line = testid(dilute, 'mol-collig-osmotic');
    expect(line).toContain('approximate');
    expect(line).toContain('molarity');
    // A plausible dilute value, not a three-figure one.
    const value = Number(line.match(/([\d.]+)\s*atm/)[1]);
    expect(value).toBeGreaterThan(10);
    expect(value).toBeLessThan(80);

    // Withdrawn where the approximation breaks down.
    const strong = collig({ cgSolute: 'nacl', cgMolality: 6 });
    expect(strong.querySelector('[data-testid="mol-collig-osmotic"]')).toBeNull();
    // And withdrawn for non-aqueous solvents, where the densities differ more.
    const benzene = collig({ cgSolvent: 'benzene', cgMolality: 1 });
    expect(benzene.querySelector('[data-testid="mol-collig-osmotic"]')).toBeNull();
  });

  it('keeps the four reference cards that were already there', () => {
    const el = collig();
    expect(el.textContent).toContain('Boiling point elevation');
    expect(el.textContent).toContain('Freezing point depression');
    expect(el.textContent).toContain('Osmotic pressure');
    expect(el.textContent).toContain('Vapor pressure lowering');
  });

  it('announces the whole state in one utterance', () => {
    // The shell renders its own [role="status"], so target this panel's region
    // by testid - a bare [role="status"] selector picks up the wrong one.
    const status = collig().querySelector('[data-testid="mol-collig-sr"]');
    expect(status).toBeTruthy();
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    const text = status.textContent;
    expect(text).toContain('Table salt');
    expect(text).toContain('particles');
    expect(text).toContain('Freezing point falls');
  });

  it('never leaks NaN across every solute, solvent and endpoint', () => {
    const pure = window.__alloMoleculePure;
    for (const cgSolute of Object.keys(pure.COLLIG_SOLUTES)) {
      for (const cgSolvent of Object.keys(pure.COLLIG_SOLVENTS)) {
        for (const cgMolality of [0, 6]) {
          const text = collig({ cgSolute, cgSolvent, cgMolality }).textContent;
          expect(text, `${cgSolute}/${cgSolvent}@${cgMolality}`)
            .not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
        }
      }
    }
  });
});
