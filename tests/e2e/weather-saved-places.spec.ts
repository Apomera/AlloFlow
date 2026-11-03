import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1200, height: 1000, layout: 'document', appStyles: true,
});
const DATE = '2026-10-29';
const live = {
  label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
  observedAt: `${DATE}T12:00:00Z`, retrievedAt: `${DATE}T12:01:00Z`,
  source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/',
  timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 900,
  temperature: 18, humidity: 72, precipitation: 0, cloudCover: 65,
  pressure: 1010, windSpeed: 12, windDir: 220, weatherCode: 3, condition: 'Overcast', visibility: 10000,
};
const snapshot = {
  schema: 'weather-live-checkpoint-v2', id: 'original-forecast',
  location: live.label, latitude: live.latitude, longitude: live.longitude,
  source: live.source, sourceKind: live.sourceKind, timezone: 'UTC', utcOffsetSeconds: 0,
  retrievedAt: live.retrievedAt, capturedAt: `${DATE}T12:02:00Z`, currentDataAt: live.observedAt,
  validAt: `${DATE}T14:00:00Z`, validTimestamp: Date.parse(`${DATE}T14:00:00Z`),
  pressureType: 'surface', precipitationIntervalSeconds: 3600, predicted: { temperature: 19 },
  learnerReasoning: 'Clouds may thicken during the afternoon.',
};
const school = {
  schema: 'weather-saved-place-v1', name: 'School yard', label: 'School yard, Pennsylvania',
  latitude: 40, longitude: -75,
  place: { name: 'School locality', admin1: 'Pennsylvania', country: 'United States', country_code: 'US' },
};
const field = {
  schema: 'weather-saved-place-v1', name: 'Field study site', label: 'Field study site, New York',
  latitude: 41, longitude: -74,
  place: { name: 'Field locality', admin1: 'New York', country: 'United States', country_code: 'US' },
};

function panel(page: Page) { return page.locator('[data-weather-live-connection="forecast"]'); }
function places(page: Page) { return panel(page).locator('[data-weather-saved-places]'); }

function provider(temperature: number) {
  const values = {
    temperature_2m: temperature, relative_humidity_2m: 70, precipitation: 0,
    surface_pressure: 1010, wind_speed_10m: 10, wind_direction_10m: 210,
    weather_code: 3, cloud_cover: 65, visibility: 10000,
  };
  return {
    timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
    current: { ...values, time: `${DATE}T12:00`, interval: 900 },
    hourly: {
      time: [`${DATE}T12:00`, `${DATE}T13:00`, `${DATE}T14:00`],
      ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [value, value, value]])),
    },
  };
}

async function mount(page: Page, changes: Record<string, unknown> = {}) {
  await page.clock.setFixedTime(new Date(`${DATE}T12:05:00Z`));
  await harness.mount(page, {
    weatherSystems: {
      tab: 'forecast', liveWeather: live,
      liveWeatherTimeline: [{ ...live, time: live.observedAt, role: 'current', offsetHours: 0 }],
      liveWeatherTimelineIndex: 0, liveForecastCheckpoints: [snapshot], ...changes,
    },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1200px; }' });
  if (!await panel(page).isVisible()) await page.getByRole('button', { name: 'Review live forecasts', exact: true }).click();
  await expect(places(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any;
    w.__savedPlaceRequests = [];
    const originalFetch = w.fetch;
    // Late replies must be harmless even when the transport cannot abort them.
    w.fetch = (url: unknown, options: any = {}) => {
      if (!String(url).startsWith('https://api.open-meteo.com/')) return originalFetch(url, options);
      return new Promise((resolve) => w.__savedPlaceRequests.push({ url: String(url), signal: options.signal, resolve }));
    };
  });
}

async function requests(page: Page) {
  return page.evaluate(() => (window as any).__savedPlaceRequests.map((entry: any) => ({ url: entry.url, aborted: entry.signal?.aborted === true })));
}

async function settle(page: Page, index: number, temperature: number) {
  await page.evaluate(async ({ index, body }) => {
    (window as any).__savedPlaceRequests[index].resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    for (let step = 0; step < 10; step += 1) await Promise.resolve();
  }, { index, body: provider(temperature) });
}

test.describe('Weather Systems saved places', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 1000 });
    await page.route('https://**/*', (route) => route.abort());
  });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('saves and renames one site, restores it locally, and redacts saved places from a shared session', async ({ page }) => {
    const eager: string[] = [];
    page.on('request', (request) => { if (/api\.open-meteo\.com/.test(request.url())) eager.push(request.url()); });
    await mount(page);
    await expect(places(page).getByRole('button', { name: /^Load saved place / })).toHaveCount(0);
    const name = places(page).getByLabel('Saved place name', { exact: true });
    await name.fill('Our coastal school');
    await places(page).getByRole('button', { name: 'Save loaded place', exact: true }).click();
    await expect(places(page).getByRole('button', { name: 'Load saved place Our coastal school', exact: true })).toBeVisible();
    await name.fill('Coastal school weather site');
    await places(page).getByRole('button', { name: 'Save loaded place', exact: true }).click();
    const state = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      return {
        places: d.savedLivePlaces,
        local: w.WeatherSystemsKernel.immersiveLocalWorkspacePayload(d),
        redacted: w.WeatherSystemsKernel.immersiveSessionSharePayload(d, { includeLocation: false }),
      };
    });
    expect(state.places).toHaveLength(1);
    expect(state.places[0]).toMatchObject({ name: 'Coastal school weather site', latitude: live.latitude, longitude: live.longitude });
    expect(state.places[0].temperature).toBeUndefined();
    expect(state.places[0].retrievedAt).toBeUndefined();
    expect(state.redacted.weatherSystems.savedLivePlaces).toBeUndefined();
    expect(JSON.stringify(state.redacted)).not.toContain('Coastal school weather site');
    await page.evaluate((payload) => localStorage.setItem('weather-systems-immersive-workspace-v1', JSON.stringify(payload)), state.local);
    await harness.destroy(page);
    await mount(page, { liveWeather: undefined, liveWeatherTimeline: [], liveForecastCheckpoints: [] });
    await expect(places(page).getByRole('button', { name: 'Load saved place Coastal school weather site', exact: true })).toBeVisible();
    expect(await requests(page)).toEqual([]);
    expect(eager).toEqual([]);

    await page.evaluate(({ school, field }) => {
      const w = window as any;
      const d = w.__toolData.weatherSystems;
      d.savedLivePlaces = [d.savedLivePlaces[0], school, field,
        ...[33, 34, 35].map((latitude) => ({ ...school, name: 'Study site ' + latitude, latitude }))];
      w.__rerender();
    }, { school, field });
    await expect(places(page).getByRole('button', { name: /^Load saved place / })).toHaveCount(6);
    await places(page).getByLabel('Saved place name', { exact: true }).fill('Renamed at capacity');
    await places(page).getByRole('button', { name: 'Save loaded place', exact: true }).click();
    await expect(places(page).getByRole('button', { name: 'Load saved place Renamed at capacity', exact: true })).toBeVisible();
    const atCapacity = await page.evaluate(() => (window as any).__toolData.weatherSystems.savedLivePlaces);
    expect(atCapacity).toHaveLength(6);
    await panel(page).getByRole('searchbox', { name: 'Quick location search', exact: true }).fill('47.6, -122.3');
    await panel(page).getByRole('button', { name: 'Search', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await settle(page, 0, 21);
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeather.latitude)).toBe(47.6);
    await places(page).getByLabel('Saved place name', { exact: true }).fill('Seventh study site');
    await places(page).getByRole('button', { name: 'Save loaded place', exact: true }).click();
    const afterFull = await page.evaluate(() => ({
      places: (window as any).__toolData.weatherSystems.savedLivePlaces,
      status: (window as any).__toolData.weatherSystems.livePlaceStatus,
    }));
    expect(afterFull.places).toEqual(atCapacity);
    expect(afterFull.status).toMatch(/six|6|limit|capacity/i);

    await places(page).getByRole('button', { name: 'Remove saved place School yard', exact: true }).click();
    await places(page).getByRole('button', { name: 'Save loaded place', exact: true }).click();
    await expect(places(page).getByRole('button', { name: 'Load saved place Seventh study site', exact: true })).toBeVisible();
    const filledAgain = await page.evaluate(() => (window as any).__toolData.weatherSystems.savedLivePlaces);
    expect(filledAgain).toHaveLength(6);
    expect(filledAgain).toEqual(expect.arrayContaining(atCapacity.filter((place: any) => place.name !== 'School yard')));
    await expect(places(page).getByRole('button', { name: 'Undo remove saved place', exact: true })).toHaveCount(0);
  });

  test('loads the chosen saved coordinates and keeps the newer place when earlier weather arrives late', async ({ page }) => {
    await mount(page, { savedLivePlaces: [school, field] });
    await places(page).getByRole('button', { name: 'Load saved place School yard', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await places(page).getByRole('button', { name: 'Load saved place Field study site', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(2);
    const sent = await requests(page);
    expect(sent[0]).toMatchObject({ aborted: true });
    expect(sent[0].url).toContain('latitude=40');
    expect(sent[0].url).toContain('longitude=-75');
    expect(sent[1].url).toContain('latitude=41');
    expect(sent[1].url).toContain('longitude=-74');
    await settle(page, 1, 22);
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeather.temperature)).toBe(22);
    await settle(page, 0, 8);
    const final = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(final.liveWeather).toMatchObject({ latitude: 41, longitude: -74, temperature: 22 });
    expect(final.liveForecastCheckpoints).toEqual([snapshot]);
    expect(final.liveWeatherError).toBe('');
  });

  test('removes and restores a saved place with the keyboard on a dark phone', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, { savedLivePlaces: [school, { ...field, name: 'NorthValleySchoolFieldObservationSiteWithAnEspeciallyLongSavedName' }] });
    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      w.__rerender();
    });
    const original = await page.evaluate(() => (window as any).WeatherSystemsKernel.immersiveSessionDownloadPayload((window as any).__toolData.weatherSystems).weatherSystems.savedLivePlaces);
    const remove = places(page).getByRole('button', { name: 'Remove saved place School yard', exact: true });
    await remove.focus();
    await page.keyboard.press('Enter');
    await expect(places(page).getByRole('button', { name: 'Load saved place School yard', exact: true })).toHaveCount(0);
    const undo = places(page).getByRole('button', { name: 'Undo remove saved place', exact: true });
    await undo.focus();
    await page.keyboard.press('Enter');
    const load = places(page).getByRole('button', { name: 'Load saved place School yard', exact: true });
    await expect(load).toBeVisible();
    const restored = await page.evaluate(() => (window as any).WeatherSystemsKernel.immersiveSessionDownloadPayload((window as any).__toolData.weatherSystems).weatherSystems.savedLivePlaces);
    expect(restored).toHaveLength(2);
    expect(restored).toEqual(expect.arrayContaining(original));
    const width = await page.evaluate(() => ({ viewport: innerWidth, actual: document.documentElement.scrollWidth }));
    expect(width.actual).toBeLessThanOrEqual(width.viewport + 1);
    await places(page).screenshot({ path: info.outputPath('weather-saved-places-phone-dark.png') });
    await load.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    expect((await requests(page))[0].url).toContain('latitude=40');
  });
});
