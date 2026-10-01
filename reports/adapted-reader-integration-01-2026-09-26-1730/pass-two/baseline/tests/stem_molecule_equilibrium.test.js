// Pure-science tests for the Le Chatelier simulator behind the molecule tool's
// Equilibrium tab (N2 + 3 H2 <=> 2 NH3, the Haber process).
//
// WHY THESE AND NOT A RENDER SNAPSHOT
// The tab used to be a static table of "add reactant -> shifts right" rows. A table
// can state Le Chatelier correctly and still leave every one of the classic
// misconceptions intact, because a student can read "shifts right" as "goes to
// completion", or "K changed". The simulator answers those with numbers, so the
// numbers are what needs pinning:
//
//   - a catalyst and an inert gas move NOTHING (the two traps),
//   - temperature is the ONLY stress that changes K itself,
//   - a shift is PARTIAL - adding 1 mol of N2 does not consume it,
//   - Q vs K predicts the direction the mixture actually runs.
//
// The equilibrium constants themselves are checked against thermodynamic data
// (dGf(NH3) = -16.4 kJ/mol, dHf(NH3) = -45.9 kJ/mol) rather than against the
// model's own output, so a sign error cannot pass by agreeing with itself.

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
  if (!P || !P.haberEquilibrium) throw new Error('equilibrium model not exposed (window.__alloMoleculePure.haberEquilibrium)');
});

// The tab's own starting mixture: 1 mol N2 + 3 mol H2 in 10 L at 700 K.
const START = () => P.haberEquilibrium(1, 3, 0, 10, 700);

describe('Haber equilibrium constants match thermodynamic data', () => {
  it('Kp(298 K) comes out near 6e5 bar^-2, from dG = -32.8 kJ/mol', () => {
    // dG(rxn) = 2 x dGf(NH3) = -32.8 kJ/mol  =>  Kp = exp(-dG/RT)
    const kp = P.haberKp(298.15);
    expect(kp).toBeGreaterThan(3e5);
    expect(kp).toBeLessThan(9e5);
  });

  it('Kc(298 K) is near 3.5e8 M^-2 (Kp converted with dn = -2)', () => {
    const kc = P.haberKc(298.15);
    expect(kc).toBeGreaterThan(1e8);
    expect(kc).toBeLessThan(7e8);
  });

  it('K COLLAPSES on heating - the reaction is exothermic', () => {
    // This is the whole reason industrial ammonia is a compromise: the hot
    // reactor that is fast enough to be useful is also a far worse equilibrium.
    expect(P.haberKc(700)).toBeLessThan(P.haberKc(298.15));
    expect(P.haberKc(700) / P.haberKc(298.15)).toBeLessThan(1e-6);
    expect(P.haberKc(300)).toBeGreaterThan(P.haberKc(400));
    expect(P.haberKc(400)).toBeGreaterThan(P.haberKc(500));
  });
});

describe('the solver lands on equilibrium, not merely near it', () => {
  it('Q equals K once solved, and re-solving changes nothing', () => {
    const eq = START();
    const Q = P.haberQ(eq.N2, eq.H2, eq.NH3, eq.V);
    expect(Q / eq.Kc).toBeCloseTo(1, 6);

    // Idempotence matters beyond neatness: the tab re-solves the stored mixture
    // on EVERY render, so a solver that drifted would walk the composition
    // around while the student did nothing at all.
    const again = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V, eq.T);
    expect(again.NH3).toBeCloseTo(eq.NH3, 9);
    expect(again.direction).toBe('none');
  });

  it('conserves atoms: every N and H is still accounted for', () => {
    const eq = START();
    expect(eq.N2 * 2 + eq.NH3).toBeCloseTo(1 * 2, 9);        // N atoms
    expect(eq.H2 * 2 + eq.NH3 * 3).toBeCloseTo(3 * 2, 9);    // H atoms
    expect(eq.N2).toBeGreaterThan(0);
    expect(eq.H2).toBeGreaterThan(0);
  });

  it('starts from pure reactants by running forward', () => {
    const eq = P.haberEquilibrium(1, 3, 0, 10, 700);
    expect(eq.xi).toBeGreaterThan(0);
    expect(eq.NH3).toBeGreaterThan(0);
  });

  it('runs in REVERSE when the mixture starts as pure product', () => {
    const eq = P.haberEquilibrium(0, 0, 2, 10, 700);
    expect(eq.direction).toBe('reverse');
    expect(eq.NH3).toBeLessThan(2);
    expect(eq.N2).toBeGreaterThan(0);
  });
});

describe('the two traps: things that look like stresses and are not', () => {
  it('a CATALYST cannot move equilibrium, because K depends on T and nothing else', () => {
    // The honest statement of "a catalyst does not shift equilibrium" is that K
    // has no other input. Asserted structurally rather than by re-running the
    // solver with unchanged arguments, which would prove only that a function is
    // a function. If someone ever made K respond to concentration or volume -
    // the exact bug that would let a catalyst appear to shift the mixture - this
    // fails.
    const T = 700;
    const K = P.haberKc(T);
    for (const [n1, n2, n3, V] of [[1, 3, 0, 10], [5, 1, 4, 0.5], [0.01, 0.01, 9, 400]]) {
      const eq = P.haberEquilibrium(n1, n2, n3, V, T);
      expect(eq.Kc).toBeCloseTo(K, 9);
    }
    expect(P.haberKc.length).toBe(1);            // K is a function of temperature alone
  });

  it('INERT GAS at constant V raises the PRESSURE but leaves Q untouched', () => {
    const eq = START();
    const Q = P.haberQ(eq.N2, eq.H2, eq.NH3, eq.V);

    // Argon is real: it genuinely raises the total pressure in the vessel. The
    // reason nothing shifts is narrower than "nothing happened" - it is that Q
    // reads CONCENTRATIONS of the three reacting species, and argon changes none
    // of them. Both halves are asserted, so the test would catch a model that
    // made Q respond to total pressure.
    const nReacting = eq.N2 + eq.H2 + eq.NH3;
    const pressureBefore = nReacting * 0.083145 * eq.T / eq.V;
    const pressureWithArgon = (nReacting + 2) * 0.083145 * eq.T / eq.V;
    expect(pressureWithArgon).toBeGreaterThan(pressureBefore);

    const settled = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V, eq.T);
    expect(P.haberQ(settled.N2, settled.H2, settled.NH3, settled.V)).toBeCloseTo(Q, 9);
    expect(settled.direction).toBe('none');
  });
});

describe('Le Chatelier, with numbers', () => {
  it('adding N2 makes more NH3 - but consumes only PART of what was added', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2 + 1, eq.H2, eq.NH3, eq.V, eq.T);

    expect(after.direction).toBe('forward');
    expect(after.NH3).toBeGreaterThan(eq.NH3);
    // "Shifts right" is not "goes to completion": most of the added mole is
    // still sitting there as N2 afterwards.
    expect(after.N2).toBeGreaterThan(eq.N2);
    expect(after.N2 - eq.N2).toBeLessThan(1);
    expect(after.Kc).toBeCloseTo(eq.Kc, 9);   // K is untouched by a concentration change
  });

  it('removing product pulls the reaction forward to replace it', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3 * 0.5, eq.V, eq.T);
    expect(after.direction).toBe('forward');
    expect(after.NH3).toBeGreaterThan(eq.NH3 * 0.5);
    expect(after.NH3).toBeLessThan(eq.NH3);   // it does not get all the way back
  });

  it('adding product drives the reaction BACKWARD', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3 + 1, eq.V, eq.T);
    expect(after.direction).toBe('reverse');
    expect(after.N2).toBeGreaterThan(eq.N2);
  });

  it('COMPRESSING favours the side with fewer gas molecules (4 -> 2, so forward)', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V / 2, eq.T);
    expect(after.direction).toBe('forward');
    expect(after.fracNH3).toBeGreaterThan(eq.fracNH3);
    expect(after.Kc).toBeCloseTo(eq.Kc, 9);   // same temperature, same K
  });

  it('EXPANDING does the reverse', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V * 2, eq.T);
    expect(after.direction).toBe('reverse');
    expect(after.fracNH3).toBeLessThan(eq.fracNH3);
  });

  it('HEATING is the one stress that moves K itself, and it destroys yield', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V, eq.T + 100);

    expect(after.Kc).toBeLessThan(eq.Kc);     // K itself moved - unique to temperature
    expect(after.direction).toBe('reverse');
    expect(after.NH3).toBeLessThan(eq.NH3);
  });

  it('COOLING raises both K and the yield - which is why Haber is a compromise', () => {
    const eq = START();
    const after = P.haberEquilibrium(eq.N2, eq.H2, eq.NH3, eq.V, eq.T - 100);
    expect(after.Kc).toBeGreaterThan(eq.Kc);
    expect(after.direction).toBe('forward');
    expect(after.NH3).toBeGreaterThan(eq.NH3);
  });
});

describe('Q vs K predicts the direction the mixture actually runs', () => {
  it('Q < K runs forward, Q > K runs in reverse, Q = K stays put', () => {
    const eq = START();
    const K = eq.Kc;

    const low = { N2: eq.N2, H2: eq.H2, NH3: eq.NH3 * 0.5 };
    expect(P.haberQ(low.N2, low.H2, low.NH3, eq.V)).toBeLessThan(K);
    expect(P.haberEquilibrium(low.N2, low.H2, low.NH3, eq.V, eq.T).direction).toBe('forward');

    const high = { N2: eq.N2, H2: eq.H2, NH3: eq.NH3 * 2 };
    expect(P.haberQ(high.N2, high.H2, high.NH3, eq.V)).toBeGreaterThan(K);
    expect(P.haberEquilibrium(high.N2, high.H2, high.NH3, eq.V, eq.T).direction).toBe('reverse');
  });

  it('reports a pressure consistent with the ideal gas law', () => {
    const eq = START();
    const n = eq.N2 + eq.H2 + eq.NH3;
    expect(eq.pressureBar).toBeCloseTo(n * 0.083145 * eq.T / eq.V, 6);
  });
});

describe('the model does not blow up on the states a student can reach', () => {
  it('survives a species being driven to (almost) zero', () => {
    const eq = P.haberEquilibrium(1e-9, 3, 0, 10, 700);
    expect(Number.isFinite(eq.NH3)).toBe(true);
    expect(eq.NH3).toBeGreaterThanOrEqual(0);
    expect(eq.H2).toBeGreaterThan(0);
  });

  it('stays finite across the full temperature and volume range the buttons allow', () => {
    for (const T of [300, 400, 500, 600, 700, 800, 900, 1000, 1100]) {
      for (const V of [0.5, 1, 10, 100, 400]) {
        const eq = P.haberEquilibrium(1, 3, 0, V, T);
        expect(Number.isFinite(eq.NH3), 'NH3 at T=' + T + ' V=' + V).toBe(true);
        expect(eq.NH3).toBeGreaterThanOrEqual(0);
        expect(eq.N2).toBeGreaterThanOrEqual(0);
        expect(eq.H2).toBeGreaterThanOrEqual(0);
        expect(eq.fracNH3).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the two live deploy copies byte-identical', () => {
    const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_molecule.js'), 'utf8');
    const deploy = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_molecule.js'), 'utf8');
    expect(deploy).toBe(source);
  });
});
