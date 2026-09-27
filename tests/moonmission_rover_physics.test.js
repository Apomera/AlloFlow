import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const flat = () => 0;
const terrain = (x, z) => 0.035 * Math.sin(x * 2) + 0.045 * Math.cos(z * 2.3);
function fly(hz, ground = terrain) {
  const st = P.roverState(0, ground(0, 0), 0, 0.4);
  const tracks = [], impacts = [];
  // Control changes occur at the same active seconds at every display frequency.
  for (const input of [{ forward: true }, { forward: true, left: true }, { back: true }, {}]) {
    for (let i = 0; i < hz * 2; i++) {
      P.roverStep(st, input, 1 / hz, ground);
      tracks.push(...st.tracks.map((p) => [p.x, p.z, p.heading]));
      impacts.push(...st.impacts.map((p) => [p.strength, p.x, p.z]));
    }
  }
  return { st, tracks, impacts };
}

describe('Moon Mission rover production physics', () => {
  it('drives the same path at 8–144 fps, including terrain contact, springs and wheel spin', () => {
    const baseline = fly(120);
    for (const hz of [8, 12, 20, 30, 60, 144]) {
      const result = fly(hz);
      for (const key of ['heading', 'speed', 'steer', 'distance', 'wheelSpin', 'slip', 'grade', 'crossSlope', 'impactSpring', 'impactSpringVelocity', 'impactCount', 'elapsed']) {
        expect(result.st[key], hz + ' fps: ' + key).toBeCloseTo(baseline.st[key], 10);
      }
      expect(result.st.position).toEqual(baseline.st.position);
      expect(result.st.rotation).toEqual(baseline.st.rotation);
      expect(result.st.wheels).toEqual(baseline.st.wheels);
      expect(result.tracks).toEqual(baseline.tracks);
      expect(result.impacts).toEqual(baseline.impacts);
      expect(result.st.elapsed).toBeCloseTo(8, 10);
    }
    expect(baseline.st.distance).toBeGreaterThan(15);
  });

  it('carries fractional steps and admits a bounded one-second visible stall', () => {
    const st = P.roverState();
    P.roverStep(st, { forward: true }, 1 / 240, flat);
    expect(st.elapsed).toBe(0);
    expect(st.position.z).toBe(0);
    P.roverStep(st, { forward: true }, 1 / 240, flat);
    expect(st.elapsed).toBeCloseTo(1 / 120, 12);
    expect(st.speed).toBeGreaterThan(0);
    P.roverStep(st, {}, 40, flat);
    expect(st.elapsed).toBeCloseTo(1 + 1 / 120, 12);
    const after = { ...st.position };
    const elapsed = st.elapsed;
    for (const dt of [0, -1, NaN, Infinity]) P.roverStep(st, { forward: true }, dt, flat);
    expect(st.position).toEqual(after);
    expect(st.elapsed).toBe(elapsed);
  });

  it('holds shallow grades at rest and rolls downhill with the correct sign on steeper terrain', () => {
    for (const grade of [0, 0.18, -0.18]) {
      const st = P.roverState();
      const ground = (x, z) => -grade * z;
      for (let i = 0; i < 60; i++) P.roverStep(st, {}, 0.1, ground);
      expect(st.speed).toBe(0);
      expect(st.distance).toBe(0);
      expect(st.slip).toBe(0);
      expect(st.impactCount).toBe(0);
    }
    const uphill = P.roverState(), downhill = P.roverState();
    P.roverStep(uphill, {}, 1, (x, z) => -0.6 * z);
    P.roverStep(downhill, {}, 1, (x, z) => 0.6 * z);
    expect(uphill.speed).toBeLessThan(0);
    expect(downhill.speed).toBeGreaterThan(0);
    expect(uphill.speed).toBeCloseTo(-downhill.speed, 12);
  });

  it('limits tractive acceleration on loaded slopes and braking stops before reversing', () => {
    const level = P.roverState(), loaded = P.roverState();
    P.roverStep(level, { forward: true }, 1 / 120, flat);
    P.roverStep(loaded, { forward: true }, 1 / 120, (x, z) => 0.65 * x - 0.65 * z);
    expect(loaded.speed).toBeLessThan(level.speed);
    expect(loaded.slip).toBeGreaterThan(level.slip);
    const stop = P.roverState(); stop.speed = 0.002;
    P.roverStep(stop, { back: true }, 1 / 120, flat);
    expect(stop.speed).toBe(0);
    P.roverStep(stop, { back: true }, 1 / 120, flat);
    expect(stop.speed).toBeLessThan(0);
  });

  it('respects forward/reverse steering and prevents distance from accumulating against the boundary', () => {
    const forward = P.roverState(), reverse = P.roverState();
    forward.speed = 2; reverse.speed = -2;
    P.roverStep(forward, { left: true }, 0.2, flat);
    P.roverStep(reverse, { left: true }, 0.2, flat);
    expect(forward.heading).toBeGreaterThan(0);
    expect(reverse.heading).toBeLessThan(0);
    const wall = P.roverState(0, 0, -92, 0);
    P.roverStep(wall, { forward: true }, 1, flat);
    expect(wall.position.z).toBe(-92);
    expect(wall.speed).toBe(0);
    expect(wall.distance).toBe(0);
    expect(wall.tracks).toHaveLength(0);
  });

  it('places multiple track samples along a slow frame path without stacking them at the final pose', () => {
    const st = P.roverState(); st.speed = 6.2;
    P.roverStep(st, { forward: true }, 1, flat);
    expect(st.tracks.length).toBeGreaterThan(5);
    expect(new Set(st.tracks.map((p) => p.z)).size).toBe(st.tracks.length);
    expect(st.tracks[0].z).toBeGreaterThan(st.tracks[st.tracks.length - 1].z);
    expect(st.tracks[0].z - st.position.z).toBeGreaterThan(4);
  });

  it('dissipates suspension spring energy at the same rate after an impulse', () => {
    const outcomes = [8, 60, 144].map((hz) => {
      const st = P.roverState(); st.impactSpringVelocity = -0.16;
      let peak = 0;
      for (let i = 0; i < hz * 2; i++) {
        P.roverStep(st, {}, 1 / hz, flat);
        peak = Math.max(peak, Math.abs(st.impactSpring));
      }
      expect(peak).toBeLessThan(0.09);
      expect(Math.abs(st.impactSpring)).toBeLessThan(0.0001);
      expect(st.impactCount).toBe(0);
      return st;
    });
    expect(outcomes[0].impactSpring).toBeCloseTo(outcomes[2].impactSpring, 12);
    expect(outcomes[0].impactSpringVelocity).toBeCloseTo(outcomes[2].impactSpringVelocity, 12);
  });

  it('detects real wheel contacts at the same terrain locations at low and high frame rates', () => {
    const bump = (x, z) => 0.13 * Math.exp(-Math.pow((z + 2) / 0.18, 2));
    const events = [8, 30, 120, 144].map((hz) => {
      const st = P.roverState(0, bump(0, 0), 0, 0), contacts = [];
      for (let i = 0; i < hz * 3; i++) {
        P.roverStep(st, { forward: true }, 1 / hz, bump);
        contacts.push(...st.impacts.map((p) => [p.strength, p.x, p.z]));
        expect(st.groundedWheels).toBeGreaterThanOrEqual(0);
        expect(st.groundedWheels).toBeLessThanOrEqual(4);
        for (const wheel of st.wheels) {
          expect(wheel.position.y).toBeGreaterThanOrEqual(0.11);
          expect(wheel.position.y).toBeLessThanOrEqual(0.34);
        }
      }
      expect(contacts.length).toBeGreaterThan(0);
      return contacts;
    });
    for (const contacts of events.slice(1)) expect(contacts).toEqual(events[0]);
    const idle = P.roverState(0, bump(0, -2), -2, 0);
    for (let i = 0; i < 24; i++) P.roverStep(idle, {}, 1 / 8, bump);
    expect(idle.impactCount).toBe(0);
  });
});
