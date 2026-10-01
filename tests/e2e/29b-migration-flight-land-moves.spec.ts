import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

/**
 * Migration 3D Flight: does the LAND move past the flock?
 *
 * Only the clouds, route beacons and wind streaks used to move. The ground,
 * river, woods and ridges were fixed, so the flock looked parked over one
 * field however fast it was "flying". The land is now a belt of tiles that
 * slides toward the camera at the flock's ground speed.
 *
 * Measured on the land band (lower part of the stage, outside the central
 * third where the ribbon, beacons and streaks live): two screenshots taken
 * after a fixed amount of SIMULATED flight must differ there, and must not
 * when the flight is paused. The wait counts rendered frames as well as wall
 * time because the frame loop clamps each step to 0.05 s: on a slow software
 * renderer, wall time alone would cover far less flight.
 *
 * Calibrated 2026-09-28 (SwiftShader, 1100 px): flying 47-54%, paused 0.2%.
 * The pre-change file measured 5% flying (streaks and bird shadows only) and
 * 4% paused: each frame ADDED a bob step to every bird, and with the phase
 * frozen that step repeated, so paused birds drifted steadily out of frame.
 *
 * PREMISE GUARDED. Served the pre-change file
 * (STEM_GL_SUBSTITUTE=stem_lab/stem_tool_migration.js=<old copy>), both tests
 * fail. A copy that advances the land while paused fails the second test.
 */

test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_migration.js',
  toolId: 'migration',
  width: 1100,
  height: 900,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function renders(page: Page): Promise<number> {
  return page.evaluate(() => ((window as any).__glScene() || { renders: 0 }).renders);
}

/** Share of land-band pixels that changed across ~1.5 s of simulated flight. */
async function landChange(page: Page): Promise<number> {
  await page.waitForFunction(
    () => !!document.querySelector('.migration-flight-stage[data-flight-ready="true"]'), null, { timeout: 30000 });
  // Let the camera settle onto its target before the first frame.
  await page.waitForTimeout(2500);
  const stage = page.locator('.migration-flight-stage');
  const a = readPng(await stage.screenshot());
  const r0 = await renders(page);
  const t0 = Date.now();
  await page.waitForFunction((start) => ((window as any).__glScene() || { renders: 0 }).renders >= start + 30,
    r0, { timeout: 60000 });
  const left = 1500 - (Date.now() - t0);
  if (left > 0) await page.waitForTimeout(left);
  const b = readPng(await stage.screenshot());
  let changed = 0;
  let total = 0;
  for (let y = Math.round(a.height * 0.42); y < a.height; y += 2) {
    for (let x = 0; x < a.width; x += 2) {
      if (x > a.width / 3 && x < (2 * a.width) / 3) continue;
      const u = a.at(x, y);
      const v = b.at(x, y);
      total++;
      if (Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]) + Math.abs(u[2] - v[2]) > 30) changed++;
    }
  }
  return (changed / total) * 100;
}

test('the land scrolls past the flock in flight', async ({ page }) => {
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase' } });
  const pct = await landChange(page);
  expect(pct, `land band changed ${pct.toFixed(1)}% across 1.5 s of flight`).toBeGreaterThan(20);
});

test('the land holds still while the flight is paused', async ({ page }) => {
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase', flightPaused: true } });
  const pct = await landChange(page);
  expect(pct, `land band changed ${pct.toFixed(1)}% while paused`).toBeLessThan(2);
});
