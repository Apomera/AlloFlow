import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = 'reports/dissection-supported-feedback-2026-10-01';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const captureStyle = '.diss-next-action { position:static!important; }';
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const metric = { alignment: 94, coverage: 88, smoothness: 89, control: 91, angleControl: 90, precision: 92 };
const path = [{ x: .5, y: .3 }, { x: .5, y: .55 }, { x: .5, y: .8 }];
const names = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'pin', 'probe'];
const labels = ['Inspected', 'Incised', 'Extended', 'Retracted', 'First stabilizer', 'Second stabilizer', 'Probed'];
const actions = names.map((action, i) => ({ action, label: labels[i], at: 100 + i, inputType: i === 2 ? 'motor-neutral' : 'mouse', assistance: i === 2 ? 'motor-neutral' : 'none', outcome: 'RECORDED', point: { x: .5, y: .4 + i * .04 }, tissueBefore: { ...tissue, clarity: 80 + i }, tissueAfter: { ...tissue, clarity: 82 + i } }));
const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: true }]));
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: names, actionLog: actions, incisionPath: path, extensionPath: path, incisionMetrics: metric, extensionMetrics: metric, inputType: 'mouse', errors: 0, learningChecks: checks };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = complete) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: { tissueState: tissue, ...procedure } } } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function evidence(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, metrics: Array.from(document.querySelectorAll('.diss-procedure__metrics .diss-procedure__metric')).map(node => node.textContent) };
  });
}
async function openFeedback(page: Page) {
  const details = page.locator('.diss-layer-review__feedback-help');
  if (!(await details.evaluate((node: HTMLDetailsElement) => node.open))) await details.locator('summary').click();
  return details;
}

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) {
  test(`feedback ${name} describes modeled results with readable controls`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
    const before = await evidence(page), panel = page.locator('#diss-layer-review');
    await expect(panel).toHaveAttribute('data-review-state', 'Inspect structures');
    await expect(panel.locator('.diss-layer-review__model-result')).toContainText('Simulation result:');
    await expect(panel.locator('.diss-layer-review__result-list li')).toHaveCount(5);
    await expect(panel.locator('.diss-layer-review__result-list')).toHaveCSS('list-style-type', 'disc');
    await expect(panel).not.toContainText('used steady tool control'); await expect(panel).not.toContainText('Strength:');
    await expect(page.locator('.diss-layer-review__feedback-help')).not.toHaveAttribute('open');
    await panel.screenshot({ path: `${out}/${name}-overview.png`, style: captureStyle });
    const help = await openFeedback(page);
    await expect(help).toContainText('Supported controls can contribute to this score.');
    await expect(help.locator('.diss-layer-review__stroke-source')).toContainText('Stroke feedback: Scissors');
    await expect(help.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
    await expect(help).toContainText('The supported control supplied this path.');
    await help.getByRole('button', { name: 'Review scored stroke', exact: true }).focus();
    await help.screenshot({ path: `${out}/${name}-feedback-focus.png` });
    await panel.screenshot({ path: `${out}/${name}-expanded.png`, style: captureStyle });
    const metrics = await panel.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
      targets: Array.from(node.querySelectorAll('button, summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ height: el.getBoundingClientRect().height, scroll: el.scrollWidth, client: el.clientWidth })),
      text: Array.from(node.querySelectorAll('h3,h4,p,span,small,strong,b,button,summary,li')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
    await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
    expect(metrics.width).toBeLessThanOrEqual(available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
    for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.scroll).toBeLessThanOrEqual(target.client + 1); }
    for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
    await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations.map((v: any) => v.id)).toEqual([]);
    expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  });
}

test('stroke input follows the scored cut rather than a later supported action', async ({ page }) => {
  await mount(page, {}, 390, 390, { ...complete, inputType: 'motor-neutral', actionLog: actions.map((entry, i) => i === 2 ? { ...entry, inputType: 'pen', assistance: 'none' } : i === 6 ? { ...entry, inputType: 'motor-neutral', assistance: 'motor-neutral' } : entry) });
  const help = await openFeedback(page), before = await evidence(page);
  for (const [inputType, label] of [['mouse', 'Mouse input'], ['pen', 'Pen input'], ['stylus', 'Pen input'], ['touch', 'Touch input'], ['pointer', 'Pointer input'], ['keyboard', 'Keyboard input']] as const) {
    await page.evaluate(type => {
      const ctx = (window as any).__ctx, d = ctx.toolData.dissection, p = d.procedureByLayer.skin;
      ctx.updateMulti('dissection', { procedureByLayer: { ...d.procedureByLayer, skin: { ...p, actionLog: p.actionLog.map((entry: any, i: number) => i === 2 ? { ...entry, inputType: type } : entry) } } });
    }, inputType);
    await expect(help.locator('.diss-layer-review__input-badge')).toHaveText(label);
    await expect(help).not.toContainText('The supported control supplied this path.');
    expect((await evidence(page)).metrics).toEqual(before.metrics);
  }
});

test('missing stroke history preserves unknown input even when the latest action was supported', async ({ page }) => {
  await mount(page, {}, 390, 390, { ...complete, inputType: 'motor-neutral', actionLog: [{ ...actions[6], inputType: 'motor-neutral', assistance: 'motor-neutral' }] });
  const before = await evidence(page), help = await openFeedback(page);
  await expect(help).toContainText('Stroke feedback: Scissors');
  await expect(help.locator('.diss-layer-review__input-badge')).toHaveText('Input method not recorded');
  await expect(help).toContainText('its input method is not recorded');
  await expect(help.getByRole('button', { name: 'Review scored stroke', exact: true })).toHaveCount(0);
  expect(await evidence(page)).toEqual(before);
});

test('reviewing scored stroke selects its saved response and preserves scores and evidence', async ({ page }) => {
  await mount(page, {}, 1180, 1180); const before = await evidence(page), help = await openFeedback(page);
  await help.getByRole('button', { name: 'Review scored stroke', exact: true }).click();
  await expect(page.locator('#diss-layer-response-title')).toBeFocused();
  await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Extended');
  await expect(page.locator('#diss-procedure-record-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.diss-layer-review__history')).toHaveAttribute('open');
  await expect(page.locator('#diss-layer-history-current')).toHaveText('Reviewing record 3 of 7: Extended');
  await expect(page.locator('.diss-layer-review__delta').first()).toContainText('82 → 84');
  await page.getByRole('button', { name: 'Return to history', exact: true }).click(); await expect(page.locator('#diss-procedure-record-2')).toBeFocused();
  expect(await evidence(page)).toEqual(before);
  await page.locator('#diss-procedure-record-2').screenshot({ path: `${out}/scored-stroke-history-focus.png` });
});

test('unscored work explains the score without inventing a stroke or learning credit', async ({ page }) => {
  await mount(page, {}, 390, 390, { tissueState: tissue, inspected: true, history: ['inspect'], actionLog: [actions[0]], learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } });
  const before = await evidence(page), help = await openFeedback(page);
  await expect(help).toContainText('No scored stroke saved'); await expect(help.locator('.diss-layer-review__input-badge')).toHaveCount(0);
  await expect(help.getByRole('button', { name: 'Review scored stroke', exact: true })).toHaveCount(0);
  await expect(page.locator('.diss-layer-review__model-result')).toHaveCount(0);
  await expect(page.locator('#diss-layer-review')).toContainText('0 of 6 actions have verified plans and explanations.');
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed'); expect(await evidence(page)).toEqual(before);
});

test('stroke feedback identifies the displayed metrics when a later incision is recorded', async ({ page }) => {
  await mount(page, {}, 390, 390, { ...complete, inputType: 'touch', actionLog: [...actions, { ...actions[1], at: 500, label: 'Repeated incision', inputType: 'touch', assistance: 'none' }] });
  const before = await evidence(page), help = await openFeedback(page);
  await expect(page.locator('.diss-layer-review__selection')).toHaveText('Latest action: Repeated incision');
  await expect(help).toContainText('Stroke feedback: Scissors'); await expect(help).not.toContainText('Latest scored stroke');
  await expect(help.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
  await help.getByRole('button', { name: 'Review scored stroke', exact: true }).click();
  await expect(page.locator('#diss-layer-response-title')).toBeFocused();
  await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Extended');
  await expect(page.locator('#diss-procedure-record-2')).toHaveAttribute('aria-pressed', 'true');
  expect(await evidence(page)).toEqual(before);
});

test('undoing a scored extension returns feedback to the remaining incision', async ({ page }) => {
  test.setTimeout(240000);
  await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0 }, 1180, 1180, { tissueState: { ...tissue, exposure: 8, stability: 19, risk: 11 } });
  for (const [i, action] of ['inspect', 'scalpel', 'scissors'].entries()) {
    const checkpoint = page.locator('#diss-learning-checkpoint');
    await expect(checkpoint).toHaveAttribute('data-learning-action', action);
    await checkpoint.locator('.diss-learning-check__option').nth([0, 1, 2][i]).click();
    await checkpoint.getByRole('button', { name: /^Prepare / }).click();
    await page.locator(`#diss-instrument-${action === 'inspect' ? 'probe' : action}`).click();
    await page.locator('#diss-procedure-panel .diss-procedure__next').click();
    await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
    await checkpoint.locator('.diss-learning-check__option').nth([1, 0, 0][i]).click();
  }
  const help = await openFeedback(page); await expect(help).toContainText('Stroke feedback: Scissors');
  await page.getByRole('button', { name: 'Undo the last technique action and visually restore the previous tissue state', exact: true }).click();
  await expect(help).toContainText('Stroke feedback: Scalpel'); await expect(help.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
  const before = await evidence(page); await help.getByRole('button', { name: 'Review scored stroke', exact: true }).click();
  await expect(page.locator('#diss-layer-response-title')).toBeFocused(); await expect(page.locator('.diss-layer-review__selection')).toHaveText('Latest action: Incised');
  expect(await evidence(page)).toEqual(before);
});

for (const practical of [false, true]) {
  test(`${practical ? 'timed practical' : 'quiz'} conceals technique feedback guidance`, async ({ page }) => {
    await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], showProcedureDebrief: true });
    if (practical) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
    await expect(page.locator('.diss-layer-review__feedback-help')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review scored stroke', exact: true })).toHaveCount(0);
  });
}

test('beginner completes supported practice, reviews its stroke, and retains assessment evidence', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0 }, 1180, 1180,
    { tissueState: { ...tissue, exposure: 8, stability: 19, clarity: 81, risk: 11, lastAction: 'prepared' } });
  const planChoices = [0, 1, 2, 0, 1, 2], reflections = [1, 0, 0, 1, 2, 0];
  for (const [i, action] of ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].entries()) {
    const checkpoint = page.locator('#diss-learning-checkpoint');
    await expect(checkpoint).toHaveAttribute('data-learning-action', action); await expect(checkpoint).toHaveAttribute('data-phase', 'predict');
    await checkpoint.locator('.diss-learning-check__option').nth(planChoices[i]).click(); await expect(checkpoint).toHaveAttribute('data-phase', 'perform');
    await checkpoint.getByRole('button', { name: /^Prepare / }).click();
    const tool = action === 'inspect' ? 'probe' : action;
    await expect(page.locator(`#diss-instrument-${tool}`)).toBeFocused(); await page.locator(`#diss-instrument-${tool}`).click();
    const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next'); await expect(equivalent).toBeEnabled(); await equivalent.click();
    if (tool === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await equivalent.click(); }
    await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
    await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
    await checkpoint.locator('.diss-learning-check__option').nth(reflections[i]).click();
  }
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures');
  await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  await expect(page.locator('.diss-layer-review__model-result')).toContainText('Simulation result:');
  await expect(page.locator('#diss-layer-review')).not.toContainText('used steady tool control');
  const physical = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin);
  expect(physical.actionLog).toHaveLength(7); expect(physical.actionLog.every((entry: any) => entry.assistance === 'motor-neutral')).toBe(true);
  const beforeReview = await evidence(page), help = await openFeedback(page);
  await expect(help).toContainText('Stroke feedback: Scissors'); await expect(help.locator('.diss-layer-review__input-badge')).toHaveText('Supported technique');
  await help.getByRole('button', { name: 'Review scored stroke', exact: true }).click();
  await expect(page.locator('#diss-layer-response-title')).toBeFocused(); await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Extended');
  expect(await evidence(page)).toEqual(beforeReview);
  await page.locator('#diss-layer-review').screenshot({ path: `${out}/journey-reviewed-stroke.png`, style: captureStyle });
  await page.locator('#diss-canvas').focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  await page.locator('.diss-evidence-note').fill('I observed the ventral surface boundary and checked it against the orientation landmarks.');
  await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check();
  const saved = await evidence(page);
  await page.getByRole('button', { name: 'Practice assessment', exact: true }).click(); await expect(page.locator('#diss-quiz-panel')).toBeVisible();
  await expect(page.locator('.diss-layer-review__feedback-help')).toHaveCount(0);
  await page.locator('#diss-quiz-panel .diss-quiz-option').first().click();
  const next = page.locator('#diss-quiz-panel').getByRole('button', { name: /^Next Question/ });
  if (!(await next.isVisible())) await page.locator('#diss-quiz-panel').getByRole('button', { name: /Show answer|Reveal answer/ }).click();
  await next.click(); await expect(page.locator('#diss-quiz-panel')).toBeFocused();
  const final = await evidence(page); expect(final.notes).toEqual(saved.notes); expect(final.confidence).toEqual(saved.confidence); expect(final.procedures).toEqual(saved.procedures);
  await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2)); expect(errors).toEqual([]);
});
