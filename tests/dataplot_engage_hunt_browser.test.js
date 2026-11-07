// Data Plot engagement hunt, with REAL touch in Chromium (CDP touch events, a 12 px finger radius).
// touch-action is ignored on inline SVG children and touch adjustment retargets a finger, and neither
// shows up with a mouse. Fail-first: DATAPLOT_DEEP_SRC=<start copy> runs it against the earlier file.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const SOURCE = process.env.DATAPLOT_DEEP_SRC || 'stem_lab/stem_tool_dataplot.js';
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');
const HOST = `window.__sr = [];
window.__mount = function (init) {
  var cfg = window.StemLab._registry.dataPlot;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState({ dataPlot: init });
    window.__live = td[0].dataPlot || {};
    var set = td[1];
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: set, gradeBand: 'g68', gradeLevel: '7th Grade',
      update: function (id, k, v) { set(function (p) { var o = Object.assign({}, p); o[id] = Object.assign({}, p[id] || {}); o[id][k] = v; return o; }); },
      updateMulti: function (id, m) { set(function (p) { var o = Object.assign({}, p); o[id] = Object.assign({}, p[id] || {}, m); return o; }); },
      awardXP: function () {}, announceToSR: function (m) { window.__sr.push(String(m)); }, addToast: function () {}, t: function (k, f) { return f || k; } });
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Host));
};`;
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

const P = [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 10 }, { x: 6, y: 11 }, { x: 7, y: 15 }];
const RADIUS = 12;
async function open(init, { touch = true, width = 390, center = 'svg[data-dataplot-svg]' } = {}) {
  const context = await browser.newContext({ viewport: touch ? { width, height: 700 } : { width: 1280, height: 900 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><div style="height:1600px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate((s) => window.__mount(s), init);
  await page.waitForTimeout(200);
  await page.evaluate((sel) => { document.querySelector(sel).scrollIntoView({ block: 'center' }); window.__cancels = 0; document.addEventListener('pointercancel', () => { window.__cancels += 1; }, true); }, center);
  await page.waitForTimeout(80);
  const cdp = touch ? await context.newCDPSession(page) : null;
  return { page, context, cdp };
}
const live = (page) => page.evaluate(() => window.__live);
const scrollY = (page) => page.evaluate(() => window.scrollY);
const cancels = (page) => page.evaluate(() => window.__cancels);
const box = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, w: r.width, h: r.height }; }, sel);
const handle = (which) => '[data-dataplot-my-handle="' + which + '"]';
async function finger(cdp, page, from, to, { steps = 14, dt = 24 } = {}) {
  const tp = (x, y) => [{ x, y, radiusX: RADIUS, radiusY: RADIUS }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from.x, from.y) });
  await page.waitForTimeout(40);
  for (let i = 1; i <= steps; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps) });
    await page.waitForTimeout(dt);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(180);
}

describe('real touch on the 6-8 draw-your-line handles', () => {
  for (const which of ['yA', 'yB']) {
    for (const width of [390, 320]) {
      it(which + ' at ' + width + ' px: a full drag follows the finger, is never cancelled, and the page stays still', async () => {
        const { page, context, cdp } = await open({ points: P }, { width });
        const a = await box(page, handle(which)), y0 = await scrollY(page);
        await finger(cdp, page, a, { x: a.x, y: a.y + 60 });
        const b = await box(page, handle(which));
        expect(await cancels(page)).toBe(0);
        expect(await scrollY(page)).toBe(y0);
        expect(Math.abs(b.y - a.y - 60)).toBeLessThan(6);
        const d = await live(page);
        expect(d.myLine.moved).toBe(true);
        expect(d.points.length).toBe(P.length);
        await context.close();
      }, 60000);
    }
  }
  it('a finger just off the small handle still grabs it', async () => {
    const { page, context, cdp } = await open({ points: P }, { width: 320 });
    const a = await box(page, handle('yA'));
    await finger(cdp, page, { x: a.x - 11, y: a.y - 9 }, { x: a.x - 11, y: a.y + 41 });
    const d = await live(page);
    expect(await cancels(page)).toBe(0);
    expect(d.myLine && d.myLine.moved).toBe(true);
    expect(d.points.length).toBe(P.length);
    await context.close();
  }, 60000);
  it('tapping a handle moves nothing and adds no point', async () => {
    const { page, context } = await open({ points: P });
    const a = await box(page, handle('yB'));
    await page.touchscreen.tap(a.x, a.y);
    await page.waitForTimeout(200);
    expect((await live(page)).points.length).toBe(P.length);
    await context.close();
  }, 60000);
  it('after the comparison the handles still drag by touch', async () => {
    const { page, context, cdp } = await open({ points: P, myLine: { shown: true, moved: true, xA: 1.6, xB: 6.4, yA: 3, yB: 12 } });
    const a = await box(page, handle('yA'));
    await finger(cdp, page, a, { x: a.x, y: a.y - 40 });
    expect(await cancels(page)).toBe(0);
    expect((await live(page)).myLine.yA).toBeGreaterThan(3.5);
    await context.close();
  }, 60000);
  it('a mouse drag still works', async () => {
    const { page, context } = await open({ points: P }, { touch: false });
    const a = await box(page, handle('yA'));
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(a.x, a.y + 30, { steps: 5 }); await page.mouse.up();
    await page.waitForTimeout(150);
    const b = await box(page, handle('yA'));
    expect(Math.abs(b.y - a.y - 30)).toBeLessThan(5);
    expect((await live(page)).points.length).toBe(P.length);
    await context.close();
  }, 60000);
  const lastDot = (page) => page.evaluate(() => { const c = document.querySelectorAll('svg[data-dataplot-svg] [data-dataplot-point] circle:nth-child(2)'); const r = c[c.length - 1].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  // The student's line, its dashed residuals and the squares are drawn over the points.
  const STATES = { 'with the line': {}, 'after the comparison, with squares': { myLine: { shown: true, moved: true, xA: 1.6, xB: 6.4, yA: 3, yB: 12 } } };
  for (const [name, extra] of Object.entries(STATES)) {
    it('Remove mode ' + name + ': a tap on a point removes it', async () => {
      const { page, context, cdp } = await open(Object.assign({ points: P, clickMode: 'remove' }, extra));
      const dot = await lastDot(page);
      await page.touchscreen.tap(dot.x, dot.y);
      await page.waitForTimeout(200);
      expect((await live(page)).points.length).toBe(P.length - 1);
      // A real finger has a radius.
      const dot2 = await lastDot(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: dot2.x, y: dot2.y, radiusX: RADIUS, radiusY: RADIUS }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(250);
      expect((await live(page)).points.length).toBe(P.length - 2);
      await context.close();
    }, 60000);
    it('Remove mode ' + name + ': a mouse click on a point removes it', async () => {
      const { page, context } = await open(Object.assign({ points: P, clickMode: 'remove' }, extra), { touch: false });
      const dot = await lastDot(page);
      await page.mouse.click(dot.x, dot.y);
      await page.waitForTimeout(200);
      expect((await live(page)).points.length).toBe(P.length - 1);
      await context.close();
    }, 60000);
  }
  it('Remove mode: a point beside a handle can still be removed by touch', async () => {
    const near = P.concat([{ x: 2.2, y: 8.4 }]);
    const { page, context } = await open({ points: near, clickMode: 'remove' });
    const dot = await lastDot(page);
    await page.touchscreen.tap(dot.x, dot.y);
    await page.waitForTimeout(200);
    expect((await live(page)).points.length).toBe(near.length - 1);
    await context.close();
  }, 60000);
});

describe('real touch on the chart itself', () => {
  it('a tap adds a point where it landed, and the next tap adds another', async () => {
    const { page, context } = await open({});
    const s = await box(page, 'svg[data-dataplot-svg]');
    await page.touchscreen.tap(s.left + s.w * 0.5, s.top + s.h * 0.5);
    await page.waitForTimeout(200);
    await page.touchscreen.tap(s.left + s.w * 0.7, s.top + s.h * 0.3);
    await page.waitForTimeout(200);
    const d = await live(page);
    expect(d.points.length).toBe(2);
    expect(d.points[1].x).toBeGreaterThan(d.points[0].x);
    expect(d.points[1].y).toBeGreaterThan(d.points[0].y);
    await context.close();
  }, 60000);
  it('a swipe that starts on the chart scrolls the page, adds no point and moves no line', async () => {
    const { page, context, cdp } = await open({ points: P });
    const s = await box(page, 'svg[data-dataplot-svg]'), y0 = await scrollY(page);
    await finger(cdp, page, { x: s.left + s.w * 0.72, y: s.top + s.h * 0.75 }, { x: s.left + s.w * 0.72, y: s.top + s.h * 0.75 - 130 });
    const d = await live(page);
    expect(await scrollY(page)).toBeGreaterThan(y0 + 60);
    expect(d.points.length).toBe(P.length);
    expect(d.myLine == null || !d.myLine.moved).toBe(true);
    await context.close();
  }, 60000);
  it('a swipe that starts beside a handle, outside the grab area, also scrolls', async () => {
    const { page, context, cdp } = await open({ points: P });
    const a = await box(page, handle('yB')), y0 = await scrollY(page);
    await finger(cdp, page, { x: a.x - 60, y: a.y + 60 }, { x: a.x - 60, y: a.y - 70 });
    expect(await scrollY(page)).toBeGreaterThan(y0 + 60);
    await context.close();
  }, 60000);
});
