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
      // The scoped <style> is the root's first child; space-y-4 must skip it or the hero card gains a stray 1rem top margin.
      heroMarginTop: parseFloat(getComputedStyle(document.querySelector('#particle-lab-root').querySelector(':scope > div')).marginTop),
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
  expect(result.heroMarginTop).toBe(0);
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
        // DOM order must match the visual order: dock first only when it is really shown on the left.
        const domOrder = await page.evaluate(() => Array.from(document.querySelector('#particle-workspace').children).map(el => el.id));
        const narrowNote = await page.locator('#particle-essential-controls').textContent();
        if (result.workspaceWidth <= 760 || position === 'bottom') {
          expect(result.dock.y).toBeGreaterThanOrEqual(result.canvas.bottom - 1);
          expect(domOrder).toEqual(['particle-viewport', 'particle-readouts']);
          expect(narrowNote.includes('shown below on this screen')).toBe(result.workspaceWidth <= 760 && position !== 'bottom');
        } else if (position === 'left') {
          expect(result.dock.right).toBeLessThanOrEqual(result.canvas.x + 1);
          expect(domOrder).toEqual(['particle-readouts', 'particle-viewport']);
        } else {
          expect(result.dock.x).toBeGreaterThanOrEqual(result.canvas.right - 1);
          expect(domOrder).toEqual(['particle-viewport', 'particle-readouts']);
        }
      }
      // Dock width choice: only offered for side placements; measured on a side placement wide enough to keep it.
      await page.getByLabel('Chamber readouts position').selectOption('right');
      if ((await geometry(page)).workspaceWidth > 760) {
        const widths = {};
        for (const width of ['compact', 'wide']) {
          await page.getByLabel('Chamber readouts width').selectOption(width);
          widths[width] = (await geometry(page)).dock.width;
          expect(await page.evaluate(() => savedParticleData.readoutsWidth)).toBe(width);
        }
        expect(widths.wide).toBeGreaterThan(widths.compact + 100);
        await page.getByLabel('Chamber readouts width').selectOption('standard');
      }
      await page.getByRole('button', { name: 'Collapse readouts', exact: true }).click();
      expect(await page.locator('#particle-essential-controls').textContent()).toMatch(/\d+ K · 64 particles · paused/);
      expect(await page.getByRole('button', { name: 'Show readouts', exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
      expect(await page.locator('#particle-readouts').isVisible()).toBe(false);
      await geometry(page);
      expect(await page.evaluate(() => savedParticleData.readoutsOpen)).toBe(false);
      await page.getByRole('button', { name: 'Show readouts', exact: true }).click();
      await page.getByRole('button', { name: 'Hide UI. Hides the simulation controls; press H to show them again.', exact: true }).click();
      expect(await page.locator('#particle-readouts').count()).toBe(0);
      expect(await page.locator('#particle-viewport .particle-readout-card').count()).toBe(0);
      await geometry(page);
      await page.getByRole('button', { name: 'Show controls (H)', exact: true }).click();
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it.each([{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 320, height: 568 }])('fits immersive controls into $width by $height with expanded conditions', async viewport => {
    const { page, errors } = await mount(viewport, { preset: 'osmosis', trace: true, systemProbe: true, legendOpen: true, visualsOpen: true });
    try {
      await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }));
      await page.getByRole('button', { name: 'Open fullscreen particle chamber', exact: true }).click();
      await page.waitForSelector('#particle-stage[data-fullscreen="true"]');
      const immersive = await geometry(page, true);
      // Phone fullscreen trims what costs space: the dock how-to paragraph always, and the heading's note + quality
      // toggle when the stage is narrow. Short viewports turn the secondary row into one horizontally scrolling row
      // so no button is cut off vertically.
      const trims = await page.evaluate(() => {
        const visible = el => !!el && el.getClientRects().length > 0;
        const row = document.querySelector('#particle-secondary-row');
        return {
          hint: visible(document.querySelector('.particle-dock-hint')),
          presets: visible(document.querySelector('#particle-preset-row')),
          quality: visible(document.querySelector('#particle-stage-heading [aria-label="Visual quality"]')),
          rowCut: row ? row.scrollHeight > row.clientHeight + 1 : false,
          controlsCut: (() => { const c = document.querySelector('#particle-secondary-controls'); return c.scrollHeight > c.clientHeight + 1; })(),
        };
      });
      expect(trims.hint).toBe(false);
      const phone = viewport.height <= 500 || immersive.workspaceWidth <= 760;
      if (phone) expect(trims, JSON.stringify(trims)).toMatchObject({ rowCut: false, controlsCut: false, quality: false });
      if (viewport.height <= 500) expect(trims.presets).toBe(false);
      else if (phone) expect(trims.presets).toBe(true);
      else expect(trims.quality).toBe(true);
      await page.getByRole('button', { name: 'Conditions', exact: false }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Fullscreen temperature in kelvin');
      await geometry(page, true);
      await page.getByRole('button', { name: 'Close fullscreen experiment conditions', exact: true }).click();
      expect(await page.getByRole('button', { name: 'Conditions', exact: false }).evaluate(el => el === document.activeElement)).toBe(true);
      await page.getByRole('button', { name: 'Hide UI. Hides the simulation controls; press H to show them again.', exact: true }).click();
      await geometry(page, true);
      await page.locator('#particle-essential-controls button').first().click();
      expect(await page.locator('#particle-essential-controls').textContent()).toContain('Pause');
      await page.getByRole('button', { name: 'Exit fullscreen particle chamber', exact: true }).click();
      expect(await page.locator('#particle-stage').getAttribute('data-fullscreen')).toBe('false');
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it.each([{ width: 320, height: 568 }, { width: 1440, height: 900 }])('opens the keyboard shortcuts dialog fully inside a $width by $height viewport', async viewport => {
    // The overlay used to be absolute inside the stage, which is taller than a phone screen (and than a 900px desktop),
    // so the dialog was centred off-screen with its lower rows cut. It is viewport-anchored now.
    const { page, errors } = await mount(viewport, { preset: 'diffusion' });
    try {
      const opener = page.getByRole('button', { name: 'Keys (?). Shows the keyboard shortcuts panel.', exact: true });
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const box = await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, inner: innerHeight, focused: el === document.activeElement || el.contains(document.activeElement), fits: el.scrollHeight <= el.clientHeight + 1 }; });
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(box.inner + 1);
      expect(box.focused).toBe(true);
      if (viewport.height >= 900) expect(box.fits).toBe(true); // the phone case may scroll inside the dialog; the desktop one must not
      await page.keyboard.press('Escape');
      expect(await page.getByRole('dialog').count()).toBe(0);
      expect(await opener.evaluate(el => el === document.activeElement)).toBe(true);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('keeps every visible control label inside its accessible name (WCAG 2.5.3)', async () => {
    // Voice control users say what they see. axe cannot catch this: its label-content-name-mismatch rule is
    // experimental and excluded by the wcag2a/2aa tag filter the WCAG harness runs, so ten of these had shipped.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'osmosis', trace: true, systemProbe: true, visualsOpen: true, legendOpen: true, membrane: true });
    try {
      const mismatches = await page.evaluate(() => {
        const strip = s => (s || '').replace(/[^\p{L}\p{N}()?%+\-/ ]/gu, ' ').replace(/\s+/g, ' ').trim();
        return Array.from(document.querySelectorAll('#particle-lab-root button, #particle-lab-root summary, #particle-lab-root [role="button"]'))
          .map(el => ({ visible: strip(el.textContent), name: strip(el.getAttribute('aria-label')) }))
          .filter(x => x.name && x.visible.replace(/[^\p{L}]/gu, '').length >= 2)
          .filter(x => !x.name.toLowerCase().includes(x.visible.toLowerCase()));
      });
      expect(mismatches, JSON.stringify(mismatches, null, 1)).toEqual([]);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('offers a working Retry when the 3D engine cannot load', async () => {
    // Every other case injects three.min.js before the tool, so `ready` starts true and the shared loader is
    // never exercised. This is the path a school network filter actually produces, and the error text promises
    // Retry works. Own page setup: THREE is stashed away so the tool must go through StemLab.ensureThree.
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html lang="en"><head><title>engine load</title></head><body><main id="root" class="theme-default"></main></body></html>');
    await page.addStyleTag({ content: css });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'app_styles_module.js']) {
      await page.addScriptTag({ path: path.join(root, file) });
    }
    await page.evaluate(() => {
      window.stashedThree = window.THREE;
      delete window.THREE; // the tool must now ask the loader for it
      window.engineAttempts = 0;
      window.StemLab = {
        registerTool: (id, config) => { window.particleConfig = config; },
        isRegistered: () => false,
        ensureThree: () => {
          window.engineAttempts += 1;
          if (window.engineAttempts === 1) return Promise.reject(new Error('blocked by a network filter'));
          window.THREE = window.stashedThree;
          return Promise.resolve();
        },
      };
    });
    await page.addScriptTag({ path: path.join(root, 'stem_lab/stem_tool_particlelab3d.js') });
    await page.evaluate(() => {
      function Lab() {
        const [toolData, setToolData] = React.useState({ particleLab3d: { quality: 'eco', preset: 'gas' } });
        return particleConfig.render({ React, toolData, setToolData, theme: 'light', isDark: false, isContrast: false, announceToSR: () => {}, addToast: () => {}, t: (key, fallback) => fallback || key });
      }
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(React.Fragment, null,
        React.createElement(window.AlloModules.AppStyles.AppStyles), React.createElement(Lab)));
    });
    try {
      const alert = page.getByRole('alert');
      await alert.waitFor({ timeout: 20000 });
      expect(await alert.textContent()).toContain('3D engine unavailable');
      expect(await page.locator('#particle-stage').getAttribute('aria-busy')).toBe('true');
      expect(await page.locator('#particle-viewport canvas').getAttribute('tabindex')).toBe('-1'); // not a focus trap while dead
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page.waitForSelector('#particle-stage[aria-busy="false"]', { timeout: 20000 });
      expect(await page.evaluate(() => window.engineAttempts)).toBe(2);
      expect(await page.getByRole('alert').count()).toBe(0);
      expect(await page.locator('#particle-viewport canvas').getAttribute('tabindex')).toBe('0');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('meets the 24 by 24 minimum target size on desktop (WCAG 2.5.8)', async () => {
    // The WCAG harness renders at 320px only, where min-h-11 applies; desktop drops to sm:min-h-6 and the
    // sidebar sliders were 16px tall with the two thermal-pulse buttons at 23px.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'osmosis', trace: true, systemProbe: true, visualsOpen: true, legendOpen: true, advancedOpen: true, membrane: true });
    try {
      const small = await page.evaluate(() => Array.from(document.querySelectorAll('#particle-lab-root button, #particle-lab-root a, #particle-lab-root select, #particle-lab-root summary, #particle-lab-root input[type="range"]'))
        .filter(el => el.getClientRects().length)
        .map(el => { const r = el.getBoundingClientRect(); return { label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter(t => t.w < 24 || t.h < 24));
      expect(small, JSON.stringify(small, null, 1)).toEqual([]);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('moves focus to the chamber when the skip link is used', async () => {
    // The stage had no tabindex, so activating the skip link scrolled but left focus on <body>: a screen
    // reader user was never delivered to the chamber, and the behaviour relied on browser-specific handling
    // of the sequential focus navigation starting point.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'gas' });
    try {
      const link = page.getByRole('link', { name: 'Jump to the 3D particle chamber' });
      await link.scrollIntoViewIfNeeded();
      await link.click();
      expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('particle-stage');
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!(document.activeElement && document.activeElement.closest('#particle-stage')))).toBe(true);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('recovers when the browser takes the WebGL context away', async () => {
    // A lost context is permanent unless preventDefault() is called, and the browser drops one for reasons
    // outside this tool (GPU reset, or another 3D tool exhausting the ~16 context cap). It used to go black
    // for good with no message.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'gas' });
    try {
      await page.locator('#particle-essential-controls button').first().click();
      await page.waitForTimeout(800);
      await page.evaluate(() => {
        const canvas = document.querySelector('#particle-viewport canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        window.loseContextExtension = gl.getExtension('WEBGL_lose_context');
        window.loseContextExtension.loseContext();
      });
      await page.waitForSelector('#particle-stage-overlay');
      expect(await page.getByRole('alert').textContent()).toContain('Graphics context lost');
      const rebuild = page.getByRole('button', { name: 'Rebuild', exact: true });
      expect(await rebuild.count()).toBe(1);
      await page.evaluate(() => window.loseContextExtension.restoreContext());
      await page.waitForSelector('#particle-stage-overlay', { state: 'detached', timeout: 20000 });
      await page.waitForTimeout(1500);
      const shot = await page.locator('#particle-viewport').screenshot();
      const relit = await page.evaluate(async png => {
        const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let bright = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 300) bright++;
        return bright / (d.length / 16);
      }, shot.toString('base64'));
      expect(relit).toBeGreaterThan(0.005); // the chamber paints again rather than staying black
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('survives rapid preset, quality and reset churn while running', async () => {
    // Each of those tears the scene down and rebuilds it on the same canvas while an animation frame is in
    // flight. Clicking faster than a rebuild takes is what a bored student does, and it is exactly the race a
    // future change to the teardown (or to where the WebGL context is released) would break.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'gas' });
    try {
      await page.locator('#particle-essential-controls button').first().click();
      const presets = ['Solid', 'Liquid', 'Gas', 'Diffusion', 'Osmosis'];
      for (let i = 0; i < 8; i += 1) {
        await page.getByRole('button', { name: new RegExp(presets[i % presets.length]) }).first().click();
        if (i % 4 === 0) await page.getByRole('button', { name: /Reset/ }).first().click();
        if (i % 5 === 0) await page.getByRole('button', { name: 'ultra', exact: true }).click();
        if (i % 6 === 0) await page.getByRole('button', { name: 'eco', exact: true }).click();
        await page.waitForTimeout(60); // deliberately shorter than a rebuild
      }
      await page.waitForTimeout(1500);
      const shot = await page.locator('#particle-viewport').screenshot();
      const lit = await page.evaluate(async png => {
        const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let bright = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 300) bright++;
        return bright / (d.length / 16);
      }, shot.toString('base64'));
      expect(lit).toBeGreaterThan(0.005); // still painting, not a black box
      expect(await page.evaluate(() => window.originalParticleCanvas === document.querySelector('#particle-viewport canvas'))).toBe(true);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 120000); // 8 rebuilds plus a pixel sample; slow when other sessions load the CPU

  it('keeps painting after the scene is torn down and rebuilt', async () => {
    // The scene effect disposes everything including the renderer and rebuilds on preset/quality/reset, all on
    // the same canvas. Releasing the WebGL context in that cleanup (rather than only on unmount) would leave a
    // black box here while every geometry check still passed.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'gas' });
    const lit = async () => {
      const shot = await page.locator('#particle-viewport').screenshot();
      return page.evaluate(async png => {
        const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let bright = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 300) bright++;
        return bright / (d.length / 16);
      }, shot.toString('base64'));
    };
    try {
      await page.locator('#particle-essential-controls button').first().click();
      await page.waitForFunction(() => document.querySelector('#particle-stage-activity')?.textContent.includes('Live simulation'));
      await page.waitForTimeout(1200);
      expect(await lit()).toBeGreaterThan(0.005);
      await page.getByRole('button', { name: /Diffusion/ }).first().click(); // rebuilds the scene
      await page.waitForTimeout(1500);
      expect(await lit()).toBeGreaterThan(0.005);
      await page.getByRole('button', { name: 'ultra', exact: true }).click(); // rebuilds again
      await page.waitForTimeout(1500);
      expect(await lit()).toBeGreaterThan(0.005);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('does not narrate the running simulation through a live region', async () => {
    // The chamber activity card used to be role="status" aria-live="polite" while its detail line carried
    // running metrics, so it re-announced a full sentence about once a second for as long as the simulation
    // ran. Run and pause are announced deliberately through announceToSR instead.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'osmosis', trace: true, systemProbe: true, membrane: true });
    try {
      const card = page.locator('#particle-stage-activity');
      expect(await card.getAttribute('aria-live')).toBeNull();
      expect(await card.getAttribute('role')).toBeNull();
      await page.evaluate(() => {
        window.liveChanges = [];
        document.querySelectorAll('#particle-lab-root [aria-live]').forEach((el, i) => {
          const key = el.id || el.getAttribute('aria-label') || ('region' + i);
          const record = { region: key, changes: 0, last: el.textContent };
          window.liveChanges.push(record);
          new MutationObserver(() => { if (el.textContent !== record.last) { record.changes += 1; record.last = el.textContent; } })
            .observe(el, { subtree: true, childList: true, characterData: true });
        });
      });
      await page.locator('#particle-essential-controls button').first().click();
      await page.waitForFunction(() => document.querySelector('#particle-stage-activity')?.textContent.includes('Live simulation'));
      await page.waitForTimeout(5000);
      const chatty = await page.evaluate(() => window.liveChanges.filter(r => r.changes > 3));
      // Milestone transitions are fine; a region ticking with the physics is not.
      expect(chatty, JSON.stringify(chatty)).toEqual([]);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('keeps unavailable controls reachable so their reason can be read', async () => {
    // mount() runs with reduced motion, so both camera orbit buttons are unavailable here. A `disabled`
    // button leaves the tab order, which hid the very explanation these carry in their accessible name.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'osmosis', trace: true, membrane: true });
    try {
      const unavailable = await page.evaluate(() => Array.from(document.querySelectorAll('#particle-lab-root button[aria-disabled="true"]'))
        .map(el => ({ name: el.getAttribute('aria-label') || el.textContent.trim(), hardDisabled: el.disabled, tabbable: el.tabIndex >= 0, faded: parseFloat(getComputedStyle(el).opacity) < 0.9 })));
      expect(unavailable.length).toBeGreaterThan(0);
      for (const control of unavailable) {
        expect(control, JSON.stringify(control)).toMatchObject({ hardDisabled: false, tabbable: true, faded: true });
        expect(control.name.length).toBeGreaterThan(12); // it must actually say why
      }
      // No hard-disabled button may reintroduce the trap.
      expect(await page.locator('#particle-lab-root button:disabled').count()).toBe(0);
      // Activating one is a no-op rather than a silent latch.
      const showcase = page.getByRole('button', { name: 'Showcase camera unavailable because reduced motion is preferred', exact: true });
      await showcase.focus(); // reachable by keyboard, which a hard-disabled button never is
      expect(await showcase.evaluate(el => el === document.activeElement)).toBe(true);
      await showcase.dispatchEvent('click'); // Playwright's own actionability refuses aria-disabled, so drive it directly
      expect(await showcase.getAttribute('aria-pressed')).toBe('false');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('fades the dock edge that has more cards beyond it', async () => {
    // A shadow painted on the dock's background is invisible: the cards are opaque and scroll over it (measured
    // at 3x zoom). The cue masks the content instead, driven by a data-scroll attribute.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'diffusion', trace: true, systemProbe: true });
    try {
      const dock = page.locator('#particle-readouts');
      const state = async () => page.evaluate(() => {
        const el = document.querySelector('#particle-readouts');
        return { flag: el.getAttribute('data-scroll'), mask: getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage, hidden: el.scrollHeight - el.clientHeight };
      });
      // The scroll event is asynchronous, so wait for the flag rather than reading it straight after setting scrollTop.
      const settled = async want => {
        await page.waitForFunction(value => document.querySelector('#particle-readouts').getAttribute('data-scroll') === value, want, { timeout: 5000 })
          .catch(async () => { throw new Error('data-scroll stayed ' + (await state()).flag + ', expected ' + want); });
      };
      const atTop = await state();
      expect(atTop.hidden).toBeGreaterThan(2); // the fixture must actually overflow or this case proves nothing
      expect(atTop.mask).toContain('gradient');
      await settled('down');
      await dock.evaluate(el => { el.scrollTop = Math.round((el.scrollHeight - el.clientHeight) / 2); });
      await settled('both');
      await dock.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await settled('up');
      await dock.evaluate(el => { el.scrollTop = 0; });
      await settled('down');
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);

  it('keeps the 3D chamber visible and gradient cards readable under the high-contrast host theme', async () => {
    // The host's .theme-contrast [class*="bg-"] { background-color:#000 !important } rule turned the chamber's
    // decorative overlay divs into an opaque black sheet over the canvas, and pale gradient cards kept their
    // background-image under yellow ink. Both are invisible to axe (gradients) and to geometry checks.
    const { page, errors } = await mount({ width: 1440, height: 900 }, { preset: 'diffusion', trace: true, systemProbe: true }, 'contrast');
    try {
      const probe = await page.evaluate(() => {
        const overlays = Array.from(document.querySelectorAll('#particle-viewport > div')).map(el => getComputedStyle(el).backgroundColor);
        const gradients = Array.from(document.querySelectorAll('#particle-lab-root [class*="bg-gradient"]')).map(el => getComputedStyle(el).backgroundImage);
        return { overlays, gradients, gradientCount: gradients.length };
      });
      expect(probe.overlays.length).toBeGreaterThan(0);
      for (const bg of probe.overlays) expect(bg).toBe('rgba(0, 0, 0, 0)');
      expect(probe.gradientCount).toBeGreaterThan(0);
      for (const image of probe.gradients) expect(image).toBe('none');
      // The scene really paints: sample the rendered canvas for non-black pixels.
      await page.locator('#particle-essential-controls button').first().click();
      await page.waitForFunction(() => document.querySelector('#particle-stage-activity')?.textContent.includes('Live simulation'));
      const shot = await page.locator('#particle-viewport').screenshot();
      const lit = await page.evaluate(async png => {
        const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data; let bright = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 300) bright++;
        return bright / (d.length / 16);
      }, shot.toString('base64'));
      expect(lit).toBeGreaterThan(0.005);
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
      await page.getByRole('button', { name: 'Hide UI. Hides the simulation controls; press H to show them again.', exact: true }).click();
      await geometry(page, true);
      await page.screenshot({ path: path.join(screenshots, 'clear-view.png') });
      await page.getByRole('button', { name: 'Exit fullscreen particle chamber', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      expect(errors).toEqual([]);
    } finally { await page.close(); }
  }, 60000);
});
