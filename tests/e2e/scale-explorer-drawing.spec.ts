import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-drawing');
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
  return page.locator('.sx-drawing-workshop');
}
async function data(page: any) { return page.evaluate(() => (window as any).__toolData); }
async function svgDownload(page: any, workshop: any) {
  const event = page.waitForEvent('download'); await workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true }).click();
  const file = await event; expect(file.suggestedFilename()).toBe('scale-explorer-drawing.svg');
  return readFileSync((await file.path())!, 'utf8');
}
async function sceneSizes(page: any) {
  return page.evaluate(() => {
    const sizes: any = {}, record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    record.scene.traverse((r: any) => { if (r.userData.itemId && r.visible) sizes[r.userData.itemId] = r.scale.x; }); return sizes;
  });
}

test('physical units, fit-to-page planning and printable SVG retain the measured 3D comparison', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const workshop = await mount(page), comparison = page.locator('.sx-comparison-workbench');
  await comparison.locator(':scope > summary').click();
  await comparison.getByRole('combobox', { name: 'First thing', exact: true }).selectOption('earth');
  await comparison.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption('moon');
  await comparison.getByRole('button', { name: 'Compare them', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'earth:moon');
  const initial = await sceneSizes(page);
  await page.locator('.sx-comparison-summary').getByRole('button', { name: 'Make a scale drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused();
  const first = workshop.locator('[data-drawing-measure="0"]'), second = workshop.locator('[data-drawing-measure="1"]');
  await expect(first).toHaveAttribute('data-model-mm', '100');
  expect(Number(await second.getAttribute('data-model-mm'))).toBeCloseTo(100 * 3475000 / 12742000, 12);
  const unit = workshop.getByRole('combobox', { name: 'Drawing size unit', exact: true }), size = workshop.getByRole('spinbutton', { name: 'Reference size in the drawing', exact: true });
  await unit.selectOption('in'); expect(Number(await size.inputValue())).toBeCloseTo(100 / 25.4, 12);
  expect(Number(await first.getAttribute('data-model-mm'))).toBeCloseTo(100, 12);
  await unit.selectOption('mm'); expect(Number(await size.inputValue())).toBeCloseTo(100, 12);
  await unit.selectOption('cm');
  for (const invalid of ['0', '-1', '1e10']) {
    await size.fill(invalid); await expect(size).toHaveAttribute('aria-invalid', 'true');
    await expect(workshop.getByRole('button', { name: 'Save drawing plan', exact: true })).toBeDisabled();
  }
  await workshop.getByRole('button', { name: 'Fit both on the drawing', exact: true }).click();
  await expect(size).toHaveValue('16'); await expect(first).toHaveAttribute('data-model-mm', '160');
  await expect(workshop.locator('[data-drawing-off-page]')).toHaveCount(0);
  await workshop.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  const svg = await svgDownload(page, workshop);
  const dimensions = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return { errors: doc.querySelectorAll('parsererror').length, width: doc.documentElement.getAttribute('width'),
      lengths: Array.from(doc.querySelectorAll('[data-drawing-measure]')).map(line => Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))),
      ruler: doc.querySelector('[data-drawing-calibration="10"]')?.getAttribute('d'), description: doc.querySelector('desc')?.textContent };
  }, svg);
  expect(dimensions.errors).toBe(0); expect(dimensions.width).toBe('210mm'); expect(dimensions.lengths[0]).toBe(160);
  expect(dimensions.lengths[1]).toBeCloseTo(160 * 3475000 / 12742000, 12); expect(dimensions.ruler).toContain('h10');
  expect(dimensions.description).toContain('The Earth:'); expect(dimensions.description).toContain('160 mm');
  expect(dimensions.description).toContain('Dashed locators');
  expect(svg).toContain('Print at 100%'); writeFileSync(path.join(out, 'earth-moon-drawing.svg'), svg);
  const print = await context.newPage(); await print.setViewportSize({ width: 900, height: 800 }); await print.setContent(svg);
  expect((await print.locator('svg').boundingBox())!.width).toBeCloseTo(210 * 96 / 25.4, 0);
  await print.locator('svg').screenshot({ path: path.join(out, 'printable-drawing.png') }); await print.close();
  expect(await sceneSizes(page)).toEqual(initial); expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1);
  await workshop.screenshot({ path: path.join(out, 'desktop-workshop.png') }); expect(errors).toEqual([]);
});

test('captured height, drafts, saved SVG and notebook evidence survive reopening and remain independent', async ({ page }) => {
  let workshop = await mount(page, { unrelated: { keep: true }, _scaleExplorer: { yourHeightCm: 123,
    observations: [{ itemId: 'human', size: 1.23, you: true, note: 'My field note.' }], scalingRecord: { factor: '2', reflection: 'My cube explanation.' } } }, true);
  await workshop.locator(':scope > summary').click();
  await workshop.getByRole('combobox', { name: 'Drawing reference', exact: true }).selectOption('human');
  await workshop.getByRole('combobox', { name: 'Second drawing measurement', exact: true }).selectOption('trex');
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Use cardboard. <b>Literal plan</b> & dimensions.');
  await workshop.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  const saved = (await data(page))._scaleExplorer.drawingRecord; expect(saved.reference).toEqual({ id: 'human', size: 1.23, you: true });
  await workshop.getByRole('spinbutton', { name: 'Reference size in the drawing', exact: true }).fill('20');
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Unsaved plan excluded from exports.');
  await page.getByRole('spinbutton', { name: 'Your height in centimetres', exact: true }).fill('165');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  const stored = await data(page); expect(stored.unrelated).toEqual({ keep: true }); expect(stored._scaleExplorer.drawingDraft.reference.size).toBe(1.23);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  workshop = await mount(page, stored, true); await workshop.locator(':scope > summary').click();
  await expect(workshop.getByRole('spinbutton', { name: 'Reference size in the drawing', exact: true })).toHaveValue('20');
  const svg = await svgDownload(page, workshop);
  expect(svg).toContain('1.23 m'); expect(svg).toContain('Literal plan'); expect(svg).not.toContain('Unsaved plan');
  expect(svg).toContain('data-model-mm="100"'); expect(svg).toContain('&lt;b&gt;Literal plan&lt;/b&gt;');
  await workshop.getByRole('button', { name: 'Return to saved drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused();
  await expect(workshop.getByRole('textbox', { name: 'My drawing plan', exact: true })).toHaveValue(saved.note);
  await expect(workshop.locator('b')).toHaveCount(0);
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Another unsaved plan.');
  const downloaded = page.waitForEvent('download'); await workshop.getByRole('button', { name: 'Download drawing notes', exact: true }).click();
  const notes = readFileSync((await (await downloaded).path())!, 'utf8');
  expect(notes).toContain('My field note.'); expect(notes).toContain('My cube explanation.'); expect(notes).toContain(saved.note);
  expect(notes).toContain('1.23 m'); expect(notes).not.toContain('Another unsaved plan.');
  await workshop.getByRole('combobox', { name: 'Drawing size unit', exact: true }).selectOption('in');
  await workshop.getByRole('spinbutton', { name: 'Reference size in the drawing', exact: true }).fill('2');
  await workshop.getByRole('button', { name: 'Update drawing plan', exact: true }).click();
  expect((await data(page))._scaleExplorer.drawingRecord).toMatchObject({ size: '2', unit: 'in' });
  await workshop.getByRole('button', { name: 'Remove saved drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused();
  await expect(workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true })).toBeDisabled();
  await expect(workshop.getByRole('textbox', { name: 'My drawing plan', exact: true })).toHaveValue('Another unsaved plan.');
  const remaining = await data(page); expect(remaining._scaleExplorer.scalingRecord.factor).toBe('2'); expect(remaining._scaleExplorer.observations[0].note).toBe('My field note.');
});

test('phone fallback keeps tiny lengths exact, marks distance overflow and retains plans after a failed download', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const workshop = await mount(page, { _scaleExplorer: { drawingRecord: { reference: { id: 'earth' }, target: { id: 'moon' }, size: '0', unit: 'cm' } } }, true);
  await page.setViewportSize({ width: 320, height: 800 }); await workshop.locator(':scope > summary').click();
  await expect(workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true })).toBeDisabled();
  const reference = workshop.getByRole('combobox', { name: 'Drawing reference', exact: true }), target = workshop.getByRole('combobox', { name: 'Second drawing measurement', exact: true });
  await reference.selectOption('sun'); await target.selectOption('alpha-cen-dist');
  await expect(workshop.locator('[data-drawing-off-page="1"]')).toBeVisible();
  await expect(workshop.locator('[data-drawing-measure="1"]')).toHaveAttribute('stroke-dasharray', '2 2');
  await expect(workshop).toContainText('Continues beyond the page');
  await workshop.getByRole('button', { name: 'Fit both on the drawing', exact: true }).click();
  await expect(reference).toHaveValue('alpha-cen-dist'); await expect(workshop.locator('[data-drawing-off-page]')).toHaveCount(0);
  await reference.selectOption('earth'); await target.selectOption('proton');
  const tiny = workshop.locator('[data-drawing-measure="1"]');
  expect(Number(await tiny.getAttribute('x2'))).toBeGreaterThan(0); expect(Number(await tiny.getAttribute('x2'))).toBeLessThan(1e-15);
  await expect(workshop.locator('[data-drawing-locator="1"]')).toBeVisible();
  await expect(workshop).toContainText('not object diameters');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await workshop.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Downloads unavailable'); }; });
  await workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true }).click();
  await expect(workshop.getByRole('status')).toContainText('saved plan is still in the notebook');
  expect((await data(page))._scaleExplorer.drawingRecord.reference.id).toBe('earth');
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0); expect(errors).toEqual([]);
  await workshop.screenshot({ path: path.join(out, 'phone-workshop.png') });
});
