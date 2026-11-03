import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const DATE = '2026-10-29';
const TARGET = `${DATE}T14:00:00.000Z`;
const targetTimestamp = Date.parse(TARGET);
const firstSite = { label: 'Main synthetic school', latitude: 40, longitude: -75 };
const savedSite = { label: 'Saved river school', latitude: 41.25, longitude: -74.5 };
const newerSite = { latitude: 42.5, longitude: -73.25 };
const measurements = {
  temperature: 24, humidity: 70, precipitation: 1.2, pressure: 1007,
  windSpeed: 24, windDir: 220, weatherCode: 95, condition: 'Thunderstorms',
  cloudCover: 80, visibility: 10000, pressureType: 'surface',
};
const originalLive = {
  ...firstSite, ...measurements, observedAt: `${DATE}T12:00:00Z`, validAt: `${DATE}T12:00:00Z`,
  retrievedAt: `${DATE}T12:01:00Z`, source: 'Open-Meteo', sourceKind: 'model',
  sourceUrl: 'https://open-meteo.com/', timezone: 'UTC', utcOffsetSeconds: 0,
  precipitationIntervalSeconds: 900,
};
const originalTimeline = [12, 13, 14].map((hour, index) => ({
  ...measurements, time: `${DATE}T${hour}:00`, role: index ? 'forecast' : 'current',
  offsetHours: index, utcOffsetSeconds: 0, precipitationIntervalSeconds: index ? 3600 : 900,
}));
function snapshot(site: typeof firstSite, id: string, minute: string) {
  return {
    schema: 'weather-live-checkpoint-v2', id, location: site.label,
    latitude: site.latitude, longitude: site.longitude, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: `${DATE}T12:${minute}:00.000Z`, capturedAt: `${DATE}T12:06:00.000Z`,
    currentDataAt: `${DATE}T12:00:00.000Z`, validAt: TARGET, validTimestamp: targetTimestamp,
    timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    predicted: {
      temperature: 24, humidity: 70, precipitation: 1.2, pressure: 1007,
      windSpeed: 24, windDir: 220, weatherCode: 95, condition: 'Thunderstorms', cloudCover: 80,
    },
    learnerReasoning: `Original ${id} explanation.\n"Keep this quotation."`,
    timelineEvidence: `Original ${id} evidence.`,
    classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
      temperatureC: (67 - 32) * 5 / 9, measuredAt: TARGET,
      recordedAt: `${DATE}T14:05:00.000Z`, sameSite: true,
    },
  };
}
const journal = [snapshot(firstSite, 'main-forecast', '01'), snapshot(savedSite, 'river-forecast', '02')];
const openName = `Open checkpoint hour, saved forecast 1 of 2 for ${savedSite.label}, valid ${DATE} 14:00 UTC, original retrieval ${DATE} 12:02 UTC`;
const openingNotice = 'Loading the saved forecast location for comparison.';
const replacedNotice = 'Saved forecast opening was replaced by a newer location request. Saved forecasts were kept.';
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
const studio = (page: Page) => page.locator('[data-weather-forecast-verification-studio]');
const connection = (page: Page) => page.locator('[data-weather-live-connection]:visible');

async function mount(page: Page) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date(`${DATE}T15:06:00Z`));
  await harness.mount(page, { _threeLoaded: false, weatherSystems: {
    tab: 'forecast', liveWeather: originalLive, liveWeatherTimeline: originalTimeline,
    liveWeatherTimelineIndex: 1, liveForecastCheckpoints: journal,
    immersiveStageMode: false, immersiveSceneMode: 'conceptual', immersiveDataSource: 'live',
    immersiveAudienceMode: 'teacher',
  } }, undefined, { expectCanvas: false });
  await expect(studio(page)).toBeVisible();
  await page.evaluate(() => {
    const w = window as any, React = w.React;
    const data = w.__toolData, ctx = { ...w.__ctx }, cfg = w.StemLab._registry.weatherSystems;
    w.__root.unmount();
    localStorage.removeItem('weather-systems-immersive-workspace-v1');
    w.__openingRequests = [];
    w.__openingMounts = [];
    w.__openingQueuedSetters = [];
    w.__queueOpeningSetters = false;
    const realFetch = w.fetch;
    // Cancellation must be enforced by the application even when transport ignores it.
    w.fetch = (url: unknown, options: any = {}) => {
      if (!/^https:\/\/(?:api|geocoding-api)\.open-meteo\.com\//.test(String(url))) return realFetch(url, options);
      return new Promise((resolve, reject) => w.__openingRequests.push({ url: String(url), signal: options.signal, resolve, reject }));
    };
    let bump: (() => void) | undefined;
    const apply = (value: any) => {
      if (w.__queueOpeningSetters && typeof value === 'function') {
        w.__openingQueuedSetters.push(value);
        return;
      }
      const next = typeof value === 'function' ? value(data) : value;
      if (next && next !== data) Object.assign(data, next);
      if (bump) bump();
    };
    ctx.toolData = ctx.labToolData = data;
    ctx.setToolData = ctx.setLabToolData = apply;
    ctx.update = (bucket: string, key: string, value: unknown) => apply({ ...data, [bucket]: { ...data[bucket], [key]: value } });
    ctx.updateMulti = (bucket: string, patch: Record<string, unknown>) => apply({ ...data, [bucket]: { ...data[bucket], ...patch } });
    w.__ctx = ctx;
    w.__flushOpeningSetters = () => {
      const queued = w.__openingQueuedSetters.splice(0);
      w.__queueOpeningSetters = false;
      w.ReactDOM.flushSync(() => queued.forEach(apply));
      return queued.length;
    };
    // The real STEM bridge uses this tab-dependent key. Rendering without it hides the bug.
    const modeKey = () => {
      const d = data.weatherSystems || {};
      return 'plugin-' + ['weatherSystems', ctx.stemLabTab || '',
        d.subtool || d.tab || d.mode || d.activeTab || d.activeSubtool || ''].join(':');
    };
    function Weather({ mountKey }: { mountKey: string }) {
      const result = cfg.render(ctx);
      React.useEffect(() => { w.__openingMounts.push(mountKey); }, []);
      return result;
    }
    function Host() {
      const [, setTick] = React.useState(0);
      bump = () => setTick((tick: number) => tick + 1);
      const key = modeKey();
      return React.createElement(Weather, { key, mountKey: key });
    }
    w.__rerender = () => { if (bump) bump(); };
    w.__root = w.ReactDOM.createRoot(document.getElementById('wrap'));
    w.ReactDOM.flushSync(() => w.__root.render(React.createElement(Host)));
  });
  await page.waitForFunction(() => (window as any).__openingMounts.length === 1);
  await expect(connection(page)).toBeVisible();
}
async function state(page: Page) {
  return page.evaluate(() => {
    const w = window as any, d = w.__toolData.weatherSystems;
    return JSON.parse(JSON.stringify({
      live: d.liveWeather, timeline: d.liveWeatherTimeline, index: d.liveWeatherTimelineIndex,
      journal: d.liveForecastCheckpoints, tab: d.tab, scene: d.immersiveSceneMode,
      source: d.immersiveDataSource, loading: d.liveWeatherLoading === true,
      error: d.liveWeatherError || '', reviewStatus: d.liveReviewStatus || '',
      selectedAt: d.liveTimelineSelectedAt, metric: d.liveTimelineMetric,
      mounts: w.__openingMounts,
    }));
  });
}
async function requests(page: Page) {
  return page.evaluate(() => (window as any).__openingRequests.map((request: any) => ({ url: request.url, aborted: request.signal?.aborted === true })));
}
async function settle(page: Page, index: number, body = provider(), status = 200) {
  await page.evaluate(async ({ index, body, status }) => {
    const request = (window as any).__openingRequests[index];
    request.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
    for (let index = 0; index < 10; index++) await Promise.resolve();
  }, { index, body, status });
}
async function openSaved(page: Page) {
  const open = studio(page).getByRole('button', { name: openName, exact: true });
  await open.focus();
  await expect(open).toBeFocused();
  await page.keyboard.press('Enter');
}
async function expectRequest(page: Page, index: number, site = savedSite) {
  await expect.poll(() => requests(page).then(items => items.length)).toBe(index + 1);
  const request = (await requests(page))[index], url = new URL(request.url);
  expect(url.hostname).toBe('api.open-meteo.com');
  expect(Number(url.searchParams.get('latitude'))).toBe(site.latitude);
  expect(Number(url.searchParams.get('longitude'))).toBe(site.longitude);
  expect(request.aborted).toBe(false);
}
async function searchCoordinates(page: Page, site: { latitude: number; longitude: number }) {
  await connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true }).fill(`${site.latitude}, ${site.longitude}`);
  await connection(page).getByRole('button', { name: 'Search', exact: true }).click();
}
function preservedWeather(value: Awaited<ReturnType<typeof state>>) {
  return { live: value.live, timeline: value.timeline, index: value.index, journal: value.journal };
}
async function expectJournal(page: Page) {
  expect((await state(page)).journal).toEqual(journal);
  const saved = await page.evaluate(() => {
    const w = window as any;
    return w.WeatherSystemsKernel.immersiveSessionDownloadPayload(w.__toolData.weatherSystems).weatherSystems.liveForecastCheckpoints;
  });
  expect(saved).toEqual(journal);
  expect(saved[1].classroomReading).toEqual(journal[1].classroomReading);
}
async function expectOpened(page: Page, temperature = 18) {
  await expect.poll(async () => {
    const d = await state(page);
    return { tab: d.tab, scene: d.scene, source: d.source, loading: d.loading, index: d.index,
      time: d.timeline[d.index]?.time, latitude: d.live?.latitude, longitude: d.live?.longitude, temperature: d.live?.temperature };
  }).toEqual({ tab: 'immersive', scene: 'geographic', source: 'live', loading: false, index: 2,
    time: `${DATE}T14:00`, latitude: savedSite.latitude, longitude: savedSite.longitude, temperature });
  await page.waitForFunction(() => (window as any).__openingMounts.includes('plugin-weatherSystems:explore:immersive'));
  const d = await state(page);
  expect(d.live.label).toBe(savedSite.label);
  expect(d.reviewStatus).toBe('Opened the checkpoint weather hour at its saved location in geographic 3D.');
  expect(d.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
  await expect(page.getByRole('tab', { name: /Immersive 3D/ })).toHaveAttribute('aria-selected', 'true');
  await expectJournal(page);
}

test.describe('Weather saved checkpoint opening across locations', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('loads the different saved site and exact hour across the real tab remount without changing the 67°F journal', async ({ page }) => {
    await mount(page);
    const before = await state(page);
    await openSaved(page);
    await expectRequest(page, 0);
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));
    await settle(page, 0);
    await expectOpened(page);
    expect(await requests(page)).toHaveLength(1);
  });

  test('a failed saved-site request retries its original coordinates and hour after an unsent query edit', async ({ page }) => {
    await mount(page);
    const before = await state(page);
    await openSaved(page);
    await expectRequest(page, 0);
    await settle(page, 0, provider(), 503);
    await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
    await expect(connection(page).getByRole('alert')).toContainText(/503|service|available/i);
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));
    expect((await state(page)).tab).toBe('forecast');
    expect((await state(page)).reviewStatus).toBe('The saved forecast location could not be loaded. Retry to open its hour. Saved forecasts were kept.');
    await connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true }).fill('Unsubmitted different place');
    await connection(page).getByRole('button', { name: 'Retry weather request', exact: true }).click();
    await expectRequest(page, 1);
    expect((await state(page)).reviewStatus).toBe(openingNotice);
    await expect(studio(page)).toContainText(openingNotice);
    expect((await requests(page))[1].url).toBe((await requests(page))[0].url);
    await settle(page, 1, provider(19));
    await expectOpened(page, 19);
    expect((await state(page)).error).toBe('');
  });

  test('canceling a saved-site Open keeps loaded weather and ignores a transport success that arrives afterward', async ({ page }) => {
    await mount(page);
    const before = await state(page);
    await openSaved(page);
    await expectRequest(page, 0);
    const cancel = connection(page).getByRole('button', { name: 'Cancel weather request', exact: true });
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
    expect((await requests(page))[0].aborted).toBe(true);
    const canceled = await state(page);
    expect(preservedWeather(canceled)).toEqual(preservedWeather(before));
    expect(canceled.tab).toBe('forecast');
    expect(canceled.reviewStatus).toBe('Opening the saved forecast location was canceled. Loaded weather and saved forecasts were kept.');
    await settle(page, 0, provider(-7));
    expect(await state(page)).toEqual(canceled);
    await expectJournal(page);
    await expect(connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true })).toBeFocused();
  });

  test('a newer coordinate request wins over both a late old Open response and a queued accepted Open result', async ({ page }) => {
    await mount(page);
    await openSaved(page);
    await expectRequest(page, 0);
    await searchCoordinates(page, newerSite);
    await expectRequest(page, 1, { ...savedSite, ...newerSite });
    expect((await state(page)).reviewStatus).toBe(replacedNotice);
    await expect(studio(page)).toContainText(replacedNotice);
    await expect(studio(page)).not.toContainText(openingNotice);
    expect((await requests(page))[0].aborted).toBe(true);
    await settle(page, 1, provider(21));
    await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
    const winner = await state(page);
    expect(winner.live).toMatchObject({ ...newerSite, temperature: 21 });
    expect(winner.index).toBe(0);
    expect(winner.tab).toBe('forecast');
    expect(winner.reviewStatus).toBe(replacedNotice);
    await settle(page, 0, provider(-9));
    expect(await state(page)).toEqual(winner);

    await openSaved(page);
    await expectRequest(page, 2);
    // Queue the genuine accepted-result updater without evaluating it. A later
    // request can begin before React commits that earlier functional update.
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await settle(page, 2, provider(5));
    expect(await page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    await searchCoordinates(page, firstSite);
    await expectRequest(page, 3, firstSite);
    expect((await state(page)).reviewStatus).toBe(replacedNotice);
    await expect(studio(page)).toContainText(replacedNotice);
    await expect(studio(page)).not.toContainText(openingNotice);
    expect(await page.evaluate(() => (window as any).__flushOpeningSetters())).toBe(1);
    expect((await state(page)).tab).toBe('forecast');
    expect((await state(page)).live).toEqual(winner.live);
    expect((await state(page)).reviewStatus).toBe(replacedNotice);
    expect((await requests(page))[3].aborted).toBe(false);
    await settle(page, 3, provider(17));
    await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
    const final = await state(page);
    expect(final.live).toMatchObject({ latitude: firstSite.latitude, longitude: firstSite.longitude, temperature: 17 });
    expect(final.index).toBe(0);
    expect(final.tab).toBe('forecast');
    expect(final.error).toBe('');
    expect(final.reviewStatus).toBe(replacedNotice);
    await expect(studio(page)).toContainText(replacedNotice);
    await expect(studio(page)).not.toContainText(openingNotice);
    expect(final.mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
    expect(await requests(page)).toHaveLength(4);
    await expectJournal(page);
  });

  test('a saved hour available only as partial data opens the exact Forecast explorer hour at the saved site', async ({ page }) => {
    await mount(page);
    await openSaved(page);
    await expectRequest(page, 0);
    const response = provider(18);
    Object.assign(response.hourly, { temperature_2m: [18, 8, 5], surface_pressure: [1009, 1008, null] });
    await settle(page, 0, response);
    await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
    const result = await state(page);
    expect(result.live).toMatchObject({ latitude: savedSite.latitude, longitude: savedSite.longitude, label: savedSite.label });
    expect(result.live.partialHours).toMatchObject([{ time: `${DATE}T14:00`, temperature: 5, pressure: null }]);
    expect(result.timeline.map((point: any) => point.time)).not.toContain(`${DATE}T14:00`);
    expect(result.tab).toBe('forecast');
    expect(result.selectedAt).toBe(targetTimestamp);
    expect(result.metric).toBe('temperature');
    expect(result.mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
    const detail = page.locator('[data-weather-live-timeline-explorer] [data-weather-live-timeline-detail]');
    await expect(detail).toContainText(`${DATE}T14:00`);
    await expect(detail).toContainText('5.0°C');
    await expectJournal(page);
    expect(await requests(page)).toHaveLength(1);
  });

  test('a missing saved hour loads the correct site at its actual current hour and explains the unavailable target', async ({ page }) => {
    await mount(page);
    await openSaved(page);
    await expectRequest(page, 0);
    const response = provider(18);
    Object.assign(response.hourly, Object.fromEntries(Object.entries(response.hourly)
      .map(([key, values]) => [key, Array.isArray(values) ? values.slice(0, 2) : values])));
    await settle(page, 0, response);
    await expect.poll(() => state(page).then(d => ({ tab: d.tab, loading: d.loading })))
      .toEqual({ tab: 'immersive', loading: false });
    await page.waitForFunction(() => (window as any).__openingMounts.includes('plugin-weatherSystems:explore:immersive'));
    const result = await state(page);
    expect(result.live).toMatchObject({ latitude: savedSite.latitude, longitude: savedSite.longitude, label: savedSite.label });
    expect(result.scene).toBe('geographic');
    expect(result.source).toBe('live');
    expect(result.index).toBe(0);
    expect(result.timeline[result.index].time).toBe(`${DATE}T12:00`);
    expect(result.timeline.map((point: any) => point.time)).not.toContain(`${DATE}T14:00`);
    expect(result.live.partialHours).toEqual([]);
    expect(result.reviewStatus).toBe('Opened the saved forecast location in geographic 3D. The saved hour is not available in the loaded timeline.');
    await expectJournal(page);
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect(studio(page)).toContainText('The saved hour is not available in the loaded timeline.');
    expect((await state(page)).index).toBe(0);
    await expectJournal(page);
    expect(await requests(page)).toHaveLength(1);
  });

  test('a newer current-site partial Open disowns pending and queued foreign results without changing the loaded model', async ({ page }) => {
    await mount(page);
    const partialResponse = provider(18);
    Object.assign(partialResponse.hourly, { temperature_2m: [18, 8, 5], surface_pressure: [1009, 1008, null] });
    await page.evaluate(({ payload, site }) => {
      const w = window as any, kernel = w.WeatherSystemsKernel;
      const live = kernel.normalizeLiveWeatherResponse(payload, site.label, site.latitude, site.longitude);
      live.retrievedAt = new Date().toISOString();
      const evidence = kernel.normalizeHourlyWeatherTimeline(payload, live, { includePartial: true });
      live.partialHours = evidence.filter((point: any) => point.partial);
      const timeline = evidence.filter((point: any) => !point.partial);
      // Only fixture seeding uses a direct setter; all selections below are real named buttons.
      w.ReactDOM.flushSync(() => w.__ctx.setToolData((previous: any) => ({
        ...previous, weatherSystems: { ...previous.weatherSystems,
          liveWeather: live, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 1 },
      })));
    }, { payload: partialResponse, site: firstSite });
    const before = await state(page);
    expect(before.timeline.map((point: any) => point.time)).toEqual([`${DATE}T12:00`, `${DATE}T13:00`]);
    expect(before.live.partialHours).toMatchObject([{ time: `${DATE}T14:00`, temperature: 5, pressure: null }]);
    expect(before.index).toBe(1);
    const currentOpenName = `Open checkpoint hour, saved forecast 2 of 2 for ${firstSite.label}, valid ${DATE} 14:00 UTC, original retrieval ${DATE} 12:01 UTC`;
    const partialNotice = 'Opened the saved hour in the Live Timeline Explorer. Partial measurements are available for review.';
    const selectCurrentPartial = async () => {
      const open = studio(page).getByRole('button', { name: currentOpenName, exact: true });
      await open.focus();
      await expect(open).toBeFocused();
      await page.keyboard.press('Enter');
      await expect.poll(() => state(page).then(d => d.loading)).toBe(false);
      const selected = await state(page);
      expect(preservedWeather(selected)).toEqual(preservedWeather(before));
      expect(selected.tab).toBe('forecast');
      expect(selected.selectedAt).toBe(targetTimestamp);
      expect(selected.metric).toBe('temperature');
      expect(selected.reviewStatus).toBe(partialNotice);
      expect(selected.error).toBe('');
      expect(selected.mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
      await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toHaveCount(0);
      await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
      const detail = page.locator('[data-weather-live-timeline-explorer] [data-weather-live-timeline-detail]');
      await expect(detail).toContainText(`${DATE}T14:00`);
      await expect(detail).toContainText('5.0°C');
      await expectJournal(page);
      return selected;
    };

    // An active cross-site Open must stop even though this newer selection stays in Forecast.
    await openSaved(page);
    await expectRequest(page, 0);
    const pendingWinner = await selectCurrentPartial();
    expect((await requests(page))[0].aborted).toBe(true);
    await settle(page, 0, provider(-9));
    expect(await state(page)).toEqual(pendingWinner);
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));

    // A completed Open may already have queued its actual state updater. Disown
    // that completion before it can replace the newer current-site partial view.
    await openSaved(page);
    await expectRequest(page, 1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await settle(page, 1, provider(6));
    expect(await page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    const queuedOpenWinner = await selectCurrentPartial();
    expect(await page.evaluate(() => (window as any).__flushOpeningSetters())).toBe(1);
    expect(await state(page)).toEqual(queuedOpenWinner);
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));

    // The same guarantee applies to an accepted ordinary coordinate request;
    // guarding only Open completions would still overwrite this partial selection.
    await searchCoordinates(page, newerSite);
    await expectRequest(page, 2, { ...savedSite, ...newerSite });
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await settle(page, 2, provider(22));
    expect(await page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    const queuedOrdinaryWinner = await selectCurrentPartial();
    expect(await page.evaluate(() => (window as any).__flushOpeningSetters())).toBe(1);
    expect(await state(page)).toEqual(queuedOrdinaryWinner);
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));
    expect(await requests(page)).toHaveLength(3);
    await expectJournal(page);
  });
});
