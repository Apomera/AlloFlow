/**
 * The orbital Earth uses a Sun direction in the image plane. These checks
 * derive sphere normals from tangent geometry and bound the Canvas gradient's
 * interpolation error. Legacy globe calls retain their accepted draw commands.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});

function recordingCtx() {
  const commands = [], gradients = [], properties = {};
  const ctx = new Proxy(properties, {
    get(target, key) {
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

const digest = commands => createHash('sha256').update(JSON.stringify(commands)).digest('hex');
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const alpha = color => {
  const match = /^rgba\(0,\s*0,\s*0,\s*([\d.eE+-]+)\)$/.exec(color);
  expect(match, 'shade is neutral black with a finite alpha').not.toBeNull();
  return Number(match[1]);
};
function interpolate(stops, offset) {
  const upper = stops.findIndex(([x]) => x >= offset);
  if (upper === 0) return alpha(stops[0][1]);
  const [x0, c0] = stops[upper - 1], [x1, c1] = stops[upper];
  return alpha(c0) + (alpha(c1) - alpha(c0)) * (offset - x0) / (x1 - x0);
}
function globe(args, opts) {
  const rec = recordingCtx();
  P.drawEarthGlobe(rec.ctx, ...args, opts);
  return rec;
}

// Recorded BEFORE pass59 edits from accepted pass58 source SHA-256
// 53a8f2cd591b4a03d917fba0995aced046ae63cc40335d84e95d31fb0a02c9f9.
// Undefined arguments are explicit so the optional eighth argument stays eighth.
const legacyCases = [
  ['tiny globe', [12, 34, 2, 0, undefined, undefined], '77b9267000c7050105202f080bd6488316519e6f665e224e943aae9c7ed448f4'],
  ['cloudless globe', [12, 34, 14, 0, undefined, undefined], '8d9713a8d52cea6b0691e9d055631384130a4822aa41a40604893dd0531c7c1f'],
  ['plain globe', [12, 34, 86, 500, undefined, undefined], '44b82f2c0b77abf59769aff1c913a030a33c1c5fbcd765e359ce010962cb4313'],
  ['rightward Sun', [12, 34, 86, 2000, 0, undefined], '09db2e11936732831944947b29c89d422c0aa1d0f2cd34207d13daa1f734279e'],
  ['rotated Sun', [12, 34, 86, 4000, 1.1, undefined], 'a34bdaa369e7da8dfa2b58359ab4cbf5f8f1d890d858343d417fe4111e6508b8'],
  ['crescent', [12, 34, 86, 500, -2.3, 0.25], '13d795667058438c500d9e7e232209f0816f67a7c35ff07c96ab325d04168b3c'],
  ['gibbous', [12, 34, 86, 500, 0.7, 0.75], 'd2fc0d4a724b3434f7317ac0cf0e63b2c77340cfe5066febfa31ea43aa34fc4d'],
];

describe('Orbital Earth surface normals and lighting', () => {
  it('returns an outward unit normal perpendicular to both sphere tangents', () => {
    for (const latitude of [-1.2, -0.6, 0, 0.4, 1.3]) for (const longitude of [-1.3, -0.8, 0, 0.5, 1.4]) {
      const u = Math.cos(latitude) * Math.sin(longitude), v = Math.sin(latitude);
      const result = P.earthSurfaceLight(u, v, 0.7);
      const meridian = { x: -Math.sin(latitude) * Math.sin(longitude), y: Math.cos(latitude), z: -Math.sin(latitude) * Math.cos(longitude) };
      const parallel = { x: Math.cos(longitude), y: 0, z: -Math.sin(longitude) };
      expect(dot(result.normal, meridian)).toBeCloseTo(0, 12);
      expect(dot(result.normal, parallel)).toBeCloseTo(0, 12);
      expect(Math.hypot(...Object.values(result.normal))).toBeCloseTo(1, 12);
      expect(result.normal.z).toBeGreaterThan(0);
      expect(result.incidence).toBeCloseTo(dot(result.normal, { x: Math.cos(0.7), y: Math.sin(0.7), z: 0 }), 12);
    }
    expect(P.earthSurfaceLight(1, 0, 0).normal).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('rotates light with the camera and retains brightness under a shared rotation', () => {
    for (const [u, v] of [[0.6, 0.2], [-0.3, 0.8], [0, 0], [0.15, -0.4]]) {
      for (const sun of [-2.8, -0.6, 0, 1.9]) for (const rotation of [-3, -1.1, 0.4, 2.2]) {
        const c = Math.cos(rotation), s = Math.sin(rotation);
        const a = P.earthSurfaceLight(u, v, sun);
        const b = P.earthSurfaceLight(u * c - v * s, u * s + v * c, sun + rotation);
        expect(b.incidence).toBeCloseTo(a.incidence, 12);
        expect(b.exposure).toBeCloseTo(a.exposure, 12);
      }
    }
    expect(P.earthSurfaceLight(1, 0, 0).exposure).toBeCloseTo(1, 12);
    expect(P.earthSurfaceLight(-1, 0, 0).exposure).toBeCloseTo(0.08, 12);
    expect(P.earthSurfaceLight(0, 0, 0).exposure).toBeCloseTo(0.08, 12);
    expect(P.earthSurfaceLight(0.25, 0, 0).exposure).toBeCloseTo(0.54, 12);
  });

  it('rejects non-finite, non-numeric and off-disc coordinates', () => {
    for (const args of [[NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity], [0, 0, NaN], ['0', 0, 0], [0, null, 0], [0, 0, undefined], [1.00001, 0, 0], [0.9, 0.9, 0]]) {
      expect(P.earthSurfaceLight(...args), JSON.stringify(args)).toBeNull();
    }
  });
});

describe('Canvas Earth surface exposure', () => {
  it('places gradient endpoints along the Sun for translated and scaled globes', () => {
    for (const angle of [-2.3, -0.5, 0, Math.PI / 2, Math.PI]) for (const radius of [2, 14, 86, 2000]) {
      const rec = recordingCtx(), cx = 137, cy = -29;
      const gradient = P.earthSurfaceGradient(rec.ctx, cx, cy, radius, angle);
      expect(gradient.kind).toBe('createLinearGradient');
      const [x0, y0, x1, y1] = gradient.coords;
      expect((x0 + x1) / 2).toBeCloseTo(cx, 10);
      expect((y0 + y1) / 2).toBeCloseTo(cy, 10);
      expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(2 * radius, 10);
      expect((x1 - x0) / (2 * radius)).toBeCloseTo(Math.cos(angle), 12);
      expect((y1 - y0) / (2 * radius)).toBeCloseTo(Math.sin(angle), 12);
      expect(gradient.stops[0][0]).toBe(0);
      expect(gradient.stops.at(-1)[0]).toBe(1);
      let previous = -1, previousAlpha = 1;
      for (const [offset, color] of gradient.stops) {
        const a = alpha(color);
        expect(Number.isFinite(offset) && Number.isFinite(a)).toBe(true);
        expect(offset).toBeGreaterThan(previous);
        expect(offset).toBeLessThanOrEqual(1);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(previousAlpha);
        const normalAlongSun = offset * 2 - 1;
        expect(1 - a).toBeCloseTo(0.08 + 0.92 * Math.sqrt(Math.max(0, normalAlongSun)), 12);
        previous = offset; previousAlpha = a;
      }
    }
  });

  it('bounds interpolated exposure error to 0.72 percent including the steep terminator', () => {
    const rec = recordingCtx(), gradient = P.earthSurfaceGradient(rec.ctx, 0, 0, 100, 0);
    // Canvas linearly interpolates black alpha. Dense samples test the exposed
    // function independently; each actual stop interval also gets 33 samples.
    const samples = Array.from({ length: 10001 }, (_, i) => i / 10000);
    for (let i = 1; i < gradient.stops.length; i++) {
      const start = gradient.stops[i - 1][0], end = gradient.stops[i][0];
      for (let j = 0; j <= 32; j++) samples.push(start + (end - start) * j / 32);
    }
    let maxError = 0;
    for (const offset of samples) {
      const actual = 1 - interpolate(gradient.stops, offset);
      const incidence = Math.max(0, offset * 2 - 1);
      const expected = 0.08 + 0.92 * Math.sqrt(incidence);
      maxError = Math.max(maxError, Math.abs(actual - expected));
      expect(actual).toBeLessThanOrEqual(expected + 1e-12);
    }
    expect(maxError).toBeLessThanOrEqual(0.0071875 + 1e-12);
    expect(maxError).toBeGreaterThan(0.007);
  });
});

describe('Earth renderer opt-in and preservation', () => {
  it.each(legacyCases)('preserves the accepted %s command stream', (_name, args, hash) => {
    expect(digest(globe(args).commands)).toBe(hash);
    expect(digest(globe(args, { surfaceLight: false }).commands)).toBe(hash);
  });

  it('keeps invalid Sun inputs and explicitly phased views on the legacy branch', () => {
    for (const sun of [undefined, null, NaN, Infinity, '0']) {
      const args = [12, 34, 86, 500, sun, undefined];
      expect(globe(args, { surfaceLight: true }).commands).toEqual(globe(args).commands);
    }
    for (const lit of [0, 0.25, 0.5, 0.75, 1, NaN]) {
      const args = [12, 34, 86, 500, 0.7, lit];
      expect(globe(args, { surfaceLight: true }).commands).toEqual(globe(args).commands);
    }
  });

  it('preserves coast, cloud and city geometry while applying the same exposure to all surface materials', () => {
    const shapeCommands = commands => commands.filter(c => c[0] === 'call' && ['moveTo', 'lineTo', 'ellipse', 'closePath'].includes(c[1]));
    const cityCommands = commands => commands.filter(c => c[0] === 'call' && c[1] === 'fillRect' && c[4] === 1.2 && c[5] === 1.2);
    for (const [radius, tick, sun] of [[14, 0, 0], [86, 500, 1.1], [2000, 4000, -2.3]]) {
      const args = [12, 34, radius, tick, sun, undefined];
      const legacy = globe(args), surface = globe(args, { surfaceLight: true });
      expect(shapeCommands(surface.commands)).toEqual(shapeCommands(legacy.commands));
      expect(cityCommands(surface.commands)).toEqual(cityCommands(legacy.commands));
      expect(surface.commands.some(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#397fd1')).toBe(true);
      const shading = surface.gradients.filter(g => g.kind === 'createLinearGradient' && g.stops.length === 34);
      expect(shading).toHaveLength(1);
      expect(surface.gradients.some(g => g.stops.some(([, color]) => color === '#4a9aea' || color === 'rgba(4,12,40,0.5)'))).toBe(false);
      const commands = surface.commands;
      const shadePaint = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2]?.gradient === shading[0].id);
      const citiesPaint = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === 'rgba(253,224,71,0.85)');
      const lastSurfacePath = commands.findLastIndex(c => c[0] === 'call' && ['lineTo', 'ellipse'].includes(c[1]));
      expect(shadePaint).toBeGreaterThan(lastSurfacePath);
      expect(citiesPaint).toBeGreaterThan(shadePaint);
      expect(commands.slice(shadePaint + 1, citiesPaint).some(c => c[0] === 'call' && (c[1] === 'fill' || c[1] === 'fillRect'))).toBe(true);
      // The final two atmosphere rings and their exposure remain unchanged.
      expect(surface.gradients.slice(-2).map(g => [g.kind, g.coords, g.stops])).toEqual(legacy.gradients.slice(-2).map(g => [g.kind, g.coords, g.stops]));
    }
  });
});
