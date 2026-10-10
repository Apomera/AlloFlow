import { test, expect, type Page, type Locator, type Download } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_TOOLS_OUTPUT || 'reports/dissection-tools-cohesion-2026-10-05';
const baseline = process.env.DISSECTION_TOOLS_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
// Preserve the legacy frames, completed procedure, marks, notes, and learner scores.
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
const screenshotStyle = '.diss-next-action {position:static!important;}';
const errors = new WeakMap<Page, string[]>();
test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', error => messages.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page) || []).toEqual([]);
});

const source = (page: Page) => page.locator('[data-diss-canvas]');
const tools = (page: Page) => page.locator('#diss-lab-tools');
const group = (page: Page, name: string) => tools(page).locator(`[data-lab-tools-group="${name}"]`);
const preference = (page: Page) => page.locator('#diss-evidence-capture-contents');
const capture = (page: Page) => page.locator('[data-evidence-capture]');
const download = (page: Page) => page.locator('[data-canvas-download="true"]');
const ruler = (page: Page) => tools(page).getByRole('button', { name: 'Ruler', exact: true });
const annotate = (page: Page) => tools(page).getByRole('button', { name: 'Annotate', exact: true });
const clear = (page: Page) => tools(page).getByRole('button', { name: 'Clear annotations', exact: true });
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
async function notebookProof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { frames: d.visualEvidence, reference: d.referenceEvidenceId, comparison: d.splitComparison, open: d.evidenceNotebookOpen, contents: d.evidenceCaptureContents,
      removePending: d.evidenceRemovePendingId, clearPending: d.evidenceClearPending };
  });
}
async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  });
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

// Wrap only the product's native Capture APIs. The product performs every render
// and destination drawImage; this fixture observes its exact raster copy.
async function observeNativeCapture(page: Page, failCopyOnce = false) {
  await source(page).evaluate((node: any, injectFailure) => {
    const canvas = node as HTMLCanvasElement & Record<string, any>, ctx = canvas.getContext('2d')!;
    const records: any[] = []; (window as any).__captureObservations = records;
    const ignored = new Set(['_dissAnim', '_lastCaptureCamera', '_evidenceCaptureRequest']);
    const privateKeys = () => Object.keys(canvas).filter(k => k.startsWith('_') && !ignored.has(k)).sort();
    const serial = (value: any) => { try { return JSON.stringify(value); } catch { return '[unserializable]'; } };
    let failurePending = injectFailure;
    for (const [method, contents] of [['_captureDissectionEvidence', 'specimen'], ['_captureFullDissectionEvidence', 'canvas']]) {
      const native = canvas[method];
      if (typeof native !== 'function') throw new Error(`Missing native ${method}`);
      canvas[method] = function (destination: CanvasRenderingContext2D, width: number, height: number) {
        const keys = privateKeys(), refs = new Map(keys.map(k => [k, canvas[k]])), values = new Map(keys.map(k => [k, serial(canvas[k])]));
        const entryBitmap = canvas.toDataURL(), entryDataset = serial({ ...canvas.dataset });
        const record: any = { contents, width, height, sourceWidth: canvas.width, sourceHeight: canvas.height, entryOffscreen: canvas._dissInViewport === false,
          entryMotionReduced: canvas._dissMotionReduced, entryCameraTransition: serial(canvas._cameraTransition), stageCopies: 0, textBeforeCopy: [], textAfterCopy: [],
          entryClock: [canvas._livingFunctionElapsedMs, canvas._livingFunctionLastAt, canvas._livingFunctionReplayToken] };
        const nativeCopy = destination.drawImage, nativeText = ctx.fillText; let copied = false;
        destination.drawImage = function (...args: any[]) {
          if (args[0] === canvas) {
            record.stageCopies++; record.stageCamera = [canvas._interactionZoom, canvas._interactionPanX, canvas._interactionPanY]; record.stageView = canvas._drawD?.anatomicalView;
            if (failurePending) { failurePending = false; record.injectedFailure = true; throw new Error('Fixture native canvas copy failure'); }
          }
          const result = (nativeCopy as any).apply(this, args);
          if (args[0] === canvas) { copied = true; record.jpegAtCopy = destination.canvas.toDataURL('image/jpeg', .72); record.pngAtCopy = destination.canvas.toDataURL('image/png'); }
          return result;
        } as any;
        ctx.fillText = function (text: string, ...args: any[]) { (copied ? record.textAfterCopy : record.textBeforeCopy).push(String(text)); return (nativeText as any).call(this, text, ...args); };
        try { record.result = native.call(canvas, destination, width, height); return record.result; }
        finally {
          destination.drawImage = nativeCopy; ctx.fillText = nativeText;
          record.bitmapRestored = entryBitmap === canvas.toDataURL(); record.datasetRestored = entryDataset === serial({ ...canvas.dataset });
          record.keysRestored = serial(keys) === serial(privateKeys()); record.changedReferences = keys.filter(k => !Object.is(refs.get(k), canvas[k]));
          record.changedValues = keys.filter(k => values.get(k) !== serial(canvas[k])); record.requestCleared = canvas._evidenceCaptureRequest === null;
          record.exitClock = [canvas._livingFunctionElapsedMs, canvas._livingFunctionLastAt, canvas._livingFunctionReplayToken]; record.exitCameraTransition = serial(canvas._cameraTransition); records.push(record);
        }
      };
    }
  }, failCopyOnce);
}
async function observations(page: Page) { return page.evaluate(() => (window as any).__captureObservations || []); }
function restored(record: any) {
  expect(record.bitmapRestored).toBe(true); expect(record.datasetRestored).toBe(true); expect(record.keysRestored).toBe(true);
  expect(record.changedReferences).toEqual([]); expect(record.changedValues).toEqual([]); expect(record.requestCleared).toBe(true);
  expect(record.exitClock).toEqual(record.entryClock); expect(record.exitCameraTransition).toBe(record.entryCameraTransition);
}
async function rememberDownloadCamera(page: Page) {
  await source(page).evaluate((canvas: any) => {
    (window as any).__downloadCamera = { own: Object.prototype.hasOwnProperty.call(canvas, '_lastCaptureCamera'), value: canvas._lastCaptureCamera };
  });
}
async function expectDownloadCameraRestored(page: Page) {
  expect(await source(page).evaluate((canvas: any) => {
    const saved = (window as any).__downloadCamera;
    return Object.prototype.hasOwnProperty.call(canvas, '_lastCaptureCamera') === saved.own && Object.is(canvas._lastCaptureCamera, saved.value);
  })).toBe(true);
}
async function nativeCapture(page: Page, key = 'Enter') {
  const count = (await state(page)).visualEvidence.length;
  await capture(page).focus(); await page.keyboard.press(key);
  await expect.poll(async () => (await state(page)).visualEvidence.length).toBe(count + 1);
  const frame = (await state(page)).visualEvidence[count];
  expect(frame.image).toMatch(/^data:image\/jpeg;base64,/); expect((await state(page)).referenceEvidenceId).toBe(frame.id);
  await expect(page.locator('#diss-reference-heading')).toHaveText(`Reference frame ${count + 1}`); await expect(page.locator('#diss-reference-heading')).toBeFocused();
  return frame;
}
async function pngProof(downloaded: Download, record: any, name: string) {
  expect(downloaded.suggestedFilename()).toBe('frog_dissection.png'); expect(await downloaded.failure()).toBeNull();
  const path = await downloaded.path(); expect(path).toBeTruthy(); const bytes = await readFile(path!);
  expect(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([record.sourceWidth, record.sourceHeight]);
  expect(bytes.equals(Buffer.from(record.pngAtCopy.split(',')[1], 'base64'))).toBe(true);
  expect([record.width, record.height]).toEqual([record.sourceWidth, record.sourceHeight]); expect(record.stageCopies).toBe(1); expect(record.result).toBe(true); restored(record);
  await downloaded.saveAs(`${out}/${name}.png`);
}
async function downloadPng(page: Page, name: string, key = 'Enter') {
  const before = await proof(page), notebook = await notebookProof(page); await rememberDownloadCamera(page);
  const event = page.waitForEvent('download'); await download(page).focus(); await page.keyboard.press(key); const downloaded = await event;
  const records = await observations(page), record = records[records.length - 1]; await pngProof(downloaded, record, name);
  expect(await proof(page)).toEqual(before); expect(await notebookProof(page)).toEqual(notebook); await expectDownloadCameraRestored(page);
  await expect(download(page)).toBeFocused(); expect((await state(page)).procedureFeedback.message).toBe('Full canvas saved as frog_dissection.png.');
  return record;
}
async function metrics(panel: Locator) {
  return panel.evaluate(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return { width: rect.width, client: el.clientWidth, scroll: el.scrollWidth, columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
      containerWidth: el.closest('[data-dissection-root]')!.getBoundingClientRect().width,
      groups: Array.from(el.querySelectorAll('.diss-lab-tool-group')).map(n => { const box = n.getBoundingClientRect(); return { name: n.getAttribute('data-lab-tools-group'), top: box.top, left: box.left, width: box.width }; }),
      text: Array.from(el.querySelectorAll('h4,label,p')).filter(n => n.getClientRects().length && n.textContent?.trim()).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1, textOverflow: getComputedStyle(n).textOverflow })),
      controls: Array.from(el.querySelectorAll('button,select')).map(n => ({ name: n.getAttribute('aria-label') || n.textContent, font: parseFloat(getComputedStyle(n).fontSize), height: n.getBoundingClientRect().height, width: n.getBoundingClientRect().width, clipped: n.scrollWidth > n.clientWidth + 1 })) };
  });
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-lab-tools']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
async function styles(control: Locator) {
  return control.evaluate(n => { const s = getComputedStyle(n); return { border: parseFloat(s.borderTopWidth), borderStyle: s.borderTopStyle, decoration: s.textDecorationLine, opacity: s.opacity, cursor: s.cursor, outline: parseFloat(s.outlineWidth), outlineStyle: s.outlineStyle }; });
}
async function expectPressed(control: Locator) {
  await expect(control).toHaveAttribute('aria-pressed', 'true'); const s = await styles(control); expect(s.border).toBeGreaterThanOrEqual(3); expect(s.decoration).toContain('underline');
}
async function expectDisabled(control: Locator) {
  await expect(control).toBeDisabled(); const s = await styles(control); expect(s.opacity).toBe('1'); expect(s.borderStyle).toBe('dashed'); expect(s.cursor).toBe('not-allowed');
}
async function expectFocus(control: Locator) {
  await expect(control).toBeFocused(); const s = await styles(control); expect(s.outline).toBeGreaterThanOrEqual(3); expect(s.outlineStyle).toBe('solid');
}
async function writeObservations(page: Page, name: string, extra: any = {}) {
  const records = (await observations(page)).map(({ jpegAtCopy, pngAtCopy, ...record }: any) => ({ ...record, pngLength: pngAtCopy?.length, jpegLength: jpegAtCopy?.length }));
  await writeFile(`${out}/${name}.json`, JSON.stringify({ ...extra, observations: records }, null, 2));
}

const layouts = [
  { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  { name: 'embedded-medium', width: 1440, available: 520 }, { name: 'embedded-large-contrast', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
];
for (const c of layouts) test(`lab tool groups layout ${c.name}`, async ({ page }) => {
  if (c.forced) await page.emulateMedia({ forcedColors: 'active' });
  await mount(page, { largeText: !!c.large, highContrast: !!c.contrast, annotateMode: true, annotations: [] }, c.width, c.available);
  await tools(page).scrollIntoViewIfNeeded(); const before = await proof(page), saved = await notebookProof(page), prefix = baseline ? 'before' : 'after';
  await tools(page).screenshot({ path: `${out}/${prefix}-${c.name}-tools.png`, style: screenshotStyle });
  expect(await proof(page)).toEqual(before); expect(await notebookProof(page)).toEqual(saved);
  if (baseline) return;
  await expect(tools(page)).toHaveAccessibleName('Lab tools'); await expect(tools(page).locator('.diss-lab-tool-group')).toHaveCount(3);
  for (const [key, name, headingId] of [['observe', 'Observe and measure', 'diss-lab-observe-heading'], ['evidence', 'Capture and download', 'diss-lab-evidence-heading'], ['records', 'Report and reset', 'diss-lab-records-heading']]) {
    await expect(group(page, key)).toHaveAttribute('role', 'group'); await expect(group(page, key)).toHaveAttribute('aria-labelledby', headingId); await expect(group(page, key)).toHaveAccessibleName(name);
    await expect(page.locator(`#${headingId}`)).toHaveText(name);
  }
  await expect(group(page, 'observe').getByRole('button')).toHaveCount(3); await expect(group(page, 'evidence').getByRole('button')).toHaveCount(2); await expect(group(page, 'records').getByRole('button')).toHaveCount(2);
  await expect(download(page)).toHaveAccessibleName('Download full canvas PNG'); await expect(preference(page)).toHaveAccessibleName('Frame contents'); await expect(preference(page)).toHaveAttribute('aria-describedby', 'diss-evidence-capture-help');
  expect(await group(page, 'evidence').evaluate(n => {
    const options = n.querySelector('.diss-capture-options'), actions = options?.nextElementSibling;
    return actions?.classList.contains('diss-lab-tool-actions') && actions.children.length === 2
      && actions.children[0].hasAttribute('data-evidence-capture') && actions.children[1].getAttribute('data-canvas-download') === 'true';
  })).toBe(true);
  await expectPressed(annotate(page)); await expectDisabled(clear(page));
  await preference(page).focus(); await expectFocus(preference(page));
  const m = await metrics(tools(page)); expect(m.width).toBeLessThanOrEqual(c.available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1);
  const columns = m.containerWidth <= 520 ? 1 : m.containerWidth <= 980 ? 2 : 3; expect(m.columns).toBe(columns);
  const [observe, evidence, records] = m.groups;
  if (columns === 3) { expect(Math.abs(observe.top - evidence.top)).toBeLessThan(1); expect(Math.abs(observe.top - records.top)).toBeLessThan(1); }
  if (columns === 2) { expect(Math.abs(observe.top - evidence.top)).toBeLessThan(1); expect(records.top).toBeGreaterThan(observe.top); expect(records.width).toBeGreaterThan(observe.width * 1.8); }
  if (columns === 1) { expect(evidence.top).toBeGreaterThan(observe.top); expect(records.top).toBeGreaterThan(evidence.top); }
  for (const t of m.text) { expect(t.font, t.text || '').toBeGreaterThanOrEqual(c.large ? 16 : 14); expect(t.clipped, t.text || '').toBe(false); expect(t.textOverflow).not.toBe('ellipsis'); }
  for (const b of m.controls) { expect(b.height, b.name || '').toBeGreaterThanOrEqual(47.9); expect(b.height, b.name || '').toBeLessThan(130); expect(b.width, b.name || '').toBeGreaterThanOrEqual(47.9); expect(b.font, b.name || '').toBeGreaterThanOrEqual(c.large ? 18 : 16); expect(b.clipped, b.name || '').toBe(false); }
  await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(m, null, 2)); await audit(page, c.name);
});

test('grouped observation controls keep native mutually exclusive modes and clear only marks', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180); const before = await proof(page), saved = await notebookProof(page);
  await ruler(page).focus(); await page.keyboard.press('Space'); await expectPressed(ruler(page)); await expect(annotate(page)).toHaveAttribute('aria-pressed', 'false');
  expect((await state(page)).rulerMode).toBe(true); expect((await state(page)).annotateMode).toBe(false);
  await page.keyboard.press('Tab'); await expectFocus(annotate(page)); await page.keyboard.press('Enter'); await expectPressed(annotate(page)); await expect(ruler(page)).toHaveAttribute('aria-pressed', 'false');
  expect((await state(page)).annotateMode).toBe(true); expect((await state(page)).rulerMode).toBe(false);
  await page.keyboard.press('Tab'); await expectFocus(clear(page)); await page.keyboard.press('Space'); await expectDisabled(clear(page));
  const after = await proof(page); expect(after.points[0]).toEqual([]); expect(after.points.slice(1, 3)).toEqual(before.points.slice(1, 3)); expect({ ...after, points: before.points }).toEqual(before); expect(await notebookProof(page)).toEqual(saved);
  await page.keyboard.press('Tab'); await expectFocus(preference(page));
});

test('keyboard Frame contents Capture and Download use distinct native sizes and preserve captured evidence', async ({ page }) => {
  test.skip(baseline); await mount(page, { sceneDetail: true }, 1440, 1180); await painted(page); await observeNativeCapture(page); const before = await proof(page);
  await preference(page).focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(preference(page)).toHaveValue('canvas');
  await page.keyboard.press('Tab'); await expectFocus(capture(page)); const frame = await nativeCapture(page, 'Space');
  expect(frame.captureContents).toBe('canvas'); expect(frame.camera).toEqual({ zoom: 1.5, panX: 15, panY: -8 }); expect(await proof(page)).toEqual(before);
  const first = (await observations(page))[0]; restored(first); expect([first.width, first.height]).toEqual([220, 264]); expect(first.jpegAtCopy).toBe(frame.image);
  // Capture's established handoff focuses the new reference; return to the control
  // and prove its immediate next keyboard stop is the separate PNG download.
  await capture(page).focus(); await page.keyboard.press('Tab'); await expectFocus(download(page));
  const png = await downloadPng(page, 'keyboard-native-full-canvas', 'Space'); expect(png.contents).toBe('canvas');
  expect(png.textBeforeCopy.some((s: string) => s === 'ANATOMICAL AXIS')).toBe(true); expect(png.textBeforeCopy.some((s: string) => s.startsWith('MACRO '))).toBe(true);
  expect((await state(page)).visualEvidence.slice(0, 3)).toEqual(frames); expect((await observations(page)).length).toBe(2); await writeObservations(page, 'keyboard-native-proof');
});

test('native PNG download refreshes offscreen view and camera while restoring visible pixels and notebook', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180); await painted(page); await observeNativeCapture(page);
  await page.setViewportSize({ width: 1440, height: 320 }); await page.addStyleTag({ content: '#diss-lab-tools {margin-bottom:360px!important;}' });
  await download(page).scrollIntoViewIfNeeded(); await expect(download(page)).toBeInViewport();
  await expect.poll(async () => source(page).evaluate((c: any) => { const r = c.getBoundingClientRect(); return (r.bottom <= 0 || r.top >= window.innerHeight) && c._dissInViewport === false; })).toBe(true);
  const oldBitmap = await source(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { anatomicalView: 'lateral', canvasZoom: 2, canvasPanX: -21, canvasPanY: 11 }));
  await expect.poll(async () => source(page).evaluate((c: any) => c._drawD?.anatomicalView)).toBe('lateral');
  expect(await source(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(oldBitmap);
  const record = await downloadPng(page, 'offscreen-lateral-native-full-canvas'); expect(record.entryOffscreen).toBe(true); expect(record.stageView).toBe('lateral'); expect(record.stageCamera).toEqual([2, -21, 11]); expect(record.pngAtCopy).not.toBe(oldBitmap);
  expect(await source(page).evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(oldBitmap); expect((await state(page)).visualEvidence).toEqual(frames); expect((await state(page)).referenceEvidenceId).toBe(102);
  const geometry = await page.evaluate(() => { const box = (n: Element) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; }; return { viewportHeight: window.innerHeight, canvas: box(document.querySelector('[data-diss-canvas]')!), download: box(document.querySelector('[data-canvas-download]')!) }; });
  await writeObservations(page, 'offscreen-native-proof', { geometry });
});

test('failed native PNG copy restores animated clocks and capture camera then permits download retry', async ({ page }) => {
  test.skip(baseline); await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { activeLayer: 'organs', selectedOrgan: null, hoveredOrgan: null, inspectionLens: false, macroInset: false,
    revealedLayers: { skin: true, muscle: true }, procedureByLayer: { skin: complete, muscle: complete, organs: complete },
    livingFunctionEnabled: true, livingFunctionPaused: false, livingFunctionSpeed: 'fast' }, 390, 390);
  await page.getByRole('button', { name: 'View and accessibility options', exact: true }).click();
  const motion = page.getByRole('button', { name: 'Toggle additional reduced motion; operating system reduced motion settings are always honored', exact: true });
  await expect(motion).toHaveAttribute('aria-pressed', 'true'); await motion.click(); await expect(motion).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Lab tool options', exact: true }).click(); await painted(page);
  await expect.poll(async () => source(page).evaluate((c: any) => c._dissMotionReduced)).toBe(false); await expect(page.locator('.diss-living-function')).toHaveAttribute('data-motion', 'playing');
  await expect.poll(async () => source(page).evaluate((c: any) => c._livingFunctionElapsedMs)).toBeGreaterThan(0); await observeNativeCapture(page, true);
  const saved = await notebookProof(page); await rememberDownloadCamera(page); const downloaded: Download[] = []; page.on('download', event => downloaded.push(event));
  await page.evaluate(() => { (document.querySelector('[aria-label="Move specimen right"]') as HTMLButtonElement).click(); const b = document.querySelector('[data-canvas-download]') as HTMLButtonElement; b.focus(); b.click(); });
  await expect.poll(async () => (await observations(page)).length).toBe(1); const before = await proof(page), failed = (await observations(page))[0];
  expect(failed.injectedFailure).toBe(true); expect(failed.result).toBe(false); expect(failed.stageCopies).toBe(1); expect(failed.contents).toBe('canvas'); restored(failed); await expectDownloadCameraRestored(page);
  expect(failed.entryMotionReduced).toBe(false); expect(JSON.parse(failed.entryCameraTransition).duration).toBe(520); expect(failed.entryClock[0]).toBeGreaterThan(0); expect(downloaded).toHaveLength(0);
  expect(await notebookProof(page)).toEqual(saved); await expect(download(page)).toBeFocused(); expect((await state(page)).procedureFeedback.message).toBe('Canvas download is unavailable in this view.');
  await rememberDownloadCamera(page); const event = page.waitForEvent('download');
  await page.evaluate(() => { (document.querySelector('[aria-label="Move specimen right"]') as HTMLButtonElement).click(); (document.querySelector('[data-canvas-download]') as HTMLButtonElement).click(); });
  const retryDownload = await event, retry = (await observations(page))[1]; await pngProof(retryDownload, retry, 'animated-native-full-canvas-retry'); await expectDownloadCameraRestored(page);
  expect(retry.entryMotionReduced).toBe(false); expect(JSON.parse(retry.entryCameraTransition).duration).toBe(520); expect(await notebookProof(page)).toEqual(saved);
  const after = await proof(page); expect({ ...after, camera: before.camera }).toEqual(before); await painted(page);
  await expect.poll(async () => source(page).evaluate((c: any) => c._livingFunctionElapsedMs)).toBeGreaterThan(retry.entryClock[0]); await writeObservations(page, 'failed-copy-native-proof');
});

test('grouped Lab Report retains learner text and canceled native Reset restores focus and protected records', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 1440, 1180); const before = await proof(page), saved = await notebookProof(page);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__copiedReport = text; } } }); });
  const report = group(page, 'records').getByRole('button', { name: /^Copy (accurate )?lab report to clipboard$/ });
  await report.focus(); await page.keyboard.press('Enter'); await expect.poll(async () => page.evaluate(() => (window as any).__copiedReport || '')).toContain('Virtual Dissection Lab Report:');
  const text = await page.evaluate(() => (window as any).__copiedReport);
  expect(text).toContain('Evidence note: A transparent protective membrane supports this identification.'); expect(text).toContain('Verified identifications: 1'); expect(text).toContain('evidence frames: 3');
  expect(await proof(page)).toEqual(before); expect(await notebookProof(page)).toEqual(saved); await expect(report).toBeFocused();
  const reset = page.locator('#diss-reset-specimen'); await page.keyboard.press('Tab'); await expectFocus(reset); await page.keyboard.press('Space');
  await expect(reset).toHaveAttribute('aria-expanded', 'true'); await expect(page.locator('#diss-reset-confirmation')).toBeVisible();
  await expect(page.locator('#diss-reset-confirm')).toBeFocused(); await expect(page.locator('#diss-reset-confirmation')).toContainText('permanently removes');
  expect(await proof(page)).toEqual(before); expect(await notebookProof(page)).toEqual(saved);
  await page.keyboard.press('Tab'); await expect(page.locator('#diss-reset-cancel')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-reset-confirmation')).toHaveCount(0); await expect(reset).toHaveAttribute('aria-expanded', 'false'); await expectFocus(reset);
  expect(await proof(page)).toEqual(before); expect(await notebookProof(page)).toEqual(saved); expect((await state(page)).resetConfirmPending).toBe(false);
  await writeFile(`${out}/report-reset-proof.json`, JSON.stringify({ reportLength: text.length, priorFrameIds: saved.frames.map((frame: any) => frame.id), focusReturned: true }, null, 2)); await audit(page, 'report-reset');
});
