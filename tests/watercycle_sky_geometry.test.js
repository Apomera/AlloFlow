import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The pilot mode's rainbow lab teaches the real rule in its own copy — "bright sunlight with the
// Sun below 42 degrees", "Face directly opposite the Sun", "antisolar", primary at 42 deg and
// SECONDARY at 51 deg reversed. The 2D canvas used to contradict every part of it: the Sun was
// pinned near the top of the sky whatever the solar slider said, and the bow was a fixed arc at a
// spot unrelated to the Sun, drawn only when solar > 0.7 — which is exactly when the Sun is too
// high for a rainbow to exist at all. A tool cannot teach a rule on one screen and break it on the
// next, so both now come from one model, pinned here as behaviour.
const PATHS = [
  resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'),
  resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),
];
const src = readFileSync(PATHS[0], 'utf8');

function sliceGeometry(text) {
  const start = text.indexOf('  var WC_SKY_HORIZON_FRAC = 0.62;');
  // Anchor the end on THIS block's own export, then step back to the `if` that guards it, so a
  // later exported block added in between cannot silently truncate the slice. Cutting inside the
  // `if` would leave an unclosed brace and fail to parse.
  expect(start, 'sky geometry block present').toBeGreaterThan(-1);
  const exportAt = text.indexOf('window.WaterCycleSkyGeometry = ', start);
  expect(exportAt, 'sky geometry export present').toBeGreaterThan(start);
  const end = text.lastIndexOf("  if (typeof window !== 'undefined') {", exportAt);
  expect(end, 'sky geometry export guard present').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(text.slice(start, end) + `
    return { sunElevation: wcSunElevation, sunAltitudeDeg: wcSunAltitudeDeg, sunYFrac: wcSunYFrac,
      antisolarYFrac: wcAntisolarYFrac, antisolarXFrac: wcAntisolarXFrac,
      bowRadiusFrac: wcBowRadiusFrac, bowArc: wcBowArc, rainbowVisible: wcRainbowVisible,
      PRIMARY: WC_RAINBOW_PRIMARY_DEG, SECONDARY: WC_RAINBOW_SECONDARY_DEG,
      HORIZON: WC_SKY_HORIZON_FRAC, MAX_DEG: WC_SUN_MAX_ALTITUDE_DEG, FLOOR: WC_SUN_ELEV_FLOOR,
      SPAN: WC_SUN_ELEV_SPAN, SUN_TOP: WC_SUN_TOP_FRAC };`)();
}

const G = sliceGeometry(src);
// Solar-slider value that puts the Sun at a given altitude in degrees.
const atAltitude = (deg) => G.FLOOR + (deg / G.MAX_DEG) * G.SPAN;

describe('Water Cycle 2D sky geometry', () => {
  it('raises and lowers the Sun with the solar slider, leaving full day exactly where it was', () => {
    // Full day must be untouched: this is the scene a teacher sees almost every time.
    expect(G.sunYFrac(1.0)).toBeCloseTo(G.SUN_TOP, 10);
    expect(G.sunYFrac(2.0)).toBeCloseTo(G.SUN_TOP, 10);
    expect(G.sunAltitudeDeg(1.0)).toBeCloseTo(G.MAX_DEG, 10);
    // ...and a dusk Sun is genuinely low, which is what makes the dusk sky coherent.
    expect(G.sunAltitudeDeg(G.FLOOR)).toBeCloseTo(0, 10);
    expect(G.sunYFrac(0.45)).toBeGreaterThan(G.sunYFrac(0.9));
    expect(G.sunYFrac(G.FLOOR)).toBeLessThan(G.HORIZON);
  });

  it('centres the bow on the antisolar point: opposite the Sun, and as far below the horizon as the Sun is above', () => {
    expect(G.antisolarXFrac(0.82)).toBeCloseTo(0.18, 10);
    for (const solar of [0.32, 0.4, 0.5, 0.6]) {
      const sunAbove = G.HORIZON - G.sunYFrac(solar);
      const centreBelow = G.antisolarYFrac(solar) - G.HORIZON;
      expect(centreBelow, 'solar ' + solar).toBeCloseTo(sunAbove, 10);
    }
  });

  it('hides the primary bow once the Sun passes 42 degrees, the rule the pilot lab states', () => {
    expect(G.rainbowVisible(atAltitude(41))).toBe(true);
    expect(G.rainbowVisible(atAltitude(43))).toBe(false);
    // Locate the crossing rather than trusting one sample either side of it.
    let last = null;
    for (let deg = 0; deg <= G.MAX_DEG; deg += 0.01) {
      if (G.rainbowVisible(atAltitude(deg))) last = deg; else break;
    }
    expect(last).toBeGreaterThan(41.9);
    expect(last).toBeLessThan(42.1);
  });

  it('opens a wider arc the lower the Sun sits', () => {
    const span = (deg) => {
      const a = G.bowArc(atAltitude(deg), G.PRIMARY);
      return a ? a[1] - a[0] : 0;
    };
    expect(span(0)).toBeGreaterThan(span(20));
    expect(span(20)).toBeGreaterThan(span(38));
    expect(span(38)).toBeGreaterThan(0);
    // A bow with the Sun on the horizon is the biggest one anybody ever sees: a full half circle
    // in principle, and well over a hundred degrees of arc here.
    expect(span(0) * 180 / Math.PI).toBeGreaterThan(120);
  });

  it('places the secondary bow outside the primary at the real angular ratio, and lets it survive higher', () => {
    expect(G.bowRadiusFrac(G.SECONDARY) / G.bowRadiusFrac(G.PRIMARY)).toBeCloseTo(51 / 42, 6);
    expect(G.bowRadiusFrac(G.SECONDARY)).toBeGreaterThan(G.bowRadiusFrac(G.PRIMARY));
    // Between 42 and 51 degrees only the secondary can clear the horizon.
    const solar45 = atAltitude(45);
    expect(G.bowArc(solar45, G.PRIMARY)).toBeNull();
    expect(G.bowArc(solar45, G.SECONDARY)).not.toBeNull();
  });

  it('never claims a rainbow when the Sun is not in the sky', () => {
    // Below the floor the scene draws a Moon; moonbows are far too faint for this diagram.
    expect(G.rainbowVisible(G.FLOOR - 0.01)).toBe(false);
    expect(G.rainbowVisible(0)).toBe(false);
    expect(G.rainbowVisible(NaN)).toBe(false);
    expect(G.rainbowVisible(undefined)).toBe(false);
  });

  it('is wired into the 2D renderer and ships identically in both copies', () => {
    expect(src).toContain('var sunY = cH * wcSunYFrac(skyBright)');
    expect(src).toContain('var bowArc2d = wcBowArc(skyBright, WC_RAINBOW_PRIMARY_DEG);');
    expect(src).toContain('var rbCx = cW * wcAntisolarXFrac(WC_SUN_X_FRAC);');
    expect(src).toContain('var rbCy = cH * wcAntisolarYFrac(skyBright);');
    // The old gate asked for the one condition under which a rainbow is impossible.
    expect(src).not.toContain("climSolar > 0.7 && climTemp > 10");
    // A bow must not paint over the land it is supposed to sit in front of.
    expect(src).toContain('ctx.rect(0, 0, cW, cH * WC_SKY_HORIZON_FRAC);');
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
  });

  it('names the rule on the scene, in both string tables', () => {
    // A bow that silently comes and goes teaches nothing; the label states the geometry at the
    // moment a learner can watch it govern the scene.
    expect(src).toContain("t('stem.watercycle.scene_rainbow_rule', 'RAINBOW · 42° OPPOSITE THE SUN')");
    const strings = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const mirror = JSON.parse(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/ui_strings.js'), 'utf8'));
    expect(strings.stem.watercycle.scene_rainbow_rule).toBe('RAINBOW · 42° OPPOSITE THE SUN');
    expect(mirror.stem.watercycle.scene_rainbow_rule).toBe(strings.stem.watercycle.scene_rainbow_rule);
    // The angle in the label and the angle the geometry uses must be the same number.
    expect(String(G.PRIMARY)).toBe('42');
  });
});
