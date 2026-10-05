import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-record-handoff-2026-10-02';
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
async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent! }))); }
async function seed(page: Page, state: any = {}, width = 390, available = width) {
  await mount(page, {}, width, available); const organs = await catalog(page); expect(organs).toHaveLength(4); await harness.unmount(page);
  const exploredOrgans = Object.fromEntries(organs.map(org => ['frog|' + org.id, true]));
  const organNotes = Object.fromEntries(organs.map(org => ['frog|' + org.id, 'I observed a surface boundary.']));
  const organConfidence = Object.fromEntries(organs.map(org => ['frog|' + org.id, 2]));
  organConfidence['frog|' + organs[1].id] = 0; organNotes['frog|' + organs[2].id] = '   '; organNotes['frog|' + organs[3].id] = ''; organConfidence['frog|' + organs[3].id] = 0;
  await mount(page, { selectedOrgan: organs[0].id, exploredOrgans, organNotes, organConfidence, ...state }, width, available); return organs;
}
async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`record handoff ${name} is readable and opens the actual missing field`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  const organs = await seed(page, { largeText: !!large, highContrast: !!contrast }, width, available), before = await evidence(page), handoff = page.getByRole('region', { name: 'Your record', exact: true });
  await expect(handoff.locator('[data-record-complete]')).toHaveText('Note and confidence recorded'); await expect(handoff).toContainText('1 of 4 inspected structures');
  await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[1].id); await expect(handoff).toContainText('Confidence needed');
  const button = handoff.getByRole('button', { name: 'Choose confidence for ' + organs[1].name, exact: true }); await button.focus();
  await handoff.screenshot({ path: `${out}/${name}-handoff.png`, style: '.diss-next-action {position:static!important;}' });
  const metrics = await handoff.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
    targets: Array.from(node.querySelectorAll('button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
    text: Array.from(node.querySelectorAll('h4,p,strong,span,button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-note-handoff]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await page.keyboard.press('Enter'); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).toBeFocused(); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).not.toBeChecked(); expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});

for (const kind of ['confidence', 'note', 'both']) test(`next action names the ${kind} missing from the record`, async ({ page }) => {
  const organs = await seed(page), target = organs[0]; await harness.unmount(page);
  const state: any = { exploredOrgans: Object.fromEntries(organs.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(organs.map(org => ['frog|' + org.id, 'A visible boundary.'])), organConfidence: Object.fromEntries(organs.map(org => ['frog|' + org.id, 2])) };
  if (kind !== 'confidence') state.organNotes['frog|' + target.id] = '  '; if (kind !== 'note') state.organConfidence['frog|' + target.id] = 0;
  await mount(page, state); const before = await evidence(page), action = page.locator('[data-dissection-next-action]');
  const title = kind === 'confidence' ? 'Rate your confidence for ' : kind === 'note' ? 'Write an evidence note for ' : 'Complete the observation record for ';
  const label = kind === 'confidence' ? 'Choose confidence' : kind === 'note' ? 'Write evidence note' : 'Open observation record';
  await expect(action).toHaveAttribute('data-next-action', 'evidence'); await expect(action.locator('#diss-next-action-title')).toHaveText(title + target.name);
  await action.getByRole('button', { name: label, exact: true }).click(); await expect(page.locator(kind === 'confidence' ? `#diss-confidence-${target.id}-1` : `#diss-note-${target.id}`)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  if (kind === 'confidence') await expect(page.locator('.diss-confidence-scale input:checked')).toHaveCount(0);
});

test('finishing records advances the handoff only after explicit writing or rating', async ({ page }) => {
  const organs = await seed(page), before = await evidence(page), handoff = page.locator('[data-note-handoff]');
  await handoff.locator('[data-next-record-action]').click(); await page.getByRole('radio', { name: 'Confidence 1 of 3: Not sure yet', exact: true }).check();
  await expect(handoff.locator('[data-record-complete]')).toHaveText('Note and confidence recorded'); await expect(handoff).toContainText('2 of 4 inspected structures');
  await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[2].id); await expect(handoff).toContainText('Note needed');
  await handoff.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-note-${organs[2].id}`)).toBeFocused(); await expect(page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true })).toBeChecked();
  await page.locator(`#diss-note-${organs[2].id}`).fill('I observed the external membrane next to the eye.');
  await expect(handoff).toContainText('3 of 4 inspected structures'); await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[3].id); await expect(handoff).toContainText('Note and confidence needed');
  await handoff.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-note-${organs[3].id}`)).toBeFocused(); await page.locator(`#diss-note-${organs[3].id}`).fill('I observed the protective eyelid and its position.');
  await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Finish this record before continuing your notes.');
  await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check(); await expect(handoff).toContainText('4 of 4 inspected structures');
  await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Every structure in this layer has been inspected and documented.');
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  const after = await evidence(page); expect(after.explored).toEqual(before.explored); expect(after.verified).toEqual(before.verified); expect(after.scores).toEqual(before.scores); expect(after.procedures).toEqual(before.procedures); expect(after.revealed).toEqual(before.revealed);
  await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused();
});

test('clearing the current note keeps a pending record visible when no other record is unfinished', async ({ page }) => {
  const organs = await seed(page); await harness.unmount(page); await mount(page, { selectedOrgan: organs[0].id, exploredOrgans: { ['frog|' + organs[0].id]: true }, organNotes: { ['frog|' + organs[0].id]: 'A visible surface.' }, organConfidence: { ['frog|' + organs[0].id]: 2 } });
  const handoff = page.locator('[data-note-handoff]'); await expect(handoff.locator('[data-next-record-action]')).toHaveCount(0); await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('3 more structures need inspection in this layer.');
  await page.locator(`#diss-note-${organs[0].id}`).fill('  '); await expect(handoff.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'false'); await expect(handoff).toContainText('Add an evidence note');
  await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Finish this record before continuing your notes.');
});

test('next-record navigation preserves the guided route, view, and scenario completion', async ({ page }) => {
  const organs = await seed(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'dorsal', scenarioStartedAt: 100, scenarioCompletedAt: 200 });
  const before = await evidence(page); await page.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); expect(await evidence(page)).toEqual(before);
});

for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides the observation handoff`, async ({ page }) => {
  await mount(page, { selectedOrgan: 'ventral_skin', quizMode: !practical, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], exploredOrgans: { 'frog|ventral_skin': true } });
  await expect(page.locator('[data-note-handoff]')).toHaveCount(0); await expect(page.locator('[data-next-record-action]')).toHaveCount(0);
});

test('reviewing a visible recorded structure preserves structure-trace completion and guided evidence', async ({ page }) => {
  const organs = await seed(page, { workspaceMode: 'advanced', procedureScenario: 'structure-trace', instructorRequiredStructures: 2, guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'ventral', scenarioStartedAt: 100, scenarioCompletedAt: 200 });
  const before = await evidence(page); await page.locator('[data-next-record-action]').click(); await expect(page.locator('#diss-confidence-' + organs[1].id + '-1')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await expect(page.locator('#diss-confidence-' + organs[1].id + '-1')).not.toBeChecked();
});
