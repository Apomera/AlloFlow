# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 52-ecosystem-canvas-text-contrast.spec.ts >> canvas overlay text stays legible across the day/night cycle
- Location: tests\e2e\52-ecosystem-canvas-text-contrast.spec.ts:96:5

# Error details

```
Error: canvas text anchor not found, it was renamed: fillText(__alloT('stem.ecosystem.last_10s'
```

# Test source

```ts
  1   | import fs from 'node:fs';
  2   | import { test, expect } from '@playwright/test';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | // Text drawn ON the canvas is invisible to every DOM contrast probe — getComputedStyle
  6   | // has nothing to report for a fillText call. This tool paints a HUD, a tool label, a
  7   | // phase pill and a mini-chart caption straight onto the simulation, over a sky that
  8   | // brightens and darkens on a day/night cycle, so the worst case only appears at one
  9   | // point in that cycle.
  10  | //
  11  | // Found this way: the sandbox tool label was emerald-500 at 0.85 alpha, which composites
  12  | // to 3.17:1 over the HUD panel at the brightest point of the day — well under the 4.5
  13  | // that bold 9px text needs. It is emerald-400 at full opacity now, 5.02:1.
  14  | //
  15  | // Method: a region's BACKGROUND is its modal colour, because glyphs are always a
  16  | // minority of the pixels. Luminance percentiles do not work here — they report whatever
  17  | // else is in the box (population bars, chart lines, sprites) rather than the text.
  18  | //
  19  | // The INK is read out of the source, not hardcoded here. An earlier version of this spec
  20  | // asserted the fixed colours as literals and therefore passed against the unfixed tool —
  21  | // it was only ever checking "if you draw this colour, it is legible", which is not the
  22  | // property that matters. Reading the fillStyle that actually precedes each fillText means
  23  | // changing the colour back is caught.
  24  | 
  25  | const SRC = fs.readFileSync('stem_lab/stem_tool_ecosystem.js', 'utf8');
  26  | 
  27  | // The fillStyle in force at a fillText is the nearest one above it.
  28  | function inkBefore(anchor: string): { rgb: number[]; alpha: number; raw: string } {
  29  |   const at = SRC.indexOf(anchor);
> 30  |   if (at < 0) throw new Error('canvas text anchor not found, it was renamed: ' + anchor);
      |                     ^ Error: canvas text anchor not found, it was renamed: fillText(__alloT('stem.ecosystem.last_10s'
  31  |   const before = SRC.slice(0, at);
  32  |   const m = [...before.matchAll(/fillStyle\s*=\s*'([^']+)'/g)].pop();
  33  |   if (!m) throw new Error('no fillStyle found before ' + anchor);
  34  |   const raw = m[1];
  35  |   let rgb: number[];
  36  |   let alpha = 1;
  37  |   const hex = raw.match(/^#([0-9a-fA-F]{6})$/);
  38  |   const rgba = raw.match(/^rgba?\(([^)]+)\)$/);
  39  |   if (hex) {
  40  |     rgb = [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  41  |   } else if (rgba) {
  42  |     const parts = rgba[1].split(',').map((v) => parseFloat(v.trim()));
  43  |     rgb = parts.slice(0, 3);
  44  |     if (parts.length > 3) alpha = parts[3];
  45  |   } else {
  46  |     throw new Error('unparsed fillStyle ' + raw + ' before ' + anchor);
  47  |   }
  48  |   return { rgb, alpha, raw };
  49  | }
  50  | 
  51  | const harness = new GlHarness({
  52  |   toolFile: 'stem_lab/stem_tool_ecosystem.js',
  53  |   toolId: 'ecosystem',
  54  |   width: 1280,
  55  |   height: 900,
  56  |   appStyles: true,
  57  |   probes: `
  58  |     window.__c = function () { return document.querySelector('canvas[data-eco-canvas]'); };
  59  |     window.__setTool = function (t) { var c = window.__c(); if (c) c.dataset.sandboxTool = t; };
  60  |     window.__size = function () { var c = window.__c(); if (!c) return null; var r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; };
  61  |     window.__lum = function (r, g, b) {
  62  |       var f = [r, g, b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  63  |       return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  64  |     };
  65  |     window.__modalBg = function (x, y, w, h) {
  66  |       var c = window.__c(); if (!c) return null;
  67  |       var g = c.getContext('2d'); if (!g) return null;
  68  |       var dpr = c.width / (c.getBoundingClientRect().width || c.width);
  69  |       var px = Math.max(0, Math.round(x * dpr)), py = Math.max(0, Math.round(y * dpr));
  70  |       var pw = Math.min(c.width - px, Math.round(w * dpr)), ph = Math.min(c.height - py, Math.round(h * dpr));
  71  |       if (pw <= 0 || ph <= 0) return null;
  72  |       var d = g.getImageData(px, py, pw, ph).data;
  73  |       var counts = {}, best = null, bestN = 0;
  74  |       for (var i = 0; i < d.length; i += 4) {
  75  |         var k = (d[i] >> 3) + ',' + (d[i + 1] >> 3) + ',' + (d[i + 2] >> 3);
  76  |         counts[k] = (counts[k] || 0) + 1;
  77  |         if (counts[k] > bestN) { bestN = counts[k]; best = [d[i], d[i + 1], d[i + 2]]; }
  78  |       }
  79  |       return { bg: best, share: bestN / (pw * ph) };
  80  |     };
  81  |     // alpha < 1 is composited over the measured ground, which is what the canvas does.
  82  |     window.__inkContrast = function (fg, alpha, x, y, w, h) {
  83  |       var m = window.__modalBg(x, y, w, h); if (!m) return null;
  84  |       var f = alpha >= 1 ? fg : fg.map(function (v, i) { return v * alpha + m.bg[i] * (1 - alpha); });
  85  |       var lf = window.__lum(f[0], f[1], f[2]), lb = window.__lum(m.bg[0], m.bg[1], m.bg[2]);
  86  |       return { ratio: (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05),
  87  |                bg: 'rgb(' + m.bg.map(Math.round).join(',') + ')', share: m.share };
  88  |     };
  89  |   `,
  90  | });
  91  | 
  92  | test.beforeAll(async () => { await harness.start(); });
  93  | test.afterAll(async () => { await harness.stop(); });
  94  | test.describe.configure({ timeout: 300_000 });
  95  | 
  96  | test('canvas overlay text stays legible across the day/night cycle', async ({ page }) => {
  97  |   await harness.mount(page, { ecosystem: { tab: 'sandbox', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  98  |   await page.waitForTimeout(1500);
  99  |   const size = await page.evaluate(() => (window as any).__size());
  100 |   // The tool label only paints when a sandbox tool is active.
  101 |   await page.evaluate(() => (window as any).__setTool('rabbit'));
  102 |   await page.waitForTimeout(500);
  103 | 
  104 |   // label, source anchor the ink is read from, region, minimum required
  105 |   const specs: Array<[string, string, number[], number]> = [
  106 |     ['HUD population', "fillText(activeScenario.prey.emoji", [8, 14, 232, 34], 4.5],
  107 |     ['HUD day/night', "fillText(aquaticRender ?", [8, 50, 232, 16], 4.5],
  108 |     ['HUD tool label', "fillText('Tool: '", [8, 66, 232, 18], 4.5],
  109 |     ['mini chart caption', "fillText(__alloT('stem.ecosystem.recent_population_samples'", [size.w - 160, 10, 150, 18], 4.5],
  110 |   ];
  111 |   const texts = specs.map(([name, anchor, box, need]) => {
  112 |     const ink = inkBefore(anchor);
  113 |     return [name, ink.rgb, ink.alpha, box, need, ink.raw] as
  114 |       [string, number[], number, number[], number, string];
  115 |   });
  116 |   texts.forEach(([name, , , , , raw]) => console.log(`${name}: ink from source = ${raw}`));
  117 | 
  118 |   const worst: Record<string, any> = {};
  119 |   // Sample across a full brightening/darkening swing; the failure only shows at one end.
  120 |   for (let s = 0; s < 24; s++) {
  121 |     for (const [name, fg, alpha, box] of texts) {
  122 |       const r = await page.evaluate(
  123 |         ([f, a, b]) => (window as any).__inkContrast(f, a, b[0], b[1], b[2], b[3]),
  124 |         [fg, alpha, box] as any);
  125 |       if (!r) continue;
  126 |       if (!worst[name] || r.ratio < worst[name].ratio) worst[name] = r;
  127 |     }
  128 |     await page.waitForTimeout(500);
  129 |   }
  130 | 
```