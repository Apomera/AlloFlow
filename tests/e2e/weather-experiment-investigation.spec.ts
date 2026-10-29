import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Exercise the current working tree through the same stateful host as the other
// weather workflows, with the real app stylesheet for responsive layout checks.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, {
    weatherSystems: { tab: 'experiment', scenario: 'coldFront', simHour: 0, ...state },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(page.locator('[data-weather-experiment-lab]')).toBeVisible();
}

async function runTest(page: Page, hour = 6) {
  await page.locator('#weather-experiment-variable').selectOption('humidity');
  await page.locator('#weather-experiment-value').fill('90');
  await page.locator('#weather-experiment-hour').selectOption(String(hour));
  await page.getByRole('button', { name: 'Increase', exact: true }).click();
  const button = page.getByRole('button', { name: /Run controlled test/ });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#weather-experiment-feedback')).toBeFocused();
  await expect(page.locator('[data-weather-experiment-result="true"]')).toBeVisible();
}

async function saveTest(page: Page, note: string) {
  await page.getByRole('textbox', { name: 'Experiment explanation', exact: true }).fill(note);
  await page.getByRole('button', { name: 'Save experiment', exact: true }).click();
  await expect(page.locator('[data-weather-experiment-notebook]')).toContainText(note);
}

test.describe('Weather Systems — controlled investigations', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('compares initial conditions at an absolute model hour and offers keyboard timeline inspection', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page, { simHour: 18 });
    await runTest(page);
    const result = await page.evaluate(() => (window as any).__toolData.weatherSystems.experimentResult);
    expect(result.hour).toBe(6);
    expect(result.timeline[0].hour).toBe(0);
    expect(result.timeline.at(-1).hour).toBe(6);
    const original = JSON.stringify(result);
    const slider = page.getByRole('slider', { name: 'Review experiment hour', exact: true });
    await expect(slider).toHaveAttribute('min', '0');
    await expect(slider).toHaveAttribute('max', '6');
    await slider.fill('2');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveValue('3');
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.simHour)).toBe(18);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentResult))).toBe(original);
    await page.getByText('Read hourly experiment data', { exact: true }).click();
    const timeline = page.locator('[data-weather-experiment-timeline]');
    await expect(timeline.locator('table')).toBeVisible();
    expect(await timeline.locator('tbody tr').count()).toBe(7);
    await timeline.screenshot({ path: info.outputPath('experiment-timeline-desktop.png') });
    await page.locator('#weather-experiment-feedback').screenshot({ path: info.outputPath('experiment-result-desktop.png') });
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('explores a variable range without changing the controlled result or main model', async ({ page }, info) => {
    await mount(page);
    await runTest(page, 12);
    const before = await page.evaluate(() => {
      const d = (window as any).__toolData.weatherSystems;
      return { result: JSON.stringify(d.experimentResult), humidity: d.humidity, simHour: d.simHour };
    });
    await page.getByRole('button', { name: 'Explore variable range', exact: true }).click();
    const sensitivity = page.locator('[data-weather-experiment-sensitivity]');
    await expect(sensitivity).toBeVisible();
    expect(await sensitivity.locator('tbody tr').count()).toBeGreaterThanOrEqual(7);
    await expect(sensitivity).toContainText(/model/i);
    expect(await page.evaluate(() => {
      const d = (window as any).__toolData.weatherSystems;
      return { result: JSON.stringify(d.experimentResult), humidity: d.humidity, simHour: d.simHour };
    })).toEqual(before);
    await sensitivity.screenshot({ path: info.outputPath('experiment-sensitivity.png') });
    await page.getByRole('combobox', { name: 'Measurement to compare', exact: true }).selectOption('temperature');
    await expect(sensitivity.locator('caption')).toContainText('Temperature');
    await expect(sensitivity.locator('table')).toContainText('°C');
    await expect(page.locator('[data-weather-experiment-reading]')).toContainText('Temperature');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentResult))).toBe(before.result);
  });

  test('saves immutable evidence, exports its provenance, and hands it to a forecast explanation once', async ({ page }) => {
    await mount(page);
    await expect(page.getByRole('button', { name: 'Download experiment journal', exact: true })).toBeDisabled();
    await runTest(page);
    const note = 'More initial moisture changed cloud cover and precipitation potential while the other starting inputs stayed fixed.';
    await saveTest(page, note);
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentHistory));
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download experiment journal', exact: true }).click();
    const download = await downloadEvent;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.txt$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const report = Buffer.concat(chunks).toString('utf8');
    expect(report).toContain(note);
    expect(report).toMatch(/teaching.?model/i);
    expect(report).toMatch(/humidity/i);
    expect(report).toMatch(/T\+6|hour[^\n]*6/i);
    const use = page.locator('[data-weather-experiment-notebook]').getByRole('button', { name: 'Use in forecast explanation', exact: true }).first();
    await use.click();
    const once = await page.evaluate(() => (window as any).__toolData.weatherSystems.reasoning);
    expect(once).toContain(note);
    if (await use.isVisible() && await use.isEnabled()) await use.click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.reasoning)).toBe(once);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentHistory))).toBe(saved);
  });

  test('prevents an unchanged-input test and preserves saved evidence across scenario changes', async ({ page }) => {
    await mount(page);
    const baseline = await page.evaluate(() => (window as any).WeatherSystemsKernel.resolvedState((window as any).__toolData.weatherSystems).humidity);
    await page.locator('#weather-experiment-value').fill(String(baseline));
    await page.getByRole('button', { name: 'Stay close', exact: true }).click();
    await expect(page.getByRole('button', { name: /Run controlled test/ })).toBeDisabled();
    await runTest(page);
    await saveTest(page, 'This result belongs to the cold-front setup.');
    const saved = await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentHistory));
    await page.getByRole('tab', { name: /Map Lab/ }).click();
    await page.locator('#weather-temp').fill('10');
    await page.getByRole('tab', { name: /Cause & Effect Lab/ }).click();
    await expect(page.locator('[data-weather-experiment-context]')).toBeVisible();
    await expect(page.locator('[data-weather-experiment-result="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentHistory))).toBe(saved);
    await page.getByRole('combobox', { name: 'Experiment scenario', exact: true }).selectOption('winterStorm');
    await expect(page.locator('[data-weather-experiment-notebook]')).toContainText('This result belongs to the cold-front setup.');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.experimentHistory))).toBe(saved);
    await expect(page.locator('[data-weather-experiment-notebook]')).toContainText(/earlier|different/i);
  });

  test('keeps timeline, sensitivity, and notebook contained on a dark phone layout', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page);
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await runTest(page);
    await page.getByText('Read hourly experiment data', { exact: true }).click();
    await page.getByRole('button', { name: 'Explore variable range', exact: true }).click();
    await saveTest(page, 'My phone investigation: compare both runs at the same hour.');
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await page.locator('[data-weather-experiment-timeline]').screenshot({ path: info.outputPath('experiment-timeline-phone-dark.png') });
    await page.locator('[data-weather-experiment-sensitivity]').screenshot({ path: info.outputPath('experiment-sensitivity-phone-dark.png') });
    await page.locator('[data-weather-experiment-notebook]').screenshot({ path: info.outputPath('experiment-notebook-phone-dark.png') });
    const chartScroll = page.locator('[data-weather-experiment-timeline]').getByRole('region', { name: 'Precipitation potential comparison chart', exact: true });
    expect(await chartScroll.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await chartScroll.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => chartScroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });
});
