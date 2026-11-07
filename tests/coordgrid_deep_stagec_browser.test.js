// Coordinate Grid stage C (2026-11-03) in a real browser (Chromium): pointer
// clicks on the viewBox-scaled grids land on the right coordinate at a 320 px
// phone width and a 1280 px desktop width. Every grid draws in a 400 x 400
// viewBox and scales to its box, so a click must map back through the rendered
// size. Clicks are made at screen pixels computed from the grid's own axes and
// nudged off the grid point by up to 0.4 of a unit, so a mapping that is off by
// a border, padding or the wrong scale lands on a neighbour and fails.
// Also: a real touch tap plots once, the page does not scroll sideways at 320 px.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.COORDGRID_DEEP_FILE || 'stem_lab/stem_tool_coordgrid.js';
const root = process.cwd();
const cssDirectory = path.join(root, 'app/static/css');
const cssFile = fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file));
const appCss = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');

const HOST = `window.__mount = function (init) {
  var cfg = window.StemLab._registry.coordinate;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState({ _coordGrid: init });
    var sc = React.useState({ correct: 0, total: 0 });
    window.__live = td[0]._coordGrid;
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1],
      exploreScore: sc[0], setExploreScore: sc[1], gradeLevel: '6th Grade', awardXP: function () {}, addToast: function () {}, announceToSR: function () {},
      setStemLabTool: function () {}, t: function (k, f) { return f || k; } });
  }
  if (window.__root) window.__root.unmount();
  window.__root = ReactDOM.createRoot(document.getElementById('root'));
  window.__root.render(React.createElement(Host));
};`;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function livePage(width, init, opts) {
  const context = await browser.newContext(Object.assign({ viewport: { width, height: 900 } }, opts || {}));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
    '</style></head><body style="margin:0"><main id="root" style="padding:0 8px"></main></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate((i) => window.__mount(i), init);
  await page.waitForTimeout(60);
  return { page, context, errors };
}
const live = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__live)));

// The screen pixel of grid point (x, y) on the explore grid (0..400 viewBox, the
// visible range [lo, hi] on both axes), plus a nudge in grid units.
async function explorePixel(page, x, y, lo, hi, nudge) {
  return page.evaluate(([gx, gy, a, b, n]) => {
    const svg = document.querySelector('#coordinate-section-panel svg.allo-cg-grid');
    svg.scrollIntoView({ block: 'center' });
    const r = svg.getBoundingClientRect();
    const ux = (gx + n.x - a) / (b - a) * 400, uy = 400 - (gy + n.y - a) / (b - a) * 400;
    return { x: r.left + ux * r.width / 400, y: r.top + uy * r.height / 400, w: r.width, h: r.height };
  }, [x, y, lo, hi, nudge || { x: 0, y: 0 }]);
}
// The same for a stage B grid (mkFrame: 400 x 400, margins L 32, R 14, T 14, B 30).
async function framePixel(page, app, x, y, box, nudge) {
  return page.evaluate(([id, gx, gy, b, n]) => {
    const svg = document.querySelector('[data-coordgrid-app="' + id + '"] svg');
    svg.scrollIntoView({ block: 'center' });
    const r = svg.getBoundingClientRect();
    const ux = 32 + (gx + n.x - b.xmin) / (b.xmax - b.xmin) * (400 - 32 - 14);
    const uy = 400 - 30 - (gy + n.y - b.ymin) / (b.ymax - b.ymin) * (400 - 14 - 30);
    return { x: r.left + ux * r.width / 400, y: r.top + uy * r.height / 400, w: r.width, h: r.height };
  }, [app, x, y, box, nudge || { x: 0, y: 0 }]);
}

const P = (x, y) => ({ x, y });
const NUDGES = [{ x: 0, y: 0 }, { x: 0.4, y: -0.4 }, { x: -0.4, y: 0.35 }];
const TRI = [P(1, 1), P(4, 1), P(1, 3)];
const ROT = { type: 'rotate', p: P(3, 1), angle: 90, c: P(0, 0), answer: P(-1, 3), tries: 0, hint: 0, stage: 'answer' };
const TAB = { type: 'table', ctx: 'plant', m: 2, b: 3, xstep: 2, xs: [0, 2, 4, 6, 8], ys: [3, 7, 11, 15, 19], askX: 12, askY: 27, tries: 0, hint: 0, stage: 'plot' };
const MISSION = { type: 'mission', lo: 0, hi: 10, T: P(4, 6), lms: [{ id: 'well', p: P(4, 2) }, { id: 'palm', p: P(8, 6) }], clues: [{ kind: 'same_x', lm: 0 }, { kind: 'same_y', lm: 1 }], digs: [], marks: [], tries: 0, hint: 0, done: false };

for (const width of [320, 1280]) {
  describe('pointer clicks map to the right coordinate at ' + width + ' px', () => {
    it('explore grid, four quadrants (-10..10): each click plots the point it was aimed at', async () => {
      const { page, context, errors } = await livePage(width, { cgTab: 'explore', cgLevel: 'g6' });
      // Edge points are aimed a little inside: the grid point sits on the SVG's own edge.
      const targets = [[P(3, -2), NUDGES[0]], [P(-7, 5), NUDGES[1]], [P(0, 0), NUDGES[2]], [P(10, 10), { x: -0.3, y: -0.3 }], [P(-10, -9), { x: 0.3, y: 0.4 }], [P(6, 1), NUDGES[1]]];
      for (let i = 0; i < targets.length; i++) {
        const q = targets[i][0];
        const px = await explorePixel(page, q.x, q.y, -10, 10, targets[i][1]);
        await page.mouse.click(px.x, px.y);
        const pts = (await live(page)).gridPoints || [];
        expect(pts[pts.length - 1], 'aimed at ' + JSON.stringify(q) + ' with svg ' + px.w.toFixed(0) + 'px').toEqual(q);
      }
      expect(((await live(page)).gridPoints || []).length).toBe(targets.length);
      if (width === 320) {
        const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, svg: document.querySelector('svg.allo-cg-grid').getBoundingClientRect().width }));
        expect(r.sw).toBeLessThanOrEqual(r.cw);
        expect(r.svg).toBeLessThan(320);
      } else {
        const w = await page.evaluate(() => document.querySelector('svg.allo-cg-grid').getBoundingClientRect().width);
        expect(w).toBeGreaterThan(400); // scaled up past the 400-unit viewBox
      }
      expect(errors).toEqual([]);
      await context.close();
    }, 45000);

    it('explore grid, quadrant I view (0..10), grade 5', async () => {
      const { page, context, errors } = await livePage(width, { cgTab: 'explore', cgLevel: 'g5', q1View: true });
      for (const [q, n] of [[P(7, 4), NUDGES[1]], [P(0, 9), { x: 0.3, y: 0.2 }], [P(10, 0), { x: -0.3, y: 0.3 }], [P(2, 3), NUDGES[2]]]) {
        const px = await explorePixel(page, q.x, q.y, 0, 10, n);
        await page.mouse.click(px.x, px.y);
        const pts = (await live(page)).gridPoints || [];
        expect(pts[pts.length - 1], 'aimed at ' + JSON.stringify(q)).toEqual(q);
      }
      expect(errors).toEqual([]);
      await context.close();
    }, 45000);

    it('transformations grid: a click sets the rotation prediction', async () => {
      const { page, context, errors } = await livePage(width, { cgTab: 'transform', cgLevel: 'g8', tfTask: ROT });
      const box = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
      for (const [q, n] of [[P(-1, 3), NUDGES[1]], [P(8, -6), NUDGES[2]], [P(-10, 10), { x: 0.3, y: -0.3 }]]) {
        const px = await framePixel(page, 'tf', q.x, q.y, box, n);
        await page.mouse.click(px.x, px.y);
        const st = await live(page);
        expect([st.tfFb.ansX, st.tfFb.ansY], 'aimed at ' + JSON.stringify(q)).toEqual([String(q.x), String(q.y)]);
      }
      expect(errors).toEqual([]);
      await context.close();
    }, 45000);

    it('patterns grid (scaled axes: x step 2, y step 5): a click plots the pair', async () => {
      const { page, context, errors } = await livePage(width, { cgTab: 'patterns', cgLevel: 'g6', ptTask: TAB, ptFb: { pts: [] } });
      const box = { xmin: 0, xmax: 10, ymin: 0, ymax: 25 }; // x up to 8 + 2, y up to 19 + 4, rounded to steps of 1 and 5
      for (const [i, q] of [P(2, 7), P(8, 19), P(0, 3)].entries()) {
        const px = await framePixel(page, 'pt', q.x, q.y, box, { x: NUDGES[i % NUDGES.length].x * 0.5, y: NUDGES[i % NUDGES.length].y * 0.5 });
        await page.mouse.click(px.x, px.y);
        const pts = (await live(page)).ptFb.pts;
        expect(pts[pts.length - 1], 'aimed at ' + JSON.stringify(q)).toEqual(q);
      }
      expect(errors).toEqual([]);
      await context.close();
    }, 45000);

    it('treasure map: a click digs at the aimed spot', async () => {
      const { page, context, errors } = await livePage(width, { cgTab: 'treasure', cgLevel: 'g5', thMission: MISSION });
      const box = { xmin: 0, xmax: 10, ymin: 0, ymax: 10 };
      const px = await framePixel(page, 'th', 3, 7, box, { x: 0.3, y: 0.3 });
      await page.mouse.click(px.x, px.y);
      expect((await live(page)).thMission.digs).toEqual([P(3, 7)]);
      const px2 = await framePixel(page, 'th', 4, 6, box, { x: -0.35, y: 0.2 });
      await page.mouse.click(px2.x, px2.y);
      const st = await live(page);
      expect(st.thMission.digs).toEqual([P(3, 7), P(4, 6)]);
      expect(st.thFb.correct).toBe(true);
      expect(errors).toEqual([]);
      await context.close();
    }, 45000);
  });
}

// The stage C surfaces: the Start-here path, the band-ordered tabs, the closed
// item with its Show the answer button, and the judge choices.
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const JUDGE = { type: 'judge', A: TRI, B: [P(-1, -4), P(-4, -4), P(-1, -2)], proposed: [{ kind: 'reflect', line: 'x', a: 0 }, { kind: 'translate', dx: 0, dy: -5 }], maps: false, wrongStep: 0, slip: 'wrong_mirror', fixStep: { kind: 'reflect', line: 'y', a: 0 }, similar: false, tries: 1, hint: 0, stage: 'pick', excluded: ['none'] };
const AXE_CASES = [
  ['grade 5 path, explore', { cgTab: 'explore', cgLevel: 'g5', plotsSolved: 3 }, 'data-coordgrid-path-step="name5"'],
  ['grade 8 judge with a ruled-out choice', { cgTab: 'transform', cgLevel: 'g8', tfTask: JUDGE, tfFb: { msg: 'Not yet.', correct: false } }, 'No step is wrong'],
  ['closed item waiting for Show the answer', { cgTab: 'explore', cgLevel: 'g6', gridChallenge: { type: 'name', target: P(3, -2), tries: 2 }, revealedItems: { 'name:3,-2': 1 }, gridFeedback: { msg: 'Not yet.', correct: false, revealed: false } }, 'data-coordgrid-reveal'],
  ['treasure out of digs', { cgTab: 'treasure', cgLevel: 'g5', thMission: Object.assign({}, MISSION, { done: true, digs: [P(1, 1), P(2, 2), P(3, 3)] }), thFb: { msg: 'Out of digs.', correct: false } }, 'Show where the treasure was'],
];
describe('stage C surfaces pass axe WCAG 2.2 AA and reflow at 320 px', () => {
  for (const [name, cg, marker] of AXE_CASES) {
    for (const theme of [{}, { isDark: true }]) {
      it(name + (theme.isDark ? ' (dark)' : ''), async () => {
        resetStemLab();
        document.head.querySelectorAll('style').forEach((s) => s.remove());
        loadTool(SOURCE, 'coordinate');
        const rendered = prepareStemBrowserRender(renderTool('coordinate', { _coordGrid: cg }, Object.assign({ isTeacherMode: true }, theme)));
        expect(rendered.html).toContain(marker);
        const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
        await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + appCss +
          '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
        for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: axeSource });
        const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
        const violations = audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)) }));
        const reflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        expect.soft(violations).toEqual([]);
        expect.soft(reflow.sw).toBeLessThanOrEqual(reflow.cw);
        await page.close();
      }, 30000);
    }
  }
});

describe('a real touch tap on the phone-width grid', () => {
  it('plots exactly one point at the tapped coordinate and does not scroll sideways', async () => {
    const { page, context, errors } = await livePage(320, { cgTab: 'explore', cgLevel: 'g6' }, { hasTouch: true, isMobile: true });
    const px = await explorePixel(page, -4, 6, -10, 10, { x: 0.3, y: -0.3 });
    await page.touchscreen.tap(px.x, px.y);
    await page.waitForTimeout(80);
    expect((await live(page)).gridPoints).toEqual([P(-4, 6)]);
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(r.sw).toBeLessThanOrEqual(r.cw);
    expect(errors).toEqual([]);
    await context.close();
  }, 45000);
});
