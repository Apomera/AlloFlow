import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_SCENARIO_CLARITY_OUTPUT || 'reports/dissection-scenario-clarity-2026-10-06';
const baseline = process.env.DISSECTION_SCENARIO_CLARITY_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'scalpel', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, errors: 0, protocolDeviations: 0, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const partial = { ...complete, incisionExtended: false, retracted: false, pins: [], probed: false, errors: 1, protocolDeviations: 2, history: ['inspect', 'scalpel'], actionLog: complete.actionLog.slice(0, 2), learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true, reflectionCorrect: true } } };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, procedureByLayer: { skin: partial, muscle: complete }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: false, toolbarStudyOpen: false, toolbarToolsOpen: false,
  procedureScenario: 'timed-practical', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'worm|dorsal_vessel': true },
  organNotes: { 'frog|nictitating': 'A transparent membrane protects the eye.', 'frog|heart': 'A muscular pump in the body cavity.', 'worm|dorsal_vessel': 'Other specimen work.' },
  organConfidence: { 'frog|nictitating': 3, 'frog|heart': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, quizSupportedCount: 0, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true, firstAttemptCorrect: true } },
  completedObjectives: { 'frog|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  visualEvidence: [{ id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', techniqueScore: 84, opticalQuality: 91 }],
  referenceEvidenceId: 101, splitComparison: false, evidenceNotebookOpen: true, attemptArchive: { skin: [{ id: 55, label: 'Previous recorded attempt', procedure: complete }] },
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, labelMode: 'show', visualRealism: 'guided', specimenCondition: 'standard',
  inspectionLens: false, macroInset: false, reducedMotion: true, soundEnabled: false, sceneDetail: false,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, compareTechniqueAttempts: true,
};
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const choosing = 'Choosing this challenge starts a four-minute timer on the current attempt. Technique and inspected structures are kept. The deadline continues while you use other activities.';
test.describe.configure({ retries: 0, timeout: 240000 }); test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); }); test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page) || []).toEqual([]); });

// The class exists in the old console too, allowing baseline screenshots before
// the new IDs, controls and semantic descriptions are introduced.
const consolePanel = (page: Page) => page.locator('.diss-scenario-console');
const select = (page: Page) => page.locator('#diss-scenario-select');
const status = (page: Page) => page.locator('#diss-scenario-state');
const time = (page: Page) => page.locator('#diss-scenario-time');
const restart = (page: Page) => page.locator('#diss-scenario-restart');
const review = (page: Page) => page.locator('#diss-scenario-restart-review');
const keep = (page: Page) => page.locator('#diss-scenario-restart-cancel');
const confirm = (page: Page) => page.locator('#diss-scenario-restart-confirm');
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan, camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen, contents: d.evidenceCaptureContents,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], supported: d.quizSupportedCount, assessment: d.assessmentEvidence,
      recordedAssessment: [d.assessmentCompletedAt, d.assessmentRecordedScore, d.assessmentRecordedTotal],
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts,
    };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 }); await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function pauseClock(page: Page) { const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + 1000)); }
async function metrics(page: Page) {
  return consolePanel(page).evaluate(el => {
    const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; };
    return {
      ...box(el), client: el.clientWidth, scroll: el.scrollWidth, containerWidth: el.closest('[data-dissection-root]')!.getBoundingClientRect().width,
      text: Array.from(el.querySelectorAll('p,strong,output,h4,h5,label > span,.diss-scenario-console__state')).filter(visible).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1, textOverflow: getComputedStyle(node).textOverflow })),
      controls: Array.from(el.querySelectorAll('button,select')).filter(visible).map(node => { const style = getComputedStyle(node); return { name: node.getAttribute('aria-label') || node.textContent, ...box(node), font: parseFloat(style.fontSize), clipped: node.scrollWidth > node.clientWidth + 1, color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, backgroundPosition: style.backgroundPosition, backgroundSize: style.backgroundSize }; }),
    };
  });
}
async function readable(page: Page, available: number, large = false) {
  const m = await metrics(page); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const text of m.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(text.clipped, text.text || '').toBe(false); expect(text.textOverflow).not.toBe('ellipsis'); }
  for (const control of m.controls) { expect(control.font).toBeGreaterThanOrEqual(large ? 18 : 16); expect(control.height).toBeGreaterThanOrEqual(47.9); expect(control.width).toBeGreaterThanOrEqual(47.9); expect(control.clipped, control.name || '').toBe(false); }
  return m;
}
async function focused(control: Locator) {
  await expect(control).toBeFocused(); const s = await control.evaluate(node => { const style = getComputedStyle(node); return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, offset: parseFloat(style.outlineOffset) }; });
  expect(s.width).toBeGreaterThanOrEqual(3); expect(s.style).toBe('solid'); expect(s.offset).toBe(-5);
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const result = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-scenario-console']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}

const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`scenario clarity layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' }); await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  await consolePanel(page).scrollIntoViewIfNeeded(); const raw = await metrics(page); await writeFile(`${out}/${baseline ? 'before' : 'after'}-${c.name}-metrics.json`, JSON.stringify(raw, null, 2));
  await consolePanel(page).screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${c.name}-scenario.png`, style: screenshotStyle }); if (baseline) return;
  const before = await proof(page); await expect(consolePanel(page)).toHaveAttribute('id', 'diss-scenario-console'); await expect(consolePanel(page)).toHaveAccessibleName('Scenario lab · 4-minute technique challenge');
  await expect(select(page)).toHaveAccessibleName('Choose procedure scenario'); await expect(select(page).locator('option[value="timed-practical"]')).toHaveText('4-minute technique challenge · Challenge');
  await expect(page.locator('#diss-scenario-effects')).toHaveText(choosing); await expect(status(page)).toHaveAttribute('data-state', 'not-started'); await expect(time(page)).toHaveCount(0);
  await expect(page.locator('#diss-scenario-start')).toHaveText('Start timer on current attempt'); await expect(review(page)).toHaveCount(0); await readable(page, c.available, !!c.large);
  await page.keyboard.press('Tab'); await select(page).focus(); await focused(select(page)); await restart(page).focus(); await focused(restart(page));
  expect(await proof(page)).toEqual(before); await audit(page, c.name);
});

test('choosing the four-minute technique challenge starts its quiet native clock without clearing learner work', async ({ page }) => {
  test.skip(baseline); await mount(page, { procedureScenario: 'precision-access' }, 1440, 1180); await pauseClock(page); const before = await proof(page), at = await page.evaluate(() => Date.now());
  await select(page).selectOption('timed-practical'); const started = await state(page); expect(started.procedureScenario).toBe('timed-practical'); expect(started.scenarioStartedAt).toBe(at); expect(started.scenarioTimeRemaining).toBe(240); expect(started.scenarioCompletedAt).toBe(0);
  await expect(status(page)).toHaveAttribute('data-state', 'active'); await expect(time(page)).toHaveAttribute('role', 'timer'); await expect(time(page)).toHaveAttribute('aria-live', 'off'); await expect(time(page)).toContainText('4 minutes remaining'); expect(await proof(page)).toEqual(before);
  await page.clock.runFor(3200); await expect.poll(async () => (await state(page)).scenarioTimeRemaining).toBeLessThan(240); const running = await state(page); expect(running.scenarioTimeRemaining).toBeGreaterThan(234); expect(running.scenarioStartedAt).toBe(at);
  await expect(time(page)).toContainText(`3 minutes ${running.scenarioTimeRemaining - 180} seconds remaining`); await expect(time(page)).toHaveAttribute('aria-live', 'off'); expect(await proof(page)).toEqual(before);
  await consolePanel(page).screenshot({ path: `${out}/running-challenge-scenario.png`, style: screenshotStyle }); await writeFile(`${out}/selection-clock-proof.json`, JSON.stringify({ startedAt: at, runningSeconds: running.scenarioTimeRemaining, before, savedWork: await proof(page) }, null, 2));
});

test('restart review keeps records until confirmation and resets only its stated native boundaries', async ({ page }) => {
  test.skip(baseline); await mount(page, { scenarioStartedAt: Date.now(), scenarioTimeRemaining: 200 }, 390, 390); await pauseClock(page); const before = await proof(page), clockBefore = (await state(page)).scenarioStartedAt;
  await restart(page).focus(); await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused(); await expect(review(page)).toHaveAttribute('role', 'group'); await expect(review(page)).toHaveAttribute('aria-labelledby', 'diss-scenario-restart-title');
  await expect(page.locator('#diss-scenario-restart-effects')).toContainText('resets the technique attempt for Skin'); await expect(page.locator('#diss-scenario-restart-effects')).toContainText('clears inspected-structure progress across'); await expect(page.locator('#diss-scenario-restart-effects')).toContainText('Notes, confidence ratings, captured frames, and archived attempts remain.'); expect(await proof(page)).toEqual(before); expect((await state(page)).scenarioStartedAt).toBe(clockBefore);
  await page.keyboard.press('Escape'); await expect(review(page)).toHaveCount(0); await page.clock.runFor(1); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Space'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused(); await page.keyboard.press('Enter'); await expect(review(page)).toHaveCount(0); await page.clock.runFor(1); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused(); await confirm(page).focus(); await consolePanel(page).screenshot({ path: `${out}/restart-review-scenario.png`, style: screenshotStyle }); await page.clock.resume(); await audit(page, 'restart-review'); await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000)); await expect(confirm(page)).toBeFocused(); const restartedAt = await page.evaluate(() => Date.now()); await page.keyboard.press('Space');
  await expect(review(page)).toHaveCount(0); const after = await proof(page), native = await state(page); expect(native.scenarioStartedAt).toBe(restartedAt); expect(native.scenarioTimeRemaining).toBe(240); expect(native.scenarioCompletedAt).toBe(0); expect(after.selected).toBeNull();
  expect(after.explored).toEqual({ 'worm|dorsal_vessel': true }); expect(after.relationships).toEqual([0, 0]); expect(after.comparingAttempts).toBe(false); expect(after.procedures.muscle).toEqual(before.procedures.muscle);
  expect(after.procedures.skin).toMatchObject({ inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, pins: [], probed: false, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [], learningChecks: {} });
  expect({ ...after, selected: before.selected, explored: before.explored, procedures: before.procedures, relationships: before.relationships, comparingAttempts: before.comparingAttempts }).toEqual(before);
  await expect(status(page)).toHaveAttribute('data-state', 'active'); await writeFile(`${out}/restart-boundaries-proof.json`, JSON.stringify({ before, after, restartedAt, explicitResetScope: ['active-layer technique', 'selected specimen inspected-structure progress', 'selected structure', 'relationship traversal', 'attempt comparison display'] }, null, 2));
});

test('actual deadline expiry and stale positive countdowns expose recovery without resetting saved work', async ({ page }) => {
  test.skip(baseline); await mount(page, { procedureScenario: 'precision-access' }, 390, 390); await pauseClock(page); const before = await proof(page); await select(page).selectOption('timed-practical'); const started = await state(page);
  await page.clock.fastForward(238000); await page.clock.runFor(3200); await expect(status(page)).toHaveAttribute('data-state', 'expired'); await expect(time(page)).toContainText('0 seconds remaining'); expect((await state(page)).scenarioTimeRemaining).toBe(0); expect((await state(page)).scenarioStartedAt).toBe(started.scenarioStartedAt); expect(await proof(page)).toEqual(before);
  const next = page.locator('.diss-next-action'); await expect(next).toHaveAttribute('data-next-action', 'scenario-recovery'); await expect(page.locator('#diss-next-action-title')).toHaveText('The 4-minute technique challenge has expired');
  await expect(next.locator('.diss-next-action__body > p').first()).toHaveText('Technique actions are blocked. Review the challenge, then choose whether to restart or select another scenario. Your recorded work stays available.');
  await next.getByRole('button', { name: 'Review challenge recovery', exact: true }).click(); await expect(restart(page)).toBeFocused(); await expect(review(page)).toHaveCount(0); expect(await proof(page)).toEqual(before);
  await consolePanel(page).screenshot({ path: `${out}/expired-challenge-scenario.png`, style: screenshotStyle }); await harness.unmount(page);
  // A restored record can retain a positive display value after its deadline.
  // The new derived status must expose expiry before the next interval writes.
  await mount(page, { scenarioStartedAt: Date.now() - 300000, scenarioTimeRemaining: 240 }, 390, 390); const staleBefore = await proof(page); await expect(status(page)).toHaveAttribute('data-state', 'expired'); await expect(time(page)).toContainText('0 seconds remaining'); await expect(page.locator('.diss-next-action')).toHaveAttribute('data-next-action', 'scenario-recovery');
  await page.locator('.diss-next-action').getByRole('button', { name: 'Review challenge recovery', exact: true }).click(); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(staleBefore); await writeFile(`${out}/expiry-recovery-proof.json`, JSON.stringify({ deadline: started.scenarioStartedAt + 240000, actualExpiredWork: before, staleExpiredWork: staleBefore }, null, 2));
});

test('unstarted challenge uses Start without destructive reset and completed attempts retain their frozen timer', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 390, 390); await pauseClock(page); const before = await proof(page); await expect(status(page)).toHaveAttribute('data-state', 'not-started'); await expect(time(page)).toHaveCount(0);
  const start = page.locator('#diss-scenario-start'); await expect(start).toHaveText('Start timer on current attempt'); await start.focus(); const at = await page.evaluate(() => Date.now()); await page.keyboard.press('Enter');
  await expect(review(page)).toHaveCount(0); await expect(status(page)).toHaveAttribute('data-state', 'active'); expect((await state(page)).scenarioStartedAt).toBe(at); expect((await state(page)).scenarioTimeRemaining).toBe(240); expect(await proof(page)).toEqual(before); await harness.unmount(page);
  await mount(page, { procedureByLayer: { skin: complete, muscle: complete }, scenarioStartedAt: Date.now() - 300000, scenarioCompletedAt: Date.now() - 1000, scenarioTimeRemaining: 117 }, 390, 390); await pauseClock(page); const completed = await proof(page);
  await expect(status(page)).toHaveAttribute('data-state', 'complete'); await expect(time(page)).toContainText('1 minute 57 seconds remaining'); await expect(time(page)).toHaveAttribute('aria-live', 'off'); await page.clock.runFor(3200);
  expect((await state(page)).scenarioTimeRemaining).toBe(117); await expect(status(page)).toHaveAttribute('data-state', 'complete'); await expect(time(page)).toContainText('1 minute 57 seconds remaining'); expect(await proof(page)).toEqual(completed);
  await writeFile(`${out}/start-complete-proof.json`, JSON.stringify({ nonDestructiveStart: before, completedFrozenSeconds: 117, completedWork: completed }, null, 2));
});

test('Study identification timer remains separate and native assessment and Essentials gates hide the scenario console', async ({ page }) => {
  test.skip(baseline); await mount(page, { procedureScenario: 'precision-access' }, 1440, 1180); await pauseClock(page); await select(page).selectOption('timed-practical'); const before = await proof(page), challenge = await state(page);
  await page.locator('#diss-route-study').click(); const study = page.locator('#diss-study-tools'); await expect(study.getByRole('button', { name: 'Start 2-minute timed practical', exact: true })).toBeVisible(); await study.getByRole('button', { name: 'Start 2-minute timed practical', exact: true }).click();
  const active = await state(page); expect(active.practicalMode).toBe(true); expect(active.quizMode).toBe(true); expect(active.practicalTimer).toBe(120); expect(active.practicalEndsAt).toBeGreaterThan(challenge.scenarioStartedAt); expect(active.scenarioStartedAt).toBe(challenge.scenarioStartedAt); expect(active.scenarioTimeRemaining).toBe(240);
  await expect(consolePanel(page)).toBeHidden(); await expect(page.locator('#diss-practical-time-status')).toContainText('Timed practical: 2 minutes remaining'); await expect(page.locator('.diss-next-action')).toHaveAttribute('data-next-action', 'quiz');
  await page.clock.runFor(2200); const running = await state(page); expect(running.practicalTimer).toBeLessThan(120); expect(running.scenarioTimeRemaining).toBe(240); expect(running.practicalEndsAt).toBe(active.practicalEndsAt); expect(running.scenarioStartedAt).toBe(challenge.scenarioStartedAt);
  // The native challenge display field stays unchanged during this quiz activity.
  // Its four-minute absolute deadline continues independently of the two-minute identification clock.
  expect(await page.evaluate(() => Date.now())).toBeGreaterThan(challenge.scenarioStartedAt + 2000); expect(challenge.scenarioStartedAt + 240000).toBeGreaterThan(active.practicalEndsAt);
  // Starting identification natively resets its current scores and selection.
  // Neither timer changes the stored technique or observation records.
  expect(await proof(page)).toEqual({ ...before, selected: null, scores: [0, 0], comparingAttempts: false }); await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); expect((await state(page)).scenarioStartedAt).toBe(challenge.scenarioStartedAt);
  const technique = page.locator('#diss-procedure-panel'); if (!(await technique.evaluate(node => (node as HTMLDetailsElement).open))) await technique.locator(':scope > summary').click();
  await expect(consolePanel(page)).toBeVisible(); await page.clock.runFor(17);
  const nativeCanvas = page.locator('[data-diss-canvas]');
  const nativeReadiness = () => nativeCanvas.evaluate((canvas: any) => ({ connected: canvas.isConnected, documentHidden: document.hidden, quiz: !!canvas._drawD?.quizMode, practical: !!canvas._drawD?.practicalMode, workspace: canvas._drawD?.workspaceMode, scenario: canvas._drawD?.procedureScenario, startedAt: canvas._drawD?.scenarioStartedAt }));
  await expect.poll(nativeReadiness).toEqual({ connected: true, documentHidden: false, quiz: false, practical: false, workspace: 'advanced', scenario: 'timed-practical', startedAt: challenge.scenarioStartedAt });
  const renderReadiness = await nativeReadiness(); await page.clock.runFor(2200); const sampledAt = await page.evaluate(() => Date.now());
  const expectedRemaining = Math.max(0, 240 - Math.round((sampledAt - challenge.scenarioStartedAt) / 1000));
  // Poll pending React commits while browser time stays fixed; preserve the native one-second precision.
  await expect.poll(async () => Math.abs((await state(page)).scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);
  const resumed = await state(page); expect(resumed.scenarioStartedAt).toBe(challenge.scenarioStartedAt); expect(resumed.scenarioTimeRemaining).toBeLessThan(240); expect(Math.abs(resumed.scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);
  await expect(time(page)).toHaveAttribute('aria-live', 'off'); expect(await proof(page)).toEqual({ ...before, selected: null, scores: [0, 0], comparingAttempts: false });
  const afterTimed = await proof(page); await harness.unmount(page); await mount(page, { workspaceMode: 'essentials' }, 390, 390); await expect(consolePanel(page)).toBeHidden(); await harness.unmount(page); await mount(page, { quizMode: true, labelMode: 'hidden' }, 390, 390); await expect(consolePanel(page)).toBeHidden();
  await writeFile(`${out}/separate-timers-mode-proof.json`, JSON.stringify({ challengeStartedAt: challenge.scenarioStartedAt, identificationDeadline: active.practicalEndsAt, runningSeconds: { hiddenTechniqueDisplay: running.scenarioTimeRemaining, identification: running.practicalTimer, resumedTechniqueDisplay: resumed.scenarioTimeRemaining }, challengeDeadline: challenge.scenarioStartedAt + 240000, renderReadiness, sampledAt, expectedRemaining, before, afterTimed }, null, 2));
});
