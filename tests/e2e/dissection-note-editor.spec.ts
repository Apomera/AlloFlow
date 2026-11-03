import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-note-editor-2026-11-01';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_NOTE_TOOL || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection',
  width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const original = 'Observed a moist surface.\n位置を確認した。 ملاحظة';
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [320, 390, 1440]) {
  test(`larger note writing saves the original record and restores keyboard focus at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 320 ? 540 : 900 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, highContrast: width === 390, largeText: width === 390,
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': original, 'frog|tympanum': 'Another note.' },
      organConfidence: { 'frog|dorsal_skin': 2 }, quizScore: 1, quizTotal: 2, verifiedIdentifications: {},
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const opener = page.locator('[data-note-editor-open]'); await opener.focus(); await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Evidence note writing view: Dorsal Skin', exact: true }), field = dialog.getByRole('textbox', { name: 'Evidence note', exact: true });
    await expect(dialog).toBeVisible(); await expect(field).toBeFocused(); await expect(field).toHaveValue(original); await expect(field).toHaveAttribute('dir', 'auto');
    const beforeSize = await field.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    const larger = dialog.getByRole('button', { name: 'Larger text', exact: true }); await larger.click();
    await expect(larger).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => field.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThan(beforeSize);
    const revised = original + '\n' + 'A long multilingual observation with precise visible features. '.repeat(7);
    await field.fill(revised);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')?.organNotes?.['frog|dorsal_skin'])).toBe(revised);
    await expect(dialog.locator('[data-note-editor-save-state]')).toHaveText(/saved/i);
    await expect(page.locator('#diss-note-dorsal_skin')).toHaveValue(revised);
    await dialog.screenshot({ path: `${out}/editor-${width}.png` });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-note-editor]']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    await expect(dialog.getByRole('button', { name: 'Close writing view', exact: true })).toBeInViewport();
    const overflow = await dialog.evaluate(node => node.scrollWidth - node.clientWidth); expect(overflow).toBeLessThanOrEqual(1);
    await field.focus(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
    await page.keyboard.press('Space'); await expect(field).toBeFocused(); await expect(field).toHaveValue(revised);
    const close = dialog.getByRole('button', { name: 'Close writing view', exact: true });
    await close.focus(); await page.keyboard.press('Shift+Tab'); await expect(field).toBeFocused();
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    await page.keyboard.press('Enter'); await expect(opener).toBeFocused();
    const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
    expect(state.organNotes['frog|tympanum']).toBe('Another note.'); expect(state.exploredOrgans).toEqual({ 'frog|dorsal_skin': true });
    expect(state.organConfidence).toEqual({ 'frog|dorsal_skin': 2 }); expect(state.verifiedIdentifications).toEqual({});
    expect(state.quizScore).toBe(1); expect(state.quizTotal).toBe(2); expect(errors).toEqual([]);
  });
}
