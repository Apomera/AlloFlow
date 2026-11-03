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


const hintSelectors = {
  unit: '[data-weather-classroom-unit-notice]', value: '[data-weather-classroom-value-help]',
  time: '[data-weather-classroom-time-help]', site: '[data-weather-classroom-site-help]',
};
async function hintAssociations(page: Page, panel: Locator, invalidField?: string, errorId?: string) {
  const ids: Record<string, string> = {};
  for (const [name, selector] of Object.entries(hintSelectors)) {
    const hint = panel.locator(selector);
    await expect(hint).toHaveCount(1);
    await expect(hint).toBeVisible();
    ids[name] = (await hint.getAttribute('id'))!;
    expect(ids[name]).toBeTruthy();
    expect(ids[name]).toMatch(new RegExp('-' + name + '$'));
    expect(await page.evaluate(id => [...document.querySelectorAll('[id]')].filter(node => node.id === id).length, ids[name])).toBe(1);
  }
  expect(new Set(Object.values(ids)).size).toBe(4);
  const fields: Record<string, { control: Locator, permanent: string[] }> = {
    unit: { control: unit(panel), permanent: [ids.unit] },
    value: { control: panel.locator('input[name="enteredValue"]'), permanent: [ids.value, ids.unit] },
    time: { control: time(panel), permanent: [ids.time] },
    site: { control: site(panel), permanent: [ids.site] },
  };
  const localIds = await panel.locator('[id]').evaluateAll(nodes => nodes.map(node => node.id));
  for (const [name, { control, permanent }] of Object.entries(fields)) {
    const expected = name === invalidField ? [...permanent, errorId!] : permanent;
    const actual = (await control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    expect(actual, name + ' retains exactly its permanent descriptions and current error').toEqual(expected);
    expect(new Set(actual).size).toBe(actual.length);
    for (const id of actual) {
      expect(localIds, 'description belongs to this checkpoint card').toContain(id);
      expect(await page.evaluate(id => [...document.querySelectorAll('[id]')].filter(node => node.id === id).length, id)).toBe(1);
    }
  }
  return ids;
}
async function expectRangeDescription(panel: Locator, enteredUnit = 'C') {
  const range = enteredUnit === 'F' ? /−148 to 158 °F.*one decimal place/ : /−100 to 70 °C.*one decimal place/;
  await expect(panel.locator(hintSelectors.value)).toContainText(range);
  await expect(value(panel, enteredUnit)).toHaveAccessibleDescription(range);
}
async function expectContextDescriptions(panel: Locator, location: string, latitude: number) {
  await expect(time(panel)).toHaveAccessibleDescription(/Target measurement time \(UTC\): 2026-10-29T18:00:00\.000Z\. Use this time only when you took the reading at the displayed forecast time\./);
  await expect(panel.locator(hintSelectors.time)).toContainText(validUtc);
  await expect(site(panel)).toHaveAccessibleDescription(new RegExp('Take an outdoor thermometer reading at ' + location + ' \\(' + latitude + ', -75\\)\\.'));
  await expect(site(panel)).toHaveAccessibleDescription(/Target time in UTC is 2026-10-29T18:00:00\.000Z\./);
}

test.describe('Weather thermometer permanent accessible guidance', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('range and unit descriptions track native unit changes and Restore while saved Fahrenheit data, exports and useful Undo stay exact', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    const originalIds = await hintAssociations(page, panel);
    await expectRangeDescription(panel);
    await expectContextDescriptions(panel, 'School yard', 40);
    await expect(unit(panel)).toHaveAccessibleDescription(/Changing the unit clears the unsaved reading/);
    await unit(panel).selectOption('F');
    await expectRangeDescription(panel, 'F');
    await expect(unit(panel)).toHaveAccessibleDescription(/Unit changed.*°F/);
    await expect(value(panel, 'F')).toHaveAccessibleDescription(/Unit changed.*°F/);
    expect(await hintAssociations(page, panel)).toEqual(originalIds);

    await saveFahrenheit(page, panel, '67');
    const saved67 = await savedState(page);
    await saveFahrenheit(page, panel, '68');
    const saved68 = await savedState(page), exported68 = await exportState(page);
    expect(saved68.journal[0].classroomReading).toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    const undo = panel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(undo).toBeVisible();
    await unit(panel).selectOption('C');
    await expectRangeDescription(panel);
    await expect(value(panel)).toHaveAccessibleDescription(/Unit changed.*°C/);
    await value(panel).fill('22.5');
    await time(panel).fill('2026-10-29T18:01');
    await site(panel).check();
    await activate(page, restoreEntry(panel));
    await expectRestored(panel, '68');
    await expectRangeDescription(panel, 'F');
    await expect(value(panel, 'F')).toHaveAccessibleDescription(/Saved reading restored.*Unsubmitted edits discarded.*saved reading and Undo are unchanged/);
    await expect(unit(panel)).toHaveAccessibleDescription(/Saved reading restored/);
    await expectContextDescriptions(panel, 'School yard', 40);
    expect(await hintAssociations(page, panel)).toEqual(originalIds);
    expect(await savedState(page)).toEqual(saved68);
    expect(await exportState(page)).toEqual(exported68);
    await expect(undo).toBeVisible();
    await activate(page, undo);
    expect(await savedState(page)).toEqual(saved67);
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    await expectRangeDescription(panel, 'F');
    expect(await hintAssociations(page, panel)).toEqual(originalIds);
  });

  test('site, value and UTC validation append only the alert ID and edits remove only that ID while permanent guidance and saved data remain', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    await saveFahrenheit(page, panel, '67');
    const saved67 = await savedState(page), exported67 = await exportState(page);
    const ids = await hintAssociations(page, panel);
    await site(panel).uncheck();
    await activate(page, submit(panel));
    const siteError = await expectInvalid(page, panel, site(panel), /Confirm.*saved forecast site/);
    expect(await hintAssociations(page, panel, 'site', siteError)).toEqual(ids);
    await expect(site(panel)).toHaveAccessibleDescription(/School yard.*\(40, -75\).*Confirm.*saved forecast site/);
    await site(panel).check();
    await expectCleared(panel, siteError);
    expect(await hintAssociations(page, panel)).toEqual(ids);

    await value(panel, 'F').fill('159');
    await activate(page, submit(panel));
    const valueError = await expectInvalid(page, panel, value(panel, 'F'), /temperature.*158.*°F/);
    expect(await hintAssociations(page, panel, 'value', valueError)).toEqual(ids);
    await expectRangeDescription(panel, 'F');
    await value(panel, 'F').fill('67');
    await expectCleared(panel, valueError);
    expect(await hintAssociations(page, panel)).toEqual(ids);

    await time(panel).fill('2026-10-29T18:01');
    await activate(page, submit(panel));
    const timeError = await expectInvalid(page, panel, time(panel), /must match.*UTC/);
    expect(await hintAssociations(page, panel, 'time', timeError)).toEqual(ids);
    await expectContextDescriptions(panel, 'School yard', 40);
    await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
    await expectCleared(panel, timeError);
    expect(await hintAssociations(page, panel)).toEqual(ids);
    await expectDraft(panel, '67', validInput, true, 'F');
    expect(await savedState(page)).toEqual(saved67);
    expect(await exportState(page)).toEqual(exported67);
    await expect(panel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toBeVisible();
  });

  test('two cards resolve every description once inside their own card and resetting an empty card preserves the other card error, drafts and Undo', async ({ page }) => {
    await mount(page, [originalForecast, secondForecast]);
    const a = panelFor(page), b = panelFor(page, secondForecast.id);
    await openThermometer(a); await openThermometer(b);
    const initial = await savedState(page);
    await saveFahrenheit(page, a, '67');
    const saved67 = await savedState(page), exported67 = await exportState(page);
    const aIds = await hintAssociations(page, a), bIds = await hintAssociations(page, b);
    expect(new Set([...Object.values(aIds), ...Object.values(bIds)]).size).toBe(8);
    await expectContextDescriptions(a, 'School yard', 40);
    await expectContextDescriptions(b, 'Second school yard', 41);
    await value(a, 'F').fill('159');
    await time(a).fill('2026-10-29T18:01');
    await site(a).check();
    await activate(page, submit(a));
    const aError = await expectInvalid(page, a, value(a, 'F'), /temperature.*158.*°F/);
    expect(await hintAssociations(page, a, 'value', aError)).toEqual(aIds);

    await unit(b).selectOption('F');
    await expectRangeDescription(b, 'F');
    await value(b, 'F').fill('75.6');
    await time(b).fill('2026-10-29T18:02');
    await site(b).check();
    expect(await hintAssociations(page, b)).toEqual(bIds);
    await activate(page, resetEntry(b));
    await expectRestored(b, '', 'C', '', false);
    await expectRangeDescription(b);
    await expect(value(b)).toHaveAccessibleDescription(/Entry reset.*Unsubmitted edits discarded.*saved forecasts and Undo are unchanged/);
    await expect(unit(b)).toHaveAccessibleDescription(/Entry reset/);
    expect(await hintAssociations(page, b)).toEqual(bIds);
    await expectContextDescriptions(b, 'Second school yard', 41);
    await expect(a.getByRole('alert')).toHaveAttribute('id', aError);
    await expectDraft(a, '159', '2026-10-29T18:01', true, 'F');
    expect(await hintAssociations(page, a, 'value', aError)).toEqual(aIds);
    await page.evaluate(() => (window as any).__rerender());
    expect(await hintAssociations(page, a, 'value', aError)).toEqual(aIds);
    expect(await hintAssociations(page, b)).toEqual(bIds);
    await expect(value(b)).toBeFocused();
    expect(await savedState(page)).toEqual(saved67);
    expect(await exportState(page)).toEqual(exported67);
    const undoA = a.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(undoA).toBeVisible();
    await activate(page, undoA);
    expect(await savedState(page)).toEqual(initial);
    expect(await hintAssociations(page, a)).toEqual(aIds);
    expect(await hintAssociations(page, b)).toEqual(bIds);
  });
});
