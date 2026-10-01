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
    // The other signs of the passage, from the kernel's own window around it.
    expect(expected.evidence, 'the front crossed, so the evidence must be there').not.toBeNull();
    const winds = await page.evaluate((e) => {
      const K = (window as any).WeatherSystemsKernel;
      return [K.cardinal(e.windFrom), K.cardinal(e.windTo)];
    }, expected.evidence);
    const signedValue = (v: number) => (v > 0 ? '+' : '') + v;
    await expect(page.locator('[data-weather-prediction-evidence]')).toContainText(
      `As the front passed (T+${expected.evidence.fromHour} to T+${expected.evidence.toHour}): dew point ${signedValue(expected.evidence.dewPoint)}°, pressure ${signedValue(expected.evidence.pressure)} hPa, wind ${winds[0]} → ${winds[1]}.`);

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

  // The live trace draws as the forecast plays. It must show only hours already played
  // (anything more gives the answer away), mark the front only once the station is behind
  // it, and end on the same number the station label and the verdict print.
  test('the live trace draws only what has been played and marks the front when it arrives', async ({ page }) => {
    test.setTimeout(240000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'coldFront', simHour: 0 } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!document.querySelector('[data-weather-prediction]'), null, { timeout: 60000 });
    const trace = page.locator('[data-weather-prediction-trace]');
    await expect(trace, 'no trace before a prediction').toHaveCount(0);
    await page.locator('[data-weather-predict-choice="colder"]').click();

    const kernelTrace = (played: number) => page.evaluate((p) => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      const station = K.stations.filter((item: any) => item.id === 'central')[0];
      return K.predictionTrace(state, station, 12, p);
    }, played);
    const before = await kernelTrace(12);
    expect(before.frontArrivedAt, 'this setup must have the front arrive inside the window').not.toBeNull();
    const arrivalHour = Math.ceil(before.frontArrivedAt);

    // One hour before the station is behind the front: drawn to that hour, no marker.
    await toHour(page, arrivalHour - 1);
    await expect(trace).toHaveAttribute('data-weather-prediction-trace', String(arrivalHour - 1));
    await expect(page.locator('[data-weather-trace-front]')).toHaveCount(0);
    const early = await kernelTrace(arrivalHour - 1);
    await expect(page.locator('[data-weather-trace-station-value]')).toHaveAttribute('data-weather-trace-station-value', String(early.points[early.points.length - 1].station));

    // The hour it is behind the front: the marker appears, at the kernel's passage hour.
    await toHour(page, arrivalHour);
    await expect(page.locator('[data-weather-trace-front]')).toHaveAttribute('data-weather-trace-front', String(before.frontArrivedAt));

    // Revealed: the trace ends on the verdict's own end temperature.
    await toHour(page, 12);
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'revealed');
    await expect(trace).toHaveAttribute('data-weather-prediction-trace', '12');
    const expected = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      return K.predictionOutcome(state, K.stations.filter((item: any) => item.id === 'central')[0], 12);
    });
    await expect(page.locator('[data-weather-trace-station-value]')).toHaveAttribute('data-weather-trace-station-value', String(expected.endTemp));
    // The trace is outside the live region, so each played hour is not announced.
    expect(await page.locator('[data-weather-prediction-result] [data-weather-prediction-trace]').count()).toBe(0);

    // The revealed card is tall; Hide folds it to its verdict so the scene can be seen.
    const toggle = page.locator('[data-weather-prediction-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const open = (await card(page).boundingBox())!.height;
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(trace).toHaveCount(0);
    await expect(page.locator('[data-weather-prediction-result]')).toContainText('Correct: colder.');
    const folded = (await card(page).boundingBox())!.height;
    console.log('card open/folded height:', Math.round(open), Math.round(folded));
    expect(folded, 'folding should give most of the card back to the scene').toBeLessThan(open * 0.4);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(trace).toHaveAttribute('data-weather-prediction-trace', '12');
  });

  // The top-right reading is the region's sea-level air, not a station, so it is labelled
  // "Regional air", and the card's explanation points at it. At the coast in the warm
  // front the regional air crosses 12 C and the sea's offset flips: the only path that
  // renders the sea sentence, checked against the kernel running in this page.
  test('the explanation names the regional air and, at the coast, the sea', async ({ page }) => {
    test.setTimeout(240000);
    await harness.mount(page, { weatherSystems: { tab: 'immersive', scenario: 'warmFront', selectedStation: 'coast', simHour: 0 } }, undefined, { expectCanvas: false });
    await page.waitForFunction(() => !!document.querySelector('[data-weather-prediction]'), null, { timeout: 60000 });
    await expect(card(page)).toContainText('will Harbor Point be');

    const hud = page.locator('[data-weather-scene-hud]');
    const regionalShown = async (hour: number) => page.evaluate((h) => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      return K.projectConditions(Object.assign({}, state, { simHour: h }), h).temperature;
    }, hour);
    // textContent: the label is CSS-uppercased, and innerText would report the transform.
    expect(await hud.evaluate((el) => el.textContent)).toContain('Regional air' + (await regionalShown(0)) + '°C');

    await page.locator('[data-weather-predict-choice="warmer"]').click();
    await toHour(page, 12);
    await expect(card(page)).toHaveAttribute('data-weather-prediction', 'revealed');
    expect(await hud.evaluate((el) => el.textContent)).toContain('Regional air' + (await regionalShown(12)) + '°C');

    const o = await page.evaluate(() => {
      const K = (window as any).WeatherSystemsKernel;
      const state = K.resolvedState((window as any).__toolData.weatherSystems);
      const station = K.stations.filter((item: any) => item.id === 'coast')[0];
      return Object.assign(K.predictionOutcome(state, station, 12), { offset: K.marineOffsetC, sw: K.marineSwitchC });
    });
    console.log('coast outcome:', JSON.stringify(o));
    expect(o.seaChange, 'this setup must exercise the sea path').not.toBe(0);
    const signed = (v: number) => (v > 0 ? '+' : '') + v;
    const result = page.locator('[data-weather-prediction-result]');
    await expect(result).toContainText(`air itself changed ${signed(o.regionalChange)}° (the Regional air reading at the top), and the sea accounts for ${signed(o.seaChange)}°`);
    await expect(result).toContainText(`it keeps this coast ${o.offset}° warmer than the regional air while that air is ${o.sw}°C or colder`);
  });
});
