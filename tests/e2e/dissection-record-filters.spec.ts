import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-record-filters-2026-10-31';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const explored = Object.fromEntries(['dorsal_skin', 'ventral_skin', 'tympanum', 'nictitating', 'heart'].map(id => ['frog|' + id, true]));
const checked = { 'frog|dorsal_skin': { status: 'verified' } };
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`missing-field review and reading view target the chosen record field at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, highContrast: width === 390, largeText: width === 390,
      exploredOrgans: explored, organNotes: { 'frog|dorsal_skin': '', 'frog|ventral_skin': ' \n ', 'frog|tympanum': 'A thin membrane.', 'frog|nictitating': 'A clear cover.' },
      organConfidence: { 'frog|ventral_skin': 2, 'frog|nictitating': 1 }, verifiedIdentifications: checked, quizScore: 1, quizTotal: 2,
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const panel = page.locator('[data-observation-review]'), notes = panel.locator('[data-observation-filter="missing-note"]'), confidence = panel.locator('[data-observation-filter="missing-confidence"]');
    await panel.locator('summary').first().click(); await notes.focus(); await page.keyboard.press('Enter');
    await expect(notes).toHaveAttribute('aria-pressed', 'true'); await expect(notes).toHaveAccessibleName('Missing notes (3)');
    await expect(panel.locator('[data-observation-entry]')).toHaveCount(3);
    await panel.locator('.diss-observation-review__filters').screenshot({ path: `${out}/filters-${width}.png` });
    const opener = panel.locator('[data-observation-reader-open]');
    await opener.click(); let dialog = page.getByRole('dialog', { name: /Observation reading view/ });
    await expect(dialog).toContainText('Missing notes'); await expect(dialog.locator('[data-observation-reader-entry]')).toHaveAttribute('data-observation-reader-entry', 'dorsal_skin');
    await expect(dialog.getByRole('button', { name: 'Write evidence note', exact: true })).toBeVisible();
    await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
    await confidence.focus(); await page.keyboard.press('Space'); await expect(confidence).toHaveAccessibleName('Missing confidence (3)');
    await opener.click(); dialog = page.getByRole('dialog', { name: /Observation reading view/ });
    await expect(dialog).toContainText('Missing confidence'); await expect(dialog).toContainText('No evidence note recorded');
    await dialog.getByRole('button', { name: 'Choose confidence', exact: true }).click();
    await expect(page.locator('#diss-confidence-dorsal_skin-1')).toBeFocused(); expect((await state(page)).organNotes['frog|dorsal_skin']).toBe('');
    await page.locator('#diss-confidence-dorsal_skin-2').click();
    await page.getByRole('button', { name: 'Review all observations', exact: true }).click();
    await expect(panel.locator('#diss-observation-review-title')).toBeFocused(); await expect(confidence).toHaveAttribute('aria-pressed', 'true');
    await expect(confidence).toHaveAccessibleName('Missing confidence (2)'); await expect(panel.locator('[data-observation-entry="dorsal_skin"]')).toHaveCount(0);
    await notes.click(); await panel.locator('[data-observation-edit="dorsal_skin"]').click();
    const note = page.locator('#diss-note-dorsal_skin'); await expect(note).toBeFocused(); await note.fill('Observed pigment on the back.');
    await page.getByRole('button', { name: 'Review all observations', exact: true }).click(); await expect(notes).toHaveAccessibleName('Missing notes (2)');
    const search = panel.locator('#diss-observation-search'); await search.fill('thin');
    await expect(notes).toHaveAccessibleName('Missing notes (0)'); await expect(confidence).toHaveAccessibleName('Missing confidence (1)');
    await confidence.click(); await expect(panel.locator('[data-observation-entry]')).toHaveCount(1);
    await expect(panel.locator('#diss-observation-summary')).toHaveValue(/Scope: Missing confidence · 1 of 5/);
    await panel.getByRole('button', { name: 'Clear observation search', exact: true }).click();
    await expect(search).toBeFocused(); await expect(confidence).toHaveAttribute('aria-pressed', 'true');
    const locked = panel.locator('[data-observation-entry="heart"]'); await expect(locked.locator('[data-observation-locked]')).toBeVisible();
    await expect(locked.locator('[data-observation-edit]')).toHaveCount(0);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-observation-review]']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const current = await state(page); expect(current.exploredOrgans).toEqual(explored); expect(current.verifiedIdentifications).toEqual(checked);
    expect(current.organNotes['frog|dorsal_skin']).toBe('Observed pigment on the back.'); expect(current.organConfidence['frog|dorsal_skin']).toBe(2);
    expect(current.quizScore).toBe(1); expect(current.quizTotal).toBe(2); expect(errors).toEqual([]);
  });
}
