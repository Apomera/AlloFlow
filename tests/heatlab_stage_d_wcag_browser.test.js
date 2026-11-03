import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMClient, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { extractReactSsrStyles, prepareStemBrowserRender } from './helpers/stem_widgets_smoke_harness.js';

// Stage D panels (detail level bar, vocabulary pop-overs, "Show the maths",
// "Go further", the hear / describe / read-aloud rows with descriptions open,
// the passive house designer after a test with a saved design, and the teacher
// panel with its answer key and NGSS map) audited with axe at 320 px in light,
// dark and high contrast. The DOM comes from a real mount after the learner's
// clicks, so the opened disclosures are what gets audited.
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

const HOUSE = {
  hsWall: 'super', hsRoofMm: 300, hsFloor: 'pir100', hsGlazing: 'triple', hsWinS: 16, hsWinE: 2, hsWinW: 2, hsWinN: 2, hsAir: 'tight', hsTouched: true, hsBadge: true,
  hsTest: { design: { wall: 'super', roofMm: 300, floor: 'pir100', glazing: 'triple', winS: 16, winE: 2, winW: 2, winN: 2, air: 'tight', mvhr: false }, meets: true },
  hsSaved: [{ design: { wall: 'cavity' }, kwhM2: 232, cost: 17520, co2: 8562, meets: false }, { design: { wall: 'super', roofMm: 300, floor: 'pir100', glazing: 'triple', air: 'tight' }, kwhM2: 40, cost: 33490, co2: 12862, meets: true }],
  wallStack: ['brick', 'mineral', 'block', 'plaster'], hsWhy: 'Triple glazing mattered most.',
};
const STATES = [
  { name: 'teacher view, grades 6-8', overrides: { isTeacherMode: true, gradeBand: 'g68' },
    data: { _heatLab: Object.assign({ teacher: { open: true, keyOpen: true, ngssOpen: true, hidden: ['spot'], locked: ['cooler'], preset: 'custom' }, misTally: { cold_flows: 2 } }, HOUSE) },
    clicks: ['[data-ht-term="degreedays"]', '[data-ht-describe="house"]', '[data-ht-describe="mug"]', '[data-ht-maths="house"] button', '[data-ht-further-btn="entropy"]'] },
  { name: 'learner, grades 9-12 with a locked section', overrides: { gradeBand: 'g912' },
    data: { _heatLab: Object.assign({ teacher: { hidden: ['spot'], locked: ['cooler'] } }, HOUSE) },
    clicks: ['[data-ht-term="latent"]', '[data-ht-describe="curve"]', '[data-ht-describe="equilibrium"]', '[data-ht-describe="race"]'] },
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
  const cfg = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab');
  const host = document.createElement('div');
  document.body.appendChild(host);
  let rootNode;
  function Panel() {
    const [toolData, setToolData] = React.useState(state.data);
    return cfg.render(makeCtx(Object.assign({ toolData, setToolData }, theme.overrides, state.overrides)));
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

describe('Heat Lab stage D panels in a real browser', () => {
  let browser, previousAct;
  beforeAll(async () => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    browser = await chromium.launch({ headless: true });
  });
  afterAll(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; if (browser) await browser.close(); }, 30000);
  afterEach(() => { vi.restoreAllMocks(); });

  for (const st of STATES) for (const th of THEMES) {
    it(st.name + ', ' + th.name + ': WCAG A/AA and 320 px reflow with the stage D panels open', async () => {
      const rendered = prepareStemBrowserRender(mountedHtml(st, th));
      ['data-ht-level=', 'data-ht-vocab-def', 'data-ht-desc=', 'data-ht-house-brief', 'data-ht-house-ua', 'data-ht-house-months', 'data-ht-house-tested="pass"', 'data-ht-house-compare', 'data-ht-access=']
        .forEach((mark) => expect(rendered.html, mark).toContain(mark));
      if (st.overrides.isTeacherMode) {
        ['data-ht-teacher=', 'data-ht-teacher-key', 'data-ht-teacher-ngss', 'data-ht-teacher-note', 'data-ht-plain', 'data-ht-further=', 'id="ht-maths-house"']
          .forEach((mark) => expect(rendered.html, mark).toContain(mark));
      } else {
        ['data-ht-locked="cooler"', 'data-ht-derive=']
          .forEach((mark) => expect(rendered.html, mark).toContain(mark));
        expect(rendered.html).not.toContain('id="htsec-spot"');
      }
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]|\{[a-z0-9]+\}/);

      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
        '<body><main id="tool-root" class="' + th.cls + '">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: appCss });
      for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      await page.addStyleTag({ content: stemThemeCss });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      }));
      const reflow = await page.evaluate(() => {
        const cw = document.documentElement.clientWidth;
        const inScroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { if (p.getAttribute('role') === 'region' && /auto|scroll/.test(getComputedStyle(p).overflowX)) return true; } return false; };
        const offenders = [...document.querySelectorAll('#tool-root *')]
          .filter((el) => !inScroller(el))
          .map((el) => ({ el: el.tagName + '.' + String(el.className).slice(0, 60), right: Math.round(el.getBoundingClientRect().right) }))
          .filter((x) => x.right > cw + 1).slice(0, 6);
        return { scrollWidth: document.documentElement.scrollWidth, clientWidth: cw, offenders };
      });
      const violations = audit.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data })),
      }));
      expect.soft(violations).toEqual([]);
      expect.soft(reflow.scrollWidth, JSON.stringify(reflow.offenders)).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(reflow.offenders).toEqual([]);
      await page.close();
    }, 90000);
  }
});
