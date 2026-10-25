import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modelSource = readFileSync('stem_lab/raptor_distance_model.js', 'utf8');
const evidenceSource = readFileSync('stem_lab/raptor_distance_evidence.js', 'utf8');
const source = readFileSync('stem_lab/raptor_distance_signal.js', 'utf8');
function setup(ready = true) {
  const local = {};
  Function('window', source)(local);
  if (ready) { Function('window', evidenceSource)(local); Function('window', modelSource)(local); }
  return { local, api: local.RaptorDistanceSignal };
}
const { api } = setup();
const settings = (distance = 300) => ({ version: 1, distance, cycles: 8, contrast: 95 });
const completeSettings = distance => ({ ...settings(distance), widthM: .30, wideFov: 20, detailFov: .75 });
const row = (count = 47, pixel = [60, 90, 120, 255]) => Array.from({ length: count * 4 }, (_, index) => pixel[index % 4]);

describe('Raptor distance image-row signal', () => {
  it('registers a frozen idempotent API and resolves dependencies lazily in either order', () => {
    for (const firstSource of [modelSource, evidenceSource]) {
      const { local, api: lazy } = setup(false);
      expect(Object.keys(local)).toEqual(['RaptorDistanceSignal']); expect(Object.isFrozen(lazy)).toBe(true);
      expect(Object.keys(lazy).sort()).toEqual(['fromRows', 'region', 'version']); expect(lazy.version).toBe(1);
      const unavailable = () => {
        expect(lazy.region(settings(), 1024, 512)).toBeNull(); expect(lazy.fromRows(settings(), row(), row())).toBeNull();
      };
      unavailable(); Function('window', firstSource)(local); unavailable();
      Function('window', firstSource === modelSource ? evidenceSource : modelSource)(local);
      expect(lazy.region(settings(), 1024, 512).count).toBe(47);
      const evidence = local.RaptorDistanceEvidence, model = local.RaptorDistanceModel;
      for (const invalid of [null, {}, { ...evidence, version: 2 }, { ...evidence, snapshot: null }]) {
        local.RaptorDistanceEvidence = invalid; unavailable();
      }
      local.RaptorDistanceEvidence = evidence;
      local.RaptorDistanceModel = null; unavailable(); local.RaptorDistanceModel = model;
      expect(lazy.fromRows(settings(), row(), row()).human.range).toBe(0);
      Function('window', source)(local); expect(local.RaptorDistanceSignal).toBe(lazy);
    }
  });

  it('selects the inclusive central sixty percent using the fixed camera projection and canvas dimensions', () => {
    for (const [distance, x0, x1, count] of [[40, 336, 688, 353], [60, 395, 629, 235], [140, 462, 562, 101], [300, 489, 535, 47]]) {
      const result = api.region(settings(distance), 1024, 512);
      // Project a physical width with cotangent expressed as cos/sin.
      const halfAngle = .75 * Math.PI / 360;
      const projected = .15 / distance * Math.cos(halfAngle) / Math.sin(halfAngle) * 1024;
      expect(result).toMatchObject({ x0, x1, count, y: 256, width: 1024, height: 512 });
      expect(result.plaqueWidthPixels).toBeCloseTo(projected, 10);
      expect(result.x0).toBeGreaterThanOrEqual(512 - projected * .30);
      expect(result.x0 - 1).toBeLessThan(512 - projected * .30);
      expect(result.x1).toBeLessThanOrEqual(512 + projected * .30);
      expect(result.x1 + 1).toBeGreaterThan(512 + projected * .30);
      expect(result.x1 - result.x0 + 1).toBe(result.count);
      expect(Object.keys(result).sort()).toEqual(['count', 'height', 'plaqueWidthPixels', 'width', 'x0', 'x1', 'y']);
      expect(api.region({ ...settings(distance), cycles: 20, contrast: 10 }, 1024, 512)).toEqual(result);
    }
    for (const [width, height] of [[undefined, undefined], [1024, undefined], [512, 256], [2048, 1024], ['1024', 512], [1024, '512'], [NaN, 512], [1024, Infinity], [1023, 512], [1024, 513]]) {
      expect(api.region(settings(), width, height)).toBeNull();
    }
  });

  it('rejects malformed settings without clamping or accepting changed projection constants', () => {
    class Condition { constructor() { Object.assign(this, settings()); } }
    const invalid = [null, undefined, [], {}, new Condition(), Object.create(settings()), Object.assign([], settings()),
      { ...settings(), version: 2 }, { ...settings(), version: '1' }, { ...settings(), distance: '300' },
      { ...settings(), distance: 39 }, { ...settings(), distance: 301 }, { ...settings(), distance: 140.5 },
      { ...settings(), distance: Infinity }, { ...settings(), distance: NaN },
      { ...settings(), cycles: 3 }, { ...settings(), cycles: 21 }, { ...settings(), cycles: '8' },
      { ...settings(), contrast: 9 }, { ...settings(), contrast: 101 }, { ...settings(), contrast: '95' },
      { ...settings(), widthM: .31 }, { ...settings(), wideFov: 21 }, { ...settings(), detailFov: 1 }];
    for (const key of ['version', 'distance', 'cycles', 'contrast']) {
      const missing = settings(); delete missing[key]; invalid.push(missing);
    }
    for (const raw of invalid) {
      expect(api.region(raw, 1024, 512)).toBeNull(); expect(api.fromRows(raw, row(), row())).toBeNull();
    }
    expect(api.fromRows(Object.assign(Object.create(null), settings()), row(), row()).settings).toEqual(completeSettings(300));
  });

  it('takes unweighted RGB code-value means and extrema from the supplied opaque rows', () => {
    const human = row(), eagle = new Uint8ClampedArray(row(47, [12, 60, 90, 255]));
    human.splice(0, 12, 0, 30, 60, 255, 10, 11, 12, 255, 255, 250, 245, 255);
    eagle.set([1, 2, 4, 255, 255, 255, 255, 255], 0);
    const result = api.fromRows(settings(), human, eagle);
    expect(result.settings).toEqual(completeSettings(300)); expect(result.region).toEqual(api.region(settings(), 1024, 512));
    expect(result.human.values).toEqual([30, 11, 250, ...Array(44).fill(90)]);
    expect(result.human).toMatchObject({ min: 11, max: 250, range: 239 });
    expect(result.eagle.values).toEqual([7 / 3, 255, ...Array(45).fill(54)]);
    expect(result.eagle.min).toBe(7 / 3); expect(result.eagle.max).toBe(255); expect(result.eagle.range).toBe(255 - 7 / 3);
    expect(Object.keys(result).sort()).toEqual(['eagle', 'human', 'region', 'settings']);
    for (const signal of [result.human, result.eagle]) expect(Object.keys(signal).sort()).toEqual(['max', 'min', 'range', 'values']);
  });

  it('supports dense clamped-byte views and immutable plain arrays without inferring transfer from settings', () => {
    const storage = new Uint8ClampedArray(47 * 4 + 8), typed = storage.subarray(4, storage.length - 4);
    typed.set(row(47, [0, 255, 0, 255]));
    const plain = Object.freeze(row(47, [255, 0, 0, 255]));
    const first = api.fromRows(settings(), typed, plain);
    expect(first.human).toEqual(first.eagle); expect(first.human).toEqual({ values: Array(47).fill(85), min: 85, max: 85, range: 0 });
    const { local, api: measured } = setup(), model = local.RaptorDistanceModel;
    local.RaptorDistanceModel = { ...model, metrics() { throw new Error('Pixel measurements must not call the transfer model'); } };
    expect(measured.fromRows({ ...settings(), cycles: 4, contrast: 10 }, typed, plain).human).toEqual(first.human);
    expect(measured.fromRows({ ...settings(), cycles: 20, contrast: 100 }, typed, plain).human).toEqual(first.human);
  });

  it('rejects unsupported rows, wrong lengths, sparse arrays and inherited pixel values', () => {
    class PixelArray extends Array {}
    const sparse = row(); delete sparse[12];
    const inherited = row(); delete inherited[12]; Object.setPrototypeOf(inherited, Object.assign(Object.create(Array.prototype), { 12: 60 }));
    const invalid = [undefined, null, {}, 'pixels', [], row().slice(1), row().concat(0), row(48),
      new Uint8ClampedArray(47 * 4 - 1), new Uint8Array(row()), new Int16Array(row()), new Float32Array(row()),
      new DataView(new ArrayBuffer(47 * 4)), { ...row(), length: 47 * 4 }, new PixelArray(...row()), sparse, inherited];
    for (const pixels of invalid) {
      expect(api.fromRows(settings(), pixels, row())).toBeNull(); expect(api.fromRows(settings(), row(), pixels)).toBeNull();
    }
    // A valid row for a different distance cannot silently be cropped or padded.
    expect(api.fromRows(settings(60), row(), row())).toBeNull();
  });

  it('rejects every invalid channel and nonopaque alpha instead of coercing or blending', () => {
    for (const channel of [0, 1, 2, 3]) for (const value of [-1, 256, .5, NaN, Infinity, -Infinity, '60', null, undefined, true]) {
      const invalid = row(); invalid[40 + channel] = value;
      expect(api.fromRows(settings(), invalid, row())).toBeNull(); expect(api.fromRows(settings(), row(), invalid)).toBeNull();
    }
    for (const alpha of [0, 1, 128, 254]) {
      const invalid = new Uint8ClampedArray(row()); invalid[invalid.length - 1] = alpha;
      expect(api.fromRows(settings(), invalid, row())).toBeNull(); expect(api.fromRows(settings(), row(), invalid)).toBeNull();
    }
  });

  it('returns fresh whitelisted settings, regions and signal arrays without input or cross-result aliases', () => {
    const rawSettings = Object.freeze({ ...settings(), predictedRange: 999, image: 'not used' });
    const pixels = Object.freeze(row()), first = api.fromRows(rawSettings, pixels, pixels), second = api.fromRows(rawSettings, pixels, pixels);
    expect(first.settings).not.toBe(rawSettings); expect(first.human).not.toBe(first.eagle);
    expect(first.human.values).not.toBe(first.eagle.values); expect(first.region).not.toBe(second.region);
    first.settings.distance = 60; first.region.x0 = -1; first.human.values[0] = 0; first.eagle.range = 999;
    expect(api.fromRows(rawSettings, pixels, pixels)).toEqual(second);
    expect(second.settings).toEqual(completeSettings(300)); expect(second.human.values[0]).toBe(90); expect(second.eagle.range).toBe(0);
    expect(pixels).toEqual(row()); expect(rawSettings.distance).toBe(300);
    const freshRegion = api.region(settings(), 1024, 512); freshRegion.count = 0;
    expect(api.region(settings(), 1024, 512).count).toBe(47);
  });
});
