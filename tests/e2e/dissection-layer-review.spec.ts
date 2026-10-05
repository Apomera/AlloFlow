import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-layer-review-2026-10-01';
const captureStyle = '.diss-next-action { position:static!important; }';
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: Date.now(), consequences: [] };
const actions = Array.from({ length: 8 }, (_, i) => ({ action: 'inspect', label: `Orientation check ${i + 1}`, at: 100 + i, outcome: 'ORIENTATION RECORDED', outcomeDetail: 'The recommended view and protected landmarks were checked before contact.', tone: 'success', point: { x: .5, y: .5 }, tissueBefore: { ...tissue, clarity: 70 + i, risk: 20 }, tissueAfter: { ...tissue, clarity: 75 + i, risk: 17 } }));
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, organNotes: { 'frog|ventral_skin': 'Keep this observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const recorded = { inspected: true, history: ['inspect'], actionLog: actions, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: false } } };
test.describe.configure({ retries: 0 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = recorded) {
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
    return { notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer };
  });
}
async function openHistory(page: Page) {
  const history = page.locator('.diss-layer-review__history');
  if (!(await history.evaluate((node: HTMLDetailsElement) => node.open))) await history.locator('summary').click();
}
async function readable(page: Page, name: string, available: number, large = false) {
  await openHistory(page);
  const panel = page.locator('#diss-layer-review');
  await panel.screenshot({ path: `${out}/${name}.png`, style: captureStyle });
  const metrics = await panel.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
    targets: Array.from(node.querySelectorAll('button, summary')).map(el => ({ height: el.getBoundingClientRect().height, scroll: el.scrollWidth, client: el.clientWidth })),
    text: Array.from(node.querySelectorAll('h3,h4,p,span,small,strong,b,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  expect(metrics.width).toBeLessThanOrEqual(available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.scroll).toBeLessThanOrEqual(target.client + 1); }
  for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2));
  expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
}

for (const { name, width, available, large, contrast, forced } of [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 },
  { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  { name: 'desktop', width: 1440, available: 1180 }, { name: 'forced-colors', width: 390, available: 390, forced: true },
]) {
  test(`layer review ${name} is readable outside closed technique controls`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    if (forced) await page.emulateMedia({ forcedColors: 'active' });
    await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
    const before = await evidence(page);
    const panel = page.locator('#diss-layer-review');
    await expect(panel).toBeVisible(); await expect(page.locator('#diss-procedure-panel')).not.toHaveAttribute('open');
    await expect(panel).toHaveAttribute('data-review-state', 'Explanation needed');
    await expect(panel).toContainText('1 of 6 protocol actions complete. 0 of 6 actions have verified plans and explanations.');
    await readable(page, name, available, !!large);
    await expect(panel.locator('.diss-procedure__timeline-entry')).toHaveCount(8);
    await panel.locator('.diss-procedure__timeline-entry').first().focus();
    await panel.locator('.diss-procedure__timeline-entry').first().screenshot({ path: `${out}/${name}-focus.png` });
    expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  });
}

test('history keyboard browsing is separate from selecting and replaying saved evidence', async ({ page }) => {
  await mount(page); await openHistory(page);
  const entries = page.locator('.diss-layer-review .diss-procedure__timeline-entry');
  const before = await evidence(page);
  await entries.first().focus();
  const prevented = await entries.first().evaluate(node => [
    { key: 'End', shiftKey: true }, { key: 'Home', ctrlKey: true }, { key: 'ArrowRight', altKey: true },
    { key: 'ArrowLeft', metaKey: true }, { key: 'End', isComposing: true }, { key: 'Home', keyCode: 229 },
  ].map(options => { const e = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(e); return e.defaultPrevented; }));
  expect(prevented).toEqual([false, false, false, false, false, false]);
  for (const [key, index] of [['End', 7], ['ArrowDown', 0], ['ArrowRight', 1], ['ArrowUp', 0], ['ArrowLeft', 7], ['Home', 0]] as const) {
    await page.keyboard.press(key); await expect(entries.nth(index)).toBeFocused();
    await expect(entries.last()).toHaveAttribute('aria-pressed', 'true'); expect(await evidence(page)).toEqual(before);
  }
  await page.keyboard.press('Enter');
  await expect(entries.first()).toHaveAttribute('aria-pressed', 'true'); await expect(entries.last()).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Orientation check 1');
  await expect(page.locator('.diss-layer-review__delta').first()).toContainText('70 → 75');
  await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message)).toContain('Selected response replay started');
  expect(await evidence(page)).toEqual(before);
  await page.locator('#diss-layer-review').screenshot({ path: `${out}/selected-response.png`, style: captureStyle });
});

test('review is requested explicitly before work and never invents missing snapshot values', async ({ page }) => {
  await mount(page, { techniquePanelOpen: true }, 390, 390, {});
  await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review layer', exact: true }).click();
  await expect(page.locator('#diss-layer-review-title')).toBeFocused();
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'In progress');
  await expect(page.locator('#diss-layer-review')).toContainText('0 of 6 protocol actions complete.');
  await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  await expect(page.locator('#diss-layer-review')).not.toContainText('Strength:');
  await page.locator('.diss-layer-review__history > summary').click();
  await expect(page.locator('.diss-layer-review__history')).not.toHaveAttribute('open');
  await expect(page.locator('.diss-layer-review__history > summary')).toBeFocused();
  await expect(page.locator('#diss-layer-review')).toBeVisible();
  await harness.unmount(page);
  await mount(page, {}, 390, 390, { ...recorded, actionLog: [{ ...actions[0], tissueBefore: undefined, tissueAfter: { clarity: 75 } }] });
  await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  await expect(page.locator('#diss-layer-review')).toContainText('No complete before-and-after tissue data was saved for this action.');
});

test('pending explanation takes priority and the shortcut only focuses the checkpoint', async ({ page }) => {
  await mount(page, { anatomicalView: 'dorsal' }); const before = await evidence(page);
  await page.getByRole('button', { name: 'Explain the response', exact: true }).click();
  await expect(page.locator('#diss-learning-check-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
});

for (const { name, state, procedure, label, target } of [
  { name: 'view', state: { anatomicalView: 'dorsal' }, procedure: {}, label: 'Check view', target: '#diss-view-cycle' },
  { name: 'optics', state: { lensFocusDepth: 'deep', lensMagnification: 6 }, procedure: {}, label: 'Adjust optics', target: '#diss-view-tools' },
  { name: 'dry tissue', state: {}, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review Dropper', target: '#diss-instrument-dropper' },
  { name: 'restricted recovery', state: { workspaceMode: 'advanced', procedureScenario: 'restricted-tray' }, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review tissue condition', target: '#diss-field-monitor-summary' },
  { name: 'calibration', state: { activeInstrument: 'scalpel', toolCalibration: { bladeAngle: 70 } }, procedure: {}, label: 'Adjust calibration', target: '#diss-calibration-range' },
]) {
  test(`current ${name} guidance focuses a usable control without changing the setup`, async ({ page }) => {
    await mount(page, { ...state, selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2, ...state }, 390, 390,
      { ...recorded, ...procedure, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
    const before = await evidence(page);
    const shortcut = page.locator('.diss-layer-review__next').getByRole('button', { name: label, exact: true });
    await expect(shortcut).toBeVisible(); await shortcut.click();
    await expect(page.locator(target)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  });
}

test('completion still requires the final explanation', async ({ page }) => {
  const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: action !== 'probe' }]));
  await mount(page, {}, 390, 390, { ...recorded, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .4, y: .3 }, { x: .6, y: .7 }], probed: true, learningChecks: checks });
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 protocol actions complete. 5 of 6 actions have verified');
  await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures');
  const before = await evidence(page); await page.getByRole('button', { name: 'Review next action', exact: true }).click();
  await expect(page.locator('#diss-next-action-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
});

for (const guided of [false, true]) {
  test(`${guided ? 'guided observation' : 'study tools'} review directs focus to an available destination`, async ({ page }) => {
    await mount(page, guided ? { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin'], guidedObservationPending: 'ventral_skin' } : { toolbarStudyOpen: true });
    const before = await evidence(page);
    await page.locator('.diss-layer-review__next').getByRole('button').click();
    await expect(page.locator(guided ? '#diss-guided-observation-check' : '#diss-route-explore')).toBeFocused();
    expect(await evidence(page)).toEqual(before);
  });
}

test('replaying an older stroke uses its saved contact rather than a later stroke path', async ({ page }) => {
  await mount(page, { instrumentVisuals: true, showProcedureDebrief: true }, 1180, 1180, {
    ...recorded, incisionStarted: true, incisionPath: [{ x: .45, y: .3 }, { x: .45, y: .8 }],
    actionLog: [{ ...actions[0], action: 'scalpel', label: 'Earlier incision', point: { x: .51, y: .6 } }, { ...actions[1], action: 'scalpel', label: 'Later incision', point: { x: .45, y: .8 } }],
  });
  const before = await evidence(page);
  await page.locator('.diss-layer-review .diss-procedure__timeline-entry').first().click();
  await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  const pulse = await page.locator('#diss-canvas').evaluate((canvas: any) => canvas._toolContactPulse);
  expect(pulse.x).toBe(.51); expect(pulse.y).toBe(.6); expect(pulse.tool).toBe('scalpel'); expect(pulse.replayPath).toEqual([]);
  expect(await evidence(page)).toEqual(before);
});

for (const practical of [false, true]) {
  test(`${practical ? 'timed practical' : 'quiz'} conceals reviews and preparation shortcuts`, async ({ page }) => {
    await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], showProcedureDebrief: true, techniquePanelOpen: true });
    if (practical) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
    await expect(page.locator('#diss-layer-review')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer', exact: true })).toHaveCount(0);
  });
}

test('beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0, workspaceMode: 'essentials' }, 1180, 1180, {});
  const planChoices = [0, 1, 2, 0, 1, 2]; const reflections = [1, 0, 0, 1, 2, 0];
  const actionNames = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  for (let i = 0; i < actionNames.length; i++) {
    const checkpoint = page.locator('#diss-learning-checkpoint');
    await expect(checkpoint).toHaveAttribute('data-learning-action', actionNames[i]); await expect(checkpoint).toHaveAttribute('data-phase', 'predict');
    await checkpoint.locator('.diss-learning-check__option').nth(planChoices[i]).click(); await expect(checkpoint).toHaveAttribute('data-phase', 'perform');
    await checkpoint.getByRole('button', { name: /^Prepare / }).click();
    const tool = actionNames[i] === 'inspect' ? 'probe' : actionNames[i];
    await expect(page.locator(`#diss-instrument-${tool}`)).toBeFocused(); await page.locator(`#diss-instrument-${tool}`).click();
    const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next');
    await expect(equivalent).toBeEnabled(); await equivalent.click();
    if (tool === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await equivalent.click(); }
    await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
    await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
    await checkpoint.locator('.diss-learning-check__option').nth(reflections[i]).click();
  }
  await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures');
  await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  const physical = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin);
  expect(physical.actionLog.length).toBe(7); expect(physical.actionLog.every((a: any) => a.assistance === 'motor-neutral')).toBe(true);
  await page.locator('#diss-canvas').focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  const note = page.locator('.diss-evidence-note'); await expect(note).toBeVisible();
  await note.fill('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check();
  const saved = await evidence(page); expect(Object.values(saved.notes)).toContain('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  await page.getByRole('button', { name: 'Practice assessment', exact: true }).click();
  await expect(page.locator('#diss-quiz-panel')).toBeVisible(); await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  await page.locator('#diss-quiz-panel .diss-quiz-option').first().click();
  const next = page.locator('#diss-quiz-panel').getByRole('button', { name: /^Next Question/ });
  if (!(await next.isVisible())) await page.locator('#diss-quiz-panel').getByRole('button', { name: /Show answer|Reveal answer/ }).click();
  await next.click(); await expect(page.locator('#diss-quiz-panel')).toBeFocused();
  const final = await evidence(page); expect(final.notes).toEqual(saved.notes); expect(final.confidence).toEqual(saved.confidence); expect(final.procedures).toEqual(saved.procedures);
  await page.locator('#diss-quiz-panel').screenshot({ path: `${out}/journey-assessment.png`, style: captureStyle });
  await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2)); expect(errors).toEqual([]);
});
