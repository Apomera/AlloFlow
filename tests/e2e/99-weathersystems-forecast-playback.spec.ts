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
});
