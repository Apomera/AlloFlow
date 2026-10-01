// Molecule — where the crystal packing fractions come from.
//
// WHY THIS FILE EXISTS
// CRYSTAL_STRUCTURES prints '52.4%', '68.0%', '74.0%' as strings, as if they were facts
// to memorise. Each is one formula - APF = n(4/3)πr³ / a³ - once you know which direction
// through the cube the spheres actually touch. The explorer derives them.
//
// The section is tab-gated (molecule opens with expSection = null), so
// dev-tools/check_stem_render.cjs never builds it and the render goldens never see it.
//
// Every expectation below is either published crystallography or an exact geometric
// identity, and the derived values are checked against the percentages the reference
// table ALREADY displays - so model and prose cannot drift apart.

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

function crystal(state = {}) {
  return frag(renderTool('molecule', {
    molecule: { expSection: 'crystal', referenceLibraryOpen: true, ...state },
  }));
}

const testid = (el, id) => {
  const node = el.querySelector(`[data-testid="${id}"]`);
  return node ? node.textContent.replace(/\s+/g, ' ') : null;
};

describe('Crystal packing model (pure)', () => {
  let pure;

  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
    renderTool('molecule', { molecule: { expSection: null } });
    pure = window.__alloMoleculePure;
  });

  it('reproduces every packing fraction the reference table prints', () => {
    // If the derivation and the printed table ever disagree, one of them is
    // teaching the wrong number.
    const table = { sc: 52.4, bcc: 68.0, fcc: 74.0, hcp: 74.0, diamond: 34.0 };
    for (const [key, expected] of Object.entries(table)) {
      const got = pure.latticePacking(key).packing * 100;
      expect(got, `${key} packing`).toBeCloseTo(expected, 1);
    }
  });

  it('matches the closed-form geometry exactly, not just to 1 dp', () => {
    // SC = π/6, BCC = π√3/8, FCC = π/(3√2), diamond = π√3/16.
    expect(pure.latticePacking('sc').packing).toBeCloseTo(Math.PI / 6, 12);
    expect(pure.latticePacking('bcc').packing)
      .toBeCloseTo((Math.PI * Math.sqrt(3)) / 8, 12);
    expect(pure.latticePacking('fcc').packing)
      .toBeCloseTo(Math.PI / (3 * Math.sqrt(2)), 12);
    expect(pure.latticePacking('diamond').packing)
      .toBeCloseTo((Math.PI * Math.sqrt(3)) / 16, 12);
  });

  it('gives FCC and HCP IDENTICAL density - the point worth noticing', () => {
    // Different stacking (ABCABC vs ABAB), same closest packing. If these ever
    // differ, the panel is teaching that one is denser than the other.
    expect(pure.latticePacking('hcp').packing)
      .toBeCloseTo(pure.latticePacking('fcc').packing, 12);
  });

  it('never exceeds the close-packed limit', () => {
    // 74.05% is the densest identical spheres can pack (Kepler conjecture,
    // proved by Hales). Anything above it would be impossible.
    const limit = Math.PI / (3 * Math.sqrt(2));
    for (const key of Object.keys(pure.PACKING_LATTICES)) {
      const apf = pure.latticePacking(key).packing;
      expect(apf, `${key} exceeds the close-packed limit`).toBeLessThanOrEqual(limit + 1e-12);
      expect(apf, `${key} not positive`).toBeGreaterThan(0);
    }
  });

  it('carries the published atom counts and coordination numbers', () => {
    const expected = {
      sc: { atoms: 1, coord: 6 },
      bcc: { atoms: 2, coord: 8 },
      fcc: { atoms: 4, coord: 12 },
      diamond: { atoms: 8, coord: 4 },
    };
    for (const [key, want] of Object.entries(expected)) {
      const lat = pure.latticePacking(key);
      expect(lat.atoms, `${key} atoms`).toBe(want.atoms);
      expect(lat.coord, `${key} coordination`).toBe(want.coord);
    }
  });

  it('orders density by coordination number, with diamond the exception', () => {
    // More touching neighbours means denser packing - except diamond, which is
    // held open by directional covalent bonds despite only 4 neighbours.
    const sc = pure.latticePacking('sc').packing;
    const bcc = pure.latticePacking('bcc').packing;
    const fcc = pure.latticePacking('fcc').packing;
    expect(sc).toBeLessThan(bcc);
    expect(bcc).toBeLessThan(fcc);
    // Diamond has the FEWEST neighbours and the LOWEST density.
    expect(pure.latticePacking('diamond').packing).toBeLessThan(sc);
  });

  it('reports empty space as the complement', () => {
    for (const key of Object.keys(pure.PACKING_LATTICES)) {
      const lat = pure.latticePacking(key);
      expect(lat.packing + lat.emptySpace, `${key}`).toBeCloseTo(1, 12);
    }
  });

  it('leaves the ionic structures OUT, because the formula does not apply', () => {
    // NaCl and CsCl quote '~67%' and '~73%', which depend on the cation/anion
    // RADIUS RATIO rather than one-size sphere packing. Running them through
    // this model would produce a confident wrong number, so they stay in the
    // reference table only.
    expect(pure.PACKING_LATTICES.nacl).toBeUndefined();
    expect(pure.PACKING_LATTICES.cscl).toBeUndefined();
    expect(pure.latticePacking('nacl')).toBeNull();
  });

  it('refuses impossible geometry', () => {
    expect(Number.isNaN(pure.packingFraction(0, 2))).toBe(true);
    expect(Number.isNaN(pure.packingFraction(4, 0))).toBe(true);
    expect(Number.isNaN(pure.packingFraction(-1, 2))).toBe(true);
  });
});

describe('Crystal section — the packing explorer renders', () => {
  beforeAll(() => {
    resetStemLab();
    loadTool(MOLECULE, 'molecule');
  });

  it('offers a named structure picker covering all five lattices', () => {
    const el = crystal();
    const picker = el.querySelector('#pack-lattice');
    expect(picker).toBeTruthy();
    expect(picker.getAttribute('aria-label')).toBeTruthy();
    expect(picker.querySelectorAll('option').length).toBe(5);
  });

  it('shows the WORKING, not just the percentage', () => {
    // A student has to be able to reproduce this: atoms, the contact direction,
    // the a-to-r relation, then the formula.
    const el = crystal({ packLattice: 'fcc' });
    const working = testid(el, 'mol-pack-working');
    expect(working).toContain('Atoms per cell: 4');
    expect(working).toContain('face diagonal');
    expect(working).toContain('a√2 = 4r');
    expect(working).toContain('74.0%');
  });

  it('changes every number when the structure changes', () => {
    const sc = testid(crystal({ packLattice: 'sc' }), 'mol-pack-working');
    expect(sc).toContain('Atoms per cell: 1');
    expect(sc).toContain('cube edge');
    expect(sc).toContain('52.4%');

    const bcc = testid(crystal({ packLattice: 'bcc' }), 'mol-pack-working');
    expect(bcc).toContain('Atoms per cell: 2');
    expect(bcc).toContain('body diagonal');
    expect(bcc).toContain('68.0%');
    // BCC's real subtlety: the corner atoms do not touch each other.
    expect(bcc).toContain('do NOT touch');
  });

  it('names the FCC/HCP equal-density result only where it applies', () => {
    for (const key of ['fcc', 'hcp']) {
      const note = testid(crystal({ packLattice: key }), 'mol-pack-closepacked');
      expect(note, key).toContain('SAME density');
    }
    for (const key of ['sc', 'bcc', 'diamond']) {
      expect(
        crystal({ packLattice: key }).querySelector('[data-testid="mol-pack-closepacked"]'),
        key
      ).toBeNull();
    }
  });

  it('makes the diamond point: hardness is bonds, not packing', () => {
    const note = testid(crystal({ packLattice: 'diamond' }), 'mol-pack-diamond');
    expect(note).toContain('empty');
    expect(note).toContain('BONDS');
    // And it must not appear for the metals.
    expect(crystal({ packLattice: 'fcc' }).querySelector('[data-testid="mol-pack-diamond"]')).toBeNull();
  });

  it('draws a bar whose fill tracks the packing fraction', () => {
    const widthOf = (key) => {
      const bar = crystal({ packLattice: key })
        .querySelectorAll('[data-testid="mol-pack-bar"] rect');
      return Number(bar[1].getAttribute('width'));
    };
    // Denser structure, longer bar - otherwise the picture is decorative.
    expect(widthOf('fcc')).toBeGreaterThan(widthOf('bcc'));
    expect(widthOf('bcc')).toBeGreaterThan(widthOf('sc'));
    expect(widthOf('sc')).toBeGreaterThan(widthOf('diamond'));
  });

  it('describes the bar for screen readers', () => {
    const svg = crystal({ packLattice: 'bcc' }).querySelector('[data-testid="mol-pack-bar"]');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('Body-centred cubic');
    expect(label).toContain('68.0%');
    expect(label).toContain('empty space');
  });

  it('keeps the reference table that was already there', () => {
    const el = crystal();
    expect(el.textContent).toContain('Simple cubic');
    expect(el.textContent).toContain('Diamond cubic');
    // Including the ionic rows the explorer deliberately does not model.
    expect(el.textContent).toContain('Cesium chloride');
  });

  it('falls back to a real structure when the stored value is junk', () => {
    for (const packLattice of ['nacl', 'banana', null, 42]) {
      const working = testid(crystal({ packLattice }), 'mol-pack-working');
      expect(working, String(packLattice)).toBeTruthy();
      expect(working).toContain('Atoms per cell:');
    }
  });

  it('never leaks NaN for any structure', () => {
    for (const packLattice of ['sc', 'bcc', 'fcc', 'hcp', 'diamond']) {
      const text = crystal({ packLattice }).textContent;
      expect(text, packLattice).not.toMatch(/(^|[\s>(:,=])NaN([\s<),;%]|$)/);
    }
  });
});
