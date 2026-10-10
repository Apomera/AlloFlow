import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_CAPTURE_OUTPUT || 'reports/dissection-capture-clarity-2026-10-05';
const baseline = process.env.DISSECTION_CAPTURE_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
// The gallery fixture's legacy evidence and completed procedure remain independent of new captures.
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==';
const frames = [
  { id: 101, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'preserved', selectedOrganName: 'Nictitating Membrane and translucent corneal surface', techniqueScore: 84, opticalQuality: 91, capturedAt: '2026-10-04T14:30:00.000Z' },
  { id: 102, image, specimen: 'frog', layer: 'skin', layerName: 'External Anatomy', view: 'lateral', condition: 'dehydrated', selectedOrganName: 'Tympanic Membrane and the surrounding pigmented skin boundary', techniqueScore: 0, opticalQuality: 0, capturedAt: '2026-10-05T14:30:00.000Z' },
  { id: 'legacy/frame 103', image, specimen: 'frog', layer: 'unmapped', techniqueScore: null, opticalQuality: null },
];
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: 'tympanum', revealedLayers: { skin: true }, procedureByLayer: { skin: complete },
  canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8, workspaceMode: 'advanced', techniquePanelOpen: false, toolbarToolsOpen: true,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane supports this identification.' }, organConfidence: { 'frog|nictitating': 3 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2,
  visualEvidence: frames, referenceEvidenceId: 102, splitComparison: false, evidenceNotebookOpen: true,
  annotations: [{ x: .5, y: .38, type: 'dot' }], rulerStart: { x: .5, y: .38 }, rulerEnd: { x: .6, y: .18 }, annotateMode: false, rulerMode: false,
  inspectionLens: true, macroInset: true, lensPinned: true, lensPinnedPoint: { x: .65, y: .24 }, lensPinnedOrganId: 'tympanum', lensFocusDepth: 'structure', lensMagnification: 4, lightIntensity: 60,
  visualRealism: 'accessible', specimenCondition: 'standard', parallaxDepth: false, reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
const captureStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); expect(errors.get(page) || []).toEqual([]); });

const source = (page: Page) => page.locator('[data-diss-canvas]');
const tools = (page: Page) => page.locator('#diss-lab-tools');
const options = (page: Page) => page.locator('.diss-capture-options');
const preference = (page: Page) => page.locator('#diss-evidence-capture-contents');
const capture = (page: Page) => page.locator('[data-evidence-capture]');
const notebook = (page: Page) => page.locator('#diss-evidence-notebook');
const reference = (page: Page) => page.locator('.diss-split-reference');
const heading = (page: Page) => page.locator('#diss-reference-heading');
const frameCard = (page: Page, id: number | string) => notebook(page).locator(`[data-evidence-id="${id}"]`);
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], lens: [d.inspectionLens, d.macroInset, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId, d.lensFocusDepth, d.lensMagnification],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, calibration: d.toolCalibration,
      scores: [d.quizScore, d.quizTotal, d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      points: [d.annotations, d.rulerStart, d.rulerEnd, d.annotateMode, d.rulerMode], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending],
      living: [d.livingFunctionEnabled, d.livingFunctionPaused, d.livingFunctionSpeed, d.livingFunctionReplayToken] };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const m = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
async function painted(page: Page) {
  await source(page).scrollIntoViewIfNeeded();
  await expect.poll(async () => source(page).evaluate((node: any) => node._dissInViewport === true && node._logicalW > 0 && node._logicalH > 0)).toBe(true);
  await expect.poll(async () => source(page).evaluate((node: HTMLCanvasElement) => {
    const data = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data, unique = new Set<string>();
    for (let i = 0; i < data.length; i += Math.max(4, Math.floor(data.length / 400 / 4) * 4)) unique.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
    return unique.size;
  })).toBeGreaterThanOrEqual(8);
}

// This observer wraps only the native Capture entry points. It never invokes a renderer.
// The intercepted drawImage is the product's own copy into its 220 by 264 thumbnail.
async function observeNativeCapture(page: Page, failCopyOnce = false, observeGradients = false) {
  await source(page).evaluate((node: any, settings) => {
    const canvas = node as HTMLCanvasElement & Record<string, any>, ctx = canvas.getContext('2d')!;
    const records: any[] = []; (window as any).__captureObservations = records;
    const ignored = new Set(['_dissAnim', '_lastCaptureCamera', '_evidenceCaptureRequest']);
    const privateKeys = () => Object.keys(canvas).filter(k => k.startsWith('_') && !ignored.has(k)).sort();
    const serial = (value: any) => { try { return JSON.stringify(value); } catch { return '[unserializable]'; } };
    let failurePending = settings.failCopyOnce;
    for (const [method, contents] of [['_captureDissectionEvidence', 'specimen'], ['_captureFullDissectionEvidence', 'canvas']]) {
      const native = canvas[method];
      if (typeof native !== 'function') throw new Error(`Missing native ${method}`);
      canvas[method] = function (destination: CanvasRenderingContext2D, width: number, height: number) {
        const keys = privateKeys(), refs = new Map(keys.map(k => [k, canvas[k]])), values = new Map(keys.map(k => [k, serial(canvas[k])]));
        const entryBitmap = canvas.toDataURL(), entryDataset = serial({ ...canvas.dataset });
        const record: any = { contents, width, height, entryOffscreen: canvas._dissInViewport === false, entryMotionReduced: canvas._dissMotionReduced, entryCameraTransition: serial(canvas._cameraTransition), stageCopies: 0, textBeforeCopy: [], textAfterCopy: [], entryClock: [canvas._livingFunctionElapsedMs, canvas._livingFunctionLastAt, canvas._livingFunctionReplayToken] };
        const nativeCopy = destination.drawImage, nativeText = ctx.fillText, nativeColorStop = CanvasGradient.prototype.addColorStop; let copied = false;
        if (settings.observeGradients) {
          record.gradientStopsBeforeCopy = []; record.gradientStopsAfterCopy = [];
          CanvasGradient.prototype.addColorStop = function (offset: number, colour: string) {
            (copied ? record.gradientStopsAfterCopy : record.gradientStopsBeforeCopy).push({ offset, colour: String(colour) });
            return nativeColorStop.call(this, offset, colour);
          };
        }
        destination.drawImage = function (...args: any[]) {
          if (args[0] === canvas) {
            record.stageCopies++; record.stageCamera = [canvas._interactionZoom, canvas._interactionPanX, canvas._interactionPanY];
            record.stageView = canvas._drawD?.anatomicalView;
            if (failurePending) { failurePending = false; record.injectedFailure = true; throw new Error('Fixture thumbnail drawImage failure'); }
          }
          const result = (nativeCopy as any).apply(this, args);
          if (args[0] === canvas) { copied = true; record.jpegAtCopy = destination.canvas.toDataURL('image/jpeg', .72); record.pngAtCopy = destination.canvas.toDataURL('image/png'); }
          return result;
        } as any;
        ctx.fillText = function (text: string, ...args: any[]) { (copied ? record.textAfterCopy : record.textBeforeCopy).push(String(text)); return (nativeText as any).call(this, text, ...args); };
        try { record.result = native.call(canvas, destination, width, height); return record.result; }
        finally {
          destination.drawImage = nativeCopy; ctx.fillText = nativeText;
          if (settings.observeGradients) { CanvasGradient.prototype.addColorStop = nativeColorStop; record.gradientObserverRestored = CanvasGradient.prototype.addColorStop === nativeColorStop; }
          record.bitmapRestored = entryBitmap === canvas.toDataURL(); record.datasetRestored = entryDataset === serial({ ...canvas.dataset });
          record.keysRestored = serial(keys) === serial(privateKeys()); record.changedReferences = keys.filter(k => !Object.is(refs.get(k), canvas[k]));
          record.changedValues = keys.filter(k => values.get(k) !== serial(canvas[k])); record.requestCleared = canvas._evidenceCaptureRequest === null;
          record.exitClock = [canvas._livingFunctionElapsedMs, canvas._livingFunctionLastAt, canvas._livingFunctionReplayToken];
          record.exitCameraTransition = serial(canvas._cameraTransition);
          records.push(record);
        }
      };
    }
  }, { failCopyOnce, observeGradients });
}
async function observations(page: Page) { return page.evaluate(() => (window as any).__captureObservations || []); }
function restored(record: any) {
  expect(record.bitmapRestored).toBe(true); expect(record.datasetRestored).toBe(true); expect(record.keysRestored).toBe(true);
  expect(record.changedReferences).toEqual([]); expect(record.changedValues).toEqual([]); expect(record.requestCleared).toBe(true); expect(record.exitClock).toEqual(record.entryClock);
  expect(record.exitCameraTransition).toBe(record.entryCameraTransition);
}
async function nativeCapture(page: Page, key = 'Enter') {
  const count = (await state(page)).visualEvidence.length;
  await capture(page).focus(); await page.keyboard.press(key);
  await expect.poll(async () => (await state(page)).visualEvidence.length).toBe(count + 1);
  const d = await state(page), frame = d.visualEvidence[count];
  expect(frame.image).toMatch(/^data:image\/jpeg;base64,/); expect(d.referenceEvidenceId).toBe(frame.id);
  await expect(heading(page)).toHaveText(`Reference frame ${count + 1}`); await expect(heading(page)).toBeFocused();
  await expect.poll(async () => reference(page).locator('img').evaluate((n: HTMLImageElement) => n.naturalWidth)).toBe(220);
  expect(await reference(page).locator('img').evaluate((n: HTMLImageElement) => n.naturalHeight)).toBe(264);
  return frame;
}
async function saveImage(frame: any, name: string) { await writeFile(`${out}/${name}.jpg`, Buffer.from(frame.image.split(',')[1], 'base64')); }
async function captureContext(page: Page, frame: any, contents: 'specimen' | 'canvas') {
  expect(frame.captureContents).toBe(contents); expect(frame.camera).toEqual({ zoom: 1.5, panX: 15, panY: -8 }); expect(frame.annotationCount).toBe(1); expect(frame.measurementText).toBeTruthy();
  const text = contents === 'specimen' ? 'Specimen and marks' : 'Full canvas with guides';
  for (const panel of [frameCard(page, frame.id), reference(page)]) {
    const context = panel.locator('[data-evidence-capture-context]'); await expect(context).toContainText(text); await expect(context).toContainText('Zoom 1.5×'); await expect(context).toContainText('1 observation mark'); await expect(context).toContainText(frame.measurementText);
  }
}
async function metrics(panel: Locator) {
  return panel.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    text: Array.from(el.querySelectorAll('label,p')).filter(n => n.getClientRects().length && n.textContent?.trim()).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1, textOverflow: getComputedStyle(n).textOverflow })),
    controls: Array.from(el.querySelectorAll('select')).map(n => ({ font: parseFloat(getComputedStyle(n).fontSize), height: n.getBoundingClientRect().height, width: n.getBoundingClientRect().width, clipped: n.scrollWidth > n.clientWidth + 1 })) }));
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-capture-options'], ['.diss-split-reference']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`native evidence capture layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast }, c.width, c.available); await painted(page);
  const before = await proof(page), saved = (await state(page)).visualEvidence, prefix = baseline ? 'before' : 'after';
  const frame = await nativeCapture(page); await saveImage(frame, `${prefix}-${c.name}-native-frame`);
  await tools(page).screenshot({ path: `${out}/${prefix}-${c.name}-tools.png`, style: captureStyle });
  await reference(page).screenshot({ path: `${out}/${prefix}-${c.name}-reference.png`, style: captureStyle });
  expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(saved); expect(await proof(page)).toEqual(before);
  if (baseline) return;
  await expect(preference(page)).toHaveAccessibleName('Frame contents'); await expect(preference(page)).toHaveValue('specimen'); await expect(preference(page)).toHaveAttribute('aria-describedby', 'diss-evidence-capture-help');
  await captureContext(page, frame, 'specimen'); await expect(frameCard(page, 'legacy/frame 103').locator('[data-evidence-capture-context]')).toHaveText('Frame contents not recorded');
  const m = await metrics(options(page)); expect(m.width).toBeLessThanOrEqual(c.available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  for (const t of m.text) { expect(t.font, t.text || '').toBeGreaterThanOrEqual(c.large ? 16 : 14); expect(t.clipped, t.text || '').toBe(false); expect(t.textOverflow).not.toBe('ellipsis'); }
  for (const b of m.controls) { expect(b.height).toBeGreaterThanOrEqual(47.9); expect(b.width).toBeGreaterThanOrEqual(47.9); expect(b.font).toBeGreaterThanOrEqual(c.large ? 18 : 16); expect(b.clipped).toBe(false); }
  const rm = await metrics(reference(page)); expect(rm.width).toBeLessThanOrEqual(c.available + 1); expect(rm.scroll).toBeLessThanOrEqual(rm.client + 1);
  for (const t of rm.text) { expect(t.font, t.text || '').toBeGreaterThanOrEqual(c.large ? 16 : 14); expect(t.clipped, t.text || '').toBe(false); expect(t.textOverflow).not.toBe('ellipsis'); }
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify({ options: m, reference: rm }, null, 2)); await audit(page, c.name);
});

test('keyboard Capture copies clean anatomy before guides and full canvas after lens panels', async ({ page }) => {
  test.skip(baseline); await mount(page, { sceneDetail: true }, 1440, 1180); await painted(page); await observeNativeCapture(page);
  const before = await proof(page); await expect(preference(page)).toHaveValue('specimen'); const clean = await nativeCapture(page);
  await captureContext(page, clean, 'specimen'); await saveImage(clean, 'keyboard-specimen');
  await preference(page).focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Tab');
  await expect(capture(page)).toBeFocused(); await expect(preference(page)).toHaveValue('canvas'); const full = await nativeCapture(page, 'Space');
  await captureContext(page, full, 'canvas'); await saveImage(full, 'keyboard-full-canvas');
  const records = await observations(page); expect(records).toHaveLength(2);
  for (const [index, frame] of [clean, full].entries()) { const record = records[index]; restored(record); expect(record.result).toBe(true); expect(record.stageCopies).toBe(1); expect([record.width, record.height]).toEqual([220, 264]); expect(record.jpegAtCopy).toBe(frame.image); }
  expect(records[0].contents).toBe('specimen'); expect(records[1].contents).toBe('canvas');
  // These labels are emitted by native fixed HUD and optical panels after the clean copy.
  expect(records[0].textBeforeCopy.some((s: string) => s === 'ANATOMICAL AXIS' || s.startsWith('MACRO ') || s.startsWith('FOCUS:'))).toBe(false);
  expect(records[0].textAfterCopy.some((s: string) => s === 'ANATOMICAL AXIS')).toBe(true);
  expect(records[0].textAfterCopy.some((s: string) => s.startsWith('MACRO '))).toBe(true);
  expect(records[1].textBeforeCopy.some((s: string) => s === 'ANATOMICAL AXIS')).toBe(true);
  expect(records[1].textBeforeCopy.some((s: string) => s.startsWith('MACRO '))).toBe(true); expect(full.image).not.toBe(clean.image);
  expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(frames);
  await writeFile(`${out}/keyboard-stage-proof.json`, JSON.stringify(records.map(({ jpegAtCopy, pngAtCopy, ...record }: any) => ({ ...record, imageLength: jpegAtCopy.length })), null, 2));
});

test('Capture refreshes offscreen anatomy and the latest camera without replacing the visible bitmap', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180); await painted(page); await observeNativeCapture(page);
  await capture(page).scrollIntoViewIfNeeded(); await expect.poll(async () => source(page).evaluate((c: any) => c._dissInViewport)).toBe(false);
  const oldBitmap = await source(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { anatomicalView: 'lateral', canvasZoom: 2, canvasPanX: -21, canvasPanY: 11 }));
  await expect.poll(async () => source(page).evaluate((c: any) => c._drawD?.anatomicalView)).toBe('lateral');
  expect(await source(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(oldBitmap);
  const before = await proof(page), clean = await nativeCapture(page), first = (await observations(page))[0];
  expect(clean.view).toBe('lateral'); expect(clean.camera).toEqual({ zoom: 2, panX: -21, panY: 11 }); expect(first.entryOffscreen).toBe(true); expect(first.stageCamera).toEqual([2, -21, 11]); expect(first.stageView).toBe('lateral'); restored(first); expect(first.jpegAtCopy).toBe(clean.image);
  await preference(page).selectOption('canvas'); const full = await nativeCapture(page), second = (await observations(page))[1];
  expect(full.view).toBe('lateral'); expect(full.camera).toEqual(clean.camera); expect(second.entryOffscreen).toBe(true); expect(second.stageCamera).toEqual([2, -21, 11]); restored(second); expect(second.jpegAtCopy).toBe(full.image);
  expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(frames);
  await saveImage(clean, 'offscreen-lateral-specimen'); await saveImage(full, 'offscreen-lateral-full');
  await writeFile(`${out}/offscreen-proof.json`, JSON.stringify((await observations(page)).map(({ jpegAtCopy, pngAtCopy, ...record }: any) => record), null, 2));
});

test('failed native thumbnail copy restores canvas clocks marks and prior evidence then permits a retry', async ({ page }) => {
  test.skip(baseline); await mount(page, { reducedMotion: false, livingFunctionEnabled: true, livingFunctionPaused: false, livingFunctionSpeed: 'fast' }, 1440, 1180); await painted(page);
  await expect.poll(async () => source(page).evaluate((c: any) => c._livingFunctionElapsedMs)).toBeGreaterThan(0);
  await preference(page).selectOption('canvas'); await observeNativeCapture(page, true);
  const saved = await page.evaluate(() => {
    // Both native buttons run in this task, preserving the real 520 ms camera tween.
    (document.querySelector('[aria-label="Move specimen right"]') as HTMLButtonElement).click();
    const snapshot = JSON.parse(JSON.stringify((window as any).__ctx.toolData.dissection));
    const button = document.querySelector('[data-evidence-capture]') as HTMLButtonElement; button.focus(); button.click(); return snapshot;
  });
  const before = await proof(page);
  await expect.poll(async () => (await observations(page)).length).toBe(1); const failed = (await observations(page))[0];
  expect(failed.injectedFailure).toBe(true); expect(failed.result).toBe(false); expect(failed.stageCopies).toBe(1); restored(failed);
  expect(failed.contents).toBe('canvas'); expect(failed.entryMotionReduced).toBe(false); expect(JSON.parse(failed.entryCameraTransition).duration).toBe(520); expect(failed.entryClock[0]).toBeGreaterThan(0);
  expect((await state(page)).visualEvidence).toEqual(saved.visualEvidence); expect((await state(page)).referenceEvidenceId).toBe(saved.referenceEvidenceId); expect((await state(page)).splitComparison).toBe(saved.splitComparison); expect(await proof(page)).toEqual(before);
  expect((await state(page)).canvasPanX).toBe(saved.canvasPanX); expect((await state(page)).canvasPanY).toBe(saved.canvasPanY);
  await expect(capture(page)).toBeFocused(); expect((await state(page)).procedureFeedback.message).toBe('Evidence capture is unavailable in this view.');
  await page.evaluate(() => { (document.querySelector('[aria-label="Move specimen right"]') as HTMLButtonElement).click(); (document.querySelector('[data-evidence-capture]') as HTMLButtonElement).click(); });
  await expect.poll(async () => (await state(page)).visualEvidence.length).toBe(4); const frame = (await state(page)).visualEvidence[3], retry = (await observations(page))[1];
  restored(retry); expect(retry.result).toBe(true); expect(retry.contents).toBe('canvas'); expect(retry.entryMotionReduced).toBe(false); expect(JSON.parse(retry.entryCameraTransition).duration).toBe(520); expect(retry.jpegAtCopy).toBe(frame.image);
  expect(frame.camera).toEqual({ zoom: retry.stageCamera[0], panX: retry.stageCamera[1], panY: retry.stageCamera[2] });
  const transition = JSON.parse(retry.entryCameraTransition); expect(retry.stageCamera[1]).toBeGreaterThanOrEqual(Math.min(transition.fromPanX, transition.toPanX)); expect(retry.stageCamera[1]).toBeLessThanOrEqual(Math.max(transition.fromPanX, transition.toPanX));
  expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(frames);
  const after = await proof(page); expect({ ...after, camera: before.camera }).toEqual(before); await saveImage(frame, 'animated-full-canvas-retry');
  await writeFile(`${out}/failed-copy-proof.json`, JSON.stringify((await observations(page)).map(({ jpegAtCopy, pngAtCopy, ...record }: any) => record), null, 2));
});

test('capture preference and exact frame context survive saved progress reload while legacy contents stay unknown', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180); await painted(page); const before = await proof(page);
  await preference(page).selectOption('canvas'); const frame = await nativeCapture(page); await captureContext(page, frame, 'canvas');
  expect(await proof(page)).toEqual(before); await expect.poll(async () => page.evaluate(() => {
    const text = localStorage.getItem('dissection_progress_frog'); if (!text) return false; const saved = JSON.parse(text);
    return saved.evidenceCaptureContents === 'canvas' && saved.visualEvidence?.length === 4;
  })).toBe(true);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('dissection_progress_frog')!));
  expect(saved.visualEvidence).toEqual([...frames, frame]); await harness.unmount(page);
  await harness.mount(page, { dissection: { specimen: 'frog', workspaceMode: 'advanced', toolbarToolsOpen: true, reducedMotion: true } }, undefined, { expectCanvas: false });
  await expect.poll(async () => (await state(page))._dissLoadedSpec).toBe('frog'); await expect(preference(page)).toHaveValue('canvas');
  expect((await state(page)).evidenceCaptureContents).toBe('canvas'); expect((await state(page)).visualEvidence).toEqual(saved.visualEvidence);
  await captureContext(page, frame, 'canvas'); await expect(frameCard(page, 'legacy/frame 103').locator('[data-evidence-capture-context]')).toHaveText('Frame contents not recorded');
  for (const key of ['organNotes', 'organConfidence', 'verifiedIdentifications', 'exploredOrgans', 'annotations', 'revealedLayers']) expect((await state(page))[key]).toEqual(saved[key]);
  await reference(page).screenshot({ path: `${out}/reloaded-full-frame-context.png`, style: captureStyle });
  await writeFile(`${out}/reload-proof.json`, JSON.stringify({ preference: saved.evidenceCaptureContents, frame: { ...frame, image: `[JPEG ${frame.image.length} characters]` }, priorFrameIds: saved.visualEvidence.slice(0, 3).map((f: any) => f.id) }, null, 2));
});

test('native clean Capture excludes the previous layer sheet while full Capture retains its transition artwork', async ({ page }) => {
  test.skip(baseline);
  const fromColour = '#0173e9';
  const layerTransition = { active: true, startedAt: Date.now() - 900000, duration: 3600000, reducedMotion: false, specimenShape: 'frog',
    fromLayerId: 'muscle', toLayerId: 'organs', fromName: 'Muscle', toName: 'Organs', fromIcon: '', toIcon: '', fromColor: fromColour, toColor: '#fbbf24' };
  await mount(page, { activeLayer: 'organs', selectedOrgan: null, hoveredOrgan: null, reducedMotion: false,
    livingFunctionEnabled: false, livingFunctionPaused: true, inspectionLens: false, macroInset: false,
    revealedLayers: { skin: true, muscle: true }, procedureByLayer: { skin: complete, muscle: complete }, _layerTransition: layerTransition }, 1440, 1180);
  await painted(page); await observeNativeCapture(page, false, true);
  await page.evaluate(() => { (window as any).__captureLayerTransition = (window as any).__ctx.toolData.dissection._layerTransition; });
  const before = await proof(page), clean = await nativeCapture(page);
  await preference(page).selectOption('canvas'); const full = await nativeCapture(page), records = await observations(page);
  expect(records).toHaveLength(2);
  for (const [index, frame] of [clean, full].entries()) {
    const record = records[index]; restored(record); expect(record.result).toBe(true); expect(record.stageCopies).toBe(1); expect(record.jpegAtCopy).toBe(frame.image); expect(record.gradientObserverRestored).toBe(true);
  }
  expect(records[0].contents).toBe('specimen'); expect(records[1].contents).toBe('canvas');
  const oldSheetStops = (record: any) => record.gradientStopsBeforeCopy.filter((stop: any) => stop.colour === fromColour);
  expect(oldSheetStops(records[0])).toEqual([]);
  expect(oldSheetStops(records[1])).toEqual([{ offset: 0, colour: fromColour }, { offset: .72, colour: fromColour }]);
  expect(clean.image).not.toBe(full.image); expect(clean.layer).toBe('organs'); expect(full.layer).toBe('organs');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._layerTransition === (window as any).__captureLayerTransition)).toBe(true);
  expect((await state(page))._layerTransition).toEqual(layerTransition); expect(await proof(page)).toEqual(before); expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(frames);
  await saveImage(clean, 'transition-specimen'); await saveImage(full, 'transition-full-canvas');
  await writeFile(`${out}/transition-sheet-proof.json`, JSON.stringify(records.map(({ jpegAtCopy, pngAtCopy, ...record }: any) => record), null, 2));
});
