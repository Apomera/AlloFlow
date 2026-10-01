import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Forecast playback in the immersive 3D view.
 *
 * The teaching model is built around time — frontProgress = clamp(simHour * frontSpeed /
 * 500, 0, 0.55) moves the 3D front and its cloud band, and every station changes with the
 * hour — but until now nothing in the 3D view could change the hour. These controls reuse
 * the existing `playing` timer and advance(); this pins that they actually drive the
 * model, that Pause really stops it, and that stepping the scene hour after hour does not
 * leak WebGL contexts or throw.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1400,
  appStyles: true
});

const hourOf = (page: Page) => page.evaluate(() =>
  Number((document.querySelector('[data-weather-forecast-hour]') as HTMLElement)?.getAttribute('data-weather-forecast-hour')));

const liveContexts = (page: Page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('canvas')).filter((cv: any) => {
    const g = cv.getContext('webgl2') || cv.getContext('webgl');
    return g && !g.isContextLost();
  }).length);

test.describe('Weather Systems — forecast playback in 3D', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('play, pause, step, scrub and reset all drive the model hour', async ({ page }) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront' } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('canvas')).some((cv: any) => {
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      return g && !g.isContextLost() && cv.clientWidth > 600;
    }), null, { timeout: 60000 });

    const group = page.locator('[data-weather-forecast-controls]');
    await expect(group, 'no forecast controls in the 3D view').toHaveCount(1);
    await expect(group).toHaveAttribute('role', 'group');
    expect(await hourOf(page), 'the model did not start at T+0').toBe(0);
    await expect(page.getByText('Press play and watch the front cross the stations.')).toBeVisible();

    // Play: the hour must actually advance, and the scene must stay live through the rebuilds.
    const play = page.locator('[data-weather-forecast-play]');
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction(() =>
      Number((document.querySelector('[data-weather-forecast-hour]') as HTMLElement).getAttribute('data-weather-forecast-hour')) >= 3,
      null, { timeout: 20000 });
    const playedTo = await hourOf(page);
    console.log('played to hour', playedTo, '| live contexts', await liveContexts(page));
    expect(await liveContexts(page), 'the 3D scene lost its context while playing').toBeGreaterThan(0);
    expect(await liveContexts(page), 'WebGL contexts accumulated while the scene rebuilt each hour').toBeLessThanOrEqual(2);

    // The HUD must follow the model, or the student sees the clock move and nothing else.
    const hudLabel = await page.locator('[data-weather-scene-instruments]').getAttribute('aria-label');
    expect(hudLabel || '', 'the HUD did not follow the model hour').toMatch(/Teaching model hour [1-9]/);

    // Pause must really stop the clock.
    await play.click();
    await expect(play).toHaveAttribute('aria-pressed', 'false');
    const pausedAt = await hourOf(page);
    await page.waitForTimeout(2600);
    expect(await hourOf(page), 'the model kept advancing after Pause').toBe(pausedAt);

    // +1 h steps exactly one hour.
    await page.getByRole('button', { name: 'Advance the model one hour' }).click();
    await expect.poll(() => hourOf(page)).toBe(Math.min(24, pausedAt + 1));

    // The scrubber jumps straight to an hour.
    await page.getByRole('slider', { name: 'Forecast model hour' }).fill('12');
    await expect.poll(() => hourOf(page)).toBe(12);
    await expect(page.getByRole('slider', { name: 'Forecast model hour' })).toHaveAttribute('aria-valuetext', 'T+12 h');

    // Reset returns to T+0, and the hint comes back.
    await page.getByRole('button', { name: 'Return to model hour zero' }).click();
    await expect.poll(() => hourOf(page)).toBe(0);
    await expect(page.getByText('Press play and watch the front cross the stations.')).toBeVisible();

    expect(await liveContexts(page), 'no live 3D context at the end').toBeGreaterThan(0);
    expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors during playback').toEqual([]);
  });

  // The controls narrate the hour just played. An arrival names the station, its change
  // over that hour and the wind's turn, is announced (and only arrivals are), and pulses
  // the station in 3D. The expected hour and numbers come from the kernel in the page.
  test('narrates the front reaching a station, and only arrivals are announced', async ({ page }) => {
    test.setTimeout(240000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront' } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!document.querySelector('[data-weather-forecast-controls]'), null, { timeout: 60000 });
    const plan = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      for (let h = 1; h <= 24; h += 1) {
        const n = K.forecastNarration(state, h);
        if (n.kind === 'arrival') {
          const a = n.arrivals[0];
          return { hour: h, id: a.id, name: a.name, change: Math.abs(a.tempChange), colder: a.tempChange < 0, from: K.cardinal(a.windFrom), to: K.cardinal(a.windTo), ids: n.arrivals.map((x: any) => x.id).join(',') };
        }
      }
      return null;
    });
    expect(plan, 'the cold front must reach a station within the day').not.toBeNull();
    const slider = page.getByRole('slider', { name: 'Forecast model hour' });
    const narration = page.locator('[data-weather-forecast-narration]');
    const announced = page.locator('[data-weather-forecast-arrival]');

    // The hour before: it names the station the front is heading for; nothing announced.
    await slider.fill(String(plan!.hour - 1));
    await expect.poll(() => hourOf(page)).toBe(plan!.hour - 1);
    await expect(narration).toHaveAttribute('data-weather-forecast-narration', 'ahead');
    await expect(narration).toContainText('heading for ' + plan!.name);
    await expect(announced).toHaveText('');

    // The arrival hour: narrated with the kernel's numbers, announced, pulsed in 3D.
    await slider.fill(String(plan!.hour));
    await expect.poll(() => hourOf(page)).toBe(plan!.hour);
    await expect(narration).toHaveAttribute('data-weather-forecast-narration', 'arrival');
    const detail = `${plan!.name}: ${plan!.change}° ${plan!.colder ? 'colder' : 'warmer'} in an hour, wind ${plan!.from} → ${plan!.to}.`;
    await expect(narration).toContainText('the front reached ' + plan!.name);
    await expect(narration).toContainText(detail);
    await expect(announced).toContainText(detail);
    await expect(announced).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('[data-weather-immersive-canvas]')).toHaveAttribute('data-weather-front-arrivals', plan!.ids, { timeout: 30000 });
  });
});
