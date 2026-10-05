import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const out = 'reports/dissection-investigation-progress-2026-10-02';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 }); test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); }); test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = complete) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: procedure } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent! }))); }
async function seed(page: Page, options: any = {}, width = 390, available = width) {
  await mount(page, {}, width, available); const organs = await catalog(page); expect(organs.length).toBeGreaterThanOrEqual(3); await harness.unmount(page);
  const inspected = options.all ? organs : organs.slice(0, Math.min(4, organs.length));
  const exploredOrgans = Object.fromEntries(inspected.map(org => ['frog|' + org.id, true]));
  const organNotes = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 'Observed a surface boundary.']));
  const organConfidence = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 2]));
  if (!options.complete) { organConfidence['frog|' + inspected[1].id] = 0; organNotes['frog|' + inspected[2].id] = '   '; if (inspected[3]) { organNotes['frog|' + inspected[3].id] = ''; organConfidence['frog|' + inspected[3].id] = 0; } }
  await mount(page, { exploredOrgans, organNotes, organConfidence, ...options.state }, width, available, options.procedure || complete);
  return { organs, inspected };
}
async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
const progress = (page: Page, kind: string) => page.locator(`[data-progress-kind="${kind}"] progress`);
async function openRecords(page: Page) { const details = page.locator('.diss-layer-records'); if (!(await details.evaluate((node: HTMLDetailsElement) => node.open))) await details.locator('summary').click(); return details; }

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`investigation ${name} shows readable progress and unfinished records`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  const { organs, inspected } = await seed(page, { state: { largeText: !!large, highContrast: !!contrast } }, width, available);
  const before = await evidence(page), panel = page.locator('#diss-layer-review');
  await expect(progress(page, 'technique')).toHaveAttribute('value', '6'); await expect(progress(page, 'technique')).toHaveAttribute('max', '6');
  await expect(progress(page, 'inspected')).toHaveAttribute('value', String(inspected.length)); await expect(progress(page, 'inspected')).toHaveAttribute('max', String(organs.length));
  await expect(progress(page, 'recorded')).toHaveAttribute('value', '1'); await expect(progress(page, 'recorded')).toHaveAttribute('max', String(organs.length));
  await expect(page.locator('.diss-layer-records')).not.toHaveAttribute('open'); const records = await openRecords(page); await expect(records.locator('li')).toHaveCount(inspected.length - 1);
  await expect(records.locator(`[data-record-organ="${inspected[1].id}"]`)).toContainText('Confidence needed'); await expect(records.locator(`[data-record-organ="${inspected[2].id}"]`)).toContainText('Note needed');
  await records.getByRole('button').first().focus(); await panel.screenshot({ path: `${out}/${name}-review.png`, style: '.diss-next-action {position:static!important;}' });
  await records.screenshot({ path: `${out}/${name}-queue-focus.png` });
  const metrics = await panel.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
    targets: Array.from(node.querySelectorAll('button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
    text: Array.from(node.querySelectorAll('h3,h4,p,strong,span,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});

test('confidence shortcut focuses an unchecked rating and returns without granting evidence', async ({ page }) => {
  const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  const button = records.locator(`[data-record-organ="${inspected[1].id}"] button`); await button.focus(); await page.keyboard.press('Enter');
  const rating = page.locator(`#diss-confidence-${inspected[1].id}-1`); await expect(rating).toBeFocused(); await expect(rating).not.toBeChecked(); expect(await evidence(page)).toEqual(before);
  await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
});

test('missing note shortcut preserves the rating and updates progress after an explicit edit', async ({ page }) => {
  const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  await records.locator(`[data-record-organ="${inspected[2].id}"] button`).click(); const note = page.locator(`#diss-note-${inspected[2].id}`); await expect(note).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await note.fill('I observed the boundary and checked its position against a nearby landmark.'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '2');
  await expect(page.locator(`[data-record-organ="${inspected[2].id}"]`)).toHaveCount(0); const after = await evidence(page);
  expect(after.confidence).toEqual(before.confidence); expect(after.explored).toEqual(before.explored); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores);
  await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused();
});

test('ratings outside the three-level scale remain unfinished and cannot make a layer ready', async ({ page }) => {
  for (const confidence of [0, 4, 99, -1, 'invalid']) {
    const { organs } = await seed(page, { all: true, complete: true }); await harness.unmount(page);
    const target = organs[0], key = 'frog|' + target.id;
    await mount(page, { exploredOrgans: Object.fromEntries(organs.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(organs.map(org => ['frog|' + org.id, 'Surface boundary observed.'])), organConfidence: { ...Object.fromEntries(organs.map(org => ['frog|' + org.id, 2])), [key]: confidence } });
    await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Record evidence'); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length - 1));
    await expect(page.locator(`#diss-record-${target.id}`)).toHaveText('Add a confidence rating'); await openRecords(page); await page.locator(`[data-record-organ="${target.id}"] button`).click();
    await expect(page.locator(`#diss-confidence-${target.id}-1`)).toBeFocused(); await expect(page.locator('.diss-confidence-scale input:checked')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Confidence 1 of 3: Not sure yet', exact: true }).check(); await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
    await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length)); await harness.unmount(page);
  }
});

test('completed technique waits for actual inspection before reporting readiness', async ({ page }) => {
  await mount(page); const organs = await catalog(page), before = await evidence(page);
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
  const visible = page.locator('.diss-directory-item[data-exposure-state="visible"]').first(); await visible.click(); await expect(progress(page, 'inspected')).toHaveAttribute('value', '1'); await expect(page.locator('.diss-layer-records li')).toHaveCount(1);
  const after = await evidence(page); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores); expect(organs.length).toBeGreaterThan(1);
});

test('notes for uninspected and unknown structures do not inflate progress', async ({ page }) => {
  await mount(page); const organs = await catalog(page); await harness.unmount(page);
  await mount(page, { organNotes: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 'Draft.']), ['frog|unknown', 'Unknown.'], ['perch|' + organs[0].id, 'Other specimen.']]), organConfidence: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 3]), ['frog|unknown', 3]]), exploredOrgans: { 'frog|unknown': true } });
  await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
});

test('a complete investigation can explicitly reveal the next layer', async ({ page }) => {
  const { organs } = await seed(page, { all: true, complete: true }, 1180, 1180); const before = await evidence(page);
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal'); await expect(page.locator('.diss-layer-records')).toHaveCount(0); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length));
  await page.locator('.diss-next-action__primary').click(); await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).not.toBe('skin');
  const after = await evidence(page); expect(after.revealed.skin).toBe(true); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures.skin).toEqual(before.procedures.skin);
  await page.locator('#diss-procedure-panel > summary').click();
  await page.getByRole('button', { name: 'Review layer', exact: true }).click();
  await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0');
  await writeFile(`${out}/revealed-state.json`, JSON.stringify(after, null, 2));
});

test('reviewing a prior observation preserves the guided route and hidden-view credit', async ({ page }) => {
  const { inspected } = await seed(page, { state: { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'dorsal' } }); const before = await evidence(page);
  await openRecords(page); await page.locator(`[data-record-organ="${inspected[1].id}"] button`).click(); expect(await evidence(page)).toEqual(before);
});

for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides the record queue and progress shortcuts`, async ({ page }) => {
  await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], selectedOrgan: 'ventral_skin', exploredOrgans: { 'frog|ventral_skin': true } });
  await expect(page.locator('.diss-investigation-progress')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer progress', exact: true })).toHaveCount(0);
});
