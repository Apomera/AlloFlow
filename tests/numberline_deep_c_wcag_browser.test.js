// Number Line stage C (2026-11-03 evening): axe WCAG A/AA + 320px reflow in a real
// browser for the "Start here" path of each band, the grouped tab bar, the
// clickable line-plot grid, skip-count prediction and the teacher panel, in
// light, dark and high-contrast modes.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.NUMBERLINE_DEEP_SRC || 'stem_lab/stem_tool_numberline.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const cssSource = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const THEME_CSS = ':root{--allo-stem-canvas:#f8fafc;--allo-stem-text:#0f172a}.theme-dark{--allo-stem-canvas:#0f172a;--allo-stem-panel:#1e293b;--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;--allo-stem-border:#334155}.theme-contrast{--allo-stem-canvas:#000000;--allo-stem-panel:#000000;--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;--allo-stem-border:#ffff00}#tool-root{background:var(--allo-stem-canvas);color:var(--allo-stem-text)}';
const shell = (html, dark) => '<div data-stem-tool-shell="numberline" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text)">' +
  (dark ? '<div data-stem-tool-surface="numberline" style="background:#ffffff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div>' : html) + '</div>';

const lpItem = { id: 'w-lp', kind: 'lineplot', band: 'b45', prec: 8, a: 2, span: 1, cols: 9, counts: [1, 2, 0, 3, 1, 2, 0, 1, 1], data: [2, 2.125, 2.125, 2.375, 2.375, 2.375, 2.5, 2.625, 2.625, 2.875, 3], thing: 'leaf', tries: 1,
  questions: [{ id: 'mode', answer: 2.375, count: 3 }, { id: 'range', answer: 1, max: 3, min: 2 }, { id: 'total', v: 2.375, answer: 7.125, count: 3 }] };
const B23 = { gradeLevel: '2nd Grade' }, B6 = { gradeBand: 'g68', gradeLevel: '6th Grade' };
const CASES = [
  { name: 'grades 2-3 path with ticks, skip-count prediction with a named slip', mark: 'data-skip-mis="skip_direction"', state: { tab: 'skipcount', skipFrom: 0, skipBy: 5, skipCount: 4, skipShown: 1, ppSolvedByType: { placeWhole: 2 }, skipPred: { key: '0|5|forward|2', text: '0', tries: 1, hints: 1, fb: { kind: 'wrong', mis: 'skip_direction' } } }, overrides: B23 },
  { name: 'grades 2-3 path, dark, skip-count result', mark: 'data-skip-pred-result', state: { tab: 'skipcount', skipShown: 2, skipPredLast: { kind: 'correct', base: '0|2|forward', n: 2, v: 4, xp: 1, independent: true } }, overrides: Object.assign({ isDark: true }, B23) },
  { name: 'grades 4-5 path + line plot grid with hints', mark: 'role="grid"', state: { tab: 'measure', msMode: 'plot', cerDone: true, lp: { item: lpItem, counts: [1, 1, 0, 3, 0, 0, 0, 0, 0], sel: 3, struck: { 0: true }, status: 'open', tries: 1, hints: 2, fb: { kind: 'wrong', mis: 'lp_too_few', col: 1 }, q: {} } } },
  { name: 'line plot grid, high contrast', mark: 'data-lp-cell', state: { tab: 'measure', msMode: 'plot', lp: { item: lpItem, counts: [0, 0, 0, 0, 0, 0, 0, 0, 0], sel: 0, struck: {}, status: 'open', tries: 0, q: {} } }, overrides: { isContrast: true } },
  { name: 'line plot questions with a hint ladder, dark', mark: 'data-nl-lp-questions', state: { tab: 'measure', msMode: 'plot', lp: { item: lpItem, counts: lpItem.counts, status: 'correct', tries: 1, fb: { kind: 'correct', xp: 5, independent: true }, q: { 0: { text: '', tries: 0, hints: 2 } } } }, overrides: { isDark: true } },
  { name: 'grade 6 path, teacher panel with the session note', mark: 'data-nl-teacher-session', state: { tab: 'intctx', nlbSolved: { icPlace: 2 } }, overrides: Object.assign({ isTeacherMode: true }, B6) },
  { name: 'grade 6 decimal compare revealed on demand, high contrast', mark: 'data-nl-revealed="dzCompare"', state: { tab: 'decimals', dz: { mode: 'compare', item: { id: 'w-dc', kind: 'dzCompare', band: 'b6', sa: '0.4', sb: '0.375', a: 0.4, b: 0.375, rel: '>', binary: true }, choice: '=', status: 'revealed', tries: 2, missed: true, hints: 1, fb: { kind: 'wrong', mis: 'dz_not_equal' } } }, overrides: Object.assign({ isContrast: true }, B6) },
];
describe('Number Line stage C surfaces pass WCAG A/AA and 320px reflow in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'numberline');
      const rendered = prepareStemBrowserRender(renderTool('numberline', { _numberline: { muted: true, ...testCase.state } }, testCase.overrides));
      expect(rendered.html, 'the learning path is rendered').toContain('data-nl-path');
      expect(rendered.html, 'the stage C surface is rendered').toContain(testCase.mark);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const dark = testCase.overrides && testCase.overrides.isDark;
      const hc = testCase.overrides && testCase.overrides.isContrast;
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource + THEME_CSS +
        '</style></head><body><main id="tool-root"' + (dark ? ' class="theme-dark"' : hc ? ' class="theme-contrast"' : '') + '>' + shell(rendered.html, dark) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      // Every path step and every tab is a 24px+ target; plot cells are whole columns.
      const small = await page.evaluate(() => [...document.querySelectorAll('[data-nl-path] button, [role="tab"], [data-lp-cell]')].map((el) => el.getBoundingClientRect()).filter((r) => r.width < 24 || r.height < 24).length);
      await page.close();
      expect(audit.violations.map((v) => ({ id: v.id, targets: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }))).toEqual([]);
      expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect(small).toBe(0);
    }, 60000);
  }
});
