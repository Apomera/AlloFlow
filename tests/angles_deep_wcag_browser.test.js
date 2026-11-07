// Angle Explorer deep rebuild (2026-11-03): the NEW surfaces (protractor read /
// draw / compare, puzzles at every level, benchmark estimate, teacher panel) in
// a real browser: axe WCAG 2.2 A/AA, 320px reflow and text spacing, light and
// dark. Same machinery as tests/geometry_data_wcag_browser.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');

const P = (patch) => ({ protractor: patch });
const BASE_CASES = [
  ['protractor read', P({ activeTab: 'protractor', mMode: 'read' })],
  ['protractor read result', P({ activeTab: 'protractor', mMode: 'read', mResult: { code: 'wrong_scale' }, mTries: 1 })],
  ['protractor draw', P({ activeTab: 'protractor', mMode: 'draw' })],
  ['protractor compare', P({ activeTab: 'protractor', mMode: 'compare' })],
  ['puzzles grade 4', P({ activeTab: 'puzzles', level: 'g4' })],
  ['puzzles transversal', P({ activeTab: 'puzzles', level: 'g8', pz: { kind: 'trans', alpha: 60, given: { i: 0, p: 0 }, ask: { i: 1, p: 2 }, rel: 'alt_exterior', a: 60, answer: 60, id: 'trans:60:0012' }, pzHint: 2 })],
  ['puzzles triangle with reason step', P({ activeTab: 'puzzles', level: 'g57', pz: { kind: 'tri', angles: [50, 60, 70], which: 2, answer: 70, id: 'tri:50-60-70:2' }, pzResult: { code: 'ok', ok: true }, pzTries: 1 })],
  ['challenges benchmark estimate', P({ activeTab: 'challenges', estimateActive: true, estimateTarget: 100, estimateBase: 30 })],
  ['explore estimate', P({ activeTab: 'explore', estimateActive: true, estimateTarget: 100 })],
];
const CASES = [];
for (const [name, state] of BASE_CASES) {
  CASES.push({ name, state, overrides: {} });
  CASES.push({ name: name + ' (dark)', state, overrides: { isDark: true } });
}
CASES.push({ name: 'teacher panel', state: P({ activeTab: 'protractor', misTally: { wrong_scale: 2, ray_length: 1 }, missedLog: [{ kind: 'read', code: 'wrong_scale', item: '62°', ts: 1 }] }), overrides: { isTeacherMode: true } });

describe('Angle Explorer new surfaces pass WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(SOURCE, 'protractor');
      const rendered = prepareStemBrowserRender(renderTool('protractor', testCase.state, testCase.overrides));
      expect(rendered.html.length).toBeGreaterThan(500);
      // In the dark theme the host keeps tool content on its own light card
      // (tests/stem_shell_dark_surface.test.js); isDark repaints the tool's SVGs.
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
        '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? [n.any[0].data.fgColor, n.any[0].data.bgColor, n.any[0].data.contrastRatio] : undefined })) }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders || []).slice(0, 800)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
