import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, loadTool, renderTool, resetStemLab, extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Function Grapher stage B: the mode bar and each stage (Explore with rate of change and key
// features open; Practice with a root question and its hint ladder, a transformation target and
// a faded worked example; Investigate; Teacher) audited at 320 px in light, dark and high contrast.
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
const BASE = { type: 'quadratic', a: 1, b: 0, c: -4, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, aiExplain: '', aiExplainLoading: false };
const RK = JSON.stringify(['quadratic', 1, 0, -4, 1, 3]);
const CASES = [
  ['explore: rate of change and key features', { ...BASE, fgStage: 'explore', roc: { on: true, pred: { key: RK, choice: 'up' }, shown: RK, guess: { key: RK, text: '4' }, check: { key: RK, ok: true }, hint: { key: RK, level: 4 }, stepsOpen: true }, kf: { on: true, key: JSON.stringify(['quadratic', 1, 0, -4]), revealed: { domain: true, range: true, inc: true, dec: true, ext: true, ends: true, asym: true }, preds: { range: 'y ≥ −4' } } }, {}],
  ['practice: root hints, target and worked example', { ...BASE, type: 'linear', a: 2, b: -4, c: 0, fgStage: 'practice', fgChallengeMode: 'root', fgQuiz: { mode: 'root', type: 'linear', a: 2, b: -4, c: 0, answer: 2, answers: [2], opts: [2, 0, 1, 4], answered: false, hint: 4 }, tf: { parent: 'x2', a: 1, b: 1, h: 2, k: 0 }, tfTarget: { key: 'y = (x − 2)² − 1', hintKey: 'y = (x − 2)² − 1', hint: 3 }, we: { kind: 'rate', index: 2, shown: 4, opened: { 2: true }, yours: { 2: 'dy = 7' } } }, {}],
  ['investigate', { ...BASE, fgStage: 'investigate' }, {}],
  ['teacher', { ...BASE, fgStage: 'teacher', tfTargets: [{ parent: 'abs', a: 2, b: 1, h: 1, k: 0 }], matchAssigned: ['lin_grow'], fgScore: 2 }, { isTeacherMode: true }],
];
const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

describe('Function Grapher stage B in a real browser', () => {
  let browser;
  beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
  afterAll(async () => { if (browser) await browser.close(); }, 30000);

  for (const theme of THEMES) {
    for (const [name, state, extra] of CASES) {
      it(theme.name + ' / ' + name + ': WCAG A/AA and 320 px reflow', async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((style) => style.remove());
        loadTool('stem_lab/stem_tool_funcgrapher.js', 'funcGrapher');
        const rendered = prepareStemBrowserRender(renderTool('funcGrapher', { funcGrapher: state }, { ...theme.overrides, ...extra }));
        expect(rendered.html).toContain('role="tablist"');
        if (name.startsWith('explore')) { expect(rendered.html).toContain('data-rate-panel'); expect(rendered.html).toContain('data-features-panel'); expect(rendered.html).toContain('data-funcgrapher-rate-overlay'); }
        if (name.startsWith('practice')) { expect(rendered.html).toContain('data-hint-ladder="fg-quiz-hints"'); expect(rendered.html).toContain('data-tf-target-card'); expect(rendered.html).toContain('data-worked-yours'); }
        if (name === 'teacher') expect(rendered.html).toContain('data-funcgrapher-teacher');
        // Prose can say a function is undefined at a point; a value printed as undefined cannot.
        expect(rendered.html).not.toMatch(/NaN|\[object Object\]|="undefined"|>undefined</);

        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="tool-root" class="' + theme.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        await page.addStyleTag({ content: appCss });
        for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
        await page.addStyleTag({ content: stemThemeCss });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.evaluate(() => { document.querySelectorAll('#tool-root details').forEach((details) => { details.open = true; }); });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        await page.waitForTimeout(300);
        await page.evaluate(() => { document.getAnimations().forEach((animation) => { try { animation.finish(); } catch (err) {} }); });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const reflow = await page.evaluate(() => {
          const cw = document.documentElement.clientWidth;
          const scroller = (el) => !!el.closest('[role="region"][tabindex="0"], .overflow-x-auto');
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
