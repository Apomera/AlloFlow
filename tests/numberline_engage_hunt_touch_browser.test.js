// Number Line hunt (2026-11-04): a REAL touch context in Chromium (hasTouch + CDP touch events)
// with a live React tool. A tap must place once, a sideways drag must drag, and a vertical swipe
// that starts on a line must scroll the page without moving the marker or paying a landmark.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SRC = process.env.NUMBERLINE_HUNT_SRC || path.join(ROOT, 'stem_lab/stem_tool_numberline.js');
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
    if (m) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(m[1] === 'k2' ? page_html('k2', '1st Grade') : page_html('g35', '4th Grade')); return; }
    const file = url === '/__tool.js' ? SRC : path.join(ROOT, url);
    fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); res.end(body); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) server.close(); }, 30000);

async function open(band, seed, width) {
  const ctx = await browser.newContext({ viewport: { width: width || 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (x) => errs.push(String(x)));
  await page.goto(base + '/__nl/' + band);
  await page.waitForFunction(() => !!(window.StemLab._registry.numberline));
  await page.evaluate((s) => window.__mount(s), seed);
  await page.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(page);
  return { page, cdp, errs, close: () => ctx.close() };
}
async function touch(cdp, pts) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
  for (const p of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1] }] }); await new Promise((r) => setTimeout(r, 25)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise((r) => setTimeout(r, 350));
}
const nl = (page) => page.evaluate(() => window.__ctx.toolData._numberline);

const LINES = [
  ['Place it', 'k2', '[data-place-practice] svg[role=slider]', (n) => n.pp.pos, {}],
  ['Explore', 'k2', '#numberline-panel-explore svg[role=slider]', (n) => n.exploreProbe, { _numberline: { tab: 'explore', muted: true } }],
  ['Fractions', 'g35', '#numberline-panel-fracdec svg[role=slider]', (n) => n.fdValue, { _numberline: { tab: 'fracdec', muted: true, fdValue: 0.5, fdDen: 4 } }],
];

describe('real touch on the three lines', () => {
  for (const [name, band, sel, read, seed] of LINES) {
    it(name + ': swipe up scrolls and changes nothing; a tap places once; a sideways drag drags', async () => {
      const { page, cdp, errs, close } = await open(band, seed);
      const s = page.locator(sel).first();
      await s.scrollIntoViewIfNeeded();
      let bb = await s.boundingBox();
      const before = read(await nl(page));
      const y0 = await page.evaluate(() => scrollY);
      const pts = []; for (let i = 0; i <= 8; i++) pts.push([bb.x + bb.width * 0.3, bb.y + bb.height / 2 - i * 25]);
      await touch(cdp, pts);
      expect(await page.evaluate(() => scrollY), 'the page scrolled').toBeGreaterThan(y0 + 40);
      expect(read(await nl(page)), 'the marker did not move').toBe(before);
      expect(await page.evaluate(() => window.__xp), 'a swipe pays nothing').toEqual([]);
      await s.scrollIntoViewIfNeeded(); bb = await s.boundingBox();
      await page.evaluate((q) => { window.__sets = 0; const c = window.__ctx, o = c.setToolData; c.setToolData = function (f) { window.__sets++; return o.call(this, f); }; window.__mouse = 0; document.querySelector(q).addEventListener('mousedown', () => { window.__mouse++; }); }, sel);
      await page.touchscreen.tap(bb.x + bb.width * 0.62, bb.y + bb.height / 2);
      await page.waitForTimeout(300);
      const tapped = read(await nl(page));
      expect(tapped, 'a tap places').not.toBe(before);
      expect(await page.evaluate(() => window.__mouse), 'no follow-up mousedown').toBe(0);
      const drag = []; for (let i = 0; i <= 6; i++) drag.push([bb.x + bb.width * (0.2 + 0.06 * i), bb.y + bb.height / 2]);
      await touch(cdp, drag);
      expect(read(await nl(page)), 'a drag moves').not.toBe(tapped);
      expect(errs).toEqual([]);
      await close();
    }, 90000);
  }
  it('Explore at a 600 px tablet: the whole line fits, so the far end can be tapped', async () => {
    const { page, close } = await open('g35', { _numberline: { tab: 'explore', muted: true } }, 600);
    const s = page.locator('#numberline-panel-explore svg[role=slider]');
    await s.scrollIntoViewIfNeeded();
    const bb = await s.boundingBox();
    expect(bb.x + bb.width).toBeLessThanOrEqual(600);
    const m = await s.evaluate((n) => { const c = n.getScreenCTM(); return { a: c.a, e: c.e }; });
    await page.touchscreen.tap(m.e + m.a * 660, bb.y + bb.height / 2);
    await page.waitForTimeout(300);
    expect((await nl(page)).exploreProbe).toBe(20);
    await close();
  }, 60000);
  it('a phone step button brings the activity into view and focuses it', async () => {
    const { page, close } = await open('k2', { _numberline: { tab: 'explore', muted: true } });
    await page.locator('button', { hasText: /^Show all/ }).click();
    await page.locator('[data-nl-path-step="measure"] button').tap();
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => { const a = document.activeElement, b = a.getBoundingClientRect(); return { text: a.textContent.trim(), top: b.top, bottom: b.bottom, h: innerHeight }; });
    expect(r.text).toBe('Start practice');
    expect(r.top).toBeGreaterThanOrEqual(0);
    expect(r.bottom).toBeLessThanOrEqual(r.h);
    await close();
  }, 60000);
  it('phone Fractions in twelfths: no two labels overlap', async () => {
    const { page, close } = await open('g35', { _numberline: { tab: 'fracdec', muted: true, fdDen: 12, fdValue: 0.5 } });
    const hits = await page.locator('#numberline-panel-fracdec svg[role=slider]').evaluate((svg) => {
      const b = [...svg.querySelectorAll('g[class~="x"], text')].filter((t) => t.tagName === 'text' && !t.closest('.allo-fd-marker')).map((t) => ({ s: t.textContent, r: t.getBoundingClientRect() }));
      const out = [];
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const ox = Math.min(b[i].r.right, b[j].r.right) - Math.max(b[i].r.left, b[j].r.left), oy = Math.min(b[i].r.bottom, b[j].r.bottom) - Math.max(b[i].r.top, b[j].r.top); if (ox > 1.5 && oy > 2) out.push([b[i].s, b[j].s, Math.round(ox)]); }
      return out;
    });
    expect(hits).toEqual([]);
    await close();
  }, 60000);
});
