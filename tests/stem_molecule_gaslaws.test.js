// Pure-science tests for the gas-law sandbox behind the molecule tool's Gas Laws tab.
//
// WHY THESE
// The tab used to be ten formula cards. A card can print "V1/T1 = V2/T2" correctly and
// still leave a student converting 25 C to 50 C and expecting the balloon to double,
// because the card never makes them USE Kelvin. The sandbox does, so what needs pinning
// is the arithmetic underneath it and the two constants it rests on:
//
//   - PV = nRT inverts consistently, whichever of the four you solve for,
//   - molar volume falls out as 22.71 L/mol at 0 C and 1 bar (the number every
//     textbook quotes) WITHOUT that number being hard-coded anywhere,
//   - kinetic theory gives the real measured molecular speeds,
//   - the van der Waals correction pushes the right way, and vanishes when it should.
//
// Every expected value here comes from published data or an independent hand
// calculation, never from the model's own output.

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
  if (!P || !P.gasSolve) throw new Error('gas model not exposed (window.__alloMoleculePure.gasSolve)');
});

describe('PV = nRT', () => {
  it('reproduces molar volume at 0 C and 1 bar: 22.71 L/mol', () => {
    // The IUPAC standard molar volume. Nothing in the model hard-codes it - it has
    // to fall out of R and the arithmetic, which is what makes it a real check.
    const V = P.gasSolve({ P: 1, V: null, n: 1, T: 273.15 }, 'V');
    expect(V).toBeCloseTo(22.711, 2);
  });

  it('reproduces molar volume at 0 C and 1 atm: 22.41 L/mol', () => {
    const V = P.gasSolve({ P: 1.01325, V: null, n: 1, T: 273.15 }, 'V');
    expect(V).toBeCloseTo(22.414, 2);
  });

  it('inverts consistently: solving for any of the four returns the other three', () => {
    const state = { P: 2.5, V: 8, n: 0.9, T: 340 };
    // Each solve is fed the OTHER three and must land back on the value it replaced.
    expect(P.gasSolve({ ...state, P: null }, 'P')).toBeCloseTo(state.n * P.GAS_R_LBAR * state.T / state.V, 9);
    expect(P.gasSolve({ ...state, V: null }, 'V')).toBeCloseTo(state.n * P.GAS_R_LBAR * state.T / state.P, 9);

    const solvedP = P.gasSolve(state, 'P');
    expect(P.gasSolve({ ...state, P: solvedP }, 'V')).toBeCloseTo(state.V, 9);
    expect(P.gasSolve({ ...state, P: solvedP }, 'n')).toBeCloseTo(state.n, 9);
    expect(P.gasSolve({ ...state, P: solvedP }, 'T')).toBeCloseTo(state.T, 9);
  });

  it('is Boyle: halving the volume doubles the pressure at fixed T and n', () => {
    const p1 = P.gasSolve({ P: null, V: 10, n: 1, T: 300 }, 'P');
    const p2 = P.gasSolve({ P: null, V: 5, n: 1, T: 300 }, 'P');
    expect(p2 / p1).toBeCloseTo(2, 9);
  });

  it('is Charles in KELVIN, not Celsius - the mistake the tab exists to kill', () => {
    // 25 C -> 50 C. The thermometer reading doubles; the volume goes up ~8%.
    const v25 = P.gasSolve({ P: 1, V: null, n: 1, T: 25 + 273.15 }, 'V');
    const v50 = P.gasSolve({ P: 1, V: null, n: 1, T: 50 + 273.15 }, 'V');
    expect(v50 / v25).toBeCloseTo(1.0839, 3);
    expect(v50 / v25).toBeLessThan(1.1);
    expect(v50 / v25).not.toBeCloseTo(2, 1);
  });

  it('is Avogadro: molar volume does not care which gas it is', () => {
    // Same T and P, same volume per mole - the ideal law never asks about the molecule.
    const a = P.gasSolve({ P: 1, V: null, n: 1, T: 300 }, 'V');
    const b = P.gasSolve({ P: 1, V: null, n: 2, T: 300 }, 'V');
    expect(b / a).toBeCloseTo(2, 9);
  });

  it('uses the L-bar gas constant, and the bar-to-atm conversion is right', () => {
    expect(P.GAS_R_LBAR).toBeCloseTo(0.083145, 6);
    expect(1 * P.ATM_PER_BAR).toBeCloseTo(0.98692, 4);
  });
});

describe('kinetic theory: the speeds are the real measured ones', () => {
  it('N2 at 25 C moves at about 515 m/s', () => {
    expect(P.gasRmsSpeed(28.014, 298.15)).toBeCloseTo(515, 0);
  });

  it('He at 25 C moves at about 1363 m/s', () => {
    expect(P.gasRmsSpeed(4.0026, 298.15)).toBeCloseTo(1363, 0);
  });

  it('speed grows as the SQUARE ROOT of temperature, not linearly', () => {
    // Another quiet misconception: "twice as hot, twice as fast". It is not.
    const cold = P.gasRmsSpeed(28.014, 300);
    const hot = P.gasRmsSpeed(28.014, 600);
    expect(hot / cold).toBeCloseTo(Math.SQRT2, 6);
    expect(hot / cold).not.toBeCloseTo(2, 1);
  });

  it('uses the SI gas constant for speeds - the g/mol to kg/mol conversion is present', () => {
    expect(P.GAS_R_SI).toBeCloseTo(8.3145, 3);
    // Dropping the /1000 would inflate every speed by sqrt(1000) ~ 31.6x.
    expect(P.gasRmsSpeed(28.014, 298.15)).toBeLessThan(2000);
  });

  it("Graham's law: helium effuses sqrt(7) ~ 2.65x faster than nitrogen", () => {
    expect(P.gasEffusionRatio(4.0026, 28.014)).toBeCloseTo(2.6458, 3);
    expect(P.gasEffusionRatio(4.0026, 28.014)).toBeCloseTo(Math.sqrt(28.014 / 4.0026), 9);
  });

  it("Graham's ratio is symmetric and self-consistent with the speeds", () => {
    expect(P.gasEffusionRatio(28.014, 4.0026)).toBeCloseTo(1 / P.gasEffusionRatio(4.0026, 28.014), 9);
    // The ratio must agree with the speed model at any single temperature.
    const T = 298.15;
    expect(P.gasRmsSpeed(4.0026, T) / P.gasRmsSpeed(28.014, T)).toBeCloseTo(P.gasEffusionRatio(4.0026, 28.014), 6);
  });
});

describe('van der Waals: where the ideal law stops telling the truth', () => {
  const CO2 = { a: 3.640, b: 0.0427 };

  it('agrees with the ideal law when the gas is dilute and warm', () => {
    const ideal = P.gasSolve({ P: null, V: 50, n: 0.1, T: 1000 }, 'P');
    const real = P.gasVanDerWaals(0.1, 50, 1000, CO2.a, CO2.b);
    expect(Math.abs(real - ideal) / ideal).toBeLessThan(0.001);
  });

  it('predicts LOWER pressure than ideal when molecules are close enough to attract', () => {
    // Attraction dominates at moderate density: molecules pull each other back from
    // the walls, so the real gas pushes less hard than the ideal law claims.
    const ideal = P.gasSolve({ P: null, V: 1, n: 1, T: 300 }, 'P');
    const real = P.gasVanDerWaals(1, 1, 300, CO2.a, CO2.b);
    expect(real).toBeLessThan(ideal);
  });

  it('deviates further for CO2 than for helium at identical conditions', () => {
    // CO2 molecules attract each other far more strongly than helium atoms do, so
    // this ordering is the physical content of the "a" constant.
    const ideal = P.gasSolve({ P: null, V: 1, n: 1, T: 300 }, 'P');
    const co2Gap = Math.abs(P.gasVanDerWaals(1, 1, 300, CO2.a, CO2.b) - ideal);
    const heGap = Math.abs(P.gasVanDerWaals(1, 1, 300, 0.0346, 0.0238) - ideal);
    expect(co2Gap).toBeGreaterThan(heGap);
  });

  it('stays finite across the whole range the sliders can reach', () => {
    for (const V of [0.5, 1, 5, 22.71, 50]) {
      for (const T of [100, 300, 600, 1000]) {
        for (const n of [0.1, 1, 5]) {
          const p = P.gasVanDerWaals(n, V, T, CO2.a, CO2.b);
          expect(Number.isFinite(p), 'vdW at V=' + V + ' T=' + T + ' n=' + n).toBe(true);
          const ideal = P.gasSolve({ P: null, V, n, T }, 'P');
          expect(Number.isFinite(ideal)).toBe(true);
          expect(ideal).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('deploy parity', () => {
  it('keeps the two live copies byte-identical', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_molecule.js'), 'utf8');
    const deploy = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_molecule.js'), 'utf8');
    expect(deploy).toBe(source);
  });
});
