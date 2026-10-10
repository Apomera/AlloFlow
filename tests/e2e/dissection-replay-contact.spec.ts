import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_CONTACT_OUTPUT || 'test-results/dissection-replay-contact';
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
async function currentCaption(page: Page) {
  return page.evaluate(() => {
    const records = (window as any).__contactText.filter((row: any) => row.inReplayCaption);
    for (let index = records.length - 1; index >= 0; index--) if (/^STEP \d+\/3/.test(records[index].text)) return records.slice(index);
    return [];
  });
}
async function contactFrame(page: Page, canvas: Locator, step: number, point: { x: number; y: number }, positionLabel: string, setting: string) {
  await showCanvas(page, canvas);
  await expect.poll(async () => (await currentCaption(page))[0]?.text || '').toMatch(new RegExp('^STEP ' + step + '/3'));
  await expect.poll(async () => (await paint(page, 'dropper-review')).length).toBeGreaterThan(0);
  const draws = await paint(page, 'dropper-review'), marker = draws[draws.length - 1];
  expect(marker.translate).toBeTruthy(); expect(marker.logicalWidth).toBeGreaterThan(0); expect(marker.logicalHeight).toBeGreaterThan(0);
  expect(marker.translate.x / marker.logicalWidth).toBeCloseTo(point.x, 6); expect(marker.translate.y / marker.logicalHeight).toBeCloseTo(point.y, 6);
  // This is the real stroked ellipse's screen origin, calculated independently
  // from the native pre-translation matrix. The test never draws a marker.
  const before = marker.translate.before;
  const expectedOrigin = { x: before.a * point.x * marker.logicalWidth + before.c * point.y * marker.logicalHeight + before.e,
    y: before.b * point.x * marker.logicalWidth + before.d * point.y * marker.logicalHeight + before.f };
  expect(marker.transform.e).toBeCloseTo(expectedOrigin.x, 5); expect(marker.transform.f).toBeCloseTo(expectedOrigin.y, 5);
  expect(marker.transform.e).toBeGreaterThan(0); expect(marker.transform.e).toBeLessThan(marker.backingWidth);
  expect(marker.transform.f).toBeGreaterThan(0); expect(marker.transform.f).toBeLessThan(marker.backingHeight);
  expect(marker.translate.x / marker.logicalWidth).not.toBeCloseTo(latestFinalContact.x, 4); expect(marker.translate.y / marker.logicalHeight).not.toBeCloseTo(latestFinalContact.y, 4);
  const records = await currentCaption(page), text = records.map((row: any) => row.text).join(' ').replace(/\s+/g, ' ');
  expect(text).toContain('HYDRATED'); expect(text).toContain(positionLabel); expect(text).toContain(setting); expect(text).toContain('HYDRATE');
  for (const row of records) { expect(row.x).toBeGreaterThanOrEqual(0); expect(row.end).toBeLessThanOrEqual(row.width + 1); expect(row.y).toBeGreaterThan(0); expect(row.y).toBeLessThanOrEqual(row.height); }
  const detail = page.locator('#diss-replay-contact-detail');
  await expect(detail).toHaveText(positionLabel === 'SAVED POSITION' ? 'Saved action position.' : positionLabel === 'SUPPORTED POSITION' ? 'Supported action position.' : 'Illustrative position; contact not recorded.');
  return { marker, expectedOrigin, records, text };
}

for (const variant of [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
]) test(`replay contacts ${variant.name} paint individual saved contacts and isolate review targets`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' }); await page.setViewportSize({ width: variant.width, height: 1000 });
  async function mount(activeInstrument: 'forceps' | 'pin') {
    await harness.mount(page, { dissection: { ...initial, activeInstrument, procedureByLayer: { skin: { ...procedure, retracted: activeInstrument === 'pin' } }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
    await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
    await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
    const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
  }
  await mount('forceps');
  const canvas = page.locator('[data-diss-canvas]'), panel = page.getByRole('group', { name: 'Attempt replay controls', exact: true });
  const launch = page.getByRole('button', { name: 'Review actions', exact: true }), autoLaunch = page.getByRole('button', { name: 'Replay the recorded technique attempt on the specimen', exact: true });
  const next = page.getByRole('button', { name: 'Next action', exact: true }), stop = page.getByRole('button', { name: 'Stop replay', exact: true }), status = page.locator('#diss-replay-review-status');
  await showCanvas(page, canvas); await expect.poll(async () => (await paint(page, 'forceps-hint')).length).toBeGreaterThan(0);
  const forcepsBefore = await paint(page, 'forceps-hint'), before = await preservedState(page);
  await clearPaint(page); await activate(page, launch); await expect(page.locator('#diss-replay-toggle')).toBeFocused(); await expect(status).toHaveText('Paused · Action 1 of 3 · Hydrated');
  const first = await contactFrame(page, canvas, 1, firstContact, 'SAVED POSITION', 'DOSE 1');
  expect(await paint(page, 'forceps-hint')).toEqual([]); expect(await paint(page, 'pin-hint')).toEqual([]);
  await clearPaint(page); await activate(page, next); await expect(status).toHaveText('Paused · Action 2 of 3 · Hydrated');
  const second = await contactFrame(page, canvas, 2, secondContact, 'SUPPORTED POSITION', 'DOSE 2');
  expect(Math.hypot(first.marker.transform.e - second.marker.transform.e, first.marker.transform.f - second.marker.transform.f)).toBeGreaterThan(30); expect(await paint(page, 'forceps-hint')).toEqual([]);
  const metrics = await panel.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
    paragraphs: Array.from(node.querySelectorAll('p')).map(p => ({ text: p.textContent, font: parseFloat(getComputedStyle(p).fontSize), client: p.clientWidth, scroll: p.scrollWidth })),
    buttons: Array.from(node.querySelectorAll('button')).map(button => ({ text: button.textContent, height: button.getBoundingClientRect().height, width: button.getBoundingClientRect().width, font: parseFloat(getComputedStyle(button).fontSize) })) }));
  expect(metrics.width).toBeLessThanOrEqual(variant.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  for (const p of metrics.paragraphs) { expect(p.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(p.scroll).toBeLessThanOrEqual(p.client + 1); }
  for (const button of metrics.buttons) { expect(button.height).toBeGreaterThanOrEqual(44); expect(button.width).toBeLessThanOrEqual(metrics.width); expect(button.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); }
  await panel.screenshot({ path: `${out}/${variant.name}-controls.png`, style: '.diss-next-action{position:static!important;}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume();
  let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-replay-review']] })); }
  finally { const endedAt = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(endedAt + pauseLeadMs)); }
  await expect(status).toHaveText('Paused · Action 2 of 3 · Hydrated'); await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  // Step 2 remains paused through axe. Retain its actual native painted frame;
  // no state change has occurred that would request another static draw.
  await contactFrame(page, canvas, 2, secondContact, 'SUPPORTED POSITION', 'DOSE 2');
  await canvas.screenshot({ path: `${out}/${variant.name}-canvas.png`, style: '.diss-next-action{position:static!important;}' });
  await clearPaint(page); await activate(page, next); await expect(status).toHaveText('Paused · Action 3 of 3 · Hydrated');
  const legacy = await contactFrame(page, canvas, 3, teachingContact, 'TEACHING POSITION', 'SETTING NOT RECORDED');
  expect(legacy.text).not.toContain('DOSE 3'); expect(await paint(page, 'forceps-hint')).toEqual([]); expect(await preservedState(page)).toEqual(before);
  await clearPaint(page); await activate(page, stop); await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); await showCanvas(page, canvas);
  await expect.poll(async () => (await paint(page, 'forceps-hint')).length).toBeGreaterThan(0);
  const forcepsAfterStop = await paint(page, 'forceps-hint'); expect(await preservedState(page)).toEqual(before);
  await clearPaint(page); await activate(page, autoLaunch); await showCanvas(page, canvas); await expect.poll(async () => (await paint(page, 'dropper-review')).length).toBeGreaterThan(0); expect(await paint(page, 'forceps-hint')).toEqual([]);
  await clearPaint(page); await page.clock.fastForward(4000); await expect(panel).toHaveCount(0); await showCanvas(page, canvas);
  await expect.poll(async () => (await paint(page, 'forceps-hint')).length).toBeGreaterThan(0);
  const forcepsAfterExpiry = await paint(page, 'forceps-hint'); expect(await preservedState(page)).toEqual(before);
  await clearPaint(page); await harness.unmount(page); await mount('pin'); await showCanvas(page, canvas); await expect.poll(async () => (await paint(page, 'pin-hint')).length).toBeGreaterThan(0);
  const pinBefore = await paint(page, 'pin-hint'), pinSaved = await preservedState(page);
  await clearPaint(page); await activate(page, launch); const pinReview = await contactFrame(page, canvas, 1, firstContact, 'SAVED POSITION', 'DOSE 1');
  expect(await paint(page, 'pin-hint')).toEqual([]); expect(await paint(page, 'forceps-hint')).toEqual([]); expect(await preservedState(page)).toEqual(pinSaved);
  await clearPaint(page); await activate(page, stop); await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); await showCanvas(page, canvas);
  await expect.poll(async () => (await paint(page, 'pin-hint')).length).toBeGreaterThan(0);
  const pinAfterStop = await paint(page, 'pin-hint'); expect(await preservedState(page)).toEqual(pinSaved);
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await writeFile(`${out}/${variant.name}-contacts.json`, JSON.stringify({ first, second, legacy, forcepsBefore, forcepsAfterStop, forcepsAfterExpiry, pinBefore, pinReview, pinAfterStop, savedStatePreserved: true, nativePaintProof: true, currentToolTargetsHiddenOnlyDuringReview: true }, null, 2));
});
