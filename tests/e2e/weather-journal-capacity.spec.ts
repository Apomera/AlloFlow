import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// STEM_GL_SUBSTITUTE can serve the owned isolated candidate while activation
// files are reserved elsewhere. The harness continues to request its real path.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const date = '2026-10-29';
const target = `${date}T14:00:00Z`;
const measures = {
  temperature: 24, humidity: 70, precipitation: 0, pressure: 1007,
  windSpeed: 12, windDir: 220, weatherCode: 3, condition: 'Overcast',
  cloudCover: 80, visibility: 10000, pressureType: 'surface',
};
const live = {
  ...measures, label: 'Synthetic school yard', latitude: 40, longitude: -75,
  observedAt: `${date}T12:00:00Z`, validAt: `${date}T12:00:00Z`, retrievedAt: `${date}T12:01:00Z`,
  source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/',
  timezone: 'UTC', utcOffsetSeconds: 0, precipitationIntervalSeconds: 900,
};

function point(hour: number, role: string) {
  return {
    ...measures, time: `${date}T${String(hour).padStart(2, '0')}:00:00Z`, role,
    offsetHours: hour - 12, utcOffsetSeconds: 0, source: 'Open-Meteo', sourceKind: 'model',
    precipitationIntervalSeconds: role === 'current' ? 900 : 3600,
  };
}

function oldCheckpoint(index: number) {
  return {
    schema: 'weather-live-checkpoint-v2', id: `saved-${index}`, location: 'Synthetic school yard',
    source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75,
    retrievedAt: '2026-10-28T12:01:00Z', capturedAt: '2026-10-28T12:05:00Z',
    currentDataAt: '2026-10-28T12:00:00Z', validAt: '2026-10-28T14:00:00Z',
    validTimestamp: Date.parse('2026-10-28T14:00:00Z'), timezone: 'UTC', utcOffsetSeconds: 0,
    predicted: { temperature: 24 }, learnerReasoning: `Keep original note ${index}.`,
    timelineEvidence: `Original timeline evidence ${index}.`,
    classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
      temperatureC: (67 - 32) * 5 / 9, measuredAt: '2026-10-28T14:00:00.000Z',
      recordedAt: '2026-10-28T14:05:00.000Z', sameSite: true,
    },
  };
}

const studio = (page: Page) => page.locator('[data-weather-forecast-verification-studio]');
const capacity = (page: Page) => studio(page).locator('[data-weather-forecast-capacity]');
const save = (page: Page) => studio(page).getByRole('button', { name: 'Save live forecast snapshot', exact: true });
const undo = (page: Page) => studio(page).getByRole('button', { name: 'Undo remove forecast snapshot', exact: true });
const records = (page: Page) => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);

async function mount(page: Page, checkpoints: Record<string, unknown>[], patch: Record<string, unknown> = {}) {
  await page.clock.setFixedTime(new Date(`${date}T12:05:00Z`));
  await harness.mount(page, {
    weatherSystems: {
      tab: 'forecast', scenario: 'coldFront', liveWeather: live,
      liveWeatherTimeline: [point(12, 'current'), point(14, 'forecast'), point(15, 'forecast')],
      liveWeatherTimelineIndex: 0, liveReviewTarget: target,
      liveForecastCheckpoints: checkpoints, ...patch,
    },
  }, undefined, { expectCanvas: false });
  await expect(studio(page)).toBeVisible();
}

async function download(page: Page, button: string) {
  const event = page.waitForEvent('download');
  await studio(page).getByRole('button', { name: button, exact: true }).click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream(), pieces: Buffer[] = [];
  for await (const piece of stream!) pieces.push(Buffer.from(piece));
  return Buffer.concat(pieces).toString('utf8');
}

async function seedDraft(page: Page, reasoning = 'Explain the next saved forecast.') {
  return page.evaluate(async (text) => {
    const w = window as any, d = w.__toolData.weatherSystems;
    const draft = {
      contextKey: w.WeatherSystemsKernel.buildLiveTimelineExploration([], d.liveWeather).contextKey,
      reasoning: text, attachment: 'Keep my pinned timeline evidence.',
    };
    w.__toolData.weatherSystems = { ...d, liveHourDraft: draft };
    w.__rerender();
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    return draft;
  }, reasoning);
}

test.describe('Weather Systems live forecast journal capacity', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.beforeEach(async ({ page }) => { await page.route('https://**/*', (route) => route.abort()); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('keeps all eight originals and exports, then restores an explicit removal without eviction', async ({ page }) => {
    const original = Array.from({ length: 8 }, (_, index) => oldCheckpoint(index));
    await mount(page, original);
    await expect(capacity(page)).toContainText('8 of 8 forecast snapshots saved');
    await expect(save(page)).toBeDisabled();
    expect(await records(page)).toEqual(original);
    const text = await download(page, 'Download live forecast report');
    const csv = await download(page, 'Download live forecast CSV');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(9);
    for (let index = 0; index < 8; index += 1) {
      expect(text).toContain(`Keep original note ${index}.`);
      expect(csv).toContain(`Keep original note ${index}.`);
      expect(text).toContain(`Original timeline evidence ${index}.`);
    }
    expect(text).toContain('67 °F');
    expect(await records(page)).toEqual(original);

    await studio(page).getByRole('button', { name: /^Remove, saved forecast / }).first().click();
    await expect(capacity(page)).toContainText('7 of 8 forecast snapshots saved');
    await expect(undo(page)).toBeFocused();
    await expect(save(page)).toBeEnabled();
    expect(await records(page)).toEqual(original.slice(0, 7));
    await undo(page).focus();
    await page.keyboard.press('Enter');
    await expect(capacity(page)).toContainText('8 of 8 forecast snapshots saved');
    await expect(capacity(page)).toBeFocused();
    await expect(save(page)).toBeDisabled();
    await expect(undo(page)).toHaveCount(0);
    expect(await records(page)).toEqual(original);
  });

  test('warns before a distinct new save consumes removal Undo and preserves every remaining original', async ({ page }) => {
    const original = Array.from({ length: 8 }, (_, index) => oldCheckpoint(index));
    await mount(page, original);
    await studio(page).getByRole('button', { name: /^Remove, saved forecast / }).first().click();
    await expect(undo(page)).toBeVisible();
    await expect(studio(page)).toContainText('Saving a new snapshot ends Undo for the removed snapshot.');
    await seedDraft(page);
    await expect(save(page)).toBeEnabled();
    await save(page).focus();
    await page.keyboard.press('Enter');
    await expect(capacity(page)).toContainText('8 of 8 forecast snapshots saved');
    await expect(capacity(page)).toBeFocused();
    await expect(save(page)).toBeDisabled();
    await expect(undo(page)).toHaveCount(0);
    const saved = await records(page);
    expect(saved).toHaveLength(8);
    expect(saved.slice(0, 7)).toEqual(original.slice(0, 7));
    expect(saved[7].id).not.toBe(original[7].id);
    expect(saved[7]).toMatchObject({
      schema: 'weather-live-checkpoint-v2', validTimestamp: Date.parse(target),
      learnerReasoning: 'Explain the next saved forecast.', timelineEvidence: 'Keep my pinned timeline evidence.',
    });
    const state = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(state.liveReviewUndo).toBeNull();
    expect(state.liveReviewStatus).toMatch(/undo.*ended|ended.*undo/i);
    expect(state.liveHourDraft.reasoning).toBe('');
    expect(state.liveHourDraft.attachment).toBe('');
  });

  test('uses latest state when a queued save reaches an already-full journal and retains recovery plus the newer draft', async ({ page }) => {
    const original = Array.from({ length: 7 }, (_, index) => oldCheckpoint(index));
    const removed = oldCheckpoint(9), eighth = oldCheckpoint(7);
    await mount(page, original, { liveReviewUndo: removed });
    await seedDraft(page, 'The draft visible before the queued save.');
    await expect(save(page)).toBeEnabled();
    // Replace the backing state without rendering: the existing enabled button
    // still closes over a seven-card view while its functional update sees eight.
    await page.evaluate(({ eighth }) => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = {
        ...d, liveForecastCheckpoints: d.liveForecastCheckpoints.concat([eighth]),
        liveHourDraft: { ...d.liveHourDraft, reasoning: 'A newer queued draft must remain.' },
      };
      const button = [...document.querySelectorAll('[data-weather-forecast-verification-studio] button')]
        .find((item) => item.textContent === 'Save live forecast snapshot') as HTMLButtonElement;
      button.click();
    }, { eighth });
    await expect(capacity(page)).toContainText('8 of 8 forecast snapshots saved');
    await expect(save(page)).toBeDisabled();
    const state = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(state.liveForecastCheckpoints).toEqual([...original, eighth]);
    expect(state.liveReviewUndo).toEqual(removed);
    expect(state.liveHourDraft.reasoning).toBe('A newer queued draft must remain.');
    expect(state.liveReviewStatus).toMatch(/eight|8|full|remove/i);
    await expect(undo(page)).toBeDisabled();
    expect(state.liveReviewStatus).not.toMatch(/restored with|snapshot saved for/i);
  });

  test('preserves removal Undo and the matching draft on duplicate or newly invalid save attempts', async ({ page }) => {
    const duplicate = {
      schema: 'weather-live-checkpoint-v2', id: [40, -75, Date.parse(target), new Date(live.retrievedAt).toISOString()].join('|'),
      location: live.label, latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
      retrievedAt: new Date(live.retrievedAt).toISOString(), capturedAt: `${date}T12:04:00.000Z`,
      currentDataAt: live.observedAt, validAt: target, validTimestamp: Date.parse(target),
      timezone: 'UTC', utcOffsetSeconds: 0, predicted: { temperature: 19 }, learnerReasoning: 'Keep the first saved value.',
    };
    const original = [...Array.from({ length: 6 }, (_, index) => oldCheckpoint(index)), duplicate];
    const removed = oldCheckpoint(9);
    const initiallyRendered = original.slice(0, -1);
    await mount(page, initiallyRendered, { liveReviewUndo: removed });
    const draft = await seedDraft(page);
    await expect(save(page)).toBeEnabled();
    // A duplicate arrives after the enabled control was rendered. The handler
    // must check current state even though the normal UI disables duplicates.
    await page.evaluate((entries) => {
      (window as any).__toolData.weatherSystems.liveForecastCheckpoints = entries;
    }, original);
    await save(page).click();
    let state = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(state.liveForecastCheckpoints).toEqual(original);
    expect(state.liveReviewUndo).toEqual(removed);
    expect(state.liveHourDraft).toEqual(draft);
    expect(state.liveReviewStatus).toMatch(/already saved|original values.*kept/i);
    await expect(undo(page)).toBeEnabled();
    await expect(save(page)).toBeDisabled();

    await page.evaluate((entries) => {
      const w = window as any;
      w.__toolData.weatherSystems.liveForecastCheckpoints = entries;
      w.__rerender();
    }, initiallyRendered);
    await expect(save(page)).toBeEnabled();

    // The selected hour expires between render and activation. The previously
    // enabled control must reject it without consuming the saved removal/draft.
    await page.clock.setFixedTime(new Date(`${date}T15:05:00Z`));
    await save(page).click();
    state = await page.evaluate(() => (window as any).__toolData.weatherSystems);
    expect(state.liveForecastCheckpoints).toEqual(initiallyRendered);
    expect(state.liveReviewUndo).toEqual(removed);
    expect(state.liveHourDraft).toEqual(draft);
    expect(state.liveReviewStatus).toMatch(/future|source|time|valid/i);
    expect(state.liveReviewStatus).not.toMatch(/snapshot saved for|restored with/i);
  });
});
