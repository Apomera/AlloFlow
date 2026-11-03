import { Download, expect, Locator, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
const validUtc = '2026-10-29T18:00:00.000Z';
const originalForecast = {
  schema: 'weather-live-checkpoint-v2', id: 'school-snapshot', location: 'School yard',
  source: 'Open-Meteo', sourceKind: 'model', latitude: 40, longitude: -75,
  retrievedAt: '2026-10-29T16:01Z', capturedAt: '2026-10-29T16:05Z',
  currentDataAt: '2026-10-29T12:00', validAt: '2026-10-29T14:00',
  validTimestamp: Date.parse(validUtc), timezone: 'EDT', utcOffsetSeconds: -14400,
  predicted: { temperature: 24 }, learnerReasoning: 'The afternoon hours warmed after noon.',
};

async function downloadedText(download: Download) {
  const stream = await download.createReadStream();
  const pieces: Buffer[] = [];
  for await (const piece of stream!) pieces.push(Buffer.from(piece));
  return Buffer.concat(pieces).toString('utf8');
}

async function downloadText(page: Page, buttonName: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: buttonName, exact: true }).click();
  return downloadedText(await event);
}

function csvObject(csv: string) {
  const cells = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"(?=,|$)/g)]
    .map((match) => match[1].replace(/""/g, '"'));
  const [headings, row] = csv.trimEnd().split('\r\n').map(cells);
  return Object.fromEntries(headings.map((heading, index) => [heading, row[index]]));
}

async function teacherSessionDesk(page: Page) {
  // Keep session-file controls on the geographic fallback; these cases exercise
  // reading persistence rather than depending on external 3D/map libraries.
  await page.evaluate(() => {
    const w = window as any;
    w.__toolData.weatherSystems.immersiveSceneMode = 'geographic';
    w.__toolData._threeLoaded = false;
    w.__rerender();
  });
  await page.getByRole('tab', { name: /Immersive 3D/ }).click();
  await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
}

async function openThermometer(panel: Locator) {
  if (!await panel.getByRole('combobox', { name: 'Thermometer unit', exact: true }).isVisible()) await panel.locator('summary').click();
}

async function saveEnteredReading(panel: Locator, value: string, unit = 'F') {
  await panel.getByRole('combobox', { name: 'Thermometer unit', exact: true }).selectOption(unit);
  await panel.getByLabel(`Outdoor thermometer reading (°${unit})`, { exact: true }).fill(value);
  await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
  await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
  await panel.getByRole('button', { name: /^(Save|Update) thermometer reading$/ }).click();
}

test.describe('Weather Systems classroom thermometer', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('saves, corrects and clears the matching outdoor reading while preserving the forecast', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T17:59:00Z'));
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [originalForecast] },
    }, undefined, { expectCanvas: false });
    const panel = page.locator('[data-weather-classroom-thermometer]');
    await panel.locator('summary').click();
    const temperature = panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true });
    const time = panel.getByLabel('Measurement time (UTC)', { exact: true });
    const site = panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ });
    const save = panel.getByRole('button', { name: 'Save thermometer reading', exact: true });
    const result = panel.locator('[data-weather-classroom-result]');
    const record = () => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0]);
    await expect(panel).toContainText(validUtc);
    await temperature.fill('0');
    await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
    await expect(time).toHaveValue('2026-10-29T18:00');
    await site.check();
    await save.click();
    await expect(panel.getByRole('alert')).toContainText('after you take it');
    expect((await record()).classroomReading).toBeUndefined();

    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    await time.fill('2026-10-29T18:01');
    await save.click();
    await expect(panel.getByRole('alert')).toContainText('must match');
    await time.fill('2026-10-29T18:00');
    await site.uncheck();
    await save.click();
    await expect(panel.getByRole('alert')).toContainText('Confirm');
    await site.check();
    await save.focus();
    await page.keyboard.press('Enter');
    await expect(result).toContainText('Thermometer 0 °C');
    await expect(result).toContainText('+24 °C');
    expect((await record()).classroomReading).toMatchObject({ temperatureC: 0, measuredAt: validUtc, sameSite: true });

    await temperature.fill('26');
    await site.check();
    await panel.getByRole('button', { name: 'Update thermometer reading' }).click();
    await expect(result).toContainText('Thermometer 26 °C');
    await expect(result).toContainText(/[-−]2 °C/);
    expect(await record()).toMatchObject({
      predicted: originalForecast.predicted, capturedAt: originalForecast.capturedAt,
      retrievedAt: originalForecast.retrievedAt, learnerReasoning: originalForecast.learnerReasoning,
    });
    await panel.getByRole('button', { name: 'Clear thermometer reading' }).click();
    await expect(result).toHaveCount(0);
    await expect(panel.getByRole('status')).toContainText('cleared');
    expect((await record()).classroomReading).toBeUndefined();
    expect((await record()).predicted.temperature).toBe(24);
    await expect(temperature).toHaveValue('');
  });

  test('keeps Fahrenheit entry through correction, reports, local reopen and session JSON import', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [originalForecast] },
    }, undefined, { expectCanvas: false });
    const panel = page.locator('[data-weather-classroom-thermometer]');
    await panel.locator('summary').click();
    const unit = panel.getByRole('combobox', { name: 'Thermometer unit', exact: true });
    const celsius = panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true });
    const fahrenheit = panel.getByLabel('Outdoor thermometer reading (°F)', { exact: true });
    const result = panel.locator('[data-weather-classroom-result]');
    const record = () => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0]);
    await expect(unit).toHaveValue('C');
    await celsius.fill('12');
    await unit.selectOption({ label: 'Fahrenheit (°F)' });
    await expect(fahrenheit).toHaveValue('');
    await expect(fahrenheit).toHaveAttribute('min', '-148');
    await expect(fahrenheit).toHaveAttribute('max', '158');
    await expect(panel.locator('[data-weather-classroom-unit-notice]')).toContainText('Enter the thermometer reading again in °F');
    await unit.focus();
    await page.keyboard.press('Tab');
    await expect(fahrenheit).toBeFocused();
    await fahrenheit.fill('67');
    await panel.getByRole('button', { name: 'Use target time', exact: true }).click();
    await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
    await panel.getByRole('button', { name: 'Save thermometer reading', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(result).toContainText('Thermometer 67 °F');
    await expect(result).toContainText('19.4 °C');
    await expect(result).toContainText('+4.6 °C');
    await expect(result).toContainText('+8.2 °F');
    const first = await record();
    expect(first.classroomReading).toEqual({
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F',
      temperatureC: (67 - 32) * 5 / 9, measuredAt: validUtc,
      recordedAt: '2026-10-29T18:05:00.000Z', sameSite: true,
    });
    const text = await downloadText(page, 'Download live forecast report');
    expect(text).toContain('67 °F');
    expect(text).toContain('+4.6 °C');
    expect(text).toContain('+8.2 °F');
    const csv = csvObject(await downloadText(page, 'Download live forecast CSV'));
    expect(csv['Classroom entered thermometer value']).toBe('67');
    expect(csv['Classroom entered thermometer unit']).toBe('F');
    expect(Number(csv['Classroom outdoor thermometer (°C)'])).toBe(first.classroomReading.temperatureC);
    expect(csv['Saved forecast minus classroom thermometer (°C)']).toBe('4.6');
    expect(csv['Saved forecast minus classroom thermometer (°F)']).toBe('8.2');

    await fahrenheit.fill('75');
    await unit.selectOption({ label: 'Celsius (°C)' });
    await expect(celsius).toHaveValue('');
    await expect(panel.locator('[data-weather-classroom-unit-notice]')).toContainText('Enter the thermometer reading again in °C');
    expect((await record()).classroomReading).toEqual(first.classroomReading);
    await expect(result).toContainText('Thermometer 67 °F');
    await unit.selectOption('F');
    await fahrenheit.fill('68');
    await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
    await panel.getByRole('button', { name: 'Update thermometer reading', exact: true }).click();
    await expect(result).toContainText('Thermometer 68 °F');
    const corrected = await record();
    expect(corrected.classroomReading).toMatchObject({ enteredValue: 68, enteredUnit: 'F', temperatureC: 20 });
    expect(corrected).toMatchObject({
      predicted: originalForecast.predicted, capturedAt: originalForecast.capturedAt,
      retrievedAt: originalForecast.retrievedAt, learnerReasoning: originalForecast.learnerReasoning,
    });

    await expect.poll(() => page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('weather-systems-immersive-workspace-v1') || '{}');
      return local.weatherSystems?.liveForecastCheckpoints?.[0]?.classroomReading;
    })).toEqual(corrected.classroomReading);
    await harness.destroy(page);
    await harness.mount(page, { weatherSystems: { tab: 'forecast' } }, undefined, { expectCanvas: false });
    await panel.locator('summary').click();
    await expect(unit).toHaveValue('F');
    await expect(fahrenheit).toHaveValue('68');
    await expect(result).toContainText('Thermometer 68 °F');
    expect((await record()).classroomReading).toEqual(corrected.classroomReading);

    await teacherSessionDesk(page);
    const downloaded = await downloadText(page, 'Download session JSON');
    const session = JSON.parse(downloaded);
    expect(session.weatherSystems.liveForecastCheckpoints[0].classroomReading).toEqual(corrected.classroomReading);
    await page.getByRole('tab', { name: /Forecast/ }).click();
    if (!await panel.getByRole('button', { name: 'Clear thermometer reading', exact: true }).isVisible()) await panel.locator('summary').click();
    await panel.getByRole('button', { name: 'Clear thermometer reading', exact: true }).click();
    expect((await record()).classroomReading).toBeUndefined();
    await teacherSessionDesk(page);
    await page.locator('#weather-immersive-session-import').setInputFiles({
      name: 'weather-fahrenheit-session.json', mimeType: 'application/json', buffer: Buffer.from(downloaded),
    });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    await page.getByRole('tab', { name: /Forecast/ }).click();
    if (!await fahrenheit.isVisible()) await panel.locator('summary').click();
    await expect(unit).toHaveValue('F');
    await expect(fahrenheit).toHaveValue('68');
    expect((await record()).classroomReading).toEqual(corrected.classroomReading);
    expect(await record()).toMatchObject({
      predicted: originalForecast.predicted, capturedAt: originalForecast.capturedAt,
      retrievedAt: originalForecast.retrievedAt, learnerReasoning: originalForecast.learnerReasoning,
    });
    const redacted = await page.evaluate(() => {
      const w = window as any;
      return w.WeatherSystemsKernel.immersiveSessionSharePayload(w.__toolData.weatherSystems, { includeLocation: false });
    });
    expect(JSON.stringify(redacted)).not.toMatch(/classroomReading|enteredUnit|School yard|school-snapshot|The afternoon hours/);
  });

  test('reopens a Celsius legacy reading and resets equivalent-temperature corrections under a fixed clock', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    const legacy = {
      schema: 'weather-classroom-temperature-v1', temperatureC: 0,
      measuredAt: validUtc, recordedAt: '2026-10-29T18:05:00.000Z', sameSite: true,
    };
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [{ ...originalForecast, classroomReading: legacy }] },
    }, undefined, { expectCanvas: false });
    const panel = page.locator('[data-weather-classroom-thermometer]');
    await panel.locator('summary').click();
    const unit = panel.getByRole('combobox', { name: 'Thermometer unit', exact: true });
    const result = panel.locator('[data-weather-classroom-result]');
    const record = () => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0]);
    await expect(unit).toHaveValue('C');
    await expect(panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true })).toHaveValue('0');
    expect((await record()).classroomReading).toEqual(legacy);

    await unit.selectOption('F');
    await expect(panel.getByLabel('Outdoor thermometer reading (°F)', { exact: true })).toHaveValue('');
    await panel.getByLabel('Outdoor thermometer reading (°F)', { exact: true }).fill('32');
    await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
    await panel.getByRole('button', { name: 'Update thermometer reading', exact: true }).click();
    await expect(unit).toHaveValue('F');
    await expect(panel.getByLabel('Outdoor thermometer reading (°F)', { exact: true })).toHaveValue('32');
    await expect(result).toContainText('Thermometer 32 °F');
    expect((await record()).classroomReading).toEqual({
      ...legacy, schema: 'weather-classroom-temperature-v2', enteredValue: 32, enteredUnit: 'F',
    });

    await unit.selectOption('C');
    await panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true }).fill('0');
    await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).check();
    await panel.getByRole('button', { name: 'Update thermometer reading', exact: true }).click();
    await expect(unit).toHaveValue('C');
    await expect(panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true })).toHaveValue('0');
    await expect(result).toContainText('Thermometer 0 °C');
    expect((await record()).classroomReading).toEqual({
      ...legacy, schema: 'weather-classroom-temperature-v2', enteredValue: 0, enteredUnit: 'C',
    });
    await panel.getByRole('button', { name: 'Clear thermometer reading', exact: true }).click();
    await expect(result).toHaveCount(0);
    await expect(unit).toHaveValue('C');
    await expect(panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true })).toHaveValue('');
    expect((await record()).classroomReading).toBeUndefined();
    expect((await record()).predicted).toEqual(originalForecast.predicted);
  });

  test('undoes first save, invalid-attempt correction and clear with exact Fahrenheit recovery and keyboard focus', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [originalForecast] },
    }, undefined, { expectCanvas: false });
    const panel = page.locator('[data-weather-classroom-thermometer]');
    await openThermometer(panel);
    const undo = panel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    const result = panel.locator('[data-weather-classroom-result]');
    const record = () => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0]);
    const focusIsReadingControl = () => panel.locator('select[name="enteredUnit"], input[name="enteredValue"]')
      .evaluateAll((controls) => controls.some((control) => control === document.activeElement));

    await saveEnteredReading(panel, '67');
    await expect(undo).toBeVisible();
    await expect(panel.getByRole('status')).toContainText('You can undo this change.');
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(undo).toHaveCount(0);
    await expect(result).toHaveCount(0);
    await expect(panel.getByRole('status')).toHaveText('Thermometer change undone.');
    expect((await record()).classroomReading).toBeUndefined();
    expect(await record()).toEqual(originalForecast);
    await expect.poll(focusIsReadingControl).toBe(true);

    await saveEnteredReading(panel, '67');
    const originalReading = (await record()).classroomReading;
    await saveEnteredReading(panel, '68');
    await expect(result).toContainText('Thermometer 68 °F');
    const correctionTime = (await record()).classroomReading.recordedAt;
    await page.clock.setFixedTime(new Date('2026-10-29T18:06:00Z'));
    await saveEnteredReading(panel, '68');
    await expect(panel.getByRole('status')).toContainText('unchanged');
    expect((await record()).classroomReading.recordedAt).toBe(correctionTime);
    await panel.getByRole('checkbox', { name: /outdoor reading at the saved forecast site/ }).uncheck();
    await panel.getByRole('button', { name: 'Update thermometer reading', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('Confirm');
    await expect(undo).toBeVisible();
    expect((await record()).classroomReading.enteredValue).toBe(68);
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(result).toContainText('Thermometer 67 °F');
    expect((await record()).classroomReading).toEqual(originalReading);
    await expect.poll(focusIsReadingControl).toBe(true);
    await expect(undo).toHaveCount(0);

    await panel.getByRole('button', { name: 'Clear thermometer reading', exact: true }).click();
    await expect(result).toHaveCount(0);
    await expect(undo).toBeFocused();
    await expect(panel.getByRole('status')).toContainText('cleared');
    await expect(panel.getByRole('status')).toContainText('You can undo this change.');
    const serialized = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems, k = w.WeatherSystemsKernel;
      return [d, k.immersiveLocalWorkspacePayload(d), k.immersiveSessionDownloadPayload(d),
        k.immersiveSessionSharePayload(d, { includeLocation: true }),
        k.immersiveSessionSharePayload(d, { includeLocation: false })].map((value) => JSON.stringify(value));
    });
    const text = await downloadText(page, 'Download live forecast report');
    const csv = await downloadText(page, 'Download live forecast CSV');
    for (const output of [...serialized, text, csv]) {
      expect(output).not.toMatch(/weather-classroom-thermometer-undo-v1|afterCheckpointKey|beforeReading|classroomThermometerUndo/);
    }
    // Download controls moved focus; return to the offered recovery button.
    await undo.focus();
    await page.keyboard.press('Enter');
    await expect(result).toContainText('Thermometer 67 °F');
    expect((await record()).classroomReading).toEqual(originalReading);
    await expect.poll(focusIsReadingControl).toBe(true);
    expect(await record()).toMatchObject({
      predicted: originalForecast.predicted, capturedAt: originalForecast.capturedAt,
      retrievedAt: originalForecast.retrievedAt, learnerReasoning: originalForecast.learnerReasoning,
    });
  });

  test('keeps one latest Undo across cards and rejects changed or removed forecast context', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    const second = { ...originalForecast, id: 'second-school', location: 'Second school yard', latitude: 41 };
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [originalForecast, second] },
    }, undefined, { expectCanvas: false });
    const firstPanel = page.locator('[data-weather-classroom-thermometer]').filter({ hasText: 'at School yard (' });
    const secondPanel = page.locator('[data-weather-classroom-thermometer]').filter({ hasText: 'at Second school yard (' });
    await openThermometer(firstPanel);
    await openThermometer(secondPanel);
    await saveEnteredReading(firstPanel, '67');
    await expect(firstPanel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toBeVisible();
    await saveEnteredReading(secondPanel, '68');
    await expect(firstPanel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);
    const secondUndo = secondPanel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(secondUndo).toBeVisible();
    await secondUndo.click();
    const records = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
    expect(records.find((entry: any) => entry.id === originalForecast.id).classroomReading.enteredValue).toBe(67);
    expect(records.find((entry: any) => entry.id === second.id).classroomReading).toBeUndefined();
    await expect(page.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);

    await saveEnteredReading(firstPanel, '68');
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems.liveForecastCheckpoints = w.__toolData.weatherSystems.liveForecastCheckpoints
        .map((entry: any) => entry.id === 'school-snapshot' ? { ...entry, learnerReasoning: 'A later independently edited explanation.' } : entry);
      w.__rerender();
    });
    await expect(firstPanel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].learnerReasoning))
      .toBe('A later independently edited explanation.');
    // Retiring a receipt is permanent, even if the host reuses the same weather
    // object and later puts the old forecast context back in another render.
    await page.evaluate((reasoning) => {
      const w = window as any;
      w.__toolData.weatherSystems.liveForecastCheckpoints = w.__toolData.weatherSystems.liveForecastCheckpoints
        .map((entry: any) => entry.id === 'school-snapshot' ? { ...entry, learnerReasoning: reasoning } : entry);
      w.__rerender();
    }, originalForecast.learnerReasoning);
    await expect(firstPanel.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);
    await saveEnteredReading(secondPanel, '69');
    await expect(secondUndo).toBeVisible();
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems.liveForecastCheckpoints = w.__toolData.weatherSystems.liveForecastCheckpoints
        .filter((entry: any) => entry.id !== 'second-school');
      w.__rerender();
    });
    await expect(page.getByRole('button', { name: 'Undo thermometer change', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].classroomReading.enteredValue)).toBe(68);
    await saveEnteredReading(firstPanel, '70');
    const guardedUndo = firstPanel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(guardedUndo).toBeVisible();
    // A host update can arrive between rendering the offer and clicking it.
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems.liveForecastCheckpoints[0].learnerReasoning = 'Changed before Undo was clicked.';
    });
    await guardedUndo.focus();
    await page.keyboard.press('Enter');
    await expect(guardedUndo).toHaveCount(0);
    await expect(firstPanel.getByRole('alert')).toContainText('can no longer be undone');
    await expect(firstPanel.getByLabel('Outdoor thermometer reading (°F)', { exact: true })).toBeFocused();
    const guardedRecord = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0]);
    expect(guardedRecord.classroomReading.enteredValue).toBe(70);
    expect(guardedRecord.learnerReasoning).toBe('Changed before Undo was clicked.');
  });

  test('retires Undo on identical session import and local reopen instead of serializing a recovery receipt', async ({ page }) => {
    await page.route('https://**/*', (route) => route.abort());
    await page.clock.setFixedTime(new Date('2026-10-29T18:05:00Z'));
    const legacy = {
      schema: 'weather-classroom-temperature-v1', temperatureC: 0,
      measuredAt: validUtc, recordedAt: '2026-10-29T18:05:00.000Z', sameSite: true,
    };
    await harness.mount(page, {
      weatherSystems: { tab: 'forecast', liveForecastCheckpoints: [{ ...originalForecast, classroomReading: legacy }] },
    }, undefined, { expectCanvas: false });
    const panel = page.locator('[data-weather-classroom-thermometer]');
    await openThermometer(panel);
    await saveEnteredReading(panel, '32');
    const undo = panel.getByRole('button', { name: 'Undo thermometer change', exact: true });
    await expect(undo).toBeVisible();
    await undo.click();
    const restoredLegacy = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].classroomReading);
    expect(restoredLegacy).toEqual(legacy);
    await expect(panel.getByRole('combobox', { name: 'Thermometer unit', exact: true })).toHaveValue('C');
    await expect(panel.getByLabel('Outdoor thermometer reading (°C)', { exact: true })).toHaveValue('0');
    await saveEnteredReading(panel, '32');
    const reading = await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].classroomReading);
    await expect(undo).toBeVisible();
    await teacherSessionDesk(page);
    const session = await downloadText(page, 'Download session JSON');
    expect(session).not.toMatch(/weather-classroom-thermometer-undo-v1|afterCheckpointKey|beforeReading|classroomThermometerUndo/);
    expect(JSON.parse(session).weatherSystems.liveForecastCheckpoints[0].classroomReading).toEqual(reading);
    await page.locator('#weather-immersive-session-import').setInputFiles({
      name: 'same-reading-import.json', mimeType: 'application/json', buffer: Buffer.from(session),
    });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await openThermometer(panel);
    await expect(undo).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].classroomReading)).toEqual(reading);

    await saveEnteredReading(panel, '33');
    await expect(undo).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('weather-systems-immersive-workspace-v1') || '{}');
      return local.weatherSystems?.liveForecastCheckpoints?.[0]?.classroomReading?.enteredValue;
    })).toBe(33);
    const local = await page.evaluate(() => localStorage.getItem('weather-systems-immersive-workspace-v1'));
    expect(local).not.toMatch(/weather-classroom-thermometer-undo-v1|afterCheckpointKey|beforeReading|classroomThermometerUndo/);
    await harness.destroy(page);
    await harness.mount(page, { weatherSystems: { tab: 'forecast' } }, undefined, { expectCanvas: false });
    await openThermometer(panel);
    await expect(undo).toHaveCount(0);
    await expect(panel.getByLabel('Outdoor thermometer reading (°F)', { exact: true })).toHaveValue('33');
    expect(await page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints[0].classroomReading.enteredValue)).toBe(33);
  });
});
