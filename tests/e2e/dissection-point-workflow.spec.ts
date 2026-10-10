import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.MARKING_OUTPUT || 'reports/dissection-point-workflow-2026-10-05';
const baseline = process.env.MARKING_BASELINE === '1';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'probe', selectedOrgan: 'nictitating', hoveredOrgan: 'tympanum', revealedLayers: { skin: true }, procedureByLayer: { skin: complete },
  canvasZoom: 1, canvasPanX: 0, canvasPanY: 0, workspaceMode: 'advanced', toolbarToolsOpen: true, techniquePanelOpen: false,
  exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'A transparent protective membrane.' }, organConfidence: { 'frog|nictitating': 3 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } }, quizScore: 1, quizTotal: 2,
  visualEvidence: [{ id: 88, image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGPgF9f6DwAB2QFQiLRdVgAAAABJRU5ErkJggg==', layer: 'skin', layerName: 'External Anatomy', view: 'dorsal', condition: 'standard', capturedAt: '2026-10-05T12:00:00.000Z', specimen: 'frog' }], referenceEvidenceId: 88, splitComparison: false,
  annotations: [], inspectionLens: true, macroInset: true, lensPinned: true, lensPinnedPoint: { x: .65, y: .24 }, lensPinnedOrganId: 'tympanum', lensFocusDepth: 'structure', lensMagnification: 4, lightIntensity: 60,
  visualRealism: 'accessible', specimenCondition: 'standard', parallaxDepth: false, reducedMotion: true, soundEnabled: false, sceneDetail: false,
};
const firstAnchor = { x: .5, y: .38 };
const lastAnchor = { x: .6, y: .18 };
const captureStyle = '.diss-next-action {position:static!important;}';

test.describe.configure({ retries: 0, timeout: 240000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });

async function mount(page: Page, seed: any = {}, width = 390, available = width) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const m = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); m.setAttribute('name', 'viewport'); m.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
}
const guide = (page: Page) => page.locator('.diss-pointer-guide');
const canvas = (page: Page) => page.locator('[data-diss-canvas]');
const pointStatus = (page: Page) => guide(page).locator('[data-diss-point-status]');
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function proof(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return { specimen: d.specimen, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], lens: [d.inspectionLens, d.macroInset, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId, d.lensFocusDepth, d.lensMagnification],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers, procedures: d.procedureByLayer, calibration: d.toolCalibration,
      scores: [d.quizScore, d.quizTotal], evidence: d.visualEvidence, reference: d.referenceEvidenceId, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  });
}
async function points(page: Page) { const d = await state(page); return { annotations: d.annotations || [], start: d.rulerStart || null, end: d.rulerEnd || null }; }
function pointMatches(actual: any, expected: { x: number; y: number }) { expect(actual).toBeTruthy(); expect(actual.x).toBeCloseTo(expected.x, 6); expect(actual.y).toBeCloseTo(expected.y, 6); }
function nativePointMatches(actual: any, expected: { x: number; y: number }, placement: { width: number; height: number; zoom: number }) {
  // Native mouse coordinates can round to a CSS pixel; keyboard anchors remain exact above.
  expect(actual).toBeTruthy(); expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(1 / (placement.width * placement.zoom) + .00001);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(1 / (placement.height * placement.zoom) + .00001);
}
async function activate(page: Page, mode: 'Annotate' | 'Ruler', key = 'Enter') {
  const control = page.locator('#diss-lab-tools').getByRole('button', { name: mode, exact: true });
  await control.focus(); await page.keyboard.press(key); await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(guide(page).locator('#diss-point-mode-help')).toBeVisible();
}
async function focusCanvasFromGuide(page: Page) {
  await guide(page).locator('[data-diss-point-canvas]').focus(); await page.keyboard.press('Enter'); await expect(canvas(page)).toBeFocused();
}
async function nativePoint(page: Page, canonical: { x: number; y: number }, click = true) {
  await canvas(page).scrollIntoViewIfNeeded();
  // Read the live inverse-transform inputs without modifying the renderer or invoking its callbacks.
  const placement = await canvas(page).evaluate((node, point) => {
    const c = node as any, r = c.getBoundingClientRect(), d = (window as any).__ctx.toolData.dissection;
    const w = c._logicalW || c.width || 500, h = c._logicalH || c.height || 600;
    const zoom = Number(c._interactionZoom) || d.canvasZoom || 1;
    const px = Number.isFinite(Number(c._interactionPanX)) ? Number(c._interactionPanX) : d.canvasPanX || 0;
    const py = Number.isFinite(Number(c._interactionPanY)) ? Number(c._interactionPanY) : d.canvasPanY || 0;
    return { x: r.x + (.5 + (point.x - .5) * zoom + px / w + (Number(c._parallaxX) || 0) / w) * r.width,
      y: r.y + (.5 + (point.y - .5) * zoom + py / h + (Number(c._parallaxY) || 0) / h) * r.height, zoom, px, py, left: r.x, top: r.y, width: r.width, height: r.height };
  }, canonical);
  expect(placement.x).toBeGreaterThan(placement.left); expect(placement.x).toBeLessThan(placement.left + placement.width);
  expect(placement.y).toBeGreaterThan(placement.top); expect(placement.y).toBeLessThan(placement.top + placement.height);
  await page.mouse.move(placement.x, placement.y);
  if (click) await page.mouse.click(placement.x, placement.y);
  return placement;
}
async function captureCanvas(page: Page, name: string) {
  await canvas(page).scrollIntoViewIfNeeded();
  await expect.poll(async () => canvas(page).evaluate(node => {
    const c = node as any, r = c.getBoundingClientRect();
    return c._dissInViewport === true && r.width > 0 && r.height > 0 && c._logicalW > 0 && c._logicalH > 0;
  })).toBe(true);
  // Read actual painted pixels rather than invoking the renderer's draw hook.
  const pixels = await canvas(page).evaluate(node => {
    const c = node as HTMLCanvasElement, context = c.getContext('2d')!, values = context.getImageData(0, 0, c.width, c.height).data;
    const colours = new Set<string>(); let opaque = 0, samples = 0;
    for (let y = 0; y < c.height; y += Math.max(1, Math.floor(c.height / 24))) for (let x = 0; x < c.width; x += Math.max(1, Math.floor(c.width / 24))) {
      const i = (y * c.width + x) * 4; colours.add(`${values[i]},${values[i + 1]},${values[i + 2]},${values[i + 3]}`); if (values[i + 3] > 0) opaque++; samples++;
    }
    return { colours: colours.size, opaque, samples, width: c.width, height: c.height };
  });
  expect(pixels.colours).toBeGreaterThanOrEqual(8); expect(pixels.opaque).toBeGreaterThan(pixels.samples / 2);
  await writeFile(`${out}/${name}-pixels.json`, JSON.stringify(pixels, null, 2)); await canvas(page).screenshot({ path: `${out}/${name}.png`, style: captureStyle });
}
async function metrics(p: Locator) {
  return p.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth,
    text: Array.from(el.querySelectorAll('strong,p,[data-pointer-guide-instruction],[data-diss-point-status]')).filter(n => n.getClientRects().length && n.textContent?.trim()).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })),
    buttons: Array.from(el.querySelectorAll('button')).filter(n => n.getClientRects().length).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height, clipped: n.scrollWidth > n.clientWidth + 1, top: n.getBoundingClientRect().top, left: n.getBoundingClientRect().left })) }));
}
async function readable(p: Locator, available: number, large = false) {
  const m = await metrics(p); expect(m.width).toBeLessThanOrEqual(available + 1); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); expect(m.text.length).toBeGreaterThanOrEqual(3); expect(m.buttons.length).toBeGreaterThanOrEqual(3);
  for (const t of m.text) { expect(t.font, t.text || '').toBeGreaterThanOrEqual(large ? 16 : 14); expect(t.clipped, t.text || '').toBe(false); }
  for (const b of m.buttons) { expect(b.font, b.text || '').toBeGreaterThanOrEqual(large ? 18 : 16); expect(b.height, b.text || '').toBeGreaterThanOrEqual(47.9); expect(b.width, b.text || '').toBeGreaterThanOrEqual(47.9); expect(b.clipped, b.text || '').toBe(false); }
  if (available <= 640) for (const b of m.buttons) expect(b.left).toBeCloseTo(m.buttons[0].left, 0);
  return m;
}
async function focusStyle(control: Locator) {
  const m = await control.evaluate(el => { const s = getComputedStyle(el); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor, background: s.backgroundColor }; });
  expect(m.width).toBeGreaterThanOrEqual(2.9); expect(m.style).toBe('solid'); return m;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-pointer-guide']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
const layouts = [
  { name: 'phone', width: 320, available: 320, mode: 'Annotate' }, { name: 'tablet', width: 768, available: 768, mode: 'Ruler' },
  { name: 'desktop', width: 1440, available: 1180, mode: 'Annotate' }, { name: 'embedded-medium', width: 1440, available: 520, mode: 'Ruler' },
  { name: 'embedded-large', width: 1440, available: 320, mode: 'Annotate', large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, mode: 'Ruler', forced: true },
] as const;
for (const c of layouts) test(`point workflow layout ${c.name}`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  if ('forced' in c && c.forced) await page.emulateMedia({ forcedColors: 'active' });
  const isAnnotation = c.mode === 'Annotate', large = 'large' in c && !!c.large;
  await mount(page, { annotateMode: isAnnotation, rulerMode: !isAnnotation, annotations: isAnnotation ? [{ ...firstAnchor, type: 'dot' }, { ...lastAnchor, type: 'dot', prevX: firstAnchor.x, prevY: firstAnchor.y }] : [],
    rulerStart: !isAnnotation ? firstAnchor : null, rulerEnd: !isAnnotation ? lastAnchor : null, largeText: large, highContrast: 'contrast' in c && !!c.contrast }, c.width, c.available);
  const prefix = baseline ? 'before' : 'after', p = guide(page), before = await proof(page), savedPoints = await points(page);
  await expect(p).toBeVisible(); await writeFile(`${out}/${prefix}-${c.name}-metrics.json`, JSON.stringify(await metrics(p), null, 2));
  await p.screenshot({ path: `${out}/${prefix}-${c.name}.png`, style: captureStyle }); if (baseline) return;
  await readable(p, c.available, large); await expect(p.locator('#diss-point-mode-help')).toContainText(/Arrow|Home/);
  await expect(pointStatus(page)).toContainText(isAnnotation ? /2/ : 'Approximate model distance: 1.8 cm');
  const focus = p.locator('[data-diss-point-canvas]'); await focus.focus(); await writeFile(`${out}/${c.name}-focus.json`, JSON.stringify(await focusStyle(focus), null, 2));
  await p.screenshot({ path: `${out}/focus-${c.name}.png`, style: captureStyle }); await page.keyboard.press('Space'); await expect(canvas(page)).toBeFocused();
  expect(await points(page)).toEqual(savedPoints); expect(await proof(page)).toEqual(before); await audit(page, c.name); expect(errors).toEqual([]);
});

test('keyboard annotations browse anchors without inspection and undo the last point', async ({ page }) => {
  test.skip(baseline); await mount(page, {}, 320); const before = await proof(page); await activate(page, 'Annotate'); await focusCanvasFromGuide(page);
  for (const [key, commit, expected] of [['Home', 'Enter', firstAnchor], ['End', 'Space', lastAnchor], ['ArrowLeft', 'Enter', { x: .65, y: .24 }]] as const) {
    const prior = await points(page); await page.keyboard.press(key); expect(await points(page)).toEqual(prior); expect(await proof(page)).toEqual(before);
    if (key === 'Home') await captureCanvas(page, 'keyboard-anchor-phone');
    await page.keyboard.press(commit); const after = (await points(page)).annotations; expect(after.length).toBe(prior.annotations.length + 1); pointMatches(after.at(-1), expected); expect(await proof(page)).toEqual(before);
  }
  const undo = guide(page).locator('[data-diss-point-undo]'); await undo.focus(); await page.keyboard.press('Space'); await expect(undo).toBeFocused();
  const afterUndo = await points(page); expect(afterUndo.annotations).toHaveLength(2); pointMatches(afterUndo.annotations.at(-1), lastAnchor);
  await focusCanvasFromGuide(page); await page.keyboard.press('Escape'); await expect(canvas(page)).toBeFocused(); expect((await state(page)).annotateMode).toBe(false); expect(await points(page)).toEqual(afterUndo); expect(await proof(page)).toEqual(before);
  await guide(page).screenshot({ path: `${out}/annotation-exit.png`, style: captureStyle });
});

test('keyboard ruler explains first point completion restart clear and retained measurement', async ({ page }) => {
  test.skip(baseline); await mount(page); const before = await proof(page); await activate(page, 'Ruler', 'Space'); await focusCanvasFromGuide(page);
  await expect(guide(page).locator('[data-pointer-guide-instruction]')).toContainText(/first/i); await page.keyboard.press('Home'); expect(await proof(page)).toEqual(before); await page.keyboard.press('Enter');
  pointMatches((await points(page)).start, firstAnchor); expect((await points(page)).end).toBeNull(); await expect(guide(page).locator('[data-pointer-guide-instruction]')).toContainText(/second/i);
  await page.keyboard.press('End'); expect(await proof(page)).toEqual(before); await page.keyboard.press('Space'); pointMatches((await points(page)).end, lastAnchor);
  await expect(pointStatus(page)).toContainText('Approximate model distance: 1.8 cm'); await expect(guide(page).locator('[data-pointer-guide-instruction]')).toContainText(/new measurement/i);
  const completed = await points(page); await guide(page).locator('[data-diss-point-exit]').focus(); await page.keyboard.press('Enter'); await expect(canvas(page)).toBeFocused();
  expect((await state(page)).rulerMode).toBe(false); expect(await points(page)).toEqual(completed); await expect(pointStatus(page)).toContainText('Approximate model distance: 1.8 cm'); expect(await proof(page)).toEqual(before);
  await activate(page, 'Ruler'); await focusCanvasFromGuide(page); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  pointMatches((await points(page)).start, firstAnchor); expect((await points(page)).end).toBeNull();
  await guide(page).locator('[data-diss-measurement-clear]').focus(); await page.keyboard.press('Space'); expect((await state(page)).rulerMode).toBe(true); expect((await points(page)).start).toBeNull(); expect((await points(page)).end).toBeNull();
  await expect(guide(page).locator('[data-pointer-guide-instruction]')).toContainText(/first/i); expect(await proof(page)).toEqual(before);
  await guide(page).screenshot({ path: `${out}/measurement-cleared.png`, style: captureStyle });
});

test('native pointer marks and ruler use real zoom pan inversion without changing inspection', async ({ page }) => {
  test.skip(baseline);
  await page.addInitScript(() => {
    (window as any).__markingCanvasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text: string, x: number, y: number, maxWidth?: number) {
      if (this.canvas.matches('[data-diss-canvas]')) {
        const log = (window as any).__markingCanvasText as string[];
        if (log.length < 20000) log.push(String(text));
      }
      return maxWidth === undefined ? original.call(this, text, x, y) : original.call(this, text, x, y, maxWidth);
    };
  });
  await mount(page, { canvasZoom: 1.7, canvasPanX: 21, canvasPanY: -13 }, 1440, 1180);
  await expect.poll(async () => canvas(page).evaluate(node => Number((node as any)._interactionZoom))).toBeCloseTo(1.7, 6);
  const before = await proof(page); await activate(page, 'Annotate');
  expect(before.evidence).toHaveLength(1); expect(before.reference).toBe(88);
  await page.evaluate(() => { (window as any).__markingCanvasText = []; });
  const a = { x: .26, y: .46 }, b = firstAnchor;
  await nativePoint(page, a, false); expect(await proof(page)).toEqual(before); const firstPlacement = await nativePoint(page, a); nativePointMatches((await points(page)).annotations[0], a, firstPlacement);
  const secondPlacement = await nativePoint(page, b); nativePointMatches((await points(page)).annotations[1], b, secondPlacement); expect(await proof(page)).toEqual(before);
  await expect.poll(async () => page.evaluate(() => (window as any).__markingCanvasText.length)).toBeGreaterThan(10);
  const annotationText: string[] = await page.evaluate(() => (window as any).__markingCanvasText.slice());
  expect(annotationText.some(text => /PALPATION/i.test(text))).toBe(false);
  await activate(page, 'Ruler'); expect((await state(page)).annotateMode).toBe(false); const annotations = (await points(page)).annotations;
  await page.evaluate(() => { (window as any).__markingCanvasText = []; });
  const startPlacement = await nativePoint(page, b); nativePointMatches((await points(page)).start, b, startPlacement);
  const endPlacement = await nativePoint(page, { x: .56, y: .46 }); nativePointMatches((await points(page)).end, { x: .56, y: .46 }, endPlacement);
  await expect(pointStatus(page)).toContainText('Approximate model distance: 0.8 cm'); expect((await points(page)).annotations).toEqual(annotations); expect(await proof(page)).toEqual(before);
  await writeFile(`${out}/inverse-transform.json`, JSON.stringify({ placement: firstPlacement, points: await points(page), preserved: await proof(page) }, null, 2));
  await guide(page).screenshot({ path: `${out}/pointer-measurement.png`, style: captureStyle });
  await captureCanvas(page, 'pointer-measurement-desktop');
  await expect.poll(async () => page.evaluate(() => (window as any).__markingCanvasText.length)).toBeGreaterThan(10);
  const rulerText: string[] = await page.evaluate(() => (window as any).__markingCanvasText.slice());
  await writeFile(`${out}/pointer-canvas-text.json`, JSON.stringify({ annotation: annotationText, ruler: rulerText }, null, 2));
  expect(rulerText.some(text => /PALPATION/i.test(text))).toBe(false);
});

test('point keyboard commits cannot perform an otherwise ready probe technique', async ({ page }) => {
  test.skip(baseline); const ready = { ...complete, probed: false, history: order.slice(0, -1), actionLog: complete.actionLog.slice(0, -1), learningChecks: { ...complete.learningChecks, probe: { predictionCorrect: true, reflectionCorrect: false } } };
  await mount(page, { anatomicalView: 'ventral', selectedOrgan: 'tympanum', hoveredOrgan: 'nictitating', revealedLayers: {}, procedureByLayer: { skin: ready }, techniquePanelOpen: true }, 1440, 1180);
  await expect(page.getByRole('region', { name: 'Active instrument action readiness', exact: true })).toHaveAttribute('data-tone', 'ready');
  const before = await proof(page); await activate(page, 'Annotate'); await focusCanvasFromGuide(page); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  expect((await points(page)).annotations).toHaveLength(1); expect(await proof(page)).toEqual(before);
  await activate(page, 'Ruler'); await focusCanvasFromGuide(page); await page.keyboard.press('Home'); await page.keyboard.press('Space'); expect((await points(page)).start).not.toBeNull(); expect((await points(page)).end).toBeNull();
  await page.keyboard.press('End'); await page.keyboard.press('Enter'); expect((await points(page)).end).not.toBeNull(); expect(await proof(page)).toEqual(before); expect((await state(page)).procedureByLayer.skin.probed).toBe(false);
});

test('unexposed structures keep a truthful keyboard fallback and allow pointer points', async ({ page }) => {
  test.skip(baseline); await mount(page, { activeLayer: 'organs', anatomicalView: 'internal', selectedOrgan: null, hoveredOrgan: null, revealedLayers: {}, procedureByLayer: { organs: { tissueState: { ...tissue, exposure: 8 } } }, lensPinned: false, lensPinnedPoint: null, lensPinnedOrganId: null });
  const before = await proof(page); await activate(page, 'Annotate'); await focusCanvasFromGuide(page); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  expect((await points(page)).annotations).toHaveLength(0); expect(await proof(page)).toEqual(before); await expect(guide(page).locator('#diss-point-mode-help')).toContainText(/no.*exposed|expose|directory/i);
  await expect(page.locator('[data-diss-gesture-echo]')).toContainText(/No structure is exposed|no exposed|expose/i);
  // Pointer placement does not depend on an exposed keyboard anchor.
  await nativePoint(page, { x: .5, y: .45 }); expect((await points(page)).annotations).toHaveLength(1); expect(await proof(page)).toEqual(before);
});

test('Essentials exits drawing modes while preserving completed point records', async ({ page }) => {
  test.skip(baseline); await mount(page, { annotateMode: true, annotations: [{ ...firstAnchor, type: 'dot' }], rulerStart: firstAnchor, rulerEnd: lastAnchor });
  const before = await proof(page), recorded = await points(page); await page.getByRole('button', { name: 'Essentials workspace', exact: true }).click();
  const d = await state(page); expect(d.annotateMode).toBe(false); expect(d.rulerMode).toBe(false); expect(await points(page)).toEqual(recorded); expect(await proof(page)).toEqual(before);
  await expect(guide(page).locator('#diss-point-mode-help')).toBeHidden(); await expect(pointStatus(page)).toContainText('Approximate model distance: 1.8 cm');
});

test('specimen changes and confirmed reset clear measurement endpoints and active modes', async ({ page }) => {
  test.skip(baseline); const saved = { rulerMode: true, rulerStart: firstAnchor, rulerEnd: lastAnchor, annotations: [{ ...firstAnchor, type: 'dot' }] };
  await mount(page, saved); await page.getByRole('tab', { name: /Select specimen: Earthworm/ }).click();
  await expect.poll(async () => (await state(page)).specimen).toBe('earthworm'); let d = await state(page); expect(d.rulerStart || null).toBeNull(); expect(d.rulerEnd || null).toBeNull(); expect(d.rulerMode).toBe(false); expect(d.annotateMode).toBe(false); expect(d.annotations || []).toEqual([]);
  await harness.unmount(page); await mount(page, saved); await page.getByRole('button', { name: 'Reset progress for this specimen', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#diss-reset-confirm')).toBeFocused(); await page.keyboard.press('Space');
  d = await state(page); expect(d.rulerStart || null).toBeNull(); expect(d.rulerEnd || null).toBeNull(); expect(d.rulerMode).toBe(false); expect(d.annotateMode).toBe(false); expect(d.annotations || []).toEqual([]);
});

test('root resizing and text spacing retain point control focus and records', async ({ page }) => {
  test.skip(baseline); await mount(page, { annotateMode: true, annotations: [{ ...firstAnchor, type: 'dot' }], largeText: true }, 1440, 1180);
  const before = await proof(page), recorded = await points(page), exit = guide(page).locator('[data-diss-point-exit]'); await exit.focus();
  await page.addStyleTag({ content: '#wrap {max-width:320px!important;} .diss-pointer-guide :is(button,p,strong,span) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}' });
  await expect(exit).toBeFocused(); await focusStyle(exit); await writeFile(`${out}/text-spacing-metrics.json`, JSON.stringify(await readable(guide(page), 320, true), null, 2));
  expect(await points(page)).toEqual(recorded); expect(await proof(page)).toEqual(before); await guide(page).screenshot({ path: `${out}/text-spacing.png`, style: captureStyle });
  await page.keyboard.press('Enter'); await expect(canvas(page)).toBeFocused(); expect((await state(page)).annotateMode).toBe(false); expect(await points(page)).toEqual(recorded); expect(await proof(page)).toEqual(before);
});
