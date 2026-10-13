import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_HISTORY_REPLAY_OUTPUT || 'test-results/dissection-history-replay';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const firstContact = { x: 0.43, y: 0.33 }, secondContact = { x: 0.57, y: 0.58 };
const teachingContact = { x: 0.50, y: 0.50 }, latestFinalContact = { x: 0.89, y: 0.88 };
const path = [{ x: 0.49, y: 0.29 }, teachingContact, { x: 0.51, y: 0.70 }];
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 3, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null,
  revealedLayers: { skin: true }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: true, procedureMode: 'independent',
  organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true },
  quizScore: 1, quizTotal: 2, soundEnabled: false, sceneDetail: false, _procedureDemo: null,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 3 },
};
const procedure = {
  tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, errors: 0, protocolDeviations: 0,
  history: ['dropper', 'dropper', 'dropper'], cautionLog: [], learningChecks: {}, incisionPath: path, extensionPath: path,
  dropperPoint: latestFinalContact, surfaceCleared: false, forcepsPoint: { x: 0.85, y: 0.15 }, wickPoint: { x: 0.81, y: 0.19 }, pins: [],
  actionLog: [
    { action: 'dropper', label: 'Hydrated', at: 100, point: firstContact, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 } },
    { action: 'dropper', label: 'Hydrated', at: 200, point: secondContact, inputType: 'button', assistance: 'motor-neutral', toolCalibration: { salineDose: 2 } },
    { action: 'dropper', label: 'Hydrated', at: 300, inputType: 'button', assistance: 'motor-neutral' },
  ],
};
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message));
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const original = { beginPath: proto.beginPath, arc: proto.arc, ellipse: proto.ellipse, moveTo: proto.moveTo, lineTo: proto.lineTo, translate: proto.translate, save: proto.save, restore: proto.restore, stroke: proto.stroke, fillText: proto.fillText };
    const states = new WeakMap<CanvasRenderingContext2D, any>();
    const matrix = (value: DOMMatrix) => ({ a: value.a, b: value.b, c: value.c, d: value.d, e: value.e, f: value.f });
    const state = (ctx: CanvasRenderingContext2D) => {
      let value = states.get(ctx);
      if (!value) { value = { path: [], lastTranslate: null, stack: [] }; states.set(ctx, value); }
      return value;
    };
    const enabled = (ctx: CanvasRenderingContext2D) => ctx.canvas.matches('[data-diss-canvas]');
    (window as any).__contactPaint = []; (window as any).__contactText = [];
    proto.save = function () { if (enabled(this)) state(this).stack.push(state(this).lastTranslate); original.save.call(this); };
    proto.restore = function () { original.restore.call(this); if (enabled(this)) state(this).lastTranslate = state(this).stack.pop() || null; };
    proto.translate = function (x, y) {
      const before = enabled(this) ? matrix(this.getTransform()) : null;
      original.translate.call(this, x, y);
      if (before) state(this).lastTranslate = { x, y, before, after: matrix(this.getTransform()) };
    };
    proto.beginPath = function () { original.beginPath.call(this); if (enabled(this)) state(this).path = []; };
    proto.arc = function (x, y, radius, start, end, counterclockwise) {
      original.arc.call(this, x, y, radius, start, end, counterclockwise);
      if (enabled(this) && state(this).path.length < 40) state(this).path.push({ operation: 'arc', x, y, radius });
    };
    proto.ellipse = function (x, y, radiusX, radiusY, rotation, start, end, counterclockwise) {
      original.ellipse.call(this, x, y, radiusX, radiusY, rotation, start, end, counterclockwise);
      if (enabled(this) && state(this).path.length < 40) state(this).path.push({ operation: 'ellipse', x, y, radiusX, radiusY });
    };
    proto.moveTo = function (x, y) { original.moveTo.call(this, x, y); if (enabled(this) && state(this).path.length < 40) state(this).path.push({ operation: 'moveTo', x, y }); };
    proto.lineTo = function (x, y) { original.lineTo.call(this, x, y); if (enabled(this) && state(this).path.length < 40) state(this).path.push({ operation: 'lineTo', x, y }); };
    proto.stroke = function (...args: any[]) {
      (original.stroke as any).apply(this, args);
      if (!enabled(this)) return;
      const draw = state(this), dash = this.getLineDash(), color = String(this.strokeStyle);
      const dropper = draw.path.some((part: any) => part.operation === 'ellipse' && part.x === 0 && part.y === 0 && part.radiusX === 11 && part.radiusY === 6)
        && draw.path.some((part: any) => part.operation === 'moveTo' && part.x === 0 && part.y === -13)
        && draw.path.some((part: any) => part.operation === 'lineTo' && part.x === 0 && part.y === -5);
      const forceps = color === '#5eead4' && dash.join(',') === '4,3' && draw.path.some((part: any) => part.operation === 'arc' && part.radius === 18);
      const pin = color === '#f9a8d4' && dash.join(',') === '3,3' && draw.path.some((part: any) => part.operation === 'arc' && part.radius === 13);
      if (!dropper && !forceps && !pin) return;
      (window as any).__contactPaint.push({ kind: dropper ? 'dropper-review' : forceps ? 'forceps-hint' : 'pin-hint', path: draw.path.slice(), color, dash,
        lineWidth: this.lineWidth, translate: draw.lastTranslate, transform: matrix(this.getTransform()),
        logicalWidth: (this.canvas as any)._logicalW, logicalHeight: (this.canvas as any)._logicalH,
        backingWidth: this.canvas.width, backingHeight: this.canvas.height, at: Date.now() });
      if ((window as any).__contactPaint.length > 500) (window as any).__contactPaint.splice(0, 250);
    };
    proto.fillText = function (text, x, y, maxWidth) {
      if (maxWidth === undefined) original.fillText.call(this, text, x, y); else original.fillText.call(this, text, x, y, maxWidth);
      if (!enabled(this)) return;
      const measured = this.measureText(String(text)).width, transform = this.getTransform();
      const start = new DOMPoint(x, y).matrixTransform(transform), end = new DOMPoint(x + measured, y).matrixTransform(transform);
      const density = (this.canvas as any)._dpr || 1;
      const box = ((this.canvas as any)._canvasHudBoxes || []).find((candidate: any) => candidate.id === 'replay');
      const inReplayCaption = !!box && start.x / density >= box.x && start.x / density <= box.x + box.width && start.y / density >= box.y && start.y / density <= box.y + box.height;
      (window as any).__contactText.push({ text: String(text), inReplayCaption, x: start.x, y: start.y, end: end.x, width: this.canvas.width, height: this.canvas.height });
      if ((window as any).__contactText.length > 2000) (window as any).__contactText.splice(0, 1000);
    };
  });
});
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});

async function preservedState(page: Page) {
  return page.evaluate(() => { const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, ...state } = (window as any).__ctx.toolData.dissection; return state; });
}
async function clearPaint(page: Page) { await page.evaluate(() => { (window as any).__contactPaint = []; (window as any).__contactText = []; }); }
async function paint(page: Page, kind: string) { return page.evaluate(value => (window as any).__contactPaint.filter((row: any) => row.kind === value), kind); }
async function activate(page: Page, button: Locator) { await button.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80); }
async function showCanvas(page: Page, canvas: Locator) {
  await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect.poll(() => canvas.evaluate(node => (node as any)._dissInViewport)).toBe(true);
  // Keep native static-frame records until an action changes; clock progress
  // alone does not request a reduced-motion canvas redraw.
  await page.clock.runFor(80);
}
const historyActions = Array.from({ length: 22 }, (_, index) => ({
  action: 'dropper', label: 'Hydrated', at: 100,
  point: { x: 0.35 + index * 0.015, y: 0.32 + index * 0.014 }, inputType: 'pointer', assistance: 'independent',
  toolCalibration: { salineDose: index % 2 ? 3 : 1, bladeAngle: 25 + index }, outcome: 'Recorded response ' + (index + 1),
}));
historyActions[4] = { ...historyActions[4], action: 'scalpel', label: 'Incised' };
historyActions[5] = { ...historyActions[5], action: 'scalpel', label: 'Incised' };
async function replayState(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureReplay); }
async function openDetails(page: Page, selector: string) {
  const node = page.locator(selector); if (!(await node.evaluate((element: HTMLDetailsElement) => element.open))) await activate(page, node.locator(':scope > summary'));
}
for (const variant of [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
]) test(`history replay ${variant.name} opens the selected record and returns focus`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, instrumentVisuals: false, techniquePanelOpen: false, showProcedureDebrief: true,
    procedureByLayer: { skin: { ...procedure, actionLog: historyActions, history: historyActions.map(entry => entry.action), incisionSamples: [{ pressure: 0.3 }, { pressure: 0.5 }] } }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
  const history = page.locator('.diss-layer-review .diss-procedure__timeline-entry'); await expect(history).toHaveCount(18);
  const layerLaunch = page.locator('#diss-layer-replay-response'), monitorLaunch = page.locator('#diss-monitor-response'), panel = page.locator('#diss-replay-review');
  const picker = page.locator('#diss-replay-action'), toggle = page.locator('#diss-replay-toggle'), stop = page.locator('#diss-replay-stop'), canvas = page.locator('[data-diss-canvas]');
  await activate(page, history.nth(2)); await expect(history.nth(2)).toHaveAttribute('aria-pressed', 'true');
  const before = await preservedState(page); await expect(page.locator('#diss-procedure-panel')).not.toHaveAttribute('open');
  await expect(layerLaunch).not.toHaveAttribute('aria-controls'); await expect(layerLaunch).toHaveAttribute('aria-describedby', 'diss-layer-replay-help');
  await clearPaint(page); await activate(page, layerLaunch);
  await expect(panel).toBeVisible(); await expect(layerLaunch).toHaveAttribute('aria-controls', 'diss-replay-review'); await expect(monitorLaunch).toHaveAttribute('aria-controls', 'diss-replay-review'); await expect(toggle).toBeFocused(); await expect(picker).toHaveValue('6');
  await expect(page.locator('#diss-replay-review-status')).toHaveText('Paused · Action 7 of 22 · Hydrated');
  await expect(page.locator('#diss-replay-details')).toContainText('1 drop'); await expect(page.locator('#diss-replay-details')).toContainText('Recorded response 7');
  const opened = await replayState(page); expect(opened.paused).toBe(true); expect(opened.returnFocusId).toBe('diss-layer-replay-response'); expect(opened.actions).toEqual(historyActions);
  await showCanvas(page, canvas); await expect.poll(async () => (await paint(page, 'dropper-review')).length).toBeGreaterThan(0);
  const marks = await paint(page, 'dropper-review'), marker = marks.at(-1);
  expect(marker.translate.x / marker.logicalWidth).toBeCloseTo(historyActions[6].point.x, 6); expect(marker.translate.y / marker.logicalHeight).toBeCloseTo(historyActions[6].point.y, 6);
  const nativeText = await page.evaluate(() => (window as any).__contactText.map((row: any) => row.text).join(' ')); expect(nativeText).toContain('DOSE 1'); expect(nativeText).toContain('SAVED POSITION');
  await page.clock.fastForward(20_000); await expect(picker).toHaveValue('6'); expect((await replayState(page)).paused).toBe(true);
  const metrics = await page.locator('#diss-layer-replay-help').evaluate(node => ({ font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth }));
  expect(metrics.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  await picker.focus(); await panel.screenshot({ path: `${out}/${variant.name}-review.png`, style: '.diss-next-action{position:static!important;}' });
  await activate(page, stop); await expect(panel).toHaveCount(0); await expect(layerLaunch).toBeFocused(); await expect(page.locator('#diss-procedure-panel')).not.toHaveAttribute('open'); expect(await preservedState(page)).toEqual(before);
  await page.locator('.diss-layer-review__card').nth(1).screenshot({ path: `${out}/${variant.name}-launch.png`, style: '.diss-next-action{position:static!important;}' });

  await openDetails(page, '.diss-field-monitor'); await openDetails(page, '.diss-stage__telemetry-detail');
  await expect(monitorLaunch).not.toHaveAttribute('aria-controls'); await expect(monitorLaunch).toHaveAttribute('aria-describedby', 'diss-monitor-replay-help');
  await activate(page, monitorLaunch); await expect(picker).toHaveValue('6'); await expect(toggle).toBeFocused(); expect((await replayState(page)).returnFocusId).toBe('diss-monitor-response');
  await picker.focus(); await page.keyboard.press('Escape'); await page.clock.runFor(80); await expect(panel).toHaveCount(0); await expect(monitorLaunch).toBeFocused(); expect(await preservedState(page)).toEqual(before);
  for (const collapsed of ['inner', 'outer', 'both']) {
    await openDetails(page, '.diss-field-monitor'); await openDetails(page, '.diss-stage__telemetry-detail');
    await activate(page, monitorLaunch);
    if (collapsed !== 'outer') await activate(page, page.locator('#diss-monitor-response-summary'));
    if (collapsed !== 'inner') await activate(page, page.locator('#diss-field-monitor-summary'));
    if (collapsed === 'inner') { await picker.focus(); await page.keyboard.press('Escape'); await page.clock.runFor(80); }
    else await activate(page, stop);
    await expect(panel).toHaveCount(0);
    await expect(page.locator(collapsed === 'inner' ? '#diss-monitor-response-summary' : '#diss-field-monitor-summary')).toBeFocused();
    expect(await preservedState(page)).toEqual(before);
  }
  await openDetails(page, '.diss-field-monitor'); await openDetails(page, '.diss-stage__telemetry-detail');
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-replay-help'], ['#diss-layer-replay-response'], ['#diss-monitor-replay-help'], ['#diss-monitor-response']] })); }
  finally { const endedAt = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(endedAt + pauseLeadMs)); }
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);

  await activate(page, history.first()); const beforeCut = await preservedState(page); await activate(page, layerLaunch); await expect(picker).toHaveValue('4');
  await expect(page.locator('#diss-replay-details')).toContainText('Illustrative path; this action has no saved path.');
  await activate(page, page.locator('#diss-replay-next')); await expect(picker).toHaveValue('5'); await expect(page.locator('#diss-replay-details')).toContainText('Saved path');
  await activate(page, stop); await expect(layerLaunch).toBeFocused(); expect(await preservedState(page)).toEqual(beforeCut);

  await activate(page, history.last()); const beforeLatest = await preservedState(page); await openDetails(page, '.diss-stage__telemetry-detail');
  await expect(monitorLaunch).toHaveAccessibleName('Replay the latest technique response'); await activate(page, monitorLaunch); await expect(picker).toHaveValue('21');
  await expect(page.locator('#diss-replay-details')).toContainText('3 drops'); await activate(page, toggle); await page.clock.fastForward(1500);
  await expect(panel).toHaveCount(0); await expect(monitorLaunch).toBeFocused(); expect(await preservedState(page)).toEqual(beforeLatest);
  await writeFile(`${out}/${variant.name}-evidence.json`, JSON.stringify({ metrics, opened, marker, nativeText, savedStatePreserved: true, tailWindowOffset: 4, instrumentVisualsDisabled: true, stopEscapeAndCompletionFocus: true, collapsedDisclosureFocus: true }, null, 2));
});
