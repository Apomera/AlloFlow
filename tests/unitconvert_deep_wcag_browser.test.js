// Unit Converter deep pass (2026-11-03): axe WCAG A/AA, 320 px reflow and text
// spacing in a real browser for the NEW surfaces (practice items, named-mistake
// feedback, factor chain, estimation, teacher panel, unit-size model).
// Same machinery as foundational_math_wcag_browser.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const FILE = 'stem_lab/stem_tool_unitconvert.js';
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

resetStemLab();
loadTool(FILE, 'unitConvert');
const C = window.__UnitConvertCore;
function item(band, kind, extra) {
  for (let s = 1; s < 5000; s++) { const x = C.makePracticeItem(band, s, kind); if (x.traps.length) return Object.assign(x, { seed: s }, extra || {}); }
  throw new Error('no item');
}
const area = item('b8', 'area');
const CASES = [
  { name: 'convert with unit-size model', state: { unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'ft', toUnit: 'in' } } },
  { name: 'practice: prediction pending, full worked example', state: { unitConvert: { tab: 'quiz', quiz: item('b45', 'mixedToSmall') } } },
  { name: 'practice: named mistake, hints, partial example', state: { unitConvert: { tab: 'quiz', fadeByKind: { unitRate: 1 }, quiz: item('b67', 'unitRate', { predict: 'smaller', tries: 1, lastMis: 'rateInverted', hintLevel: 3 }) } } },
  { name: 'practice: revealed with worked solution', state: { unitConvert: { tab: 'quiz', fadeByKind: { area: 2 }, quiz: Object.assign({}, area, { predict: 'smaller', tries: 2, answered: true, correct: false, revealed: true, lastMis: 'linearForArea' }) } } },
  { name: 'practice dark', state: { unitConvert: { tab: 'quiz', quiz: item('b8', 'density', { predict: 'bigger' }) } }, overrides: { isDark: true } },
  { name: 'practice contrast', state: { unitConvert: { tab: 'quiz', quiz: item('b8', 'chainRate', { predict: 'bigger', tries: 1, lastMis: 'chainOneStep' }) } }, overrides: { isContrast: true } },
  { name: 'factor chain empty', state: { unitConvert: { tab: 'chain' } } },
  { name: 'factor chain solved', state: { unitConvert: { tab: 'chain', chain: { from: 'km/h', to: 'm/s', valueDraft: '36', steps: [{ topN: '1000', topU: 'm', botN: '1', botU: 'km', pow: 1 }, { topN: '1', topU: 'hr', botN: '3600', botU: 'sec', pow: 1 }], result: C.checkFactorChain('km/h', 'm/s', [{ topN: '1000', topU: 'm', botN: '1', botU: 'km' }, { topN: '1', topU: 'hr', botN: '3600', botU: 'sec' }]) } } } },
  { name: 'factor chain error', state: { unitConvert: { tab: 'chain', chain: { from: 'm²', to: 'cm²', valueDraft: '2', steps: [{ topN: '100', topU: 'cm', botN: '1', botU: 'm', pow: 1 }], result: { ok: false, code: 'needPower', remaining: 'm·cm' } } } } },
  { name: 'estimate answered', state: { unitConvert: { tab: 'estimate', estimate: { item: C.makeEstimateItem('b67', 7), choice: -1, right: false } } } },
  { name: 'teacher panel', state: { unitConvert: { tab: 'quiz', misTally: { inverse: 2, tempOrder: 1 }, missed: [{ id: 'x', kind: 'temperature', q: '212 °F = ? °C', a: 100, unit: '°C', answer: 180, mis: 'tempNoScale', outcome: 'fixed', ts: 1 }] } }, overrides: { isTeacherMode: true } },
  { name: 'word problem offline', state: { unitConvert: { tab: 'wordproblem', category: 'volume', fromUnit: 'gal', toUnit: 'L', wordProblem: C.makeOfflineWordProblem('volume', 'gal', 'L', 3), wordProblemHintLevel: 1 } } },
];

describe('Unit Converter deep pass: WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow and text spacing', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'unitConvert');
      const theme = themeFor(testCase);
      const rendered = prepareStemBrowserRender(renderTool('unitConvert', testCase.state, Object.assign({}, testCase.overrides || {}, testCase.overrides && (testCase.overrides.isDark || testCase.overrides.isContrast) ? { theme } : {})));
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const themed = testCase.overrides && (testCase.overrides.isDark || testCase.overrides.isContrast);
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root" class="' + (themed ? 'theme-' + (theme === 'light' ? 'default' : theme) : '') + '">' + hostMarkup(testCase, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      if (themed) for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { for (const animation of document.getAnimations()) animation.cancel(); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 200), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
