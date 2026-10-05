import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-directory-guidance-2026-10-02';
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

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`directory guidance ${name} explains a view change and keeps inspection explicit`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  if (forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { organSearch: 'Dorsal Skin', largeText: !!large, highContrast: !!contrast }, width, available);
  const before = await evidence(page), panels: any[] = [], audits: any[] = [];
  for (const phase of ['occluded', 'visible']) {
    await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
    await expect(context(page)).toHaveAttribute('data-context-exposure', phase);
    await expect(context(page)).toContainText(phase === 'occluded' ? 'Occluded in ventral view' : 'Visible in dorsal view');
    const button = context(page).getByRole('button'); await button.focus();
    await context(page).screenshot({ path: `${out}/${name}-${phase}.png`, style: '.diss-next-action {position:static!important;}' });
    const metrics = await context(page).evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth,
      targets: Array.from(el.querySelectorAll('button')).map(node => ({ label: node.textContent, height: node.getBoundingClientRect().height, clipped: node.scrollWidth > node.clientWidth + 1 })),
      text: Array.from(el.querySelectorAll('h4,p,span,button')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
    panels.push({ phase, ...metrics }); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
    for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
    for (const text of metrics.text) { expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped).toBe(false); }
    if (phase === 'occluded') await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    audits.push({ phase, ...audit }); expect(audit.violations).toEqual([]);
    await button.focus(); await page.keyboard.press(phase === 'occluded' ? 'Space' : 'Enter');
    await expect(result(page)).toBeFocused(); await expect(result(page)).toHaveAttribute('data-exposure-state', 'visible');
    await expect(result(page)).toHaveAttribute('aria-describedby', 'diss-record-dorsal_skin diss-directory-context-detail');
    await expect(page.locator('#diss-organ-search')).toHaveValue('Dorsal Skin');
    expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' });
  }
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(panels, null, 2));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audits, null, 2));
  expect(errors).toEqual([]);
});

test('the inspection shortcut adds guidance and focusing the result does not inspect it', async ({ page }) => {
  await mount(page); const before = await evidence(page);
  await page.locator('[data-inspection-directory-action]').click();
  await expect(context(page)).toHaveAttribute('data-directory-context', 'ventral_skin');
  await expect(context(page)).toContainText('Activate the directory result below');
  await context(page).getByRole('button', { name: 'Focus inspection result', exact: true }).click();
  await expect(result(page, 'ventral_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter'); const after = await evidence(page);
  expect(after).toEqual({ ...before, selected: 'ventral_skin', explored: { 'frog|ventral_skin': true } });
  await expect(context(page)).toHaveCount(0); await expect(page.locator('#diss-selection-title')).toBeFocused();
});

test('activating an occluded result retains its local guidance and cannot award credit', async ({ page }) => {
  await mount(page, { organSearch: 'dorsal' }); const before = await evidence(page);
  await expect(context(page)).toHaveAttribute('data-context-exposure', 'occluded');
  await result(page).focus(); await page.keyboard.press('Enter');
  await expect(result(page)).toBeFocused(); await expect(result(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true })).toBeVisible();
  expect(await evidence(page)).toEqual(before);
});

test('a hidden prior inspection offers record review and preserves existing evidence', async ({ page }) => {
  await mount(page, { organSearch: 'dorsal', exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Observed a pigmented surface.' }, organConfidence: { 'frog|dorsal_skin': 2 }, scenarioCompletedAt: 123 });
  const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-tone', 'prior');
  await expect(context(page)).toContainText('Reviewing this record adds no new inspection credit');
  await expect(context(page).locator('[data-directory-context-action="view"]')).toHaveCount(0);
  await context(page).getByRole('button', { name: 'Focus record result', exact: true }).click();
  await expect(result(page)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter'); expect(await evidence(page)).toEqual({ ...before, selected: 'dorsal_skin' });
  await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true');
});

test('a restored hidden draft still requires view recovery and explicit inspection', async ({ page }) => {
  await mount(page, { organSearch: 'dorsal', organNotes: { 'frog|dorsal_skin': 'Saved draft of a surface observation.' }, organConfidence: { 'frog|dorsal_skin': 1 } });
  const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-tone', 'caution');
  await context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true }).click();
  expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' }); await expect(result(page)).toBeFocused();
  await page.keyboard.press('Enter'); const after = await evidence(page);
  expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence);
  expect(after.explored).toEqual({ 'frog|dorsal_skin': true }); expect(after.scores).toEqual(before.scores);
  await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true');
});

for (const partial of [false, true]) test(`${partial ? 'partly exposed' : 'obscured'} anatomy opens field setup without performing preparation`, async ({ page }) => {
  const layerProcedure = partial
    ? { inspected: true, incisionStarted: true, incisionExtended: true, history: ['inspect', 'scalpel', 'scissors'], tissueState: { ...tissue, clarity: 75, stability: 60, exposure: 70, risk: 20 } }
    : { tissueState: { ...tissue, clarity: 1, stability: 1, exposure: 1, risk: 99 } };
  await mount(page, { activeLayer: 'organs', anatomicalView: 'internal', organSearch: 'heart', lightIntensity: 68, revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: layerProcedure } });
  const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-directory-context', 'heart');
  await expect(context(page)).toHaveAttribute('data-context-exposure', partial ? 'emerging' : 'obscured');
  await expect(context(page)).toContainText(partial ? 'Partly exposed' : 'Not yet exposed');
  await context(page).getByRole('button', { name: 'Review field setup', exact: true }).click();
  await expect(page.locator('#diss-procedure-summary')).toBeFocused(); await expect(page.locator('#diss-procedure-panel')).toHaveAttribute('open', '');
  await expect(page.locator('#diss-organ-search')).toHaveValue('heart'); expect(await evidence(page)).toEqual(before);
  await context(page).screenshot({ path: `${out}/${partial ? 'emerging' : 'obscured'}-guidance.png`, style: '.diss-next-action {position:static!important;}' });
});

test('guidance follows the current single search result and disappears for broad, empty, or filtered results', async ({ page }) => {
  await mount(page); const before = await evidence(page), search = page.locator('#diss-organ-search');
  await expect(context(page)).toHaveCount(0); await search.fill('dorsal'); await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
  await search.fill('nictitating'); await expect(context(page)).toHaveAttribute('data-directory-context', 'nictitating');
  await search.fill('surface'); await expect(page.locator('.diss-directory-item')).toHaveCount(2); await expect(context(page)).toHaveCount(0);
  await search.fill('no such anatomy'); await expect(context(page)).toHaveCount(0);
  await search.fill('dorsal'); await page.locator('[data-directory-filter="recorded"]').click(); await expect(context(page)).toHaveCount(0);
  await page.locator('[data-directory-recovery="filter"]').click(); await expect(context(page)).toHaveAttribute('data-directory-context', 'dorsal_skin');
  await search.press('Escape'); await expect(context(page)).toHaveCount(0); expect(await evidence(page)).toEqual(before);
});

test('guided view recovery keeps the fixed target and pauses guidance at the evidence question', async ({ page }) => {
  await mount(page, { organSearch: 'dorsal', guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] });
  const before = await evidence(page); await context(page).getByRole('button', { name: 'Switch to dorsal view', exact: true }).click();
  await expect(result(page)).toBeFocused(); expect(await evidence(page)).toEqual({ ...before, view: 'dorsal' });
  await page.keyboard.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible();
  const after = await evidence(page); expect(after.guided[1]).toBe(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]);
  expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.scores).toEqual(before.scores); expect(after.verified).toEqual(before.verified);
  await expect(context(page)).toHaveCount(0); await expect(page.locator('[data-directory-context-action]')).toHaveCount(0);
});

test('guided guidance does not suggest a structure outside the fixed target', async ({ page }) => {
  await mount(page, { organSearch: 'nictitating', guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] });
  const before = await evidence(page); await expect(result(page, 'nictitating')).toBeVisible(); await expect(context(page)).toHaveCount(0); expect(await evidence(page)).toEqual(before);
});

for (const [name, state] of [
  ['quiz', { quizMode: true }], ['timed practical', { practicalMode: true, practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] }],
  ['flashcards', { flashcardMode: true }], ['comparison', { compareMode: true }], ['eye study', { eyeStudyMode: true }],
] as const) test(`${name} keeps directory recovery guidance unavailable`, async ({ page }) => {
  await mount(page, { organSearch: 'dorsal', ...state });
  await expect(context(page)).toHaveCount(0); await expect(page.locator('[data-directory-context-action]')).toHaveCount(0);
});
