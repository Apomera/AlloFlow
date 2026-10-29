import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism',
  width: 1080, height: 1800, layout: 'document',
});
const artifacts = join(process.cwd(), 'tmp', 'magnetism-replay');
const seed = {
  magnetism: {
    tab: 'field', fieldView: 'map', learningMode: 'guided',
    fieldMapProbe: { x: 90, y: 0 }, fieldMapPath: 'axial',
    fieldMapStrength: 1, fieldMapNoise: 0, fieldMapSamples: [], fieldMapReference: [],
    missionId: 'power_path', missionPanelOpen: true,
    labShellPanel: '', labShellMenuOpen: false, notebookTrials: [], notebookOpen: false,
    notebookClaim: 'The field is weaker farther from the magnet.',
    notebookReasoning: 'The scan held strength and direction constant while distance increased.',
  },
};

test.describe.configure({ mode: 'serial', timeout: 180_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1080) {
  await page.setViewportSize({ width, height: 1100 });
  await harness.mount(page, seed, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = String(nextWidth) + 'px';
  }, width);
  await expect(page.getByRole('button', { name: 'Run 7-point scan', exact: true })).toBeVisible();
}

async function data(page: Page) {
  return page.evaluate(() => (window as any).__toolData.magnetism);
}

function measurementState(value: any) {
  const names = ['fieldMapProbe', 'fieldMapPath', 'fieldMapStrength', 'fieldMapNoise', 'fieldMapScanPrediction', 'fieldMapPrediction'];
  const measurementKeys = ['x', 'y', 'distance', 'path', 'strength', 'noisePercent', 'measuredBx', 'measuredBy', 'measuredMagnitude', 'uncertainty'];
  const result = Object.fromEntries(names.map((key) => [key, value[key]]));
  for (const key of ['fieldMapSamples', 'fieldMapReference']) {
    result[key] = value[key].map((row: any) => Object.fromEntries(measurementKeys.map((column) => [column, row[column]])));
  }
  return result;
}

async function openPanel(page: Page, name: 'Evidence' | 'Mission') {
  await page.locator('#mag-shell-menu-button').click();
  await page.locator('#mag-shell-menu').getByRole('button', { name: new RegExp(name) }).click();
}

async function expectWorkbenchFocus(page: Page) {
  await expect.poll(() => page.evaluate(() => !!document.querySelector('[data-field-measurement-studio]')?.contains(document.activeElement))).toBe(true);
}

test('reopens saved raw measurements across stations, preserves writing, undoes, and exports the experiment', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mount(page);
  const run = page.getByRole('button', { name: 'Run 7-point scan', exact: true });
  await page.getByRole('button', { name: 'One eighth · 1/8', exact: true }).click();
  await run.click();
  await page.getByRole('button', { name: 'Keep scan as reference', exact: true }).click();
  await page.getByRole('slider', { name: /^Magnet strength/ }).fill('2');
  await run.click();
  await page.getByRole('button', { name: 'Log–log scale', exact: true }).click();
  await page.getByRole('button', { name: /^Inverse square/ }).click();
  await page.getByRole('combobox', { name: 'Inspect recorded measurement', exact: true }).selectOption('1');
  await page.getByRole('combobox', { name: 'Compare with reading B', exact: true }).selectOption('4');
  // A new prediction is for the next scan; it cannot rewrite this scan's prediction.
  await page.getByRole('button', { name: 'One quarter · 1/4', exact: true }).click();
  const captured = measurementState(await data(page));
  await page.getByRole('button', { name: 'Save measurement trial', exact: true }).click();
  const saved = (await data(page)).notebookTrials;
  expect(saved).toHaveLength(1);
  expect(saved[0].experiment).toMatchObject({ version: 1, type: 'field-measurements' });
  expect(saved[0].experiment).toMatchObject({ prediction: 3, graphScale: 'log', model: 2, selection: { first: 1, second: 4 } });
  expect(saved[0].experiment.nextPrediction).toBe(2);
  expect(saved[0].experiment.samples).toHaveLength(7);
  expect(saved[0].experiment.reference).toHaveLength(7);

  await page.getByRole('button', { name: 'Equatorial scan · above center', exact: true }).click();
  await page.getByRole('slider', { name: /^Magnet strength/ }).fill('3');
  await page.getByRole('slider', { name: /^Sensor uncertainty/ }).fill('12');
  await run.click();
  const priorWorkbench = measurementState(await data(page));
  await page.getByRole('tab', { name: /Electromagnet/ }).click();
  await openPanel(page, 'Evidence');
  const evidence = page.locator('[data-magnetism-shell-panel="evidence"]');
  const claim = 'Doubling magnet strength doubled the field at each matched distance.';
  const reasoning = 'Both axial scans used the same distances and uncertainty; only strength changed. This supports the claim within the dipole model.';
  await evidence.getByLabel('Claim supported by your evidence', { exact: true }).fill(claim);
  await evidence.getByLabel('Reasoning: connect the measurements to your claim', { exact: true }).fill(reasoning);
  await evidence.getByRole('button', { name: /Reopen measurements.*trial 1/i }).focus();
  await page.keyboard.press('Enter');
  await expectWorkbenchFocus(page);
  const restored = await data(page);
  expect(restored.tab).toBe('field');
  expect(restored.fieldView).toBe('map');
  expect(measurementState(restored)).toEqual(captured);
  expect(restored.notebookTrials).toEqual(saved);
  expect(restored.notebookClaim).toBe(claim);
  expect(restored.notebookReasoning).toBe(reasoning);
  await expect(page.getByRole('button', { name: 'Log–log scale', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Inverse square/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('combobox', { name: 'Inspect recorded measurement', exact: true })).toHaveValue('1');
  await expect(page.getByRole('combobox', { name: 'Compare with reading B', exact: true })).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'One quarter · 1/4', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-field-model-result]')).toContainText('Your prediction for this scan was 1/8');
  await expect(page.locator('[data-field-comparison]')).toContainText('2.00×');
  await expect(page.getByRole('button', { name: 'Undo reopen', exact: true })).toBeVisible();
  await page.locator('[data-field-measurement-studio]').screenshot({ path: join(artifacts, 'reopened-measurements-desktop.png') });

  await page.getByRole('button', { name: 'Undo reopen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expectWorkbenchFocus(page);
  const undone = await data(page);
  expect(measurementState(undone)).toEqual(priorWorkbench);
  expect(undone.notebookTrials).toEqual(saved);
  expect(undone.notebookClaim).toBe(claim);
  expect(undone.notebookReasoning).toBe(reasoning);

  await openPanel(page, 'Mission');
  const mission = page.locator('[data-magnetism-shell-panel="mission"]');
  await mission.getByText(/^Lab report ·/).click();
  const downloadEvent = page.waitForEvent('download');
  await mission.getByRole('button', { name: 'Save JSON report', exact: true }).click();
  const download = await downloadEvent;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const report = JSON.parse(await readFile(downloadedPath!, 'utf8'));
  await download.saveAs(join(artifacts, 'measurement-trial-report.json'));
  expect(report.claim).toBe(claim);
  expect(report.reasoning).toBe(reasoning);
  expect(report.trials).toHaveLength(1);
  expect(report.trials[0].experiment).toEqual(saved[0].experiment);
  const rawDownloadEvent = page.waitForEvent('download');
  await mission.getByRole('button', { name: 'Save raw field data', exact: true }).click();
  const rawDownload = await rawDownloadEvent;
  expect(rawDownload.suggestedFilename()).toMatch(/raw-field-data\.csv$/);
  const rawPath = await rawDownload.path();
  expect(rawPath).not.toBeNull();
  const rows = (await readFile(rawPath!, 'utf8')).trim().split(/\r?\n/).map((line) => line.split(','));
  const columns = rows.shift()!;
  expect(rows).toHaveLength(14);
  expect(rows.every((row) => row[columns.indexOf('trial')] === '1')).toBe(true);
  expect(rows.every((row) => Number(row[columns.indexOf('predicted_fraction_at_double_distance')]) === 0.125)).toBe(true);
  for (const run of ['current', 'reference']) {
    const runRows = rows.filter((row) => row[columns.indexOf('run')] === run);
    expect(runRows).toHaveLength(7);
    expect(runRows.every((row) => Number(row[columns.indexOf('strength')]) === (run === 'current' ? 2 : 1))).toBe(true);
  }
  await rawDownload.saveAs(join(artifacts, 'measurement-trial-raw-data.csv'));
  await mission.getByText(/^Replay & compare trials ·/).click();
  await mission.getByRole('button', { name: /Reopen measurements.*trial 1/i }).click();
  await expectWorkbenchFocus(page);
  expect(measurementState(await data(page))).toEqual(captured);
  expect((await data(page)).notebookTrials).toEqual(saved);
  expect(errors).toEqual([]);
});

test('compares two recorded readings without moving the live probe and fits on a phone', async ({ page }) => {
  await mount(page, 390);
  await page.getByRole('button', { name: 'Run 7-point scan', exact: true }).click();
  const before = await data(page);
  const first = page.getByRole('combobox', { name: 'Inspect recorded measurement', exact: true });
  const second = page.getByRole('combobox', { name: 'Compare with reading B', exact: true });
  await first.selectOption({ label: 'Current 1 · distance 50.0' });
  await second.selectOption({ label: 'Current 4 · distance 100.0' });
  const comparison = page.locator('[data-field-reading-comparison]');
  await expect(comparison).toContainText('Distance ratio rB / rA');
  await expect(comparison).toContainText('Field ratio |B|B / |B|A');
  await expect(comparison).toContainText(/2\.00/);
  await expect(comparison).toContainText(/0\.125|12\.5%/);
  await expect(comparison).toContainText(/−3\.00|-3\.00/);
  expect((await data(page)).fieldMapProbe).toEqual(before.fieldMapProbe);
  await expect(page.locator('[data-field-recorded-marker="A"]')).toHaveCount(1);
  await expect(page.locator('[data-field-recorded-marker="B"]')).toHaveCount(1);
  await expect(page.locator('[data-field-live-probe]')).toHaveCount(1);

  const bounds = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.mag-root')!;
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, rootWidth: root.clientWidth, rootScroll: root.scrollWidth };
  });
  expect(bounds.documentWidth, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewport + 1);
  expect(bounds.rootScroll, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.rootWidth + 1);
  await page.locator('[data-field-measurement-studio]').screenshot({ path: join(artifacts, 'two-readings-phone.png') });

  await page.getByRole('button', { name: 'Equatorial scan · above center', exact: true }).click();
  await page.getByRole('button', { name: 'Run 7-point scan', exact: true }).click();
  const live = (await data(page)).fieldMapProbe;
  await first.selectOption('0');
  await second.selectOption('6');
  expect((await data(page)).fieldMapProbe).toEqual(live);
  const markerBounds = await page.locator('[data-field-recorded-marker="B"]').evaluate((marker) => {
    const bounds = marker.getBoundingClientRect();
    const map = marker.closest('svg')!.getBoundingClientRect();
    return { width: bounds.width, height: bounds.height, contained: bounds.left >= map.left && bounds.right <= map.right && bounds.top >= map.top && bounds.bottom <= map.bottom };
  });
  expect(markerBounds.width).toBeGreaterThan(0);
  expect(markerBounds.height).toBeGreaterThan(0);
  expect(markerBounds.contained, JSON.stringify(markerBounds)).toBe(true);
  await page.locator('[data-field-measurement-studio]').screenshot({ path: join(artifacts, 'equatorial-recorded-markers-phone.png') });
});
