import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = fs.readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
const spectral = source.slice(source.indexOf('  // BEGIN ART STUDIO SPECTRAL VENDOR'), source.indexOf('  // END ART STUDIO MIXER HELPERS'));
const tray = source.slice(source.indexOf('          const WATERCOLOR_PIGMENTS'), source.indexOf('          const persistArtworkBeforeLeave'));
const api = new Function(spectral + '\n' + tray + '\nreturn {mix:mixWatercolorPigments,profiles:WATERCOLOR_PIGMENTS};')();

describe('Watercolor pigment premixing', () => {
  it('matches the pinned blue and yellow pigment reference instead of an RGB average', () => {
    const a = { ...api.profiles[0], color: '#002185' }, b = { ...api.profiles[1], color: '#fcd200' };
    expect(api.mix(a, b, 50).color).toBe('#3d933e');
  });
  it('keeps exact endpoints and an unchanged single-pigment color', () => {
    const [a, b] = api.profiles;
    expect(api.mix(a, b, 0).color).toBe(a.color); expect(api.mix(a, b, 100).color).toBe(b.color);
    expect(api.mix(a, a, 37).color).toBe(a.color);
  });
  it('carries the selected proportions into material behavior', () => {
    const [a, b] = api.profiles;
    expect(api.mix(a, b, 25)).toMatchObject({ firstWeight: 0.75, secondWeight: 0.25, values: {
      watercolorGranulation: 63, watercolorStaining: 47, watercolorOpacity: 27, watercolorMobility: 67
    } });
  });
  it('preserves the mixture when the pigment order and proportions are swapped', () => {
    const [a, b] = api.profiles;
    expect(api.mix(a, b, 25).color).toBe(api.mix(b, a, 75).color);
    expect(api.mix(a, b, 25).values).toEqual(api.mix(b, a, 75).values);
  });
  it('normalizes invalid saved ratios and bounds extreme values', () => {
    const [a, b] = api.profiles;
    for (const ratio of [NaN, Infinity, {}, 'invalid']) expect(api.mix(a, b, ratio)).toEqual(api.mix(a, b, 50));
    expect(api.mix(a, b, -10).color).toBe(a.color); expect(api.mix(a, b, 300).color).toBe(b.color);
  });
});
