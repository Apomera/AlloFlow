// Area Model stage B (2026-11-03): real-browser WCAG audit (axe A/AA, 320 px reflow,
// text spacing) for the Division, Hundred Grid, factoring and story states, built
// from tests/areamodel_deep_wcag_browser.test.js (same fixture and checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
Function('window', fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8'))(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
)).cssSheets;
const themeFor = (c) => (c.overrides && c.overrides.isContrast ? 'contrast' : c.overrides && c.overrides.isDark ? 'dark' : 'light');
function hostMarkup(c, html) {
  if (!c.overrides) return html;
  return '<div data-stem-tool-shell="areamodel" data-stem-basic-math="true" data-stem-theme="' + themeFor(c) + '" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text);min-height:100vh">' + html + '</div>';
}

const states = [
  ['division explore', { viewMode: 'division', div: { n: 372, d: 6 } }],
  ['division mid-way with a named mistake and hints', { viewMode: 'division', div: { n: 4872, d: 24, steps: [{ c: 100 }, { c: 50 }, { c: 2 }, { c: 1 }, { c: 1 }, { c: 1 }, { c: 1 }, { c: 1 }], tries: 2, code: 'div_subtract_wrong', v: { c: '10', d: 24, left: 1104 }, hints: 3, draft: { c: '10', area: '240', left: '900' } } }],
  ['division final with a remainder mistake', { viewMode: 'division', div: { n: 375, d: 6, steps: [{ c: 60 }, { c: 2 }], phase: 'final', fin: { q: '62', r: '9' }, finCode: 'div_remainder_too_big', finTries: 2 } }],
  ['division done with long division', { viewMode: 'division', div: { n: 9875, d: 7, steps: [{ c: 1000 }, { c: 400 }, { c: 10 }, { c: 1 }], phase: 'done', ld: { res: { 0: 'ok', 1: 'ok' }, tries: { 2: 2 }, code: { 2: 'ld_left_too_big' }, v: { d: 7 } } } }],
  ['hundred grid decimals', { viewMode: 'grid100', g100: { a: 3, b: 4 } }],
  ['hundred grid percent challenge', { viewMode: 'grid100', challenge: { id: 'g1', mode: 'grid100', kind: 'pct', a: 0.6, b: 0.5, p1: 60, p2: 50, answer: 30 }, chWork: { key: 'g1', attempts: 1 }, feedback: { correct: false, code: 'g_union' } }],
  ['factoring with a named mistake', { viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 2, B: 8, C: 6 }, p: 1, q: 5, tries: 2, code: 'fac_both', v: { C: 6 }, hints: 2 } }],
  ['factoring solved', { viewMode: 'algebra', algMode: 'factor', fac: { F: { A: 1, B: 5, C: 6 }, p: 2, q: 3, done: 'solved' } }],
  ['missing-side story', { viewMode: 'word', challenge: { id: 'w1', mode: 'word', wkind: 'missing', wctx: 0, a: 6, n: 372, answer: 62 } }],
  ['percent story', { viewMode: 'word', challenge: { id: 'w2', mode: 'word', wkind: 'percent', wctx: 1, p1: 30, p2: 40, a: 0.3, b: 0.4, answer: 12 } }],
  ['decimal story solved', { viewMode: 'word', challenge: { id: 'w3', mode: 'word', wkind: 'decimal', wctx: 0, a: 2.4, b: 1.5, answer: 3.6 }, feedback: { correct: true, msg: 'Correct!' } }],
];
const CASES = [];
for (const [name, state] of states) {
  CASES.push({ name: name + ' light', state: { _areamodel: state } });
  CASES.push({ name: name + ' dark', state: { _areamodel: state }, overrides: { isDark: true } });
}
CASES.push({ name: 'division contrast', state: { _areamodel: states[3][1] }, overrides: { isContrast: true } });
CASES.push({ name: 'hundred grid contrast', state: { _areamodel: states[5][1] }, overrides: { isContrast: true } });
CASES.push({ name: 'factoring contrast', state: { _areamodel: states[6][1] }, overrides: { isContrast: true } });
function renderCase(c) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool('stem_lab/stem_tool_areamodel.js', 'areamodel');
  return prepareStemBrowserRender(renderTool('areamodel', c.state, c.overrides ? { ...c.overrides, theme: themeFor(c) } : undefined));
}

describe('Area Model stage-B tabs pass WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const c of CASES) {
    it(`${c.name}: axe A/AA, 320 px reflow, text spacing`, async () => {
      const rendered = renderCase(c);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
        '</style></head><body><main id="tool-root" class="' + (c.overrides ? 'theme-' + (themeFor(c) === 'light' ? 'default' : themeFor(c)) : '') + '">' + hostMarkup(c, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      if (c.overrides) for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio })) }));
      const reflow = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('#tool-root *')].map((el) => { const b = el.getBoundingClientRect(); return { html: el.outerHTML.slice(0, 160), right: Math.round(b.right) }; }).filter((x) => x.right > cw + 1).slice(0, 5);
        return { sw: document.documentElement.scrollWidth, cw, offenders };
      });
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(reflow.sw, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.cw);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 25000);
  }
});
