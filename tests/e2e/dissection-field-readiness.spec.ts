import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_FIELD_READINESS_OUTPUT || 'test-results/dissection-field-readiness';
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
const checkIds = ['view', 'optics', 'tissue', 'tool'];
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();

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
    // Opening a review changes panel visibility, focus, and feedback only.
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, view: d.anatomicalView, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], optics: [d.inspectionLens, d.lensFocusDepth, d.lensMagnification, d.lightIntensity, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], playback: [d._procedureDemo, d._procedureReplay, d.compareReplayPlaying],
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
async function openReadiness(page: Page) {
  const monitor = page.locator('.diss-field-monitor');
  if (await monitor.getAttribute('open') === null) await activate(page, page.locator('#diss-field-monitor-summary'));
  await expect(monitor).toHaveAttribute('open', '');
  await expect(page.locator('#diss-field-readiness')).toBeVisible();
}
async function content(page: Page) {
  const panel = page.locator('#diss-field-readiness');
  await expect(panel).toHaveAccessibleName('Pre-contact field readiness');
  const list = panel.locator('ul.diss-field-readiness__checks');
  await expect(list).toHaveAttribute('role', 'list');
  const cards = list.locator(':scope > li');
  await expect(cards).toHaveCount(4);
  const result = [];
  for (let index = 0; index < checkIds.length; index++) {
    const id = checkIds[index], card = cards.nth(index), ready = await card.getAttribute('data-ready') === 'true';
    await expect(card).toHaveAttribute('data-check', id);
    await expect(card.locator('.diss-field-readiness__check-status')).toHaveText(ready ? 'Ready' : 'Needs attention');
    await expect(card.locator('.diss-field-readiness__check-detail')).toBeVisible();
    await expect(card.locator('.diss-field-readiness__check-detail')).not.toBeEmpty();
    await expect(card.locator(`#diss-field-review-${id}`)).toHaveAccessibleName(`Review ${id}`);
    await expect(card.locator(`#diss-field-review-${id}`)).toBeEnabled();
    result.push({ id, ready, detail: await card.locator('.diss-field-readiness__check-detail').textContent() });
  }
  await expect(panel.locator('.diss-field-readiness__score')).toHaveText(`${result.filter(check => check.ready).length} of 4 checks ready`);
  await expect(panel).toContainText('Settings change only when you adjust them.');
  await expect(panel.getByRole('button', { name: 'Run pre-contact field check' })).toBeEnabled();
  return result;
}
async function readability(page: Page, available: number, large: boolean) {
  const metrics = await page.locator('#diss-field-readiness').evaluate(panel => {
    const box = (node: Element) => {
      const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, panel: box(panel),
      text: Array.from(panel.querySelectorAll('strong, p, button, .diss-field-readiness__score, .diss-field-readiness__check-head span, .diss-field-readiness__check-status, .diss-field-readiness__check-detail')).map(node => ({ text: node.textContent, ...box(node) })),
      cards: Array.from(panel.querySelectorAll('li.diss-field-readiness__check')).map(box),
      buttons: Array.from(panel.querySelectorAll('button')).map(box),
    };
  });
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.panel.width).toBeLessThanOrEqual(available + 1);
  expect(metrics.panel.scroll).toBeLessThanOrEqual(metrics.panel.client + 1);
  for (const text of metrics.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    if (text.client) expect(text.scroll, text.text || '').toBeLessThanOrEqual(text.client + 1);
    expect(text.overflow).not.toBe('ellipsis');
  }
  for (const card of metrics.cards) expect(card.scroll).toBeLessThanOrEqual(card.client + 1);
  if (available <= 760) {
    for (let index = 1; index < metrics.cards.length; index++) {
      expect(metrics.cards[index].top).toBeGreaterThanOrEqual(metrics.cards[index - 1].bottom);
      expect(Math.abs(metrics.cards[index].left - metrics.cards[0].left)).toBeLessThanOrEqual(1);
    }
  } else {
    expect(Math.abs(metrics.cards[0].top - metrics.cards[1].top)).toBeLessThanOrEqual(1);
    expect(metrics.cards[1].left).toBeGreaterThanOrEqual(metrics.cards[0].right);
    expect(metrics.cards[2].top).toBeGreaterThanOrEqual(metrics.cards[0].bottom);
    expect(Math.abs(metrics.cards[2].top - metrics.cards[3].top)).toBeLessThanOrEqual(1);
  }
  for (const button of metrics.buttons) expect(button.height).toBeGreaterThanOrEqual(47.9);
  return metrics;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-field-readiness']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}

const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`field readiness clarity and review ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  await openReadiness(page);
  const before = await savedWork(page), checksBefore = await content(page), metrics = await readability(page, variant.available, !!variant.large);
  expect(checksBefore.some(check => check.ready)).toBe(true);
  expect(checksBefore.some(check => !check.ready)).toBe(true);
  await page.locator('#diss-field-review-view').focus();
  for (const id of checkIds.slice(1)) { await page.keyboard.press('Tab'); await expect(page.locator(`#diss-field-review-${id}`)).toBeFocused(); }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Run pre-contact field check' })).toBeFocused();
  await page.locator('#diss-field-review-view').focus();
  const appearance = await focusAppearance(page.locator('#diss-field-review-view'));
  await page.locator('#diss-field-readiness').screenshot({ path: `${out}/${variant.name}-readiness-focus.png`, style: screenshotStyle });
  await audit(page, variant.name);
  const destinations = [];
  for (const [id, target] of [['view', 'diss-view-cycle'], ['optics', 'diss-lens-focus-depth'], ['tissue', 'diss-field-tissue'], ['tool', 'diss-instrument-probe']]) {
    await activate(page, page.locator(`#diss-field-review-${id}`), variant.key);
    await expect(page.locator(`#${target}`)).toBeFocused();
    await expect(page.locator(`#${target}`)).toBeVisible();
    await expect(page.locator('#diss-canvas')).not.toBeFocused();
    expect(await savedWork(page)).toEqual(before);
    destinations.push({ check: id, focused: target });
  }
  await activate(page, page.getByRole('button', { name: 'Run pre-contact field check' }), variant.key);
  await expect(page.getByRole('button', { name: 'Run pre-contact field check' })).toBeFocused();
  expect((await state(page)).procedureFeedback.message).toMatch(/^Field check:/);
  expect(await content(page)).toEqual(checksBefore);
  expect(await savedWork(page)).toEqual(before);
  await page.locator('#diss-field-readiness').screenshot({ path: `${out}/${variant.name}-check-focus.png`, style: screenshotStyle });
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ key: variant.key, checksBefore, metrics, appearance, destinations, before, after: await savedWork(page), feedback: (await state(page)).procedureFeedback }, null, 2));
});

test('all four ready checks remain reviewable without changing preparation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: true, anatomicalView: 'ventral', selectedOrgan: null, lensFocusDepth: 'surface', lensMagnification: 2 });
  await openReadiness(page);
  const before = await savedWork(page), checks = await content(page);
  expect(checks.every(check => check.ready)).toBe(true);
  await expect(page.locator('#diss-field-readiness')).toHaveAttribute('data-tone', 'ready');
  await expect(page.locator('.diss-field-readiness__score')).toHaveText('4 of 4 checks ready');
  for (const [id, target] of [['view', 'diss-view-cycle'], ['optics', 'diss-lens-focus-depth'], ['tissue', 'diss-field-tissue'], ['tool', 'diss-instrument-probe']]) {
    await activate(page, page.locator(`#diss-field-review-${id}`), 'Space');
    await expect(page.locator(`#${target}`)).toBeFocused();
    expect(await savedWork(page)).toEqual(before);
  }
  await activate(page, page.getByRole('button', { name: 'Run pre-contact field check' }));
  expect((await state(page)).procedureFeedback.tone).toBe('success');
  expect(await savedWork(page)).toEqual(before);
  await page.locator('#diss-field-readiness').screenshot({ path: `${out}/all-ready.png`, style: screenshotStyle });
  await writeFile(`${out}/all-ready-proof.json`, JSON.stringify({ checks, before, after: await savedWork(page), feedback: (await state(page)).procedureFeedback }, null, 2));
});

test('glare review focuses illumination while preserving the learner settings', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: true, workspaceMode: 'essentials', lightIntensity: 100, procedureByLayer: { ...initial.procedureByLayer, skin: { ...procedure, tissueState: { ...tissue, moisture: 99 } } } });
  await openReadiness(page);
  const before = await savedWork(page);
  await expect(page.locator('[data-check="optics"] .diss-field-readiness__check-status')).toHaveText('Needs attention');
  await activate(page, page.locator('#diss-field-review-optics'));
  await expect(page.locator('#diss-light-intensity-range')).toBeFocused();
  await expect(page.locator('#diss-light-intensity-range')).toBeVisible();
  await expect(page.locator('#diss-light-intensity-range')).toHaveValue('100');
  expect(await savedWork(page)).toEqual(before);
  await writeFile(`${out}/glare-review-proof.json`, JSON.stringify({ before, after: await savedWork(page), focused: 'diss-light-intensity-range' }, null, 2));
});

test('readiness review controls stay hidden in quiz and timed practical modes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true);
    const before = await savedWork(page);
    await expect(page.locator('.diss-field-monitor')).toBeHidden();
    for (const id of checkIds) await expect(page.locator(`#diss-field-review-${id}`)).toBeHidden();
    expect(await savedWork(page)).toEqual(before);
    proofs.push({ mode, hidden: true });
    await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});
