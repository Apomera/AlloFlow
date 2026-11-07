// Independent hunt of the Area & Perimeter engagement build, with REAL touch in
// Chromium (CDP touch events, a 12 px finger radius). touch-action is ignored on
// inline SVG children and touch adjustment retargets a finger toward "clickable"
// nodes, and neither shows up with a mouse. AP_FILE runs it against the start copy.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const SOURCE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');
const HOST = `window.__sr = [];
window.__mount = function (init) {
  var cfg = window.StemLab._registry.areaPerimeter;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState({ _areaPerimeter: init });
    window.__live = td[0]._areaPerimeter || {};
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1], gradeLevel: '3rd Grade',
      awardXP: function () {}, announceToSR: function (m) { window.__sr.push(String(m)); }, addToast: function () {}, t: function (k, f) { return f || k; } });
  }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Host));
};`;
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

const RADIUS = 12;
async function open(init, { touch = true } = {}) {
  const context = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 950 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><div style="height:1600px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate((s) => window.__mount(s), init);
  await page.waitForTimeout(150);
  await page.evaluate(() => { document.querySelector('[data-ap-explore-svg]').scrollIntoView({ block: 'center' }); window.__cancels = 0; document.addEventListener('pointercancel', () => { window.__cancels += 1; }, true); });
  await page.waitForTimeout(60);
  const cdp = touch ? await context.newCDPSession(page) : null;
  return { page, context, cdp };
}
const live = (page) => page.evaluate(() => window.__live);
const tiles = async (page) => Object.keys((await live(page)).revealedTiles || {}).sort();
const center = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
const tile = (page, key) => center(page, `[data-ap-tile="${key}"]`);
const scale = (page) => page.evaluate(() => { const b = document.querySelector('[data-ap-explore-svg]').getBoundingClientRect(); return Math.min(b.width / 640, b.height / 390); });
const handleSel = '[data-ap-resize-handle] circle:nth-child(2)';
async function finger(cdp, page, from, to, { steps = 12, dt = 24 } = {}) {
  const tp = (x, y) => [{ x, y, radiusX: RADIUS, radiusY: RADIUS }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from.x, from.y) });
  for (let i = 1; i <= steps; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps) });
    await page.waitForTimeout(dt);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}

describe('real touch on the Tile Explorer', () => {
  it('a tap paints one square once, and a second tap clears it', async () => {
    const { page, context } = await open({ mode: 'explore', width: 6, height: 4 });
    const t = await tile(page, '2-1');
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(150);
    expect(await tiles(page)).toEqual(['2-1']);
    expect((await live(page)).revealedBest).toBe(1);
    await page.waitForTimeout(750);
    await page.touchscreen.tap(t.x, t.y);
    await page.waitForTimeout(150);
    expect(await tiles(page)).toEqual([]);
    await context.close();
  }, 60000);

  it('a finger drag paints the whole row without the browser cancelling it', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    await finger(cdp, page, await tile(page, '0-1'), await tile(page, '5-1'));
    expect(await tiles(page)).toEqual(['0-1', '1-1', '2-1', '3-1', '4-1', '5-1']);
    expect(await page.evaluate(() => window.__cancels)).toBe(0);
    await context.close();
  }, 60000);

  it('a finger dragging down the grid paints the column and does not scroll the page', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    const y0 = await page.evaluate(() => scrollY);
    await finger(cdp, page, await tile(page, '2-0'), await tile(page, '2-3'));
    expect(await tiles(page)).toEqual(['2-0', '2-1', '2-2', '2-3']);
    expect(await page.evaluate(() => scrollY)).toBe(y0);
    await context.close();
  }, 60000);

  it('a finger on the walker walks the fence (it used to paint the nearest tile)', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    const w = await center(page, '[data-ap-walker]');
    const k = await scale(page);
    await finger(cdp, page, w, { x: w.x + 4 * 46 * k, y: w.y });
    expect((await live(page)).boundaryWalk).toEqual({ sig: '6x4', n: 4 });
    expect(await tiles(page)).toEqual([]);
    await context.close();
  }, 60000);

  it('a finger walks all the way around, corners included, and the perimeter appears', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 2, height: 1 });
    const pts = await page.evaluate(() => { const a = document.querySelector('[data-ap-tile="0-0"]').getBoundingClientRect(); const z = document.querySelector('[data-ap-tile="1-0"]').getBoundingClientRect(); const s = document.querySelector('[data-ap-explore-svg]').getBoundingClientRect(); const o = 14 * Math.min(s.width / 640, s.height / 390); return { l: a.left - o, r: z.right + o, t: a.top - o, b: z.bottom + o }; });
    const tp = (x, y) => [{ x, y, radiusX: RADIUS, radiusY: RADIUS }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(pts.l, pts.t) });
    let from = [pts.l, pts.t];
    for (const [x, y] of [[pts.r, pts.t], [pts.r, pts.b], [pts.l, pts.b], [pts.l, pts.t]]) {
      for (let i = 1; i <= 8; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(from[0] + (x - from[0]) * i / 8, from[1] + (y - from[1]) * i / 8) }); await page.waitForTimeout(20); }
      from = [x, y];
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
    expect((await live(page)).boundaryWalk.n).toBe(6);
    expect((await live(page)).perimeterSeenFor).toBe('2x1');
    await context.close();
  }, 60000);

  it('a finger on the handle resizes (with a real finger radius it used to paint a tile)', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    const c = await center(page, handleSel);
    const k = await scale(page);
    await finger(cdp, page, c, { x: c.x - 2 * 46 * k, y: c.y });
    const s = await live(page);
    expect([s.width, s.height]).toEqual([4, 4]);
    await context.close();
  }, 60000);

  it('a second finger neither paints nor ends the first finger\'s stroke', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    const a = await tile(page, '0-3'), b = await tile(page, '4-0'), z = await tile(page, '2-3');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] });
    await page.waitForTimeout(40);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }, { x: b.x, y: b.y, id: 2 }] });
    await page.waitForTimeout(40);
    for (let i = 1; i <= 8; i += 1) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (z.x - a.x) * i / 8, y: a.y, id: 1 }, { x: b.x + i, y: b.y, id: 2 }] }); await page.waitForTimeout(20); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(150);
    expect(await tiles(page)).toEqual(['0-3', '1-3', '2-3']);
    await context.close();
  }, 60000);

  it('the page still scrolls from a swipe beside the grid', async () => {
    const { page, context, cdp } = await open({ mode: 'explore', width: 6, height: 4 });
    const y0 = await page.evaluate(() => scrollY);
    const t = await tile(page, '0-1');
    await finger(cdp, page, { x: 10, y: t.y + 60 }, { x: 10, y: t.y - 60 });
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0);
    expect(await tiles(page)).toEqual([]);
    await context.close();
  }, 60000);

  it('the largest grid keeps 24 px tiles on a phone', async () => {
    const { page, context } = await open({ mode: 'explore', width: 20, height: 16 });
    const t = await tile(page, '0-0');
    expect(t.w).toBeGreaterThanOrEqual(23.9);
    await context.close();
  }, 60000);
});

describe('pointer details with a mouse', () => {
  it('a press beside the handle centre with one pixel of jitter does not resize or wipe', async () => {
    for (const [w, h] of [[6, 4], [18, 14]]) {
      const { page, context } = await open({ mode: 'explore', width: w, height: h, revealedTiles: { '0-0': true } }, { touch: false });
      const c = await center(page, handleSel);
      const x = c.x + c.w * 0.55, y = c.y + c.h * 0.55;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 1, y); await page.mouse.up();
      await page.waitForTimeout(100);
      const s = await live(page);
      expect([s.width, s.height], w + 'x' + h).toEqual([w, h]);
      expect(Object.keys(s.revealedTiles)).toEqual(['0-0']);
      await context.close();
    }
  }, 60000);

  it('a 6 by 4 rectangle drags taller than 5', async () => {
    const { page, context } = await open({ mode: 'explore', width: 6, height: 4 }, { touch: false });
    const c = await center(page, handleSel);
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x, c.y + 500, { steps: 10 }); await page.mouse.up();
    await page.waitForTimeout(100);
    expect((await live(page)).height).toBeGreaterThan(5);
    await context.close();
  }, 60000);

  it('pressing the walker on the handle\'s corner walks instead of resizing', async () => {
    const { page, context } = await open({ mode: 'explore', width: 6, height: 4, revealedTiles: { '0-0': true }, boundaryWalk: { sig: '6x4', n: 10 } }, { touch: false });
    const w = await center(page, '[data-ap-walker]');
    const k = await scale(page);
    await page.mouse.move(w.x, w.y); await page.mouse.down(); await page.mouse.move(w.x - 46 * k, w.y + 2, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(100);
    const s = await live(page);
    expect([s.width, s.height, s.boundaryWalk.n]).toEqual([6, 4, 11]);
    expect(Object.keys(s.revealedTiles)).toEqual(['0-0']);
    await context.close();
  }, 60000);

  it('a quick flick leaves no gaps, and the announcement counts only squares it changed', async () => {
    const { page, context } = await open({ mode: 'explore', width: 12, height: 8, revealedTiles: { '3-1': true, '4-1': true } }, { touch: false });
    const a = await tile(page, '0-1'), z = await tile(page, '11-1');
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 3; i += 1) { await page.mouse.move(a.x + (z.x - a.x) * i / 3, a.y); await page.waitForTimeout(16); }
    await page.mouse.up();
    await page.waitForTimeout(120);
    expect((await tiles(page)).length).toBe(12);
    const said = await page.evaluate(() => window.__sr[window.__sr.length - 1]);
    expect(said).toBe('Painted 10 squares. 12 counted so far.');
    await context.close();
  }, 60000);
});
