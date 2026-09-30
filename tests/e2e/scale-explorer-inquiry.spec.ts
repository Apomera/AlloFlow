import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 180000 });
test.use({ video: 'off', trace: 'off' });
const out = path.resolve('reports/scale-explorer-inquiry');
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
  const panel = page.locator('.sx-inquiry');
  await panel.locator(':scope > summary').click();
  return panel;
}
async function start(panel: any, theme: string) {
  await panel.getByRole('combobox', { name: 'Investigation theme', exact: true }).selectOption(theme);
  await panel.getByRole('button', { name: 'Start investigation', exact: true }).click();
}
async function predict(panel: any, value: string) {
  await panel.getByRole('spinbutton').fill(value);
  await panel.getByRole('spinbutton').press('Enter');
  await expect(panel.locator('.sx-prediction-plot')).toBeVisible();
}
async function data(page: any) { return page.evaluate(() => (window as any).__toolData); }
async function ratio(page: any, big: string, small: string) {
  return page.evaluate(({ big, small }: any) => {
    const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost()), sizes: any = {};
    record.scene.traverse((root: any) => { if (root.userData.itemId && root.visible) sizes[root.userData.itemId] = root.scale.x; });
    return sizes[big] / sizes[small];
  }, { big, small });
}

test('themed predictions use exact log positions, save reflections and open the measured 3D comparison', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const panel = await mount(page);
  await start(panel, 'worlds');
  const estimate = panel.getByRole('spinbutton'), lock = panel.getByRole('button', { name: 'Lock in my estimate', exact: true });
  await expect(lock).toBeDisabled();
  for (const value of ['-1', '46']) {
    await estimate.fill(value); await estimate.press('Enter');
    await expect(lock).toBeDisabled(); await expect(estimate).toHaveAttribute('aria-invalid', 'true');
    await expect(panel.locator('.sx-prediction-plot')).toHaveCount(0);
  }
  await predict(panel, '0');
  await expect(estimate).toBeDisabled();
  expect((await data(page))._scaleExplorer.estimateCount).toBe(1);
  const plot = panel.locator('.sx-prediction-plot'), measured = Math.log10(12742000 / 3475000);
  expect(Number(await plot.getAttribute('data-measured'))).toBeCloseTo(measured, 12);
  expect(Number(await plot.locator('[data-prediction-point="guess"]').getAttribute('cx'))).toBe(20);
  expect(Number(await plot.locator('[data-prediction-point="actual"]').getAttribute('cx'))).toBeCloseTo(20 + measured / 3 * 260, 10);
  await expect(panel.locator('.sx-inquiry-evidence')).toContainText('smaller than the measured ratio');
  const reflection = panel.getByRole('textbox', { name: 'My reflection', exact: true });
  await reflection.fill('The Moon fits about 3.67 times across Earth.\n<b>Literal reflection</b> & widths.');
  await panel.getByRole('button', { name: 'Save investigation', exact: true }).click();
  await expect(panel.locator('[data-investigation]')).toHaveCount(1);
  await expect(panel.locator('b')).toHaveCount(0);
  await reflection.fill('Updated: a fraction of a decade can still be a substantial size ratio.');
  await panel.getByRole('button', { name: 'Update investigation', exact: true }).click();
  await expect(panel.locator('[data-investigation]')).toHaveCount(1);
  await reflection.fill('Unsaved reflection must stay out of the downloaded evidence.');
  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download investigations', exact: true }).click();
  const file = await download, text = readFileSync((await file.path())!, 'utf8');
  expect(text).toContain('Saved scale investigations');
  expect(text).toContain('Prediction: 0 powers of ten');
  expect(text).toContain('Measured gap: 0.56 powers of ten');
  expect(text).toContain('3475 km · across'); expect(text).toContain('Updated: a fraction');
  expect(text).not.toContain('Unsaved reflection');
  await panel.screenshot({ path: path.join(out, 'desktop-investigation.png') });
  await panel.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'moon:earth');
  expect(await ratio(page, 'earth', 'moon')).toBeCloseTo(12742000 / 3475000, 10);
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1);
  for (const [theme, title] of [['home', 'From human scale to Earth'], ['cells', 'DNA and a blood cell'], ['worlds', 'Earth and Moon'],
    ['stars', 'Earth and Sun'], ['matter', 'Inside an atom'], ['distance', 'A star and the gap to another']]) {
    await start(panel, theme); await expect(panel.getByRole('heading', { level: 4 })).toHaveText(title);
  }
  await predict(panel, '10');
  await expect(panel.locator('.sx-inquiry-evidence')).toContainText('larger than the measured ratio');
  await expect(panel.locator('.sx-inquiry-evidence')).toContainText('One reference is a diameter and one is a distance.');
  await panel.getByRole('button', { name: 'Another pair', exact: true }).click();
  await predict(panel, '5');
  const randomGap = Number(await plot.getAttribute('data-measured'));
  expect(randomGap).toBeGreaterThanOrEqual(2); expect(randomGap).toBeLessThanOrEqual(20);
  expect(errors).toEqual([]);
});

test('captured height and drafts survive reopening and recorded comparisons restore their measurements', async ({ page }) => {
  let panel = await mount(page, { unrelated: { keep: true }, _scaleExplorer: { observations: [{ itemId: 'human', size: 1.23, you: true, note: 'Original field note.' }] } });
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('123');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await start(panel, 'home'); await predict(panel, '6.5');
  await panel.getByRole('textbox', { name: 'My reflection', exact: true }).fill('My height is the measured reference.');
  const original = (await data(page))._scaleExplorer.inquiryDraft;
  expect(original.small).toEqual({ id: 'human', size: 1.23, you: true });
  const measured = Number(await panel.locator('.sx-prediction-plot').getAttribute('data-measured'));
  await page.getByRole('spinbutton', { name: 'Your height in centimetres' }).fill('220');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  expect(Number(await panel.locator('.sx-prediction-plot').getAttribute('data-measured'))).toBe(measured);
  const stored = await data(page);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  panel = await mount(page, stored);
  await expect(panel.getByRole('spinbutton')).toHaveValue('6.5');
  await expect(panel.getByRole('textbox', { name: 'My reflection', exact: true })).toHaveValue('My height is the measured reference.');
  await expect(panel.locator('.sx-inquiry-evidence')).toContainText('1.23 m');
  await panel.getByRole('button', { name: 'Save investigation', exact: true }).click();
  await start(panel, 'worlds'); await predict(panel, '.5');
  await panel.getByRole('button', { name: 'Save investigation', exact: true }).click();
  await panel.locator('[data-investigation="' + original.id + '"]').getByRole('button', { name: /^Return to investigation:/ }).click();
  await expect(panel.locator(':scope > summary')).toBeFocused();
  expect((await data(page))._scaleExplorer.yourHeightCm).toBe(220);
  await panel.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'human:earth');
  expect(await ratio(page, 'earth', 'human')).toBeCloseTo(12742000 / 1.23, 6);
  const after = await data(page);
  expect(after.unrelated).toEqual({ keep: true }); expect(after._scaleExplorer.yourHeightCm).toBe(123);
  expect(after._scaleExplorer.observations[0].note).toBe('Original field note.');
  expect(after._scaleExplorer.estimateCount).toBe(2);
  await panel.locator('[data-investigation="' + original.id + '"]').getByRole('button', { name: /^Remove investigation:/ }).click();
  await expect(panel.locator('.sx-inquiry-history > summary')).toBeFocused();
  await expect(panel.locator('[data-investigation]')).toHaveCount(1);
  await expect(panel.getByRole('textbox', { name: 'My reflection', exact: true })).toHaveValue('My height is the measured reference.');
  expect((await data(page))._scaleExplorer.inquiryDraft.id).toBe(original.id);
});

test('phone fallback keeps readable evidence, capacity controls and saved work when downloading fails', async ({ page }) => {
  const records = Array.from({ length: 12 }, (_, index) => ({ id: 'inquiry-1-' + index, theme: 'worlds', small: { id: 'moon' }, big: { id: 'earth' },
    guess: '.5', revealed: true, reflection: 'Saved reflection ' + index }));
  const panel = await mount(page, { _scaleExplorer: { investigations: records, inquiryDraft: records[0] } }, true);
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(panel.getByRole('button', { name: 'Update investigation', exact: true })).toBeEnabled();
  await panel.getByRole('textbox', { name: 'My reflection', exact: true }).fill('Updated at capacity.');
  await panel.getByRole('button', { name: 'Update investigation', exact: true }).click();
  expect((await data(page))._scaleExplorer.investigations).toHaveLength(12);
  await start(panel, 'cells'); await predict(panel, '3.5');
  await expect(panel.getByRole('button', { name: 'Save investigation', exact: true })).toBeDisabled();
  await expect(panel).toContainText('Remove one to save another');
  const labels = await panel.locator('.sx-prediction-plot text').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height, left: box.left, right: box.right };
  }));
  expect(labels.every(label => label.height >= 11 && label.left >= 0 && label.right <= 321)).toBe(true);
  expect(labels[1].top).toBeGreaterThan(labels[0].bottom);
  expect(labels[2].top).toBeGreaterThan(labels[1].bottom);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await panel.screenshot({ path: path.join(out, 'phone-investigation.png') });
  await panel.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('.sx-comparison-diagram')).toBeVisible();
  await expect(page.locator('.sx-comparison-summary')).toContainText('DNA');
  await panel.locator('[data-investigation="inquiry-1-0"]').getByRole('button', { name: /^Remove investigation:/ }).click();
  await expect(panel.getByRole('button', { name: 'Save investigation', exact: true })).toBeEnabled();
  await panel.getByRole('button', { name: 'Save investigation', exact: true }).click();
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
  await panel.getByRole('button', { name: 'Download investigations', exact: true }).click();
  await expect(panel.getByRole('status').filter({ hasText: 'The download could not start here.' })).toContainText('saved work is still in the notebook');
  expect((await data(page))._scaleExplorer.investigations).toHaveLength(12);
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0);
});
