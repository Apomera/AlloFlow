import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';

const root = process.cwd();
let browser, css;

async function mount(viewport, state = {}, theme = 'default') {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent('<!doctype html><html lang="en"><head><title>Particle layout regression</title></head><body><main id="root" class="theme-' + theme + '"></main></body></html>');
  await page.addStyleTag({ content: css });
  for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'app_styles_module.js']) {
    await page.addScriptTag({ path: path.join(root, file) });
  }
  await page.evaluate(() => { window.StemLab = { registerTool: (id, config) => { window.particleConfig = config; }, isRegistered: () => false }; });
  await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_particlelab3d.js') });
  await page.evaluate(({ state, theme }) => {
    function Lab() {
      const [toolData, setToolData] = React.useState({ particleLab3d: { quality: 'eco', ...state } });
      window.savedParticleData = toolData.particleLab3d;
      return particleConfig.render({ React, toolData, setToolData, theme: theme === 'default' ? 'light' : theme, isDark: theme === 'dark', isContrast: theme === 'contrast', announceToSR: () => {}, addToast: () => {}, t: (key, fallback) => fallback || key });
    }
    ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(React.Fragment, null,
      React.createElement(window.AlloModules.AppStyles.AppStyles), React.createElement(Lab)));
  }, { state, theme });
  await page.waitForSelector('#particle-stage[aria-busy="false"]');
  await page.locator('#particle-stage').scrollIntoViewIfNeeded();
  await page.evaluate(() => { window.originalParticleCanvas = document.querySelector('#particle-viewport canvas'); });
  return { page, errors };
}

async function geometry(page, fullscreen = false) {
  const result = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const canvas = document.querySelector('#particle-viewport canvas');
    const c = rect(canvas), stage = document.querySelector('#particle-stage');
    const dock = document.querySelector('#particle-readouts');
    const d = dock && !dock.hidden ? rect(dock) : null;
    const essential = rect(document.querySelector('#particle-essential-controls'));
    const overlap = (a, b) => b && Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
    const cards = Array.from(document.querySelectorAll('.particle-readout-card')).filter(el => el.getClientRects().length).map(rect);
    return { canvas: c, dock: d, essential, sameCanvas: window.originalParticleCanvas === canvas,
      overlaps: cards.some(r => overlap(c, r)) || overlap(c, d) || overlap(c, essential),
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      stageOverflow: stage.scrollHeight > stage.clientHeight + 1,
      // The stage sits in a grid beside a very tall notebook sidebar. Without align-self: start it
      // stretched to the sidebar's height (a 3900px stage with 3400px of empty dark space below the
      // controls). Measure the gap between the last stage child and the stage's bottom edge.
      stageTail: rect(stage).bottom - Math.max(...Array.from(stage.children).filter(el => el.getClientRects().length).map(el => rect(el).bottom)),
      dockOverflow: dock && !dock.hidden ? dock.scrollWidth > dock.clientWidth + 1 : false,
      workspaceWidth: stage.clientWidth, viewportHeight: innerHeight };
  });
  expect(result.sameCanvas).toBe(true);
  expect(result.overlaps).toBeFalsy();
  expect(result.pageOverflow).toBe(false);
  expect(result.dockOverflow).toBeFalsy();
  expect(result.canvas.width).toBeGreaterThan(100);
  expect(result.canvas.height).toBeGreaterThanOrEqual(fullscreen ? 99 : 300);
  if (!fullscreen) expect(result.stageTail).toBeLessThanOrEqual(8);
  if (fullscreen) {
    expect(result.stageOverflow).toBe(false);
    expect(result.essential.bottom).toBeLessThanOrEqual(result.viewportHeight + 1);
  }
  return result;
}

beforeAll(async () => {
  const cssDirectory = path.join(root, 'app/static/css');
  const cssFile = fs.readdirSync(cssDirectory).find(file => /^main\.[a-z0-9]+\.css$/i.test(file));
  css = fs.readFileSync(path.join(cssDirectory, cssFile), 'utf8');
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
}, 60000);
afterAll(async () => { await browser?.close(); }, 60000);

describe('Particle lab unobstructed chamber in a real browser', () => {
  it.each([{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 320, height: 568 }])('keeps all readouts outside the canvas at $width pixels', async viewport => {
    const { page, errors } = await mount(viewport, { preset: 'diffusion', trace: true, systemProbe: true, legendOpen: true, visualsOpen: true });
    try {
      for (const position of ['right', 'left', 'bottom']) {
        await page.getByLabel('Chamber readouts position').selectOption(position);
        const result = await geometry(page);
        expect(await page.evaluate(() => savedParticleData.readoutsPosition)).toBe(position);
        if (result.workspaceWidth <= 760 || position === 'bottom') expect(result.dock.y).toBeGreaterThanOrEqual(result.canvas.bottom - 1);
        else if (position === 'left') expect(result.dock.right).toBeLessThanOrEqual(result.canvas.x + 1);
        else expect(result.dock.x).toBeGreaterThanOrEqual(result.canvas.right - 1);
      }
      await page.getByRole('button', { name: 'Collapse readouts', exact: true }).click();
      expect(await page.getByRole('button', { name: 'Show readouts', exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
      expect(await page.locator('#particle-readouts').isVisible()).toBe(false);
      await geometry(page);
      expect(await page.evaluate(() => savedParticleData.readoutsOpen)).toBe(false);
      await page.getByRole('button', { name: 'Show readouts', exact: true }).click();
      await page.getByRole('button', { name: 'Hide the simulation controls. Press H to show them again.', exact: true }).click();
      expect(await page.locator('#particle-readouts').count()).toBe(0);
      expect(await page.locator('#particle-viewport .particle-readout-card').count()).toBe(0);
      await geometry(page);
      await page.getByRole('button', { name: 'Show the simulation controls', exact: true }).click();
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it.each([{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 320, height: 568 }])('fits immersive controls into $width by $height with expanded conditions', async viewport => {
    const { page, errors } = await mount(viewport, { preset: 'osmosis', trace: true, systemProbe: true, legendOpen: true, visualsOpen: true });
    try {
      await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }));
      await page.getByRole('button', { name: 'Open fullscreen particle chamber', exact: true }).click();
      await page.waitForSelector('#particle-stage[data-fullscreen="true"]');
      await geometry(page, true);
      await page.getByRole('button', { name: 'Conditions', exact: false }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Fullscreen temperature in kelvin');
      await geometry(page, true);
      await page.getByRole('button', { name: 'Close fullscreen experiment conditions', exact: true }).click();
      expect(await page.getByRole('button', { name: 'Conditions', exact: false }).evaluate(el => el === document.activeElement)).toBe(true);
      await page.getByRole('button', { name: 'Hide the simulation controls. Press H to show them again.', exact: true }).click();
      await geometry(page, true);
      await page.locator('#particle-essential-controls button').first().click();
      expect(await page.locator('#particle-essential-controls').textContent()).toContain('Pause');
      await page.getByRole('button', { name: 'Exit fullscreen particle chamber', exact: true }).click();
      expect(await page.locator('#particle-stage').getAttribute('data-fullscreen')).toBe('false');
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('supports native fullscreen, preserves the renderer, and captures desktop layouts', async () => {
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'diffusion', trace: true, systemProbe: true });
    try {
      const screenshots = path.join(root, 'scratch/particle-layout');
      fs.mkdirSync(screenshots, { recursive: true });
      await page.locator('#particle-stage').screenshot({ path: path.join(screenshots, 'normal.png') });
      await page.getByRole('button', { name: 'Open fullscreen particle chamber', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement?.id === 'particle-stage');
      await geometry(page, true);
      await page.locator('#particle-essential-controls button').first().click();
      await page.waitForFunction(() => document.querySelector('#particle-stage-activity')?.textContent.includes('Live simulation'));
      await page.screenshot({ path: path.join(screenshots, 'fullscreen.png') });
      await page.getByRole('button', { name: 'Hide the simulation controls. Press H to show them again.', exact: true }).click();
      await geometry(page, true);
      await page.screenshot({ path: path.join(screenshots, 'clear-view.png') });
      await page.getByRole('button', { name: 'Exit fullscreen particle chamber', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);
});
