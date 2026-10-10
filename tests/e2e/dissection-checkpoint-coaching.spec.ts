import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_COACHING_OUTPUT || 'test-results/dissection-checkpoint-coaching';
const baseline = process.env.DISSECTION_COACHING_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const captureStyle = '.diss-next-action{position:static!important;}';
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: false, organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page)).toEqual([]); });

async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection, p = d.procedureByLayer.skin;
    return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, instrument: d.activeInstrument, view: d.anatomicalView,
      physical: { inspected: !!p.inspected, incisionStarted: !!p.incisionStarted, incisionExtended: !!p.incisionExtended, retracted: !!p.retracted, pins: p.pins || [], probed: !!p.probed, tissue: p.tissueState, errors: p.errors || 0, protocolDeviations: p.protocolDeviations || 0, history: p.history || [], actions: p.actionLog || [], cautions: p.cautionLog || [] }, guidedStep: d.guidedStep, pending: d.guidedObservationPending };
  });
}
async function mount(page: Page, phase: string, width: number, available: number, large = false, contrast = false) {
  const procedure = { tissueState: tissue, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [], ...(phase === 'reflect' ? { inspected: true, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } } : { learningChecks: {} }) };
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, largeText: large, highContrast: contrast, ...(phase === 'guided' ? { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], guidedObservationPending: 'ventral_skin' } : {}) } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function assertCoaching(page: Page, panel: Locator, selected: Locator, feedbackId: string, originalName: string, expectedMessage: string) {
  const feedback = page.locator(`#${feedbackId}`);
  await expect(feedback).toHaveCount(1); await expect(feedback).toBeVisible();
  await expect(feedback.locator('strong')).toHaveText('Try another choice.');
  await expect(feedback.locator('span')).toHaveText(expectedMessage);
  await expect(selected).toHaveAccessibleName(originalName);
  await expect(selected).toHaveAttribute('aria-describedby', feedbackId);
  await expect(selected).toHaveAccessibleDescription(`Try another choice. ${expectedMessage}`);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(selected.locator('.diss-learning-check__feedback')).toHaveCount(0);
  const wrapper = selected.locator('..');
  await expect(wrapper).toHaveClass('diss-learning-check__choice');
  await expect(wrapper.locator(':scope > .diss-learning-check__feedback')).toHaveCount(1);
  await expect(panel.locator(':scope > .diss-learning-check__feedback')).toHaveCount(0);
  expect(await selected.evaluate((node, id) => node.nextElementSibling?.id === id, feedbackId)).toBe(true);
  const answerBox = await selected.boundingBox(), feedbackBox = await feedback.boundingBox(), wrapperBox = await wrapper.boundingBox();
  expect(answerBox).not.toBeNull(); expect(feedbackBox).not.toBeNull(); expect(wrapperBox).not.toBeNull();
  expect(feedbackBox!.y).toBeGreaterThanOrEqual(answerBox!.y + answerBox!.height - 1);
  expect(feedbackBox!.x).toBeGreaterThanOrEqual(wrapperBox!.x - 1);
  expect(feedbackBox!.x + feedbackBox!.width).toBeLessThanOrEqual(wrapperBox!.x + wrapperBox!.width + 1);
}
async function captureAndAudit(page: Page, panel: Locator, selected: Locator, name: string, available: number, large: boolean) {
  const group = panel.locator('.diss-learning-check__options');
  await group.screenshot({ path: `${out}/after-${name}-choices.png`, style: captureStyle });
  await selected.locator('..').screenshot({ path: `${out}/after-${name}-coaching.png`, style: captureStyle });
  const metrics = await group.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    choices: Array.from(el.querySelectorAll('.diss-learning-check__option')).map(node => ({ height: node.getBoundingClientRect().height, client: node.clientWidth, scroll: node.scrollWidth })),
    text: Array.from(el.querySelectorAll('.diss-learning-check__answer, .diss-learning-check__feedback, .diss-learning-check__feedback strong, .diss-learning-check__feedback span')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth })) }));
  expect(metrics.width).toBeLessThanOrEqual(available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const choice of metrics.choices) { expect(choice.height).toBeGreaterThanOrEqual(48); expect(choice.scroll).toBeLessThanOrEqual(choice.client + 1); }
  for (const text of metrics.text) { expect(text.font).toBeGreaterThanOrEqual(large ? 18 : 16); expect(text.scroll).toBeLessThanOrEqual(text.client + 1); }
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const selector = `#${await panel.getAttribute('id')} .diss-learning-check__options`;
  const audit = await page.evaluate(async selector => (window as any).axe.run({ include: [[selector]] }), selector);
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
}

for (const layout of [
  { name: 'phone', width: 320, available: 320, phase: 'plan' },
  { name: 'desktop', width: 1440, available: 1180, phase: 'reflect' },
  { name: 'embedded-large', width: 1440, available: 320, phase: 'plan', large: true, contrast: true },
  { name: 'forced-colors-guided', width: 390, available: 390, phase: 'guided', forced: true },
]) test(`checkpoint coaching ${layout.name} stays beside the selected answer without changing its name`, async ({ page }) => {
  if (layout.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, layout.phase, layout.width, layout.available, !!layout.large, !!layout.contrast);
  const guided = layout.phase === 'guided', reflecting = layout.phase === 'reflect';
  const panel = page.locator(guided ? '#diss-guided-observation-check' : '#diss-learning-checkpoint');
  const choices = panel.locator('.diss-learning-check__option');
  const feedbackId = guided ? 'diss-guided-observation-feedback' : 'diss-learning-check-feedback';
  const responseKey = reflecting ? 'reflection' : 'prediction';
  const wrongIndex = reflecting ? 0 : 1, correctIndex = reflecting ? 1 : 0;
  await expect(choices).toHaveCount(3);
  const names = await choices.locator('.diss-learning-check__answer').allInnerTexts();
  const before = await savedWork(page);
  await choices.nth(wrongIndex).click();
  if (baseline) {
    await panel.locator('.diss-learning-check__options').screenshot({ path: `${out}/before-${layout.name}-choices.png`, style: captureStyle });
    await page.locator(`#${feedbackId}`).screenshot({ path: `${out}/before-${layout.name}-feedback.png`, style: captureStyle });
    await writeFile(`${out}/before-${layout.name}.json`, JSON.stringify({ names, feedback: await page.locator(`#${feedbackId}`).innerText(), selectedName: await choices.nth(wrongIndex).locator('.diss-learning-check__answer').innerText(), feedbackInsideOptions: await panel.locator(`.diss-learning-check__options #${feedbackId}`).count() }, null, 2));
    return;
  }
  const first = await state(page);
  const message = guided ? first.guidedObservationFeedback.message : first.procedureByLayer.skin.learningChecks.inspect[`${responseKey}Feedback`];
  await assertCoaching(page, panel, choices.nth(wrongIndex), feedbackId, names[wrongIndex], message);
  await expect(choices.nth(wrongIndex)).toBeFocused();
  expect(await savedWork(page)).toEqual(before);
  await page.keyboard.press('Tab'); await expect(choices.nth(wrongIndex + 1)).toBeFocused(); expect(await state(page)).toEqual(first);
  await page.keyboard.press('Shift+Tab'); await expect(choices.nth(wrongIndex)).toBeFocused(); expect(await state(page)).toEqual(first);
  await page.keyboard.press('ArrowRight'); await expect(choices.nth(wrongIndex + 1)).toBeFocused(); expect(await state(page)).toEqual(first);
  await page.keyboard.press('ArrowLeft'); await expect(choices.nth(wrongIndex)).toBeFocused(); expect(await state(page)).toEqual(first);
  await captureAndAudit(page, panel, choices.nth(wrongIndex), layout.name, layout.available, !!layout.large);
  await choices.nth(2).focus(); await page.keyboard.press('Enter');
  const second = await state(page);
  const secondMessage = guided ? second.guidedObservationFeedback.message : second.procedureByLayer.skin.learningChecks.inspect[`${responseKey}Feedback`];
  await assertCoaching(page, panel, choices.nth(2), feedbackId, names[2], secondMessage);
  await expect(choices.nth(wrongIndex)).not.toHaveAttribute('aria-describedby', feedbackId);
  await expect(choices.nth(wrongIndex).locator('..').locator('.diss-learning-check__feedback')).toHaveCount(0);
  expect(await savedWork(page)).toEqual(before);
  await choices.nth(2).locator('..').screenshot({ path: `${out}/after-${layout.name}-moved-coaching.png`, style: captureStyle });
  await choices.nth(correctIndex).focus(); await page.keyboard.press('Enter');
  const after = await savedWork(page), finalState = await state(page);
  if (guided) {
    await expect(panel).toHaveCount(0); await expect(page.locator('#diss-canvas')).toBeFocused();
    expect(after.guidedStep).toBe(1); expect(after.pending).toBeNull(); expect(after.verified['frog|ventral_skin'].status).toBe('verified');
    expect({ ...after, verified: before.verified, guidedStep: before.guidedStep, pending: before.pending }).toEqual(before);
  } else {
    await expect(panel).toHaveAttribute('data-phase', reflecting ? 'predict' : 'perform');
    await expect(page.locator('#diss-learning-check-title')).toBeFocused();
    expect(finalState.procedureByLayer.skin.learningChecks.inspect[`${responseKey}Correct`]).toBe(true);
    expect(finalState.procedureByLayer.skin.learningChecks.inspect[`${responseKey}Attempts`]).toBe(3);
    expect(after).toEqual(before);
  }
  await writeFile(`${out}/${layout.name}-transition.json`, JSON.stringify({ savedWorkPreserved: true, phase: guided ? 'guided-next-target' : await panel.getAttribute('data-phase'), guidedStep: after.guidedStep, feedbackRemaining: await page.locator(`#${feedbackId}`).count() }, null, 2));
});
