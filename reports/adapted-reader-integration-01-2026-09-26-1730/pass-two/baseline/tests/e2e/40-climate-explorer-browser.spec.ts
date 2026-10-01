import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * Climate Explorer - REAL browser pass.
 *
 * Everything else covering this tool runs in jsdom, which has no 2-D canvas
 * rasteriser, no layout, and no real focus model. So three whole classes of
 * defect have only ever been checked by eye:
 *
 *   1. The charts actually PAINT. jsdom's getContext('2d') returns null, so
 *      every donut/timeline assertion so far proves only "did not throw".
 *      This reads pixels back.
 *   2. Text is READABLE on the painted substrate. The tool branches its ink on
 *      `ctx.theme !== 'light' || ctx.isContrast`, and the panels paint
 *      var(--allo-stem-deeper) opaquely - the exact shape that produced 1.41:1
 *      text elsewhere in this codebase.
 *   3. Keyboard order is sane and the tabbable canvases announce their data.
 *
 * Pattern (local server over the WORKING TREE, so it exercises uncommitted
 * changes) comes from 17-memory-palace-gl and 18-space-station-gl.
 *
 * Run:  npx playwright test tests/e2e/40-climate-explorer-browser.spec.ts --workers=1
 */

const ROOT = process.cwd();
const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const HARNESS = `<!doctype html>
<html><head><meta charset="utf-8"><title>climate explorer harness</title>
<style>
  html,body{margin:0;background:#0f172a}
  :root{--allo-stem-deeper:#020617;--allo-stem-canvas:#0f172a;--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8}
  #wrap{width:960px;padding:8px}
</style></head>
<body><div id="wrap"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script>
  window.__events = { errors: [] };
  window.addEventListener('error', function (e) { window.__events.errors.push(String(e.message)); });
  window.addEventListener('unhandledrejection', function (e) { window.__events.errors.push('unhandled: ' + e.reason); });

  window.StemLab = {
    _registry: {},
    registerTool: function (id, cfg) { cfg.id = id; this._registry[id] = cfg; },
    isRegistered: function (id) { return !!this._registry[id]; },
    loadScriptResilient: function () { return Promise.resolve(); },
    audioContext: function () {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      var shared = window.StemLab._sharedAudioContext;
      if (shared && shared.state !== 'closed') return shared;
      shared = new Ctor();
      try { shared.close = function () { return Promise.resolve(); }; } catch (e) {}
      window.StemLab._sharedAudioContext = shared;
      return shared;
    },
    writeClipboard: function (text) { window.__clipboard = text; return Promise.resolve(); }
  };

  window.__announced = [];
  window.__mount = function (seed, opts) {
    opts = opts || {};
    var cfg = window.StemLab._registry.climateExplorer;
    var wrap = document.getElementById('wrap');
    var root = ReactDOM.createRoot(wrap);
    window.__root = root;
    function Harness() {
      var st = React.useState({ climateExplorer: seed });
      var toolData = st[0], setToolData = st[1];
      var noop = function () {};
      var Icons = new Proxy({}, { get: function () { return function () { return null; }; } });
      return cfg.render({
        React: React, toolData: toolData, setToolData: setToolData,
        setStemLabTool: noop, addToast: noop,
        announceToSR: function (m) { window.__announced.push(m); },
        awardXP: noop, callGemini: null, aiHintsEnabled: false,
        gradeLevel: opts.gradeLevel || '8th Grade',
        theme: opts.theme || 'dark', isContrast: !!opts.isContrast,
        icons: Icons, t: function (k, f) { return f != null ? f : k; }
      });
    }
    root.render(React.createElement(Harness));
    return true;
  };
  window.__destroy = function () { try { window.__root && window.__root.unmount(); } catch (e) {} };

  // Reproduce the host's per-theme wrapper (stem_lab_module.js ~1857):
  //   default  - tool paints its own surface, no wrapper
  //   dark     - host wraps the tool in a WHITE card (#fff, color-scheme:light)
  //   contrast - NO card on purpose: pure black ground
  // The theme class lives on <main>, not <html>.
  window.__applyTheme = function (theme) {
    var wrap = document.getElementById('wrap');
    var main = document.getElementById('__main');
    var card = document.getElementById('__card');
    if (!main) {
      main = document.createElement('main'); main.id = '__main';
      card = document.createElement('div'); card.id = '__card';
      wrap.parentNode.insertBefore(main, wrap);
      main.appendChild(card); card.appendChild(wrap);
    }
    main.className = 'theme-' + theme;
    // ★ The --allo-stem-* variables FOLLOW THE APP THEME. The tool's own ceInk
    // comment is explicit: --allo-stem-deeper is #020617 in dark and #e2e8f0 in
    // LIGHT. Pinning them to the dark values (as a naive harness does) puts the
    // light-theme ink on an artificially dark ground and manufactures failures
    // that cannot happen in the real app. Flip them with the theme.
    // Values transcribed from desktop/web-app/public/app_styles_module.js,
    // which is the ONLY place these are defined (:root/.theme-default,
    // .theme-dark, .theme-contrast). Contrast is yellow-on-black by design.
    var PALETTES = {
      'default':  { canvas: '#ffffff', deeper: '#e2e8f0', text: '#0f172a', soft: '#475569' },
      'dark':     { canvas: '#0f172a', deeper: '#020617', text: '#e2e8f0', soft: '#94a3b8' },
      'contrast': { canvas: '#000000', deeper: '#000000', text: '#ffff00', soft: '#ffff00' }
    };
    var vars = PALETTES[theme] || PALETTES['dark'];
    var docEl = document.documentElement;
    docEl.style.setProperty('--allo-stem-deeper', vars.deeper);
    docEl.style.setProperty('--allo-stem-canvas', vars.canvas);
    docEl.style.setProperty('--allo-stem-text', vars.text);
    docEl.style.setProperty('--allo-stem-text-soft', vars.soft);
    if (theme === 'dark') {
      card.style.cssText = 'background:#ffffff;color:#0f172a;color-scheme:light';
      document.body.style.background = '#0f172a';
    } else if (theme === 'contrast') {
      card.style.cssText = '';
      document.body.style.background = '#000000';
    } else {
      card.style.cssText = '';
      document.body.style.background = '#ffffff';
    }
    return true;
  };

  // Worst text-contrast ratio inside a subtree.
  // Two traps, both deliberate (see reference_theme_testing_in_gl_harness):
  //  - GRADIENT BLINDNESS: background-image is not background-color, so the
  //    climb would walk past it to whatever solid sits behind and report a
  //    fictional ~1:1. Return null and EXCLUDE those nodes instead.
  //  - VACUOUS PASS: report the checked count so the caller can require a real sample.
  window.__worstContrast = function (sel) {
    // getComputedStyle can hand back 'rgb(a, b, c)', 'rgba(a, b, c, d)', or
    // 'color(srgb ...)'. Pull the NUMBERS out rather than assuming a shape --
    // a naive /rgba?\(([^)]+)\)/ on a nested value yields NaN and a null ratio,
    // which silently drops the node from the sample.
    var parse = function (c) {
      if (!c) return null;
      var nums = String(c).match(/[0-9.]+/g);
      if (!nums || nums.length < 3) return null;
      var p = nums.map(parseFloat);
      if (!isFinite(p[0]) || !isFinite(p[1]) || !isFinite(p[2])) return null;
      return { rgb: [p[0], p[1], p[2]], a: nums.length > 3 && isFinite(p[3]) ? p[3] : 1 };
    };
    var lum = function (rgb) {
      var a = rgb.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };
    var bgOf = function (el) {
      var n = el;
      while (n && n !== document.documentElement) {
        var cs = getComputedStyle(n);
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
        var c = parse(cs.backgroundColor);
        if (c && c.a > 0.9) return c.rgb;
        n = n.parentElement;
      }
      return null;
    };
    var root = document.querySelector(sel);
    if (!root) return { missing: true };
    var worst = null, checked = 0, skippedGradient = 0, skippedGlyph = 0, failures = [];
    var nodes = Array.prototype.slice.call(root.querySelectorAll('div,span,p,b,strong,button,h2,h3,td,th,label'));
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var txt = (n.textContent || '').trim();
      if (!txt || n.children.length > 0) continue;
      // Emoji are COLOR glyphs: the font paints them, the CSS color property does not
      // reach them, so a computed-style ratio on an emoji-only node is a
      // measurement artifact, not a legibility fact. Skip and count them.
      if (!/[a-zA-Z0-9]/.test(txt)) { skippedGlyph++; continue; }
      var cs2 = getComputedStyle(n);
      if (cs2.visibility === 'hidden' || cs2.display === 'none') continue;
      var fg = parse(cs2.color); if (!fg) continue;
      var bg = bgOf(n); if (!bg) { skippedGradient++; continue; }
      var L1 = lum(fg.rgb), L2 = lum(bg);
      var ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      checked++;
      var rec = { ratio: Math.round(ratio * 100) / 100, text: txt.slice(0, 46), color: cs2.color, bg: 'rgb(' + bg.join(',') + ')' };
      if (ratio < 4.5) failures.push(rec);
      if (!worst || ratio < worst.ratio) worst = rec;
    }
    return { worst: worst, checked: checked, skippedGradient: skippedGradient, skippedGlyph: skippedGlyph, failures: failures };
  };

  // Does a canvas actually carry painted pixels (not merely exist)?
  window.__painted = function (sel) {
    var c = document.querySelector(sel);
    if (!c) return { found: false };
    var g = c.getContext('2d');
    if (!g) return { found: true, ctx: false };
    var w = c.width, h = c.height;
    if (!w || !h) return { found: true, ctx: true, w: w, h: h, nonBlank: 0, distinctColors: 0 };
    var data = g.getImageData(0, 0, w, h).data;
    var nonBlank = 0, distinct = {};
    for (var i = 0; i < data.length; i += 4 * 97) {
      if (data[i + 3] > 8) { nonBlank++; distinct[data[i] + ',' + data[i+1] + ',' + data[i+2]] = 1; }
    }
    return { found: true, ctx: true, w: w, h: h, nonBlank: nonBlank, distinctColors: Object.keys(distinct).length };
  };
</script></body></html>`;

let server: Server;
let base: string;

test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/__harness') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      res.end(HARNESS);
      return;
    }
    try {
      const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
      const file = join(ROOT, rel);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const addr = server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});

test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

type MountOpts = { theme?: string; isContrast?: boolean; gradeLevel?: string; reducedMotion?: boolean };

async function mount(
  page: import('@playwright/test').Page,
  seed: Record<string, unknown>,
  opts: MountOpts = {},
) {
  // Reduced motion by default: the hero canvas runs a rAF loop, and a moving
  // target makes every pixel readback a race.
  await page.emulateMedia({ reducedMotion: opts.reducedMotion === false ? 'no-preference' : 'reduce' });
  await page.goto(`${base}/__harness`);
  await page.addScriptTag({ url: '/stem_lab/stem_tool_climateExplorer.js' });
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.climateExplorer);
  await page.evaluate(([s, o]) => (window as any).__mount(s, o), [seed, opts] as [Record<string, unknown>, MountOpts]);
  await page.waitForSelector('.ce-explorer-root', { timeout: 30000 });
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => (window as any).__destroy && (window as any).__destroy()).catch(() => {});
});

test.describe('Climate Explorer in a real browser', () => {
  test('the carbon donut actually rasterises, in several colours', async ({ page }) => {
    await mount(page, { tab: 'carbon', ccTransport: 2, ccFood: 0, ccEnergy: 0, ccWaste: 0 });
    const shot = await page.evaluate(() => {
      const donut = Array.from(document.querySelectorAll('canvas'))
        .find((c) => (c.getAttribute('aria-label') || '').includes('footprint breakdown'));
      if (!donut) return { found: false } as any;
      donut.id = '__donut';
      return (window as any).__painted('#__donut');
    });
    expect(shot.found, 'donut canvas present').toBe(true);
    expect(shot.ctx, '2-D context available in a real browser').toBe(true);
    expect(shot.nonBlank, 'donut painted pixels').toBeGreaterThan(20);
    // Four categories paint several distinct hues, not one flat fill.
    expect(shot.distinctColors, 'distinct donut colours').toBeGreaterThan(3);
  });

  test('the emissions timeline repaints when the mix changes', async ({ page }) => {
    await mount(page, { tab: 'renewables', rsSolar: 10, rsWind: 5, rsHydro: 15, rsNuclear: 10, rsStorage: 0 });
    const sample = async () => page.evaluate(() => {
      const c = Array.from(document.querySelectorAll('canvas'))
        .find((x) => (x.getAttribute('aria-label') || '').includes('Projected global energy'));
      if (!c) return null;
      (c as HTMLCanvasElement).id = '__tl';
      return (window as any).__painted('#__tl').nonBlank as number;
    });
    const before = await sample();
    expect(before, 'timeline painted before').toBeGreaterThan(10);

    await page.evaluate(() => {
      const solar = Array.from(document.querySelectorAll('input[type=range]'))
        .find((i) => (i.getAttribute('aria-label') || '').startsWith('Solar')) as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(solar, '80');
      solar.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(200);
    const after = await sample();
    expect(after, 'timeline still painted after the drag').toBeGreaterThan(10);
    // A far cleaner mix cannot paint an identical bitmap.
    expect(after).not.toBe(before);
  });

  test('no uncaught errors on any tab', async ({ page }) => {
    const TABS = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions', 'pathways', 'forceHunt'];
    for (const tab of TABS) {
      await mount(page, { tab });
      const errors = await page.evaluate(() => (window as any).__events.errors as string[]);
      expect(errors, `uncaught errors on ${tab}`).toEqual([]);
      await page.evaluate(() => (window as any).__destroy());
    }
  });

  // The defect class this exists to catch, from the codebase's own history:
  // in DARK theme the host wraps the tool in a WHITE card while --allo-stem-*
  // keep resolving dark, so a tool that reads themed ink WITHOUT painting its
  // own opaque ground renders light-on-white (arccity: 52 nodes at 1.07-1.23:1).
  // Climate Explorer paints a gradient root, which is background-IMAGE and so
  // invisible to a computed-style walk -- exactly the case where a naive
  // measurement lies. Nodes over a gradient are excluded and counted, and a
  // minimum sample is required so an empty measurement cannot pass silently.
  for (const theme of ['default', 'dark', 'contrast'] as const) {
    test(`carbon tab text stays legible in ${theme} theme`, async ({ page }) => {
      await mount(page, { tab: 'carbon', ccTransport: 2 }, {
        theme: theme === 'default' ? 'light' : theme,
        isContrast: theme === 'contrast',
      });
      await page.evaluate((t) => (window as any).__applyTheme(t), theme);
      await page.waitForTimeout(120);

      const result = await page.evaluate(() => (window as any).__worstContrast('.ce-explorer-root'));
      expect(result.missing, 'tool root present').toBeFalsy();
      // Vacuous-pass guard: a panel that rendered nothing, or whose backgrounds
      // were all transparent, must not sail through.
      expect(result.checked, `measurable text nodes in ${theme}`).toBeGreaterThan(3);
      const worstMsg = result.failures.length
        ? result.failures.map((f: any) => `${f.ratio}:1 "${f.text}" ${f.color} on ${f.bg}`).join(' | ')
        : 'none';
      expect(result.failures, `below AA in ${theme}: ${worstMsg}`).toEqual([]);
    });
  }




  // WCAG 2.2 Target Size (Minimum, 2.5.8): a pointer target is at least 24x24
  // CSS px. Measured at 360px because targets are hardest to satisfy where the
  // layout is tightest -- the roomy desktop case is the easy one, and this is
  // not something markup pins can answer: it needs real layout.
  // What this caught: the shared slider() helper set height:6 on its range
  // input, so the single most-dragged control in the tool was a 6px target on
  // a phone; the other four ranges inherited the ~16px UA default.
  test('every pointer target meets the 24px minimum at phone width', async ({ page }) => {
    const TABS = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions', 'pathways', 'forceHunt'];
    await page.setViewportSize({ width: 360, height: 740 });
    for (const tab of TABS) {
      await mount(page, { tab, ccTransport: 2 });
      await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '360px'; });
      const undersized = await page.evaluate(() => {
        const root = document.querySelector('.ce-explorer-root') as HTMLElement;
        const bad: string[] = [];
        let measured = 0;
        for (const el of Array.from(root.querySelectorAll('button,a,input')) as HTMLElement[]) {
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0) continue;
          measured++;
          if (b.width < 24 || b.height < 24) {
            bad.push(el.tagName + ' ' + Math.round(b.width) + 'x' + Math.round(b.height) +
              ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28) + '"');
          }
        }
        return { bad, measured };
      });
      // Vacuous-pass guard: a tab that rendered no controls must not pass.
      expect(undersized.measured, `controls measured on ${tab}`).toBeGreaterThan(3);
      expect(undersized.bad, `undersized targets on ${tab}`).toEqual([]);
      await page.evaluate(() => (window as any).__destroy());
    }
  });


  // WCAG 2.3.3 Animation from Interactions. The hero canvas is the tool's
  // marquee feature (a warming signal drives the sky live), so it must animate
  // when motion is allowed AND stop completely when it is not.
  //
  // ★Measure the LOOP, not a pixel patch. Hashing a small corner of the
  // 1820x260 canvas samples mostly-static starfield and reports "no animation"
  // on a loop that is demonstrably running -- so this counts real
  // requestAnimationFrame scheduling and real fillRect calls as well as
  // full-canvas frame hashes, and asserts all three agree.
  for (const reduced of [true, false]) {
    test(`hero canvas ${reduced ? 'freezes under prefers-reduced-motion' : 'animates when motion is allowed'}`, async ({ page }) => {
      await mount(page, { tab: 'carbon' }, { reducedMotion: reduced ? undefined : false });
      const m = await page.evaluate(async () => {
        const c = document.querySelector('canvas') as HTMLCanvasElement;
        if (!c) return null;
        const g = c.getContext('2d')!;
        let rafCount = 0;
        const origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (cb: any) { rafCount++; return origRAF.call(window, cb); };
        let fills = 0;
        const origFill = g.fillRect.bind(g);
        (g as any).fillRect = function (...a: any[]) { fills++; return origFill(...a); };
        const snap = () => {
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let h = 0;
          for (let i = 0; i < d.length; i += 997) h = (h * 31 + d[i]) | 0;
          return h;
        };
        const seen = new Set<number>();
        for (let i = 0; i < 14; i++) {
          seen.add(snap());
          await new Promise((r) => setTimeout(r, 45));
        }
        window.requestAnimationFrame = origRAF;
        return {
          mq: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          distinctFrames: seen.size, rafCount, fills,
        };
      });
      expect(m, 'hero canvas present').not.toBeNull();
      expect(m!.mq, 'reduced-motion media query state').toBe(reduced);
      if (reduced) {
        expect(m!.rafCount, 'rAF scheduling while reduced').toBe(0);
        expect(m!.fills, 'canvas paints while reduced').toBe(0);
        expect(m!.distinctFrames, 'distinct frames while reduced').toBe(1);
      } else {
        expect(m!.rafCount, 'rAF scheduling while animating').toBeGreaterThan(5);
        expect(m!.fills, 'canvas paints while animating').toBeGreaterThan(50);
        expect(m!.distinctFrames, 'distinct frames while animating').toBeGreaterThan(3);
      }
    });
  }

  // Keyboard-only operation: tabbing in from the page must reach the tool's
  // controls, and every stop must carry a visible focus indicator (WCAG 2.4.7).
  // ★Read the LIVE computed outline after a real Tab press --
  // getComputedStyle(el, ':focus-visible') does not resolve in Chromium and
  // reports every element as unstyled.
  test('keyboard focus reaches the controls and stays visible', async ({ page }) => {
    await mount(page, { tab: 'carbon' });
    await page.keyboard.press('Tab');
    const stops: { label: string; outline: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const info = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        if (!a || a === document.body) return null;
        const cs = getComputedStyle(a);
        return {
          label: (a.textContent || a.getAttribute('aria-label') || a.tagName).trim().slice(0, 30),
          outline: cs.outlineStyle + ' ' + cs.outlineWidth,
        };
      });
      if (!info) break;
      stops.push(info);
      await page.keyboard.press('Tab');
    }
    // Vacuous-pass guard: a render that focused nothing must not pass.
    expect(stops.length, 'focusable stops reached by Tab').toBeGreaterThan(5);
    const unfocusable = stops.filter((s) => s.outline.startsWith('none') || s.outline.endsWith('0px'));
    expect(unfocusable, `stops without a visible focus ring: ${unfocusable.map((s) => s.label).join(', ')}`).toEqual([]);
  });
});
