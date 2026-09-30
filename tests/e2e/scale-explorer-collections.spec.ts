import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-collections');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any, data = {}, fallback = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1400, height: 1100 });
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
async function stored(page: any) { return page.evaluate(() => (window as any).__toolData); }
async function openCollection(workshop: any) { await workshop.locator('.sx-drawing-collection > summary').click(); }
async function add(workshop: any, id: string) {
  await workshop.getByRole('combobox', { name: 'Measurement to add', exact: true }).selectOption(id);
  await workshop.getByRole('button', { name: 'Add to drawing', exact: true }).click();
  await expect(workshop.getByRole('combobox', { name: 'Measurement to add', exact: true })).toBeFocused();
}
async function svgDownload(page: any, workshop: any) {
  const event = page.waitForEvent('download'); await workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true }).click();
  const file = await event; expect(file.suggestedFilename()).toBe('scale-explorer-drawing.svg'); return readFileSync((await file.path())!, 'utf8');
}
async function sceneSizes(page: any) {
  return page.evaluate(() => {
    const sizes: any = {}, record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost());
    record.scene.traverse((r: any) => { if (r.userData.itemId && r.visible) sizes[r.userData.itemId] = r.scale.x; }); return sizes;
  });
}

test('eight-measurement collections fit and print without changing the measured 3D comparison', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const workshop = await mount(page), comparison = page.locator('.sx-comparison-workbench');
  await comparison.locator(':scope > summary').click();
  await comparison.getByRole('combobox', { name: 'First thing', exact: true }).selectOption('earth');
  await comparison.getByRole('combobox', { name: 'Second thing', exact: true }).selectOption('moon');
  await comparison.getByRole('button', { name: 'Compare them', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'earth:moon');
  const initial = await sceneSizes(page);
  await page.locator('.sx-comparison-summary').getByRole('button', { name: 'Make a scale drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused(); await openCollection(workshop);
  const picker = workshop.getByRole('combobox', { name: 'Measurement to add', exact: true }), addButton = workshop.getByRole('button', { name: 'Add to drawing', exact: true });
  await picker.selectOption('earth'); await expect(addButton).toBeDisabled(); await expect(workshop).toContainText('already on this drawing');
  for (const id of ['jupiter', 'sun', 'human', 'rbc', 'dna', 'trex']) await add(workshop, id);
  await expect(workshop.locator('.sx-drawing-additions > li')).toHaveCount(6);
  await picker.selectOption('proton'); await expect(addButton).toBeDisabled(); await expect(workshop).toContainText('All eight places are filled');
  await expect(workshop.locator('.sx-drawing-table tbody tr')).toHaveCount(8);
  await workshop.getByRole('button', { name: 'Fit all on the drawing', exact: true }).click();
  await expect(workshop.getByRole('combobox', { name: 'Drawing reference', exact: true })).toHaveValue('sun');
  await expect(workshop.locator('[data-drawing-item="sun"]')).toHaveAttribute('data-model-mm', '160');
  await expect(workshop.locator('[data-drawing-off-page]')).toHaveCount(0);
  await expect(workshop.getByRole('status')).toContainText('All 8 dimensions fit');
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Compare worlds, a person and microscopic widths at one scale.');
  await workshop.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  const svg = await svgDownload(page, workshop), dimensions = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    return { errors: doc.querySelectorAll('parsererror').length, width: doc.documentElement.getAttribute('width'), height: doc.documentElement.getAttribute('height'),
      rows: Array.from(doc.querySelectorAll('[data-drawing-measure]')).map(line => ({ id: line.getAttribute('data-drawing-item'), mm: Number(line.getAttribute('data-model-mm')), length: Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')) })),
      ruler: doc.querySelector('[data-drawing-calibration="10"]')?.getAttribute('d'), description: doc.querySelector('desc')?.textContent };
  }, svg);
  expect(dimensions.errors).toBe(0); expect(dimensions.width).toBe('210mm'); expect(dimensions.height).toBe('283mm');
  expect(dimensions.rows.map(row => row.id).sort()).toEqual(['earth', 'moon', 'jupiter', 'sun', 'human', 'rbc', 'dna', 'trex'].sort());
  for (const row of dimensions.rows) { expect(row.length).toBe(row.mm); expect(row.length).toBeGreaterThan(0); expect(row.length).toBeLessThanOrEqual(160); }
  expect(dimensions.ruler).toContain('h10'); expect(dimensions.description).toContain('Jupiter:'); expect(dimensions.description).toContain('The width of a DNA double helix:');
  expect(dimensions.description).toContain('Print at 100%'); writeFileSync(path.join(out, 'model-collection.svg'), svg);
  const print = await context.newPage(); await print.setViewportSize({ width: 900, height: 1200 }); await print.setContent(svg);
  expect((await print.locator('svg').boundingBox())!.width).toBeCloseTo(210 * 96 / 25.4, 0);
  await print.locator('svg').screenshot({ path: path.join(out, 'printable-collection.png') }); await print.close();
  expect(await sceneSizes(page)).toEqual(initial); expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1);
  await workshop.screenshot({ path: path.join(out, 'desktop-collection.png') }); expect(errors).toEqual([]);
});

test('sorting, removal and new heights edit the draft while saved collection evidence survives reopening', async ({ page }) => {
  let workshop = await mount(page, { unrelated: { keep: true }, _scaleExplorer: { yourHeightCm: 123,
    drawingRecord: { reference: { id: 'earth' }, target: { id: 'moon' }, size: '10', unit: 'cm', note: 'My old pair.' },
    observations: [{ itemId: 'human', size: 1.23, you: true, note: 'My field note.' }], scalingRecord: { factor: '2', reflection: 'My cube explanation.' } } }, true);
  await workshop.locator(':scope > summary').click(); await openCollection(workshop);
  for (const id of ['human', 'rbc', 'jupiter']) await add(workshop, id);
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Use cardboard. <b>Literal collection</b> & dimensions.');
  await workshop.getByRole('button', { name: 'Update drawing plan', exact: true }).click();
  const saved = (await stored(page))._scaleExplorer.drawingRecord;
  expect(saved.extras.map((item: any) => item.id)).toEqual(['human', 'rbc', 'jupiter']); expect(saved.extras[0]).toEqual({ id: 'human', size: 1.23, you: true });
  await workshop.getByRole('button', { name: 'Sort additions by length', exact: true }).click();
  await expect.poll(async () => (await stored(page))._scaleExplorer.drawingDraft.extras.map((item: any) => item.id)).toEqual(['rbc', 'human', 'jupiter']);
  await workshop.getByRole('button', { name: 'Remove You from the drawing', exact: true }).click();
  await expect(workshop.getByRole('combobox', { name: 'Measurement to add', exact: true })).toBeFocused();
  await page.getByRole('spinbutton', { name: 'Your height in centimetres', exact: true }).fill('165');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click(); await add(workshop, 'human');
  await workshop.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Unsaved collection excluded from exports.');
  const draftData = await stored(page); expect(draftData.unrelated).toEqual({ keep: true }); expect(draftData._scaleExplorer.drawingRecord).toEqual(saved);
  expect(draftData._scaleExplorer.drawingDraft.extras.at(-1)).toEqual({ id: 'human', size: 1.65, you: true });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  workshop = await mount(page, draftData, true); await workshop.locator(':scope > summary').click();
  await expect(workshop.getByRole('textbox', { name: 'My drawing plan', exact: true })).toHaveValue('Unsaved collection excluded from exports.');
  const svg = await svgDownload(page, workshop); expect(svg).toContain('1.23 m'); expect(svg).toContain('Literal collection'); expect(svg).not.toContain('1.65 m');
  expect(svg).not.toContain('Unsaved collection'); expect(svg).toContain('&lt;b&gt;Literal collection&lt;/b&gt;');
  expect((svg.match(/data-drawing-measure=/g) || [])).toHaveLength(5);
  await workshop.getByRole('button', { name: 'Return to saved drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused();
  await expect.poll(async () => (await stored(page))._scaleExplorer.drawingDraft).toEqual(saved);
  await expect(workshop.locator('b')).toHaveCount(0);
  const event = page.waitForEvent('download'); await workshop.getByRole('button', { name: 'Download drawing notes', exact: true }).click();
  const notes = readFileSync((await (await event).path())!, 'utf8');
  for (const text of ['My field note.', 'My cube explanation.', saved.note, 'You: 1.23 m', 'Jupiter:', 'A red blood cell:']) expect(notes).toContain(text);
  expect(notes).not.toContain('Unsaved collection');
  await openCollection(workshop); await workshop.getByRole('button', { name: 'Remove Jupiter from the drawing', exact: true }).click();
  await workshop.getByRole('button', { name: 'Update drawing plan', exact: true }).click();
  expect((await stored(page))._scaleExplorer.drawingRecord.extras.map((item: any) => item.id)).toEqual(['human', 'rbc']);
  await workshop.getByRole('button', { name: 'Remove saved drawing', exact: true }).click();
  await expect(workshop.locator(':scope > summary')).toBeFocused();
  await expect(workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true })).toBeDisabled();
  const remaining = (await stored(page))._scaleExplorer;
  expect(remaining.drawingDraft.extras).toHaveLength(2); expect(remaining.scalingRecord.factor).toBe('2'); expect(remaining.observations[0].note).toBe('My field note.');
  await workshop.getByRole('combobox', { name: 'Second drawing measurement', exact: true }).selectOption('earth');
  await add(workshop, 'sun'); await workshop.getByRole('button', { name: 'Fit all on the drawing', exact: true }).click();
  await expect(workshop.locator('[data-drawing-measure]')).toHaveCount(4);
  await expect(workshop.getByRole('status')).toContainText('All 4 dimensions fit');
});

test('phone fallback sanitizes additions, preserves distance and tiny dimensions, and retains a failed download', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const workshop = await mount(page, { _scaleExplorer: {
    drawingDraft: { reference: { id: 'earth' }, target: { id: 'moon' }, size: '10', unit: 'cm', extras: [{ id: 'earth' }, { id: 'moon' }, { id: '__proto__' }, null] },
    drawingRecord: { reference: { id: 'earth' }, target: { id: 'moon' }, size: '0', unit: 'cm', extras: [{ id: 'sun' }] } } }, true);
  await page.setViewportSize({ width: 320, height: 800 }); await workshop.locator(':scope > summary').click(); await openCollection(workshop);
  await expect(workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true })).toBeDisabled();
  expect((await stored(page))._scaleExplorer.drawingDraft.extras).toEqual([]);
  await add(workshop, 'alpha-cen-dist'); await add(workshop, 'proton');
  await expect(workshop.locator('[data-drawing-off-page="2"]')).toBeVisible();
  await expect(workshop.locator('[data-drawing-item="alpha-cen-dist"]')).toHaveAttribute('stroke-dasharray', '2 2');
  const tiny = workshop.locator('[data-drawing-item="proton"]');
  expect(Number(await tiny.getAttribute('x2'))).toBeGreaterThan(0); expect(Number(await tiny.getAttribute('x2'))).toBeLessThan(1e-15);
  await expect(workshop.locator('[data-drawing-locator="3"]')).toBeVisible();
  await expect(workshop).toContainText('not object diameters');
  await workshop.getByRole('button', { name: 'Fit all on the drawing', exact: true }).click();
  await expect(workshop.getByRole('combobox', { name: 'Drawing reference', exact: true })).toHaveValue('alpha-cen-dist');
  await expect(workshop.locator('[data-drawing-measure]')).toHaveCount(4); await expect(workshop.locator('[data-drawing-off-page]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await workshop.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Downloads unavailable'); }; });
  await workshop.getByRole('button', { name: 'Download saved drawing SVG', exact: true }).click();
  await expect(workshop.getByRole('status')).toHaveCount(1); await expect(workshop.getByRole('status')).toContainText('saved plan is still in the notebook');
  const saved = (await stored(page))._scaleExplorer.drawingRecord;
  expect([saved.reference, saved.target, ...saved.extras].map((item: any) => item.id).sort()).toEqual(['alpha-cen-dist', 'earth', 'moon', 'proton'].sort());
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0); expect(errors).toEqual([]);
  await workshop.screenshot({ path: path.join(out, 'phone-collection.png') });
});
