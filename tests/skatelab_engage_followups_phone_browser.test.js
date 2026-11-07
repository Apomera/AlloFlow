// Skate Lab on a 320 px phone with a real touch context (2026-11-05): after a ride the verdict
// sat about 1,300 px below the canvas. Sizes come from the browser.
// SKATELAB_SRC points at another copy (fail-first checks).
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
const axeSource = fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const MOUNT = `window.StemLab = { _registry: {}, registerTool: function(id, cfg) { cfg.id = id; this._registry[id] = cfg; }, registerModule: function() {}, isRegistered: function(id) { return !!this._registry[id]; } };
window.__sr = [];
window.__mount = function(state, extra) {
  var e = React.createElement;
  var icons = new Proxy({}, { get: function() { return function() { return e('span', { 'aria-hidden': 'true' }); }; } });
  function App() {
    var s = React.useState({ skatelab: state });
    window.__state = s[0].skatelab;
    return window.StemLab._registry.skatelab.render(Object.assign({ React: React, toolData: s[0], setToolData: s[1], setStemLabTool: function() {}, setToolSnapshots: function() {},
      addToast: function() {}, t: function(k, fb) { return fb || k; }, icons: icons, awardXP: function() {}, announceToSR: function(m) { window.__sr.push(String(m)); }, beep: function() {}, celebrate: function() {},
      a11yClick: function(fn) { return { onClick: fn }; }, gradeBand: 'g68', gradeLevel: '7th Grade' }, extra || {}));
  }
  ReactDOM.createRoot(document.getElementById('app')).render(e(App));
};`;
const SEED = {
  mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
  riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
  bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
  angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
  estimateChallenge: true, _predictDefaultV: 2, estimateValue: '', experiments: [], stats: { runs: 0, successful: 0, withinTen: 0 },
};
const THEMES = {
  light: { wrap: 'theme-default', extra: {} },
  dark: { wrap: 'theme-dark', extra: { isDark: true, theme: 'dark' } },
  contrast: { wrap: 'theme-contrast', extra: { isContrast: true, theme: 'contrast' } },
};

let browser;
async function ride(height, themeName, width) {
  const th = THEMES[themeName || 'light'];
  const context = await browser.newContext({ viewport: { width: width || 320, height }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><main id="tool-root" class="' + th.wrap + '"><div data-stem-tool-surface="true"><div id="app"></div></div></main></body></html>');
  await page.addStyleTag({ content: appCss });
  await page.addScriptTag({ content: reactUmd });
  await page.addScriptTag({ content: reactDomUmd });
  await page.addScriptTag({ content: MOUNT });
  await page.addScriptTag({ content: toolSource });
  await page.evaluate(([s, e]) => window.__mount(s, e), [SEED, th.extra]);
  await page.waitForSelector('[data-skatelab-launch]');
  await page.waitForTimeout(200);
  const opt = page.locator('[data-skatelab-predict] label').first();
  await opt.scrollIntoViewIfNeeded();
  const b = await opt.boundingBox();
  await page.touchscreen.tap(b.x + 30, b.y + b.height / 2);
  await page.waitForTimeout(120);
  const run = page.locator('[data-skatelab-launch]');
  await run.scrollIntoViewIfNeeded();
  const r = await run.boundingBox();
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForSelector('[data-skatelab-predict-feedback]', { timeout: 30000 });
  await page.waitForTimeout(400);
  return { page, context };
}
const read = (page) => page.evaluate(() => {
  const canvas = document.querySelector('canvas.sk-canvas').getBoundingClientRect();
  const verdict = document.querySelector('[data-skatelab-predict-feedback] .sk-result-good, [data-skatelab-predict-feedback] .sk-result-miss').getBoundingClientRect();
  return {
    canvasTop: canvas.top, canvasBottom: canvas.bottom, canvasHeight: canvas.height, verdictTop: verdict.top, verdictBottom: verdict.bottom,
    gap: Math.round(verdict.top - canvas.bottom), view: innerHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    cards: document.querySelectorAll('[data-skatelab-predict-feedback]').length,
  };
});

describe('the verdict and the ride, on a phone', () => {
  beforeAll(async () => { browser = await chromium.launch(); }, 60000);
  afterAll(async () => { if (browser) await browser.close(); }, 60000);

  for (const height of [760, 640, 568]) {
    it('320 x ' + height + ': after the ride, the canvas and the verdict are both on screen', async () => {
      const { page, context } = await ride(height);
      const m = await read(page);
      console.log('skate dock ' + height + ': ' + JSON.stringify(m));
      expect(m.cards).toBe(1);
      expect(m.gap, 'verdict distance from the canvas').toBeLessThan(height / 2);
      expect(m.canvasTop, 'canvas top on screen').toBeGreaterThanOrEqual(-1);
      expect(m.canvasBottom, 'canvas bottom on screen').toBeLessThanOrEqual(height);
      expect(m.verdictBottom, 'verdict on screen').toBeLessThanOrEqual(height);
      expect(m.sw, 'no sideways scroll').toBeLessThanOrEqual(m.cw);
      await context.close();
    }, 90000);
  }

  for (const theme of Object.keys(THEMES)) {
    it(theme + ': the docked card passes axe in the host wrapper', async () => {
      const { page, context } = await ride(760, theme);
      await page.addScriptTag({ content: axeSource });
      const audit = await page.evaluate(async () => axe.run('[data-skatelab-predict-feedback]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }));
      expect(audit.violations.map((v) => [v.id, v.nodes.map((n) => n.html.slice(0, 120))])).toEqual([]);
      await context.close();
    }, 90000);
  }

  it('a wide screen keeps the verdict in the controls column', async () => {
    const { page, context } = await ride(800, 'light', 1280);
    expect(await page.locator('.sk-controls [data-skatelab-predict-feedback]').count()).toBe(1);
    expect(await page.locator('[data-skatelab-verdict-dock]').count()).toBe(0);
    await context.close();
  }, 90000);
});
