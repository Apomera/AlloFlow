import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-record-completion-2026-10-02';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, organSearch: '', directoryFilter: 'all', revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  });
}
const context = (page: Page) => page.locator('[data-directory-context]');
const result = (page: Page, id = 'dorsal_skin') => page.locator('#diss-organ-' + id);

const draft = { organSearch: 'ventral', exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'I observed a pale surface boundary.' }, organConfidence: { 'frog|ventral_skin': 4 }, procedureScenario: 'structure-trace', scenarioStartedAt: 100, scenarioCompletedAt: 123 };
const filter = (page: Page, id: string) => page.locator(`[data-directory-filter="${id}"]`);
const finish = (page: Page) => page.locator('[data-directory-context-action="record"]');

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`record completion ${name} is readable and supports explicit keyboard rating`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { ...draft, largeText: !!large, highContrast: !!contrast }, width, available);
  const before = await evidence(page);
  await expect(context(page)).toHaveAttribute('data-tone', 'caution');
  await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Confidence needed');
  await expect(finish(page)).toHaveAccessibleName('Choose confidence for Ventral Skin');
  await expect(finish(page)).toHaveAttribute('aria-describedby', 'diss-directory-record-status diss-directory-context-detail');
  await finish(page).focus();
  await page.locator('[data-dissection-directory]').screenshot({ path: `${out}/${name}-unfinished.png`, style: '.diss-next-action {position:static!important;}' });
  const metrics = await page.locator('[data-dissection-directory]').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth,
    targets: Array.from(el.querySelectorAll('.diss-directory-filters button,.diss-directory-context button')).map(n => ({ text: n.textContent, height: n.getBoundingClientRect().height, clipped: n.scrollWidth > n.clientWidth + 1 })),
    text: Array.from(el.querySelectorAll('.diss-directory-filters button,.diss-directory-filters span,.diss-directory-context h4,.diss-directory-context p,.diss-directory-context span,.diss-directory-context button')).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })) }));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const n of metrics.targets) { expect(n.height).toBeGreaterThanOrEqual(47.9); expect(n.clipped).toBe(false); }
  for (const n of metrics.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(n.clipped).toBe(false); }
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await finish(page).focus(); await page.keyboard.press('Enter');
  const rating = page.locator('#diss-confidence-ventral_skin-1');
  await expect(rating).toBeFocused(); await expect(rating).not.toBeChecked();
  expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organSearch)).toBe('');
  await page.keyboard.press('Space'); await expect(rating).toBeChecked();
  expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin', confidence: { 'frog|ventral_skin': 1 } });
  await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click();
  await page.locator('#diss-organ-search').fill('ventral');
  await expect(filter(page, 'recorded')).toHaveAttribute('aria-label', 'Recorded, 1 structure');
  await expect(filter(page, 'needs-record')).toHaveAttribute('aria-label', 'Finish records, 0 structures');
  await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Note and confidence recorded');
  await expect(finish(page)).toHaveCount(0); expect(errors).toEqual([]);
});

for (const rating of [0, 4, -1, 'invalid', '0', 1.5, 1, 3, '2']) test(`directory classifies restored rating ${JSON.stringify(rating)} consistently`, async ({ page }) => {
  const valid = [1, 2, 3].includes(Number(rating));
  await mount(page, { ...draft, organSearch: '', organConfidence: { 'frog|ventral_skin': rating, 'frog|dorsal_skin': 2, 'sheepEye|cornea': 2 }, organNotes: { ...draft.organNotes, 'frog|dorsal_skin': 'Uninspected draft', 'sheepEye|cornea': 'Other specimen' } });
  const before = await evidence(page);
  await expect(filter(page, 'unviewed').locator('span')).toHaveText('3');
  await filter(page, 'recorded').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(valid ? 1 : 0);
  await filter(page, 'needs-record').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(valid ? 0 : 1);
  await expect(filter(page, 'needs-record')).toContainText('Finish records');
  await filter(page, 'all').click(); await page.locator('#diss-organ-search').fill('ventral');
  if (valid) { await expect(finish(page)).toHaveCount(0); await expect(context(page)).toHaveAttribute('data-tone', 'prior'); }
  else {
    await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Confidence needed');
    await finish(page).click(); await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
    await expect(page.locator('#diss-confidence-ventral_skin-1')).not.toBeChecked();
  }
  expect(await evidence(page)).toEqual({ ...before, selected: valid ? before.selected : 'ventral_skin' });
});

for (const both of [false, true]) test(`${both ? 'both missing fields' : 'a whitespace-only note'} opens the note without changing evidence`, async ({ page }) => {
  await mount(page, { ...draft, organNotes: { 'frog|ventral_skin': '   ' }, organConfidence: { 'frog|ventral_skin': both ? 0 : 2 } });
  const before = await evidence(page);
  await expect(context(page).locator('[data-directory-record-status]')).toHaveText(both ? 'Note and confidence needed' : 'Note needed');
  await expect(finish(page)).toHaveText(both ? 'Open observation record' : 'Write evidence note');
  await finish(page).click(); await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
  await page.locator('#diss-note-ventral_skin').fill('I observed a pale ventral surface.');
  await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', both ? 'false' : 'true');
  expect((await evidence(page)).confidence).toEqual(before.confidence);
});

test('a hidden inspected record finishes without changing the view or completion timestamp', async ({ page }) => {
  await mount(page, { ...draft, organSearch: 'dorsal', exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Observed a pigmented dorsal surface.' }, organConfidence: { 'frog|dorsal_skin': 4 } });
  const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-context-exposure', 'occluded');
  await expect(context(page)).toContainText('complete your existing record while this structure is hidden');
  await finish(page).click(); await expect(page.locator('#diss-confidence-dorsal_skin-1')).toBeFocused();
  expect(await evidence(page)).toEqual({ ...before, selected: 'dorsal_skin' });
});

test('an uninspected restored draft stays in To inspect and offers no record completion shortcut', async ({ page }) => {
  await mount(page, { ...draft, exploredOrgans: {}, organConfidence: { 'frog|ventral_skin': 2 } });
  const before = await evidence(page); await expect(finish(page)).toHaveCount(0);
  await filter(page, 'needs-record').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(0);
  await filter(page, 'recorded').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(0);
  await filter(page, 'unviewed').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(1);
  await expect(context(page)).toContainText('Before inspection'); expect(await evidence(page)).toEqual(before);
});

test('objective next evidence names an invalid rating before allowing demonstrated status', async ({ page }) => {
  const state = { ...draft, activeLayer: 'organs', anatomicalView: 'internal', organSearch: 'heart', revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: complete }, exploredOrgans: { 'frog|heart': true }, organNotes: { 'frog|heart': 'Observed chambers in the central thoracic region.' }, organConfidence: { 'frog|heart': 4 }, verifiedIdentifications: { 'frog|heart': { status: 'verified' } } };
  await mount(page, state);
  const objective = page.locator('.diss-objective-item').first();
  await expect(objective).toHaveAttribute('data-objective-status', 'developing');
  await expect(objective).toContainText('0/1 evidence record');
  await expect(objective).toContainText('Next: add an observation note and confidence rating');
  await expect(objective).not.toContainText('Evidence demonstrated');
  await finish(page).click(); await page.locator('#diss-confidence-heart-1').check();
  await expect(objective).toHaveAttribute('data-objective-status', 'demonstrated');
  await expect(objective).toContainText('Evidence demonstrated');
});

test('direct completion preserves a fixed guided target and step', async ({ page }) => {
  await mount(page, { ...draft, guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'] });
  const before = await evidence(page); await finish(page).click();
  await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
  await page.keyboard.press('Space');
  expect((await evidence(page)).guided).toEqual(before.guided); expect((await evidence(page)).verified).toEqual(before.verified);
});

test('observation review and its export use Finish records for confidence-only work', async ({ page }) => {
  await mount(page, { ...draft, exploredOrgans: { 'frog|ventral_skin': true, 'frog|dorsal_skin': true }, organNotes: { ...draft.organNotes, 'frog|dorsal_skin': 'Observed a darker surface.' }, organConfidence: { 'frog|ventral_skin': 4, 'frog|dorsal_skin': 1 } });
  const before = await evidence(page), review = page.locator('[data-observation-review]');
  await review.locator('#diss-observation-review-title').click();
  await expect(review.locator('[data-observation-filter="unfinished"]')).toHaveText('Finish records (1)');
  await review.locator('[data-observation-filter="unfinished"]').click();
  await expect(review.locator('[data-observation-entry]')).toHaveCount(1);
  await expect(review.locator('[data-observation-entry="ventral_skin"]')).toBeVisible();
  await review.locator('[data-observation-export] summary').click();
  await expect(review.locator('#diss-observation-summary')).toHaveValue(/Scope: Finish records/);
  await review.locator('[data-observation-filter="uncertain"]').click();
  await expect(review.locator('[data-observation-entry="dorsal_skin"]')).toBeVisible();
  expect(await evidence(page)).toEqual(before);
});
