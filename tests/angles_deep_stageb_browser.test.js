// Angle Explorer stage B (2026-11-03) in a real browser (Chromium).
// 1. Live drags on a real React mount: a mouse drag keeps going outside the
//    SVG (pointer capture) and stops on release; a real touch drag (CDP touch
//    events) moves the ray without scrolling the page; the protractor body and
//    a circle-theorem point drag too.
// 2. The new surfaces (polygons, circles, unit circle, contexts, constructions)
//    pass axe WCAG 2.2 A/AA, 320px reflow and text spacing, light and dark.
// Same machinery as tests/angles_deep_wcag_browser.test.js.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');

const HOST = `window.__mount = function (init) {
  var cfg = window.StemLab._registry.protractor;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var a = React.useState(init.angleValue != null ? init.angleValue : 45), ch = React.useState(null), fb = React.useState(null), sc = React.useState({ correct: 0, total: 0 });
    var td = React.useState({ protractor: init.protractor || {}, angles: {} });
    window.__live = { angleValue: a[0], d: td[0].protractor };
    var update = function (slot, k, v) { td[1](function (p) { var o = Object.assign({}, p); o[slot] = Object.assign({}, p[slot] || {}); o[slot][k] = v; return o; }); };
    var updateMulti = function (slot, obj) { td[1](function (p) { var o = Object.assign({}, p); o[slot] = Object.assign({}, p[slot] || {}, obj); return o; }); };
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1], update: update, updateMulti: updateMulti,
      angleValue: a[0], setAngleValue: a[1], angleChallenge: ch[0], setAngleChallenge: ch[1], angleFeedback: fb[0], setAngleFeedback: fb[1], exploreScore: sc[0], setExploreScore: sc[1],
      awardXP: function () {}, addToast: function () {}, t: function (k, f) { return f || k; } });
  }
  if (window.__root) window.__root.unmount();
  window.__root = ReactDOM.createRoot(document.getElementById('root'));
  window.__root.render(React.createElement(Host));
};`;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function livePage(init, opts) {
  const context = await browser.newContext(Object.assign({ viewport: { width: 700, height: 900 } }, opts || {}));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div style="height:260px"></div><div id="root" style="width:600px;margin-left:40px"></div><div style="height:2400px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate((i) => window.__mount(i), init);
  await page.waitForTimeout(50);
  return { page, context, errors };
}
const scrollTo = (page, sel) => page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); window.scrollBy(0, r.top - 300); }, sel);
const live = (page) => page.evaluate(() => ({ angleValue: window.__live.angleValue, d: window.__live.d }));
// Screen point of an SVG viewBox point.
async function screenOf(page, selector, x, y) {
  return page.evaluate(([sel, vx, vy]) => {
    const svg = document.querySelector(sel); const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
    return { x: r.left + vx * r.width / vb.width, y: r.top + vy * r.height / vb.height };
  }, [selector, x, y]);
}

describe('real pointer drags', () => {
  it('a mouse drag keeps following outside the SVG and stops on release', async () => {
    const { page, context, errors } = await livePage({ angleValue: 0, protractor: { activeTab: 'explore' } });
    await scrollTo(page, '[data-protractor-svg]');
    const start = await screenOf(page, '[data-protractor-svg]', 370, 200);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Straight up from the centre, 230 px above the SVG's top edge: 90°.
    const up = await screenOf(page, '[data-protractor-svg]', 200, -230);
    await page.mouse.move(up.x, up.y, { steps: 6 });
    expect((await live(page)).angleValue).toBe(90);
    const left = await screenOf(page, '[data-protractor-svg]', -150, 200);
    await page.mouse.move(Math.max(1, left.x), left.y, { steps: 6 });
    expect((await live(page)).angleValue).toBe(180);
    await page.mouse.up();
    const after = await screenOf(page, '[data-protractor-svg]', 200, 380);
    await page.mouse.move(after.x, after.y, { steps: 4 });
    expect((await live(page)).angleValue, 'still dragging after release').toBe(180);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);

  it('a real touch drag turns the ray and does not scroll the page', async () => {
    const { page, context, errors } = await livePage({ angleValue: 0, protractor: { activeTab: 'explore' } }, { hasTouch: true, isMobile: false });
    const cdp = await context.newCDPSession(page);
    await scrollTo(page, '[data-protractor-svg]');
    const y0 = await page.evaluate(() => window.scrollY);
    expect(y0).toBeGreaterThan(0);
    const start = await screenOf(page, '[data-protractor-svg]', 370, 200);
    const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await touch('touchStart', start);
    for (let k = 1; k <= 8; k++) {
      const a = (k / 8) * 120 * Math.PI / 180;
      await touch('touchMove', await screenOf(page, '[data-protractor-svg]', 200 + 170 * Math.cos(a), 200 - 170 * Math.sin(a)));
    }
    await touch('touchEnd');
    await page.waitForTimeout(30);
    const st = await live(page);
    expect(st.angleValue).toBe(120);
    expect(await page.evaluate(() => window.scrollY), 'the drag scrolled the page').toBe(y0);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);

  it('the protractor body and a circle-theorem point drag with the mouse', async () => {
    const { page, context } = await livePage({ protractor: { activeTab: 'protractor', mMode: 'read', mPlace: { x: 100, y: 220, rot: 0 } } });
    await scrollTo(page, '[data-angles-measure-svg]');
    const a = await screenOf(page, '[data-angles-measure-svg]', 100, 220);
    const b = await screenOf(page, '[data-angles-measure-svg]', 160, 180);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    const pl = (await live(page)).d.mPlace;
    expect(Math.abs(pl.x - 160)).toBeLessThanOrEqual(1);
    expect(Math.abs(pl.y - 180)).toBeLessThanOrEqual(1);
    await page.evaluate(() => window.__mount({ protractor: { activeTab: 'circles', ciMode: 'inscribed', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'ci:insc:100:insc' }, citRes: { code: 'ok', ok: true }, citTries: 1 } }));
    await page.waitForTimeout(50);
    await scrollTo(page, '[data-angles-circle-svg]');
    const pt = (deg) => screenOf(page, '[data-angles-circle-svg]', 180 + 115 * Math.cos(deg * Math.PI / 180), 150 - 115 * Math.sin(deg * Math.PI / 180));
    const p0 = await pt(230);
    await page.mouse.move(p0.x, p0.y); await page.mouse.down();
    for (const deg of [250, 280, 310]) { const q = await pt(deg); await page.mouse.move(q.x, q.y, { steps: 3 }); }
    await page.mouse.up();
    const d = (await live(page)).d;
    expect(Math.abs(d.ciLive.p - 310)).toBeLessThanOrEqual(1);
    expect(await page.textContent('[data-angles-ci-readout]')).toMatch(/∠APB = 50°/);
    await context.close();
  }, 30000);
});

const P = (patch) => ({ protractor: patch });
const BASE_CASES = [
  ['polygons sum investigation', P({ activeTab: 'polygons', pgMode: 'sum', pgPred: { pick: 'p_add180', locked: true }, pgN: 6, pgSeed: 4, pgDiags: [[0, 2], [0, 3], [0, 4]], pgRuns: { 4: { tri: 2, sum: 360 }, 5: { tri: 3, sum: 540 }, 6: { tri: 4, sum: 720 } }, pgRow: { n: 6, code: 'ok', ok: true, tries: 1 }, pgClaim: { pick: 'c_n2', ok: true, tries: 1, msg: 'ok' } })],
  ['polygons before predicting', P({ activeTab: 'polygons', pgMode: 'sum' })],
  ['polygons exterior walk', P({ activeTab: 'polygons', pgMode: 'ext', pgWalkPred: { pick: 'w_360', locked: true }, pgWalk: { n: 6, seed: 8, step: 3 } })],
  ['polygons tiling', P({ activeTab: 'polygons', pgMode: 'tile', pgTilePred: { picks: { 3: true, 4: true }, locked: true }, pgTileSel: 5, pgTileRows: { 3: { ok: true }, 4: { ok: true }, 5: { pick: 'yes', ok: false, tries: 1 } }, pgMix: [3, 12, 12] })],
  ['polygons practice', P({ activeTab: 'polygons', pgMode: 'practice', level: 'g8', pgpHint: 2 })],
  ['circles inscribed explore', P({ activeTab: 'circles', ciMode: 'inscribed', citT: { kind: 'inscribed', a: 0, b: 100, p: 230, m: 100, ask: 'insc', given: 100, answer: 50, id: 'i' }, citRes: { code: 'ok', ok: true }, citTries: 1 })],
  ['circles cyclic predict', P({ activeTab: 'circles', ciMode: 'cyclic', level: 'g4' })],
  ['unit circle explore', P({ activeTab: 'circles', ciMode: 'unit', ucDeg: 150 })],
  ['unit circle coordinates', P({ activeTab: 'circles', ciMode: 'unit', ucView: 'practice', level: 'g8', uctT: { kind: 'coord', deg: 225, fn: 'sin', answer: '-√2/2', id: 'u' }, uctRes: { code: 'sign_quadrant' }, uctTries: 1 })],
  ['contexts clock', P({ activeTab: 'contexts', cxMode: 'clock', cxtHint: 2 })],
  ['contexts bearing', P({ activeTab: 'contexts', cxMode: 'bearing', level: 'g8', cxtT: { kind: 'bearing', v: 'back', b: 250, answer: 70, id: 'b' } })],
  ['contexts roof revealed', P({ activeTab: 'contexts', cxMode: 'pitch', level: 'g8', cxtT: { kind: 'pitch', v: 'tan', rise: 6, run: 12, answer: 26.6, id: 'p' }, cxtRes: { code: 'pitch_used_sin', revealed: true }, cxtTries: 2 })],
  ['construct bisect', P({ activeTab: 'construct', conKind: 'bisect', con: { kind: 'bisect', m: 80, base: 0, B: { x: 140, y: 200 }, lenBA: 150, lenBC: 150, id: 'con:bisect:80:0', steps: [{ tool: 'compass', centre: 'B', r: 50 }, { tool: 'compass', centre: 'D', r: 50 }] }, conMsg: { code: 'ok' } })],
  ['construct copy', P({ activeTab: 'construct', conKind: 'copy' })],
];
const CASES = [];
for (const [name, state] of BASE_CASES) {
  CASES.push({ name, state, overrides: {} });
  CASES.push({ name: name + ' (dark)', state, overrides: { isDark: true } });
}
CASES.push({ name: 'teacher panel with new misconceptions', state: P({ activeTab: 'polygons', misTally: { sum_n180: 2, pi_is_180_number: 1 } }), overrides: { isTeacherMode: true } });

describe('stage-B surfaces pass WCAG in a real browser', () => {
  for (const testCase of CASES) {
    it(testCase.name, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(SOURCE, 'protractor');
      const rendered = prepareStemBrowserRender(renderTool('protractor', testCase.state, testCase.overrides));
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
        '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target, html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? [n.any[0].data.fgColor, n.any[0].data.bgColor, n.any[0].data.contrastRatio] : undefined })) }));
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders || []).slice(0, 800)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
