// Calculus stage B (2026-11-03): the new panels and tabs pass axe WCAG A/AA, 320 px reflow and
// text spacing in a real browser (same harness as advanced_math_wcag_browser).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const CASES = [
  ['improper revealed', { tab: 'integral', impText: '1/x', impA: '-1', impB: '1', impKey: '1/x|-1|1', impTries: 2, impCommitted: true, impLast: { kind: 'conv', value: '0' } }],
  ['improper predicting', { tab: 'integral', impHintRung: 3, fnMode: 'typed', fnText: 'e^2x' }],
  ['euler revealed', { tab: 'visualize', vizView: 'slope', vizSlopeY: 1, eulerKey: '0|0|1', eulerDone: true, eulerTries: 1, eulerLast: 'half', eulerH: 0.1 }],
  ['series practice revealed', { tab: 'series', calcBand: 'bc', serMode: 'practice', serSeed: 77, serBand: 'bc', serTries: 2, serCommitted: true, serLast: { conv: 'conv', test: 'ratio' } }],
  ['series explore', { tab: 'series', serMode: 'explore', serPick: 0, serHarmDone: true, serHarmPred: 'levels', serN: 1000000 }],
  ['ladder mission', { tab: 'apply', misKind: 'ladder', misSeed: 9, misIdx: 2, misResults: [{ ok: true, tries: 1 }, { ok: false, tries: 2, revealed: true, mis: 'no_chain_time' }], misHintRung: 2 }],
  ['box mission', { tab: 'apply', misKind: 'box', misSeed: 9, misInput: 'x(10 - 2x)^2', misTries: 1, misFeedback: { idx: 0, ok: false, mis: 'cut_once' } }],
  ['free response', { tab: 'frq', frqKind: 'particle', frqSeed: 5, frqResults: { a: { ok: true, firstTry: true }, c: { ok: false, revealed: true, mis: 'distance_vs_displacement' } }, frqRubricOpen: { d: true } }],
];

describe('calculus stage B panels: WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const [name, state] of CASES) {
    it(`${name} passes WCAG A/AA, 320px reflow and text spacing`, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'calculus');
      const rendered = prepareStemBrowserRender(renderTool('calculus', { calculus: Object.assign({ a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' }, state) }));
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.html.slice(0, 160) + (n.any?.[0]?.data?.contrastRatio ? ' ' + n.any[0].data.contrastRatio : '')) }));
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(width.scroll).toBeLessThanOrEqual(width.client);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
