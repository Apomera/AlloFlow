import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

function advance(initial, seconds, control, step = 1) {
  let state = initial, remaining = seconds;
  while (remaining > 1e-9 && state.status === 'flying') {
    const dt = Math.min(step, remaining);
    state = P.dockingStep(state, dt, control);
    remaining -= dt;
  }
  return state;
}

function meanMotion() {
  return Math.sqrt(P.ascent.mu / (P.ascent.radius + P.docking.altitude) ** 3);
}

// Independent closed-form unforced Hill solution, x radial and y along-track.
// NASA-hosted 20050061014, equations 2.33–2.35 define this convention.
function hill(s, time) {
  const n = meanMotion(), c = Math.cos(n * time), q = Math.sin(n * time);
  return {
    x: (4 - 3 * c) * s.x + q / n * s.vx + 2 * (1 - c) / n * s.vy,
    y: 6 * (q - n * time) * s.x + s.y - 2 * (1 - c) / n * s.vx + (4 * q - 3 * n * time) / n * s.vy,
    vx: 3 * n * q * s.x + c * s.vx + 2 * q * s.vy,
    vy: 6 * n * (c - 1) * s.x - 2 * q * s.vx + (4 * c - 3) * s.vy,
  };
}

describe('Moon Mission final-approach docking dynamics', () => {
  it('uses a lunar orbital frame and carries its fuel within the ascent mass', () => {
    const s = P.dockingState();
    expect(s.y).toBe(-120);
    expect(s.x).toBe(8);
    expect(s.vy).toBe(0.55);
    expect(s.propellant).toBe(40);
    expect(P.dockingMass(s)).toBeCloseTo(P.ascentProfile().events.cutoff.mass, 6);
    expect(P.dockingMass({ ...s, propellant: 0 })).toBeCloseTo(P.dockingMass(s) - 40, 9);
    expect(P.docking.thrust).toBeCloseTo(889.644323, 6);
    expect(2 * Math.PI / meanMotion() / 60).toBeGreaterThan(118);
    expect(2 * Math.PI / meanMotion() / 60).toBeLessThan(120);
  });

  it('matches the analytic Hill solution during free coast and preserves both invariants', () => {
    const initial = { ...P.dockingState(), vx: 0.08, vy: 0.2 };
    const n = meanMotion(), momentum = initial.vy + 2 * n * initial.x;
    const energy = 0.5 * (initial.vx ** 2 + initial.vy ** 2) - 1.5 * n * n * initial.x ** 2;
    for (const seconds of [1, 10, 60, 180]) {
      const actual = advance(initial, seconds, {}), expected = hill(initial, seconds);
      for (const key of ['x', 'y', 'vx', 'vy']) expect(actual[key]).toBeCloseTo(expected[key], 9);
      expect(actual.vy + 2 * n * actual.x).toBeCloseTo(momentum, 12);
      expect(0.5 * (actual.vx ** 2 + actual.vy ** 2) - 1.5 * n * n * actual.x ** 2).toBeCloseTo(energy, 12);
      expect(actual.propellant).toBe(initial.propellant);
      expect(actual.ax).toBe(0);
      expect(actual.ay).toBe(0);
    }
  });

  it('retains relative momentum when input is released and keeps moving without fuel', () => {
    const initial = { ...P.dockingState(), propellant: 0, vx: 0.04 };
    const coast = P.dockingStep(initial, 10, { x: 0.2, y: -0.2 });
    expect(coast.status).toBe('flying');
    expect(coast.y).toBeGreaterThan(initial.y + 5);
    expect(coast.vy).toBeGreaterThan(0.54);
    expect(coast.propellant).toBe(0);
    expect(coast.ax).toBe(0);
    expect(coast.ay).toBe(0);
    const expected = hill(initial, 10);
    expect(coast.x).toBeCloseTo(expected.x, 10);
    expect(coast.vy).toBeCloseTo(expected.vy, 10);
  });

  it('spends fuel per thruster axis and clamps controls to the precision pulse duty', () => {
    const C = P.docking, s = P.dockingState(), seconds = 2;
    const oneAxis = P.dockingStep(s, seconds, { y: 0.2 });
    const bothAxes = P.dockingStep(s, seconds, { x: -0.2, y: 0.2 });
    const excessive = P.dockingStep(s, seconds, { x: -999, y: 999 });
    const expected = C.thrust * C.duty / (C.isp * P.ascent.g0) * seconds;
    expect(s.propellant - oneAxis.propellant).toBeCloseTo(expected, 10);
    expect(s.propellant - bothAxes.propellant).toBeCloseTo(2 * expected, 10);
    expect(excessive).toEqual(bothAxes);
    expect(P.dockingMass(s) - P.dockingMass(bothAxes)).toBeCloseTo(2 * expected, 9);
    expect(oneAxis.ax).toBe(0);
    expect(oneAxis.ay).toBeGreaterThan(0);
    expect(bothAxes.ax).toBeLessThan(0);
  });

  it('reproduces the rocket-equation impulse after removing Hill coupling', () => {
    const initial = { ...P.dockingState(), vy: 0.1 }, end = P.dockingStep(initial, 10, { y: 0.2 });
    const n = meanMotion();
    const measuredImpulse = end.vy + 2 * n * end.x - initial.vy - 2 * n * initial.x;
    const expectedImpulse = P.docking.isp * P.ascent.g0 * Math.log(P.dockingMass(initial) / P.dockingMass(end));
    expect(measuredImpulse).toBeCloseTo(expectedImpulse, 7);
  });

  it('splits the final pulse at fuel exhaustion then coasts for the rest of the step', () => {
    const C = P.docking, initial = { ...P.dockingState(), propellant: 0.0001 };
    const flow = C.thrust * C.duty / (C.isp * P.ascent.g0), burnSeconds = initial.propellant / flow;
    expect(burnSeconds).toBeLessThan(C.step);
    const actual = P.dockingStep(initial, 1, { y: 0.2 });
    const burned = P.dockingStep(initial, burnSeconds, { y: 0.2 });
    const expected = P.dockingStep(burned, 1 - burnSeconds, {});
    expect(actual.propellant).toBe(0);
    expect(actual.status).toBe('flying');
    expect(actual.ay).toBe(0);
    expect(actual.time).toBeCloseTo(1, 12);
    for (const key of ['x', 'y', 'vx', 'vy']) expect(actual[key]).toBeCloseTo(expected[key], 10);
    expect(P.dockingMass(initial) - P.dockingMass(actual)).toBeCloseTo(0.0001, 9);
  });

  it('guides the nominal 120 m approach to a real slow, aligned port crossing', () => {
    const initial = P.dockingState(), end = advance(initial, 600, 'guided');
    expect(end.status).toBe('docked');
    expect(end.time).toBeGreaterThan(230);
    expect(end.time).toBeLessThan(280);
    expect(end.y).toBe(0);
    expect(Math.abs(end.x)).toBeLessThan(P.docking.portTolerance);
    expect(end.vy).toBeGreaterThan(0);
    expect(end.vy).toBeLessThan(P.docking.maxClosing);
    expect(Math.abs(end.vx)).toBeLessThan(P.docking.maxLateral);
    expect(end.propellant).toBeGreaterThan(38);
    expect(end.propellant).toBeLessThan(initial.propellant);
    expect(end.ax).toBe(0);
    expect(end.ay).toBe(0);
  });

  it('grades contact speed, lateral speed and physical radial clearance', () => {
    const start = { ...P.dockingState(), x: 0, y: -0.001, vx: 0, vy: 0.1 };
    const safe = P.dockingStep(start, 1, {});
    const fast = P.dockingStep({ ...start, vy: 0.8 }, 1, {});
    const sideSlip = P.dockingStep({ ...start, vx: 0.2 }, 1, {});
    const misaligned = P.dockingStep({ ...start, x: 1 }, 1, {});
    const wide = P.dockingStep({ ...start, x: 5 }, 1, {});
    expect(safe.status).toBe('docked');
    expect(fast.status).toBe('collision');
    expect(sideSlip.status).toBe('collision');
    expect(misaligned.status).toBe('collision');
    expect(wide.status).toBe('missed');
    for (const s of [safe, fast, sideSlip, misaligned, wide]) {
      expect(s.y).toBe(0);
      expect(s.time).toBeGreaterThan(0);
      expect(s.time).toBeLessThan(0.02);
    }
    expect(P.dockingStep({ ...start, vy: -0.1 }, 1, {}).status).toBe('flying');
  });

  it('keeps terminal contacts fixed and returns a new state without mutating input', () => {
    const initial = P.dockingState(), snapshot = { ...initial };
    const next = P.dockingStep(initial, 1, 'guided');
    expect(initial).toEqual(snapshot);
    expect(next).not.toBe(initial);
    expect(next.time).toBeCloseTo(1, 10);
    for (const seconds of [0, -1, NaN, Infinity]) expect(P.dockingStep(initial, seconds, 'guided')).toEqual(initial);
    const docked = P.dockingStep({ ...initial, x: 0, y: -0.001, vx: 0, vy: 0.1 }, 1, {});
    expect(P.dockingStep(docked, 10, { y: 0.2 })).toEqual(docked);
    const failed = P.dockingStep({ ...initial, x: 0, y: -0.001, vx: 0, vy: 1 }, 1, {});
    expect(P.dockingStep(failed, 10, 'guided')).toEqual(failed);
  });

  it('converges across different rendering rates without changing the contact grade', () => {
    const results = [20, 60, 120].map((fps) => advance(P.dockingState(), 400, 'guided', 1 / fps));
    for (const end of results) {
      expect(end.status).toBe('docked');
      expect(Math.abs(end.time - results[0].time)).toBeLessThan(0.05);
      expect(Math.abs(end.x - results[0].x)).toBeLessThan(0.001);
      expect(Math.abs(end.vy - results[0].vy)).toBeLessThan(0.001);
      expect(Math.abs(end.propellant - results[0].propellant)).toBeLessThan(0.005);
    }
  });
});
