import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_watercycle.js',
  toolId: 'waterCycle',
  width: 1040,
  height: 940,
  appStyles: true,
});

const mountainSnow = {
  waterCycle: {
    wcMode: 'precipHunt',
    precipHunt: {
      preset: 'mountainSnow',
      moisture: 88,
      tempC: -16,
      midLevelTempC: -10,
      lowLevelHumidity: 76,
      surfaceTempC: -5,
      wind: 20,
      windDirection: 'east',
      updraft: 58,
      cloudDepth: 8,
      terrain: 'mountains',
      showAirflow: true,
      paused: false,
    },
  },
};

const hailJourney = {
  waterCycle: {
    wcMode: 'explorer',
    activeStage: 'precipitation',
    journeyView: '3d',
    journeyActive: true,
    journeyState: 'precipitating',
    journeyPaused: false,
    precipLab3dActive: true,
    climTemp: 24,
    climWind: 2.6,
    landRainIntensity: 100,
    landSlope: 'moderate',
    climateAdjusted: true,
    landAdjusted: true,
    precipHunt: {
      preset: 'hailstorm',
      moisture: 96,
      tempC: -14,
      lowLevelHumidity: 78,
      surfaceTempC: 24,
      wind: 26,
      windDirection: 'east',
      updraft: 96,
      cloudDepth: 12,
      terrain: 'plains',
      showAirflow: true,
      paused: false,
    },
  },
};

const layeredInversionJourney = {
  waterCycle: {
    wcMode: 'explorer',
    activeStage: 'precipitation',
    journeyView: '3d',
    journeyActive: true,
    journeyState: 'precipitating',
    journeyPaused: false,
    precipLab3dActive: true,
    climTemp: -4,
    climWind: 1,
    landRainIntensity: 74,
    landSlope: 'moderate',
    climateAdjusted: true,
    landAdjusted: true,
    precipHunt: {
      preset: 'custom',
      moisture: 90,
      tempC: -12,
      midLevelTempC: 8,
      lowLevelHumidity: 90,
      surfaceTempC: -4,
      wind: 10,
      windDirection: 'east',
      updraft: 68,
      cloudDepth: 8,
      terrain: 'plains',
      showAirflow: true,
      paused: false,
    },
  },
};
test.describe.configure({ timeout: 180_000, mode: 'serial' });

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test.describe('Water Cycle storm chamber - real browser rendering', () => {
  test('keeps the ground visible and resizes its 2.5D canvas without distortion', async ({ page }) => {
    await harness.mount(page, mountainSnow, undefined, { expectCanvas: false });
    const lab = page.locator('.wc-precip-lab');
    await expect(lab).toBeVisible();
    await expect(page.locator('#wcPrecipCanvas')).toHaveAttribute(
      'data-orographic-flow', 'windward-lift-leeward-drying');

    const desktop = await page.evaluate(() => {
      const canvas = document.querySelector('#wcPrecipCanvas') as HTMLCanvasElement;
      const dock = document.querySelector('.wc-precip-canvas-dock') as HTMLElement;
      const chamber = document.querySelector('.wc-precip-chamber') as HTMLElement;
      const strip = document.querySelector('.wc-precip-path-strip') as HTMLElement;
      const c = canvas.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      const ch = chamber.getBoundingClientRect();
      return {
        dockBelowCanvas: d.top >= c.bottom - 1,
        dockInsideChamber: d.bottom <= ch.bottom + 1,
        path: strip.innerText.replace(/\s+/g, ' ').trim(),
      };
    });
    expect(desktop.dockBelowCanvas).toBe(true);
    expect(desktop.dockInsideChamber).toBe(true);
    expect(desktop.path).toMatch(/Cloud.*Air layer.*Surface/i);

    await page.setViewportSize({ width: 390, height: 940 });
    await page.evaluate(() => {
      const wrap = document.getElementById('wrap') as HTMLElement;
      wrap.style.width = '300px';
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(600);
    const mobile = await page.evaluate(() => {
      const canvas = document.querySelector('#wcPrecipCanvas') as HTMLCanvasElement;
      const lab = document.querySelector('.wc-precip-lab') as HTMLElement;
      const c = canvas.getBoundingClientRect();
      const l = lab.getBoundingClientRect();
      return {
        cssWidth: Math.round(c.width),
        backingWidth: canvas.width,
        labWidth: Math.round(l.width),
      };
    });
    expect(mobile.cssWidth).toBeLessThan(320);
    expect(mobile.cssWidth).toBeLessThanOrEqual(mobile.labWidth + 1);
    expect(Math.abs(mobile.backingWidth - mobile.cssWidth)).toBeLessThanOrEqual(2);

    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('steps and plays the lifecycle while ground accumulation remains cumulative', async ({ page }) => {
    await harness.mount(page, mountainSnow, undefined, { expectCanvas: false });
    const canvas = page.locator('#wcPrecipCanvas');
    const timeline = page.locator('#wcPrecipStormTime');
    await expect(timeline).toBeVisible();
    await expect(canvas).toHaveAttribute('data-storm-stage', 'mature');

    await timeline.fill('90');
    await expect(canvas).toHaveAttribute('data-storm-stage', 'weakening');
    const weakeningSnow = await canvas.getAttribute('data-ground-accumulation');
    expect(Number(/snow:([0-9]+)/.exec(weakeningSnow || '')?.[1] || 0)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Developing', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-storm-stage', 'developing');
    const startingTime = Number(await canvas.getAttribute('data-storm-time'));
    await page.getByRole('button', { name: 'Play storm', exact: true }).click();
    await expect.poll(async () => Number(await canvas.getAttribute('data-storm-time'))).toBeGreaterThan(startingTime);
    await page.getByRole('button', { name: 'Pause time', exact: true }).click();

    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('renders a live hail column with synchronized 3D storm cues', async ({ page }) => {
    await harness.mount(page, hailJourney, undefined, { expectCanvas: false });
    const canvas = page.locator('canvas.wc-journey-3d');
    await expect(canvas).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.querySelector('canvas.wc-journey-3d') as HTMLCanvasElement | null;
      return el?.dataset.hydrometeorMode === 'hail' &&
        el.dataset.stormColumnAlignment === 'cloud-to-ground-synced';
    });

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live, 'no Water Cycle GL canvas mounted').not.toBeNull();
    expect(live.lost, 'Water Cycle GL context was lost').toBe(false);
    expect(live.box.w).toBeGreaterThan(400);
    expect(live.box.h).toBeGreaterThan(250);
    expect(live.box.w).toBeLessThanOrEqual(live.parentBox.w + 1);
    expect(live.box.h).toBeLessThanOrEqual(live.parentBox.h + 1);

    const state = await canvas.evaluate((el) => ({
      type: el.dataset.precipitationType,
      windDirection: el.dataset.precipitationWindDirection,
      lightningEligible: el.dataset.precipitationLightningEligible,
      hydrometeorMode: el.dataset.hydrometeorMode,
      columnAlignment: el.dataset.stormColumnAlignment,
      updraftMotion: el.dataset.updraftMotion,
      webglFallback: el.dataset.webglFallback || '',
    }));
    expect(state).toMatchObject({
      type: 'hail',
      windDirection: 'east',
      lightningEligible: 'true',
      hydrometeorMode: 'hail',
      columnAlignment: 'cloud-to-ground-synced',
      updraftMotion: 'rising-markers',
      webglFallback: '',
    });

    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
  test('renders melting and refreezing layers with altitude-resolved particles in 3D', async ({ page }) => {
    await harness.mount(page, layeredInversionJourney, undefined, { expectCanvas: false });
    const canvas = page.locator('canvas.wc-journey-3d');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-precipitation-mid-temp', '8');
    await expect(canvas).toHaveAttribute('data-precipitation-transition-kind', 'melting');
    await expect(canvas).toHaveAttribute('data-precipitation-secondary-transition-kind', 'freezing');
    await page.waitForFunction(() => {
      const el = document.querySelector('canvas.wc-journey-3d') as HTMLCanvasElement | null;
      return el?.dataset.thermalLayerCount === '2' &&
        el.dataset.altitudePhaseMode === 'thermal-profile-resolved';
    });

    const state = await canvas.evaluate((el) => ({
      type: el.dataset.precipitationType,
      thermalLayer: el.dataset.thermalLayer,
      thermalLayerCount: el.dataset.thermalLayerCount,
      altitudePhaseMode: el.dataset.altitudePhaseMode,
      trackedPhase: el.dataset.trackedHydrometeorPhase,
    }));
    expect(state).toMatchObject({
      type: 'freezing-rain',
      thermalLayer: 'melting+freezing',
      thermalLayerCount: '2',
      altitudePhaseMode: 'thermal-profile-resolved',
    });
    expect(['snow', 'mix', 'rain', 'freezing-rain']).toContain(state.trackedPhase);

    const live = await page.evaluate(() => (window as any).__glLive());
    expect(live).not.toBeNull();
    expect(live.lost).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
