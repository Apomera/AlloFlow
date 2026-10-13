import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_NAVIGATION_ARTIFACT_DIR || 'test-results/dissection-replay-navigation';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const liveTissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 3, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
// Repeated labels and timestamps keep navigation dependent on the held index.
const records = Array.from({ length: 22 }, (_, index) => ({
  action: 'dropper', label: 'Hydrated', at: 100, point: { x: 0.4 + index * 0.01, y: 0.4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 },
  outcome: 'Saved response ' + (index + 1), outcomeDetail: 'This saved action made the field clearer while the tissue became less stable. Compare the held contact on the specimen with these recorded measures.',
  tissueBefore: { clarity: 25, exposure: 40, stability: 70, risk: 45 }, tissueAfter: { clarity: 65, exposure: 40, stability: 55, risk: 15 },
}));
const initial = {
  specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null,
  revealedLayers: { skin: true }, workspaceMode: 'advanced', techniquePanelOpen: true, toolbarViewOpen: true, procedureMode: 'independent', showProcedureDebrief: true,
  organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true },
  quizScore: 1, quizTotal: 2, soundEnabled: false, sceneDetail: false, _procedureDemo: null, selectedProcedureActionAt: 100,
  toolCalibration: { bladeAngle: 35, scissorsAperture: 45, forcepsGrip: 58, pinAngle: 65, probePressure: 24, salineDose: 3 },
};
const procedure = {
  tissueState: liveTissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: false, errors: 0, protocolDeviations: 0,
  history: records.map(entry => entry.action), cautionLog: [], learningChecks: {}, incisionPath: [{ x: 0.49, y: 0.29 }, { x: 0.51, y: 0.70 }], extensionPath: [],
  dropperPoint: { x: 0.89, y: 0.88 }, surfaceCleared: false, forcepsPoint: { x: 0.85, y: 0.15 }, wickPoint: { x: 0.81, y: 0.19 }, pins: [], actionLog: records,
};

test.describe.configure({ mode: 'serial', retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message)); });
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});
async function savedState(page: Page) {
  // The save-access refresh timestamp is UI metadata; compare every saved value.
  return page.evaluate(() => { const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, _dissSaveAccessRefreshAt: _saveRefresh, ...state } = (window as any).__ctx.toolData.dissection; return state; });
}
async function reviewState(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__ctx.toolData.dissection;
    return { replay: state._procedureReplay, feedback: state.procedureFeedback };
  });
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80); }
async function navigationMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const node = document.querySelector(selector) as HTMLElement;
      const bounds = node.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height, client: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(getComputedStyle(node).fontSize) };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight }, pageWidth: document.documentElement.scrollWidth,
      strip: box('#diss-replay-specimen'), returnButton: box('#diss-replay-return'), viewButton: box('#diss-replay-view-specimen'), canvas: box('[data-diss-canvas]'),
      activeId: document.activeElement?.id, canvasFocusCount: (window as any).__replayNavigationCanvasFocusCount,
    };
  });
}
const variants = [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
];
for (const variant of variants) test(`paused replay navigation ${variant.name} preserves the held review`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
  await page.evaluate(() => {
    (window as any).__replayNavigationCanvasFocusCount = 0;
    document.querySelector('[data-diss-canvas]')!.addEventListener('focus', () => { (window as any).__replayNavigationCanvasFocusCount += 1; });
  });
  const panel = page.locator('#diss-replay-review'), strip = page.locator('#diss-replay-specimen'), response = page.locator('#diss-replay-response');
  const view = page.getByRole('button', { name: 'View action on specimen', exact: true }), back = page.getByRole('button', { name: 'Back to action review', exact: true });
  const picker = page.locator('#diss-replay-action'), toggle = page.locator('#diss-replay-toggle'), summary = page.locator('#diss-replay-response-summary');
  const launch = page.getByRole('button', { name: 'Review actions', exact: true }), history = page.locator('.diss-procedure__timeline-entry');
  await expect(strip).toHaveCount(0); await expect(view).toHaveCount(0);
  await expect(history).toHaveCount(18); await expect(history.last()).toHaveAttribute('aria-pressed', 'true');
  const before = await savedState(page);
  await activate(page, launch); await expect(picker).toHaveValue('0'); await expect(toggle).toBeFocused();
  await expect(strip).toContainText(/1\s+of\s+22/i); await expect(strip).toContainText('Hydrated');
  await expect(view).toHaveAttribute('id', 'diss-replay-view-specimen'); await expect(back).toHaveAttribute('id', 'diss-replay-return');
  await activate(page, summary); await expect(response).toHaveAttribute('open', '');
  await activate(page, page.locator('#diss-replay-next')); await expect(picker).toHaveValue('1'); await expect(strip).toContainText(/2\s+of\s+22/i);
  await picker.focus(); await picker.selectOption('6'); await page.clock.runFor(80);
  await expect(picker).toBeFocused(); await expect(strip).toContainText(/7\s+of\s+22/i);
  await expect(response).toHaveAttribute('open', '');
  const paused = await reviewState(page);
  async function verifyPreserved() {
    await expect(picker).toHaveValue('6'); await expect(response).toHaveAttribute('open', '');
    await expect(history.last()).toHaveAttribute('aria-pressed', 'true');
    expect(await savedState(page)).toEqual(before); expect(await reviewState(page)).toEqual(paused);
    expect(await page.evaluate(() => (window as any).__replayNavigationCanvasFocusCount)).toBe(0);
  }
  await activate(page, view); await expect(back).toBeFocused(); await expect(back).toBeInViewport();
  await expect(page.locator('[data-diss-canvas]')).toBeInViewport(); await verifyPreserved();
  const specimenMetrics = await navigationMetrics(page);
  expect(specimenMetrics.activeId).toBe('diss-replay-return');
  expect(specimenMetrics.canvas.bottom).toBeGreaterThan(0); expect(specimenMetrics.canvas.top).toBeLessThan(specimenMetrics.viewport.height - 60);
  await page.screenshot({ path: `${out}/${variant.name}-specimen.png`, style: '.diss-next-action{position:static!important;}' });
  await activate(page, back); await expect(view).toBeFocused(); await expect(view).toBeInViewport(); await verifyPreserved();
  const reviewMetrics = await navigationMetrics(page);
  expect(reviewMetrics.activeId).toBe('diss-replay-view-specimen');
  expect(reviewMetrics.viewButton.top).toBeGreaterThanOrEqual(0); expect(reviewMetrics.viewButton.bottom).toBeLessThanOrEqual(reviewMetrics.viewport.height);
  await page.screenshot({ path: `${out}/${variant.name}-review.png`, style: '.diss-next-action{position:static!important;}' });
  for (const metrics of [specimenMetrics, reviewMetrics]) {
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
    expect(metrics.strip.width).toBeLessThanOrEqual(variant.available);
    for (const control of [metrics.returnButton, metrics.viewButton]) {
      expect(control.height).toBeGreaterThanOrEqual(44); expect(control.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16);
      expect(control.scroll).toBeLessThanOrEqual(control.client + 1);
    }
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-replay-specimen'], ['#diss-replay-review']] })); }
  finally { const endedAt = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(endedAt + pauseLeadMs)); }
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await activate(page, toggle); await expect(strip).toHaveCount(0); await expect(view).toHaveCount(0); await expect(toggle).toBeFocused();
  await page.clock.runFor(200); await activate(page, toggle); await expect(strip).toBeVisible(); await expect(view).toBeVisible();
  await picker.selectOption('6'); await page.clock.runFor(80); await activate(page, summary); await expect(response).toHaveAttribute('open', '');
  await activate(page, view); await expect(back).toBeFocused();
  await page.keyboard.press('Escape'); await page.clock.runFor(80);
  await expect(panel).toHaveCount(0); await expect(strip).toHaveCount(0); await expect(view).toHaveCount(0); await expect(launch).toBeFocused();
  expect(await savedState(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__replayNavigationCanvasFocusCount)).toBe(0);
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify({ specimenMetrics, reviewMetrics, heldAction: 7, savedStatePreserved: true, pausedReplayAndFeedbackPreserved: true, expandedResponsePreserved: true, canvasNeverFocused: true }, null, 2));
});
