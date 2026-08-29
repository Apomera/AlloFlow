import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const algebraCases = ['solve', 'practice', 'builder', 'scale', 'tutor'].map((tab) => ({
  name: `algebra ${tab}`,
  file: 'stem_lab/stem_tool_algebracas.js',
  id: 'algebraCAS',
  state: { algebraCAS: { tab } },
}));

const graphBase = {
  funcs: [{ expr: 'x^2 - 4', color: '#ef4444', visible: true }],
  window: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
};
const graphCases = ['coach', 'challenge', 'ai', 'badges', 'inquiry'].map((sideTab) => ({
  name: `graphing calculator ${sideTab}`,
  file: 'stem_lab/stem_tool_graphcalc.js',
  id: 'graphCalc',
  state: { graphCalc: { ...graphBase, _sideTab: sideTab, showTable: true, showWindow: true, showMathPad: true, showSliders: true } },
}));

const funcBase = {
  type: 'quadratic', a: 1, b: 0, c: -2,
  showDeriv: false, showArea: false, traceX: 0,
  showTable: false, showLearn: false,
  compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0,
  aiExplain: '', aiExplainLoading: false,
};
const functionCases = [
  { name: 'function grapher standard', patch: {} },
  { name: 'function grapher overlays and learning', patch: { showDeriv: true, showArea: true, showTable: true, showLearn: true } },
  { name: 'function grapher zero-coefficient comparison', patch: { compare: true, compareA: 0, compareB: 1, compareC: 0 } },
].map(({ name, patch }) => ({
  name,
  file: 'stem_lab/stem_tool_funcgrapher.js',
  id: 'funcGrapher',
  state: { funcGrapher: { ...funcBase, ...patch } },
}));
const functionChallengeCases = ['root', 'yint', 'myth'].map((fgChallengeMode) => ({
  name: `function grapher ${fgChallengeMode} challenge`,
  file: 'stem_lab/stem_tool_funcgrapher.js',
  id: 'funcGrapher',
  state: { funcGrapher: { ...funcBase, fgChallengeMode } },
}));

const calculusBase = { a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' };
const calculusCases = ['integral', 'derivative', 'challenge', 'discover', 'derivHunt'].map((tab) => ({
  name: `calculus ${tab}`,
  file: 'stem_lab/stem_tool_calculus.js',
  id: 'calculus',
  state: { calculus: { ...calculusBase, tab } },
}));
const calculusVisualizationCases = ['zoom', 'tangent', 'ftc', 'motion', 'riemann', 'slope', 'chain', 'taylor', 'optim', 'related', 'vor', 'eps'].map((vizView) => ({
  name: `calculus visualization ${vizView}`,
  file: 'stem_lab/stem_tool_calculus.js',
  id: 'calculus',
  state: { calculus: { ...calculusBase, tab: 'visualize', vizView } },
}));
const calculusChallengeCases = ['overunder', 'method', 'minN', 'exact', 'deriv'].map((calcChallengeMode) => ({
  name: `calculus ${calcChallengeMode} challenge`,
  file: 'stem_lab/stem_tool_calculus.js',
  id: 'calculus',
  state: { calculus: { ...calculusBase, tab: 'challenge', calcChallengeMode } },
}));

const inequalityCases = [
  { name: 'inequality number line', patch: { graphMode: '1d', expr: '-2 < x <= 5' } },
  { name: 'inequality plane', patch: { graphMode: '2d', expr: 'y > 2x + 1' } },
  { name: 'inequality quiz', patch: { graphMode: '1d', expr: 'x > 3', quiz: { question: 'x > 3', options: ['x > 3', 'x < 3'], answer: 'x > 3' } } },
  { name: 'inequality solver', patch: { graphMode: '1d', expr: '2x + 1 > 5', showSolver: true } },
  { name: 'inequality AI tutor', patch: { graphMode: '1d', expr: 'x > 3', showAI: true, aiResponse: 'The open circle means the boundary is not included.' } },
].map(({ name, patch }) => ({
  name,
  file: 'stem_lab/stem_tool_inequality.js',
  id: 'inequality',
  state: { inequality: patch },
}));

const CASES = [
  ...algebraCases,
  ...graphCases,
  ...functionCases,
  ...functionChallengeCases,
  ...calculusCases,
  ...calculusVisualizationCases,
  ...calculusChallengeCases,
  ...inequalityCases,
];

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  return prepareStemBrowserRender(renderTool(testCase.id, testCase.state));
}

function compactViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      contrast: node.any?.[0]?.data ? {
        foreground: node.any[0].data.fgColor,
        background: node.any[0].data.bgColor,
        ratio: node.any[0].data.contrastRatio,
        expected: node.any[0].data.expectedContrastRatio,
      } : undefined,
    })),
  }));
}

describe('Advanced math tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(`${testCase.name} passes WCAG A/AA, 320px reflow, and text-spacing checks`, async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, `${testCase.name} rendered an unexpectedly small surface`).toBeGreaterThan(500);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          appCss +
          '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>',
        { waitUntil: 'domcontentloaded' },
      );
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const offenders = scrollWidth > clientWidth
          ? [...document.querySelectorAll('#tool-root, #tool-root *')]
              .map((element) => {
                const box = element.getBoundingClientRect();
                const styles = getComputedStyle(element);
                return {
                  element: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
                  html: element.outerHTML.slice(0, 280),
                  left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width),
                  scrollWidth: element.scrollWidth, display: styles.display,
                  gridTemplateColumns: styles.gridTemplateColumns, flexWrap: styles.flexWrap,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      const compactAudit = compactViolations(audit.violations);
      expect.soft(compactAudit, JSON.stringify(compactAudit, null, 2)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 20000);
  }
});
