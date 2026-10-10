import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_MONITOR_OUTPUT || 'test-results/dissection-monitor-handoff';
const baseline = process.env.DISSECTION_MONITOR_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const procedureBase = { tissueState: tissue, errors: 0, protocolDeviations: 0, history: [], actionLog: [], cautionLog: [] };
const complete = { ...procedureBase, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'probe', selectedOrgan: null, revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: true, procedureScenario: 'precision-access', organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false, simplifiedInstructions: true };
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', e => list.push(e.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page)).toEqual([]); });

async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function mount(page: Page, phase: string, width: number, available: number, large = false, contrast = false) {
  const procedure = phase === 'final'
    ? { ...complete, learningChecks: { ...complete.learningChecks, probe: { predictionCorrect: true, reflectionCorrect: false } } }
    : phase === 'reflect'
      ? { ...procedureBase, inspected: true, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } }
      : { ...procedureBase, learningChecks: phase === 'perform' ? { inspect: { predictionCorrect: true, reflectionCorrect: false } } : {} };
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, activeInstrument: phase === 'perform' ? 'scalpel' : initial.activeInstrument, techniquePanelOpen: phase !== 'perform', procedureByLayer: { skin: procedure }, largeText: large, highContrast: contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  const monitor = page.locator('.diss-field-monitor');
  await expect(monitor).not.toHaveAttribute('open', '');
  await page.locator('#diss-field-monitor-summary').click();
  await expect(monitor).toHaveAttribute('open', '');
}
async function captureCues(page: Page, name: string) {
  const cues = {
    monitor: await page.locator('.diss-stage__telemetry-prepare').innerText(),
    monitorName: await page.locator('.diss-stage__telemetry-prepare').getAttribute('aria-label'),
    summary: await page.locator('#diss-procedure-summary').innerText(),
    heading: await page.locator('#diss-procedure-title').innerText(),
    simple: await page.locator('#diss-active-tool-help').innerText(),
    progressName: await page.locator('.diss-procedure__steps').getAttribute('aria-label'),
  };
  await writeFile(`${out}/${name}-cues.json`, JSON.stringify(cues, null, 2));
  for (const [suffix, selector] of [['monitor', '.diss-stage__telemetry-foot'], ['summary', '#diss-procedure-summary'], ['heading', '#diss-procedure-title'], ['simple', '#diss-active-tool-help']]) {
    await page.locator(selector).screenshot({ path: `${out}/${name}-${suffix}.png`, style: '.diss-next-action{position:static!important;}' });
  }
  return cues;
}
async function auditAction(page: Page, action: Locator, name: string, width: number, large = false) {
  const foot = page.locator('.diss-stage__telemetry-foot');
  const metrics = await foot.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth, controls: Array.from(el.querySelectorAll('button')).map(node => ({ text: node.textContent, font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth, height: node.getBoundingClientRect().height })) }));
  expect(metrics.width).toBeLessThanOrEqual(width); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const control of metrics.controls) { expect(control.font).toBeGreaterThanOrEqual(large ? 18 : 16); expect(control.height).toBeGreaterThanOrEqual(48); expect(control.scroll).toBeLessThanOrEqual(control.client + 1); }
  await page.locator('#diss-field-monitor-summary').focus();
  await page.keyboard.press('Tab');
  await expect(action).toBeFocused();
  const focus = await action.evaluate(node => ({ width: parseFloat(getComputedStyle(node).outlineWidth), style: getComputedStyle(node).outlineStyle }));
  expect(focus.width).toBeGreaterThanOrEqual(3); expect(focus.style).toBe('solid');
  const cues = await page.locator('#diss-procedure-summary, #diss-procedure-title, #diss-active-tool-help').evaluateAll(nodes => nodes.map(node => ({ id: node.id, width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth, fonts: (node.children.length ? Array.from(node.children) : [node]).map(child => parseFloat(getComputedStyle(child).fontSize)) })));
  for (const cue of cues) { expect(cue.width).toBeLessThanOrEqual(width); expect(cue.scroll).toBeLessThanOrEqual(cue.client + 1); for (const font of cue.fonts) expect(font).toBeGreaterThanOrEqual(large ? 18 : 16); }
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify({ ...metrics, focus, cues }, null, 2));
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-stage__telemetry-foot']] }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
}

for (const layout of [
  { name: 'phone', width: 320, available: 320, phase: 'plan' },
  { name: 'desktop-final', width: 1440, available: 1180, phase: 'final' },
  { name: 'embedded-large', width: 1440, available: 320, phase: 'reflect', large: true, contrast: true },
  { name: 'forced-colors', width: 390, available: 390, phase: 'reflect', forced: true },
]) test(`monitor handoff ${layout.name} agrees with the required learning checkpoint`, async ({ page }) => {
  if (layout.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, layout.phase, layout.width, layout.available, !!layout.large, !!layout.contrast);
  if (baseline) { await captureCues(page, `before-${layout.name}`); return; }
  const action = page.locator('.diss-stage__telemetry-prepare');
  const label = layout.phase === 'plan' ? 'Review plan' : 'Explain result';
  await expect(action).toBeEnabled(); await expect(action).toHaveText(label); await expect(action).toHaveAccessibleName(new RegExp(`^${label}: .+`));
  await expect(action).toHaveAttribute('aria-controls', 'diss-learning-checkpoint');
  const summary = page.locator('#diss-procedure-summary'), heading = page.locator('#diss-procedure-title'), simple = page.locator('#diss-active-tool-help');
  await expect(summary).toContainText(layout.phase === 'plan' ? /plan/i : /expla/i);
  await expect(heading).toContainText(layout.phase === 'plan' ? /plan/i : /expla/i);
  await expect(simple).toContainText(layout.phase === 'plan' ? /plan/i : /expla/i);
  for (const cue of [summary, heading, simple]) await expect(cue).not.toContainText(/protocol complete|ready to complete|done\. complete/i);
  await expect(page.locator('.diss-procedure__steps')).toHaveAttribute('role', 'group');
  await expect(page.locator('.diss-procedure__steps')).toHaveAccessibleName(/\d of 6 actions performed/i);
  const before = await state(page);
  await auditAction(page, action, layout.name, layout.available, !!layout.large);
  await captureCues(page, `after-${layout.name}`);
  await action.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-learning-check-title')).toBeFocused();
  expect(await state(page)).toEqual(before);
  if (layout.phase === 'final') {
    await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
    await expect(action).toHaveText('Technique complete'); await expect(action).toBeDisabled();
    await expect(action).not.toHaveAttribute('aria-controls', 'diss-learning-checkpoint');
    await expect(summary).toContainText(/technique complete/i); await expect(heading).toContainText(/technique complete/i);
    const after = await state(page);
    expect(after.procedureByLayer.skin.learningChecks.probe.reflectionCorrect).toBe(true);
    expect({ ...after.procedureByLayer.skin, learningChecks: before.procedureByLayer.skin.learningChecks }).toEqual(before.procedureByLayer.skin);
    for (const key of ['activeInstrument', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'quizScore', 'quizTotal', 'revealedLayers']) expect(after[key]).toEqual(before[key]);
    await captureCues(page, 'after-final-explanation');
  }
});

test('monitor handoff normal prepare opens the planner without selecting or performing a tool', async ({ page }) => {
  test.skip(baseline, 'Baseline comparison captures pending plan and final explanation only.');
  await mount(page, 'perform', 1280, 1180);
  const action = page.locator('.diss-stage__telemetry-prepare');
  await expect(action).toHaveText('Prepare next'); await expect(action).toBeEnabled();
  const before = await state(page);
  await action.click();
  await expect(page.locator('#diss-procedure-panel')).toHaveAttribute('open', '');
  await expect(page.locator('#diss-instrument-probe')).toBeFocused();
  const after = await state(page);
  expect(after.techniquePanelOpen).toBe(true);
  for (const key of ['procedureByLayer', 'activeInstrument', 'anatomicalView', 'toolCalibration', 'organNotes', 'organConfidence', 'verifiedIdentifications', 'quizScore', 'quizTotal', 'revealedLayers']) expect(after[key]).toEqual(before[key]);
  await captureCues(page, 'after-normal-prepare');
});
