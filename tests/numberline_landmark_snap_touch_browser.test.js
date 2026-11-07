// The Fractions line on the landmark path step (2026-11-05), real touch in Chromium (hasTouch + CDP) and a real mouse.
// A release snaps to the 1/fdDen grid, a swipe still scrolls the page, arrow keys and the older bands are unchanged.
// NUMBERLINE_SRC=<path> runs against another copy (fail-first).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SRC = process.env.NUMBERLINE_SRC ? path.resolve(process.env.NUMBERLINE_SRC) : path.join(ROOT, 'stem_lab/stem_tool_numberline.js');
const page_html = (band, grade) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0}body{padding:8px;font:16px sans-serif}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}</style></head>
<body><div id="wrap"></div><div style="height:2400px"></div>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script>window.StemLab={_registry:{},registerTool:function(id,c){c.id=id;this._registry[id]=c;}};window.__xp=[];</script>
<script src="/__tool.js"></script>
<script>
var e=React.createElement;
window.__mount=function(seed){var cfg=window.StemLab._registry.numberline,bump=null;
 var ctx={React:React,toolData:seed||{},setToolData:function(f){ctx.toolData=typeof f==='function'?f(ctx.toolData):f;if(bump)queueMicrotask(bump);},setStemLabTool:function(){},addToast:function(){},
 awardXP:function(a,b,c){window.__xp.push([a,b,c]);},announceToSR:function(){},t:function(k,fb){return fb||k;},gradeBand:'${band}',gradeLevel:'${grade}',isDark:false,theme:'light',isContrast:false,isTeacherMode:false,
 icons:new Proxy({},{get:function(){return function(){return e('svg',{width:18,height:18,'aria-hidden':'true'});};}}),a11yClick:function(h){return{onClick:h,role:'button',tabIndex:0};},srOnly:function(x){return e('span',{className:'sr-only'},x);},beep:function(){},props:{}};
 window.__ctx=ctx;function C(){var s=React.useState(0);bump=function(){s[1](function(n){return n+1;});};return cfg.render(ctx);}
 ReactDOM.createRoot(document.getElementById('wrap')).render(e(C));};
</script></body></html>`;

let server, base, browser;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const m = url.match(/^\/__nl\/(\w+)$/);
    if (m) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(m[1] === 'g68' ? page_html('g68', '7th Grade') : page_html('g35', '4th Grade')); return; }
    const file = url === '/__tool.js' ? SRC : path.join(ROOT, url);
    fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); res.end(body); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) server.close(); }, 30000);

const SEL = '#numberline-panel-fracdec svg[role=slider]';
async function open(band, seed, phone) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '/__nl/' + band);
  await page.waitForFunction(() => !!(window.StemLab._registry.numberline));
  await page.evaluate((s) => window.__mount(s), { _numberline: { tab: 'fracdec', muted: true, fdValue: 0.5, fdDen: 4, ...seed } });
  await page.waitForTimeout(500);
  const cdp = phone ? await ctx.newCDPSession(page) : null;
  return { page, cdp, close: () => ctx.close() };
}
async function touch(cdp, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  for (const p of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1] }] }); await new Promise((r) => setTimeout(r, 25)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise((r) => setTimeout(r, 350));
}
const nl = (page) => page.evaluate(() => window.__ctx.toolData._numberline);
const onGrid = (v, den) => Math.abs(v * den - Math.round(v * den)) < 1e-9;
// A line x for a value, read from the drawing itself. W 400 narrow / 700 wide, PAD 50.
const screenX = (page, v) => page.locator(SEL).evaluate((svg, value) => {
  const m = svg.getScreenCTM(); const W = svg.viewBox.baseVal.width; return m.e + m.a * (50 + value * (W - 100));
}, v);

describe('landmark path step: a release lands on the grid', () => {
  it('phone: a sideways finger drag ends on a quarter and finds its landmark', async () => {
    const { page, cdp, close } = await open('g35', {}, true);
    const s = page.locator(SEL);
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    const y = bb.y + bb.height / 2;
    const from = await screenX(page, 0.5), to = await screenX(page, 0.27);
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([from + (to - from) * i / 8, y]);
    await touch(cdp, pts);
    const n = await nl(page);
    expect(n.fdValue).toBe(0.25);
    expect(n.fdLandmarksFound['1/4']).toBe(true);
    const xp = await page.evaluate(() => window.__xp);
    expect(xp.filter((x) => x[0] === 'numberlineLandmark').length).toBe(1);
    await close();
  }, 90000);

  it('phone: a tap lands on the grid; three of them finish the step, and the line goes free again', async () => {
    const { page, close } = await open('g35', {}, true);
    const s = page.locator(SEL);
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    const y = bb.y + bb.height / 2;
    for (const v of [0.26, 0.76, 0.02]) {
      await page.touchscreen.tap(await screenX(page, v), y);
      await page.waitForTimeout(350);
      expect(onGrid((await nl(page)).fdValue, 4), 'tap at ' + v).toBe(true);
    }
    expect(Object.keys((await nl(page)).fdLandmarksFound).sort()).toEqual(['0', '1/4', '3/4']);
    await page.touchscreen.tap(await screenX(page, 0.33), y);
    await page.waitForTimeout(350);
    expect(onGrid((await nl(page)).fdValue, 4), 'free after the step').toBe(false);
    await close();
  }, 90000);

  it('phone: a vertical swipe from the line still scrolls and moves nothing', async () => {
    const { page, cdp, close } = await open('g35', {}, true);
    const s = page.locator(SEL);
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    const y0 = await page.evaluate(() => scrollY);
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([bb.x + bb.width * 0.3, bb.y + bb.height / 2 - i * 25]);
    await touch(cdp, pts);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 40);
    expect((await nl(page)).fdValue).toBe(0.5);
    expect(await page.evaluate(() => window.__xp)).toEqual([]);
    await close();
  }, 90000);

  it('mouse: the marker glides during the drag and snaps at the release', async () => {
    const { page, close } = await open('g35', {}, false);
    const s = page.locator(SEL);
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    const y = bb.y + bb.height / 2;
    await page.mouse.move(await screenX(page, 0.5), y);
    await page.mouse.down();
    await page.mouse.move(await screenX(page, 0.7), y, { steps: 5 });
    await page.waitForTimeout(120);
    const during = (await nl(page)).fdValue;
    expect(onGrid(during, 4), 'still gliding at ' + during).toBe(false);
    await page.mouse.up();
    await page.waitForTimeout(250);
    expect((await nl(page)).fdValue).toBe(0.75);
    await close();
  }, 90000);

  it('arrow keys keep their own step, and move by the same amount on and off the path step', async () => {
    const run = async (band, seed) => {
      const { page, close } = await open(band, seed, false);
      await page.locator(SEL).focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      const v = (await nl(page)).fdValue;
      await close();
      return v;
    };
    expect(await run('g35', {})).toBe(await run('g68', {}));
  }, 90000);

  it('a band with no landmark step stays free', async () => {
    const { page, close } = await open('g68', {}, false);
    const s = page.locator(SEL);
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    await page.mouse.click(await screenX(page, 0.33), bb.y + bb.height / 2);
    await page.waitForTimeout(250);
    expect(onGrid((await nl(page)).fdValue, 4)).toBe(false);
    await close();
  }, 90000);
});
