import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Brain Atlas's 3D anatomy model had no `webglcontextlost` handler, so a context lost
 * after init left a black canvas with no message and no way back. Context loss is
 * ordinary: a GPU driver reset, a tab restored on a low-memory Chromebook, or the browser
 * evicting the oldest of its limited contexts.
 *
 * The tool already had a fallback: the `.brainatlas-3d-loading` overlay's `error` state
 * with a "Retry 3D model" button. The loss routes into that state. A lost context never
 * returns on the same canvas, so Retry bumps the canvas key and a FRESH canvas is built.
 *
 * Setup mirrors brain-atlas-workflows: real host, local three addons, and a loader stub
 * that resolves only what is already on the page.
 */
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const labels = JSON.stringify({ stem: { brainatlas: strings.stem.brainatlas } }).replace(/</g, '\\u003c');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_brainatlas.js', toolId: 'brainAtlas',
  preScripts: ['stem_lab/stem_lab_module.js'],
  extraScripts: ['vendor/three-r128/OrbitControls.js', 'vendor/three-r128/GLTFLoader.js'],
  width: 1280, height: 900, layout: 'document', appStyles: true,
  probes: `
    document.getElementById('wrap').style.width = '100%';
    window.StemLab.loadScriptResilient = function (urls, options) {
      return options && options.check && options.check()
        ? Promise.resolve()
        : Promise.reject(new Error('Missing local Brain Atlas dependency: ' + (options && options.cacheKey)));
    };
    var brainLabels = ${labels};
    var mountBrain = window.__mount;
    window.__mount = function (data) {
      var mounted = mountBrain(data);
      window.__ctx.t = function (key, fallback) {
        var value = key.split('.').reduce(function (o, k) { return o && o[k]; }, brainLabels);
        return typeof value === 'string' ? value : (fallback || key);
      };
      return mounted;
    };
  `,
});

test.describe.configure({ timeout: 300000, retries: 0, mode: 'default' });
test.use({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', video: 'off', launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin ? route.continue() : route.abort('blockedbyclient'));
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const LOST = /3D view paused/i;

async function mountReady(page: Page) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(() => (window as any).__mount({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d' } }));
  await expect(page.locator('[data-brainatlas-3d-canvas]')).toBeVisible();
  await expect(page.locator('.brainatlas-3d-loading')).toHaveAttribute('data-state', 'ready', { timeout: 120000 });
}

/** The 3D canvas's recorded context: live, and drawn by the tool (not the test). */
async function canvasContext(page: Page) {
  return page.evaluate(() => {
    const cv = document.querySelector('[data-brainatlas-3d-canvas]') as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec ? { id: rec.id, live: !rec.ctx.isContextLost(), draws: rec.draws, byPage: rec.createdBy === 'page' } : null;
  });
}

test('a lost 3D context shows the error overlay, and Retry builds a new live context', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await mountReady(page);

  const before = await canvasContext(page);
  expect(before, 'the 3D canvas never took a GL context, so this proves nothing').not.toBeNull();
  expect(before!.live && before!.byPage && before!.draws > 0, 'no LIVE, drawn context before the loss').toBe(true);
  expect(LOST.test(await page.locator('.brainatlas-3d-loading').innerText()), 'panel showing before the loss').toBe(false);

  const killed = await page.evaluate(() => {
    const cv = document.querySelector('[data-brainatlas-3d-canvas]') as HTMLCanvasElement;
    const ext = (window as any).__glRecord(cv).ctx.getExtension('WEBGL_lose_context');
    if (!ext) return false;
    ext.loseContext();
    return true;
  });
  expect(killed, 'could not force a context loss').toBe(true);

  const overlay = page.locator('.brainatlas-3d-loading');
  await expect(overlay).toHaveAttribute('data-state', 'error', { timeout: 15000 });
  await expect(overlay).toContainText(LOST);
  const retry = page.locator('[data-brainatlas-3d-retry]');
  await expect(retry).toBeVisible();
  await expect(retry, 'focus did not move to the Retry button').toBeFocused();

  // A re-render while lost must not rebuild on the dead canvas.
  await page.evaluate(() => (window as any).__rerender());
  await page.waitForTimeout(500);
  await expect(overlay).toContainText(LOST);

  await retry.click();
  await expect.poll(async () => {
    const c = await canvasContext(page);
    return !!c && c.id !== before!.id && c.live;
  }, { timeout: 30000, message: 'Retry did not build a NEW live context' }).toBe(true);
  await expect(overlay).toHaveAttribute('data-state', 'ready', { timeout: 120000 });

  // The canvas carries the keyboard orbit controls: it must take focus again.
  const focus = await page.evaluate(() => {
    const cv = document.querySelector('[data-brainatlas-3d-canvas]') as HTMLCanvasElement;
    cv.focus();
    return { focused: document.activeElement === cv, tabIndex: cv.tabIndex };
  });
  expect(focus.focused, 'the rebuilt canvas cannot take focus, so keys are dead').toBe(true);

  expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
});

test('switching to the 2D diagram and back does not raise the lost-context panel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await mountReady(page);
  const first = await canvasContext(page);
  expect(first && first.live, 'no live context before the switch').toBe(true);

  const setMode = (mode: string) => page.evaluate((m) => (window as any).__ctx.setToolData((p: any) =>
    Object.assign({}, p, { brainAtlas: Object.assign({}, p.brainAtlas, { atlasDisplayMode: m }) })), mode);

  // Unmounting the canvas runs cleanup, and StemLab.releaseGl then force-loses it.
  await setMode('diagram');
  await expect(page.locator('[data-brainatlas-3d-canvas]')).toHaveCount(0);
  await page.waitForTimeout(800);
  await setMode('3d');
  await expect(page.locator('.brainatlas-3d-loading')).toHaveAttribute('data-state', 'ready', { timeout: 120000 });
  await expect(page.locator('.brainatlas-3d-loading')).not.toContainText(LOST);
  const second = await canvasContext(page);
  expect(second && second.live && second.id !== first!.id, 'the 3D view did not come back live').toBe(true);

  expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
});
