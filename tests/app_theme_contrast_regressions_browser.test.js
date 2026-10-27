// In-app theme contrast regressions found by a real-app sweep (2026-10-25), checked in Chromium
// with the app's own runtime CSS: AppStyles, the UI font library sheet and the Assessment
// Center's injected sa-a11y-css.
//
//  1. Contrast theme: a generated `.allo-docsuite [class~="hover:bg-*"]:hover` rule painted hovered
//     buttons black while `button:hover *` painted their labels black (black on black).
//  2. sa-a11y-css scoped its light-only tweak with `.fixed.inset-0:not(.theme-dark)`, but the theme
//     class sits on an ANCESTOR, so every modal's text-slate-600 became #64748b on dark panels.
//  3. `.prose strong` was a fixed #0f172a: invisible in the Contrast theme and dark reading themes.
//  4. Dark reading themes left <summary> labels in their own dark color, and a translucent
//     bg-indigo-50/50 box turned mid grey under light text.
//  5. `.prose a` was #3b82f6 (3.68:1 on white); the Contrast theme had no link color at all.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles } from './helpers/stem_widgets_smoke_harness.js';
import { loadAlloModule } from './setup.js';

const root = process.cwd();
let browser, page;

// ALLO_*_CANDIDATE env vars point at mutated copies (mutation checks) without touching the modules.
const css = () => {
  if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', fs.readFileSync(process.env.ALLO_APP_STYLES_CANDIDATE || path.join(root, 'app_styles_module.js'), 'utf8'))(window);
  const app = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null))).cssSheets.join('\n');
  loadAlloModule(process.env.ALLO_UI_FONT_CANDIDATE || 'ui_font_library_module.js');
  try { loadAlloModule(process.env.ALLO_ASSESSMENT_CANDIDATE || 'student_analytics_module.js'); } catch (_) { /* the stylesheet is injected first */ }
  const sheet = id => (document.getElementById(id) || {}).textContent || '';
  const fonts = sheet('alloflow-ui-font-library-css'), assessment = sheet('sa-a11y-css');
  expect(fonts.length, 'UI font library sheet injected').toBeGreaterThan(100);
  expect(assessment.length, 'Assessment Center sheet injected').toBeGreaterThan(100);
  return app + '\n' + fonts + '\n' + assessment;
};

const FIXTURE = `
  <div class="theme-contrast" id="contrast"><div class="allo-docsuite">
    <button id="hover-btn" class="hover:bg-indigo-100 px-3 py-2">Class &amp; Materials</button>
    <div class="prose" style="background:#000000;color:#ffff00"><p>Read the <strong id="c-strong">key idea</strong> and <a id="c-link" href="#x">the source</a>.</p></div>
  </div></div>
  <div class="theme-dark"><div class="allo-docsuite">
    <div class="fixed inset-0" style="position:static;background:#1e293b"><p id="modal-text" class="text-slate-600">Recommendations for this class</p></div>
  </div></div>
  <div class="theme-light"><div class="prose" style="background:#ffffff"><p><a id="l-link" href="#y">Communicating High Expectations</a></p></div></div>
  <div class="theme-light">
    <div data-reading-theme="dark" style="background:#1a1a2e;color:#e2e8f0">
      <div class="prose"><p>Due: <strong id="rd-strong">Friday</strong></p></div>
      <details><summary id="rd-summary" style="color:#4338ca">Go to any station</summary></details>
      <div id="rd-box" class="bg-indigo-50/50" style="background-color:rgba(238,242,255,0.5)"><p id="rd-box-text">Reflections</p></div>
    </div>
    <div data-reading-theme="highContrast" style="background:#000000;color:#ffff00">
      <details><summary id="hc-summary" style="color:#4338ca">Word help</summary></details>
      <div class="bg-indigo-50/50" style="background-color:rgba(238,242,255,0.5)"><p id="hc-box-text">Type a response to enable submit</p></div>
    </div>
  </div>`;

beforeAll(async () => {
  const styles = css();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>' + styles.replace(/<\/style/gi, '<\\/style')
    + '</style><style>*,*::before,*::after{transition:none!important;animation:none!important}</style></head><body>' + FIXTURE + '</body></html>');
}, 90_000);
afterAll(async () => { await browser?.close(); }, 30_000);

// Text color against the painted surface (translucent layers composited).
const measure = id => page.evaluate(id => {
  const parse = s => { const p = String(s).match(/[\d.]+/g).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, u) => ({ r: t.r * t.a + u.r * (1 - t.a), g: t.g * t.a + u.g * (1 - t.a), b: t.b * t.a + u.b * (1 - t.a), a: 1 });
  const lum = c => [c.r, c.g, c.b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const el = document.getElementById(id);
  const layers = [];
  for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a > 0) { layers.push(c); if (c.a >= 1) break; } }
  const bg = layers.reverse().reduce((u, t) => over(t, u), { r: 255, g: 255, b: 255, a: 1 });
  const fg = over(parse(getComputedStyle(el).color), bg), x = lum(fg), y = lum(bg);
  return { color: getComputedStyle(el).color, ratio: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) };
}, id);

describe('in-app theme contrast regressions', () => {
  it('a hovered button keeps a readable label in the Contrast theme', async () => {
    await page.hover('#hover-btn');
    const label = await measure('hover-btn');
    expect(label.ratio, 'hovered label vs hovered background').toBeGreaterThanOrEqual(7);
    await page.mouse.move(0, 0);
  });

  it('modal slate-600 text keeps the Dark theme remap (no light-only rule leaking in)', async () => {
    const text = await measure('modal-text');
    expect(text.color).not.toBe('rgb(100, 116, 139)');
    expect(text.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('bold text in formatted content follows the theme', async () => {
    expect((await measure('c-strong')).ratio, 'Contrast theme').toBeGreaterThanOrEqual(7);
    expect((await measure('rd-strong')).ratio, 'dark reading theme').toBeGreaterThanOrEqual(4.5);
  });

  it('dark reading themes recolor summary labels and translucent tints', async () => {
    expect((await measure('rd-summary')).ratio, 'dark summary').toBeGreaterThanOrEqual(4.5);
    expect((await measure('rd-box-text')).ratio, 'dark tinted box').toBeGreaterThanOrEqual(4.5);
    expect((await measure('hc-summary')).ratio, 'high-contrast summary').toBeGreaterThanOrEqual(7);
    expect((await measure('hc-box-text')).ratio, 'high-contrast tinted box').toBeGreaterThanOrEqual(7);
  });

  it('links in formatted content read in Light and in the Contrast theme', async () => {
    expect((await measure('l-link')).ratio, 'light link').toBeGreaterThanOrEqual(4.5);
    expect((await measure('c-link')).ratio, 'contrast link').toBeGreaterThanOrEqual(7);
  });
});
