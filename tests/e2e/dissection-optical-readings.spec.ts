import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

const out = process.env.DISSECTION_OPTICAL_READINGS_OUTPUT || 'test-results/dissection-optical-readings';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { tissueState: tissue, inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true } }, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'forceps', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: false, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  procedureScenario: 'precision-access', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  organNotes: { 'frog|nictitating': 'Preserved observation.', 'earthworm|dorsal_vessel': 'Other specimen work.' }, organConfidence: { 'frog|nictitating': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'earthworm|dorsal_vessel': true }, completedObjectives: { 'earthworm|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true } },
  soundEnabled: false, sceneDetail: false, _procedureDemo: null, _procedureReplay: null, selectedProcedureActionAt: 100,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 1 },
  inspectionLens: true, lensFocusDepth: 'deep', lensMagnification: 6, lightIntensity: 60,
  procedureByLayer: { skin: procedure, muscle: { ...procedure, inspected: true, errors: 0 } }, attemptArchive: { skin: [savedAttempt] }, compareTechniqueAttempts: true, compareReplayPlaying: false, compareReplayProgress: .4,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
};
const readingLabels = { target: 'Inspection target', detail: 'Detail at current focus', focus: 'Recommended focus', light: 'Light intensity', illumination: 'Illumination status', glare: 'Glare risk' };
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const panel = (page: Page) => page.locator('#diss-optical-inspection');
const disclosure = (page: Page) => panel(page).locator('details.diss-optics__explanation');
const help = (page: Page) => page.locator('#diss-optics-explanation');
const review = (page: Page) => page.locator('#diss-optics-review-light');
const light = (page: Page) => page.locator('#diss-light-intensity-range');
const reading = (page: Page, id: keyof typeof readingLabels) => panel(page).locator(`dl.diss-optics__readings [data-optical-reading="${id}"]`);
const depth = (page: Page, label: string) => panel(page).getByRole('group', { name: 'Inspection focus depth', exact: true }).getByRole('button', { name: label, exact: true });
const magnification = (page: Page, level: number) => panel(page).getByRole('group', { name: 'Inspection magnification', exact: true }).getByRole('button', { name: `${level}x`, exact: true });

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, view: d.anatomicalView, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], optics: { lens: d.inspectionLens, depth: d.lensFocusDepth, magnification: d.lensMagnification, light: d.lightIntensity, pinned: d.lensPinned, pinnedPoint: d.lensPinnedPoint, pinnedOrgan: d.lensPinnedOrganId },
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], playback: [d._procedureDemo, d._procedureReplay, d.compareReplayPlaying],
      preferences: [d.workspaceMode, d.techniquePanelOpen, d.procedureMode, d.showProcedureDebrief, d.soundEnabled, d.sceneDetail, d.reducedMotion, d.largeText, d.highContrast],
      toolbar: { view: d.toolbarViewOpen, tools: d.toolbarToolsOpen, study: d.toolbarStudyOpen },
    };
  });
}
async function activate(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await page.keyboard.press(key); await page.clock.runFor(160);
}
async function mount(page: Page, seed: any = {}, width = 1440, available = 1180) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap{width:100%!important;max-width:${available}px;}` });
  const epoch = await page.evaluate(() => Date.now());
  await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
}
async function openPanel(page: Page) {
  if (await page.locator('#diss-procedure-panel').getAttribute('open') === null) await activate(page, page.locator('#diss-procedure-summary'));
  await expect(panel(page)).toBeVisible();
}
type OpticalSnapshot = { quality: number; label: string; tone: string; target: string; detail: string; focus: string; light: number; illumination: string; glare: number; suggestion: string };
const initialReading: OpticalSnapshot = { quality: 60, label: 'Soft focus', tone: 'soft', target: 'Nictitating Membrane', detail: 'subsurface tissue plane', focus: 'surface', light: 60, illumination: 'Balanced illumination', glare: 0, suggestion: 'Set focus depth to surface for this structure.' };
async function content(page: Page, expected: OpticalSnapshot) {
  await expect(panel(page)).toHaveAccessibleName(`Optical inspection quality ${expected.quality} percent`);
  await expect(panel(page)).toHaveAttribute('data-tone', expected.tone);
  await expect(panel(page)).toContainText('Optical inspection');
  await expect(panel(page)).toContainText(expected.label);
  const progress = panel(page).getByRole('progressbar', { name: `Optical focus quality ${expected.quality} percent`, exact: true });
  await expect(progress).toHaveAttribute('value', String(expected.quality)); await expect(progress).toHaveAttribute('max', '100');
  await expect(panel(page).locator('.diss-optics__score')).toHaveText(`${expected.quality}%`);
  await expect(panel(page).locator('dl.diss-optics__readings [data-optical-reading]')).toHaveCount(6);
  for (const id of Object.keys(readingLabels) as Array<keyof typeof readingLabels>) await expect(reading(page, id).locator('dt')).toHaveText(readingLabels[id]);
  for (const id of ['target', 'detail', 'focus'] as const) await expect(reading(page, id).locator('dd')).toHaveText(expected[id]);
  await expect(reading(page, 'light').locator('dd')).toHaveText(`${expected.light}%`);
  await expect(reading(page, 'illumination').locator('dd')).toHaveText(expected.illumination);
  await expect(reading(page, 'glare').locator('dd')).toHaveText(`${expected.glare}%`);
  await expect(page.locator('#diss-optics-suggestion')).toHaveText(expected.suggestion);
  await expect(help(page)).toHaveText('How inspection quality works');
  await expect(review(page)).toHaveText('Review illumination');
  const current = await state(page);
  if (current.toolbarViewOpen) await expect(review(page)).toHaveAttribute('aria-controls', 'diss-light-intensity-range');
  else expect(await review(page).getAttribute('aria-controls')).toBeNull();
  await expect(review(page)).toHaveAttribute('aria-describedby', 'diss-optics-light-guidance');
  for (const value of ['surface', 'structure', 'deep']) await expect(depth(page, value[0].toUpperCase() + value.slice(1))).toHaveAttribute('aria-pressed', String(current.lensFocusDepth === value));
  for (const level of [2, 4, 6]) await expect(magnification(page, level)).toHaveAttribute('aria-pressed', String(current.lensMagnification === level));
}
async function readability(page: Page, available: number, large: boolean) {
  const geometry = await panel(page).evaluate(node => {
    const box = (element: Element) => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, card: box(node),
      text: Array.from(node.querySelectorAll('strong, p, span, dt, dd, b, summary, button')).filter(element => element.getClientRects().length && element.textContent?.trim()).map(element => ({ text: element.textContent, ...box(element) })),
      readings: Array.from(node.querySelectorAll('[data-optical-reading]')).map(box),
      controls: Array.from(node.querySelectorAll('summary, button')).map(box),
      structureLabel: (() => {
        const button = Array.from(node.querySelectorAll('.diss-optics__options button')).find(element => element.textContent?.trim() === 'Structure')!;
        const range = document.createRange(); range.selectNodeContents(button);
        return { textHeight: range.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(button).lineHeight) };
      })(),
      forcedColors: matchMedia('(forced-colors: active)').matches, highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast'),
    };
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.card.width).toBeLessThanOrEqual(available + 1);
  expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth + 1);
  expect(geometry.card.scrollHeight).toBeLessThanOrEqual(geometry.card.clientHeight + 1);
  for (const item of geometry.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    expect(item.overflow, item.text || '').not.toBe('ellipsis');
    if (item.clientWidth) expect(item.scrollWidth, item.text || '').toBeLessThanOrEqual(item.clientWidth + 1);
    expect(item.left, item.text || '').toBeGreaterThanOrEqual(geometry.card.left);
    expect(item.right, item.text || '').toBeLessThanOrEqual(geometry.card.right + 1);
  }
  for (const item of geometry.readings) {
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1); expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight + 1);
  }
  for (const control of geometry.controls) expect(control.height).toBeGreaterThanOrEqual(47.9);
  expect(geometry.structureLabel.textHeight, 'Structure must remain on one readable line').toBeLessThanOrEqual(geometry.structureLabel.lineHeight + 1);
  return geometry;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid'); return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-optical-inspection']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true, contrast: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`optical inspection is readable and keyboard accessible ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available); await openPanel(page);
  const before = await savedWork(page), closedGeometry = await readability(page, variant.available, !!variant.large); await content(page, initialReading);
  expect(closedGeometry.forcedColors).toBe(!!variant.forced); expect(closedGeometry.highContrast).toBe(variant.contrast ? 'true' : 'false');
  await expect(disclosure(page)).not.toHaveAttribute('open', ''); await help(page).focus(); const focus = await focusAppearance(help(page));
  await panel(page).screenshot({ path: `${out}/${variant.name}-closed-focus.png`, style: screenshotStyle });
  await page.keyboard.press('Tab'); await expect(review(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(help(page)).toBeFocused();
  await activate(page, help(page), variant.key); await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(help(page)).toBeFocused();
  const helpText = await disclosure(page).innerText();
  expect(helpText).toContain('This simulation combines focus depth, magnification, field condition, target selection, pinning, and illumination.');
  expect(helpText).toContain('A higher quality score is better; more magnification or brighter light does not always improve it.');
  expect(helpText).toContain('Focus-plane counts compare each visible structure with the selected depth. They describe depth alignment, not the overall quality score.');
  expect(helpText).toContain('Without a selected or pinned structure, the recommended focus defaults to surface.');
  await expect(page.locator('#diss-optics-light-guidance')).toHaveText('Intensity preserves relief while keeping reflective glare controlled.');
  const openGeometry = await readability(page, variant.available, !!variant.large);
  await panel(page).screenshot({ path: `${out}/${variant.name}-open-focus.png`, style: screenshotStyle });
  const pixels = readPng(await panel(page).locator('progress').screenshot({ style: screenshotStyle }));
  const y = Math.floor(pixels.height / 2), filled = pixels.at(Math.floor(pixels.width * .3), y), empty = pixels.at(Math.floor(pixels.width * .8), y);
  const paintedContrast = contrastRatio(filled, empty); expect(paintedContrast).toBeGreaterThanOrEqual(3);
  await audit(page, variant.name); expect(await savedWork(page)).toEqual(before);
  const beforeFeedback = (await state(page)).procedureFeedback;
  await activate(page, review(page), variant.key); await expect(light(page)).toBeVisible(); await expect(light(page)).toBeFocused();
  await expect(review(page)).toHaveAttribute('aria-controls', 'diss-light-intensity-range');
  await expect(light(page)).toHaveValue('60'); await expect(disclosure(page)).toHaveAttribute('open', '');
  const afterReview = { ...before, toolbar: { view: true, tools: false, study: false } };
  expect(await savedWork(page)).toEqual(afterReview); expect((await state(page)).procedureFeedback).toEqual(beforeFeedback);
  await activate(page, review(page), variant.key); await expect(light(page)).toBeFocused(); expect(await savedWork(page)).toEqual(afterReview);
  await activate(page, help(page), variant.key); await expect(disclosure(page)).not.toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(afterReview);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ variant, initialReading, closedGeometry, openGeometry, focus, helpText, meterPixels: { width: pixels.width, height: pixels.height, filled, empty, contrast: paintedContrast }, before, after: await savedWork(page), feedbackBefore: beforeFeedback, feedbackAfter: (await state(page)).procedureFeedback }, null, 2));
});

test('focus magnification and illumination update only their chosen settings and keep interpretation open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page); await activate(page, help(page));
  const before = await savedWork(page), proofs = [];
  await activate(page, depth(page, 'Surface')); await expect(depth(page, 'Surface')).toBeFocused();
  const focused = { ...initialReading, quality: 82, label: 'Resolved', tone: 'resolved', detail: 'pigment and mucous texture', suggestion: 'Extend and retract only along the established corridor.' };
  await content(page, focused); await expect(disclosure(page)).toHaveAttribute('open', '');
  expect(await savedWork(page)).toEqual({ ...before, optics: { ...before.optics, depth: 'surface' } }); proofs.push(focused);
  await activate(page, magnification(page, 2), 'Space'); await expect(magnification(page, 2)).toBeFocused();
  const magnified = { ...focused, quality: 89 }; await content(page, magnified); await expect(disclosure(page)).toHaveAttribute('open', '');
  const settings = { ...before, optics: { ...before.optics, depth: 'surface', magnification: 2 } };
  expect(await savedWork(page)).toEqual(settings); proofs.push(magnified);
  await activate(page, review(page)); await expect(light(page)).toBeFocused();
  const reviewed = { ...settings, toolbar: { view: true, tools: false, study: false } }; expect(await savedWork(page)).toEqual(reviewed);
  for (const [key, expected] of [
    ['End', { ...magnified, quality: 85, light: 100, illumination: 'Glare limited', glare: 51, suggestion: 'Reduce illumination or use a raking angle to recover wet-surface detail.' }],
    ['Home', { ...magnified, quality: 84, light: 20, illumination: 'Underlit', glare: 0, suggestion: 'Increase illumination until boundaries are visible without flattening relief.' }],
  ] as const) {
    await page.keyboard.press(key); await page.clock.runFor(160); await content(page, expected);
    await expect(light(page)).toBeFocused(); await expect(disclosure(page)).toHaveAttribute('open', '');
    expect(await savedWork(page)).toEqual({ ...reviewed, optics: { ...reviewed.optics, light: expected.light } }); proofs.push(expected);
  }
  await writeFile(`${out}/settings-proof.json`, JSON.stringify({ before, readings: proofs, after: await savedWork(page) }, null, 2));
});

test('optical interpretation resets with its selected target layer or specimen while saved work stays intact', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page);
  const proofs = [];
  for (const patch of [{ selectedOrgan: 'tympanum' }, { selectedOrgan: null }, { activeLayer: 'muscle' }, { activeLayer: 'skin' }, { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', selectedOrgan: null }]) {
    await activate(page, help(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
    await page.evaluate(p => (window as any).__ctx.updateMulti('dissection', p), patch); await page.clock.runFor(160); await openPanel(page);
    await expect(disclosure(page)).not.toHaveAttribute('open', '');
    if (patch.selectedOrgan === 'tympanum') await expect(reading(page, 'target').locator('dd')).toHaveText('Tympanic Membrane');
    if ('selectedOrgan' in patch && patch.selectedOrgan === null) {
      await expect(reading(page, 'target').locator('dd')).toHaveText('Unlabeled tissue field');
      await expect(reading(page, 'focus').locator('dd')).toHaveText('surface (field default)');
    }
    const afterChange = await savedWork(page), target = await reading(page, 'target').locator('dd').innerText();
    await activate(page, help(page), 'Space'); await expect(disclosure(page)).toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, help(page), 'Space'); proofs.push({ patch, target, savedWork: afterChange });
  }
  await writeFile(`${out}/context-reset-proof.json`, JSON.stringify(proofs, null, 2));
});

test('optical interpretation and illumination handoff stay hidden during assessment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, techniquePanelOpen: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true); const before = await savedWork(page);
    await expect(panel(page)).toBeHidden(); await expect(help(page)).toBeHidden(); await expect(review(page)).toBeHidden();
    expect(await savedWork(page)).toEqual(before); proofs.push({ mode, hidden: true }); await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});

test('pending illumination focus yields to keyboard navigation and assessment entry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const proofs = [];
  for (const interruption of ['keyboard', 'quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, techniquePanelOpen: true }); await openPanel(page);
    await review(page).focus(); await page.keyboard.press('Enter');
    // Keep the clock paused while the learner changes context before deferred focus.
    if (interruption === 'keyboard') await help(page).focus();
    else await page.evaluate(mode => {
      const ctx = (window as any).__ctx;
      ctx.updateMulti('dissection', { [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    }, interruption);
    const afterInterruption = await savedWork(page), beforeFeedback = (await state(page)).procedureFeedback;
    await page.clock.runFor(160);
    if (interruption === 'keyboard') await expect(help(page)).toBeFocused();
    else await expect(panel(page)).toBeHidden();
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('diss-light-intensity-range');
    expect(await savedWork(page)).toEqual(afterInterruption); expect((await state(page)).procedureFeedback).toEqual(beforeFeedback);
    proofs.push({ interruption, focus: await page.evaluate(() => document.activeElement?.id), before: afterInterruption, after: await savedWork(page) });
    await harness.unmount(page);
  }
  await writeFile(`${out}/pending-focus-proof.json`, JSON.stringify(proofs, null, 2));
});
