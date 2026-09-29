import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-notebook');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any, data = {}, fallback = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1400, height: 1100 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
      return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args);
    };
  });
  await harness.mount(page, data, '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
  if (fallback) await expect(page.getByRole('button', { name: 'Scale chart', exact: true })).toHaveAttribute('aria-pressed', 'true');
}
async function fly(page: any, id: string, atlas = true) {
  await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).selectOption(id);
  if (atlas) await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-objects', id);
}
async function data(page: any) { return page.evaluate(() => (window as any).__toolData); }

test('saved landmarks restore the camera and export measured observations', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await fly(page, 'honeybee');
  await page.locator('.sx-details').getByRole('button', { name: 'Veined wings', exact: true }).click();
  const canvas = page.locator('[data-atlas-ready]'), book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await expect(canvas).toHaveAttribute('data-atlas-detail', 'wings');
  await page.getByRole('button', { name: 'Orbit left', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-atlas-yaw', '-0.2000');
  await book.getByRole('textbox', { name: 'What do you notice?', exact: true }).fill('Veins branch from the thorax.\n<b>Literal text</b> & paired wings.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  const saved = (await data(page))._scaleExplorer.observations[0];
  expect(saved).toMatchObject({ itemId: 'honeybee', detailId: 'wings', size: .013, zoom: 1.8 });
  expect(saved.yaw).toBeCloseTo(-.2, 8);
  const bee = book.locator('[data-observation="honeybee:wings"]');
  await expect(bee).toContainText('1.3 cm long');
  await expect(book.locator('b')).toHaveCount(0);
  await book.getByRole('textbox').fill('Veins branch from the thorax.\nI can see the smaller hindwing.');
  await book.getByRole('button', { name: 'Update observation', exact: true }).click();
  expect((await data(page))._scaleExplorer.observations).toHaveLength(1);
  await page.locator('.sx-details').getByRole('button', { name: 'Head & antennae', exact: true }).click();
  await book.getByRole('textbox').fill('Unsaved antenna observation.');
  await fly(page, 'mitochondrion');
  await page.locator('.sx-details').getByRole('button', { name: 'Inner membrane folds', exact: true }).click();
  await book.getByRole('textbox').fill('The folds fit a large membrane into a small space.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  await page.locator('.sx-details').getByRole('button', { name: 'Outer membrane', exact: true }).click();
  await page.getByRole('button', { name: 'Scale chart', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveCount(0);
  await bee.getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail', 'wings');
  await expect(canvas).toHaveAttribute('data-atlas-yaw', '-0.2000');
  await expect(canvas).toHaveAttribute('data-atlas-zoom', '1.80');
  await expect(book.getByRole('textbox')).toHaveValue('Veins branch from the thorax.\nI can see the smaller hindwing.');
  await book.locator('[data-observation="mitochondrion:cristae"]').getByRole('button', { name: /^Return to/ }).click();
  await expect(canvas).toHaveAttribute('data-atlas-detail', 'cristae');
  await expect(canvas).toHaveAttribute('data-atlas-cutaway', 'open');
  const download = page.waitForEvent('download');
  await book.getByRole('button', { name: 'Download notes', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('scale-explorer-notebook.txt');
  const text = readFileSync((await file.path())!, 'utf8');
  expect(text).toContain('Recorded size: 1.3 cm long');
  expect(text).toContain('1.3 × 10⁻² m');
  expect(text).toContain('I can see the smaller hindwing.');
  expect(text).not.toContain('Unsaved antenna observation.');
  expect(text).toContain('https://www.ncbi.nlm.nih.gov/mesh/68051336');
  await book.screenshot({ path: path.join(out, 'desktop-notebook.png') });
  expect(errors).toEqual([]);
});

test('phone chart notes and per-feature drafts survive reopening, with recorded personal height', async ({ page }) => {
  await mount(page, { _otherTool: { keep: true } }, true);
  await page.setViewportSize({ width: 320, height: 780 });
  const book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('123');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await book.getByRole('textbox').fill('My height is the reference.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('220');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await expect(book.locator('[data-observation="human:"]')).toContainText('1.23 m tall');
  await fly(page, 'earth', false);
  await book.getByRole('textbox').fill('Unsaved Earth draft.');
  const stored = await data(page);
  expect(stored._otherTool).toEqual({ keep: true });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await harness.mount(page, stored, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}' });
  await expect(page.getByRole('button', { name: 'Scale chart', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await fly(page, 'earth', false);
  await expect(book.getByRole('textbox')).toHaveValue('Unsaved Earth draft.');
  await book.getByRole('button', { name: 'Save observation', exact: true }).click();
  await book.locator('[data-observation="human:"]').getByRole('button', { name: /^Return to/ }).click();
  expect((await data(page))._scaleExplorer.yourHeightCm).toBe(123);
  await expect(book.getByRole('textbox')).toHaveValue('My height is the reference.');
  await expect(book.locator('[data-observation="human:"]')).toContainText('1.23 m tall');
  await expect(page.getByRole('button', { name: 'Scale chart', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await book.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await book.screenshot({ path: path.join(out, 'phone-notebook.png') });
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
  await book.getByRole('button', { name: 'Download notes', exact: true }).click();
  await expect(book.getByRole('status')).toContainText('saved observations are still in the notebook');
  await expect(book.locator('[data-observation]')).toHaveCount(2);
  await book.locator('[data-observation="earth:"]').getByRole('button', { name: /^Remove observation/ }).click();
  await expect(book.locator('[data-observation]')).toHaveCount(1);
  await expect(book.locator('summary')).toBeFocused();
});

test('a full notebook protects existing notes and allows updates', async ({ page }) => {
  await mount(page, {}, true);
  const ids = await page.getByRole('combobox', { name: 'Choose a destination', exact: true }).evaluate((select: HTMLSelectElement) => Array.from(select.options).slice(0, 24).map(o => o.value));
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await harness.mount(page, { _scaleExplorer: { observations: ids.map((itemId, i) => ({ itemId, note: 'Keep ' + i, view: 'chart' })) } }, undefined, { expectCanvas: false });
  const book = page.getByRole('region', { name: 'Field notebook', exact: true });
  await expect(book.getByRole('button', { name: 'Save observation', exact: true })).toBeDisabled();
  await expect(book).toContainText('24 observations');
  await fly(page, ids[0], false);
  await book.getByRole('textbox').fill('Updated without losing any other note.');
  await book.getByRole('button', { name: 'Update observation', exact: true }).click();
  expect((await data(page))._scaleExplorer.observations).toHaveLength(24);
  expect((await data(page))._scaleExplorer.observations[1].note).toBe('Keep 1');
});
