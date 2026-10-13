import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;

function recorder() {
  const calls = [];
  let nextGradient = 0;
  const gradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { gradientId: ++nextGradient, addColorStop: (...stops) => calls.push(['stop', ...stops]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => calls.push([key, ...args])),
    set: (target, key, value) => {
      target[key] = value;
      calls.push(['set', key, value && value.gradientId ? 'gradient:' + value.gradientId : value]);
      return true;
    },
  });
  return { ctx, calls };
}
const digest = calls => createHash('sha256').update(JSON.stringify(calls)).digest('hex');
const draw = (options, angle = 0.731) => {
  const record = recorder();
  record.result = P.drawLOIStack(record.ctx, 215, 132, 1.6, angle, options);
  return record;
};
function channels(color) {
  expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  return color.slice(4, -1).split(',').map(Number);
}
function finiteCalls(calls) {
  for (const call of calls) for (const value of call) {
    if (typeof value === 'number') expect(Number.isFinite(value), String(call[0])).toBe(true);
  }
}
function plumePrefix(calls) {
  const end = calls.findIndex(row => row[0] === 'set' && row[1] === 'globalAlpha' && row[2] === 1);
  expect(end).toBeGreaterThan(0);
  return calls.slice(0, end + 1);
}
const geometry = calls => calls.filter(row => !['set', 'gradient', 'stop'].includes(row[0]));
const invalidNumbers = [undefined, null, false, true, '', '0', {}, [], new Number(0), NaN, Infinity, -Infinity];

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

describe('orbital spacecraft material illumination', () => {
  it('reprojects local illumination into the same measured physical Sun for full attitudes', () => {
    for (const direction of [[1, 0], [0, 1], [-1, 0], [0, -1], [3, 4], [-7, 2]]) {
      const length = Math.hypot(...direction), world = [direction[0] / length, -direction[1] / length];
      for (const angle of [-8.9, -Math.PI, -Math.PI / 2, -0.31, 0, 0.731, Math.PI / 2, 8.2]) {
        const light = P.orbitalCraftLight({ directionX: direction[0], directionY: direction[1], fraction: 0.37 }, angle);
        // Reproject onto world-screen basis vectors instead of duplicating the inverse transform.
        const axisX = [Math.cos(angle), Math.sin(angle)], axisY = [-Math.sin(angle), Math.cos(angle)];
        expect(light.x * axisX[0] + light.y * axisY[0]).toBeCloseTo(world[0], 13);
        expect(light.x * axisX[1] + light.y * axisY[1]).toBeCloseTo(world[1], 13);
        expect(Math.hypot(light.x, light.y)).toBeCloseTo(1, 13);
        expect(light.fraction).toBe(0.37);
        const g = light.gradient;
        expect(g.x0 + g.x1).toBeCloseTo(0, 13); expect(g.y0 + g.y1).toBeCloseTo(0, 13);
        expect(Math.hypot(g.x1 - g.x0, g.y1 - g.y0)).toBeCloseTo(22, 12);
        expect((g.x1 - g.x0) * light.x + (g.y1 - g.y0) * light.y).toBeCloseTo(22, 12);
        const repeat = P.orbitalCraftLight({ directionX: direction[0], directionY: direction[1], fraction: 0.37 }, angle + 2 * Math.PI);
        expect(repeat.x).toBeCloseTo(light.x, 12); expect(repeat.y).toBeCloseTo(light.y, 12);
      }
    }
  });

  it('normalizes directions, bounds the visible fraction and does not mutate model records', () => {
    for (const fraction of [-7, 0, 0.28, 1, 8]) {
      const sun = Object.freeze({ directionX: 3, directionY: 4, fraction, phase: 'partial' });
      const before = JSON.stringify(sun), light = P.orbitalCraftLight(sun, 0);
      expect(light.x).toBeCloseTo(0.6, 14); expect(light.y).toBeCloseTo(-0.8, 14);
      expect(light.fraction).toBe(Math.max(0, Math.min(1, fraction)));
      expect(JSON.stringify(sun)).toBe(before);
    }
    const sun = { directionX: 1, directionY: 2, fraction: 0.8 };
    const first = P.orbitalCraftLight(sun, 0.4), expected = P.orbitalCraftLight(sun, 0.4);
    first.x = 999; first.gradient.x1 = 999;
    expect(P.orbitalCraftLight(sun, 0.4)).toEqual(expected);
  });

  it('rejects invalid Sun records, attitudes and zero or overflowing direction lengths', () => {
    for (const invalid of invalidNumbers) {
      expect(P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: 1 }, invalid)).toBeNull();
      for (const key of ['directionX', 'directionY', 'fraction']) {
        expect(P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: 1, [key]: invalid }, 0)).toBeNull();
      }
    }
    for (const record of [null, undefined, {}, [], { directionX: 0, directionY: 0, fraction: 1 },
      { directionX: Number.MAX_VALUE, directionY: Number.MAX_VALUE, fraction: 1 }]) {
      expect(P.orbitalCraftLight(record, 0)).toBeNull();
    }
  });

  it('grades facing, perpendicular and away-facing material with opaque bounded RGB', () => {
    const light = P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: 1 }, 0);
    expect(channels(P.orbitalCraftMaterial('#80c0ff', light, 1, 0))).toEqual([128, 192, 255]);
    expect(channels(P.orbitalCraftMaterial('#80C0FF', light, 0, 1))).toEqual([31, 46, 61]);
    expect(channels(P.orbitalCraftMaterial('#80c0ff', light, -1, 0))).toEqual([31, 46, 61]);
    expect(channels(P.orbitalCraftMaterial('#80c0ff', light))).toEqual([31, 46, 61]);
    // Super-unit illustrative normals must not overexpose the base material.
    expect(channels(P.orbitalCraftMaterial('#80c0ff', light, 2, 0))).toEqual([128, 192, 255]);
    const half = channels(P.orbitalCraftMaterial('#80c0ff', light, 0.5, 0));
    expect(half).toEqual([79, 119, 158]);
  });

  it('changes material brightness monotonically through eclipse without changing opacity', () => {
    let previous = [-1, -1, -1];
    for (const fraction of [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1]) {
      const light = P.orbitalCraftLight({ directionX: 3, directionY: 4, fraction }, 0);
      const actual = channels(P.orbitalCraftMaterial('#d0a040', light, 0.6, -0.8));
      for (let channel = 0; channel < 3; channel++) {
        expect(actual[channel]).toBeGreaterThanOrEqual(previous[channel]);
        expect(actual[channel]).toBeLessThanOrEqual([208, 160, 64][channel]);
        expect(actual[channel]).toBe(Math.round([208, 160, 64][channel] * (0.24 + 0.76 * fraction)));
      }
      previous = actual;
    }
    for (const angle of [0, 0.7, 3.1]) {
      const dark = P.orbitalCraftLight({ directionX: 3, directionY: 4, fraction: 0 }, angle);
      expect(channels(P.orbitalCraftMaterial('#d0a040', dark, 1, 0))).toEqual([50, 38, 15]);
      expect(channels(P.orbitalCraftMaterial('#d0a040', dark, -1, 0))).toEqual([50, 38, 15]);
    }
  });

  it('returns original material values for absent or malformed illumination and colors', () => {
    const valid = P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: 1 }, 0);
    for (const light of [undefined, null, {}, { ...valid, x: NaN }, { ...valid, y: Infinity }, { ...valid, fraction: NaN }]) {
      expect(P.orbitalCraftMaterial('#abcdef', light, 1, 0)).toBe('#abcdef');
    }
    for (const color of ['#abc', 'abc123', '#12345g', 'red', 'rgba(1,2,3,.4)', null, undefined, 123]) {
      expect(P.orbitalCraftMaterial(color, valid, 1, 0)).toBe(color);
    }
    for (const invalid of [null, false, '1', NaN, Infinity, {}, []]) {
      expect(P.orbitalCraftMaterial('#abcdef', valid, invalid, 0)).toBe('#abcdef');
      expect(P.orbitalCraftMaterial('#abcdef', valid, 0, invalid)).toBe('#abcdef');
    }
  });

  it('preserves the exact pass48 default stack drawing and metadata for coast and SPS burn', () => {
    // Recorded from pass48 source f21360835e9dada2692dbea536d8fd73744adb74e47b6aa73815c22459e2d035.
    const baseline = { coast: '467e711373c1b674295074ce0ad5fffbc657179c5e671d01d6d310b7433121d4', burn: '9d1087238ed09e9e7680846c30ef19473d902858d9ccdc4a3cf9e643211e802c' };
    for (const engineOn of [false, true]) {
      const options = { time: 23.75, engineOn, thrust: 91000 };
      const original = draw(options);
      expect(digest(original.calls)).toBe(baseline[engineOn ? 'burn' : 'coast']);
      expect(original.result).toEqual({ engineVisible: engineOn, plumeVisible: engineOn });
      for (const sunlight of [null, false, {}, { directionX: 0, directionY: 0, fraction: 1 }]) {
        const fallback = draw({ ...options, sunlight });
        expect(fallback.calls).toEqual(original.calls); expect(fallback.result).toEqual(original.result);
      }
    }
  });

  it('keeps the SPS exhaust path, material and time modulation identical through all eclipse fractions', () => {
    for (const time of [0, 23.75, 80]) {
      const options = { time, engineOn: true, thrust: 91000 }, unlit = draw(options);
      const expected = plumePrefix(unlit.calls);
      expect(expected).toContainEqual(['stop', 0, 'rgba(255,243,220,0.54)']);
      expect(expected).toContainEqual(['stop', 0.24, 'rgba(221,211,248,0.17)']);
      expect(expected).toContainEqual(['stop', 1, 'rgba(206,199,243,0)']);
      for (const fraction of [0, 0.2, 0.75, 1]) {
        const lit = draw({ ...options, sunlight: { directionX: 3, directionY: 4, fraction } });
        expect(plumePrefix(lit.calls)).toEqual(expected);
        expect(lit.result.engineVisible).toBe(true); expect(lit.result.plumeVisible).toBe(true);
        expect(lit.calls.filter(row => row[0] === 'set' && row[1] === 'globalAlpha')).toEqual(
          unlit.calls.filter(row => row[0] === 'set' && row[1] === 'globalAlpha'));
      }
    }
  });

  it('counter-rotates the attached ascent module separately while preserving every hull path and pose', () => {
    const sun = Object.freeze({ directionX: 3, directionY: 4, fraction: 0.45 });
    for (const angle of [-0.8, 0, 0.731, Math.PI / 2, 2.7]) {
      const options = Object.freeze({ time: 25, engineOn: false, thrust: 0, sunlight: sun });
      const before = JSON.stringify(options), lit = draw(options, angle), normal = draw({ time: 25, engineOn: false, thrust: 0 }, angle);
      const body = P.orbitalCraftLight(sun, angle), child = P.orbitalCraftLight(sun, angle + Math.PI / 2);
      expect(lit.result.sunlight).toEqual(body);
      expect(child.x).toBeCloseTo(body.y, 13); expect(child.y).toBeCloseTo(-body.x, 13);
      const g = child.gradient;
      expect(lit.calls).toContainEqual(['gradient', g.x0, g.y0, g.x1, g.y1]);
      expect(geometry(lit.calls)).toEqual(geometry(normal.calls));
      expect(lit.result.engineVisible).toBe(false); expect(lit.result.plumeVisible).toBe(false);
      expect(JSON.stringify(options)).toBe(before);
      finiteCalls(lit.calls);
    }
  });

  it('uses opaque RGB for every lit hull paint and stroke while keeping engine gating explicit', () => {
    for (const fraction of [0, 0.5, 1]) {
      const sunlight = { directionX: 3, directionY: 4, fraction };
      for (const engine of [{ engineOn: false, thrust: 91000 }, { engineOn: true, thrust: 0 }, { engineOn: true, thrust: 91000 }]) {
        const lit = draw({ time: 20, ...engine, sunlight });
        const offset = lit.result.plumeVisible ? plumePrefix(lit.calls).length : 0;
        const body = lit.calls.slice(offset);
        const colors = body.filter(row => row[0] === 'set' && ['fillStyle', 'strokeStyle'].includes(row[1]) && !String(row[2]).startsWith('gradient:')).map(row => row[2]);
        const stops = body.filter(row => row[0] === 'stop').map(row => row[2]);
        expect(colors.length).toBeGreaterThan(20); expect(stops.length).toBeGreaterThan(5);
        [...colors, ...stops].forEach(channels);
        expect(lit.result.plumeVisible).toBe(engine.engineOn && engine.thrust > 0);
        expect(body.filter(row => row[0] === 'drawImage')).toEqual([]);
        expect(body.filter(row => row[0] === 'set' && row[1] === 'globalCompositeOperation')).toEqual([]);
      }
    }
  });

  it('connects LOI material light to the existing measured Sun without changing positions or model state', () => {
    for (const plan of [{}, { burnDuration: 0 }, { burnDuration: 600 }]) {
      const profile = P.loiProfile(plan), savedProfile = JSON.stringify(profile);
      for (const time of [profile.events.ignition.time, profile.summary.duration]) {
        const sample = P.loiSample(profile, time), savedSample = JSON.stringify(sample), c = recorder();
        const result = P.drawLOIScene(c.ctx, 390, 340, sample, profile);
        expect(result.sunlight).toEqual(P.lunarSunlight(sample, 45));
        expect((result.craftX - result.moonX) / result.pictureScale).toBeCloseTo(sample.x, 5);
        expect((result.moonY - result.craftY) / result.pictureScale).toBeCloseTo(sample.y, 5);
        expect(result.plumeVisible).toBe(sample.engineOn && sample.thrust > 0);
        if (result.sunlight) {
          const child = P.orbitalCraftLight(result.sunlight, Math.atan2(-sample.vy, sample.vx) + Math.PI / 2).gradient;
          expect(c.calls).toContainEqual(['gradient', child.x0, child.y0, child.x1, child.y1]);
        }
        expect(JSON.stringify(sample)).toBe(savedSample); finiteCalls(c.calls);
      }
      expect(JSON.stringify(profile)).toBe(savedProfile);
    }
  });

  it('uses each environment Sun preset and eclipse fraction while leaving the Kepler coast and radio geometry unchanged', () => {
    for (const angle of [45, 90, 135]) {
      const profile = P.lunarEnvironmentProfile({}, angle), savedProfile = JSON.stringify(profile);
      for (const time of [0, profile.orbit.period * 0.4, profile.orbit.period * 0.8]) {
        const sample = P.lunarEnvironmentSample(profile, time), savedSample = JSON.stringify(sample), c = recorder();
        const result = P.drawLunarEnvironment(c.ctx, 650, 420, sample, profile);
        const child = P.orbitalCraftLight(sample.sun, Math.atan2(-sample.vy, sample.vx) + Math.PI / 2).gradient;
        expect(c.calls).toContainEqual(['gradient', child.x0, child.y0, child.x1, child.y1]);
        expect(result.scaleX).toBe(result.scaleY); expect(result.plumeVisible).toBe(false);
        expect((result.spacecraftX - 325) / result.scaleX).toBeCloseTo(sample.x, 6);
        expect((64 + (420 - 190) / 2 - result.spacecraftY) / result.scaleY).toBeCloseTo(sample.y, 6);
        const endpoint = sample.earth.hit || sample.earth.target;
        expect((result.radioEndX - 325) / result.scaleX).toBeCloseTo(endpoint.x, 5);
        expect((64 + (420 - 190) / 2 - result.radioEndY) / result.scaleY).toBeCloseTo(endpoint.y, 5);
        expect(JSON.stringify(sample)).toBe(savedSample); finiteCalls(c.calls);
      }
      expect(JSON.stringify(profile)).toBe(savedProfile);
    }
  });
});
