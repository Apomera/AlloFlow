// Ratio Lab on a 320 px phone with a real touch context (2026-11-05): tape labels rendered at 5-7 px,
// because a 500-unit drawing was scaled to about 250 px. Sizes come from the browser.
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
const CASES = [
  ['the explorer tape', { mode: 'ratioTable', ratioA: 12, ratioB: 18, ratioFactor: 2 }, '[data-ratio-tape="ratio-tape-explorer"]'],
  ['the mixture mission tapes', { labView: 'missions', showGrade6Missions: true, missionTab: 'mixture', missions: { mixture: { seed: 5 } } }, '[data-ratio-mix-tapes]'],
  ['the percent tape', { mode: 'percent' }, '[data-percent-tape]'],
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
const measure = (page, sel) => page.evaluate((s) => {
  const fig = document.querySelector(s);
  if (!fig) return { missing: true };
  const svg = fig.querySelector('svg');
  const scale = svg.getScreenCTM().a;
  const box = svg.getBoundingClientRect();
  const texts = [...svg.querySelectorAll('text')].filter((t) => t.textContent.trim());
  const sizes = texts.map((t) => parseFloat(getComputedStyle(t).fontSize) * scale);
  const out = texts.filter((t) => { const r = t.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1; }).map((t) => t.textContent);
  return {
    svgWidth: box.width, scale, smallest: Math.min(...sizes), largest: Math.max(...sizes), texts: texts.length, outside: out,
    rects: svg.querySelectorAll('rect').length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  };
}, sel);

describe('tape labels on a 320 px phone', () => {
  beforeAll(async () => { browser = await chromium.launch(); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 60000);

  for (const [name, state, sel] of CASES) {
    it(name + ': labels read at 9 px or more, none is cut off, the page does not scroll sideways', async () => {
      const { context, page } = await open(state, 320, 640);
      const m = await measure(page, sel);
      console.log('ratios ' + name + ': ' + JSON.stringify(m));
      expect(m.missing).toBeUndefined();
      expect(m.texts).toBeGreaterThan(0);
      expect(m.smallest).toBeGreaterThanOrEqual(9);
      expect(m.outside).toEqual([]);
      expect(m.sw).toBeLessThanOrEqual(m.cw);
      await context.close();
    }, 90000);
  }

  it('the mixture share comparison, once it shows, stays readable and inside the drawing', async () => {
    const { context, page } = await open({ labView: 'missions', showGrade6Missions: true, missionTab: 'mixture', missions: { mixture: { seed: 5, solved: { compare: true } } } }, 320, 640);
    const m = await measure(page, '[data-ratio-mix-tapes]');
    console.log('ratios mix shares: ' + JSON.stringify(m));
    expect(await page.evaluate(() => document.querySelector('[data-ratio-mix-tapes] desc').textContent)).toContain('of the whole');
    expect(m.smallest).toBeGreaterThanOrEqual(9);
    expect(m.outside).toEqual([]);
    // The sentence that does not fit the drawing is still there, as text above it.
    expect(await page.evaluate(() => document.querySelector('[data-ratio-mix-tapes]').textContent)).toContain('Each mix stretched to the same length');
    await context.close();
  }, 90000);

  for (const [name, state, sel] of CASES) {
    it(name + ': a 1280 px screen keeps the full-width drawing', async () => {
      const { context, page } = await open(state, 1280, 800);
      const m = await measure(page, sel);
      const vb = await page.evaluate((s) => document.querySelector(s).querySelector('svg').viewBox.baseVal.width, sel);
      expect(vb).toBe(500);
      expect(m.smallest).toBeGreaterThanOrEqual(8);
      await context.close();
    }, 90000);
  }
});
