import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

test.describe.configure({ mode: 'serial', retries: 0, timeout: 360000 });
const out = path.resolve('reports/scale-explorer-workspace');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_scaleexplorer.js', toolId: 'scaleExplorer', width: 1400, height: 1100,
  layout: 'document', preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['vendor/three-r128/GLTFLoader.js'] });
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); });

async function mount(page: any, data = {}, fallback = false, width = 1400) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width, height: 1100 });
  if (fallback) await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: any, ...args: any[]): any {
      return /webgl/i.test(type) ? null : (original as any).call(this, type, ...args);
    };
  });
  await harness.mount(page, data, '!!document.querySelector("[data-atlas-ready]")', { expectCanvas: !fallback });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function data(page: any) { return page.evaluate(() => (window as any).__toolData); }
async function tab(page: any, label: string) {
  await page.getByRole('tab', { name: label, exact: true }).click();
  await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
}
async function begin(page: any, theme: string, estimate: string) {
  await tab(page, 'Investigate'); const panel = page.locator('.sx-inquiry');
  await panel.getByRole('combobox', { name: 'Investigation theme', exact: true }).selectOption(theme);
  await panel.getByRole('button', { name: 'Start investigation', exact: true }).click();
  await panel.getByRole('spinbutton').fill(estimate); await panel.getByRole('spinbutton').press('Enter');
  await expect(panel.locator('.sx-prediction-plot')).toBeVisible(); return panel;
}
async function download(page: any, button: any) {
  const event = page.waitForEvent('download'); await button.click();
  const file = await event; return { filename: file.suggestedFilename(), text: readFileSync((await file.path())!, 'utf8') };
}

test('one measured investigation links the 3D comparison, collection drawing and explanation into a saved notebook record', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { unrelated: { keep: true } });
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1); await expect(page.locator('.sx-inquiry')).toBeHidden();
  await page.getByRole('spinbutton', { name: 'Your height in centimetres', exact: true }).fill('123');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  const inquiry = await begin(page, 'home', '6.5');
  await inquiry.getByRole('textbox', { name: 'My investigation question', exact: true }).fill('How can my height anchor a drawing of Earth?');
  const id = (await data(page))._scaleExplorer.inquiryDraft.id;
  await inquiry.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Compare', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-atlas-ready]')).toBeFocused();
  await expect(page.locator('[data-atlas-ready]')).toHaveAttribute('data-atlas-comparison', 'human:earth');
  const ratio = await page.evaluate(() => {
    const record = (window as any).__glRecorder.records.find((r: any) => !r.ctx.isContextLost()), sizes: any = {};
    record.scene.traverse((r: any) => { if (r.userData.itemId && r.visible) sizes[r.userData.itemId] = r.scale.x; });
    return sizes.earth / sizes.human;
  });
  expect(ratio).toBeCloseTo(12742000 / 1.23, 6);
  await page.getByRole('spinbutton', { name: 'Your height in centimetres', exact: true }).fill('220');
  await page.getByRole('button', { name: 'Use my height', exact: true }).click();
  await page.locator('[data-workflow-step="2"]').click();
  const drawing = page.locator('.sx-drawing-workshop');
  await expect(page.getByRole('tab', { name: 'Draw', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(drawing.locator('[data-drawing-item="human"]')).toHaveAttribute('data-model-mm', String(160 * (1.23 / 12742000)));
  await drawing.locator('.sx-drawing-collection > summary').click();
  await drawing.getByRole('combobox', { name: 'Measurement to add', exact: true }).selectOption('jupiter');
  await drawing.getByRole('button', { name: 'Add to drawing', exact: true }).click();
  await drawing.getByRole('button', { name: 'Fit all on the drawing', exact: true }).click();
  await drawing.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Keep my recorded 1.23 m height. <b>Literal drawing</b>.');
  await drawing.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  await expect(drawing.getByRole('status')).toContainText('Save the linked investigation');
  await drawing.getByRole('button', { name: 'Continue my explanation', exact: true }).click();
  await expect(inquiry.getByRole('textbox', { name: 'My reflection', exact: true })).toBeFocused();
  await inquiry.getByRole('textbox', { name: 'My reflection', exact: true }).fill('The lengths share one scale; this does not establish a volume ratio. <i>Literal explanation</i>.');
  await page.getByRole('button', { name: 'Save linked investigation', exact: true }).click();
  await expect(page.locator('.sx-investigation-workspace')).toHaveAttribute('data-investigation-dirty', 'false');
  await expect(page.locator('[data-evidence-count]')).toHaveAttribute('data-evidence-count', '4');
  const stored = await data(page), saved = stored._scaleExplorer.investigations[0];
  expect(saved.id).toBe(id); expect(saved.small).toEqual({ id: 'human', size: 1.23, you: true });
  expect(saved.comparison.small).toEqual(saved.small); expect(saved.drawing.reference.id).toBe('jupiter');
  expect(saved.drawing.target).toEqual(saved.small); expect(stored._scaleExplorer.yourHeightCm).toBe(220);
  expect(stored.unrelated).toEqual({ keep: true });
  await tab(page, 'Notebook'); const entry = page.locator('[data-investigation="' + id + '"]');
  await expect(entry).toContainText(saved.question); await expect(entry.locator('[data-saved-evidence-count]')).toHaveAttribute('data-saved-evidence-count', '4');
  const svg = await download(page, entry.getByRole('button', { name: 'Download investigation drawing', exact: true }));
  expect(svg.filename).toBe('scale-explorer-drawing.svg'); expect(svg.text).toContain('1.23 m'); expect(svg.text).not.toContain('2.2 m');
  expect(svg.text).toContain('&lt;b&gt;Literal drawing&lt;/b&gt;'); writeFileSync(path.join(out, 'investigation-drawing.svg'), svg.text);
  const notebook = await download(page, page.locator('.sx-inquiry-history').getByRole('button', { name: 'Download investigations', exact: true }));
  for (const text of [saved.question, saved.reflection, saved.drawing.note, 'Drawing evidence saved with this investigation.', '1.23 m', 'Jupiter:']) expect(notebook.text).toContain(text);
  writeFileSync(path.join(out, 'investigation-notebook.txt'), notebook.text);
  await page.locator('.sx-panel').screenshot({ path: path.join(out, 'desktop-notebook.png') });
  await tab(page, 'Draw'); await drawing.screenshot({ path: path.join(out, 'desktop-drawing.png') });
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1); expect(errors).toEqual([]);
});

test('phone tabs support keyboard navigation and reopened drafts retain their workspace and exact saved evidence', async ({ page }) => {
  await mount(page, { _scaleExplorer: { yourHeightCm: 123 }, unrelated: 'retained' }, true, 320);
  const explore = page.getByRole('tab', { name: 'Explore', exact: true }); await explore.focus(); await explore.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Notebook', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Notebook', exact: true }).press('Home'); await expect(explore).toBeFocused();
  await explore.press('End'); await expect(page.getByRole('tab', { name: 'Notebook', exact: true })).toBeFocused();
  const inquiry = await begin(page, 'home', '6.5');
  await inquiry.getByRole('textbox', { name: 'My investigation question', exact: true }).fill('<script>plain question</script>');
  await inquiry.getByRole('button', { name: 'Draw investigation measurements', exact: true }).click();
  const drawing = page.locator('.sx-drawing-workshop');
  await drawing.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Original saved drawing evidence.');
  await drawing.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  await drawing.getByRole('button', { name: 'Continue my explanation', exact: true }).click();
  await inquiry.getByRole('textbox', { name: 'My reflection', exact: true }).fill('Original saved explanation.');
  await page.getByRole('button', { name: 'Save linked investigation', exact: true }).click();
  const original = (await data(page))._scaleExplorer.investigations[0];
  await tab(page, 'Draw');
  await drawing.getByRole('textbox', { name: 'My drawing plan', exact: true }).fill('Unsaved investigation drawing draft.');
  const draftData = await data(page);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  await mount(page, draftData, true, 320);
  await expect(page.getByRole('tab', { name: 'Draw', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(drawing.getByRole('textbox', { name: 'My drawing plan', exact: true })).toHaveValue('Unsaved investigation drawing draft.');
  await drawing.getByRole('combobox', { name: 'Second drawing measurement', exact: true }).selectOption('moon');
  await expect(drawing.locator('.sx-drawing-investigation')).toContainText('no longer contains both investigation measurements');
  await drawing.getByRole('button', { name: 'Update drawing plan', exact: true }).click();
  expect((await data(page))._scaleExplorer.investigations[0]).toEqual(original);
  expect((await data(page))._scaleExplorer.inquiryDraft.drawing).toEqual(original.drawing);
  await begin(page, 'worlds', '.5');
  expect((await data(page))._scaleExplorer.inquiryDraft).toMatchObject({ comparison: null, drawing: null, question: '' });
  await tab(page, 'Notebook'); const entry = page.locator('[data-investigation="' + original.id + '"]');
  const svg = await download(page, entry.getByRole('button', { name: 'Download investigation drawing', exact: true }));
  expect(svg.text).toContain(original.drawing.note); expect(svg.text).not.toContain('Unsaved investigation drawing draft'); expect(svg.text).toContain('1.23 m');
  await entry.getByRole('button', { name: /^Return to investigation:/ }).click();
  await expect(page.getByRole('tab', { name: 'Investigate', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(inquiry.getByRole('textbox', { name: 'My investigation question', exact: true })).toHaveValue(original.question);
  await inquiry.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(page.locator('.sx-comparison-diagram')).toBeFocused();
  await tab(page, 'Investigate');
  await inquiry.getByRole('button', { name: 'Draw investigation measurements', exact: true }).click();
  await expect(drawing.getByRole('textbox', { name: 'My drawing plan', exact: true })).toHaveValue(original.drawing.note);
  expect((await data(page))._scaleExplorer.drawingDraft.target).toEqual(original.small);
  expect((await data(page)).unrelated).toBe('retained');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('.sx-panel').screenshot({ path: path.join(out, 'phone-workspace.png') });
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(0);
});

test('legacy and malformed records remain usable at capacity and failed downloads keep all saved evidence', async ({ page }) => {
  const records = Array.from({ length: 12 }, (_, index) => ({ id: 'inquiry-workspace-' + index, theme: 'worlds', small: { id: 'moon' }, big: { id: 'earth' },
    guess: '.5', revealed: true, reflection: 'Legacy explanation ' + index }));
  records[0] = { ...records[0], drawing: { reference: { id: 'sun' }, target: { id: 'earth' }, size: '16', unit: 'cm' }, comparison: { small: { id: 'human' }, big: { id: 'earth' } } } as any;
  await mount(page, { _scaleExplorer: { workspaceView: 'constructor', investigations: records, inquiryDraft: records[0], observations: [{ itemId: 'human', note: 'Keep this field observation.' }] } }, true);
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true');
  await tab(page, 'Investigate'); const inquiry = page.locator('.sx-inquiry');
  expect((await data(page))._scaleExplorer.inquiryDraft).toMatchObject({ comparison: null, drawing: null });
  await inquiry.getByRole('textbox', { name: 'My investigation question', exact: true }).fill('A revised question at capacity.');
  await page.getByRole('button', { name: 'Save linked investigation', exact: true }).click();
  expect((await data(page))._scaleExplorer.investigations).toHaveLength(12);
  await begin(page, 'stars', '2'); await expect(page.getByRole('button', { name: 'Save linked investigation', exact: true })).toBeDisabled();
  await tab(page, 'Notebook'); await page.locator('[data-investigation="inquiry-workspace-1"]').getByRole('button', { name: /^Remove investigation:/ }).click();
  await expect(page.locator('.sx-inquiry-history > summary')).toBeFocused();
  await tab(page, 'Investigate'); await expect(page.getByRole('button', { name: 'Save linked investigation', exact: true })).toBeEnabled();
  await inquiry.getByRole('button', { name: 'Draw investigation measurements', exact: true }).click();
  await page.locator('.sx-drawing-workshop').getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  await page.getByRole('button', { name: 'Save linked investigation', exact: true }).click();
  const before = (await data(page))._scaleExplorer.investigations;
  await tab(page, 'Notebook'); await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Download unavailable'); }; });
  await page.locator('.sx-inquiry-history').getByRole('button', { name: 'Download investigations', exact: true }).click();
  await expect(page.locator('.sx-inquiry-history').getByRole('status')).toContainText('saved work is still in the notebook');
  await page.locator('[data-investigation]').first().getByRole('button', { name: 'Download investigation drawing', exact: true }).click();
  await expect(page.locator('.sx-notebook').getByRole('status')).toContainText('saved plan is still in the notebook');
  expect((await data(page))._scaleExplorer.investigations).toEqual(before);
  expect((await data(page))._scaleExplorer.observations[0].note).toBe('Keep this field observation.');
  await page.getByRole('button', { name: 'Show all tools', exact: true }).click();
  await expect(page.getByRole('tablist')).toHaveCount(0); await expect(page.locator('.sx-workspace-panel')).toHaveCount(6);
  await expect(page.locator('.sx-inquiry-history')).toHaveCount(1); await expect(page.locator('.sx-notebook')).toBeVisible();
  await page.getByRole('button', { name: 'Show focused tabs', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('phone comparison handoffs show the live scene and connect its drawing to the same captured pair', async ({ page }) => {
  await mount(page, {}, false, 320);
  const inquiry = await begin(page, 'worlds', '.5');
  await inquiry.getByRole('button', { name: 'Show me', exact: true }).click();
  const canvas = page.locator('[data-atlas-ready]');
  await expect(canvas).toBeFocused(); await expect(canvas).toHaveAttribute('data-atlas-comparison', 'moon:earth');
  const box = (await canvas.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(-1); expect(box.y + box.height).toBeLessThanOrEqual(1101);
  await page.locator('.sx-comparison-summary').getByRole('button', { name: 'Make a scale drawing', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Draw', exact: true })).toHaveAttribute('aria-selected', 'true');
  const drawing = page.locator('.sx-drawing-workshop');
  await expect(drawing.locator('.sx-drawing-investigation')).toContainText('adds drawing evidence');
  await drawing.getByRole('button', { name: 'Save drawing plan', exact: true }).click();
  const stored = (await data(page))._scaleExplorer;
  expect(stored.inquiryDraft.comparison).toMatchObject({ small: { id: 'moon' }, big: { id: 'earth' } });
  expect(stored.inquiryDraft.drawing).toMatchObject({ reference: { id: 'moon' }, target: { id: 'earth' } });
  expect(stored.drawingInquiryId).toBe(stored.inquiryDraft.id);
  expect((await harness.glContexts(page)).filter(record => !record.lost)).toHaveLength(1);
});
