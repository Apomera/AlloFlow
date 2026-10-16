/** Spherical air columns, sky color and the launch camera's bounded atmosphere raster. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const RADIUS = 6371000, TOP = 120000, SCALE = 8000;
const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];
const unit = a => { const length = Math.hypot(...a); return a.map(value => value / length); };
const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

// Work in metres, using the ray's impact parameter and geometric chord. This
// independent oracle integrates equal-distance intervals with Simpson's rule;
// the renderer uses a small set of nonuniform midpoint samples.
function columnOracle(h, mu) {
  const radius = RADIUS + h, shell = RADIUS + TOP;
  const impact = radius * Math.sqrt(Math.max(0, 1 - mu * mu));
  const closest = -radius * mu;
  if (mu < 0 && impact < RADIUS) return { blocked: true, entry: 0, exit: 0, integral: 0 };
  if (impact >= shell) return { blocked: false, entry: 0, exit: 0, integral: 0 };
  const halfChord = Math.sqrt(shell * shell - impact * impact);
  const entry = Math.max(0, closest - halfChord), exit = Math.max(0, closest + halfChord);
  if (exit <= entry) return { blocked: false, entry: 0, exit: 0, integral: 0 };
  const count = 32768, step = (exit - entry) / count;
  let sum = 0;
  for (let index = 0; index <= count; index++) {
    const distance = entry + index * step;
    const altitude = Math.hypot(impact, distance - closest) - RADIUS;
    const density = Math.exp(-altitude / SCALE);
    sum += density * (index === 0 || index === count ? 1 : index % 2 ? 4 : 2);
  }
  return { blocked: false, entry, exit, integral: sum * step / 3 };
}

function cameraRay(w, height, x, y) {
  const focal = height * Math.sqrt(3) / 2;
  return unit([(x - w / 2) / focal, (height * 0.6 - y) / focal, 1]);
}

function nearVector(actual, expected, tolerance = 1e-9) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((value, index) => expect(Math.abs(value - expected[index])).toBeLessThan(tolerance));
}

const coefficients = [6.9e-6, 13.5e-6, 30.1e-6];
const geometry = (h = 80000, w = 1014, height = 400) => P.launchAtmosphereGeometry(h, w, height);
const point = (h = 80000, w = 1014, height = 400, x = w / 2, y = height * 0.2) =>
  P.launchAtmospherePoint(h, w, height, x, y);

function expectColumn(actual, expected) {
  expect(actual.blocked).toBe(expected.blocked);
  expect(Math.abs(actual.entry - expected.entry)).toBeLessThan(1e-4);
  expect(Math.abs(actual.exit - expected.exit)).toBeLessThan(1e-4);
  // The bounded midpoint quadrature must remain within 1% of dense integration.
  expect(Math.abs(actual.column - expected.integral)).toBeLessThan(Math.max(1e-7, expected.integral * 0.01));
}

describe('Launch spherical air columns', () => {
  it('rejects nonnumeric, nonfinite and unsupported ray inputs', () => {
    for (const value of invalid) {
      expect(P.launchAtmosphereColumn(value, 0.5)).toBeNull();
      expect(P.launchAtmosphereColumn(80000, value)).toBeNull();
    }
    for (const h of [-1, 1000001, Number.MAX_VALUE]) expect(P.launchAtmosphereColumn(h, 0.5)).toBeNull();
    for (const mu of [-1.000001, 1.000001, Number.MAX_VALUE]) expect(P.launchAtmosphereColumn(80000, mu)).toBeNull();
    for (const h of [0, 1e6]) for (const mu of [-1, 0, 1]) expect(P.launchAtmosphereColumn(h, mu)).not.toBeNull();
  });

  it('matches the analytic vertical column through an exponential atmosphere', () => {
    for (const h of [0, 1000, 20000, 80000, 119999]) {
      const actual = P.launchAtmosphereColumn(h, 1);
      const expected = SCALE * (Math.exp(-h / SCALE) - Math.exp(-TOP / SCALE));
      expect(actual.blocked).toBe(false); expect(actual.entry).toBe(0);
      expect(actual.exit).toBeCloseTo(TOP - h, 6);
      expect(Math.abs(actual.column / expected - 1)).toBeLessThan(0.01);
      expect(actual.samples).toBe(32);
    }
  });

  it('agrees with independent dense integration for oblique and grazing rays', () => {
    const exteriorMu = (h, tangentHeight) => -Math.sqrt(1 - ((RADIUS + tangentHeight) / (RADIUS + h)) ** 2);
    for (const [h, mu] of [[0, 0], [0, 0.02], [5000, 0.2], [80000, -0.05],
      [185000, exteriorMu(185000, 2000)], [185000, exteriorMu(185000, 20000)],
      [1e6, exteriorMu(1e6, 80000)]]) {
      expectColumn(P.launchAtmosphereColumn(h, mu), columnOracle(h, mu));
    }
  });

  it('starts integration at shell entry and includes both halves of an exterior chord', () => {
    const h = 185000, impact = RADIUS + 20000;
    const mu = -Math.sqrt(1 - (impact / (RADIUS + h)) ** 2);
    const actual = P.launchAtmosphereColumn(h, mu), expected = columnOracle(h, mu);
    expect(actual.entry).toBeGreaterThan(0); expect(actual.exit).toBeGreaterThan(actual.entry);
    expect(actual.samples).toBe(64); expectColumn(actual, expected);
    const middle = (actual.entry + actual.exit) / 2;
    expect(middle).toBeCloseTo(-(RADIUS + h) * mu, 6);
    const endpointRadius = distance => Math.hypot(impact, distance - middle);
    expect(endpointRadius(actual.entry)).toBeCloseTo(RADIUS + TOP, 6);
    expect(endpointRadius(actual.exit)).toBeCloseTo(RADIUS + TOP, 6);
  });

  it('occludes rays that encounter Earth before the far side of the atmosphere', () => {
    for (const [h, mu] of [[0, -1e-6], [0, -1], [80000, -1], [1e6, -1]]) {
      expect(P.launchAtmosphereColumn(h, mu)).toMatchObject({ blocked: true, column: 0,
        entry: 0, exit: 0, samples: 0, transmission: [0, 0, 0] });
    }
    for (const h of [2000, 80000, 185000]) {
      const limb = -Math.sqrt(1 - (RADIUS / (RADIUS + h)) ** 2);
      expect(P.launchAtmosphereColumn(h, limb - 1e-6).blocked).toBe(true);
      const clear = P.launchAtmosphereColumn(h, limb + 1e-6);
      expect(clear.blocked).toBe(false); expect(clear.column).toBeGreaterThan(100000);
      expect(clear.transmission.every(value => value > 0 && value < 1)).toBe(true);
    }
  });

  it('keeps the exact Earth tangent clear despite floating-point cancellation at orbital altitudes', () => {
    const seaTangent = P.launchAtmosphereColumn(0, 0);
    const reference = columnOracle(0, 0).integral * 2;
    for (const h of [2000, 80000, 185000, 248900, 1e6]) {
      const mu = -Math.sqrt(h * (2 * RADIUS + h)) / (RADIUS + h);
      const tangent = P.launchAtmosphereColumn(h, mu);
      expect(tangent.blocked).toBe(false); expect(tangent.samples).toBe(64);
      expect(tangent.column).toBeGreaterThan(seaTangent.column);
      expect(tangent.transmission.every(value => value > 0 && value < 1)).toBe(true);
      if (h >= TOP) {
        // Every exterior tangent traverses the same complete atmospheric chord.
        expect(Math.abs(tangent.column / reference - 1)).toBeLessThan(0.01);
        expect(tangent.column).toBeCloseTo(seaTangent.column * 2, 4);
      }
    }
  });

  it('leaves upward and shell-missing rays outside the atmosphere completely clear', () => {
    for (const [h, mu] of [[TOP, 1], [TOP + 1, 0], [185000, 0.5], [1e6, 1], [1e6, -0.1]]) {
      expect(P.launchAtmosphereColumn(h, mu)).toMatchObject({ blocked: false, column: 0,
        entry: 0, exit: 0, samples: 0, transmission: [1, 1, 1] });
    }
  });

  it('resolves a thin shell chord without adding a false hard atmosphere edge', () => {
    const h = 185000, radius = RADIUS + h;
    const muAtImpact = impact => -Math.sqrt(1 - (impact / radius) ** 2);
    const near = P.launchAtmosphereColumn(h, muAtImpact(RADIUS + TOP - 0.1));
    const miss = P.launchAtmosphereColumn(h, muAtImpact(RADIUS + TOP + 0.1));
    expect(near.column).toBeGreaterThan(0); expect(near.column).toBeLessThan(0.001);
    expect(miss.column).toBe(0); expect(miss.samples).toBe(0);
    expect(near.transmission.every(value => value > 0.99999)).toBe(true);
  });

  it('keeps grazing sea-level paths long and finite while overhead air thins with altitude', () => {
    const tangent = P.launchAtmosphereColumn(0, 0), vertical = P.launchAtmosphereColumn(0, 1);
    expect(tangent.blocked).toBe(false); expect(tangent.column).toBeGreaterThan(vertical.column * 30);
    expect(tangent.column).toBeLessThan(vertical.column * 40);
    let previous = Infinity;
    for (const h of [0, 1000, 10000, 40000, 80000, 119000]) {
      const column = P.launchAtmosphereColumn(h, 0.3).column;
      expect(column).toBeGreaterThan(0); expect(column).toBeLessThan(previous); previous = column;
    }
  });

  it('uses wavelength-dependent Beer attenuation and stays within the quadrature budget', () => {
    for (const h of [0, 2000, 80000, 185000, 1e6]) {
      for (const mu of [-1, -0.2, -0.01, 0, 0.1, 0.5, 1]) {
        const ray = P.launchAtmosphereColumn(h, mu);
        expect(Number.isFinite(ray.column)).toBe(true); expect(ray.column).toBeGreaterThanOrEqual(0);
        expect([0, 32, 64]).toContain(ray.samples);
        ray.transmission.forEach((value, channel) => {
          expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
          if (!ray.blocked) expect(value).toBeCloseTo(Math.exp(-coefficients[channel] * ray.column), 12);
        });
        if (ray.column > 0) {
          expect(ray.transmission[0]).toBeGreaterThan(ray.transmission[1]);
          expect(ray.transmission[1]).toBeGreaterThan(ray.transmission[2]);
        }
      }
    }
  });
});

describe('Launch atmospheric camera and sky', () => {
  it('rejects malformed camera inputs and out-of-viewport sample positions', () => {
    const args = [80000, 1014, 400, 507, 100];
    for (const value of invalid) {
      for (let index = 0; index < args.length; index++) {
        const values = [...args]; values[index] = value;
        expect(P.launchAtmospherePoint(...values)).toBeNull();
        if (index < 3) expect(P.launchAtmosphereGeometry(...values.slice(0, 3))).toBeNull();
      }
    }
    for (const [w, height] of [[0, 400], [1014, 0], [8193, 400], [1014, 8193], [1014, Number.MIN_VALUE]]) {
      expect(geometry(80000, w, height)).toBeNull(); expect(point(80000, w, height)).toBeNull();
    }
    for (const [x, y] of [[-1, 100], [1015, 100], [507, -1], [507, 401]]) expect(point(80000, 1014, 400, x, y)).toBeNull();
  });

  it('normalizes physical camera rays before deriving their air columns', () => {
    for (const [h, w, height, x, y] of [[0, 1014, 400, 50, 50], [20000, 310, 400, 155, 250],
      [80000, 1014, 400, 507, 280], [185000, 640, 400, 400, 100]]) {
      const actual = point(h, w, height, x, y), direction = cameraRay(w, height, x, y);
      nearVector(actual.direction, direction); expect(actual.mu).toBeCloseTo(direction[1], 12);
      expect(Math.hypot(...actual.direction)).toBeCloseTo(1, 12);
      const expected = columnOracle(h, direction[1]);
      expect(actual.blocked).toBe(expected.blocked);
      expect(Math.abs(actual.column - expected.integral)).toBeLessThan(Math.max(1e-7, expected.integral * 0.01));
    }
  });

  it('treats viewport width as a crop and uniform resize as the same camera', () => {
    for (const offset of [-100, 0, 100]) {
      const wide = point(80000, 1014, 400, 507 + offset, 280);
      expect(point(80000, 310, 400, 155 + offset, 280)).toEqual(wide);
    }
    const reference = point(80000, 640, 400, 400, 280);
    for (const scale of [0.5, 1.5, 2, 3]) {
      const resized = point(80000, 640 * scale, 400 * scale, 400 * scale, 280 * scale);
      nearVector(resized.direction, reference.direction);
      expect(resized.column).toBeCloseTo(reference.column, 8); expect(resized.rgba).toEqual(reference.rgba);
    }
  });

  it('uses the displayed Sun for the normalized Rayleigh angular phase', () => {
    const sun = unit([0.2, 0.47, Math.sqrt(3) / 2]);
    for (const [x, y] of [[0, 0], [1014, 0], [507, 100], [80, 220], [900, 399]]) {
      const actual = point(20000, 1014, 400, x, y);
      const cosine = dot(cameraRay(1014, 400, x, y), sun);
      expect(actual.phase).toBeCloseTo(0.75 * (1 + cosine * cosine), 12);
      expect(actual.phase).toBeGreaterThanOrEqual(0.75); expect(actual.phase).toBeLessThanOrEqual(1.5);
    }
    const sunSample = point(20000, 1014, 400, 507 + 0.2 * 400, 0.13 * 400);
    expect(sunSample.phase).toBeCloseTo(1.5, 12);
  });

  it('separates physical extinction from display opacity and fills beneath the Earth limb', () => {
    const air = point(0), clear = point(185000), earth = point(80000, 1014, 400, 507, 399);
    expect(air.blocked).toBe(false); expect(air.opacity).toBeGreaterThan(0.99);
    expect(air.transmission.every(value => value > 0 && value < 1)).toBe(true);
    expect(clear).toMatchObject({ blocked: false, column: 0, transmission: [1, 1, 1], opacity: 0, rgba: [0, 0, 0, 0] });
    expect(earth).toMatchObject({ blocked: true, column: 0, transmission: [0, 0, 0], opacity: 1 });
    expect(earth.rgba[3]).toBe(255); expect(earth.rgba[2]).toBeGreaterThan(earth.rgba[0]);
    for (const sample of [air, clear, earth]) {
      expect(sample.rgba.every(value => Number.isInteger(value) && value >= 0 && value <= 255)).toBe(true);
    }
  });
});

describe('Launch atmosphere raster', () => {
  it('caps work and storage for small, tall, wide and extreme supported viewports', () => {
    for (const [h, w, height] of [[0, 60, 40], [80000, 310, 400], [185000, 8192, 8192],
      [1e6, 8192, 1], [2000, 1, 8192]]) {
      const field = geometry(h, w, height);
      expect(field).toMatchObject({ altitude: h, width: w, height });
      expect(Number.isInteger(field.columns)).toBe(true); expect(Number.isInteger(field.rows)).toBe(true);
      expect(field.columns).toBeGreaterThanOrEqual(1); expect(field.columns).toBeLessThanOrEqual(256);
      expect(field.rows).toBeGreaterThanOrEqual(1); expect(field.rows).toBeLessThanOrEqual(200);
      expect(field.pixels).toBeInstanceOf(Uint8ClampedArray);
      expect(field.pixels.length).toBe(field.columns * field.rows * 4);
      expect(field.pixels.byteLength).toBeLessThanOrEqual(204800);
      expect(field.profile).toHaveLength(192);
      expect(field.profile[0].mu).toBe(field.minMu); expect(field.profile.at(-1).mu).toBeCloseTo(1, 12);
      for (let index = 0; index < field.profile.length; index++) {
        const sample = field.profile[index];
        expect(Number.isFinite(sample.column)).toBe(true); expect(sample.column).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(sample.mu)).toBe(true);
        if (index > 0) expect(sample.mu).toBeGreaterThan(field.profile[index - 1].mu);
      }
    }
  });

  it('resolves its physical limb and overhead profile against independent column integration', () => {
    for (const h of [0, 80000, 185000]) {
      const field = geometry(h, 60, 40);
      const expectedMu = -Math.sqrt(h * (2 * RADIUS + h)) / (RADIUS + h);
      expect(field.minMu).toBeCloseTo(expectedMu, 12);
      for (const index of [1, 12, 48, 96, 191]) {
        const sample = field.profile[index], oracle = columnOracle(h, sample.mu);
        expect(oracle.blocked).toBe(false);
        expect(Math.abs(sample.column - oracle.integral)).toBeLessThan(Math.max(1e-7, oracle.integral * 0.01));
      }
    }
  });

  it('keeps interpolated pixels close to direct ray colors across the sky and curved limb', () => {
    let sky = 0, earth = 0, clear = 0;
    for (const h of [0, 20000, 80000, 185000]) {
      const field = geometry(h, 640, 400);
      for (let row = 0; row < field.rows; row += 9) {
        for (let col = 0; col < field.columns; col += 13) {
          const sample = point(h, 640, 400, (col + 0.5) * 640 / field.columns, (row + 0.5) * 400 / field.rows);
          const rgba = Array.from(field.pixels.slice((row * field.columns + col) * 4, (row * field.columns + col) * 4 + 4));
          // Compare visible premultiplied color: RGB in a transparent texel is
          // immaterial, especially at the very thin outer edge of the shell.
          for (let channel = 0; channel < 3; channel++) {
            expect(Math.abs(rgba[channel] * rgba[3] / 255 - sample.rgba[channel] * sample.rgba[3] / 255)).toBeLessThanOrEqual(6);
          }
          expect(Math.abs(rgba[3] - sample.rgba[3])).toBeLessThanOrEqual(6);
          if (sample.blocked) { expect(rgba[3]).toBe(255); earth++; }
          else { sky++; if (sample.column === 0) clear++; }
        }
      }
    }
    expect(sky).toBeGreaterThan(100); expect(earth).toBeGreaterThan(100); expect(clear).toBeGreaterThan(100);
  });

  it('shares the same radial atmosphere profile across phone and desktop crops', () => {
    const desktop = geometry(), phone = geometry(80000, 310, 400), tall = geometry(80000, 1014, 800);
    expect(phone.profile).toEqual(desktop.profile); expect(tall.profile).toEqual(desktop.profile);
    expect(phone.minMu).toBe(desktop.minMu); expect(tall.minMu).toBe(desktop.minMu);
    expect(phone.columns).toBeLessThan(desktop.columns);
  });

  it('reproduces pixels after arbitrary altitude seeks with independent mutable buffers', () => {
    const first = geometry(80000, 60, 40), pixels = new Uint8ClampedArray(first.pixels), profile = structuredClone(first.profile);
    for (const h of [185000, 0, 40000, 1e6]) geometry(h, 60, 40);
    const again = geometry(80000, 60, 40);
    expect(again).not.toBe(first); expect(again.pixels).not.toBe(first.pixels); expect(again.profile).not.toBe(first.profile);
    expect(again.pixels).toEqual(pixels); expect(again.profile).toEqual(profile);
    first.pixels.fill(0); first.profile[0].column = -1;
    const restored = geometry(80000, 60, 40);
    expect(restored.pixels).toEqual(pixels); expect(restored.profile).toEqual(profile);
  });
});

function renderer({ alpha = 0.37, unavailable = false } = {}) {
  const calls = [], stack = [], uploads = [], allocations = [];
  const state = { globalAlpha: alpha, imageSmoothingEnabled: false, globalCompositeOperation: 'multiply',
    transform: [1.2, 0.1, -0.2, 0.9, 15, 20], clip: { id: 'caller clip' } };
  const initial = { ...state };
  const rasterContext = {
    createImageData: (width, height) => { allocations.push([width, height]); return { data: new Uint8ClampedArray(width * height * 4) }; },
    putImageData: (data, x, y) => uploads.push({ data: new Uint8ClampedArray(data.data), x, y }),
  };
  const offscreen = { width: 0, height: 0, getContext: () => unavailable ? null : rasterContext };
  const created = [];
  const canvas = { ownerDocument: { createElement: name => { created.push(name); return offscreen; } } };
  const ctx = { canvas, save: () => { calls.push(['save']); stack.push({ ...state }); },
    restore: () => { calls.push(['restore']); Object.assign(state, stack.pop()); },
    drawImage: (...args) => calls.push(['drawImage', args, { ...state }]),
  };
  Object.keys(state).forEach(key => Object.defineProperty(ctx, key, { get: () => state[key], set: value => { state[key] = value; } }));
  return { ctx, canvas, state, initial, stack, calls, uploads, allocations, created, offscreen };
}

describe('Launch atmosphere rendering', () => {
  it('uploads exact pixels once and reuses the raster and caller state while paused', () => {
    const field = geometry(80000, 60, 40), rec = renderer();
    expect(P.drawLaunchAtmosphere(rec.ctx, field)).toBe(field);
    expect(P.drawLaunchAtmosphere(rec.ctx, field)).toBe(field);
    expect(rec.created).toEqual(['canvas']); expect(rec.allocations).toEqual([[field.columns, field.rows]]);
    expect(rec.uploads).toHaveLength(1); expect(rec.uploads[0].data).toEqual(field.pixels);
    expect(rec.uploads[0]).toMatchObject({ x: 0, y: 0 });
    expect(rec.canvas._mmLaunchAtmosphereRaster.field).toBe(field);
    const paints = rec.calls.filter(call => call[0] === 'drawImage'); expect(paints).toHaveLength(2);
    paints.forEach(([, args, painted]) => {
      expect(args).toEqual([rec.offscreen, 0, 0, field.width, field.height]);
      expect(painted).toEqual({ ...rec.initial, imageSmoothingEnabled: true });
    });
    expect(rec.state).toEqual(rec.initial); expect(rec.stack).toEqual([]);
  });

  it('refreshes changed sky pixels and resizes the same offscreen canvas when the viewport changes', () => {
    const rec = renderer(), first = geometry(80000, 60, 40), changed = geometry(185000, 60, 40), resized = geometry(185000, 30, 40);
    for (const field of [first, changed, resized]) expect(P.drawLaunchAtmosphere(rec.ctx, field)).toBe(field);
    expect(rec.created).toEqual(['canvas']); expect(rec.uploads).toHaveLength(3);
    expect(rec.uploads[1].data).toEqual(changed.pixels); expect(rec.uploads[2].data).toEqual(resized.pixels);
    expect(rec.offscreen.width).toBe(resized.columns); expect(rec.offscreen.height).toBe(resized.rows);
    expect(rec.canvas._mmLaunchAtmosphereRaster.field).toBe(resized); expect(rec.state).toEqual(rec.initial);
  });

  it('does no drawing or allocation for invalid fields or zero caller opacity', () => {
    const valid = geometry(80000, 60, 40);
    const fields = [null, {}, { ...valid, width: NaN }, { ...valid, height: 0 }, { ...valid, width: 8193 },
      { ...valid, columns: 257 }, { ...valid, rows: 201 }, { ...valid, columns: 0.5 },
      { ...valid, pixels: [] }, { ...valid, pixels: new Uint8ClampedArray(4) }];
    for (const field of fields) {
      const rec = renderer(); expect(P.drawLaunchAtmosphere(rec.ctx, field)).toBeNull();
      expect(rec.created).toEqual([]); expect(rec.calls).toEqual([]); expect(rec.state).toEqual(rec.initial);
    }
    const invisible = renderer({ alpha: 0 }); expect(P.drawLaunchAtmosphere(invisible.ctx, valid)).toBeNull();
    expect(invisible.created).toEqual([]); expect(invisible.calls).toEqual([]);
  });

  it('handles unavailable native raster contexts without mutating the caller or caching an unusable canvas', () => {
    const rec = renderer({ unavailable: true });
    expect(P.drawLaunchAtmosphere(rec.ctx, geometry(80000, 60, 40))).toBeNull();
    expect(rec.calls).toEqual([]); expect(rec.uploads).toEqual([]); expect(rec.state).toEqual(rec.initial);
    expect(rec.canvas._mmLaunchAtmosphereRaster).toBeUndefined();
  });
});
