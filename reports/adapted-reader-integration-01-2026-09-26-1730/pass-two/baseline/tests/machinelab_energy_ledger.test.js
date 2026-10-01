import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;

// A mid-range trebuchet the tests share, so a change in one number is visible
// everywhere it matters rather than hidden behind per-test fixtures.
function machine(overrides = {}) {
  return Object.assign({
    g: 9.81,
    cwMass: 1200, cwDrop: 3.2,
    beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.24,
    releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
    etaMech: 0.85, drag: true
  }, overrides);
}

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

describe('Machine Lab: stored energy', () => {
  it('is the counterweight potential energy, M g h', () => {
    expect(M.storedEnergy(1200, 3.2, 9.81)).toBeCloseTo(1200 * 3.2 * 9.81, 6);
  });

  it('rejects a machine that stores nothing', () => {
    expect(M.storedEnergy(0, 3.2, 9.81)).toBeNull();
    expect(M.storedEnergy(1200, 0, 9.81)).toBeNull();
  });
});

describe('Machine Lab: the winch buys force, not energy', () => {
  it('leaves stored energy, muzzle speed and range untouched when gearing changes', () => {
    // This is the misconception the range view exists to break: students expect
    // a bigger winch to throw further.
    const light = M.shot(machine({ winchPulleys: 1, winchHandleR: 0.2 }));
    const heavy = M.shot(machine({ winchPulleys: 6, winchHandleR: 0.8 }));

    expect(light.stored).toBe(heavy.stored);
    expect(light.muzzleV).toBe(heavy.muzzleV);
    expect(light.range).toBe(heavy.range);
    expect(light.muzzleKE).toBe(heavy.muzzleKE);
  });

  it('does change the crank force and the number of turns', () => {
    const light = M.shot(machine({ winchPulleys: 1, winchHandleR: 0.2 }));
    const heavy = M.shot(machine({ winchPulleys: 6, winchHandleR: 0.8 }));

    expect(heavy.winchMA).toBeGreaterThan(light.winchMA);
    expect(heavy.crankForce).toBeLessThan(light.crankForce);
    expect(heavy.crankDistance).toBeGreaterThan(light.crankDistance);
  });

  it('keeps total crank work constant across every gearing', () => {
    const works = [1, 2, 3, 4, 5, 6].map(
      (p) => M.shot(machine({ winchPulleys: p })).crankWork
    );
    for (const w of works) {
      expect(w).toBeCloseTo(works[0], 6);
    }
  });

  it('charges the student for winch friction and never returns more than it stores', () => {
    const s = M.shot(machine());
    expect(s.crankWork).toBeGreaterThan(s.stored);
    expect(s.crankWork).toBeCloseTo(s.stored / 0.85, 6);
  });

  it('refuses an efficiency above 1 rather than inventing energy', () => {
    expect(M.crankWork(1000, 1.5)).toBeNull();
  });
});

describe('Machine Lab: the energy chain only ever loses', () => {
  it('orders the stages crank > stored > muzzle > impact', () => {
    const s = M.shot(machine());
    expect(s.crankWork).toBeGreaterThan(s.stored);
    expect(s.stored).toBeGreaterThan(s.muzzleKE);
    expect(s.muzzleKE).toBeGreaterThan(s.impactKE);
  });

  it('makes muzzle KE exactly the stored energy times the transfer efficiency', () => {
    const s = M.shot(machine());
    expect(s.muzzleKE).toBeCloseTo(s.stored * s.eta, 6);
  });

  it('keeps transfer efficiency strictly between 0 and 1', () => {
    for (const projMass of [1, 5, 25, 80, 200]) {
      const s = M.shot(machine({ projMass }));
      expect(s.eta).toBeGreaterThan(0);
      expect(s.eta).toBeLessThan(1);
    }
  });
});

describe('Machine Lab: the light-stone / heavy-stone trade', () => {
  it('makes a lighter stone faster but a heavier stone more efficient', () => {
    const lightStone = M.shot(machine({ projMass: 5 }));
    const heavyStone = M.shot(machine({ projMass: 120 }));

    expect(lightStone.muzzleV).toBeGreaterThan(heavyStone.muzzleV);
    expect(lightStone.eta).toBeLessThan(heavyStone.eta);
  });

  it('increases delivered muzzle energy monotonically with projectile mass', () => {
    let prev = -Infinity;
    for (const projMass of [1, 5, 10, 25, 50, 100, 200, 400]) {
      const ke = M.shot(machine({ projMass })).muzzleKE;
      expect(ke).toBeGreaterThan(prev);
      prev = ke;
    }
  });

  it('puts maximum RANGE at an interior mass once air resistance is on', () => {
    // The sweet spot exists because of drag. A very light stone leaves fast and
    // bleeds it off immediately; a very heavy one never gets going.
    const masses = [1, 2, 5, 10, 20, 40, 80, 160, 320];
    const ranges = masses.map((projMass) => M.shot(machine({ projMass, drag: true })).range);
    const best = ranges.indexOf(Math.max(...ranges));
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(masses.length - 1);
  });

  it('has NO interior optimum in a vacuum, where lighter is always further', () => {
    // Worth pinning: the sweet spot is a fact about air, not about levers. The
    // g9-12 copy makes exactly this claim.
    const masses = [1, 2, 5, 10, 20, 40, 80, 160, 320];
    const ranges = masses.map((projMass) => M.shot(machine({ projMass, drag: false })).range);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]).toBeLessThan(ranges[i - 1]);
    }
  });
});

describe('Machine Lab: effective mass', () => {
  it('grows with a heavier arm, so more energy is wasted swinging it', () => {
    const lightArm = M.effectiveMass(10, 1200, 4.5, 1.2, 2.0);
    const heavyArm = M.effectiveMass(200, 1200, 4.5, 1.2, 2.0);
    expect(heavyArm).toBeGreaterThan(lightArm);
  });

  it('shrinks as the sling lengthens, because the payload swings wider', () => {
    const shortSling = M.effectiveMass(60, 1200, 4.5, 1.2, 0.5);
    const longSling = M.effectiveMass(60, 1200, 4.5, 1.2, 3.5);
    expect(longSling).toBeLessThan(shortSling);
  });

  it('is never negative and never null for a sane machine', () => {
    expect(M.effectiveMass(60, 1200, 4.5, 1.2, 2.0)).toBeGreaterThan(0);
    expect(M.effectiveMass(0, 1200, 4.5, 1.2, 2.0)).toBeGreaterThan(0);
  });

  it('returns null rather than NaN for impossible geometry', () => {
    expect(M.effectiveMass(60, 1200, 0, 1.2, 2.0)).toBeNull();
    expect(M.effectiveMass(60, 0, 4.5, 1.2, 2.0)).toBeNull();
  });
});
