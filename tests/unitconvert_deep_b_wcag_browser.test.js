// Unit Converter stage B (2026-11-03): axe WCAG A/AA, 320 px reflow and text
// spacing in a real browser for the NEW surfaces (prefix ladder, time and
// money, chemistry, benchmark comparisons) and for the new dark surface on
// every tab. Same machinery as unitconvert_deep_wcag_browser.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const FILE = 'stem_lab/stem_tool_unitconvert.js';
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
Function('window', fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8'))(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(
  React.createElement(window.AlloModules.AppStyles.AppStyles, null),
)).cssSheets;
function themeFor(c) { const o = c.overrides || {}; return o.isContrast ? 'contrast' : o.isDark ? 'dark' : 'light'; }
function hostMarkup(c, html) {
  if (!c.overrides || (!c.overrides.isDark && !c.overrides.isContrast)) return html;
  const theme = themeFor(c);
  const content = theme === 'dark' ? '<div data-stem-tool-surface="unitConvert" style="background:#fff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div>' : html;
  return '<div data-stem-tool-shell="unitConvert" data-stem-basic-math="true" data-stem-theme="' + theme + '" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text);min-height:100vh">' + content + '</div>';
}

resetStemLab();
loadTool(FILE, 'unitConvert');
const C = window.__UnitConvertCore;
function find(family, band, mode, pred, extra) {
  for (let s = 1; s < 40000; s++) { const x = C.makeExtraItem(family, band, s, mode); if (pred(x)) return Object.assign(x, { seed: s }, extra || {}); }
  throw new Error('no item');
}
function practice(band, kind, extra) {
  for (let s = 1; s < 5000; s++) { const x = C.makePracticeItem(band, s, kind); if (x.traps.length) return Object.assign(x, { seed: s }, extra || {}); }
  throw new Error('no item');
}
const DARK = { isDark: true };
const elapsed = find('everyday', 'b35', 'elapsed', (i) => i.kind === 'elapsed' && i.jumps.length === 3, { hintLevel: 2, tries: 1, lastMis: 'hundredMinutes' });
const minToHours = find('everyday', 'b35', 'time', (i) => i.kind === 'minToHours', { tries: 1, lastMis: 'regroupMinutes' });
const sig = find('chem', 'chem', 'sigfigs', (i) => i.params.mode === 'density', { predict: 'bigger', tries: 1, lastMis: 'sigTooMany', hintLevel: 2 });
const mole = find('chem', 'chem', 'mole', (i) => i.params.mode === 'massToParticles', { predict: 'bigger', tries: 2, answered: true, correct: false, revealed: true, lastMis: 'moleSkippedStep' });
const ladderItem = find('ladder', 'b8', null, (i) => i.params.places >= 3, { predict: 'bigger', tries: 1, lastMis: 'ladderWrongWay', hintLevel: 3 });
const compare = C.makeCompareItem('b45', 4);
const CASES = [
  { name: 'ladder explorer and practice', state: { unitConvert: { tab: 'ladder', ladder: { base: 'g', start: 'kilo', at: 'milli', draft: '1.25' }, ladderItem } } },
  { name: 'ladder dark, grade 9-12', state: { unitConvert: { tab: 'ladder', ladderItem } }, overrides: Object.assign({ gradeBand: 'g912' }, DARK) },
  { name: 'elapsed time with number line', state: { unitConvert: { tab: 'everyday', dayItem: elapsed } } },
  { name: 'hours and minutes dark, named mistake', state: { unitConvert: { tab: 'everyday', dayItem: minToHours } }, overrides: DARK },
  { name: 'chemistry significant figures', state: { unitConvert: { tab: 'chem', chemItem: sig } } },
  { name: 'chemistry dark, revealed mole chain', state: { unitConvert: { tab: 'chem', chemItem: mole } }, overrides: DARK },
  { name: 'benchmark comparison answered', state: { unitConvert: { tab: 'estimate', estimate: { item: compare, choice: 1 - compare.correctIndex, right: false, done: true } } } },
  { name: 'estimate first wrong, dark', state: { unitConvert: { tab: 'estimate', estimate: { item: C.makeEstimateItem('b45', 5), choice: null, wrong: [C.makeEstimateItem('b45', 5).correct * 10], done: false, mis: 'estTooBig' } } }, overrides: DARK },
  { name: 'convert dark with models', state: { unitConvert: { tab: 'convert', category: 'length', value: 3, fromUnit: 'ft', toUnit: 'in', pinnedConversions: [{ key: 'length_ft_in', from: 'ft', to: 'in', category: 'length' }], history: [{ from: '1 ft', to: '12 in' }] } }, overrides: DARK },
  { name: 'temperature dark', state: { unitConvert: { tab: 'convert', category: 'temperature', value: 20, fromUnit: '°C', toUnit: 'K' } }, overrides: DARK },
  { name: 'table dark', state: { unitConvert: { tab: 'table', category: 'volume', value: 2, fromUnit: 'L', toUnit: 'mL' } }, overrides: DARK },
  { name: 'practice dark, revealed', state: { unitConvert: { tab: 'quiz', quiz: practice('b8', 'area', { predict: 'bigger', tries: 2, answered: true, correct: false, revealed: true, lastMis: 'linearForArea' }) } }, overrides: DARK },
  { name: 'word problem dark', state: { unitConvert: { tab: 'wordproblem', category: 'volume', fromUnit: 'gal', toUnit: 'L', wordProblem: C.makeOfflineWordProblem('volume', 'gal', 'L', 3), wordProblemHintLevel: 2, wordProblemFeedback: 'Not yet. Check that the starting unit cancels and the requested unit remains.' } }, overrides: DARK },
  { name: 'compare scales dark', state: { unitConvert: { tab: 'magHunt', magHunt: { sourceExp: -3, targetExp: 9, stuckRevealed: true, log: [{ s: 0, t: 3, m: 'small' }] } } }, overrides: DARK },
  { name: 'factor chain dark, error', state: { unitConvert: { tab: 'chain', chain: { from: 'm²', to: 'cm²', valueDraft: '2', steps: [{ topN: '100', topU: 'cm', botN: '1', botU: 'm', pow: 1 }], result: { ok: false, code: 'needPower', remaining: 'm·cm' } } } }, overrides: DARK },
  { name: 'teacher panel dark', state: { unitConvert: { tab: 'chem', misTally: { sigTooFew: 2, hundredMinutes: 1 }, missed: [{ id: 'x', kind: 'minToHours', q: 'Write 150 minutes as hours and minutes.', a: 150, aText: '2 h 30 min', unit: 'min', answer: '1:50', mis: 'hundredMinutes', outcome: 'fixed', ts: 1 }] } }, overrides: Object.assign({ isTeacherMode: true }, DARK) },
  { name: 'German number format', state: { unitConvert: { tab: 'convert', category: 'weight', value: 1234.5, fromUnit: 'g', toUnit: 'kg' } }, overrides: { lang: 'German' } }
];

describe('Unit Converter stage B: WCAG in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow and text spacing', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(FILE, 'unitConvert');
      const theme = themeFor(testCase);
      const rendered = prepareStemBrowserRender(renderTool('unitConvert', testCase.state, Object.assign({}, testCase.overrides || {}, testCase.overrides && (testCase.overrides.isDark || testCase.overrides.isContrast) ? { theme } : {})));
      window.__UnitConvertCore.setNumberLocale('en');
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const themed = testCase.overrides && (testCase.overrides.isDark || testCase.overrides.isContrast);
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root" class="' + (themed ? 'theme-' + (theme === 'light' ? 'default' : theme) : '') + '">' + hostMarkup(testCase, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      if (themed) for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      // The dark surface is really dark (not the host's light card).
      if (theme === 'dark') {
        const bg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-unitconvert-root]')).backgroundColor);
        expect(bg).toBe('rgb(15, 23, 42)');
      }
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { for (const animation of document.getAnimations()) animation.cancel(); document.querySelectorAll('details').forEach((el) => { el.open = true; }); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 200), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders, null, 2)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
