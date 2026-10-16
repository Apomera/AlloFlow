/**
 * Parking orbit needs an opaque, Sun-facing stack while launch and TLI retain
 * their established drawing commands. Surface normals are checked against
 * independent tangent geometry; gradient stops are checked in Canvas space.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});

function recordingCtx(conic = true) {
  const commands = [], gradients = [], properties = { globalAlpha: 1 };
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (key === 'createConicGradient' && !conic) return undefined;
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => {
        const id = gradients.length;
        const gradient = {
          id, kind: key, coords, stops: [],
          addColorStop(offset, color) {
            this.stops.push([offset, color]);
            commands.push(['stop', id, offset, color]);
          },
        };
        gradients.push(gradient);
        commands.push(['gradient', key, id, ...coords]);
        return gradient;
      };
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return key in target ? target[key] : (...args) => commands.push(['call', key, ...args]);
    },
    set(target, key, value) {
      target[key] = value;
      commands.push(['set', key, value && typeof value === 'object' && 'id' in value ? { gradient: value.id } : value]);
      return true;
    },
  });
  return { ctx, commands, gradients };
}

const sun = Object.freeze({ x: 0.8, y: -0.6, fraction: 0.7 });
const paint = '#edf0f4';
const tau = 2 * Math.PI;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
function expectedColor(color, light, u, slope) {
  const magnitude = Math.hypot(1, slope);
  const incidence = Math.max(0, Math.min(1, (u * light.x - slope * light.y) / magnitude));
  const level = 0.24 + 0.76 * Math.max(0, Math.min(1, light.fraction)) * incidence;
  return 'rgb(' + [1, 3, 5].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * level)).join(',') + ')';
}
function expectOpaqueStops(gradient) {
  expect(gradient.coords.every(Number.isFinite)).toBe(true);
  let previous = -1;
  for (const [offset, color] of gradient.stops) {
    expect(Number.isFinite(offset)).toBe(true);
    expect(offset).toBeGreaterThanOrEqual(previous);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThanOrEqual(1);
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    previous = offset;
  }
  expect(gradient.stops[0][0]).toBe(0);
  expect(gradient.stops.at(-1)[0]).toBe(1);
}

// Captured from the accepted pass54 renderer before pass55 source edits.
// These cover launch stages, the legacy parking/TLI stack, and a spent stage.
const legacyCases = [
  ['full stack', 1, undefined, '9f38826622d40f17f3b335f0512db3d3d953847129fb393551b1668460fd9230'],
  ['second stage', 2, undefined, '8688ebcd1b80b8ccdf4fdbb87528eef128b75f2ce6daa390d848e1aace642b8a'],
  ['third stage', 3, undefined, 'a0aecd9776bb85a9b76d2315da2ce12f8baf5b1d75dfb4720c97218c890d9940'],
  ['tower jettisoned', 3, { les: false }, 'df9a810fce35f23adc5048ede00abf726eeeda4934c1e9c1d7a7695e471cd3f7'],
  ['spent first stage', 1, { only: ['s1is', 's1'] }, 'b6756d56ad0999902f4f855c22ba53a19cb84583e70d8418e064ff243912c032'],
];

describe('Saturn surface geometry', () => {
  it('returns unit normals perpendicular to both surface tangents for cones and cylinders', () => {
    for (const [w0, w1, height] of [[8, 8, 20], [1, 12, 20], [12, 1, 20], [0, 12, 6], [12, 0, 6]]) {
      const slope = (w1 - w0) / (2 * height);
      for (const u of [-1, -0.7, -0.25, 0, 0.35, 0.8, 1]) {
        const z = Math.sqrt(1 - u * u);
        const normal = P.saturnSurfaceNormal(u, w0, w1, height);
        // S(theta,y) = (r(y) sin(theta), y, r(y) cos(theta)).
        const axialTangent = { x: slope * u, y: 1, z: slope * z };
        const azimuthTangent = { x: z, y: 0, z: -u };
        expect(dot(normal, axialTangent)).toBeCloseTo(0, 12);
        expect(dot(normal, azimuthTangent)).toBeCloseTo(0, 12);
        expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 12);
        expect(normal.z).toBeGreaterThanOrEqual(0);
        if (slope === 0) expect(normal.y).toBeCloseTo(0, 12);
        else expect(Math.sign(normal.y)).toBe(-Math.sign(slope));
      }
    }
  });

  it('clamps off-silhouette samples and rejects invalid dimensions without producing NaN normals', () => {
    expect(P.saturnSurfaceNormal(-3, 2, 6, 10)).toEqual(P.saturnSurfaceNormal(-1, 2, 6, 10));
    expect(P.saturnSurfaceNormal(3, 2, 6, 10)).toEqual(P.saturnSurfaceNormal(1, 2, 6, 10));
    for (const args of [[NaN, 2, 6, 10], [Infinity, 2, 6, 10], [0, NaN, 6, 10], [0, 2, Infinity, 10], [0, -1, 6, 10], [0, 2, -1, 10], [0, 2, 6, 0], [0, 2, 6, -2], [0, 2, 6, NaN]]) {
      expect(P.saturnSurfaceNormal(...args), JSON.stringify(args)).toBeNull();
    }
  });
});

describe('Saturn opaque material gradients', () => {
  it('lights a cylinder by its changing transverse normal', () => {
    const rec = recordingCtx();
    const gradient = P.saturnMaterialGradient(rec.ctx, 11, 7, 49, 20, 20, paint, sun);
    expect(gradient.kind).toBe('createLinearGradient');
    expect(gradient.coords[0]).toBe(1);
    expect(gradient.coords[2]).toBe(21);
    expectOpaqueStops(gradient);
    expect(gradient.stops.length).toBeGreaterThanOrEqual(9);
    for (const [offset, color] of gradient.stops) expect(color).toBe(expectedColor(paint, sun, 2 * offset - 1, 0));
  });

  it.each([[4, 22], [22, 4], [0, 22], [22, 0]])('keeps cone meridians consistently lit for diameters %s to %s', (w0, w1) => {
    const rec = recordingCtx();
    const cx = 11, y0 = 7, y1 = 49, slope = (w1 - w0) / (2 * (y1 - y0));
    const gradient = P.saturnMaterialGradient(rec.ctx, cx, y0, y1, w0, w1, paint, sun);
    expect(gradient.kind).toBe('createConicGradient');
    expect(gradient.coords[1]).toBe(cx);
    expect(gradient.coords[2]).toBeCloseTo(y0 - w0 / (2 * slope), 12);
    expectOpaqueStops(gradient);
    const samples = gradient.stops.filter(([offset]) => offset > 0 && offset < 1);
    expect(samples.length).toBeGreaterThanOrEqual(9);
    const physicalU = [];
    for (const [offset, color] of samples) {
      const theta = gradient.coords[0] + tau * offset;
      const u = Math.cos(theta) / Math.sin(theta) / slope;
      expect(Math.abs(u)).toBeLessThanOrEqual(1 + 1e-12);
      physicalU.push(u);
      expect(color).toBe(expectedColor(paint, sun, u, slope));
      // The same Canvas ray crosses a fixed meridian at every hull height.
      for (const t of [0.1, 0.45, 0.9]) {
        const y = y0 + t * (y1 - y0), radius = (w0 + t * (w1 - w0)) / 2;
        const x = cx + radius * u;
        const angle = Math.atan2(y - gradient.coords[2], x - cx);
        expect(Math.cos(angle - theta)).toBeCloseTo(1, 12);
      }
    }
    expect(Math.min(...physicalU)).toBeCloseTo(-1, 12);
    expect(Math.max(...physicalU)).toBeCloseTo(1, 12);
    expect(gradient.stops[0][1]).toBe(samples[0][1]);
    expect(gradient.stops.at(-1)[1]).toBe(samples.at(-1)[1]);
  });

  it('provides an opaque linear fallback when conic gradients are unavailable', () => {
    const rec = recordingCtx(false);
    const gradient = P.saturnMaterialGradient(rec.ctx, 11, 7, 49, 4, 22, paint, sun);
    expect(gradient.kind).toBe('createLinearGradient');
    expectOpaqueStops(gradient);
    const slope = (22 - 4) / (2 * (49 - 7));
    for (const [offset, color] of gradient.stops) expect(color).toBe(expectedColor(paint, sun, 2 * offset - 1, slope));
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an object without addColorStop', {}],
    ['a non-callable addColorStop', { addColorStop: 3 }],
  ])('uses the same directional fallback when the conic API returns %s', (_name, conicResult) => {
    for (const [w0, w1] of [[4, 22], [22, 4]]) {
      const expected = recordingCtx(false);
      const fallback = P.saturnMaterialGradient(expected.ctx, 11, 7, 49, w0, w1, paint, sun);
      const rec = recordingCtx();
      let conicCalls = 0;
      const ctx = new Proxy(rec.ctx, {
        get(target, key) {
          if (key === 'createConicGradient') return () => { conicCalls++; return conicResult; };
          return Reflect.get(target, key);
        },
      });
      const gradient = P.saturnMaterialGradient(ctx, 11, 7, 49, w0, w1, paint, sun);
      expect(conicCalls).toBe(1);
      expect(gradient.kind).toBe('createLinearGradient');
      expect(gradient.coords).toEqual(fallback.coords);
      expect(gradient.stops).toEqual(fallback.stops);
      expect(rec.commands).toEqual(expected.commands);
      expectOpaqueStops(gradient);
      const slope = (w1 - w0) / (2 * (49 - 7));
      for (const [offset, color] of gradient.stops) expect(color).toBe(expectedColor(paint, sun, 2 * offset - 1, slope));
    }
  });

  it('retains the full opaque silhouette in shadow with the stated exposure floor', () => {
    for (const dims of [[20, 20], [4, 22], [22, 4]]) {
      const rec = recordingCtx();
      const gradient = P.saturnMaterialGradient(rec.ctx, 11, 7, 49, ...dims, paint, { ...sun, fraction: 0 });
      expectOpaqueStops(gradient);
      expect(new Set(gradient.stops.map(([, color]) => color))).toEqual(new Set(['rgb(57,58,59)']));
      expect(rec.commands.some(command => command[0] === 'set' && command[1] === 'globalAlpha')).toBe(false);
    }
  });

  it('is deterministic and leaves the caller light unchanged', () => {
    const first = recordingCtx(), second = recordingCtx();
    P.saturnMaterialGradient(first.ctx, 11, 7, 49, 4, 22, paint, sun);
    P.saturnMaterialGradient(second.ctx, 11, 7, 49, 4, 22, paint, sun);
    expect(first.commands).toEqual(second.commands);
    expect(sun).toEqual({ x: 0.8, y: -0.6, fraction: 0.7 });
  });

  it('returns unmodified paint for invalid geometry or light', () => {
    const cases = [
      [NaN, 7, 49, 4, 22, sun], [11, NaN, 49, 4, 22, sun], [11, 7, Infinity, 4, 22, sun],
      [11, 7, 7, 4, 22, sun], [11, 7, 49, -4, 22, sun], [11, 7, 49, 4, NaN, sun],
      [11, 7, 49, 4, 22, null], [11, 7, 49, 4, 22, { x: NaN, y: 0, fraction: 1 }],
      [11, 7, 49, 4, 22, { x: 0, y: 0, fraction: 1 }], [11, 7, 49, 4, 22, { x: 1, y: 0, fraction: Infinity }],
    ];
    for (const [cx, y0, y1, w0, w1, light] of cases) {
      const rec = recordingCtx();
      expect(P.saturnMaterialGradient(rec.ctx, cx, y0, y1, w0, w1, paint, light)).toBe(paint);
      expect(rec.commands).toEqual([]);
    }
  });
});

describe('Saturn renderer compatibility', () => {
  it.each(legacyCases)('preserves all default drawing commands for %s', (_name, stage, opts, expectedHash) => {
    const rec = recordingCtx();
    P.saturnV(rec.ctx, 20, 7, 221, stage, opts);
    expect(createHash('sha256').update(JSON.stringify(rec.commands)).digest('hex')).toBe(expectedHash);
  });

  it('falls back to the exact legacy drawing when optional lighting is invalid', () => {
    const invalid = [null, {}, { x: 0, y: 0, fraction: 1 }, { x: NaN, y: 0, fraction: 1 }, { x: 1, y: Infinity, fraction: 1 }, { x: 1, y: 0, fraction: NaN }];
    for (const [, stage, opts] of legacyCases) {
      const baseline = recordingCtx();
      const geometry = P.saturnV(baseline.ctx, 20, 7, 221, stage, opts);
      for (const orbitLight of invalid) {
        const rec = recordingCtx();
        expect(P.saturnV(rec.ctx, 20, 7, 221, stage, { ...opts, orbitLight })).toEqual(geometry);
        expect(rec.commands).toEqual(baseline.commands);
      }
    }
  });

  it('changes material colors without changing stage geometry, hull paths or opacity', () => {
    for (const [, stage, opts] of legacyCases) {
      const baseline = recordingCtx();
      const geometry = P.saturnV(baseline.ctx, 20, 7, 221, stage, opts);
      for (const fraction of [0, 0.5, 1]) {
        const rec = recordingCtx();
        const light = Object.freeze({ ...sun, fraction });
        expect(P.saturnV(rec.ctx, 20, 7, 221, stage, { ...opts, orbitLight: light })).toEqual(geometry);
        expect(rec.commands.filter(command => command[0] === 'call')).toEqual(baseline.commands.filter(command => command[0] === 'call'));
        expect(rec.commands.some(command => command[0] === 'set' && command[1] === 'globalAlpha')).toBe(false);
        expect(rec.gradients.length).toBeGreaterThan(0);
        rec.gradients.forEach(expectOpaqueStops);
      }
    }
  });

  it('keeps the apparent Sun fixed at screen right as the displayed stack turns', () => {
    for (const angle of [0, Math.PI / 7, Math.PI / 2, Math.PI, -2.2, 5.8]) {
      for (const fraction of [0, 1]) {
        const light = P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction }, angle);
        const screenX = light.x * Math.cos(angle) - light.y * Math.sin(angle);
        const screenY = light.x * Math.sin(angle) + light.y * Math.cos(angle);
        expect(screenX).toBeCloseTo(1, 12);
        expect(screenY).toBeCloseTo(0, 12);
        expect(light.fraction).toBe(fraction);
      }
    }
  });
});
