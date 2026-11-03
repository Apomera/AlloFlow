import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const marks = [{ x: .2, y: .3, type: 'dot' }, { x: .3, y: .4, prevX: .2, prevY: .3, type: 'dot' }, { x: .7, y: .5, type: 'dot' }];
const notes = { 'frog|dorsal_skin': 'Keep my observation when clearing drawing marks.' };
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const { width, mode, clearName } of [
  { width: 390, mode: 'essentials', clearName: 'Clear observation marks' },
  { width: 1440, mode: 'advanced', clearName: 'Clear annotations' },
]) {
  test(`cleared annotations can be recovered through ${clearName} at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: mode,
      toolbarToolsOpen: mode === 'advanced', annotations: marks, organNotes: notes,
      organConfidence: { 'frog|dorsal_skin': 2 }, exploredOrgans: { 'frog|dorsal_skin': true },
      reducedMotion: true, soundEnabled: false, largeText: width === 390, highContrast: width === 390,
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const clear = page.getByRole('button', { name: clearName, exact: true });
    await clear.focus(); await page.keyboard.press('Enter');
    const undo = page.getByRole('button', { name: 'Undo clear marks', exact: true });
    await expect(undo).toBeFocused();
    const guide = page.locator('.diss-point-mode');
    await expect(guide).toContainText('Undo clear marks can restore your earlier drawing');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations)).toEqual([]);
    await guide.screenshot({ path: `reports/dissection-clear-marks-undo-2026-10-31/undo-${width}.png` });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['.diss-point-mode']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    const staleButton = await undo.elementHandle();
    await page.keyboard.press('Space');
    await expect(undo).toHaveCount(0); await expect(page.locator('[data-diss-canvas]')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations)).toEqual(marks);
    await clear.click(); await expect(undo).toBeFocused();
    await staleButton!.evaluate((button: HTMLButtonElement) => button.click());
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations)).toEqual([]);
    await undo.press('Enter');
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.annotations)).toEqual(marks);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organConfidence)).toEqual({ 'frog|dorsal_skin': 2 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
