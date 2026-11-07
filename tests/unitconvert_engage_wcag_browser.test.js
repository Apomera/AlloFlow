// Unit Converter engagement build (2026-11-04): axe WCAG A/AA, 320 px reflow
// and text spacing in a real browser for the NEW surfaces (one-line hero, Next
// strip, guess panel open and locked, unit stacker) in light, dark and contrast
// inside the host wrappers. Same machinery as unitconvert_deep_b_wcag_browser.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const FILE = process.env.UNITCONVERT_DEEP_SRC || 'stem_lab/stem_tool_unitconvert.js';
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
Function('window', fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8'))(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
)).cssSheets;
function themeFor(c) { const o = c.overrides || {}; return o.isContrast ? 'contrast' : o.isDark ? 'dark' : 'light'; }
function hostMarkup(c, html) {
  if (!c.overrides || (!c.overrides.isDark && !c.overrides.isContrast)) return html;
  const theme = themeFor(c);
  const content = theme === 'dark' ? '<div data-stem-tool-surface="unitConvert" style="background:#fff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div>' : html;
  return '<div data-stem-tool-shell="unitConvert" data-stem-basic-math="true" data-stem-theme="' + theme + '" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text);min-height:100vh">' + content + '</div>';
}

const sig = (value, from, to) => JSON.stringify(['length', value, from, to]);
const LOCKED = { tab: 'convert', guessFirst: true, category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm', guessCount: 1, guess: { sig: sig(1, 'm', 'cm'), k: 8, locked: true }, stack: { pair: 'cm|m', n: 37 } };
const FULL = Object.assign({}, LOCKED, { stack: { pair: 'cm|m', n: 100 } });
const STATES = [
  { name: 'first screen, guess open', state: {} },
  { name: 'guess locked, stacker part full', state: { unitConvert: LOCKED } },
  { name: 'stacker full, steps open', state: { unitConvert: Object.assign({}, FULL, { pathCollapsed: false }) } },
  // Hunt: the no-tick note, and a wide comparison at phone width.
  { name: 'unmoved lock, wide comparison', state: { unitConvert: { tab: 'convert', guessFirst: true, category: 'area', value: 1, fromUnit: 'mm²', toUnit: 'km²', guess: { sig: JSON.stringify(['area', 1, 'mm²', 'km²']), k: 38, locked: true, counted: false } } } },
  { name: 'prediction mode, stacker waits', state: { unitConvert: { tab: 'convert', guessFirst: false, predictBeforeConvert: true, category: 'length', value: 1, fromUnit: 'm', toUnit: 'cm', guessCount: 0 } } }
];
const THEMES = [
  { label: 'light', overrides: undefined },
  { label: 'dark', overrides: { isDark: true } },
  { label: 'contrast', overrides: { isContrast: true } }
];

describe('Unit Converter engagement build: WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const s of STATES) for (const th of THEMES) {
    const testCase = { overrides: th.overrides };
    it(s.name + ' (' + th.label + ') passes WCAG A/AA, 320px reflow and text spacing', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'unitConvert');
      const theme = themeFor(testCase);
      const themed = !!th.overrides;
      const rendered = prepareStemBrowserRender(renderTool('unitConvert', s.state, Object.assign({}, th.overrides || {}, themed ? { theme } : {})));
      window.__UnitConvertCore.setNumberLocale('en');
      expect(rendered.html.includes('uc-guess-title') || rendered.html.includes('data-guess-panel') || rendered.html.includes('data-stack-blocked')).toBe(true);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root" class="' + (themed ? 'theme-' + theme : '') + '">' + hostMarkup(testCase, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      if (themed) for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { for (const animation of document.getAnimations()) animation.cancel(); document.querySelectorAll('details').forEach((el) => { el.open = true; }); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 200), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      // Primary new controls keep 44 px targets at 320 px.
      const small = await page.evaluate(() => [...document.querySelectorAll('[data-guess-lock],[data-path-go],[data-stack-add],[data-stack-source],[data-stack-reset],#uc-guess-slider')]
        .filter((n) => { const r = n.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map((n) => n.outerHTML.slice(0, 80)));
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      expect.soft(small).toEqual([]);
      await page.close();
    }, 30000);
  }
});
