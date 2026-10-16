import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const api = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8') + '\n' +
  readFileSync('dev-tools/skyschool-precipitation.js', 'utf8'), api);
const frame = api.getFlightPrecipitationFrame, velocity = api.getFlightRainVelocity, pulse = api.getFlightLightningPulse;
const Three = api.THREE;
const weather = Object.freeze({ type: 'stormy', wind: 30, windDir: 90 });
const state = Object.freeze({ altitude: 1000, speed: 85 });
const firstPeak = 2 + 14 * 49297 / 233280;
function finiteFrame(result) {
  for (const key of ['intensity', 'rain', 'curtain', 'droplets', 'frost', 'lightning']) {
    expect(Number.isFinite(result[key])).toBe(true); expect(result[key]).toBeGreaterThanOrEqual(0);
    expect(result[key]).toBeLessThanOrEqual(key === 'frost' ? 0.15 : 1);
  }
  expect(result.hazeMultiplier).toBeGreaterThanOrEqual(1); expect(result.hazeMultiplier).toBeLessThanOrEqual(1.3);
}

describe('shared precipitation layer policy', () => {
  it('keeps local rain in overcast and storms and gives every wet layer one continuous altitude envelope', () => {
    for (const [type, low, high] of [['overcast', 6000, 12000], ['stormy', 12000, 25000]]) {
      expect(frame({ type }, { ...state, altitude: low }).intensity).toBe(1);
      expect(frame({ type }, { ...state, altitude: high }).intensity).toBe(0);
      expect(frame({ type }, { ...state, altitude: (low + high) / 2 }).intensity).toBeCloseTo(0.5, 12);
      let previous = 1;
      for (let altitude = low - 1000; altitude <= high + 1000; altitude += 100) {
        const result = frame({ type }, { ...state, altitude }); finiteFrame(result);
        expect(result.intensity).toBeLessThanOrEqual(previous); previous = result.intensity;
        expect(result.rain).toBe(result.intensity); expect(result.curtain).toBe(result.intensity);
        expect(result.lightning).toBe(type === 'stormy' ? result.intensity : 0);
      }
      for (const altitude of [low, high]) {
        const a = frame({ type }, { ...state, altitude: altitude - 0.01 });
        const b = frame({ type }, { ...state, altitude: altitude + 0.01 });
        expect(Math.abs(a.intensity - b.intensity)).toBeLessThan(1e-10);
      }
    }
    for (const type of ['clear', 'breezy', 'gusty', 'partly_cloudy', 'foggy', 'unknown', undefined]) {
      const result = frame({ type }, state); finiteFrame(result);
      expect([result.intensity, result.rain, result.curtain, result.droplets, result.frost, result.lightning]).toEqual([0, 0, 0, 0, 0, 0]);
    }
  });

  it('treats altitude as MSL feet and leaves ordinary low-level weather behavior intact', () => {
    const original = frame(weather, state);
    expect(original).toEqual({ intensity: 1, rain: 1, curtain: 1, droplets: 1, frost: 0, lightning: 1, hazeMultiplier: 1.3 });
    expect(frame(weather, { ...state, altitude: 20000, fieldElev: 19000 })).toEqual(frame(weather, { ...state, altitude: 20000, fieldElev: 0 }));
    expect(frame(weather, { ...state, altitude: 35000 }).intensity).toBe(0);
    expect(frame(weather, { ...state, altitude: -100 })).toEqual(original);
  });

  it('keeps glass effects out of chase view and removes motion while retaining static weather cues', () => {
    const high = { altitude: 15000, speed: 85 };
    const cockpit = frame(weather, high, false, false), chase = frame(weather, high, true, false);
    expect(cockpit.droplets).toBeGreaterThan(0); expect(cockpit.frost).toBeGreaterThan(0);
    expect(chase.droplets).toBe(0); expect(chase.frost).toBe(0);
    for (const key of ['intensity', 'rain', 'curtain', 'lightning', 'hazeMultiplier']) expect(chase[key]).toBe(cockpit[key]);
    const reduced = frame(weather, high, false, true);
    expect([reduced.rain, reduced.droplets, reduced.lightning]).toEqual([0, 0, 0]);
    for (const key of ['intensity', 'curtain', 'frost', 'hazeMultiplier']) expect(reduced[key]).toBe(cockpit[key]);
    const reducedChase = frame(weather, high, true, true);
    expect(reducedChase.frost).toBe(0); expect(reducedChase.curtain).toBe(cockpit.curtain);
  });

  it('fades droplets through internal40–80ft/s speeds and haze through4000–6000ft without switches', () => {
    expect(frame(weather, { ...state, speed: 40 }).droplets).toBe(0);
    expect(frame(weather, { ...state, speed: 60 }).droplets).toBeCloseTo(0.5, 12);
    expect(frame(weather, { ...state, speed: 80 }).droplets).toBe(1);
    for (const speed of [40, 80]) {
      const before = frame(weather, { ...state, speed: speed - 0.0001 }).droplets;
      const after = frame(weather, { ...state, speed: speed + 0.0001 }).droplets;
      expect(Math.abs(before - after)).toBeLessThan(1e-10);
    }
    expect(frame(weather, { ...state, altitude: 4000 }).hazeMultiplier).toBe(1.3);
    expect(frame(weather, { ...state, altitude: 5000 }).hazeMultiplier).toBeCloseTo(1.15, 12);
    expect(frame(weather, { ...state, altitude: 6000 }).hazeMultiplier).toBe(1);
    for (const altitude of [4000, 6000]) {
      expect(Math.abs(frame(weather, { ...state, altitude: altitude - 0.01 }).hazeMultiplier -
        frame(weather, { ...state, altitude: altitude + 0.01 }).hazeMultiplier)).toBeLessThan(1e-10);
    }
  });

  it('returns finite defaults for malformed input without changing the weather or flight state', () => {
    for (const input of [undefined, null, NaN, Infinity, -Infinity, '1000']) {
      const result = frame(weather, { altitude: input, speed: input }); finiteFrame(result);
      expect(result).toEqual(frame(weather, { altitude: 0, speed: 0 }));
    }
    for (const malformed of [undefined, null, [], 'stormy', 1]) finiteFrame(frame(malformed, malformed));
    for (const altitude of [-1e300, 1e300]) finiteFrame(frame(weather, { altitude, speed: 1e300 }));
    expect(frame(weather, state)).toEqual(frame({ ...weather }, { ...state }));
    expect(weather).toEqual({ type: 'stormy', wind: 30, windDir: 90 }); expect(state).toEqual({ altitude: 1000, speed: 85 });
  });
});

describe('rain velocity uses the rendered camera basis', () => {
  it('preserves the established level-view crosswind speeds and foreground scaling', () => {
    for (const [windDir, sign] of [[90, -1], [270, 1]]) {
      const wx = { ...weather, windDir };
      const background = velocity(wx, 0), foreground = velocity(wx, 0, null, true);
      expect(background.x).toBeCloseTo(sign * 150, 10); expect(background.y).toBe(900);
      expect(foreground.x).toBeCloseTo(sign * 270, 10); expect(foreground.y).toBe(1300);
      expect(velocity(wx, 180).x).toBeCloseTo(-background.x, 10);
      expect(velocity({ ...wx, type: 'overcast' }, 0).x).toBeCloseTo(sign * 90, 10);
    }
    expect(velocity({ ...weather, wind: 0 }, 0)).toEqual({ x: 0, y: 900 });
  });

  it('rotates rainfall with bank, including sideways and inverted camera frames', () => {
    const calm = { ...weather, wind: 0 };
    const rightBank = { right: { x: 0, y: -1, z: 0 }, up: { x: 1, y: 0, z: 0 } };
    expect(velocity(calm, 0, rightBank).x).toBe(900); expect(velocity(calm, 0, rightBank).y).toBeCloseTo(0, 12);
    const inverted = { right: { x: -1, y: 0, z: 0 }, up: { x: 0, y: -1, z: 0 } };
    expect(velocity(calm, 0, inverted).y).toBe(-900);
    const pitched = { right: { x: 1, y: 0, z: 0 }, up: { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 } };
    expect(velocity({ type: 'stormy', wind: 30, windDir: 0 }, 0, pitched).y).toBeCloseTo((900 - 150) * Math.SQRT1_2, 10);
  });

  it('agrees with the bundled camera inverse rotation across heading, pitch and bank', () => {
    for (const angles of [[0, 0, 0], [0.3, 1.2, -0.6], [-0.7, -2.1, 1.1], [0, Math.PI, Math.PI]]) {
      const camera = new Three.PerspectiveCamera(60, 1, 1, 1e6);
      camera.rotation.set(...angles, 'YXZ'); camera.updateMatrixWorld(true);
      const matrix = camera.matrixWorld.elements;
      const view = { right: { x: matrix[0], y: matrix[1], z: matrix[2] }, up: { x: matrix[4], y: matrix[5], z: matrix[6] } };
      for (const foreground of [false, true]) {
        const scale = foreground ? 1.8 : 1;
        const worldVelocity = new Three.Vector3(-150 * scale, foreground ? -1300 : -900, 0);
        const projected = worldVelocity.clone().applyQuaternion(camera.quaternion.clone().invert());
        const result = velocity(weather, 123, view, foreground);
        expect(result.x).toBeCloseTo(projected.x, 9); expect(result.y).toBeCloseTo(-projected.y, 9);
      }
    }
  });

  it('uses a stable level-heading fallback for invalid views and clamps malformed wind', () => {
    const expected = velocity(weather, 90);
    for (const view of [undefined, null, {}, { right: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
      { right: { x: NaN, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } },
      { right: { x: 1, y: 0, z: 0 }, up: { x: 1, y: 0, z: 0 } }]) expect(velocity(weather, 90, view)).toEqual(expected);
    for (const wind of [NaN, Infinity, -Infinity, undefined, null, -10, '30']) expect(velocity({ ...weather, wind }, 0)).toEqual({ x: 0, y: 900 });
    expect(velocity({ ...weather, wind: 1e300 }, 0).x).toBe(-1000);
    expect(velocity(weather, NaN)).toEqual(velocity(weather, 0));
    for (const windDir of [1e300, -1e300, NaN, Infinity]) {
      const result = velocity({ ...weather, windDir }, 1e300); expect(Number.isFinite(result.x)).toBe(true); expect(Number.isFinite(result.y)).toBe(true);
    }
    const huge = { right: { x: 1e300, y: 0, z: 0 }, up: { x: 0, y: 1e300, z: 0 } };
    expect(velocity(weather, 0, huge)).toEqual(velocity(weather, 0));
  });
});

describe('occasional deterministic lightning pulse', () => {
  it('has one short smooth pulse per18 seconds and no repeating rapid flashes', () => {
    for (let cycle = 0; cycle < 5; cycle++) {
      let groups = 0, previouslyVisible = false, visibleSamples = 0, maximum = 0;
      for (let sample = 0; sample < 3600; sample++) {
        const value = pulse(cycle * 18 + sample * 0.005), visible = value > 0;
        expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
        if (visible && !previouslyVisible) groups++; previouslyVisible = visible;
        if (visible) visibleSamples++; maximum = Math.max(maximum, value);
      }
      expect(groups).toBe(1); expect(visibleSamples * 0.005).toBeCloseTo(0.35, 2); expect(maximum).toBeGreaterThan(0.998);
      expect(pulse(cycle * 18)).toBe(0); expect(pulse((cycle + 1) * 18 - 1e-6)).toBe(0);
    }
  });

  it('fades continuously into and out of a deterministic peak', () => {
    expect(pulse(firstPeak)).toBeCloseTo(1, 12);
    for (const offset of [0, 0.05, 0.10, 0.15]) expect(pulse(firstPeak - offset)).toBeCloseTo(pulse(firstPeak + offset), 12);
    for (const edge of [firstPeak - 0.175, firstPeak + 0.175]) {
      expect(pulse(edge - 1e-6)).toBeLessThan(1e-9); expect(pulse(edge + 1e-6)).toBeLessThan(1e-9);
    }
    expect(pulse(firstPeak + 0.2)).toBe(0); expect(pulse(firstPeak - 0.2)).toBe(0);
    expect(pulse(firstPeak + 1)).toBe(0); expect(pulse(firstPeak)).toBe(pulse(firstPeak));
  });

  it('rejects malformed or negative time and stays bounded for long-running simulations', () => {
    for (const time of [undefined, null, NaN, Infinity, -Infinity, -1, '5']) expect(pulse(time)).toBe(0);
    for (const time of [0, 1e6, 1e12, 1e300, Number.MAX_VALUE]) {
      const value = pulse(time); expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
    }
  });
});
