import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.EVIDENCE_GALLERY_OUTPUT || 'reports/dissection-evidence-gallery-2026-10-05';
const baseline = process.env.DISSECTION_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const frames = [
  { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'preserved', selectedOrganName: 'Nictitating Membrane and translucent corneal surface', techniqueScore: 84, opticalQuality: 91, capturedAt: '2026-10-04T14:30:00.000Z' },
  { id: 102, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'lateral', condition: 'dehydrated', selectedOrganName: 'Tympanic Membrane and the surrounding pigmented skin boundary', techniqueScore: 0, opticalQuality: 0, capturedAt: '2026-10-05T14:30:00.000Z' },
  { id: 'legacy/frame 103', image, specimen: 'frog', layer: 'unmapped', techniqueScore: null, opticalQuality: null },
];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: 'tympanum', revealedLayers: { skin: true }, procedureByLayer: { skin: complete },
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, workspaceMode: 'advanced', techniquePanelOpen: false,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane supports this identification.' }, organConfidence: { 'frog|nictitating': 3 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2,
  visualEvidence: frames, referenceEvidenceId: 102, splitComparison: true, evidenceNotebookOpen: true,
  annotations: [{ x: .5, y: .38, type: 'dot' }], rulerStart: { x: .5, y: .38 }, rulerEnd: { x: .6, y: .18 }, annotateMode: false, rulerMode: false,
  inspectionLens: true, macroInset: true, lensPinned: true, lensPinnedPoint: { x: .65, y: .24 }, lensPinnedOrganId: 'tympanum', lensFocusDepth: 'structure', lensMagnification: 4, lightIntensity: 60,
  visualRealism: 'accessible', specimenCondition: 'standard', parallaxDepth: false, reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
const captureStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page) || []).toEqual([]); });

async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const m = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
const notebook = (page: Page) => page.locator('#diss-evidence-notebook');
const reference = (page: Page) => page.locator('.diss-split-reference');
const heading = (page: Page) => page.locator('#diss-reference-heading');
const card = (page: Page, id: number | string) => notebook(page).locator(`[data-evidence-id="${id}"]`);
const token = (id: number | string) => String(id).trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'frame';
const compare = (page: Page, id: number | string) => page.locator(`#diss-evidence-compare-${token(id)}`);
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], lens: [d.inspectionLens, d.macroInset, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId, d.lensFocusDepth, d.lensMagnification],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, calibration: d.toolCalibration,
      scores: [d.quizScore, d.quizTotal, d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      points: [d.annotations, d.rulerStart, d.rulerEnd, d.annotateMode, d.rulerMode], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  });
}
async function openNotebook(page: Page) { if (!(await notebook(page).evaluate(el => (el as HTMLDetailsElement).open))) await notebook(page).locator('summary').click(); await expect(notebook(page)).toHaveAttribute('open', ''); }
async function paintedCanvas(page: Page) {
  const canvas = page.locator('[data-diss-canvas]'); await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => canvas.evaluate(node => { const c = node as any; return c._dissInViewport === true && c._logicalW > 0 && c._logicalH > 0; })).toBe(true);
  let colours = 0;
  await expect.poll(async () => {
    colours = await canvas.evaluate(node => { const c = node as HTMLCanvasElement, data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data, unique = new Set<string>(); for (let i = 0; i < data.length; i += Math.max(4, Math.floor(data.length / 400 / 4) * 4)) unique.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`); return unique.size; });
    return colours;
  }).toBeGreaterThanOrEqual(8);
  return { canvas, colours };
}
async function usePaintedLayoutFrames(page: Page) {
  const { canvas, colours } = await paintedCanvas(page);
  const thumbnail = await canvas.evaluate(node => { const image = document.createElement('canvas'); image.width = 220; image.height = 264; image.getContext('2d')!.drawImage(node as HTMLCanvasElement, 0, 0, 220, 264); return image.toDataURL('image/png'); });
  await page.evaluate(image => { const ctx = (window as any).__ctx, d = ctx.toolData.dissection; ctx.updateMulti('dissection', { visualEvidence: d.visualEvidence.map((frame: any) => ({ ...frame, image })) }); }, thumbnail);
  await expect.poll(async () => (await state(page)).visualEvidence.every((frame: any) => frame.image === thumbnail)).toBe(true);
  await expect.poll(async () => reference(page).locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(220);
  return { paintedColours: colours, thumbnailWidth: 220, thumbnailHeight: 264, imageLength: thumbnail.length };
}
async function metrics(p: Locator) {
  return p.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    text: Array.from(el.querySelectorAll('summary,strong,p,span,time,.diss-evidence__metadata,.diss-evidence__identity')).filter(n => n.getClientRects().length && n.textContent?.trim()).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1, whiteSpace: getComputedStyle(n).whiteSpace, textOverflow: getComputedStyle(n).textOverflow })),
    controls: Array.from(el.querySelectorAll('button,summary')).filter(n => n.getClientRects().length).map(n => ({ text: n.textContent, name: n.getAttribute('aria-label'), font: parseFloat(getComputedStyle(n).fontSize), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height, clipped: n.scrollWidth > n.clientWidth + 1 })) }));
}
async function readable(p: Locator, available: number, large = false) {
  const m = await metrics(p); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.text.length).toBeGreaterThan(2);
  for (const t of m.text) { expect(t.font, t.text || '').toBeGreaterThanOrEqual(large ? 16 : 14); expect(t.clipped, t.text || '').toBe(false); expect(t.textOverflow, t.text || '').not.toBe('ellipsis'); }
  for (const b of m.controls) { expect(b.height, b.text || '').toBeGreaterThanOrEqual(47.9); expect(b.width, b.text || '').toBeGreaterThanOrEqual(47.9); expect(b.font, b.text || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(b.clipped, b.text || '').toBe(false); }
  return m;
}
async function focusStyle(control: Locator) {
  const m = await control.evaluate(el => { const s = getComputedStyle(el); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor, background: s.backgroundColor }; });
  expect(m.width).toBeGreaterThanOrEqual(2.9); expect(m.style).toBe('solid'); return m;
}
async function confirmationFocus(control: Locator, panel: Locator, name: string) {
  await expect(control).toBeFocused();
  const m = await control.evaluate(el => {
    const s = getComputedStyle(el);
    const luminance = (colour: string) => { const rgb = colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => { const channel = n / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }); return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]; };
    const ring = luminance(s.outlineColor), fill = luminance(s.backgroundColor);
    return { focusVisible: el.matches(':focus-visible'), width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor, offset: parseFloat(s.outlineOffset), background: s.backgroundColor, contrast: (Math.max(ring, fill) + .05) / (Math.min(ring, fill) + .05) };
  });
  expect(m.focusVisible).toBe(true); expect(m.width).toBe(3); expect(m.style).toBe('solid'); expect(m.color).toBe('rgb(255, 255, 255)'); expect(m.offset).toBe(-5); expect(m.background).toBe('rgb(153, 27, 27)'); expect(m.contrast).toBeGreaterThanOrEqual(3);
  await writeFile(`${out}/${name}-focus.json`, JSON.stringify(m, null, 2)); await panel.screenshot({ path: `${out}/${name}-focus.png`, style: captureStyle }); await expect(control).toBeFocused();
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-evidence-notebook'], ['.diss-split-reference']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
async function metadata(page: Page) {
  await expect(card(page, 101).locator('strong').first()).toHaveText('External Anatomy'); await expect(card(page, 102).locator('strong').first()).toHaveText('External Anatomy');
  await expect(card(page, 101).locator('.diss-evidence__identity')).toContainText('Frame 1'); await expect(card(page, 102).locator('.diss-evidence__identity')).toContainText('Frame 2');
  await expect(card(page, 102).locator('.diss-evidence__identity')).toContainText(/reference|selected/i);
  await expect(card(page, 101).locator('.diss-evidence__metadata').first()).toBeVisible(); await expect(card(page, 102).locator('.diss-evidence__metadata').first()).toBeVisible();
  await expect(card(page, 101)).toContainText(frames[0].selectedOrganName!); await expect(card(page, 102)).toContainText(frames[1].selectedOrganName!);
  await expect(card(page, 101).locator('time[datetime]')).toHaveAttribute('datetime', frames[0].capturedAt!); await expect(card(page, 101).locator('time')).toHaveText('Captured 2026-10-04 14:30:00 UTC');
  await expect(card(page, 102).locator('time[datetime]')).toHaveAttribute('datetime', frames[1].capturedAt!); await expect(card(page, 102).locator('time')).toHaveText('Captured 2026-10-05 14:30:00 UTC');
  await expect(card(page, 102)).toContainText('0/100'); await expect(card(page, 102)).toContainText(/(?:optical|optics)[\s\S]*0(?:%|\/100)/i);
  await expect(card(page, 'legacy/frame 103')).toContainText('Capture time unavailable');
  await expect(card(page, 'legacy/frame 103')).toContainText('Technique not recorded'); await expect(card(page, 'legacy/frame 103')).toContainText('Optical quality not recorded');
  await expect(card(page, 'legacy/frame 103').locator('time[datetime]')).toHaveCount(0);
  await expect(compare(page, 101)).toHaveAccessibleName('Compare frame 1: External Anatomy'); await expect(compare(page, 102)).toHaveAccessibleName('Compare frame 2: External Anatomy');
  await expect(card(page, 101).getByRole('button', { name: 'Download frame 1: External Anatomy', exact: true })).toBeVisible(); await expect(card(page, 102).getByRole('button', { name: 'Download frame 2: External Anatomy', exact: true })).toBeVisible();
}
const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`evidence gallery layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' }); await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  const painted = await usePaintedLayoutFrames(page); await openNotebook(page); const before = await proof(page), saved = (await state(page)).visualEvidence, prefix = baseline ? 'before' : 'after';
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify({ fixture: painted, notebook: await metrics(notebook(page)), reference: await metrics(reference(page)) }, null, 2));
  await notebook(page).screenshot({ path: `${out}/${prefix}-${c.name}-notebook.png`, style: captureStyle }); await reference(page).screenshot({ path: `${out}/${prefix}-${c.name}-reference.png`, style: captureStyle }); if (baseline) return;
  await metadata(page); await readable(notebook(page), c.available, !!c.large); await readable(reference(page), c.available, !!c.large);
  await expect(heading(page)).toHaveText('Reference frame 2'); await expect(reference(page).locator('time')).toHaveText('Captured 2026-10-05 14:30:00 UTC');
  const close = reference(page).getByRole('button', { name: 'Close split comparison', exact: true }); await close.focus(); await writeFile(`${out}/${c.name}-focus.json`, JSON.stringify(await focusStyle(close), null, 2));
  await reference(page).screenshot({ path: `${out}/focus-${c.name}.png`, style: captureStyle }); expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence).toEqual(saved); await audit(page, c.name);
});

test('frame identities dates and unknown scores remain truthful with native downloads', async ({ page }) => {
  test.skip(baseline); const empty = { ...frames[2], id: 'empty-score', techniqueScore: '', opticalQuality: '', capturedAt: 'not-a-date' };
  await mount(page, { visualEvidence: [...frames, empty], splitComparison: false }); await openNotebook(page); const before = await proof(page), saved = (await state(page)).visualEvidence;
  await metadata(page); const legacy = card(page, 'empty-score'); await expect(legacy).toContainText('Technique not recorded'); await expect(legacy).toContainText('Optical quality not recorded'); await expect(legacy).toContainText('Capture time unavailable');
  await expect(compare(page, 'legacy/frame 103')).toHaveAccessibleName('Compare frame 3: Saved specimen view');
  const names = await notebook(page).locator('button[aria-label^="Compare frame"],button[aria-label^="Download frame"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
  expect(names).toHaveLength(8); expect(new Set(names).size).toBe(8);
  const downloadButton = card(page, 102).getByRole('button', { name: 'Download frame 2: External Anatomy', exact: true }); await downloadButton.focus();
  const downloading = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloading; await download.saveAs(`${out}/downloaded-frame-2.png`);
  expect(download.suggestedFilename()).toBe('frog_skin_102.png'); const png = await readFile(`${out}/downloaded-frame-2.png`); expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])); expect(png).toEqual(Buffer.from(image.split(',')[1], 'base64'));
  await expect(downloadButton).toBeFocused(); expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence).toEqual(saved); expect((await state(page)).referenceEvidenceId).toBe(102);
});

test('keyboard comparison focus returns to its frame and disclosure stays independent', async ({ page }) => {
  test.skip(baseline); await mount(page, { splitComparison: false }, 320); await openNotebook(page); const before = await proof(page), saved = (await state(page)).visualEvidence;
  await compare(page, 101).focus(); await page.keyboard.press('Enter'); await expect(heading(page)).toHaveText('Reference frame 1'); await expect(heading(page)).toBeFocused();
  await page.keyboard.press('Tab'); const close = reference(page).getByRole('button', { name: 'Close split comparison', exact: true }); await expect(close).toBeFocused(); await focusStyle(close); await page.keyboard.press('Space');
  await expect(reference(page)).toHaveCount(0); await expect(compare(page, 101)).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', ''); await expect(card(page, 101)).toHaveAttribute('data-reference', 'true'); expect((await state(page)).referenceEvidenceId).toBe(101);
  await compare(page, 102).focus(); await page.keyboard.press('Space'); await expect(heading(page)).toHaveText('Reference frame 2'); await expect(heading(page)).toBeFocused();
  const summary = notebook(page).locator('summary'); await summary.focus(); await page.keyboard.press('Enter'); await expect(notebook(page)).not.toHaveAttribute('open', ''); await expect(reference(page)).toBeVisible(); expect((await state(page)).referenceEvidenceId).toBe(102);
  await page.keyboard.press('Space'); await expect(notebook(page)).toHaveAttribute('open', ''); await expect(reference(page)).toBeVisible();
  await reference(page).getByRole('button', { name: 'Close split comparison', exact: true }).click(); await expect(compare(page, 102)).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', '');
  expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence).toEqual(saved); await notebook(page).screenshot({ path: `${out}/keyboard-return-phone.png`, style: captureStyle });
});

test('Essentials saved frame comparison opens Advanced and returns keyboard focus', async ({ page }) => {
  test.skip(baseline); await mount(page, { workspaceMode: 'essentials', evidenceNotebookOpen: true, splitComparison: false }, 320); await openNotebook(page);
  const before = await proof(page), saved = (await state(page)).visualEvidence, frame = compare(page, 101), advanced = page.getByRole('button', { name: 'Advanced workspace', exact: true });
  expect(saved).toEqual(frames); await expect(advanced).toHaveAttribute('aria-pressed', 'false'); await expect(reference(page)).toHaveCount(0);
  await expect(frame).toHaveText('Open comparison in Advanced'); await expect(frame).toHaveAccessibleName('Open comparison in Advanced for frame 1: External Anatomy');
  await frame.focus(); await page.keyboard.press('Enter'); await expect(advanced).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('[data-dissection-root]')).toHaveAttribute('data-workspace-mode', 'advanced');
  await expect(reference(page)).toBeVisible(); await expect(heading(page)).toHaveText('Reference frame 1'); await expect(heading(page)).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', '');
  expect((await state(page)).referenceEvidenceId).toBe(101); expect((await state(page)).visualEvidence).toEqual(saved); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Tab'); const close = reference(page).getByRole('button', { name: 'Close split comparison', exact: true }); await expect(close).toBeFocused(); await page.keyboard.press('Space');
  await expect(reference(page)).toHaveCount(0); await expect(frame).toBeFocused(); await expect(frame).toHaveAccessibleName('Compare frame 1: External Anatomy'); await expect(frame).toHaveText('Compare with live view');
  await expect(notebook(page)).toHaveAttribute('open', ''); await expect(card(page, 101)).toHaveAttribute('data-reference', 'true'); await expect(card(page, 101).locator('.diss-evidence__identity')).toContainText('Reference selected'); await expect(card(page, 101).locator('.diss-evidence__identity')).not.toContainText('Comparing now');
  expect((await state(page)).referenceEvidenceId).toBe(101); expect((await state(page)).visualEvidence).toEqual(saved); expect(await proof(page)).toEqual(before); await expect(advanced).toHaveAttribute('aria-pressed', 'true');
  await writeFile(`${out}/essentials-comparison-proof.json`, JSON.stringify({ workspaceMode: (await state(page)).workspaceMode, referenceEvidenceId: 101, frameIds: saved.map((entry: any) => entry.id), preserved: await proof(page) }, null, 2));
});


test('toolbar comparison and confirmed notebook management preserve other specimen work', async ({ page }) => {
  test.skip(baseline); await mount(page, { splitComparison: false, evidenceNotebookOpen: false, toolbarViewOpen: true }, 1440, 1180);
  const before = await proof(page), toggle = page.getByRole('button', { name: 'Toggle live and reference split comparison', exact: true }), summary = notebook(page).locator('summary');
  await expect(notebook(page)).not.toHaveAttribute('open', ''); await toggle.focus(); await page.keyboard.press('Enter'); await expect(reference(page)).toBeVisible(); await expect(notebook(page)).not.toHaveAttribute('open', '');
  await toggle.focus(); await page.keyboard.press('Space'); await expect(reference(page)).toHaveCount(0); await expect(notebook(page)).not.toHaveAttribute('open', '');
  await summary.focus(); await page.keyboard.press('Enter'); await expect(notebook(page)).toHaveAttribute('open', '');
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(reference(page)).toBeVisible(); await expect(notebook(page)).toHaveAttribute('open', '');
  const remove = card(page, 102).locator('[data-evidence-remove-id="102"]'); await remove.focus(); await page.keyboard.press('Enter'); const confirmRemove = card(page, 102).locator('[data-evidence-confirm-remove-id="102"]'); await expect(confirmRemove).toBeFocused(); await confirmationFocus(confirmRemove, card(page, 102), 'confirm-remove');
  await card(page, 102).getByRole('button', { name: 'Cancel', exact: true }).focus(); await page.keyboard.press('Space'); await expect(remove).toBeFocused(); expect((await state(page)).visualEvidence).toEqual(frames);
  await page.keyboard.press('Enter'); await expect(card(page, 102).locator('[data-evidence-confirm-remove-id="102"]')).toBeFocused(); await page.keyboard.press('Space');
  await expect(summary).toBeFocused(); const remaining = [frames[0], frames[2]]; expect((await state(page)).visualEvidence).toEqual(remaining); expect((await state(page)).referenceEvidenceId).toBe('legacy/frame 103');
  await expect(heading(page)).toHaveText('Reference frame 2'); await expect(notebook(page)).toHaveAttribute('open', ''); expect(await proof(page)).toEqual(before);
  await compare(page, 'legacy/frame 103').focus(); await page.keyboard.press('Enter'); await expect(heading(page)).toBeFocused(); const close = reference(page).getByRole('button', { name: 'Close split comparison', exact: true }); await close.focus(); await page.keyboard.press('Enter'); await expect(compare(page, 'legacy/frame 103')).toBeFocused(); expect(await proof(page)).toEqual(before);
  const clear = notebook(page).locator('#diss-evidence-clear-all'); await clear.focus(); await page.keyboard.press('Enter'); const confirmClear = page.locator('#diss-evidence-confirm-clear'); await expect(confirmClear).toBeFocused(); await confirmationFocus(confirmClear, page.locator('#diss-evidence-clear-confirmation'), 'confirm-clear');
  await page.locator('#diss-evidence-clear-confirmation').getByRole('button', { name: 'Cancel', exact: true }).focus(); await page.keyboard.press('Space'); await expect(clear).toBeFocused(); expect((await state(page)).visualEvidence).toEqual(remaining);
  await page.keyboard.press('Enter'); await expect(page.locator('#diss-evidence-confirm-clear')).toBeFocused(); await page.keyboard.press('Space');
  await expect(summary).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', ''); expect((await state(page)).visualEvidence).toEqual([]); expect((await state(page)).referenceEvidenceId).toBeNull(); await expect(reference(page)).toHaveCount(0); expect(await proof(page)).toEqual(before);
  await notebook(page).screenshot({ path: `${out}/empty-after-clear.png`, style: captureStyle });
});

test('real capture adds one compressed frame and comparison reflows without losing focus', async ({ page }) => {
  test.skip(baseline); await mount(page, { splitComparison: false, evidenceNotebookOpen: false, toolbarToolsOpen: true, largeText: true }, 1440, 1180);
  const { colours: painted } = await paintedCanvas(page);
  const before = await proof(page), capture = page.locator('[data-evidence-capture]'); await capture.focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).visualEvidence.length).toBe(4); const d = await state(page), captured = d.visualEvidence[3]; expect(d.visualEvidence.slice(0, 3)).toEqual(frames); expect(captured.image).toMatch(/^data:image\/jpeg;base64,/); expect(d.referenceEvidenceId).toBe(captured.id);
  await expect(heading(page)).toHaveText('Reference frame 4'); await expect(heading(page)).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', '');
  const img = reference(page).locator('img'); await expect.poll(async () => img.evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(220); expect(await img.evaluate(node => (node as HTMLImageElement).naturalHeight)).toBe(264); await expect(reference(page).locator('time[datetime]')).toHaveAttribute('datetime', captured.capturedAt); expect(await proof(page)).toEqual(before);
  await reference(page).screenshot({ path: `${out}/captured-reference-desktop.png`, style: captureStyle }); await page.keyboard.press('Tab'); const close = reference(page).getByRole('button', { name: 'Close split comparison', exact: true }); await expect(close).toBeFocused();
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} .diss-evidence :is(button,p,strong,span,time,summary), .diss-split-reference :is(button,p,strong,span,time) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  await expect(close).toBeFocused(); await focusStyle(close); await writeFile(`${out}/text-spacing-metrics.json`, JSON.stringify({ notebook: await readable(notebook(page), 320, true), reference: await readable(reference(page), 320, true) }, null, 2));
  await reference(page).screenshot({ path: `${out}/captured-reference-phone-spacing.png`, style: captureStyle }); await page.keyboard.press('Space'); await expect(compare(page, captured.id)).toBeFocused(); await expect(notebook(page)).toHaveAttribute('open', ''); expect((await state(page)).visualEvidence).toEqual(d.visualEvidence); expect(await proof(page)).toEqual(before);
  const downloadButton = card(page, captured.id).getByRole('button', { name: /^Download frame 4:/ }); await downloadButton.focus(); const downloading = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloading; await download.saveAs(`${out}/downloaded-captured-frame-4.jpg`);
  expect(download.suggestedFilename()).toBe(`frog_skin_${captured.id}.jpg`); const jpeg = await readFile(`${out}/downloaded-captured-frame-4.jpg`); expect(jpeg.subarray(0, 2)).toEqual(Buffer.from([255, 216])); expect(jpeg).toEqual(Buffer.from(captured.image.split(',')[1], 'base64')); await expect(downloadButton).toBeFocused(); expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence).toEqual(d.visualEvidence);
  await writeFile(`${out}/capture-proof.json`, JSON.stringify({ paintedColours: painted, captured: { id: captured.id, capturedAt: captured.capturedAt, imageLength: captured.image.length, width: 220, height: 264 }, preserved: await proof(page) }, null, 2));
});
