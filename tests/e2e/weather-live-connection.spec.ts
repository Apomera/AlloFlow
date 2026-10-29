import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const DATE = '2026-10-29';
const location = { label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568 };
const measurements = {
  temperature: 24, humidity: 70, precipitation: 1.2, pressure: 1007,
  windSpeed: 24, windDir: 220, weatherCode: 95, condition: 'Thunderstorms',
  cloudCover: 80, visibility: 10000, pressureType: 'surface',
};
const originalLive = {
  ...location, ...measurements, observedAt: `${DATE}T12:00:00Z`, validAt: `${DATE}T12:00:00Z`,
  retrievedAt: `${DATE}T12:01:00Z`, source: 'Open-Meteo', sourceKind: 'model',
  sourceUrl: 'https://open-meteo.com/', timezone: 'UTC', utcOffsetSeconds: 0,
  precipitationIntervalSeconds: 900,
};
const originalTimeline = [
  { ...measurements, time: `${DATE}T12:00:00Z`, role: 'current', offsetHours: 0, utcOffsetSeconds: 0, precipitationIntervalSeconds: 900 },
  { ...measurements, time: `${DATE}T14:00:00Z`, role: 'forecast', offsetHours: 2, utcOffsetSeconds: 0, precipitationIntervalSeconds: 3600 },
];
const originalSnapshot = {
  schema: 'weather-live-checkpoint-v2', id: 'preserved-snapshot', ...location, location: location.label,
  source: 'Open-Meteo', sourceKind: 'model', capturedAt: `${DATE}T12:02:00Z`,
  retrievedAt: `${DATE}T12:01:00Z`, currentDataAt: `${DATE}T12:00:00Z`,
  validAt: `${DATE}T14:00:00Z`, validTimestamp: Date.parse(`${DATE}T14:00:00Z`),
  timezone: 'UTC', utcOffsetSeconds: 0, predicted: measurements,
  pressureType: 'surface', precipitationIntervalSeconds: 3600,
};

function provider(temperature = 18) {
  const values = {
    temperature_2m: temperature, relative_humidity_2m: 68, precipitation: 0.7,
    surface_pressure: 1009, wind_speed_10m: 18, wind_direction_10m: 200,
    weather_code: 61, cloud_cover: 75, visibility: 12000,
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

function connection(page: Page) { return page.locator('[data-weather-live-connection="forecast"]'); }

async function mount(page: Page, saved = true) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date(`${DATE}T12:05:00Z`));
  await harness.mount(page, {
    weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', simHour: 0,
      ...(saved ? {
        liveWeather: originalLive, liveWeatherTimeline: originalTimeline,
        liveWeatherTimelineIndex: 1, liveForecastCheckpoints: [originalSnapshot],
      } : {}),
    },
  }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  await page.evaluate(() => {
    const w = window as any;
    w.__connectionRequests = [];
    const realFetch = w.fetch;
    // Deliberately ignore AbortSignal: late provider successes/errors must be
    // harmless even if the transport does not support cancellation.
    w.fetch = (url: unknown, options: any = {}) => {
      const address = String(url);
      if (!/^https:\/\/(?:api|geocoding-api)\.open-meteo\.com\//.test(address)) return realFetch(url, options);
      return new Promise((resolve, reject) => {
        w.__connectionRequests.push({ url: address, signal: options.signal, resolve, reject });
      });
    };
    w.__geoCallbacks = [];
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (success: Function, failure: Function) => w.__geoCallbacks.push({ success, failure }) },
    });
  });
  if (!await connection(page).isVisible()) {
    await page.getByRole('button', { name: 'Review live forecasts', exact: true }).click();
  }
  await expect(connection(page)).toBeVisible();
}

async function requests(page: Page) {
  return page.evaluate(() => (window as any).__connectionRequests.map((request: any) => ({ url: request.url, aborted: request.signal?.aborted === true })));
}

async function settle(page: Page, index: number, body = provider(), status = 200) {
  await page.evaluate(async ({ index, body, status }) => {
    const request = (window as any).__connectionRequests[index];
    request.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  }, { index, body, status });
}

async function reject(page: Page, index: number, message: string) {
  await page.evaluate(async ({ index, message }) => {
    (window as any).__connectionRequests[index].reject(new Error(message));
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  }, { index, message });
}

async function search(page: Page, value: string) {
  await connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true }).fill(value);
  await connection(page).getByRole('button', { name: 'Search', exact: true }).click();
}

async function preservedData(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.weatherSystems;
    return { live: d.liveWeather, timeline: d.liveWeatherTimeline, index: d.liveWeatherTimelineIndex, snapshots: d.liveForecastCheckpoints };
  });
}

async function loading(page: Page) {
  return page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherLoading === true);
}

test.describe('Weather Systems — resilient live connections', () => {
  test.describe.configure({ mode: 'default', retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1280, height: 1000 }); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('lets a newer coordinate request win even when the old response arrives last', async ({ page }) => {
    await mount(page);
    await search(page, '40, -75');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await search(page, '41, -74');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(2);
    expect((await requests(page))[0].aborted).toBe(true);
    await settle(page, 1, provider(21));
    await expect.poll(() => loading(page)).toBe(false);
    expect((await preservedData(page)).live).toMatchObject({ latitude: 41, longitude: -74, temperature: 21 });
    const winner = await preservedData(page);
    await settle(page, 0, provider(-7));
    expect(await preservedData(page)).toEqual(winner);
    expect(winner.snapshots).toEqual([originalSnapshot]);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherError)).toBe('');
  });

  test('ignores stale errors while a newer request remains active', async ({ page }) => {
    await mount(page);
    await search(page, '40, -75');
    await search(page, '41, -74');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(2);
    await reject(page, 0, 'Old request failed after it was replaced');
    expect(await loading(page)).toBe(true);
    await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherError)).toBe('');
    await settle(page, 1, provider(21));
    await expect.poll(() => loading(page)).toBe(false);
    expect((await preservedData(page)).live.temperature).toBe(21);
  });

  test('cancels an in-flight refresh while preserving the selected hour and saved snapshots', async ({ page }) => {
    await mount(page);
    const before = await preservedData(page);
    await page.getByRole('button', { name: 'Refresh loaded weather', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    const cancel = connection(page).getByRole('button', { name: 'Cancel weather request', exact: true });
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => loading(page)).toBe(false);
    await expect(connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true })).toBeFocused();
    expect((await requests(page))[0].aborted).toBe(true);
    await expect(connection(page)).toContainText(/cancel/i);
    expect(await preservedData(page)).toEqual(before);
    await settle(page, 0, provider(9));
    expect(await preservedData(page)).toEqual(before);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherError)).toBe('');
  });

  test('preserves data after a failed refresh and retries the original request', async ({ page }) => {
    await mount(page);
    const before = await preservedData(page);
    await page.getByRole('button', { name: 'Refresh loaded weather', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await settle(page, 0, provider(), 503);
    await expect.poll(() => loading(page)).toBe(false);
    await expect(connection(page).getByRole('alert')).toContainText(/503|service|unavailable/i);
    expect(await preservedData(page)).toEqual(before);
    // Editing an unsent query must not silently change the meaning of Retry.
    await connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true }).fill('Different place');
    await connection(page).getByRole('button', { name: 'Retry weather request', exact: true }).click();
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(2);
    expect((await requests(page))[1].url).toBe((await requests(page))[0].url);
    await settle(page, 1, provider(19));
    await expect.poll(() => loading(page)).toBe(false);
    expect((await preservedData(page)).live).toMatchObject({ ...location, temperature: 19 });
    expect((await preservedData(page)).snapshots).toEqual(before.snapshots);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherError)).toBe('');
  });

  test('ignores an old geolocation callback after the user searches elsewhere', async ({ page }) => {
    await mount(page);
    await connection(page).getByRole('button', { name: /Use my location/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__geoCallbacks.length)).toBe(1);
    await search(page, '41, -74');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await page.evaluate(() => {
      const callbacks = (window as any).__geoCallbacks[0];
      callbacks.success({ coords: { latitude: 38, longitude: -122 } });
      callbacks.failure({ code: 1 });
    });
    expect(await requests(page)).toHaveLength(1);
    expect(await loading(page)).toBe(true);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherError)).toBe('');
    await settle(page, 0, provider(20));
    await expect.poll(() => loading(page)).toBe(false);
    expect((await preservedData(page)).live).toMatchObject({ latitude: 41, longitude: -74, temperature: 20 });
  });

  test('cancels a geocoder chain before it can trigger a weather request', async ({ page }) => {
    await mount(page);
    const before = await preservedData(page);
    await search(page, 'Seattle, Washington');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    expect((await requests(page))[0].url).toContain('geocoding-api');
    await connection(page).getByRole('button', { name: 'Cancel weather request', exact: true }).click();
    await settle(page, 0, { results: [{ name: 'Seattle', admin1: 'Washington', country: 'United States', latitude: 47.6062, longitude: -122.3321 }] } as any);
    expect(await requests(page)).toHaveLength(1);
    expect(await loading(page)).toBe(false);
    expect(await preservedData(page)).toEqual(before);
  });

  test('times out a hanging request and offers a recovery without discarding data', async ({ page }) => {
    await mount(page);
    await page.clock.install({ time: new Date(`${DATE}T12:05:00Z`) });
    const before = await preservedData(page);
    await search(page, '40, -75');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await page.clock.fastForward(31000);
    await expect.poll(() => loading(page)).toBe(false);
    await expect(connection(page).getByRole('alert')).toContainText(/timed out|too long/i);
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toBeVisible();
    expect(await preservedData(page)).toEqual(before);
    expect((await requests(page))[0].aborted).toBe(true);
    await settle(page, 0, provider(4));
    expect(await preservedData(page)).toEqual(before);
  });

  test('disposes an active request when the weather tool unmounts', async ({ page }) => {
    await mount(page);
    const before = await preservedData(page);
    await search(page, '40, -75');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await page.evaluate(() => (window as any).__unmount());
    expect((await requests(page))[0].aborted).toBe(true);
    await settle(page, 0, provider(4));
    expect(await preservedData(page)).toEqual(before);
  });

  test('cancels an older request only after a valid session import is accepted', async ({ page }) => {
    await mount(page);
    // The import lives in the teacher rail. Keep this lifecycle regression on
    // its map fallback so software-rendered 3D cannot consume the request timer.
    await page.evaluate(() => {
      (window as any).__toolData.weatherSystems.immersiveSceneMode = 'geographic';
      (window as any).__toolData._threeLoaded = false;
      (window as any).__rerender();
    });
    await search(page, '40, -75');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await page.getByRole('tab', { name: /Immersive 3D/ }).click();
    await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
    const input = page.locator('#weather-immersive-session-import');
    await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"unrelated"}') });
    await expect(page.locator('[data-weather-session-status]')).toContainText('not a supported');
    expect(await loading(page)).toBe(true);
    expect((await requests(page))[0].aborted).toBe(false);

    const importedLive = { ...originalLive, label: 'Imported Toronto', latitude: 43.6532, longitude: -79.3832, temperature: 6 };
    const importedTimeline = originalTimeline.map((point) => ({ ...point, temperature: 6 }));
    const payload = {
      schema: 'weather-immersive-session-v1', scenario: 'coldFront',
      weatherSystems: {
        liveWeather: importedLive, liveWeatherTimeline: importedTimeline, liveWeatherTimelineIndex: 1,
        liveForecastCheckpoints: [], immersiveDataSource: 'model', immersiveSceneMode: 'conceptual',
      },
    };
    await input.setInputFiles({ name: 'weather-session.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    expect(await loading(page)).toBe(false);
    expect((await requests(page))[0].aborted).toBe(true);
    const imported = await preservedData(page);
    expect(imported).toEqual({ live: importedLive, timeline: importedTimeline, index: 1, snapshots: [] });
    await settle(page, 0, provider(-8));
    expect(await preservedData(page)).toEqual(imported);
    await expect(page.getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
  });

  test('retains evidence edited during loading while invalidating obsolete terrain evidence', async ({ page }) => {
    await mount(page);
    await page.evaluate(() => {
      const d = (window as any).__toolData.weatherSystems;
      d.evidence = ['pressure', 'terrainProfile'];
      d.geographicTerrainEvidence = { location: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568, validAt: '2026-10-29T12:00:00Z' };
      (window as any).__rerender();
    });
    await search(page, '40, -75');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await page.evaluate(() => {
      (window as any).__toolData.weatherSystems.evidence = ['pressure', 'terrainProfile', 'wind'];
      (window as any).__rerender();
    });
    await settle(page, 0, provider(18));
    await expect.poll(() => loading(page)).toBe(false);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.evidence)).toEqual(['pressure', 'wind']);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.geographicTerrainEvidence)).toBeNull();
  });

  test('loads first weather with the keyboard in Forecast Mission and fits a dark phone viewport', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mount(page, false);
    await page.evaluate(() => {
      (window as any).__ctx.isDark = true;
      document.documentElement.classList.add('dark');
      (window as any).__rerender();
    });
    const input = connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true });
    await input.fill('43.6591, -70.2568');
    await input.press('Enter');
    await expect.poll(() => requests(page).then((items) => items.length)).toBe(1);
    await expect(connection(page)).toHaveAttribute('aria-busy', 'true');
    await settle(page, 0, provider(18));
    await expect.poll(() => loading(page)).toBe(false);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.tab)).toBe('forecast');
    await expect(page.getByRole('button', { name: 'Save live forecast snapshot', exact: true })).toBeEnabled();
    await expect(connection(page)).toHaveAttribute('aria-busy', 'false');
    const size = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(size.width).toBeLessThanOrEqual(size.viewport + 1);
    await connection(page).screenshot({ path: info.outputPath('weather-live-connection-phone-dark.png') });
    await expect(connection(page)).not.toContainText(/NaN|Infinity|undefined/);
  });
});
