import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Serve the current checkout and the real app stylesheet, not the deployed app.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, {
    weatherSystems: { tab: 'forecast', scenario: 'coldFront', simHour: 0, ...state },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await page.evaluate(() => {
    (window as any).__ctx.gradeLevel = '8th Grade';
    (window as any).__rerender();
  });
  await expect(page.locator('[data-weather-ensemble]')).toBeVisible();
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return { filename: file.suggestedFilename(), content: Buffer.concat(chunks).toString('utf8') };
}

async function issueForecast(page: Page, chosenPrecip?: string) {
  const outcome = await page.evaluate(() => {
    const w = window as any;
    const truth = w.WeatherSystemsKernel.expectedForecast(w.WeatherSystemsKernel.resolvedState(w.__toolData.weatherSystems));
    return { precip: truth.precip, timing: truth.timing, hazard: truth.hazard, action: w.WeatherSystemsKernel.readinessActionForHazard(truth.hazard) };
  });
  await page.locator('#forecast-precip').selectOption(chosenPrecip || outcome.precip);
  await page.locator('#forecast-timing').selectOption(outcome.timing);
  await page.locator('#forecast-hazard').selectOption(outcome.hazard);
  await page.locator('#forecast-action').selectOption(outcome.action);
  await page.locator('#forecast-confidence').selectOption('80');
  await page.locator('#forecast-reasoning').fill('I compared the pressure tendency, moisture, and front position, then considered how uncertain starting conditions affect the model.');
  await page.getByRole('button', { name: /Verify forecast/ }).click();
  await expect(page.locator('[data-weather-model-verification]')).toContainText(/forecast verification/i);
}

test.describe('Weather Systems — uncertainty explorer', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('reviews the selected forecast window and the control member with keyboard access', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page, { simHour: 6 });
    const open = page.getByRole('button', { name: 'Explore forecast uncertainty', exact: true });
    await open.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#weather-ensemble-title')).toBeFocused();
    const review = page.getByRole('slider', { name: 'Review ensemble hour', exact: true });
    await expect(review).toHaveAttribute('min', '6');
    await expect(review).toHaveAttribute('max', '18');
    await review.fill('9');
    await review.focus();
    await page.keyboard.press('ArrowRight');
    await expect(review).toHaveValue('10');
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.simHour)).toBe(6);
    await page.getByText('Read ensemble timeline data', { exact: true }).click();
    const timeline = page.locator('[data-weather-ensemble-timeline]');
    await expect(timeline.locator('table')).toBeVisible();
    expect(await timeline.locator('tbody tr').count()).toBe(13);
    await page.getByRole('combobox', { name: 'Inspect ensemble member', exact: true }).selectOption('5');
    const member = page.locator('[data-weather-ensemble-member]');
    await expect(member).toContainText(/control/i);
    await expect(member).toContainText(/starting|input/i);
    await timeline.screenshot({ path: info.outputPath('uncertainty-timeline-desktop.png') });
    await member.screenshot({ path: info.outputPath('uncertainty-control-member.png') });
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('compares confidence with the selected claim while exploratory spread leaves the saved forecast intact', async ({ page }) => {
    await mount(page, { evidence: ['pressure', 'front', 'radar'] });
    await issueForecast(page, 'snow');
    const before = await page.evaluate(() => {
      const w = window as any;
      const d = w.__toolData.weatherSystems;
      return { model: w.WeatherSystemsKernel.resolvedState(d), result: JSON.stringify(d.forecastResult), history: JSON.stringify(d.forecastHistory), support: d.forecastResult.calibration.supportCount };
    });
    expect(before.support).toBe(0);
    const verification = page.locator('[data-weather-model-verification]');
    await expect(verification).toContainText('Above model agreement');
    await expect(verification).not.toContainText(/overconfident|well calibrated/i);
    const scale = page.getByRole('slider', { name: 'Starting-condition spread', exact: true });
    await scale.fill('0');
    const panel = page.locator('[data-weather-ensemble]');
    await expect(panel).toContainText('9/9');
    await expect(panel).toContainText(/what.if/i);
    await page.getByText('Read all ensemble members', { exact: true }).click();
    const table = page.getByText('Read all ensemble members', { exact: true }).locator('..').locator('table');
    await expect(table).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBe(9);
    await scale.fill('2');
    const after = await page.evaluate(() => {
      const w = window as any;
      const d = w.__toolData.weatherSystems;
      return { model: w.WeatherSystemsKernel.resolvedState(d), result: JSON.stringify(d.forecastResult), history: JSON.stringify(d.forecastHistory) };
    });
    expect(after).toEqual({ model: before.model, result: before.result, history: before.history });
    await expect(verification).toContainText('Above model agreement');
  });

  test('exports nine-member provenance and carries a full explanation into the forecast once', async ({ page }) => {
    await mount(page, { scenario: 'winterStorm', simHour: 3 });
    await page.getByRole('slider', { name: 'Starting-condition spread', exact: true }).fill('1.5');
    const tail = 'END-OF-FULL-EXPLANATION-1500-OK!';
    const note = 'My uncertainty explanation: '.padEnd(1500 - tail.length, 'x') + tail;
    expect(note.length).toBe(1500);
    await page.getByRole('textbox', { name: 'Uncertainty explanation', exact: true }).fill(note);
    const report = await download(page, 'Download ensemble report');
    expect(report.filename).toMatch(/\.txt$/);
    expect(report.content).toContain(note);
    expect(report.content).toMatch(/winter/i);
    expect(report.content).toMatch(/T\+3|issue[^\n]*3/i);
    expect(report.content).toMatch(/T\+9|target[^\n]*9|valid[^\n]*9/i);
    expect(report.content).toContain('1.5');
    expect(report.content).toMatch(/not[^\n]*(?:probabilit|confidence interval)|illustrative/i);
    const csv = await download(page, 'Download ensemble CSV');
    expect(csv.filename).toMatch(/\.csv$/);
    expect(csv.content.trim().split(/\r?\n/)).toHaveLength(10);
    expect(csv.content).toMatch(/temperature/i);
    expect(csv.content).toMatch(/member/i);
    const handoff = page.getByRole('button', { name: 'Use uncertainty in forecast explanation', exact: true });
    await handoff.click();
    const reasoning = await page.locator('#forecast-reasoning').inputValue();
    expect(reasoning).toContain(note);
    expect(reasoning).toMatch(/winter/i);
    expect(reasoning.length).toBeLessThan(4000);
    if (await handoff.isVisible() && await handoff.isEnabled()) await handoff.click();
    await expect(page.locator('#forecast-reasoning')).toHaveValue(reasoning);
  });

  test('keeps dark phone member and timeline views usable without page overflow', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { simHour: 9 });
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await page.getByRole('slider', { name: 'Starting-condition spread', exact: true }).fill('2');
    await page.getByRole('combobox', { name: 'Ensemble measurement', exact: true }).selectOption('pressure');
    await page.getByRole('combobox', { name: 'Inspect ensemble member', exact: true }).selectOption('9');
    const timeline = page.locator('[data-weather-ensemble-timeline]');
    await expect(timeline).toContainText(/pressure/i);
    await page.getByText('Read ensemble timeline data', { exact: true }).click();
    await page.getByText('Read all ensemble members', { exact: true }).click();
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    const scroll = timeline.locator('[role="region"]').filter({ has: page.locator('table') });
    if (await scroll.count()) {
      await scroll.first().focus();
      await page.keyboard.press('ArrowRight');
      if (await scroll.first().evaluate((element) => element.scrollWidth > element.clientWidth)) {
        await expect.poll(() => scroll.first().evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      }
    }
    await timeline.screenshot({ path: info.outputPath('uncertainty-timeline-phone-dark.png') });
    await page.locator('[data-weather-ensemble-member]').screenshot({ path: info.outputPath('uncertainty-member-phone-dark.png') });
  });

  test('explains the model end and prevents exporting a nonexistent future forecast', async ({ page }) => {
    await mount(page, { simHour: 24 });
    const panel = page.locator('[data-weather-ensemble]');
    await expect(panel).toContainText(/no future|end of|earlier|T\+24/i);
    await expect(page.getByRole('button', { name: 'Download ensemble report', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Download ensemble CSV', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Use uncertainty in forecast explanation', exact: true })).toBeDisabled();
    expect(await panel.textContent()).not.toMatch(/NaN|Infinity/);
    await page.getByRole('slider', { name: 'Forecast issue hour', exact: true }).fill('23');
    await expect(page.getByRole('button', { name: 'Download ensemble report', exact: true })).toBeEnabled();
    const review = page.getByRole('slider', { name: 'Review ensemble hour', exact: true });
    await expect(review).toHaveAttribute('min', '23');
    await expect(review).toHaveAttribute('max', '24');
    await expect(panel).toContainText(/24/);
  });

  test('keeps fractional forecast hours exact when keyboard review reaches the model endpoint', async ({ page }) => {
    await mount(page, { simHour: 22.5 });
    const review = page.getByRole('slider', { name: 'Review ensemble hour', exact: true });
    await expect(review).toHaveAttribute('min', '22.5');
    await expect(review).toHaveAttribute('max', '24');
    await expect(review).toHaveAttribute('step', 'any');
    await expect(review).toHaveValue('24');
    await expect(review).toHaveAttribute('aria-valuetext', 'T+24 hours');
    await review.focus();
    await page.keyboard.press('Home');
    await expect(review).toHaveValue('22.5');
    await expect(review).toHaveAttribute('aria-valuetext', 'T+22.5 hours');
    await expect(page.locator('[data-weather-ensemble-reading]')).toContainText('T+22.5');
    await page.keyboard.press('ArrowRight');
    await expect(review).toHaveValue('23.5');
    await expect(review).toHaveAttribute('aria-valuetext', 'T+23.5 hours');
    await page.keyboard.press('ArrowRight');
    await expect(review).toHaveValue('24');
    await expect(review).toHaveAttribute('aria-valuetext', 'T+24 hours');
    await expect(page.locator('[data-weather-ensemble-reading]')).toContainText('T+24');
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.simHour)).toBe(22.5);
  });
});
