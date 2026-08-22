import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
if (!cssFile) throw new Error('Compiled application stylesheet was not found.');
const cssSource = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const CASES = [
  { name: 'arithmetic studio', file: 'stem_lab/stem_tool_arithmetic.js', id: 'arithmeticStudio', state: {} },
  { name: 'number line invalid-range recovery', file: 'stem_lab/stem_tool_numberline.js', id: 'numberline', state: { _numberline: { tab: 'explore', range: { min: 7, max: 7 } } } },
  { name: 'area model word challenge', file: 'stem_lab/stem_tool_areamodel.js', id: 'areamodel', state: { _areamodel: { viewMode: 'word', wordDims: { a: 4, b: 6 }, challenge: { a: 4, b: 6, answer: 24, question: 'Four groups of six. How many?', mode: 'word' }, answer: '', feedback: null } } },
  { name: 'fraction wall', file: 'stem_lab/stem_tool_fractions.js', id: 'fractionViz', state: { _fractions: { tab: 'wall', wallHighlight: { n: 1, d: 2 } } } },
  { name: 'coordinate grid keyboard entry', file: 'stem_lab/stem_tool_coordgrid.js', id: 'coordinate', state: { _coordGrid: { cgTab: 'explore', coordinateInputX: 2, coordinateInputY: -3 } } },
  { name: 'base ten manipulatives', file: 'stem_lab/stem_tool_manipulatives.js', id: 'base10', state: {} },
  { name: 'slide rule keyboard controls', file: 'stem_lab/stem_tool_manipulatives.js', id: 'base10', state: { _manipulatives: { mode: 'slideRule', slideRule: { cOffset: 0, cursorPos: 0 } } } },
  { name: 'multiplication table', file: 'stem_lab/stem_tool_multtable.js', id: 'multtable', state: {} },
  { name: 'ratio lab', file: 'stem_lab/stem_tool_ratios.js', id: 'ratioLab', state: {} },
  { name: 'money math', file: 'stem_lab/stem_tool_money.js', id: 'moneyMath', state: {} },
  { name: 'unit converter', file: 'stem_lab/stem_tool_unitconvert.js', id: 'unitConvert', state: {} },
  { name: 'area tile explorer', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'explore', width: 8, height: 6 } } },
  { name: 'area composite', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'composite' } } },
  { name: 'area challenge', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'challenge' } } },
  { name: 'time clock', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'clock' } } },
  { name: 'time schedule', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'schedule' } } },
  { name: 'time challenge', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'challenge' } } },
  { name: 'time schedule dark', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'schedule' } }, overrides: { isDark: true } },
  { name: 'time challenge contrast', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'challenge' } }, overrides: { isContrast: true } },
  { name: 'function grapher zero-bound viewport', file: 'stem_lab/stem_tool_funcgrapher.js', id: 'funcGrapher', state: { funcGrapher: { type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, range: { xMin: 0, xMax: 10, yMin: -5, yMax: 5 } } } },
  { name: 'inequality grapher', file: 'stem_lab/stem_tool_inequality.js', id: 'inequality', state: {} },
  { name: 'calculus visualization controls', file: 'stem_lab/stem_tool_calculus.js', id: 'calculus', state: { calculus: { tab: 'visualize', vizView: 'zoom' } } },
  { name: 'algebra solver', file: 'stem_lab/stem_tool_algebracas.js', id: 'algebraCAS', state: {} },
  { name: 'graphing calculator trace', file: 'stem_lab/stem_tool_graphcalc.js', id: 'graphCalc', state: { graphCalc: { traceMode: true, traceX: 0, showWindow: true, window: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 } } } },
];

function renderCase(testCase) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  loadTool(testCase.file, testCase.id);
  const html = renderTool(testCase.id, testCase.state, testCase.overrides);
  const toolCss = [...document.head.querySelectorAll('style')].map((style) => style.textContent || '').join('\n');
  return { html, toolCss };
}

describe('Math fundamentals and advanced math WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA and 320px reflow checks', async () => {
      const rendered = renderCase(testCase);
      expect(rendered.html.length, testCase.name + ' rendered an unexpectedly small surface').toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          cssSource +
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
                return {
                  element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
                    (typeof element.className === 'string' && element.className ? '.' + element.className.trim().replace(/\s+/g, '.') : ''),
                  left: Math.round(box.left),
                  right: Math.round(box.right),
                  width: Math.round(box.width),
                  scrollWidth: element.scrollWidth,
                };
              })
              .filter((item) => item.right > clientWidth + 1 || item.left < -1 || item.width > clientWidth + 1 || item.scrollWidth > item.width + 1)
              .sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth))
              .slice(0, 8)
          : [];
        return { scrollWidth, clientWidth, offenders };
      });

      expect(audit.violations.map((violation) => ({
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
      }))).toEqual([]);
      expect(reflow.scrollWidth, JSON.stringify(reflow.offenders, null, 2)).toBeLessThanOrEqual(reflow.clientWidth);

      if (testCase.name === 'area tile explorer') {
        const targets = await page.locator('[data-ap-tile]').evaluateAll((tiles) => tiles.map((tile) => {
          const box = tile.getBoundingClientRect();
          return { width: box.width, height: box.height };
        }));
        expect(targets.length).toBeGreaterThan(0);
        expect(Math.min(...targets.map((target) => target.width))).toBeGreaterThanOrEqual(24);
        expect(Math.min(...targets.map((target) => target.height))).toBeGreaterThanOrEqual(24);
      }

      if (testCase.name === 'time schedule') {
        const region = page.locator('[role="region"][aria-label$="scrollable event schedule"]');
        expect(await region.count()).toBe(1);
        await region.focus();
        const focusStyle = await region.evaluate((element) => {
          const style = getComputedStyle(element);
          return { outline: style.outlineStyle, shadow: style.boxShadow };
        });
        expect(focusStyle.outline !== 'none' || focusStyle.shadow !== 'none').toBe(true);
      }

      if (testCase.name === 'fraction wall') {
        const segments = page.locator('[data-fraction-wall-segment]');
        expect(await segments.count()).toBe(51);
        expect(await page.locator('[data-unit-fraction="1/4"][data-highlighted-length="true"]').count()).toBe(2);
        await page.locator('[data-fraction="2/4"]').focus();
        expect(await page.locator('[data-fraction="2/4"]').evaluate((element) => element === document.activeElement)).toBe(true);
      }

      if (testCase.name === 'coordinate grid keyboard entry') {
        expect(await page.locator('[role="img"][aria-label*="keyboard operation"]').count()).toBe(1);
        expect(await page.getByRole('group', { name: 'Coordinate entry' }).locator('input[type="number"]').count()).toBe(2);
        expect(await page.getByRole('button', { name: 'Plot or remove point' }).count()).toBe(1);
      }

      if (testCase.name === 'slide rule keyboard controls') {
        expect(await page.locator('[role="img"][aria-label*="keyboard operation"]').count()).toBe(1);
        expect(await page.getByRole('group', { name: 'Slide rule keyboard controls' }).locator('input[type="range"]').count()).toBe(2);
      }

      if (testCase.name === 'area model word challenge') {
        expect(await page.getByText('4 groups of 6 = ?', { exact: true }).count()).toBe(1);
        expect(await page.locator('.text-2xl.font-bold.text-emerald-900').count()).toBe(0);
      }

      if (testCase.name === 'graphing calculator trace') {
        expect(await page.locator('#graphcalc-trace-x').count()).toBe(1);
      }

      if (testCase.name === 'calculus visualization controls') {
        expect(await page.locator('#calc-viz-zoom').count()).toBe(1);
        expect(await page.locator('#calc-viz-x0').count()).toBe(1);
      }

      await page.close();
    }, 20000);
  }
});
