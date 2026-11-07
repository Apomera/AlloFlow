import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Multiplication Table engagement build (2026-11-04): the new first screens are
// audited with axe in Chromium inside the HOST's theme wrapper, as the stage C
// suite does: dark puts the tool on the hub's light surface card with the hub's
// dark rules, high contrast uses the hub's own remap rules (read from
// stem_lab_module.js, not copied). Covers the one-choice Practice setup, the
// K-2 live array (total "?") and the built array with skip-count row buttons.

const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const FILE = process.env.MULTTABLE_DEEP_SRC || 'stem_lab/stem_tool_multtable.js';

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

const THEME_CTX = { light: {}, dark: { isDark: true, theme: 'dark' }, contrast: { isContrast: true, theme: 'contrast' } };
const CASES = [];
for (const theme of ['light', 'dark', 'contrast']) {
  CASES.push({ name: 'grade 4 Practice first screen (one choice), ' + theme, theme, grade: '4th Grade', lab: {}, check: 'practice' });
  CASES.push({ name: 'K-2 live array before the build, ' + theme, theme, grade: '1st Grade', lab: {}, check: 'live' });
  CASES.push({ name: 'K-2 built array with skip-count rows, ' + theme, theme, grade: '1st Grade', lab: { _multExt: { visualA: 3, visualB: 5, visualPred: { key: '3x5', built: true, committed: 15 } } }, check: 'built' });
}

const lum = (rgb) => {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('Multiplication Table engagement screens in a real browser (host theme wrapper)', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA and reflows at 320px', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((s) => s.remove());
      loadTool(FILE, 'multtable');
      const rendered = prepareStemBrowserRender(renderTool('multtable', {}, Object.assign({ labToolData: testCase.lab, gradeLevel: testCase.grade }, THEME_CTX[testCase.theme])));
      const pg = await browser.newPage({ viewport: { width: 320, height: 900 } });
      await pg.emulateMedia({ reducedMotion: 'reduce' });
      await pg.setContent(page(rendered.html, testCase.theme), { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await pg.addStyleTag({ content: css });
      await pg.addScriptTag({ content: axeSource });
      await pg.evaluate(() => { for (const a of document.getAnimations()) a.cancel(); });
      const audit = await pg.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data ? { fg: n.any[0].data.fgColor, bg: n.any[0].data.bgColor, ratio: n.any[0].data.contrastRatio } : undefined })) }));
      const probe = await pg.evaluate(() => {
        const box = (sel) => { const n = document.querySelector(sel); if (!n) return null; const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return { w: r.width, h: r.height, fg: s.color, bg: s.backgroundColor, bd: s.borderTopColor }; };
        const rows = [...document.querySelectorAll('[data-mt-skiprow]')].map((n) => n.getBoundingClientRect().height);
        return {
          radio: box('[data-mt-band] [role="radio"][aria-checked="true"]'), toggle: box('[data-mt-setup-toggle]'), quiz: box('button[aria-label="Quick Quiz"]'),
          liveTotal: (document.querySelector('[data-mt-live-total]') || {}).textContent || null,
          liveDots: document.querySelectorAll('[data-mt-live-array] .allo-mt-dot').length, rows,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        };
      });
      await pg.close();
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(probe.sw).toBeLessThanOrEqual(probe.cw);
      if (testCase.check === 'practice') {
        expect(probe.radio).toBeTruthy();
        expect(probe.toggle.h).toBeGreaterThanOrEqual(24);
        expect(probe.quiz.h).toBeGreaterThanOrEqual(44);
        expect(ratio(probe.toggle.fg, probe.toggle.bg === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : probe.toggle.bg), 'toggle text').toBeGreaterThanOrEqual(4.5);
      }
      if (testCase.check === 'live') {
        expect(probe.liveTotal).toBe('2 × 5 = ?');
        expect(probe.liveDots).toBe(10);
      }
      if (testCase.check === 'built') {
        expect(probe.rows).toHaveLength(3);
        for (const h of probe.rows) expect(h, 'row target height').toBeGreaterThanOrEqual(44);
      }
    }, 40000);
  }
});
