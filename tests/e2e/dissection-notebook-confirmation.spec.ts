import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const frames = [0, 1].map(id => ({ id, image, specimen: 'frog', layer: 'skin', layerName: 'Skin', view: 'dorsal' }));
const notes = { 'frog|dorsal_skin': 'A moist pigmented surface along the back.' };
test.describe.configure({ retries: 0, timeout: 90000 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`notebook cancellation and accepted removal preserve records at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, visualEvidence: frames, referenceEvidenceId: 0,
      splitComparison: true, evidenceNotebookOpen: true, organNotes: notes, organConfidence: { 'frog|dorsal_skin': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const notebook = page.locator('#diss-evidence-notebook');
    const remove = page.locator('#diss-evidence-remove-0');
    await remove.click();
    const confirm = page.locator('#diss-evidence-confirm-remove-0');
    await expect(confirm).toBeFocused();
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['#diss-evidence-notebook']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    const oldButton = await confirm.elementHandle();
    await page.keyboard.press('Escape'); await expect(remove).toBeFocused();
    // A detached control must remain harmless after its confirmation was canceled.
    await oldButton!.evaluate((button: HTMLButtonElement) => button.click());
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence)).toEqual(frames);
    await remove.click(); await confirm.focus(); await page.keyboard.press('Enter');
    await expect(notebook.locator('article[data-evidence-id]')).toHaveCount(1);
    await expect(notebook.locator('summary')).toBeFocused();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.referenceEvidenceId)).toBe(1);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
    await notebook.screenshot({ path: `reports/dissection-notebook-confirmation-2026-10-31/remaining-${width}.png` });
    await page.locator('#diss-evidence-clear-all').click();
    await expect(page.locator('#diss-evidence-confirm-clear')).toBeFocused();
    await page.keyboard.press('Escape'); await expect(page.locator('#diss-evidence-clear-all')).toBeFocused();
    await expect(notebook.locator('article[data-evidence-id]')).toHaveCount(1);
    await page.locator('#diss-evidence-clear-all').click();
    await page.locator('#diss-evidence-confirm-clear').press('Enter');
    await expect(notebook.locator('summary')).toBeFocused();
    await expect(notebook.locator('article[data-evidence-id]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes)).toEqual(notes);
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
