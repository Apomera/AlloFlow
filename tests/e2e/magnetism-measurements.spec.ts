import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js',
  toolId: 'magnetism',
  width: 1080,
  height: 1800,
  layout: 'document',
});
const artifacts = join(process.cwd(), 'tmp', 'magnetism-enhancement');
const seed = {
  magnetism: {
    tab: 'field', fieldView: 'map', learningMode: 'guided',
    fieldMapProbe: { x: 90, y: 0 }, fieldMapPath: 'axial',
    fieldMapStrength: 1, fieldMapNoise: 0, fieldMapSamples: [],
    fieldMapReference: [], missionId: 'field_detective',
    labShellPanel: '', labShellMenuOpen: false,
    notebookTrials: [], notebookOpen: false,
  },
};

test.describe.configure({ mode: 'serial', timeout: 90_000, retries: 0 });
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

test('retains a reference scan, compares captured settings, and exports both measurement sets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mount(page);
  const run = page.getByRole('button', { name: 'Run 7-point scan', exact: true });
  await run.click();
  const first = (await data(page)).fieldMapSamples;
  expect(first).toHaveLength(7);
  await page.getByRole('button', { name: 'Keep scan as reference', exact: true }).click();
  const reference = (await data(page)).fieldMapReference;
  expect(reference).toHaveLength(7);
  reference.forEach((sample: any, index: number) => {
    for (const key of ['x', 'y', 'distance', 'path', 'strength', 'noisePercent', 'measuredBx', 'measuredBy', 'measuredMagnitude', 'uncertainty']) {
      expect(sample[key], 'captured ' + key).toEqual(first[index][key]);
    }
  });

  await page.getByRole('slider', { name: /^Magnet strength/ }).fill('2');
  // Moving a control cannot retroactively alter a captured scan.
  expect((await data(page)).fieldMapReference).toEqual(reference);
  expect((await data(page)).fieldMapSamples).toEqual(first);
  await run.click();
  const doubled = (await data(page)).fieldMapSamples;
  expect(doubled).toHaveLength(7);
  doubled.forEach((sample: any, index: number) => {
    expect(sample.distance).toBe(first[index].distance);
    expect(sample.measuredMagnitude / first[index].measuredMagnitude).toBeCloseTo(2, 10);
  });
  expect((await data(page)).fieldMapReference).toEqual(reference);
  await expect(page.locator('#mag-panel-field')).toContainText(/2\.00\s*[×x]/);

  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export field measurements/ }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/magnetism.*\.csv$/);
  const location = await download.path();
  expect(location).not.toBeNull();
  const csv = await readFile(location!, 'utf8');
  const csvLines = csv.trim().split(/\r?\n/);
  expect(csvLines).toHaveLength(15);
  expect(csvLines[0]).toContain('uncertainty');
  expect(csvLines.filter((line) => line.startsWith('current,'))).toHaveLength(7);
  expect(csvLines.filter((line) => line.startsWith('reference,'))).toHaveLength(7);
  await page.locator('#mag-panel-field').screenshot({ path: join(artifacts, 'measurement-comparison-desktop.png') });

  await page.getByRole('button', { name: 'Clear measurements', exact: true }).click();
  expect((await data(page)).fieldMapSamples).toEqual([]);
  expect((await data(page)).fieldMapReference).toEqual(reference);
  await page.getByRole('button', { name: 'Clear reference', exact: true }).click();
  expect((await data(page)).fieldMapReference).toEqual([]);
  expect(errors).toEqual([]);
});

test('offers keyboard inspection, log scaling, and competing models without phone overflow', async ({ page }) => {
  await mount(page, 390);
  await page.getByRole('button', { name: 'Run 7-point scan', exact: true }).click();
  const selector = page.getByRole('combobox', { name: 'Inspect recorded measurement' });
  await expect(selector).toBeVisible();
  const firstValue = await selector.inputValue();
  const next = page.getByRole('button', { name: 'Next reading', exact: true });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(selector).not.toHaveValue(firstValue);
  await page.getByRole('button', { name: 'Previous reading', exact: true }).click();
  await expect(selector).toHaveValue(firstValue);
  await page.getByRole('button', { name: 'Log–log scale', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log–log scale', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const model of ['Inverse distance', 'Inverse square', 'Inverse cube']) {
    await expect(page.locator('#mag-panel-field')).toContainText(model);
  }

  const layout = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.mag-root')!;
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, rootWidth: root.clientWidth, rootScroll: root.scrollWidth };
  });
  expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport + 1);
  expect(layout.rootScroll, JSON.stringify(layout)).toBeLessThanOrEqual(layout.rootWidth + 1);
  await page.locator('#mag-panel-field').screenshot({ path: join(artifacts, 'measurement-models-phone.png') });
});

test('isolates path changes, flags mixed uncertainty, and plots the full manual distance', async ({ page }) => {
  await mount(page);
  const studio = page.locator('[data-field-measurement-studio="true"]');
  const run = page.getByRole('button', { name: 'Run 7-point scan', exact: true });
  await run.click();
  await page.getByRole('button', { name: 'Keep scan as reference', exact: true }).click();
  await page.getByRole('button', { name: 'Equatorial scan · above center', exact: true }).click();
  await run.click();
  await expect(page.locator('[data-field-comparison]')).toContainText('0.50× across 7 matching distances');
  await expect(page.locator('[data-field-comparison]')).toContainText(/Only path changed/);

  await page.getByRole('button', { name: 'Axial scan · beyond N pole', exact: true }).click();
  await run.click();
  await page.getByRole('slider', { name: /^Sensor uncertainty/ }).fill('20');
  await page.getByRole('button', { name: 'Record current probe', exact: true }).click();
  await expect(studio.locator('.mag-observe')).toContainText('Comparison caution');
  await expect(studio.locator('.mag-observe')).toContainText(/uncertainty/i);
  await expect(page.locator('[data-field-model-result]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Keep scan as reference', exact: true })).toBeDisabled();
  await studio.screenshot({ path: join(artifacts, 'measurement-uncertainty-caution.png') });

  await page.getByRole('button', { name: 'Clear reference', exact: true }).click();
  await page.getByRole('button', { name: 'Clear measurements', exact: true }).click();
  await page.getByRole('slider', { name: /^Probe x position/ }).fill('175');
  await page.getByRole('slider', { name: /^Probe y position/ }).fill('115');
  await page.getByRole('button', { name: 'Record current probe', exact: true }).click();
  const farDistance = Math.hypot(175, 115);
  await expect(page.locator('[data-field-inspected]')).toContainText('Distance ' + farDistance.toFixed(1));
  const graph = page.getByRole('img', { name: /^Field versus distance\./ });
  const plotted = await graph.evaluate((svg) => {
    const ticks = [...svg.querySelectorAll('text')]
      .filter((text) => Number(text.getAttribute('y')) > 250 && /^\d+$/.test(text.textContent || ''))
      .map((text) => ({ distance: Number(text.textContent), x: Number(text.getAttribute('x')) }))
      .sort((a, b) => a.distance - b.distance);
    const marker = [...svg.querySelectorAll('g')].find((group) => group.querySelector('title')?.textContent?.startsWith('Current reading 1:'));
    return { ticks, x: Number(marker?.querySelector('circle')?.getAttribute('cx')) };
  });
  expect(plotted.ticks).toHaveLength(3);
  const left = plotted.ticks[0];
  const right = plotted.ticks[2];
  expect(right.distance).toBeGreaterThanOrEqual(farDistance);
  expect(plotted.x).toBeCloseTo(left.x + (farDistance - left.distance) / (right.distance - left.distance) * (right.x - left.x), 5);

  await studio.getByText(/^Measurement table ·/).click();
  await page.addScriptTag({ path: join(process.cwd(), 'node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-field-measurement-studio="true"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  await studio.screenshot({ path: join(artifacts, 'measurement-far-probe.png') });
});
