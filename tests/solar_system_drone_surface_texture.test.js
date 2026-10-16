import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const PROFILES = ['regolith-pitted', 'aeolian-rippled', 'fractured-basalt', 'crevassed-ice', 'rocky-granular'];
let hash, noise, height, fill;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  const names = ['solarDroneSurfaceHash', 'solarDroneSurfaceNoise', 'solarDroneTerrainMicroHeight', 'solarFillDroneTerrainMicroData'];
  const helpers = names.map(name => {
    const start = source.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('Missing surface helper: ' + name);
    const end = source.indexOf('\n}', start);
    if (end < start) throw new Error('Missing top-level helper close: ' + name);
    return source.slice(start, end + 2);
  });
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { throw new Error('Surface texture helpers must not consume Math.random'); };
  ({ hash, noise, height, fill } = new Function('Math', helpers.join('\n') +
    '\nreturn {hash:solarDroneSurfaceHash,noise:solarDroneSurfaceNoise,height:solarDroneTerrainMicroHeight,fill:solarFillDroneTerrainMicroData};')(deterministicMath));
});

function pixel(data, size, x, y) { return data[(y * size + x) * 4]; }
function texture(profile, size) {
  const data = new Uint8ClampedArray(size * size * 4);
  data.fill(17); // Incomplete writes must not look like legitimate grayscale.
  fill(data, size, profile);
  return data;
}
function edgeStatistics(data, size, vertical) {
  let seamSquares = 0, interiorSquares = 0, maxSeam = 0;
  for (let line = 0; line < size; line++) {
    const value = along => vertical ? pixel(data, size, line, along) : pixel(data, size, along, line);
    const seam = Math.abs(value(0) - value(size - 1));
    seamSquares += seam * seam; maxSeam = Math.max(maxSeam, seam);
    for (let along = 1; along < size; along++) {
      const difference = value(along) - value(along - 1);
      interiorSquares += difference * difference;
    }
  }
  return { seamRms: Math.sqrt(seamSquares / size), interiorRms: Math.sqrt(interiorSquares / (size * (size - 1))), maxSeam };
}

describe('drone surface textures remain periodic and keep their scale across quality levels', () => {
  it('hashes signed cells deterministically into finite bounded, seed-dependent values', () => {
    const first = [], second = [];
    for (const x of [-17, -1, 0, 1, 23]) for (const y of [-11, 0, 7]) {
      const value = hash(x, y, 37);
      expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
      expect(hash(x, y, 37)).toBe(value);
      first.push(value); second.push(hash(x, y, 149));
    }
    expect(Math.max(...first) - Math.min(...first)).toBeGreaterThan(0.1);
    expect(second).not.toEqual(first);
  });

  it('wraps smooth noise in both axes, including negative and multi-tile coordinates', () => {
    for (const cells of [3, 8, 16]) for (const seed of [0, 37, 149]) {
      for (const u of [-2.375, -1, -0.999, -0.33, -0.001, 0, 0.125, 0.999, 1, 2.125]) {
        for (const v of [-1.37, -0.001, 0, 0.4, 0.999, 2.4]) {
          const value = noise(u, v, cells, seed);
          expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1);
          expect(noise(u + 1, v - 2, cells, seed)).toBeCloseTo(value, 10);
          expect(noise(u - 3, v + 1, cells, seed)).toBeCloseTo(value, 10);
        }
      }
    }
  });

  it('joins both noise seams with continuous first derivatives', () => {
    const epsilon = 1e-6;
    for (const cells of [3, 8, 16]) for (const other of [-0.37, 0, 0.19, 0.61, 1.2]) {
      for (const axis of [0, 1]) {
        const sample = value => axis === 0 ? noise(value, other, cells, 73) : noise(other, value, cells, 73);
        const center = sample(0), incoming = (center - sample(-epsilon)) / epsilon, outgoing = (sample(epsilon) - center) / epsilon;
        expect(sample(1)).toBeCloseTo(center, 10);
        expect(Math.abs(incoming - outgoing)).toBeLessThan(0.02);
        expect((sample(1 + epsilon) - sample(1 - epsilon)) / (2 * epsilon))
          .toBeCloseTo((sample(epsilon) - sample(-epsilon)) / (2 * epsilon), 5);
      }
    }
  });

  it.each(PROFILES)('keeps %s heights bounded and smoothly periodic without binary trench walls', profile => {
    let minimum = Infinity, maximum = -Infinity;
    for (let y = 0; y <= 32; y++) for (let x = 0; x <= 32; x++) {
      const u = x / 32 - 0.4, v = y / 32 - 0.7, value = height(profile, u, v);
      expect(Number.isFinite(value)).toBe(true);
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
      expect(height(profile, u + 2, v - 1)).toBeCloseTo(value, 8);
      expect(height(profile, u - 1, v + 3)).toBeCloseTo(value, 8);
    }
    expect(minimum).toBeGreaterThanOrEqual(18); expect(maximum).toBeLessThanOrEqual(238);
    expect(maximum - minimum, 'the surface must retain meaningful texture relief').toBeGreaterThan(4);
    const epsilon = 1e-6;
    for (const other of [0.013, 0.17, 0.381, 0.63, 0.997]) for (const axis of [0, 1]) {
      const sample = value => axis === 0 ? height(profile, value, other) : height(profile, other, value);
      const center = sample(0), incoming = (center - sample(-epsilon)) / epsilon, outgoing = (sample(epsilon) - center) / epsilon;
      expect(sample(1)).toBeCloseTo(center, 8);
      // Allow finite-difference curvature error while rejecting a seam kink.
      expect(Math.abs(incoming - outgoing)).toBeLessThan(0.5 + Math.max(Math.abs(incoming), Math.abs(outgoing)) * 0.01);
      expect((sample(1 + epsilon) - sample(1 - epsilon)) / (2 * epsilon))
        .toBeCloseTo((sample(epsilon) - sample(-epsilon)) / (2 * epsilon), 3);
    }
    let maxFineStep = 0;
    for (const other of [0.173, 0.419, 0.731]) for (const axis of [0, 1]) {
      const sample = value => axis === 0 ? height(profile, value, other) : height(profile, other, value);
      let previous = sample(0);
      for (let i = 1; i <= 2048; i++) {
        const value = sample(i / 2048);
        maxFineStep = Math.max(maxFineStep, Math.abs(value - previous)); previous = value;
      }
    }
    // Old binary masks jumped by 86/118 gray levels. Sampling well below one
    // texture pixel catches those steps without prescribing a trench formula.
    expect(maxFineStep).toBeLessThan(8);
  });

  it.each(PROFILES)('fills complete deterministic %s textures with matching world scale at 128/256', profile => {
    const low = texture(profile, 128), high = texture(profile, 256);
    for (const [size, data] of [[128, low], [256, high]]) {
      let firstInvalidPixel = null, firstMismatch = null;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const offset = (y * size + x) * 4, value = data[offset];
        if (firstInvalidPixel === null && (value < 18 || value > 238 || data[offset + 1] !== value || data[offset + 2] !== value || data[offset + 3] !== 255)) {
          firstInvalidPixel = { x, y, rgba: Array.from(data.slice(offset, offset + 4)) };
        }
        const expected = Math.round(Math.max(18, Math.min(238, height(profile, (x + 0.5) / size, (y + 0.5) / size))));
        if (firstMismatch === null && value !== expected) firstMismatch = { x, y, actual: value, expected };
      }
      expect(firstInvalidPixel, profile + ' invalid RGBA at ' + size).toBeNull();
      expect(firstMismatch, profile + ' must sample normalized pixel centers at ' + size).toBeNull();
      expect(texture(profile, size)).toEqual(data);
      for (const vertical of [false, true]) {
        const stats = edgeStatistics(data, size, vertical);
        // The wrap edge is one normal pixel interval. It must not introduce a
        // special trench or a much rougher band than the interior texture.
        expect(stats.maxSeam, profile + ' seam jump at ' + size).toBeLessThanOrEqual(50);
        expect(stats.seamRms, profile + ' seam contrast at ' + size).toBeLessThanOrEqual(Math.max(2, stats.interiorRms * 3 + 1));
      }
    }
    let squaredDifference = 0;
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const highAverage = (pixel(high, 256, x * 2, y * 2) + pixel(high, 256, x * 2 + 1, y * 2)
        + pixel(high, 256, x * 2, y * 2 + 1) + pixel(high, 256, x * 2 + 1, y * 2 + 1)) / 4;
      squaredDifference += Math.pow(pixel(low, 128, x, y) - highAverage, 2);
    }
    expect(Math.sqrt(squaredDifference / (128 * 128)), profile + ' changes feature scale with quality').toBeLessThan(8);
  });

  it('keeps every geological profile distinct at the same world coordinates', () => {
    const samples = PROFILES.map(profile => {
      const values = [];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) values.push(height(profile, (x + 0.37) / 16, (y + 0.63) / 16));
      return values;
    });
    for (let a = 0; a < PROFILES.length; a++) for (let b = a + 1; b < PROFILES.length; b++) {
      const rms = Math.sqrt(samples[a].reduce((sum, value, i) => sum + Math.pow(value - samples[b][i], 2), 0) / samples[a].length);
      expect(rms, PROFILES[a] + ' must differ from ' + PROFILES[b]).toBeGreaterThan(1);
    }
  });
});
