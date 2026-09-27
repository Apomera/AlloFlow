import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
const out = path.resolve('reports/micro-lab-enhancement-2026-09-27');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: any, state = {}, width = 1280) {
  await page.setViewportSize({ width, height: 960 });
  await harness.mount(page, { microbiology: { tab: 'growthLab', ...state } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  await expect(page.locator('[data-microbiology-tool]')).toBeVisible();
}
async function slider(page: any, id: string, key: string) { await page.locator(id).focus(); await page.keyboard.press(key); }
const notebook = (page: any) => page.evaluate(() => (window as any).__toolData.microbiology.growthInvestigation);

test('predicts, compares, keeps immutable evidence, restores state, and downloads full notebook', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, { growthLab: { hypothesis: 'My earlier hypothesis', explanation: 'My earlier explanation', log: [{ profile: 'E. coli', t: 30, p: 7, o: 50, state: 'Slow' }] } });
  await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Does E. coli need oxygen?', exact: true }).click();
  await page.getByRole('radio', { name: 'Lower population', exact: true }).check();
  await page.getByLabel('My reasoning for the next run', { exact: true }).fill('Without oxygen, E. coli should grow more slowly.');
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await expect(page.locator('[data-design=single]')).toContainText('Oxygen availability');
  await expect(page.locator('[data-micro-growth-result]')).toContainText('Your prediction matches this run');
  const first = (await notebook(page)).trials[0];
  expect(first.control.oxygen).toBe(100); expect(first.conditions.oxygen).toBe(0);
  await page.getByLabel('My evidence and explanation', { exact: true }).fill('Both populations grow. The no-oxygen curve grows more slowly, so oxygen helps but is not essential here.');
  await page.getByText('Open the accessible data table', { exact: true }).click();
  await expect(page.locator('[data-micro-growth-result] .micro-growth-table-wrap tbody tr')).toHaveCount(25);
  await page.locator('[data-micro-growth-result]').screenshot({ path: path.join(out, 'growth-result-desktop.png') });
  await slider(page, '#gl-tempC', 'ArrowLeft');
  await page.getByRole('button', { name: 'Use current conditions as control', exact: true }).click();
  expect((await notebook(page)).trials[0].control).toEqual(first.control);
  await slider(page, '#gl-tempC', 'ArrowLeft');
  await slider(page, '#gl-oxygen', 'End');
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await expect(page.locator('[data-design=confounded]')).toContainText('Multiple variables changed');
  await page.getByRole('button', { name: /^Trial 1/ }).click();
  await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-microbiology-focus]')).toBeVisible();
  await page.getByRole('tab', { name: 'Growth Lab', exact: true }).click();
  await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  await page.getByText('Notes from the earlier Growth Lab', { exact: true }).click();
  await expect(page.getByText('My earlier hypothesis', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download notebook', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('micro-lab-notebook.txt');
  await download.saveAs(path.join(out, 'sample-notebook.txt'));
  const exported = readFileSync(path.join(out, 'sample-notebook.txt'), 'utf8');
  expect(exported).toContain('Both populations grow'); expect(exported).toContain('Oxygen availability 100/100');
  expect(exported).toContain('Model hour\tControl\tTrial');
  const csvPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download trial CSV', exact: true }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe('micro-lab-trials.csv');
  await csv.saveAs(path.join(out, 'sample-trials.csv'));
  expect(readFileSync(path.join(out, 'sample-trials.csv'), 'utf8')).toContain('control_oxygen_availability_0_100');
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount(data), saved);
  await expect(page.getByLabel('My evidence and explanation', { exact: true })).toHaveValue(/Both populations grow/);
  expect(errors).toEqual([]);
});

test('microscope scale and optical limits, then resistance extinction on a phone', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, { tab: 'microscope' });
  const scope = page.getByRole('region', { name: 'Virtual microscope investigation', exact: true });
  await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click();
  await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  await expect(scope).toContainText('Slides observed: 1/5');
  await expect(scope).toContainText('Model field width: 9 µm');
  await scope.screenshot({ path: path.join(out, 'microscope-desktop.png') });
  await scope.getByRole('button', { name: 'T4 bacteriophage', exact: true }).click();
  await expect(scope).toContainText('Head and tail cannot be resolved');
  await scope.getByRole('button', { name: 'Use recommended setup', exact: true }).click();
  await scope.getByRole('button', { name: 'Focus assist', exact: true }).click();
  await expect(scope).toContainText('A head, tail, and tail fibers');
  await expect(scope).toContainText('Slides observed: 2/5');
  await page.setViewportSize({ width: 390, height: 844 });
  await scope.screenshot({ path: path.join(out, 'microscope-phone.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('tab', { name: 'Resistance', exact: true }).click();
  await page.getByRole('slider', { name: 'Initial resistance', exact: true }).focus(); await page.keyboard.press('Home');
  await page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true }).focus(); await page.keyboard.press('End');
  await page.getByRole('radio', { name: 'No survivors to compare', exact: true }).check();
  await page.getByRole('button', { name: 'Step round', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Step round', exact: true })).toBeDisabled();
  await expect(page.getByText('The population died out.', { exact: false })).toBeVisible();
  await page.getByRole('radio', { name: 'No cells survived, so the final resistant share is undefined.', exact: true }).check();
  await page.getByRole('button', { name: 'Submit explanation', exact: true }).click();
  await expect(page.getByText('Explanation confirmed.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Step round', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'resistance-phone.png') });
  expect(errors).toEqual([]);
});

test('phone, keyboard tabs, no-growth meaning, and notebook capacity', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, {}, 390);
  await page.getByRole('button', { name: 'When oxygen inhibits growth', exact: true }).click();
  await page.getByRole('radio', { name: 'Not sure yet', exact: true }).check();
  await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await expect(page.locator('.micro-growth-metrics')).toContainText('5.0');
  await expect(page.locator('[data-micro-growth-result]')).toContainText('a flat curve does not mean the cells are dead');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: path.join(out, 'growth-phone.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Growth Lab', exact: true }).focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Home', exact: true })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Home', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Growth Lab', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'micro-tab-growthLab');
  for (let i = 1; i < 12; i++) await page.getByRole('button', { name: 'Run comparison', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove selected trial', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeEnabled();
  expect((await notebook(page)).trials).toHaveLength(11);
  await page.evaluate(() => document.body.classList.add('theme-contrast'));
  await page.locator('.micro-growth-intro').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(out, 'growth-contrast-phone.png') });
});

test('visits every section and handles invalid saved growth state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, { growthLab: { profile: '__proto__', tempC: 'bad', pH: null, oxygen: {} }, growthInvestigation: { control: [], trials: [null, {}], hypothesis: {} } });
  await expect(page.locator('#gl-profile')).toHaveValue('ecoli');
  await page.getByRole('button', { name: 'Show topic library', exact: true }).click();
  const tabs = await page.getByRole('tab').allTextContents();
  for (let i = 0; i < tabs.length; i++) {
    await page.getByRole('tab').nth(i).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Microbial growth discovery' })).toBeVisible();
  expect(errors).toEqual([]);
});
