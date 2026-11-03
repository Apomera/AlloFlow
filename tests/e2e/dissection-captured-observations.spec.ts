import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-captured-observations-2026-11-01';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_CAPTURE_TOOL || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection',
  width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const note = 'Observed a moist surface.\n位置を確認した。 ملاحظة';
const legacy = { id: 101, image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==',
  specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal' };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin',
  workspaceMode: 'advanced', toolbarToolsOpen: true, evidenceNotebookOpen: true, _labReportPreviewOpen: true,
  reducedMotion: true, soundEnabled: false, exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': note },
  organConfidence: { 'frog|dorsal_skin': 2 }, visualEvidence: [legacy], verifiedIdentifications: {}, quizScore: 1, quizTotal: 2 };
test.describe.configure({ retries: 0, timeout: 120000 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.unmount(page));

for (const width of [390, 1440]) {
  test(`captured observation stays historical after live edits and reload at ${width}px`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: 950 });
    await harness.mount(page, { dissection: { ...initial, highContrast: width === 390, largeText: width === 390 } }, undefined, { expectCanvas: false });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    await page.waitForFunction(() => typeof (document.querySelector('[data-diss-canvas]') as any)?._captureDissectionEvidence === 'function');
    const capture = page.locator('[data-evidence-capture]'); await capture.focus(); await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence.length)).toBe(2);
    const captured = await page.evaluate(() => (window as any).__ctx.toolData.dissection.visualEvidence[1]);
    expect(captured.image.length).toBeGreaterThan(1000); expect(captured.capturedObservation).toEqual({ note, confidence: 2, inspected: true });
    const card = page.locator('[data-evidence-id="' + captured.id + '"]'), record = card.locator('[data-evidence-observation-record]');
    await record.locator('summary').focus(); await page.keyboard.press('Space');
    await expect(record.locator('[data-captured-note]')).toHaveText(note); await expect(record.locator('[data-captured-note]')).toHaveAttribute('dir', 'auto');
    await expect(record.locator('[data-captured-note]')).toHaveCSS('white-space', 'pre-wrap');
    await expect(record).toContainText('2 of 3'); await expect(record).toContainText('Inspection recorded at capture');
    const oldCard = page.locator('[data-evidence-id="101"]'); await expect(oldCard.locator('[data-evidence-observation-missing]')).toBeVisible();
    await page.locator('#diss-note-dorsal_skin').fill('Later revised observation.'); await page.locator('#diss-confidence-dorsal_skin-3').click();
    await expect(record.locator('[data-captured-note]')).toHaveText(note); await expect(record).toContainText('2 of 3');
    const preview = page.locator('#diss-lab-report-preview'); await expect(preview).toHaveValue(/Evidence note at capture:/);
    const report = await preview.inputValue(); expect(report).toContain('Evidence note at capture: ' + note); expect(report).toContain('Evidence note: Later revised observation.'); expect(report).toContain('Confidence self-rating at capture: 2 of 3');
    const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download report', exact: true }).click();
    const download = await downloaded; await download.saveAs(`${out}/report-${width}.txt`); const downloadedText = await readFile(`${out}/report-${width}.txt`, 'utf8');
    expect(downloadedText).toContain('Evidence note at capture: ' + note); expect(downloadedText).toContain('Evidence note: Later revised observation.'); expect(downloadedText).toContain('Confidence self-rating at capture: 2 of 3');
    await record.scrollIntoViewIfNeeded(); await record.screenshot({ path: `${out}/capture-record-${width}.png` });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-evidence-observation-record]']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
    expect(await card.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')?.organNotes?.['frog|dorsal_skin'])).toBe('Later revised observation.');
    await harness.unmount(page);
    await harness.mount(page, { dissection: { specimen: 'frog', _dissLoadedSpec: null, activeLayer: 'skin', workspaceMode: 'advanced',
      reducedMotion: true, soundEnabled: false, evidenceNotebookOpen: true, visualEvidence: [], organNotes: {}, organConfidence: {} } }, undefined, { expectCanvas: false });
    const restored = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
    expect(restored.visualEvidence[1].capturedObservation).toEqual({ note, confidence: 2, inspected: true });
    expect(restored.organNotes['frog|dorsal_skin']).toBe('Later revised observation.'); expect(restored.organConfidence['frog|dorsal_skin']).toBe(3);
    expect(restored.verifiedIdentifications).toEqual({}); expect(restored.quizScore).toBe(1); expect(restored.quizTotal).toBe(2); expect(errors).toEqual([]);
  });
}
