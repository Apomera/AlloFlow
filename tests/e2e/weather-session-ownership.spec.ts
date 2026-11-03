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

// Only the public FileReader boundary is controlled. Each selection still goes
// through the real input's change handler, parser, validator and state updater.
async function controlSessionReads(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__sessionReaders = [];
    w.FileReader = class ControlledFileReader {
      result: string | null = null;
      error: Error | null = null;
      readyState = 0;
      onload: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onabort: ((event: unknown) => void) | null = null;
      aborted = false;
      load: ((event: unknown) => void) | null = null;
      fail: ((event: unknown) => void) | null = null;
      blob: Blob | null = null;
      constructor() { w.__sessionReaders.push(this); }
      readAsText(blob: Blob) {
        this.blob = blob;
        this.readyState = 1;
        this.load = this.onload;
        this.fail = this.onerror;
      }
      abort() {
        this.aborted = true;
        this.readyState = 2;
        // Deliberately retain callbacks: ownership must protect stale delivery
        // even if a transport has already scheduled its event before abort.
      }
    };
  });
}
async function sessionDesk(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__toolData.weatherSystems.immersiveSceneMode = 'geographic';
    w.__rerender();
  });
  await page.getByRole('tab', { name: /Immersive 3D/ }).click();
  await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
  await expect(page.getByLabel('Import session JSON', { exact: true })).toBeAttached();
  await expect(connection(page)).toBeVisible();
  await page.waitForFunction(() => (window as any).__openingMounts.length === 2);
}
function sessionPayload(label: string, temperature: number) {
  return {
    schema: 'weather-immersive-session-v1',
    weatherSystems: {
      liveWeather: { ...originalLive, label, latitude: 44, longitude: -72, temperature },
      liveWeatherTimeline: originalTimeline.map(point => ({ ...point, temperature })),
      liveWeatherTimelineIndex: 2, liveForecastCheckpoints: journal,
      immersiveSceneMode: 'geographic', immersiveDataSource: 'live',
      immersiveReflection: `Imported ${label} reflection.\n"Preserve this quotation."`,
      observationNote: `Imported ${label} notebook evidence.`,
    },
  };
}
async function chooseFile(page: Page, name: string, contents: unknown) {
  const before = await page.evaluate(() => (window as any).__sessionReaders.length);
  const text = typeof contents === 'string' ? contents : JSON.stringify(contents);
  await page.getByLabel('Import session JSON', { exact: true }).setInputFiles({
    name, mimeType: 'application/json', buffer: Buffer.from(text),
  });
  await expect.poll(() => page.evaluate(() => (window as any).__sessionReaders.length)).toBe(before + 1);
  // Verify the handler read the chosen File's bytes rather than a synthetic payload.
  expect(await page.evaluate(async (index) => (window as any).__sessionReaders[index].blob.text(), before)).toBe(text);
  return before;
}
async function finishFile(page: Page, index: number, contents?: unknown, fail = false) {
  await page.evaluate(async ({ index, text, fail }) => {
    const reader = (window as any).__sessionReaders[index];
    reader.readyState = 2;
    if (fail) {
      reader.error = new Error('Synthetic file read failed.');
      if (reader.fail) reader.fail.call(reader, { target: reader });
    } else {
      reader.result = text === null ? await reader.blob.text() : text;
      if (reader.load) reader.load.call(reader, { target: reader });
    }
    for (let turn = 0; turn < 10; turn++) await Promise.resolve();
  }, { index, text: contents === undefined ? null : typeof contents === 'string' ? contents : JSON.stringify(contents), fail });
}
async function sessionState(page: Page) {
  const current = await state(page);
  const extra = await page.evaluate(() => {
    const w = window as any, d = w.__toolData.weatherSystems;
    return JSON.parse(JSON.stringify({
      reflection: d.immersiveReflection || '', observationNote: d.observationNote || '',
      sessionStatus: d.immersiveSessionStatus || '', weatherStatus: d.liveWeatherStatus || '',
      downloaded: w.WeatherSystemsKernel.immersiveSessionDownloadPayload(d),
    }));
  });
  return { ...current, ...extra };
}
async function expectImported(page: Page, payload: ReturnType<typeof sessionPayload>) {
  await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported.');
  const imported = await sessionState(page), expected = payload.weatherSystems;
  expect(preservedWeather(imported)).toEqual({
    live: expected.liveWeather, timeline: expected.liveWeatherTimeline,
    index: expected.liveWeatherTimelineIndex, journal: expected.liveForecastCheckpoints,
  });
  expect(imported.reflection).toBe(expected.immersiveReflection);
  expect(imported.observationNote).toBe(expected.observationNote);
  expect(imported.tab).toBe('immersive');
  expect(imported.loading).toBe(false);
  expect(imported.error).toBe('');
  expect(imported.scene).toBe('geographic');
  expect(imported.source).toBe('live');
  await expectJournal(page);
  return imported;
}
async function queueWeatherSuccess(page: Page, index: number, temperature: number) {
  await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
  await settle(page, index, provider(temperature));
  await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
  await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
}
async function flushQueued(page: Page) {
  expect(await page.evaluate(() => (window as any).__flushOpeningSetters())).toBe(1);
}
async function expectLoaded(page: Page, site: { latitude: number; longitude: number }, temperature: number, tab: string) {
  await expect.poll(async () => {
    const d = await state(page);
    return { latitude: d.live.latitude, longitude: d.live.longitude, temperature: d.live.temperature,
      index: d.index, loading: d.loading, error: d.error, tab: d.tab };
  }).toEqual({ latitude: site.latitude, longitude: site.longitude, temperature, index: 0, loading: false, error: '', tab });
  await expectJournal(page);
}

test.describe('Weather session and visible request ownership', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the latest actual file choice wins delayed older success, error and queued import completion', async ({ page }) => {
    await mount(page);
    await sessionDesk(page);
    await controlSessionReads(page);
    const a = sessionPayload('Older file A', -8);
    const b = sessionPayload('Latest file B', 8);

    const oldSuccess = await chooseFile(page, 'older-success.json', a);
    const latestSuccess = await chooseFile(page, 'latest-success.json', b);
    const latestStillReading = await sessionState(page);
    await finishFile(page, oldSuccess);
    expect(await sessionState(page)).toEqual(latestStillReading);
    await finishFile(page, latestSuccess);
    const successWinner = await expectImported(page, b);
    expect(successWinner.live.temperature).toBe(8);

    const oldError = await chooseFile(page, 'older-error.json', a);
    const latestAfterError = await chooseFile(page, 'latest-after-error.json', b);
    await finishFile(page, latestAfterError);
    const errorWinner = await expectImported(page, b);
    await finishFile(page, oldError, undefined, true);
    expect(await sessionState(page)).toEqual(errorWinner);
    await expect(page.locator('[data-weather-session-status]')).not.toContainText('could not be read');

    const acceptedOld = await chooseFile(page, 'older-accepted.json', a);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await finishFile(page, acceptedOld);
    await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    const finalChoice = await chooseFile(page, 'latest-after-accepted.json', b);
    await finishFile(page, finalChoice);
    const queuedWinner = await expectImported(page, b);
    await flushQueued(page);
    expect(await sessionState(page)).toEqual(queuedWinner);
    expect(queuedWinner.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
    await expectJournal(page);
  });

  test('navigation invalidates an old file callback while the new mount retains its own weather request', async ({ page }) => {
    await mount(page);
    await sessionDesk(page);
    await controlSessionReads(page);
    const stale = await chooseFile(page, 'old-mount-session.json', sessionPayload('Old mount file', -9));
    await page.getByRole('tab', { name: /Forecast Mission/ }).click();
    await expect(studio(page)).toBeVisible();
    await page.waitForFunction(() => (window as any).__openingMounts.length === 3);
    const before = await sessionState(page);
    await searchCoordinates(page, newerSite);
    await expectRequest(page, 0, { ...savedSite, ...newerSite });
    const pending = await sessionState(page);
    await finishFile(page, stale);
    expect(await sessionState(page)).toEqual(pending);
    await finishFile(page, stale, undefined, true);
    expect(await sessionState(page)).toEqual(pending);
    expect((await requests(page))[0].aborted).toBe(false);
    expect(preservedWeather(pending)).toEqual(preservedWeather(before));
    await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toBeVisible();
    await settle(page, 0, provider(21));
    await expectLoaded(page, newerSite, 21, 'forecast');
    expect((await state(page)).mounts).toEqual([
      'plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive', 'plugin-weatherSystems:explore:forecast',
    ]);
  });

  test('a validated import supersedes a queued ordinary weather result while staying in the same Immersive mount', async ({ page }) => {
    await mount(page);
    await sessionDesk(page);
    await controlSessionReads(page);
    await searchCoordinates(page, newerSite);
    await expectRequest(page, 0, { ...savedSite, ...newerSite });
    await queueWeatherSuccess(page, 0, -7);
    expect((await state(page)).loading).toBe(true);
    const payload = sessionPayload('Accepted imported school', 9);
    const chosen = await chooseFile(page, 'accepted-import.json', payload);
    await finishFile(page, chosen);
    const imported = await expectImported(page, payload);
    await flushQueued(page);
    expect(await sessionState(page)).toEqual(imported);
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
    expect(imported.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
    await expectJournal(page);

    // A validated import retires the weather owner before its data updater
    // commits. A newer invalid file must veto A's data without leaving loading
    // owned by the retired request or overwriting the newer file's error.
    const original = await sessionState(page);
    await searchCoordinates(page, firstSite);
    await expectRequest(page, 1, firstSite);
    const acceptedA = await chooseFile(page, 'accepted-then-replaced-A.json', sessionPayload('Accepted but replaced file A', -10));
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await finishFile(page, acceptedA);
    await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    expect((await requests(page))[1].aborted).toBe(true);
    const invalidB = await chooseFile(page, 'unsupported-newer-B.json', { schema: 'unrelated' });
    await finishFile(page, invalidB);
    await expect(page.locator('[data-weather-session-status]')).toContainText('not a supported Weather Systems session');
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(original));
    await flushQueued(page);
    await expect.poll(() => state(page).then(value => value.loading)).toBe(false);
    const settled = await sessionState(page);
    expect(preservedWeather(settled)).toEqual(preservedWeather(original));
    expect(settled.reflection).toBe(original.reflection);
    expect(settled.observationNote).toBe(original.observationNote);
    expect(settled.sessionStatus).toBe('This file is not a supported Weather Systems session.');
    expect(settled.error).toBe('');
    expect(settled.tab).toBe('immersive');
    expect(settled.mounts).toEqual(original.mounts);
    await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toHaveCount(0);
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
    await expectJournal(page);
    await settle(page, 1, provider(-14));
    expect(await sessionState(page)).toEqual(settled);
  });

  test('malformed and unsupported session files leave pending and accepted queued weather requests active', async ({ page }) => {
    await mount(page);
    await sessionDesk(page);
    await controlSessionReads(page);
    const before = await state(page);
    await searchCoordinates(page, newerSite);
    await expectRequest(page, 0, { ...savedSite, ...newerSite });
    const malformed = await chooseFile(page, 'malformed.json', '{');
    await finishFile(page, malformed);
    const rejected = await sessionState(page);
    expect(rejected.sessionStatus).toMatch(/JSON|Unexpected|property|position/i);
    expect(preservedWeather(rejected)).toEqual(preservedWeather(before));
    expect(rejected.loading).toBe(true);
    expect((await requests(page))[0].aborted).toBe(false);
    await settle(page, 0, provider(20));
    await expectLoaded(page, newerSite, 20, 'immersive');

    const loaded = await state(page);
    await searchCoordinates(page, firstSite);
    await expectRequest(page, 1, firstSite);
    await queueWeatherSuccess(page, 1, 22);
    const unsupported = await chooseFile(page, 'unsupported.json', { schema: 'unrelated' });
    await finishFile(page, unsupported);
    await expect(page.locator('[data-weather-session-status]')).toContainText('not a supported Weather Systems session');
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(loaded));
    expect((await state(page)).loading).toBe(true);
    expect((await requests(page))[1].aborted).toBe(false);
    await flushQueued(page);
    await expectLoaded(page, firstSite, 22, 'immersive');
    await expect(page.locator('[data-weather-session-status]')).toContainText('not a supported Weather Systems session');
    expect((await state(page)).mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
  });

  test('visible Cancel disowns a completed queued result without remounting and a later fresh request still works', async ({ page }) => {
    await mount(page);
    const before = await sessionState(page);
    await searchCoordinates(page, savedSite);
    await expectRequest(page, 0);
    await queueWeatherSuccess(page, 0, -11);
    expect((await state(page)).loading).toBe(true);
    const cancel = connection(page).getByRole('button', { name: 'Cancel weather request', exact: true });
    await expect(cancel).toBeVisible();
    await cancel.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => state(page).then(value => value.loading)).toBe(false);
    const canceled = await sessionState(page);
    expect(preservedWeather(canceled)).toEqual(preservedWeather(before));
    expect(canceled.weatherStatus).toBe('Weather request canceled. Loaded weather and saved forecasts were kept.');
    expect(canceled.tab).toBe('forecast');
    expect(canceled.error).toBe('');
    await expect(connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true })).toBeFocused();
    await expect(cancel).toHaveCount(0);
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
    await flushQueued(page);
    expect(await sessionState(page)).toEqual(canceled);
    await expectJournal(page);

    await searchCoordinates(page, newerSite);
    await expectRequest(page, 1, { ...savedSite, ...newerSite });
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(before));
    await settle(page, 1, provider(23));
    await expectLoaded(page, newerSite, 23, 'forecast');
    expect((await state(page)).mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
  });

  test('a queued visible Cancel cannot publish over a newer request loading status, focus or eventual result', async ({ page }) => {
    await mount(page);
    const original = await sessionState(page);
    await searchCoordinates(page, savedSite);
    await expectRequest(page, 0);
    const cancel = connection(page).getByRole('button', { name: 'Cancel weather request', exact: true });
    await expect(cancel).toBeVisible();
    await cancel.focus();
    await expect(cancel).toBeFocused();
    // Retain the application's real Cancel updater without evaluating it.
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    expect((await requests(page))[0].aborted).toBe(true);
    expect((await state(page)).loading).toBe(true);
    await expect(cancel).toBeVisible();

    await searchCoordinates(page, newerSite);
    await expectRequest(page, 1, { ...savedSite, ...newerSite });
    const query = connection(page).getByRole('searchbox', { name: 'Quick location search', exact: true });
    await query.focus();
    await expect(query).toBeFocused();
    const pending = await sessionState(page);
    expect(preservedWeather(pending)).toEqual(preservedWeather(original));
    expect(pending.loading).toBe(true);
    expect(pending.weatherStatus).toContain('Loading weather model data for');
    expect(pending.weatherStatus).not.toContain('canceled');
    expect(pending.tab).toBe('forecast');
    expect((await requests(page))[1].aborted).toBe(false);

    await flushQueued(page);
    expect(await sessionState(page)).toEqual(pending);
    await expect(query).toBeFocused();
    await expect(cancel).toBeVisible();
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
    // Old transport delivery is independent of the queued cancellation notice.
    await settle(page, 0, provider(-15));
    expect(await sessionState(page)).toEqual(pending);
    await expect(query).toBeFocused();
    await settle(page, 1, provider(26));
    await expectLoaded(page, newerSite, 26, 'forecast');
    expect((await state(page)).mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
    await expectJournal(page);
  });

  test('a queued device-location phase status cannot overwrite a valid import in the same Immersive mount', async ({ page }) => {
    await mount(page);
    await sessionDesk(page);
    await controlSessionReads(page);
    // Replace only the browser permission boundary; the production success
    // callback still starts the real coordinate weather request and updater.
    await page.evaluate(() => {
      const w = window as any;
      w.__sessionGeolocations = [];
      Object.defineProperty(window.navigator, 'geolocation', { configurable: true, value: {
        getCurrentPosition(success: (position: unknown) => void, error: (reason: unknown) => void, options: unknown) {
          w.__sessionGeolocations.push({ success, error, options });
        },
      } });
    });
    await connection(page).getByRole('button', { name: /Use my location/ }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__sessionGeolocations.length)).toBe(1);
    expect((await state(page)).loading).toBe(true);
    expect((await sessionState(page)).weatherStatus).toBe('Waiting for location permission…');
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await page.evaluate(({ latitude, longitude }) => {
      (window as any).__sessionGeolocations[0].success({
        coords: { latitude, longitude, accuracy: 10 }, timestamp: Date.now(),
      });
    }, newerSite);
    await expectRequest(page, 0, { ...savedSite, ...newerSite });
    await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });

    const payload = sessionPayload('Imported school after device permission', 11);
    const chosen = await chooseFile(page, 'session-after-device-permission.json', payload);
    await finishFile(page, chosen);
    const imported = await expectImported(page, payload);
    expect((await requests(page))[0].aborted).toBe(true);
    await flushQueued(page);
    expect(await sessionState(page)).toEqual(imported);
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported.');
    await expect(connection(page)).not.toContainText('Loading weather model data for My location');
    await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toHaveCount(0);
    await settle(page, 0, provider(-16));
    expect(await sessionState(page)).toEqual(imported);
    expect(imported.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
    await expectJournal(page);
  });

  test('validated imports clear an obsolete checkpoint opening notice while preserving newer file errors and saved evidence', async ({ page }) => {
    await mount(page);
    const original = await sessionState(page);
    // Create the transient notice through the actual saved forecast control.
    await openSaved(page);
    await expectRequest(page, 0);
    await expect(studio(page).getByText(openingNotice, { exact: true })).toBeVisible();
    expect((await state(page)).loading).toBe(true);
    await sessionDesk(page);
    await controlSessionReads(page);
    expect((await requests(page))[0].aborted).toBe(true);
    const desk = await sessionState(page);
    expect(preservedWeather(desk)).toEqual(preservedWeather(original));
    expect(desk.reviewStatus).toBe(openingNotice);
    expect(desk.loading).toBe(false);
    expect(desk.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);

    const replaced = sessionPayload('Validated but replaced notice file A', -12);
    const acceptedA = await chooseFile(page, 'notice-accepted-A.json', replaced);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = true; });
    await finishFile(page, acceptedA);
    await expect.poll(() => page.evaluate(() => (window as any).__openingQueuedSetters.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueOpeningSetters = false; });
    const invalidB = await chooseFile(page, 'notice-unsupported-B.json', { schema: 'unrelated' });
    await finishFile(page, invalidB);
    await expect(page.locator('[data-weather-session-status]')).toContainText('not a supported Weather Systems session');
    expect(preservedWeather(await state(page))).toEqual(preservedWeather(original));
    expect((await state(page)).reviewStatus).toBe(openingNotice);
    await flushQueued(page);
    const settled = await sessionState(page);
    expect(preservedWeather(settled)).toEqual(preservedWeather(original));
    expect(settled.reflection).toBe(desk.reflection);
    expect(settled.observationNote).toBe(desk.observationNote);
    expect(settled.sessionStatus).toBe('This file is not a supported Weather Systems session.');
    expect(settled.loading).toBe(false);
    expect(settled.error).toBe('');
    expect(settled.weatherStatus).toBe('');
    expect(settled.reviewStatus).toBe('');
    expect(settled.tab).toBe('immersive');
    expect(settled.mounts).toEqual(desk.mounts);
    await expect(page.getByText(openingNotice, { exact: true })).toHaveCount(0);
    await expect(connection(page).getByRole('button', { name: 'Cancel weather request', exact: true })).toHaveCount(0);
    await expect(connection(page).getByRole('button', { name: 'Retry weather request', exact: true })).toHaveCount(0);
    await expectJournal(page);
    await settle(page, 0, provider(-17));
    expect(await sessionState(page)).toEqual(settled);

    // Generate the same notice again through real navigation and Open controls,
    // then verify an ordinary accepted import also settles only that notice.
    await page.getByRole('tab', { name: /Forecast Mission/ }).click();
    await expect(studio(page)).toBeVisible();
    await page.waitForFunction(() => (window as any).__openingMounts.length === 3);
    await openSaved(page);
    await expectRequest(page, 1);
    await expect(studio(page).getByText(openingNotice, { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: /Immersive 3D/ }).click();
    await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
    await expect(page.getByLabel('Import session JSON', { exact: true })).toBeAttached();
    await page.waitForFunction(() => (window as any).__openingMounts.length === 4);
    expect((await requests(page))[1].aborted).toBe(true);
    expect((await state(page)).reviewStatus).toBe(openingNotice);
    const payload = sessionPayload('Normally imported notice school', 12);
    const normal = await chooseFile(page, 'notice-normal-valid.json', payload);
    await finishFile(page, normal);
    const imported = await expectImported(page, payload);
    expect(imported.reviewStatus).toBe('');
    expect(imported.mounts).toEqual([
      'plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive',
      'plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive',
    ]);
    await expect(page.getByText(openingNotice, { exact: true })).toHaveCount(0);
    await settle(page, 1, provider(-18));
    expect(await sessionState(page)).toEqual(imported);
    await expectJournal(page);
  });
});
