/**
 * Tree Life Lab — the playback clock, end to end in a real browser.
 *
 * The unit tests drive CLOCK directly with fake timers, which proves the mechanism but
 * not the integration. What matters here is the whole loop: a click writes state, the
 * write re-renders, the render re-stamps the heartbeat, and the tree actually grows.
 * A module-scope timer that never gets its heartbeat would pass every unit test and
 * tick exactly once in production.
 *
 * treeLab resolves StemLab.makeBayViewer lazily, but the host is still preloaded here
 * so the 3D path is the one under test rather than the 2D fallback.
 */
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 240_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_treelab.js',
  toolId: 'treeLab',
  width: 940,
  height: 900,
  preScripts: ['stem_lab/stem_lab_module.js'],
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

/** Age the tool is currently showing, read from stored state rather than the DOM. */
async function age(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => (window as any).__toolData.treeLab.tree.age);
}

async function mountGrown(page: import('@playwright/test').Page, years = 20) {
  await page.goto(`${(harness as any).base}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.treeLab, null, { timeout: 30000 });
  await page.evaluate((y) => {
    const E = (window as any).__alloTreeLabEngine;
    const sp = E.speciesById('oak');
    let t = E.newTree('oak');
    const env = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };
    for (let i = 0; i < y; i += 1) t = E.simulateYear(t, sp, env, alloc);
    (window as any).__mount({ treeLab: { view: 'grow', speciesId: 'oak', tree: t, speed: 'fast' } });
  }, years);
  await page.waitForSelector('#wrap canvas', { timeout: 30000 });
  await page.waitForTimeout(600);
}

test('Play advances the tree, Pause stops it', async ({ page }) => {
  await mountGrown(page);
  const start = await age(page);

  await page.getByRole('button', { name: /Play/ }).click();
  await page.waitForTimeout(2500);
  const running = await age(page);
  expect(running, 'the clock did not advance the tree').toBeGreaterThan(start);

  await page.getByRole('button', { name: /Pause/ }).click();
  await page.waitForTimeout(300);
  const atPause = await age(page);
  await page.waitForTimeout(2000);
  const afterPause = await age(page);
  expect(afterPause, 'the clock kept running after Pause').toBe(atPause);
});

test('the clock stops itself when the tool unmounts', async ({ page }) => {
  // The hazard of a module-scope timer: nothing tells it the student navigated away.
  // A stale heartbeat is what stops it, so this is the test that matters most.
  await mountGrown(page);
  await page.getByRole('button', { name: /Play/ }).click();
  await page.waitForTimeout(1200);
  expect(await age(page)).toBeGreaterThan(20);

  await page.evaluate(() => (window as any).__destroy());
  await page.waitForTimeout(2500);
  const stopped = await page.evaluate(() => (window as any).__alloTreeLabEngine.CLOCK.running());
  expect(stopped, 'clock kept ticking after unmount').toBe(false);
});

test('the seasonal speed cycles the season without stalling growth', async ({ page }) => {
  await mountGrown(page);
  await page.evaluate(() => {
    const d = (window as any).__toolData;
    d.treeLab = Object.assign({}, d.treeLab, { speed: 'seasons' });
    (window as any).__rerender();
  });
  await page.getByRole('button', { name: /Play/ }).click();

  const seen = new Set<string>();
  for (let i = 0; i < 24; i += 1) {
    seen.add(await page.evaluate(() => {
      const E = (window as any).__alloTreeLabEngine;
      return E.seasonForPhase((window as any).__toolData.treeLab.yearPhase || 0);
    }));
    await page.waitForTimeout(250);
  }
  expect(seen.size, `season never changed (saw ${[...seen].join(', ')})`).toBeGreaterThan(1);
  expect(await age(page)).toBeGreaterThan(20);
});

test('the scene survives a fast run without losing its GL context', async ({ page }) => {
  // 25 yr/s pushes a scene rebuild every time the quantised height moves. If that
  // thrashes WebGL the context is lost and the canvas goes black in silence.
  await mountGrown(page, 5);
  await page.evaluate(() => {
    const d = (window as any).__toolData;
    d.treeLab = Object.assign({}, d.treeLab, { speed: 'century' });
    (window as any).__rerender();
  });
  await page.getByRole('button', { name: /Play/ }).click();
  await page.waitForTimeout(6000);

  const health = await page.evaluate(() => {
    const hit = (window as any).__glCanvas();
    return hit ? { lost: hit.gl.isContextLost(), w: hit.el.width, h: hit.el.height } : null;
  });
  expect(health, 'no GL canvas after a fast run').not.toBeNull();
  expect(health!.lost, 'WebGL context was lost during a fast run').toBe(false);
  expect(health!.w).toBeGreaterThan(0);
  expect(await age(page), 'a fast run should cover decades').toBeGreaterThan(60);
});
