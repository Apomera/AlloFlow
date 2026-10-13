import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

const out = process.env.DISSECTION_MATERIAL_READINGS_OUTPUT || 'test-results/dissection-material-readings';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { toolCalibration: { bladeAngle: 60, scissorsAperture: 70 }, calibrationScores: { dropper: 100 }, tissueState: tissue, inspected: true, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } }, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'scalpel', specimenCondition: 'standard', selectedOrgan: 'nictitating', hoveredOrgan: null,
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
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const panel = (page: Page) => page.locator('#diss-material-readings');
const disclosure = (page: Page) => panel(page).locator('details.diss-material__explanation');
const help = (page: Page) => page.locator('#diss-material-explanation');
const review = (page: Page) => page.locator('#diss-material-review-calibration');
const protocol = (page: Page) => page.locator('#diss-calibration-range');
const reading = (page: Page, id: string) => panel(page).locator(`dl.diss-material__readings [data-material-reading="${id}"]`);

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
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], optics: [d.inspectionLens, d.lensFocusDepth, d.lensMagnification, d.lightIntensity, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], playback: [d._procedureDemo, d._procedureReplay, d.compareReplayPlaying],
      preferences: [d.workspaceMode, d.techniquePanelOpen, d.procedureMode, d.showProcedureDebrief, d.soundEnabled, d.sceneDetail, d.reducedMotion, d.largeText, d.highContrast],
      toolbar: [d.toolbarViewOpen, d.toolbarToolsOpen, d.toolbarStudyOpen], feedback: d.procedureFeedback,
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
type MaterialReading = { score: number; quality: number; margin: number; response: string };
const initialReading: MaterialReading = { score: 28, quality: 100, margin: 38, response: 'Calibration supports a controlled opening.' };
async function content(page: Page, expected: MaterialReading) {
  await expect(panel(page)).toHaveAccessibleName('Material response readings');
  await expect(panel(page)).toHaveAttribute('data-tone', expected.margin >= 0 ? 'clear' : 'caution');
  await expect(panel(page).locator('.diss-material__state')).toHaveText('Low-resistance material');
  await expect(panel(page).locator('.diss-material__score')).toHaveText(expected.score + '/100');
  await expect(panel(page).locator('.diss-material__tool')).toHaveText('Selected instrument: Scalpel');
  const meter = panel(page).getByRole('meter', { name: 'Material resistance', exact: true });
  await expect(meter).toHaveAttribute('aria-valuenow', String(expected.score));
  await expect(meter).toHaveAttribute('aria-valuemin', '0'); await expect(meter).toHaveAttribute('aria-valuemax', '100');
  await expect(meter).toHaveAttribute('aria-valuetext', expected.score + ' out of 100. Low-resistance material');
  await expect(reading(page,'calibration').locator('dt')).toHaveText('Current calibration quality');
  await expect(reading(page,'calibration').locator('dd')).toHaveText(expected.quality + '/100');
  await expect(reading(page,'required').locator('dt')).toHaveText('Required cutting quality');
  await expect(reading(page,'required').locator('dd')).toHaveText('62/100');
  await expect(reading(page,'margin').locator('dt')).toHaveText('Calibration margin');
  await expect(reading(page,'margin').locator('dd')).toHaveText((expected.margin > 0 ? '+' : '') + expected.margin + ' points');
  await expect(page.locator('#diss-material-guidance')).toHaveText(expected.response);
  await expect(help(page)).toHaveText('How material response works');
  await expect(review(page)).toHaveText('Review instrument calibration');
  await expect(review(page)).toHaveAttribute('aria-controls','diss-calibration-range');
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
      readings: Array.from(node.querySelectorAll('[data-material-reading]')).map(box), controls: Array.from(node.querySelectorAll('summary, button')).map(box),
      forcedColors: matchMedia('(forced-colors: active)').matches, highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast'),
    };
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.card.width).toBeLessThanOrEqual(available + 1);
  expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth + 1);
  expect(geometry.card.scrollHeight).toBeLessThanOrEqual(geometry.card.clientHeight + 1);
  for (const item of geometry.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(item.overflow, item.text || '').not.toBe('ellipsis');
    if (item.clientWidth) expect(item.scrollWidth, item.text || '').toBeLessThanOrEqual(item.clientWidth + 1);
    expect(item.left, item.text || '').toBeGreaterThanOrEqual(geometry.card.left); expect(item.right, item.text || '').toBeLessThanOrEqual(geometry.card.right + 1);
  }
  for (const item of geometry.readings) {
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1); expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight + 1);
  }
  for (const control of geometry.controls) expect(control.height).toBeGreaterThanOrEqual(47.9);
  return geometry;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid'); return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-material-readings']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]); expect(result.incomplete).toEqual([]);
}
const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true, contrast: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`material response is readable and reviews the current calibration ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available); await openPanel(page);
  const before = await savedWork(page), closedGeometry = await readability(page, variant.available, !!variant.large); await content(page, initialReading);
  expect(closedGeometry.forcedColors).toBe(!!variant.forced); expect(closedGeometry.highContrast).toBe(variant.contrast ? 'true' : 'false');
  await expect(disclosure(page)).not.toHaveAttribute('open', ''); await help(page).focus(); const focus = await focusAppearance(help(page));
  await panel(page).screenshot({ path: `${out}/${variant.name}-closed-focus.png`, style: screenshotStyle });
  await page.keyboard.press('Tab'); await expect(review(page)).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(help(page)).toBeFocused();
  await activate(page, help(page), variant.key); await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(help(page)).toBeFocused();
  const helpText = await disclosure(page).innerText();
  expect(helpText).toContain('A higher resistance score means more resistance, not better technique.');
  expect(helpText).toContain('A negative margin blocks cutting.');
  expect(helpText).toContain('calibration, view, depth, sequence, field, and learning checks still apply.');
  expect(helpText).toContain('Settings saved with earlier actions remain unchanged.');
  const openGeometry = await readability(page, variant.available, !!variant.large);
  await panel(page).screenshot({ path: `${out}/${variant.name}-open-focus.png`, style: screenshotStyle });
  const pixels = readPng(await panel(page).locator('.diss-material__meter').screenshot({ style: screenshotStyle }));
  const y = Math.floor(pixels.height / 2), fillX = Math.floor(pixels.width * .115), emptyX = Math.floor(pixels.width * .615);
  const filled = pixels.at(fillX, y), empty = pixels.at(emptyX, y), paintedContrast = contrastRatio(filled, empty);
  expect(paintedContrast).toBeGreaterThanOrEqual(3); await audit(page, variant.name); expect(await savedWork(page)).toEqual(before);
  await review(page).focus(); await focusAppearance(review(page));
  const originalScroll = await protocol(page).evaluate(node => ({ margin: parseFloat(getComputedStyle(node).scrollMarginTop) || 0, inlineMargin: (node as HTMLElement).style.getPropertyValue('scroll-margin-top'), inlinePriority: (node as HTMLElement).style.getPropertyPriority('scroll-margin-top') }));
  // No clock advance: this is a synchronous move between existing panels.
  await page.keyboard.press(variant.key); expect(await page.evaluate(() => document.activeElement?.id)).toBe('diss-calibration-range');
  await expect(protocol(page)).toBeVisible();
  const reviewFocus = await focusAppearance(protocol(page));
  const reviewPosition = await protocol(page).evaluate(node => {
    const target = node.getBoundingClientRect(), heading = node.getBoundingClientRect();
    const action = node.closest('[data-dissection-root]')!.querySelector('.diss-next-action'), style = action && getComputedStyle(action), bounds = action && action.getBoundingClientRect();
    const sticky = style && bounds && ['sticky', 'fixed'].includes(style.position) && bounds.height > 0
      ? { top: bounds.top, bottom: bounds.bottom, height: bounds.height, cssTop: parseFloat(style.top) || 0, visible: bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > target.left && bounds.left < target.right } : null;
    return { top: target.top, headingTop: heading.top, headingBottom: heading.bottom, viewportHeight: innerHeight, sticky, margin: parseFloat(getComputedStyle(node).scrollMarginTop) || 0, inlineMargin: (node as HTMLElement).style.getPropertyValue('scroll-margin-top'), inlinePriority: (node as HTMLElement).style.getPropertyPriority('scroll-margin-top') };
  });
  const stickyBottom = reviewPosition.sticky?.visible ? Math.max(0, reviewPosition.sticky.bottom) : 0;
  const expectedMargin = Math.max(originalScroll.margin, reviewPosition.sticky ? reviewPosition.sticky.height + reviewPosition.sticky.cssTop + 12 : 0);
  expect(reviewPosition.top).toBeGreaterThanOrEqual(stickyBottom - 1); expect(reviewPosition.top).toBeLessThanOrEqual(expectedMargin + 2);
  expect(reviewPosition.headingTop).toBeGreaterThanOrEqual(stickyBottom ? stickyBottom + 12 : 0); expect(reviewPosition.headingBottom).toBeLessThanOrEqual(reviewPosition.viewportHeight);
  expect(reviewPosition.margin).toBe(originalScroll.margin); expect(reviewPosition.inlineMargin).toBe(originalScroll.inlineMargin); expect(reviewPosition.inlinePriority).toBe(originalScroll.inlinePriority);
  await page.clock.runFor(160); await expect(disclosure(page)).toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(before);
  // Leaving the existing slider deliberately announces its calibration on blur.
  // Capture that native feedback before testing the next navigation action.
  await review(page).focus(); await page.clock.runFor(160); const afterRangeBlur = await savedWork(page);
  expect(afterRangeBlur).toEqual({ ...before, feedback: afterRangeBlur.feedback });
  expect(afterRangeBlur.feedback.message).toContain('Scalpel calibration: Calibrated.');
  await page.keyboard.press(variant.key); await page.clock.runFor(160); await expect(protocol(page)).toBeFocused(); expect(await savedWork(page)).toEqual(afterRangeBlur);
  await help(page).focus(); await page.clock.runFor(160); const beforeClosingHelp = await savedWork(page);
  expect(beforeClosingHelp).toEqual({ ...before, feedback: beforeClosingHelp.feedback });
  await page.keyboard.press(variant.key); await page.clock.runFor(160); await expect(disclosure(page)).not.toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(beforeClosingHelp);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ variant, initialReading, closedGeometry, openGeometry, focus, helpText, reviewFocus, originalScroll, reviewPosition, expectedMargin, meterPixels: { width: pixels.width, height: pixels.height, fillX, emptyX, filled, empty, contrast: paintedContrast }, before, after: await savedWork(page) }, null, 2));
});

test('live calibration updates material and readiness while prior action settings stay fixed', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'}); await mount(page,{reducedMotion:true}); await openPanel(page); await activate(page,help(page));
  const before=await savedWork(page); await content(page,initialReading); await expect(page.locator('.diss-readiness')).toHaveAttribute('data-tone','ready');
  await activate(page,review(page)); await page.keyboard.press('End'); await page.clock.runFor(160);
  await content(page,{score:28,quality:20,margin:-42,response:'Recalibrate before cutting this material.'});
  await expect(page.locator('#diss-calibration-status')).toContainText('Caution 20%'); await expect(page.locator('.diss-readiness')).toHaveAttribute('data-tone','caution');
  expect(await savedWork(page)).toEqual({...before,calibration:{...before.calibration,bladeAngle:60}}); await expect(disclosure(page)).toHaveAttribute('open','');
  for(let i=0;i<25;i++) await page.keyboard.press('ArrowLeft'); await page.clock.runFor(160);
  await content(page,initialReading); await expect(page.locator('.diss-readiness')).toHaveAttribute('data-tone','ready'); expect(await savedWork(page)).toEqual(before);
  // Reverse history: a good recorded setting must not mask a poor current setting.
  await page.evaluate(() => {const c=(window as any).__ctx,d=c.toolData.dissection;c.updateMulti('dissection',{procedureByLayer:{...d.procedureByLayer,skin:{...d.procedureByLayer.skin,toolCalibration:{...d.procedureByLayer.skin.toolCalibration,bladeAngle:35}}}});}); await page.clock.runFor(160);
  const goodRecord=await savedWork(page); await protocol(page).focus(); await page.keyboard.press('End'); await page.clock.runFor(160);
  await content(page,{score:28,quality:20,margin:-42,response:'Recalibrate before cutting this material.'}); await expect(page.locator('.diss-readiness')).toHaveAttribute('data-tone','caution');
  expect(await savedWork(page)).toEqual({...goodRecord,calibration:{...goodRecord.calibration,bladeAngle:60}});
  await writeFile(out+'/live-calibration-proof.json',JSON.stringify({before,goodRecord,after:await savedWork(page)},null,2));
});

test('cutting details and calibration review follow the selected instrument', async ({page}) => {
 await page.emulateMedia({reducedMotion:'reduce'}); await mount(page,{reducedMotion:true}); await openPanel(page); const records=(await savedWork(page)).procedures;
 for(const tool of ['scissors','forceps','probe','inspect','wick']) {
  await activate(page,help(page)); await expect(disclosure(page)).toHaveAttribute('open','');
  await page.evaluate(tool=>(window as any).__ctx.updateMulti('dissection',{activeInstrument:tool}),tool);await page.clock.runFor(160);
  await expect(disclosure(page)).not.toHaveAttribute('open','');
  await expect(panel(page).locator('[data-material-reading]')).toHaveCount(tool==='scissors'?3:0);
  if(['inspect','wick'].includes(tool)) await expect(review(page)).toHaveCount(0);else {await activate(page,review(page));await expect(protocol(page)).toBeFocused();}
  expect((await savedWork(page)).procedures).toEqual(records);
 }
 await writeFile(out+'/instrument-context-proof.json',JSON.stringify({records,after:await savedWork(page)},null,2));
});

test('material interpretation resets for a new layer or specimen without changing saved work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page); const proofs = [];
  for (const patch of [{ activeLayer: 'muscle' }, { activeLayer: 'skin' }, { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', selectedOrgan: null }]) {
    await activate(page, help(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
    await page.evaluate(p => (window as any).__ctx.updateMulti('dissection', p), patch); await page.clock.runFor(160); await openPanel(page);
    await expect(disclosure(page)).not.toHaveAttribute('open', ''); const afterChange = await savedWork(page);
    await activate(page, help(page), 'Space'); await expect(disclosure(page)).toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, review(page)); await expect(protocol(page)).toBeFocused(); expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, help(page), 'Space'); proofs.push({ patch, savedWork: afterChange });
  }
  await writeFile(`${out}/context-reset-proof.json`, JSON.stringify(proofs, null, 2));
});

test('material interpretation and calibration review remain hidden during assessment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, techniquePanelOpen: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true); const before = await savedWork(page);
    await expect(panel(page)).toBeHidden(); await expect(help(page)).toBeHidden(); await expect(review(page)).toBeHidden();
    expect(await savedWork(page)).toEqual(before); proofs.push({ mode, hidden: true }); await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});
