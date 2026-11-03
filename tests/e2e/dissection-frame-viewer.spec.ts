import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const out = 'reports/dissection-frame-viewer-2026-11-01';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_FRAME_TOOL || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin', workspaceMode: 'advanced', toolbarToolsOpen: true, evidenceNotebookOpen: true,
  reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Original captured observation.' }, organConfidence: { 'frog|dorsal_skin': 2 }, visualEvidence: [], verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
test.describe.configure({ retries: 0, timeout: 120000 }); test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.unmount(page));
for (const width of [320, 390, 1180, 1440]) test('reads and zooms the original saved frame with keyboard recovery at ' + width + 'px', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: width === 320 ? 540 : 950 });
  if (width === 320) await page.emulateMedia({ forcedColors: 'active' });
  await harness.mount(page, { dissection: { ...initial, highContrast: width === 390, largeText: width === 390 } }, undefined, { expectCanvas: false });
  if (width === 1180) await page.evaluate(() => document.body.classList.add('theme-contrast'));
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  await page.waitForFunction(() => typeof (document.querySelector('[data-diss-canvas]') as any)?._captureDissectionEvidence === 'function');
  await page.locator('[data-evidence-capture]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence.length)).toBe(1);
  const savedFrame = await page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence[0]); expect(savedFrame.image.length).toBeGreaterThan(1000);
  const opener = page.locator('[data-frame-viewer-open]'); await opener.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /Saved frame reading view: Frame 1/ }), close = dialog.getByRole('button', { name: 'Close frame view', exact: true });
  await expect(dialog).toBeVisible(); await expect(close).toBeFocused();
  if (width === 1180) {
    const contrast = await dialog.locator('.diss-observation-reader__header').evaluate(node => {
      const lightness = (color: string) => { const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : Math.pow((value + .055) / 1.055, 2.4)); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
      const foreground = lightness(getComputedStyle(node.querySelector('h3')!).color), background = lightness(getComputedStyle(node).backgroundColor);
      return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(7);
  }

  const viewport = dialog.locator('[data-frame-viewer-viewport]'), img = viewport.locator('img'); await expect(img).toHaveAttribute('src', savedFrame.image);
  await expect.poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 1)).toBe(true);
  const fitted = await viewport.evaluate(node => ({ viewport: node.clientWidth, image: node.querySelector('img')!.getBoundingClientRect().width }));
  expect(fitted.image / fitted.viewport).toBeCloseTo(1, 2); await expect(img).toHaveCSS('max-height', 'none'); await expect(img).toHaveCSS('aspect-ratio', 'auto');
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click(); await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('200% of view width');
  const enlarged = await viewport.evaluate(node => ({ viewport: node.clientWidth, image: node.querySelector('img')!.getBoundingClientRect().width, transition: getComputedStyle(node.querySelector('img')!).transition }));
  await writeFile(out + '/zoom-' + width + '.json', JSON.stringify({ fitted, enlarged }, null, 2));
  await expect.poll(() => viewport.evaluate(node => node.querySelector('img')!.getBoundingClientRect().width / node.clientWidth)).toBeCloseTo(2, 2);
  await viewport.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  await expect.poll(() => viewport.evaluate(node => node.scrollLeft)).toBeGreaterThan(0); await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Tab'); await expect(close).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(viewport).toBeFocused();
  await dialog.getByRole('button', { name: 'Fit width', exact: true }).click(); await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('100% of view width');
  expect(await viewport.evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }))).toEqual({ left: 0, top: 0 });
  await expect(close).toBeInViewport(); expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await dialog.screenshot({ path: out + '/frame-view-' + width + '.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-frame-viewer]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
  await viewport.focus(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
  await page.keyboard.press('Space'); await expect(dialog).toBeVisible(); await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('100% of view width'); await close.click(); await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')?.visualEvidence?.length)).toBe(1);
  const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection); expect(state.visualEvidence[0]).toEqual(savedFrame); expect(state.organNotes).toEqual(initial.organNotes); expect(state.organConfidence).toEqual(initial.organConfidence); expect(state.exploredOrgans).toEqual(initial.exploredOrgans); expect(state.verifiedIdentifications).toEqual({}); expect(state.quizScore).toBe(1); expect(state.quizTotal).toBe(2); expect(errors).toEqual([]);
});
