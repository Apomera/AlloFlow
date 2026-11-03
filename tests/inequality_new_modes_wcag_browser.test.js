// Inequality Explorer: the activities added in the 2026-11-03 depth pass (Build, Read a
// graph, System, Flip Lab, solver practice) pass axe WCAG A/AA, 320 px reflow and text
// spacing in a real browser, as advanced_math_wcag_browser.test.js does for the others.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const FILE = 'stem_lab/stem_tool_inequality.js';
const src = fs.readFileSync(FILE, 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const solve = (() => {
  const a = src.indexOf('var solveInequality = function(raw) {'), b = src.indexOf('var zoomRange', a);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(a, b) + '\nreturn solveInequality;')();
})();
const practiceSteps = solve('4 - 2x > 10');

const CASES = [
  { name: 'build with feedback', state: { oneDMode: 'build', build: { target: 'x <= -2', pt: '1', closed: false, dir: 'right', checked: true } } },
  { name: 'read a graph answered', state: { oneDMode: 'read', readG: { target: '-2 < x <= 3', opts: ['-2 < x < 3', '-2 <= x <= 3', '-2 < x <= 3', '-2 <= x < 3'], answered: true, chosen: '-2 <= x <= 3', correct: false, fb: 'Check each endpoint on its own.', typed: '' } } },
  { name: 'system with tested points', state: { graphMode: '2d', twoDMode: 'system', sys: { cons: ['2x + y <= 8', 'x >= 0', 'y > 1'], obj: 'P = 3x + 2y', pts: [{ x: '1', y: '2' }, { x: '4', y: '1' }] } } },
  { name: 'flip lab checked', state: { _ineqHunt: { pred: 'flips', checked: true, stuckRevealed: true, understood: true, log: [{ mode: 'numbers', op: 'mul', k: -2, pred: 'flips', actual: 'flips' }] } } },
  { name: 'flip lab k = 0', state: { _ineqHunt: { op: 'mul', k: 0, mode: 'set' } } },
  { name: 'solver practice', state: { solverExpr: '4 - 2x > 10', solverPractice: true, solverSteps: practiceSteps, solverSolution: practiceSteps.solution, solverRevealIdx: 3, solverPick: { idx: 3, tried: [], ok: true, flip: 'no' } } },
  { name: 'off-screen boundary and union', state: { expr: 'x < -20 or x > 4' } },
  { name: 'plane through the origin', state: { graphMode: '2d', expr: 'y <= x' } },
  { name: 'system in dark mode', state: { graphMode: '2d', twoDMode: 'system' }, overrides: { isDark: true } },
  // Contrast mode is left out: its colours come from the host theme CSS, which this page does not load.
];

function compactViolations(violations) {
  return violations.map((v) => ({ id: v.id, impact: v.impact, targets: v.nodes.map((n) => ({ target: n.target, html: n.html, contrast: n.any?.[0]?.data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
}

describe('Inequality Explorer new activities in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(`${testCase.name} passes WCAG A/AA, 320px reflow, and text-spacing checks`, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'inequality');
      const rendered = prepareStemBrowserRender(renderTool('inequality', { inequality: testCase.state }, testCase.overrides));
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
        '</style></head><body><main id="tool-root"' + (testCase.surface ? ' style="background:' + testCase.surface + '"' : '') + '>' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const reflow = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
        const offenders = sw > cw ? [...document.querySelectorAll('#tool-root *')].map((el) => { const b = el.getBoundingClientRect(); return { html: el.outerHTML.slice(0, 200), right: Math.round(b.right), width: Math.round(b.width) }; })
          .filter((x) => x.right > cw + 1 || x.width > cw + 1).slice(0, 6) : [];
        return { sw, cw, offenders };
      });
      const spacing = await auditTextSpacingReflow(page);
      const compact = compactViolations(audit.violations);
      expect.soft(compact, JSON.stringify(compact, null, 2)).toEqual([]);
      expect.soft(reflow.sw, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.cw);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 20000);
  }
});
