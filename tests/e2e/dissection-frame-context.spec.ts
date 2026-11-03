import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const out = 'reports/dissection-frame-context-2026-11-01';
const harness = new GlHarness({ toolFile: process.env.DISSECTION_CONTEXT_TOOL || 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', selectedOrgan: 'dorsal_skin', workspaceMode: 'advanced', evidenceNotebookOpen: true,
  reducedMotion: true, soundEnabled: false, organNotes: { 'frog|dorsal_skin': 'Current live note.' }, organConfidence: { 'frog|dorsal_skin': 3 }, exploredOrgans: { 'frog|dorsal_skin': true }, verifiedIdentifications: {}, referenceEvidenceId: 202, splitComparison: true, quizScore: 1, quizTotal: 2 };
async function fixtureFrames(page: any) {
  const images = await page.evaluate(() => [[720, 880, '#eff6ff'], [880, 660, '#ecfdf5'], [600, 900, '#fff7ed']].map((entry, index) => {
    const canvas = document.createElement('canvas'); canvas.width = Number(entry[0]); canvas.height = Number(entry[1]); const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = String(entry[2]); ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#172554'; ctx.lineWidth = 12; ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.fillStyle = '#172554'; ctx.font = 'bold 32px sans-serif'; ctx.fillText('Synthetic saved frame ' + (index + 1), 50, 100); ctx.beginPath(); ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2); ctx.stroke();
    return canvas.toDataURL('image/png');
  }));
  return images.map((image: string, index: number) => ({ id: [0, 101, 202][index], image, specimen: 'frog', layer: ['skin', 'muscle', 'organs'][index], layerName: ['External anatomy', 'Muscle layer', 'Internal organs'][index], view: ['dorsal', 'ventral', 'internal'][index], capturedObservation: { note: 'Recorded note ' + (index + 1), confidence: index + 1, inspected: true } }));
}
async function proof(page: any) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return Object.fromEntries(['visualEvidence', 'referenceEvidenceId', 'splitComparison', 'organNotes', 'organConfidence', 'exploredOrgans', 'verifiedIdentifications', 'quizScore', 'quizTotal', 'selectedOrgan', 'activeLayer', 'anatomicalView', 'canvasZoom', 'canvasPanX', 'canvasPanY', 'annotations'].map(key => [key, d[key]])); }); }
test.describe.configure({ retries: 0, timeout: 120000 }); test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.unmount(page));
for (const width of [320, 390, 1180, 1440]) test('reads historical frame context without changing comparison or progress at ' + width + 'px', async ({ page }) => {
  const frames = await fixtureFrames(page), errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); await page.setViewportSize({ width, height: width === 320 ? 540 : 950 }); if (width === 320) await page.emulateMedia({ forcedColors: 'active' });
  await harness.mount(page, { dissection: { ...initial, visualEvidence: frames, largeText: width === 390, highContrast: width === 390 } }, undefined, { expectCanvas: false });
  if (width === 1180) await page.evaluate(() => document.body.classList.add('theme-contrast'));
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const before = await proof(page), origin = page.locator('[data-frame-viewer-open]').nth(1); await origin.focus(); await page.keyboard.press('Enter');
  const dialog = page.locator('[data-frame-viewer]'), close = dialog.getByRole('button', { name: 'Close frame view', exact: true }), next = dialog.getByRole('button', { name: 'Next frame', exact: true }), previous = dialog.getByRole('button', { name: 'Previous frame', exact: true });
  const position = dialog.locator('[data-frame-viewer-position]'), viewport = dialog.locator('[data-frame-viewer-viewport]'), image = viewport.locator('img');
  await expect(close).toBeFocused(); await expect(position).toHaveText('Frame 2 of 3: Muscle layer, ventral view'); await expect(position).toHaveAttribute('aria-live', 'polite'); await expect(image).toHaveAttribute('src', frames[1].image);
  const details = dialog.locator('[data-frame-viewer-details]'), summary = details.locator('summary'), metadata = dialog.locator('[data-frame-viewer-metadata]');
  await expect(details).not.toHaveAttribute('open', ''); await summary.focus(); await page.keyboard.press('Enter'); await expect(details).toHaveAttribute('open', '');
  await expect(metadata.locator('[data-captured-note]')).toHaveText('Recorded note 2'); await expect(metadata.locator('[data-captured-confidence]')).toContainText('2 of 3'); await expect(metadata).not.toContainText('Current live note.');
  await expect(metadata.getByRole('heading', { name: 'Observation at capture' })).toBeVisible(); await expect(metadata.locator('details')).toHaveCount(0);
  await next.focus(); await page.keyboard.press('Enter'); await expect(position).toContainText('Frame 3 of 3'); await expect(image).toHaveAttribute('src', frames[2].image); await expect(next).toHaveAttribute('aria-disabled', 'true'); await expect(next).toBeFocused(); await expect(details).toHaveAttribute('open', ''); await expect(metadata.locator('[data-captured-note]')).toHaveText('Recorded note 3');
  await page.keyboard.press('Enter'); await expect(position).toContainText('Frame 3 of 3');
  await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click(); await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click(); await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('200% of view width');
  await expect.poll(() => viewport.evaluate(node => node.querySelector('img')!.getBoundingClientRect().width / node.clientWidth)).toBeCloseTo(2, 2);
  await viewport.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await expect.poll(() => viewport.evaluate(node => node.scrollLeft)).toBeGreaterThan(0); await expect.poll(() => viewport.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Tab'); await expect(close).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(viewport).toBeFocused();
  await previous.focus(); await page.keyboard.press('Enter'); await expect(image).toHaveAttribute('src', frames[1].image); await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('100% of view width'); expect(await viewport.evaluate(node => [node.scrollLeft, node.scrollTop])).toEqual([0, 0]);
  await page.keyboard.press('Enter'); await expect(image).toHaveAttribute('src', frames[0].image); await expect(position).toContainText('Frame 1 of 3'); await expect(previous).toHaveAttribute('aria-disabled', 'true'); await expect(previous).toBeFocused(); await expect(metadata.locator('[data-captured-note]')).toHaveText('Recorded note 1'); await expect(metadata.locator('[data-captured-confidence]')).toContainText('1 of 3');
  if (width === 1180) {
    const contrast = await dialog.locator('.diss-observation-reader__header').evaluate(node => { const luminance = (s: string) => { const v = s.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4)); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }; const a = luminance(getComputedStyle(node.querySelector('h3')!).color), b = luminance(getComputedStyle(node).backgroundColor); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }); expect(contrast).toBeGreaterThanOrEqual(7);
    const recordColor = await metadata.locator('[data-captured-note]').evaluate(node => getComputedStyle(node).color); expect(recordColor).toBe('rgb(255, 255, 255)');
  }
  await dialog.evaluate(node => { node.scrollTop = 0; }); await dialog.screenshot({ path: out + '/frame-context-' + width + '.png' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-frame-viewer]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map((v: any) => v.id))).toEqual([]);
  expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1); await expect(close).toBeInViewport(); await previous.focus(); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(origin).toBeFocused();
  await page.keyboard.press('Space'); await expect(position).toContainText('Frame 2 of 3'); await expect(image).toHaveAttribute('src', frames[1].image); await expect(dialog.locator('[data-frame-viewer-size]')).toHaveText('100% of view width'); await close.click(); await expect(origin).toBeFocused();
  expect(await proof(page)).toEqual(before); expect(errors).toEqual([]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')?.referenceEvidenceId)).toBe(202);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog') || 'null')); expect(saved.visualEvidence).toEqual(frames);
});
test('can leave an undecodable saved image without removing it at 390px', async ({ page }) => {
  const frames = await fixtureFrames(page); frames[0].image = 'data:image/jpeg;base64,eA=='; await page.setViewportSize({ width: 390, height: 850 });
  await harness.mount(page, { dissection: { ...initial, visualEvidence: frames } }, undefined, { expectCanvas: false }); await page.addStyleTag({ content: '#wrap { width:100% !important; }' });
  const origin = page.locator('[data-frame-viewer-open]').first(); await origin.click(); const dialog = page.locator('[data-frame-viewer]');
  await expect(dialog.locator('[data-frame-viewer-error]')).toBeVisible();
  const summary = dialog.locator('[data-frame-viewer-details] > summary'); await summary.focus(); await page.keyboard.press('Enter'); await expect(dialog.locator('[data-captured-note]')).toHaveText('Recorded note 1');
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Close frame view', exact: true })).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(summary).toBeFocused();
  await dialog.getByRole('button', { name: 'Next frame', exact: true }).click();
  await expect(dialog.locator('[data-frame-viewer-error]')).toHaveCount(0); await expect(dialog.locator('img')).toHaveAttribute('src', frames[1].image); await expect.poll(() => dialog.locator('img').evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 1)).toBe(true);
  await dialog.getByRole('button', { name: 'Close frame view', exact: true }).click(); await expect(origin).toBeFocused(); expect((await proof(page)).visualEvidence).toEqual(frames);
});

test('reads long bidirectional notes and explicit legacy gaps at 390px', async ({ page }) => {
  const frames = await fixtureFrames(page);
  frames[0].capturedObservation.note = 'ملاحظة محفوظة\n' + 'Historical evidence '.repeat(35) + '\n' + 'x'.repeat(220);
  delete frames[1].capturedObservation;
  await page.setViewportSize({ width: 390, height: 850 });
  await harness.mount(page, { dissection: { ...initial, visualEvidence: frames, largeText: true, highContrast: true } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap { width:100% !important; }' });
  const before = await proof(page), origin = page.locator('[data-frame-viewer-open]').first(); await origin.click();
  const dialog = page.locator('[data-frame-viewer]'), pane = dialog.locator('[data-frame-viewer-details]');
  await pane.locator('summary').focus(); await page.keyboard.press('Enter');
  const note = pane.locator('[data-captured-note]'); await expect(note).toHaveText(frames[0].capturedObservation.note); await expect(note).toHaveAttribute('dir', 'auto');
  expect(await note.evaluate(node => getComputedStyle(node).whiteSpace)).toBe('pre-wrap');
  expect(await note.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
  await dialog.getByRole('button', { name: 'Next frame', exact: true }).click(); await expect(pane).toHaveAttribute('open', '');
  await expect(pane.locator('[data-evidence-observation-missing]')).toHaveText('Observation record at capture: Not recorded'); await expect(pane.locator('[data-captured-note]')).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(origin).toBeFocused(); expect(await proof(page)).toEqual(before);
});
