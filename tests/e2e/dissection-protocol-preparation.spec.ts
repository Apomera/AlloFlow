import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_PROTOCOL_PREPARATION_OUTPUT || 'test-results/dissection-protocol-preparation';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { tissueState: tissue, inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: {}, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'forceps', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: { skin: true }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  procedureScenario: 'precision-access', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  organNotes: { 'frog|nictitating': 'Preserved observation.', 'earthworm|dorsal_vessel': 'Other specimen work.' }, organConfidence: { 'frog|nictitating': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'earthworm|dorsal_vessel': true }, completedObjectives: { 'frog|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true } },
  soundEnabled: false, sceneDetail: false, _procedureDemo: null, _procedureReplay: null, selectedProcedureActionAt: 100,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 1 },
  procedureByLayer: { skin: procedure, muscle: { ...procedure, inspected: true, errors: 0 } }, attemptArchive: { skin: [savedAttempt] }, compareTechniqueAttempts: true, compareReplayPlaying: false, compareReplayProgress: .4,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
};
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
    // View, selected/hovered structure, playback, transition, and feedback are deliberate view-navigation effects.
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt],
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
async function protocolContent(page: Page, current: string, recommended: string, route: string, aligned: boolean) {
  const protocol = page.locator('dl#diss-protocol');
  await expect(protocol).toBeVisible();
  const cards = protocol.locator(':scope > div');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('dt')).toHaveText(['Orientation', 'Access route', 'Protected landmarks']);
  await expect(cards.nth(0)).toHaveAttribute('data-aligned', String(aligned));
  await expect(cards.nth(0).locator('dd')).toContainText('Current view');
  await expect(cards.nth(0).locator('dd')).toContainText('Recommended view');
  await expect(cards.nth(0).locator('dd')).toContainText(current);
  await expect(cards.nth(0).locator('dd')).toContainText(recommended);
  await expect(cards.nth(0).locator('.diss-protocol__views strong')).toHaveText([current, recommended]);
  await expect(cards.nth(1).locator('dd')).toHaveText(route);
  const landmarks = cards.nth(2).locator('dd > ul > li');
  await expect(cards.nth(2).locator('dd > ul')).toHaveCSS('list-style-type', 'disc');
  await expect(landmarks).toHaveCount(3);
  for (const item of await landmarks.all()) await expect(item).not.toBeEmpty();
  await expect(page.locator('#diss-protocol-view-state')).toHaveText(aligned ? 'View aligned to procedure recommendation' : 'Alignment needed');
  await expect(page.locator('#diss-protocol-view-state')).toBeVisible();
  await expect(page.locator('p#diss-protocol-view-help')).toHaveText('Aligning the view does not record the Inspect step.');
  const align = page.locator('button#diss-protocol-align');
  await expect(align).toHaveText(aligned ? 'View aligned' : `Align to ${recommended} view`);
  await expect(align).toHaveAttribute('aria-disabled', String(aligned));
  if (!aligned) await expect(align).toHaveAccessibleName(`Align specimen to recommended ${recommended} view`);
  return { landmarks: await landmarks.allTextContents(), route: await cards.nth(1).locator('dd').textContent() };
}
async function readability(page: Page, available: number, large: boolean) {
  const metrics = await page.locator('#diss-protocol').evaluate(panel => {
    const box = (node: Element) => {
      const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, panel: box(panel),
      text: Array.from(panel.querySelectorAll('dt, dd, p, li, button, dd > span')).map(node => ({ text: node.textContent, ...box(node) })),
      cards: Array.from(panel.querySelectorAll(':scope > div')).map(box),
      button: box(panel.querySelector('#diss-protocol-align')!),
      colors: ['#diss-protocol-view-state', '#diss-protocol-align'].map(selector => getComputedStyle(panel.querySelector(selector)!).color),
    };
  });
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.panel.width).toBeLessThanOrEqual(available + 1);
  expect(metrics.panel.scroll).toBeLessThanOrEqual(metrics.panel.client + 1);
  for (const text of metrics.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    // Inline spans have no client box; their enclosing definition is checked separately.
    if (text.client) expect(text.scroll, text.text || '').toBeLessThanOrEqual(text.client + 1);
    expect(text.overflow).not.toBe('ellipsis');
  }
  for (const card of metrics.cards) expect(card.scroll).toBeLessThanOrEqual(card.client + 1);
  for (let index = 1; index < metrics.cards.length; index++) {
    if (available <= 760) {
      expect(metrics.cards[index].top).toBeGreaterThanOrEqual(metrics.cards[index - 1].bottom);
      expect(Math.abs(metrics.cards[index].left - metrics.cards[0].left)).toBeLessThanOrEqual(1);
    } else {
      expect(metrics.cards[index].top).toBeGreaterThanOrEqual(metrics.cards[0].bottom);
      expect(Math.abs(metrics.cards[index].top - metrics.cards[1].top)).toBeLessThanOrEqual(1);
    }
  }
  if (available > 760) {
    expect(metrics.cards[2].left).toBeGreaterThanOrEqual(metrics.cards[1].right);
    expect(metrics.cards[0].width).toBeGreaterThan(metrics.cards[1].width);
  }
  expect(metrics.button.height).toBeGreaterThanOrEqual(47.9);
  return metrics;
}
async function focusAppearance(page: Page) {
  const button = page.locator('#diss-protocol-align');
  await expect(button).toBeFocused(); await expect(page.locator('#diss-canvas')).not.toBeFocused();
  const appearance = await button.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function repeatAlignedActivation(page: Page) {
  const before = await state(page), work = await savedWork(page);
  for (const key of ['Enter', 'Space']) {
    await page.keyboard.press(key); await page.clock.runFor(160);
    const after = await state(page);
    expect(await savedWork(page)).toEqual(work);
    expect(after.procedureFeedback).toEqual(before.procedureFeedback);
    expect(after._viewTransition).toEqual(before._viewTransition);
    expect(after.anatomicalView).toBe(before.anatomicalView);
    expect(after.procedureByLayer).toEqual(before.procedureByLayer);
    await expect(page.locator('#diss-protocol-align')).toBeFocused();
  }
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-protocol']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}

const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`procedure preparation clarity ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  const panel = page.locator('#diss-protocol'), align = page.locator('#diss-protocol-align');
  const before = await savedWork(page);
  const contentBefore = await protocolContent(page, 'dorsal', 'ventral', 'shallow ventral midline corridor', false);
  const metricsBefore = await readability(page, variant.available, !!variant.large);
  await panel.screenshot({ path: `${out}/${variant.name}-before-alignment.png`, style: screenshotStyle });
  await align.evaluate(node => { (window as any).__protocolAlignBefore = node; });
  await activate(page, align, variant.key);
  const contentAfter = await protocolContent(page, 'ventral', 'ventral', 'shallow ventral midline corridor', true);
  expect(contentAfter).toEqual(contentBefore);
  expect(await align.evaluate(node => node === (window as any).__protocolAlignBefore)).toBe(true);
  const appearance = await focusAppearance(page), metricsAfter = await readability(page, variant.available, !!variant.large);
  if (variant.contrast) {
    expect(metricsBefore.colors).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
    expect(metricsAfter.colors).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
  }
  expect(await savedWork(page)).toEqual(before);
  expect((await state(page)).procedureByLayer.skin.inspected).toBe(false);
  await repeatAlignedActivation(page);
  await panel.screenshot({ path: `${out}/${variant.name}-aligned-focus.png`, style: screenshotStyle });
  await page.keyboard.press('Tab');
  await expect(page.locator('.diss-instrument[aria-checked="true"]')).toBeFocused();
  await audit(page, variant.name);
  expect(await savedWork(page)).toEqual(before);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ key: variant.key, contentBefore, contentAfter, metricsBefore, metricsAfter, appearance, sameButtonRetained: true, inspectNotRecorded: true, repeatActivationUnchanged: true, before, after: await savedWork(page) }, null, 2));
});

test('orientation rescue keeps the fresh Inspect requirement after alignment', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: true, anatomicalView: 'ventral', procedureByLayer: { ...initial.procedureByLayer, skin: { ...procedure, inspected: true, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } } } } });
  await page.locator('#diss-scenario-select').selectOption('orientation-rescue'); await page.clock.runFor(160);
  const before = await savedWork(page), started = await state(page);
  expect(started.anatomicalView).toBe('dorsal');
  expect(started.procedureByLayer.skin.inspected).toBe(true);
  expect(started.procedureByLayer.skin.orientationRecheckRequired).toBe(true);
  expect(started.procedureByLayer.skin.learningChecks.inspect).toBeUndefined();
  await activate(page, page.locator('#diss-protocol-align'), 'Space');
  await protocolContent(page, 'ventral', 'ventral', 'shallow ventral midline corridor', true);
  await focusAppearance(page); await repeatAlignedActivation(page);
  expect(await savedWork(page)).toEqual(before);
  const aligned = await state(page);
  expect(aligned.procedureByLayer.skin.orientationRecheckRequired).toBe(true);
  expect(aligned.procedureByLayer.skin.learningChecks.inspect).toBeUndefined();
  expect(aligned.scenarioCompletedAt).toBe(0);
  await expect(page.getByRole('progressbar', { name: 'Orientation rescue progress' })).toHaveAttribute('aria-valuenow', '55');
  await expect(page.locator('.diss-scenario-console__detail')).toContainText('orientation not recorded');
  await expect(page.locator('.diss-scenario-console__detail')).toContainText('Record orientation with Inspect.');
  await writeFile(`${out}/orientation-rescue-proof.json`, JSON.stringify({ before, after: await savedWork(page), progress: 55, freshInspectionStillRequired: true }, null, 2));
});

test('earthworm and perch use their own recommended view and access route', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const proofs = [];
  for (const specimen of [
    { id: 'earthworm', from: 'ventral', to: 'dorsal', route: 'shallow dorsal longitudinal corridor', key: 'Enter' },
    { id: 'perch', from: 'dorsal', to: 'lateral', route: 'shallow lateral body-wall window posterior to the operculum', key: 'Space' },
  ]) {
    await mount(page, { reducedMotion: true, specimen: specimen.id, _dissLoadedSpec: specimen.id, anatomicalView: specimen.from, selectedOrgan: null });
    const before = await savedWork(page);
    const contentBefore = await protocolContent(page, specimen.from, specimen.to, specimen.route, false);
    await activate(page, page.locator('#diss-protocol-align'), specimen.key);
    const contentAfter = await protocolContent(page, specimen.to, specimen.to, specimen.route, true);
    expect(contentAfter).toEqual(contentBefore);
    await focusAppearance(page); await repeatAlignedActivation(page);
    expect(await savedWork(page)).toEqual(before);
    expect((await state(page)).procedureByLayer.skin.inspected).toBe(false);
    proofs.push({ specimen: specimen.id, ...contentAfter, before, after: await savedWork(page), inspectNotRecorded: true });
    await harness.unmount(page);
  }
  await writeFile(`${out}/comparative-specimens-proof.json`, JSON.stringify(proofs, null, 2));
});
