import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import {
  loadTool,
  prepareStemBrowserRender,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const STATSLAB_BASE = {
  testsRun: 0,
  mode: 'home',
  wizardStep: 0,
  wizardAnswers: {},
  selectedTest: null,
  sampleId: null,
  twoColData: { aLabel: 'Group A', bLabel: 'Group B', a: [], b: [] },
  multiColData: { groups: [{ label: 'Group 1', values: [] }, { label: 'Group 2', values: [] }] },
  oneColData: { values: [], mu0: 0 },
  chiGofData: { observed: [], expected: [], labels: [] },
  chiIndepData: { rows: ['Row 1', 'Row 2'], cols: ['Col 1', 'Col 2'], table: [[0, 0], [0, 0]] },
  twoWayData: null,
  multiRegData: { x: [], y: [], xLabels: ['X1'] },
  powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 },
  lastResult: null,
  lastTestType: null,
  interpretationDraft: '',
  aiGradeResponse: null,
  aiGradeLoading: false,
  aiGradeOpens: 0,
  showMath: false,
  showWizard: false,
};

function statsState(mode, patch = {}) {
  return { statsLab: { ...STATSLAB_BASE, mode, ...patch } };
}

const CASES = [
  { name: 'volume dimensions', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'slider', dims: { l: 3, w: 2, h: 2 } } } },
  { name: 'volume freeform builder', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'freeform', positions: ['0,0,0', '1,0,0'] } } },
  { name: 'volume word problems', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'word' } } },
  { name: 'volume displacement', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'displacement', dispObjectId: 'stone' } } },
  { name: 'coordinate grid', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: {} } },
  { name: 'coordinate quadrant tour', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'quadrants' } } },
  { name: 'coordinate real-world maps', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'maps' } } },
  { name: 'coordinate battleship map', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'maps', mapScenario: 'battleship' } } },
  { name: 'coordinate latitude-longitude map', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'maps', mapScenario: 'world' } } },
  { name: 'coordinate quadrant hunt', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'quadHunt' } } },
  { name: 'angle explorer', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'explore' } } },
  { name: 'angle explorer second ray', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'explore', showSecondRay: true } } },
  { name: 'angle challenges', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'challenges' } } },
  { name: 'angle reference', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'reference' } } },
  { name: 'angle tools', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'tools' } } },
  { name: 'geometry sandbox', file: 'stem_lab/stem_tool_geosandbox.js', id: 'geoSandbox', state: { _threeLoaded: true, geoSandbox: { mode: 'stretch', construction: { objects: [], selection: null } } } },
  { name: 'geometry sandbox single shape', file: 'stem_lab/stem_tool_geosandbox.js', id: 'geoSandbox', state: { _threeLoaded: true, geoSandbox: { mode: 'single', shape: 'box' } } },
  { name: 'geometry sandbox sculpt', file: 'stem_lab/stem_tool_geosandbox.js', id: 'geoSandbox', state: { _threeLoaded: true, geoSandbox: { mode: 'sculpt' } } },
  { name: 'geometry prover', file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver', state: { geometryProver: {} } },
  { name: 'geometry prover discovery', file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver', state: { geometryProver: { tab: 'discover' } } },
  { name: 'geometry prover challenge', file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver', state: { geometryProver: { tab: 'challenge' } } },
  { name: 'geometry world ready workspace', file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld', boundedWorkspace: true, state: { _threeLoaded: true, geometryWorld: { _introShownOnce: true } } },
  { name: 'geometry world lesson intro', file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld', boundedWorkspace: true, state: { _threeLoaded: true, geometryWorld: { showLessonIntro: true, activeLesson: 'volumeExplorer' } } },
  { name: 'logic lab probability discovery', file: 'stem_lab/stem_tool_logiclab.js', id: 'logicLab', state: { logicLab: {} } },
  { name: 'probability coin experiment', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'coin' } } },
  { name: 'probability die experiment', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'dice', diceSides: 20 } } },
  { name: 'probability spinner experiment', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'spinner' } } },
  { name: 'probability two-dice experiment', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'dice2', diceSides: 6 } } },
  { name: 'probability sports experiment', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'sports' } } },
  { name: 'probability marble bag', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'marbleBag', customOutcomes: [{ label: 'Red', count: 2, color: '#ef4444' }, { label: 'Blue', count: 1, color: '#3b82f6' }] } } },
  { name: 'probability custom-model error', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'custom', customSubMode: 'fraction', customOutcomes: [{ label: 'A', numerator: 1, denominator: 2, color: '#ef4444' }, { label: 'B', numerator: 2, denominator: 5, color: '#3b82f6' }], results: [], trials: 0, convergenceHistory: [] } } },
  { name: 'probability custom slider model', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'custom', customSubMode: 'slider', customOutcomes: [{ label: 'A', prob: 0.7, color: '#b91c1c' }, { label: 'B', prob: 0.3, color: '#1d4ed8' }], results: [], trials: 0, convergenceHistory: [] } } },
  { name: 'probability tree', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'tree' } } },
  { name: 'probability Monte Carlo pi', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'pi', trials: 25, _piPoints: [{ x: 0.2, y: 0.3, inside: true }] } } },
  { name: 'probability Monty Hall', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'monty' } } },
  { name: 'probability Galton board', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'galton' } } },
  { name: 'probability birthday paradox', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'birthday', birthdayN: 23 } } },
  { name: 'probability 3D volume', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'volume3d', _v3Engine: 'ready', v3Total: 100, v3Inside: 52 } } },
  { name: 'statistics home', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('home') },
  { name: 'statistics wizard', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('wizard') },
  { name: 'statistics data entry', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('data', { oneColData: { values: [2, 4, 4, 5, 9], mu0: 0 } }) },
  { name: 'statistics test selection', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('test') },
  { name: 'statistics results empty state', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('results') },
  { name: 'statistics populated results', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('results', { lastTestType: 'ttest_independent', lastResult: { test: "Independent t-test (Welch's)", welch: true, n1: 15, n2: 15, mean1: 8.4, mean2: 6.1, sd1: 2.2, sd2: 2.5, meanDiff: 2.3, se: 0.86, t: 2.67, df: 27.6, p: 0.0126, pTwoTailed: 0.0126, pOneTailed: 0.0063, cohensD: 0.98, ci95: [0.54, 4.06] } }) },
  { name: 'statistics power analysis', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('power') },
  { name: 'statistics mastery', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('mastery') },
  { name: 'statistics inquiry', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('inquiry') },
  { name: 'data studio bar chart', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'bar' } } },
  { name: 'data studio pie chart', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'pie' } } },
  { name: 'data studio line graph', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'line' } } },
  { name: 'data studio scatter plot', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'scatter', dataRows: [{ label: 'A', x: 1, value: 2 }, { label: 'B', x: 2, value: 4 }, { label: 'C', x: 3, value: 5 }] } } },
  { name: 'data studio box plot', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'box' } } },
  { name: 'data studio histogram', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'histogram' } } },
  { name: 'data studio embedded regression', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', dependencies: [{ file: 'stem_lab/stem_tool_dataplot.js', id: 'dataPlot' }], state: { _dataStudio: { studioMode: 'regression' }, _dataPlot: {} } },
  { name: 'volume dark theme', file: 'stem_lab/stem_tool_volume.js', id: 'volume', state: { _volume: { mode: 'slider' } }, overrides: { isDark: true } },
  { name: 'coordinate high contrast', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'maps', mapScenario: 'world' } }, overrides: { isContrast: true } },
  { name: 'angles dark theme', file: 'stem_lab/stem_tool_angles.js', id: 'protractor', state: { protractor: { activeTab: 'reference' } }, overrides: { isDark: true } },
  { name: 'geometry sandbox high contrast', file: 'stem_lab/stem_tool_geosandbox.js', id: 'geoSandbox', state: { _threeLoaded: true, geoSandbox: { mode: 'single', shape: 'sphere' } }, overrides: { isContrast: true } },
  { name: 'geometry prover dark theme', file: 'stem_lab/stem_tool_geo.js', id: 'geometryProver', state: { geometryProver: { tab: 'challenge' } }, overrides: { isDark: true } },
  { name: 'geometry world high contrast', file: 'stem_lab/stem_tool_geometryworld.js', id: 'geometryWorld', boundedWorkspace: true, state: { _threeLoaded: true, geometryWorld: { showLessonIntro: true, activeLesson: 'areaSurface' } }, overrides: { isContrast: true } },
  { name: 'probability dark theme', file: 'stem_lab/stem_tool_probability.js', id: 'probability', state: { probability: { mode: 'marbleBag' } }, overrides: { isDark: true } },
  { name: 'statistics high contrast', file: 'stem_lab/stem_tool_statslab.js', id: 'statsLab', state: statsState('power'), overrides: { isContrast: true } },
  { name: 'data studio dark theme', file: 'stem_lab/stem_tool_datastudio.js', id: 'dataStudio', state: { _dataStudio: { chartType: 'scatter' } }, overrides: { isDark: true } },
];

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  for (const dependency of testCase.dependencies || []) loadTool(dependency.file, dependency.id);
  loadTool(testCase.file, testCase.id);
  return prepareStemBrowserRender(renderTool(testCase.id, testCase.state, testCase.overrides));
}

function compactViolations(violations) {
  return violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      contrast: node.any && node.any[0] && node.any[0].data
        ? {
            foreground: node.any[0].data.fgColor,
            background: node.any[0].data.bgColor,
            ratio: node.any[0].data.contrastRatio,
            expected: node.any[0].data.expectedContrastRatio,
          }
        : undefined,
    })),
  }));
}

describe('Geometry and data tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, and text-spacing checks', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          appCss +
        '</style></head><body><main id="tool-root"' +
          (testCase.boundedWorkspace ? ' style="height:100vh;min-height:100vh"' : '') +
          '>' + rendered.html + '</main></body></html>',
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
                  element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
                    (typeof element.className === 'string' && element.className ? '.' + element.className.trim().replace(/\s+/g, '.') : ''),
                  html: element.outerHTML.slice(0, 280),
                  left: Math.round(box.left),
                  right: Math.round(box.right),
                  width: Math.round(box.width),
                  scrollWidth: element.scrollWidth,
                  display: styles.display,
                  gridTemplateColumns: styles.gridTemplateColumns,
                  flexWrap: styles.flexWrap,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      const textSpacingReflow = await auditTextSpacingReflow(page);
      expect.soft(compactViolations(audit.violations)).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(textSpacingReflow.scrollWidth, JSON.stringify(textSpacingReflow.offenders, null, 2)).toBeLessThanOrEqual(textSpacingReflow.clientWidth);
      await page.close();
    }, 20000);
  }
});
