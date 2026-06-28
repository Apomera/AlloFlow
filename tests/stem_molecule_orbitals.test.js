// Pure-science tests for the molecule tool's atomic-orbital model (the "clouds, not
// orbits" enhancement). The canvas cloud is Canvas-smoke-only, but the hydrogen-like
// wavefunctions underneath are exact and fully checkable here: the 1s probability peaks
// at the Bohr radius, 2s has a radial node at r=2 a₀, p orbitals vanish at the nucleus
// and have a nodal plane, and node counts obey total = n−1.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; }, getRegisteredTools: function () { return []; } };
  delete window.__alloMoleculePure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_molecule.js'), 'utf8'))();
  P = window.__alloMoleculePure;
  if (!P) throw new Error('molecule orbital hook not exposed (window.__alloMoleculePure)');
});

describe('Molecule — atomic orbitals (the quantum picture, not the Bohr cartoon)', () => {
  it('node counts obey total = n−1, angular = ℓ, radial = n−ℓ−1', () => {
    expect(P.orbNodes('1s')).toEqual({ radial: 0, angular: 0, total: 0 });
    expect(P.orbNodes('2s')).toEqual({ radial: 1, angular: 0, total: 1 });
    expect(P.orbNodes('2p')).toEqual({ radial: 0, angular: 1, total: 1 });
    expect(P.orbNodes('3s')).toEqual({ radial: 2, angular: 0, total: 2 });
    expect(P.orbNodes('3p')).toEqual({ radial: 1, angular: 1, total: 2 });
    expect(P.orbNodes('3d')).toEqual({ radial: 0, angular: 2, total: 2 });
  });

  it('the 1s electron is MOST likely at the Bohr radius (1 a₀), not at the nucleus', () => {
    expect(P.orbPeakRadius('1s')).toBeCloseTo(1.0, 1);          // radial distribution peaks at a₀ — the Bohr radius emerges
    expect(P.orbRadialDistribution('1s', 0)).toBe(0);          // r²R² = 0 at r=0 (the electron is spread over a shell, not sitting on the nucleus)
    // |ψ|² itself is densest at the nucleus and falls off with distance (1s is monotone, no nodes)
    expect(P.orbDensity('1s', 0, 0, 0.5)).toBeGreaterThan(P.orbDensity('1s', 0, 0, 2));
  });

  it('the 2p radial distribution peaks at 4 a₀', () => {
    expect(P.orbPeakRadius('2p')).toBeCloseTo(4.0, 1);
  });

  it('the 2s orbital has a RADIAL NODE at r = 2 a₀ where the phase flips sign', () => {
    expect(Math.abs(P.orbRadial('2s', 2))).toBeLessThan(1e-9);  // R_2s(2) = 0 exactly
    expect(P.orbPsi('2s', 1, 0, 0)).toBeGreaterThan(0);         // inner lobe: one phase
    expect(P.orbPsi('2s', 3, 0, 0)).toBeLessThan(0);            // outer lobe: opposite phase
  });

  it('p orbitals vanish at the nucleus and have a nodal PLANE (a dumbbell, not a ball)', () => {
    expect(P.orbRadial('2p', 0)).toBe(0);                       // no density at the nucleus
    expect(P.orbDensity('2p', 0, 0, 1)).toBeGreaterThan(0);     // lobes along the z axis
    expect(P.orbDensity('2p', 1, 0, 0)).toBeCloseTo(0, 12);     // the xy-plane (z=0) is a node — electron never found there
    expect(P.orbDensity('2p', 0, 1, 0)).toBeCloseTo(0, 12);
  });

  it('the 3d (d_xy) cloverleaf has two nodal PLANES (x=0 and y=0) and 4 lobes between the axes', () => {
    expect(P.orbDensity('3d', 1, 0, 0)).toBeCloseTo(0, 9);      // y=0 plane → xy=0 → node
    expect(P.orbDensity('3d', 0, 1, 0)).toBeCloseTo(0, 9);      // x=0 plane → xy=0 → node
    expect(P.orbDensity('3d', 1.5, 1.5, 0)).toBeGreaterThan(0); // a lobe points between the x and y axes
  });

  it('the 3s phase flips across its inner radial node (positive near 0, negative by r=4)', () => {
    expect(P.orbPsi('3s', 1, 0, 0)).toBeGreaterThan(0);
    expect(P.orbPsi('3s', 4, 0, 0)).toBeLessThan(0);
  });

  it('higher shells reach farther out (most-probable radius grows with n)', () => {
    expect(P.orbPeakRadius('3s')).toBeGreaterThan(P.orbPeakRadius('1s'));
    expect(P.orbPeakRadius('2p')).toBeGreaterThan(P.orbPeakRadius('1s'));
    expect(P.ORBITAL_ORDER).toEqual(['1s', '2s', '2p', '3s', '3p', '3d']);
  });
});
