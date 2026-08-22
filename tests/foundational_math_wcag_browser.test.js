import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const arithmeticCases = ['learn', 'practice', 'errors', 'apply'].map((tab) => ({
  name: `arithmetic ${tab}`,
  file: 'stem_lab/stem_tool_arithmetic.js',
  id: 'arithmeticStudio',
  state: { _arithmeticStudio: { tab, operation: 'add' } },
}));

const fractionTabs = {
  learn: ['practice', 'models', 'numberline', 'cra', 'wall', 'manip', 'reference', 'curiosities', 'aboutSuper', 'sliderMixer'],
  practice: ['compare', 'operations', 'equivalents', 'converter', 'explorers', 'drill'],
  apply: ['wordproblems', 'multistep', 'games', 'recipes', 'story', 'brain', 'rwt', 'data', 'probability', 'art'],
  teacher: ['standardsPlanning', 'printAssess', 'pedagogy', 'myAccount', 'ml'],
};
const fractionCases = Object.entries(fractionTabs).flatMap(([navMode, tabs]) => tabs.map((tab) => ({
  name: `fractions ${navMode} ${tab}`,
  file: 'stem_lab/stem_tool_fractions.js',
  id: 'fractionViz',
  state: { _fractions: { navMode, tab } },
})));

const fractionNestedCases = [
  { navMode: 'learn', tab: 'reference', stateKey: 'refSub', values: ['glossary', 'faq', 'compareS', 'cheatsheet', 'examples', 'tables', 'tabguide'] },
  { navMode: 'learn', tab: 'curiosities', stateKey: 'curSub', values: ['magic', 'timeline', 'proverbs', 'animals', 'quotes', 'density'] },
  { navMode: 'learn', tab: 'aboutSuper', stateKey: 'aboutSub', values: ['about', 'changelog', 'thanks'] },
  { navMode: 'practice', tab: 'explorers', stateKey: 'expSub', values: ['factfam'] },
  { navMode: 'practice', tab: 'drill', stateKey: 'drillSub', values: ['vocabquiz', 'examprep', 'estimation'] },
  { navMode: 'teacher', tab: 'standardsPlanning', stateKey: 'spSub', values: ['scope', 'lessons', 'iep', 'rubric', 'udl', 'routines', 'checklist'] },
  { navMode: 'teacher', tab: 'printAssess', stateKey: 'paSub', values: ['reports', 'rtiprobe', 'refcard', 'exitticket', 'printlab'] },
  { navMode: 'teacher', tab: 'pedagogy', stateKey: 'pedSub', values: ['mcflow', 'activities', 'mathtalks', 'differentiation', 'parent', 'citations'] },
  { navMode: 'teacher', tab: 'myAccount', stateKey: 'maSub', values: ['daily', 'mastery', 'levels'] },
].flatMap(({ navMode, tab, stateKey, values }) => values.map((value) => ({
  name: `fractions ${navMode} ${tab} ${value}`,
  file: 'stem_lab/stem_tool_fractions.js',
  id: 'fractionViz',
  state: { _fractions: { navMode, tab, [stateKey]: value } },
})));

const numberLineCases = ['explore', 'challenges', 'skipcount', 'fracdec', 'magCompare'].map((tab) => ({
  name: `number line ${tab}`,
  file: 'stem_lab/stem_tool_numberline.js',
  id: 'numberline',
  state: { _numberline: { tab } },
}));

const multiplicationCases = ['practice', 'visual', 'patterns'].map((mtTab) => ({
  name: `multiplication table ${mtTab}`,
  file: 'stem_lab/stem_tool_multtable.js',
  id: 'multtable',
  state: { _multExt: { mtTab } },
}));

const ratioCases = ['ratioTable', 'numberLine', 'unitRates', 'percent', 'proportional'].map((mode) => ({
  name: `ratio lab ${mode}`,
  file: 'stem_lab/stem_tool_ratios.js',
  id: 'ratioLab',
  state: { _ratioLab: { mode } },
}));

const areaModelCases = ['basic', 'distributive', 'multidigit', 'word'].map((viewMode) => ({
  name: `area model ${viewMode}`,
  file: 'stem_lab/stem_tool_areamodel.js',
  id: 'areamodel',
  state: { _areamodel: { viewMode } },
}));

const areaPerimeterCases = ['explore', 'compare', 'composite', 'investigate', 'challenge'].map((mode) => ({
  name: `area and perimeter ${mode}`,
  file: 'stem_lab/stem_tool_areaperimeter.js',
  id: 'areaPerimeter',
  state: { _areaPerimeter: { mode } },
}));

const moneyCases = ['coins', 'change', 'tips', 'store', 'budget', 'cents', 'word', 'exchange', 'finance', 'inquiry'].map((tab) => ({
  name: `money math ${tab}`,
  file: 'stem_lab/stem_tool_money.js',
  id: 'moneyMath',
  state: { _moneyMath: { tab } },
}));

const moneyFinanceCases = ['retire', 'loans', 'goals', 'quiz'].map((finSub) => ({
  name: `money math finance ${finSub}`,
  file: 'stem_lab/stem_tool_money.js',
  id: 'moneyMath',
  state: { _moneyMath: { tab: 'finance', finSub } },
}));

const unitCases = ['convert', 'table', 'quiz', 'wordproblem', 'magHunt'].map((tab) => ({
  name: `unit converter ${tab}`,
  file: 'stem_lab/stem_tool_unitconvert.js',
  id: 'unitConvert',
  state: { unitConvert: { tab } },
}));

const unitMagnitudeCases = [
  { band: 'tiny', targetExp: 1 },
  { band: 'medium', targetExp: 6 },
  { band: 'large', targetExp: 10 },
  { band: 'massive', targetExp: 15 },
].map(({ band, targetExp }) => ({
  name: `unit converter magnitude ${band}`,
  file: 'stem_lab/stem_tool_unitconvert.js',
  id: 'unitConvert',
  state: { unitConvert: { tab: 'magHunt', magHunt: { sourceExp: 0, targetExp } } },
}));

const themeCases = [
  { name: 'arithmetic dark', file: 'stem_lab/stem_tool_arithmetic.js', id: 'arithmeticStudio', state: {}, overrides: { isDark: true } },
  { name: 'fractions dark', file: 'stem_lab/stem_tool_fractions.js', id: 'fractionViz', state: { _fractions: { navMode: 'practice', tab: 'operations' } }, overrides: { isDark: true } },
  { name: 'number line contrast', file: 'stem_lab/stem_tool_numberline.js', id: 'numberline', state: {}, overrides: { isContrast: true } },
  { name: 'multiplication table dark', file: 'stem_lab/stem_tool_multtable.js', id: 'multtable', state: {}, overrides: { isDark: true } },
  { name: 'ratio lab contrast', file: 'stem_lab/stem_tool_ratios.js', id: 'ratioLab', state: {}, overrides: { isContrast: true } },
  { name: 'area model dark', file: 'stem_lab/stem_tool_areamodel.js', id: 'areamodel', state: {}, overrides: { isDark: true } },
  { name: 'area and perimeter contrast', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: {}, overrides: { isContrast: true } },
  { name: 'money math dark', file: 'stem_lab/stem_tool_money.js', id: 'moneyMath', state: {}, overrides: { isDark: true } },
  { name: 'unit converter contrast', file: 'stem_lab/stem_tool_unitconvert.js', id: 'unitConvert', state: {}, overrides: { isContrast: true } },
];

const CASES = [
  ...arithmeticCases,
  ...fractionCases,
  ...fractionNestedCases,
  ...numberLineCases,
  ...multiplicationCases,
  ...ratioCases,
  ...areaModelCases,
  ...areaPerimeterCases,
  ...moneyCases,
  ...moneyFinanceCases,
  ...unitCases,
  ...unitMagnitudeCases,
  ...themeCases,
];

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  const html = renderTool(testCase.id, testCase.state, testCase.overrides);
  const toolCss = [...document.head.querySelectorAll('style')].map((style) => style.textContent || '').join('\n');
  return { html, toolCss };
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

describe('Foundational math tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(`${testCase.name} passes WCAG A/AA and 320px reflow checks`, async () => {
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
      if (rendered.toolCss) await page.addStyleTag({ content: rendered.toolCss });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => {
        for (const animation of document.getAnimations()) animation.cancel();
      });

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
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

      const compactAudit = compactViolations(audit.violations);
      expect.soft(compactAudit, JSON.stringify(compactAudit, null, 2)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      await page.close();
    }, 25000);
  }
});
