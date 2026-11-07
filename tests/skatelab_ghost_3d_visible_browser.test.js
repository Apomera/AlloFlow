// The what-if ghost in Skate Lab's 3D view, in real Chromium (2026-11-05). A Moon ghost on a tall ramp flew off the top of
// the canvas: project3D has one fixed scale, while the 2D view fits a height ceiling. Every ghost stroke is read from the
// real canvas context. SKATELAB_SRC points at another copy (fail-first checks).
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
const FILE = process.env.SKATELAB_SRC || 'stem_lab/stem_tool_skatelab.js';
const toolSource = fs.readFileSync(path.resolve(root, FILE), 'utf8');
const MOD = path.join(root, 'desktop/web-app/node_modules');
const reactUmd = fs.readFileSync(path.join(MOD, 'react/umd/react.production.min.js'), 'utf8');
const reactDomUmd = fs.readFileSync(path.join(MOD, 'react-dom/umd/react-dom.production.min.js'), 'utf8');
const cssDirectory = path.join(root, 'app/static/css');
const appCss = fs.readFileSync(path.join(cssDirectory, fs.readdirSync(cssDirectory).find((f) => /^main\.[a-z0-9]+\.css$/i.test(f))), 'utf8');
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__xp = [];
window.__mount = function(state) {
  var e = React.createElement;
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({ skatelab: state });
    window.__state = s[0].skatelab;
    return window.StemLab._registry.skatelab.render({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function(a) { window.__xp.push(a); }, announceToSR: function() {}, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, gradeBand: 'g68', gradeLevel: '7th Grade' });
  }
  ReactDOM.createRoot(document.getElementById('app')).render(e(App));
};`;
// Record every path the ghost's ink draws, and the highest point each frame reached.
const SPY = `(function() {
  var P = CanvasRenderingContext2D.prototype, mv = P.moveTo, ln = P.lineTo;
  window.__ink = [];
  function note(c, x, y) { if (String(c.strokeStyle).toLowerCase() === '#f1f5f9') window.__ink.push([x, y]); }
  P.moveTo = function(x, y) { note(this, x, y); return mv.call(this, x, y); };
  P.lineTo = function(x, y) { note(this, x, y); return ln.call(this, x, y); };
})();`;
const SEED = {
  mode: 'halfpipe', viewMode: '3d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
  estimateChallenge: true, _predictDefaultV: 2, estimateValue: '', experiments: [], stats: { runs: 0, successful: 0, withinTen: 0 },
};

let browser;
async function ride(width, height, over) {
  const touch = width < 640;
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main id="tool-root" class="theme-default"><div data-stem-tool-surface="true"><div id="app"></div></div></main></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.addScriptTag({ content: SPY });
  await page.addScriptTag({ content: MOUNT });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate((s) => window.__mount(s), { ...SEED, ...over });
  await page.waitForSelector('[data-skatelab-launch]');
  await page.waitForTimeout(200);
  const opt = page.locator('[data-skatelab-predict] label').first();
  await opt.scrollIntoViewIfNeeded();
  await opt.click();
  await page.waitForTimeout(100);
  const beforeRun = await page.evaluate(() => window.__ink.length);
  const run = page.locator('[data-skatelab-launch]');
  await run.scrollIntoViewIfNeeded();
  await run.click();
  await page.waitForSelector('[data-skatelab-predict-feedback]', { timeout: 45000 });
  await page.waitForTimeout(500);
  return { context, page, beforeRun };
}
const read = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas.sk-canvas'), box = c.getBoundingClientRect();
  // Ink of the latest frame only: reset, then force one more draw by nudging the frame.
  const ink = window.__ink;
  const ys = ink.map((p) => p[1]), xs = ink.map((p) => p[0]);
  return { w: box.width, h: box.height, n: ink.length, top: Math.min(...ys), bottom: Math.max(...ys), left: Math.min(...xs), right: Math.max(...xs), ghost: !!document.querySelector('[data-skatelab-ghost]'), xp: window.__xp };
});

const TALL = [
  ['the default ramp', {}],
  ['a tall ramp', { rampDepthM: 4.5, dropHeightM: 4.5 }],
  ['the tallest ramp, with big pumps', { rampDepthM: 4.5, dropHeightM: 4.5, pumps: 6 }],
];
describe('the 3D what-if ghost stays on the canvas', () => {
  beforeAll(async () => { browser = await chromium.launch(); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 60000);

  for (const [w, h] of [[1280, 800], [320, 640]]) {
    for (const [name, over] of TALL) {
      it(w + ' px, ' + name + ': the Moon ghost and its marker are on the canvas', async () => {
        const { page, context } = await ride(w, h, { activeMission: 'moon_hang', ...over });
        const m = await read(page);
        console.log('skate ghost3d ' + w + ' ' + name + ': ' + JSON.stringify(m));
        expect(m.ghost, 'a ghost was shown').toBe(true);
        expect(m.n).toBeGreaterThan(0);
        expect(m.top, 'marker top').toBeGreaterThanOrEqual(0);
        expect(m.bottom).toBeLessThanOrEqual(m.h);
        expect(m.left).toBeGreaterThanOrEqual(0);
        expect(m.right).toBeLessThanOrEqual(m.w);
        await context.close();
      }, 120000);
    }
  }
});
