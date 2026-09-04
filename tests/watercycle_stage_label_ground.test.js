import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The six stage words that name the water cycle on the 2D canvas were painted straight onto the
// scene at 0xA8 alpha, so their contrast was whatever happened to be behind them. Measured from a
// rendered light-theme frame on 2026-09-04, EVERY inactive label failed WCAG AA: evaporation
// 1.10:1, infiltration 1.14, transpiration 1.26, precipitation 1.28, condensation 1.71, collection
// 2.38 — against a 4.5 requirement, the worst two effectively invisible.
//
// ★ NOTHING COULD SEE IT. axe never runs on canvas pixels; dev-tools/scan_theme_contrast.cjs reads
// hex literals in style objects; and wcReadableInk — the helper this tool already uses at nine
// render sites — needs a KNOWN background, which a word floating over sky, rock, water or soil does
// not have. Giving it one is the fix, so the ink is near-white on a known ground.
//
// Rendered result after the change, sampled from the shots: light 10.47:1 worst case, dark 15.00,
// night 16.30. This suite pins the mechanism that produces those numbers, because the numbers
// themselves need a browser and this tool takes ~45s to evaluate (see watercycle_readable_ink).
const PATHS = [
  resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js'),
  resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'),
];
const src = readFileSync(PATHS[0], 'utf8');

function labelRegion(text) {
  const start = text.indexOf('var labels = [');
  const end = text.indexOf('CLIMATE LAB', start);
  expect(start, 'stage label block present').toBeGreaterThan(-1);
  expect(end, 'stage label block bounded').toBeGreaterThan(start);
  return text.slice(start, end);
}
const region = labelRegion(src);

// Relative luminance and contrast, per WCAG 2.x.
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));

describe('Water Cycle stage labels have a ground of their own', () => {
  it('paints a chip behind every label before the text', () => {
    expect(region).toContain("ctx.fillStyle = isActive ? 'rgba(2,6,23,0.86)' : 'rgba(2,6,23,0.72)';");
    expect(region).toContain('ctx.fillRect(stageChipX2d, stageChipY2d, stageChipW2d, stageChipH2d);');
    // The chip must be filled BEFORE the word, or it paints over it.
    expect(region.indexOf('ctx.fillRect(stageChipX2d'))
      .toBeLessThan(region.indexOf('ctx.fillText(lbl.text'));
    // The identity hue survives as the border rather than as the ink.
    expect(region).toContain("ctx.strokeStyle = lblColor + 'CC';");
  });

  it('uses a near-white ink instead of the identity hue at partial alpha', () => {
    expect(region).toContain("ctx.fillStyle = '#f8fafc';");
    // The old scheme, in both its light and dark spellings, must not come back.
    expect(region).not.toContain("lblColor + 'A8'");
    expect(region).not.toContain("lblColor + 'B8'");
  });

  it('clears AA against its own chip over any backdrop the scene can put behind it', () => {
    // The chip is translucent, so the true ground is the chip composited over the scene. Check the
    // ink against the WORST case: the chip over the brightest thing the canvas draws (a noon sky),
    // which lightens the ground most and therefore costs the most contrast.
    const ink = hex('#f8fafc');
    const chip = hex('#020617');
    const brightestBackdrop = [255, 255, 255];
    for (const alpha of [0.72, 0.86]) {
      const ground = over(chip, brightestBackdrop, alpha);
      expect(contrast(ink, ground), 'chip alpha ' + alpha).toBeGreaterThanOrEqual(4.5);
    }
    // And it should be comfortably past the bar, not scraping it.
    expect(contrast(ink, over(chip, brightestBackdrop, 0.72))).toBeGreaterThan(7);
  });

  it('keeps the active label distinguishable from the other five', () => {
    // A uniform chip would make every stage look equally current; the active one is denser, bold,
    // and keeps its dashed hue border.
    expect(region).toContain("isActive ? 'rgba(2,6,23,0.86)' : 'rgba(2,6,23,0.72)'");
    expect(region).toMatch(/isActive \? 'bold ' : ''/);
    expect(region).toContain('ctx.setLineDash([4 * dpr, 3 * dpr]);');
  });

  it('ships identically in both copies', () => {
    expect(readFileSync(PATHS[0], 'utf8')).toBe(readFileSync(PATHS[1], 'utf8'));
  });
});
