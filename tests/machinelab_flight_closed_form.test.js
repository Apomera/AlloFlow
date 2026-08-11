import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// The integrator is pinned to the analytic vacuum solution rather than to
// stem_tool_physics.js. A mathematical identity cannot drift, and nobody can
// make a failing test pass by matching a bug. See MACHINE_LAB_SPEC.md 5.4.
describe('Machine Lab: drag-free flight reproduces the closed form', () => {
  const cases = [
    { v0: 40, angle: 45 },
    { v0: 40, angle: 30 },
    { v0: 40, angle: 60 },
    { v0: 12, angle: 15 },
    { v0: 95, angle: 52 },
    { v0: 7, angle: 80 }
  ];

  for (const c of cases) {
    it(`matches R, h_max and t_f at v0=${c.v0} theta=${c.angle}`, () => {
      const g = 9.81;
      const got = M.integrateFlight({ v0: c.v0, angleDeg: c.angle, g, y0: 0, drag: false });
      const want = M.vacuum(c.v0, c.angle, g);

      expect(got.range / want.range).toBeCloseTo(1, 4);
      expect(got.apex / want.apex).toBeCloseTo(1, 3);
      expect(got.flightTime / want.flightTime).toBeCloseTo(1, 4);
    });
  }

  it('lands 45 degrees furthest of all angles in a vacuum', () => {
    let best = null, bestAngle = null;
    for (let a = 5; a <= 85; a += 5) {
      const r = M.integrateFlight({ v0: 40, angleDeg: a, g: 9.81, y0: 0, drag: false }).range;
      if (best === null || r > best) { best = r; bestAngle = a; }
    }
    expect(bestAngle).toBe(45);
  });

  it('gives complementary angles the same range in a vacuum', () => {
    const a = M.integrateFlight({ v0: 40, angleDeg: 30, g: 9.81, y0: 0, drag: false }).range;
    const b = M.integrateFlight({ v0: 40, angleDeg: 60, g: 9.81, y0: 0, drag: false }).range;
    expect(a / b).toBeCloseTo(1, 3);
  });

  it('scales range with the square of launch speed', () => {
    const r1 = M.integrateFlight({ v0: 20, angleDeg: 45, g: 9.81, y0: 0, drag: false }).range;
    const r2 = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 0, drag: false }).range;
    expect(r2 / r1).toBeCloseTo(4, 2);
  });

  it('throws further under lower gravity, by the inverse ratio', () => {
    const earth = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 0, drag: false }).range;
    const moon = M.integrateFlight({ v0: 40, angleDeg: 45, g: 1.62, y0: 0, drag: false }).range;
    expect(moon / earth).toBeCloseTo(9.81 / 1.62, 2);
  });
});

describe('Machine Lab: drag-on flight holds the weaker invariants', () => {
  const withDrag = (over = {}) => M.integrateFlight(Object.assign({
    v0: 60, angleDeg: 45, g: 9.81, y0: 0,
    drag: true, mass: 25, diameter: 0.24
  }, over));

  it('never travels as far as the vacuum solution', () => {
    const got = withDrag();
    const want = M.vacuum(60, 45, 9.81);
    expect(got.range).toBeLessThan(want.range);
  });

  it('arrives slower than it left', () => {
    const got = withDrag();
    expect(got.impactSpeed).toBeLessThan(60);
  });

  it('loses less range as the projectile gets denser for the same size', () => {
    const feather = withDrag({ mass: 2 });
    const boulder = withDrag({ mass: 400 });
    const vac = M.vacuum(60, 45, 9.81).range;
    expect(feather.range / vac).toBeLessThan(boulder.range / vac);
  });

  it('makes the optimum angle shallower than 45 degrees', () => {
    // A standard, checkable consequence of drag.
    let best = null, bestAngle = null;
    for (let a = 20; a <= 70; a += 1) {
      const r = withDrag({ angleDeg: a }).range;
      if (best === null || r > best) { best = r; bestAngle = a; }
    }
    expect(bestAngle).toBeLessThan(45);
  });

  it('drifts downwind and only downwind', () => {
    const still = withDrag({ windZ: 0 });
    const breeze = withDrag({ windZ: 12 });
    expect(Math.abs(still.drift)).toBeLessThan(1e-6);
    expect(breeze.drift).toBeGreaterThan(0);
  });
});

describe('Machine Lab: launch height and integrator hygiene', () => {
  it('flies further when launched from higher up', () => {
    const ground = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 0, drag: false });
    const tower = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 20, drag: false });
    expect(tower.range).toBeGreaterThan(ground.range);
    expect(tower.flightTime).toBeGreaterThan(ground.flightTime);
  });

  it('always terminates at the ground rather than running out of steps', () => {
    const r = M.integrateFlight({ v0: 300, angleDeg: 89, g: 9.81, y0: 0, drag: false });
    expect(r.landed).toBe(true);
    expect(r.apex).toBeGreaterThan(0);
  });

  it('is insensitive to the step size, so the number is the physics not the mesh', () => {
    const coarse = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 0, drag: false, dt: 0.004 });
    const fine = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 0, drag: false, dt: 0.00025 });
    expect(coarse.range / fine.range).toBeCloseTo(1, 3);
  });

  it('returns a sampled path that starts at the launch point and ends on the ground', () => {
    const r = M.integrateFlight({ v0: 40, angleDeg: 45, g: 9.81, y0: 3, drag: false });
    expect(r.path.length).toBeGreaterThan(10);
    expect(r.path[0].y).toBe(3);
    expect(r.path[r.path.length - 1].y).toBe(0);
    expect(r.path.length).toBeLessThan(500);
  });

  it('returns null rather than NaN for a shot that cannot exist', () => {
    expect(M.integrateFlight({ v0: 0, angleDeg: 45 })).toBeNull();
    expect(M.integrateFlight({ v0: 40, angleDeg: NaN })).toBeNull();
    expect(M.vacuum(40, 45, 0)).toBeNull();
  });
});
