import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const SIZES = [280, 390, 1100].flatMap(width => [320, 460].map(height => [width, height]));
let P;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function sample(overrides = {}) {
  return { pitch: 0, radialSpeed: 0, tangentialSpeed: 0, speed: 0,
    angle: 0, altitude: 0, downrange: 0, engineOn: true, thrust: 15600, ...overrides };
}
function expectPoint(point, x, y) {
  expect(point.x).toBeCloseTo(x, 12);
  expect(point.y).toBeCloseTo(y, 12);
}
function finiteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finiteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteNumbers);
}
function canvasRecorder() {
  const calls = [];
  const gradient = (...args) => {
    finiteNumbers(args);
    calls.push(['gradient', ...args]);
    return { addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      finiteNumbers(args);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => {
      if (typeof value === 'number') finiteNumbers(value);
      target[key] = value;
      calls.push(['set', key, value]);
      return true;
    },
  });
  return { ctx, calls };
}
function hasShaft(calls, geometry, vector, length) {
  const x = geometry.cx + vector.x * length, y = geometry.cy + vector.y * length;
  return calls.some((call, index) => call[0] === 'moveTo' &&
    Math.abs(call[1] - geometry.cx) < 1e-9 && Math.abs(call[2] - geometry.cy) < 1e-9 &&
    calls[index + 1]?.[0] === 'lineTo' && Math.abs(calls[index + 1][1] - x) < 1e-9 &&
    Math.abs(calls[index + 1][2] - y) < 1e-9);
}

describe('lunar ascent flight director in the local vertical frame', () => {
  it('keeps local pitch and velocity independent of launch-tangent rotation and lunar position', () => {
    const baseline = sample({ pitch: Math.PI / 6, radialSpeed: 3, tangentialSpeed: 4 });
    const geometry = P.ascentFlightDirectorGeometry(390, 460, baseline);
    expect(geometry.view).toBe('local-attitude');
    expectPoint(geometry.axis, 0.5, -Math.sqrt(3) / 2);
    expectPoint(geometry.velocity, 4 / 5, -3 / 5);
    expect(geometry.pitchDeg).toBeCloseTo(30, 12);
    expect(geometry.pathAngleDeg).toBeCloseTo(Math.atan2(3, 4) * 180 / Math.PI, 12);
    for (const angle of [-0.57, 0.174661, 1.5]) {
      expect(P.ascentFlightDirectorGeometry(390, 460, { ...baseline, angle,
        altitude: 20000, downrange: 99999999 })).toEqual(geometry);
    }
  });

  it('points velocity into every quadrant, including descending and reversed along-track motion', () => {
    // Expected vectors use the known 3-4-5 triangle; angles are signed from
    // the local along-track horizon, independently of spacecraft pitch.
    for (const [radialSpeed, tangentialSpeed, x, y, degrees] of [
      [3, 4, 0.8, -0.6, 36.86989764584402],
      [-3, 4, 0.8, 0.6, -36.86989764584402],
      [3, -4, -0.8, -0.6, 143.13010235415598],
      [-3, -4, -0.8, 0.6, -143.13010235415598],
      [5, 0, 0, -1, 90], [-5, 0, 0, 1, -90], [0, -5, -1, 0, 180],
    ]) {
      const g = P.ascentFlightDirectorGeometry(390, 460,
        sample({ pitch: -0.4, radialSpeed, tangentialSpeed }));
      expect(g.speed).toBe(5);
      expectPoint(g.velocity, x, y);
      expect(Math.hypot(g.velocity.x, g.velocity.y)).toBeCloseTo(1, 12);
      expect(g.pathAngleDeg).toBeCloseTo(degrees, 12);
      expect(g.velocity.x * tangentialSpeed - g.velocity.y * radialSpeed).toBeCloseTo(5, 12);
    }
  });

  it('computes speed and path from measured components instead of stale speed metadata', () => {
    const measured = sample({ radialSpeed: 48, tangentialSpeed: 64, pitch: 0.7 });
    const expected = P.ascentFlightDirectorGeometry(390, 460, measured);
    expect(expected.speed).toBe(80);
    expectPoint(expected.velocity, 0.8, -0.6);
    for (const speed of [0, -100, 999999, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(P.ascentFlightDirectorGeometry(390, 460, { ...measured, speed })).toEqual(expected);
    }
  });

  it('preserves signed pitch beyond 90 degrees without clamping or rotating the local horizon', () => {
    for (const [degrees, x, y] of [[135, Math.SQRT1_2, Math.SQRT1_2],
      [225, -Math.SQRT1_2, Math.SQRT1_2], [-45, -Math.SQRT1_2, -Math.SQRT1_2],
      [390, 0.5, -Math.sqrt(3) / 2]]) {
      const g = P.ascentFlightDirectorGeometry(390, 460,
        sample({ pitch: degrees * Math.PI / 180, radialSpeed: 0, tangentialSpeed: 100 }));
      expect(g.pitchDeg).toBeCloseTo(degrees, 12);
      expectPoint(g.axis, x, y);
      expectPoint(g.thrust, x, y);
      expectPoint(g.velocity, 1, 0);
      expect(g.pathAngleDeg).toBe(0);
      expect(Math.hypot(g.axis.x, g.axis.y)).toBeCloseTo(1, 12);
    }
  });

  it('omits the velocity direction and path angle at rest and at the numerical speed threshold', () => {
    const exhausted = P.ascentProfile({ propellant: 0 });
    expect(exhausted.summary.duration).toBe(0);
    for (const state of [sample(), sample({ radialSpeed: 1e-9, tangentialSpeed: 0 }),
      sample({ radialSpeed: 0, tangentialSpeed: 1e-8 }),
      P.ascentSample(exhausted, 0)]) {
      const recorder = canvasRecorder();
      const g = P.drawAscentFlightDirector(recorder.ctx, 390, 460, state);
      expect(g.velocity).toBeNull();
      expect(g.pathAngleDeg).toBeNull();
      expect(g.speed).toBeLessThanOrEqual(1e-8);
      finiteNumbers(g);
      expect(recorder.calls.some(row => row[0] === 'fillText')).toBe(true);
      if (state.engineOn === false) {
        expect(g.engineVisible).toBe(false);
        expect(g.thrust).toBeNull();
      }
    }
    const moving = P.ascentFlightDirectorGeometry(390, 460,
      sample({ radialSpeed: 2e-8, tangentialSpeed: 0 }));
    expectPoint(moving.velocity, 0, -1);
    expect(moving.pathAngleDeg).toBe(90);
  });

  it('shows thrust only when the engine flag is strictly true and measured thrust is positive', () => {
    const baseline = sample({ pitch: 0.6, radialSpeed: 30, tangentialSpeed: 50 });
    for (const [engineOn, thrust, firing] of [[true, 0.01, true], [true, 15600, true],
      [true, 0, false], [true, -1, false], [true, Number.NaN, false],
      [false, 15600, false], [1, 15600, false], ['true', 15600, false],
      [undefined, 15600, false], [null, 15600, false]]) {
      const g = P.ascentFlightDirectorGeometry(390, 460, { ...baseline, engineOn, thrust });
      expect(g.engineVisible).toBe(firing);
      if (firing) {
        expect(g.thrust).toEqual(g.axis);
        expect(g.thrust).not.toBe(g.axis);
      } else expect(g.thrust).toBeNull();
      expectPoint(g.axis, Math.sin(0.6), -Math.cos(0.6));
      expectPoint(g.velocity, 50 / Math.hypot(30, 50), -30 / Math.hypot(30, 50));
    }
  });

  it('uses real interpolated flight samples and retains the body axis and velocity at cutoff', () => {
    const profile = P.ascentProfile(), duration = profile.summary.duration;
    for (const time of [0, 4.125, 15, 120.375, 300.125, duration - 0.001, duration]) {
      const state = P.ascentSample(profile, time);
      const g = P.ascentFlightDirectorGeometry(390, 460, state);
      const speed = Math.hypot(state.radialSpeed, state.tangentialSpeed);
      expect(g.pitchDeg).toBeCloseTo(state.pitch * 180 / Math.PI, 12);
      expect(g.speed).toBeCloseTo(speed, 12);
      expectPoint(g.axis, Math.sin(state.pitch), -Math.cos(state.pitch));
      expect(g.engineVisible).toBe(state.engineOn === true && state.thrust > 0);
      if (speed > 1e-8) {
        expectPoint(g.velocity, state.tangentialSpeed / speed, -state.radialSpeed / speed);
        expect(g.pathAngleDeg).toBeCloseTo(Math.atan2(state.radialSpeed, state.tangentialSpeed) * 180 / Math.PI, 12);
      } else {
        expect(g.velocity).toBeNull();
        expect(g.pathAngleDeg).toBeNull();
      }
      finiteNumbers(g);
      if (time === duration) {
        expect(state.engineOn).toBe(false);
        expect(g.engineVisible).toBe(false);
        expect(g.thrust).toBeNull();
        expect(g.velocity).not.toBeNull();
        expect(Math.hypot(g.axis.x, g.axis.y)).toBeCloseTo(1, 12);
      }
    }
  });

  it('returns detached deterministic geometry and leaves frozen input unchanged during drawing', () => {
    const state = Object.freeze(sample({ pitch: 0.61, radialSpeed: 28, tangentialSpeed: 117 }));
    const before = JSON.stringify(state);
    const expected = P.ascentFlightDirectorGeometry(390, 460, state);
    const first = P.ascentFlightDirectorGeometry(390, 460, state);
    expect(first).toEqual(expected);
    first.axis.x = -999;
    first.velocity.y = -999;
    first.thrust.x = -999;
    expect(P.ascentFlightDirectorGeometry(390, 460, state)).toEqual(expected);
    const a = canvasRecorder(), b = canvasRecorder();
    expect(P.drawAscentFlightDirector(a.ctx, 390, 460, state)).toEqual(expected);
    P.drawAscentFlightDirector(canvasRecorder().ctx, 1100, 320,
      sample({ pitch: 2.1, radialSpeed: -60, tangentialSpeed: -20, engineOn: false }));
    expect(P.drawAscentFlightDirector(b.ctx, 390, 460, state)).toEqual(expected);
    expect(a.calls).toEqual(b.calls);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('fits the same local compass and fixed illustrative arrow lengths on phone and desktop canvases', () => {
    const state = sample({ pitch: 0.72, radialSpeed: 24, tangentialSpeed: 32 });
    const expected = P.ascentFlightDirectorGeometry(390, 460, state);
    expect(expected.cx).toBe(66);
    expect(expected.cy).toBe(96);
    expect(expected.radius).toBe(44);
    expect(expected.axisLength).toBe(40);
    expect(expected.velocityLength).toBe(32);
    expect(expected.thrustLength).toBe(24);
    for (const [width, height] of SIZES) {
      const recorder = canvasRecorder();
      const g = P.drawAscentFlightDirector(recorder.ctx, width, height, state);
      expect(g).toEqual(expected);
      expect(g.cx - g.radius).toBeGreaterThanOrEqual(0);
      expect(g.cx + g.radius).toBeLessThan(width);
      expect(g.cy - g.radius).toBeGreaterThanOrEqual(0);
      expect(g.cy + g.radius).toBeLessThan(height);
      for (const [vector, length] of [[g.axis, g.axisLength], [g.velocity, g.velocityLength],
        [g.thrust, g.thrustLength]]) {
        expect(g.cx + vector.x * length).toBeGreaterThanOrEqual(0);
        expect(g.cx + vector.x * length).toBeLessThan(width);
        expect(g.cy + vector.y * length).toBeGreaterThanOrEqual(0);
        expect(g.cy + vector.y * length).toBeLessThan(height);
      }
      finiteNumbers(g);
      expect(recorder.calls.some(call => call[0] === 'arc' &&
        call[1] === g.cx && call[2] === g.cy && call[3] === g.radius)).toBe(true);
    }
  });

  it('draws measured arrow shafts and numeric labels while keeping the body axis after engine cutoff', () => {
    const state = sample({ pitch: 35 * Math.PI / 180, radialSpeed: 3, tangentialSpeed: 4 });
    for (const engineOn of [true, false]) {
      const recorder = canvasRecorder();
      const g = P.drawAscentFlightDirector(recorder.ctx, 390, 460, { ...state, engineOn });
      expect(hasShaft(recorder.calls, g, g.axis, g.axisLength)).toBe(true);
      expect(hasShaft(recorder.calls, g, g.velocity, g.velocityLength)).toBe(true);
      const thrustAxis = { x: Math.sin(state.pitch), y: -Math.cos(state.pitch) };
      expect(hasShaft(recorder.calls, g, thrustAxis, g.thrustLength)).toBe(engineOn);
      const text = recorder.calls.filter(row => row[0] === 'fillText').map(row => String(row[1]));
      expect(text.some(value => /35(?:\.0)?/.test(value))).toBe(true);
      expect(text.some(value => /36\.9|37(?:\.0)?/.test(value))).toBe(true);
      expect(text.join(' ')).not.toMatch(/NaN|Infinity|undefined/);
      finiteNumbers(g);
    }
    const atRest = canvasRecorder();
    const resting = P.drawAscentFlightDirector(atRest.ctx, 390, 460,
      sample({ engineOn: false, thrust: 0 }));
    expect(hasShaft(atRest.calls, resting, resting.axis, resting.axisLength)).toBe(true);
    expect(hasShaft(atRest.calls, resting, { x: 1, y: 0 }, resting.velocityLength)).toBe(false);
  });
});
