// Cellular Lab on a 320 px phone with a real touch context (2026-11-05). The X-ray and Step and
// explain numbers rendered at about 4 px, and the status badge sat on top of the grid. Sizes come
// from the browser. CELLULAR_TOOL_FILE points at another copy (fail-first checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const FILE = process.env.CELLULAR_TOOL_FILE || 'stem_lab/stem_tool_cellular.js';
const toolSource = fs.readFileSync(path.resolve(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__sr = [];
window.__mount = function(extra) {
  var e = React.createElement;
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({});
    return window.StemLab._registry.cellularLab.render(Object.assign({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function() {}, announceToSR: function(m) { window.__sr.push(String(m)); }, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, gradeBand: 'g68', gradeLevel: '7th Grade' }, extra || {}));
  }
  ReactDOM.createRoot(document.getElementById('app')).render(e(App));
};`;

let browser, context, page, cdp;
async function open(width, height, wrap, extra) {
  context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 640, isMobile: width < 640, reducedMotion: 'reduce' });
  page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main id="tool-root" class="' + (wrap || 'theme-default') + '"><div data-stem-tool-surface="true"><div id="app"></div></div></main></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.addScriptTag({ content: MOUNT });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate((e) => window.__mount(e), extra || {});
  await page.waitForSelector('[data-life-grid]');
  await page.waitForTimeout(250);
  cdp = await context.newCDPSession(page);
}
const pressText = (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
  if (!b) throw new Error('no button ' + t);
  b.click();
}, txt);
// A glider near the middle, drawn with the keyboard path, so nothing here depends on touch.
async function seed() {
  await page.evaluate(() => document.querySelector('[data-life-grid]').focus());
  const press = (k, o) => page.keyboard.press(k, o);
  await page.keyboard.down('Control'); await press('Home'); await page.keyboard.up('Control');
  for (let i = 0; i < 3; i++) await press('PageDown');
  for (let i = 0; i < 18; i++) await press('ArrowRight');
  await press('Space'); await press('ArrowRight'); await press('Space'); await press('ArrowRight'); await press('Space');
  await page.waitForTimeout(100);
}
const sizes = () => page.evaluate(() => {
  const svg = document.querySelector('svg.cellularlab-svg');
  const box = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scale = box.width / vb.width;
  const nums = [...svg.querySelectorAll('text')].filter((t) => /^\d$/.test(t.textContent.trim()));
  const smallest = nums.length ? Math.min(...nums.map((t) => parseFloat(t.style.fontSize) * scale)) : null;
  const badge = document.querySelector('[data-life-badge]').getBoundingClientRect();
  const ix = Math.max(0, Math.min(box.right, badge.right) - Math.max(box.left, badge.left));
  const iy = Math.max(0, Math.min(box.bottom, badge.bottom) - Math.max(box.top, badge.top));
  const stage = document.querySelector('#cellularlab-stage');
  return {
    numbers: nums.length, smallest, cellPx: box.width / (vb.width / (vb.width / 40)) / 1, gridW: box.width, gridH: box.height,
    covered: ix * iy / (box.width * box.height), stageScrollW: stage.scrollWidth, stageW: stage.clientWidth, stageLeft: stage.scrollLeft,
    touchAction: getComputedStyle(svg).touchAction, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    pop: Number((document.querySelector('[data-life-description]').textContent.match(/(\d+) live cells/) || [])[1] || 0),
    scrollY: Math.round(window.scrollY),
  };
});
async function swipe(x, y, dx, dy, steps) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let k = 1; k <= steps; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * k, y: y + dy * k }] }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(350);
}
const gridPoint = async () => {
  await page.evaluate(() => document.querySelector('svg.cellularlab-svg').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(100);
  return page.evaluate(() => {
    const s = document.querySelector('#cellularlab-stage').getBoundingClientRect();
    const g = document.querySelector('svg.cellularlab-svg').getBoundingClientRect();
    return { x: s.left + s.width / 2, y: Math.max(g.top + 30, Math.min(innerHeight / 2, g.bottom - 30)) };
  });
};

describe('Cellular at 320 px', () => {
  beforeAll(async () => { browser = await chromium.launch(); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 60000);
  const close = async () => { if (context) await context.close(); context = null; };

  it('the status badge covers none of the grid', async () => {
    await open(320, 640);
    const s = await sizes();
    console.log('cellular badge ' + JSON.stringify(s));
    expect(s.covered).toBe(0);
    expect(s.sw).toBeLessThanOrEqual(s.cw);
    await close();
  }, 90000);

  it('Neighbour X-ray numbers read at 9 px or more', async () => {
    await open(320, 640);
    await seed();
    await pressText('Neighbour X-ray');
    await page.waitForTimeout(250);
    const s = await sizes();
    console.log('cellular xray ' + JSON.stringify(s));
    expect(s.numbers).toBeGreaterThan(0);
    expect(s.smallest).toBeGreaterThanOrEqual(9);
    expect(s.sw, 'the page itself does not scroll sideways').toBeLessThanOrEqual(s.cw);
    expect(s.covered).toBe(0);
    await close();
  }, 90000);

  it('Step and explain numbers read at 9 px or more', async () => {
    await open(320, 640);
    await seed();
    await pressText('Step and explain');
    await page.waitForTimeout(250);
    const s = await sizes();
    console.log('cellular explain ' + JSON.stringify(s));
    expect(s.numbers).toBeGreaterThan(0);
    expect(s.smallest).toBeGreaterThanOrEqual(9);
    await close();
  }, 90000);

  it('zoomed in, the live squares start in view', async () => {
    await open(320, 640);
    await pressText('Clear'); // the starter pattern sits at the far left
    await page.waitForTimeout(100);
    await seed();
    await pressText('Neighbour X-ray');
    await page.waitForTimeout(250);
    const inView = await page.evaluate(() => {
      const st = document.querySelector('#cellularlab-stage').getBoundingClientRect();
      const svg = document.querySelector('svg.cellularlab-svg');
      const b = svg.getBoundingClientRect();
      const cell = b.width / 40;
      const x = b.left + 19 * cell;
      return x > st.left && x < st.right;
    });
    expect(inView).toBe(true);
    await close();
  }, 90000);

  it('zoomed in: a swipe moves the view and paints nothing; a tap changes one square, once', async () => {
    await open(320, 640);
    await seed();
    await pressText('Neighbour X-ray');
    await page.waitForTimeout(250);
    const a = await sizes();
    expect(a.touchAction).toContain('pan');
    const p = await gridPoint();
    const b = await sizes();
    await swipe(p.x, p.y, -12, 0, 8);
    const c = await sizes();
    expect(c.stageLeft, 'sideways swipe moved the zoomed grid').toBeGreaterThan(b.stageLeft + 30);
    expect(c.pop).toBe(a.pop);
    const q = await gridPoint();
    const d = await sizes();
    await swipe(q.x, q.y, 0, -14, 8);
    const e = await sizes();
    expect(e.scrollY, 'an up swipe scrolled the page').toBeGreaterThan(d.scrollY + 30);
    expect(e.pop).toBe(a.pop);
    const r = await gridPoint();
    await page.touchscreen.tap(r.x, r.y);
    await page.waitForTimeout(250);
    const f = await sizes();
    expect(Math.abs(f.pop - a.pop), 'one tap, one square').toBe(1);
    await close();
  }, 120000);

  it('the normal view: a finger still paints, and a tap fires once', async () => {
    await open(320, 640);
    const p = await gridPoint();
    const start = (await sizes()).pop; // the tool opens with a starter pattern
    await page.touchscreen.tap(p.x, p.y);
    await page.waitForTimeout(250);
    const tapped = (await sizes()).pop;
    expect(Math.abs(tapped - start), 'one tap, one square').toBe(1);
    const q = await gridPoint();
    await swipe(q.x - 60, q.y + 40, 8, 0, 8);
    expect((await sizes()).pop, 'a stroke paints several squares').toBeGreaterThan(tapped + 2);
    await close();
  }, 90000);

  it('a wide screen keeps the overlay badge and the fitted grid', async () => {
    await open(1280, 800);
    await seed();
    await pressText('Neighbour X-ray');
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => ({
      badge: getComputedStyle(document.querySelector('[data-life-badge]')).position,
      svg: document.querySelector('svg.cellularlab-svg').getBoundingClientRect().width,
      note: !!document.querySelector('[data-life-zoom-note]'),
    }));
    expect(s.badge).toBe('absolute');
    expect(s.svg).toBeLessThanOrEqual(620);
    expect(s.note).toBe(false);
    await close();
  }, 90000);

  for (const wrap of ['theme-default', 'theme-dark', 'theme-contrast']) {
    it(wrap + ': the zoom note passes axe', async () => {
      await open(320, 640, wrap, wrap === 'theme-dark' ? { isDark: true } : wrap === 'theme-contrast' ? { isContrast: true } : {});
      await seed();
      await pressText('Neighbour X-ray');
      await page.waitForTimeout(250);
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('[data-life-zoom-note]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
      expect(audit.violations.map((v) => [v.id, v.nodes.map((n) => n.html.slice(0, 120))])).toEqual([]);
      expect(audit.passes.length).toBeGreaterThan(0);
      await close();
    }, 90000);
  }
});
