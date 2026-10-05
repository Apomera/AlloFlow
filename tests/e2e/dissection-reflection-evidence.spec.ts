import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-reflection-evidence-2026-10-02';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 22, risk: 12, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'inspect', lastUpdatedAt: 100, consequences: [] };
const inspected = { action: 'inspect', label: 'Inspected', at: 100, inputType: 'motor-neutral', assistance: 'motor-neutral', outcome: 'ORIENTATION CHECKED', outcomeDetail: 'Surface landmarks recorded.', point: { x: .5, y: .4 }, tissueBefore: { ...tissue, clarity: 40 }, tissueAfter: { ...tissue, clarity: 60, risk: 10 } };
const hydrated = { action: 'dropper', label: 'Hydrated', at: 100, inputType: 'touch', assistance: 'none', outcome: 'MOISTURE ADJUSTED', point: { x: .5, y: .6 }, tissueBefore: { ...tissue, clarity: 97 }, tissueAfter: { ...tissue, clarity: 99 } };
const pending = { tissueState: tissue, inspected: true, history: ['inspect', 'dropper'], actionLog: [inspected, hydrated], learningChecks: { inspect: { predictionCorrect: true } } };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe', selectedOrgan: null, revealedLayers: {}, organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
async function mount(page: Page, procedure: any = pending, state: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: procedure } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function evidence(page: Page) {
  return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer }; });
}
const metric = (page: Page, label: string) => page.locator('.diss-reflection-evidence__metric').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 },
  { name: 'desktop', width: 1440, available: 1180 }, { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`reflection ${name} keeps saved evidence readable beside choices`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  if (forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, pending, { largeText: !!large, highContrast: !!contrast }, width, available);
  const before = await evidence(page), checkpoint = page.locator('#diss-learning-checkpoint'), panel = page.locator('#diss-reflection-evidence');
  await expect(checkpoint).toHaveAttribute('data-phase', 'reflect'); await expect(panel).toHaveAttribute('data-evidence-action', 'inspect');
  await expect(panel.getByRole('heading')).toHaveText('Saved response: Inspected');
  await expect(panel.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
  await expect(metric(page, 'Clarity')).toContainText('40 → 60'); await expect(metric(page, 'Clarity')).toContainText('More clear · +20 points');
  await expect(metric(page, 'Risk')).toContainText('Lower risk · -2 points');
  await expect(metric(page, 'Risk')).toHaveAttribute('data-direction', 'improve');
  await expect(metric(page, 'Exposure')).toContainText('Unchanged');
  expect(await metric(page, 'Clarity').locator('i').evaluateAll(nodes => nodes.map(node => node.style.width))).toEqual(['40%', '60%']);
  await panel.getByRole('button', { name: 'Read full response', exact: true }).focus();
  await checkpoint.screenshot({ path: `${out}/${name}-checkpoint.png` });
  await panel.locator('summary').click(); await expect(panel).toContainText('The model’s handling-risk measure.');
  await panel.screenshot({ path: `${out}/${name}-evidence-expanded.png` });
  const metrics = await checkpoint.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
    targets: Array.from(node.querySelectorAll('button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
    text: Array.from(node.querySelectorAll('h3,h4,p,dt,dd,strong,span,summary,button')).filter(el => !!el.getBoundingClientRect().height && !el.closest('[aria-hidden="true"]')).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-learning-checkpoint']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
});

test('keyboard review selects the pending response and returns without granting credit', async ({ page }) => {
  await mount(page); const before = await evidence(page);
  await expect(page.locator('.diss-layer-review__selection')).toHaveText('Latest action: Hydrated');
  const open = page.getByRole('button', { name: 'Read full response', exact: true }); await open.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-layer-response-title')).toBeFocused(); await expect(page.locator('#diss-procedure-record-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.diss-layer-review__delta').first()).toContainText('40 → 60'); expect(await evidence(page)).toEqual(before);
  await page.locator('#diss-procedure-record-1').click(); await expect(page.locator('.diss-layer-review__delta').first()).toContainText('97 → 99');
  await expect(metric(page, 'Clarity')).toContainText('40 → 60');
  await page.getByRole('button', { name: 'Return to explanation', exact: true }).click(); await expect(page.locator('#diss-learning-check-title')).toBeFocused();
  const choices = page.locator('#diss-learning-checkpoint .diss-learning-check__option'); await expect(page.locator('#diss-learning-checkpoint .diss-learning-check__option[aria-pressed="true"]')).toHaveCount(0);
  expect(await evidence(page)).toEqual(before);
  await choices.first().click(); await expect(page.locator('#diss-learning-checkpoint')).toHaveAttribute('data-phase', 'reflect');
  await expect(page.locator('#diss-learning-check-feedback')).toHaveAttribute('data-result', 'incorrect'); await expect(metric(page, 'Clarity')).toContainText('40 → 60');
  await open.click(); await page.getByRole('button', { name: 'Return to explanation', exact: true }).click();
  await expect(page.locator('#diss-learning-check-feedback')).toHaveAttribute('data-result', 'incorrect');
  await choices.nth(1).click(); await expect(page.locator('#diss-learning-checkpoint')).toHaveAttribute('data-learning-action', 'scalpel');
  await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0);
  const after = await evidence(page); expect(after.procedures.skin.learningChecks.inspect.reflectionCorrect).toBe(true);
  expect(after.procedures.skin.actionLog).toEqual(before.procedures.skin.actionLog); expect(after.notes).toEqual(before.notes); expect(after.scores).toEqual(before.scores);
});

test('partial and invalid saved pairs stay missing instead of acquiring defaults', async ({ page }) => {
  const partial = { ...inspected, inputType: undefined, assistance: undefined, tissueBefore: { clarity: 12.4, exposure: '8', stability: 101, risk: 20 }, tissueAfter: { clarity: 14.6, exposure: 10, stability: 30 } };
  await mount(page, { ...pending, actionLog: [partial, hydrated] });
  const panel = page.locator('#diss-reflection-evidence'); await expect(panel.locator('.diss-layer-review__input-badge')).toHaveText('Input method not recorded');
  await expect(metric(page, 'Clarity')).toContainText('12 → 15'); await expect(panel).toContainText('Saved before-and-after values: 1 of 4 measures.');
  for (const label of ['Exposure', 'Stability', 'Risk']) { await expect(metric(page, label)).toContainText('Not recorded'); await expect(metric(page, label).locator('i')).toHaveCount(0); }
  await panel.getByRole('button', { name: 'Read full response', exact: true }).click(); await expect(page.locator('.diss-layer-review__delta').first()).toContainText('12 → 15');
});

for (const missing of ['no-record', 'no-pairs', 'truncated'] as const) test(`reflection ${missing} explains missing saved evidence`, async ({ page }) => {
  const actionLog = missing === 'no-record' ? [] : missing === 'no-pairs' ? [{ ...inspected, tissueBefore: {}, tissueAfter: {} }] : Array.from({ length: 19 }, (_, i) => ({ ...hydrated, at: 200 + i }));
  await mount(page, { ...pending, actionLog }); const before = await evidence(page), panel = page.locator('#diss-reflection-evidence');
  await expect(panel).toContainText(missing === 'no-pairs' ? 'No complete before-and-after tissue values were saved.' : 'No detailed response is available for this action.');
  await expect(panel.locator('.diss-reflection-evidence__metric')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Read full response', exact: true })).toHaveCount(missing === 'no-pairs' ? 1 : 0);
  if (missing !== 'no-pairs') await expect(panel.locator('.diss-layer-review__input-badge')).toHaveCount(0);
  await panel.locator('summary').click(); expect(await evidence(page)).toEqual(before);
});

test('repeated actions use the last matching response without timestamp guessing', async ({ page }) => {
  await mount(page, { ...pending, actionLog: [inspected, { ...inspected, label: 'Inspection repeated', tissueBefore: { ...tissue, clarity: 70 }, tissueAfter: { ...tissue, clarity: 74 } }, hydrated] });
  await expect(page.locator('#diss-reflection-evidence-title')).toHaveText('Saved response: Inspection repeated'); await expect(metric(page, 'Clarity')).toContainText('70 → 74');
  await page.getByRole('button', { name: 'Read full response', exact: true }).click(); await expect(page.locator('#diss-procedure-record-1')).toHaveAttribute('aria-pressed', 'true');
});

for (const state of [
  { name: 'prediction', procedure: { tissueState: tissue, learningChecks: {} }, extra: {} },
  { name: 'performance', procedure: { tissueState: tissue, learningChecks: { inspect: { predictionCorrect: true } } }, extra: {} },
  { name: 'quiz', procedure: pending, extra: { quizMode: true } },
  { name: 'timed-practical', procedure: pending, extra: { quizMode: true, practicalMode: true, practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } },
]) test(`${state.name} keeps reflection evidence out of the current task`, async ({ page }) => {
  await mount(page, state.procedure, state.extra); await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Return to explanation', exact: true })).toHaveCount(0);
});

test('real inspection exposes its response and Undo restores the previous checkpoint', async ({ page }) => {
  await mount(page, { tissueState: tissue, learningChecks: {} }, { organNotes: {}, organConfidence: {} }, 1180, 1180);
  const checkpoint = page.locator('#diss-learning-checkpoint'); await checkpoint.locator('.diss-learning-check__option').first().click();
  await checkpoint.getByRole('button', { name: /^Prepare / }).click(); await page.locator('#diss-instrument-probe').click();
  await page.locator('#diss-procedure-panel .diss-procedure__next').click(); await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
  await expect(page.locator('#diss-reflection-evidence')).toContainText('Saved response: Inspected');
  const before = await evidence(page), record = before.procedures.skin.actionLog[0];
  await expect(metric(page, 'Clarity')).toContainText(`${record.tissueBefore.clarity} → ${record.tissueAfter.clarity}`);
  await page.getByRole('button', { name: 'Read full response', exact: true }).click(); await page.getByRole('button', { name: 'Return to explanation', exact: true }).click(); expect(await evidence(page)).toEqual(before);
  await page.getByRole('button', { name: 'Undo the last technique action and visually restore the previous tissue state', exact: true }).click();
  await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0);
  expect((await evidence(page)).procedures.skin.actionLog || []).toHaveLength(0);
});

test('direct input and risk increases describe the saved action independently', async ({ page }) => {
  for (const [inputType, label] of [['mouse', 'Mouse input'], ['pen', 'Pen input'], ['stylus', 'Pen input'], ['touch', 'Touch input'], ['pointer', 'Pointer input'], ['keyboard', 'Keyboard input']]) {
    await mount(page, { ...pending, actionLog: [{ ...inspected, inputType, assistance: 'none', tissueAfter: { ...inspected.tissueAfter, risk: 30 } }, { ...hydrated, inputType: 'motor-neutral', assistance: 'motor-neutral' }] });
    const before = await evidence(page), panel = page.locator('#diss-reflection-evidence');
    await expect(panel.locator('.diss-layer-review__input-badge')).toHaveText(label);
    await expect(metric(page, 'Risk')).toHaveAttribute('data-direction', 'caution'); await expect(metric(page, 'Risk')).toContainText('Higher risk · +18 points');
    await panel.locator('summary').click(); expect(await evidence(page)).toEqual(before);
    await harness.unmount(page);
  }
});

test('every genuine protocol action supplies its own evidence until its explanation is verified', async ({ page }) => {
  test.setTimeout(240000);
  await mount(page, { tissueState: { ...tissue, stability: 19, risk: 11 }, learningChecks: {} }, { organNotes: {}, organConfidence: {}, quizScore: 0, quizTotal: 0 }, 1180, 1180);
  for (const [i, action] of ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].entries()) {
    const checkpoint = page.locator('#diss-learning-checkpoint'); await expect(checkpoint).toHaveAttribute('data-learning-action', action);
    await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0);
    await checkpoint.locator('.diss-learning-check__option').nth([0, 1, 2, 0, 1, 2][i]).click();
    await checkpoint.getByRole('button', { name: /^Prepare / }).click(); await page.locator(`#diss-instrument-${action === 'inspect' ? 'probe' : action}`).click();
    const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next'); await equivalent.click();
    if (action === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0); await equivalent.click(); }
    await expect(checkpoint).toHaveAttribute('data-phase', 'reflect'); await expect(page.locator('#diss-reflection-evidence')).toHaveAttribute('data-evidence-action', action);
    const before = await evidence(page), record = before.procedures.skin.actionLog.slice(-1)[0]; expect(record.action).toBe(action);
    for (const [key, label] of [['clarity', 'Clarity'], ['exposure', 'Exposure'], ['stability', 'Stability'], ['risk', 'Risk']]) await expect(metric(page, label)).toContainText(`${record.tissueBefore[key]} → ${record.tissueAfter[key]}`);
    await expect(page.locator('#diss-reflection-evidence .diss-layer-review__input-badge')).toHaveText('Supported technique');
    if (action === 'pin') await checkpoint.screenshot({ path: `${out}/journey-second-pin.png` });
    await page.getByRole('button', { name: 'Read full response', exact: true }).click(); await expect(page.locator('#diss-layer-response-title')).toBeFocused();
    await page.getByRole('button', { name: 'Return to explanation', exact: true }).click(); await expect(page.locator('#diss-learning-check-title')).toBeFocused();
    expect(await evidence(page)).toEqual(before);
    await checkpoint.locator('.diss-learning-check__option').nth([1, 0, 0, 1, 2, 0][i]).click();
  }
  await expect(page.locator('#diss-reflection-evidence')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Return to explanation', exact: true })).toHaveCount(0);
  await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  const final = await evidence(page); expect(final.procedures.skin.actionLog).toHaveLength(7);
  await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2));
});
