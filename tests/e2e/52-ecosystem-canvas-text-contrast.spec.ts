import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Text drawn ON the canvas is invisible to every DOM contrast probe — getComputedStyle
// has nothing to report for a fillText call. This tool paints a HUD, a tool label, a
// phase pill and a mini-chart caption straight onto the simulation, over a sky that
// brightens and darkens on a day/night cycle, so the worst case only appears at one
// point in that cycle.
//
// Found this way: the sandbox tool label was emerald-500 at 0.85 alpha, which composites
// to 3.17:1 over the HUD panel at the brightest point of the day — well under the 4.5
// that bold 9px text needs. It is emerald-400 at full opacity now, 5.02:1.
//
// Method: a region's BACKGROUND is its modal colour, because glyphs are always a
// minority of the pixels. Luminance percentiles do not work here — they report whatever
// else is in the box (population bars, chart lines, sprites) rather than the text.
//
// The INK is read out of the source, not hardcoded here. An earlier version of this spec
// asserted the fixed colours as literals and therefore passed against the unfixed tool —
// it was only ever checking "if you draw this colour, it is legible", which is not the
// property that matters. Reading the fillStyle that actually precedes each fillText means
// changing the colour back is caught.

const SRC = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');

// The fillStyle in force at a fillText is the nearest one above it.
function inkBefore(anchor: string): { rgb: number[]; alpha: number; raw: string } {
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('canvas text anchor not found, it was renamed: ' + anchor);
  const before = SRC.slice(0, at);
  const m = [...before.matchAll(/fillStyle\s*=\s*'([^']+)'/g)].pop();
  if (!m) throw new Error('no fillStyle found before ' + anchor);
  const raw = m[1];
  let rgb: number[];
  let alpha = 1;
  const hex = raw.match(/^#([0-9a-fA-F]{6})$/);
  const rgba = raw.match(/^rgba?\(([^)]+)\)$/);
  if (hex) {
    rgb = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  } else if (rgba) {
    const parts = rgba[1].split(',').map((v) => parseFloat(v.trim()));
    rgb = parts.slice(0, 3);
    if (parts.length > 3) alpha = parts[3];
  } else {
    throw new Error('unparsed fillStyle ' + raw + ' before ' + anchor);
  }
  return { rgb, alpha, raw };
}

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js',
  toolId: 'ecosystem',
  width: 1280,
  height: 900,
  appStyles: true,
  probes: `
    window.__c = function () { return document.querySelector('canvas[data-eco-canvas]'); };
    window.__setTool = function (t) { var c = window.__c(); if (c) c.dataset.sandboxTool = t; };
    window.__size = function () { var c = window.__c(); if (!c) return null; var r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; };
    window.__lum = function (r, g, b) {
      var f = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
    };
    window.__modalBg = function (x, y, w, h) {
      var c = window.__c(); if (!c) return null;
      var g = c.getContext('2d'); if (!g) return null;
      var dpr = c.width / (c.getBoundingClientRect().width || c.width);
      var px = Math.max(0, Math.round(x * dpr)), py = Math.max(0, Math.round(y * dpr));
      var pw = Math.min(c.width - px, Math.round(w * dpr)), ph = Math.min(c.height - py, Math.round(h * dpr));
      if (pw <= 0 || ph <= 0) return null;
      var d = g.getImageData(px, py, pw, ph).data;
      var counts = {}, best = null, bestN = 0;
      for (var i = 0; i < d.length; i += 4) {
        var k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
        counts[k] = (counts[k] || 0) + 1;
        if (counts[k] > bestN) { bestN = counts[k]; best = [d[i], d[i + 1], d[i + 2]]; }
      }
      return { bg: best, share: bestN / (pw * ph) };
    };
    // alpha < 1 is composited over the measured ground, which is what the canvas does.
    window.__inkContrast = function (fg, alpha, x, y, w, h) {
      var m = window.__modalBg(x, y, w, h); if (!m) return null;
      var f = alpha >= 1 ? fg : fg.map(function (v, i) { return v * alpha + m.bg[i] * (1 - alpha); });
      var lf = window.__lum(f[0], f[1], f[2]), lb = window.__lum(m.bg[0], m.bg[1], m.bg[2]);
      return { ratio: (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05),
               bg: 'rgb(' + m.bg.map(Math.round).join(',') + ')', share: m.share };
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 300_000 });

test('canvas overlay text stays legible across the day/night cycle', async ({ page }) => {
  await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.waitForTimeout(1500);
  const size = await page.evaluate(() => (window as any).__size());
  // The tool label only paints when a sandbox tool is active.
  await page.evaluate(() => (window as any).__setTool('rabbit'));
  await page.waitForTimeout(500);

  // label, source anchor the ink is read from, region, minimum required
  const specs: Array<[string, string, number[], number]> = [
    ['HUD population', "fillText(activeScenario.prey.emoji", [8, 14, 182, 30], 4.5],
    ['HUD day/night', "fillText(aquaticRender ?", [8, 44, 182, 12], 4.5],
    ['HUD tool label', "fillText('Tool: '", [8, 54, 182, 10], 4.5],
    ['mini chart caption', "fillText(__alloT('stem.ecosystem.last_10s'", [size.w - 160, 8, 150, 16], 4.5],
  ];
  const texts = specs.map(([name, anchor, box, need]) => {
    const ink = inkBefore(anchor);
    return [name, ink.rgb, ink.alpha, box, need, ink.raw] as
      [string, number[], number, number[], number, string];
  });
  texts.forEach(([name, , , , , raw]) => console.log(`${name}: ink from source = ${raw}`));

  const worst: Record<string, any> = {};
  // Sample across a full brightening/darkening swing; the failure only shows at one end.
  for (let s = 0; s < 24; s++) {
    for (const [name, fg, alpha, box] of texts) {
      const r = await page.evaluate(
        ([f, a, b]) => (window as any).__inkContrast(f, a, b[0], b[1], b[2], b[3]),
        [fg, alpha, box] as any);
      if (!r) continue;
      if (!worst[name] || r.ratio < worst[name].ratio) worst[name] = r;
    }
    await page.waitForTimeout(500);
  }

  for (const [name, fg, alpha, box, need, raw] of texts) {
    const r = worst[name];
    expect(r, `${name}: region produced no reading`).toBeTruthy();
    // A modal colour that covers almost none of the region means the box is not sitting
    // on a panel at all, so the "background" would be meaningless.
    expect(r.share, `${name}: no dominant background in the sampled region`).toBeGreaterThan(0.3);
    expect(
      Number(r.ratio.toFixed(2)),
      `${name} (${raw}) is ${r.ratio.toFixed(2)}:1 on ${r.bg} at the worst point of the day cycle`,
    ).toBeGreaterThanOrEqual(need);
  }
});
