// Number Line stage B (2026-11-03 pm): axe WCAG A/AA + 320px reflow in a real
// browser for decimal zoom, ordering, ruler + line plot, integers in context
// and the CER investigation, in light, dark and high-contrast modes.
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

// Host theme surface, as in stem_focus_visibility_wcag_browser.test.js: the app paints the
// STEAM canvas from these variables, so HC/dark text is checked on the real background.
const THEME_CSS = ':root{--allo-stem-canvas:#f8fafc;--allo-stem-text:#0f172a}.theme-dark{--allo-stem-canvas:#0f172a;--allo-stem-panel:#1e293b;--allo-stem-text:#e2e8f0;--allo-stem-text-soft:#94a3b8;--allo-stem-border:#334155}.theme-contrast{--allo-stem-canvas:#000000;--allo-stem-panel:#000000;--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;--allo-stem-border:#ffff00}#tool-root{background:var(--allo-stem-canvas);color:var(--allo-stem-text)}';

// The host shell (stem_lab_module.js): every tool sits in [data-stem-tool-shell]; in the dark
// theme it is drawn on a light card (no darkRemap opt-in), so reproduce that box here.
const shell = (html, dark) => '<div data-stem-tool-shell="numberline" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text)">' +
  (dark ? '<div data-stem-tool-surface="numberline" style="background:#ffffff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div>' : html) + '</div>';

const F = (n, d) => ({ kind: 'frac', text: n + '/' + d, value: n / d, n, d });
const D = (s) => ({ kind: 'dec', text: s, value: Number(s), places: s.split('.')[1].length });
const ord = { id: 'w-ord', kind: 'order', band: 'b45', nums: [F(3, 4), D('0.375'), { kind: 'pct', text: '8%', value: 0.08, p: 8 }, D('0.5')], line: { min: 0, max: 1, step: 0.1, labels: [0, 0.5, 1], snap: 0.01 }, tries: 1 };
const ms = { id: 'w-ms', kind: 'measure', band: 'b6', rd: 8, prec: 4, start: 1, len: 2.25, end: 3.25, target: 2.25, thing: 'caterpillar', tries: 1 };
const lpItem = { id: 'w-lp', kind: 'lineplot', band: 'b45', prec: 8, a: 2, span: 1, cols: 9, counts: [1, 2, 0, 3, 1, 2, 0, 1, 1], data: [2, 2.125, 2.125, 2.375, 2.375, 2.375, 2.5, 2.625, 2.625, 2.875, 3], thing: 'leaf', tries: 1,
  questions: [{ id: 'mode', answer: 2.375, count: 3 }, { id: 'range', answer: 1, max: 3, min: 2 }, { id: 'total', v: 2.375, answer: 7.125, count: 3 }] };
const temp = { min: -20, max: 20, step: 1, labels: [-20, -15, -10, -5, 0, 5, 10, 15, 20], snap: 1, vertical: true };
const money = { min: -50, max: 50, step: 5, labels: [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50], snap: 5, vertical: false };
const icPlace = { id: 'w-ic', kind: 'icChange', band: 'b6', ctx: 'temp', unit: 'F', line: temp, start: -4, delta: 9, up: true, target: 5, answer: 'position', names: ['Ana', 'Ben'], tries: 1 };
const icDebt = { id: 'w-ic2', kind: 'icDebt', band: 'b6', ctx: 'money', unit: 'F', line: money, a: -30, b: -10, ask: 'debt', answerIdx: 0, answer: 'choice', binary: true, names: ['Ana', 'Ben'], tries: 1 };
const dz = (text) => ({ id: 'w-dz', kind: 'dzPlace', band: 'b45', places: 3, W: 0, text, target: Number(text), tries: 1 });
const missed = [{ type: 'dzCompare', prompt: 'Compare 0.4 and 0.375.', answer: '0.4 < 0.375', correct: '0.4 > 0.375', mis: 'longer_is_bigger', source: 'nlb', ts: 1 }];
const CASES = [
  { name: 'decimal zoom explore at hundredths', mark: 'data-dz-chart', state: { tab: 'decimals', dz: { mode: 'explore', lo: 0.3, level: 1, pos: 0.34 } } },
  { name: 'decimal zoom place with a named slip, dark', mark: 'data-nlb-mis="dz_zero_dropped"', state: { tab: 'decimals', dz: { mode: 'place', item: dz('0.305'), lo: 0.3, level: 1, pos: 0.35, status: 'open', tries: 1, hints: 2, fb: { kind: 'wrong', mis: 'dz_zero_dropped' } } }, overrides: { isDark: true } },
  { name: 'decimal compare closed, high contrast', mark: 'data-nlb-mis="longer_is_bigger"', state: { tab: 'decimals', dz: { mode: 'compare', item: { id: 'w-dc', kind: 'dzCompare', band: 'b45', sa: '0.4', sb: '0.375', a: 0.4, b: 0.375, rel: '>', binary: true }, choice: '<', status: 'missed', tries: 1, hints: 1, fb: { kind: 'wrong', mis: 'longer_is_bigger' } } }, overrides: { isContrast: true } },
  { name: 'order with the swapped pair named', mark: 'data-nlb-mis="ord_percent_whole"', state: { tab: 'order', ord: { item: ord, pos: [0.75, 0.38, 0.6, 0.5], sel: 2, status: 'open', tries: 1, hints: 1, fb: { kind: 'wrong', mis: 'ord_percent_whole', pair: [3, 2] } } } },
  { name: 'order revealed, dark', mark: 'data-nl-order="item"', state: { tab: 'order', ord: { item: ord, pos: [0.75, 0.38, 0.6, 0.5], sel: 0, status: 'revealed', tries: 2, missed: true, fb: { kind: 'wrong', mis: 'ord_swap', pair: [3, 2] } } }, overrides: { isDark: true } },
  { name: 'ruler offset start, correct, dark', mark: 'data-nl-ruler="8"', state: { tab: 'measure', ms: { item: ms, text: '2 1/4', status: 'correct', tries: 1, fb: { kind: 'correct', xp: 3, independent: true } } }, overrides: { isDark: true } },
  { name: 'ruler with hints and a worked example', mark: 'data-nlb-mis="ms_read_end"', state: { tab: 'measure', ms: { item: ms, text: '3 1/4', status: 'open', tries: 1, hints: 3, fb: { kind: 'wrong', mis: 'ms_read_end' } } } },
  { name: 'line plot building', mark: 'role="toolbar"', state: { tab: 'measure', msMode: 'plot', lp: { item: lpItem, counts: [1, 1, 0, 3, 0, 0, 0, 0, 0], sel: 3, struck: { 0: true }, status: 'open', tries: 1, fb: { kind: 'wrong', mis: 'lp_too_few', col: 1 }, q: {} } } },
  { name: 'line plot questions, high contrast', mark: 'data-nl-lp-questions', state: { tab: 'measure', msMode: 'plot', lp: { item: lpItem, counts: lpItem.counts, status: 'correct', tries: 1, fb: { kind: 'correct', xp: 5, independent: true }, q: { 0: { text: '3', tries: 1, fb: { kind: 'wrong', mis: 'lp_mode_count' } }, 1: { text: '1', status: 'correct', tries: 1, fb: { kind: 'correct', xp: 2, independent: true } } } } }, overrides: { isContrast: true } },
  { name: 'integers vertical change checked, dark', mark: 'data-nl-vertical', state: { tab: 'intctx', ic: { item: icPlace, pos: 5, status: 'correct', tries: 1, fb: { kind: 'correct', xp: 3, independent: true } } }, overrides: { isDark: true } },
  { name: 'integers who owes more, missed', mark: 'data-nlb-mis="ic_debt_balance"', state: { tab: 'intctx', ic: { item: icDebt, choice: 1, status: 'missed', tries: 1, hints: 1, shown: true, fb: { kind: 'wrong', mis: 'ic_debt_balance' } } } },
  { name: 'CER with evidence and feedback + teacher panel', mark: 'data-nlb-mis="cer_ignores_counter"', state: { tab: 'magCompare', ppMissed: missed, ppStats: { dzCompare: { served: 2, correct: 1, missed: 1 } }, cer: { pred: 'always', rows: [{ a: [1, 3], b: [1, 5] }, { a: [2, 5], b: [2, 7] }, { a: [3, 4], b: [1, 2] }], claim: 'always', fb: { kind: 'wrong', mis: 'cer_ignores_counter', row: 2 } } }, overrides: { isTeacherMode: true } },
  { name: 'CER done, dark', mark: 'data-nl-cer-done', state: { tab: 'magCompare', cerDone: true, cer: { pred: 'always', rows: [{ a: [1, 3], b: [1, 5] }, { a: [3, 4], b: [1, 2] }, { a: [2, 5], b: [2, 7] }], claim: 'sameNum', cite: 1, reason: 'pieces', done: true, fb: { kind: 'correct' } } }, overrides: { isDark: true } },
];
describe('Number Line stage B surfaces pass WCAG A/AA and 320px reflow in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'numberline');
      const rendered = prepareStemBrowserRender(renderTool('numberline', { _numberline: { muted: true, ...testCase.state } }, testCase.overrides));
      expect(rendered.html.length).toBeGreaterThan(500);
      expect(rendered.html, 'the stage B surface is rendered').toContain(testCase.mark);
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
      await page.close();
      expect(audit.violations.map((v) => ({ id: v.id, targets: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }))).toEqual([]);
      expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
    }, 60000);
  }
});
