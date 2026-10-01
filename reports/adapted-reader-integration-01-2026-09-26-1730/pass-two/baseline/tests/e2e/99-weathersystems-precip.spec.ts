import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Precipitation type follows the ground in the 3D scene.
 *
 * The scene used to take ONE type from the regional (sea-level) reading: the Coastal
 * Winter Storm rained over the whole scene from T+3 while three stations read -1.5 to
 * -3 C, below the model's own snow threshold. Now each place falls as the station
 * readings around it say. Expected values come from the kernel running in the page.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1100,
  appStyles: true
});

const mix = async (page: Page) => {
  const raw = await page.locator('[data-weather-immersive-canvas]').getAttribute('data-weather-precip-mix');
  const out: Record<string, number> = {};
  String(raw || '').split(' ').forEach((part) => { const [k, v] = part.split(':'); if (k) out[k] = Number(v); });
  return out;
};
const kernelGroups = (page: Page) => page.evaluate(() => {
  const K = (window as any).WeatherSystemsKernel;
  const state = K.resolvedState((window as any).__toolData.weatherSystems);
  return K.stationPrecipGroups(K.stations.map((st: any) => K.stationObservation(state, st)));
});

test.describe('Weather Systems — precipitation type by place', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('the winter storm snows where the stations are snow-cold, and says so', async ({ page }) => {
    test.setTimeout(240000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'winterStorm', simHour: 12 } }, undefined, { expectCanvas: false });
    await expect.poll(async () => (await mix(page)).snow, { timeout: 60000 }).toBeGreaterThan(0);
    const counts = await mix(page);
    console.log('winter storm T+12 mix:', JSON.stringify(counts));
    // The regional reading alone says rain here; no particle may.
    const regional = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      return K.projectConditions(state, 12).precipType;
    });
    expect(regional).toBe('rain');
    expect(counts.rain, 'rain particles over snow- and mixed-cold ground').toBe(0);

    // The scene's text alternative names what falls where, from the same station types.
    const groups = await kernelGroups(page);
    const label = await page.locator('[data-weather-immersive-canvas]').getAttribute('aria-label');
    const snow = groups.filter((g: any) => g.type === 'snow')[0];
    const mixed = groups.filter((g: any) => g.type === 'mixed')[0];
    expect(label).toContain('Snow at ' + snow.names.join(', '));
    expect(label).toContain('Mixed rain and snow at ' + mixed.names.join(', '));

    // The snow line is drawn on the ground where the kernel's analysis crosses the snow
    // threshold; nothing here reaches the rain threshold, so no rain line.
    const lineCounts = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      const obs = K.stations.map((st: any) => K.stationObservation(state, st));
      return { snow: K.isothermSegments(obs, K.snowMaxC, 32, 24).length, rain: K.isothermSegments(obs, K.rainMinC, 32, 24).length };
    });
    expect(lineCounts.snow).toBeGreaterThan(0);
    await expect(page.locator('[data-weather-immersive-canvas]')).toHaveAttribute('data-weather-precip-lines', 'snow:' + lineCounts.snow + ' rain:' + lineCounts.rain);

    // The key gives the rule, from the kernel's thresholds.
    const t = await page.evaluate(() => { const K = (window as any).WeatherSystemsKernel; return { snow: K.snowMaxC, rain: K.rainMinC }; });
    const key = page.locator('[data-weather-precip-key]');
    await expect(key).toContainText('Snow ≤ ' + t.snow + '°');
    await expect(key).toContainText('Mixed < ' + t.rain + '°');
    await expect(key).toContainText('Rain ≥ ' + t.rain + '°');
  });

  test('a warm cold-front rain stays rain everywhere', async ({ page }) => {
    test.setTimeout(240000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront', simHour: 3 } }, undefined, { expectCanvas: false });
    await expect.poll(async () => (await mix(page)).rain, { timeout: 60000 }).toBeGreaterThan(0);
    const counts = await mix(page);
    console.log('cold front T+3 mix:', JSON.stringify(counts));
    expect(counts.snow).toBe(0);
    expect(counts.mixed).toBe(0);
    const label = await page.locator('[data-weather-immersive-canvas]').getAttribute('aria-label');
    expect(label).toContain('Rain at ');
    await expect(page.locator('[data-weather-immersive-canvas]')).toHaveAttribute('data-weather-precip-lines', 'snow:0 rain:0');
  });
});
