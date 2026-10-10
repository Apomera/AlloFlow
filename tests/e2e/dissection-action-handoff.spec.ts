import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_ACTION_HANDOFF_OUTPUT || 'test-results/dissection-action-handoff';
const baseline = process.env.DISSECTION_ACTION_HANDOFF_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe',
  selectedOrgan: null, revealedLayers: {}, procedureByLayer: { skin: { tissueState: tissue, learningChecks: {} } },
  workspaceMode: 'advanced', techniquePanelOpen: false, procedureScenario: 'precision-access',
  organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 },
  verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2,
  reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
const reflectionCue = 'Next: explain what changed in the learning checkpoint before another technique action.';
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page)).toEqual([]); });

const checkpoint = (page: Page) => page.locator('#diss-learning-checkpoint');
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
function savedWork(d: any) { return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers }; }
async function mount(page: Page, width = 390, available = width, large = false, contrast = false) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, largeText: large, highContrast: contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function prepare(page: Page, action: string, planIndex: number) {
  await expect(checkpoint(page)).toHaveAttribute('data-learning-action', action);
  await expect(checkpoint(page)).toHaveAttribute('data-phase', 'predict');
  await checkpoint(page).locator('.diss-learning-check__option').nth(planIndex).click();
  await checkpoint(page).getByRole('button', { name: /^Prepare / }).click();
  await page.locator('#diss-instrument-' + (action === 'inspect' ? 'probe' : action)).click();
}
async function feedbackMatchesState(page: Page, action: string) {
  const d = await state(page), message = d.procedureFeedback.message;
  expect(message).toContain(reflectionCue);
  expect(message).not.toMatch(/Switch to scissors|Use forceps next|Place two well-spaced pins|Next protocol action:|Record evidence or complete the layer|Next checkpoint:/);
  expect(message).toContain('Scenario checkpoint:');
  await expect(checkpoint(page)).toHaveAttribute('data-phase', 'reflect');
  await expect(checkpoint(page)).toHaveAttribute('data-learning-action', action);
  await expect(page.locator('[data-diss-tool-status]')).toHaveText(message);
  await expect(page.locator('[data-diss-gesture-echo]')).toHaveText(message);
  expect(d.activeInstrument).toBe(action === 'inspect' ? 'probe' : action);
  return d;
}

for (const layout of [
  { name: 'phone', width: 320, available: 320 },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
]) test(`${layout.name} outcome points to the required explanation`, async ({ page }) => {
  if (layout.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, layout.width, layout.available, !!layout.large, !!layout.contrast);
  const before = await state(page);
  await prepare(page, 'inspect', 0);
  await page.locator('#diss-procedure-panel .diss-procedure__next').click();
  await expect(checkpoint(page)).toHaveAttribute('data-phase', 'reflect');
  const d = baseline ? await state(page) : await feedbackMatchesState(page, 'inspect');
  const prefix = `${out}/${baseline ? 'before' : 'after'}-${layout.name}`;
  await checkpoint(page).screenshot({ path: prefix + '-checkpoint.png', style: screenshotStyle });
  await page.locator('[data-diss-gesture-echo]').screenshot({ path: prefix + '-outcome.png', style: screenshotStyle });
  await writeFile(prefix + '-state.json', JSON.stringify({ message: d.procedureFeedback.message, actionLog: d.procedureByLayer.skin.actionLog, savedWork: savedWork(d) }, null, 2));
  if (baseline) return;
  expect(savedWork(d)).toEqual(savedWork(before));
  expect(d.procedureByLayer.skin.actionLog).toHaveLength(1);
  const metrics = await page.locator('[data-diss-gesture-echo], [data-diss-tool-status]').evaluateAll(nodes => nodes.map(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth, font: parseFloat(getComputedStyle(el).fontSize) })));
  for (const metric of metrics) {
    expect(metric.width).toBeLessThanOrEqual(layout.available);
    expect(metric.scroll).toBeLessThanOrEqual(metric.client + 1);
    expect(metric.font).toBeGreaterThanOrEqual(layout.large ? 18 : 16);
  }
  await writeFile(prefix + '-metrics.json', JSON.stringify(metrics, null, 2));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-diss-tool-status]']] }));
  await writeFile(prefix + '-axe.json', JSON.stringify(audit, null, 2));
  expect(audit.violations).toEqual([]);
});

test('native action handoff follows reflection, second pin, and final probe without advancing work', async ({ page }) => {
  test.skip(baseline);
  await mount(page, 1180, 1180);
  const before = await state(page), steps: any[] = [];
  const actions = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  const plans = [0, 1, 2, 0, 1, 2], explanations = [1, 0, 0, 1, 2, 0];
  for (const [index, action] of actions.entries()) {
    await prepare(page, action, plans[index]);
    const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next');
    await equivalent.click();
    if (action === 'pin') {
      const firstPin = await state(page);
      expect(firstPin.procedureByLayer.skin.pins).toHaveLength(1);
      expect(firstPin.procedureFeedback.message).toContain('First stabilizer placed.');
      expect(firstPin.procedureFeedback.message).toContain('Next: Place the opposing body-wall anchor.');
      expect(firstPin.procedureFeedback.message).not.toContain(reflectionCue);
      await expect(checkpoint(page)).toHaveAttribute('data-phase', 'perform');
      steps.push({ action: 'first pin', message: firstPin.procedureFeedback.message });
      await equivalent.click();
    }
    const performed = await feedbackMatchesState(page, action);
    const procedure = performed.procedureByLayer.skin;
    expect(procedure.learningChecks[action].reflectionCorrect).not.toBe(true);
    expect(procedure.actionLog).toHaveLength(index + (index >= 4 ? 2 : 1));
    expect(savedWork(performed)).toEqual(savedWork(before));
    steps.push({ action, message: performed.procedureFeedback.message, history: procedure.history });
    // Reflection is an explicit learner decision and does not perform the next action.
    await checkpoint(page).locator('.diss-learning-check__option').nth(explanations[index]).click();
    const explained = await state(page);
    expect(explained.procedureByLayer.skin.actionLog).toEqual(procedure.actionLog);
    expect(explained.procedureByLayer.skin.learningChecks[action].reflectionCorrect).toBe(true);
  }
  const final = await state(page);
  expect(final.procedureByLayer.skin.actionLog).toHaveLength(7);
  expect(savedWork(final)).toEqual(savedWork(before));
  await writeFile(`${out}/native-sequence.json`, JSON.stringify(steps, null, 2));
});
