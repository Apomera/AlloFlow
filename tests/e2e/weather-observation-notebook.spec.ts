import { expect, Page, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_weathersystems.js', toolId: 'weatherSystems',
  width: 1280, height: 1000, layout: 'document', appStyles: true,
});
const logPanel = (page: Page) => page.locator('[data-weather-observation-log]');
const capacity = (page: Page) => page.locator('[data-weather-observation-capacity]');
const undo = (page: Page) => page.getByRole('button', { name: 'Undo clear log', exact: true });
const note = (page: Page) => page.getByRole('textbox', { name: 'Observation explanation', exact: true });
const logOne = (page: Page) => page.getByRole('button', { name: /Log this observation/ });
const network = (page: Page) => page.getByRole('button', { name: 'Log station network', exact: true });

async function mount(page: Page, patch: Record<string, unknown> = {}) {
  await page.route('https://**/*', (route) => route.abort());
  await page.clock.setFixedTime(new Date('2026-10-29T12:05:00Z'));
  await harness.mount(page, { weatherSystems: {
    tab: 'observations', scenario: 'coldFront', selectedStation: 'central', simHour: 3, ...patch,
  } }, undefined, { expectCanvas: false });
  await expect(page.locator('[data-weather-observation-desk]')).toBeVisible();
}

async function notebook(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.weatherSystems;
    return { observationLog: d.observationLog || [], observationCompareFrom: d.observationCompareFrom || '',
      observationCompareTo: d.observationCompareTo || '', observationNote: d.observationNote || '' };
  });
}

async function setPairAndNote(page: Page) {
  const saved = await notebook(page);
  const first = saved.observationLog.find((entry: any) => entry.stationId === 'coast') || saved.observationLog[0];
  const second = saved.observationLog.find((entry: any) => entry.stationId === 'west') || saved.observationLog[1];
  await page.getByRole('combobox', { name: 'First observation', exact: true }).selectOption(first.id);
  await page.getByRole('combobox', { name: 'Second observation', exact: true }).selectOption(second.id);
  await note(page).fill('Keep my comparison explanation and the selected station pair.');
  return notebook(page);
}

async function download(page: Page, label: string) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await event;
  expect(await file.failure()).toBeNull();
  const stream = await file.createReadStream(), parts: Buffer[] = [];
  for await (const part of stream!) parts.push(Buffer.from(part));
  return Buffer.concat(parts).toString('utf8');
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

async function observationsTab(page: Page) {
  await page.getByRole('tab', { name: /Observation/ }).click();
  await expect(logPanel(page)).toBeVisible();
}

async function seedCapacity(page: Page, count: number, missing: number) {
  return page.evaluate(({ count, missing }) => {
    const w = window as any, k = w.WeatherSystemsKernel, d = w.__toolData.weatherSystems;
    const state = k.resolvedState(d), time = '2026-10-29T12:05:00.000Z';
    const batch = k.stations.map((station: any) => ({ ...k.weatherObservationSnapshot(state, station), createdAt: time }));
    const present = batch.slice(0, batch.length - missing);
    const filler = Array.from({ length: count - present.length }, (_, index) => ({ ...batch[0], id: 'preserved-' + index,
      note: 'Original saved row ' + index, createdAt: time }));
    const rows = k.normalizeWeatherObservationLog(filler.concat(present));
    w.__toolData.weatherSystems = { ...d, observationLog: rows, observationCompareFrom: rows[0].id,
      observationCompareTo: rows[1].id, observationNote: 'Capacity must preserve this explanation.' };
    w.__rerender();
    return { rows, batch };
  }, { count, missing });
}

test.describe('Weather Systems observation notebook preservation', () => {
  test.describe.configure({ retries: 0, timeout: 120000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('keeps the explanation and chosen pair when the same network is logged again', async ({ page }) => {
    await mount(page);
    await network(page).click();
    const before = await setPairAndNote(page);
    expect(before.observationLog).toHaveLength(4);
    await expect(network(page)).toBeEnabled();
    await network(page).click();
    expect(await notebook(page)).toEqual(before);
    await expect(note(page)).toHaveValue(before.observationNote);
    await expect(page.getByRole('combobox', { name: 'First observation', exact: true })).toHaveValue(before.observationCompareFrom);
    await expect(page.getByRole('combobox', { name: 'Second observation', exact: true })).toHaveValue(before.observationCompareTo);
    await expect(logPanel(page)).toContainText(/already|no new|kept/i);
    await expect(undo(page)).toHaveCount(0);
  });

  test('retains a queued independent row and newer explanation when logging through an older view', async ({ page }) => {
    await mount(page);
    await network(page).click();
    await setPairAndNote(page);
    await page.getByRole('slider', { name: 'Observation model hour', exact: true }).fill('6');
    const before = await notebook(page);
    const queued = await page.evaluate(() => {
      const w = window as any, k = w.WeatherSystemsKernel, d = w.__toolData.weatherSystems;
      const state = k.resolvedState(d);
      const row = { ...k.weatherObservationSnapshot({ ...state, simHour: 9 }, 'west'), createdAt: '2026-10-29T12:06:00.000Z', note: 'Independently queued row.' };
      w.__toolData.weatherSystems = { ...d, observationLog: d.observationLog.concat([row]), observationNote: 'A newer queued explanation must remain.' };
      const button = [...document.querySelectorAll('button')].find((item) => /Log this observation/.test(item.textContent || '')) as HTMLButtonElement;
      button.click();
      return row;
    });
    const after = await notebook(page);
    expect(after.observationLog).toHaveLength(before.observationLog.length + 2);
    expect(after.observationLog.slice(0, before.observationLog.length)).toEqual(before.observationLog);
    expect(after.observationLog.find((entry: any) => entry.id === queued.id)).toEqual(queued);
    expect(after.observationLog.some((entry: any) => entry.stationId === 'central' && entry.hour === 6)).toBe(true);
    expect(after.observationNote).toBe('A newer queued explanation must remain.');
    await expect(note(page)).toHaveValue(after.observationNote);
  });

  test('rejects an oversized network atomically and adds only a fitting missing batch without evicting originals', async ({ page }) => {
    await mount(page);
    const { rows } = await seedCapacity(page, 23, 3);
    await expect(capacity(page)).toContainText(/23.*24/);
    const before = await notebook(page);
    // Queue the batch through an enabled control from a below-capacity view if
    // UI preflight disables this known-too-large batch; no disabled click bypass.
    if (await network(page).isEnabled()) await network(page).click();
    else await expect(capacity(page)).toContainText(/room|space|full|24|clear/i);
    expect((await notebook(page)).observationLog).toEqual(rows);
    expect(await notebook(page)).toEqual(before);
    const fitting = await seedCapacity(page, 22, 2);
    await expect(network(page)).toBeEnabled();
    await network(page).click();
    const full = await notebook(page);
    expect(full.observationLog).toHaveLength(24);
    expect(full.observationLog.slice(0, 22)).toEqual(fitting.rows);
    expect(new Set(full.observationLog.map((entry: any) => entry.id)).size).toBe(24);
    await expect(capacity(page)).toContainText(/24.*24/);
    await page.getByRole('slider', { name: 'Observation model hour', exact: true }).fill('10');
    await expect(logOne(page)).toBeDisabled();
    expect((await notebook(page)).observationLog).toEqual(full.observationLog);
    const csv = await download(page, 'Download observations CSV');
    expect(csv.trimEnd().split('\r\n')).toHaveLength(25);
    for (const entry of fitting.rows) expect(csv).toContain('"' + entry.id.replace(/"/g, '""') + '"');
  });

  test('restores a cleared notebook with its explanation and pair and keeps Undo out of data and exports', async ({ page }) => {
    await mount(page);
    await network(page).click();
    const before = await setPairAndNote(page);
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    expect(await notebook(page)).toEqual({ observationLog: [], observationCompareFrom: '', observationCompareTo: '', observationNote: '' });
    await expect(undo(page)).toBeFocused();
    const outputs = await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems, k = w.WeatherSystemsKernel;
      return [d, k.immersiveLocalWorkspacePayload(d), k.immersiveSessionDownloadPayload(d),
        k.immersiveSessionSharePayload(d, { includeLocation: true }), k.immersiveSessionSharePayload(d, { includeLocation: false })]
        .map((value) => JSON.stringify(value));
    });
    for (const output of outputs) expect(output).not.toMatch(/weather-observation-notebook-clear-v1|afterNotebookKey|observationLogUndo|observationNotebookUndo/);
    await undo(page).focus();
    await page.keyboard.press('Enter');
    await expect(undo(page)).toHaveCount(0);
    expect(await notebook(page)).toEqual(before);
    await expect(note(page)).toHaveValue(before.observationNote);
    await expect(note(page)).toBeFocused();
    await expect(page.getByRole('combobox', { name: 'First observation', exact: true })).toHaveValue(before.observationCompareFrom);
    await expect(page.getByRole('combobox', { name: 'Second observation', exact: true })).toHaveValue(before.observationCompareTo);
    const csv = await download(page, 'Download observations CSV');
    for (const entry of before.observationLog) {
      expect(csv).toContain('"' + entry.id.replace(/"/g, '""') + '"');
      expect(csv).toContain(entry.createdAt);
    }
    await teacherSessionDesk(page);
    const session = JSON.parse(await download(page, 'Download session JSON'));
    expect(session.weatherSystems.observationLog).toEqual(before.observationLog);
    expect(session.weatherSystems.observationNote).toBe(before.observationNote);
    expect(session.weatherSystems.observationCompareFrom).toBe(before.observationCompareFrom);
    expect(session.weatherSystems.observationCompareTo).toBe(before.observationCompareTo);
  });

  test('retires cleared-notebook recovery after new work and does not resurrect it after another clear', async ({ page }) => {
    await mount(page);
    await network(page).click();
    await setPairAndNote(page);
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    await expect(undo(page)).toBeVisible();
    await expect(logPanel(page)).toContainText('Logging a new reading ends Undo for the cleared notebook.');
    await logOne(page).click();
    await expect(undo(page)).toHaveCount(0);
    const newWork = await notebook(page);
    expect(newWork.observationLog).toHaveLength(1);
    await expect(logPanel(page)).toContainText(/undo.*ended|ended.*undo/i);
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    await undo(page).click();
    expect(await notebook(page)).toEqual(newWork);
    expect((await notebook(page)).observationLog).toHaveLength(1);
    await expect(undo(page)).toHaveCount(0);
  });

  test('invalidates an old recovery receipt on newer notebook edits and identical session import or local reopen', async ({ page }) => {
    await mount(page);
    await network(page).click();
    await setPairAndNote(page);
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    await expect(undo(page)).toBeVisible();
    await page.evaluate(() => {
      const w = window as any, d = w.__toolData.weatherSystems;
      w.__toolData.weatherSystems = { ...d, observationNote: 'New independent work after clear.' };
      w.__rerender();
    });
    await expect(undo(page)).toHaveCount(0);
    await page.evaluate(() => {
      const w = window as any;
      w.__toolData.weatherSystems = { ...w.__toolData.weatherSystems, observationNote: '' };
      w.__rerender();
    });
    await expect(undo(page)).toHaveCount(0);
    await network(page).click();
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    await expect(undo(page)).toBeVisible();
    await teacherSessionDesk(page);
    const session = await download(page, 'Download session JSON');
    expect(session).not.toMatch(/weather-observation-notebook-clear-v1|afterNotebookKey|observationLogUndo|observationNotebookUndo/);
    await page.locator('#weather-immersive-session-import').setInputFiles({
      name: 'identical-cleared-notebook.json', mimeType: 'application/json', buffer: Buffer.from(session),
    });
    await expect(page.locator('[data-weather-session-status]')).toContainText('Session JSON imported');
    await observationsTab(page);
    await expect(undo(page)).toHaveCount(0);
    expect((await notebook(page)).observationLog).toEqual([]);
    await network(page).click();
    await page.getByRole('button', { name: 'Clear log', exact: true }).click();
    await expect(undo(page)).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const local = JSON.parse(localStorage.getItem('weather-systems-immersive-workspace-v1') || '{}');
      return local.weatherSystems?.observationLog;
    })).toEqual([]);
    await harness.destroy(page);
    await harness.mount(page, { weatherSystems: { tab: 'observations' } }, undefined, { expectCanvas: false });
    await expect(logPanel(page)).toBeVisible();
    await expect(undo(page)).toHaveCount(0);
    expect((await notebook(page)).observationLog).toEqual([]);
  });

  test('announces station logging and capacity locally in Forecast Mission while retaining the notebook explanation', async ({ page }) => {
    await mount(page);
    await network(page).click();
    const original = await setPairAndNote(page);
    await page.getByRole('slider', { name: 'Observation model hour', exact: true }).fill('6');
    await page.getByRole('tab', { name: /Forecast/ }).click();
    await expect(logPanel(page)).toHaveCount(0);
    const description = page.locator('[data-weather-station-log-status]');
    const notice = page.locator('[data-weather-station-log-notice]');
    await expect(logOne(page)).toHaveAttribute('aria-describedby', 'weather-station-log-status');
    await expect(description).toContainText('4 of 24 observations saved');
    await expect(logOne(page)).toBeEnabled();
    await logOne(page).focus();
    await page.keyboard.press('Enter');
    await expect(description).toBeFocused();
    await expect(description).toContainText('5 of 24 observations saved');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/logged/i);
    const saved = await notebook(page);
    expect(saved.observationLog).toHaveLength(5);
    expect(saved.observationLog.slice(0, 4)).toEqual(original.observationLog);
    expect(saved.observationLog[4]).toMatchObject({ stationId: 'central', hour: 6 });
    expect(saved.observationNote).toBe(original.observationNote);
    expect(saved.observationCompareFrom).toBe(original.observationCompareFrom);
    expect(saved.observationCompareTo).toBe(original.observationCompareTo);
    await logOne(page).click();
    await expect(description).toBeFocused();
    await expect(notice).toContainText(/already|kept|no new/i);
    expect(await notebook(page)).toEqual(saved);

    const full = await seedCapacity(page, 24, 4);
    await expect(logOne(page)).toBeDisabled();
    await expect(description).toContainText('24 of 24 observations saved');
    await expect(description).toContainText(/Notebook full/);
    await expect(description).toContainText(/Open Observation Desk/);
    await expect(page.getByRole('button', { name: 'Open Observation Desk', exact: true })).toBeVisible();
    expect((await notebook(page)).observationLog).toEqual(full.rows);
    await page.getByRole('button', { name: 'Open Observation Desk', exact: true }).click();
    await expect(logPanel(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download observations CSV', exact: true })).toBeEnabled();
    expect((await notebook(page)).observationLog).toEqual(full.rows);
  });
});
