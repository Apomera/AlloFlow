import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_TECHNIQUE_ROADMAP_OUTPUT || 'reports/dissection-technique-roadmap-2026-10-06';
const baseline = process.env.DISSECTION_TECHNIQUE_ROADMAP_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'scalpel', lastUpdatedAt: 100, consequences: [] };
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, errors: 0, protocolDeviations: 0, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const partial = { ...complete, incisionExtended: false, retracted: false, pins: [], probed: false, history: order.slice(0, 2), actionLog: complete.actionLog.slice(0, 2), learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true, reflectionCorrect: true } } };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, procedureByLayer: { skin: partial, muscle: complete }, workspaceMode: 'essentials', techniquePanelOpen: false,
  toolbarViewOpen: false, toolbarStudyOpen: false, toolbarToolsOpen: false, procedureScenario: 'precision-access', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'worm|dorsal_vessel': true }, organNotes: { 'frog|nictitating': 'A transparent membrane protects the eye.', 'frog|heart': 'A muscular pump in the body cavity.', 'worm|dorsal_vessel': 'Other specimen work.' },
  organConfidence: { 'frog|nictitating': 3, 'frog|heart': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, quizSupportedCount: 0, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true, firstAttemptCorrect: true } },
  completedObjectives: { 'frog|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }], visualEvidence: [{ id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'ventral', techniqueScore: 84, opticalQuality: 91 }],
  referenceEvidenceId: 101, splitComparison: false, evidenceNotebookOpen: true, attemptArchive: { skin: [{ id: 55, label: 'Previous recorded attempt', procedure: complete }] },
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, labelMode: 'show', visualRealism: 'guided', specimenCondition: 'standard', inspectionLens: false, macroInset: false,
  reducedMotion: true, soundEnabled: false, sceneDetail: false, relationshipTraceIndex: 2, relationshipTraceCount: 3, compareTechniqueAttempts: true,
};
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page) || []).toEqual([]); });

const roadmap = (page: Page) => page.locator('#diss-technique-roadmap');
const checkpoint = (page: Page) => page.locator('#diss-learning-checkpoint');
const disclosure = (page: Page) => roadmap(page).locator('details');
const summary = (page: Page) => disclosure(page).locator('summary');
const rows = (page: Page) => roadmap(page).locator('ol > li[data-technique-action]');
async function nativeState(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
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
      routes: { guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending], quiz: [d.quizMode, d.quizIdx, d.quizComplete], study: [d.toolbarStudyOpen, d.flashcardMode, d.compareMode, d.practicalMode] },
      timers: { scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], practical: [d.practicalTimer, d.practicalEndsAt, d.practicalTargetIds] },
    };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function inventory(page: Page) {
  return rows(page).evaluateAll(nodes => nodes.map(node => ({ action: node.getAttribute('data-technique-action'), state: node.getAttribute('data-step-state'), current: node.getAttribute('aria-current'), text: node.textContent })));
}
async function assertRoadmap(page: Page, action: string, phase: string, verified: number) {
  await expect(roadmap(page)).toBeVisible();
  await expect(roadmap(page)).toContainText(`Technique ${order.indexOf(action) + 1} of ${order.length}`);
  await expect(roadmap(page)).toContainText(`${verified} of ${order.length} steps verified`);
  const progress = roadmap(page).locator('progress');
  await expect(progress).toHaveAccessibleName('Verified technique steps');
  await expect(progress).toHaveAttribute('value', String(verified)); await expect(progress).toHaveAttribute('max', String(order.length));
  await expect(summary(page)).toHaveText('View technique sequence'); await expect(rows(page)).toHaveCount(order.length);
  const items = await inventory(page); expect(items.map(item => item.action)).toEqual(order);
  expect(items.filter(item => item.state === 'verified')).toHaveLength(verified);
  expect(items.filter(item => item.current !== null)).toEqual([expect.objectContaining({ action, current: 'step', state: phase })]);
  await expect(rows(page).filter({ has: page.locator('button,a,input,select,textarea,[role="button"],[tabindex],[contenteditable="true"]') })).toHaveCount(0);
  await expect(rows(page).filter({ hasText: /^\s*$/ })).toHaveCount(0);
}
async function metrics(page: Page, scope = roadmap(page)) {
  return scope.evaluate(el => {
    const root = el.getBoundingClientRect();
    const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    return {
      width: root.width, client: el.clientWidth, scroll: el.scrollWidth,
      text: Array.from(el.querySelectorAll('h3,h4,h5,p,strong,span,summary,li')).filter(visible).map(node => {
        const box = node.getBoundingClientRect(), style = getComputedStyle(node);
        return { text: node.textContent, font: parseFloat(style.fontSize), clipped: node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1, textOverflow: style.textOverflow, left: box.left - root.left, right: box.right - root.left };
      }),
      summary: Array.from(el.querySelectorAll('summary')).filter(visible).map(node => { const box = node.getBoundingClientRect(); return { width: box.width, height: box.height, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 }; }),
    };
  });
}
async function readable(page: Page, available: number, large = false) {
  const m = await metrics(page); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const text of m.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(text.clipped, text.text || '').toBe(false); expect(text.textOverflow, text.text || '').not.toBe('ellipsis'); expect(text.left, text.text || '').toBeGreaterThanOrEqual(-1); expect(text.right, text.text || '').toBeLessThanOrEqual(m.width + 1); }
  for (const control of m.summary) { expect(control.height).toBeGreaterThanOrEqual(47.9); expect(control.width).toBeGreaterThanOrEqual(47.9); expect(control.font).toBeGreaterThanOrEqual(large ? 18 : 16); expect(control.clipped).toBe(false); }
  return m;
}
async function focused(control: Locator) {
  await expect(control).toBeFocused();
  const s = await control.evaluate(node => { const box = node.getBoundingClientRect(), style = getComputedStyle(node), width = parseFloat(style.outlineWidth), offset = parseFloat(style.outlineOffset); return { width, style: style.outlineStyle, offset, inset: width + offset <= 0 && box.width > 2 * Math.abs(width + offset) && box.height > 2 * Math.abs(width + offset) }; });
  expect(s.width).toBeGreaterThanOrEqual(3); expect(s.style).toBe('solid'); expect(s.offset).toBeLessThan(0); expect(s.inset).toBe(true);
}
async function audit(page: Page, name: string) {
  if (!await page.evaluate(() => !!(window as any).axe)) await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  // All axe rules run across the complete native checkpoint, including the roadmap.
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-learning-checkpoint']] }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}

const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`technique roadmap ${c.name} remains readable collapsed and expanded`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  if (baseline) {
    await expect(checkpoint(page)).toBeVisible(); await expect(checkpoint(page)).toHaveAttribute('data-phase', 'predict');
    const before = await metrics(page, checkpoint(page));
    await writeFile(`${out}/before-${c.name}-checkpoint-metrics.json`, JSON.stringify({ ...before, pageErrors: errors.get(page) || [] }, null, 2));
    await checkpoint(page).screenshot({ path: `${out}/before-${c.name}-checkpoint.png`, style: screenshotStyle }); return;
  }
  const before = await proof(page); await assertRoadmap(page, 'scissors', 'plan', 2); await expect(disclosure(page)).not.toHaveAttribute('open'); await expect(rows(page).first()).toBeHidden();
  const collapsed = await readable(page, c.available, !!c.large); await roadmap(page).screenshot({ path: `${out}/after-${c.name}-collapsed.png`, style: screenshotStyle });
  await checkpoint(page).screenshot({ path: `${out}/after-${c.name}-collapsed-checkpoint.png`, style: screenshotStyle }); await audit(page, `${c.name}-collapsed`);
  await summary(page).focus(); await focused(summary(page)); await page.keyboard.press('Enter'); await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(rows(page).first()).toBeVisible();
  const expanded = await readable(page, c.available, !!c.large); await focused(summary(page));
  await roadmap(page).screenshot({ path: `${out}/after-${c.name}-expanded.png`, style: screenshotStyle });
  await checkpoint(page).screenshot({ path: `${out}/after-${c.name}-expanded-checkpoint.png`, style: screenshotStyle }); await audit(page, `${c.name}-expanded`);
  await assertRoadmap(page, 'scissors', 'plan', 2); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Space'); await expect(disclosure(page)).not.toHaveAttribute('open'); await focused(summary(page)); expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/${c.name}-proof.json`, JSON.stringify({ collapsed, expanded, checkpoint: await metrics(page, checkpoint(page)), rows: await inventory(page), before, after: await proof(page) }, null, 2));
});

for (const c of [
  { name: 'plan', procedure: partial, action: 'scissors', phase: 'plan', verified: 2, checkpointPhase: 'predict' },
  { name: 'perform', procedure: { ...partial, learningChecks: { ...partial.learningChecks, scissors: { predictionCorrect: true } } }, action: 'scissors', phase: 'perform', verified: 2, checkpointPhase: 'perform' },
  { name: 'reflect', procedure: { ...partial, incisionExtended: true, history: order.slice(0, 3), actionLog: complete.actionLog.slice(0, 3), learningChecks: { ...partial.learningChecks, scissors: { predictionCorrect: true } } }, action: 'scissors', phase: 'reflect', verified: 2, checkpointPhase: 'reflect' },
  { name: 'verified', procedure: { ...partial, incisionExtended: true, history: order.slice(0, 3), actionLog: complete.actionLog.slice(0, 3), learningChecks: { ...partial.learningChecks, scissors: { predictionCorrect: true, reflectionCorrect: true } } }, action: 'forceps', phase: 'plan', verified: 3, checkpointPhase: 'predict' },
]) test(`roadmap ${c.name} uses native learning state and retains its ordered sequence`, async ({ page }) => {
  test.skip(baseline); await mount(page, { procedureByLayer: { skin: c.procedure, muscle: complete } }); const before = await proof(page);
  await expect(checkpoint(page)).toHaveAttribute('data-phase', c.checkpointPhase); await expect(checkpoint(page)).toHaveAttribute('data-learning-action', c.action); await assertRoadmap(page, c.action, c.phase, c.verified);
  await summary(page).click(); await assertRoadmap(page, c.action, c.phase, c.verified); expect(await proof(page)).toEqual(before);
  await roadmap(page).screenshot({ path: `${out}/state-${c.name}.png`, style: screenshotStyle }); await audit(page, `state-${c.name}`);
});

test('performed work without a confirmed plan and explanation is not counted as verified', async ({ page }) => {
  test.skip(baseline); await mount(page, { procedureByLayer: { skin: { ...partial, learningChecks: { inspect: { predictionCorrect: false, reflectionCorrect: false }, scalpel: { predictionCorrect: true, reflectionCorrect: true } } }, muscle: complete } });
  const before = await proof(page); await expect(checkpoint(page)).toHaveAttribute('data-learning-action', 'inspect'); await expect(checkpoint(page)).toHaveAttribute('data-phase', 'reflect'); await assertRoadmap(page, 'inspect', 'reflect', 1);
  await summary(page).focus(); await page.keyboard.press('Space'); await expect(rows(page).first()).toHaveAttribute('data-step-state', 'reflect'); expect(await proof(page)).toEqual(before);
  await roadmap(page).screenshot({ path: `${out}/pending-earlier-reflection.png`, style: screenshotStyle });
});

test('native plans actions and explanations advance verification; Undo restores the last required action', async ({ page }) => {
  test.skip(baseline);
  const fresh = { tissueState: { ...tissue, exposure: 8, clarity: 81, stability: 19, risk: 11, lastAction: 'inspect' }, learningChecks: {} };
  await mount(page, { procedureByLayer: { skin: fresh, muscle: complete }, selectedOrgan: null, completedObjectives: {}, organNotes: {}, organConfidence: {}, quizScore: 0, quizTotal: 0 }, 1180, 1180);
  const before = await proof(page), steps: any[] = [], plans = [0, 1, 2, 0, 1, 2], explanations = [1, 0, 0, 1, 2, 0];
  for (const [index, action] of order.entries()) {
    await expect(checkpoint(page)).toHaveAttribute('data-learning-action', action); await expect(checkpoint(page)).toHaveAttribute('data-phase', 'predict'); await assertRoadmap(page, action, 'plan', index);
    const prior = await nativeState(page); await checkpoint(page).locator('.diss-learning-check__option').nth(plans[index]).click(); await expect(checkpoint(page)).toHaveAttribute('data-phase', 'perform'); await assertRoadmap(page, action, 'perform', index);
    expect((await nativeState(page)).procedureByLayer.skin.actionLog || []).toEqual(prior.procedureByLayer.skin.actionLog || []);
    await checkpoint(page).getByRole('button', { name: /^Prepare / }).click(); await page.locator(`#diss-instrument-${action === 'inspect' ? 'probe' : action}`).click();
    const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next'); await equivalent.click();
    if (action === 'pin') { await expect(checkpoint(page)).toHaveAttribute('data-phase', 'perform'); await assertRoadmap(page, action, 'perform', index); await equivalent.click(); }
    await expect(checkpoint(page)).toHaveAttribute('data-phase', 'reflect'); await assertRoadmap(page, action, 'reflect', index);
    await summary(page).focus(); if (!await disclosure(page).evaluate(node => (node as HTMLDetailsElement).open)) await page.keyboard.press('Enter'); await expect(disclosure(page)).toHaveAttribute('open', '');
    const pending = await proof(page); await assertRoadmap(page, action, 'reflect', index); expect(await proof(page)).toEqual(pending);
    await roadmap(page).screenshot({ path: `${out}/native-${index + 1}-${action}-reflect.png`, style: screenshotStyle });
    steps.push({ action, phase: 'reflect', inventory: await inventory(page), procedure: (await nativeState(page)).procedureByLayer.skin });
    await checkpoint(page).locator('.diss-learning-check__option').nth(explanations[index]).click();
    const state = await nativeState(page); expect(state.procedureByLayer.skin.learningChecks[action]).toMatchObject({ predictionCorrect: true, reflectionCorrect: true });
    if (index < order.length - 1) await assertRoadmap(page, order[index + 1], 'plan', index + 1);
  }
  await expect(roadmap(page)).toHaveCount(0); await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  const completed = await proof(page); expect(completed.procedures.skin.actionLog).toHaveLength(7); expect(completed.procedures.muscle).toEqual(before.procedures.muscle);
  for (const key of ['notes', 'confidence', 'verified', 'attempts', 'annotations', 'frames', 'scores', 'firstAttempt', 'supported', 'assessment', 'routes'] as const) expect(completed[key], key).toEqual(before[key]);
  const probedOrganId = completed.procedures.skin.probedOrganId; expect(probedOrganId).toEqual(expect.any(String)); expect(probedOrganId).not.toBe('');
  const probedKey = `${before.specimen}|${probedOrganId}`; expect(before.explored[probedKey]).not.toBe(true);
  expect(completed.selected).toBe(probedOrganId); expect(completed.explored).toEqual({ ...before.explored, [probedKey]: true });
  await page.getByRole('button', { name: 'Undo the last technique action and visually restore the previous tissue state', exact: true }).click();
  await expect(checkpoint(page)).toHaveAttribute('data-learning-action', 'probe'); await expect(checkpoint(page)).toHaveAttribute('data-phase', 'perform'); await assertRoadmap(page, 'probe', 'perform', 5);
  const undone = await proof(page); expect(undone.procedures.skin.actionLog).toHaveLength(6); expect(undone.procedures.skin.probed).toBe(false); expect(undone.procedures.skin.learningChecks.probe.predictionCorrect).toBe(true); expect(undone.procedures.skin.learningChecks.probe.reflectionCorrect).toBe(false);
  expect(undone.explored).toEqual(completed.explored); expect(undone.selected).toBe(completed.selected);
  await summary(page).click(); await roadmap(page).screenshot({ path: `${out}/native-undo-probe.png`, style: screenshotStyle }); await audit(page, 'native-undo-probe');
  await writeFile(`${out}/native-sequence-proof.json`, JSON.stringify({ before, steps, completed, undone }, null, 2));
});

test('quiz and timed practical routes retain their native state with the procedure roadmap hidden', async ({ page }) => {
  test.skip(baseline);
  for (const practical of [false, true]) {
    await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: practical ? ['ventral_skin', 'tympanum'] : [] });
    const before = await proof(page); await expect(roadmap(page)).toHaveCount(0); expect(await proof(page)).toEqual(before); await harness.unmount(page);
  }
});
