// City Lab on a phone in real Chromium with hasTouch (2026-11-05). Check's verdict landed under the fold, and on the map the
// predict card sat ~2,300 px below the parcel just tapped, so an edit seemed to do nothing. Also pins, with real touch, the
// board's gestures (TRAP in the hunt queue): one tap is one edit, a swipe scrolls and edits nothing, a sideways drag turns the model.
// CITYLAB_FILE=<path> serves another copy (fail-first checks).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const SRC = process.env.CITYLAB_FILE ? path.resolve(process.env.CITYLAB_FILE) : path.join(ROOT, 'stem_lab/stem_tool_citylab.js');
const css = fs.readdirSync(path.join(ROOT, 'app/static/css')).find((n) => /^main\..*\.css$/.test(n));
const moduleSrc = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
const a0 = moduleSrc.indexOf('window.AlloModules.StemLab = function StemLabModal(props) {');
const setters = [...new Set([...moduleSrc.slice(a0, moduleSrc.indexOf('} = props;', a0)).matchAll(/^\s+(set\w+),?$/gm)].map((m) => m[1]))];
const html = (seed, grade, theme) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>t</title>
<link rel="stylesheet" href="/app/static/css/${css}"></head><body style="margin:0"><main class="theme-${theme}" style="display:none"></main><div id="app"></div>
<script>window.__SEED=${JSON.stringify(seed)};window.__xp=[];window.__alloConfigureTrustedScript=function(s,u){s.src=u;return s;};</script>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/app_styles_module.js"></script><script src="/stem_lab/stem_lab_module.js"></script>
<script>window.__alloEnsureStemPluginLoaded=function(){return true;};window.__alloGetStemPluginState=function(){return {status:'loaded'};};</script>
<script src="/__tool.js"></script>
<script>
var e=React.createElement,noop=function(){};
var Icon=function(p){return e('svg',{width:16,height:16,viewBox:'0 0 24 24','aria-hidden':'true',className:p&&p.className});};
var S={};${JSON.stringify(setters)}.forEach(function(n){S[n]=noop;});
window.__mount=function(){function Host(){
  var tool=React.useState('cityLab'),tab=React.useState('explore'),lab=React.useState(window.__SEED),snap=React.useState([]);
  window.__lab=lab[0];
  var props=Object.assign({},S,{ArrowLeft:Icon,Calculator:Icon,GripVertical:Icon,Sparkles:Icon,X:Icon,addToast:noop,t:function(){return undefined;},theme:${JSON.stringify(theme)},showStemLab:true,stemLabTab:tab[0],setStemLabTab:tab[1],stemLabTool:tool[0],setStemLabTool:tool[1],labToolData:lab[0],setLabToolData:lab[1],toolSnapshots:snap[0],setToolSnapshots:snap[1],gradeLevel:${JSON.stringify(grade)},isTeacherMode:false,isIndependentMode:false,isParentMode:false,inputText:'',sourceTopic:''});
  return e('div',{className:'min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col theme-${theme}'},e(window.AlloModules.AppStyles.AppStyles,{}),e(window.AlloModules.StemLab,props));
}ReactDOM.createRoot(document.getElementById('app')).render(e(Host));};
</script></body></html>`;

let server, base, browser;
const pages = new Map();
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (pages.has(url)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pages.get(url)); return; }
    const file = url === '/__tool.js' ? SRC : path.join(ROOT, path.normalize(url).replace(/^([/\\])+/, ''));
    const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8';
    fs.readFile(file, (err, body) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': type }); res.end(body); });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) server.close(); }, 30000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;
async function open(width, height, seed, grade, theme) {
  const url = '/__c' + (++n);
  pages.set(url, html(seed || {}, grade || '7th Grade', theme || 'default'));
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (x) => errs.push(String(x).slice(0, 200)));
  await page.goto(base + url, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => window.__mount());
  await page.waitForSelector('[data-citylab-tabs]', { timeout: 60000 });
  await sleep(600);
  const cdp = await context.newCDPSession(page);
  const tap = async (loc) => { await loc.scrollIntoViewIfNeeded(); await sleep(150); const b = await loc.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(450); };
  const swipe = async (pts) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
    for (const p of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1] }] }); await sleep(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
  };
  return { page, context, errs, tap, swipe };
}
const onScreen = (page, sel) => page.evaluate((s) => {
  const node = s === '[data-citylab-predict-card]'
    ? [...document.querySelectorAll('button')].find((b) => /^(goes? )?up$/i.test(b.textContent.trim()))
    : document.querySelector(s);
  if (!node) return { missing: true };
  const r = node.getBoundingClientRect(), box = document.querySelector('.stem-lab-scroll-region').getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), viewTop: Math.round(box.top), viewBottom: Math.round(Math.min(box.bottom, innerHeight)), text: (node.innerText || '').slice(0, 60) };
}, sel);
const scrollTop = (page) => page.evaluate(() => document.querySelector('.stem-lab-scroll-region').scrollTop);
const cell = (page, id) => page.locator('#citylab-parcel-' + id);
const tool = (page, name) => page.locator('[data-citylab-palette-item]', { hasText: name }).first();
const cellLabel = (page, id) => cell(page, id).getAttribute('aria-label');
const undo = (page) => page.locator('button', { hasText: /^Undo$/ }).first();

describe('the answer to a press is on screen', () => {
  for (const [w, h] of [[320, 640], [390, 844]]) {
    it(w + ' x ' + h + ': Check my plan shows its verdict', async () => {
      const { page, context, errs, tap } = await open(w, h, { _cityLab: { coachOff: true } });
      if (!(await page.locator('[data-citylab-strip-check]').count())) await tap(page.locator('[data-citylab-strip-toggle]').first());
      await tap(page.locator('[data-citylab-strip-check]').first());
      await page.waitForSelector('[data-citylab-strip-result]');
      await sleep(250);
      const m = await onScreen(page, '[data-citylab-strip-result]');
      console.log('citylab verdict ' + w + ': ' + JSON.stringify(m));
      expect(m.top, 'verdict top').toBeGreaterThanOrEqual(m.viewTop - 2);
      expect(m.top, 'the verdict starts on screen').toBeLessThan(m.viewBottom - 40);
      expect(await page.evaluate(() => document.activeElement.id), 'focus stays on Check').toBe('citylab-strip-check');
      expect(errs).toEqual([]);
      await context.close();
    }, 120000);

    it(w + ' x ' + h + ': a tap on the map that waits for a prediction shows the card, then returns to the parcel', async () => {
      const { page, context, errs, tap } = await open(w, h, { _cityLab: { coachOff: true, predictEvery: true } });
      await tap(tool(page, 'Park'));
      await tap(cell(page, 'D11'));
      await sleep(250);
      const m = await onScreen(page, '[data-citylab-predict-card]');
      console.log('citylab predict ' + w + ': ' + JSON.stringify(m));
      expect(m.missing).toBeUndefined();
      expect(m.top, 'the card starts on screen').toBeLessThan(m.viewBottom - 40);
      expect(m.top).toBeGreaterThanOrEqual(m.viewTop - 2);
      expect(await page.evaluate(() => { const c = [...document.querySelectorAll('button')].find((x) => /^(goes? )?up$/i.test(x.textContent.trim())), b = document.getElementById('citylab-parcel-D11'); return Math.abs(c.getBoundingClientRect().top - b.getBoundingClientRect().bottom); }), 'the card sits close to the map').toBeLessThan(800);
      expect(await cellLabel(page, 'D11')).toContain('Open field');
      await tap(page.locator('button', { hasText: /^(go(es)? )?up$/i }).first());
      await sleep(250);
      expect(await cellLabel(page, 'D11')).toContain('Park');
      expect(await page.evaluate(() => document.activeElement.id)).toBe('citylab-parcel-D11');
      const f = await onScreen(page, '#citylab-parcel-D11');
      expect(f.top).toBeGreaterThanOrEqual(f.viewTop - 2);
      expect(f.bottom).toBeLessThanOrEqual(f.viewBottom);
      expect(errs).toEqual([]);
      await context.close();
    }, 120000);
  }

  it('390 px, 3D: a staged edit shows the card under the stage', async () => {
    const { page, context, tap } = await open(390, 844, { _cityLab: { coachOff: true, predictEvery: true } });
    await tap(page.locator('button', { hasText: /^3D$/ }).first());
    await page.waitForSelector('#citylab-stage');
    await sleep(3000);
    await tap(tool(page, 'Park'));
    const stage = page.locator('#citylab-stage');
    await stage.scrollIntoViewIfNeeded(); await sleep(300);
    const b = await stage.boundingBox();
    await page.touchscreen.tap(b.x + b.width / 2, b.y + Math.min(b.height, 844 - b.y) * 0.55);
    await sleep(700);
    const m = await onScreen(page, '[data-citylab-predict-card]');
    console.log('citylab predict 3d: ' + JSON.stringify(m));
    expect(m.missing).toBeUndefined();
    expect(m.top).toBeLessThan(m.viewBottom - 40);
    await context.close();
  }, 150000);
});

describe('the map edit note at 320 x 640', () => {
  const clear = (page, id) => page.evaluate((cellId) => {
    const n = document.querySelector('[data-citylab-stage-note]'), c = document.getElementById('citylab-parcel-' + cellId);
    if (!n || !c) return { missing: true };
    const a = n.getBoundingClientRect(), b = c.getBoundingClientRect(), box = document.querySelector('.stem-lab-scroll-region').getBoundingClientRect();
    return { noteTop: Math.round(a.top), noteBottom: Math.round(a.bottom), cellTop: Math.round(b.top), cellBottom: Math.round(b.bottom), viewTop: Math.round(box.top), viewBottom: Math.round(Math.min(box.bottom, innerHeight)), text: n.textContent };
  }, id);
  const check = (m, id) => {
    expect(m.missing, id).toBeUndefined();
    expect(m.noteTop, id + ': note on screen').toBeGreaterThanOrEqual(m.viewTop - 1);
    expect(m.noteBottom, id + ': note on screen').toBeLessThanOrEqual(m.viewBottom + 1);
    expect(m.cellBottom <= m.noteTop + 1 || m.cellTop >= m.noteBottom - 1, id + ': the note does not cover the parcel').toBe(true);
    expect(m.cellTop, id + ': the parcel is on screen').toBeGreaterThanOrEqual(m.viewTop - 1);
  };

  it('a tap in the top, middle or bottom of the map: the note and the parcel both stay in view', async () => {
    const { page, context, errs, tap } = await open(320, 640, { _cityLab: { coachOff: true } });
    await tap(tool(page, 'Park'));
    for (const id of ['A1', 'D11', 'D12', 'A12', 'D2']) {
      await tap(cell(page, id));
      await sleep(200);
      const m = await clear(page, id);
      console.log('citylab note ' + id + ': ' + JSON.stringify(m));
      expect(m.text || '').toContain(id);
      check(m, id);
    }
    expect(errs).toEqual([]);
    await context.close();
  }, 180000);

  it('the arrow keys never put the focused parcel under the note', async () => {
    const { page, context, tap } = await open(320, 640, { _cityLab: { coachOff: true } });
    await tap(tool(page, 'Park'));
    await tap(cell(page, 'D2'));
    await cell(page, 'D2').focus();
    for (let i = 3; i <= 12; i++) {
      await page.keyboard.press('ArrowDown');
      await sleep(180);
      const id = 'D' + i;
      expect(await page.evaluate(() => document.activeElement.id)).toBe('citylab-parcel-' + id);
      check(await clear(page, id), id);
    }
    await context.close();
  }, 180000);

  for (const theme of ['default', 'dark', 'contrast']) {
    it(theme + ': the note is opaque and readable over the map', async () => {
      const { page, context, tap } = await open(320, 640, { _cityLab: { coachOff: true } }, '7th Grade', theme);
      await tap(tool(page, 'Park'));
      await tap(cell(page, 'D2'));
      const c = await page.evaluate(() => { const s = getComputedStyle(document.querySelector('[data-citylab-stage-note]')); return { color: s.color, bg: s.backgroundColor, pos: s.position }; });
      const parse = (v) => v.match(/[\d.]+/g).map(Number);
      const lum = (a) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(a[0]) + 0.7152 * f(a[1]) + 0.0722 * f(a[2]); };
      const fg = parse(c.color), bg = parse(c.bg);
      console.log('citylab note ' + theme + ': ' + JSON.stringify(c));
      expect(bg.length === 3 || bg[3] === 1, 'opaque ' + c.bg).toBe(true);
      const L1 = lum(fg), L2 = lum(bg);
      expect((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toBeGreaterThanOrEqual(4.5);
      expect(c.pos).toBe('sticky');
      await context.close();
    }, 120000);
  }
});

describe('real touch on the board', () => {
  it('map: one tap toggles once, a swipe from a parcel scrolls and edits nothing', async () => {
    const { page, context, errs, tap, swipe } = await open(390, 844, { _cityLab: { coachOff: true } });
    await tap(tool(page, 'Green infrastructure'));
    await tap(cell(page, 'D3'));
    expect(await cellLabel(page, 'D3')).toMatch(/green infrastructure/i);
    await cell(page, 'D2').scrollIntoViewIfNeeded(); await sleep(200);
    const before = await page.evaluate(() => document.body.innerText.length);
    const b = await cell(page, 'D6').boundingBox();
    const y0 = await scrollTop(page);
    const label = await cellLabel(page, 'D6');
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([b.x + 10, b.y + 10 - i * 20]);
    await swipe(pts);
    expect(await scrollTop(page), 'the scroller moved').toBeGreaterThan(y0 + 40);
    expect(await cellLabel(page, 'D6')).toBe(label);
    expect(before).toBeGreaterThan(0);
    expect(errs).toEqual([]);
    await context.close();
  }, 120000);

  it('3D stage: touch-action sits on the stage itself; a tap edits once, a swipe scrolls, a sideways drag turns the model', async () => {
    const { page, context, errs, tap, swipe } = await open(390, 844, { _cityLab: { coachOff: true } });
    await tap(page.locator('button', { hasText: /^3D$/ }).first());
    await page.waitForSelector('#citylab-stage');
    await page.waitForFunction(() => { const vs = (window.StemLab && window.StemLab._orbitViewers) || []; return vs.some((v) => { try { const d = v.debug(); return d && d.cityLab && d.state === 'ready' && d.pickables > 0; } catch (e) { return false; } }); }, null, { timeout: 60000 });
    const stage = page.locator('#citylab-stage');
    expect(await stage.evaluate((el) => [el.tagName, getComputedStyle(el).touchAction])).toEqual(['DIV', 'pan-y']);
    await tap(tool(page, 'Green infrastructure'));
    await stage.scrollIntoViewIfNeeded(); await sleep(300);
    let bb = await stage.boundingBox();
    const y = bb.y + Math.min(bb.height, 844 - bb.y) * 0.6;
    const note = () => page.evaluate(() => { const e = document.querySelector('[data-citylab-stage-note]'); return e ? e.textContent : ''; });
    await page.touchscreen.tap(bb.x + bb.width / 2, y);
    await sleep(600);
    const first = await note();
    expect(first, 'a tap reports one edit').toMatch(/green infrastructure/i);
    expect(first).not.toMatch(/removed|taken away/i);
    const y0 = await scrollTop(page);
    const up = []; for (let i = 0; i <= 8; i++) up.push([bb.x + bb.width / 2, y - i * 22]);
    await swipe(up);
    expect(await scrollTop(page), 'a swipe scrolls').toBeGreaterThan(y0 + 40);
    expect(await note(), 'a swipe edits nothing').toBe(first);
    await stage.scrollIntoViewIfNeeded(); await sleep(300);
    bb = await stage.boundingBox();
    const yy = bb.y + Math.min(bb.height, 844 - bb.y) * 0.5;
    const y1 = await scrollTop(page);
    const rotY = () => page.evaluate(() => { for (const v of window.StemLab._orbitViewers) { try { const d = v.debug(); if (d && d.cityLab) return d.rotY; } catch (e) {} } return null; });
    const rot0 = await rotY();
    expect(typeof rot0).toBe('number');
    const side = []; for (let i = 0; i <= 8; i++) side.push([bb.x + bb.width * 0.2 + i * 22, yy]);
    await swipe(side);
    await sleep(500);
    expect(Math.abs((await rotY()) - rot0), 'a sideways drag turned the model').toBeGreaterThan(10);
    expect(await scrollTop(page)).toBe(y1);
    expect(await note()).toBe(first);
    expect(errs).toEqual([]);
    await context.close();
  }, 180000);
});
