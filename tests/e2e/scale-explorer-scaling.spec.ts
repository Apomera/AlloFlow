import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-scaling');
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
  return page.locator('.sx-scaling-lab');
}
async function pair(page: any, a: string, b: string) {
  const panel = page.locator('.sx-comparison-workbench');
  if (await panel.getAttribute('open') === null) await panel.locator(':scope > summary').click();
  await panel.getByRole('combobox', { name: 'First thing', exact: true }).selectOption(a);
  await panel.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption(b);
}
async function data(page: any) { return page.evaluate(() => (window as any).__toolData); }
async function shapeRatio(lab: any) {
  const squares = lab.locator('[data-scaling-kind="square"]');
  return Number(await squares.locator('[data-scaling-shape="copy"]').getAttribute('width')) / Number(await squares.locator('[data-scaling-shape="original"]').getAttribute('width'));
}

test('the model shows square and cube relationships without changing the measured 3D specimens', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const lab = await mount(page);
  await pair(page, 'earth', 'moon');
  await page.locator('.sx-comparison-workbench').getByRole('button', { name: 'Compare them', exact: true }).click();
  const canvas = page.locator('[data-atlas-ready]');
  await expect(canvas).toHaveAttribute('data-atlas-comparison', 'earth:moon');
  const dimensions = await page.evaluate(() => {
    const sizes: any = {}, record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    record.scene.traverse((r: any) => { if (r.userData.itemId && r.visible) sizes[r.userData.itemId] = r.scale.x; }); return sizes;
  });
  await page.getByRole('button', { name: 'Explore length, area and volume', exact: true }).click();
  await expect(lab.locator(':scope > summary')).toBeFocused();
  const results = lab.locator('.sx-scaling-results');
  await expect(results).toHaveAttribute('data-area-factor', '4'); await expect(results).toHaveAttribute('data-volume-factor', '8');
  expect(await shapeRatio(lab)).toBe(2);
  await expect(lab.locator('[data-scaling-kind="cube"] [data-scaling-grid="copy"]')).toHaveCount(1);
  await lab.getByRole('button', { name: 'Triple the edge', exact: true }).click();
  await expect(results).toHaveAttribute('data-volume-factor', '27'); expect(await shapeRatio(lab)).toBeCloseTo(3, 12);
  await lab.getByRole('button', { name: 'Half the edge', exact: true }).click();
  await expect(results).toHaveAttribute('data-volume-factor', '0.125');
  await expect(results).toHaveAttribute('data-relative-surface-volume', '2');
  expect(await shapeRatio(lab)).toBe(.5);
  await expect(lab.locator('[data-scaling-kind="cube"] [data-scaling-grid="original"]')).toHaveCount(1);
  const factor = lab.getByRole('spinbutton', { name: 'Edge multiplier', exact: true });
  for (const invalid of ['0', '-1', '1e46']) {
    await factor.fill(invalid); await expect(factor).toHaveAttribute('aria-invalid', 'true');
    await expect(lab.getByRole('button', { name: 'Save model evidence', exact: true })).toBeDisabled();
    await expect(results).toHaveCount(0);
  }
  await lab.getByRole('button', { name: 'Use selected length ratio', exact: true }).click();
  const ratio = 12742000 / 3475000;
  expect(Number(await results.getAttribute('data-edge-factor'))).toBeCloseTo(ratio, 12);
  expect(Number(await results.getAttribute('data-volume-factor'))).toBeCloseTo(ratio ** 3, 10);
  await expect(lab.locator('.sx-scaling-reference')).toContainText('cube model supplies the shape assumption');
  await expect(lab).toContainText('does not establish their area, volume or mass');
  const after = await page.evaluate(() => {
    const sizes: any = {}, record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    record.scene.traverse((r: any) => { if (r.userData.itemId && r.visible) sizes[r.userData.itemId] = r.scale.x; }); return sizes;
  });
  expect(after).toEqual(dimensions); expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1);
  await lab.screenshot({ path: path.join(out, 'desktop-model.png') }); expect(errors).toEqual([]);
});

test('drafts, captured references and saved model explanations reopen and export independently', async ({ page }) => {
  let lab = await mount(page, { unrelated: { keep: true }, _scaleExplorer: { yourHeightCm: 123,
    observations: [{ itemId: 'human', size: 1.23, you: true, note: 'My field note.' }] } });
  await pair(page, 'human', 'trex'); await lab.locator(':scope > summary').click();
  await lab.getByRole('button', { name: 'Use selected length ratio', exact: true }).click();
  await lab.getByRole('textbox', { name: 'My model explanation', exact: true }).fill('Doubling each edge needs eight unit cubes.\n<b>Literal explanation</b>');
  await lab.getByRole('button', { name: 'Save model evidence', exact: true }).click();
  const saved = (await data(page))._scaleExplorer.scalingRecord;
  expect(saved.reference.small).toEqual({ id: 'human', size: 1.23, you: true });
  await lab.getByRole('button', { name: 'Triple the edge', exact: true }).click();
  await lab.getByRole('textbox', { name: 'My model explanation', exact: true }).fill('Unsaved explanation.');
  const stored = await data(page); expect(stored.unrelated).toEqual({ keep: true });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  lab = await mount(page, stored); await lab.locator(':scope > summary').click();
  await expect(lab.getByRole('spinbutton', { name: 'Edge multiplier', exact: true })).toHaveValue('3');
  await expect(lab.getByRole('textbox', { name: 'My model explanation', exact: true })).toHaveValue('Unsaved explanation.');
  await lab.getByRole('button', { name: 'Return to saved model', exact: true }).click();
  await expect(lab.locator(':scope > summary')).toBeFocused(); await expect(lab).toContainText('1.23 m');
  await expect(lab.getByRole('textbox', { name: 'My model explanation', exact: true })).toHaveValue(saved.reflection);
  await expect(lab.locator('b')).toHaveCount(0);
  await lab.getByRole('textbox', { name: 'My model explanation', exact: true }).fill('Draft excluded from model download.');
  const download = page.waitForEvent('download'); await lab.getByRole('button', { name: 'Download model notes', exact: true }).click();
  const text = readFileSync((await (await download).path())!, 'utf8');
  expect(text).toContain('My field note.'); expect(text).toContain('Similar-shape model evidence');
  expect(text).toContain('1.23 m'); expect(text).toContain('Every corresponding edge');
  expect(text).toContain('<b>Literal explanation</b>'); expect(text).not.toContain('Draft excluded');
  await lab.getByRole('button', { name: 'Double the edge', exact: true }).click();
  await lab.getByRole('button', { name: 'Update model evidence', exact: true }).click();
  expect((await data(page))._scaleExplorer.scalingRecord.factor).toBe('2');
  await lab.getByRole('button', { name: 'Remove saved model', exact: true }).click();
  await expect(lab.locator(':scope > summary')).toBeFocused();
  await expect(lab.getByRole('button', { name: 'Download model notes', exact: true })).toBeDisabled();
  expect((await data(page))._scaleExplorer.observations[0].note).toBe('My field note.');
  await expect(lab.getByRole('textbox', { name: 'My model explanation', exact: true })).toHaveValue('Draft excluded from model download.');
});

test('phone fallback explains extreme ratios and excludes distance references from the cube model', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const lab = await mount(page, {}, true); await page.setViewportSize({ width: 320, height: 800 });
  await pair(page, 'sun', 'alpha-cen-dist'); await lab.locator(':scope > summary').click();
  await expect(lab.getByRole('button', { name: 'Use selected length ratio', exact: true })).toBeDisabled();
  await expect(lab).toContainText('A distance reference is not an edge of a solid.');
  await lab.getByRole('spinbutton', { name: 'Edge multiplier', exact: true }).fill('1e45');
  await expect(lab.locator('.sx-scaling-results')).toHaveAttribute('data-volume-factor', String(1e45 * 1e45 * 1e45));
  const width = Number(await lab.locator('[data-scaling-kind="cube"] [data-scaling-shape="original"]').getAttribute('width'));
  expect(width).toBeLessThan(1e-40); await expect(lab.locator('[data-scaling-kind="cube"] [data-scaling-locator="original"]')).toBeVisible();
  await expect(lab.locator('.sx-scaling-table')).toContainText('10¹³⁵');
  await expect(lab.getByRole('slider', { name: 'Adjust edge factor', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const labels = await lab.locator('[data-scaling-kind="cube"] text').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  }));
  expect(labels.every(label => label.left >= 0 && label.right <= 321 && label.height >= 11)).toBe(true);
  await lab.getByRole('button', { name: 'Save model evidence', exact: true }).click();
  expect(errors).toEqual([]);
  expect((await data(page))._scaleExplorer.scalingRecord).toMatchObject({ factor: '1e+45' });
  await expect(lab.getByRole('button', { name: 'Download model notes', exact: true })).toBeEnabled();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
  await lab.getByRole('button', { name: 'Download model notes', exact: true }).click();
  await expect(lab.getByRole('status')).toContainText('saved work is still in the notebook');
  expect((await data(page))._scaleExplorer.scalingRecord.factor).toBe('1e+45');
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0);
  await lab.screenshot({ path: path.join(out, 'phone-extreme-model.png') });
});
