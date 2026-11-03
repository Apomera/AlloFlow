import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1440, height: 1100, layout: 'document', appStyles: true,
});
const time = (hour: number) => `2026-10-29T${String(hour).padStart(2, '0')}:00:00.000Z`;
const live = {
  label: 'Synthetic coastal school', latitude: 40, longitude: -75, observedAt: time(12), retrievedAt: '2026-10-29T12:01:00.000Z',
  source: 'Open-Meteo', sourceKind: 'model', sourceUrl: 'https://open-meteo.com/', timezone: 'UTC', utcOffsetSeconds: 0,
  temperature: 18, humidity: 70, pressure: 1007, windSpeed: 12, windDir: 220, precipitation: 0,
  cloudCover: 50, weatherCode: 3, condition: 'Overcast', precipitationIntervalSeconds: 900,
};
function points(retrievedAt = live.retrievedAt) {
  return [11, 12, 13, 14].map((hour) => ({
    humidity: 70, pressure: 1007, windSpeed: 12, windDir: 220, precipitation: 0,
    cloudCover: 50, weatherCode: 3, condition: 'Overcast', pressureType: 'surface',
    time: time(hour), source: 'Open-Meteo', sourceKind: 'model', utcOffsetSeconds: 0,
    role: hour < 12 ? 'earlier' : hour === 12 ? 'current' : 'forecast', offsetHours: hour - 12,
    retrievedAt, temperature: 18 + (hour - 12) * 2, precipitationIntervalSeconds: hour === 12 ? 900 : 3600,
  }));
}
const stage = (page: Page) => page.getByRole('group', { name: 'Stage timeline playback controls', exact: true });
const selected = (page: Page) => page.locator('#weather-stage-timeline-slider');
const stageCompare = (page: Page) => page.locator('#weather-stage-timeline-comparison');
const inspectorCompare = (page: Page) => page.locator('#weather-timeline-comparison');
const state = (page: Page) => page.evaluate(() => {
  const d = (window as any).__toolData.weatherSystems;
  return { index: d.liveWeatherTimelineIndex, playing: d.liveWeatherTimelinePlaying === true,
    comparison: d.immersiveTimelineComparison || null, legacyComparison: d.immersiveTimelineCompareIndex,
    retrievedAt: d.liveWeather?.retrievedAt, latitude: d.liveWeather?.latitude };
});

async function mount(page: Page, patch: Record<string, unknown> = {}) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-10-29T12:05:00Z'));
  await harness.mount(page, { _threeLoaded: false, weatherSystems: {
    tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveDataSource: 'live',
    immersiveAudienceMode: 'teacher', immersiveInspectorPanel: 'evidence', immersiveStageMode: true,
    liveWeather: live, liveWeatherTimeline: points(), liveWeatherTimelineIndex: 2, ...patch,
  } }, undefined, { expectCanvas: false });
  await expect(stage(page)).toBeVisible();
}

async function showInspector(page: Page) {
  const exit = page.getByRole('button', { name: 'Exit 3D stage mode', exact: true });
  if (await exit.isVisible()) await exit.click();
  await expect(inspectorCompare(page)).toBeVisible();
}

async function showStage(page: Page) {
  const enter = page.getByRole('button', { name: 'Enter 3D stage mode', exact: true });
  if (await enter.isVisible()) await enter.click();
  await expect(stage(page)).toBeVisible();
}

async function freezeTimers(page: Page) {
  await page.clock.install({ time: new Date('2026-10-29T12:05:00Z') });
  await page.clock.pauseAt(new Date('2026-10-29T12:05:01Z'));
}

test.describe('Weather Systems retrieval-bound immersive timeline controls', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('compares a selected forecast with the current hour through both synchronized control surfaces', async ({ page }) => {
    await mount(page, { immersiveTimelineCompareIndex: 1 });
    await expect(selected(page)).toHaveValue('2');
    await expect(stageCompare(page)).toHaveValue('');
    await expect(inspectorCompare(page)).toHaveValue('');
    const current = stageCompare(page).locator('option[value="1"]');
    await expect(current).toBeEnabled();
    await stageCompare(page).selectOption('1');
    await expect(stageCompare(page)).toHaveValue('1');
    await expect(inspectorCompare(page)).toHaveValue('1');
    const pinned = (await state(page)).comparison;
    expect(pinned).toMatchObject({ schema: 'weather-live-timeline-comparison-v1', validTimestamp: Date.parse(time(12)) });
    expect(pinned.contextKey).toEqual(expect.any(String));
    await expect(page.locator('[data-weather-stage-timeline-comparison]')).toContainText(/\+2\s*°C/);
    await showInspector(page);
    await inspectorCompare(page).selectOption('0');
    await showStage(page);
    await expect(stageCompare(page)).toHaveValue('0');
    expect((await state(page)).comparison.validTimestamp).toBe(Date.parse(time(11)));
    await stageCompare(page).selectOption('');
    await expect(inspectorCompare(page)).toHaveValue('');
    expect((await state(page)).comparison).toBeNull();
  });

  test('uses latest state for queued steps and toggles and rejects a stale rendered retrieval', async ({ page }) => {
    await mount(page, { liveWeatherTimelineIndex: 0 });
    await freezeTimers(page);
    await page.evaluate(() => {
      const group = document.querySelector('[aria-label="Stage timeline playback controls"]')!;
      const next = [...group.querySelectorAll('button')].find((button) => button.textContent === 'Next hour')!;
      next.click(); next.click();
    });
    await expect(selected(page)).toHaveValue('2');
    await page.evaluate(() => {
      const group = document.querySelector('[aria-label="Stage timeline playback controls"]')!;
      const play = [...group.querySelectorAll('button')].find((button) => /Play timeline/.test(button.textContent || ''))!;
      play.click(); play.click();
    });
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    await page.evaluate(({ weather, timeline }) => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: weather, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 1 };
      const group = document.querySelector('[aria-label="Stage timeline playback controls"]')!;
      const next = [...group.querySelectorAll('button')].find((button) => button.textContent === 'Next hour')!;
      next.click();
    }, { weather: { ...live, retrievedAt: '2026-10-29T12:03:00.000Z' }, timeline: points('2026-10-29T12:03:00.000Z') });
    await expect(selected(page)).toHaveValue('1');
    expect((await state(page)).retrievedAt).toBe('2026-10-29T12:03:00.000Z');
    await expect(page.locator('[data-weather-timeline-control-status="stage"]')).toContainText(/changed|current retrieval/i);
    await page.clock.runFor(3000);
    await expect(selected(page)).toHaveValue('1');
  });

  test('clears a pinned baseline and old playback when same-length weather refreshes or changes location', async ({ page }) => {
    await mount(page);
    await freezeTimers(page);
    await stageCompare(page).selectOption('1');
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(true);
    await page.evaluate(({ weather, timeline }) => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: weather, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 0 };
      w.__rerender();
    }, { weather: { ...live, retrievedAt: '2026-10-29T12:04:00.000Z' }, timeline: points('2026-10-29T12:04:00.000Z') });
    await expect(stageCompare(page)).toHaveValue('');
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    expect((await state(page)).comparison).toBeNull();
    await page.clock.runFor(3000);
    await expect(selected(page)).toHaveValue('0');
    await stageCompare(page).selectOption('1');
    await page.evaluate(({ weather, timeline }) => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, liveWeather: weather, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 2 };
      w.__rerender();
    }, { weather: { ...live, latitude: 41, label: 'Different synthetic site' }, timeline: points() });
    await expect(stageCompare(page)).toHaveValue('');
    await expect(inspectorCompare(page)).toHaveValue('');
    expect((await state(page)).comparison).toBeNull();
    expect((await state(page)).latitude).toBe(41);
  });

  test('pauses on view changes, loading and reduced-motion changes without resuming old timers', async ({ page }) => {
    await mount(page, { liveWeatherTimelineIndex: 1 });
    await freezeTimers(page);
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await showInspector(page);
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    await page.clock.runFor(3000);
    expect((await state(page)).index).toBe(1);
    await page.getByRole('tab', { name: /Immersive 3D/ }).click();
    await showStage(page);
    await expect(stage(page).getByRole('button', { name: 'Play timeline', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems = { ...w.__toolData.weatherSystems, liveWeatherLoading: true };
      w.__rerender();
    });
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems = { ...w.__toolData.weatherSystems, liveWeatherLoading: false };
      w.__rerender();
    });
    await page.clock.runFor(3000);
    expect((await state(page)).index).toBe(1);
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    await page.clock.runFor(3000);
    expect((await state(page)).index).toBe(1);
    const play = stage(page).getByRole('button', { name: 'Play timeline', exact: true });
    if (await play.isEnabled()) await play.click();
    expect((await state(page)).playing).toBe(false);
    await stage(page).getByRole('button', { name: 'Next hour', exact: true }).click();
    await expect(selected(page)).toHaveValue('2');
  });

  test('invalidates comparison and autoplay on same-length session import and remount while retaining selected-hour viewing', async ({ page }) => {
    await mount(page, { liveWeatherTimelineIndex: 1 });
    await freezeTimers(page);
    await stageCompare(page).selectOption('0');
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await showInspector(page);
    const session = {
      schema: 'weather-immersive-session-v1', weatherSystems: {
        liveWeather: live, liveWeatherTimeline: points(), liveWeatherTimelineIndex: 2,
        liveWeatherTimelinePlaying: true, immersiveDataSource: 'live', immersiveSceneMode: 'conceptual',
        immersiveTimelineCompareIndex: 1, immersiveTimelineComparison: (await state(page)).comparison,
      },
    };
    await page.locator('#weather-immersive-session-import').setInputFiles({
      name: 'same-length-timeline.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(session)),
    });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    await showStage(page);
    await expect(selected(page)).toHaveValue('2');
    await expect(stageCompare(page)).toHaveValue('');
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    await page.clock.runFor(3000);
    await expect(selected(page)).toHaveValue('2');
    await harness.destroy(page);
    await harness.mount(page, { _threeLoaded: false, weatherSystems: {
      tab: 'immersive', immersiveSceneMode: 'conceptual', immersiveDataSource: 'live', immersiveAudienceMode: 'teacher',
      immersiveStageMode: true,
      liveWeather: live, liveWeatherTimeline: points(), liveWeatherTimelineIndex: 0,
      liveWeatherTimelinePlaying: true, immersiveTimelineCompareIndex: 1,
    } }, undefined, { expectCanvas: false });
    await showStage(page);
    await expect(stageCompare(page)).toHaveValue('');
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    const restored = (await state(page)).index;
    await page.clock.runFor(3000);
    expect((await state(page)).index).toBe(restored);
  });

  test('keeps a stale timer pause deterministic when React replays its functional updater', async ({ page }) => {
    await mount(page, { liveWeatherTimelineIndex: 1 });
    await freezeTimers(page);
    await page.evaluate(() => {
      const w = window as any, original = w.__ctx.setToolData;
      w.__timelineUpdaterReplay = [];
      // React may evaluate a state updater twice with the same previous state
      // and commit the second result. Replay without committing the first result;
      // leave the production updater, refs and timer callback completely intact.
      w.__ctx.setToolData = (value: any) => original(typeof value !== 'function' ? value : (previous: any) => {
        const first = value(previous);
        const second = value(previous);
        w.__timelineUpdaterReplay.push({
          firstPlaying: first?.weatherSystems?.liveWeatherTimelinePlaying,
          secondPlaying: second?.weatherSystems?.liveWeatherTimelinePlaying,
          firstStatus: first?.weatherSystems?.liveTimelineControlStatus,
          secondStatus: second?.weatherSystems?.liveTimelineControlStatus,
        });
        return second;
      });
      w.__rerender();
    });
    await stage(page).getByRole('button', { name: 'Play timeline', exact: true }).click();
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(true);
    await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__timelineUpdaterReplay = [];
      // No render occurs before the already-scheduled timer fires. Its captured
      // session still exists, but the latest retrieval no longer belongs to it.
      w.__toolData.weatherSystems = { ...d,
        liveWeather: { ...d.liveWeather, retrievedAt: '2026-10-29T12:03:00.000Z' } };
    });
    await page.clock.runFor(1450);
    const attempts = await page.evaluate(() => (window as any).__timelineUpdaterReplay
      .filter((entry: any) => /selected hour or retrieval changed/.test(entry.firstStatus || '')));
    expect(attempts.length).toBeGreaterThan(0);
    for (const attempt of attempts) {
      expect(attempt.firstPlaying).toBe(false);
      expect(attempt.secondPlaying).toBe(false);
      expect(attempt.secondStatus).toBe(attempt.firstStatus);
    }
    await expect.poll(() => state(page).then((value) => value.playing)).toBe(false);
    expect((await state(page)).index).toBe(1);
    await page.clock.runFor(3000);
    expect((await state(page)).index).toBe(1);
  });
});
