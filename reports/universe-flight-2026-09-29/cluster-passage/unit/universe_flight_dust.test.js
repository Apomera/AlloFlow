import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, math, scene, telemetry, pauses, frames, now, frameId, uploads;
beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight; math = flight.math;
});
beforeEach(() => {
  scene = null; telemetry = null; pauses = []; frames = new Map(); now = 100; frameId = 0;
  uploads = { texture: 0, buffer: 0 };
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

const cloud = (changes = {}) => ({ id: 'test-cloud', position: [0, 0, 0], radii: [3, 2, 1.5], densityPerLy: 0.3, ...changes });
const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
// Sample density in world space without ray/ellipsoid intersections or the
// renderer's polynomial antiderivative.
function numericalDepth(observer, source, clouds, steps = 32768) {
  const distance = Math.hypot(...source.map((value, index) => value - observer[index]));
  let sum = 0;
  for (let index = 0; index <= steps; index++) {
    const point = mix(observer, source, index / steps); let density = 0;
    for (const item of clouds) {
      const q = point.reduce((total, value, axis) => total + ((value - item.position[axis]) / item.radii[axis]) ** 2, 0);
      density += item.densityPerLy * Math.max(0, 1 - q) ** 2;
    }
    sum += density * (index === 0 || index === steps ? 1 : index % 2 ? 4 : 2);
  }
  return sum * distance / (3 * steps);
}
function expectDepthClose(actual, expected, tolerance = 2e-9) {
  expect(Number.isFinite(actual)).toBe(true); expect(actual).toBeGreaterThanOrEqual(0);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.max(1, expected));
}
function createScene() {
  const constants = new Map();
  const gl = new Proxy({}, {
    get(_, key) {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'texImage2D') return () => uploads.texture++;
      if (key === 'bufferData') return () => uploads.buffer++;
      if (String(key).startsWith('create')) return () => ({});
      if (String(key).toUpperCase() === key) {
        if (!constants.has(key)) constants.set(key, constants.size + 1);
        return constants.get(key);
      }
      return () => {};
    },
  });
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, { onTelemetry(value) { telemetry = value; }, onPause(message, detail) { pauses.push({ message, detail }); } });
}
function advance(milliseconds = 16) {
  now += milliseconds; const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
}
function launch(dust = true) {
  scene.set({ mode: 'explore', region: 'neighborhood', flybyRate: 1, pauseAtHighlights: false, dust });
  expect(scene.startFlyby('stellar')).toBe(true); advance(); expect(scene.seekFlyby(10)).toBe(true);
}
function withoutDust(snapshot) {
  const comparable = structuredClone(snapshot); delete comparable.settings.dust; return comparable;
}

describe('Universe flight dust preference lifecycle', () => {
  it('saves both boolean states and restores legacy views with dust enabled', () => {
    createScene(); expect(scene.snapshot().settings.dust).toBe(true);
    for (const dust of [false, true]) {
      scene.set({ dust }); const saved = scene.snapshot();
      expect(saved.version).toBe(1); expect(saved.settings.dust).toBe(dust);
      scene.set({ dust: !dust }); expect(scene.restore(saved)).toBe(true); expect(scene.snapshot().settings.dust).toBe(dust);
      saved.settings.dust = !dust; expect(scene.snapshot().settings.dust).toBe(dust);
    }
    scene.set({ dust: false }); const legacy = scene.snapshot(); delete legacy.settings.dust;
    expect(scene.restore(legacy)).toBe(true); expect(scene.snapshot().settings.dust).toBe(true);
    // Match the renderer's existing boolean-setting coercion convention.
    for (const value of [null, 0, 1, '', 'false', {}, []]) {
      scene.set({ dust: value }); expect(scene.snapshot().settings.dust).toBe(!!value);
      const saved = scene.snapshot(); saved.settings.dust = value;
      scene.set({ dust: !value }); expect(scene.restore(saved)).toBe(true);
      expect(scene.snapshot().settings.dust).toBe(!!value);
    }
    scene.set({ dust: false }); scene.set({ dust: undefined }); expect(scene.snapshot().settings.dust).toBe(false);
  });

  it('toggles without moving the camera, resetting clocks, changing flight continuation or uploading geometry', () => {
    createScene();
    function continuation(toggle) {
      launch(); scene.set({ running: true }); advance();
      const result = [];
      for (let index = 0; index < 4; index++) {
        // Running frames throttle telemetry to 250 ms. Selecting the already
        // selected target publishes the current state without advancing time.
        expect(scene.selectTarget(scene.snapshot().targetId)).toBe(true);
        if (toggle) {
          const before = scene.snapshot(), route = structuredClone(telemetry.flyby), motion = structuredClone(telemetry.motion);
          const uploadCount = { ...uploads }, pauseCount = pauses.length;
          scene.set({ dust: false }); expect(scene.snapshot().settings.dust).toBe(false);
          expect(withoutDust(scene.snapshot())).toEqual(withoutDust(before));
          expect(telemetry.running).toBe(true); expect(telemetry.flyby).toEqual(route); expect(telemetry.motion).toEqual(motion);
          scene.set({ dust: true }); expect(scene.snapshot()).toEqual(before);
          expect(uploads).toEqual(uploadCount); expect(pauses).toHaveLength(pauseCount);
        }
        advance(100); expect(scene.selectTarget(scene.snapshot().targetId)).toBe(true);
        result.push({ snapshot: scene.snapshot(), route: structuredClone(telemetry.flyby), motion: structuredClone(telemetry.motion) });
      }
      return result;
    }
    expect(continuation(true)).toEqual(continuation(false));
    scene.set({ mode: 'relativity', region: 'neighborhood', beta: 0.6, timeScale: 2 }); scene.set({ running: true }); advance(); advance(100);
    const before = scene.snapshot(), uploadCount = { ...uploads }, pauseCount = pauses.length;
    expect(before.state.universeYears).toBeGreaterThan(0); expect(before.state.travelerYears).toBeGreaterThan(0);
    scene.set({ dust: false }); expect(withoutDust(scene.snapshot())).toEqual(withoutDust(before)); expect(telemetry.running).toBe(true);
    advance(100); expect(scene.snapshot().state.universeYears).toBeGreaterThan(before.state.universeYears);
    expect(uploads).toEqual(uploadCount); expect(pauses).toHaveLength(pauseCount);
  });

  it('preserves dust during scenic inspection and restores the bookmarked choice after a detour', () => {
    createScene();
    for (const dust of [false, true]) {
      launch(dust); const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
      scene.set({ dust: !dust, fov: 23, exposure: 1.3 }); scene.nudge('right', 0.5); const inspection = scene.snapshot();
      const route = flight.flybys('neighborhood').find(item => item.id === 'nebula');
      expect(scene.inspectFlybyHighlight(route.id, route.highlights[0].id)).toBe(true);
      expect(scene.snapshot().settings.dust).toBe(!dust); expect(telemetry.flybyDetour.active).toBe(true);
      scene.set({ dust }); expect(scene.restoreInspectionView(inspection)).toBe(true);
      expect(scene.snapshot().settings.dust).toBe(!dust); expect(telemetry.flybyDetour.active).toBe(true);
      expect(scene.returnToFlyby()).toBe(true); expect(scene.snapshot()).toEqual(origin); expect(telemetry.running).toBe(false);
    }
  });
});

describe('Universe flight finite dust extinction', () => {
  it('exposes a detached three-cloud catalog and uses it as the optional default', () => {
    const catalog = flight.dustClouds(), original = structuredClone(catalog);
    expect(catalog).toHaveLength(3); expect(new Set(catalog.map(item => item.id)).size).toBe(3);
    for (const item of catalog) {
      expect(typeof item.id).toBe('string'); expect(item.id.length).toBeGreaterThan(0);
      expect(item.position).toHaveLength(3); expect(item.position.every(Number.isFinite)).toBe(true);
      expect(item.radii).toHaveLength(3); expect(item.radii.every(value => Number.isFinite(value) && value > 0)).toBe(true);
      expect(Number.isFinite(item.densityPerLy)).toBe(true); expect(item.densityPerLy).toBeGreaterThan(0);
    }
    const first = catalog[0], a = [...first.position], b = [...first.position];
    a[0] -= first.radii[0] * 2; b[0] += first.radii[0] * 2;
    const depth = math.dustOpticalDepth(a, b);
    expect(depth).toBeGreaterThan(0); expectDepthClose(depth, numericalDepth(a, b, original));
    expect(math.dustOpticalDepth(a, b, original)).toBe(depth);
    catalog[0].position[0] = 1e9; catalog[0].radii[1] = 1e9; catalog[0].densityPerLy = 0; catalog[0].id = 'changed'; catalog.pop();
    expect(flight.dustClouds()).toEqual(original); expect(math.dustOpticalDepth(a, b)).toBe(depth);
  });

  it('matches numerical integration for foreground, background, inside and grazing sightlines', () => {
    const clouds = [cloud()];
    const cases = [
      [[-8, 0, 0], [-4, 0, 0]], // Source in front of the cloud.
      [[-8, 0, 0], [8, 0, 0]], // Entire cloud on the finite light path.
      [[0.2, 0.3, -0.1], [7, 1, 0.5]], // Observer inside.
      [[-7, 0.2, 0.4], [0.5, 0.2, 0.4]], // Source inside.
      [[-0.5, 0.1, 0.2], [0.7, -0.2, 0.1]], // Both endpoints inside.
      [[-5, -2, -1], [6, 2, 1]], // Oblique ellipsoid chord.
      [[-5, 1.99, 0], [5, 1.99, 0]], // Near grazing.
      [[-5, 2, 0], [5, 2, 0]], // Tangent.
      [[-5, 2.01, 0], [5, 2.01, 0]], // Miss.
    ];
    for (const [a, b] of cases) expectDepthClose(math.dustOpticalDepth(a, b, clouds), numericalDepth(a, b, clouds));
    for (const index of [0, 7, 8]) expect(math.dustOpticalDepth(...cases[index], clouds)).toBe(0);
  });

  it('adds clouds and adjoining segments, reverses symmetrically, and respects finite support', () => {
    const clouds = [cloud(), cloud({ id: 'second', position: [2, 0.4, -0.2], radii: [2, 3, 1], densityPerLy: 0.6 })];
    const a = [-8, -0.5, 0.1], b = [8, 0.7, -0.1], m = mix(a, b, 0.43);
    const full = math.dustOpticalDepth(a, b, clouds);
    expectDepthClose(full, numericalDepth(a, b, clouds));
    expectDepthClose(full, math.dustOpticalDepth(a, m, clouds) + math.dustOpticalDepth(m, b, clouds));
    expectDepthClose(full, math.dustOpticalDepth(b, a, clouds));
    expectDepthClose(full, clouds.reduce((total, item) => total + math.dustOpticalDepth(a, b, [item]), 0));
    expectDepthClose(math.dustOpticalDepth([-4, 0, 0], [4, 0, 0], [cloud()]), math.dustOpticalDepth([-400, 0, 0], [400, 0, 0], [cloud()]));
    expect(math.dustOpticalDepth([4, 0, 0], [400, 0, 0], [cloud()])).toBe(0);
    expect(math.dustOpticalDepth(a, b, [cloud({ densityPerLy: 0 })])).toBe(0);
  });

  it('retains narrow chords with distant endpoints and translated coordinates', () => {
    const item = cloud();
    // The full central integral of rho*(1-x^2/r^2)^2 is 16*rho*r/15.
    const central = 16 * item.densityPerLy * item.radii[0] / 15;
    for (const length of [1e6, 1e12]) {
      expectDepthClose(math.dustOpticalDepth([-length, 0, 0], [length, 0, 0], [item]), central, 1e-8);
      const y = 1.99, grazing = central * (1 - (y / item.radii[1]) ** 2) ** 2.5;
      expectDepthClose(math.dustOpticalDepth([-length, y, 0], [length, y, 0], [item]), grazing, 1e-8);
      expect(math.dustOpticalDepth([-length, 2.01, 0], [length, 2.01, 0], [item])).toBe(0);
    }
    const translated = cloud({ position: [1e12, -1e12, 1e12] });
    expectDepthClose(math.dustOpticalDepth([1e12 - 8, -1e12, 1e12], [1e12 + 8, -1e12, 1e12], [translated]), central);
  });

  it('approaches zero continuously at the cloud surface and tangency boundary', () => {
    const clouds = [cloud()]; let previous = Infinity;
    for (const gap of [0.2, 0.05, 0.01, 0.001]) {
      const depth = math.dustOpticalDepth([-5, 2 - gap, 0], [5, 2 - gap, 0], clouds);
      expect(depth).toBeGreaterThan(0); expect(depth).toBeLessThan(previous);
      expectDepthClose(depth, numericalDepth([-5, 2 - gap, 0], [5, 2 - gap, 0], clouds)); previous = depth;
    }
    expect(previous).toBeLessThan(1e-7);
    for (const x of [-3.001, -3]) expect(math.dustOpticalDepth([-8, 0, 0], [x, 0, 0], clouds)).toBe(0);
    const entering = math.dustOpticalDepth([-8, 0, 0], [-2.999, 0, 0], clouds);
    expect(entering).toBeGreaterThan(0); expect(entering).toBeLessThan(1e-8);
  });

  it('attenuates RGB exponentially with blue no brighter than green or red', () => {
    for (const densityPerLy of [0, 0.01, 0.3, 3, 10000]) {
      const clouds = [cloud({ densityPerLy })], a = [-8, 0.2, 0.1], b = [8, 0.2, 0.1];
      const depth = numericalDepth(a, b, clouds), rgb = math.dustTransmission(a, b, clouds);
      expect(rgb).toHaveLength(3);
      rgb.forEach((value, index) => {
        expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
        expect(value).toBeCloseTo(Math.exp(-depth * [0.72, 1, 1.45][index]), 9);
      });
      expect(rgb[2]).toBeLessThanOrEqual(rgb[1]); expect(rgb[1]).toBeLessThanOrEqual(rgb[0]);
    }
    for (const [a, b, clouds] of [[[0, 0, 0], [0, 0, 0], [cloud()]], [[-8, 0, 0], [8, 0, 0], []]]) {
      expect(math.dustOpticalDepth(a, b, clouds)).toBe(0); expect(math.dustTransmission(a, b, clouds)).toEqual([1, 1, 1]);
    }
  });

  it('rejects malformed rays and cloud specifications without changing caller data', () => {
    const a = [-8, 0, 0], b = [8, 0, 0], clouds = [cloud()], original = structuredClone({ a, b, clouds });
    math.dustOpticalDepth(a, b, clouds); math.dustTransmission(a, b, clouds); expect({ a, b, clouds }).toEqual(original);
    for (const invalid of [null, {}, [], new Array(3), [1, 2], [1, 2, 3, 4], [NaN, 0, 0], [0, Infinity, 0], ['1', 0, 0]]) {
      for (const fn of [math.dustOpticalDepth, math.dustTransmission]) {
        expect(fn(invalid, b, clouds)).toBeNull(); expect(fn(a, invalid, clouds)).toBeNull();
      }
    }
    const invalidClouds = [null, {}, [null], new Array(1), [cloud({ position: new Array(3) })], [cloud({ radii: new Array(3) })], [cloud({ position: [1, 2] })], [cloud({ position: [0, Infinity, 0] })],
      [cloud({ radii: [0, 1, 1] })], [cloud({ radii: [-1, 1, 1] })], [cloud({ radii: [1, 1, NaN] })],
      [cloud({ densityPerLy: -1 })], [cloud({ densityPerLy: Infinity })], [cloud({ densityPerLy: '0.3' })]];
    for (const invalid of invalidClouds) for (const fn of [math.dustOpticalDepth, math.dustTransmission]) {
      expect(fn(a, b, invalid)).toBeNull(); expect(fn(a, a, invalid)).toBeNull();
    }
  });
});
