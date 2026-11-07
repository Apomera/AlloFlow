import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Engagement pass (2026-11-04): the topic bar with its Topics menu or detail
// popover open, and the first-race card in each stage, audited with axe at
// 320 px in light, dark and high contrast. The DOM comes from a real mount
// after the learner's clicks, so the opened panels are what gets audited.
const FILE = process.env.HEATLAB_SRC || 'stem_lab/stem_tool_heatlab.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const appStylesSource = fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8');
if (!(window.AlloModules && window.AlloModules.AppStyles)) Function('window', appStylesSource)(window);
const runtimeAppCssSheets = extractReactSsrStyles(
  ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null)),
).cssSheets;
const stemThemeCss = `
  :root, .theme-default { --allo-stem-canvas: #ffffff; --allo-stem-text: #0f172a; }
  .theme-dark { --allo-stem-canvas: #0f172a; --allo-stem-text: #e2e8f0; }
  .theme-contrast { --allo-stem-canvas: #000000; --allo-stem-text: #ffff00; }
  #tool-root { background: var(--allo-stem-canvas); color: var(--allo-stem-text); min-height: 100vh; }
`;

const STATES = [
  { name: 'Topics menu open, guess picked', data: { _heatLab: { firstRace: { a: 'copper', b: 'wood', pick: 'b', stage: 'predict' } } },
    clicks: ['[data-ht-topics-btn]'], marks: ['data-ht-topic-menu', 'data-ht-fr-start', 'aria-current="true"'] },
  { name: 'detail popover open, race running', data: { _heatLab: { raceOn: true, matId: 'copper', matBId: 'wood', timeScale: 'auto', firstRace: { a: 'copper', b: 'wood', pick: 'a', stage: 'racing' } } },
    clicks: ['[data-ht-settings-btn]'], marks: ['data-ht-settings', 'data-ht-level-btn', 'data-ht-fr-speed', 'data-ht-speed-note'] },
  { name: 'race judged, wrong guess', data: { _heatLab: { raceOn: true, matId: 'copper', matBId: 'wood', firstRace: { a: 'copper', b: 'wood', pick: 'b', stage: 'done', winner: 'a', correct: false, reachA: 22.5, reachB: 22224 } } },
    clicks: [], marks: ['data-ht-fr-result="wrong"', 'data-ht-fr-next', 'data-ht-pager'] },
];
const THEMES = [
  { name: 'light', overrides: { theme: 'light', isDark: false, isContrast: false }, cls: 'theme-default' },
  { name: 'dark', overrides: { theme: 'dark', isDark: true, isContrast: false }, cls: 'theme-dark' },
  { name: 'contrast', overrides: { theme: 'contrast', isDark: false, isContrast: true }, cls: 'theme-contrast' },
];

function mountedHtml(state, theme) {
  resetStemLab();
  document.head.querySelectorAll('style').forEach((style) => style.remove());
  window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return new Proxy({ canvas: this, measureText: (s) => ({ width: String(s).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
      { get: (target, key) => (key in target ? target[key] : () => {}) });
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  const cfg = loadTool(FILE, 'heatLab');
  const host = document.createElement('div');
  document.body.appendChild(host);
  let rootNode;
  function Panel() {
    const [toolData, setToolData] = React.useState(state.data);
    return cfg.render(makeCtx(Object.assign({ toolData, setToolData, gradeBand: 'g68' }, theme.overrides)));
  }
  React.act(() => { rootNode = ReactDOMClient.createRoot(host); rootNode.render(React.createElement(Panel)); });
  state.clicks.forEach((sel) => {
    const el = host.querySelector(sel);
    expect(el, sel).toBeTruthy();
    React.act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  });
  const html = host.innerHTML;
  React.act(() => rootNode.unmount());
  host.remove();
  return html;
}

describe('Heat Lab engagement panels in a real browser', () => {
  let browser, previousAct;
  beforeAll(async () => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    browser = await chromium.launch({ headless: true });
  });
  afterAll(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; if (browser) await browser.close(); }, 30000);
  afterEach(() => { vi.restoreAllMocks(); });

  for (const st of STATES) for (const th of THEMES) {
    it(st.name + ', ' + th.name + ': WCAG A/AA, 320 px reflow, 24 px targets', async () => {
      const rendered = prepareStemBrowserRender(mountedHtml(st, th));
      st.marks.forEach((mark) => expect(rendered.html, mark).toContain(mark));
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]|\{[a-z0-9]+\}/);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + th.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const layout = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll('#tool-root *')]
          .map((el) => ({ el: el.tagName + '.' + String(el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))
          .filter((x) => x.right > cw + 1).slice(0, 6);
        // The new primary controls: 44 px tall.
        const small = [...document.querySelectorAll('[data-ht-topics-btn],[data-ht-settings-btn],[data-ht-fr-start],[data-ht-fr-next],[data-ht-pager] button,[data-ht-fr-opt],[data-ht-all-topics]')]
          .filter((el) => el.getClientRects().length)
          .map((el) => { const r = el.getBoundingClientRect(); return { el: el.outerHTML.slice(0, 80), h: Math.round(r.height), w: Math.round(r.width) }; })
          .filter((x) => x.h < 44 || x.w < 44);
        // The sticky bar is static on a phone.
        const bar = document.querySelector('[data-ht-topicbar]');
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth: cw, offenders, small, barPos: getComputedStyle(bar).position };
      });
      const violations = audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data })),
      }));
      expect.soft(violations).toEqual([]);
      expect.soft(layout.scrollWidth, JSON.stringify(layout.offenders)).toBeLessThanOrEqual(layout.clientWidth);
      expect.soft(layout.small).toEqual([]);
      expect.soft(layout.barPos).toBe('static');
      await page.close();
    }, 90000);
  }
});
