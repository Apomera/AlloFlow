import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The 2D scene's sky already rendered three lighting regimes off the solar slider (night below
// 0.3, dawn/dusk to 0.6, day above) while the GROUND was lit for noon in all three. Measured on
// 2026-09-03 from dev-tools/wc_scene_shots.cjs at the night preset (climSolar 0.2): sky luminance
// 36, meadow 156 — the grass read more than four times brighter than the sky over it — and the
// whole dusk band darkened the ground not at all, because the old wash only switched on below 0.32.
//
// The curve now lives in two pure module-level functions so it can be pinned as BEHAVIOUR instead
// of as a spelling buried in a 28,000-line render function, and so this suite runs in about a
// second: evaluating the whole tool takes ~45s and blows vitest's hook timeout, which is why every
// other watercycle suite reads source too (see project_watercycle_audit).
const PATHS = [
  resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'),
  resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),
];
const src = readFileSync(PATHS[0], 'utf8');

function sliceLighting(text) {
  const start = text.indexOf('  var WC_TERRAIN_LIGHT_FULL_SUN =');
  // Anchor the end on THIS block's own export, then step back to the `if` that guards it. Taking
  // the first `if (typeof window …)` after the start would break the moment another exported block
  // is added in between — which is exactly what happened when the sky-geometry helpers landed.
  // Cutting mid-`if` leaves an unclosed block and the slice fails to parse, so back up to its start.
  const exportAt = text.indexOf('window.WaterCycleTerrainLight = ', start);
  expect(exportAt, 'terrain lighting export present').toBeGreaterThan(start);
  const end = text.lastIndexOf("  if (typeof window !== 'undefined') {", exportAt);
  expect(start, 'terrain lighting block present').toBeGreaterThan(-1);
  expect(end, 'terrain lighting export present').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(
    text.slice(start, end) + '\nreturn { alpha: wcTerrainWashAlpha, rgb: wcTerrainWashRgb, FULL_SUN: WC_TERRAIN_LIGHT_FULL_SUN, NIGHT_AT: WC_TERRAIN_LIGHT_NIGHT_AT, MAX: WC_TERRAIN_LIGHT_MAX_WASH };'
  )();
}

const light = sliceLighting(src);

describe('Water Cycle terrain lighting follows the sky', () => {
  it('leaves full daylight completely untouched', () => {
    // Any wash in daylight would tint the scene a teacher sees 95% of the time, so this is the
    // one hard zero in the curve.
    expect(light.alpha(1)).toBe(0);
    expect(light.alpha(2)).toBe(0);
    expect(light.alpha(light.FULL_SUN)).toBe(0);
    expect(light.alpha(0.7)).toBe(0);
  });

  it('darkens the ground through the dusk band, which it previously ignored entirely', () => {
    // The defect: the old wash gated on `skyBright < 0.32`, so at 0.45 — an orange sky with a low
    // sun — the meadow stayed noon-green. Anything above zero here is the fix; the bounds keep it
    // from becoming a full night at dusk.
    const dusk = light.alpha(0.45);
    expect(dusk).toBeGreaterThan(0.1);
    expect(dusk).toBeLessThan(light.alpha(light.NIGHT_AT));
  });

  it('reaches a real night level by the time the sky finishes turning night', () => {
    // Ground and sky must change regime together: at NIGHT_AT the sky is fully night, so the
    // ground has to be too. The old curve reached only ~0.126 at the 0.2 night preset, which is
    // what left a noon meadow under a midnight sky.
    expect(light.alpha(light.NIGHT_AT)).toBeGreaterThanOrEqual(0.5);
    expect(light.alpha(0.2)).toBeGreaterThan(0.5);
    expect(light.alpha(0)).toBeCloseTo(light.MAX, 5);
  });

  it('never brightens the ground as the sun goes down', () => {
    let previous = -1;
    for (let b = 1; b >= 0; b -= 0.01) {
      const a = light.alpha(b);
      expect(a, 'alpha at skyBright ' + b.toFixed(2)).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = a;
    }
    // The loop's accumulated step never lands exactly on zero, so the endpoint is asserted directly.
    expect(light.alpha(0)).toBeCloseTo(light.MAX, 5);
  });

  it('keeps the scene readable rather than painting it out', () => {
    // A wash at 1.0 would erase the terrain the lesson is about. The cap leaves the meadow near
    // half its noon luminance, which the screenshots confirm still shows the shoreline and trees.
    expect(light.MAX).toBeLessThan(0.75);
  });

  it('tints dusk warm and night cool, because the light source changes', () => {
    const parse = (s) => s.split(',').map(Number);
    const [nr, ng, nb] = parse(light.rgb(0));
    expect(nb, 'deep night is blue-shifted').toBeGreaterThan(nr);
    expect(nb).toBeGreaterThan(ng);
    const [dr, dg, db] = parse(light.rgb(0.48));
    expect(dr, 'low sun is warm').toBeGreaterThan(db);
    expect(dr).toBeGreaterThan(dg);
  });

  it('guards against a non-numeric solar reading', () => {
    // climSolar arrives through a dataset attribute, so a parse failure must not paint the scene.
    expect(light.alpha(NaN)).toBe(0);
    expect(light.alpha(undefined)).toBe(0);
  });

  it('is wired into the 2D renderer and ships identically in both copies', () => {
    expect(src).toContain('var nightWash2d = wcTerrainWashAlpha(skyBright);');
    expect(src).toContain('var washRgb2d = wcTerrainWashRgb(skyBright);');
    // The dark theme carries its own night palette and must stay exempt.
    expect(src).toContain('if (!isDark && skyBright < WC_TERRAIN_LIGHT_FULL_SUN) {');
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
  });
});
