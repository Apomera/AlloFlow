import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table stage C (2026-11-03): the sieve cells and the fluency
// climb get their own dark and high-contrast palettes. Each state is audited
// with axe in Chromium inside the HOST's theme wrapper: dark puts the tool on
// the hub's light surface card, high contrast uses the hub's own remap rules
// (read from stem_lab_module.js, not copied), and the palettes are asserted
// from computed styles so a panel that stays light in dark mode fails.

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';

// The hub's theme override rules, evaluated from its source.
const hubSrc = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
function hubRules(startRe, endMarker) {
  const m = startRe.exec(hubSrc);
  const b = m ? hubSrc.indexOf(endMarker, m.index) : -1;
  if (!m || b < 0) throw new Error('hub theme block not found: ' + startRe);
  // eslint-disable-next-line no-new-func
  return new Function('return [' + hubSrc.slice(m.index + m[0].length, b) + '];')();
}
const HC_RULES = hubRules(/\} else if \(isContrast\) \{\s*s\.textContent = \[/, '].join(');
const DARK_RULES = hubRules(/if \(isDark\) \{\s*s\.textContent = \[/, '].map(function (rule) {').map((rule) => {
  const brace = rule.indexOf('{');
  return rule.slice(0, brace).split(',').map((sel) => sel.trim() + ':not([data-stem-tool-surface]:not([data-stem-dark-remap]) *)').join(', ') + ' ' + rule.slice(brace);
});
const THEME_VARS = ':root{--allo-stem-canvas:#f8fafc;--allo-stem-text:#0f172a}.theme-dark{--allo-stem-canvas:#0f172a;--allo-stem-text:#e2e8f0}.theme-contrast{--allo-stem-canvas:#000000;--allo-stem-text:#ffff00}';

function page(html, theme) {
  const shell = (inner) => '<div data-stem-tool-shell="multtable" data-stem-basic-math="true" data-stem-theme="' + theme + '" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text);padding:' + (theme === 'dark' ? 10 : 0) + 'px">' + inner + '</div>';
  const body = theme === 'dark'
    ? shell('<div data-stem-tool-surface="multtable" style="background:#ffffff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div>')
    : shell(html);
  const cls = theme === 'dark' ? 'theme-dark' : theme === 'contrast' ? 'theme-contrast' : '';
  const hubCss = theme === 'dark' ? DARK_RULES.join('\n') : theme === 'contrast' ? HC_RULES.join('\n') : '';
  return '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style><style>' + THEME_VARS + hubCss +
    '</style></head><body><main id="tool-root" data-stem-lab="true" class="' + cls + '">' + body + '</main></body></html>';
}

const sieveMid = { n: 100, crossed: { 1: true, 4: true, 6: true }, primes: { 2: true }, phase: 'cross', p: 2, hits: 2, need: 49, done: false };
const sieveDone = { n: 30, crossed: { 1: true, 4: true, 6: true, 8: true, 9: true, 10: true, 12: true, 14: true, 15: true, 16: true, 18: true, 20: true, 21: true, 22: true, 24: true, 25: true, 26: true, 27: true, 28: true, 30: true }, primes: { 2: true, 3: true, 5: true, 7: true, 11: true, 13: true, 17: true, 19: true, 23: true, 29: true }, phase: 'done', p: 5, hits: 0, need: 0, done: true };
const round = [{ a: 7, b: 8, mode: 'mult' }, { a: 6, b: 9, mode: 'div', divisor: 6 }, { a: 3, b: 4, mode: 'mult' }];
const fluPlay = { round, i: 2, results: [{ a: 7, b: 8, mode: 'mult', first: true, ok: true }, { a: 6, b: 9, mode: 'div', divisor: 6, first: true, ok: true }], tries: 2, lastWrong: 7, mistake: { kind: 'added', given: 7, a: 3, b: 4 }, phase: 'play', resolved: false, comeBack: [] };
const fluDone = { round, i: 2, results: [{ a: 7, b: 8, mode: 'mult', first: false, ok: false }, { a: 6, b: 9, mode: 'div', divisor: 6, first: true, ok: true }, { a: 3, b: 4, mode: 'mult', first: true, ok: true }], tries: 0, phase: 'done', resolved: false, comeBack: [] };

const THEME_CTX = { dark: { isDark: true, theme: 'dark' }, contrast: { isContrast: true, theme: 'contrast' } };
const CASES = [];
for (const theme of ['dark', 'contrast']) {
  CASES.push({ name: 'sieve mid-cross (100), ' + theme, theme, lab: { _multExt: { mtTab: 'factors', sieve: sieveMid, sieveFb: { kind: 'crossed', n: 6, p: 2, k: 3 } } }, check: 'sieve' });
  CASES.push({ name: 'sieve done, ' + theme, theme, lab: { _multExt: { mtTab: 'factors', sieve: sieveDone, sieveFb: { kind: 'finished', p: 7, sq: 49, n: 30, count: 10 } } }, check: 'sieve' });
  CASES.push({ name: 'fluency climb with a rung-2 hint, ' + theme, theme, lab: { _multExt: { mtTab: 'fluency', flu: fluPlay } }, check: 'climb' });
  CASES.push({ name: 'fluency round done, ' + theme, theme, lab: { _multExt: { mtTab: 'fluency', flu: fluDone } }, check: 'climb' });
}
CASES.push({ name: 'start-here path, all steps open, contrast', theme: 'contrast', lab: { _multExt: { mtTab: 'factors', pathOpen: true, visualExplored: { '2x3': true }, modeCorrect: { div: 10 } } }, check: 'path' });
CASES.push({ name: 'start-here path, all steps open, dark', theme: 'dark', lab: { _multExt: { mtTab: 'practice', pathOpen: true, modeCorrect: { div: 10 } } } });
// High contrast across the other tabs (the tool-wide data-mt-hc rules), with a hint ladder open where a tab has one.
const share = { type: 'groups_share', a: 4, b: 6, p: 24, vals: { p: 24, a: 4 }, steps: [{ l: 24, op: 'div', r: 4, v: 6 }], ops: ['div'], answer: 6, variant: 1, id: 'w', options: [['mul'], ['div'], ['add'], ['sub']] };
CASES.push({ name: 'practice with a rung-2 hint and the teacher panel, contrast', theme: 'contrast', lab: { _multExt: { mtTab: 'practice', showHeatmap: true, factScores: { '7x8': { attempts: 2, correct: 1 } } } },
  ctx: { isTeacherMode: true, multTableChallenge: { a: 7, b: 8, mode: 'mult', source: 'tool', id: 'h1' }, multTableFeedback: { correct: false, retry: true, tries: 2, forKey: 'h1', lastWrong: 63, mistake: { kind: 'neighbour' } } } });
CASES.push({ name: 'arrays tab, contrast', theme: 'contrast', lab: { _multExt: { mtTab: 'visual' } } });
CASES.push({ name: 'patterns tab, contrast', theme: 'contrast', lab: { _multExt: { mtTab: 'patterns', patternId: 'nines' } } });
CASES.push({ name: 'word problem with a rung-2 hint, contrast', theme: 'contrast', lab: { _multExt: { mtTab: 'words', wp: { item: share, phase: 'solve', opTries: 1, opWrong: [], step: 0, ansTries: 2, lastWrong: 24, ansMistake: { kind: 'product', given: 24, d: 4, p: 24 }, solved: [] } } } });

const lum = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('Multiplication Table stage-C palettes in a real browser (host theme wrapper)', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  it('reads the hub\'s theme rules from source', () => {
    expect(HC_RULES.length).toBeGreaterThan(10);
    expect(HC_RULES.some((r) => r.includes('.bg-white') && r.includes('#000000'))).toBe(true);
    expect(DARK_RULES.length).toBeGreaterThan(10);
  });

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, has its own palette, and reflows at 320px', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((s) => s.remove());
      loadTool(FILE, 'multtable');
      const rendered = prepareStemBrowserRender(renderTool('multtable', {}, Object.assign({ labToolData: testCase.lab, gradeLevel: '4th Grade' }, THEME_CTX[testCase.theme], testCase.ctx || {})));
      const pg = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      await pg.setContent(page(rendered.html, testCase.theme), { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await pg.addStyleTag({ content: css });
      await pg.addScriptTag({ content: axeSource });
      await pg.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); document.querySelectorAll('details').forEach((d) => { d.open = true; }); });
      const audit = await pg.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const probe = await pg.evaluate(() => {
        const cs = (el) => (el ? getComputedStyle(el) : null);
        const pick = (sel) => { const s = cs(document.querySelector(sel)); return s ? { bg: s.backgroundColor, fg: s.color, bd: s.borderTopColor } : null; };
        return {
          sieve: pick('[data-mt-sieve]'), open: pick('[data-sv-state="open"]'), prime: pick('[data-sv-state="prime"]'), crossed: pick('[data-sv-state="crossed"]'),
          fluency: pick('[data-mt-fluency]'), up: pick('[data-mt-climb-step="up"]'), down: pick('[data-mt-climb-step="down"]'),
          ladder: pick('[data-mt-hint-ladder]'), path: pick('[data-mt-path]'),
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        };
      });
      await pg.close();
      if (process.env.MT_AXE_DUMP && violations.length) fs.appendFileSync(process.env.MT_AXE_DUMP, testCase.name + '\n' + JSON.stringify(violations) + '\n');
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(probe.sw).toBeLessThanOrEqual(probe.cw);
      const dark = testCase.theme === 'dark';
      const panelBg = dark ? 'rgb(15, 23, 42)' : 'rgb(0, 0, 0)';
      if (testCase.check === 'sieve') {
        expect(probe.sieve.bg).toBe(panelBg);
        for (const k of ['open', 'prime', 'crossed']) {
          if (!probe[k]) continue;
          expect(lum(probe[k].bg), k + ' cell must not stay light').toBeLessThan(0.1);
          expect(ratio(probe[k].fg, probe[k].bg), k + ' text').toBeGreaterThanOrEqual(4.5);
          expect(ratio(probe[k].bd, panelBg), k + ' edge').toBeGreaterThanOrEqual(3);
        }
        expect(probe.prime.bd).toBe(dark ? 'rgb(74, 222, 128)' : 'rgb(255, 255, 0)');
      }
      if (testCase.check === 'climb') {
        expect(probe.fluency.bg).toBe(panelBg);
        expect(ratio(probe.up.bg, panelBg), 'climbed step').toBeGreaterThanOrEqual(3);
        expect(ratio(probe.up.bg, probe.down.bg), 'climbed vs not yet').toBeGreaterThanOrEqual(3);
        expect(ratio(probe.down.bd, panelBg), 'step outline').toBeGreaterThanOrEqual(3);
        if (probe.ladder && !dark) expect(probe.ladder.bg).toBe('rgb(0, 0, 0)');
      }
      if (testCase.check === 'path') expect(probe.path.bg).toBe('rgb(0, 0, 0)');
    }, 40000);
  }
});
