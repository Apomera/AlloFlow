import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ELEVATION = 17 * Math.PI / 180;
const AZIMUTH = Math.atan2(15, 40);
const SUN = {
  x: Math.cos(ELEVATION) * Math.cos(AZIMUTH),
  y: Math.sin(ELEVATION),
  z: Math.cos(ELEVATION) * Math.sin(AZIMUTH),
};
let P, canvasContext;

function finiteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finiteNumbers);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteNumbers);
}

function canvasRecorder() {
  const calls = [];
  let gradientId = 0;
  const gradient = (...args) => {
    args.forEach(finiteNumbers);
    calls.push(['gradient', ...args]);
    return { gradientId: ++gradientId, addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = {
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }),
  };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      args.filter(value => typeof value === 'number').forEach(finiteNumbers);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => {
      if (typeof value === 'number') finiteNumbers(value);
      target[key] = value;
      calls.push(['set', key, value && value.gradientId ? 'gradient:' + value.gradientId : value]);
      return true;
    },
  });
  return { ctx, calls };
}

function expectedIncidence(u, v) {
  const normal = [u, v, Math.sqrt(1 - u * u - v * v)];
  return normal.reduce((sum, component, index) => sum + component * [SUN.x, SUN.y, SUN.z][index], 0);
}
function expectMetadata(value) {
  expect(value.sunX).toBeCloseTo(SUN.x, 14);
  expect(value.sunY).toBeCloseTo(SUN.y, 14);
  expect(value.sunZ).toBeCloseTo(SUN.z, 14);
  expect(value.launchElevationDeg).toBeCloseTo(17, 12);
  expect(value.preset).toBe('fixed-launch-sun');
  expect(value.brightnessFloor).toBe(0.055);
  finiteNumbers(value);
}

beforeEach(() => {
  resetStemLab();
  canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('ascent sunlight in the fixed launch plane', () => {
  it('uses the specified unit Sun vector with a 17 degree launch elevation and correct cardinal limb signs', () => {
    expect(Math.hypot(SUN.x, SUN.y, SUN.z)).toBeCloseTo(1, 14);
    const samples = [
      [0, 0, SUN.z], [1, 0, SUN.x], [-1, 0, -SUN.x],
      [0, 1, SUN.y], [0, -1, -SUN.y],
    ];
    for (const [u, v, incidence] of samples) {
      const light = P.ascentMoonLight(u, v);
      expect(light.incidence).toBeCloseTo(incidence, 14);
      expect(light.daylight).toBe(incidence > 0);
      expect(light.sun).toEqual(SUN);
    }
    expect(P.ascentMoonLight(0, 1).elevationDeg).toBeCloseTo(17, 12);
    expect(P.ascentMoonLight(SUN.x, SUN.y).incidence).toBeCloseTo(1, 14);
    expect(P.ascentMoonLight(SUN.x, SUN.y).elevationDeg).toBeCloseTo(90, 5);
  });

  it('matches independent spherical normals and signed solar elevations across the visible hemisphere', () => {
    for (let u = -0.9; u <= 0.91; u += 0.15) {
      for (let v = -0.9; v <= 0.91; v += 0.15) {
        if (u * u + v * v > 0.98) continue;
        const light = P.ascentMoonLight(u, v), incidence = expectedIncidence(u, v);
        expect(light.normal.x).toBe(u);
        expect(light.normal.y).toBe(v);
        expect(light.normal.z).toBeGreaterThanOrEqual(0);
        expect(Math.hypot(light.normal.x, light.normal.y, light.normal.z)).toBeCloseTo(1, 13);
        expect(light.incidence).toBeCloseTo(incidence, 13);
        expect(light.elevationDeg).toBeCloseTo(Math.asin(incidence) * 180 / Math.PI, 11);
        expect(light.daylight).toBe(incidence > 0);
        expect(light.brightness).toBeCloseTo(0.055 + 0.945 * Math.pow(Math.max(0, incidence), 0.6), 13);
        finiteNumbers(light);
      }
    }
  });

  it('places the terminator where a tangent surface normal is perpendicular to the Sun', () => {
    // At v=0, a perpendicular normal is (-Sz,0,Sx), normalized independently.
    const divisor = Math.hypot(SUN.x, SUN.z), terminatorU = -SUN.z / divisor;
    const tangent = P.ascentMoonLight(terminatorU, 0);
    expect(Math.abs(tangent.incidence)).toBeLessThan(1e-13);
    expect(Math.abs(tangent.elevationDeg)).toBeLessThan(1e-11);
    const before = P.ascentMoonLight(terminatorU - 0.0001, 0);
    const after = P.ascentMoonLight(terminatorU + 0.0001, 0);
    expect(before.incidence).toBeLessThan(0);
    expect(before.daylight).toBe(false);
    expect(after.incidence).toBeGreaterThan(0);
    expect(after.daylight).toBe(true);
  });

  it('keeps night exposure at its stated floor and orders day brightness by incidence', () => {
    for (const [u, v] of [[-1, 0], [0, -1], [-0.8, -0.5]]) {
      const light = P.ascentMoonLight(u, v);
      expect(light.incidence).toBeLessThan(0);
      expect(light.brightness).toBe(0.055);
    }
    const low = P.ascentMoonLight(0, 1), middle = P.ascentMoonLight(0, 0);
    const high = P.ascentMoonLight(SUN.x, SUN.y);
    expect(low.brightness).toBeGreaterThan(0.055);
    expect(middle.brightness).toBeGreaterThan(low.brightness);
    expect(high.brightness).toBeGreaterThan(middle.brightness);
    expect(high.brightness).toBeCloseTo(1, 13);
    for (const point of [[0, 0], [0.6, 0.8], [-0.6, 0.8], [-1, 0]]) {
      const light = P.ascentMoonLight(...point);
      expect(light.incidence).toBeGreaterThanOrEqual(-1);
      expect(light.incidence).toBeLessThanOrEqual(1);
      expect(light.brightness).toBeGreaterThanOrEqual(0.055);
      expect(light.brightness).toBeLessThanOrEqual(1);
    }
  });

  it('rejects nonnumeric, nonfinite and outside-disc coordinates while retaining the exact limb', () => {
    for (const invalid of [undefined, null, false, true, '', '0', {}, [], new Number(0), NaN, Infinity, -Infinity]) {
      expect(P.ascentMoonLight(invalid, 0)).toBeNull();
      expect(P.ascentMoonLight(0, invalid)).toBeNull();
    }
    for (const point of [[1.000001, 0], [0, -1.000001], [1, 1], [Number.MAX_VALUE, 0]]) {
      expect(P.ascentMoonLight(...point)).toBeNull();
    }
    for (const point of [[1, 0], [0, -1], [0.6, 0.8], [-0, 0]]) {
      expect(P.ascentMoonLight(...point)).not.toBeNull();
    }
  });

  it('returns detached deterministic light records without exposing mutable preset state', () => {
    const expected = P.ascentMoonLight(0.3, -0.2), first = P.ascentMoonLight(0.3, -0.2);
    expect(first).toEqual(expected);
    first.normal.x = 999;
    first.sun.y = 999;
    first.incidence = 999;
    expect(P.ascentMoonLight(0.3, -0.2)).toEqual(expected);
    expect(P.ascentMoonLight(0, 1).elevationDeg).toBeCloseTo(17, 12);
  });

  it('counter-rotates spacecraft light so its world direction remains fixed through full attitudes', () => {
    const projection = Math.hypot(SUN.x, SUN.y);
    for (const pitch of [-7.1, -Math.PI, -Math.PI / 2, -0.3, 0, 0.7, Math.PI / 2, Math.PI, 8.9]) {
      const light = P.ascentStageLight(pitch), c = Math.cos(pitch), s = Math.sin(pitch);
      // Rotate the reported local direction back into the fixed screen frame.
      expect(c * light.x - s * light.y).toBeCloseTo(SUN.x, 13);
      expect(s * light.x + c * light.y).toBeCloseTo(-SUN.y, 13);
      expect(Math.hypot(light.x, light.y)).toBeCloseTo(projection, 13);
      expect(light.projectionLength).toBeCloseTo(projection, 13);
      const { x0, y0, x1, y1 } = light.gradient;
      expect(x0 + x1).toBeCloseTo(0, 13);
      expect(y0 + y1).toBeCloseTo(0, 13);
      expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(22, 12);
      expect((x1 - x0) * light.x + (y1 - y0) * light.y).toBeCloseTo(22 * projection, 12);
      expect(P.ascentStageLight(pitch + 2 * Math.PI).x).toBeCloseTo(light.x, 12);
      expect(P.ascentStageLight(pitch + 2 * Math.PI).y).toBeCloseTo(light.y, 12);
      finiteNumbers(light);
    }
  });

  it('rejects invalid spacecraft attitudes and returns independent gradient records', () => {
    for (const pitch of [undefined, null, false, true, '', '0', {}, [], new Number(0), NaN, Infinity, -Infinity]) {
      expect(P.ascentStageLight(pitch)).toBeNull();
    }
    const expected = P.ascentStageLight(0.731), first = P.ascentStageLight(0.731);
    first.gradient.x1 = 999;
    first.x = 999;
    expect(P.ascentStageLight(0.731)).toEqual(expected);
  });

  it('retains the original stage drawing by default and applies sunlight only to an explicit opt-in', () => {
    const defaultDraw = canvasRecorder(), disabled = canvasRecorder(), lit = canvasRecorder();
    const base = { time: 12, engineOn: true, thrust: 15600 };
    const a = P.drawLunarAscentStage(defaultDraw.ctx, 100, 80, 1.2, 0.6, base);
    const b = P.drawLunarAscentStage(disabled.ctx, 100, 80, 1.2, 0.6, { ...base, sunlight: false });
    const c = P.drawLunarAscentStage(lit.ctx, 100, 80, 1.2, 0.6, { ...base, sunlight: true });
    expect(defaultDraw.calls).toEqual(disabled.calls);
    expect(a).toEqual(b);
    expect(Object.keys(a).sort()).toEqual(['engineVisible', 'nozzleX', 'nozzleY', 'plumeVisible']);
    expect(defaultDraw.calls).toContainEqual(['gradient', -11, -6, 11, 1]);
    const expected = P.ascentStageLight(0.6).gradient;
    expect(lit.calls).toContainEqual(['gradient', expected.x0, expected.y0, expected.x1, expected.y1]);
    expect(lit.calls).not.toEqual(defaultDraw.calls);
    expect(c.sunlight).toEqual(P.ascentStageLight(0.6));
  });

  it('leaves stage pose, nozzle position, engine gating and source options unchanged with sunlight', () => {
    for (const pitch of [-0.8, 0, Math.PI / 2, 2.7]) {
      for (const engineOn of [false, true]) {
        const options = Object.freeze({ time: 120, engineOn, thrust: 15600, sunlight: true });
        const before = JSON.stringify(options), off = canvasRecorder(), on = canvasRecorder();
        const a = P.drawLunarAscentStage(off.ctx, 230, 145, 1.4, pitch, { ...options, sunlight: false });
        const b = P.drawLunarAscentStage(on.ctx, 230, 145, 1.4, pitch, options);
        expect(b.nozzleX).toBeCloseTo(230 - Math.sin(pitch) * 12 * 1.4, 12);
        expect(b.nozzleY).toBeCloseTo(145 + Math.cos(pitch) * 12 * 1.4, 12);
        for (const key of ['nozzleX', 'nozzleY', 'engineVisible', 'plumeVisible']) expect(b[key]).toBe(a[key]);
        expect(b.engineVisible).toBe(engineOn);
        expect(b.plumeVisible).toBe(engineOn);
        const transforms = calls => calls.filter(row => ['translate', 'rotate', 'scale'].includes(row[0]));
        expect(transforms(on.calls)).toEqual(transforms(off.calls));
        expect(JSON.stringify(options)).toBe(before);
        finiteNumbers(b);
      }
    }
  });

  it('guards invalid Moon draw inputs and uses a clipped bounded deterministic fallback', () => {
    const empty = canvasRecorder();
    for (const ctx of [null, undefined]) expect(P.drawAscentMoonLight(ctx, 10, 20, 30)).toBeNull();
    for (const values of [[NaN, 20, 30], [10, Infinity, 30], [10, 20, 0], [10, 20, -1], [10, 20, Infinity], ['10', 20, 30]]) {
      expect(P.drawAscentMoonLight(empty.ctx, ...values)).toBeNull();
    }
    expect(empty.calls).toEqual([]);
    for (const radius of [4, 90, 180]) {
      const a = canvasRecorder(), b = canvasRecorder();
      const first = P.drawAscentMoonLight(a.ctx, 230, 145, radius);
      const second = P.drawAscentMoonLight(b.ctx, 230, 145, radius);
      expectMetadata(first);
      expect(second).toEqual(first);
      expect(a.calls).toEqual(b.calls);
      const clip = a.calls.findIndex(row => row[0] === 'clip');
      expect(clip).toBeGreaterThan(0);
      expect(a.calls.slice(0, clip)).toContainEqual(['arc', 230, 145, radius, 0, Math.PI * 2]);
      const cells = a.calls.filter(row => row[0] === 'fillRect');
      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThanOrEqual(48 * 48);
      expect(a.calls.filter(row => row[0] === 'drawImage')).toEqual([]);
      expect(a.calls.filter(row => row[0] === 'save').length).toBe(a.calls.filter(row => row[0] === 'restore').length);
      for (const row of cells) {
        expect(row[1]).toBeGreaterThanOrEqual(230 - radius - 1e-9);
        expect(row[2]).toBeGreaterThanOrEqual(145 - radius - 1e-9);
        expect(row[1]).toBeLessThan(230 + radius);
        expect(row[2]).toBeLessThan(145 + radius);
      }
    }
  });

  it('builds one bounded transparent 256px sphere sprite and reuses it across Moon sizes', () => {
    const createImageData = vi.fn((width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));
    const putImageData = vi.fn();
    canvasContext.mockReturnValue({ createImageData, putImageData });
    const a = canvasRecorder(), b = canvasRecorder(), c = canvasRecorder();
    const first = P.drawAscentMoonLight(a.ctx, 110, 120, 40);
    const second = P.drawAscentMoonLight(b.ctx, 330, 190, 160);
    const third = P.drawAscentMoonLight(c.ctx, 110, 120, 40);
    expectMetadata(first);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(createImageData).toHaveBeenCalledTimes(1);
    expect(createImageData).toHaveBeenCalledWith(256, 256);
    expect(putImageData).toHaveBeenCalledTimes(1);
    const pixels = putImageData.mock.calls[0][0];
    expect(pixels.data.length).toBe(256 * 256 * 4);
    expect(pixels.data[3]).toBe(0);
    expect(pixels.data[((128 * 256 + 128) * 4) + 3]).toBe(255);
    for (const recorder of [a, b, c]) {
      const images = recorder.calls.filter(row => row[0] === 'drawImage');
      expect(images).toHaveLength(1);
      expect(images[0][1].width).toBe(256);
      expect(images[0][1].height).toBe(256);
      expect(recorder.calls.filter(row => row[0] === 'fillRect')).toHaveLength(0);
      expect(recorder.calls.findIndex(row => row[0] === 'clip')).toBeLessThan(recorder.calls.findIndex(row => row[0] === 'drawImage'));
    }
    expect(a.calls).toEqual(c.calls);
    const luminance = (x, y) => {
      const index = (y * 256 + x) * 4;
      return pixels.data[index] + pixels.data[index + 1] + pixels.data[index + 2];
    };
    expect(luminance(220, 128)).toBeGreaterThan(luminance(35, 128));
    for (const [x, y] of [[128, 128], [220, 128], [35, 128], [128, 20], [128, 235]]) {
      const u = (x + 0.5 - 128) / 128, v = (128 - y - 0.5) / 128;
      const incidence = expectedIncidence(u, v);
      const brightness = 0.055 + 0.945 * Math.pow(Math.max(0, incidence), 0.6);
      const index = (y * 256 + x) * 4;
      expect([...pixels.data.slice(index, index + 4)]).toEqual([
        Math.round(190 * brightness), Math.round(190 * brightness), Math.round(183 * brightness), 255,
      ]);
    }
  });
});
