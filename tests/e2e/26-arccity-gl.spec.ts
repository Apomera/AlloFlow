// Arc City — the optional Three.js views, driven in a real (SwiftShader) Chromium.
//
// The mock-React harness (tests/arc_city_*.test.js) proves the 3D components mount
// only on request and receive plain data; it never runs their GL. This spec does:
// the Play "City view" gets a live context, rasterises, orbits on drag, draws the
// fired beam, and releases when toggled off; the Circuit Clash arena still mounts.
import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Screenshots for eyeballing: test-results/ is wiped between runs, so allow an override.
const SHOT_DIR = process.env.ARC_SHOT_DIR || 'test-results';

test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_arccity.js',
  toolId: 'arccity',
  width: 1100,
  height: 1200,
});

const PLAY = { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], fired: false, city3d: true };

function trackErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return errs;
}

async function cityCanvas(page: Page) {
  await page.waitForFunction(() => {
    const box = document.querySelector('.arc-city3d');
    return !!box && !box.querySelector('[role="status"]');
  }, null, { timeout: 45000 });
  return page.locator('.arc-city3d canvas');
}

test.describe('Arc City — Play 3D city view', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('mounts a live scene that rasterises and orbits on drag', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: PLAY });
    const canvas = await cityCanvas(page);
    const live = await page.evaluate(() => (window as any).__glLive('.arc-city3d'));
    expect(live).not.toBeNull();
    expect(live.lost).toBe(false);
    expect(live.box.w).toBeGreaterThan(300);
    expect(live.box.h).toBeGreaterThan(200);

    const before = await canvas.screenshot();
    // Not a blank canvas: a solid fill compresses to almost nothing.
    expect(before.length).toBeGreaterThan(4000);

    const bb = (await canvas.boundingBox())!;
    await page.mouse.move(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width * 0.2, bb.y + bb.height * 0.4, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);

    const postfx = await page.evaluate(() => !!((window as any).THREE && (window as any).THREE.UnrealBloomPass));
    console.log('[arccity-gl] bloom addons loaded: ' + postfx);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('firing draws the beam into the scene', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: PLAY });
    const canvas = await cityCanvas(page);
    await page.waitForTimeout(600);
    const before = await canvas.screenshot();
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(1200); // draw-on completes in ~520ms
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
    const fired = await page.evaluate(() => (window as any).__toolData._arccity.fired);
    expect(fired).toBe(true);
    await canvas.screenshot({ path: SHOT_DIR + '/arccity-city3d-fired.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('a hit celebrates when the beam reaches the node', async ({ page }) => {
    const errs = trackErrors(page);
    // L3 "Clear the Wall": a=-0.5,h=5,k=5 is a known hit (pinned in arc_city_golden); the default is blocked by the wall.
    const L3 = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true }, L3: { params: { a: -0.5, h: 5, k: 5 } } }, tier: 'practice', badges: [], fired: false, city3d: true };
    await harness.mount(page, { _arccity: L3 });
    const canvas = await cityCanvas(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(650); // draw-on done, burst in flight
    await canvas.screenshot({ path: SHOT_DIR + '/arccity-city3d-hit.png' });
    const st = await page.evaluate(() => (window as any).__toolData._arccity);
    expect(st.fired).toBe(true);
    expect(st.byLevel.L3.solved).toBe(true);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('a blocked shot shows its impact at the wall', async ({ page }) => {
    const errs = trackErrors(page);
    const blocked = { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false, city3d: true };
    await harness.mount(page, { _arccity: blocked });
    const canvas2 = await cityCanvas(page);
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(700);
    await canvas2.screenshot({ path: SHOT_DIR + '/arccity-city3d-blocked.png' });
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });

  test('toggling the view off unmounts the canvas', async ({ page }) => {
    await harness.mount(page, { _arccity: PLAY });
    await cityCanvas(page);
    await page.getByRole('button', { name: /3D city view is on/ }).click();
    await page.waitForFunction(() => !document.querySelector('.arc-city3d'), null, { timeout: 10000 });
    expect(await page.evaluate(() => (window as any).__toolData._arccity.city3d)).toBe(false);
    await page.getByRole('button', { name: /Show the 3D city view/ }).click();
    await cityCanvas(page);
  });
});

test.describe('Arc City — 2D board (dark theme polish)', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('renders the dark-theme board with skyline, stars and a lit node', async ({ page }) => {
    const errs = trackErrors(page);
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(() => { document.body.classList.add('theme-dark'); document.body.style.background = '#0f172a'; });
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.arccity, null, { timeout: 30000 });
    // L3 "Clear the Wall" fired on its DEFAULT parabola (a miss): wall, gate, node, beam and
    // the denied remainder are all on the board, which is what this capture is for.
    await page.evaluate((d) => (window as any).__mount(d), { _arccity: { schemaVersion: 2, levelId: 'L3', byLevel: { L1: { solved: true }, L2: { solved: true } }, tier: 'practice', badges: [], fired: false } });
    await page.waitForSelector('#wrap svg', { timeout: 30000 });
    await page.getByRole('button', { name: /Fire beam/ }).click();
    await page.waitForTimeout(900);
    const svg = page.locator('#wrap svg').first();
    await svg.screenshot({ path: SHOT_DIR + '/arccity-2d-dark.png' });
    const counts = await page.evaluate(() => ({
      stars: document.querySelectorAll('#wrap svg .arccity-star').length,
      windows: document.querySelectorAll('#wrap svg g[aria-hidden] rect[width="3"]').length,
      beamCore: document.querySelectorAll('#wrap svg polyline[stroke="#ffffff"]').length,
    }));
    expect(counts.stars).toBe(34);
    expect(counts.windows).toBeGreaterThan(10);
    expect(counts.beamCore).toBe(1);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});

test.describe('Arc City — Circuit Clash 3D arena', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('arena mounts a live scene with the skyline and relays', async ({ page }) => {
    const errs = trackErrors(page);
    await harness.mount(page, { _arccity: { schemaVersion: 2, levelId: 'L1', byLevel: {}, tier: 'practice', badges: [], view: 'battle', battle3d: true } });
    await page.waitForFunction(() => {
      const st = Array.from(document.querySelectorAll('[role="status"]')).map((n) => n.textContent || '');
      return document.querySelector('#wrap canvas') && !st.some((s) => /Loading the optional 3D arena|3D unavailable/.test(s));
    }, null, { timeout: 45000 });
    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live).not.toBeNull();
    expect(live.lost).toBe(false);
    const shot = await page.locator('#wrap canvas').first().screenshot({ path: SHOT_DIR + '/arccity-battle3d.png' });
    expect(shot.length).toBeGreaterThan(4000);
    expect(errs.filter((e) => !/net::ERR|Failed to load resource/.test(e))).toEqual([]);
  });
});
