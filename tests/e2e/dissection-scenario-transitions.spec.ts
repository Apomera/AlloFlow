import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_SCENARIO_TRANSITIONS_OUTPUT || 'test-results/dissection-scenario-transitions';
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
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const baseEffects = [
  { label: 'Current layer', detail: 'Restart resets the technique attempt for Skin.' },
  { label: 'This specimen', detail: 'Restart clears inspected-structure progress across the current Frog (Rana) specimen.' },
  { label: 'Saved work', detail: 'Notes, confidence ratings, captured frames, and archived attempts remain.' },
];
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
async function activate(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await page.keyboard.press(key); await page.clock.runFor(80);
}
async function mount(page: Page, seed: any = {}, width = 1440, available = 1180) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap{width:100%!important;max-width:${available}px;}` });
  const epoch = await page.evaluate(() => Date.now());
  await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
}
async function effects(page: Page, withPlayback: boolean) {
  const list = page.locator('dl#diss-scenario-restart-effects');
  await expect(list).toBeVisible();
  const expected = withPlayback ? [...baseEffects, { label: 'Playback', detail: 'Active playback also ends.' }] : baseEffects;
  const rows = list.locator(':scope > .diss-scenario-console__effect');
  await expect(rows).toHaveCount(expected.length);
  for (let index = 0; index < expected.length; index++) {
    await expect(rows.nth(index).locator('dt')).toHaveText(expected[index].label);
    await expect(rows.nth(index).locator('dd')).toHaveText(expected[index].detail);
  }
  await expect(page.locator('#diss-scenario-restart-review')).toHaveAttribute('aria-describedby', 'diss-scenario-restart-effects');
  await expect(page.locator('#diss-scenario-restart-confirm')).toHaveAttribute('aria-describedby', 'diss-scenario-restart-effects');
}
async function readability(page: Page, available: number, large: boolean) {
  const metrics = await page.locator('#diss-scenario-console').evaluate(panel => {
    const box = (node: Element) => {
      const r = node.getBoundingClientRect(), style = getComputedStyle(node);
      return { width: r.width, height: r.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(style.fontSize), overflow: style.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, panel: box(panel),
      text: Array.from(panel.querySelectorAll('#diss-scenario-time, .diss-scenario-console__effect dt, .diss-scenario-console__effect dd')).map(node => ({ text: node.textContent, ...box(node) })),
      rows: Array.from(panel.querySelectorAll('.diss-scenario-console__effect')).map(node => {
        const term = node.querySelector('dt')!.getBoundingClientRect(), definition = node.querySelector('dd')!.getBoundingClientRect();
        return { term: { top: term.top, left: term.left, right: term.right, bottom: term.bottom }, definition: { top: definition.top, left: definition.left }, ...box(node) };
      }),
      controls: Array.from(panel.querySelectorAll('button,select')).filter(node => node.getClientRects().length).map(node => ({ id: node.id, ...box(node) })),
    };
  });
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.panel.width).toBeLessThanOrEqual(available + 1);
  expect(metrics.panel.scroll).toBeLessThanOrEqual(metrics.panel.client + 1);
  for (const item of metrics.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    expect(item.scroll, item.text || '').toBeLessThanOrEqual(item.client + 1);
    expect(item.overflow).not.toBe('ellipsis');
  }
  for (const row of metrics.rows) {
    expect(row.scroll).toBeLessThanOrEqual(row.client + 1);
    if (available <= 640) {
      expect(row.definition.top).toBeGreaterThanOrEqual(row.term.bottom);
      expect(Math.abs(row.definition.left - row.term.left)).toBeLessThanOrEqual(1);
    } else expect(row.definition.left).toBeGreaterThanOrEqual(row.term.right);
  }
  for (const control of metrics.controls) {
    expect(control.height, control.id).toBeGreaterThanOrEqual(47.9);
    expect(control.font, control.id).toBeGreaterThanOrEqual(large ? 18 : 16);
    expect(control.scroll, control.id).toBeLessThanOrEqual(control.client + 1);
  }
  return metrics;
}
async function visibleTimerFocus(page: Page) {
  const timer = page.locator('#diss-scenario-time');
  await expect(timer).toBeFocused(); await expect(timer).toHaveAttribute('tabindex', '-1');
  await expect(timer).toHaveAttribute('role', 'timer'); await expect(timer).toHaveAttribute('aria-live', 'off');
  const appearance = await timer.evaluate(node => {
    const s = getComputedStyle(node);
    return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor };
  });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-scenario-console']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}

const variants = [
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'phone', width: 320, available: 320 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true },
];
for (const variant of variants) test(`scenario transition clarity ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  const panel = page.locator('#diss-scenario-console'), restart = page.locator('#diss-scenario-restart');
  const review = page.locator('#diss-scenario-restart-review'), keep = page.locator('#diss-scenario-restart-cancel');
  const initialWork = await savedWork(page);
  await activate(page, page.locator('#diss-scenario-start'));
  await expect(page.locator('#diss-scenario-start')).toHaveCount(0);
  const focusAppearance = await visibleTimerFocus(page); expect(await savedWork(page)).toEqual(initialWork);
  await panel.screenshot({ path: `${out}/${variant.name}-timer-focus.png`, style: screenshotStyle });
  await activate(page, restart); await expect(keep).toBeFocused(); await effects(page, false);
  const plainMetrics = await readability(page, variant.available, !!variant.large);
  await activate(page, keep); await expect(review).toHaveCount(0); await expect(restart).toBeFocused();
  expect(await savedWork(page)).toEqual(initialWork);

  await activate(page, page.getByRole('button', { name: 'Review actions', exact: true }));
  await page.locator('#diss-replay-action').selectOption('2'); await page.clock.runFor(80);
  await activate(page, page.locator('#diss-replay-response-summary'));
  const held = await state(page), before = await savedWork(page);
  expect(held._procedureReplay).toMatchObject({ paused: true });
  async function heldWorkPreserved() {
    const current = await state(page);
    expect(await savedWork(page)).toEqual(before); expect(current._procedureReplay).toEqual(held._procedureReplay);
    expect(current.procedureFeedback).toEqual(held.procedureFeedback); expect(current.scenarioStartedAt).toBe(held.scenarioStartedAt);
    await expect(page.locator('#diss-replay-action')).toHaveValue('2');
    await expect(page.locator('#diss-replay-response')).toHaveAttribute('open', '');
  }
  await activate(page, restart); await expect(keep).toBeFocused(); await effects(page, true); await heldWorkPreserved();
  await activate(page, keep); await expect(review).toHaveCount(0); await expect(restart).toBeFocused(); await heldWorkPreserved();
  await activate(page, restart); await expect(keep).toBeFocused(); await page.keyboard.press('Escape'); await page.clock.runFor(80);
  await expect(review).toHaveCount(0); await expect(restart).toBeFocused(); await heldWorkPreserved();
  await activate(page, restart); await expect(keep).toBeFocused(); await effects(page, true);
  const playbackMetrics = await readability(page, variant.available, !!variant.large);
  await panel.screenshot({ path: `${out}/${variant.name}-restart-review.png`, style: screenshotStyle });
  await audit(page, variant.name); await heldWorkPreserved();
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ focusAppearance, plainMetrics, playbackMetrics, preservedAfterCancelAndEscape: true, before, after: await savedWork(page) }, null, 2));
});

for (const key of ['Enter', 'Space']) test(`explicit timer start with ${key} retains focus through countdown and rejoins controls`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true });
  const before = await savedWork(page), at = await page.evaluate(() => Date.now());
  await activate(page, page.locator('#diss-scenario-start'), key);
  await expect(page.locator('#diss-scenario-start')).toHaveCount(0);
  await visibleTimerFocus(page); await expect(page.locator('#diss-scenario-state')).toHaveAttribute('data-state', 'active');
  const started = await state(page);
  expect(started.scenarioStartedAt).toBe(at); expect(started.scenarioTimeRemaining).toBe(240); expect(started.scenarioCompletedAt).toBe(0);
  expect(await savedWork(page)).toEqual(before);
  // Repeating activation on the focused output must not restart the deadline.
  await page.keyboard.press(key); await page.clock.runFor(3200);
  // The native canvas interval predates clock installation; wait for its state update.
  await expect.poll(async () => (await state(page)).scenarioTimeRemaining).toBeLessThan(240);
  await visibleTimerFocus(page);
  const running = await state(page);
  expect(running.scenarioStartedAt).toBe(at); expect(running.scenarioTimeRemaining).toBeLessThan(240); expect(running.scenarioTimeRemaining).toBeGreaterThan(234);
  await expect(page.locator('#diss-scenario-time')).toContainText(`3 minutes ${running.scenarioTimeRemaining - 180} seconds remaining`);
  expect(await savedWork(page)).toEqual(before);
  await page.keyboard.press('Tab'); await expect(page.locator('#diss-scenario-select')).toBeFocused();
  await page.clock.runFor(1100); await expect(page.locator('#diss-scenario-select')).toBeFocused();
  expect((await state(page)).scenarioStartedAt).toBe(at); expect(await savedWork(page)).toEqual(before);
  await writeFile(`${out}/keyboard-${key.toLowerCase()}-proof.json`, JSON.stringify({ key, startedAt: at, remainingSeconds: running.scenarioTimeRemaining, quietTimer: true, nextControl: 'diss-scenario-select', before, after: await savedWork(page) }, null, 2));
});

