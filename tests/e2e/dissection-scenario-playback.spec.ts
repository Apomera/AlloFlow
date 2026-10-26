import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_SCENARIO_PLAYBACK_OUTPUT || 'test-results/dissection-scenario-playback';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 3, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const records = Array.from({ length: 4 }, (_, index) => ({
  action: 'dropper', label: 'Hydrated', at: 100 + index, point: { x: 0.4 + index * 0.05, y: 0.4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 },
  outcome: 'Saved response ' + (index + 1), outcomeDetail: 'A controlled dose improved the recorded field clarity.',
  tissueBefore: { clarity: 25, exposure: 40, stability: 70, risk: 45 }, tissueAfter: { clarity: 65, exposure: 40, stability: 55, risk: 15 },
}));
const procedure = {
  tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1,
  history: records.map(entry => entry.action), cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true } },
  incisionPath: [{ x: 0.49, y: 0.29 }, { x: 0.51, y: 0.70 }], extensionPath: [], dropperPoint: { x: 0.55, y: 0.4 }, pins: [], actionLog: records,
};
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: 0.47, y: 0.29 }, { x: 0.50, y: 0.70 }], extensionPath: [], actionLog: records, history: procedure.history };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'forceps', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: { skin: true }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  procedureScenario: 'timed-practical', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  organNotes: { 'frog|nictitating': 'Preserved observation.', 'worm|dorsal_vessel': 'Other specimen work.' }, organConfidence: { 'frog|nictitating': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'worm|dorsal_vessel': true }, completedObjectives: { 'frog|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true } },
  soundEnabled: false, sceneDetail: false, _procedureDemo: null, _procedureReplay: null, selectedProcedureActionAt: 103,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 3 },
  procedureByLayer: { skin: procedure, muscle: { ...procedure, errors: 0 } }, attemptArchive: { skin: [savedAttempt] }, compareTechniqueAttempts: true, compareReplayPlaying: false, compareReplayProgress: .4,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
};
const noticeText = 'Choosing a scenario, starting its timer, or confirming restart ends active playback.';
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
    return {
      specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan, camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
    };
  });
}
async function playback(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    const canvas = document.querySelector('[data-diss-canvas]') as any;
    return { replay: d._procedureReplay, demo: d._procedureDemo, comparing: d.compareReplayPlaying, timers: Object.keys(canvas?._dissTimers || {}).filter(name => ['procedureReplay', 'procedureDemo', 'compareReplay'].includes(name)).sort() };
  });
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80); }
async function mount(page: Page, seed: any = {}, width = 1440, available = 1180) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap{width:100%!important;max-width:${available}px;}` });
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
}
async function noPlayback(page: Page) {
  expect(await playback(page)).toEqual({ replay: null, demo: null, comparing: false, timers: [] });
  await expect(page.locator('#diss-replay-review')).toHaveCount(0); await expect(page.locator('#diss-replay-specimen')).toHaveCount(0); await expect(page.locator('#diss-scenario-playback-note')).toHaveCount(0);
  await expect(page.locator('#diss-scenario-select')).not.toHaveAttribute('aria-describedby', /diss-scenario-playback-note/);
  await expect(page.locator('#diss-scenario-restart')).not.toHaveAttribute('aria-describedby', /diss-scenario-playback-note/);
}
async function noticeMetrics(page: Page) {
  return page.evaluate(() => {
    const note = document.querySelector('#diss-scenario-playback-note') as HTMLElement;
    const console = document.querySelector('#diss-scenario-console') as HTMLElement;
    const box = (node: HTMLElement) => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(getComputedStyle(node).fontSize) }; };
    return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, note: box(note), console: box(console), text: note.textContent, children: Array.from(note.children).map(child => box(child as HTMLElement)), controls: Array.from(console.querySelectorAll('button,select')).filter(node => node.getClientRects().length).map(node => ({ id: node.id, ...box(node as HTMLElement) })) };
  });
}
const variants = [
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'phone', width: 320, available: 320 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true },
];
for (const variant of variants) test(`scenario restart during paused review ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  const note = page.locator('#diss-scenario-playback-note'), console = page.locator('#diss-scenario-console'), restart = page.locator('#diss-scenario-restart');
  const review = page.locator('#diss-scenario-restart-review'), keep = page.locator('#diss-scenario-restart-cancel'), confirm = page.locator('#diss-scenario-restart-confirm');
  await expect(note).toHaveCount(0);
  await activate(page, page.getByRole('button', { name: 'Review actions', exact: true }));
  await page.locator('#diss-replay-action').selectOption('2'); await page.clock.runFor(80);
  await activate(page, page.locator('#diss-replay-response-summary'));
  const before = await savedWork(page), held = await playback(page), feedback = (await state(page)).procedureFeedback;
  expect(held.replay).toMatchObject({ paused: true }); expect(held.timers).toEqual([]);
  await expect(note).toContainText('Playback on the specimen'); await expect(note).toContainText(noticeText);
  for (const id of ['diss-scenario-select', 'diss-scenario-start', 'diss-scenario-restart']) await expect(page.locator('#' + id)).toHaveAttribute('aria-describedby', /diss-scenario-playback-note/);
  await note.scrollIntoViewIfNeeded(); await console.screenshot({ path: `${out}/${variant.name}-notice.png`, style: screenshotStyle });
  async function heldReviewPreserved() {
    expect(await savedWork(page)).toEqual(before); expect(await playback(page)).toEqual(held); expect((await state(page)).procedureFeedback).toEqual(feedback);
    await expect(page.locator('#diss-replay-action')).toHaveValue('2'); await expect(page.locator('#diss-replay-response')).toHaveAttribute('open', '');
  }
  await activate(page, restart); await expect(review).toBeVisible(); await expect(keep).toBeFocused(); await heldReviewPreserved();
  await expect(page.locator('#diss-scenario-restart-effects')).toContainText('Active playback also ends.');
  await activate(page, keep); await expect(review).toHaveCount(0); await expect(restart).toBeFocused(); await heldReviewPreserved();
  await activate(page, restart); await expect(keep).toBeFocused(); await page.keyboard.press('Escape'); await page.clock.runFor(80);
  await expect(review).toHaveCount(0); await expect(restart).toBeFocused(); await heldReviewPreserved();
  await activate(page, restart); await confirm.focus(); await console.screenshot({ path: `${out}/${variant.name}-restart-review.png`, style: screenshotStyle });
  const metrics = await noticeMetrics(page);
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1); expect(metrics.console.width).toBeLessThanOrEqual(variant.available + 1);
  for (const item of [metrics.note, ...metrics.children]) { expect(item.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(item.scroll).toBeLessThanOrEqual(item.client + 1); }
  for (const control of metrics.controls) { expect(control.height, control.id).toBeGreaterThanOrEqual(47.9); expect(control.font, control.id).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(control.scroll, control.id).toBeLessThanOrEqual(control.client + 1); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-scenario-console']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); await heldReviewPreserved();
  const at = await page.evaluate(() => Date.now()); await activate(page, confirm);
  await expect(review).toHaveCount(0); await expect(restart).toBeFocused(); await noPlayback(page);
  const after = await savedWork(page), restarted = await state(page);
  expect(restarted.scenarioStartedAt).toBe(at); expect(restarted.scenarioTimeRemaining).toBe(240); expect(restarted.scenarioCompletedAt).toBe(0);
  expect(after.selected).toBeNull(); expect(after.explored).toEqual({ 'worm|dorsal_vessel': true }); expect(after.relationships).toEqual([0, 0]); expect(after.comparingAttempts).toBe(false);
  expect(after.procedures.skin).toMatchObject({ inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, pins: [], probed: false, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [], learningChecks: {} });
  expect(after.procedures.muscle).toEqual(before.procedures.muscle);
  expect({ ...after, selected: before.selected, explored: before.explored, procedures: before.procedures, relationships: before.relationships, comparingAttempts: before.comparingAttempts }).toEqual(before);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ metrics, before, after, heldReplayPreservedUntilConfirmation: true, ownedPlaybackTimersCleared: true }, null, 2));
});

for (const mode of ['attempt', 'demonstration', 'comparison']) test(`scenario selection ends native ${mode} playback without stale callbacks`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { reducedMotion: false, procedureScenario: 'precision-access' });
  if (mode === 'attempt') await activate(page, page.locator('#diss-replay-attempt'));
  else if (mode === 'demonstration') await activate(page, page.getByRole('button', { name: /Show technique$/ }));
  else await activate(page, page.getByRole('button', { name: 'Play comparison replay', exact: true }));
  await page.clock.runFor(160);
  const running = await playback(page), timer = mode === 'attempt' ? 'procedureReplay' : mode === 'demonstration' ? 'procedureDemo' : 'compareReplay';
  expect(running.timers).toContain(timer);
  if (mode === 'attempt') expect(running.replay).toMatchObject({ paused: false });
  else if (mode === 'demonstration') expect(running.demo).toMatchObject({ layer: 'skin' });
  else expect(running.comparing).toBe(true);
  await expect(page.locator('#diss-scenario-playback-note')).toContainText(noticeText);
  const before = await savedWork(page), select = page.locator('#diss-scenario-select');
  await select.focus(); await select.selectOption('restricted-tray'); await page.clock.runFor(80);
  await noPlayback(page); await expect(select).toBeFocused(); expect(await savedWork(page)).toEqual(before);
  const selected = await state(page); expect(selected.procedureScenario).toBe('restricted-tray'); expect(selected.procedureFeedback.message).toContain('Scenario selected:');
  await page.clock.fastForward(7000); await page.clock.runFor(80);
  await noPlayback(page); await expect(select).toBeFocused(); expect(await savedWork(page)).toEqual(before); expect((await state(page)).procedureFeedback).toEqual(selected.procedureFeedback);
  await writeFile(`${out}/${mode}-selection-proof.json`, JSON.stringify({ running, savedWorkPreserved: true, noStaleFocusOrFeedback: true, after: await playback(page) }, null, 2));
});

test('starting the challenge timer ends paused review and keeps the current attempt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true });
  await activate(page, page.getByRole('button', { name: 'Review actions', exact: true }));
  const before = await savedWork(page), start = page.locator('#diss-scenario-start');
  await expect(start).toHaveAttribute('aria-describedby', /diss-scenario-playback-note/);
  const at = await page.evaluate(() => Date.now()); await activate(page, start);
  await noPlayback(page); await expect(start).toHaveCount(0); expect(await savedWork(page)).toEqual(before);
  const active = await state(page); expect(active.scenarioStartedAt).toBe(at); expect(active.scenarioTimeRemaining).toBe(240); await expect(page.locator('#diss-scenario-state')).toHaveAttribute('data-state', 'active');
  await writeFile(`${out}/start-timer-proof.json`, JSON.stringify({ currentAttemptPreserved: true, activeReplayCleared: true, startedAt: at }, null, 2));
});
