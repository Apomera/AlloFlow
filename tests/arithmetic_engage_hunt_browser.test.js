// Hunt of the Arithmetic engagement build (2026-11-04), in Chromium with the host's real theme CSS
// (AppStyles mounted, the shell and --allo-stem vars), plus real touch.
// ARITH_HUNT_FILE points the suite at the start copy to prove the contrast gate fails there.
// The touch and scroll tests are guards: they pass on both copies.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const FILE = path.resolve(ROOT, process.env.ARITH_HUNT_FILE || 'stem_lab/stem_tool_arithmetic.js');
const cssDir = path.join(ROOT, 'app/static/css');
const cssSource = fs.readFileSync(path.join(cssDir, fs.readdirSync(cssDir).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const REACT = path.join(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js');
const REACT_DOM = path.join(ROOT, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const APP_STYLES = fs.readFileSync(path.join(ROOT, 'app_styles_module.js'), 'utf8');
const VARS = '--allo-stem-canvas:#000000;--allo-stem-panel:#000000;--allo-stem-deeper:#000000;--allo-stem-text:#ffff00;--allo-stem-text-soft:#ffff00;--allo-stem-border:#ffff00;--allo-stem-button-bg:#000000;--allo-stem-button-text:#00ff00;--allo-stem-button-border:#00ff00';

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function open({ theme = 'light', band = 'g35', grade = '4th Grade', width = 390, height = 700, seed = {}, touch = false }) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  const hc = theme === 'contrast';
  await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}</style></head>
<body><div id="app" class="${hc ? 'theme-contrast' : 'theme-default'}" style="${hc ? VARS : ''}"><div data-stem-lab="true"><div data-stem-tool-shell="arithmeticStudio" data-stem-theme="${theme}"><div id="wrap"></div></div></div></div></body></html>`, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: cssSource });
  await page.addScriptTag({ path: REACT });
  await page.addScriptTag({ path: REACT_DOM });
  await page.evaluate(() => { window.StemLab = { _registry: {}, registerTool(id, cfg) { cfg.id = id; this._registry[id] = cfg; } }; });
  await page.addScriptTag({ path: FILE });
  await page.evaluate(({ seed, band, grade, hc, src }) => {
    const e = React.createElement;
    const cfg = window.StemLab._registry.arithmeticStudio;
    let bump = null;
    const ctx = { React, toolData: { _arithmeticStudio: seed },
      setToolData(f) { ctx.toolData = typeof f === 'function' ? f(ctx.toolData) : f; if (bump) queueMicrotask(bump); },
      setStemLabTool() {}, addToast() {}, awardXP() {}, announceToSR() {}, t: (k, fb) => fb || k,
      gradeBand: band, gradeLevel: grade, isDark: false, theme: hc ? 'contrast' : 'light', isContrast: hc, isTeacherMode: false,
      icons: new Proxy({}, { get: () => () => e('svg', { width: 18, height: 18, 'aria-hidden': 'true' }) }),
      a11yClick: (h) => ({ onClick: h, role: 'button', tabIndex: 0 }), srOnly: (text) => e('span', { className: 'sr-only' }, text), beep() {}, props: {} };
    window.__ctx = ctx;
    window.__set = (s) => ctx.setToolData(() => ({ _arithmeticStudio: s }));
    function Comp() { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); }
    ReactDOM.createRoot(document.getElementById('wrap')).render(e(Comp));
    if (hc) {
      new Function('window', src)(window);
      const host = document.createElement('div'); document.body.appendChild(host);
      ReactDOM.createRoot(host).render(e(window.AlloModules.AppStyles.AppStyles, null));
    }
  }, { seed, band, grade, hc, src: hc ? APP_STYLES : '' });
  await page.waitForTimeout(300);
  return page;
}

// Every enabled button's text, spans inside included, against the fill actually painted.
const BUTTON_CONTRAST = () => {
  const parse = (c) => { const m = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const bgOf = (n) => { while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c.a >= 1) return c; n = n.parentElement; } return { r: 255, g: 255, b: 255 }; };
  const bad = []; let checked = 0;
  document.querySelectorAll('#wrap button').forEach((b) => {
    if (b.disabled || b.getAttribute('aria-disabled') === 'true') return;
    const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) {
      if (!tw.currentNode.nodeValue.trim()) continue;
      const el = tw.currentNode.parentElement;
      const fg = parse(getComputedStyle(el).color), bg = bgOf(el);
      const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      checked++;
      if (ratio < 4.5) bad.push(`${tw.currentNode.nodeValue.trim().slice(0, 40)} ${ratio.toFixed(2)}`);
    }
  });
  return { checked, bad };
};

describe('contrast theme in the real host CSS', () => {
  const STATES = [
    ['first screen', 'g35', {}],
    ['learn walk', 'g35', { tab: 'learn', operation: 'subtract', a: 102, b: 38, exchangeSignature: 'subtract:102:38', exchangeStep: 2 }],
    ['subtract invalid', 'g35', { tab: 'learn', operation: 'subtract', a: 5, b: 38 }],
    ['practice disks', 'g35', { tab: 'practice', operation: 'add', level: 1, practiceSource: 'set', practiceProblemId: 'a1', practiceIndex: 0, estimateLocked: true, estimateStatus: 'ok', estimateInput: '60', answerInput: '52', feedback: 'try', practiceTry: 2, practiceErrorKind: 'regroup_slip', practiceDisksFor: 'a1', practiceDiskSig: 'add:27:35', practiceDiskStep: 1 }],
    ['k2 ten frame', 'k2', { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0, tfFor: 'nt-k2-0', tfMoved: 1 }],
    ['every tab: errors', 'g35', { tab: 'errors' }],
    ['every tab: bars', 'g35', { tab: 'bars' }],
    ['every tab: word', 'g35', { tab: 'word' }],
    ['every tab: decimals', 'g35', { tab: 'decimals' }],
  ];
  for (const [name, band, seed] of STATES) {
    it(`${name}: no button reads black on black or yellow on yellow`, async () => {
      const page = await open({ theme: 'contrast', band, grade: band === 'k2' ? '1st Grade' : '4th Grade', seed });
      const res = await page.evaluate(BUTTON_CONTRAST);
      await page.context().close();
      expect(res.checked).toBeGreaterThan(3);
      expect(res.bad).toEqual([]);
    }, 45000);
  }

  it('the primary move is a filled yellow button with black text, and hover stays readable', async () => {
    const page = await open({ theme: 'contrast', width: 1100, height: 900, seed: {} });
    const walk = page.locator('[data-walk-next]');
    const read = () => walk.evaluate((b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]);
    expect(await read()).toEqual(['rgb(0, 0, 0)', 'rgb(251, 191, 36)']);
    await walk.hover();
    await page.waitForTimeout(60);
    expect(await read()).toEqual(['rgb(0, 0, 0)', 'rgb(0, 255, 0)']);
    await page.context().close();
  }, 45000);
});

describe('real touch', () => {
  async function drag(page, x, y0, y1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + (y1 - y0) * i / 12 }] }); await page.waitForTimeout(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);
  }
  const place = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); scrollBy(0, r.top - 350); }, sel);
  const D = (page) => page.evaluate(() => window.__ctx.toolData._arithmeticStudio);

  it('(guard) one tap on a marked disk is one move; a tap on a disk that is not marked does nothing', async () => {
    const page = await open({ touch: true, seed: { tab: 'learn', operation: 'add', a: 58, b: 67 } });
    await place(page, '[data-trade-source="true"]');
    await page.waitForTimeout(100);
    const b = await page.locator('[data-trade-source="true"] [data-disk-marked]').first().boundingBox();
    await page.touchscreen.tap(b.x + 6, b.y + 6);
    await page.waitForTimeout(350);
    expect((await D(page)).exchangeStep).toBe(1);
    const other = await page.locator('[data-place="1"] [role="img"] > span').first().boundingBox();
    await page.touchscreen.tap(other.x + 6, other.y + 6);
    await page.waitForTimeout(350);
    expect((await D(page)).exchangeStep).toBe(1);
    await page.context().close();
  }, 45000);

  it('(guard) one tap on a counter moves one counter; the last one sends focus to the answer box', async () => {
    const page = await open({ touch: true, band: 'k2', grade: '1st Grade', seed: { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0 } });
    const gap = await page.evaluate(() => { const P = window.ArithmeticStrategyPure, it = P.genMentalItem('nt', 'k2', 0); return P.mentalFit('makeTen', 'add', it.a, it.b).vals.gap; });
    for (let i = 1; i <= gap; i++) {
      await place(page, '[data-ten-frame-counter]');
      await page.waitForTimeout(80);
      const b = await page.locator('[data-ten-frame-counter]').first().boundingBox();
      await page.touchscreen.tap(b.x + 22, b.y + 22);
      await page.waitForTimeout(300);
      expect((await D(page)).tfMoved).toBe(i);
    }
    expect(await page.evaluate(() => document.activeElement.hasAttribute('data-nt-answer'))).toBe(true);
    await page.context().close();
  }, 45000);

  it('(guard) a phone can still scroll the page from the disks and from a counter, and neither swipe makes a move', async () => {
    let page = await open({ touch: true, height: 600, seed: { tab: 'learn', operation: 'add', a: 58, b: 67 } });
    await place(page, '[data-place="1"] [role="img"]');
    await page.waitForTimeout(120);
    let y0 = await page.evaluate(() => scrollY);
    let b = await page.locator('[data-place="1"] [role="img"]').boundingBox();
    await drag(page, b.x + 15, b.y + 10, b.y - 190);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 100);
    expect((await D(page)).exchangeStep).toBeUndefined();
    await page.context().close();
    page = await open({ touch: true, height: 600, band: 'k2', grade: '1st Grade', seed: { tab: 'mental', mmMode: 'talk', genBand: 'k2', ntIndex: 0 } });
    await place(page, '[data-ten-frame-counter]');
    await page.waitForTimeout(120);
    y0 = await page.evaluate(() => scrollY);
    b = await page.locator('[data-ten-frame-counter]').first().boundingBox();
    await drag(page, b.x + 15, b.y + 10, b.y - 190);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 100);
    expect((await D(page)).tfMoved).toBeUndefined();
    await page.context().close();
  }, 60000);
});
