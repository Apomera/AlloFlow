// Calculus hunt (2026-11-04): the a/b handles under a real touch stream in Chromium. Chromium ignores touch-action on
// an inline SVG <g>, so the browser took every touch drag for a pan and cancelled the pointer after about 16 px; a tap
// announced a move that never happened. CALCULUS_DEEP_FILE points at another copy (fail-first checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const FILE = process.env.CALCULUS_DEEP_FILE || 'stem_lab/stem_tool_calculus.js';
const toolSource = fs.readFileSync(path.resolve(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__sr = [];
window.__mount = function(state) {
  var e = React.createElement;
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({ calculus: state });
    window.__state = s[0].calculus;
    return window.StemLab._registry.calculus.render({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function() {}, announceToSR: function(m) { window.__sr.push(String(m)); }, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, gradeBand: 'g912', gradeLevel: '11th Grade' });
  }
  ReactDOM.createRoot(document.getElementById('app')).render(e(App));
};`;

let browser, context, page, cdp;
const at = () => page.evaluate(() => {
  const l = document.querySelector('[data-calc-bound-handle="xMax"] line').getBoundingClientRect(), a = document.querySelector('[data-calc-bound-handle="xMin"] line').getBoundingClientRect(), g = document.querySelector('svg[role="img"]').getBoundingClientRect();
  return { bx: l.left, ax: a.left, y: g.top + g.height / 2, a: window.__state.xMin, b: window.__state.xMax, scrollY: Math.round(scrollY), sr: window.__sr.slice() };
});
async function swipe(x, y, dx, dy, steps) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * k, y: y + dy * k }] }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
}
const centre = async () => { await page.evaluate(() => document.querySelector('svg[role="img"]').scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(120); };

describe('the a/b handles on a touch screen', () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true });
    page = await context.newPage();
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="app" style="padding:12px"></div></body></html>');
    await page.addStyleTag({ content: appCss });
    await page.addScriptTag({ content: reactUmd });
    await page.addScriptTag({ content: reactDomUmd });
    await page.addScriptTag({ content: MOUNT });
    await page.addScriptTag({ content: toolSource });
    await page.evaluate(() => window.__mount({ tab: 'integral', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, mode: 'left' }));
    await page.waitForSelector('[data-calc-bound-handle="xMax"]');
    await page.waitForTimeout(300);
    cdp = await context.newCDPSession(page);
  }, 60000);
  afterAll(async () => { if (browser) await browser.close(); });

  it('a tap moves nothing, fires no mouse follow-up and says nothing', async () => {
    await centre();
    await page.evaluate(() => { window.__ev = []; const h = document.querySelector('[data-calc-bound-handle="xMax"]'); ['mousedown', 'mouseup', 'pointerdown', 'pointerup'].forEach((t) => h.addEventListener(t, () => window.__ev.push(t))); });
    const s = await at();
    await page.touchscreen.tap(s.bx, s.y);
    await page.waitForTimeout(250);
    const e = await at();
    expect([e.a, e.b]).toEqual([0, 3]);
    expect(await page.evaluate(() => window.__ev)).toEqual(['pointerdown', 'pointerup']);
    expect(e.sr).toEqual([]);
  }, 30000);

  it('a sideways drag moves b to the finger, without scrolling', async () => {
    await centre();
    const s = await at();
    await swipe(s.bx, s.y, -8, 0, 8);
    const e = await at();
    expect(e.b).toBe(2);
    expect(e.scrollY).toBe(s.scrollY);
    expect(e.sr.join('|')).toContain('Upper bound b is now 2.');
  }, 30000);

  it('a cannot be dragged past b', async () => {
    await centre();
    const s = await at();
    await swipe(s.ax, s.y, 40, 0, 8);
    const e = await at();
    expect(e.a).toBeLessThan(e.b);
    expect(e.b).toBe(s.b);
    expect(e.a).toBeGreaterThan(0);
  }, 30000);

  it('a vertical swipe scrolls the page from the handle strip and from the rest of the graph', async () => {
    for (const on of ['handle', 'graph']) {
      await centre();
      const s = await at();
      await swipe(on === 'handle' ? s.bx : (s.ax + 20), s.y, 0, -25, 8);
      const e = await at();
      expect(e.scrollY, on).toBeGreaterThan(s.scrollY + 50);
      expect([e.a, e.b], on).toEqual([s.a, s.b]);
    }
  }, 30000);
});
