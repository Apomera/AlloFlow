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
    window.__ratio = function (a, b) { var x=window.__lum(a), y=window.__lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };

    // WCAG 1.4.11: a control's visual boundary needs 3:1 against what is behind it.
    window.__borders = function () {
      var fails=[], checked=0;
      [].slice.call(document.querySelectorAll('#wrap button, #wrap [role="button"], #wrap input, #wrap select')).forEach(function (el) {
        var cs=getComputedStyle(el);
        var r=el.getBoundingClientRect();
        if (r.width<3 || r.height<3) return;
        var w=parseFloat(cs.borderTopWidth)||0;
        if (w<=0) return;
        var bc=window.__parse(cs.borderTopColor); if(!bc) return;
        if (bc.a<=0.01) return;                     // a transparent border is not a boundary
        var outer=window.__bg(el.parentElement); if(!outer || outer==='gradient') return;
        // If the control's own fill already stands out, the border is decoration, and
        // 1.4.11 only asks for the information REQUIRED to identify the control.
        var self=window.__parse(cs.backgroundColor);
        if (self && self.a>0.01) {
          var solid=self.a<0.999?window.__over(self,outer):self;
          if (window.__ratio(solid,outer)>=3) return;
        }
        checked++;
        var eff=bc.a<0.999?window.__over(bc,outer):bc;
        var ratio=window.__ratio(eff,outer);
        if (ratio<2.99) fails.push({ t:(el.textContent||'').trim().slice(0,22), r:+ratio.toFixed(2),
          border:cs.borderTopColor, behind:'rgb('+[outer.r,outer.g,outer.b].map(Math.round).join(',')+')',
          cls:String(el.className).slice(0,60) });
      });
      return { checked: checked, fails: fails };
    };

    // WCAG 2.4.7: focusing a control must change something visible about it.
    window.__focusProbe = function () {
      var bad=[], checked=0;
      [].slice.call(document.querySelectorAll('#wrap button, #wrap [href], #wrap input, #wrap select, #wrap [tabindex]:not([tabindex="-1"])')).forEach(function (el) {
        var r=el.getBoundingClientRect();
        if (r.width<3||r.height<3) return;
        var b=getComputedStyle(el);
        var sig0=[b.outlineStyle,b.outlineWidth,b.outlineColor,b.boxShadow,b.backgroundColor,b.borderColor].join('|');
        try { el.focus(); } catch(e) { return; }
        if (document.activeElement!==el) return;
        checked++;
        var a=getComputedStyle(el);
        var sig1=[a.outlineStyle,a.outlineWidth,a.outlineColor,a.boxShadow,a.backgroundColor,a.borderColor].join('|');
        if (sig0===sig1) bad.push({ tag:el.tagName, t:(el.textContent||'').trim().slice(0,28), cls:String(el.className).slice(0,48) });
      });
      return { checked: checked, bad: bad };
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

test.describe('ecosystem control boundaries', () => {
  // Measured before the fix: the quiz answer options were bounded by border-slate-200 at
  // 1.23:1 over white with no fill at all, the inquiry actions by slate-300 at 1.48:1,
  // and the species buttons by their accent at 53% alpha (1.51-2.72:1). The dark theme
  // was no better — the remap forces border-slate-200 to #334155, 1.72:1 on slate-900 —
  // so the replacements use shades the remap leaves alone and that clear 3:1 on both.
  for (const tab of TABS) {
    test(`${tab} controls meet WCAG 1.4.11`, async ({ page }) => {
      await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
      await page.evaluate(() => (window as any).__setTheme('dark'));
      await page.waitForTimeout(1000);
      const b = await page.evaluate(() => (window as any).__borders());
      expect(b.fails, `${tab}: ` + JSON.stringify(b.fails, null, 1)).toEqual([]);
    });
  }

  test('every focusable control shows a focus indicator', async ({ page }) => {
    let totalChecked = 0;
    for (const tab of TABS) {
      await harness.mount(page, { ecosystem: { tab, tutorialDismissed: true } }, undefined, { expectCanvas: false });
      await page.waitForTimeout(700);
      const f = await page.evaluate(() => (window as any).__focusProbe());
      totalChecked += f.checked;
      expect(f.bad, `${tab}: ` + JSON.stringify(f.bad, null, 1)).toEqual([]);
    }
    // Guards against the selector silently matching nothing across every tab.
    expect(totalChecked).toBeGreaterThan(150);
  });
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
