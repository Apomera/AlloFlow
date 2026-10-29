import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir('reports/dissection-deep-improvements', { recursive: true }); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`report and learning objectives work at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', workspaceMode: 'advanced',
      toolbarToolsOpen: true, _labReportPreviewOpen: true, reducedMotion: true, soundEnabled: false,
      exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'I observed a moist, pigmented surface.' },
      organConfidence: { 'frog|dorsal_skin': 2 },
    } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
    const preview = page.getByRole('textbox', { name: 'Lab report preview', exact: true });
    await expect(preview).toContainText('I observed a moist, pigmented surface.');
    await page.getByRole('button', { name: 'Select report', exact: true }).click();
    await expect(preview).toBeFocused();
    expect(await preview.evaluate((node: HTMLTextAreaElement) => node.selectionEnd - node.selectionStart)).toBe((await preview.inputValue()).length);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download report', exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('frog_lab_report.txt');
    await page.locator('.diss-report-export').screenshot({ path: `reports/dissection-deep-improvements/report-${width}.png` });
    const objectives = page.locator('[data-learning-objectives]');
    await objectives.locator('summary').click();
    await expect(objectives.locator('button').first()).toBeVisible();
    await objectives.screenshot({ path: `reports/dissection-deep-improvements/objectives-${width}.png` });
    const bounds = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    expect(bounds.content).toBeLessThanOrEqual(bounds.width + 1);
    await objectives.locator('button').first().click();
    expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.exploredOrgans)).toEqual({ 'frog|dorsal_skin': true });
    expect(errors).toEqual([]);
  });
}
