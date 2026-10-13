import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P, canvasContext;

function recorder() {
  const calls = [];
  let gradientId = 0;
  const gradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { gradientId: ++gradientId, addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => { calls.push([key, ...args]); }),
    set: (target, key, value) => {
      target[key] = value;
      calls.push(['set', key, value && value.gradientId ? 'gradient:' + value.gradientId : value]);
      return true;
    },
  });
  return { ctx, calls };
}
function finiteCalls(calls) {
  for (const call of calls) for (const value of call) {
    if (typeof value === 'number') expect(Number.isFinite(value), String(call[0])).toBe(true);
  }
}
function finiteRecord(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteRecord);
}
function physicalLight(u, v, angle) {
  const theta = angle * Math.PI / 180, R = P.loi.radius, D = P.lunarEnvironment.sunDistance;
  const n = [u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))];
  const projected = u * Math.cos(theta) + v * Math.sin(theta);
  // Law of cosines for surface-to-Sun range; the numerator follows the
  // surface tangent plane, avoiding the implementation's normalized dot.
  const range = Math.sqrt(D * D + R * R - 2 * D * R * projected);
  return { normal: n, incidence: (D * projected - R) / range,
    direction: [(D * Math.cos(theta) - R * u) / range,
      (D * Math.sin(theta) - R * v) / range, -R * n[2] / range] };
}
function pointAlongSun(parallel, transverse, angle) {
  const theta = angle * Math.PI / 180;
  return [parallel * Math.cos(theta) - transverse * Math.sin(theta),
    parallel * Math.sin(theta) + transverse * Math.cos(theta)];
}
function simpleSample(x, y, radioVisible) {
  return { time: 80, x, y, vx: -y / 1000, vy: x / 1000,
    engineOn: false, thrust: 0, radioVisible };
}

beforeEach(() => {
  resetStemLab();
  canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('LOI surface sunlight and independent spacecraft eclipse', () => {
  it('matches finite-distance surface geometry over all three orbital Sun presets', () => {
    for (const angle of [45, 90, 135]) {
      for (let u = -0.8; u <= 0.81; u += 0.2) for (let v = -0.8; v <= 0.81; v += 0.2) {
        if (u * u + v * v > 0.98) continue;
        const actual = P.lunarOrbitSurfaceLight(u, v, angle), expected = physicalLight(u, v, angle);
        expect(actual.angle).toBe(angle);
        expect(actual.normal.x).toBe(u); expect(actual.normal.y).toBe(v);
        expect(actual.normal.z).toBeCloseTo(expected.normal[2], 13);
        expect(Math.hypot(...Object.values(actual.normal))).toBeCloseTo(1, 13);
        expect(actual.direction.x).toBeCloseTo(expected.direction[0], 13);
        expect(actual.direction.y).toBeCloseTo(expected.direction[1], 13);
        expect(actual.direction.z).toBeCloseTo(expected.direction[2], 13);
        expect(Math.hypot(...Object.values(actual.direction))).toBeCloseTo(1, 13);
        expect(actual.incidence).toBeCloseTo(expected.incidence, 13);
        expect(actual.daylight).toBe(expected.incidence > 0);
        expect(actual.brightness).toBeCloseTo(0.055 + 0.945 * Math.pow(Math.max(0, expected.incidence), 0.6), 13);
        finiteRecord(actual);
      }
    }
  });

  it('places the finite Sun terminator at the surface tangent plane and preserves its signs', () => {
    const q = P.loi.radius / P.lunarEnvironment.sunDistance;
    for (const angle of [45, 90, 135]) {
      for (const transverse of [-0.7, 0, 0.7]) {
        const tangent = P.lunarOrbitSurfaceLight(...pointAlongSun(q, transverse, angle), angle);
        expect(Math.abs(tangent.incidence)).toBeLessThan(3e-16);
        const day = P.lunarOrbitSurfaceLight(...pointAlongSun(q + 0.0001, transverse, angle), angle);
        const night = P.lunarOrbitSurfaceLight(...pointAlongSun(q - 0.0001, transverse, angle), angle);
        expect(day.daylight).toBe(true); expect(day.incidence).toBeGreaterThan(0);
        expect(night.daylight).toBe(false); expect(night.incidence).toBeLessThan(0);
        expect(night.brightness).toBe(0.055);
      }
      const center = P.lunarOrbitSurfaceLight(0, 0, angle);
      expect(center.incidence).toBeLessThan(0);
      expect(center.direction.z).toBeLessThan(0);
      expect(center.brightness).toBe(0.055);
    }
  });

  it('rotates the illumination with its declared orbital Sun while retaining bounded brightness', () => {
    const local = [0.42, -0.3], samples = [45, 90, 135].map(angle =>
      P.lunarOrbitSurfaceLight(...pointAlongSun(...local, angle), angle));
    for (const value of samples) {
      expect(value.incidence).toBeCloseTo(samples[0].incidence, 13);
      expect(value.brightness).toBeCloseTo(samples[0].brightness, 13);
    }
    for (const angle of [45, 90, 135]) {
      const day = P.lunarOrbitSurfaceLight(...pointAlongSun(1, 0, angle), angle);
      const night = P.lunarOrbitSurfaceLight(...pointAlongSun(-1, 0, angle), angle);
      expect(day.incidence).toBeCloseTo(1, 13); expect(day.brightness).toBeCloseTo(1, 13);
      expect(night.incidence).toBeCloseTo(-1, 13); expect(night.brightness).toBe(0.055);
      for (const value of [day, night, ...samples]) {
        expect(value.brightness).toBeGreaterThanOrEqual(0.055);
        expect(value.brightness).toBeLessThanOrEqual(1);
      }
    }
  });

  it('normalizes only supported numeric angle presets and rejects invalid disc coordinates', () => {
    const expected = P.lunarOrbitSurfaceLight(0.2, -0.1, 45);
    for (const angle of [undefined, null, false, true, 0, 44, 46, 360, '90', NaN, Infinity, {}, []]) {
      expect(P.lunarOrbitSurfaceLight(0.2, -0.1, angle)).toEqual(expected);
    }
    for (const invalid of [undefined, null, false, true, '', '0', {}, [], new Number(0), NaN, Infinity, -Infinity]) {
      expect(P.lunarOrbitSurfaceLight(invalid, 0, 45)).toBeNull();
      expect(P.lunarOrbitSurfaceLight(0, invalid, 45)).toBeNull();
    }
    for (const point of [[1.000001, 0], [0, -1.000001], [1, 1], [Number.MAX_VALUE, 0]]) {
      expect(P.lunarOrbitSurfaceLight(...point, 45)).toBeNull();
    }
    for (const point of [[1, 0], [0, -1], [0.6, 0.8], [-0, 0]]) {
      expect(P.lunarOrbitSurfaceLight(...point, 45)).not.toBeNull();
    }
  });

  it('returns detached deterministic geometry without exposing a mutable preset', () => {
    const expected = P.lunarOrbitSurfaceLight(0.4, -0.1, 90), first = P.lunarOrbitSurfaceLight(0.4, -0.1, 90);
    expect(first).toEqual(expected);
    first.normal.x = 999; first.direction.y = 999; first.incidence = 999;
    expect(P.lunarOrbitSurfaceLight(0.4, -0.1, 90)).toEqual(expected);
    expect(P.lunarOrbitSurfaceLight(0.4, -0.1, 45).angle).toBe(45);
  });

  it('clips a finite bounded fallback to the physical Moon at every drawing size', () => {
    for (const [radius, angle] of [[4, 45], [90, 90], [180, 135]]) {
      const a = recorder(), b = recorder();
      expect(P.drawLunarOrbitLight(a.ctx, 230, 145, radius, angle)).toEqual({ angle, radius });
      expect(P.drawLunarOrbitLight(b.ctx, 230, 145, radius, angle)).toEqual({ angle, radius });
      expect(a.calls).toEqual(b.calls);
      const clip = a.calls.findIndex(row => row[0] === 'clip');
      expect(clip).toBeGreaterThan(0);
      expect(a.calls.slice(0, clip)).toContainEqual(['arc', 230, 145, radius, 0, Math.PI * 2]);
      const cells = a.calls.filter(row => row[0] === 'fillRect');
      expect(cells.length).toBeGreaterThan(0); expect(cells.length).toBeLessThanOrEqual(48 * 48);
      expect(a.calls.findIndex(row => row[0] === 'fillRect')).toBeGreaterThan(clip);
      expect(a.calls.filter(row => row[0] === 'drawImage')).toEqual([]);
      expect(a.calls.filter(row => row[0] === 'save').length).toBe(a.calls.filter(row => row[0] === 'restore').length);
      finiteCalls(a.calls);
      for (const cell of cells) {
        expect(cell[1]).toBeGreaterThanOrEqual(230 - radius - 1e-9);
        expect(cell[2]).toBeGreaterThanOrEqual(145 - radius - 1e-9);
        expect(cell[1]).toBeLessThan(230 + radius);
        expect(cell[2]).toBeLessThan(145 + radius);
      }
    }
  });

  it('guards invalid drawing coordinates before issuing any Canvas calls', () => {
    const empty = recorder();
    for (const ctx of [null, undefined]) expect(P.drawLunarOrbitLight(ctx, 10, 20, 30, 45)).toBeNull();
    for (const values of [[NaN, 20, 30], [10, Infinity, 30], [10, 20, 0], [10, 20, -1], [10, 20, Infinity], ['10', 20, 30]]) {
      expect(P.drawLunarOrbitLight(empty.ctx, ...values, 45)).toBeNull();
    }
    expect(empty.calls).toEqual([]);
  });

  it('uses one bounded transparent sprite across drawing sizes for an unchanged Sun', () => {
    const createImageData = vi.fn((width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }));
    const putImageData = vi.fn();
    canvasContext.mockReturnValue({ createImageData, putImageData });
    const a = recorder(), b = recorder();
    expect(P.drawLunarOrbitLight(a.ctx, 110, 120, 40, 45)).toEqual({ angle: 45, radius: 40 });
    expect(P.drawLunarOrbitLight(b.ctx, 330, 190, 160, 45)).toEqual({ angle: 45, radius: 160 });
    expect(createImageData).toHaveBeenCalledTimes(1); expect(createImageData).toHaveBeenCalledWith(256, 256);
    expect(putImageData).toHaveBeenCalledTimes(1);
    const pixels = putImageData.mock.calls[0][0];
    expect(pixels.data.length).toBe(256 * 256 * 4);
    expect(pixels.data[3]).toBe(0); expect(pixels.data[(128 * 256 + 128) * 4 + 3]).toBe(255);
    const luminance = (x, y) => { const i = (y * 256 + x) * 4; return pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]; };
    expect(luminance(210, 45)).toBeGreaterThan(luminance(45, 210));
    expect(luminance(210, 45)).toBeGreaterThan(luminance(128, 128));
    for (const item of [a, b]) {
      const images = item.calls.filter(row => row[0] === 'drawImage');
      expect(images).toHaveLength(1); expect(images[0][1].width).toBe(256); expect(images[0][1].height).toBe(256);
      expect(item.calls.filter(row => row[0] === 'fillRect')).toHaveLength(0);
      expect(item.calls.findIndex(row => row[0] === 'clip')).toBeLessThan(item.calls.findIndex(row => row[0] === 'drawImage'));
    }
  });

  it('reports sunlight independently of the fixed Earth radio geometry and preserves physical positions', () => {
    const R = P.loi.radius, r = R + 110000;
    const cases = [simpleSample(r, 0, false), simpleSample(-r / Math.sqrt(2), -r / Math.sqrt(2), true)];
    for (let i = 0; i < cases.length; i++) for (const width of [280, 1100]) {
      const sample = Object.freeze(cases[i]), profile = Object.freeze({ samples: Object.freeze([sample]), events: Object.freeze({}) });
      const before = JSON.stringify({ sample, profile }), c = recorder();
      const result = P.drawLOIScene(c.ctx, width, 340, sample, profile);
      expect(result.sunAngle).toBe(45); expect(result.sunlight).toEqual(P.lunarSunlight(sample, 45));
      expect(result.sunlight.fraction).toBe(i === 0 ? 1 : 0);
      expect(result.sunlight.phase).toBe(i === 0 ? 'sunlit' : 'total');
      expect(result.radioVisible).toBe(sample.radioVisible);
      expect((result.craftX - result.moonX) / result.pictureScale).toBeCloseTo(sample.x, 5);
      expect((result.moonY - result.craftY) / result.pictureScale).toBeCloseTo(sample.y, 5);
      expect(result.moonRadius / result.pictureScale).toBeCloseTo(R, 5);
      if (sample.radioVisible) expect(result.radioEndX).toBeLessThan(result.craftX);
      else expect((result.radioEndX - result.moonX) / result.pictureScale).toBeCloseTo(R, 5);
      expect(JSON.stringify({ sample, profile })).toBe(before);
      finiteCalls(c.calls); finiteRecord(result);
    }
  });

  it('retains a finite scene and unknown spacecraft illumination at the surface endpoint', () => {
    const sample = simpleSample(P.loi.radius, 0, false), profile = { samples: [sample], events: {} }, c = recorder();
    const result = P.drawLOIScene(c.ctx, 320, 340, sample, profile);
    expect(result.sunAngle).toBe(45); expect(result.sunlight).toBeNull();
    expect(result.radioVisible).toBe(false); expect(result.plumeVisible).toBe(false);
    finiteCalls(c.calls); finiteRecord(result);
  });

  it('keeps an identical coast scene at different presentation times', () => {
    const sample = simpleSample(0, P.loi.radius * 1.2, true), profile = { samples: [sample], events: {} };
    const a = recorder(), b = recorder();
    const first = P.drawLOIScene(a.ctx, 390, 340, sample, profile, { time: 0 });
    const second = P.drawLOIScene(b.ctx, 390, 340, sample, profile, { time: 200 });
    expect(first).toEqual(second); expect(a.calls).toEqual(b.calls);
    expect(first.engineVisible).toBe(false); expect(first.plumeVisible).toBe(false);
  });

  it('uses the existing eclipse model through capture, flyby and impact without changing trajectories', () => {
    for (const plan of [{}, { burnDuration: 0 }, { burnDuration: 600 }]) {
      const profile = P.loiProfile(plan), savedProfile = JSON.stringify(profile);
      for (const time of [profile.events.ignition.time, profile.summary.duration]) {
        const sample = P.loiSample(profile, time), savedSample = JSON.stringify(sample);
        const result = P.drawLOIScene(recorder().ctx, 320, 340, sample, profile);
        expect(result.sunlight).toEqual(P.lunarSunlight(sample, 45));
        expect(result.engineVisible).toBe(sample.engineOn && sample.thrust > 0);
        expect(result.plumeVisible).toBe(sample.engineOn && sample.thrust > 0);
        expect(result.radioVisible).toBe(sample.radioVisible);
        expect(JSON.stringify(sample)).toBe(savedSample);
        finiteRecord(result);
      }
      expect(JSON.stringify(profile)).toBe(savedProfile);
    }
  });

  it('retains the environment orbit camera and spacecraft placement for each shared Sun preset', () => {
    for (const angle of [45, 90, 135]) {
      const profile = P.lunarEnvironmentProfile({}, angle), sample = P.lunarEnvironmentSample(profile, 2000);
      const before = JSON.stringify({ sample, profile }), c = recorder();
      const result = P.drawLunarEnvironment(c.ctx, 650, 420, sample, profile);
      expect(result.scaleX).toBe(result.scaleY);
      expect(result.moonRadius / result.scaleX).toBeCloseTo(P.loi.radius, 8);
      expect((result.spacecraftX - 325) / result.scaleX).toBeCloseTo(sample.x, 6);
      expect((64 + (420 - 190) / 2 - result.spacecraftY) / result.scaleY).toBeCloseTo(sample.y, 6);
      expect(result.plumeVisible).toBe(false);
      finiteCalls(c.calls); expect(JSON.stringify({ sample, profile })).toBe(before);
    }
  });
});
