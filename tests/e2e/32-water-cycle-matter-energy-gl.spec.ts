import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_watercycle.js',
  toolId: 'waterCycle',
  width: 1040,
  height: 940,
  appStyles: true,
});

function transpiringJourney(view: '2d' | '3d') {
  return {
    waterCycle: {
      wcMode: 'explorer',
      activeStage: 'transpiration',
      journeyView: view,
      journeyActive: true,
      journeyState: 'transpiring',
      journeyPaused: true,
      climSolar: 1,
      climTemp: 20,
      climWind: 1,
      landCover: 'grass',
    },
  };
}

test.describe.configure({ timeout: 120_000, mode: 'serial' });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test.describe('Water Cycle non-storm matter and energy rendering', () => {
  test('renders a live 3D transpiration handoff and becomes static for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(
      page,
      transpiringJourney('3d'),
      `document.querySelector('#wcJourney3d')?.dataset.rendered === 'true'`,
    );

    const canvas = page.locator('#wcJourney3d');
    const stateCanvas = page.locator('#wcCanvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    await expect(canvas).toHaveAttribute('data-handoff-visual', 'transfer');
    await expect(canvas).toHaveAttribute('data-handoff-source', 'Plant xylem');
    await expect(canvas).toHaveAttribute('data-handoff-destination', 'Atmospheric vapor');
    await expect(canvas).toHaveAttribute('data-water-phase-from', 'Liquid plant water');
    await expect(canvas).toHaveAttribute('data-water-phase-to', 'Water vapor');
    await expect(canvas).toHaveAttribute('data-energy-transfer', 'absorbed');
    await expect(canvas).toHaveAttribute('data-matter-energy-motion', 'dynamic');

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live, 'no Water Cycle GL canvas mounted').not.toBeNull();
    expect(live.lost, 'Water Cycle GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(400);
    expect(live.box.h).toBeGreaterThan(250);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-matter-energy-motion', 'static');
    await expect(canvas).toHaveAttribute('data-handoff-visual', 'transfer');
    await expect(stateCanvas).toHaveAttribute('data-matter-energy-motion', 'static');

    const reducedMotionLive = await page.evaluate(() => (window as any).__glLive());
    expect(reducedMotionLive, 'no Water Cycle GL canvas after reduced-motion change').not.toBeNull();
    expect(reducedMotionLive.lost, 'Water Cycle GL context was lost after reduced-motion change').toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('exposes matching transpiration evidence on the live 2D canvas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await harness.mount(page, transpiringJourney('2d'), undefined, { expectCanvas: false });

    const canvas = page.locator('#wcCanvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-render-mode', 'visual');
    await expect(canvas).toHaveAttribute('data-process-visual', 'transpiration-evidence');
    await expect(canvas).toHaveAttribute('data-water-vapor-depiction', 'invisible-path-shown');
    await expect(canvas).toHaveAttribute('data-handoff-source', 'Plant xylem');
    await expect(canvas).toHaveAttribute('data-handoff-destination', 'Atmospheric vapor');
    await expect(canvas).toHaveAttribute('data-water-phase-from', 'Liquid plant water');
    await expect(canvas).toHaveAttribute('data-water-phase-to', 'Water vapor');
    await expect(canvas).toHaveAttribute('data-energy-transfer', 'absorbed');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-matter-energy-motion', 'static');
    await expect(canvas).toHaveAttribute('data-reduced-motion', 'true');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
