import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Serve the current checkout rather than testing the deployed app's older source.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, {
    weatherSystems: { tab: 'forecast', scenario: 'coldFront', simHour: 0, ...state },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(page.locator('[data-weather-forecast-brief]')).toBeVisible();
}

async function completeForecast(page: Page) {
  const outcome = await page.evaluate(() => {
    const w = window as any;
    const truth = w.WeatherSystemsKernel.expectedForecast(w.WeatherSystemsKernel.resolvedState(w.__toolData.weatherSystems));
    return { precip: truth.precip, timing: truth.timing, hazard: truth.hazard, action: w.WeatherSystemsKernel.readinessActionForHazard(truth.hazard) };
  });
  await page.locator('#forecast-precip').selectOption(outcome.precip);
  await page.locator('#forecast-timing').selectOption(outcome.timing);
  await page.locator('#forecast-hazard').selectOption(outcome.hazard);
  await page.locator('#forecast-action').selectOption(outcome.action);
  await page.locator('#forecast-confidence').selectOption('80');
  await page.locator('#forecast-reasoning').fill('I compared the pressure tendency, front position, and radar pattern to explain the modeled changes.');
  return outcome;
}

async function downloadText(page: Page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download forecast journal', exact: true }).click();
  const download = await event;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return { filename: download.suggestedFilename(), content: Buffer.concat(chunks).toString('utf8') };
}

test.describe('Weather Systems — evidence-based forecast verification', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('forecasts from the selected issue hour and exposes a keyboard-readable replay', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page, { simHour: 6, evidence: ['pressure', 'front', 'radar'] });
    const brief = page.locator('[data-weather-forecast-brief]');
    await expect(brief).toContainText('T+6');
    await expect(brief).toContainText('T+12');
    await completeForecast(page);
    const verify = page.getByRole('button', { name: /Verify forecast/ });
    await verify.focus();
    await page.keyboard.press('Enter');
    const result = page.locator('[data-weather-model-verification]');
    await expect(result).toContainText('100');
    await expect(result).toBeFocused();
    await expect(page.locator('[data-weather-score-breakdown]')).toBeVisible();
    const replay = page.getByRole('slider', { name: 'Review model hour', exact: true });
    await expect(replay).toHaveAttribute('min', '6');
    await expect(replay).toHaveAttribute('max', '18');
    await replay.fill('9');
    await replay.focus();
    await page.keyboard.press('ArrowRight');
    await expect(replay).toHaveValue('10');
    await expect(page.locator('[data-weather-forecast-replay-reading]')).toContainText('10');
    await page.getByText('Read hourly verification data', { exact: true }).click();
    const table = page.locator('[data-weather-forecast-replay] table');
    await expect(table).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBe(13);
    await page.locator('[data-weather-forecast-replay]').screenshot({ path: info.outputPath('forecast-replay.png') });
    await page.locator('[data-weather-model-verification]').screenshot({ path: info.outputPath('forecast-verification.png') });
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('only distinct known evidence earns points and explains the missing credit', async ({ page }) => {
    await mount(page, { evidence: ['pressure', 'pressure', 'not-an-evidence-source'] });
    await completeForecast(page);
    await page.getByRole('button', { name: /Verify forecast/ }).click();
    const state = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(state.forecastResult.score).toBe(94);
    await expect(page.locator('[data-weather-score-breakdown]')).toContainText(/evidence/i);
    await expect(page.locator('[data-weather-score-breakdown]')).toContainText('4');
    await expect(page.locator('[data-weather-model-verification]')).toContainText(/distinct|unique|source/i);
  });

  test('retains original verification provenance after the model hour changes and exports it', async ({ page }, info) => {
    await mount(page, { simHour: 3, evidence: ['pressure', 'front', 'radar'] });
    await expect(page.getByRole('button', { name: 'Download forecast journal', exact: true })).toBeDisabled();
    await completeForecast(page);
    await page.getByRole('button', { name: /Verify forecast/ }).click();
    const original = await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.forecastHistory));
    await page.getByRole('slider', { name: 'Forecast issue hour', exact: true }).fill('8');
    await expect(page.locator('[data-weather-forecast-context]')).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.forecastHistory))).toBe(original);
    const journal = await downloadText(page);
    expect(journal.filename).toMatch(/\.txt$/);
    expect(journal.content).toMatch(/teaching.?model/i);
    expect(journal.content).toMatch(/T\+3|issue(?:d)?[^\n]*3/i);
    expect(journal.content).toMatch(/T\+9|valid[^\n]*9/i);
    expect(journal.content).toContain('I compared the pressure tendency');
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await page.locator('[data-weather-forecast-brief]').screenshot({ path: info.outputPath('forecast-brief-dark.png') });
  });

  test('the final model hour explains its limit and the phone layout stays contained', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { simHour: 24 });
    await expect(page.getByRole('button', { name: /Verify forecast/ })).toBeDisabled();
    await expect(page.locator('[data-weather-forecast-brief]')).toContainText(/earlier|end|future|24/i);
    await page.getByRole('slider', { name: 'Forecast issue hour', exact: true }).fill('23');
    await expect(page.locator('[data-weather-forecast-brief]')).toContainText('T+24');
    await completeForecast(page);
    await page.getByRole('button', { name: /Verify forecast/ }).click();
    await expect(page.getByRole('slider', { name: 'Review model hour', exact: true })).toHaveAttribute('max', '24');
    await page.getByText('Read hourly verification data', { exact: true }).click();
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await page.locator('[data-weather-forecast-brief]').screenshot({ path: info.outputPath('forecast-brief-phone.png') });
    await page.locator('[data-weather-forecast-replay]').screenshot({ path: info.outputPath('forecast-replay-phone.png') });
  });

  test('restored attempts keep numbering and survive scenario changes with precise claim wording', async ({ page }) => {
    await mount(page, { forecastHistory: [{ attempt: 7, score: 70 }], evidence: ['pressure', 'front', 'radar'] });
    await page.locator('#forecast-precip').selectOption('none');
    await page.locator('#forecast-timing').selectOption('4-6');
    await page.getByRole('button', { name: /^Add claim frame/ }).click();
    const claim = await page.locator('#forecast-reasoning').inputValue();
    expect(claim).toContain('At T+6 h, I predict no precipitation.');
    expect(claim).toContain('First precipitation: more than 3 through 6 hours after issue.');
    expect(claim).not.toMatch(/no precipitation (?:will |to )?begin/i);

    await completeForecast(page);
    await page.getByRole('button', { name: /Verify forecast/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.forecastHistory.map((entry: any) => entry.attempt))).toEqual([7, 8]);
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.forecastHistory));
    await page.getByRole('tab', { name: /Map Lab/ }).click();
    await page.locator('#weather-scenario').selectOption('winterStorm');
    await page.getByRole('tab', { name: /Forecast Mission/ }).click();
    await expect(page.locator('[data-weather-forecast-journal]')).toContainText('Forecast #8');
    await expect(page.locator('[data-weather-forecast-journal]')).toContainText('Forecast #7');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.forecastHistory))).toBe(saved);
  });
});
