import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-writing-starters-2026-11-01';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_STARTER_TOOL || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const original = 'A moist surface.\n位置を確認した。 ملاحظة';
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [320, 1440]) {
  test(`insert and undo sentence starters preserve the learner note at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: width === 320 ? 620 : 950 });
    await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin',
      workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false, highContrast: width === 320, largeText: width === 320,
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': original, 'frog|tympanum': 'Keep another note.' },
      organConfidence: { 'frog|dorsal_skin': 2 }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const opener = page.locator('[data-note-editor-open]'); await opener.focus(); await page.keyboard.press('Enter');
    const dialog = page.locator('[data-note-editor]'), field = dialog.getByRole('textbox', { name: 'Evidence note', exact: true });
    const disclosure = dialog.locator('[data-note-editor-starters]'); await disclosure.locator('summary').focus();
    const summaryBox = await disclosure.locator('summary').boundingBox(), headerBox = await dialog.locator('.diss-observation-reader__header').boundingBox();
    expect(summaryBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await field.evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(0, 0); });
    const observation = dialog.locator('[data-note-starter="observation"]'); await observation.focus(); await page.keyboard.press('Enter');
    await expect(field).toBeFocused(); await expect(field).toHaveValue('I observed ' + original);
    expect(await field.evaluate((node: HTMLTextAreaElement) => node.selectionStart)).toBe('I observed '.length);
    const undo = dialog.getByRole('button', { name: 'Undo inserted starter', exact: true }); await undo.focus(); await page.keyboard.press('Space');
    await expect(field).toHaveValue(original); await expect(field).toBeFocused(); await expect(undo).toHaveCount(0);
    await field.evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(2, 7); });
    await dialog.locator('[data-note-starter="reference"]').click(); const inserted = original.slice(0, 7) + ' The reference states ' + original.slice(7);
    await expect(field).toHaveValue(inserted); await expect(field).toBeFocused();
    await dialog.evaluate(node => { node.scrollTop = 0; }); await dialog.screenshot({ path: `${out}/starters-${width}.png` });
    await page.keyboard.insertText('a source must be named. '); await expect(undo).toHaveCount(0);
    const revised = await field.inputValue(); expect(revised).toContain('moist'); expect(revised).toContain('位置を確認した。 ملاحظة');
    await dialog.locator('[data-note-starter="location"]').click(); await expect(undo).toBeVisible();
    const insertedAgain = await field.inputValue(); await dialog.getByRole('button', { name: 'Larger text', exact: true }).click(); await expect(undo).toBeVisible();
    await undo.click(); await expect(field).toHaveValue(revised); expect(insertedAgain).not.toBe(revised);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')?.organNotes?.['frog|dorsal_skin'])).toBe(revised);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-note-editor]']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await dialog.locator('[data-note-starter="reasoning"]').click(); const finalNote = await field.inputValue();
    await field.focus(); await page.keyboard.press('Escape'); await expect(opener).toBeFocused(); await page.keyboard.press('Enter');
    await expect(field).toHaveValue(finalNote); await expect(undo).toHaveCount(0);
    const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
    expect(state.organNotes['frog|tympanum']).toBe('Keep another note.'); expect(state.organConfidence).toEqual({ 'frog|dorsal_skin': 2 });
    expect(state.exploredOrgans).toEqual({ 'frog|dorsal_skin': true }); expect(state.verifiedIdentifications).toEqual({}); expect(state.quizScore).toBe(1); expect(state.quizTotal).toBe(2);
    expect(errors).toEqual([]);
  });
}
