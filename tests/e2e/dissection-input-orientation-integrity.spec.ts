import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection',
  width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const base = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
  workspaceMode: 'advanced', procedureMode: 'guided', visualRealism: 'accessible', reducedMotion: true,
  soundEnabled: false, sceneDetail: false, revealedLayers: {}, procedureByLayer: {},
  inspectionLens: true, lensFocusDepth: 'structure', lensPinned: false, canvasZoom: 1.5,
  organNotes: { 'frog|tympanum': 'Retain this observation.' } };

test.describe.configure({ retries: 0, timeout: 150000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

test('canvas leaves browser modifiers and composition untouched while preserving Shift panning', async ({ page }) => {
  await harness.mount(page, { dissection: base }, undefined, { expectCanvas: false });
  const canvas = page.locator('[data-diss-canvas]');
  await canvas.focus();
  const initial = await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { view: d.anatomicalView, depth: d.lensFocusDepth, pinned: d.lensPinned, zoom: d.canvasZoom,
      panX: d.canvasPanX || 0, panY: d.canvasPanY || 0, notes: d.organNotes };
  });
  const prevented = await canvas.evaluate(node => {
    const results: boolean[] = [];
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }]) {
      for (const key of ['f', 'p', 'r', 'ArrowRight', 'Enter', 'Escape']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifier });
        node.dispatchEvent(event);
        results.push(event.defaultPrevented);
      }
    }
    return results;
  });
  expect(prevented.every(value => value === false)).toBe(true);
  expect(await page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { view: d.anatomicalView, depth: d.lensFocusDepth, pinned: d.lensPinned, zoom: d.canvasZoom,
      panX: d.canvasPanX || 0, panY: d.canvasPanY || 0, notes: d.organNotes };
  })).toEqual(initial);
  await page.keyboard.press('Shift+ArrowRight');
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.canvasPanX || 0)).not.toBe(initial.panX);
});

test('canvas displays an orientation cue before showing the route in its preparation view', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__orientationCanvasText = [];
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const text = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.clearRect = function (...args: [number, number, number, number]) {
      if (this.canvas.matches('[data-diss-canvas]')) (window as any).__orientationCanvasText = [];
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillText = function (value, x, y, maxWidth) {
      if (this.canvas.matches('[data-diss-canvas]')) (window as any).__orientationCanvasText.push(String(value));
      return maxWidth === undefined ? text.call(this, value, x, y) : text.call(this, value, x, y, maxWidth);
    };
  });
  await harness.mount(page, { dissection: base }, undefined, { expectCanvas: false });
  await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => (window as any).__orientationCanvasText)).toContain('ORIENT TO VENTRAL VIEW');
  expect(await page.evaluate(() => (window as any).__orientationCanvasText.some((value: string) => value.startsWith('SAFE')))).toBe(false);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'anatomicalView', 'ventral'));
  await expect.poll(() => page.evaluate(() => (window as any).__orientationCanvasText)).toContain('SAFE \u00B7 VENTRAL MIDLINE');
  expect(await page.evaluate(() => (window as any).__orientationCanvasText.some((value: string) => value.startsWith('ORIENT TO')))).toBe(false);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(base.organNotes);
});

test('Essentials explains unavailable inspection controls and Advanced enables them', async ({ page }) => {
  await harness.mount(page, { dissection: { ...base, workspaceMode: 'essentials', toolbarViewOpen: true,
    inspectionLens: false, visualRealism: 'guided' } }, undefined, { expectCanvas: false });
  const presentation = page.getByRole('button', { name: 'Visual presentation: cycle guided, realistic, and accessible', exact: true });
  const inspection = page.locator('[data-diss-view-subgroup="inspection"] button');
  const macro = page.getByRole('button', { name: 'Toggle docked macro inspection view', exact: true });
  await expect(presentation).toBeDisabled();
  await expect(inspection).toHaveCount(4);
  for (const button of await inspection.all()) await expect(button).toBeDisabled();
  await expect(macro).toBeDisabled();
  await expect(page.locator('#diss-view-inspection-help')).toContainText('available in Advanced');
  await page.getByRole('button', { name: 'Advanced workspace', exact: true }).click();
  const viewButton = page.getByRole('button', { name: 'View and accessibility options', exact: true });
  if (await viewButton.getAttribute('aria-expanded') !== 'true') await viewButton.click();
  await expect(presentation).toBeEnabled();
  for (const button of await inspection.all()) await expect(button).toBeEnabled();
  await expect(macro).toBeEnabled();
  const lens = page.getByRole('button', { name: 'Toggle movable inspection lens', exact: true });
  await lens.click();
  await expect(lens).toHaveAttribute('aria-pressed', 'true');
  await presentation.click();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.visualRealism)).toBe('realistic');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(base.organNotes);
});
