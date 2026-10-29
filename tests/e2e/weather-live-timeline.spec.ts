import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const DATE = '2026-10-29';
const RETRIEVED = `${DATE}T12:01:00Z`;
const location = { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568 };
const measurements = {
  temperature: 18, humidity: 70, precipitation: 0.1, pressure: 1007,
  windSpeed: 12, windDir: 220, weatherCode: 3, condition: 'Overcast',
  cloudCover: 80, visibility: 10000, pressureType: 'surface',
};

function time(hour: number) {
  return new Date(Date.parse(`${DATE}T00:00:00Z`) + hour * 3600000).toISOString();
}

function point(hour: number, changes: Record<string, unknown> = {}) {
  return {
    ...measurements, time: time(hour), role: hour < 12 ? 'earlier' : hour === 12 ? 'current' : 'forecast',
    offsetHours: hour - 12, utcOffsetSeconds: 0, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: RETRIEVED, precipitationIntervalSeconds: hour === 12 ? 900 : 3600, ...changes,
  };
}

const live = {
  ...location, ...measurements, observedAt: time(12), validAt: time(12),
  retrievedAt: RETRIEVED, source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/',
  timezone: 'UTC', utcOffsetSeconds: 0, precipitationIntervalSeconds: 900,
};
const timeline = [
  point(10, { temperature: 15 }), point(11, { temperature: 16 }), point(12),
  point(13, { temperature: 20, precipitation: 0.2, windSpeed: 18 }),
  point(14, { temperature: null, precipitation: 0, pressureType: 'seaLevel' }),
  point(15, { temperature: 24, precipitation: 0.6, windSpeed: 25 }),
  point(17, { temperature: 22, precipitation: 0.3 }), point(18, { temperature: 21, precipitation: 0 }),
  point(20, { temperature: 19, precipitation: 0.1 }), point(24, { temperature: 14, precipitation: 0 }),
  point(36, { temperature: 17, precipitation: 0.4 }),
];

function explorer(page: Page) { return page.locator('[data-weather-live-timeline-explorer]'); }
function metric(page: Page) { return explorer(page).getByRole('combobox', { name: 'Live timeline metric', exact: true }); }
function windowSelect(page: Page) { return explorer(page).getByRole('combobox', { name: 'Live timeline window', exact: true }); }
function scrubber(page: Page) { return explorer(page).getByRole('slider', { name: 'Inspect live timeline hour', exact: true }); }
function detail(page: Page) { return explorer(page).locator('[data-weather-live-timeline-detail]'); }

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date(`${DATE}T12:05:00Z`));
  await harness.mount(page, {
    weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', simHour: 0, liveWeather: live,
      liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 2, ...state,
    },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(explorer(page)).toBeVisible();
}

async function selectForecastHour(page: Page) {
  await windowSelect(page).selectOption('6');
  await scrubber(page).focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await expect(detail(page)).toContainText('13:00');
}

async function csvDownload(page: Page) {
  const pending = page.waitForEvent('download');
  await explorer(page).getByRole('button', { name: 'Download live timeline CSV', exact: true }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return { filename: file.suggestedFilename(), content: Buffer.concat(chunks).toString('utf8') };
}

test.describe('Weather Systems — live timeline explorer', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('explores loaded metrics and time windows without requesting more weather', async ({ page }, info) => {
    const requests: string[] = [];
    page.on('request', (request) => { if (/api\.open-meteo\.com/.test(request.url())) requests.push(request.url()); });
    await mount(page);
    await windowSelect(page).selectOption('6');
    await metric(page).selectOption('windSpeed');
    await expect(explorer(page)).toContainText('km/h');
    await scrubber(page).focus();
    await page.keyboard.press('Home');
    await expect(explorer(page).getByRole('button', { name: 'Previous live hour', exact: true })).toBeDisabled();
    await explorer(page).getByRole('button', { name: 'Next live hour', exact: true }).click();
    await expect(detail(page)).toContainText('13:00');
    await scrubber(page).focus();
    await page.keyboard.press('End');
    await expect(detail(page)).toContainText('18:00');
    await windowSelect(page).selectOption('12');
    await scrubber(page).focus();
    await page.keyboard.press('End');
    await expect(detail(page)).toContainText('2026-10-30');
    await expect(detail(page)).toContainText('00:00');
    await windowSelect(page).selectOption('24');
    await scrubber(page).focus();
    await page.keyboard.press('End');
    await expect(detail(page)).toContainText('12:00');
    await windowSelect(page).selectOption('all');
    await scrubber(page).focus();
    await page.keyboard.press('Home');
    await expect(detail(page)).toContainText('10:00');
    await expect(explorer(page).getByRole('button', { name: 'Save inspected forecast snapshot', exact: true })).toBeDisabled();
    expect(requests).toEqual([]);
    await explorer(page).screenshot({ path: info.outputPath('live-timeline-desktop.png') });
  });

  test('shows gaps and missing measurements without drawing invented continuity', async ({ page }) => {
    await mount(page);
    await windowSelect(page).selectOption('6');
    await metric(page).selectOption('temperature');
    const paths = explorer(page).locator('[data-weather-live-timeline-segment]');
    expect(await paths.count()).toBeGreaterThan(1);
    const runLengths = await paths.evaluateAll((lines) => lines.map((line) => (line.getAttribute('points') || '').trim().split(/\s+/).filter(Boolean).length));
    // Only 12→13 and 17→18 are contiguous valid pairs. Bridging the missing
    // 14:00 reading or absent 16:00 hour would create a run of three or more.
    expect(Math.max(...runLengths)).toBe(2);
    await explorer(page).locator('summary').filter({ hasText: 'View live timeline data table' }).click();
    await explorer(page).getByRole('button', { name: 'Inspect ' + time(14), exact: true }).click();
    await expect(detail(page)).toContainText('14:00');
    await expect(detail(page)).toContainText(/not recorded|missing|unavailable|not available/i);
    await expect(detail(page)).not.toContainText('0°C');
    await metric(page).selectOption('pressure');
    await expect(detail(page)).toContainText(/surface|reference/i);
    await expect(detail(page)).not.toContainText('1007 hPa');
    await metric(page).selectOption('precipitation');
    await scrubber(page).focus();
    await page.keyboard.press('Home');
    await expect(detail(page)).toContainText(/interval|hourly|3600|60.minute/i);
    await expect(detail(page)).not.toContainText('0.1 mm');
    await expect(explorer(page)).not.toContainText(/NaN|undefined|Infinity/);
  });

  test('inspects a future hour with the keyboard and preserves its saved snapshot', async ({ page }) => {
    await mount(page);
    await selectForecastHour(page);
    const save = explorer(page).getByRole('button', { name: 'Save inspected forecast snapshot', exact: true });
    await expect(save).toBeEnabled();
    await save.focus();
    await page.keyboard.press('Enter');
    const saved = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ validTimestamp: Date.parse(time(13)), predicted: { temperature: 20 } });
    await save.click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(saved);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems.liveWeatherTimeline[3].temperature = 99;
      w.__rerender();
    });
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(saved);
  });

  test('exports the selected timeline with source times and excluded measurements', async ({ page }) => {
    await mount(page);
    await windowSelect(page).selectOption('6');
    await metric(page).selectOption('precipitation');
    const csv = await csvDownload(page);
    expect(csv.filename).toMatch(/\.csv$/);
    expect(csv.content).toContain('Open-Meteo');
    expect(csv.content).toContain('2026-10-29T12:01');
    expect(csv.content).toContain('2026-10-29T13:00');
    expect(csv.content).not.toContain('2026-10-29T20:00');
    expect(csv.content).toMatch(/interval|hourly/i);
    expect(csv.content).toMatch(/model/i);
    expect(csv.content).not.toMatch(/NaN|undefined|Infinity/);
  });

  test('preserves harmless explorer preferences while redacting weather location', async ({ page }) => {
    await mount(page);
    await metric(page).selectOption('windSpeed');
    await windowSelect(page).selectOption('12');
    const share = await page.evaluate(() => {
      const w = window as any;
      return w.WeatherSystemsKernel.immersiveSessionSharePayload(w.__toolData.weatherSystems, { includeLocation: false });
    });
    const text = JSON.stringify(share);
    expect(text).not.toContain('Portland');
    expect(text).not.toContain('43.6591');
    expect(text).not.toContain('-70.2568');
    expect(share.weatherSystems.liveTimelineMetric).toBe('windSpeed');
    expect(share.weatherSystems.liveTimelineWindow).toBe(12);
    expect(share.weatherSystems.liveTimelineSelectedAt).toBeUndefined();
    expect(share.weatherSystems.liveTimelineSelectionKey).toBeUndefined();
    expect(share.weatherSystems.liveWeather).toBeUndefined();
    expect(share.weatherSystems.liveWeatherTimeline).toBeUndefined();
  });

  test('keeps chart controls and accessible data readable in a dark phone layout', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page);
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await metric(page).selectOption('temperature');
    await selectForecastHour(page);
    await expect(explorer(page).getByRole('img')).toHaveCount(1);
    await explorer(page).locator('summary').filter({ hasText: 'View live timeline data table' }).click();
    await expect(explorer(page).getByRole('table')).toHaveCount(1);
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await explorer(page).screenshot({ path: info.outputPath('live-timeline-phone-dark.png') });
    await expect(explorer(page)).not.toContainText(/NaN|Infinity|undefined/);
  });
});
