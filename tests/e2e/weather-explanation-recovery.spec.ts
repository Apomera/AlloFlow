import { expect, Page, Route, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const date = '2026-10-29';
const text = 'Clouds thickened in the earlier retrieval, so I expect cooling.';
const measures = { temperature: 18, humidity: 70, precipitation: 0, pressure: 1007, windSpeed: 12, windDir: 220, weatherCode: 3, condition: 'Overcast', cloudCover: 80, pressureType: 'surface' };
const oldLive = {
  ...measures, label: 'Synthetic coastal school', latitude: 40, longitude: -75,
  observedAt: `${date}T12:00:00Z`, retrievedAt: `${date}T12:01:00Z`,
  source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/',
  timezone: 'UTC', utcOffsetSeconds: 0, precipitationIntervalSeconds: 900,
};
const newLive = { ...oldLive, label: 'Synthetic inland school', latitude: 41, retrievedAt: `${date}T12:03:00Z` };

function timeline(retrievedAt = oldLive.retrievedAt) {
  return [12, 13, 14, 15].map((hour) => ({
    ...measures, temperature: 18 - (hour - 12), time: `${date}T${hour}:00:00Z`,
    role: hour === 12 ? 'current' : 'forecast', offsetHours: hour - 12,
    utcOffsetSeconds: 0, retrievedAt, source: 'Open-Meteo', sourceKind: 'model',
    precipitationIntervalSeconds: hour === 12 ? 900 : 3600,
  }));
}

const explorer = (page: Page) => page.locator('[data-weather-live-timeline-explorer]');
const recovery = (page: Page) => page.locator('[data-weather-explanation-recovery]');
const writer = (page: Page) => explorer(page).getByLabel('Explanation for the next forecast snapshot', { exact: true });
const draft = (page: Page) => page.evaluate(() => (window as any).__toolData.weatherSystems.liveHourDraft);

async function mount(page: Page, patch: Record<string, unknown> = {}) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date(`${date}T12:05:00Z`));
  await harness.mount(page, { weatherSystems: {
    tab: 'forecast', liveWeather: oldLive, liveWeatherTimeline: timeline(), liveWeatherTimelineIndex: 0,
    liveTimelineWindow: 6, ...patch,
  } }, undefined, { expectCanvas: false });
  await expect(explorer(page)).toBeVisible();
}

async function createAttachedDraft(page: Page) {
  const slider = explorer(page).getByRole('slider', { name: 'Inspect live timeline hour', exact: true });
  await slider.focus();
  await page.keyboard.press('Home');
  await explorer(page).getByRole('button', { name: 'Pin inspected hour as A', exact: true }).click();
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await explorer(page).getByRole('button', { name: 'Pin inspected hour as B', exact: true }).click();
  await explorer(page).getByRole('button', { name: 'Attach comparison to forecast explanation', exact: true }).click();
  await writer(page).fill(text);
  const current = await draft(page);
  expect(current.reasoning).toBe(text);
  expect(current.attachment).toContain(oldLive.label);
  expect(current.hourA).toEqual(expect.any(Number));
  expect(current.hourB).toEqual(expect.any(Number));
  return current;
}

async function changeRetrieval(page: Page) {
  await page.evaluate(({ live, points }) => {
    const w = window as any, d = w.__toolData.weatherSystems;
    w.__toolData.weatherSystems = { ...d, liveWeather: live, liveWeatherTimeline: points, liveWeatherTimelineIndex: 0 };
    w.__rerender();
  }, { live: newLive, points: timeline(newLive.retrievedAt) });
  await expect(recovery(page)).toBeVisible();
}

async function download(page: Page, button: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream(), pieces: Buffer[] = [];
  for await (const piece of stream!) pieces.push(Buffer.from(piece));
  return Buffer.concat(pieces).toString('utf8');
}

async function teacherSessionDesk(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__toolData.weatherSystems.immersiveSceneMode = 'geographic';
    w.__toolData._threeLoaded = false;
    w.__rerender();
  });
  await page.getByRole('tab', { name: /Immersive 3D/ }).click();
  await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
}

function providerResponse() {
  const values = {
    temperature_2m: 18, relative_humidity_2m: 70, precipitation: 0, surface_pressure: 1007,
    wind_speed_10m: 12, wind_direction_10m: 220, weather_code: 3, cloud_cover: 80, visibility: 10000,
  };
  return {
    latitude: oldLive.latitude, longitude: oldLive.longitude,
    timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
    current: { ...values, time: `${date}T12:00`, interval: 900 },
    hourly: {
      time: [12, 13, 14, 15].map((hour) => `${date}T${hour}:00`),
      ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [value, value, value, value]])),
    },
  };
}

test.describe('Weather Systems unfinished explanation recovery', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('keeps earlier text and evidence visible and read-only until explicit text-only transfer', async ({ page }) => {
    await mount(page);
    const original = await createAttachedDraft(page);
    await changeRetrieval(page);
    await expect(recovery(page)).toContainText('Unfinished explanation from earlier weather');
    await expect(recovery(page)).toContainText(text);
    await expect(recovery(page)).toContainText(original.attachment);
    await expect(recovery(page)).toContainText(oldLive.label);
    await expect(recovery(page)).toContainText(new Date(oldLive.retrievedAt).toISOString());
    await expect(writer(page)).toBeDisabled();
    await expect(explorer(page).getByRole('button', { name: 'Pin inspected hour as A', exact: true })).toBeDisabled();
    await expect(explorer(page).getByRole('button', { name: 'Pin inspected hour as B', exact: true })).toBeDisabled();
    await expect(explorer(page).getByRole('button', { name: 'Attach comparison to forecast explanation', exact: true })).toBeDisabled();
    expect(await draft(page)).toEqual(original);
    const downloaded = await download(page, 'Download unfinished explanation');
    expect(downloaded).toContain(text);
    expect(downloaded).toContain(original.attachment);
    expect(downloaded).toContain(oldLive.label);
    expect(await draft(page)).toEqual(original);

    await recovery(page).getByRole('button', { name: 'Use explanation text for this retrieval', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(recovery(page)).toHaveCount(0);
    await expect(writer(page)).toBeEnabled();
    await expect(writer(page)).toHaveValue(text);
    await expect(writer(page)).toBeFocused();
    const carried = await draft(page);
    expect(carried).toMatchObject({
      reasoning: text, attachment: '', hourA: null, hourB: null,
      sourceContext: { location: newLive.label, latitude: newLive.latitude, retrievedAt: new Date(newLive.retrievedAt).toISOString() },
    });
    expect(carried.contextKey).not.toBe(original.contextKey);
    await expect(explorer(page).locator('[data-weather-live-hour-comparison]')).not.toContainText('Attached to the next snapshot explanation.');
    await expect(explorer(page).getByRole('button', { name: 'Attach comparison to forecast explanation', exact: true })).toBeDisabled();
  });

  test('preserves stale recovery during a queued draft or current-context change and allows an explicit reviewed discard', async ({ page }) => {
    await mount(page);
    await createAttachedDraft(page);
    await changeRetrieval(page);
    // Update state without rendering so this click still represents the prior
    // displayed fingerprint. The current text must win over its stale action.
    await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveHourDraft: { ...d.liveHourDraft, reasoning: 'A newer independent draft edit.' } };
      const button = [...document.querySelectorAll('[data-weather-explanation-recovery] button')]
        .find((item) => item.textContent === 'Discard unfinished explanation') as HTMLButtonElement;
      button.click();
    });
    await expect(recovery(page)).toContainText('A newer independent draft edit.');
    expect((await draft(page)).reasoning).toBe('A newer independent draft edit.');
    const preserved = await draft(page);
    await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: { ...d.liveWeather, retrievedAt: '2026-10-29T12:04:00Z' } };
      const button = [...document.querySelectorAll('[data-weather-explanation-recovery] button')]
        .find((item) => item.textContent === 'Use explanation text for this retrieval') as HTMLButtonElement;
      button.click();
    });
    expect(await draft(page)).toEqual(preserved);
    await expect(recovery(page)).toBeVisible();
    await recovery(page).getByRole('button', { name: 'Discard unfinished explanation', exact: true }).click();
    await expect(recovery(page)).toHaveCount(0);
    expect(await draft(page)).toBeNull();
    await expect(writer(page)).toBeEnabled();
    await expect(writer(page)).toHaveValue('');
    await expect(writer(page)).toBeFocused();
  });

  test('recovers an unfinished draft through actual local reopen and session-file import but excludes it from shares', async ({ page }) => {
    await mount(page);
    const original = await createAttachedDraft(page);
    await changeRetrieval(page);
    await expect.poll(() => page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('weather-systems-immersive-workspace-v1') || '{}');
      return local.weatherSystems?.liveHourDraft;
    })).toEqual(original);
    await harness.destroy(page);
    await harness.mount(page, { weatherSystems: { tab: 'forecast' } }, undefined, { expectCanvas: false });
    await expect(recovery(page)).toContainText(text);
    expect(await draft(page)).toEqual(original);
    await teacherSessionDesk(page);
    const downloaded = await download(page, 'Download session JSON');
    expect(JSON.parse(downloaded).weatherSystems.liveHourDraft).toEqual(original);
    const share = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      return [true, false].map((includeLocation) => w.WeatherSystemsKernel.immersiveSessionSharePayload(d, { includeLocation }));
    });
    for (const payload of share) {
      expect(payload.weatherSystems.liveHourDraft).toBeUndefined();
      expect(JSON.stringify(payload)).not.toContain(text);
      expect(JSON.stringify(payload)).not.toContain(original.attachment);
    }
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await recovery(page).getByRole('button', { name: 'Discard unfinished explanation', exact: true }).click();
    expect(await draft(page)).toBeNull();
    await teacherSessionDesk(page);
    await page.locator('#weather-immersive-session-import').setInputFiles({
      name: 'unfinished-explanation.json', mimeType: 'application/json', buffer: Buffer.from(downloaded),
    });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect(recovery(page)).toContainText(text);
    expect(await draft(page)).toEqual(original);
  });

  test('shows legacy unknown-source recovery instead of silently replacing it', async ({ page }) => {
    const legacy = { contextKey: 'unknown-earlier-retrieval', reasoning: 'Legacy explanation kept.', attachment: 'Legacy pinned evidence.', hourA: null, hourB: null };
    await mount(page, { liveWeather: newLive, liveWeatherTimeline: timeline(newLive.retrievedAt), liveHourDraft: legacy });
    await expect(recovery(page)).toContainText(legacy.reasoning);
    await expect(recovery(page)).toContainText(legacy.attachment);
    await expect(recovery(page)).toContainText(/unknown|not recorded|unavailable/i);
    await expect(writer(page)).toBeDisabled();
    expect(await draft(page)).toEqual(legacy);
    await recovery(page).getByRole('button', { name: 'Use explanation text for this retrieval', exact: true }).click();
    const carried = await draft(page);
    expect(carried.reasoning).toBe(legacy.reasoning);
    expect(carried.attachment).toBe('');
    expect(carried.sourceContext.location).toBe(newLive.label);
  });

  test('explains inspected-save duplicate and full states while preserving saved snapshots and the draft', async ({ page }) => {
    await mount(page);
    await createAttachedDraft(page);
    const button = explorer(page).getByRole('button', { name: 'Save inspected forecast snapshot', exact: true });
    const status = explorer(page).locator('[data-weather-inspected-save-status]');
    await expect(button).toHaveAttribute('aria-describedby', /weather-live-inspected-save-status/);
    await expect(button).toBeEnabled();
    await button.click();
    const saved = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
    expect(saved).toHaveLength(1);
    await writer(page).fill('Do not lose this draft while the current hour is already saved.');
    const currentDraft = await draft(page);
    await expect(button).toBeDisabled();
    await expect(status).toContainText(/already|original/i);
    const full = saved.concat(Array.from({ length: 7 }, (_, index) => ({ ...saved[0], id: 'capacity-' + index, learnerReasoning: `Saved original ${index}` })));
    await page.evaluate((checkpoints) => {
      const w = window as any;
      w.__toolData.weatherSystems = { ...w.__toolData.weatherSystems, liveForecastCheckpoints: checkpoints };
      w.__rerender();
    }, full);
    await explorer(page).getByRole('slider', { name: 'Inspect live timeline hour', exact: true }).focus();
    await page.keyboard.press('End');
    await expect(button).toBeDisabled();
    await expect(status).toContainText(/8 of 8|8.*saved/);
    await expect(status).toContainText(/remove|full/i);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(full);
    expect(await draft(page)).toEqual(currentDraft);
  });

  test('preserves editable work through failed and canceled refreshes and recovers it after a successful actual refresh', async ({ page }) => {
    await mount(page);
    const original = await createAttachedDraft(page);
    const requests: Route[] = [];
    await page.route('https://api.open-meteo.com/v1/forecast?*', (route) => { requests.push(route); });
    const refresh = page.getByRole('button', { name: 'Refresh loaded weather', exact: true });
    const connection = page.locator('[data-weather-live-connection="forecast"]');
    const loading = () => page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherLoading);

    await page.clock.setFixedTime(new Date(`${date}T12:06:00Z`));
    await refresh.click();
    await expect.poll(() => requests.length).toBe(1);
    await requests[0].fulfill({ status: 503, contentType: 'application/json', body: '{}' });
    await expect.poll(loading).toBe(false);
    await expect(connection.getByRole('alert')).toContainText(/503|service|unavailable/i);
    await expect(recovery(page)).toHaveCount(0);
    await expect(writer(page)).toBeEnabled();
    expect(await draft(page)).toEqual(original);
    await writer(page).fill('I can still revise my explanation after a failed refresh.');
    const editableDraft = await draft(page);

    await page.clock.setFixedTime(new Date(`${date}T12:07:00Z`));
    await refresh.click();
    await expect.poll(() => requests.length).toBe(2);
    await connection.getByRole('button', { name: 'Cancel weather request', exact: true }).click();
    await expect.poll(loading).toBe(false);
    await expect(recovery(page)).toHaveCount(0);
    await expect(writer(page)).toBeEnabled();
    await expect(writer(page)).toHaveValue(editableDraft.reasoning);
    expect(await draft(page)).toEqual(editableDraft);
    // A late transport completion after cancel must not change the retrieval.
    await requests[1].fulfill({ json: providerResponse() }).catch(() => {});
    expect(await draft(page)).toEqual(editableDraft);

    await page.clock.setFixedTime(new Date(`${date}T12:08:00Z`));
    await refresh.click();
    await expect.poll(() => requests.length).toBe(3);
    const query = new URL(requests[2].request().url());
    expect(query.searchParams.get('latitude')).toBe(String(oldLive.latitude));
    expect(query.searchParams.get('longitude')).toBe(String(oldLive.longitude));
    await requests[2].fulfill({ json: providerResponse() });
    await expect.poll(loading).toBe(false);
    await expect(recovery(page)).toBeVisible();
    await expect(writer(page)).toBeDisabled();
    await expect(recovery(page)).toContainText(editableDraft.reasoning);
    await expect(recovery(page)).toContainText(editableDraft.attachment);
    await expect(recovery(page)).toContainText(oldLive.label);
    await expect(recovery(page)).toContainText(new Date(oldLive.retrievedAt).toISOString());
    expect(await draft(page)).toEqual(editableDraft);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeather.retrievedAt))
      .toBe(`${date}T12:08:00.000Z`);
  });

  test('consumes the explanation and both pins on a successful save so a later retrieval has no empty recovery blocker', async ({ page }) => {
    await mount(page);
    const original = await createAttachedDraft(page);
    const save = explorer(page).getByRole('button', { name: 'Save inspected forecast snapshot', exact: true });
    await expect(save).toBeEnabled();
    await save.click();
    const snapshots = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ learnerReasoning: original.reasoning, timelineEvidence: original.attachment });
    const consumed = await draft(page);
    expect(consumed?.reasoning || '').toBe('');
    expect(consumed?.attachment || '').toBe('');
    expect(consumed?.hourA ?? null).toBeNull();
    expect(consumed?.hourB ?? null).toBeNull();
    await page.evaluate(({ live, points }) => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: live, liveWeatherTimeline: points, liveWeatherTimelineIndex: 0 };
      w.__rerender();
    }, { live: newLive, points: timeline(newLive.retrievedAt) });
    await expect(recovery(page)).toHaveCount(0);
    await expect(writer(page)).toBeEnabled();
    await expect(writer(page)).toHaveValue('');
    await expect(explorer(page).getByRole('button', { name: 'Pin inspected hour as A', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints)).toEqual(snapshots);
  });

  test('offers download and discard when no usable current weather exists without offering an editable writer', async ({ page }) => {
    await mount(page);
    const original = await createAttachedDraft(page);
    await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: null, liveWeatherTimeline: [], liveWeatherTimelineIndex: 0 };
      w.__rerender();
    });
    await expect(recovery(page)).toBeVisible();
    await expect(recovery(page)).toContainText(original.reasoning);
    await expect(recovery(page)).toContainText(original.attachment);
    await expect(recovery(page).getByRole('button', { name: 'Use explanation text for this retrieval', exact: true })).toBeDisabled();
    await expect(page.getByLabel('Explanation for the next forecast snapshot', { exact: true })).toHaveCount(0);
    const downloaded = await download(page, 'Download unfinished explanation');
    expect(downloaded).toContain(original.reasoning);
    expect(downloaded).toContain(original.attachment);
    expect(await draft(page)).toEqual(original);
    await recovery(page).getByRole('button', { name: 'Discard unfinished explanation', exact: true }).click();
    await expect(recovery(page)).toHaveCount(0);
    expect(await draft(page)).toBeNull();
  });
});
