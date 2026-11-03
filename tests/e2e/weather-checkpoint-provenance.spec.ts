import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const valid = '2026-10-29T14:00:00.000Z';
const retrieval = '2026-10-29T15:05:00.000Z';
const measures = { temperature: 24, precipitation: 1.2, pressure: 1007, windSpeed: 24, windDir: 350, weatherCode: 95, condition: 'Thunderstorms' };
function checkpoint(index = 0, withReading = false) {
  return {
    schema: 'weather-live-checkpoint-v2', id: 'saved-school-' + index, location: 'Synthetic school yard',
    latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: `2026-10-29T12:0${index + 1}:00.000Z`, capturedAt: '2026-10-29T12:05:00.000Z',
    currentDataAt: '2026-10-29T12:00:00.000Z', validAt: valid, validTimestamp: Date.parse(valid),
    timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 3600,
    predicted: { ...measures }, learnerReasoning: `Keep original snapshot ${index}.\n"Quoted evidence" remains.`,
    timelineEvidence: `Original comparison note ${index}.`,
    ...(withReading ? { classroomReading: {
      schema: 'weather-classroom-temperature-v2', enteredValue: 67, enteredUnit: 'F', temperatureC: (67 - 32) * 5 / 9,
      measuredAt: valid, recordedAt: '2026-10-29T14:05:00.000Z', sameSite: true,
    } } : {}),
  };
}
function loaded() {
  return {
    ...measures, label: 'Synthetic school yard', latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    observedAt: '2026-10-29T15:00:00.000Z', retrievedAt: retrieval,
    timezone: 'UTC', utcOffsetSeconds: 0, pressureType: 'surface', precipitationIntervalSeconds: 900,
  };
}
function point(patch: Record<string, unknown> = {}) {
  return {
    ...measures, time: valid, role: 'earlier', offsetHours: -1, utcOffsetSeconds: 0,
    source: 'Open-Meteo', sourceKind: 'model', retrievedAt: retrieval,
    pressureType: 'surface', precipitationIntervalSeconds: 3600,
    temperature: 22, precipitation: 0.7, pressure: 1009, windSpeed: 18, windDir: 10, weatherCode: 61,
    ...patch,
  };
}
const studio = (page: Page) => page.locator('[data-weather-forecast-verification-studio]');
const snapshots = (page: Page) => page.evaluate(() => (window as any).__toolData.weatherSystems.liveForecastCheckpoints);
async function mount(page: Page, timeline: Record<string, unknown>[], saved = [checkpoint(0, true)], dark = false) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-10-29T15:06:00Z'));
  await harness.mount(page, { _threeLoaded: false, weatherSystems: {
    tab: 'forecast', liveWeather: loaded(), liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 0,
    liveForecastCheckpoints: saved, immersiveStageMode: false, immersiveSceneMode: 'conceptual',
    immersiveDataSource: 'live', immersiveAudienceMode: 'teacher',
  } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width: 100%; max-width: 1280px; }' });
  if (dark) await page.evaluate(() => {
    const w = window as any;
    document.documentElement.classList.add('dark');
    w.__ctx.isDark = true;
    w.__rerender();
  });
  await expect(studio(page)).toBeVisible();
}
async function download(page: Page, name: string, keyboard = false) {
  const event = page.waitForEvent('download');
  const button = studio(page).getByRole('button', { name, exact: true });
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}
function csvObjects(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted;
    } else if (!quoted && char === ',') { row.push(value); value = ''; }
    else if (!quoted && (char === '\r' || char === '\n')) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value); rows.push(row); row = []; value = '';
    } else value += char;
  }
  if (row.length || value) rows.push(row.concat(value));
  expect(quoted).toBe(false);
  const [headings, ...data] = rows;
  return data.map((cells) => {
    expect(cells).toHaveLength(headings.length);
    return Object.fromEntries(headings.map((heading, index) => [heading, cells[index]]));
  });
}
function expectNoModelComparison(row: Record<string, string>) {
  expect(row['Comparison status']).not.toBe('compared');
  expect(row['Comparison retrieval']).toBe('');
  expect(row['Same model condition code']).toBe('');
  for (const [heading, value] of Object.entries(row)) {
    if (/^(Newer model|Saved minus newer model|Absolute difference)/.test(heading)) expect(value, heading).toBe('');
  }
}
async function importSession(page: Page, saved: ReturnType<typeof checkpoint>[], timeline: Record<string, unknown>[]) {
  const json = await page.evaluate((data) => JSON.stringify((window as any).WeatherSystemsKernel.immersiveSessionDownloadPayload(data)), {
    liveWeather: loaded(), liveWeatherTimeline: timeline, liveForecastCheckpoints: saved,
    immersiveStageMode: false, immersiveSceneMode: 'conceptual', immersiveDataSource: 'live',
  });
  await page.getByRole('tab', { name: /Immersive 3D/ }).click();
  await page.getByRole('button', { name: 'Teacher tools', exact: true }).click();
  await page.locator('#weather-immersive-session-import').setInputFiles({
    name: 'synthetic-review-provenance.json', mimeType: 'application/json', buffer: Buffer.from(json),
  });
  await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
  await page.locator('#weather-tab-forecast').focus();
  await page.keyboard.press('Enter');
  await expect(studio(page)).toBeVisible();
}

test.describe('Weather saved forecast review provenance', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('withholds a foreign hourly location in the review and reports while retaining the saved thermometer evidence', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const saved = [checkpoint(0, true)];
    await mount(page, [point({ latitude: 41, longitude: -75 })], saved);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(0);
    await expect(studio(page).locator('[data-weather-forecast-error]')).toHaveCount(0);
    const thermometer = studio(page).locator('[data-weather-classroom-thermometer]');
    await thermometer.locator('summary').click();
    await expect(thermometer.locator('[data-weather-classroom-result]')).toContainText('Thermometer 67 °F');
    const report = await download(page, 'Download live forecast report');
    const [csv] = csvObjects(await download(page, 'Download live forecast CSV'));
    expect(report).not.toContain('Later-model comparison:');
    expect(report).toContain('67 °F');
    expect(report).toContain(saved[0].learnerReasoning);
    expectNoModelComparison(csv);
    expect(csv['Original forecast explanation']).toBe(saved[0].learnerReasoning);
    expect(csv['Classroom entered thermometer value']).toBe('67');
    expect(csv['Classroom entered thermometer unit']).toBe('F');
    expect(csv['Saved forecast minus classroom thermometer (°F)']).toBe('8.2');
    expect(await snapshots(page)).toEqual(saved);
    expect(errors).toEqual([]);
  });

  test('imports ambiguous equivalent instants for four saved revisions and restores supported comparisons without losing original work', async ({ page }) => {
    const saved = Array.from({ length: 4 }, (_, index) => checkpoint(index, index === 0));
    await mount(page, [point()], saved);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(4);
    const duplicate = point({ time: '2026-10-29T10:00:00-04:00', role: 'forecast', temperature: -10, latitude: 41, longitude: -75 });
    await importSession(page, saved, [duplicate, point()]);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(0);
    await expect(studio(page).locator('[data-weather-forecast-error]')).toHaveCount(0);
    const report = await download(page, 'Download live forecast report');
    const csv = csvObjects(await download(page, 'Download live forecast CSV'));
    expect(report).not.toContain('Later-model comparison:');
    expect(csv).toHaveLength(4);
    for (let index = 0; index < saved.length; index += 1) {
      expectNoModelComparison(csv[index]);
      expect(csv[index]['Snapshot ID']).toBe(saved[index].id);
      expect(csv[index]['Original forecast explanation']).toBe(saved[index].learnerReasoning);
      expect(csv[index]['Attached timeline evidence']).toBe(saved[index].timelineEvidence);
    }
    expect(csv[0]['Classroom entered thermometer value']).toBe('67');
    expect(await snapshots(page)).toEqual(saved);
    await importSession(page, saved, [point()]);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(4);
    const repaired = csvObjects(await download(page, 'Download live forecast CSV'));
    for (const row of repaired) {
      expect(row['Comparison status']).toBe('compared');
      expect(row['Newer model Temperature (°C)']).toBe('22');
      expect(row['Saved minus newer model Temperature (°C)']).toBe('2');
    }
    expect(await snapshots(page)).toEqual(saved);
  });

  test('keeps genuine legacy hourly metadata usable through narrow dark-layout keyboard review and export', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { source, sourceKind, retrievedAt, ...legacy } = point();
    const saved = [checkpoint(0)];
    await mount(page, [legacy], saved, true);
    await expect(studio(page).getByRole('list', { name: 'Saved live forecast checkpoints' }).getByRole('listitem')).toHaveClass(/bg-emerald-950\/20/);
    await expect(studio(page).locator('[data-weather-checkpoint-status="compared"]')).toHaveCount(1);
    await expect(studio(page).locator('[data-weather-forecast-error]')).toContainText('+2°C');
    const [csv] = csvObjects(await download(page, 'Download live forecast CSV', true));
    expect(csv['Comparison status']).toBe('compared');
    expect(csv['Newer model Temperature (°C)']).toBe('22');
    expect(csv['Saved minus newer model Temperature (°C)']).toBe('2');
    const sizes = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    expect(sizes.width).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(await snapshots(page)).toEqual(saved);
    await studio(page).screenshot({ path: info.outputPath('checkpoint-provenance-phone-dark.png') });
  });
});
