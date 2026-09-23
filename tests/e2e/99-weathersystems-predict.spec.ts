import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Predict, then play, in the immersive 3D view.
 *
 * The student commits to warmer / colder / about the same for a station at T+12, plays
 * the forecast, and gets a verdict with the model's own numbers and a reason. The verdict
 * and the numbers must be the kernel's (predictionOutcome), not text written per scenario,
 * so this compares the rendered card against the kernel running in the same page.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1600,
  height: 1100,
  appStyles: true
});

const card = (page: Page) => page.locator('[data-weather-prediction]');
const toHour = async (page: Page, hour: number) => {
  await page.getByRole('slider', { name: 'Forecast model hour' }).fill(String(hour));
  await expect.poll(() => page.evaluate(() =>
    Number((document.querySelector('[data-weather-forecast-hour]') as HTMLElement).getAttribute('data-weather-forecast-hour')))).toBe(hour);
};
test.describe('Weather Systems — predict, then play', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('a right and a wrong prediction both get the model\'s own verdict and numbers', async ({ page }) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront', simHour: 0 } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!document.querySelector('[data-weather-prediction]'), null, { timeout: 60000 });

    // 1. Open: asks about the selected station at T+12.
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'open');
    const question = await card(page).innerText();
    expect(question).toMatch(/Predict first: by T\+12, will Central School be warmer, colder, or about the same\?/);

    // 2. A cold front: predict colder, then play to T+12.
    await page.locator('[data-weather-predict-choice="colder"]').click();
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'made');
    await expect(card(page)).toContainText('Your prediction for Central School: colder.');
    await toHour(page, 12);
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'revealed');
    const result = page.locator('[data-weather-prediction-result]');
    await expect(result).toHaveAttribute('data-weather-prediction-result', 'correct');
    await expect(result).toHaveAttribute('role', 'status');

    // 3. The numbers on the card are the kernel's, computed in this page.
    const expected = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const d = (window as any).__toolData.weatherSystems;
      const state = K.resolvedState(d);
      // The kernel's own station list, so the test holds no copy of the model's data.
      const station = K.stations.filter((item: any) => item.id === 'central')[0];
      return K.predictionOutcome(state, station, 12);
    });
    console.log('kernel outcome:', JSON.stringify(expected));
    expect(expected.direction).toBe('colder');
    await expect(result).toContainText(`Central School: ${expected.startTemp}° at T+0, ${expected.endTemp}° at T+12.`);
    await expect(result).toContainText(`The front reached it at about T+${expected.passageHour}, bringing air ${Math.abs(expected.frontStep)}° colder.`);
    await expect(result).toContainText(`The rest of the change (${expected.otherChange > 0 ? '+' : ''}${expected.otherChange}°)`);

    // 4. Try another station: the next station, back to T+0, a fresh question.
    await page.getByRole('button', { name: 'Try another station' }).click();
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'open');
    await expect.poll(() => page.evaluate(() =>
      Number((document.querySelector('[data-weather-forecast-hour]') as HTMLElement).getAttribute('data-weather-forecast-hour')))).toBe(0);
    const nextQuestion = await card(page).innerText();
    expect(nextQuestion, 'the next question must name a different station').not.toContain('Central School');

    // 5. The wrong answer path: predict warmer for a cold front.
    await page.locator('[data-weather-predict-choice="warmer"]').click();
    await toHour(page, 12);
    await expect(result).toHaveAttribute('data-weather-prediction-result', 'wrong');
    await expect(result).toContainText('Not this time. You said warmer; the model shows colder.');

    // 6. The tally counts the first answer once the student moves on.
    await page.getByRole('button', { name: 'Try another station' }).click();
    await page.locator('[data-weather-predict-choice="colder"]').click();
    await toHour(page, 12);
    await expect(card(page)).toContainText('Right so far: 1 of 2');

    expect(errors.filter((m) => !/ResizeObserver loop/.test(m)), 'page errors during predictions').toEqual([]);
  });
});
