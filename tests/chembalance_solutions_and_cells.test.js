// chemBalance: the dilution bench (Solutions) and the galvanic cell builder (Redox).
//
// WHY THIS FILE EXISTS
// Both sections were static card-lists: formula strings and a half-reaction table a
// student reads but cannot act on. Both new panels live behind a tab, so
// dev-tools/check_stem_render.cjs (default state = the hub) never builds them and the
// render goldens never see them.
//
// Every numeric expectation is a PUBLISHED value or an exact algebraic identity,
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

function section(subtool, state = {}) {
  return frag(renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Solution concentration model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('computes molarity as moles per litre', () => {
    expect(pure.molarity(0.5, 2)).toBeCloseTo(0.25, 12);
    // 58.44 g NaCl (1 mol) in 1 L is 1.00 M - the canonical worked example.
    expect(pure.molarity(pure.molesFromMass(58.44, 58.44), 1)).toBeCloseTo(1, 6);
  });

  it('converts mass to moles', () => {
    // 18.02 g of water is one mole.
    expect(pure.molesFromMass(18.02, 18.02)).toBeCloseTo(1, 12);
    expect(pure.molesFromMass(36.04, 18.02)).toBeCloseTo(2, 12);
  });

  it('solves the dilution law for every term', () => {
    // 12 M x 25 mL -> 3 M needs 100 mL total. Each rearrangement must agree.
    expect(pure.dilutionSolve('v2', { m1: 12, v1: 25, m2: 3 })).toBeCloseTo(100, 10);
    expect(pure.dilutionSolve('m2', { m1: 12, v1: 25, v2: 100 })).toBeCloseTo(3, 10);
    expect(pure.dilutionSolve('m1', { m2: 3, v2: 100, v1: 25 })).toBeCloseTo(12, 10);
    expect(pure.dilutionSolve('v1', { m2: 3, v2: 100, m1: 12 })).toBeCloseTo(25, 10);
  });

  it('reports the solvent to ADD, not the final volume', () => {
    // The step the formula hides: 100 mL final - 25 mL stock = 75 mL added.
    expect(pure.solventToAdd(12, 25, 3)).toBeCloseTo(75, 10);
    expect(pure.solventToAdd(0.5, 100, 0.1)).toBeCloseTo(400, 10);
  });

  it('goes negative when the "dilution" would concentrate', () => {
    // Adding solvent cannot raise concentration; the UI keys off this sign.
    expect(pure.solventToAdd(1, 50, 2)).toBeLessThan(0);
  });

  it('refuses impossible inputs instead of returning Infinity', () => {
    expect(Number.isNaN(pure.molarity(1, 0))).toBe(true);
    expect(Number.isNaN(pure.molesFromMass(1, 0))).toBe(true);
    expect(Number.isNaN(pure.dilutionSolve('v2', { m1: 12, v1: 25, m2: 0 }))).toBe(true);
    expect(Number.isNaN(pure.dilutionSolve('nope', { m1: 1, v1: 1, m2: 1 }))).toBe(true);
  });
});

describe('Galvanic cell model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    pure = window.__alloChemPure;
  });

  it('stores standard REDUCTION potentials on one convention', () => {
    const table = pure.STANDARD_REDUCTION;
    // Published values vs SHE. REDOX.halfReactions shows some couples in the
    // oxidation direction with the sign flipped; this table must not.
    expect(table['Zn2+/Zn'].e).toBeCloseTo(-0.76, 2);
    expect(table['Cu2+/Cu'].e).toBeCloseTo(0.34, 2);
    expect(table['Li+/Li'].e).toBeCloseTo(-3.04, 2);
    expect(table['F2/F-'].e).toBeCloseTo(2.87, 2);
    // The hydrogen reference is exactly zero by definition.
    expect(table['H+/H2'].e).toBe(0);
  });

  it('reproduces the Daniell cell at 1.10 V', () => {
    expect(pure.cellPotential('Cu2+/Cu', 'Zn2+/Zn')).toBeCloseTo(1.1, 6);
    // Zn|Ag is 1.56 V; Mg|Cu is 2.71 V.
    expect(pure.cellPotential('Ag+/Ag', 'Zn2+/Zn')).toBeCloseTo(1.56, 6);
    expect(pure.cellPotential('Cu2+/Cu', 'Mg2+/Mg')).toBeCloseTo(2.71, 6);
  });

  it('assigns the higher reduction potential as the cathode, either way round', () => {
    // The classic error is choosing by slot order and reporting a negative
    // voltage for a spontaneous cell. Order must not matter.
    const one = pure.assignElectrodes('Zn2+/Zn', 'Cu2+/Cu');
    const two = pure.assignElectrodes('Cu2+/Cu', 'Zn2+/Zn');
    expect(one).toEqual({ cathode: 'Cu2+/Cu', anode: 'Zn2+/Zn' });
    expect(two).toEqual({ cathode: 'Cu2+/Cu', anode: 'Zn2+/Zn' });
  });

  it('never produces a negative potential for a real pair', () => {
    const keys = Object.keys(pure.STANDARD_REDUCTION);
    for (const a of keys) {
      for (const b of keys) {
        if (a === b) continue;
        const roles = pure.assignElectrodes(a, b);
        expect(roles, `${a} vs ${b}`).toBeTruthy();
        expect(
          pure.cellPotential(roles.cathode, roles.anode),
          `${a} vs ${b}`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('returns null when both electrodes are the same couple', () => {
    expect(pure.assignElectrodes('Cu2+/Cu', 'Cu2+/Cu')).toBeNull();
    expect(pure.assignElectrodes('Cu2+/Cu', 'not-a-couple')).toBeNull();
  });

  it('computes deltaG = -nFE with the published Faraday constant', () => {
    expect(pure.FARADAY).toBe(96485);
    // Daniell cell, n = 2: -2 x 96485 x 1.10 = -212 kJ/mol.
    const dG = pure.cellDeltaG(1.1, 2);
    expect(dG / 1000).toBeCloseTo(-212.3, 1);
    // Spontaneous cells give NEGATIVE deltaG.
    expect(dG).toBeLessThan(0);
    // More electrons, more energy per mole of reaction.
    expect(Math.abs(pure.cellDeltaG(1.1, 4))).toBeGreaterThan(Math.abs(dG));
  });

  it('refuses impossible inputs', () => {
    expect(Number.isNaN(pure.cellPotential('nope', 'Cu2+/Cu'))).toBe(true);
    expect(Number.isNaN(pure.cellDeltaG(1.1, 0))).toBe(true);
  });
});

describe('Solutions section — the dilution bench renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('offers all three inputs, named', () => {
    const el = section('solutions');
    for (const id of ['sol-m1', 'sol-v1', 'sol-m2']) {
      const input = el.querySelector(`#${id}`);
      expect(input, `missing #${id}`).toBeTruthy();
      expect(input.getAttribute('type')).toBe('number');
      expect(input.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('works the textbook 12 M to 3 M dilution', () => {
    const el = section('solutions');
    expect(testid(el, 'chem-dilution-v2')).toContain('100.0 mL');
    expect(testid(el, 'chem-dilution-add')).toContain('75.0 mL');
  });

  it('recomputes when the numbers change', () => {
    const el = section('solutions', { solutions: { m1: 0.5, v1: 100, m2: 0.1 } });
    expect(testid(el, 'chem-dilution-v2')).toContain('500.0 mL');
    expect(testid(el, 'chem-dilution-add')).toContain('400.0 mL');
  });

  it('refuses to "dilute" to a stronger solution, and says why', () => {
    const el = section('solutions', { solutions: { m1: 1, v1: 50, m2: 2 } });
    expect(el.querySelector('[data-testid="chem-dilution-impossible"]')).toBeTruthy();
    // The numbers must be withdrawn, not shown as a negative volume to add.
    expect(el.querySelector('[data-testid="chem-dilution-add"]')).toBeNull();
    expect(el.textContent).toContain('only make a solution weaker');
  });

  it('keeps the reference cards that were already there', () => {
    const el = section('solutions');
    expect(el.textContent).toContain('Concentration Units');
    expect(el.textContent).toContain('Solubility Rules');
  });

  it('describes the beaker for screen readers', () => {
    const svg = section('solutions').querySelector('[data-testid="chem-dilution-beaker"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('75.0');
  });

  it('draws before and after, with the colour DILUTING not stacking', () => {
    // A single beaker with a dark band at the bottom reads as two layered
    // liquids - the opposite of the idea. It must be two beakers, and the
    // "after" one must get paler as the dilution gets stronger, because the
    // solute is spread through a larger volume.
    const mild = section('solutions', { solutions: { m1: 12, v1: 25, m2: 6 } });
    const strong = section('solutions', { solutions: { m1: 12, v1: 25, m2: 1 } });

    const opacityOf = (el) => {
      const rects = [...el.querySelectorAll('[data-testid="chem-dilution-beaker"] rect')]
        .map((r) => r.getAttribute('fill-opacity'))
        .filter(Boolean)
        .map(Number);
      return rects[0];
    };

    expect(opacityOf(mild)).toBeGreaterThan(opacityOf(strong));

    // Both end states are labelled with their own volume and concentration.
    expect(mild.querySelector('[data-testid="chem-dilution-beaker"]').textContent)
      .toContain('25 mL @ 12.0 M');
    expect(mild.querySelector('[data-testid="chem-dilution-beaker"]').textContent)
      .toContain('50 mL @ 6.0 M');
  });
});

describe('Redox section — the cell builder renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
  });

  it('offers two named couple pickers and the electron slider', () => {
    const el = section('redox');
    for (const id of ['cell-a', 'cell-b']) {
      const picker = el.querySelector(`#${id}`);
      expect(picker, `missing #${id}`).toBeTruthy();
      expect(picker.getAttribute('aria-label')).toBeTruthy();
      expect(picker.querySelectorAll('option').length).toBeGreaterThanOrEqual(10);
    }
    const slider = el.querySelector('#cell-n');
    expect(slider.getAttribute('type')).toBe('range');
    expect(slider.getAttribute('aria-valuetext')).toBeTruthy();
  });

  it('defaults to the Daniell cell and shows the subtraction', () => {
    const el = section('redox');
    const voltage = testid(el, 'chem-cell-voltage');
    expect(voltage).toContain('+1.10 V');
    // The working must be visible, not just the answer.
    expect(voltage).toContain('+0.34');
    expect(voltage).toContain('-0.76');
  });

  it('gives the same cell regardless of which slot each couple is in', () => {
    // The sign error this panel exists to prevent.
    const ab = section('redox', { redoxCell: { a: 'Zn2+/Zn', b: 'Cu2+/Cu', n: 2 } });
    const ba = section('redox', { redoxCell: { a: 'Cu2+/Cu', b: 'Zn2+/Zn', n: 2 } });
    expect(testid(ab, 'chem-cell-voltage')).toBe(testid(ba, 'chem-cell-voltage'));
    expect(testid(ab, 'chem-cell-cathode')).toContain('Cu');
    expect(testid(ba, 'chem-cell-cathode')).toContain('Cu');
  });

  it('labels which electrode is reduced and which is oxidised', () => {
    const el = section('redox');
    expect(testid(el, 'chem-cell-cathode')).toContain('reduction');
    expect(testid(el, 'chem-cell-anode')).toContain('oxidation');
  });

  it('reports deltaG in kJ/mol and calls a spontaneous cell a battery', () => {
    const el = section('redox');
    const dg = testid(el, 'chem-cell-dg');
    expect(dg).toContain('-212 kJ/mol');
    expect(dg).toContain('runs on its own');
  });

  it('scales deltaG with the electron count', () => {
    const two = testid(section('redox', { redoxCell: { a: 'Zn2+/Zn', b: 'Cu2+/Cu', n: 2 } }), 'chem-cell-dg');
    const four = testid(section('redox', { redoxCell: { a: 'Zn2+/Zn', b: 'Cu2+/Cu', n: 4 } }), 'chem-cell-dg');
    expect(two).toContain('-212 kJ/mol');
    expect(four).toContain('-425 kJ/mol');
  });

  it('explains that two identical couples make no cell', () => {
    const el = section('redox', { redoxCell: { a: 'Cu2+/Cu', b: 'Cu2+/Cu', n: 2 } });
    expect(el.querySelector('[data-testid="chem-cell-same"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="chem-cell-voltage"]')).toBeNull();
    expect(el.textContent).toContain('needs a DIFFERENCE');
  });

  it('reaches the strongest possible cell without breaking', () => {
    // Li anode + F2 cathode = 5.91 V, the textbook maximum.
    const el = section('redox', { redoxCell: { a: 'Li+/Li', b: 'F2/F-', n: 1 } });
    expect(testid(el, 'chem-cell-voltage')).toContain('+5.91 V');
  });

  it('keeps the reference cards that were already there', () => {
    const el = section('redox');
    expect(el.textContent).toContain('OIL RIG');
    expect(el.textContent).toContain('Half-Reactions');
    expect(el.textContent).toContain('Electrochemical Cells');
  });

  it('never leaks NaN across every pair of couples', () => {
    resetStemLab();
    loadTool(CHEMBALANCE, 'chemBalance');
    const keys = Object.keys(window.__alloChemPure.STANDARD_REDUCTION);
    for (const a of keys) {
      const el = section('redox', { redoxCell: { a, b: 'H+/H2', n: 2 } });
      expect(el.textContent, `${a} vs H+/H2`).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
    }
  });
});
