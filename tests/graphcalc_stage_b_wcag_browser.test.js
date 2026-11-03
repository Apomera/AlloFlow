import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab, extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Graphing Calculator stage B panels (rate of change, key features, inverse, piecewise,
// data and regression with residuals, task hint ladders and worked examples, teacher tools)
// audited at 320 px in light, dark and high contrast, the way skatelab_stage_b_wcag_browser does.
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file))), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', appStylesSource)(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null))).cssSheets;
const stemThemeCss = `
  :root, .theme-default { --allo-stem-canvas: #ffffff; --allo-stem-text: #0f172a; }
  .theme-dark { --allo-stem-canvas: #0f172a; --allo-stem-text: #e2e8f0; }
  .theme-contrast { --allo-stem-canvas: #000000; --allo-stem-text: #ffff00; }
  #tool-root { background: var(--allo-stem-canvas); color: var(--allo-stem-text); min-height: 100vh; }
`;
function fakeMath() {
  return { compile(expr) {
    const js = String(expr).replace(/\^/g, '**').replace(/\blog10\(/g, 'Math.log10(').replace(/\b(sin|cos|tan|sqrt|abs|exp)\(/g, 'Math.$1(');
    const fn = new Function('x', 'a', 'b', 'c', 'return (' + js + ');'); // eslint-disable-line no-new-func
    return { evaluate: (s) => fn(s.x, s.a, s.b, s.c) };
  } };
}
const funcs = (list) => ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'].map((color, i) => ({ expr: list[i] || '', color }));
const KEY = JSON.stringify(['x^2 - 4', undefined, undefined, undefined, 1, 3]);
const PANELS = {
  funcs: funcs(['x^2 - 4', 'x']),
  roc: { on: true, pred: { key: KEY, choice: 'up' }, shown: KEY, guess: { key: KEY, text: '4' }, check: { key: KEY, ok: true }, hint: { key: KEY, level: 4 }, stepsOpen: true },
  kf: { on: true, key: JSON.stringify(['x^2 - 4', undefined, undefined, undefined, -10, 10]), revealed: { domain: true, range: true, inc: true, dec: true, ext: true, ends: true, asym: true }, preds: { domain: 'all x' } },
  inv: { on: true },
  pw: { on: true, pieces: [{ expr: 'x + 1', lo: '', hi: '1', loC: false, hiC: false }, { expr: '3 - x', lo: '1', hi: '', loC: true, hiC: false }, { expr: 'x', lo: '5', hi: '2' }] },
  data: { on: true, text: 'x, y\n1, 2\n2, 4\n3, 5\n4, 4\n5, 5\nbad', fit: 'linear', resid: true },
};
const CASES = [
  ['panels under the graph', { ...PANELS }, {}],
  ['task hints and worked examples', { funcs: funcs([]), tier: 'analyst', _sideTab: 'challenge', activeChallenge: 3, _challengePred: { 3: 'a' }, _chHints: { 3: 4 }, we: { kind: 'zeros', index: 2, shown: 5, opened: { 3: true }, yours: { 3: 'x = 1' } } }, {}],
  ['teacher tools', { funcs: funcs(['x']), _sideTab: 'teacher', assignedChallenges: [7], _challengesDone: [0] }, { isTeacherMode: true }],
];
const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Graphing Calculator stage B panels in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    for (const [name, state, extra] of CASES) {
      it(theme.name + ' / ' + name + ': WCAG A/AA and 320 px reflow', async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        window.math = fakeMath();
        loadTool('stem_lab/stem_tool_graphcalc.js', 'graphCalc');
        const rendered = prepareStemBrowserRender(renderTool('graphCalc', { graphCalc: state }, { ...theme.overrides, ...extra }));
        delete window.math;
        if (name.startsWith('panels')) {
          for (const marker of ['data-rate-panel', 'data-features-panel', 'data-graphcalc-inverse="no"', 'data-graphcalc-piecewise', 'data-graphcalc-residuals', 'data-rate-steps-table']) expect(rendered.html).toContain(marker);
        } else if (name.startsWith('task')) {
          expect(rendered.html).toContain('data-hint-ladder="graphcalc-hints-3"');
          expect(rendered.html).toContain('data-worked-yours="shown"');
        } else expect(rendered.html).toContain('data-graphcalc-teacher');
        // Prose can say a function is undefined at a point; a value printed as undefined cannot.
        expect(rendered.html).not.toMatch(/NaN|\[object Object\]|="undefined"|>undefined</);

        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="tool-root" class="' + theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        await page.waitForTimeout(300);
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const reflow = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const scroller = (el) => !!el.closest('[role="region"][tabindex="0"]');
          const offenders = [...document.querySelectorAll('#tool-root *')].filter((el) => !scroller(el))
            .map((el) => ({ el: el.tagName + '.' + String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))
            .filter((x) => x.right > cw + 1).slice(0, 6);
          return { scrollWidth: document.documentElement.scrollWidth, clientWidth: cw, offenders };
        });
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data })) }));
        expect.soft(violations).toEqual([]);
        expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders)).toBeLessThanOrEqual(reflow.clientWidth);
        await page.close();
      }, 45000);
    }
  }
});
