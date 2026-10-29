import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeAll(() => {
  const lab = resetStemLab();
  lab.registerTool('geometryWorld', { aliases: [], render() { return null; } });
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js', 'utf8'))();
  api = window.StemLab.geometryWorldBuilderPure;
});

function measurement(overrides) { return { L: 7, W: 3, H: 5, isComplete: true, ...overrides }; }

describe('Geometry World fit-to-printer scale suggestion', () => {
  it('uses the default bed and its planning margin', () => {
    const m = measurement();
    expect(api.suggestedPrintScale(m)).toBe(30);
    expect(api.defaultPrintEnvelope(m, undefined, 30)).toMatchObject({ fits: true, tight: false, clearanceMm: 5 });
  });

  it('floors the limiting dimension instead of rounding beyond the bed', () => {
    const profile = { bedWidthMm: 50, bedDepthMm: 60, bedHeightMm: 70 };
    const m = measurement();
    expect(api.suggestedPrintScale(m, profile)).toBe(5.71);
    expect(m.L * 5.71).toBeLessThanOrEqual(40);
    expect(api.defaultPrintEnvelope(m, profile, 5.72).tight).toBe(true);
  });

  it.each([
    [{ planningClearanceMm: 0 }, 31.42],
    [{ planningClearanceMm: 50 }, 17.14],
    [{ planningClearanceMm: 500 }, 17.14],
    [{ planningClearanceMm: -5 }, 31.42],
    [{ planningClearanceMm: NaN }, 30],
    [{ planningClearanceMm: Infinity }, 30],
    [{ planningClearanceMm: '10' }, 28.57],
  ])('matches the existing clearance normalization for %j', (profile, expected) => {
    const m = measurement();
    const result = api.suggestedPrintScale(m, profile);
    expect(result).toBe(expected);
    expect(api.defaultPrintEnvelope(m, profile, result)).toMatchObject({ fits: true, tight: false });
  });

  it('honors bed dimension clamping and the smallest of all three axes', () => {
    expect(api.suggestedPrintScale(measurement({ L: 1, W: 1, H: 1 }), {
      bedWidthMm: 4, bedDepthMm: 2000, bedHeightMm: Infinity, planningClearanceMm: 0,
    })).toBe(50);
    expect(api.suggestedPrintScale(measurement({ L: 1, W: 10, H: 1 }), {
      bedWidthMm: 200, bedDepthMm: 50, bedHeightMm: 100,
    })).toBe(4);
    expect(api.suggestedPrintScale(measurement({ L: 1, W: 1, H: 10 }), {
      bedWidthMm: 200, bedDepthMm: 200, bedHeightMm: 50,
    })).toBe(4);
  });

  it('returns no suggestion when the planning margin consumes the print volume', () => {
    expect(api.suggestedPrintScale(measurement(), { bedWidthMm: 50, planningClearanceMm: 25 })).toBeNull();
    expect(api.suggestedPrintScale(measurement(), { bedHeightMm: 50, planningClearanceMm: 50 })).toBeNull();
  });

  it('accepts the minimum supported scale and refuses a smaller required scale', () => {
    expect(api.suggestedPrintScale(measurement({ L: 21000 }))).toBe(0.01);
    expect(api.suggestedPrintScale(measurement({ L: 21001 }))).toBeNull();
  });

  it('caps the suggestion at the maximum supported scale', () => {
    const profile = { bedWidthMm: 1000, bedDepthMm: 1000, bedHeightMm: 1000, planningClearanceMm: 0 };
    expect(api.suggestedPrintScale(measurement({ L: 0.1, W: 0.1, H: 0.1 }), profile)).toBe(1000);
  });

  it.each([null, {}, { L: 2, W: 2 }, measurement({ isComplete: false }),
    ...['L', 'W', 'H'].flatMap(axis => [0, -1, NaN, Infinity, -Infinity, '2', null].map(value => measurement({ [axis]: value }))),
  ])('refuses missing, partial, or invalid dimensions: %j', m => {
    expect(api.suggestedPrintScale(m)).toBeNull();
  });

  it('keeps fractional profile suggestions within both actual and displayed limits without mutation', () => {
    const profiles = [undefined,
      { bedWidthMm: 50.123, bedDepthMm: 90.555, bedHeightMm: 60.777, planningClearanceMm: 2.337 },
      { bedWidthMm: 81, bedDepthMm: 100, bedHeightMm: 64, planningClearanceMm: 0 },
    ];
    for (const profile of profiles) {
      for (const m of [measurement(), measurement({ L: 100, W: 1, H: 2 }), measurement({ L: 3, W: 32, H: 7 })]) {
        const before = JSON.stringify({ m, profile });
        const scale = api.suggestedPrintScale(m, profile);
        const envelope = api.defaultPrintEnvelope(m, profile, scale);
        const bed = api.builderBedLimits(profile);
        expect(envelope).toMatchObject({ fits: true, tight: false });
        expect(m.L * scale).toBeLessThanOrEqual(bed.width - 2 * envelope.clearanceMm);
        expect(m.W * scale).toBeLessThanOrEqual(bed.depth - 2 * envelope.clearanceMm);
        expect(m.H * scale).toBeLessThanOrEqual(bed.height - 2 * envelope.clearanceMm);
        expect(JSON.stringify({ m, profile })).toBe(before);
      }
    }
  });
});
