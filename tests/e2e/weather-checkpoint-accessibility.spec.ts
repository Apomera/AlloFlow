import { expect, Page, test } from '@playwright/test';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const valid = '2026-10-29T14:00:00.000Z';
const laterValid = '2026-10-29T15:00:00.000Z';
const retrieval = '2026-10-29T15:05:00.000Z';
const measures = { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 350, weatherCode: 95, condition: 'Thunderstorms' };
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function checkpoint(index = 0, patch: Record<string, unknown> = {}) {
  return freeze({
    schema: 'weather-live-checkpoint-v2', id: 'opaque-school-snapshot-' + index,
    location: 'Synthetic school yard', latitude: 40, longitude: -75,
    source: 'Open-Meteo', sourceKind: 'model', retrievedAt: `2026-10-29T12:0${index + 1}:00.000Z`,
    capturedAt: '2026-10-29T12:05:00.000Z', currentDataAt: '2026-10-29T12:00:00.000Z',
    validAt: valid, validTimestamp: Date.parse(valid), timezone: 'UTC', utcOffsetSeconds: 0,
    pressureType: 'surface', precipitationIntervalSeconds: 3600, predicted: { ...measures },
    learnerReasoning: `Keep original explanation ${index}.\n"Quoted evidence" stays.`,
    timelineEvidence: `Original timeline evidence ${index}.`,
    classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
      temperatureC: (67 - 32) * 5 / 9, measuredAt: valid,
      recordedAt: '2026-10-29T14:05:00.000Z', sameSite: true,
    }, ...patch,
  });
}
const loaded = freeze({
  ...measures, label: 'Synthetic school yard', latitude: 40, longitude: -75,
  source: 'Open-Meteo', sourceKind: 'model', observedAt: laterValid, retrievedAt: retrieval,
  timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 900,
});
function point(time = valid) {
  return freeze({
    ...measures, time, role: time === valid ? 'earlier' : 'current', offsetHours: time === valid ? -1 : 0,
    utcOffsetSeconds: 0, source: 'Open-Meteo', sourceKind: 'model', retrievedAt: retrieval,
    pressureType: 'surface', precipitationIntervalSeconds: 3600,
    temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 10, weatherCode: 61,
  });
}
const studio = (page: Page) => page.locator('[data-weather-forecast-verification-studio]');
const list = (page: Page) => studio(page).getByRole('list', { name: 'Saved live forecast checkpoints', exact: true });
const snapshots = (page: Page) => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
const utcName = (value: string) => value.slice(0, 16).replace('T', ' ') + ' UTC';
function context(saved: ReturnType<typeof checkpoint>, position: number, total = 2) {
  return `saved forecast ${position} of ${total} for ${saved.location}, valid ${utcName(saved.validAt)}, original retrieval ${utcName(saved.retrievedAt)}`;
}
const named = (page: Page, action: string, label: string) => studio(page).getByRole('button', { name: action + ', ' + label, exact: true });
const form = (page: Page, label: string) => studio(page).getByRole('form', { name: 'Thermometer reading, ' + label, exact: true });
// Playwright's implicit-role table omits native SUMMARY; verify its computed name explicitly.
const thermometerSummary = (page: Page, label: string) => studio(page).locator('summary[aria-label=' + JSON.stringify('Classroom thermometer check, ' + label) + ']');
async function keyboardActivate(page: Page, target: ReturnType<typeof named>) {
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
}
async function mount(page: Page, saved = [checkpoint(0), checkpoint(1)], timeline = [point(), point(laterValid)], dark = false) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-10-29T15:06:00Z'));
  // Third mount argument is a ready-expression string; ctx overrides do not go there.
  await harness.mount(page, { _threeLoaded: false, weatherSystems: {
    tab: 'forecast', liveWeather: loaded, liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 0,
    liveForecastCheckpoints: saved, immersiveStageMode: false, immersiveSceneMode: 'conceptual',
    immersiveDataSource: 'live', immersiveAudienceMode: 'teacher',
  } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width:100%; max-width:1280px; }' });
  if (dark) await page.evaluate(() => {
    const w = window as any;
    document.documentElement.classList.add('dark');
    w.__ctx.isDark = true;
    w.__rerender();
  });
  await expect(studio(page)).toBeVisible();
}
async function sessionSaved(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    return JSON.parse(JSON.stringify(w.WeatherSystemsKernel.immersiveSessionDownloadPayload(w.__toolData.weatherSystems))).weatherSystems.liveForecastCheckpoints;
  });
}



const localWorkspaceKey = 'weather-systems-immersive-workspace-v1';
const futureValid = '2026-10-29T16:00:00.000Z';
const devicePlace = freeze({
  schema: 'weather-saved-place-v1', id: '40|-75', name: 'Device school yard',
  label: 'Device school yard, Pennsylvania', latitude: 40, longitude: -75,
  place: { name: 'School locality', admin1: 'Pennsylvania', country: 'United States', country_code: 'US' },
});
function remountTimeline() {
  return [point(), point(laterValid), freeze({ ...point(futureValid), role: 'forecast', offsetHours: 1 })];
}

// Reproduce stem_lab_module's tab-dependent _modeSig key, using the real registered
// Weather renderer and React hooks. Everything below belongs only to this page.
async function mountKeyedWeather(page: Page, saved: ReturnType<typeof checkpoint>[], options: {
  current?: Record<string, unknown>; device?: Record<string, unknown>; restoreOnMount?: boolean;
} = {}) {
  await mount(page, saved, remountTimeline());
  await page.evaluate(({ options, storageKey }) => {
    const w = window as any, React = w.React;
    const data = w.__toolData, cfg = w.StemLab._registry.weatherSystems;
    const ctx = { ...w.__ctx };
    w.__root.unmount();
    data.weatherSystems = { ...data.weatherSystems, ...(options.current || {}) };
    const deviceData = { ...data.weatherSystems, ...(options.device || {}) };
    w.__weatherStaleDevicePayload = JSON.stringify(w.WeatherSystemsKernel.immersiveLocalWorkspacePayload(deviceData));
    if (options.restoreOnMount) localStorage.setItem(storageKey, w.__weatherStaleDevicePayload);
    else localStorage.removeItem(storageKey);
    let bump: (() => void) | undefined;
    const apply = (value: any) => {
      const next = typeof value === 'function' ? value(data) : value;
      if (next && next !== data) Object.assign(data, next);
      if (bump) bump();
    };
    ctx.toolData = data;
    ctx.labToolData = data;
    ctx.setToolData = ctx.setLabToolData = apply;
    ctx.update = (bucket: string, key: string, value: unknown) => apply({ ...data, [bucket]: { ...data[bucket], [key]: value } });
    ctx.updateMulti = (bucket: string, patch: Record<string, unknown>) => apply({ ...data, [bucket]: { ...data[bucket], ...patch } });
    w.__ctx = ctx;
    w.__weatherKeyedMounts = [];
    const modeKey = () => {
      const weather = data.weatherSystems || {};
      return 'plugin-' + ['weatherSystems', ctx.stemLabTab || '',
        weather.subtool || weather.tab || weather.mode || weather.activeTab || weather.activeSubtool || ''].join(':');
    };
    function WeatherChild({ mountKey }: { mountKey: string }) {
      const output = cfg.render(ctx);
      // This effect follows Weather's hydration effect; a receipt proves that
      // the fresh fiber really mounted before the state assertions run.
      React.useEffect(() => { w.__weatherKeyedMounts.push(mountKey); }, []);
      return output;
    }
    function Host() {
      const [, setTick] = React.useState(0);
      bump = () => setTick((tick: number) => tick + 1);
      const key = modeKey();
      return React.createElement(WeatherChild, { key, mountKey: key });
    }
    w.__rerender = () => { if (bump) bump(); };
    w.__root = w.ReactDOM.createRoot(document.getElementById('wrap'));
    w.ReactDOM.flushSync(() => w.__root.render(React.createElement(Host)));
  }, { options, storageKey: localWorkspaceKey });
  await page.waitForFunction(() => (window as any).__weatherKeyedMounts?.length >= 1);
}

async function keyedState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, d = w.__toolData.weatherSystems;
    return {
      journal: d.liveForecastCheckpoints, live: d.liveWeather, timeline: d.liveWeatherTimeline,
      index: d.liveWeatherTimelineIndex, tab: d.tab, scene: d.immersiveSceneMode,
      places: d.savedLivePlaces, reflection: d.immersiveReflection,
      presenter: d.immersivePresenterMode, simHour: d.simHour,
      mounts: w.__weatherKeyedMounts,
    };
  });
}

// Both real native clicks run in one browser task. The 420ms device autosave
// cannot execute between removal and the tab-changing action; no sleep masks it.
async function removeAndRemount(page: Page, removeName: string, openName?: string) {
  return page.evaluate(({ storageKey, removeName, openName }) => {
    const w = window as any;
    localStorage.setItem(storageKey, w.__weatherStaleDevicePayload);
    const storedBefore = localStorage.getItem(storageKey);
    const clickNamedButton = (name: string) => {
      const target = [...document.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === name);
      if (!target) throw new Error('Missing contextual button: ' + name);
      w.ReactDOM.flushSync(() => target.click());
    };
    clickNamedButton(removeName);
    const afterRemoval = JSON.parse(JSON.stringify(w.__toolData.weatherSystems.liveForecastCheckpoints));
    if (openName) clickNamedButton(openName);
    else {
      const tab = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((node) => node.textContent?.includes('Immersive 3D'));
      if (!tab) throw new Error('Missing Immersive 3D tab');
      w.ReactDOM.flushSync(() => tab.click());
    }
    return { afterRemoval, deviceUnchangedWithinTask: localStorage.getItem(storageKey) === storedBefore };
  }, { storageKey: localWorkspaceKey, removeName, openName });
}

test.describe('Weather saved forecast contextual accessibility', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('distinguishes same-site same-hour retrievals and keyboard-removes only the named snapshot with Undo', async ({ page }) => {
    const saved = [checkpoint(0), checkpoint(1)];
    await mount(page, saved);
    const older = context(saved[0], 2), newer = context(saved[1], 1);
    await expect(list(page).getByRole('listitem')).toHaveCount(2);
    for (const label of [older, newer]) {
      await expect(named(page, 'Open checkpoint hour', label)).toHaveText('Open checkpoint hour');
      await expect(named(page, 'Remove', label)).toHaveText('Remove');
      const summary = thermometerSummary(page, label);
      await expect(summary).toHaveText('Classroom thermometer check');
      await expect(summary).toHaveAccessibleName('Classroom thermometer check, ' + label);
      await keyboardActivate(page, summary);
      await expect(form(page, label)).toBeVisible();
    }
    const actionNames = await list(page).getByRole('button', { name: /^Remove, saved forecast/ }).evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label')));
    expect(new Set(actionNames).size).toBe(2);
    expect(actionNames.join('\n')).toContain('original retrieval 2026-10-29 12:01 UTC');
    expect(actionNames.join('\n')).toContain('original retrieval 2026-10-29 12:02 UTC');
    expect(actionNames.join('\n')).not.toContain('opaque-school-snapshot');
    expect(await snapshots(page)).toEqual(saved);

    await keyboardActivate(page, named(page, 'Remove', older));
    expect(await snapshots(page)).toEqual([saved[1]]);
    const undo = studio(page).getByRole('button', { name: 'Undo remove forecast snapshot', exact: true });
    await expect(undo).toBeFocused();
    await expect(named(page, 'Remove', context(saved[1], 1, 1))).toBeVisible();
    await keyboardActivate(page, undo);
    expect(await snapshots(page)).toEqual([saved[1], saved[0]]);
    await expect(named(page, 'Remove', context(saved[0], 1))).toBeVisible();
    await expect(named(page, 'Remove', context(saved[1], 2))).toBeVisible();
  });

  test('opens the specifically named valid hour in the loaded latest timeline using the keyboard', async ({ page }) => {
    const later = checkpoint(1, { validAt: laterValid, validTimestamp: Date.parse(laterValid), classroomReading: undefined });
    const saved = [checkpoint(0), later];
    await mount(page, saved);
    await keyboardActivate(page, named(page, 'Open checkpoint hour', context(later, 1)));
    await expect.poll(() => page.evaluate(() => {
      const d = (window as any).__toolData.weatherSystems;
      return { tab: d.tab, source: d.immersiveDataSource, scene: d.immersiveSceneMode,
        index: d.liveWeatherTimelineIndex, time: d.liveWeatherTimeline[d.liveWeatherTimelineIndex]?.time };
    })).toEqual({ tab: 'immersive', source: 'live', scene: 'geographic', index: 1, time: laterValid });
    expect(await snapshots(page)).toEqual(JSON.parse(JSON.stringify(saved)));
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await keyboardActivate(page, named(page, 'Open checkpoint hour', context(saved[0], 2)));
    await expect.poll(() => page.evaluate(() => (window as any).__toolData.weatherSystems.liveWeatherTimelineIndex)).toBe(0);
    expect(await snapshots(page)).toEqual(JSON.parse(JSON.stringify(saved)));
  });

  test('edits only the named 67°F form, preserves the other snapshot and stored schema, then undoes the correction', async ({ page }) => {
    const saved = [checkpoint(0), checkpoint(1)];
    await mount(page, saved);
    const label = context(saved[0], 2), other = context(saved[1], 1);
    const summary = thermometerSummary(page, label);
    await expect(summary).toHaveAccessibleName('Classroom thermometer check, ' + label);
    await keyboardActivate(page, summary);
    const target = form(page, label);
    await expect(target).toBeVisible();
    await expect(form(page, other)).toBeHidden();
    const unit = target.getByRole('combobox', { name: 'Thermometer unit', exact: true });
    const fahrenheit = target.getByLabel('Outdoor thermometer reading (°F)', { exact: true });
    await expect(unit).toHaveValue('F');
    await expect(fahrenheit).toHaveValue('67');
    await unit.focus();
    await page.keyboard.press('Tab');
    await expect(fahrenheit).toBeFocused();
    await fahrenheit.fill('68');
    await expect(target.getByLabel('Measurement time (UTC)', { exact: true })).toHaveValue('2026-10-29T14:00');
    await target.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
    await keyboardActivate(page, target.getByRole('button', { name: 'Update thermometer reading', exact: true }));
    const changed = await snapshots(page);
    expect(changed[1]).toEqual(saved[1]);
    expect(changed[0]).toEqual({ ...saved[0], classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 68, enteredUnit: 'F', temperatureC: 20,
      measuredAt: valid, recordedAt: '2026-10-29T15:06:00.000Z', sameSite: true,
    } });
    expect(await sessionSaved(page)).toEqual(changed);
    const serialized = JSON.stringify(await sessionSaved(page));
    expect(serialized).not.toContain('aria-label');
    expect(serialized).not.toContain('saved forecast 2 of 2');
    await expect(fahrenheit).toHaveValue('68');
    await keyboardActivate(page, target.locator('..').getByRole('button', { name: 'Undo thermometer change', exact: true }));
    expect(await snapshots(page)).toEqual(saved);
    expect(await sessionSaved(page)).toEqual(saved);
    await expect(fahrenheit).toHaveValue('67');
    await expect(fahrenheit).toBeFocused();

    // Installed axe is scoped to the changed studio and naming/label semantics.
    await page.addScriptTag({ path: join(process.cwd(), 'node_modules/axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-weather-forecast-verification-studio]'), {
        runOnly: { type: 'rule', values: ['button-name', 'label', 'aria-valid-attr-value', 'landmark-unique'] },
      });
      return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }));
    });
    expect(violations).toEqual([]);
  });

  test('keeps identical legacy metadata distinguishable by current position in a narrow real dark context', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const original = checkpoint(0);
    // A genuine legacy snapshot has no numeric target timestamp or valid saved thermometer reading.
    const { validTimestamp, classroomReading, ...legacyFields } = original;
    const saved = [freeze({ ...legacyFields, id: 'legacy-a' }), freeze({ ...legacyFields, id: 'legacy-b' })];
    await mount(page, saved as ReturnType<typeof checkpoint>[], [point(), point(laterValid)], true);
    expect(await page.evaluate(() => (window as any).__ctx.isDark)).toBe(true);
    // Legacy omission keeps model comparison unavailable, while stored validAt still names the hour.
    await expect(list(page).getByRole('listitem').first()).toHaveClass(/bg-amber-950\/20/);
    const first = context(original, 1), second = context(original, 2);
    await expect(named(page, 'Open checkpoint hour', first)).toBeVisible();
    await expect(named(page, 'Open checkpoint hour', second)).toBeVisible();
    const summary = thermometerSummary(page, first);
    await expect(summary).toHaveAccessibleName('Classroom thermometer check, ' + first);
    await keyboardActivate(page, summary);
    const details = summary.locator('..');
    await expect(details).toHaveJSProperty('open', true);
    await expect(details.getByText('Save a future temperature forecast with a recorded location and valid time to start a thermometer check.', { exact: true })).toBeVisible();
    await expect(details.locator('form')).toHaveCount(0);
    await keyboardActivate(page, named(page, 'Remove', second));
    expect(await snapshots(page)).toEqual([saved[1]]);
    await expect(named(page, 'Remove', context(original, 1, 1))).toBeVisible();
    await keyboardActivate(page, studio(page).getByRole('button', { name: 'Undo remove forecast snapshot', exact: true }));
    expect(await snapshots(page)).toEqual([saved[1], saved[0]]);
    await expect(named(page, 'Remove', first)).toBeVisible();
    await expect(named(page, 'Remove', second)).toBeVisible();
    const overflow = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(overflow.content).toBeLessThanOrEqual(overflow.viewport + 1);
    const button = named(page, 'Remove', second);
    await button.focus();
    await expect(button).toBeFocused();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  });


  test('fills missing device places while preserving the current journal and defined null, false and zero across a keyed mount', async ({ page }) => {
    const saved = [checkpoint(0), checkpoint(1)];
    const stale = [checkpoint(0), checkpoint(1), checkpoint(2)];
    await mountKeyedWeather(page, saved, {
      current: { savedLivePlaces: undefined, immersiveReflection: null, immersivePresenterMode: false, simHour: 0, liveWeatherTimelineIndex: 0 },
      device: { liveForecastCheckpoints: stale, savedLivePlaces: [devicePlace], immersiveReflection: 'Old device reflection', immersivePresenterMode: true, simHour: 12, liveWeatherTimelineIndex: 2 },
      restoreOnMount: true,
    });
    const state = await keyedState(page);
    expect(state.journal).toEqual(saved);
    expect(state.live).toEqual(loaded);
    expect(state.timeline).toEqual(remountTimeline());
    expect(state.index).toBe(0);
    expect(state.places).toEqual([devicePlace]);
    expect(state.reflection).toBeNull();
    expect(state.presenter).toBe(false);
    expect(state.simHour).toBe(0);
    expect(state.mounts).toEqual(['plugin-weatherSystems:explore:forecast']);
    await expect(list(page).getByRole('listitem')).toHaveCount(2);
    await expect(named(page, 'Remove', context(saved[0], 2))).toBeVisible();
    await expect(named(page, 'Remove', context(saved[1], 1))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load saved place Device school yard', exact: true })).toBeVisible();
  });

  test('immediate removal and Open preserve the remaining snapshot and future index through the actual tab-key remount', async ({ page }) => {
    const future = checkpoint(1, { validAt: futureValid, validTimestamp: Date.parse(futureValid), classroomReading: undefined });
    const saved = [checkpoint(0), future];
    await mountKeyedWeather(page, saved, { device: {
      liveForecastCheckpoints: [checkpoint(0), future, checkpoint(2)], liveWeatherTimelineIndex: 0,
    } });
    const action = await removeAndRemount(page, 'Remove, ' + context(saved[0], 2), 'Open checkpoint hour, ' + context(future, 1, 1));
    expect(action.afterRemoval).toEqual([JSON.parse(JSON.stringify(future))]);
    expect(action.deviceUnchangedWithinTask).toBe(true);
    await page.waitForFunction(() => (window as any).__weatherKeyedMounts?.length >= 2);
    const state = await keyedState(page);
    expect(state.journal).toEqual([JSON.parse(JSON.stringify(future))]);
    expect(state.timeline).toEqual(remountTimeline());
    expect(state.live).toEqual(loaded);
    expect({ tab: state.tab, scene: state.scene, index: state.index, time: state.timeline[state.index].time })
      .toEqual({ tab: 'immersive', scene: 'geographic', index: 2, time: futureValid });
    expect(state.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect(list(page).getByRole('listitem')).toHaveCount(1);
    await expect(named(page, 'Remove', context(future, 1, 1))).toBeVisible();
    expect(await snapshots(page)).toEqual([JSON.parse(JSON.stringify(future))]);
  });

  test('an explicitly emptied journal stays empty after immediate final removal and keyed tab remount', async ({ page }) => {
    const saved = [checkpoint(0)];
    await mountKeyedWeather(page, saved, { device: {
      liveForecastCheckpoints: [checkpoint(0), checkpoint(1), checkpoint(2)], liveWeatherTimelineIndex: 2,
    } });
    const action = await removeAndRemount(page, 'Remove, ' + context(saved[0], 1, 1));
    expect(action.afterRemoval).toEqual([]);
    expect(action.deviceUnchangedWithinTask).toBe(true);
    await page.waitForFunction(() => (window as any).__weatherKeyedMounts?.length >= 2);
    const state = await keyedState(page);
    expect(state.journal).toEqual([]);
    expect(state.live).toEqual(loaded);
    expect(state.timeline).toEqual(remountTimeline());
    expect(state.index).toBe(0);
    expect(state.mounts).toEqual(['plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:immersive']);
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect(studio(page)).toBeVisible();
    await expect(studio(page).getByRole('button', { name: /^Remove, saved forecast/ })).toHaveCount(0);
    expect(await snapshots(page)).toEqual([]);
  });
});
