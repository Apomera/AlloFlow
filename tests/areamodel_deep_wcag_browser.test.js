// Area Model deep rebuild (2026-11-03): real-browser WCAG audit (axe A/AA, 320 px
// reflow, text spacing) for the NEW tabs and states, in light, dark and contrast.
// Same fixture as tests/foundational_math_wcag_browser.test.js, which keeps
// covering the four original tabs.
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

const challenge = {
  multidigit: { id: 'b1', a: 23, b: 14, answer: 322, mode: 'multidigit', question: 'q' },
  fraction: { id: 'b2', mode: 'fraction', n1: 2, d1: 3, n2: 3, d2: 4, answer: { num: 6, den: 12 } },
  algebra: { id: 'b3', mode: 'algebra', f1: { x: 1, c: 3 }, f2: { x: 1, c: 2 }, answer: { A: 1, B: 5, C: 6 } },
  basic: { id: 'b4', a: 7, b: 8, answer: 56, mode: 'basic', question: 'q' },
};
const states = [
  ['algorithm', { viewMode: 'algorithm', algo: { a: 23, b: 14, res: { 0: 'ok' }, code: { 1: 'algo_no_placeholder' }, tries: { 1: 2 } } }],
  ['fraction explore', { viewMode: 'fraction' }],
  ['fraction challenge', { viewMode: 'fraction', challenge: challenge.fraction }],
  ['algebra explore', { viewMode: 'algebra' }],
  ['algebra challenge with box notes', { viewMode: 'algebra', challenge: challenge.algebra, chWork: { key: 'b3', attempts: 1, hints: 2, boxes: { gxx: { v: '2', st: 'alg_x_times_x' }, gcc: { v: '6', st: 'ok' } } }, feedback: { correct: false, code: 'alg_missing_middle' } }],
  ['partial products challenge with box notes', { viewMode: 'multidigit', challenge: challenge.multidigit, chWork: { key: 'b1', attempts: 2, boxes: { b0: { v: '200', st: 'ok' }, b1: { v: '24', st: 'box_added' } } }, feedback: { correct: false, code: 'missed_cross' } }],
  ['revealed grid challenge', { viewMode: 'basic', dims: { rows: 7, cols: 8 }, challenge: challenge.basic, chWork: { key: 'b4', attempts: 2, revealed: true }, feedback: { correct: false, revealed: true, msg: 'Revealed answers earn no points.' } }],
  ['predict first', { viewMode: 'distributive', predictFirst: true }],
  ['worked example level 2', { viewMode: 'multidigit', worked: { multidigit: { level: 2, seed: 5, results: { 3: 'box_added' }, inputs: { 3: '9' } } } }],
  ['pattern lab', { viewMode: 'basic', showAreaPatterns: true, _areaHunt: { rows: 4, cols: 4, log: [{ r: 4, c: 4, a: 16, p: 16 }] } }],
];
const CASES = [];
for (const [name, state] of states) {
  CASES.push({ name: name + ' light', state: { _areamodel: state } });
  CASES.push({ name: name + ' dark', state: { _areamodel: state }, overrides: { isDark: true } });
}
CASES.push({ name: 'algebra contrast', state: { _areamodel: states[3][1] }, overrides: { isContrast: true } });
CASES.push({ name: 'teacher panel light', state: { _areamodel: { missedLog: [{ m: 'basic', p: '7 × 8', c: 'added' }] } }, overrides: { isTeacherMode: true } });
CASES.push({ name: 'teacher panel dark', state: { _areamodel: { missedLog: [{ m: 'basic', p: '7 × 8', c: 'added' }] } }, overrides: { isTeacherMode: true, isDark: true } });

function renderCase(c) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool('stem_lab/stem_tool_areamodel.js', 'areamodel');
  return prepareStemBrowserRender(renderTool('areamodel', c.state, c.overrides ? { ...c.overrides, theme: themeFor(c) } : undefined));
}

describe('Area Model new tabs pass WCAG in a real browser', () => {
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
