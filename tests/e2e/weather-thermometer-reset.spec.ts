import { Download, expect, Locator, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
});
// Same UTC/EDT checkpoint and public controls as weather-classroom-reading.spec.ts.
const validUtc = '2026-10-29T18:00:00.000Z';
const validInput = '2026-10-29T18:00';
const originalForecast = {
  schema: 'weather-live-checkpoint-v2', id: 'school-snapshot', location: 'School yard',
  source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75,
  retrievedAt: '2026-10-29T16:01Z', capturedAt: '2026-10-29T16:05Z',
  currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00',
  validTimestamp: Date.parse(validUtc), timezone: 'EDT', utcOffsetSeconds: -14400,
  predicted: { temperature: 24 }, learnerReasoning: 'The afternoon hours warmed after noon.',
  timelineEvidence: 'Keep the original classroom evidence.\n"Quoted evidence" stays.',
};
const secondForecast = { ...originalForecast, id: 'second-school', location: 'Second school yard', latitude: 41 };
const panelFor = (page: Page, id = originalForecast.id) => page.locator('[data-weather-classroom-thermometer][data-weather-classroom-id=' + JSON.stringify(id) + ']');
const value = (panel: Locator, unit = 'C') => panel.getByLabel(`Outdoor thermometer reading (°${unit})`, { exact: true });
const time = (panel: Locator) => panel.getByLabel('Measurement time (UTC)', { exact: true });
const site = (panel: Locator) => panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ });
const unit = (panel: Locator) => panel.getByRole('combobox', { name: 'Thermometer unit', exact: true });
const submit = (panel: Locator) => panel.getByRole('button', { name: /^(Save|Update) thermometer reading$/ });

async function activate(page: Page, control: Locator) {
  await control.focus();
  await expect(control).toBeFocused();
  await page.keyboard.press('Enter');
}
async function openThermometer(panel: Locator) {
  if (!await unit(panel).isVisible()) await panel.locator('summary').click();
}
async function mount(page: Page, saved: any[] = [originalForecast], now = '2026-10-29T18:05:00Z') {
  await page.route('https://**/*', route => route.abort());
  await page.clock.setFixedTime(new Date(now));
  await harness.mount(page, { _threeLoaded: false, weatherSystems: {
    tab: 'forecast', liveForecastCheckpoints: saved,
    observationNote: 'Keep this unrelated notebook draft.\n"Original note".',
    immersiveReflection: 'Keep the existing Weather reflection.',
    immersiveSceneMode: 'geographic', immersiveAudienceMode: 'teacher', immersiveStageMode: false,
  } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const w = window as any, React = w.React, data = w.__toolData, ctx = { ...w.__ctx };
    const cfg = w.StemLab._registry.weatherSystems;
    w.__root.unmount();
    w.__thermometerMounts = [];
    w.__thermometerQueuedUpdates = [];
    w.__queueThermometerUpdates = false;
    let bump: (() => void) | undefined;
    // Reuse the real tab-key bridge pattern from weather-checkpoint-opening.
    // This is the existing harness's state adapter, with no validation logic.
    const apply = (incoming: any) => {
      if (w.__queueThermometerUpdates && typeof incoming === 'function') {
        w.__thermometerQueuedUpdates.push(incoming);
        return;
      }
      const next = typeof incoming === 'function' ? incoming(data) : incoming;
      if (next && next !== data) Object.assign(data, next);
      if (bump) bump();
    };
    w.__flushThermometerUpdates = () => {
      const pending = w.__thermometerQueuedUpdates.splice(0);
      w.__queueThermometerUpdates = false;
      w.ReactDOM.flushSync(() => pending.forEach(apply));
      return pending.length;
    };
    ctx.toolData = ctx.labToolData = data;
    ctx.setToolData = ctx.setLabToolData = apply;
    ctx.update = (bucket: string, key: string, incoming: unknown) => apply({ ...data, [bucket]: { ...data[bucket], [key]: incoming } });
    ctx.updateMulti = (bucket: string, patch: Record<string, unknown>) => apply({ ...data, [bucket]: { ...data[bucket], ...patch } });
    w.__ctx = ctx;
    const modeKey = () => {
      const d = data.weatherSystems || {};
      return 'plugin-' + ['weatherSystems', ctx.stemLabTab || '',
        d.subtool || d.tab || d.mode || d.activeTab || d.activeSubtool || ''].join(':');
    };
    function Weather({ mountKey }: { mountKey: string }) {
      const result = cfg.render(ctx);
      React.useEffect(() => { w.__thermometerMounts.push(mountKey); }, []);
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
  await page.waitForFunction(() => (window as any).__thermometerMounts.length === 1);
  await expect(page.locator('[data-weather-classroom-thermometer]')).toHaveCount(saved.length);
}
async function savedState(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.weatherSystems;
    return JSON.parse(JSON.stringify({ journal: d.liveForecastCheckpoints,
      observationNote: d.observationNote, reflection: d.immersiveReflection }));
  });
}
async function expectDraft(panel: Locator, enteredValue: string, measuredAt = validInput, sameSite = true, enteredUnit = 'C') {
  await expect(unit(panel)).toHaveValue(enteredUnit);
  await expect(value(panel, enteredUnit)).toHaveValue(enteredValue);
  await expect(time(panel)).toHaveValue(measuredAt);
  if (sameSite) await expect(site(panel)).toBeChecked();
  else await expect(site(panel)).not.toBeChecked();
}
async function expectInvalid(page: Page, panel: Locator, field: Locator, message: RegExp) {
  const alert = panel.getByRole('alert');
  await expect(alert).toContainText(message);
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const id = await alert.getAttribute('id');
  expect(id, 'Validation explanation has a usable ID').toBeTruthy();
  const descriptions = (await field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  expect(descriptions).toContain(id);
  expect(await page.evaluate(id => [...document.querySelectorAll('[id]')].filter(node => node.id === id).length, id)).toBe(1);
  for (const description of descriptions) {
    expect(await page.evaluate(id => document.getElementById(id)?.textContent?.trim(), description)).toBeTruthy();
  }
  return id as string;
}
async function expectCleared(panel: Locator, oldId?: string) {
  await expect(panel.getByRole('alert')).toHaveCount(0);
  for (const control of [unit(panel), panel.locator('input[name="enteredValue"]'), time(panel), site(panel)]) {
    await expect(control).not.toHaveAttribute('aria-invalid', 'true');
    if (oldId) expect((await control.getAttribute('aria-describedby') || '').split(/\s+/)).not.toContain(oldId);
  }
}
async function downloadedText(download: Download) {
  const stream = await download.createReadStream(), pieces: Buffer[] = [];
  for await (const piece of stream!) pieces.push(Buffer.from(piece));
  return Buffer.concat(pieces).toString('utf8');
}
async function downloadText(page: Page, buttonName: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  return downloadedText(await pending);
}
async function saveFahrenheit(page: Page, panel: Locator, reading: string) {
  await unit(panel).selectOption('F');
  await value(panel, 'F').fill(reading);
  await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
  await site(panel).check();
  await activate(page, submit(panel));
}

const resetEntry = (panel: Locator) => panel.getByRole('button', { name: /^Reset entry,/ });
const restoreEntry = (panel: Locator) => panel.getByRole('button', { name: /^Restore saved reading,/ });
async function expectRestored(panel: Locator, reading: string, savedUnit = 'F', measuredAt = validInput, sameSite = false) {
  await expectDraft(panel, reading, measuredAt, sameSite, savedUnit);
  await expect(value(panel, savedUnit)).toBeFocused();
  await expect(value(panel, savedUnit)).toHaveAttribute('min', savedUnit === 'F' ? '-148' : '-100');
  await expect(value(panel, savedUnit)).toHaveAttribute('max', savedUnit === 'F' ? '158' : '70');
  await expectCleared(panel);
  await expect(panel.locator('[data-weather-classroom-unit-notice]')).toContainText(/reset|restor/i);
}
async function exportState(page: Page) {
  const payloads = await page.evaluate(() => {
    const w = window as any, d = w.__toolData.weatherSystems, k = w.WeatherSystemsKernel;
    return [k.immersiveLocalWorkspacePayload(d), k.immersiveSessionDownloadPayload(d),
      k.immersiveSessionSharePayload(d, { includeLocation: true }),
      k.immersiveSessionSharePayload(d, { includeLocation: false })].map(payload => JSON.stringify(payload));
  });
  return { payloads, text: await downloadText(page, 'Download live forecast report'),
    csv: await downloadText(page, 'Download live forecast CSV') };
}

test.describe('Weather thermometer reset and saved-entry restoration', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Reset entry clears an unsaved Fahrenheit draft to blank Celsius without saving, including repeated keyboard activation at320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page);
    await page.addStyleTag({ content: '#wrap {width:100%;max-width:1100px;}' });
    const panel = panelFor(page);
    await openThermometer(panel);
    const original = await savedState(page);
    await unit(panel).selectOption('F');
    await value(panel, 'F').fill('75.6');
    await time(panel).fill('2026-10-29T18:01');
    await site(panel).check();
    await expectDraft(panel, '75.6', '2026-10-29T18:01', true, 'F');
    const reset = resetEntry(panel);
    await expect(reset).toHaveAttribute('type', 'button');
    await expect(reset).toHaveAccessibleName(/^Reset entry,.*School yard/);
    await expect(restoreEntry(panel)).toHaveCount(0);
    await reset.scrollIntoViewIfNeeded();
    const box = await reset.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    for (let activation = 0; activation < 2; activation++) {
      await activate(page, reset);
      await expectRestored(panel, '', 'C', '', false);
      await expect(panel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);
      await expect(panel.locator('[data-weather-classroom-result]')).toHaveCount(0);
      expect(await savedState(page)).toEqual(original);
    }
    expect((await savedState(page)).journal[0].classroomReading).toBeUndefined();
  });

  test('Restore saved reading repairs unit/time/site drafts without changing saved67F or consuming correction Undo back from68F', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    await saveFahrenheit(page, panel, '67');
    const saved67 = await savedState(page);
    const undo = panel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(undo).toBeVisible();
    await unit(panel).selectOption('C');
    await value(panel).fill('22');
    await time(panel).fill('2026-10-29T18:01');
    await site(panel).uncheck();
    await expect(restoreEntry(panel)).toHaveAttribute('type', 'button');
    await expect(restoreEntry(panel)).toHaveAccessibleName(/^Restore saved reading,.*School yard/);
    await activate(page, restoreEntry(panel));
    await expectRestored(panel, '67');
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    await expect(undo).toBeVisible();
    expect(await savedState(page)).toEqual(saved67);

    await saveFahrenheit(page, panel, '68');
    const saved68 = await savedState(page);
    expect(saved68.journal[0].classroomReading).toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    await unit(panel).selectOption('C');
    await value(panel).fill('23');
    await time(panel).fill('2026-10-29T18:02');
    await site(panel).uncheck();
    const beforeExport = await exportState(page);
    await activate(page, restoreEntry(panel));
    await expectRestored(panel, '68');
    await expect(undo).toBeVisible();
    expect(await savedState(page)).toEqual(saved68);
    expect(await exportState(page)).toEqual(beforeExport);
    // Export controls moved focus; the latest67→68 receipt remains useful.
    await activate(page, undo);
    await expect(value(panel, 'F')).toBeFocused();
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    expect(await savedState(page)).toEqual(saved67);
  });

  test('a legacy zero restores without schema conversion and resetting cardB preserves cardA feedback, drafts and useful Undo', async ({ page }) => {
    const legacy = { schema: 'weather-classroom-temperature-v1', temperatureC: 0, sameSite: true,
      measuredAt: validUtc, recordedAt: '2026-10-29T18:04:00.000Z' };
    await mount(page, [originalForecast, { ...secondForecast, classroomReading: legacy }]);
    const a = panelFor(page), b = panelFor(page, secondForecast.id);
    await openThermometer(a); await openThermometer(b);
    await saveFahrenheit(page, a, '67');
    const original = await savedState(page);
    const undoA = a.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await time(a).fill('2026-10-29T18:01');
    await site(a).check();
    await value(a, 'F').fill('159');
    await activate(page, submit(a));
    const aError = await expectInvalid(page, a, value(a, 'F'), /temperature.*158.*°F/);
    await unit(b).selectOption('F');
    await value(b, 'F').fill('75');
    await time(b).fill('2026-10-29T18:02');
    await site(b).uncheck();
    await expect(page.getByRole('button', { name: /^Restore saved reading,/ })).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Restore saved reading,.*Second school yard/ })).toHaveCount(1);
    await expect(restoreEntry(a)).toHaveAccessibleName(/^Restore saved reading,.*for School yard,/);
    await expect(restoreEntry(b)).toHaveAccessibleName(/^Restore saved reading,.*for Second school yard,/);
    await activate(page, restoreEntry(b));
    await expectRestored(b, '0', 'C');
    await expect(b.locator('[data-weather-classroom-result]')).toContainText('Thermometer 0 °C');
    await expect(a.getByRole('alert')).toHaveAttribute('id', aError);
    await expect(value(a, 'F')).toHaveAttribute('aria-invalid', 'true');
    await expectDraft(a, '159', '2026-10-29T18:01', true, 'F');
    await expect(undoA).toBeVisible();
    expect(await savedState(page)).toEqual(original);
    expect((await savedState(page)).journal.find((entry: any) => entry.id === secondForecast.id).classroomReading).toEqual(legacy);
    // Actually consume A's old receipt to prove B did not replace or retire it.
    await activate(page, undoA);
    const restored = await savedState(page);
    expect(restored.journal.find((entry: any) => entry.id === originalForecast.id).classroomReading).toBeUndefined();
    expect(restored.journal.find((entry: any) => entry.id === secondForecast.id).classroomReading).toEqual(legacy);
    await expect(b.locator('[data-weather-classroom-result]')).toContainText('Thermometer 0 °C');
  });

  test('Reset retires a queued invalid attempt before replay and unrelated rerenders preserve the restored Fahrenheit fields', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    await saveFahrenheit(page, panel, '67');
    const saved67 = await savedState(page);
    await unit(panel).selectOption('C');
    await value(panel).fill('71');
    await time(panel).fill('2026-10-29T18:01');
    await site(panel).check();
    await page.evaluate(() => { (window as any).__queueThermometerUpdates = true; });
    await activate(page, submit(panel));
    await expect.poll(() => page.evaluate(() => (window as any).__thermometerQueuedUpdates.length)).toBe(1);
    await page.evaluate(() => { (window as any).__queueThermometerUpdates = false; });
    await activate(page, restoreEntry(panel));
    await expectRestored(panel, '67');
    expect(await savedState(page)).toEqual(saved67);
    expect(await page.evaluate(() => (window as any).__flushThermometerUpdates())).toBe(1);
    await expectRestored(panel, '67');
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    await expect(panel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toBeVisible();
    expect(await savedState(page)).toEqual(saved67);
    await page.evaluate(() => (window as any).__rerender());
    await expectRestored(panel, '67');
    await expect(value(panel, 'C')).toHaveCount(0);
    expect(await savedState(page)).toEqual(saved67);
    expect(await page.evaluate(() => (window as any).__thermometerMounts)).toEqual(['plugin-weatherSystems:explore:forecast']);
  });
});

