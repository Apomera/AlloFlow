import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_REVIEW_OUTPUT || 'test-results/dissection-replay-review';
// pauseAt fast-forwards to this target; the lead accommodates slow browser RPC delivery.
const clockPauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const path = [{ x: 0.47, y: 0.30 }, { x: 0.50, y: 0.48 }, { x: 0.53, y: 0.66 }];
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null,
  revealedLayers: { skin: true }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: true, procedureMode: 'independent',
  organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true },
  quizScore: 1, quizTotal: 2, soundEnabled: false, sceneDetail: false, _procedureDemo: null,
};
const procedure = {
  tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, errors: 0, protocolDeviations: 0,
  history: ['inspect', 'scalpel', 'scissors'], cautionLog: [], learningChecks: {}, incisionPath: path, extensionPath: path,
  incisionSamples: path.map((point, index) => ({ ...point, t: index * 100, pressure: 0.5 })),
  actionLog: [
    { action: 'inspect', label: 'Inspected', at: 100, inputType: 'button', assistance: 'motor-neutral', toolCalibration: { probePressure: 24 } },
    { action: 'scalpel', label: 'Incised', at: 200, inputType: 'pointer', assistance: 'independent' },
    { action: 'scissors', label: 'Extended', at: 300, inputType: 'button', assistance: 'motor-neutral' },
  ],
};
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message));
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as any).__reviewText = [];
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.matches('[data-diss-canvas]')) {
        const transform = this.getTransform(), measured = this.measureText(String(text)).width;
        const start = new DOMPoint(x, y).matrixTransform(transform);
        const end = new DOMPoint(x + measured, y).matrixTransform(transform);
        const density = (this.canvas as any)._dpr || 1;
        const box = ((this.canvas as any)._canvasHudBoxes || []).find((candidate: any) => candidate.id === 'replay');
        const inReplayCaption = !!box && start.x / density >= box.x && start.x / density <= box.x + box.width && start.y / density >= box.y && start.y / density <= box.y + box.height;
        (window as any).__reviewText.push({ text: String(text), inReplayCaption, x: start.x, y: start.y, end: end.x, width: this.canvas.width, height: this.canvas.height });
        if ((window as any).__reviewText.length > 2000) (window as any).__reviewText.splice(0, 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y); else original.call(this, text, x, y, maxWidth);
    };
  });
});
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});

async function preservedState(page: Page) {
  return page.evaluate(() => {
    const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, ...state } = (window as any).__ctx.toolData.dissection;
    return state;
  });
}
async function replayState(page: Page) {
  return page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureReplay);
}
async function activate(page: Page, button: Locator) {
  await button.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80);
}
async function latestCaption(page: Page) {
  return page.evaluate(() => {
    const records = (window as any).__reviewText.filter((row: any) => row.inReplayCaption);
    for (let index = records.length - 1; index >= 0; index--) {
      if (/^STEP \d+\/3/.test(records[index].text)) return records.slice(index);
    }
    return [];
  });
}
async function caption(page: Page, canvas: Locator, step: number) {
  await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect.poll(() => canvas.evaluate(node => (node as any)._dissInViewport)).toBe(true);
  await page.clock.runFor(80);
  await expect.poll(async () => (await latestCaption(page))[0]?.text || '').toMatch(new RegExp('^STEP ' + step + '/3'));
  const records = await latestCaption(page); expect(records.length).toBeGreaterThanOrEqual(3);
  for (const row of records) {
    expect(row.x).toBeGreaterThanOrEqual(0); expect(row.end).toBeLessThanOrEqual(row.width + 1);
    expect(row.y).toBeGreaterThan(0); expect(row.y).toBeLessThanOrEqual(row.height);
  }
  return { records, text: records.map((row: any) => row.text).join(' ').replace(/\s+/g, ' ') };
}

for (const variant of [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
]) test(`replay review ${variant.name} holds, navigates and resumes saved actions`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const canvas = page.locator('[data-diss-canvas]'), panel = page.getByRole('group', { name: 'Attempt replay controls', exact: true });
  const status = page.locator('#diss-replay-review-status'), toggle = page.locator('#diss-replay-toggle');
  const previous = page.getByRole('button', { name: 'Previous action', exact: true }), next = page.getByRole('button', { name: 'Next action', exact: true });
  const stop = page.getByRole('button', { name: 'Stop replay', exact: true });
  const launch = page.getByRole('button', { name: 'Review actions', exact: true });
  const autoLaunch = page.getByRole('button', { name: 'Replay the recorded technique attempt on the specimen', exact: true });
  await expect(launch).toBeEnabled(); await expect(launch).toHaveAttribute('aria-controls', 'diss-replay-review');
  await expect(launch).toHaveAttribute('aria-describedby', 'diss-replay-evidence-help');
  await expect(panel).toHaveCount(0);
  const before = await preservedState(page);
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + clockPauseLeadMs));

  await activate(page, page.getByRole('button', { name: 'Show a generalized safe-technique demonstration on the specimen', exact: true }));
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureDemo)).toBeTruthy();
  await activate(page, launch);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureDemo)).toBeNull();
  await expect(panel).toBeVisible(); await expect(toggle).toHaveText('Resume replay'); await expect(toggle).toBeFocused();
  await expect.poll(() => canvas.evaluate(node => (node as any)._dissInViewport)).toBe(true);
  const launchVisibility = await canvas.evaluate(node => {
    const box = node.getBoundingClientRect();
    return { visibleHeight: Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top)), height: box.height };
  });
  expect(launchVisibility.visibleHeight).toBeGreaterThan(0);
  await expect(status).toHaveText('Paused · Action 1 of 3 · Inspected'); await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(previous).toBeDisabled(); await expect(next).toBeEnabled();
  const first = await replayState(page); expect(first.paused).toBe(true); expect(first.actions).toHaveLength(3);
  await page.clock.fastForward(10_000);
  expect(await replayState(page)).toEqual(first); await expect(status).toHaveText('Paused · Action 1 of 3 · Inspected');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureDemo)).toBeNull();
  const firstCaption = await caption(page, canvas, 1); expect(firstCaption.text).toContain('INSPECTED');

  await activate(page, next); await expect(status).toHaveText('Paused · Action 2 of 3 · Incised'); await expect(next).toBeFocused();
  await expect(previous).toBeEnabled(); await expect(next).toBeEnabled();
  const secondCaption = await caption(page, canvas, 2);
  expect(secondCaption.text).toContain('INCISED'); expect(secondCaption.text).toContain('SAVED PATH'); expect(secondCaption.text).toContain('PRESSURE 50%');
  const metrics = await panel.evaluate(node => ({
    width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
    status: { font: parseFloat(getComputedStyle(node.querySelector('[role="status"]')!).fontSize), client: node.querySelector('[role="status"]')!.clientWidth, scroll: node.querySelector('[role="status"]')!.scrollWidth },
    buttons: Array.from(node.querySelectorAll('button')).map(button => ({ text: button.textContent, height: button.getBoundingClientRect().height, width: button.getBoundingClientRect().width, font: parseFloat(getComputedStyle(button).fontSize) })),
  }));
  expect(metrics.width).toBeLessThanOrEqual(variant.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  expect(metrics.status.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(metrics.status.scroll).toBeLessThanOrEqual(metrics.status.client + 1);
  for (const button of metrics.buttons) { expect(button.height).toBeGreaterThanOrEqual(44); expect(button.width).toBeLessThanOrEqual(metrics.width); expect(button.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); }
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await panel.screenshot({ path: `${out}/${variant.name}-controls.png`, style: '.diss-next-action{position:static!important;}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  await page.clock.resume();
  let audit: any;
  try {
    audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-replay-review']] }));
  } finally {
    const auditEndedAt = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(auditEndedAt + clockPauseLeadMs));
  }
  await expect(status).toHaveText('Paused · Action 2 of 3 · Incised');
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await caption(page, canvas, 2);
  await canvas.screenshot({ path: `${out}/${variant.name}-canvas.png`, style: '.diss-next-action{position:static!important;}' });

  await activate(page, next); await expect(status).toHaveText('Paused · Action 3 of 3 · Extended'); await expect(next).toBeDisabled(); await expect(previous).toBeFocused();
  const thirdCaption = await caption(page, canvas, 3); expect(thirdCaption.text).toContain('EXTENDED'); expect(thirdCaption.text).toContain('SUPPORTED PATH'); expect(thirdCaption.text).toContain('PRESSURE NOT RECORDED');
  await activate(page, previous); await expect(status).toHaveText('Paused · Action 2 of 3 · Incised'); await expect(previous).toBeFocused();
  await activate(page, previous); await expect(status).toHaveText('Paused · Action 1 of 3 · Inspected'); await expect(previous).toBeDisabled(); await expect(next).toBeFocused();

  await activate(page, toggle); await expect(toggle).toHaveText('Pause replay'); await expect(status).toHaveText('Playing replay · 3 actions. Pause to inspect an action.');
  await page.clock.runFor(1050); await activate(page, toggle);
  await expect(toggle).toHaveText('Resume replay'); await expect(status).toHaveText('Paused · Action 2 of 3 · Incised');
  const frozen = await replayState(page); expect(frozen.elapsed).toBeGreaterThan(first.elapsed);
  await page.clock.fastForward(10_000); expect(await replayState(page)).toEqual(frozen); await expect(status).toHaveText('Paused · Action 2 of 3 · Incised');
  expect(await preservedState(page)).toEqual(before);
  await activate(page, stop); await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); expect(await replayState(page)).toBeFalsy(); expect(await preservedState(page)).toEqual(before);

  await activate(page, autoLaunch); await expect(toggle).toHaveText('Pause replay'); await expect(toggle).toBeFocused();
  const auto = await replayState(page); expect(auto.paused).toBe(false);
  const autoElapsed = await page.evaluate(startedAt => Date.now() - startedAt, auto.startedAt);
  await page.clock.runFor(Math.max(0, auto.duration - autoElapsed + 20));
  const contrast = page.getByRole('button', { name: 'Toggle high contrast mode', exact: true });
  await activate(page, contrast); await expect(panel).toBeVisible();
  await activate(page, contrast); await expect(panel).toBeVisible();
  await expect(contrast).toHaveAttribute('aria-pressed', String(!!variant.contrast));
  await toggle.focus(); await expect(toggle).toBeFocused();
  await page.clock.runFor(101); await expect(panel).toHaveCount(0); await expect(autoLaunch).toBeFocused(); expect(await replayState(page)).toBeFalsy();
  expect(await preservedState(page)).toEqual(before);
  await activate(page, launch); await expect(toggle).toBeFocused(); await page.keyboard.press('Escape'); await page.clock.runFor(80);
  await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); expect(await preservedState(page)).toEqual(before);

  await activate(page, launch);
  const summary = page.locator('#diss-procedure-summary'), techniquePanel = page.locator('#diss-procedure-panel');
  await activate(page, summary); await expect.poll(() => techniquePanel.evaluate(node => (node as HTMLDetailsElement).open)).toBe(false);
  await expect(panel).toBeVisible(); await activate(page, stop);
  await expect(panel).toHaveCount(0); await expect(summary).toBeFocused(); expect(await replayState(page)).toBeFalsy();
  await activate(page, summary); await expect.poll(() => techniquePanel.evaluate(node => (node as HTMLDetailsElement).open)).toBe(true);
  expect(await preservedState(page)).toEqual(before);

  await activate(page, launch);
  const fullscreenLaunch = page.getByRole('button', { name: 'Enter fullscreen specimen mode with view and tool controls', exact: true });
  const fullscreenExit = page.getByRole('button', { name: 'Exit fullscreen specimen mode', exact: true });
  const fullscreenStage = page.locator('[data-diss-fullscreen-stage]');
  await activate(page, fullscreenLaunch);
  await expect.poll(() => fullscreenStage.evaluate(node => document.fullscreenElement === node || (node as any).__alloFsOn === true || node.hasAttribute('data-allo-fullscreen-active'))).toBe(true);
  await expect(fullscreenExit).toBeVisible(); await expect(panel).toHaveCount(0); expect(await replayState(page)).toBeFalsy();
  await activate(page, fullscreenExit);
  await expect.poll(() => fullscreenStage.evaluate(node => document.fullscreenElement === node || (node as any).__alloFsOn === true || node.hasAttribute('data-allo-fullscreen-active'))).toBe(false);
  await page.clock.runFor(80); await expect(fullscreenLaunch).toBeFocused(); expect(await preservedState(page)).toEqual(before);

  await activate(page, launch); await activate(page, page.locator('#diss-view-cycle'));
  await expect(panel).toHaveCount(0); expect(await replayState(page)).toBeFalsy();
  await activate(page, launch); await expect(panel).toBeVisible();
  const anotherLayer = page.locator('.diss-layer-button[data-state="available"]').first(); await expect(anotherLayer).toBeEnabled();
  await activate(page, anotherLayer); await expect(panel).toHaveCount(0); expect(await replayState(page)).toBeFalsy();
  await writeFile(`${out}/${variant.name}-review.json`, JSON.stringify({ launchVisibility, firstCaption, secondCaption, thirdCaption, first, frozen, savedStatePreserved: true, priorDemonstrationCleared: true, boundaryFocusPreserved: true, nativeStopAndEscapeRestoreFocus: true, closedTechniquePanelReturnsFocusToSummary: true, nativeFullscreenEntryCancelsReview: true, timerCompletionRestoresFocus: true, nativePresentationRendersDuringCompletionGrace: 2, viewAndLayerCancel: true }, null, 2));
});
