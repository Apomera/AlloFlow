/** Ocean reflection uses a sphere's mirror normal and projected cap contours. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P, canvasContext;
beforeEach(() => {
  resetStemLab();
  canvasContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function recordingCtx() {
  const commands = [], gradients = [], properties = {};
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => {
        const id = gradients.length;
        const gradient = {
          id, kind: key, coords, stops: [],
          addColorStop(offset, color) { this.stops.push([offset, color]); commands.push(['stop', id, offset, color]); },
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
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const rotate = (u, v, angle) => [u * Math.cos(angle) - v * Math.sin(angle), u * Math.sin(angle) + v * Math.cos(angle)];
function globe(args, opts) {
  const rec = recordingCtx();
  P.drawEarthGlobe(rec.ctx, ...args, opts);
  return rec;
}
function glintPaints(commands) {
  return commands.filter(c => c[0] === 'set' && c[1] === 'fillStyle' && /^rgba\(236,244,250,/.test(c[2]) && c[2] !== 'rgba(236,244,250,0.92)');
}

// Captured from the frozen pass60 renderer BEFORE pass61 edits, source SHA-256
// 49afa68ec3c9320d22ee8a319f5a1520b60105b0471f71eb3f5b8ac2f188d8c2.
const preserved = [
  ['tiny', [12, 34, 2, 0, 0, undefined], { surfaceLight: true, thinAtmosphere: true }, '77b9267000c7050105202f080bd6488316519e6f665e224e943aae9c7ed448f4'],
  ['default', [12, 34, 86, 500, undefined, undefined], undefined, '44b82f2c0b77abf59769aff1c913a030a33c1c5fbcd765e359ce010962cb4313'],
  ['legacy Sun', [12, 34, 86, 2000, 0, undefined], undefined, '09db2e11936732831944947b29c89d422c0aa1d0f2cd34207d13daa1f734279e'],
  ['surface', [12, 34, 86, 500, 0, undefined], { surfaceLight: true }, '14ceac0fc1eb17dd0e5f3a0501e4e7a96c094b42072981e71fbbe61832166f96'],
  ['thin shell', [12, 34, 86, 500, 0, undefined], { surfaceLight: true, thinAtmosphere: true }, '2b0ac3b034711ab99e9b213c7cac9bc2018db3f38b1f66f3cb22e65429458220'],
  ['rotated shell', [12, 34, 86, 4000, 1.1, undefined], { surfaceLight: true, thinAtmosphere: true }, '8f55c3c0b458941385698d4e2b592b3137e8b110ca19cbc5375395c7003140f1'],
  ['crescent', [12, 34, 86, 500, -2.3, 0.25], { surfaceLight: true, thinAtmosphere: true }, '13d795667058438c500d9e7e232209f0816f67a7c35ff07c96ab325d04168b3c'],
  ['gibbous', [12, 34, 86, 500, 0.7, 0.75], { surfaceLight: true, thinAtmosphere: true }, 'd2fc0d4a724b3434f7317ac0cf0e63b2c77340cfe5066febfa31ea43aa34fc4d'],
];

describe('Earth ocean reflection geometry', () => {
  it('puts the maximum at the normal that reflects the incident ray toward the viewer', () => {
    for (const angle of [-3, -1.2, 0, 0.7, Math.PI / 2, Math.PI]) {
      const light = [Math.cos(angle), Math.sin(angle), 0], viewer = [0, 0, 1];
      const normal = light.map((value, i) => (value + viewer[i]) / Math.SQRT2);
      const incidence = dot(normal, light);
      const reflected = normal.map((value, i) => 2 * incidence * value - light[i]);
      expect(reflected[0]).toBeCloseTo(viewer[0], 12);
      expect(reflected[1]).toBeCloseTo(viewer[1], 12);
      expect(reflected[2]).toBeCloseTo(viewer[2], 12);
      const result = P.earthOceanGlint(normal[0], normal[1], angle);
      expect(result.incidence).toBeCloseTo(Math.SQRT1_2, 12);
      expect(result.halfDot).toBeCloseTo(1, 12);
      expect(result.strength).toBeCloseTo(0.42, 12);
    }
  });

  it('decays symmetrically about the mirror normal and rejects the unlit hemisphere', () => {
    let previous = 0.43;
    for (const deviation of [0, 0.03, 0.08, 0.16, 0.3, 0.5]) {
      const normalAngle = Math.PI / 4 + deviation;
      const a = P.earthOceanGlint(Math.sin(normalAngle), 0, 0);
      const b = P.earthOceanGlint(Math.sin(Math.PI / 4 - deviation), 0, 0);
      expect(a.strength).toBeCloseTo(b.strength, 12);
      expect(a.strength).toBeCloseTo(0.42 * Math.cos(deviation) ** 64, 12);
      expect(a.strength).toBeLessThan(previous);
      previous = a.strength;
    }
    for (const u of [-1, -0.9, -0.5, -0.001, 0]) {
      expect(P.earthOceanGlint(u, 0, 0).strength).toBe(0);
    }
  });

  it('preserves reflection strength under a shared Sun and camera rotation', () => {
    for (const [u, v] of [[0.7, 0], [0.6, 0.2], [-0.4, 0.8], [0, 0]]) {
      for (const sun of [-2.8, -0.4, 0, 1.8]) for (const turn of [-2, -0.7, 0.3, 1.9]) {
        const a = P.earthOceanGlint(u, v, sun);
        const b = P.earthOceanGlint(...rotate(u, v, turn), sun + turn);
        expect(b.incidence).toBeCloseTo(a.incidence, 12);
        expect(b.halfDot).toBeCloseTo(a.halfDot, 12);
        expect(b.strength).toBeCloseTo(a.strength, 12);
      }
    }
  });

  it('returns null for invalid coordinates and remains finite at the limb', () => {
    for (const args of [[NaN, 0, 0], [0, Infinity, 0], [0, 0, -Infinity], ['0', 0, 0], [0, null, 0], [0, 0, undefined], [1.001, 0, 0], [0.8, 0.8, 0]]) {
      expect(P.earthOceanGlint(...args)).toBeNull();
    }
    for (const [u, v] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]) {
      const g = P.earthOceanGlint(u, v, 1.3);
      expect(Object.values(g).every(Number.isFinite)).toBe(true);
      expect(g.halfDot).toBeGreaterThanOrEqual(0);
      expect(g.halfDot).toBeLessThanOrEqual(1);
      expect(g.strength).toBeGreaterThanOrEqual(0);
      expect(g.strength).toBeLessThanOrEqual(0.42);
    }
  });
});

describe('Projected spherical reflection contours', () => {
  it('lifts every ellipse back to unit normals at the intended specular angle', () => {
    const layers = P.earthOceanGlintLayers();
    expect(layers).toHaveLength(32);
    for (const layer of layers) for (let sample = 0; sample < 24; sample++) {
      const angle = sample * Math.PI / 12;
      const u = layer.center + layer.radial * Math.cos(angle), v = layer.tangential * Math.sin(angle);
      const z = Math.sqrt(1 - u * u - v * v);
      expect(u).toBeGreaterThan(0);
      expect(z).toBeGreaterThan(0);
      // Intersection of the sphere and the plane normal to the mirror normal.
      expect((u + z) / Math.SQRT2).toBeCloseTo(layer.threshold, 12);
      expect(P.earthOceanGlint(u, v, 0).halfDot).toBeCloseTo(layer.threshold, 12);
    }
  });

  it('bounds the composited contour approximation to half one opacity step', () => {
    const layers = P.earthOceanGlintLayers();
    let maxError = 0;
    for (let sample = 0; sample <= 8192; sample++) {
      const analyticStrength = 0.42 * sample / 8192;
      const halfDot = Math.pow(sample / 8192, 1 / 64);
      let actual = 0;
      for (const layer of layers) if (halfDot >= layer.threshold) actual = layer.alpha + actual * (1 - layer.alpha);
      maxError = Math.max(maxError, Math.abs(actual - analyticStrength));
    }
    expect(maxError).toBeLessThanOrEqual(0.42 / 64 + 1e-12);
    expect(maxError).toBeGreaterThan(0.0065);
    let total = 0;
    for (const layer of layers) {
      expect(layer.alpha).toBeGreaterThan(0);
      expect(layer.alpha).toBeLessThan(1);
      total = layer.alpha + total * (1 - layer.alpha);
      expect(total).toBeCloseTo(layer.opacity, 12);
    }
    expect(total).toBeCloseTo(0.42, 12);
  });

  it('returns fresh layer data so inspection cannot corrupt later drawing', () => {
    const before = P.earthOceanGlintLayers(), snapshot = JSON.parse(JSON.stringify(before));
    before[0].alpha = 1;
    before[0].center = 1000;
    before.pop();
    expect(P.earthOceanGlintLayers()).toEqual(snapshot);
  });

  it('translates and rotates the exact contours while balancing Canvas state', () => {
    const layers = P.earthOceanGlintLayers();
    for (const radius of [2, 16, 86, 2000]) for (const angle of [0, -1.3, Math.PI]) {
      const rec = recordingCtx();
      expect(P.drawEarthOceanGlint(rec.ctx, 31, -9, radius, angle)).toEqual({ layers: 32, peakOpacity: 0.42, exponent: 64 });
      expect(rec.commands.slice(0, 3)).toEqual([['call', 'save'], ['call', 'translate', 31, -9], ['call', 'rotate', angle]]);
      expect(rec.commands.at(-1)).toEqual(['call', 'restore']);
      const ellipses = rec.commands.filter(c => c[0] === 'call' && c[1] === 'ellipse');
      expect(ellipses).toHaveLength(32);
      expect(rec.commands.filter(c => c[0] === 'call' && c[1] === 'fill')).toHaveLength(32);
      ellipses.forEach((ellipse, i) => expect(ellipse.slice(2)).toEqual([radius * layers[i].center, 0, radius * layers[i].radial, radius * layers[i].tangential, 0, 0, Math.PI * 2]));
      glintPaints(rec.commands).forEach((paint, i) => expect(Number(paint[2].slice(17, -1))).toBeCloseTo(layers[i].alpha, 12));
    }
  });

  it('does not touch Canvas for invalid geometry', () => {
    for (const args of [[0, 0, 0, 0], [0, 0, -1, 0], [NaN, 0, 10, 0], [0, Infinity, 10, 0], [0, 0, 10, undefined], [0, 0, 10, '0']]) {
      const rec = recordingCtx();
      expect(P.drawEarthOceanGlint(rec.ctx, ...args)).toBeNull();
      expect(rec.commands).toEqual([]);
    }
    expect(P.drawEarthOceanGlint(null, 0, 0, 10, 0)).toBeNull();
  });
});

describe('Globe material boundaries and compatibility', () => {
  it.each(preserved)('preserves the accepted %s command stream when glint is absent', (_name, args, opts, hash) => {
    expect(digest(globe(args, opts).commands)).toBe(hash);
    expect(digest(globe(args, { ...opts, oceanGlint: false }).commands)).toBe(hash);
  });

  it('requires an explicit glint option, valid surface light and sufficient radius', () => {
    for (const value of [undefined, false, 1, 'true', null]) {
      const args = [12, 34, 86, 500, 0, undefined];
      expect(globe(args, { surfaceLight: true, oceanGlint: value }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
    for (const surfaceLight of [undefined, false, 1, 'true']) {
      const args = [12, 34, 86, 500, 0, undefined];
      expect(globe(args, { surfaceLight, oceanGlint: true }).commands).toEqual(globe(args, { surfaceLight }).commands);
    }
    for (const sun of [undefined, null, NaN, Infinity, '0']) {
      const args = [12, 34, 86, 500, sun, undefined];
      expect(globe(args, { surfaceLight: true, oceanGlint: true }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
    for (const lit of [0, 0.25, 0.5, 1, NaN]) {
      const args = [12, 34, 86, 500, 0, lit];
      expect(globe(args, { surfaceLight: true, oceanGlint: true }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
    for (const radius of [2, 3, 14, 15.999]) {
      const args = [12, 34, radius, 500, 0, undefined];
      expect(globe(args, { surfaceLight: true, oceanGlint: true }).commands).toEqual(globe(args, { surfaceLight: true }).commands);
    }
    expect(glintPaints(globe([12, 34, 16, 500, 0, undefined], { surfaceLight: true, oceanGlint: true }).commands)).toHaveLength(32);
  });

  it('paints reflection below opaque land, translucent clouds and common surface exposure', () => {
    const commands = globe([12, 34, 86, 500, 0, undefined], { surfaceLight: true, oceanGlint: true }).commands;
    const firstGlint = commands.indexOf(glintPaints(commands)[0]);
    const lastGlint = commands.indexOf(glintPaints(commands).at(-1));
    const ocean = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#397fd1');
    const land = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === '#3f7d3a');
    const clouds = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === 'rgba(255,255,255,0.5)');
    const exposure = commands.findIndex(c => c[0] === 'set' && c[1] === 'fillStyle' && typeof c[2]?.gradient === 'number');
    expect(firstGlint).toBeGreaterThan(ocean);
    expect(land).toBeGreaterThan(lastGlint);
    expect(clouds).toBeGreaterThan(land);
    expect(exposure).toBeGreaterThan(clouds);
    const icePaths = P.earthLandPaths(12, 34, 86, 500).filter(path => path.k === 'ice');
    expect(icePaths.length).toBeGreaterThan(0);
    const iceClips = commands.map((c, i) => [c, i]).filter(([c]) => c[0] === 'call' && c[1] === 'clip' && c[2] === 'evenodd');
    expect(iceClips).toHaveLength(icePaths.length);
    expect(iceClips.every(([, i]) => i < firstGlint)).toBe(true);
  });
});

function nativePixelContext() {
  const context = {
    createImageData: vi.fn((width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) })),
    putImageData: vi.fn(),
  };
  canvasContext.mockReturnValue(context);
  return context;
}

describe('Single-composite analytical ocean reflection', () => {
  it('builds a bounded 512 px image whose alpha matches independent sphere normals', () => {
    const native = nativePixelContext(), rec = recordingCtx();
    expect(P.drawEarthOceanGlint(rec.ctx, 30, 50, 86, 0)).toEqual({ layers: 1, peakOpacity: 0.42, exponent: 64 });
    expect(native.createImageData).toHaveBeenCalledTimes(1);
    expect(native.createImageData).toHaveBeenCalledWith(512, 512);
    expect(native.putImageData).toHaveBeenCalledTimes(1);
    const [image, x0, y0] = native.putImageData.mock.calls[0];
    expect([image.width, image.height, image.data.length, x0, y0]).toEqual([512, 512, 512 * 512 * 4, 0, 0]);
    let mismatches = 0, illuminated = 0, maxAlpha = 0, maxOpacityError = 0;
    for (let row = 0; row < 512; row++) for (let column = 0; column < 512; column++) {
      const u = (column + 0.5 - 256) / 256, v = (row + 0.5 - 256) / 256;
      const radialSquared = u * u + v * v;
      // With Sun = +x and viewer = +z, the mirror normal bisects the two rays.
      // Evaluate the outward sphere normal directly, without the runtime helper.
      const halfDot = radialSquared <= 1 ? (u + Math.sqrt(1 - radialSquared)) / Math.SQRT2 : 0;
      const opacity = u > 0 && radialSquared <= 1 ? 0.42 * Math.max(0, Math.min(1, halfDot)) ** 64 : 0;
      const expectedAlpha = Math.round(255 * opacity), offset = (row * 512 + column) * 4;
      const expected = expectedAlpha ? [236, 244, 250, expectedAlpha] : [0, 0, 0, 0];
      if (expected.some((channel, index) => image.data[offset + index] !== channel)) mismatches++;
      maxOpacityError = Math.max(maxOpacityError, Math.abs(image.data[offset + 3] / 255 - opacity));
      maxAlpha = Math.max(maxAlpha, image.data[offset + 3]);
      if (image.data[offset + 3]) illuminated++;
    }
    expect(mismatches).toBe(0);
    expect(illuminated).toBeGreaterThan(1000);
    expect(illuminated).toBeLessThan(512 * 512 / 2);
    expect(maxAlpha).toBe(107);
    expect(maxOpacityError).toBeLessThanOrEqual(0.5 / 255 + 1e-12);
  });

  it('allocates once and draws the same sprite across positions, radii and Sun angles', () => {
    const native = nativePixelContext(), records = [];
    const views = [[30, 50, 16, 0], [100, -20, 86, 1.3], [-70, 200, 2000, -2.7]];
    for (const view of views) {
      const rec = recordingCtx();
      expect(P.drawEarthOceanGlint(rec.ctx, ...view).layers).toBe(1);
      records.push(rec);
    }
    expect(canvasContext).toHaveBeenCalledTimes(1);
    expect(native.createImageData).toHaveBeenCalledTimes(1);
    expect(native.putImageData).toHaveBeenCalledTimes(1);
    const sprite = records[0].commands.find(c => c[0] === 'call' && c[1] === 'drawImage')[2];
    expect([sprite.width, sprite.height]).toEqual([512, 512]);
    records.forEach((rec, index) => {
      const [cx, cy, radius, angle] = views[index];
      expect(rec.commands.slice(0, 3)).toEqual([['call', 'save'], ['call', 'translate', cx, cy], ['call', 'rotate', angle]]);
      const draws = rec.commands.filter(c => c[0] === 'call' && c[1] === 'drawImage');
      expect(draws).toHaveLength(1);
      expect(draws[0].slice(2)).toEqual([sprite, -radius, -radius, 2 * radius, 2 * radius]);
      expect(rec.commands.filter(c => c[0] === 'call' && c[1] === 'ellipse')).toHaveLength(0);
      expect(rec.commands.at(-1)).toEqual(['call', 'restore']);
    });
  });

  it('restores the caller smoothing and compositing state after the single draw', () => {
    nativePixelContext();
    const saved = [], observed = [];
    const ctx = {
      imageSmoothingEnabled: false, imageSmoothingQuality: 'low',
      globalAlpha: 0.7, globalCompositeOperation: 'source-over',
      save() { saved.push({ imageSmoothingEnabled: this.imageSmoothingEnabled, imageSmoothingQuality: this.imageSmoothingQuality, globalAlpha: this.globalAlpha, globalCompositeOperation: this.globalCompositeOperation }); },
      restore() { Object.assign(this, saved.pop()); },
      translate() {}, rotate() {},
      drawImage() { observed.push({ smoothing: this.imageSmoothingEnabled, quality: this.imageSmoothingQuality, alpha: this.globalAlpha, composite: this.globalCompositeOperation }); },
    };
    P.drawEarthOceanGlint(ctx, 50, 60, 86, 0.7);
    expect(observed).toEqual([{ smoothing: true, quality: 'high', alpha: 0.7, composite: 'source-over' }]);
    expect(saved).toHaveLength(0);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    expect(ctx.imageSmoothingQuality).toBe('low');
    expect(ctx.globalAlpha).toBe(0.7);
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  it('retains the exact contour fallback and caches allocation failures', () => {
    const unavailable = [null, {}, { createImageData: () => null },
      { createImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData() {} },
      { createImageData: () => { throw new Error('allocation unavailable'); } },
      { createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) }];
    let reference;
    for (const context of unavailable) {
      resetStemLab(); loadTool(FILE, 'moonMission'); P = window.MoonMissionPure;
      canvasContext.mockClear().mockReturnValue(context);
      const first = recordingCtx(), second = recordingCtx();
      expect(P.drawEarthOceanGlint(first.ctx, 31, -9, 86, 1.3)).toEqual({ layers: 32, peakOpacity: 0.42, exponent: 64 });
      canvasContext.mockReturnValue({ createImageData: vi.fn(), putImageData: vi.fn() });
      expect(P.drawEarthOceanGlint(second.ctx, 31, -9, 86, 1.3).layers).toBe(32);
      expect(canvasContext).toHaveBeenCalledTimes(1);
      expect(first.commands).toEqual(second.commands);
      expect(first.commands.filter(c => c[0] === 'call' && c[1] === 'ellipse')).toHaveLength(32);
      expect(first.commands.some(c => c[0] === 'call' && c[1] === 'drawImage')).toBe(false);
      if (reference) expect(first.commands).toEqual(reference);
      else reference = first.commands;
    }
  });
});
