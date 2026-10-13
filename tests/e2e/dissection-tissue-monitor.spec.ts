import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
import { readPng, contrastRatio } from './helpers/png_pixels';

const out = process.env.DISSECTION_TISSUE_MONITOR_OUTPUT || 'test-results/dissection-tissue-monitor';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 59, risk: 11, salineDrops: 1, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const record = { action: 'dropper', label: 'Hydrated', at: 100, point: { x: .45, y: .4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response', outcomeDetail: 'A controlled dose improved the recorded field clarity.', tissueBefore: { clarity: 25, exposure: 8, stability: 70, risk: 45 }, tissueAfter: { clarity: 81, exposure: 8, stability: 59, risk: 11 } };
const procedure = { tissueState: tissue, inspected: false, incisionStarted: false, incisionExtended: false, retracted: false, probed: false, errors: 1, protocolDeviations: 1, history: ['dropper'], actionLog: [record], cautionLog: [{ message: 'Recorded caution', at: 100 }], learningChecks: { inspect: { predictionCorrect: true } }, incisionPath: [], extensionPath: [], dropperPoint: { x: .45, y: .4 }, pins: [] };
const savedAttempt = { id: 55, layer: 'skin', view: 'dorsal', score: 70, precision: 75, coverage: 80, control: 75, angleControl: 80, cautions: 1, preservation: 84, observationQuality: 81, incisionPath: [{ x: .47, y: .29 }, { x: .5, y: .7 }], extensionPath: [], actionLog: [record], history: ['dropper'] };
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal', activeInstrument: 'forceps', selectedOrgan: 'nictitating', hoveredOrgan: null,
  revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: false, toolbarViewOpen: false, procedureMode: 'independent', showProcedureDebrief: true,
  procedureScenario: 'precision-access', scenarioStartedAt: 0, scenarioTimeRemaining: 0, scenarioCompletedAt: 0,
  organNotes: { 'frog|nictitating': 'Preserved observation.', 'earthworm|dorsal_vessel': 'Other specimen work.' }, organConfidence: { 'frog|nictitating': 2 }, verifiedIdentifications: { 'frog|nictitating': { status: 'verified', at: 88 } },
  exploredOrgans: { 'frog|nictitating': true, 'frog|heart': true, 'earthworm|dorsal_vessel': true }, completedObjectives: { 'earthworm|skin': true }, annotations: [{ x: .5, y: .38, type: 'dot' }],
  quizScore: 1, quizTotal: 2, quizFirstAttemptScore: 1, quizFirstAttemptTotal: 2, assessmentEvidence: { 'frog|nictitating': { attempts: 1, correct: true } },
  soundEnabled: false, sceneDetail: false, _procedureDemo: null, _procedureReplay: null, selectedProcedureActionAt: 100,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 1 },
  inspectionLens: true, lensFocusDepth: 'deep', lensMagnification: 6, lightIntensity: 60,
  procedureByLayer: { skin: procedure, muscle: { ...procedure, inspected: true, errors: 0 } }, attemptArchive: { skin: [savedAttempt] }, compareTechniqueAttempts: true, compareReplayPlaying: false, compareReplayProgress: .4,
  relationshipTraceIndex: 2, relationshipTraceCount: 3, canvasZoom: 1.5, canvasPanX: 15, canvasPanY: -8,
};
const metricIds = ['exposure', 'clarity', 'stability', 'risk'] as const;
type MetricId = typeof metricIds[number];
const directions: Record<MetricId, string> = { exposure: 'Follow the protocol', clarity: 'Higher means clearer', stability: 'Higher means steadier', risk: 'Lower is better' };
const explanations: Record<MetricId, string[]> = {
  exposure: ['how much the tissue field is open', 'current protocol and protected landmarks'],
  clarity: ['visible tissue surface', 'below 45%', 'exposure, stability, and risk'],
  stability: ['how steady the tissue field is', 'below 45% once exposure is above 35%'],
  risk: ['simulation score for tissue handling', '55% or higher', 'A lower reading is better'],
};
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});
async function state(page: Page) { return page.evaluate(() => (window as any).__ctx.toolData.dissection); }
async function savedWork(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return {
      specimen: d.specimen, layer: d.activeLayer, instrument: d.activeInstrument, view: d.anatomicalView, selected: d.selectedOrgan, hovered: d.hoveredOrgan,
      camera: [d.canvasZoom, d.canvasPanX, d.canvasPanY], optics: [d.inspectionLens, d.lensFocusDepth, d.lensMagnification, d.lightIntensity, d.lensPinned, d.lensPinnedPoint, d.lensPinnedOrganId],
      notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, revealed: d.revealedLayers,
      procedures: d.procedureByLayer, calibration: d.toolCalibration, attempts: d.attemptArchive, objectives: d.completedObjectives, inquiry: d.dissInquiry,
      annotations: d.annotations, frames: d.visualEvidence, reference: d.referenceEvidenceId, notebook: d.evidenceNotebookOpen,
      scores: [d.quizScore, d.quizTotal], firstAttempt: [d.quizFirstAttemptScore, d.quizFirstAttemptTotal], assessment: d.assessmentEvidence,
      relationships: [d.relationshipTraceIndex, d.relationshipTraceCount], comparingAttempts: d.compareTechniqueAttempts, comparisonProgress: d.compareReplayProgress, selectedActionAt: d.selectedProcedureActionAt,
      scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioTimeRemaining, d.scenarioCompletedAt], playback: [d._procedureDemo, d._procedureReplay, d.compareReplayPlaying],
    };
  });
}
async function activate(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await page.keyboard.press(key); await page.clock.runFor(160);
}
async function mount(page: Page, seed: any = {}, width = 1440, available = 1180) {
  await page.setViewportSize({ width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, ...seed } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap{width:100%!important;max-width:${available}px;}` });
  const epoch = await page.evaluate(() => Date.now());
  await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
}
async function openMonitor(page: Page) {
  const monitor = page.locator('.diss-field-monitor');
  if (await monitor.getAttribute('open') === null) await activate(page, page.locator('#diss-field-monitor-summary'));
  await expect(monitor).toHaveAttribute('open', '');
  await expect(page.locator('#diss-field-tissue')).toBeVisible();
}
function card(page: Page, id: MetricId) { return page.locator(`#diss-field-tissue .diss-stage__telemetry-metric[data-metric="${id}"]`); }
function disclosure(page: Page, id: MetricId) { return card(page, id).locator('details.diss-metric-reading'); }
async function content(page: Page) {
  const panel = page.locator('#diss-field-tissue');
  await expect(panel).toHaveAccessibleName('Live specimen response monitor');
  await expect(panel.locator('.diss-stage__telemetry-metric')).toHaveCount(4);
  await expect(panel.getByRole('meter')).toHaveCount(4);
  const d = await state(page), current = d.procedureByLayer[d.activeLayer].tissueState;
  const result = [];
  for (const id of metricIds) {
    const metric = card(page, id), label = id[0].toUpperCase() + id.slice(1);
    const meter = metric.getByRole('meter', { name: label, exact: true });
    const value = current[id];
    await expect(meter).toHaveAttribute('aria-valuemin', '0');
    await expect(meter).toHaveAttribute('aria-valuemax', '100');
    await expect(meter).toHaveAttribute('aria-valuenow', String(value));
    await expect(metric.locator('b')).toHaveText(`${value}%`);
    const note = (await metric.locator('.diss-stage__telemetry-metric-note').innerText()).trim();
    const direction = (await metric.locator('.diss-stage__telemetry-metric-direction').innerText()).trim();
    expect(direction).toBe(directions[id]);
    const expectedNote = id === 'exposure' ? 'Opening size' : id === 'clarity' ? current.clarity < 45 ? 'Low clarity' : 'No clarity alert' : id === 'stability' ? current.stability < 45 && current.exposure > 35 ? 'Needs stabilization' : current.exposure <= 35 ? 'Recheck after opening' : 'No stability alert' : current.risk >= 55 ? 'Elevated risk' : 'Below risk alert';
    expect(note).toBe(expectedNote);
    await expect(meter).toHaveAttribute('aria-valuetext', `${value} percent. ${note}. ${direction}.`);
    await expect(metric.locator(`#diss-metric-reading-${id}`)).toHaveText(`How to read ${id}`);
    const caution = id === 'clarity' ? current.clarity < 45 : id === 'stability' ? current.stability < 45 && current.exposure > 35 : id === 'risk' ? current.risk >= 55 : false;
    await expect(metric).toHaveAttribute('data-risk', String(caution));
    result.push({ id, value, note, direction, caution });
  }
  return result;
}
async function readability(page: Page, available: number, large: boolean) {
  const metrics = await page.locator('#diss-field-tissue').evaluate(panel => {
    const box = (node: Element) => {
      const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, panel: box(panel),
      text: Array.from(panel.querySelectorAll('strong, p, button, span, b, summary')).filter(node => node.getClientRects().length).map(node => ({ text: node.textContent, ...box(node) })),
      summary: Array.from(document.querySelectorAll('#diss-field-monitor-summary, #diss-field-monitor-summary strong, #diss-field-monitor-summary span, #diss-field-monitor-summary small')).map(node => ({ text: node.textContent, ...box(node) })),
      cards: Array.from(panel.querySelectorAll('.diss-stage__telemetry-metric')).map(box),
      controls: Array.from(panel.querySelectorAll('button, summary')).filter(node => node.getClientRects().length).map(box),
    };
  });
  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport + 1);
  expect(metrics.panel.width).toBeLessThanOrEqual(available + 1);
  expect(metrics.panel.scroll).toBeLessThanOrEqual(metrics.panel.client + 1);
  for (const text of [...metrics.text, ...metrics.summary]) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    if (text.client) expect(text.scroll, text.text || '').toBeLessThanOrEqual(text.client + 1);
    expect(text.overflow).not.toBe('ellipsis');
  }
  for (const item of metrics.cards) expect(item.scroll).toBeLessThanOrEqual(item.client + 1);
  if (available <= 760) {
    for (let index = 1; index < metrics.cards.length; index++) {
      expect(metrics.cards[index].top).toBeGreaterThanOrEqual(metrics.cards[index - 1].bottom);
      expect(Math.abs(metrics.cards[index].left - metrics.cards[0].left)).toBeLessThanOrEqual(1);
    }
  } else {
    expect(Math.abs(metrics.cards[0].top - metrics.cards[1].top)).toBeLessThanOrEqual(1);
    expect(metrics.cards[1].left).toBeGreaterThanOrEqual(metrics.cards[0].right);
    expect(metrics.cards[2].top).toBeGreaterThanOrEqual(metrics.cards[0].bottom);
    expect(Math.abs(metrics.cards[2].top - metrics.cards[3].top)).toBeLessThanOrEqual(1);
  }
  for (const control of metrics.controls) expect(control.height).toBeGreaterThanOrEqual(47.9);
  return metrics;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-field-tissue']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
async function patchTissue(page: Page, patch: Partial<typeof tissue>) {
  await page.evaluate(p => {
    const ctx = (window as any).__ctx, d = ctx.toolData.dissection, layer = d.activeLayer;
    ctx.updateMulti('dissection', { procedureByLayer: { ...d.procedureByLayer, [layer]: { ...d.procedureByLayer[layer], tissueState: { ...d.procedureByLayer[layer].tissueState, ...p } } } });
  }, patch);
  await page.clock.runFor(160);
}

const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true, contrast: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`tissue monitor readability and keyboard disclosure ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  await openMonitor(page);
  const before = await savedWork(page), readings = await content(page), closedMetrics = await readability(page, variant.available, !!variant.large);
  const meterAppearance = await page.locator('#diss-field-tissue .diss-field-meter').evaluateAll(nodes => nodes.map(node => {
    const fill = node.querySelector('.diss-field-meter__fill')!, surfaceStyle = getComputedStyle(node), fillStyle = getComputedStyle(fill);
    return {
      label: node.getAttribute('aria-labelledby'), surface: surfaceStyle.backgroundColor, fill: fillStyle.backgroundColor,
      width: fill.getBoundingClientRect().width, height: fill.getBoundingClientRect().height,
      forcedColors: matchMedia('(forced-colors: active)').matches,
      highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast'),
    };
  }));
  expect(meterAppearance).toHaveLength(4);
  for (const meter of meterAppearance) {
    expect(meter.width, meter.label || '').toBeGreaterThan(0);
    expect(meter.height, meter.label || '').toBeGreaterThan(0);
    expect(meter.fill, meter.label || '').not.toBe(meter.surface);
    expect(meter.fill, meter.label || '').not.toBe('rgba(0, 0, 0, 0)');
    expect(meter.forcedColors).toBe(!!variant.forced);
    expect(meter.highContrast).toBe(variant.contrast ? 'true' : 'false');
  }
  for (const id of metricIds) await expect(disclosure(page, id)).not.toHaveAttribute('open', '');
  await page.locator('#diss-metric-reading-exposure').focus();
  const appearance = await focusAppearance(page.locator('#diss-metric-reading-exposure'));
  await page.locator('#diss-field-tissue').screenshot({ path: `${out}/${variant.name}-closed-focus.png`, style: screenshotStyle });
  for (const id of metricIds.slice(1)) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#diss-metric-reading-${id}`)).toBeFocused();
  }
  const helpReadings = [];
  for (let index = 0; index < metricIds.length; index++) {
    const id = metricIds[index];
    await activate(page, page.locator(`#diss-metric-reading-${id}`), variant.key);
    await expect(disclosure(page, id)).toHaveAttribute('open', '');
    await expect(page.locator(`#diss-metric-reading-${id}`)).toBeFocused();
    for (const earlier of metricIds.slice(0, index)) await expect(disclosure(page, earlier)).toHaveAttribute('open', '');
    for (const later of metricIds.slice(index + 1)) await expect(disclosure(page, later)).not.toHaveAttribute('open', '');
    const explanation = (await disclosure(page, id).innerText()).replace(`How to read ${id}`, '').trim();
    for (const phrase of explanations[id]) expect(explanation).toContain(phrase);
    helpReadings.push({ id, explanation });
    expect(await savedWork(page)).toEqual(before);
  }
  const openMetrics = await readability(page, variant.available, !!variant.large);
  await focusAppearance(page.locator('#diss-metric-reading-risk'));
  await page.locator('#diss-field-tissue').screenshot({ path: `${out}/${variant.name}-open-focus.png`, style: screenshotStyle });
  await audit(page, variant.name);
  await activate(page, page.getByRole('button', { name: 'Run pre-contact field check' }), variant.key);
  expect((await state(page)).procedureFeedback.message).toMatch(/^Field check:/);
  for (const id of metricIds) await expect(disclosure(page, id)).toHaveAttribute('open', '');
  expect(await content(page)).toEqual(readings);
  expect(await savedWork(page)).toEqual(before);
  await activate(page, page.locator('#diss-metric-reading-clarity'), variant.key);
  await expect(disclosure(page, 'clarity')).not.toHaveAttribute('open', '');
  for (const id of ['exposure', 'stability', 'risk'] as MetricId[]) await expect(disclosure(page, id)).toHaveAttribute('open', '');
  expect(await savedWork(page)).toEqual(before);
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ key: variant.key, readings, closedMetrics, openMetrics, appearance, meterAppearance, explanations: helpReadings, before, after: await savedWork(page) }, null, 2));
});

test('live monitor values and cautions update at the metric boundaries without closing help', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: true }); await openMonitor(page);
  await activate(page, page.locator('#diss-metric-reading-stability'));
  const before = await savedWork(page), proofs = [];
  const cases = [
    { exposure: 35, clarity: 45, stability: 45, risk: 54 },
    { exposure: 35, clarity: 81, stability: 59, risk: 55 },
    { exposure: 35, clarity: 44, stability: 59, risk: 54 },
    { exposure: 35, clarity: 44, stability: 44, risk: 55 },
    { exposure: 36, clarity: 44, stability: 44, risk: 55 },
    { exposure: 100, clarity: 100, stability: 100, risk: 0 },
    { exposure: 0, clarity: 0, stability: 0, risk: 100 },
  ];
  for (const patch of cases) {
    await patchTissue(page, patch);
    const readings = await content(page);
    await expect(disclosure(page, 'stability')).toHaveAttribute('open', '');
    for (const id of ['exposure', 'clarity', 'risk'] as MetricId[]) await expect(disclosure(page, id)).not.toHaveAttribute('open', '');
    await expect(page.locator('#diss-metric-reading-stability')).toBeFocused();
    const expected = { ...before, procedures: { ...before.procedures, skin: { ...before.procedures.skin, tissueState: { ...before.procedures.skin.tissueState, ...patch } } } };
    expect(await savedWork(page)).toEqual(expected);
    const priority = patch.stability < 45 && patch.exposure > 35 ? 'Stabilize the retracted tissue before probing.' : patch.risk >= 55 ? 'Pause manipulation and protect the current corridor.' : patch.clarity < 45 ? 'Review surface clarity before the next controlled action.' : 'Continue with the current protocol and pre-contact checks.';
    await expect(page.locator('#diss-field-tissue .diss-stage__telemetry-priority')).toHaveText(priority);
    proofs.push({ patch, readings, priority });
  }
  await writeFile(`${out}/live-boundaries-proof.json`, JSON.stringify({ before, cases: proofs, after: await savedWork(page) }, null, 2));
});

test('metric explanations reset when the active specimen or layer changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: true }); await openMonitor(page);
  const proofs = [];
  // Context changes use the normal host update channel. Assertions below isolate
  // disclosure lifetime from specimen navigation's separate persistence behavior.
  for (const patch of [
    { activeLayer: 'muscle' },
    { activeLayer: 'skin' },
    { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', selectedOrgan: null },
  ]) {
    for (const id of metricIds) await activate(page, page.locator(`#diss-metric-reading-${id}`));
    for (const id of metricIds) await expect(disclosure(page, id)).toHaveAttribute('open', '');
    await page.evaluate(p => (window as any).__ctx.updateMulti('dissection', p), patch);
    await page.clock.runFor(160); await openMonitor(page);
    for (const id of metricIds) await expect(disclosure(page, id)).not.toHaveAttribute('open', '');
    const afterChange = await savedWork(page);
    const readings = await content(page);
    await activate(page, page.locator('#diss-metric-reading-risk'), 'Space');
    await expect(disclosure(page, 'risk')).toHaveAttribute('open', '');
    expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, page.locator('#diss-metric-reading-risk'), 'Space');
    proofs.push({ patch, readings, savedWork: afterChange });
  }
  await writeFile(`${out}/context-reset-proof.json`, JSON.stringify(proofs, null, 2));
});

test('live tissue help stays hidden in quiz and timed practical modes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true);
    const before = await savedWork(page);
    await expect(page.locator('.diss-field-monitor')).toBeHidden();
    await expect(page.locator('#diss-field-tissue')).toBeHidden();
    for (const id of metricIds) await expect(page.locator(`#diss-metric-reading-${id}`)).toBeHidden();
    expect(await savedWork(page)).toEqual(before);
    proofs.push({ mode, hidden: true });
    await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});

for (const variant of variants) test(`advanced dynamic tissue meters retain visible labels values and bars ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available);
  const before = await savedWork(page);
  await activate(page, page.locator('#diss-procedure-summary'), variant.key);
  await expect(page.locator('#diss-procedure-panel')).toHaveAttribute('open', '');
  const panel = page.getByRole('group', { name: 'Dynamic tissue state', exact: true });
  await expect(panel).toBeVisible();
  const meters = panel.locator('.diss-tissue-meter');
  await expect(meters).toHaveCount(8);
  await expect(page.locator('#diss-field-tissue .diss-tissue-meter')).toHaveCount(0);
  const expected: Array<[string, number]> = [
    ['Moisture', 67], ['Clarity', 81], ['Exposure', 8], ['Stability', 59],
    ['Tension', 52], ['Trauma', 0], ['Compliance', 69], ['Motion damping', 51],
  ];
  for (let index = 0; index < expected.length; index++) {
    const [label, value] = expected[index], meter = meters.nth(index);
    await expect(meter.locator(':scope > span > span')).toHaveText(label);
    await expect(meter.locator(':scope > span > span')).toBeVisible();
    await expect(meter.locator('b')).toHaveText(`${value}%`);
    await expect(meter.locator('b')).toBeVisible();
    await expect(meter.getByRole('progressbar', { name: `${label} ${value} percent`, exact: true })).toBeVisible();
    await expect(meter.locator('progress')).toHaveAttribute('value', String(value));
    await expect(meter.locator('progress')).toHaveAttribute('max', '100');
  }
  const geometry = await meters.evaluateAll(nodes => nodes.map(node => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height, width: rect.width, font: parseFloat(style.fontSize), overflow: style.textOverflow };
    };
    return {
      label: node.querySelector(':scope > span > span')!.textContent,
      wrapper: box(node), title: box(node.querySelector(':scope > span')!),
      labelBox: box(node.querySelector(':scope > span > span')!), value: box(node.querySelector('b')!), bar: box(node.querySelector('progress')!),
      clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
    };
  }));
  const panelReadability = await panel.evaluate(node => {
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
    return {
      width: rect.width, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      color: style.color, background: style.backgroundColor, forcedColors: matchMedia('(forced-colors: active)').matches,
      highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast'),
      bars: Array.from(node.querySelectorAll('progress')).map(element => ({
        label: element.getAttribute('aria-label'), color: getComputedStyle(element).color,
        background: getComputedStyle(element).backgroundColor, accent: getComputedStyle(element).accentColor,
      })),
      text: Array.from(node.querySelectorAll('strong, p, span, b')).map(element => ({
        text: element.textContent, font: parseFloat(getComputedStyle(element).fontSize), overflow: getComputedStyle(element).textOverflow,
        clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      })),
    };
  });
  expect(panelReadability.width).toBeLessThanOrEqual(variant.available + 1);
  expect(panelReadability.scrollWidth).toBeLessThanOrEqual(panelReadability.clientWidth + 1);
  expect(panelReadability.forcedColors).toBe(!!variant.forced);
  expect(panelReadability.highContrast).toBe(variant.contrast ? 'true' : 'false');
  if (variant.forced) expect(panelReadability.color).not.toBe(panelReadability.background);
  for (const text of panelReadability.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(variant.large ? 18 : 16);
    expect(text.overflow, text.text || '').not.toBe('ellipsis');
    if (text.clientWidth) expect(text.scrollWidth, text.text || '').toBeLessThanOrEqual(text.clientWidth + 1);
  }
  for (const meter of geometry) {
    expect(meter.title.height, meter.label || '').toBeGreaterThan(0);
    expect(meter.bar.height, meter.label || '').toBeGreaterThan(0);
    expect(meter.bar.top, meter.label || '').toBeGreaterThanOrEqual(meter.title.bottom);
    expect(meter.wrapper.height, meter.label || '').toBeGreaterThanOrEqual(meter.title.height + meter.bar.height);
    expect(meter.bar.bottom, meter.label || '').toBeLessThanOrEqual(meter.wrapper.bottom + 1);
    expect(meter.labelBox.font, meter.label || '').toBeGreaterThanOrEqual(variant.large ? 18 : 16);
    expect(meter.value.font, meter.label || '').toBeGreaterThanOrEqual(variant.large ? 18 : 16);
    for (const content of [meter.labelBox, meter.value, meter.bar]) {
      expect(content.top, meter.label || '').toBeGreaterThanOrEqual(meter.wrapper.top - 1);
      expect(content.left, meter.label || '').toBeGreaterThanOrEqual(meter.wrapper.left - 1);
      expect(content.right, meter.label || '').toBeLessThanOrEqual(meter.wrapper.right + 1);
    }
    expect(meter.scrollHeight, meter.label || '').toBeLessThanOrEqual(meter.clientHeight + 1);
    expect(meter.scrollWidth, meter.label || '').toBeLessThanOrEqual(meter.clientWidth + 1);
  }
  expect(await savedWork(page)).toEqual(before);
  const nativeBarPixels = [];
  if (variant.forced) {
    // Native progress pseudo-element computed styles can report the host style.
    // Sample the painted interior: the fill and remaining track must differ even
    // when both the operating system and the lab's high-contrast mode are active.
    for (let index = 0; index < expected.length; index++) {
      const [label, value] = expected[index];
      const pixels = readPng(await meters.nth(index).locator('progress').screenshot({ style: screenshotStyle }));
      expect(pixels.width, label).toBeGreaterThan(30);
      expect(pixels.height, label).toBeGreaterThanOrEqual(6);
      const y = Math.floor(pixels.height / 2);
      const emptyX = Math.min(pixels.width - 2, Math.floor(pixels.width * (1 + value / 100) / 2));
      const empty = pixels.at(emptyX, y);
      const filledX = value > 0 ? Math.max(2, Math.floor(pixels.width * value / 200)) : null;
      const filled = filledX == null ? null : pixels.at(filledX, y);
      const contrast = filled ? contrastRatio(filled, empty) : null;
      if (contrast != null) expect(contrast, `${label}: painted fill must contrast with the remaining track`).toBeGreaterThanOrEqual(3);
      nativeBarPixels.push({ label, value, width: pixels.width, height: pixels.height, y, emptyX, empty, filledX, filled, contrast });
    }
    const emptyTrauma = nativeBarPixels.find(reading => reading.label === 'Trauma')!;
    expect(emptyTrauma.value).toBe(0);
    expect(emptyTrauma.empty).toEqual(nativeBarPixels[0].empty);
  }
  await panel.screenshot({ path: `${out}/advanced-${variant.name}.png`, style: screenshotStyle });
  await writeFile(`${out}/advanced-${variant.name}-proof.json`, JSON.stringify({ variant, expected, geometry, panelReadability, nativeBarPixels, before, after: await savedWork(page) }, null, 2));
});
