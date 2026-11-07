import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

// Data Plot stage B tabs (2026-11-03) in a real browser: axe WCAG A/AA, 320 px reflow, text spacing.
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const pts = [3, 7, 4, 9, 12, 8, 15, 11].map((y, i) => ({ x: i + 1, y }));

const CASES = [
  ['best fit, before checking', { activeTab: 'fit' }, 'g68'],
  ['best fit, checked and revealed', { activeTab: 'fit', fitLab: { key: 'gen:68:1', seed: 1, tries: 2, revealed: true, squares: 'both', last: { ratio: 3, ssr: 120, mis: 'tooFlat', m: 0, b: 30 } } }, 'g68'],
  ['residual check, answered', { activeTab: 'fit', fitLab: { mode: 'resid' }, residLab: { key: 'resid:1', seed: 1, pred: 'yes', chosen: 'fan', tries: 2, answered: true, revealed: true, feedback: 'Look again.' } }, 'g912'],
  ['two-way, building', { activeTab: 'twoway', twoWay: { key: 'twoway:1', seed: 1, tries: 2, wrong: ['0,0'], cells: { '0,0': '1' } } }, 'g68'],
  ['two-way, row percents and verdict', { activeTab: 'twoway', twoWay: { key: 'twoway:1', seed: 1, built: true, view: 'row', assocChoice: 'yes_count', assocTries: 2, assocDone: true, assocFeedback: 'Misconception.' } }, 'g68'],
  ['sampling, before predicting', { activeTab: 'samples' }, 'g68'],
  ['sampling, checked', { activeTab: 'samples', sampling: { pred: 'higher', checked: true, draws: { 5: 40, 50: 40 } } }, 'g912'],
  ['project question', { activeTab: 'project', project: { sq: { me_tall: 'yes' }, sqChecked: true } }, 'g35'],
  ['project plan', { activeTab: 'project', project: { step: 1, plan: { kind: 'pairs', size: 4 } } }, 'g68'],
  ['project collect', { activeTab: 'project', project: { step: 2, values: [3, 4], confirmClear: true } }, 'g68'],
  ['project display, categories', { activeTab: 'project', project: { step: 3, plan: { kind: 'category' }, values: ['red', 'blue', 'red'] } }, 'k2'],
  ['project conclude', { activeTab: 'project', project: { step: 4, values: [3, 4, 5], cerMiss: ['evidence', 'data'] } }, 'g68'],
  ['chart tab with the CODAP button', { points: pts, showResidualPlot: true }, 'g912'],
];

describe('Data Plot stage B tabs in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);
  for (const [name, dp, gradeBand] of CASES) {
    it(name + ' passes WCAG A/AA, 320px reflow and text spacing', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool('stem_lab/stem_tool_dataplot.js', 'dataPlot');
      window.__alloEnsureStemPluginLoaded = () => true;
      const rendered = prepareStemBrowserRender(renderTool('dataPlot', { dataPlot: Object.assign({ points: pts }, dp) }, { gradeBand, setStemLabTool: () => {} }));
      delete window.__alloEnsureStemPluginLoaded;
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 160) + ' ' + JSON.stringify(n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio)) }))).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
