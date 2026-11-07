// Number Line deep rebuild (2026-11-03): axe WCAG A/AA + 320px reflow in a real
// browser for the NEW surfaces (Place it items, teacher panel, integer lab,
// multi-whole fraction models) in light, dark and high-contrast modes.
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

const placeItem = { v: 2, id: 'wcag-item', type: 'placeFraction', band: 'b45', answer: 'position', tries: 0, target: 0.75, p: 3, q: 4, text: '3/4', snap: 0.25, tol: 0.12, line: { min: 0, max: 1, step: 0.25, labels: [0, 1] } };
const pp = (extra) => ({ item: placeItem, pos: 0.5, text: '', tries: 1, hints: 2, status: 'open', fb: { kind: 'wrong', mis: 'ticks_not_spaces' }, exampleOpen: false, ...(extra || {}) });
const missed = [{ type: 'placeFraction', prompt: 'Place a marker at 3/4 on the number line.', answer: '2/4', correct: '3/4', mis: 'ticks_not_spaces', source: 'place', ts: 1 }];
const BASE = { tab: 'challenges', challengeMode: 'place', ppSolvedByType: {}, pp: pp(), ppMissed: missed };
const CASES = [
  { name: 'Place it with feedback, hints and a worked example', state: BASE },
  { name: 'Place it dark', state: BASE, overrides: { isDark: true } },
  { name: 'Place it high contrast', state: BASE, overrides: { isContrast: true } },
  { name: 'Place it revealed + teacher panel', state: { ...BASE, pp: pp({ tries: 2, missed: true, status: 'revealed' }) }, overrides: { isTeacherMode: true } },
  { name: 'Quick questions after two tries', state: { tab: 'challenges', challengeMode: 'quick', range: { min: 0, max: 20 }, answer: '9', feedback: { correct: false, msg: 'Not yet.' }, challenge: { type: 'identify', _arrowValue: 7, answer: 7, tries: 2, question: 'What number does the arrow point to?' } } },
  { name: 'integer lab hops checked', state: { tab: 'explore', showIntegerLab: true, intLab: { mode: 'hops', a: 3, op: '+', b: -5, pred: 8, checked: true } } },
  { name: 'integer lab mirror checked dark', state: { tab: 'explore', showIntegerLab: true, intLab: { mode: 'mirror', x: -4, opp: 4, oppChecked: true } }, overrides: { isDark: true } },
  { name: 'integer lab absolute value', state: { tab: 'explore', showIntegerLab: true, intLab: { mode: 'abs', ax: -6, absGuess: '-6', absChecked: true } } },
  { name: 'fractions above one whole', state: { tab: 'fracdec', fdValue: 1.5, fdDen: 4, fdMin: 0, fdMax: 2 } },
  { name: 'fractions dark with compare', state: { tab: 'fracdec', fdValue: 0.75, fdDen: 8, fdCompareOn: true, fdShowMoney: true, fdShowExpansion: true }, overrides: { isDark: true } },
  { name: 'explore with a marker table', state: { tab: 'explore', range: { min: 0, max: 1 }, markers: [{ value: 0.25, label: 'A', color: '#b91c1c' }, { value: 0.75, label: 'B', color: '#1d4ed8' }] } },
  { name: 'skip count dark', state: { tab: 'skipcount' }, overrides: { isDark: true } },
  { name: 'compare fractions', state: { tab: 'magCompare', magHunt: { numA: 3, denA: 4, numB: 2, denB: 3, log: [{ a: '3/4', b: '2/3', va: '0.75', vb: '0.67', st: 'bSmaller' }] } } },
];

describe('Number Line new surfaces pass WCAG A/AA and 320px reflow in a real browser', () => {
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
