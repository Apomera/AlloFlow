import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-inspection-handoff-2026-10-02';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 }); test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent!, exposure: node.getAttribute('data-exposure-state') }))); }
async function seed(page: Page, state: any = {}, width = 390, available = width) {
  await mount(page, {}, width, available); const organs = await catalog(page), current = organs.find(org => org.exposure === 'visible')!; expect(organs).toHaveLength(4); await harness.unmount(page);
  const target = organs.find(org => org.id !== current.id && org.exposure === 'visible')!; expect(target).toBeTruthy();
  await mount(page, { selectedOrgan: current.id, exploredOrgans: { ['frog|' + current.id]: true }, organNotes: { ['frog|' + current.id]: 'I observed the surface and checked a nearby landmark.' }, organConfidence: { ['frog|' + current.id]: 2 }, ...state }, width, available); return { organs, current, target };
}
async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
const action = (page: Page) => page.locator('[data-dissection-next-action]');

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`inspection ${name} shows readable directory shortcuts and previews without credit`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  const { target } = await seed(page, { largeText: !!large, highContrast: !!contrast, organSearch: 'old query', directoryFilter: 'recorded' }, width, available), before = await evidence(page), card = action(page), handoff = page.locator('[data-note-handoff]');
  await expect(card).toHaveAttribute('data-inspection-target', target.id); await expect(handoff.locator('[data-next-inspection]')).toHaveAttribute('data-next-inspection', target.id);
  await expect(handoff).toContainText('3 more structures need inspection'); await card.locator('[data-inspection-directory-action]').focus();
  await card.screenshot({ path: `${out}/${name}-next-action.png`, style: '.diss-next-action {position:static!important;}' }); await handoff.screenshot({ path: `${out}/${name}-record.png`, style: '.diss-next-action {position:static!important;}' });
  const metrics = await page.evaluate(() => Array.from(document.querySelectorAll('[data-inspection-target],[data-note-handoff]')).map(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
    targets: Array.from(node.querySelectorAll('button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
    text: Array.from(node.querySelectorAll('h3,h4,p,strong,span,button,.diss-next-action__step')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) })));
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics).toHaveLength(2);
  for (const panel of metrics) { expect(panel.scroll).toBeLessThanOrEqual(panel.client + 1); for (const target of panel.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); } for (const text of panel.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); } }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-inspection-target]'], ['[data-note-handoff]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await card.locator('[data-inspection-directory-action]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-organ-' + target.id)).toBeFocused(); await expect(page.locator('#diss-organ-search')).toHaveValue(target.name); await expect(page.locator('[data-directory-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]); await page.locator('#diss-organ-' + target.id).screenshot({ path: `${out}/${name}-focused-result.png` });
});

test('the record shortcut previews a visible target and inspection requires a separate activation', async ({ page }) => {
  const { target } = await seed(page), before = await evidence(page); await page.locator('[data-record-inspection-action]').click(); await expect(page.locator('#diss-organ-' + target.id)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter'); const after = await evidence(page); expect(after.explored).toEqual({ ...before.explored, ['frog|' + target.id]: true }); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.verified).toEqual(before.verified); expect(after.scores).toEqual(before.scores); expect(after.procedures).toEqual(before.procedures); expect(after.view).toEqual(before.view); expect(after.instrument).toEqual(before.instrument);
  await expect(page.locator('[data-progress-kind="inspected"] progress')).toHaveAttribute('value', '2'); await expect(page.locator('[data-progress-kind="recorded"] progress')).toHaveAttribute('value', '1'); await expect(page.locator('#diss-selection-title')).toBeFocused();
});

test('an occluded target can be previewed and cannot earn inspection credit', async ({ page }) => {
  const { organs } = await seed(page); await harness.unmount(page); const hidden = organs.find(org => org.exposure === 'occluded')!, visible = organs.filter(org => org.id !== hidden.id);
  await mount(page, { exploredOrgans: Object.fromEntries(visible.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(visible.map(org => ['frog|' + org.id, 'Observed a surface boundary.'])), organConfidence: Object.fromEntries(visible.map(org => ['frog|' + org.id, 2])) }); const before = await evidence(page);
  await expect(action(page)).toHaveAttribute('data-next-action', 'visibility'); await expect(action(page)).toHaveAttribute('data-inspection-target', hidden.id); await action(page).locator('[data-inspection-directory-action]').click();
  const row = page.locator('#diss-organ-' + hidden.id); await expect(row).toBeFocused(); await expect(row).toHaveAttribute('aria-disabled', 'true'); await expect(row).toHaveAttribute('data-exposure-state', 'occluded'); expect(await evidence(page)).toEqual(before);
  await row.press('Enter'); expect(await evidence(page)).toEqual(before); await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message || '')).toContain('occluded');
});

test('guided directory preview keeps the fixed target until explicit inspection opens its evidence check', async ({ page }) => {
  await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating', 'tympanum'] }); const before = await evidence(page);
  await expect(action(page)).toHaveAttribute('data-inspection-target', 'nictitating'); await action(page).locator('[data-inspection-directory-action]').click(); const row = page.locator('#diss-organ-nictitating'); await expect(row).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await row.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible(); const after = await evidence(page); expect(after.guided[1]).toBe(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]); expect(after.scores).toEqual(before.scores); expect(after.verified).toEqual(before.verified);
  await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0);
});

test('a hidden guided target remains fixed while the directory explains its visibility', async ({ page }) => {
  await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] }); const before = await evidence(page);
  await expect(action(page)).toHaveAttribute('data-inspection-target', 'dorsal_skin'); await action(page).locator('[data-inspection-directory-action]').click(); await expect(page.locator('#diss-organ-dorsal_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before); await expect(page.locator('#diss-organ-dorsal_skin')).toHaveAttribute('data-exposure-state', 'occluded');
});

test('a restored draft remains uninspected until its visible directory result is activated', async ({ page }) => {
  await mount(page, { selectedOrgan: 'ventral_skin', organNotes: { 'frog|ventral_skin': 'I observed a lighter surface.' }, organConfidence: { 'frog|ventral_skin': 2 } }); const before = await evidence(page);
  await expect(page.locator('[data-record-handoff-remaining]')).toHaveText('Inspect this structure before completing its observation record.'); await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'false'); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0);
  await action(page).locator('[data-inspection-directory-action]').click(); await expect(page.locator('#diss-organ-ventral_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before); await page.keyboard.press('Enter');
  await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true'); const after = await evidence(page); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.explored).toEqual({ 'frog|ventral_skin': true });
});

test('the record handoff prioritizes unfinished notes before offering another inspection', async ({ page }) => {
  await seed(page, { exploredOrgans: { 'frog|ventral_skin': true, 'frog|tympanum': true }, organNotes: { 'frog|ventral_skin': 'Observed a surface.' }, organConfidence: { 'frog|ventral_skin': 2, 'frog|tympanum': 2 } });
  await expect(page.locator('[data-next-record-action]')).toBeVisible(); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); await page.locator('[data-next-record-action]').click(); await page.locator('#diss-note-tympanum').fill('Observed the external membrane beside the eye.');
  await expect(page.locator('[data-record-inspection-action]')).toBeVisible(); await expect(page.locator('[data-next-record-action]')).toHaveCount(0);
});

test('planning, reflection, and study routes keep their own next actions', async ({ page }) => {
  for (const state of [{ procedureByLayer: { skin: {} } }, { procedureByLayer: { skin: { ...complete, learningChecks: { ...complete.learningChecks, probe: { predictionCorrect: true, reflectionCorrect: false } } } } }, { compareMode: true }, { flashcardMode: true }]) {
    await mount(page, state); const before = await evidence(page); await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); expect(await evidence(page)).toEqual(before); await harness.unmount(page);
  }
});

for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides inspection handoff shortcuts`, async ({ page }) => {
  await mount(page, { selectedOrgan: 'ventral_skin', quizMode: !practical, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'A visible surface.' }, organConfidence: { 'frog|ventral_skin': 2 } });
  await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0);
});

test('the record inspection shortcut follows the current guided target and pauses for its evidence check', async ({ page }) => {
  await seed(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating', 'tympanum'], organNotes: { 'frog|ventral_skin': 'Observed a lighter surface.', 'frog|nictitating': 'Draft: protective membrane beside the eye.' }, organConfidence: { 'frog|ventral_skin': 2, 'frog|nictitating': 1 } });
  const before = await evidence(page); await expect(page.locator('[data-next-inspection]')).toHaveAttribute('data-next-inspection', 'nictitating');
  await page.locator('[data-record-inspection-action]').click(); const row = page.locator('#diss-organ-nictitating'); await expect(row).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await row.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible(); await expect(page.locator('[data-note-handoff]')).toHaveCount(0); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0);
  const after = await evidence(page); expect(after.explored).toEqual({ ...before.explored, 'frog|nictitating': true }); expect(after.guided[1]).toEqual(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.scores).toEqual(before.scores); expect(after.verified).toEqual(before.verified);
});
