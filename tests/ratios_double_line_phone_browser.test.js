// Ratio Lab's double number lines on real phone viewports (2026-11-05). Before: the explorer line read at 5.4 px at 320 and
// 6.9 px at 390; the problem line's scale label at 10 px, its hint at 8.7 px, the drawing scrolled sideways inside its card,
// and marks close together printed on top of each other at every width. Sizes come from the browser.
// RATIOS_DEEP_FILE points at another copy (fail-first checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const FILE = process.env.RATIOS_DEEP_FILE || 'stem_lab/stem_tool_ratios.js';
const toolSource = fs.readFileSync(path.resolve(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__mount = function(state) {
  var e = React.createElement;
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({ _ratioLab: state });
    window.__state = s[0]._ratioLab;
    return window.StemLab._registry.ratioLab.render({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function() {}, announceToSR: function() {}, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, gradeBand: 'g68', gradeLevel: '7th Grade' });
  }
  ReactDOM.createRoot(document.getElementById('app')).render(e(App));
};`;
const EXPLORER = 'svg[aria-labelledby^="ratio-line-title"]', MODEL = '[data-linked-ratio-line]';
const tickets = (rows, extra) => ({ mode: 'numberLine', modelBuild: { 'line-tickets': { rows, find: '8', touched: true } }, ...extra });
const CASES = [
  ['explorer, starting values', { mode: 'numberLine' }, EXPLORER],
  ['explorer, 8 intervals', { mode: 'numberLine', lineSteps: 8, lineTopUnit: 12, lineBottomUnit: 15 }, EXPLORER],
  ['explorer, 8 intervals of long numbers', { mode: 'numberLine', lineSteps: 8, lineTopUnit: 125.5, lineBottomUnit: 999.9 }, EXPLORER],
  ['explorer, values still hidden', { mode: 'numberLine', explorePredictFirst: true, lineSteps: 8, lineTopUnit: 125.5, lineBottomUnit: 1000 }, EXPLORER],
  ['problem line, empty table', { mode: 'numberLine' }, MODEL],
  ['problem line, the tickets table', tickets([['5', '15'], ['1', '3']]), MODEL],
  ['problem line, six close rows', tickets([['5', '15'], ['1', '3'], ['2', '6'], ['3', '9'], ['4', '12'], ['6', '18']]), MODEL],
  ['problem line, one row far away', tickets([['1', '3'], ['2', '6'], ['1000', '3000']]), MODEL],
  ['problem line, a long typed value', tickets([['123456789012', '3'], ['5', '15']]), MODEL],
];

let browser;
async function open(state, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 640, isMobile: width < 640, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main id="tool-root" class="theme-default"><div data-stem-tool-surface="true"><div id="app"></div></div></main></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.addScriptTag({ content: MOUNT });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate((s) => window.__mount(s), state);
  await page.waitForTimeout(350);
  return { context, page };
}
const moduleSrc = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
const a0 = moduleSrc.indexOf('window.AlloModules.StemLab = function StemLabModal(props) {');
const setters = [...new Set([...moduleSrc.slice(a0, moduleSrc.indexOf('} = props;', a0)).matchAll(/^\s+(set\w+),?$/gm)].map((m) => m[1]))];
async function openHost(state, theme) {
  const context = await browser.newContext({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main class="theme-' + theme + '" style="display:none"></main><div id="app"></div></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.evaluate(() => { window.__alloConfigureTrustedScript = (s, u) => { s.src = u; return s; }; });
  await page.addScriptTag({ path: path.join(root, 'app_styles_module.js') });
  await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_lab_module.js') });
  await page.evaluate(() => { window.__alloEnsureStemPluginLoaded = () => true; window.__alloGetStemPluginState = () => ({ status: 'loaded' }); });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate(([s, th, names]) => {
    const e = React.createElement, noop = () => {};
    const Icon = () => e('svg', { width: 16, height: 16, 'aria-hidden': 'true' });
    const S = {}; names.forEach((n) => { S[n] = noop; });
    function Host() {
      const tool = React.useState('ratioLab'), tab = React.useState('explore'), lab = React.useState({ _ratioLab: s }), snap = React.useState([]);
      const props = Object.assign({}, S, { ArrowLeft: Icon, Calculator: Icon, GripVertical: Icon, Sparkles: Icon, X: Icon, addToast: noop, t: () => undefined, theme: th, showStemLab: true, stemLabTab: tab[0], setStemLabTab: tab[1], stemLabTool: tool[0], setStemLabTool: tool[1], labToolData: lab[0], setLabToolData: lab[1], toolSnapshots: snap[0], setToolSnapshots: snap[1], gradeLevel: '7th Grade', isTeacherMode: false, isIndependentMode: false, isParentMode: false, inputText: '', sourceTopic: '' });
      return e('div', { className: 'min-h-screen flex flex-col theme-' + th }, e(window.AlloModules.AppStyles.AppStyles, {}), e(window.AlloModules.StemLab, props));
    }
    ReactDOM.createRoot(document.getElementById('app')).render(e(Host));
  }, [state, theme, setters]);
  await page.waitForTimeout(1800);
  return { context, page };
}
const measure = (page, sel) => page.evaluate((s) => {
  const svg = document.querySelector(s);
  if (!svg) return { missing: true };
  const scale = svg.getScreenCTM().a, box = svg.getBoundingClientRect();
  const list = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim()).map((t) => {
    const r = t.getBoundingClientRect();
    return { s: t.textContent, px: parseFloat(getComputedStyle(t).fontSize) * scale, l: r.left, r: r.right, t: r.top, b: r.bottom };
  });
  const overlaps = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5) overlaps.push(a.s + ' / ' + b.s);
  }
  const parent = svg.parentElement;
  return {
    smallest: +Math.min(...list.map((x) => x.px)).toFixed(2), texts: list.map((x) => x.s), overlaps, svgWidth: Math.round(box.width),
    outside: list.filter((x) => x.l < box.left - 0.5 || x.r > box.right + 0.5).map((x) => x.s),
    offScreen: list.filter((x) => x.l < -0.5 || x.r > innerWidth + 0.5).map((x) => x.s),
    sideways: parent.scrollWidth > parent.clientWidth + 1,
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  };
}, sel);

describe('double number lines on a phone', () => {
  beforeAll(async () => { browser = await chromium.launch(); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 60000);

  for (const width of [320, 390]) {
    for (const [name, state, sel] of CASES) {
      it(width + ' px, ' + name + ': 11 px or more, nothing overlaps, nothing is cut off', async () => {
        const { context, page } = await open(state, width, 760);
        const m = await measure(page, sel);
        console.log('ratios dnl ' + width + ' ' + name + ': ' + JSON.stringify({ smallest: m.smallest, overlaps: m.overlaps, outside: m.outside, sideways: m.sideways }));
        expect(m.missing).toBeUndefined();
        expect(m.smallest).toBeGreaterThanOrEqual(11);
        expect(m.overlaps).toEqual([]);
        expect(m.outside).toEqual([]);
        expect(m.offScreen).toEqual([]);
        expect(m.sideways, 'the drawing scrolls sideways in its card').toBe(false);
        expect(m.sw).toBeLessThanOrEqual(m.cw);
        await context.close();
      }, 90000);
    }
  }

  it('320 px: the hint after a check stays whole and readable', async () => {
    // Reach the checked state the way a student does.
    const { context, page } = await open(tickets([['5', '15'], ['1', '3']]), 320, 760);
    await page.locator('#ratio-challenge-answer').fill('18');
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.waitForSelector('[data-line-scaffold]');
    const m = await measure(page, MODEL);
    expect(await page.locator('[data-line-scaffold]').textContent()).toContain('$3');
    expect(m.smallest).toBeGreaterThanOrEqual(11);
    expect(m.overlaps).toEqual([]);
    expect(m.outside).toEqual([]);
    await context.close();
  }, 90000);

  it('a hidden value stays hidden at 320 px, in the drawing and in its description', async () => {
    const { context, page } = await open({ mode: 'numberLine', explorePredictFirst: true, lineSteps: 8, lineTopUnit: 3, lineBottomUnit: 7 }, 320, 760);
    const m = await measure(page, EXPLORER);
    for (const hidden of ['14', '28', '35', '42', '49', '56']) expect(m.texts, hidden).not.toContain(hidden);
    expect(m.texts).toContain('?');
    const desc = await page.locator('#ratio-line-desc').textContent();
    expect(desc).not.toContain('56');
    await context.close();
  }, 90000);

  it('a pair still lines up after labels step down: both numbers share a tick and a row', async () => {
    const { context, page } = await open(tickets([['1', '3'], ['2', '6'], ['1000', '3000']]), 320, 760);
    const pairs = await page.locator(MODEL).evaluate((svg) => {
      const at = (s) => { const n = [...svg.querySelectorAll('text')].find((t) => t.textContent === s); return [+n.getAttribute('x'), +n.getAttribute('y')]; };
      return { one: at('1'), three: at('3'), two: at('2'), six: at('6') };
    });
    expect(pairs.one[0]).toBe(pairs.three[0]);
    expect(pairs.two[0]).toBe(pairs.six[0]);
    expect(pairs.three[1] - pairs.one[1]).toBe(pairs.six[1] - pairs.two[1]);
    await context.close();
  }, 90000);

  // The real modal is narrower than a bare mount: host padding leaves 196 px in light and 156 px in dark at 320.
  for (const theme of ['default', 'dark', 'contrast']) {
    for (const [name, state, sel] of [CASES[2], CASES[3], CASES[5], CASES[7]]) {
      it('real host, ' + theme + ', 320 px, ' + name + ': 11 px or more, nothing overlaps, nothing is cut off', async () => {
        const { context, page } = await openHost(state, theme);
        const m = await measure(page, sel);
        console.log('ratios dnl host ' + theme + ' ' + name + ': ' + JSON.stringify({ w: m.svgWidth, smallest: m.smallest, overlaps: m.overlaps, outside: m.outside, sideways: m.sideways }));
        expect(m.missing).toBeUndefined();
        expect(m.smallest).toBeGreaterThanOrEqual(11);
        expect(m.overlaps).toEqual([]);
        expect(m.outside).toEqual([]);
        expect(m.sideways).toBe(false);
        expect(m.sw).toBeLessThanOrEqual(m.cw);
        await context.close();
      }, 120000);
    }
  }

  for (const [name, state, sel, vb] of [['explorer', { mode: 'numberLine' }, EXPLORER, '0 0 500 190'], ['problem line', tickets([['5', '15'], ['1', '3']]), MODEL, '0 0 360 220']]) {
    it(name + ': a 1280 px screen keeps its drawing', async () => {
      const { context, page } = await open(state, 1280, 800);
      expect(await page.locator(sel).getAttribute('viewBox')).toBe(vb);
      await context.close();
    }, 90000);
  }
});
