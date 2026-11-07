// Data Plot stage C (2026-11-03) in a real browser (Chromium).
// 1. Live drags on a real React mount: the best-fit line ends and the mean-versus-median
//    outlier follow a mouse (also outside the SVG, thanks to pointer capture) and a real
//    CDP touch drag, stop on release, and never scroll the page.
// 2. The new surfaces (Start-here path, box-plot practice, reveal rows, graded own
//    two-way tables) and the tool's own dark surface pass axe WCAG 2.2 A/AA, 320 px reflow
//    and text spacing; every SVG label keeps 4.5:1 and every data dot 3:1 on its chart.
// Same machinery as tests/angles_deep_stageb_browser.test.js and the unitconvert dark tests.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { React, ReactDOMServer, extractReactSsrStyles, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const SOURCE = process.env.DATAPLOT_DEEP_SRC || 'stem_lab/stem_tool_dataplot.js';
const root = process.cwd();
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');
Function('window', fs.readFileSync(path.join(root, 'app_styles_module.js'), 'utf8'))(window);
const runtimeAppCssSheets = extractReactSsrStyles(ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.AppStyles.AppStyles, null))).cssSheets;

const HOST = `window.__mount = function (init, extra) {
  var cfg = window.StemLab._registry.dataPlot;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState({ dataPlot: init || {} });
    window.__live = td[0].dataPlot;
    var update = function (slot, k, v) { td[1](function (p) { var o = Object.assign({}, p); o[slot] = Object.assign({}, p[slot] || {}); o[slot][k] = v; return o; }); };
    var updateMulti = function (slot, obj) { td[1](function (p) { var o = Object.assign({}, p); o[slot] = Object.assign({}, p[slot] || {}, obj); return o; }); };
    return cfg.render(Object.assign({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1], update: update, updateMulti: updateMulti,
      awardXP: function () {}, addToast: function () {}, announceToSR: function () {}, t: function (k, f) { return f || k; } }, extra || {}));
  }
  if (window.__root) window.__root.unmount();
  window.__root = ReactDOMClient.createRoot(document.getElementById('root'));
  window.__root.render(React.createElement(Host));
};`;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function livePage(init, extra, opts) {
  const context = await browser.newContext(Object.assign({ viewport: { width: 700, height: 900 } }, opts || {}));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body style="margin:0"><div style="height:260px"></div><div id="root" style="width:600px;margin-left:40px"></div><div style="height:2400px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, 'window.ReactDOMClient = window.ReactDOM;', toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate(([i, x]) => window.__mount(i, x), [init, extra || {}]);
  await page.waitForTimeout(80);
  return { page, context, errors };
}
const scrollTo = (page, sel) => page.evaluate((q) => { const r = document.querySelector(q).getBoundingClientRect(); window.scrollBy(0, r.top - 300); }, sel);
const live = (page) => page.evaluate(() => window.__live);
// Screen point of an SVG viewBox point, honouring preserveAspectRatio "xMidYMid meet".
async function screenOf(page, selector, x, y) {
  return page.evaluate(([sel, vx, vy]) => {
    const svg = document.querySelector(sel); const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
    const s = Math.min(r.width / vb.width, r.height / vb.height), ox = (r.width - vb.width * s) / 2, oy = (r.height - vb.height * s) / 2;
    return { x: r.left + ox + vx * s, y: r.top + oy + vy * s };
  }, [selector, x, y]);
}
// The tool's fit geometry for generated set 1 at grades 6-8: value at a viewBox y, snapped like the tool.
async function fitValueAt(page, vy) {
  return page.evaluate((y) => {
    const m = window.StemLab._registry.dataPlot._math, set = m.genFitSet(1, '68'), ys = set.pts.map((p) => p.y);
    const ay = m.niceAxis(Math.min(...ys), Math.max(...ys)), step = ay.step / 20, FH = 320, PT = 18, PB = 46;
    const v = ay.min + ((FH - PB) - y) / (FH - PT - PB) * (ay.max - ay.min);
    return { v: Number(Math.max(ay.min, Math.min(ay.max, Math.round(v / step) * step)).toFixed(6)), max: ay.max, step };
  }, vy);
}
const SHIFT_VX = (v) => 30 + v / 100 * (440 - 46);

describe('real pointer drags', () => {
  it('best fit: a mouse drag moves a line end, keeps following outside the SVG, and stops on release', async () => {
    const { page, context, errors } = await livePage({ activeTab: 'fit' }, { gradeBand: 'g68' });
    await scrollTo(page, '[data-dataplot-fit-svg]');
    const h = await page.evaluate(() => { const r = document.querySelector('[data-dataplot-fit-handle="yA"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(h.x, h.y);
    await page.mouse.down();
    const inside = await screenOf(page, '[data-dataplot-fit-svg]', 82, 80);
    await page.mouse.move(inside.x, inside.y, { steps: 6 });
    const want = await fitValueAt(page, 80);
    expect(Math.abs((await live(page)).fitLab.yA - want.v)).toBeLessThanOrEqual(want.step + 1e-9);
    // Far above the SVG: pointer capture keeps the drag, and the end clamps to the top of the axis.
    await page.mouse.move(inside.x, inside.y - 400, { steps: 6 });
    expect((await live(page)).fitLab.yA).toBeCloseTo(want.max, 6);
    await page.mouse.up();
    const after = await screenOf(page, '[data-dataplot-fit-svg]', 82, 250);
    await page.mouse.move(after.x, after.y, { steps: 4 });
    expect((await live(page)).fitLab.yA, 'still dragging after release').toBeCloseTo(want.max, 6);
    expect(await page.textContent('[data-dataplot-fit-desc]')).toMatch(/Your line is y =/);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);

  it('best fit: a real touch drag moves the right end and does not scroll the page', async () => {
    const { page, context, errors } = await livePage({ activeTab: 'fit' }, { gradeBand: 'g68' }, { hasTouch: true, isMobile: false });
    const cdp = await context.newCDPSession(page);
    await scrollTo(page, '[data-dataplot-fit-svg]');
    const y0 = await page.evaluate(() => window.scrollY);
    expect(y0).toBeGreaterThan(0);
    const h = await page.evaluate(() => { const r = document.querySelector('[data-dataplot-fit-handle="yB"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    await touch('touchStart', h);
    const end = await screenOf(page, '[data-dataplot-fit-svg]', 358, 230);
    for (let k = 1; k <= 8; k++) await touch('touchMove', { x: h.x + (end.x - h.x) * k / 8, y: h.y + (end.y - h.y) * k / 8 });
    await touch('touchEnd');
    await page.waitForTimeout(30);
    const want = await fitValueAt(page, 230);
    expect(Math.abs((await live(page)).fitLab.yB - want.v)).toBeLessThanOrEqual(want.step + 1e-9);
    expect(await page.evaluate(() => window.scrollY), 'the drag scrolled the page').toBe(y0);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);

  it('mean versus median: the outlier follows the mouse, past the edge too, and stops on release', async () => {
    const { page, context, errors } = await livePage({ activeTab: 'stats', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], shiftDemo: { pred: 'mean' } });
    await scrollTo(page, '[data-dataplot-shift-svg]');
    const a = await screenOf(page, '[data-dataplot-shift-svg]', SHIFT_VX(10), 120);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    const b = await screenOf(page, '[data-dataplot-shift-svg]', SHIFT_VX(80), 120);
    await page.mouse.move(b.x, b.y, { steps: 6 });
    expect(Math.abs((await live(page)).shiftDemo.value - 80)).toBeLessThanOrEqual(1);
    // The red dot is drawn where the pointer is (the old padded axis put it far away).
    const dot = await page.evaluate(() => { const c = Array.from(document.querySelectorAll('[data-dataplot-shift-svg] circle')).sort((p, q) => q.r.baseVal.value - p.r.baseVal.value)[0].getBoundingClientRect(); return c.left + c.width / 2; });
    expect(Math.abs(dot - b.x)).toBeLessThanOrEqual(4);
    await page.mouse.move(b.x + 400, b.y, { steps: 6 });
    expect((await live(page)).shiftDemo.value).toBe(100);
    await page.mouse.up();
    const c = await screenOf(page, '[data-dataplot-shift-svg]', SHIFT_VX(40), 120);
    await page.mouse.move(c.x, c.y, { steps: 4 });
    expect((await live(page)).shiftDemo.value, 'still dragging after release').toBe(100);
    expect(await page.textContent('[data-dataplot-shift-verdict]')).toMatch(/Your prediction held/);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);

  it('mean versus median: a real touch drag moves the outlier without scrolling', async () => {
    const { page, context, errors } = await livePage({ activeTab: 'stats', points: [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }], shiftDemo: { pred: 'median' } }, {}, { hasTouch: true, isMobile: false });
    const cdp = await context.newCDPSession(page);
    await scrollTo(page, '[data-dataplot-shift-svg]');
    const y0 = await page.evaluate(() => window.scrollY);
    const touch = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
    const a = await screenOf(page, '[data-dataplot-shift-svg]', SHIFT_VX(10), 120), b = await screenOf(page, '[data-dataplot-shift-svg]', SHIFT_VX(60), 120);
    await touch('touchStart', a);
    for (let k = 1; k <= 8; k++) await touch('touchMove', { x: a.x + (b.x - a.x) * k / 8, y: a.y + 20 * k / 8 });
    await touch('touchEnd');
    await page.waitForTimeout(30);
    expect(Math.abs((await live(page)).shiftDemo.value - 60)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => window.scrollY), 'the drag scrolled the page').toBe(y0);
    expect(errors).toEqual([]);
    await context.close();
  }, 30000);
});

// ── WCAG and contrast of the new surfaces, light and dark ──
resetStemLab();
loadTool(SOURCE, 'dataPlot');
const MATH = window.StemLab._registry.dataPlot._math;
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const tt = (k, fb) => fb;
const boxItem = (MATH.genQuizItem && MATH.QUIZ_TYPES.includes('boxPlot')) ? MATH.genQuizItem('boxPlot', tt, seeded(5)) : null;
const pts = [3, 7, 4, 9, 12, 8, 15, 11].map((y, i) => ({ x: i + 1, y }));
const own = 'Grade 7, yes\nGrade 7, yes\nGrade 7, yes\nGrade 7, no\nGrade 8, no\nGrade 8, yes\nGrade 8, no';
const DARK = { isDark: true, theme: 'dark' };
const CASES = [
  ['start-here path, grades 6-8', { points: pts }, { gradeBand: 'g68' }],
  ['start-here path, K-5, with a pictograph question', { activeTab: 'quiz', quizType: 'pictograph' }, { gradeBand: 'k2' }],
  ['box-plot question after two misses', { activeTab: 'quiz', quizType: 'boxPlot', dpQuiz: boxItem && Object.assign({}, boxItem, { tries: 2, answered: true, feedback: 'Not yet.', wrong: [] }) }, { gradeBand: 'g68' }],
  ['own two-way table graded, verdict shown', { activeTab: 'twoway', twoWay: { mode: 'mine', customText: own, assocTries: 1, assocChoice: 'yes_pct', assocDone: true, assocCorrect: true } }, { gradeBand: 'g68' }],
  ['dark: chart with residual plot and regression', { points: pts, showResidualPlot: true, showResiduals: true, showLabels: true }, Object.assign({ gradeBand: 'g912' }, DARK)],
  ['dark: pie chart', { points: pts, chartType: 'pie' }, Object.assign({ gradeBand: 'g68' }, DARK)],
  ['dark: statistics with the outlier demo', { points: pts.slice(0, 4), activeTab: 'stats', shiftDemo: { pred: 'mean', value: 70, done: true } }, Object.assign({ gradeBand: 'g68' }, DARK)],
  ['dark: box-plot question with hints', { activeTab: 'quiz', quizType: 'boxPlot', dpQuiz: boxItem && Object.assign({}, boxItem, { hint: 2 }) }, Object.assign({ gradeBand: 'g68' }, DARK)],
  ['dark: best fit after two checks', { activeTab: 'fit', fitLab: { key: 'gen:68:1', seed: 1, tries: 2, last: { ratio: 3, ssr: 120, mis: 'tooFlat', m: 0, b: 30 } } }, Object.assign({ gradeBand: 'g68' }, DARK)],
  ['dark: two-way row percents, reveal row', { activeTab: 'twoway', twoWay: { key: 'twoway:1', seed: 1, built: true, view: 'row', assocChoice: 'yes_count', assocTries: 2, assocDone: true, assocFeedback: 'Misconception: comparing raw counts.' } }, Object.assign({ gradeBand: 'g68' }, DARK)],
  ['dark: sampling distributions', { activeTab: 'samples', sampling: { pred: 'narrower', draws: { 5: 40, 50: 40 }, checked: true } }, Object.assign({ gradeBand: 'g912' }, DARK)],
  ['dark: cause card revealed', { activeTab: 'cause', causeAnswers: { icecream: { tries: 2, chosen: 'cause', correct: false, done: true, shown: true, wrong: ['cause', 'reverse'] } } }, Object.assign({ gradeBand: 'g912' }, DARK)],
  ['dark: teacher panel at the XP cap', { quizXpTotal: 100, xpCapCorrect: 3, missedLog: [{ type: 'boxPlot', key: 'k', mis: 'That is the range.', at: 1 }] }, Object.assign({ gradeBand: 'g68', isTeacherMode: true }, DARK)],
  ['dark: K-5 pictograph chart', { points: pts.slice(0, 4), chartType: 'pictograph' }, Object.assign({ gradeBand: 'k2' }, DARK)]
];
function hostMarkup(dark, html) {
  if (!dark) return html;
  // The host's light card around the tool, as in the app: the tool must paint its own dark surface over it.
  return '<div data-stem-tool-shell="dataPlot" data-stem-theme="dark" style="background:var(--allo-stem-canvas);color:var(--allo-stem-text);min-height:100vh"><div data-stem-tool-surface="dataPlot" style="background:#fff;color:#0f172a;color-scheme:light;padding:10px">' + html + '</div></div>';
}

describe('stage C surfaces pass WCAG, and chart ink keeps its contrast, light and dark', () => {
  for (const [name, dp, ctx] of CASES) {
    it(name, async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(SOURCE, 'dataPlot');
      const dark = !!ctx.isDark;
      const rendered = prepareStemBrowserRender(renderTool('dataPlot', { dataPlot: dp }, Object.assign({ setStemLabTool: () => {} }, ctx)));
      expect(rendered.html.length).toBeGreaterThan(500);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss + '</style></head><body><main id="tool-root" class="' + (dark ? 'theme-dark' : '') + '">' + hostMarkup(dark, rendered.html) + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      if (dark) for (const css of runtimeAppCssSheets) await page.addStyleTag({ content: css });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      if (dark) {
        const bg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-dataplot-root]')).backgroundColor);
        expect(bg, 'the dark surface is really dark, not the host light card').toBe('rgb(15, 23, 42)');
      }
      await page.addScriptTag({ content: axeSource });
      await page.evaluate(() => { document.querySelectorAll('details').forEach((el) => { el.open = true; }); });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 4).map((n) => ({ html: n.html.slice(0, 160), data: n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? [n.any[0].data.fgColor, n.any[0].data.bgColor, n.any[0].data.contrastRatio] : undefined })) }));
      // axe does not judge SVG ink: every chart label needs 4.5:1 and every solid data dot 3:1 on its chart background.
      const ink = await page.evaluate(() => {
        const rgb = (s) => { const m = String(s).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m && (m[4] == null || Number(m[4]) > 0.99) ? [+m[1], +m[2], +m[3]] : null; };
        const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        const bad = []; let texts = 0, dots = 0;
        document.querySelectorAll('#tool-root svg[role="img"]').forEach((svg) => {
          const bg = rgb(getComputedStyle(svg).backgroundColor);
          if (!bg) return;
          svg.querySelectorAll('text').forEach((el) => {
            const c = rgb(getComputedStyle(el).fill); if (!c) return;
            // A pie label sits on its own slice (a <g> holding the slice shape and the label), not on the chart background.
            const p = el.parentNode; if (p && p.tagName === 'g' && p.querySelector(':scope > path, :scope > circle')) return;
            texts++; const r = ratio(c, bg); if (r < 4.5) bad.push({ kind: 'text', text: el.textContent.slice(0, 30), r: Math.round(r * 100) / 100 });
          });
          svg.querySelectorAll('circle').forEach((el) => {
            const cs = getComputedStyle(el); if (cs.fill === 'none' || Number(cs.fillOpacity) < 1 || Number(cs.opacity) < 1) return;
            const c = rgb(cs.fill); if (!c) return;
            dots++; const r = ratio(c, bg); if (r < 3) bad.push({ kind: 'dot', r: Math.round(r * 100) / 100 });
          });
        });
        return { bad: bad.slice(0, 8), texts, dots };
      });
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      const spacing = await auditTextSpacingReflow(page);
      expect.soft(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      expect.soft(ink.bad, JSON.stringify(ink)).toEqual([]);
      expect.soft(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      expect.soft(spacing.scrollWidth, JSON.stringify(spacing.offenders || []).slice(0, 800)).toBeLessThanOrEqual(spacing.clientWidth);
      await page.close();
    }, 30000);
  }
});
