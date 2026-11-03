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
async function mount(page: Page, saved = [originalForecast], now = '2026-10-29T18:05:00Z') {
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
    let bump: (() => void) | undefined;
    // Reuse the real tab-key bridge pattern from weather-checkpoint-opening.
    // This is the existing harness's state adapter, with no validation logic.
    const apply = (incoming: any) => {
      const next = typeof incoming === 'function' ? incoming(data) : incoming;
      if (next && next !== data) Object.assign(data, next);
      if (bump) bump();
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

test.describe('Weather thermometer field feedback and recovery', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('links each invalid site, C/F value and UTC time to its focused explanation while preserving native drafts', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    const original = await savedState(page);
    await value(panel).fill('23.4');
    await time(panel).fill(validInput);
    await activate(page, submit(panel));
    const siteId = await expectInvalid(page, panel, site(panel), /Confirm.*saved forecast site/);
    await expectDraft(panel, '23.4', validInput, false);
    expect(await savedState(page)).toEqual(original);
    await site(panel).check();
    await expectCleared(panel, siteId);
    await expectDraft(panel, '23.4');

    for (const [bad, good] of [['', '23.4'], ['71', '23.4'], ['23.45', '23.4']]) {
      await value(panel).fill(bad);
      await activate(page, submit(panel));
      const errorId = await expectInvalid(page, panel, value(panel), /temperature.*70.*°C.*one decimal place/);
      await expectDraft(panel, bad);
      expect(await savedState(page)).toEqual(original);
      await value(panel).fill(good);
      await expectCleared(panel, errorId);
      await expectDraft(panel, good);
    }
    await unit(panel).selectOption('F');
    await expectDraft(panel, '', validInput, true, 'F');
    for (const bad of ['159', '67.12']) {
      await value(panel, 'F').fill(bad);
      await activate(page, submit(panel));
      const errorId = await expectInvalid(page, panel, value(panel, 'F'), /temperature.*158.*°F.*one decimal place/);
      await expectDraft(panel, bad, validInput, true, 'F');
      expect(await savedState(page)).toEqual(original);
      await value(panel, 'F').fill('67.1');
      await expectCleared(panel, errorId);
      await expectDraft(panel, '67.1', validInput, true, 'F');
    }
    await time(panel).fill('2026-10-29T18:01');
    await activate(page, submit(panel));
    const timeId = await expectInvalid(page, panel, time(panel), /must match.*UTC/);
    await expectDraft(panel, '67.1', '2026-10-29T18:01', true, 'F');
    await time(panel).fill(validInput);
    await expectCleared(panel, timeId);
    await expectDraft(panel, '67.1', validInput, true, 'F');
    expect(await savedState(page)).toEqual(original);
  });

  test('focuses a future-reading explanation without blaming a valid UTC field and target-time recovery never autosaves', async ({ page }) => {
    await mount(page, [originalForecast], '2026-10-29T17:59:00Z');
    const panel = panelFor(page);
    await openThermometer(panel);
    const original = await savedState(page);
    await value(panel).fill('24');
    await time(panel).fill(validInput);
    await site(panel).check();
    await activate(page, submit(panel));
    const alert = panel.getByRole('alert');
    await expect(alert).toContainText('after you take it');
    await expect(alert).toBeFocused();
    for (const control of [unit(panel), value(panel), time(panel), site(panel)]) await expect(control).not.toHaveAttribute('aria-invalid', 'true');
    await expectDraft(panel, '24');
    expect(await savedState(page)).toEqual(original);
    await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
    await expectCleared(panel);
    await expect(time(panel)).toBeFocused();
    await expectDraft(panel, '24');
    expect(await savedState(page)).toEqual(original);

    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    await time(panel).fill('2026-10-29T18:01');
    await activate(page, submit(panel));
    const timeId = await expectInvalid(page, panel, time(panel), /must match.*UTC/);
    await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
    await expectCleared(panel, timeId);
    await expect(time(panel)).toBeFocused();
    await expectDraft(panel, '24');
    expect(await savedState(page)).toEqual(original);
  });

  test('unit recovery preserves saved Fahrenheit and Undo, exports no feedback, and a real tab remount retires an old error', async ({ page }) => {
    await mount(page);
    const panel = panelFor(page);
    await openThermometer(panel);
    await saveFahrenheit(page, panel, '67');
    const saved67 = await savedState(page);
    const undo = panel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(undo).toBeVisible();
    await value(panel, 'F').fill('159');
    await site(panel).check();
    await activate(page, submit(panel));
    const valueId = await expectInvalid(page, panel, value(panel, 'F'), /temperature.*158.*°F/);
    await expect(undo).toBeVisible();
    const activeError = await panel.getByRole('alert').textContent();
    const serialized = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems, k = w.WeatherSystemsKernel;
      return [k.immersiveLocalWorkspacePayload(d), k.immersiveSessionDownloadPayload(d),
        k.immersiveSessionSharePayload(d, { includeLocation: true }),
        k.immersiveSessionSharePayload(d, { includeLocation: false })].map(payload => JSON.stringify(payload));
    });
    const text = await downloadText(page, 'Download live forecast report');
    const csv = await downloadText(page, 'Download live forecast CSV');
    for (const output of [...serialized, text, csv]) {
      expect(output).not.toMatch(/classroomThermometerNotice|classroomThermometerFocus|classroomThermometerUndo|weather-classroom-thermometer-undo-v1|afterCheckpointKey|beforeReading|aria-invalid|aria-describedby/);
      expect(output).not.toContain(activeError!);
    }
    expect(await savedState(page)).toEqual(saved67);
    await unit(panel).selectOption('C');
    await expectCleared(panel, valueId);
    await expectDraft(panel, '', validInput, true, 'C');
    await expect(value(panel)).toHaveAttribute('min', '-100');
    await expect(value(panel)).toHaveAttribute('max', '70');
    await expect(panel.locator('[data-weather-classroom-unit-notice]')).toContainText('Enter the thermometer reading again in °C');
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    await expect(undo).toBeVisible();
    expect(await savedState(page)).toEqual(saved67);
    await unit(panel).selectOption('F');
    await expectDraft(panel, '', validInput, true, 'F');
    await expect(value(panel, 'F')).toHaveAttribute('min', '-148');
    await expect(value(panel, 'F')).toHaveAttribute('max', '158');
    await value(panel, 'F').fill('68');
    await activate(page, submit(panel));
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 68 °F');
    expect((await savedState(page)).journal[0].classroomReading).toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    await activate(page, undo);
    await expect(value(panel, 'F')).toBeFocused();
    expect(await savedState(page)).toEqual(saved67);

    await value(panel, 'F').fill('159');
    await site(panel).check();
    await activate(page, submit(panel));
    await expectInvalid(page, panel, value(panel, 'F'), /temperature.*158.*°F/);
    const oldField = await value(panel, 'F').elementHandle();
    await page.getByRole('tab', { name: /Atmosphere Lab/ }).click();
    await expect.poll(() => oldField!.evaluate(node => node.isConnected)).toBe(false);
    await page.getByRole('tab', { name: /Forecast Mission/ }).click();
    await openThermometer(panel);
    await expect(value(panel, 'F')).toHaveValue('67');
    await expect(time(panel)).toHaveValue(validInput);
    await expectCleared(panel);
    await expect(panel.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    expect(await savedState(page)).toEqual(saved67);
    expect(await page.evaluate(() => (window as any).__thermometerMounts)).toEqual([
      'plugin-weatherSystems:explore:forecast', 'plugin-weatherSystems:explore:atmosphere', 'plugin-weatherSystems:explore:forecast',
    ]);
  });

  test('two cards keep distinct error associations and drafts without rerender focus theft or saved-data changes', async ({ page }) => {
    await mount(page, [originalForecast, secondForecast]);
    const a = panelFor(page), b = panelFor(page, secondForecast.id);
    await openThermometer(a); await openThermometer(b);
    const original = await savedState(page);
    await value(a).fill('23.4'); await time(a).fill(validInput);
    await value(b).fill('18.5'); await time(b).fill('2026-10-29T18:01'); await site(b).check();
    await activate(page, submit(a));
    const aId = await expectInvalid(page, a, site(a), /Confirm.*saved forecast site/);
    await value(b).fill('18.6');
    await expect(a.getByRole('alert')).toHaveAttribute('id', aId);
    await expect(site(a)).toHaveAttribute('aria-invalid', 'true');
    await expect(value(b)).toBeFocused();
    // An ordinary host render changes no product data or native field values.
    await page.evaluate(() => (window as any).__rerender());
    await expect(value(b)).toBeFocused();
    await expect(a.getByRole('alert')).toHaveAttribute('id', aId);
    await expectDraft(a, '23.4', validInput, false);
    await expectDraft(b, '18.6', '2026-10-29T18:01');
    expect(await savedState(page)).toEqual(original);

    await activate(page, submit(b));
    const bId = await expectInvalid(page, b, time(b), /must match.*UTC/);
    expect(bId).not.toBe(aId);
    await expectCleared(a, aId);
    await expectDraft(a, '23.4', validInput, false);
    await expectDraft(b, '18.6', '2026-10-29T18:01');
    const ids = await page.locator('[data-weather-classroom-thermometer] [id]').evaluateAll(nodes => nodes.map(node => node.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(await savedState(page)).toEqual(original);
    await time(b).fill(validInput);
    await expectCleared(b, bId);
    await expectCleared(a, aId);
    await expectDraft(b, '18.6');
    expect(await savedState(page)).toEqual(original);
  });
});
