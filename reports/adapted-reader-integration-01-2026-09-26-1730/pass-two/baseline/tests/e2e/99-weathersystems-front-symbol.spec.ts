import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * The 3D scene lays the weather-map front symbol on the ground where the frontal surface
 * meets it. The kind drawn must be the kernel's plan for that front and speed: the same
 * plan the 2D map draws from, including a stalled front (speed 0) as stationary and a
 * storm's outflow as a dashed boundary.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1100,
  appStyles: true
});

const cases = [
  { name: 'cold front', data: { scenario: 'coldFront', simHour: 2 }, expected: 'cold' },
  { name: 'stalled warm front', data: { scenario: 'warmFront', simHour: 4, frontSpeed: 0 }, expected: 'stationary' },
  { name: 'thunderstorm outflow', data: { scenario: 'summerStorm', simHour: 2 }, expected: 'outflow' },
  { name: 'high pressure', data: { scenario: 'fair', simHour: 6 }, expected: 'none' }
];

test.describe('Weather Systems — weather-map front symbol in 3D', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  for (const c of cases) {
    test(c.name + ': the ground symbol is the kernel plan', async ({ page }) => {
      test.setTimeout(240000);
      await harness.mount(page, { weatherSystems: Object.assign({ tab: 'immersive' }, c.data) }, undefined, { expectCanvas: false });
      const canvas = page.locator('[data-weather-immersive-canvas]');
      await expect(canvas).toHaveAttribute('data-weather-front-symbol', /.+/, { timeout: 90000 });
      const planned = await page.evaluate(() => {
        const K = (window as any).WeatherSystemsKernel;
        const state = K.resolvedState((window as any).__toolData.weatherSystems);
        const scenario = K.scenarios.filter((s: any) => s.id === state.scenario)[0];
        return K.frontSymbolPlan(scenario.frontType, state.frontSpeed).kind;
      });
      expect(planned, 'the case must exercise the kind it names').toBe(c.expected);
      await expect(canvas).toHaveAttribute('data-weather-front-symbol', planned);
    });
  }
});
