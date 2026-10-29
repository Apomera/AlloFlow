import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Serve the working tree and real app styles, independently of the deployed app.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, {
    weatherSystems: { tab: 'observations', scenario: 'coldFront', selectedStation: 'central', simHour: 0, ...state },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(page.locator('[data-weather-observation-desk]')).toBeVisible();
}

async function logSelected(page: Page, hour: number, station = 'central') {
  await page.getByRole('combobox', { name: 'Observation station', exact: true }).selectOption(station);
  await page.getByRole('slider', { name: 'Observation model hour', exact: true }).fill(String(hour));
  const button = page.getByRole('button', { name: /Log this observation/ });
  await button.focus();
  await page.keyboard.press('Enter');
  return await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog);
}

async function compare(page: Page, first: string, second: string) {
  await page.getByRole('combobox', { name: 'First observation', exact: true }).selectOption(first);
  await page.getByRole('combobox', { name: 'Second observation', exact: true }).selectOption(second);
  const panel = page.locator('[data-weather-observation-comparison]');
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('Weather Systems — observation desk', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('records an immutable station history and compares two hours with keyboard controls', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page);
    const first = await logSelected(page, 0);
    const original = JSON.stringify(first[0]);
    const history = await logSelected(page, 6);
    expect(history).toHaveLength(2);
    expect(JSON.stringify(history[0])).toBe(original);
    expect(history.map((row: any) => row.hour)).toEqual([0, 6]);
    const panel = await compare(page, history[0].id, history[1].id);
    await expect(panel).toHaveAttribute('data-weather-observation-comparison', 'temporal');
    await expect(panel).toContainText(/time|temporal|trend/i);
    await expect(panel.locator('table')).toBeVisible();
    await expect(panel.locator('table')).toContainText('Temperature');
    await expect(panel.locator('table')).toContainText(String(history[0].temperature));
    await expect(panel.locator('table')).toContainText(String(history[1].temperature));
    const review = page.getByRole('slider', { name: 'Observation model hour', exact: true });
    await review.focus();
    await page.keyboard.press('ArrowRight');
    await expect(review).toHaveValue('7');
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual(history);
    await panel.screenshot({ path: info.outputPath('observation-time-comparison.png') });
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('logs one network snapshot without duplicates and distinguishes spatial comparisons', async ({ page }, info) => {
    await mount(page, { simHour: 3 });
    await page.getByRole('button', { name: 'Log station network', exact: true }).click();
    const history = await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog);
    expect(history).toHaveLength(4);
    expect(new Set(history.map((row: any) => row.stationId)).size).toBe(4);
    expect(history.every((row: any) => row.hour === 3)).toBe(true);
    const again = page.getByRole('button', { name: 'Log station network', exact: true });
    if (await again.isEnabled()) await again.click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual(history);
    const individual = page.getByRole('button', { name: /Log this observation/ });
    if (await individual.isEnabled()) await individual.click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual(history);
    const west = history.find((row: any) => row.stationId === 'west');
    const coast = history.find((row: any) => row.stationId === 'coast');
    const panel = await compare(page, west.id, coast.id);
    await expect(panel).toHaveAttribute('data-weather-observation-comparison', 'spatial');
    await expect(panel).toContainText(/spatial|different stations|across stations|between stations/i);
    await expect(panel).toContainText(/same (?:model )?(?:time|hour)/i);
    await panel.screenshot({ path: info.outputPath('observation-spatial-comparison.png') });
  });

  test('preserves original observations across scenarios and flags comparisons with changed setup', async ({ page }) => {
    await mount(page);
    const first = await logSelected(page, 0);
    const saved = JSON.stringify(first[0]);
    await page.getByRole('combobox', { name: 'Observation scenario', exact: true }).selectOption('winterStorm');
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.observationLog[0]))).toBe(saved);
    const history = await logSelected(page, 6);
    expect(history).toHaveLength(2);
    const panel = await compare(page, history[0].id, history[1].id);
    await expect(panel).toHaveAttribute('data-weather-observation-comparison', 'mixed');
    await expect(panel).toContainText(/different.*(?:setup|conditions)|(?:setup|conditions).*changed|changed.*(?:setup|conditions)/i);
    await expect(panel).toContainText(/cannot|not a|does not|not isolate|descriptive/i);
    expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.weatherSystems.observationLog[0]))).toBe(saved);
  });

  test('exports saved measurements and carries a comparison into the actual forecast form once', async ({ page }) => {
    await mount(page);
    await logSelected(page, 0);
    const history = await logSelected(page, 6);
    await compare(page, history[0].id, history[1].id);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download observations CSV', exact: true }).click();
    const download = await downloadEvent;
    expect(await download.failure()).toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const csv = Buffer.concat(chunks).toString('utf8');
    expect(csv).toMatch(/temperature/i);
    expect(csv).toMatch(/scenario|context|model/i);
    expect(csv).toContain('Central School');
    expect(csv).toContain(String(history[0].temperature));
    expect(csv).toContain(String(history[1].temperature));
    expect(csv).toContain('Recorded at (ISO time)');
    expect(history[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(csv).toContain(history[0].createdAt);
    const noteTail = 'NOTE-END: The saved station evidence retains its original model setup.';
    const note = 'I compared the same station across six hours. '.repeat(40).slice(0, 1500 - noteTail.length) + noteTail;
    expect(note).toHaveLength(1500);
    await page.getByRole('textbox', { name: 'Observation explanation', exact: true }).fill(note);
    const comparisonDownloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download comparison', exact: true }).click();
    const comparisonDownload = await comparisonDownloadEvent;
    expect(await comparisonDownload.failure()).toBeNull();
    const comparisonStream = await comparisonDownload.createReadStream();
    const comparisonChunks: Buffer[] = [];
    for await (const chunk of comparisonStream!) comparisonChunks.push(Buffer.from(chunk));
    const report = Buffer.concat(comparisonChunks).toString('utf8');
    expect(report).toContain(note);
    expect(report).toContain(history[0].scenarioName);
    expect(report).toContain('Starting temperature: ' + history[0].modelState.temp + '°C');
    const handoff = page.getByRole('button', { name: 'Use comparison in forecast explanation', exact: true });
    await handoff.click();
    const reasoning = await page.evaluate(() => (window as any).__toolData.weatherSystems.reasoning);
    expect(reasoning).toContain(note);
    expect(reasoning).toContain(history[0].scenarioName);
    expect(reasoning).toContain('Starting temperature: ' + history[0].modelState.temp + '°C');
    if (await handoff.isVisible() && await handoff.isEnabled()) await handoff.click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.reasoning)).toBe(reasoning);
    await page.getByRole('tab', { name: /Forecast Mission/ }).click();
    await expect(page.locator('#forecast-reasoning')).toHaveValue(reasoning);
    expect(await page.locator('#forecast-reasoning').inputValue()).toContain(noteTail);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual(history);
  });

  test('keeps network and comparison data usable in a dark phone layout', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { simHour: 6 });
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await page.getByRole('button', { name: 'Log station network', exact: true }).click();
    const history = await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog);
    const panel = await compare(page, history[0].id, history[1].id);
    await expect(panel.locator('table')).toBeVisible();
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await panel.screenshot({ path: info.outputPath('observation-comparison-phone-dark.png') });
    await page.locator('[data-weather-observation-log]').screenshot({ path: info.outputPath('observation-log-phone-dark.png') });
    const scroll = panel.getByRole('region', { name: 'Observation comparison data', exact: true });
    expect(await scroll.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await scroll.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });

  test('can undo clearing saved observations without losing their original measurements', async ({ page }) => {
    await mount(page);
    await logSelected(page, 0);
    const saved = await logSelected(page, 6);
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual([]);
    await page.getByRole('button', { name: 'Undo clear log', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.observationLog)).toEqual(saved);
    await expect(page.locator('[data-weather-observation-log]')).toContainText('Central School');
    await expect(page.locator('[data-weather-observation-comparison]')).toHaveAttribute('data-weather-observation-comparison', 'temporal');
  });
});
