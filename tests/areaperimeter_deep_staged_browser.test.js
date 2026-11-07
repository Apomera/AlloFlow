// Area & Perimeter Lab stage D (2026-11-04) in a real browser (Chromium): a
// pointer on the circle ruler lands where it points. The ruler SVG has a
// max-height, so in a wide panel Chromium letterboxes it ("meet" scaling,
// centred); stage C mapped clicks as if the drawing filled the whole width.
// AP_FILE lets the gate run against the stage-C file.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const SOURCE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const reactUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(root, 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const toolSource = fs.readFileSync(path.resolve(root, SOURCE), 'utf8');

const HOST = `window.__mount = function (init) {
  var cfg = window.StemLab._registry.areaPerimeter;
  var Icon = function () { return React.createElement('span', { 'aria-hidden': 'true' }); };
  function Host() {
    var td = React.useState({ _areaPerimeter: init });
    window.__live = td[0]._areaPerimeter;
    return cfg.render({ React: React, icons: new Proxy({}, { get: function () { return Icon; } }), toolData: td[0], setToolData: td[1],
      awardXP: function () {}, announceToSR: function () {}, addToast: function () {}, t: function (k, f) { return f || k; } });
  }
  window.__root = ReactDOM.createRoot(document.getElementById('root'));
  window.__root.render(React.createElement(Host));
};`;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); });
afterAll(async () => { if (browser) await browser.close(); }, 30000);

async function rulerClick(panelWidth, objectId) {
  const context = await browser.newContext({ viewport: { width: panelWidth + 120, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root" style="width:' + panelWidth + 'px;margin-left:40px"></div><div style="height:1600px"></div></body></html>');
  for (const content of [reactUmd, reactDomUmd, toolSource, HOST]) await page.addScriptTag({ content });
  await page.evaluate((id) => window.__mount({ mode: 'circles', circleClaim: 'same', circleObject: id, circleRolled: {} }), objectId);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Roll it one full turn').click());
  await page.waitForSelector('[data-ap-track-end]', { state: 'attached' }); // a vertical line has no width, so it never counts as visible
  await page.evaluate(() => document.querySelector('[data-ap-roll]').scrollIntoView({ block: 'center' }));
  const geo = await page.evaluate(() => {
    const svg = document.querySelector('[data-ap-roll]').getBoundingClientRect();
    const end = document.querySelector('[data-ap-track-end]').getBoundingClientRect();
    return { svgW: svg.width, svgH: svg.height, x: end.left + end.width / 2, y: end.top + end.height / 2 };
  });
  await page.mouse.click(geo.x, geo.y);
  const value = await page.evaluate(() => Number(document.querySelector('[data-ap-marker]').getAttribute('aria-valuenow')));
  const pure = await page.evaluate((id) => { const P = window.AreaPerimeterPure; const r = P.rulerFor(id); return { c: r.c, near: P.snapReading(r, r.c), minor: r.minor }; }, objectId);
  await context.close();
  return { geo, value, pure, errors };
}

describe('circle ruler pointer in a real browser', () => {
  for (const width of [600, 1100, 1400]) {
    it('a click on the red end mark puts the marker at the end of the track (' + width + ' px panel)', async () => {
      const { geo, value, pure, errors } = await rulerClick(width, 'plate');
      expect(errors).toEqual([]);
      if (width >= 1100) expect(geo.svgH, 'the ruler is letterboxed at this width').toBeLessThan(geo.svgW * 210 / 640 - 1);
      expect(Math.abs(value - pure.c), JSON.stringify({ geo, value, pure })).toBeLessThanOrEqual(pure.minor + 1e-9);
      expect(value).toBeCloseTo(pure.near, 6);
    }, 30000);
  }
});
