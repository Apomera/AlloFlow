import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Ecosystem Simulator: three regressions found by measuring the tool in a real browser.
//
//  1. The simulation kept painting while scrolled out of view — 15,430 paints per 2.5s
//     off-screen against 6,528 in view. The canvas mounts below the fold, so it ran
//     unwatched from first paint. rAF is throttled for a hidden TAB, never for an
//     element merely scrolled past.
//
//  2. Species accent colours (#92400e beaver, #854d0e moose, ...) were used as text on
//     a ground that follows the theme. On the dark canvas they measured 2.52:1 and
//     2.61:1. No single colour can satisfy both grounds — 4.5:1 on white needs relative
//     luminance <= 0.1833, on #0f172a it needs >= 0.2147 — so the accent now follows
//     the theme, with the per-species value inline and the choice made in CSS.
//
//  3. Nine Tailwind -600 text utilities sat between 3.15:1 and 4.41:1 on the tool's own
//     pale grounds. Each moved to -700, which the dark-theme remap already covers in
//     the same rule, so only the light theme changes.
//
// The contrast probe reads FILL for SVG text. Reading `color` there returns the
// inherited default (black) and invents failures for amber-on-dark labels that render
// correctly — an earlier version of this probe reported ten such phantoms.

const TABS = ['explore', 'sandbox', 'conserve', 'inquiry', 'quiz', 'badges'];

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js',
  toolId: 'ecosystem',
  width: 1280,
  height: 900,
  appStyles: true,
  probes: `
    window.__paints = 0;
    (function () {
      var proto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
      if (!proto) return;
      ['clearRect', 'fillRect'].forEach(function (name) {
        var real = proto[name];
        proto[name] = function () { window.__paints++; return real.apply(this, arguments); };
      });
    })();
    window.__makeScrollable = function (h) {
      var w = document.getElementById('wrap');
      w.style.height = h + 'px'; w.style.overflow = 'auto';
      return w.scrollHeight;
    };
    window.__scrollWrap = function (y) { var w = document.getElementById('wrap'); w.scrollTop = y; return w.scrollTop; };
    window.__canvasBox = function () {
      var c = document.querySelector('[data-eco-canvas]') || document.querySelector('#wrap canvas');
      var w = document.getElementById('wrap');
      if (!c || !w) return null;
      var r = c.getBoundingClientRect(), wr = w.getBoundingClientRect();
      return { top: Math.round(r.top - wr.top), off: r.bottom < wr.top || r.top > wr.bottom };
    };
    window.__setTheme = function (t) { document.body.className = t ? 'theme-' + t : ''; };
    window.__accents = function () {
      return [].slice.call(document.querySelectorAll('.eco-accent, .eco-accent-fixed')).map(function (el) {
        var cs = getComputedStyle(el);
        return { color: cs.color, light: cs.getPropertyValue('--eco-acc-light').trim(),
                 dark: cs.getPropertyValue('--eco-acc-dark').trim() };
      });
    };

    window.__parse = function (c) { var m = String(c).match(/[\\d.]+/g); return m ? { r: +m[0], g: +m[1], b: +m[2], a: m.length > 3 ? +m[3] : 1 } : null; };
    window.__over = function (f, b) { var a = f.a; return { r: f.r*a + b.r*(1-a), g: f.g*a + b.g*(1-a), b: f.b*a + b.b*(1-a), a: 1 }; };
    window.__lum = function (c) { var f = [c.r,c.g,c.b].map(function (v) { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }); return 0.2126*f[0]+0.7152*f[1]+0.0722*f[2]; };
    window.__bg = function (el) {
      var layers = [], node = el;
      while (node && node !== document.documentElement) {
        var cs = getComputedStyle(node);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'gradient';
        var c = window.__parse(cs.backgroundColor);
        if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break; }
        if (node.id === 'wrap') break;
        node = node.parentElement;
      }
      if (!layers.length) return null;
      var base = layers[layers.length-1];
      if (base.a < 0.999) return null;
      var out = base;
      for (var i = layers.length-2; i >= 0; i--) out = window.__over(layers[i], out);
      return out;
    };
    window.__contrast = function () {
      var fails = [], checked = 0;
      [].slice.call(document.querySelectorAll('#wrap *')).forEach(function (el) {
        var text = (el.textContent || '').trim();
        if (!text || el.children.length) return;
        if (!/[0-9A-Za-z]/.test(text)) return;
        var cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return;
        var r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        var bg = window.__bg(el);
        if (!bg || bg === 'gradient') return;
        // SVG text is painted with fill; cs.color there is the inherited default.
        var paint = cs.color;
        if (el.ownerSVGElement) {
          var node = el, found = null;
          while (node && node.ownerSVGElement !== undefined) {
            var f = getComputedStyle(node).fill;
            if (f && f !== 'none') { found = f; break; }
            node = node.parentElement;
          }
          if (found) paint = found;
        }
        var fg0 = window.__parse(paint); if (!fg0) return;
        checked++;
        var fg = fg0.a < 0.999 ? window.__over(fg0, bg) : fg0;
        var lf = window.__lum(fg), lb = window.__lum(bg);
        var ratio = (Math.max(lf,lb)+0.05)/(Math.min(lf,lb)+0.05);
        var px = parseFloat(cs.fontSize) || 12;
        var bold = (parseInt(cs.fontWeight,10)||400) >= 700;
        var need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
        if (ratio < need - 0.01) fails.push({ t: text.slice(0,30), r: +ratio.toFixed(2), need: need,
          fg: paint, bg: 'rgb('+[bg.r,bg.g,bg.b].map(Math.round).join(',')+')', cls: String(el.className).slice(0,48) });
      });
      return { checked: checked, fails: fails };
    };
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.describe.configure({ timeout: 300_000 });

test.describe('ecosystem text contrast', () => {
  for (const tab of TABS) {
    test(`${tab} tab meets WCAG 1.4.3`, async ({ page }) => {
      await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
      await page.waitForTimeout(1200);
      const con = await page.evaluate(() => (window as any).__contrast());
      // Guards against the probe silently matching nothing.
      expect(con.checked).toBeGreaterThan(20);
      expect(con.fails, `${tab}: ` + JSON.stringify(con.fails, null, 1)).toEqual([]);
    });
  }
});

test.describe('ecosystem species accent follows the theme', () => {
  test('every theme resolves a legible accent', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tab: 'conserve', tutorialDismissed: true } }, undefined, { expectCanvas: false });
    await page.waitForTimeout(800);

    const seen = await page.evaluate(() => (window as any).__accents());
    expect(seen.length, 'no .eco-accent elements — the class was renamed or dropped').toBeGreaterThan(3);
    // Both halves of the pair must be present, or the CSS has nothing to choose between.
    for (const a of seen) {
      expect(a.light, 'missing --eco-acc-light').toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(a.dark, 'missing --eco-acc-dark').toMatch(/^#[0-9a-fA-F]{6}$/);
    }

    const read = async (theme: string) => {
      await page.evaluate((t) => (window as any).__setTheme(t), theme);
      await page.waitForTimeout(120);
      return page.evaluate(() => (window as any).__accents());
    };

    // An unthemed host falls back to the dark canvas, so dark is the correct default.
    for (const theme of ['', 'dark']) {
      const rows = await read(theme);
      rows.forEach((a: any, i: number) => {
        expect(a.color, `theme "${theme || 'none'}" accent ${i} should use --eco-acc-dark`).toBe(hexToRgb(a.dark));
      });
    }
    const light = await read('default');
    light.forEach((a: any, i: number) => {
      expect(a.color, `theme-default accent ${i} should use the authored colour`).toBe(hexToRgb(a.light));
    });
    // High contrast overrides both with the palette's own text colour.
    const contrast = await read('contrast');
    contrast.forEach((a: any, i: number) => {
      expect(a.color, `theme-contrast accent ${i} should be the contrast text colour`).toBe('rgb(255, 255, 0)');
    });
  });
});

test.describe('ecosystem simulation pauses off-screen', () => {
  test('no paints while scrolled out of view', async ({ page }) => {
    await harness.mount(page, { ecosystem: { tutorialDismissed: true } }, undefined, { expectCanvas: false });
    await page.evaluate(() => (window as any).__makeScrollable(320));
    await page.waitForTimeout(1500);

    const sample = async () => {
      await page.evaluate(() => { (window as any).__paints = 0; });
      await page.waitForTimeout(2500);
      return page.evaluate(() => (window as any).__paints);
    };

    // Scroll the canvas into view first: it mounts below the fold, so a baseline taken
    // where it happens to sit would measure the paused state and pass vacuously.
    const box = await page.evaluate(() => (window as any).__canvasBox());
    expect(box, 'no ecosystem canvas found').not.toBeNull();
    await page.evaluate((y) => (window as any).__scrollWrap(y), Math.max(0, box!.top - 40));
    await page.waitForTimeout(1200);
    const inView = await sample();
    expect(inView, 'simulation is not painting even when visible').toBeGreaterThan(200);

    await page.evaluate(() => (window as any).__scrollWrap(9000));
    await page.waitForTimeout(1200);
    const parked = await page.evaluate(() => (window as any).__canvasBox());
    expect(parked!.off, 'the canvas did not actually leave the viewport').toBe(true);
    const offScreen = await sample();
    expect(offScreen, `still painting ${offScreen} times off-screen (in view: ${inView})`).toBeLessThan(inView * 0.05);
  });
});

function hexToRgb(hex: string) {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
}
