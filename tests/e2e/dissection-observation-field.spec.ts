import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

const out = process.env.DISSECTION_OBSERVATION_FIELD_OUTPUT || 'test-results/dissection-observation-field';
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
const contributorIds = ['exposure', 'clarity', 'stability', 'risk'] as const;
const contributorLabels = { exposure: 'Opening size', clarity: 'Surface clarity', stability: 'Field stability', risk: 'Handling risk' };
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const panel = (page: Page) => page.locator('#diss-observation-field');
const disclosure = (page: Page) => panel(page).locator('details.diss-field-quality__explanation');
const explanation = (page: Page) => page.locator('#diss-observation-explanation');
const review = (page: Page) => page.locator('#diss-observation-field-review');

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
      preferences: [d.workspaceMode, d.techniquePanelOpen, d.toolbarViewOpen, d.procedureMode, d.showProcedureDebrief, d.soundEnabled, d.sceneDetail, d.reducedMotion, d.largeText, d.highContrast],
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
function qualityFor(current: typeof tissue, probed: boolean) {
  const rounded = Math.round(current.clarity * .36 + current.exposure * .32 + current.stability * .22 + (100 - current.risk) * .10);
  return Math.min(100, Math.max(0, rounded + (probed ? 5 : 0)));
}
function labelFor(quality: number) {
  return quality >= 80 ? 'High-definition field' : quality >= 65 ? 'Clear field' : quality >= 48 ? 'Developing field' : 'Limited observation field';
}
async function content(page: Page) {
  const d = await state(page), currentProcedure = d.procedureByLayer[d.activeLayer], current = currentProcedure.tissueState;
  const quality = qualityFor(current, currentProcedure.probed), label = labelFor(quality), card = panel(page);
  await expect(card).toHaveAccessibleName(`Observation field quality ${quality} percent`);
  await expect(card.locator('.diss-field-quality__score')).toHaveText(`${quality}%`);
  await expect(card).toContainText(label);
  await expect(card).toHaveAttribute('data-tone', quality >= 65 ? 'clear' : quality >= 48 ? 'developing' : 'restricted');
  const meter = card.getByRole('meter', { name: 'Observation quality', exact: true });
  await expect(card.getByRole('meter')).toHaveCount(1);
  await expect(meter).toHaveAttribute('aria-valuemin', '0');
  await expect(meter).toHaveAttribute('aria-valuemax', '100');
  await expect(meter).toHaveAttribute('aria-valuenow', String(quality));
  await expect(meter).toHaveAttribute('aria-valuetext', `${quality} percent. ${label}`);
  await expect(card.locator('dl [data-contributor]')).toHaveCount(4);
  for (const id of contributorIds) {
    const contributor = card.locator(`dl [data-contributor="${id}"]`);
    await expect(contributor.locator('dt')).toHaveText(contributorLabels[id]);
    await expect(contributor.locator('dd')).toHaveText(`${current[id]}%`);
  }
  await expect(explanation(page)).toHaveText('How this reading works');
  await expect(review(page)).toHaveText('Review live field readings');
  await expect(review(page)).toHaveAttribute('aria-controls', 'diss-field-tissue');
  return { quality, label, values: Object.fromEntries(contributorIds.map(id => [id, current[id]])), probed: !!currentProcedure.probed };
}
async function readability(page: Page, available: number, large: boolean) {
  const geometry = await panel(page).evaluate(node => {
    const box = (element: Element) => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    const parent = node.parentElement!, parentStyle = getComputedStyle(parent);
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, card: box(node), parent: box(parent),
      parentInset: ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((sum, key) => sum + (parseFloat((parentStyle as any)[key]) || 0), 0),
      text: Array.from(node.querySelectorAll('strong, p, span, dt, dd, summary, button')).filter(element => element.getClientRects().length).map(element => ({ text: element.textContent, ...box(element) })),
      contributors: Array.from(node.querySelectorAll('[data-contributor]')).map(box),
      controls: Array.from(node.querySelectorAll('summary, button')).map(box),
    };
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.card.width).toBeLessThanOrEqual(available + 1);
  expect(geometry.card.width).toBeGreaterThanOrEqual(geometry.parent.width - geometry.parentInset - 2);
  expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth + 1);
  expect(geometry.card.scrollHeight).toBeLessThanOrEqual(geometry.card.clientHeight + 1);
  for (const item of geometry.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    expect(item.overflow, item.text || '').not.toBe('ellipsis');
    if (item.clientWidth) expect(item.scrollWidth, item.text || '').toBeLessThanOrEqual(item.clientWidth + 1);
    expect(item.left, item.text || '').toBeGreaterThanOrEqual(geometry.card.left);
    expect(item.right, item.text || '').toBeLessThanOrEqual(geometry.card.right + 1);
  }
  for (const contributor of geometry.contributors) {
    expect(contributor.scrollWidth).toBeLessThanOrEqual(contributor.clientWidth + 1);
    expect(contributor.scrollHeight).toBeLessThanOrEqual(contributor.clientHeight + 1);
  }
  for (const control of geometry.controls) expect(control.height).toBeGreaterThanOrEqual(47.9);
  return geometry;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-observation-field']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true, contrast: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`observation field is readable and keyboard accessible ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  await openPanel(page);
  const before = await savedWork(page), readings = await content(page), closedGeometry = await readability(page, variant.available, !!variant.large);
  await expect(disclosure(page)).not.toHaveAttribute('open', '');
  await explanation(page).focus();
  const focus = await focusAppearance(explanation(page));
  await panel(page).screenshot({ path: `${out}/${variant.name}-closed-focus.png`, style: screenshotStyle });
  await page.keyboard.press('Tab'); await expect(review(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(explanation(page)).toBeFocused();
  await activate(page, explanation(page), variant.key);
  await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(explanation(page)).toBeFocused();
  await expect(disclosure(page)).toContainText('This simulation combines surface clarity, opening size, field stability, and lower handling risk.');
  await expect(disclosure(page)).toContainText('Clarity and opening size have the greatest influence.');
  await expect(disclosure(page)).toContainText('A recorded probe step adds a small bonus.');
  await expect(disclosure(page)).toContainText('Use the current protocol and protected landmarks to judge how far to open the field.');
  await expect(disclosure(page)).toContainText('Review pre-contact checks before acting on this reading.');
  const openGeometry = await readability(page, variant.available, !!variant.large);
  const meterAppearance = await panel(page).locator('.diss-observation-meter').evaluate(node => {
    const fill = node.querySelector('.diss-observation-meter__fill')!, surfaceStyle = getComputedStyle(node), fillStyle = getComputedStyle(fill);
    return { surface: surfaceStyle.backgroundColor, fill: fillStyle.backgroundColor, width: fill.getBoundingClientRect().width, height: fill.getBoundingClientRect().height, forcedColors: matchMedia('(forced-colors: active)').matches, highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast') };
  });
  expect(meterAppearance.width).toBeGreaterThan(0); expect(meterAppearance.height).toBeGreaterThan(0);
  expect(meterAppearance.fill).not.toBe(meterAppearance.surface); expect(meterAppearance.fill).not.toBe('rgba(0, 0, 0, 0)');
  expect(meterAppearance.forcedColors).toBe(!!variant.forced); expect(meterAppearance.highContrast).toBe(variant.contrast ? 'true' : 'false');
  const pixels = readPng(await panel(page).locator('.diss-observation-meter').screenshot({ style: screenshotStyle }));
  const y = Math.floor(pixels.height / 2), fillX = Math.max(2, Math.floor(pixels.width * readings.quality / 200));
  const emptyX = Math.min(pixels.width - 2, Math.floor(pixels.width * (1 + readings.quality / 100) / 2));
  const filled = pixels.at(fillX, y), empty = pixels.at(emptyX, y), paintedContrast = contrastRatio(filled, empty);
  expect(paintedContrast, 'The painted observation score must contrast with the remaining meter track').toBeGreaterThanOrEqual(3);
  await explanation(page).focus(); await focusAppearance(explanation(page));
  await panel(page).screenshot({ path: `${out}/${variant.name}-open-focus.png`, style: screenshotStyle });
  await audit(page, variant.name);
  expect(await savedWork(page)).toEqual(before);
  const monitor = page.locator('details.diss-field-monitor');
  if (await monitor.getAttribute('open') !== null) await activate(page, page.locator('#diss-field-monitor-summary'), variant.key);
  await expect(monitor).not.toHaveAttribute('open', '');
  await review(page).focus(); await focusAppearance(review(page));
  const originalReviewScroll = await page.locator('#diss-field-tissue').evaluate(node => ({
    margin: parseFloat(getComputedStyle(node).scrollMarginTop) || 0,
    inlineMargin: (node as HTMLElement).style.getPropertyValue('scroll-margin-top'),
    inlinePriority: (node as HTMLElement).style.getPropertyPriority('scroll-margin-top'),
  }));
  // No timer advance: activation must hand focus to the live field synchronously.
  await page.keyboard.press(variant.key);
  expect(await page.evaluate(() => ({ open: document.querySelector<HTMLDetailsElement>('details.diss-field-monitor')!.open, focus: document.activeElement?.id }))).toEqual({ open: true, focus: 'diss-field-tissue' });
  await expect(page.locator('#diss-field-tissue')).toBeVisible();
  const reviewPosition = await page.locator('#diss-field-tissue').evaluate(node => {
    const target = node.getBoundingClientRect(), heading = node.querySelector('.diss-stage__telemetry-head')!.getBoundingClientRect();
    const action = node.closest('[data-dissection-root]')!.querySelector('.diss-next-action');
    const actionStyle = action && getComputedStyle(action), actionBox = action && action.getBoundingClientRect();
    const sticky = actionStyle && actionBox && ['sticky', 'fixed'].includes(actionStyle.position) && actionBox.height > 0
      ? { position: actionStyle.position, top: actionBox.top, bottom: actionBox.bottom, height: actionBox.height, cssTop: parseFloat(actionStyle.top) || 0, visible: actionBox.bottom > 0 && actionBox.top < innerHeight && actionBox.right > target.left && actionBox.left < target.right }
      : null;
    return { top: target.top, headingTop: heading.top, headingBottom: heading.bottom, viewportHeight: innerHeight, sticky,
      margin: parseFloat(getComputedStyle(node).scrollMarginTop) || 0,
      inlineMargin: (node as HTMLElement).style.getPropertyValue('scroll-margin-top'),
      inlinePriority: (node as HTMLElement).style.getPropertyPriority('scroll-margin-top'),
    };
  });
  const visibleStickyBottom = reviewPosition.sticky?.visible ? Math.max(0, reviewPosition.sticky.bottom) : 0;
  const expectedScrollMargin = Math.max(originalReviewScroll.margin, reviewPosition.sticky ? reviewPosition.sticky.height + reviewPosition.sticky.cssTop + 12 : 0);
  expect(reviewPosition.top).toBeGreaterThanOrEqual(Math.max(0, visibleStickyBottom) - 1);
  expect(reviewPosition.top).toBeLessThanOrEqual(expectedScrollMargin + 2);
  expect(reviewPosition.headingTop).toBeGreaterThanOrEqual(visibleStickyBottom ? visibleStickyBottom + 12 : 0);
  expect(reviewPosition.headingBottom).toBeLessThanOrEqual(reviewPosition.viewportHeight);
  expect(reviewPosition.margin).toBe(originalReviewScroll.margin);
  expect(reviewPosition.inlineMargin).toBe(originalReviewScroll.inlineMargin);
  expect(reviewPosition.inlinePriority).toBe(originalReviewScroll.inlinePriority);
  const reviewFocus = await focusAppearance(page.locator('#diss-field-tissue'));
  await page.clock.runFor(160);
  await expect(disclosure(page)).toHaveAttribute('open', ''); expect(await savedWork(page)).toEqual(before);
  // A second use while the monitor is already open is equally non-mutating.
  await review(page).focus(); await page.keyboard.press(variant.key);
  await expect(page.locator('#diss-field-tissue')).toBeFocused(); expect(await savedWork(page)).toEqual(before);
  await activate(page, explanation(page), variant.key); await expect(disclosure(page)).not.toHaveAttribute('open', '');
  expect(await savedWork(page)).toEqual(before);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ variant, readings, closedGeometry, openGeometry, focus, reviewFocus, originalReviewScroll, reviewPosition, expectedScrollMargin, meterAppearance, pixels: { width: pixels.width, height: pixels.height, fillX, emptyX, y, filled, empty, contrast: paintedContrast }, before, after: await savedWork(page) }, null, 2));
});

test('observation score and all four contributors update at label and probe boundaries while help stays open', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page);
  await activate(page, explanation(page));
  const before = await savedWork(page), proofs = [];
  const cases = [
    { exposure: 47, clarity: 47, stability: 47, risk: 53, probed: false },
    { exposure: 48, clarity: 48, stability: 48, risk: 52, probed: false },
    { exposure: 64, clarity: 64, stability: 64, risk: 36, probed: false },
    { exposure: 65, clarity: 65, stability: 65, risk: 35, probed: false },
    { exposure: 79, clarity: 79, stability: 79, risk: 21, probed: false },
    { exposure: 80, clarity: 80, stability: 80, risk: 20, probed: false },
    { exposure: 8, clarity: 81, stability: 59, risk: 55, probed: false },
    { exposure: 8, clarity: 81, stability: 59, risk: 56, probed: true },
    { exposure: 100, clarity: 100, stability: 100, risk: 0, probed: true },
    { exposure: 0, clarity: 0, stability: 0, risk: 100, probed: false },
  ];
  for (const { probed, ...patch } of cases) {
    await page.evaluate(({ patch, probed }) => {
      const ctx = (window as any).__ctx, d = ctx.toolData.dissection, layer = d.activeLayer;
      ctx.updateMulti('dissection', { procedureByLayer: { ...d.procedureByLayer, [layer]: { ...d.procedureByLayer[layer], probed, tissueState: { ...d.procedureByLayer[layer].tissueState, ...patch } } } });
    }, { patch, probed });
    await page.clock.runFor(160);
    const readings = await content(page);
    await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(explanation(page)).toBeFocused();
    const expected = { ...before, procedures: { ...before.procedures, skin: { ...before.procedures.skin, probed, tissueState: { ...before.procedures.skin.tissueState, ...patch } } } };
    expect(await savedWork(page)).toEqual(expected);
    proofs.push({ patch, probed, readings });
  }
  await writeFile(`${out}/live-boundaries-proof.json`, JSON.stringify({ before, cases: proofs, after: await savedWork(page) }, null, 2));
});

test('observation explanation resets for a new layer or specimen and keeps its work unchanged', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page);
  const proofs = [];
  for (const patch of [{ activeLayer: 'muscle' }, { activeLayer: 'skin' }, { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', selectedOrgan: null }]) {
    await activate(page, explanation(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
    await page.evaluate(p => (window as any).__ctx.updateMulti('dissection', p), patch); await page.clock.runFor(160); await openPanel(page);
    await expect(disclosure(page)).not.toHaveAttribute('open', '');
    const afterChange = await savedWork(page), readings = await content(page);
    await activate(page, explanation(page), 'Space'); await expect(disclosure(page)).toHaveAttribute('open', '');
    expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, explanation(page), 'Space');
    proofs.push({ patch, readings, savedWork: afterChange });
  }
  await writeFile(`${out}/context-reset-proof.json`, JSON.stringify(proofs, null, 2));
});

test('observation guidance stays hidden in quiz and timed practical modes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, techniquePanelOpen: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true);
    const before = await savedWork(page);
    await expect(panel(page)).toBeHidden(); await expect(explanation(page)).toBeHidden(); await expect(review(page)).toBeHidden();
    expect(await savedWork(page)).toEqual(before);
    proofs.push({ mode, hidden: true }); await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});
