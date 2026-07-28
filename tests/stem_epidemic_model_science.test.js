// Science invariants for the Epidemic Lab's models.
//
// These are the properties a student is entitled to assume while sweeping the sliders,
// and none of them were pinned before. Each test corresponds to something that was
// actually wrong:
//   - the compartments did not have to sum to the population
//   - the outbreak map's spread had no arithmetic relationship to R₀
//   - Kindergarten was served the 3-5 reading level
//   - a hospitalisation and a death were literally the same number

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let C;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__EpidemicCore;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_epidemic.js'), 'utf8'))();
  C = window.__EpidemicCore;
  if (!C || !C.solveSIR) throw new Error('model core not exposed (window.__EpidemicCore)');
});

describe('SIR / SEIR conservation', () => {
  // Every compartment was clamped to [0,1] on its own, so a large R0 could make an
  // Euler step overshoot and the population silently grew or shrank.
  it('S + I + R stays at 100% of the population across the whole R0 range', () => {
    [0.5, 1, 2.5, 6, 12, 18].forEach((r0) => {
      const data = C.solveSIR({ r0, vaccRate: 0, infectPeriod: 10, popSize: 1000000 });
      data.forEach((row) => {
        expect(row.S + row.I + row.R, `R0=${r0} day ${row.day}`).toBeCloseTo(100, 6);
      });
    });
  });

  it('S + E + I + R stays at 100% too', () => {
    [1.3, 2.5, 15].forEach((r0) => {
      const data = C.solveSEIR({ r0, vaccRate: 0, infectPeriod: 8, latentPeriod: 5, popSize: 1000000 });
      data.forEach((row) => {
        expect(row.S + row.E + row.I + row.R, `R0=${r0} day ${row.day}`).toBeCloseTo(100, 6);
      });
    });
  });

  it('holds with vaccination seeded into the recovered compartment', () => {
    const data = C.solveSIR({ r0: 8, vaccRate: 80, infectPeriod: 14, popSize: 1000000 });
    data.forEach((row) => expect(row.S + row.I + row.R).toBeCloseTo(100, 6));
  });

  it('no compartment ever goes negative', () => {
    const data = C.solveSIR({ r0: 12, vaccRate: 0, infectPeriod: 2, popSize: 1000000 });
    data.forEach((row) => {
      expect(row.S).toBeGreaterThanOrEqual(0);
      expect(row.I).toBeGreaterThanOrEqual(0);
      expect(row.R).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('SIR epidemic threshold', () => {
  it('R0 below 1 does not produce an outbreak', () => {
    const data = C.solveSIR({ r0: 0.6, vaccRate: 0, infectPeriod: 10, popSize: 1000000 });
    const peak = Math.max(...data.map((r) => r.I));
    expect(peak).toBeLessThan(0.2); // never climbs meaningfully above the 0.1% seed
  });

  it('R0 above 1 does', () => {
    const data = C.solveSIR({ r0: 3, vaccRate: 0, infectPeriod: 10, popSize: 1000000 });
    expect(Math.max(...data.map((r) => r.I))).toBeGreaterThan(10);
  });

  it('vaccinating past the herd-immunity threshold suppresses the peak', () => {
    const r0 = 4;                       // threshold = 1 - 1/4 = 75%
    const below = C.solveSIR({ r0, vaccRate: 60, infectPeriod: 10, popSize: 1000000 });
    const above = C.solveSIR({ r0, vaccRate: 80, infectPeriod: 10, popSize: 1000000 });
    const peakBelow = Math.max(...below.map((r) => r.I));
    const peakAbove = Math.max(...above.map((r) => r.I));
    expect(peakAbove).toBeLessThan(peakBelow);
    expect(peakAbove).toBeLessThan(0.2);  // above threshold the seed just decays
  });
});

describe('Outbreak map rates track R0', () => {
  // The map used a flat 15% recovery per step and an arbitrary r0 * 0.08 infection
  // chance, so its dynamics had nothing to do with the R0 the rest of the tool teaches.
  it('a case lasts as long as the Infectious Period slider says', () => {
    expect(C.gridRates(2.5, 10).pRecover).toBeCloseTo(0.1, 6);
    expect(C.gridRates(2.5, 4).pRecover).toBeCloseTo(0.25, 6);
  });

  it('expected secondary infections per case come out at R0', () => {
    [1.3, 2.5, 5, 8].forEach((r0) => {
      [4, 10, 21].forEach((period) => {
        const { pInfect, pRecover } = C.gridRates(r0, period);
        // 8 neighbours per step, 1/pRecover steps while infectious.
        expect(pInfect * 8 * (1 / pRecover), `r0=${r0} period=${period}`).toBeCloseTo(r0, 6);
      });
    });
  });

  it('an R0 of zero cannot spread and probabilities stay in range', () => {
    expect(C.gridRates(0, 10).pInfect).toBe(0);
    const extreme = C.gridRates(100, 30);
    expect(extreme.pInfect).toBeLessThanOrEqual(0.95);
    expect(extreme.pRecover).toBeGreaterThan(0);
  });
});

describe('Grade banding', () => {
  it('Kindergarten gets the K-2 wording, not 3-5', () => {
    // "Kindergarten" parses to NaN and the old `|| 5` fallback dropped the youngest
    // students into the 3-5 band — the one audience the K-2 copy exists for.
    ['Kindergarten', 'K', 'kindergarten', 'Pre-K'].forEach((g) => {
      expect(C.getGradeBand({ gradeLevel: g }), g).toBe('K-2');
    });
  });

  it('numbered grades still land in their own band', () => {
    expect(C.getGradeBand({ gradeLevel: '1st Grade' })).toBe('K-2');
    expect(C.getGradeBand({ gradeLevel: '5th Grade' })).toBe('3-5');
    expect(C.getGradeBand({ gradeLevel: '7' })).toBe('6-8');
    expect(C.getGradeBand({ gradeLevel: '11th Grade' })).toBe('9-12');
  });

  it('an unreadable grade level still returns a usable band', () => {
    expect(C.getGradeBand({})).toBe('3-5');
    expect(C.getGradeBand({ gradeLevel: 'mixed ages' })).toBe('3-5');
  });
});

describe('Severity is not mortality', () => {
  it('only a fraction of severe cases are deaths', () => {
    // The campaign used the severe-case rate directly as the death rate, so the debrief
    // reported every hospitalisation as a death in absolute human counts.
    expect(C.SEVERE_CASE_FATALITY).toBeGreaterThan(0);
    expect(C.SEVERE_CASE_FATALITY).toBeLessThan(1);
  });
});
