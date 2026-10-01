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

describe('Simulation controls', () => {
  it('honors a custom horizon and starting infected seed', () => {
    const sir = C.solveSIR({ r0: 1, vaccRate: 0, infectPeriod: 10, popSize: 1000000, simDays: 60, initialInfectedPct: 2 });
    expect(sir[sir.length - 1].day).toBe(60);
    expect(sir[0].I).toBeCloseTo(2, 6);
    expect(sir[0].S + sir[0].I + sir[0].R).toBeCloseTo(100, 6);

    const seir = C.solveSEIR({ r0: 1, vaccRate: 0, infectPeriod: 10, latentPeriod: 5, popSize: 1000000, simDays: 90, initialInfectedPct: 2 });
    expect(seir[seir.length - 1].day).toBe(90);
    expect(seir[0].E + seir[0].I).toBeCloseTo(2, 6);
    expect(seir[0].S + seir[0].E + seir[0].I + seir[0].R).toBeCloseTo(100, 6);
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

describe('Stochastic ensemble', () => {
  it('is seeded, finite, and returns a nonzero middle-80 band', () => {
    const params = { r0: 3, vaccRate: 0, infectPeriod: 10, popSize: 100000, simDays: 40, initialInfectedPct: 0.5, runs: 12, seed: 17 };
    const first = C.solveSIRStochastic(params);
    const second = C.solveSIRStochastic(params);
    expect(first).toEqual(second);
    expect(first.runs).toBe(12);
    expect(first.data).toHaveLength(41);
    expect(first.data[0].mean).toBeCloseTo(0.5, 6);
    expect(first.data.some((row) => row.upper > row.lower)).toBe(true);
    first.data.forEach((row) => {
      expect(Number.isFinite(row.lower)).toBe(true);
      expect(row.lower).toBeLessThanOrEqual(row.mean);
      expect(row.mean).toBeLessThanOrEqual(row.upper);
    });
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

describe('Pathogen-aware map profiles', () => {
  it('exposes distinct illustrative transmission profiles and spatial features', () => {
    expect(C.PATHOGEN_PROFILES.map((p) => p.id)).toEqual(['respiratory', 'measles', 'waterborne', 'vector']);
    const respiratory = C.pathogenGridRates(2.5, 10, 'respiratory');
    const measles = C.pathogenGridRates(2.5, 10, 'measles');
    const lowExposure = C.pathogenGridRates(2.5, 10, 'respiratory', 0);
    const highExposure = C.pathogenGridRates(2.5, 10, 'respiratory', 100);
    expect(measles.pInfect).toBeGreaterThan(respiratory.pInfect);
    expect(highExposure.pInfect).toBeGreaterThan(lowExposure.pInfect);
    expect(C.isPathogenFeature(12, 0, 20, 'waterborne')).toBe(true);
    expect(C.isPathogenFeature(0, 7, 20, 'vector')).toBe(true);
    expect(C.getPathogenInterventions('waterborne')[0].id).toBe('sanitation');
    const baseline = C.pathogenGridRates(2.5, 10, 'respiratory', 50, {});
    const controlled = C.pathogenGridRates(2.5, 10, 'respiratory', 50, { ventilation: true, masking: true });
    expect(controlled.pInfect).toBeLessThan(baseline.pInfect);
  });
});describe('Clinical map states', () => {
  it('counts exposed and hospitalized cells and advances them', () => {
    const counts = C.countGrid([['S', 'E', 'I'], ['H', 'R', 'D']]);
    expect(counts).toMatchObject({ S: 1, E: 1, I: 1, H: 1, R: 1, D: 1, total: 6 });
    const next = C.stepGrid([['E', 'H']], 2.5, [], 10, 'respiratory', 50, {});
    expect(next[0][0]).toBe('I');
    expect(['H', 'R']).toContain(next[0][1]);
  });
});describe('Map outcome summaries', () => {
  it('tracks peaks, capacity overload, new infections, and containment', () => {
    const summary = C.summarizeMapHistory([
      { S: 95, E: 2, I: 3, H: 0, R: 0, total: 100 },
      { S: 80, E: 4, I: 10, H: 4, R: 2, total: 100 },
      { S: 75, E: 0, I: 0, H: 0, R: 25, total: 100 }
    ], 2);
    expect(summary).toMatchObject({
      days: 2,
      peakInfectious: 10,
      peakInfectiousDay: 1,
      peakHospitalized: 4,
      peakHospitalizedDay: 1,
      overloadDays: 1,
      newInfections: 20,
      containmentDay: 2,
      contained: true,
      finalActive: 0
    });
    expect(summary.attackRate).toBeCloseTo(20, 6);
  });
});
describe('Seeded paired map experiments', () => {
  const scenario = { gridSize: 10, density: 0.8, initialInfected: 3 };

  it('replays the same initial grid for one seed and changes it for another', () => {
    const first = C.createGrid(scenario, 20, 1234);
    const replay = C.createGrid(scenario, 20, 1234);
    const alternate = C.createGrid(scenario, 20, 1235);
    expect(replay).toEqual(first);
    expect(alternate).not.toEqual(first);
    expect(C.countGrid(first).I).toBe(3);
  });

  it('normalizes seeds and produces coordinate-keyed draws independent of call order', () => {
    expect(C.normalizeMapSeed(-12.9)).toBe(12);
    expect(C.normalizeMapSeed(0)).toBe(20260812);
    const first = C.mapEventRandom(77, 4, 2, 3, 1, 20);
    C.mapEventRandom(77, 4, 9, 9, 0, 30);
    expect(C.mapEventRandom(77, 4, 2, 3, 1, 20)).toBe(first);
    expect(C.mapEventRandom(77, 5, 2, 3, 1, 20)).not.toBe(first);
  });

  it('keeps paired no-intervention trajectories identical at every day', () => {
    let actual = C.createGrid(scenario, 10, 9090);
    let baseline = actual.map((row) => row.slice());
    for (let day = 1; day <= 20; day++) {
      const context = { seed: 9090, day };
      actual = C.stepGrid(actual, 3, [], 8, 'respiratory', 60, {}, context);
      baseline = C.stepGrid(baseline, 3, [], 8, 'respiratory', 60, {}, context);
      expect(actual, `day ${day}`).toEqual(baseline);
    }
  });

  it('does not invent initial cases when every occupied cell is immune', () => {
    const grid = C.createGrid({ gridSize: 8, density: 1, initialInfected: 5 }, 100, 404);
    expect(C.countGrid(grid)).toMatchObject({ S: 0, I: 0, R: 64, total: 64 });
  });

  it('reports signed outcome differences against the matched baseline', () => {
    const actual = [
      { S: 95, E: 2, I: 3, H: 0, R: 0, total: 100 },
      { S: 85, E: 2, I: 7, H: 2, R: 4, total: 100 },
      { S: 82, E: 0, I: 0, H: 0, R: 18, total: 100 },
    ];
    const baseline = [
      { S: 95, E: 2, I: 3, H: 0, R: 0, total: 100 },
      { S: 70, E: 5, I: 15, H: 5, R: 5, total: 100 },
      { S: 65, E: 0, I: 0, H: 0, R: 35, total: 100 },
    ];
    expect(C.compareMapHistories(actual, baseline, 2)).toMatchObject({
      casesAvoided: 17,
      peakInfectiousAvoided: 8,
      peakHospitalizedAvoided: 3,
      overloadDaysAvoided: 1,
    });
    expect(C.compareMapHistories(baseline, actual, 2).casesAvoided).toBe(-17);
  });

  it('detects the operating-system reduced-motion preference', () => {
    const previous = window.matchMedia;
    try {
      window.matchMedia = () => ({ matches: true });
      expect(C.epidemicPrefersReducedMotion()).toBe(true);
      window.matchMedia = () => ({ matches: false });
      expect(C.epidemicPrefersReducedMotion()).toBe(false);
    } finally {
      if (previous) window.matchMedia = previous;
      else delete window.matchMedia;
    }
  });
});
describe('NPI effective reproduction number', () => {
  it('includes the susceptible fraction created by vaccination', () => {
    const result = C.solveSIR_NPI({ r0: 4, vaccRate: 75, infectPeriod: 10, popSize: 1000000 }, []);
    expect(result.interventionR0).toBeCloseTo(4, 6);
    expect(result.effR0).toBeCloseTo(0.996, 3);
  });

  it('combines vaccination and intervention effects', () => {
    const result = C.solveSIR_NPI({ r0: 4, vaccRate: 50, infectPeriod: 10, popSize: 1000000 }, ['masks']);
    expect(result.effR0).toBeCloseTo(1.1976, 3);
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
