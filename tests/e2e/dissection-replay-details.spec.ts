import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_DETAILS_OUTPUT || 'test-results/dissection-replay-details';
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
test.describe.configure({ retries: 0, timeout: 150_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  errors.set(page, []); page.on('pageerror', error => errors.get(page)!.push(error.message));
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as any).__detailText = [];
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (maxWidth === undefined) original.call(this, text, x, y); else original.call(this, text, x, y, maxWidth);
      if (!this.canvas.matches('[data-diss-canvas]')) return;
      (window as any).__detailText.push(String(text));
      if ((window as any).__detailText.length > 2000) (window as any).__detailText.splice(0, 1000);
    };
  });
});
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});
async function savedState(page: Page) {
  return page.evaluate(() => { const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, ...state } = (window as any).__ctx.toolData.dissection; return state; });
}
async function activate(page: Page, button: Locator) { await button.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80); }
async function facts(page: Page) {
  return page.locator('#diss-replay-details dl > div').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.querySelector('dt')!.textContent, node.querySelector('dd')!.textContent])));
}
async function nativeCaption(page: Page, step: number) {
  const canvas = page.locator('[data-diss-canvas]'); await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect.poll(() => canvas.evaluate(node => (node as any)._dissInViewport)).toBe(true); await page.clock.runFor(80);
  return page.evaluate(step => { const rows = (window as any).__detailText; for (let i = rows.length - 1; i >= 0; i--) if (rows[i].startsWith('STEP ' + step + '/12')) return rows.slice(i, i + 8).join(' '); return ''; }, step);
}
const detailActions = [
  { action: 'dropper', label: 'Hydrated', toolCalibration: { salineDose: 1 }, outcome: 'Moisture increased after one drop.' },
  { action: 'dropper', label: 'Hydrated', toolCalibration: { salineDose: 3 }, outcome: 'The recorded response shows fluid covering the field.' },
  { action: 'dropper', label: 'Hydrated', toolCalibration: { salineDose: 99 } },
  { action: 'scalpel', label: 'Incised', toolCalibration: { bladeAngle: 24 }, outcome: 'First incision recorded.' },
  { action: 'scalpel', label: 'Incised', toolCalibration: { bladeAngle: 32 }, outcome: 'Second incision recorded.' },
  { action: 'scissors', label: 'Extended', toolCalibration: { scissorsAperture: 35 }, inputType: 'button', assistance: 'motor-neutral', outcome: 'Supported extension recorded.' },
  { action: 'forceps', label: 'Lifted', toolCalibration: { forcepsGrip: 40 }, outcome: 'Tissue lifted.' },
  { action: 'pin', label: 'Pinned', toolCalibration: { pinAngle: 67 }, outcome: 'Tissue anchored.' },
  { action: 'probe', label: 'Traced', toolCalibration: { probePressure: 20 }, outcome: 'Structure traced.' },
  { action: 'inspect', label: 'Inspected', outcome: '<b>Observation saved</b>' },
  { action: 'wick', label: 'Wicked' },
  { action: 'dropper', label: 'Hydrated', toolCalibration: { salineDose: 2 }, outcome: 'Recorded observation: ' + 'continuous'.repeat(22) },
].map(entry => ({ at: 100, point: firstContact, inputType: 'pointer', assistance: 'independent', ...entry }));
for (const variant of [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
]) test(`replay details ${variant.name} follows saved action evidence`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, selectedProcedureActionAt: 999, procedureByLayer: { skin: { ...procedure, actionLog: detailActions, history: detailActions.map(entry => entry.action), incisionSamples: [{ pressure: 0.3 }, { pressure: 0.6 }], extensionSamples: [{ pressure: 0.3 }] } }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
  const panel = page.locator('#diss-replay-review'), details = page.locator('#diss-replay-details'), picker = page.locator('#diss-replay-action');
  const launch = page.getByRole('button', { name: 'Review actions', exact: true }), toggle = page.locator('#diss-replay-toggle');
  const before = await savedState(page); await activate(page, launch); await expect(details).toBeVisible();
  expect(await facts(page)).toEqual({ 'Saline dose': '1 drop', 'Recorded result': detailActions[0].outcome });
  expect(await nativeCaption(page, 1)).toContain('DOSE 1');
  const positions: any[] = [];
  async function select(index: number) {
    await page.evaluate(() => { (window as any).__detailText = []; }); await picker.focus(); await picker.selectOption(String(index)); await page.clock.runFor(80); await expect(picker).toBeFocused();
    positions.push(await panel.evaluate(node => { const picker = node.querySelector('#diss-replay-action')!.getBoundingClientRect(), button = node.querySelector('#diss-replay-next')!.getBoundingClientRect(); return button.top - picker.bottom; }));
  }
  await select(1); expect(await facts(page)).toEqual({ 'Saline dose': '3 drops', 'Recorded result': detailActions[1].outcome }); expect(await nativeCaption(page, 2)).toContain('DOSE 3');
  await select(2); expect(await facts(page)).toEqual({ 'Saline dose': 'Not recorded', 'Recorded result': 'No result recorded for this action.' }); expect(await nativeCaption(page, 3)).toContain('SETTING NOT RECORDED');
  await select(3); expect(await facts(page)).toEqual({ 'Blade angle': '24°', 'Path': 'Illustrative path; this action has no saved path.', 'Pressure samples': 'Not recorded', 'Recorded result': detailActions[3].outcome });
  await select(4); expect(await facts(page)).toEqual({ 'Blade angle': '32°', 'Path': 'Saved path', 'Pressure samples': 'Recorded along this path', 'Recorded result': detailActions[4].outcome });
  await select(5); expect(await facts(page)).toEqual({ 'Scissors aperture': '35%', 'Path': 'Supported path', 'Pressure samples': 'Not recorded', 'Recorded result': detailActions[5].outcome });
  for (const [index, label, value] of [[6, 'Forceps grip', '40%'], [7, 'Pin angle', '67°'], [8, 'Probe pressure', '20%']] as const) { await select(index); expect(await facts(page)).toEqual({ [label]: value, 'Recorded result': detailActions[index].outcome }); }
  await select(9); expect(await facts(page)).toEqual({ 'Recorded result': detailActions[9].outcome }); await expect(details.locator('b')).toHaveCount(0);
  await select(10); expect(await facts(page)).toEqual({ 'Recorded result': 'No result recorded for this action.' });
  await select(11); expect(await facts(page)).toEqual({ 'Saline dose': '2 drops', 'Recorded result': detailActions[11].outcome });
  const longMetrics = await details.evaluate(node => ({ scroll: node.scrollWidth, client: node.clientWidth })); expect(longMetrics.scroll).toBeLessThanOrEqual(longMetrics.client + 1);
  // Changing record length never shifts the chooser's adjacent buttons downward.
  // Measure from the chooser: the status above it legitimately wraps as action numbers change.
  for (const position of positions) expect(Math.abs(position - positions[0])).toBeLessThan(1);
  await select(1);
  const metrics = await details.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
    cells: Array.from(node.querySelectorAll('strong, dt, dd')).map(cell => ({ font: parseFloat(getComputedStyle(cell).fontSize), client: cell.clientWidth, scroll: cell.scrollWidth })),
    liveRegion: !!node.closest('[aria-live], [role="status"]'), labelledBy: node.querySelector('dl')!.getAttribute('aria-labelledby') }));
  expect(metrics.width).toBeLessThanOrEqual(variant.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1); expect(metrics.liveRegion).toBe(false); expect(metrics.labelledBy).toBe('diss-replay-details-title');
  for (const cell of metrics.cells) { expect(cell.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1); }
  await picker.focus(); await panel.screenshot({ path: `${out}/${variant.name}-details.png`, style: '.diss-next-action{position:static!important;}' });
  await select(4); await panel.screenshot({ path: `${out}/${variant.name}-path.png`, style: '.diss-next-action{position:static!important;}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-replay-details']] })); }
  finally { const endedAt = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(endedAt + pauseLeadMs)); }
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await activate(page, toggle); await expect(details).toHaveCount(0); await expect(picker).toHaveValue(''); await page.clock.runFor(400); await activate(page, toggle); await expect(details).toBeVisible();
  const index = Number(await picker.inputValue()); expect((await facts(page))['Recorded result']).toBe(detailActions[index].outcome || 'No result recorded for this action.');
  await activate(page, page.getByRole('button', { name: 'Stop replay', exact: true })); await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); expect(await savedState(page)).toEqual(before);
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify({ metrics, positions, longMetrics, savedStatePreserved: true }, null, 2));
});
