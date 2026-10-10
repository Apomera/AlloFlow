import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_STUDY_CHOOSER_OUTPUT || 'reports/dissection-study-chooser-2026-10-05';
const baseline = process.env.DISSECTION_STUDY_CHOOSER_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const frames = [
  { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'preserved', selectedOrganName: 'Nictitating Membrane', techniqueScore: 84, opticalQuality: 91, capturedAt: '2026-10-04T14:30:00.000Z' },
  { id: 102, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'lateral', condition: 'dehydrated', selectedOrganName: 'Tympanic Membrane', techniqueScore: 0, opticalQuality: 0, capturedAt: '2026-10-05T14:30:00.000Z' },
  { id: 'legacy/frame 103', image, specimen: 'frog', layer: 'unmapped', techniqueScore: null, opticalQuality: null },
];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: { skin: true }, procedureByLayer: { skin: complete }, workspaceMode: 'advanced', toolbarStudyOpen: true, toolbarViewOpen: false, toolbarToolsOpen: false,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane supports this identification.' }, organConfidence: { 'frog|nictitating': 3 },
  verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, quizSupportedCount: 0,
  assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true, firstAttemptCorrect: true } }, completedObjectives: { 'frog|skin': true },
  visualEvidence: frames, referenceEvidenceId: 102, splitComparison: false, evidenceNotebookOpen: true, annotations: [{ x: .5, y: .38, type: 'dot' }],
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, labelMode: 'show', visualRealism: 'accessible', specimenCondition: 'standard',
  inspectionLens: false, macroInset: false, reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page) || []).toEqual([]);
});

const chooser = (page: Page) => page.locator('#diss-study-tools');
const group = (page: Page, name: string) => chooser(page).locator(`[data-study-tools-group="${name}"]`);
const flashcard = (page: Page) => chooser(page).getByRole('button', { name: 'Flashcard', exact: true });
const compare = (page: Page) => chooser(page).getByRole('button', { name: 'Compare', exact: true });
const practical = (page: Page) => group(page, 'practical').getByRole('button');
const readiness = (page: Page) => page.locator('#diss-practical-readiness');
const source = (page: Page) => page.locator('[data-diss-canvas]');
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }

// Activity handlers intentionally change selection and presentation. This proof
// covers saved learner work and scores; the practical case alone allows its two
// native score resets when it starts a new timed attempt.
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen, contents: d.evidenceCaptureContents,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], supported: d.quizSupportedCount,
      assessment: d.assessmentEvidence, reviewQueue: d.quizReviewQueue, recordedAssessment: [d.assessmentCompletedAt, d.assessmentRecordedScore, d.assessmentRecordedTotal],
    };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function visibleIds(page: Page) {
  const current = await state(page), selected = current.selectedOrgan;
  // The native directory is mounted only while no structure is selected. Open
  // it through its real return control, then restore an already observed record.
  if (selected) {
    expect(!!current.exploredOrgans?.[`${current.specimen}|${selected}`]).toBe(true);
    await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click();
  }
  await expect(page.locator('#diss-directory-results')).toBeVisible();
  const ids = await page.locator('#diss-directory-results button[id^="diss-organ-"][data-exposure-state="visible"]').evaluateAll(nodes => nodes.map(node => node.id.replace(/^diss-organ-/, '')));
  if (selected) {
    await page.locator(`#diss-organ-${selected}`).click();
    await expect(page.locator('#diss-selection-title')).toBeFocused();
    expect((await state(page)).selectedOrgan).toBe(selected);
  }
  return ids;
}
async function metrics(panel: Locator) {
  return panel.evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, left: r.left, width: r.width, height: r.height }; };
    const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const columns = (node: Element) => getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length;
    return {
      ...box(el), client: el.clientWidth, scroll: el.scrollWidth, columns: columns(el), containerWidth: el.closest('[data-dissection-root]')!.getBoundingClientRect().width,
      groups: Array.from(el.querySelectorAll('[data-study-tools-group]')).filter(visible).map(node => ({ name: node.getAttribute('data-study-tools-group'), ...box(node), span: getComputedStyle(node).gridColumnStart })),
      activityColumns: columns(el.querySelector('.diss-study-activity-grid')!),
      activities: Array.from(el.querySelectorAll('[data-study-activity]')).filter(visible).map(node => ({ name: node.getAttribute('data-study-activity'), ...box(node) })),
      text: Array.from(el.querySelectorAll('h4,p,output')).filter(visible).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1, textOverflow: getComputedStyle(node).textOverflow })),
      buttons: Array.from(el.querySelectorAll('button')).filter(visible).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, ...box(node), font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })),
    };
  });
}
async function readable(page: Page, available: number, large = false) {
  const m = await metrics(chooser(page));
  expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const text of m.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 14); expect(text.clipped, text.text || '').toBe(false); expect(text.textOverflow).not.toBe('ellipsis'); }
  for (const button of m.buttons) { expect(button.height, button.name || '').toBeGreaterThanOrEqual(47.9); expect(button.width, button.name || '').toBeGreaterThanOrEqual(47.9); expect(button.font, button.name || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(button.clipped, button.name || '').toBe(false); }
  return m;
}
async function focused(control: Locator) {
  await expect(control).toBeFocused();
  const result = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, offset: parseFloat(s.outlineOffset) }; });
  expect(result.width).toBeGreaterThanOrEqual(3); expect(result.style).toBe('solid'); expect(result.offset).toBe(-5);
}
async function pressed(control: Locator) {
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  const result = await control.evaluate(node => { const s = getComputedStyle(node); return { border: parseFloat(s.borderTopWidth), decoration: s.textDecorationLine }; });
  expect(result.border).toBeGreaterThanOrEqual(3); expect(result.decoration).toContain('underline');
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-study-tools']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2));
  // Save the full result, including incomplete checks for manual inspection.
  // An incomplete check is not counted as a confirmed pass.
  expect(result.violations).toEqual([]);
}

const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`study chooser layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available);
  await chooser(page).scrollIntoViewIfNeeded();
  await chooser(page).screenshot({ path: `${out}/${baseline ? 'before' : 'after'}-${c.name}-study.png`, style: screenshotStyle });
  if (baseline) return;
  const before = await proof(page);
  await expect(chooser(page)).toHaveAccessibleName('Study tools'); await expect(chooser(page).locator('[data-study-tools-group]')).toHaveCount(2);
  for (const [key, name, headingId] of [['practice', 'Review and compare', 'diss-study-practice-heading'], ['practical', 'Timed identification', 'diss-study-practical-heading']]) {
    await expect(group(page, key)).toHaveAttribute('role', 'group'); await expect(group(page, key)).toHaveAttribute('aria-labelledby', headingId); await expect(group(page, key)).toHaveAccessibleName(name); await expect(page.locator(`#${headingId}`)).toHaveText(name);
  }
  expect(await chooser(page).getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || node.textContent))).toEqual(['Flashcard', 'Compare', 'Start 2-minute timed practical']);
  await expect(flashcard(page)).toHaveAttribute('aria-describedby', 'diss-study-flashcard-help'); await expect(flashcard(page)).toHaveAccessibleDescription('Recall functions, reveal the reference answer, and mark cards to review.');
  await expect(compare(page)).toHaveAttribute('aria-describedby', 'diss-study-compare-help'); await expect(compare(page)).toHaveAccessibleDescription('No cross-specimen comparison is mapped for Nictitating Membrane. Select another structure to compare.');
  await expect(practical(page)).toHaveAccessibleName('Start 2-minute timed practical'); await expect(practical(page)).toHaveText('Start 2-minute timed practical'); await expect(practical(page)).toHaveAttribute('aria-describedby', 'diss-practical-study-help diss-practical-readiness');
  await expect(page.locator('#diss-practical-study-help')).toHaveText('Two-minute identification check with structure labels hidden.');
  await expect(readiness(page)).toHaveAttribute('role', 'status'); await expect(readiness(page)).toHaveAttribute('aria-live', 'polite'); await expect(readiness(page)).toHaveAttribute('data-practical-ready', 'true');
  const ids = await visibleIds(page); expect(ids.length).toBeGreaterThanOrEqual(2); await expect(readiness(page)).toHaveText(`${ids.length} visible structures available. Starts a new timed identification attempt.`);
  const m = await readable(page, c.available, !!c.large); const columns = m.containerWidth <= 520 ? 1 : m.containerWidth <= 980 ? 2 : 3;
  expect(m.columns).toBe(columns); expect(m.activityColumns).toBe(m.containerWidth <= 520 ? 1 : 2);
  const [practice, timed] = m.groups;
  if (columns === 3) { expect(practice.span).toBe('span 2'); expect(Math.abs(practice.top - timed.top)).toBeLessThan(1); expect(practice.width).toBeGreaterThan(timed.width * 1.8); }
  if (columns === 2) { expect(practice.span).toBe('auto'); expect(Math.abs(practice.top - timed.top)).toBeLessThan(1); expect(Math.abs(practice.width - timed.width)).toBeLessThan(1); }
  if (columns === 1) { expect(practice.span).toBe('auto'); expect(timed.top).toBeGreaterThan(practice.top); }
  // Directory lookup used pointer clicks; establish keyboard input before checking :focus-visible.
  await page.keyboard.press('Tab');
  await flashcard(page).focus(); await focused(flashcard(page)); await page.keyboard.press('Tab'); await focused(compare(page)); await page.keyboard.press('Tab'); await focused(practical(page));
  expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/${c.name}-metrics.json`, JSON.stringify(m, null, 2)); await audit(page, c.name);
});

test('keyboard Flashcard focuses recall prompt and Compare preserves both drafts and saved learner work', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180);
  const noteDraft = 'A thin membrane beside the eye.\n<observed feature> & location';
  await page.locator('#diss-note-nictitating').fill(noteDraft); const before = await proof(page);
  await flashcard(page).focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-flashcard-prompt')).toBeFocused(); await pressed(flashcard(page));
  expect((await state(page)).selectedOrgan).toBeNull(); expect(await proof(page)).toEqual(before);
  const recallDraft = 'My recall draft: protect the eye surface.'; await page.locator('#diss-flashcard-draft').fill(recallDraft);
  const nativePractice = (await state(page))._flashcardPractice; expect(Object.values(nativePractice.drafts)).toContain(recallDraft);
  await flashcard(page).focus(); await focused(flashcard(page)); await page.keyboard.press('Tab'); await focused(compare(page)); await page.keyboard.press('Space');
  await pressed(compare(page)); await focused(compare(page)); await expect(flashcard(page)).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('#diss-flashcard-panel')).toHaveCount(0);
  expect((await state(page))._flashcardPractice).toEqual(nativePractice); expect(await proof(page)).toEqual(before); expect((await state(page)).organNotes['frog|nictitating']).toBe(noteDraft);
  await chooser(page).screenshot({ path: `${out}/keyboard-compare-selected.png`, style: screenshotStyle }); await audit(page, 'keyboard-compare');
});

test('Compare explains missing selection and opens existing references without adding observations', async ({ page }) => {
  test.skip(baseline); await mount(page, { selectedOrgan: null }, 390, 390); const before = await proof(page);
  const emptyDescription = 'Choose a structure to see whether reference comparisons are available.';
  await expect(compare(page)).toHaveAccessibleDescription(emptyDescription); await compare(page).focus(); await page.keyboard.press('Enter'); await pressed(compare(page)); await focused(compare(page));
  await expect(page.locator('#diss-comparison-panel')).toHaveCount(0); expect((await state(page)).selectedOrgan).toBeNull(); expect(await proof(page)).toEqual(before);
  await page.keyboard.press('Enter'); await expect(compare(page)).toHaveAttribute('aria-pressed', 'false');
  // Review the already observed structure through its real directory handler.
  await page.locator('#diss-organ-nictitating').click(); expect((await state(page)).selectedOrgan).toBe('nictitating'); expect(await proof(page)).toEqual(before);
  await expect(compare(page)).toHaveAccessibleDescription('No cross-specimen comparison is mapped for Nictitating Membrane. Select another structure to compare.'); await compare(page).focus(); await page.keyboard.press('Space');
  await expect(page.locator('#diss-comparison-panel')).toBeVisible(); await pressed(compare(page)); await focused(compare(page)); expect(await proof(page)).toEqual(before);
  await expect(page.locator('#diss-comparison-panel')).toHaveAttribute('data-comparison-group', 'unmapped'); await expect(page.locator('#diss-comparison-cards').locator('article')).toHaveCount(0);
  await page.locator('#diss-comparison-panel').getByRole('button', { name: 'Write comparison in my evidence note', exact: true }).click(); await expect(page.locator('#diss-note-nictitating')).toBeFocused();
  await expect(page.locator('#diss-note-nictitating')).toHaveValue(initial.organNotes['frog|nictitating']); expect(await proof(page)).toEqual(before);
  const unmappedProof = await proof(page); await harness.unmount(page);
  await mount(page, { activeLayer: 'organs', selectedOrgan: 'heart', revealedLayers: { skin: true, muscle: true }, procedureByLayer: { skin: complete, muscle: complete, organs: complete },
    exploredOrgans: { 'frog|heart': true }, organNotes: { 'frog|heart': 'A muscular pump in the anterior body cavity.' }, organConfidence: { 'frog|heart': 3 } }, 390, 390);
  const mappedBefore = await proof(page); await expect(compare(page)).toHaveAccessibleDescription('Compare Heart (3-chamber) across reference specimens.'); await compare(page).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-comparison-panel')).toHaveAttribute('data-comparison-group', 'pumps'); expect(await page.locator('#diss-comparison-cards').locator('article').count()).toBeGreaterThan(1); await pressed(compare(page)); await focused(compare(page)); expect(await proof(page)).toEqual(mappedBefore);
  await writeFile(`${out}/comparison-proof.json`, JSON.stringify({ noSelectionDescription: emptyDescription, unmapped: unmappedProof, mapped: await proof(page) }, null, 2));
});

test('practical readiness exposes native insufficient-field and active-transition guards', async ({ page }) => {
  test.skip(baseline);
  const covered = { tissueState: { ...tissue, exposure: 0, clarity: 0, stability: 0 }, inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, pins: [], probed: false, history: [], actionLog: [], learningChecks: {} };
  await mount(page, { activeLayer: 'organs', selectedOrgan: null, revealedLayers: { skin: true, muscle: true }, procedureByLayer: { skin: complete, muscle: complete, organs: covered } }, 390, 390);
  const coveredBefore = await proof(page); expect((await visibleIds(page)).length).toBeLessThan(2);
  await expect(readiness(page)).toHaveAttribute('data-practical-ready', 'false'); await expect(readiness(page)).toHaveText('Needs at least two visible structures. Improve the field or change view.');
  await expect(practical(page)).toBeEnabled(); expect(await readiness(page).evaluate(node => getComputedStyle(node).borderTopStyle)).toBe('dashed');
  await practical(page).focus(); await page.keyboard.press('Enter'); await focused(practical(page));
  await expect(page.locator('[data-diss-tool-status]')).toHaveAttribute('data-tone', 'caution'); await expect(page.locator('[data-diss-tool-status]')).toContainText('Timed practical unavailable: at least two structures must be visible.');
  expect((await state(page)).practicalMode).not.toBe(true); expect(await proof(page)).toEqual(coveredBefore);
  await chooser(page).screenshot({ path: `${out}/unavailable-field-study.png`, style: screenshotStyle });
  await harness.unmount(page);
  // Pause time after mount, then seed the native transition state so the keyboard guard is deterministic.
  await mount(page, { selectedOrgan: null }, 390, 390);
  const transitionEpoch = new Date('2026-10-05T15:00:00.000Z'); await page.clock.install({ time: transitionEpoch }); await page.clock.pauseAt(new Date(transitionEpoch.getTime() + 1000));
  await page.evaluate(() => (window as any).__ctx.update('dissection', '_incisionAnim', { active: true, startTick: Date.now(), layerName: 'skin' }));
  const transitionBefore = await proof(page);
  expect((await visibleIds(page)).length).toBeGreaterThanOrEqual(2); await expect(readiness(page)).toHaveAttribute('data-practical-ready', 'false'); await expect(readiness(page)).toHaveText('Finish the current layer transition before starting.');
  await expect(practical(page)).toBeEnabled(); await practical(page).focus(); await page.keyboard.press('Space');
  await expect(page.locator('[data-diss-tool-status]')).toHaveAttribute('data-tone', 'caution'); await expect(page.locator('[data-diss-tool-status]')).toHaveText('Finish the current layer transition before starting the timed practical.');
  expect((await state(page)).practicalMode).not.toBe(true); expect(await proof(page)).toEqual(transitionBefore); await focused(practical(page));
  await writeFile(`${out}/readiness-guards-proof.json`, JSON.stringify({ unavailable: coveredBefore, transition: transitionBefore, nativeCaution: (await state(page)).procedureFeedback }, null, 2));
});

test('native timed start freezes its deadline and targets while visible timer updates, and End restores labels and stops clocks', async ({ page }) => {
  test.skip(baseline); await mount(page, { labelMode: 'show' }, 1440, 1180); await chooser(page).scrollIntoViewIfNeeded();
  const before = await proof(page), ids = await visibleIds(page); expect(ids.length).toBeGreaterThanOrEqual(2);
  const epoch = new Date('2026-10-05T16:00:00.000Z'); await page.clock.install({ time: epoch }); await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
  const startedAt = await page.evaluate(() => Date.now()); await practical(page).focus(); await page.keyboard.press('Enter');
  await expect(practical(page)).toHaveAccessibleName('End timed practical'); await expect(practical(page)).toHaveText('End timed practical'); await pressed(practical(page)); await focused(practical(page));
  const started = await state(page); expect(started.practicalMode).toBe(true); expect(started.quizMode).toBe(true); expect(started.practicalTimer).toBe(120); expect(started.practicalEndsAt).toBe(startedAt + 120000); expect(started.practicalTargetIds).toEqual(ids);
  expect(started._prePracticalLabelMode).toBe('show'); expect(started.labelMode).toBe('hidden'); expect(started.selectedOrgan).toBeNull(); expect(started.flashcardMode).toBe(false); expect(started.compareMode).toBe(false);
  expect(await proof(page)).toEqual({ ...before, scores: [0, 0] });
  const timer = page.locator('#diss-practical-time-status'); await expect(timer).toBeVisible(); await expect(timer).toHaveClass('diss-study-time'); await expect(timer).toHaveAttribute('role', 'timer'); await expect(timer).toHaveAttribute('aria-live', 'off');
  await expect(timer).toHaveText('Timed practical: 2 minutes remaining'); await expect(practical(page)).toHaveAttribute('aria-describedby', 'diss-practical-study-help diss-practical-readiness diss-practical-time-status');
  await expect(readiness(page)).toHaveText('The timed practical is active. End it to return to reference study.');
  await page.clock.runFor(3200); await expect.poll(async () => (await state(page)).practicalTimer).toBeLessThan(120);
  const running = await state(page); expect(running.practicalTimer).toBeGreaterThan(114); expect(running.practicalEndsAt).toBe(started.practicalEndsAt); expect(running.practicalTargetIds).toEqual(ids);
  await expect(timer).toContainText(`1 minute ${running.practicalTimer - 60} seconds remaining`); await expect(timer).toHaveAttribute('aria-live', 'off'); expect(await proof(page)).toEqual({ ...before, scores: [0, 0] });
  const nativeClockActive = await source(page).evaluate((canvas: any) => !!canvas._dissPracticalTimer && (window as any).__alloDissectionPracticalInterval === canvas._dissPracticalTimer); expect(nativeClockActive).toBe(true);
  await chooser(page).screenshot({ path: `${out}/native-timed-study.png`, style: screenshotStyle });
  await practical(page).focus(); await page.keyboard.press('Space'); await expect(practical(page)).toHaveAccessibleName('Start 2-minute timed practical'); await expect(practical(page)).toHaveAttribute('aria-pressed', 'false'); await focused(practical(page)); await expect(timer).toHaveCount(0);
  const ended = await state(page); expect(ended.labelMode).toBe('show'); expect(ended.practicalMode).toBe(false); expect(ended.quizMode).toBe(false); expect(ended.practicalEndsAt).toBe(0); expect(ended.practicalTimer).toBe(0); expect(ended.practicalTargetIds).toEqual([]);
  expect(await source(page).evaluate((canvas: any) => [canvas._dissPracticalTimer, canvas._dissPracticalImmediateTimer, (window as any).__alloDissectionPracticalInterval])).toEqual([null, null, null]);
  const endedProof = await proof(page); expect(endedProof).toEqual({ ...before, scores: [0, 0] }); await page.clock.runFor(2100); expect((await state(page)).practicalTimer).toBe(0); expect(await proof(page)).toEqual(endedProof);
  await writeFile(`${out}/native-practical-proof.json`, JSON.stringify({ startedAt, deadline: started.practicalEndsAt, targetIds: ids, runningSeconds: running.practicalTimer, nativeClockActive, labelsRestored: ended.labelMode, before, ended: endedProof }, null, 2));
});

test('Essentials keeps one group column and sheep-eye native reference comes first with its existing focus and assessment gate', async ({ page }) => {
  test.skip(baseline); await mount(page, { workspaceMode: 'essentials' }, 1440, 1180); const essentialsBefore = await proof(page);
  await expect(group(page, 'practice')).toBeVisible(); await expect(group(page, 'practical')).toBeHidden(); const essentials = await readable(page, 1180); expect(essentials.columns).toBe(1); expect(essentials.groups.map(g => g.name)).toEqual(['practice']);
  expect(await proof(page)).toEqual(essentialsBefore); await harness.unmount(page);
  const eyeNotes = { 'sheepEye|cornea': 'I observed the curved anterior surface.' };
  await mount(page, { specimen: 'sheepEye', _dissLoadedSpec: 'sheepEye', selectedOrgan: 'cornea', exploredOrgans: { 'sheepEye|cornea': true }, organNotes: eyeNotes, organConfidence: { 'sheepEye|cornea': 2 }, verifiedIdentifications: { 'sheepEye|cornea': { status: 'verified', at: 88 } }, revealedLayers: {} }, 390, 390);
  const before = await proof(page), eye = chooser(page).getByRole('button', { name: '3D eye study', exact: true });
  expect(await chooser(page).getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || node.textContent))).toEqual(['3D eye study', 'Flashcard', 'Compare', 'Start 2-minute timed practical']);
  await expect(eye).toHaveAttribute('aria-describedby', 'diss-study-eye-help'); await expect(eye).toHaveAccessibleDescription('Explore the eye schematic from different viewpoints.');
  await eye.focus(); await focused(eye); await page.keyboard.press('Tab'); await focused(flashcard(page)); await page.keyboard.press('Shift+Tab'); await focused(eye); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-eye-study-title')).toBeFocused(); await expect(page.locator('[data-eye-study]')).toHaveAttribute('data-eye-status', 'ready'); await pressed(eye); expect(await proof(page)).toEqual(before);
  await eye.focus(); await page.keyboard.press('Space'); await expect(page.locator('[data-eye-study]')).toHaveCount(0); await expect(page.locator('#diss-canvas')).toBeFocused(); expect(await proof(page)).toEqual(before);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true)); await expect(chooser(page).locator('#diss-eye-study-toggle')).toHaveCount(0); expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/essentials-eye-proof.json`, JSON.stringify({ essentialsColumns: essentials.columns, eyeEvidence: before, assessedEvidence: await proof(page) }, null, 2));
});

test('nested pressed and focus cues survive embedded resizing and forced colors, and print hides the chooser', async ({ page }) => {
  test.skip(baseline); await page.emulateMedia({ forcedColors: 'active' }); await mount(page, { largeText: true, highContrast: true, selectedOrgan: null }, 1440, 1180); const before = await proof(page);
  await compare(page).focus(); await page.keyboard.press('Space'); await pressed(compare(page)); await focused(compare(page)); const wide = await readable(page, 1180, true); expect(wide.columns).toBe(3);
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} #diss-study-tools :is(p,h4,button) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  const narrow = await readable(page, 320, true); expect(narrow.columns).toBe(1); expect(narrow.activityColumns).toBe(1); await pressed(compare(page)); await focused(compare(page)); expect(await proof(page)).toEqual(before);
  await chooser(page).screenshot({ path: `${out}/forced-resize-pressed-focus.png`, style: screenshotStyle }); await audit(page, 'forced-resize');
  await page.emulateMedia({ media: 'print' }); await expect(chooser(page)).toBeHidden(); await expect(page.locator('.diss-toolbar')).toBeHidden(); expect(await proof(page)).toEqual(before);
  await page.emulateMedia({ media: 'screen' }); await expect(chooser(page)).toBeVisible(); await pressed(compare(page)); expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/resize-print-proof.json`, JSON.stringify({ wide, narrow, learnerWork: before }, null, 2));
});
