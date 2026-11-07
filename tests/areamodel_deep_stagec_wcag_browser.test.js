// Area Model stage C (2026-11-03): real-browser WCAG audit (axe A/AA, 320 px reflow,
// text spacing) for the learning path, negative-tile factoring, remainder stories,
// the to-scale division and the algorithm hint ladder. Same fixture and checks as
// tests/areamodel_deep_stageb_wcag_browser.test.js.
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
  ['grade 3 path with ticks', { basicSolved: 3, distSolved: 1 }, { gradeLevel: '3rd Grade' }],
  ['grade 6 path and core tabs', { factorSolved: 1 }, { gradeLevel: '7th Grade' }],
  ['negative-tile factoring with a sign mistake and hints', { viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 1, B: -1, C: -6 }, p: -2, q: 3, tries: 2, code: 'fac_s_signs_swapped', v: { B: '−1', C: '−6', pos: 3, neg: 2, net: '1', u: '−6' }, hints: 3 } }],
  ['negative-tile factoring solved, two x² tiles', { viewMode: 'algebra', algMode: 'factor', fac: { signed: true, F: { A: 2, B: 1, C: -6 }, p: -3, q: 2, done: 'solved' } }],
  ['remainder story with a context mistake', { viewMode: 'word', challenge: { id: 'r1', mode: 'word', wkind: 'remainder', rk: 'up', wctx: 0, n: 50, a: 6, answer: 9 }, chWork: { key: 'r1', attempts: 2, hints: 2 }, feedback: { correct: false, code: 'r_dropped', v: { r: 2 } } }],
  ['remainder story solved', { viewMode: 'word', challenge: { id: 'r2', mode: 'word', wkind: 'remainder', rk: 'rem', wctx: 1, n: 50, a: 6, answer: 2 }, chWork: { key: 'r2', attempts: 0 }, feedback: { correct: true, msg: 'Correct!' } }],
  ['division drawn to scale', { viewMode: 'division', divScale: true, div: { n: 375, d: 6, steps: [{ c: 50 }, { c: 10 }, { c: 2 }], phase: 'done' } }],
  ['division too thin to scale', { viewMode: 'division', div: { n: 9876, d: 7, steps: [{ c: 1000 }, { c: 400 }, { c: 10 }], phase: 'done' } }],
  ['algorithm with a hint ladder and a named mistake', { viewMode: 'algorithm', algo: { a: 987, b: 65, hints: { 0: 3 }, tries: { 0: 2 }, code: { 0: 'algo_no_carry' }, inp: { 0: '4925' } } }],
];
const CASES = [];
for (const [name, state, extra] of states) {
  CASES.push({ name: name + ' light', state: { _areamodel: state }, extra });
  CASES.push({ name: name + ' dark', state: { _areamodel: state }, overrides: { isDark: true }, extra });
}
CASES.push({ name: 'path contrast', state: { _areamodel: states[0][1] }, overrides: { isContrast: true }, extra: states[0][2] });
CASES.push({ name: 'negative tiles contrast', state: { _areamodel: states[2][1] }, overrides: { isContrast: true } });
CASES.push({ name: 'scaled division contrast', state: { _areamodel: states[6][1] }, overrides: { isContrast: true } });function renderCase(c) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool('stem_lab/stem_tool_areamodel.js', 'areamodel');
  const ov = Object.assign({}, c.extra || {}, c.overrides ? { ...c.overrides, theme: themeFor(c) } : {});
  return prepareStemBrowserRender(renderTool('areamodel', c.state, Object.keys(ov).length ? ov : undefined));
}

describe('Area Model stage-C states pass WCAG in a real browser', () => {
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
