import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_CALIBRATION_CLARITY_OUTPUT || 'test-results/dissection-calibration-clarity';
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
const controls = {
  scalpel: { key: 'bladeAngle', label: 'Blade angle', min: 10, max: 60, step: 1, unit: '°', spoken: 'degrees', idealMin: 20, idealMax: 35, ideal: '20–35° protects deeper structures.' },
  scissors: { key: 'scissorsAperture', label: 'Scissors aperture', min: 15, max: 70, step: 1, unit: '%', spoken: 'percent', idealMin: 25, idealMax: 45, ideal: '25–45% supports a controlled extension.' },
  forceps: { key: 'forcepsGrip', label: 'Forceps grip', min: 15, max: 90, step: 1, unit: '%', spoken: 'percent', idealMin: 25, idealMax: 50, ideal: '25–50% lifts tissue without crushing it.' },
  pin: { key: 'pinAngle', label: 'Pin angle', min: 35, max: 90, step: 1, unit: '°', spoken: 'degrees', idealMin: 55, idealMax: 75, ideal: '55–75° provides stable anchoring.' },
  probe: { key: 'probePressure', label: 'Probe pressure', min: 10, max: 80, step: 1, unit: '%', spoken: 'percent', idealMin: 18, idealMax: 38, ideal: '18–38% traces anatomy gently.' },
  dropper: { key: 'salineDose', label: 'Saline dose', min: 1, max: 3, step: 1, unit: ' drop', spoken: 'drop', idealMin: 1, idealMax: 1, ideal: 'One drop restores moisture without flooding the field.' },
} as const;
type Instrument = keyof typeof controls;
const screenshotStyle = '.diss-next-action{position:static!important;}';
const errors = new WeakMap<Page, string[]>();
const panel = (page: Page) => page.locator('#diss-calibration-panel');
const slider = (page: Page) => page.locator('#diss-calibration-range');
const decrease = (page: Page) => page.locator('#diss-calibration-decrease');
const increase = (page: Page) => page.locator('#diss-calibration-increase');
const disclosure = (page: Page) => panel(page).locator('details.diss-calibration__help');
const help = (page: Page) => page.locator('#diss-calibration-help-toggle');

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
      preferences: [d.workspaceMode, d.techniquePanelOpen, d.toolbarViewOpen, d.procedureMode, d.showProcedureDebrief, d.soundEnabled, d.sceneDetail, d.reducedMotion, d.largeText, d.highContrast],
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
async function openPanel(page: Page) {
  if (await page.locator('#diss-procedure-panel').getAttribute('open') === null) await activate(page, page.locator('#diss-procedure-summary'));
  await expect(panel(page)).toBeVisible();
}
function assessmentFor(tool: Instrument, value: number) {
  const control = controls[tool];
  const score = tool === 'dropper' ? value === 1 ? 100 : value === 2 ? 72 : 45
    : value >= control.idealMin && value <= control.idealMax ? 100
      : value < control.idealMin ? Math.max(20, Math.round(100 - (control.idealMin - value) / Math.max(1, control.idealMin - control.min) * 80))
        : Math.max(20, Math.round(100 - (value - control.idealMax) / Math.max(1, control.max - control.idealMax) * 80));
  return { score, label: score >= 85 ? 'Calibrated' : score >= 60 ? 'Adjust' : 'Caution', tone: score >= 85 ? 'ready' : score >= 60 ? 'adjust' : 'caution' };
}
function formatted(tool: Instrument, value: number, spoken = false) {
  if (tool === 'dropper') return `${value} drop${value === 1 ? '' : 's'}`;
  return spoken ? `${value} ${controls[tool].spoken}` : `${value}${controls[tool].unit}`;
}
async function content(page: Page, tool: Instrument, expectedValue?: number) {
  const current = await state(page), control = controls[tool], value = current.toolCalibration[control.key], assessment = assessmentFor(tool, value);
  expect(current.activeInstrument).toBe(tool);
  if (expectedValue != null) expect(value).toBe(expectedValue);
  await expect(slider(page)).toHaveAttribute('min', String(control.min));
  await expect(slider(page)).toHaveAttribute('max', String(control.max));
  await expect(slider(page)).toHaveAttribute('step', String(control.step));
  await expect(slider(page)).toHaveValue(String(value));
  await expect(slider(page)).toHaveAccessibleName(`Instrument calibration · ${control.label} Adjust before contact; this setting changes tissue response and scoring.`);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', `${formatted(tool, value, true)}, ${assessment.label}`);
  const describedBy = (await slider(page).getAttribute('aria-describedby'))?.split(/\s+/) || [];
  for (const id of ['diss-calibration-guidance', 'diss-calibration-keyboard-help', 'diss-calibration-status']) expect(describedBy).toContain(id);
  await expect(page.locator('#diss-calibration-value')).toHaveText(formatted(tool, value));
  await expect(panel(page)).toContainText('Current setting');
  await expect(page.locator('#diss-calibration-guidance')).toHaveText(`Recommended setting: ${control.ideal}`);
  const stepUnit = control.unit === '°' ? 'degree' : tool === 'dropper' ? 'drop' : 'percentage point';
  await expect(page.locator('#diss-calibration-keyboard-help')).toHaveText(`Each button changes the setting by 1 ${stepUnit}. On the slider, use arrow keys to adjust, Home for the minimum, or End for the maximum.`);
  await expect(page.locator('#diss-calibration-status')).toContainText('Calibration quality');
  await expect(page.locator('#diss-calibration-status b')).toHaveText(`${assessment.label} ${assessment.score}%`);
  await expect(panel(page)).toHaveAttribute('data-tone', assessment.tone);
  await expect(decrease(page)).toHaveAccessibleName(`Decrease ${control.label}`);
  await expect(increase(page)).toHaveAccessibleName(`Increase ${control.label}`);
  await expect(decrease(page)).toHaveAttribute('aria-describedby', 'diss-calibration-value');
  await expect(increase(page)).toHaveAttribute('aria-describedby', 'diss-calibration-value');
  await expect(decrease(page)).toHaveAttribute('aria-disabled', String(value <= control.min));
  await expect(increase(page)).toHaveAttribute('aria-disabled', String(value >= control.max));
  expect(await decrease(page).getAttribute('disabled')).toBeNull();
  expect(await increase(page).getAttribute('disabled')).toBeNull();
  if (value <= control.min) await expect(decrease(page)).toBeDisabled(); else await expect(decrease(page)).toBeEnabled();
  if (value >= control.max) await expect(increase(page)).toBeDisabled(); else await expect(increase(page)).toBeEnabled();
  await expect(panel(page).locator('.diss-calibration__ends')).toContainText(formatted(tool, control.min));
  await expect(panel(page).locator('.diss-calibration__ends')).toContainText(formatted(tool, control.max));
  await expect(help(page)).toHaveText('How calibration affects the specimen');
  return { tool, value, assessment, minimum: formatted(tool, control.min), maximum: formatted(tool, control.max), spoken: formatted(tool, value, true) };
}
async function readability(page: Page, available: number, large: boolean) {
  const geometry = await panel(page).evaluate(node => {
    const box = (element: Element) => {
      const r = element.getBoundingClientRect(), s = getComputedStyle(element);
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, font: parseFloat(s.fontSize), overflow: s.textOverflow };
    };
    return {
      viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, card: box(node),
      text: Array.from(node.querySelectorAll('strong, p, span, label, output, b, summary, button')).filter(element => element.getClientRects().length).map(element => ({ text: element.textContent, ...box(element) })),
      controls: Array.from(node.querySelectorAll('input, summary, button')).map(box),
      forcedColors: matchMedia('(forced-colors: active)').matches,
      highContrast: node.closest('[data-dissection-root]')!.getAttribute('data-high-contrast'),
    };
  });
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.card.width).toBeLessThanOrEqual(available + 1);
  expect(geometry.card.scrollWidth).toBeLessThanOrEqual(geometry.card.clientWidth + 1);
  expect(geometry.card.scrollHeight).toBeLessThanOrEqual(geometry.card.clientHeight + 1);
  for (const item of geometry.text) {
    expect(item.font, item.text || '').toBeGreaterThanOrEqual(large ? 18 : 16);
    expect(item.overflow, item.text || '').not.toBe('ellipsis');
    if (item.clientWidth) expect(item.scrollWidth, item.text || '').toBeLessThanOrEqual(item.clientWidth + 1);
    expect(item.left, item.text || '').toBeGreaterThanOrEqual(geometry.card.left);
    expect(item.right, item.text || '').toBeLessThanOrEqual(geometry.card.right + 1);
  }
  for (const control of geometry.controls) {
    expect(control.height).toBeGreaterThanOrEqual(47.9);
    expect(control.left).toBeGreaterThanOrEqual(geometry.card.left);
    expect(control.right).toBeLessThanOrEqual(geometry.card.right + 1);
  }
  return geometry;
}
async function focusAppearance(control: Locator) {
  await expect(control).toBeFocused();
  const appearance = await control.evaluate(node => { const s = getComputedStyle(node); return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, color: s.outlineColor }; });
  expect(appearance.width).toBeGreaterThanOrEqual(3); expect(appearance.style).toBe('solid');
  return appearance;
}
async function audit(page: Page, name: string) {
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let result: any;
  try { result = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-calibration-panel']] })); }
  finally { const at = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(at + pauseLeadMs)); }
  await writeFile(`${out}/${name}-axe.json`, JSON.stringify(result, null, 2)); expect(result.violations).toEqual([]);
}
function expectedCalibration(before: Awaited<ReturnType<typeof savedWork>>, tool: Instrument, value: number) {
  return { ...before, calibration: { ...before.calibration, [controls[tool].key]: value } };
}
const variants = [
  { name: 'desktop', width: 1440, available: 1180, key: 'Enter' },
  { name: 'phone', width: 320, available: 320, key: 'Space' },
  { name: 'forced-colors', width: 390, available: 390, key: 'Enter', forced: true, contrast: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, key: 'Space', large: true, contrast: true },
];
for (const variant of variants) test(`calibration is readable and supports precise keyboard changes ${variant.name}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: variant.forced ? 'active' : 'none' });
  await mount(page, { reducedMotion: true, largeText: !!variant.large, highContrast: !!variant.contrast }, variant.width, variant.available); await openPanel(page);
  const before = await savedWork(page), readings = await content(page, 'forceps', 58), closedGeometry = await readability(page, variant.available, !!variant.large);
  expect(closedGeometry.forcedColors).toBe(!!variant.forced); expect(closedGeometry.highContrast).toBe(variant.contrast ? 'true' : 'false');
  await expect(disclosure(page)).not.toHaveAttribute('open', '');
  await slider(page).focus(); await page.keyboard.press('Tab'); await expect(decrease(page)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(increase(page)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(help(page)).toBeFocused();
  const focus = await focusAppearance(help(page));
  await panel(page).screenshot({ path: `${out}/${variant.name}-closed-focus.png`, style: screenshotStyle });
  await activate(page, help(page), variant.key); await expect(disclosure(page)).toHaveAttribute('open', ''); await expect(help(page)).toBeFocused();
  const helpText = await disclosure(page).innerText();
  expect(helpText).toContain('Current setting controls the instrument. Calibration quality describes how that setting compares with the recommended range in this simulation.');
  expect(helpText).toContain('A higher quality score is better; increasing the setting does not always improve it.');
  expect(helpText).toContain('Calibration alone does not make an action ready. Follow the current protocol and complete the view, tissue, and learning checks before contact.');
  const openGeometry = await readability(page, variant.available, !!variant.large);
  await panel(page).screenshot({ path: `${out}/${variant.name}-open-focus.png`, style: screenshotStyle });
  await audit(page, variant.name); expect(await savedWork(page)).toEqual(before);
  await activate(page, increase(page), variant.key); await content(page, 'forceps', 59);
  await focusAppearance(increase(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
  expect(await savedWork(page)).toEqual(expectedCalibration(before, 'forceps', 59));
  await activate(page, decrease(page), variant.key); await content(page, 'forceps', 58);
  await focusAppearance(decrease(page)); expect(await savedWork(page)).toEqual(before);
  await slider(page).focus(); await focusAppearance(slider(page));
  const changes = [];
  for (const [key, value] of [['ArrowRight', 59], ['Home', 15], ['ArrowLeft', 15], ['End', 90], ['ArrowRight', 90], ['ArrowLeft', 89]] as const) {
    await page.keyboard.press(key); await page.clock.runFor(160);
    const reading = await content(page, 'forceps', value);
    await expect(slider(page)).toBeFocused(); await expect(disclosure(page)).toHaveAttribute('open', '');
    expect(await savedWork(page)).toEqual(expectedCalibration(before, 'forceps', value));
    changes.push({ key, reading });
  }
  await activate(page, help(page), variant.key); await expect(disclosure(page)).not.toHaveAttribute('open', '');
  expect(await savedWork(page)).toEqual(expectedCalibration(before, 'forceps', 89));
  await writeFile(`${out}/${variant.name}-proof.json`, JSON.stringify({ variant, readings, closedGeometry, openGeometry, focus, helpText, changes, before, after: await savedWork(page) }, null, 2));
});

test('all six instruments retain their own units bounds settings and calibration assessments', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page);
  const proofs = [];
  for (const tool of Object.keys(controls) as Instrument[]) {
    await page.evaluate(activeInstrument => (window as any).__ctx.updateMulti('dissection', { activeInstrument }), tool); await page.clock.runFor(160);
    const before = await savedWork(page), control = controls[tool];
    await expect(disclosure(page)).not.toHaveAttribute('open', ''); await content(page, tool);
    await activate(page, help(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
    const readings = [];
    // Home and End use the native slider; buttons must agree with its one-step changes.
    await slider(page).focus(); await page.keyboard.press('Home'); await page.clock.runFor(160);
    readings.push(await content(page, tool, control.min)); expect(await savedWork(page)).toEqual(expectedCalibration(before, tool, control.min));
    await activate(page, increase(page), 'Space'); readings.push(await content(page, tool, control.min + control.step));
    expect(await savedWork(page)).toEqual(expectedCalibration(before, tool, control.min + control.step));
    await slider(page).focus(); await page.keyboard.press('End'); await page.clock.runFor(160);
    readings.push(await content(page, tool, control.max)); expect(await savedWork(page)).toEqual(expectedCalibration(before, tool, control.max));
    await activate(page, decrease(page)); readings.push(await content(page, tool, control.max - control.step));
    expect(await savedWork(page)).toEqual(expectedCalibration(before, tool, control.max - control.step));
    if (tool === 'dropper') {
      // Endpoint buttons remain in the keyboard sequence and keep focus. Their
      // semantic disabled state must make repeated activation a harmless no-op.
      for (const { direction, key, value } of [
        { direction: 'decrease', key: 'Enter', value: 1 },
        { direction: 'decrease', key: 'Space', value: 1 },
        { direction: 'decrease', key: 'Enter', value: 1 },
        { direction: 'increase', key: 'Space', value: 2 },
        { direction: 'increase', key: 'Enter', value: 3 },
        { direction: 'increase', key: 'Space', value: 3 },
        { direction: 'increase', key: 'Enter', value: 3 },
        { direction: 'decrease', key: 'Space', value: 2 },
      ]) {
        const button = direction === 'decrease' ? decrease(page) : increase(page);
        await activate(page, button, key);
        readings.push({ ...await content(page, tool, value), direction, key });
        await focusAppearance(button); await expect(disclosure(page)).toHaveAttribute('open', '');
        expect(await savedWork(page)).toEqual(expectedCalibration(before, tool, value));
      }
    }
    await expect(disclosure(page)).toHaveAttribute('open', '');
    proofs.push({ tool, readings, before, after: await savedWork(page) });
  }
  await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { activeInstrument: 'wick' })); await page.clock.runFor(160);
  await expect(panel(page)).toHaveCount(0); await expect(slider(page)).toHaveCount(0);
  await writeFile(`${out}/instrument-units-proof.json`, JSON.stringify(proofs, null, 2));
});

test('calibration help resets for new instrument layer and specimen contexts without changing recorded work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page, { reducedMotion: true }); await openPanel(page);
  const proofs = [];
  for (const patch of [{ activeInstrument: 'pin' }, { activeLayer: 'muscle' }, { activeLayer: 'skin' }, { specimen: 'earthworm', _dissLoadedSpec: 'earthworm', selectedOrgan: null }]) {
    await activate(page, help(page)); await expect(disclosure(page)).toHaveAttribute('open', '');
    await page.evaluate(p => (window as any).__ctx.updateMulti('dissection', p), patch); await page.clock.runFor(160); await openPanel(page);
    await expect(disclosure(page)).not.toHaveAttribute('open', '');
    const afterChange = await savedWork(page), readings = await content(page, (await state(page)).activeInstrument);
    await activate(page, help(page), 'Space'); await expect(disclosure(page)).toHaveAttribute('open', '');
    expect(await savedWork(page)).toEqual(afterChange);
    await activate(page, help(page), 'Space');
    proofs.push({ patch, readings, savedWork: afterChange });
  }
  await writeFile(`${out}/context-reset-proof.json`, JSON.stringify(proofs, null, 2));
});

test('calibration help and controls stay hidden in quiz and timed practical modes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); const proofs = [];
  for (const mode of ['quizMode', 'practicalMode']) {
    await mount(page, { reducedMotion: true, techniquePanelOpen: true, [mode]: true, ...(mode === 'practicalMode' ? { practicalTimer: 300, practicalEndsAt: Date.now() + 300000, practicalTargetIds: ['ventral_skin', 'tympanum'] } : {}) });
    expect((await state(page))[mode]).toBe(true); const before = await savedWork(page);
    await expect(panel(page)).toBeHidden(); await expect(slider(page)).toBeHidden(); await expect(help(page)).toBeHidden();
    await expect(decrease(page)).toBeHidden(); await expect(increase(page)).toBeHidden();
    expect(await savedWork(page)).toEqual(before); proofs.push({ mode, hidden: true }); await harness.unmount(page);
  }
  await writeFile(`${out}/assessment-hidden-proof.json`, JSON.stringify(proofs, null, 2));
});
