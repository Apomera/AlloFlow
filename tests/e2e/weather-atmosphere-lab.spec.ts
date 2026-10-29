import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// These tests serve the working tree: the public app URL cannot verify local edits.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js',
  toolId: 'weatherSystems',
  width: 1280,
  height: 900,
  layout: 'document',
  appStyles: true,
});

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, {
    weatherSystems: { tab: 'atmosphere', scenario: 'coldFront', simHour: 0, ...state },
  }, undefined, { expectCanvas: false });
  // The harness deliberately uses a fixed width. Let this scrolling tool follow
  // the viewport so the phone check measures the tool, not the test fixture.
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(page.locator('[data-weather-atmosphere-lab]')).toBeVisible();
}

async function modelInputs(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).WeatherSystemsKernel.resolvedState((window as any).__toolData.weatherSystems);
    return { temp: state.temp, humidity: state.humidity, pressure: state.pressure, simHour: state.simHour };
  });
}

test.describe('Weather Systems — atmosphere investigation', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('keyboard navigation opens the lab and exposes inspectable profile data', async ({ page }) => {
    await harness.mount(page, { weatherSystems: { tab: 'map', scenario: 'coldFront', simHour: 0, playing: true } }, undefined, { expectCanvas: false });
    const tab = page.getByRole('tab', { name: /Atmosphere Lab/ });
    await tab.focus();
    await page.keyboard.press('Enter');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-weather-atmosphere-lab]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.playing)).toBe(false);

    const height = page.getByRole('slider', { name: 'Inspection height', exact: true });
    await height.focus();
    const initialHeight = Number(await height.inputValue());
    await page.keyboard.press('ArrowRight');
    await expect(height).toHaveValue(String(initialHeight + 0.25));
    await expect(page.locator('[data-weather-atmosphere-chart]')).toHaveAttribute('role', 'img');

    await page.getByText('Read profile data', { exact: true }).click();
    const table = page.locator('[data-weather-atmosphere-lab] table');
    await expect(table).toBeVisible();
    expect(await table.locator('tbody tr').count()).toBeGreaterThan(4);

    const hour = page.getByRole('slider', { name: 'Atmosphere model hour', exact: true });
    await hour.fill('6');
    await expect.poll(async () => (await modelInputs(page)).simHour).toBe(6);
    await expect(page.locator('[data-weather-atmosphere-baseline]')).toContainText('6');
    const station = page.getByRole('combobox', { name: 'Atmosphere station', exact: true });
    await station.selectOption('coast');
    await expect(page.locator('[data-weather-atmosphere-baseline]')).toContainText('Harbor Point');
  });

  test('a humidity hypothesis preserves the model and carries saved evidence into a forecast', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page);
    const modelBefore = await modelInputs(page);
    const baselineBefore = await page.locator('[data-weather-atmosphere-baseline]').innerText();
    const run = page.getByRole('button', { name: 'Run atmosphere test', exact: true });
    await expect(run).toBeDisabled();

    await page.getByRole('slider', { name: 'Test relative humidity', exact: true }).fill('95');
    await page.getByRole('button', { name: 'Lower cloud base', exact: true }).click();
    await run.click();
    const result = page.locator('[data-weather-atmosphere-result]');
    await expect(result).toBeVisible();
    await expect(result).toContainText(/supported/i);
    await expect.poll(() => page.evaluate(() => Number((window as any).__toolData.weatherSystems.experimentsRun))).toBeGreaterThanOrEqual(1);
    expect(await modelInputs(page)).toEqual(modelBefore);
    expect(await page.locator('[data-weather-atmosphere-baseline]').innerText()).toBe(baselineBefore);

    const note = 'More moisture reduced the lifting needed to reach saturation.';
    await result.locator('textarea').fill(note);
    await page.getByRole('button', { name: 'Save investigation', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.atmosphereInvestigations.length)).toBe(1);
    await expect(page.locator('[data-weather-atmosphere-evidence]')).toContainText(/humidity/i);
    await expect(page.locator('[data-weather-atmosphere-evidence]')).toContainText(note);
    await page.screenshot({ path: testInfo.outputPath('atmosphere-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Open Forecast Mission', exact: true }).click();
    await expect(page.getByRole('tab', { name: /Forecast Mission/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-weather-atmosphere-evidence]')).toContainText(/humidity/i);
    expect(await modelInputs(page)).toEqual(modelBefore);
    await page.getByRole('button', { name: 'Use in forecast explanation', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Added to explanation', exact: true })).toBeDisabled();
    await expect.poll(() => page.evaluate((expected) => Array.from(document.querySelectorAll('textarea')).some((field) => field.value.includes(expected)), note)).toBe(true);

    // A second hypothesis must not inherit the previous explanation. The saved
    // record retains it, while the new editable result starts clean.
    await page.getByRole('button', { name: 'Return to Atmosphere Lab', exact: true }).click();
    await page.getByRole('slider', { name: 'Test relative humidity', exact: true }).fill('80');
    await page.getByRole('button', { name: 'Lower cloud base', exact: true }).click();
    await run.click();
    await expect(result.locator('textarea')).toHaveValue('');
    await expect(page.locator('[data-weather-atmosphere-evidence]')).toContainText(note);
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await page.screenshot({ path: testInfo.outputPath('atmosphere-dark.png'), fullPage: true });
    await page.getByRole('slider', { name: 'Atmosphere model hour', exact: true }).fill('1');
    await expect(page.locator('[data-weather-atmosphere-context]')).toHaveAttribute('data-weather-atmosphere-context', 'earlier');
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('a cooling-rate test requires a fresh prediction and exports the inspected profile', async ({ page }) => {
    await mount(page);
    await page.getByRole('button', { name: 'Lower cloud base', exact: true }).click();
    await page.getByRole('combobox', { name: 'Variable to investigate', exact: true }).selectOption('lapseRate');
    const run = page.getByRole('button', { name: 'Run atmosphere test', exact: true });
    await expect(run).toBeDisabled();
    const cooling = page.getByRole('slider', { name: 'Test cooling rate', exact: true });
    await cooling.fill('10');
    await page.getByRole('button', { name: 'Warmer relative to air', exact: true }).click();
    await run.click();
    await expect(page.locator('[data-weather-atmosphere-result]')).toBeVisible();

    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download profile CSV', exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString('utf8');
    expect(csv.split(/\r?\n/).length).toBeGreaterThan(10);
    expect(csv).toMatch(/temperature|parcel|environment/i);
  });

  test('the phone layout keeps controls and profile within the viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { scenario: 'winterStorm' });
    await page.getByRole('slider', { name: 'Inspection height', exact: true }).fill('3');
    await page.getByText('Read profile data', { exact: true }).click();
    const sizes = await page.evaluate(() => {
      const chart = document.querySelector('[data-weather-atmosphere-chart]')!.getBoundingClientRect();
      return { viewport: innerWidth, document: document.documentElement.scrollWidth, chartLeft: chart.left, chartRight: chart.right };
    });
    expect(sizes.document).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(sizes.chartLeft).toBeGreaterThanOrEqual(0);
    expect(sizes.chartRight).toBeLessThanOrEqual(sizes.viewport + 1);
    await expect(page.getByRole('button', { name: 'Run atmosphere test', exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('atmosphere-phone.png'), fullPage: true });
  });
});
