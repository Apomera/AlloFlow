import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-ruler-endpoint-2026-10-31';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const start = { x: .2, y: .3 }, end = { x: .4, y: .5 };
const notes = { 'frog|dorsal_skin': 'A saved observation remains separate from this model distance.' };
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }

for (const width of [390, 1440]) {
  test(`ruler end point adjustment preserves the current measurement at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: width === 390 ? 'essentials' : 'advanced',
      rulerStart: start, rulerEnd: end, rulerMode: false, annotateMode: false, annotations: [{ x: .7, y: .8, type: 'dot' }],
      reducedMotion: true, soundEnabled: false, highContrast: width === 390, largeText: width === 390,
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: notes, organConfidence: { 'frog|dorsal_skin': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const edit = page.locator('[data-diss-measurement-end-edit]'), guide = page.locator('.diss-point-mode'), canvas = page.locator('[data-diss-canvas]');
    await edit.focus(); await page.keyboard.press('Enter'); await expect(canvas).toBeFocused();
    await expect(edit).toHaveAccessibleName('Cancel end point change'); await expect(edit).toHaveAttribute('aria-pressed', 'true');
    await expect(guide).toContainText('Current approximate model distance: 2.3 cm');
    expect((await state(page)).rulerStart).toEqual(start); expect((await state(page)).rulerEnd).toEqual(end);
    await guide.screenshot({ path: `${out}/adjust-${width}.png` });
    await edit.focus(); await page.keyboard.press('Space'); await expect(edit).toBeFocused(); await expect(edit).toHaveAccessibleName('Adjust end point');
    expect((await state(page)).rulerEnd).toEqual(end);
    await page.keyboard.press('Enter'); await expect(canvas).toBeFocused(); await page.keyboard.press('Home'); await page.keyboard.press('Space');
    let current = await state(page); expect(current.rulerStart).toEqual(start); expect(current.rulerEnd).not.toEqual(end);
    expect(current._rulerEndpointEdit).toBeNull(); await expect(edit).toHaveAttribute('aria-pressed', 'false');
    expect(current.procedureFeedback.message).toContain('The start point was kept');
    const keyboardEnd = current.rulerEnd;
    await edit.click(); await canvas.scrollIntoViewIfNeeded(); const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width * .45, y: box.height * .45 } });
    current = await state(page); expect(current.rulerStart).toEqual(start); expect(current.rulerEnd).not.toEqual(keyboardEnd);
    const pointerEnd = current.rulerEnd;
    await edit.click(); await expect(canvas).toBeFocused(); await page.keyboard.press('Escape');
    current = await state(page); expect(current.rulerMode).toBe(false); expect(current._rulerEndpointEdit).toBeNull();
    expect(current.rulerStart).toEqual(start); expect(current.rulerEnd).toEqual(pointerEnd);
    expect(current.organNotes).toEqual(notes); expect(current.organConfidence).toEqual({ 'frog|dorsal_skin': 2 });
    expect(current.exploredOrgans).toEqual({ 'frog|dorsal_skin': true }); expect(current.annotations).toEqual([{ x: .7, y: .8, type: 'dot' }]);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['.diss-point-mode']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
