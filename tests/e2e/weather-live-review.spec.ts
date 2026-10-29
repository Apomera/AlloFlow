import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Feed deterministic provider snapshots through the local working tree. No
// external weather request is needed to verify save/review provenance.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const DATE = '2026-10-29';
const TARGET = `${DATE}T14:00:00Z`;
const location = { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568 };
const measures = {
  temperature: 24, humidity: 70, precipitation: 1.2, pressure: 1007,
  windSpeed: 24, windDir: 220, weatherCode: 95, condition: 'Thunderstorms',
  cloudCover: 80, visibility: 10000, pressureType: 'surface',
};

function live(hour = 12, changes: Record<string, unknown> = {}) {
  const time = `${DATE}T${String(hour).padStart(2, '0')}:00:00Z`;
  return {
    ...location, ...measures, observedAt: time, validAt: time,
    retrievedAt: `${DATE}T${String(hour).padStart(2, '0')}:01:00Z`,
    source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/',
    timezone: 'UTC', utcOffsetSeconds: 0, precipitationIntervalSeconds: 900,
    ...changes,
  };
}

function point(hour: number, role: string, changes: Record<string, unknown> = {}) {
  return {
    ...measures, time: `${DATE}T${String(hour).padStart(2, '0')}:00:00Z`,
    role, offsetHours: hour - 12, utcOffsetSeconds: 0,
    precipitationIntervalSeconds: role === 'current' ? 900 : 3600,
    source: 'Open-Meteo', sourceKind: 'model', ...changes,
  };
}

function studio(page: Page) { return page.locator('[data-weather-forecast-verification-studio]'); }

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await page.clock.setFixedTime(new Date(`${DATE}T12:05:00Z`));
  await harness.mount(page, {
    weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', simHour: 0,
      liveWeather: live(),
      liveWeatherTimeline: [point(12, 'current'), point(14, 'forecast'), point(15, 'forecast', { temperature: 25 })],
      liveWeatherTimelineIndex: 0, ...state,
    },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await expect(studio(page)).toBeVisible();
}

async function chooseHour(page: Page, text = '14:00') {
  const select = studio(page).getByRole('combobox', { name: 'Live forecast hour', exact: true });
  const value = await select.locator('option').evaluateAll((options, target) => {
    const match = (options as HTMLOptionElement[]).find((option) => option.textContent?.includes(String(target)));
    return match?.value;
  }, text);
  expect(value).toBeDefined();
  await select.selectOption(value!);
}

async function save(page: Page, allowDisabledDuplicate = false) {
  await chooseHour(page);
  const button = studio(page).getByRole('button', { name: 'Save live forecast snapshot', exact: true });
  if (!allowDisabledDuplicate || await button.isEnabled()) {
    await expect(button).toBeEnabled();
    await button.focus();
    await page.keyboard.press('Enter');
  }
  return page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
}

async function refresh(page: Page, weather: Record<string, unknown>, timeline: Record<string, unknown>[]) {
  await page.evaluate(({ weather, timeline }) => {
    const w = window as any;
    w.__toolData.weatherSystems.liveWeather = weather;
    w.__toolData.weatherSystems.liveWeatherTimeline = timeline;
    w.__toolData.weatherSystems.liveWeatherTimelineIndex = 0;
    w.__rerender();
  }, { weather, timeline });
}

function laterPoint(changes: Record<string, unknown> = {}) {
  return point(14, 'earlier', {
    offsetHours: -1, temperature: 22, precipitation: 0.7, pressure: 1009,
    windSpeed: 18, windDir: 200, weatherCode: 61, condition: 'Rain', ...changes,
  });
}

async function download(page: Page, name: string) {
  const event = page.waitForEvent('download');
  await studio(page).getByRole('button', { name, exact: true }).click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return { filename: file.suggestedFilename(), content: Buffer.concat(chunks).toString('utf8') };
}

test.describe('Weather Systems — live forecast review', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('saves a future provider snapshot with keyboard controls and never overwrites a duplicate', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await mount(page);
    const saved = await save(page);
    expect(saved).toHaveLength(1);
    expect(saved[0].schema).toBe('weather-live-checkpoint-v2');
    expect(saved[0].validTimestamp).toBe(Date.parse(TARGET));
    expect(Date.parse(saved[0].retrievedAt)).toBe(Date.parse(live().retrievedAt));
    expect(Date.parse(saved[0].currentDataAt)).toBe(Date.parse(live().observedAt));
    expect(saved[0].predicted.temperature).toBe(24);
    expect(saved[0].pressureType).toBe('surface');
    expect(saved[0].precipitationIntervalSeconds).toBe(3600);
    await save(page, true);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(saved);
    await expect(studio(page)).toContainText(/already|saved/i);
    await expect(studio(page)).not.toContainText('Forecast issued');
    expect(errors.filter((message) => !/ResizeObserver loop/.test(message))).toEqual([]);
  });

  test('requires a newer matching provider retrieval and preserves missing or incompatible measurements', async ({ page }, info) => {
    await mount(page);
    const saved = await save(page);
    await refresh(page, live(15, { retrievedAt: live().retrievedAt }), [laterPoint(), point(15, 'current')]);
    await expect(studio(page).locator('[data-weather-checkpoint-status]')).toHaveAttribute('data-weather-checkpoint-status', 'refresh');
    await refresh(page, live(15), [laterPoint(), point(15, 'current')]);
    await expect(studio(page).locator('[data-weather-checkpoint-status]')).toHaveAttribute('data-weather-checkpoint-status', 'compared');
    await expect(studio(page)).toContainText('+2°C');
    await expect(studio(page)).toContainText('-2 hPa');
    await expect(studio(page)).toContainText(/model/i);
    await expect(studio(page)).not.toContainText('Forecast error = forecast minus observation');
    await studio(page).screenshot({ path: info.outputPath('live-forecast-comparison-desktop.png') });
    await refresh(page, live(15), [laterPoint({ temperature: null, precipitationIntervalSeconds: 900 }), point(15, 'current')]);
    const result = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      return w.WeatherSystemsKernel.forecastCheckpointStatus(d.liveForecastCheckpoints[0], d.liveWeatherTimeline, d.liveWeather);
    });
    expect(result.metrics.temperature).toBeNull();
    expect(result.metrics.precipitation).toBeNull();
    await expect(studio(page)).toContainText(/Not available|Not comparable|not recorded/i);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(saved);
    await refresh(page, live(15, { latitude: 44.5 }), [laterPoint()]);
    await expect(studio(page).locator('[data-weather-checkpoint-status]')).toHaveAttribute('data-weather-checkpoint-status', 'location');
  });

  test('keeps forecast revisions separate and exports their original times and model comparisons', async ({ page }) => {
    await mount(page);
    const first = (await save(page))[0];
    await page.clock.setFixedTime(new Date(`${DATE}T13:05:00Z`));
    await refresh(page, live(13), [point(13, 'current'), point(14, 'forecast', { offsetHours: 1, temperature: 26 })]);
    const revisions = await save(page);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]).toEqual(first);
    expect(revisions[1].id).not.toBe(first.id);
    expect(revisions[1].validTimestamp).toBe(first.validTimestamp);
    expect(revisions[1].predicted.temperature).toBe(26);
    await page.clock.setFixedTime(new Date(`${DATE}T15:05:00Z`));
    await refresh(page, live(15), [laterPoint(), point(15, 'current')]);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(2);
    const report = await download(page, 'Download live forecast report');
    expect(report.filename).toMatch(/\.txt$/);
    expect(report.content).toContain(first.retrievedAt);
    expect(report.content).toContain(revisions[1].retrievedAt);
    expect(report.content).toContain(first.validAt);
    expect(report.content).toMatch(/model/i);
    expect(report.content).toMatch(/not[^\n]*(?:independent|observation|accuracy)|model.to.model/i);
    const csv = await download(page, 'Download live forecast CSV');
    expect(csv.filename).toMatch(/\.csv$/);
    expect(csv.content).toContain('Open-Meteo');
    expect(csv.content).toContain(first.retrievedAt);
    expect(csv.content).toContain(revisions[1].retrievedAt);
    expect(csv.content).toMatch(/temperature/i);
  });

  test('undoes removing a snapshot without changing its captured data', async ({ page }) => {
    await mount(page);
    const saved = await save(page);
    await studio(page).getByRole('button', { name: /^Remove(?: snapshot)?$/, exact: true }).first().click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual([]);
    await studio(page).getByRole('button', { name: 'Undo remove forecast snapshot', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(saved);
  });

  test('opens a saved location and its exact forecast hour with one click', async ({ page }) => {
    await mount(page);
    const saved = await save(page);
    await page.clock.setFixedTime(new Date(`${DATE}T13:05:00Z`));
    await refresh(page, live(13, { label: 'Boston, Massachusetts', latitude: 42.3601, longitude: -71.0589 }), [
      point(13, 'current'), point(14, 'forecast', { temperature: 31 }),
    ]);

    const providerMeasurements = {
      temperature_2m: 22, relative_humidity_2m: 68, precipitation: 0.7,
      surface_pressure: 1009, wind_speed_10m: 18, wind_direction_10m: 200,
      weather_code: 61, cloud_cover: 75, visibility: 12000,
    };
    const payload = {
      latitude: location.latitude, longitude: location.longitude,
      timezone: 'America/New_York', timezone_abbreviation: 'EDT', utc_offset_seconds: -14400,
      current: { ...providerMeasurements, time: `${DATE}T09:00`, interval: 900 },
      hourly: {
        // The saved 14:00Z is 10:00 local. Matching must use the UTC offset.
        time: [`${DATE}T09:00`, `${DATE}T10:00`, `${DATE}T11:00`],
        ...Object.fromEntries(Object.entries(providerMeasurements).map(([key, value]) => [key, [value, value, value]])),
      },
    };
    const requests: string[] = [];
    let releaseResponse!: () => void;
    const responseReady = new Promise<void>((resolve) => { releaseResponse = resolve; });
    // Geographic presentation may request map assets; the navigation regression
    // uses only this deterministic provider response and never external services.
    await page.route('https://**/*', (route) => route.abort());
    await page.route('https://api.open-meteo.com/v1/forecast?*', async (route) => {
      requests.push(route.request().url());
      await responseReady;
      await route.fulfill({ json: payload });
    });
    try {
      await studio(page).getByRole('button', { name: 'Open checkpoint hour', exact: true }).click();
      await expect.poll(() => requests.length).toBe(1);
      const request = new URL(requests[0]);
      expect(request.searchParams.get('latitude')).toBe(String(location.latitude));
      expect(request.searchParams.get('longitude')).toBe(String(location.longitude));
      await expect(page.getByRole('heading', { name: 'Immersive 3D Weather Space', exact: true })).toBeVisible();
      expect(await page.evaluate(() => {
        const d = (window as any).__toolData.weatherSystems;
        return { tab: d.tab, mode: d.immersiveSceneMode, source: d.immersiveDataSource, loading: d.liveWeatherLoading };
      })).toEqual({ tab: 'immersive', mode: 'geographic', source: 'live', loading: true });
    } finally {
      releaseResponse();
    }
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherLoading)).toBe(false);
    const state = await page.evaluate(() => {
      const d = (window as any).__toolData.weatherSystems;
      return { live: d.liveWeather, selected: d.liveWeatherTimeline[d.liveWeatherTimelineIndex], snapshots: d.liveForecastCheckpoints };
    });
    expect(state.live).toMatchObject(location);
    expect(state.selected).toMatchObject({ time: `${DATE}T10:00`, utcOffsetSeconds: -14400, role: 'forecast', temperature: 22 });
    expect(Date.parse(`${state.selected.time}-04:00`)).toBe(saved[0].validTimestamp);
    expect(state.snapshots).toEqual(saved);
    expect(requests).toHaveLength(1);
  });

  test('keeps live review controls and comparisons within a dark phone viewport', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page);
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    await save(page);
    await refresh(page, live(15), [laterPoint(), point(15, 'current')]);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toBeVisible();
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await studio(page).screenshot({ path: info.outputPath('live-forecast-comparison-phone-dark.png') });
    await expect(studio(page)).not.toContainText(/NaN|Infinity|undefined/);
  });

  test('marks legacy snapshots without retrieval provenance for review instead of presenting verified observations', async ({ page }) => {
    await mount(page, {
      liveWeather: live(15), liveWeatherTimeline: [laterPoint(), point(15, 'current')],
      liveForecastCheckpoints: [{
        id: 'legacy-14', location: location.label, latitude: location.latitude, longitude: location.longitude,
        issuedAt: `${DATE}T12:00:00Z`, validAt: TARGET, timezone: 'UTC', predicted: measures,
      }],
    });
    await expect(studio(page).locator('[data-weather-checkpoint-status]')).toHaveAttribute('data-weather-checkpoint-status', 'legacy');
    await expect(studio(page)).toContainText(/provenance|saved time|retriev|legacy|older/i);
    await expect(studio(page).locator('[data-weather-forecast-error]')).toHaveCount(0);
  });
});
