import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-checkpoint-clarity-2026-09-30';
const baseline = process.env.DISSECTION_CHECKPOINT_BASELINE === '1';
const captureStyle = '.diss-next-action { position: static !important; }';
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'advanced', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const reflecting = { procedureByLayer: { skin: { inspected: true, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } } } };
const savedTissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 123456, consequences: [] };

test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  const layerState = (state as any).procedureByLayer || {};
  const procedureByLayer = { ...layerState, skin: { tissueState: savedTissue, ...layerState.skin } };
  await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap { width:100% !important; max-width:${available}px; }` });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    const p = d.procedureByLayer?.skin || {};
    return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, revealed: d.revealedLayers, instrument: d.activeInstrument,
      physical: { inspected: !!p.inspected, incisionStarted: !!p.incisionStarted, incisionExtended: !!p.incisionExtended, retracted: !!p.retracted, pins: p.pins || [], probed: !!p.probed, tissue: p.tissueState },
      checks: p.learningChecks || {}, guidedStep: d.guidedStep, pending: d.guidedObservationPending };
  });
}

async function checkReadable(page: Page, selector: string, name: string, available: number, large = false) {
  const panel = page.locator(selector);
  await panel.screenshot({ path: `${out}/after-${name}.png`, style: captureStyle });
  const metrics = await panel.evaluate(el => ({ width: el.getBoundingClientRect().width, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
    choices: Array.from(el.querySelectorAll('.diss-learning-check__option')).map(node => ({ height: node.getBoundingClientRect().height, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })),
    text: Array.from(el.querySelectorAll('h3, .diss-learning-check__eyebrow, .diss-learning-check__prompt, .diss-learning-check__phase, .diss-learning-check__phase-status, .diss-learning-check__answer, .diss-learning-check__marker, .diss-learning-check__keyboard-help, .diss-learning-check__feedback, .diss-learning-check__perform, .diss-learning-check__action')).map(node => ({ text: node.textContent, size: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })) }));
  await writeFile(`${out}/${name}.json`, JSON.stringify(metrics, null, 2));
  expect(metrics.width).toBeLessThanOrEqual(available);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  for (const choice of metrics.choices) {
    expect(choice.height).toBeGreaterThanOrEqual(63.9);
    expect(choice.scrollWidth).toBeLessThanOrEqual(choice.clientWidth + 1);
  }
  for (const text of metrics.text) {
    expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9);
    expect(text.clipped, text.text || '').toBe(false);
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async selector => (window as any).axe.run({ include: [[selector]] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }), selector);
  await writeFile(`${out}/axe-${name}.json`, JSON.stringify(audit, null, 2));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
}

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 },
  { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 },
  { name: 'forced-colors', width: 390, available: 390, forced: true },
]) {
  test(`checkpoint ${name} keeps readable answers and original names`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
    const panel = page.locator('#diss-learning-checkpoint');
    const choices = panel.locator('.diss-learning-check__option');
    const names = await choices.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label') || node.textContent));
    if (baseline) {
      await writeFile(`${out}/before-${name}-names.json`, JSON.stringify(names, null, 2));
      await panel.screenshot({ path: `${out}/before-${name}.png`, style: captureStyle }); return;
    }
    const before = await evidence(page);
    const original = JSON.parse(await readFile(`${out}/before-${name}-names.json`, 'utf8'));
    await expect(choices).toHaveCount(3);
    for (let i = 0; i < original.length; i++) await expect(choices.nth(i)).toHaveAccessibleName(original[i]);
    await expect(panel.locator('[aria-current="step"] .diss-learning-check__phase-status')).toHaveText('Current');
    await checkReadable(page, '#diss-learning-checkpoint', name, available, !!large);
    await choices.nth(1).focus(); await expect(choices.nth(1)).toBeFocused();
    await choices.nth(1).screenshot({ path: `${out}/focus-${name}.png` });
    expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  });
}

test('reflection is readable and verifies only the explicit explanation', async ({ page }) => {
  await mount(page, reflecting);
  const panel = page.locator('#diss-learning-checkpoint');
  await expect(panel).toHaveAttribute('data-phase', 'reflect');
  if (baseline) { await panel.screenshot({ path: `${out}/before-reflection.png`, style: captureStyle }); return; }
  await checkReadable(page, '#diss-learning-checkpoint', 'reflection', 390);
  const before = await evidence(page);
  const choices = panel.locator('.diss-learning-check__option');
  await choices.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(choices.nth(1)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-phase', 'predict');
  await expect(panel).toHaveAttribute('data-learning-action', 'scalpel');
  await expect(page.locator('#diss-learning-check-title')).toBeFocused();
  const after = await evidence(page);
  expect(after.checks.inspect.reflectionCorrect).toBe(true);
  expect(after.checks.inspect.reflectionAttempts).toBe(1);
  expect({ ...after, checks: before.checks }).toEqual(before);
});

test('keyboard browsing, coaching and explicit confirmation preserve specimen progress', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page);
  const panel = page.locator('#diss-learning-checkpoint');
  const choices = panel.locator('.diss-learning-check__option');
  const before = await evidence(page);
  await choices.first().focus();
  const intercepted = await choices.first().evaluate(node => [
    { key: 'ArrowRight', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }, { key: 'End', shiftKey: true },
    { key: 'Home', metaKey: true }, { key: 'ArrowRight', isComposing: true }, { key: 'ArrowRight', keyCode: 229 },
  ].map(options => { const event = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(event); return event.defaultPrevented; }));
  expect(intercepted).toEqual([false, false, false, false, false, false]);
  await expect(choices.first()).toBeFocused();
  for (const [key, index] of [['End', 2], ['ArrowRight', 0], ['ArrowDown', 1], ['ArrowUp', 0], ['ArrowLeft', 2], ['Home', 0]] as const) {
    await page.keyboard.press(key); await expect(choices.nth(index)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  }
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
  await expect(panel).toHaveAttribute('data-phase', 'predict');
  await expect(choices.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(choices.nth(1).locator('.diss-learning-check__marker')).toHaveText('Review choice');
  await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-learning-check-feedback');
  await checkReadable(page, '#diss-learning-checkpoint', 'coaching', 390);
  const coached = await evidence(page);
  expect(coached.checks.inspect.predictionCorrect).toBe(false);
  expect(coached.checks.inspect.predictionAttempts).toBe(1);
  expect({ ...coached, checks: before.checks }).toEqual(before);
  await choices.first().focus(); await page.keyboard.press('Enter');
  await expect(panel).toHaveAttribute('data-phase', 'perform');
  await expect(page.locator('#diss-canvas')).toBeFocused();
  const confirmed = await evidence(page);
  expect(confirmed.checks.inspect.predictionCorrect).toBe(true);
  expect(confirmed.checks.inspect.predictionAttempts).toBe(2);
  expect({ ...confirmed, checks: before.checks }).toEqual(before);
});

test('confirmed plan shortcuts focus the required instrument and specimen', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { procedureByLayer: { skin: { learningChecks: { inspect: { predictionCorrect: true } } } } });
  const panel = page.locator('#diss-learning-checkpoint');
  await expect(panel).toHaveAttribute('data-phase', 'perform');
  await checkReadable(page, '#diss-learning-checkpoint', 'perform', 390);
  const before = await evidence(page);
  await panel.getByRole('button', { name: 'Prepare Probe', exact: true }).click();
  await expect(page.locator('#diss-instrument-probe')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.techniquePanelOpen)).toBe(true);
  expect(await evidence(page)).toEqual(before);
  await panel.getByRole('button', { name: 'Go to specimen', exact: true }).click();
  await expect(page.locator('#diss-canvas')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
});

test('guided observation browsing and coaching require explicit evidence confirmation', async ({ page }) => {
  test.skip(baseline, 'Baseline captures only.');
  await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], guidedObservationPending: 'ventral_skin' });
  const panel = page.locator('#diss-guided-observation-check');
  const choices = panel.locator('.diss-learning-check__option');
  await expect(choices).toHaveCount(3);
  await checkReadable(page, '#diss-guided-observation-check', 'guided', 390);
  const before = await evidence(page);
  await choices.first().focus(); await page.keyboard.press('ArrowRight');
  await expect(choices.nth(1)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  await page.keyboard.press('Enter');
  await expect(choices.nth(1).locator('.diss-learning-check__marker')).toHaveText('Review choice');
  await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-guided-observation-feedback');
  expect(await evidence(page)).toEqual(before);
  await choices.first().focus(); await page.keyboard.press('Enter');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('#diss-canvas')).toBeFocused();
  const after = await evidence(page);
  expect(after.guidedStep).toBe(1); expect(after.pending).toBeNull();
  expect(after.verified['frog|ventral_skin'].status).toBe('verified');
  expect({ ...after, verified: before.verified, guidedStep: before.guidedStep, pending: before.pending }).toEqual(before);
});

for (const mode of ['quiz', 'practical']) {
  test(`${mode} keeps planning checkpoints hidden`, async ({ page }) => {
    test.skip(baseline, 'Baseline captures only.');
    await mount(page, { quizMode: true, practicalMode: mode === 'practical', practicalTimer: mode === 'practical' ? 300 : 0, practicalEndsAt: mode === 'practical' ? Date.now() + 300000 : 0, practicalTargetIds: mode === 'practical' ? ['ventral_skin', 'tympanum'] : [] });
    if (mode === 'practical') expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
    await expect(page.locator('.diss-learning-check')).toHaveCount(0);
  });
}
