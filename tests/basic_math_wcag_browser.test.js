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
  { name: 'area tile explorer', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'explore', width: 8, height: 6 } } },
  { name: 'area composite', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'composite' } } },
  { name: 'area challenge', file: 'stem_lab/stem_tool_areaperimeter.js', id: 'areaPerimeter', state: { _areaPerimeter: { mode: 'challenge' } } },
  { name: 'time clock', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'clock' } } },
  { name: 'time schedule', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'schedule' } } },
  { name: 'time challenge', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'challenge' } } },
  { name: 'time schedule dark', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'schedule' } }, overrides: { isDark: true } },
  { name: 'time challenge contrast', file: 'stem_lab/stem_tool_timeschedule.js', id: 'timeSchedule', state: { _timeSchedule: { tab: 'challenge' } }, overrides: { isContrast: true } },
];

function renderCase(testCase) {
  resetStemLab();
  loadTool(testCase.file, testCase.id);
  return renderTool(testCase.id, testCase.state, testCase.overrides);
}

describe('Basic math tools WCAG regression in a real browser', () => {
  let browser;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA and 320px reflow checks', async () => {
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.setContent(
        '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
          cssSource +
          '</style></head><body><main id="tool-root">' + renderCase(testCase) + '</main></body></html>',
        { waitUntil: 'domcontentloaded' },
      );
      await page.addScriptTag({ content: axeSource });

      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(audit.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        targets: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      }))).toEqual([]);
      expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);

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

      await page.close();
    }, 20000);
  }
});