import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_AVAILABILITY_OUTPUT || 'test-results/dissection-technique-availability';
const baseline = process.env.DISSECTION_AVAILABILITY_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [], learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe', selectedOrgan: null, revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: true, procedureScenario: 'precision-access', organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page)).toEqual([]); });
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function mount(page: Page, phase: string, width: number, available: number, large = false, contrast = false) {
  const procedure = phase === 'final' ? { ...complete, learningChecks: { ...complete.learningChecks, probe: { predictionCorrect: true, reflectionCorrect: false } } } : phase === 'reflect' ? { tissueState: tissue, inspected: true, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } } : { tissueState: tissue, learningChecks: {} };
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, largeText: large, highContrast: contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
for (const layout of [
  { name: 'phone', width: 320, available: 320, phase: 'plan' },
  { name: 'desktop-final', width: 1440, available: 1180, phase: 'final' },
  { name: 'embedded-large', width: 1440, available: 320, phase: 'plan', large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, phase: 'reflect', forced: true },
]) test(`technique availability ${layout.name} is readable and returns to the required checkpoint`, async ({ page }) => {
  if (layout.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, layout.phase, layout.width, layout.available, !!layout.large, !!layout.contrast);
  const action = page.locator('#diss-procedure-panel .diss-procedure__next');
  if (baseline) {
    await action.locator('..').screenshot({ path: `${out}/before-${layout.name}.png`, style: '.diss-next-action{position:static!important;}' });
    await writeFile(`${out}/before-${layout.name}.json`, JSON.stringify({ text: await action.innerText(), label: await action.getAttribute('aria-label'), noteClass: await page.locator('#diss-equivalent-technique-note').getAttribute('class') }, null, 2));
    return;
  }
  const group = page.locator('.diss-equivalent-action'), note = page.locator('#diss-equivalent-technique-note'), link = page.locator('#diss-equivalent-checkpoint-link');
  await expect(action).toBeDisabled(); await expect(note).toBeVisible();
  await expect(link).toHaveAccessibleName(layout.phase === 'plan' ? 'Review plan' : 'Explain result');
  await expect(link).toHaveAccessibleDescription(await note.innerText());
  await expect(link).toHaveAttribute('aria-controls', 'diss-learning-checkpoint');
  await expect(action).toHaveAttribute('aria-describedby', 'diss-equivalent-technique-note');
  if (layout.phase === 'final') { await expect(action).toHaveText('Final explanation needed'); await expect(action).toHaveAccessibleName('Final explanation needed. Complete the reflection checkpoint before continuing.'); }
  const before = await state(page);
  await link.focus();
  const focusStyle = await link.evaluate(node => ({ width: parseFloat(getComputedStyle(node).outlineWidth), style: getComputedStyle(node).outlineStyle }));
  expect(focusStyle.width).toBeGreaterThanOrEqual(3); expect(focusStyle.style).toBe('solid');
  await group.screenshot({ path: `${out}/after-${layout.name}.png`, style: '.diss-next-action{position:static!important;}' });
  const metrics = await group.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth, text: Array.from(el.querySelectorAll('p,button')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth, height: node.getBoundingClientRect().height })) }));
  expect(metrics.width).toBeLessThanOrEqual(layout.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const item of metrics.text) { expect(item.font).toBeGreaterThanOrEqual(layout.large ? 18 : 16); expect(item.scroll).toBeLessThanOrEqual(item.client + 1); }
  expect(await link.evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  await writeFile(`${out}/${layout.name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-equivalent-action']] }));
  await writeFile(`${out}/${layout.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await page.keyboard.press('Enter'); await expect(page.locator('#diss-learning-check-title')).toBeFocused();
  expect(await state(page)).toEqual(before);
  if (layout.phase === 'final') {
    await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
    await expect(action).toHaveText('Technique complete'); await expect(action).toBeDisabled(); await expect(link).toHaveCount(0);
    await expect(note).toContainText('Technique actions and explanations are complete.');
    const after = await state(page);
    expect(after.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
    expect({ ...after.procedureByLayer.skin, learningChecks: before.procedureByLayer.skin.learningChecks }).toEqual(before.procedureByLayer.skin);
    for (const key of ['activeInstrument', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'quizScore', 'quizTotal', 'revealedLayers']) expect(after[key]).toEqual(before[key]);
    await group.screenshot({ path: `${out}/after-explanation-complete.png` });
  }
});
