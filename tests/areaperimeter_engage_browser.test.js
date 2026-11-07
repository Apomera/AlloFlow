// Area & Perimeter Lab engagement build (2026-11-04) in a real browser
// (Chromium): drag to paint squares, drag the corner handle to resize, drag the
// walker around the fence, and "Start" lands focus on the activity on a phone.
// AP_FILE lets the gate run against the start copy.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';

const root = process.cwd();
const SOURCE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');

const HOST = `window.__sr = [];
window.__mount = function (init, grade) {
  var cfg = window.StemLab._registry.areaPerimeter;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState(init ? { _areaPerimeter: init } : {});
    window.__live = td[0]._areaPerimeter || {};
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1], gradeLevel: grade || '5th Grade',
      awardXP: function () {}, announceToSR: function (m) { window.__sr.push(String(m)); }, addToast: function () {}, t: function (k, f) { return f || k; } });
  }
  window.__root = ReactDOM.createRoot(document.getElementById('root'));
  window.__root.render(React.createElement(Host));
};`;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function open(init, { width = 1100, viewport, grade } = {}) {
  const context = await browser.newContext({ viewport: viewport || { width: width + 120, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root" style="' + (viewport ? '' : 'width:' + width + 'px;margin-left:40px') + '"></div><div style="height:1600px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate(([s, g]) => window.__mount(s, g), [init, grade]);
  await page.waitForTimeout(150);
  return { page, context, errors };
}
const box = (page, sel) => page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, cx: b.left + b.width / 2, cy: b.top + b.height / 2 }; }, sel);
const live = (page) => page.evaluate(() => window.__live);
const lastSr = (page) => page.evaluate(() => window.__sr[window.__sr.length - 1]);
const metric = (page, k) => page.evaluate((key) => document.querySelector('[data-ap-metric="m-' + key + '"]').children[1].textContent, k);
async function drag(page, points, steps = 6) {
  await page.mouse.move(points[0][0], points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(x, y, { steps });
  await page.mouse.up();
  await page.waitForTimeout(120);
}

describe('Tile Explorer direct manipulation in a real browser', () => {
  it('paints a row by dragging, erases by dragging from a painted square, and a click paints one square once', async () => {
    const { page, context, errors } = await open({ mode: 'explore', width: 6, height: 4 });
    await page.evaluate(() => document.querySelector('[data-ap-explore-svg]').scrollIntoView({ block: 'center' }));
    const a = await box(page, '[data-ap-tile="0-0"]');
    const b = await box(page, '[data-ap-tile="5-0"]');
    await drag(page, [[a.cx, a.cy], [b.cx, b.cy]]);
    expect(Object.keys((await live(page)).revealedTiles).sort()).toEqual(['0-0', '1-0', '2-0', '3-0', '4-0', '5-0']);
    expect(await lastSr(page)).toBe('Painted 6 squares. 6 counted so far.');
    const c = await box(page, '[data-ap-tile="2-0"]');
    await drag(page, [[a.cx, a.cy], [c.cx, c.cy]]);
    expect(Object.keys((await live(page)).revealedTiles).sort()).toEqual(['3-0', '4-0', '5-0']);
    expect(await lastSr(page)).toBe('Cleared 3 squares. 3 counted so far.');
    const d = await box(page, '[data-ap-tile="0-1"]');
    await page.mouse.click(d.cx, d.cy);
    await page.waitForTimeout(120);
    expect((await live(page)).revealedTiles['0-1']).toBe(true);
    expect(Object.keys((await live(page)).revealedTiles)).toHaveLength(4);
    expect(await metric(page, 'area')).toBe('?');
    // Paint every row: the area appears only now.
    for (const r of [0, 1, 2, 3]) {
      const s = await box(page, `[data-ap-tile="0-${r}"]`);
      const e = await box(page, `[data-ap-tile="5-${r}"]`);
      const startPainted = (await live(page)).revealedTiles[`0-${r}`];
      if (startPainted) { await drag(page, [[s.cx, s.cy], [s.cx + 1, s.cy]], 1); }
      await drag(page, [[s.cx, s.cy], [e.cx, e.cy]]);
    }
    expect(Object.keys((await live(page)).revealedTiles)).toHaveLength(24);
    expect(await metric(page, 'area')).toBe('24 square units');
    expect(await metric(page, 'perimeter')).toBe('?');
    expect(errors).toEqual([]);
    await context.close();
  }, 60000);

  it('resizes from the corner handle in whole units and keeps the sliders in step', async () => {
    const { page, context, errors } = await open({ mode: 'explore', width: 6, height: 4 });
    await page.evaluate(() => document.querySelector('[data-ap-explore-svg]').scrollIntoView({ block: 'center' }));
    const tile = await box(page, '[data-ap-tile="0-0"]');
    const handle = await box(page, '[data-ap-resize-handle] circle');
    await drag(page, [[handle.cx, handle.cy], [handle.cx + 2 * tile.w, handle.cy - tile.h]], 8);
    const s = await live(page);
    expect([s.width, s.height]).toEqual([8, 3]);
    expect(await page.evaluate(() => document.getElementById('ap-rectangle-width').value)).toBe('8');
    expect(await lastSr(page)).toBe('The rectangle is now 8 by 3.');
    expect(await page.evaluate(() => document.querySelectorAll('[data-ap-tile]').length)).toBe(24);
    expect(errors).toEqual([]);
    await context.close();
  }, 60000);

  it('walks the fence by dragging along it: a jump across does not count, and the perimeter shows at the end', async () => {
    const { page, context, errors } = await open({ mode: 'explore', width: 6, height: 4 });
    await page.evaluate(() => document.querySelector('[data-ap-explore-svg]').scrollIntoView({ block: 'center' }));
    const t0 = await box(page, '[data-ap-tile="0-0"]');
    const cell = t0.w;
    const off = 14 * cell / 46;
    const ox = t0.x, oy = t0.y;
    const at = (s) => {
      if (s <= 6) return [ox + s * cell, oy - off];
      if (s <= 10) return [ox + 6 * cell + off, oy + (s - 6) * cell];
      if (s <= 16) return [ox + (16 - s) * cell, oy + 4 * cell + off];
      return [ox - off, oy + (20 - s) * cell];
    };
    await page.mouse.move(...at(0));
    await page.mouse.down();
    for (let s = 1; s <= 6; s += 1) await page.mouse.move(...at(s), { steps: 4 });
    await page.waitForTimeout(80);
    expect((await live(page)).boundaryWalk.n).toBe(6);
    // A jump to the far side of the fence is not a walk.
    await page.mouse.move(...at(14), { steps: 1 });
    await page.waitForTimeout(80);
    expect((await live(page)).boundaryWalk.n).toBe(6);
    await page.mouse.up();
    await page.waitForTimeout(80);
    expect(await lastSr(page)).toBe('Units walked: 6');
    expect(await metric(page, 'perimeter')).toBe('?');
    const w = await box(page, '[data-ap-walker]');
    await page.mouse.move(w.cx, w.cy);
    await page.mouse.down();
    for (let s = 7; s <= 20; s += 1) await page.mouse.move(...at(s), { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    expect((await live(page)).boundaryWalk.n).toBe(20);
    expect(await metric(page, 'perimeter')).toBe('20 units');
    expect(await lastSr(page)).toBe('Back at the start. You walked 20 units all the way around, so the perimeter is 20 units.');
    expect(errors).toEqual([]);
    await context.close();
  }, 60000);

  it('Start on a phone scrolls the activity into view and focuses the answer box', async () => {
    const { page, context, errors } = await open(null, { viewport: { width: 390, height: 844 }, grade: '5th Grade' });
    await page.getByRole('button', { name: 'Start step 1: Area and perimeter formulas' }).click();
    await page.waitForTimeout(500);
    const focus = await page.evaluate(() => { const el = document.activeElement; const b = el.getBoundingClientRect(); return { id: el.id, top: b.top, bottom: b.bottom, vh: innerHeight }; });
    expect(focus.id).toBe('ap-answer');
    expect(focus.top).toBeGreaterThanOrEqual(0);
    expect(focus.bottom).toBeLessThanOrEqual(focus.vh);
    expect(errors).toEqual([]);
    await context.close();
  }, 60000);
});

// The new surfaces pass WCAG A/AA, reflow at 320 px, text spacing and 24 px
// targets in light, dark and contrast (the host wrappers' CSS is loaded).
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const cssSource = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((file) => /^main\.[a-z0-9]+\.css$/i.test(file))), 'utf8');
const walked = { mode: 'explore', width: 6, height: 4, boundaryWalk: { sig: '6x4', n: 9 }, revealedTiles: { '0-0': true, '1-0': true, '2-1': true } };
const CASES = [
  { name: 'grade 5 first visit: Next line, starred tabs and More', state: {} },
  { name: 'grade 3 first visit dark', state: {}, overrides: { gradeLevel: '3rd Grade', isDark: true } },
  { name: 'explore part-walked and painted', state: walked },
  { name: 'explore part-walked dark', state: walked, overrides: { isDark: true } },
  { name: 'explore part-walked contrast', state: walked, overrides: { isContrast: true } },
  { name: 'explore counted and walked, steps and More open', state: { ...walked, boundaryWalk: { sig: '6x4', n: 20 }, areaSeenFor: '6x4', pathOpen: true, moreTabsOpen: true } },
];
describe('Area & Perimeter engagement surfaces: WCAG in a real browser', () => {
  for (const testCase of CASES) {
    it(testCase.name + ' passes WCAG A/AA, 320px reflow, text spacing and 24px targets', async () => {
      resetStemLab();
      document.head.querySelectorAll('style').forEach((style) => style.remove());
      loadTool(SOURCE, 'areaPerimeter');
      const rendered = prepareStemBrowserRender(renderTool('areaPerimeter', { _areaPerimeter: testCase.state }, testCase.overrides));
      expect(rendered.html).not.toMatch(/undefined|NaN|\[object Object\]/);
      const page = await browser.newPage({ viewport: { width: 320, height: 760 } });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + cssSource +
        '</style></head><body><main id="tool-root">' + rendered.html + '</main></body></html>', { waitUntil: 'domcontentloaded' });
      for (const css of rendered.cssSheets) await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('#tool-root', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      expect(audit.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => ({ target: n.target, data: n.any && n.any[0] && n.any[0].data })) }))).toEqual([]);
      const reflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(reflow.scrollWidth).toBeLessThanOrEqual(reflow.clientWidth);
      const spacing = await auditTextSpacingReflow(page);
      expect(spacing.scrollWidth, JSON.stringify(spacing.offenders)).toBeLessThanOrEqual(spacing.clientWidth);
      const small = await page.evaluate(() => [...document.querySelectorAll('#tool-root button, #tool-root input, #tool-root select, #tool-root [role="button"], #tool-root [role="slider"]')]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => { const b = el.getBoundingClientRect(); return { el: el.outerHTML.slice(0, 80), w: b.width, h: b.height }; })
        .filter((b) => b.w < 24 || b.h < 24));
      expect(small).toEqual([]);
      await page.close();
    }, 30000);
  }
});