import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_watercycle.js',
  toolId: 'waterCycle',
  width: 1040,
  height: 940,
  appStyles: true,
});

function subsurfaceJourney(state: 'infiltrating' | 'aquifer_flow') {
  return {
    waterCycle: {
      wcMode: 'explorer',
      activeStage: 'infiltration',
      journeyView: '3d',
      journeyActive: true,
      journeyState: state,
      journeyPaused: true,
      journeySpeed: 2,
      climSolar: 1,
      climTemp: 16,
      climWind: 0.8,
      landRainIntensity: 65,
      landSaturation: 25,
      landPermeability: 'high',
      landSlope: 'gentle',
      landCover: 'grass',
    },
  };
}

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function expectLiveContext(page: Page) {
  const live = await page.evaluate(() => (window as any).__glLive());
  expect(live, 'no Water Cycle GL canvas mounted').not.toBeNull();
  expect(live.lost, 'Water Cycle GL context was lost').toBe(false);
  expect(live.box.w).toBeGreaterThan(400);
  expect(live.box.h).toBeGreaterThan(250);
}

test.describe.configure({ timeout: 120_000, mode: 'serial' });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test.describe('Water Cycle live subsurface gate', () => {
  test('retains an infiltrating parcel in the vadose zone without showing aquifer flow', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(
      page,
      subsurfaceJourney('infiltrating'),
      `document.querySelector('#wcJourney3d')?.dataset.rendered === 'true' &&
       document.querySelector('#wcJourney3d')?.dataset.subsurfacePhase === 'soil-storage'`,
    );

    const canvas = page.locator('#wcJourney3d');
    const stateCanvas = page.locator('#wcCanvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    await expect(canvas).toHaveAttribute('data-subsurface-phase', 'soil-storage');
    await expect(canvas).toHaveAttribute('data-percolation', 'retained-in-soil');
    await expect(canvas).toHaveAttribute('data-percolation-depth', 'vadose-zone');
    await expect(canvas).toHaveAttribute('data-groundwater-flow', 'hidden');
    await expect(canvas).toHaveAttribute('data-water-table-trend', 'hidden');
    await expect(canvas).toHaveAttribute('data-capillary-fringe', 'hidden');
    await expect(canvas).toHaveAttribute('data-soil-moisture-front', 'advancing');
    await expect(canvas).toHaveAttribute('data-surface-intake', 'visible');

    await expect(stateCanvas).toHaveAttribute('data-subsurface-phase', 'soil-storage');
    await expect(stateCanvas).toHaveAttribute('data-percolation', 'retained-in-soil');

    await expectLiveContext(page);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('moves the selected aquifer parcel from deep recharge into groundwater transfer', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(
      page,
      subsurfaceJourney('aquifer_flow'),
      `document.querySelector('#wcJourney3d')?.dataset.rendered === 'true' &&
       document.querySelector('#wcJourney3d')?.dataset.subsurfacePhase === 'selected-deep-recharge'`,
    );

    const canvas = page.locator('#wcJourney3d');
    const stateCanvas = page.locator('#wcCanvas');
    await expect(canvas).toHaveAttribute('data-subsurface-phase', 'selected-deep-recharge');
    await expect(canvas).toHaveAttribute('data-percolation', 'deep-recharge');
    await expect(canvas).toHaveAttribute('data-percolation-depth', 'water-table');
    await expect(canvas).toHaveAttribute('data-groundwater-flow', 'hidden');
    await expect(stateCanvas).toHaveAttribute('data-subsurface-phase', 'selected-deep-recharge');
    await expect(stateCanvas).toHaveAttribute('data-percolation', 'deep-recharge');

    await page.locator('.wc-viewport-dock button[aria-label="Resume water journey"]').click();
    await expect(canvas).toHaveAttribute('data-subsurface-phase', 'groundwater-transfer', { timeout: 10_000 });
    await page.locator('.wc-viewport-dock button[aria-label="Pause water journey"]' ).click();
    await expect(canvas).toHaveAttribute('data-percolation', 'hidden');
    await expect(canvas).toHaveAttribute('data-percolation-depth', 'hidden');
    await expect(canvas).toHaveAttribute('data-groundwater-flow', 'moving');
    await expect(canvas).toHaveAttribute('data-ocean-exchange', 'groundwater-discharge');
    await expect(stateCanvas).toHaveAttribute('data-journey-state', 'aquifer_flow');
    await expect(stateCanvas).toHaveAttribute('data-journey-paused', 'true');

    await expectLiveContext(page);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
