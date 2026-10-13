import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_RESPONSE_OUTPUT || 'test-results/dissection-replay-response';
const pauseLeadMs = 60_000;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const liveTissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 3, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'dropper', lastUpdatedAt: 300, consequences: [] };
const literalExplanation = '<img src=x onerror="window.__replayResponseInjected=true"> ' + 'continuous'.repeat(22);
const records: any[] = [
  { tissueBefore: { clarity: 25, exposure: 40, stability: 70, risk: 45 }, tissueAfter: { clarity: 65, exposure: 40, stability: 55, risk: 15 }, outcomeDetail: 'One saved drop made the field clearer while the tissue became less stable.' },
  { tissueBefore: { clarity: 0, exposure: 100, stability: 20, risk: 10 }, tissueAfter: { clarity: 100, exposure: 0, stability: 35, risk: 40 }, outcomeDetail: 'This different saved response increased stability and handling risk.' },
  { tissueBefore: { clarity: 65, exposure: '40', stability: null, risk: 101 }, tissueAfter: { clarity: 60, exposure: 80, stability: 30, risk: -1 }, outcomeDetail: 'Only clarity has a complete saved pair.' },
  { tissueBefore: {}, tissueAfter: {}, outcomeDetail: literalExplanation },
  {},
  ...Array.from({ length: 17 }, () => ({})),
].map((entry, index) => ({ action: 'dropper', label: 'Hydrated', at: 100, point: { x: 0.4 + index * 0.01, y: 0.4 }, inputType: 'pointer', assistance: 'independent', toolCalibration: { salineDose: 1 }, outcome: 'Saved response ' + (index + 1), ...entry }));
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
  // Save-access refresh time is UI metadata; retain every recorded value in the comparison.
  return page.evaluate(() => { const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, _dissSaveAccessRefreshAt: _saveRefresh, ...state } = (window as any).__ctx.toolData.dissection; return state; });
}
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await page.clock.runFor(80); }
async function readings(response: Locator) {
  return response.locator('[data-metric]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.getAttribute('data-metric'), {
    available: node.getAttribute('data-available'), direction: node.getAttribute('data-direction'),
    values: Array.from(node.querySelectorAll('.diss-replay-response__reading b')).map(value => Number(value.textContent)),
    change: node.querySelector('.diss-replay-response__change')?.textContent || '',
    text: node.querySelector('dd')!.textContent,
  }])));
}
async function barMetrics(response: Locator) {
  return response.locator('.diss-replay-response__reading').evaluateAll(nodes => nodes.map(node => {
    const track = node.querySelector('.diss-replay-response__track') as HTMLElement;
    const fill = node.querySelector('.diss-replay-response__fill') as HTMLElement;
    return { metric: node.closest('[data-metric]')!.getAttribute('data-metric'), phase: node.getAttribute('data-phase'), value: Number(node.querySelector('b')!.textContent), hidden: track.getAttribute('aria-hidden'), percent: fill.style.width, width: fill.getBoundingClientRect().width, availableWidth: track.clientWidth };
  }));
}
const variants = [
  { name: 'desktop-motion', width: 1440, available: 1180, reduced: false },
  { name: 'phone-reduced', width: 320, available: 320, reduced: true },
  { name: 'phone-forced-colors', width: 390, available: 390, reduced: true, forced: true },
  { name: 'embedded-large-contrast', width: 1440, available: 320, reduced: true, large: true, contrast: true },
];
for (const variant of variants) test(`recorded replay response ${variant.name} follows the held action`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: variant.reduced ? 'reduce' : 'no-preference', forcedColors: variant.forced ? 'active' : 'none' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, reducedMotion: variant.reduced, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + pauseLeadMs));
  const panel = page.locator('#diss-replay-review'), response = page.locator('#diss-replay-response'), summary = page.locator('#diss-replay-response-summary');
  const picker = page.locator('#diss-replay-action'), toggle = page.locator('#diss-replay-toggle'), launch = page.getByRole('button', { name: 'Review actions', exact: true });
  const history = page.locator('.diss-procedure__timeline-entry');
  await expect(history).toHaveCount(18); await expect(history.last()).toHaveAttribute('aria-pressed', 'true');
  const before = await savedState(page);
  await activate(page, launch); await expect(picker).toHaveValue('0'); await expect(toggle).toBeFocused();
  await expect(summary).toContainText('4 of 4 measures recorded'); await expect(response).not.toHaveAttribute('open', '');
  await activate(page, summary); await expect(summary).toBeFocused(); await expect(response).toHaveAttribute('open', '');
  await expect(response.locator('.diss-replay-response__explanation')).toHaveText(records[0].outcomeDetail);
  const first = await readings(response);
  expect(first.clarity).toMatchObject({ available: 'true', direction: 'improve', values: [25, 65], change: '+40 points · More clear' });
  expect(first.exposure).toMatchObject({ direction: 'neutral', values: [40, 40], change: '0 points · Unchanged' });
  expect(first.stability).toMatchObject({ direction: 'caution', values: [70, 55], change: '-15 points · Less stable' });
  expect(first.risk).toMatchObject({ direction: 'improve', values: [45, 15], change: '-30 points · Lower risk' });
  const fullBars = await barMetrics(response); expect(fullBars).toHaveLength(8);
  for (const bar of fullBars) { expect(bar.hidden).toBe('true'); expect(bar.percent).toBe(bar.value + '%'); expect(Math.abs(bar.width - bar.availableWidth * bar.value / 100)).toBeLessThanOrEqual(1); }
  const positions: number[] = [];
  async function verifyHeld(index: number) {
    await expect(picker).toHaveValue(String(index)); await expect(response).toHaveAttribute('open', '');
    await expect(history.last()).toHaveAttribute('aria-pressed', 'true');
    expect(await savedState(page)).toEqual(before);
    positions.push(await panel.evaluate(node => { const picker = node.querySelector('#diss-replay-action')!.getBoundingClientRect(), buttons = node.querySelector('.diss-replay-review__buttons')!.getBoundingClientRect(); return buttons.top - picker.bottom; }));
  }
  async function select(index: number) { await picker.focus(); await picker.selectOption(String(index)); await page.clock.runFor(80); await expect(picker).toBeFocused(); await verifyHeld(index); }
  await verifyHeld(0);
  await summary.focus(); await response.screenshot({ path: `${out}/${variant.name}-full.png`, style: '.diss-next-action{position:static!important;}' });
  await activate(page, page.locator('#diss-replay-next')); await expect(page.locator('#diss-replay-next')).toBeFocused(); await verifyHeld(1);
  await expect(response.locator('.diss-replay-response__explanation')).toHaveText(records[1].outcomeDetail);
  const second = await readings(response);
  expect(second.clarity.values).toEqual([0, 100]); expect(second.exposure.values).toEqual([100, 0]);
  expect(second.risk).toMatchObject({ direction: 'caution', values: [10, 40], change: '+30 points · Higher risk' });
  const boundaryBars = await barMetrics(response);
  for (const bar of boundaryBars) { expect(bar.hidden).toBe('true'); expect(Math.abs(bar.width - bar.availableWidth * bar.value / 100)).toBeLessThanOrEqual(1); }
  await activate(page, page.locator('#diss-replay-previous')); await verifyHeld(0); await expect(page.locator('#diss-replay-next')).toBeFocused();
  expect(await readings(response)).toEqual(first);
  await select(2); await expect(summary).toContainText('1 of 4 measures recorded');
  const partial = await readings(response);
  expect(partial.clarity).toMatchObject({ available: 'true', direction: 'caution', values: [65, 60], change: '-5 points · Less clear' });
  for (const metric of ['exposure', 'stability', 'risk']) expect(partial[metric]).toMatchObject({ available: 'false', values: [], change: '', text: 'Before/after not recorded' });
  await expect(response.locator('.diss-replay-response__track')).toHaveCount(2);
  await response.screenshot({ path: `${out}/${variant.name}-partial.png`, style: '.diss-next-action{position:static!important;}' });
  await select(3); await expect(summary).toContainText('0 of 4 measures recorded'); await expect(response.locator('[data-metric]')).toHaveCount(0);
  await expect(response.locator('.diss-replay-response__empty')).toHaveText('No complete before-and-after tissue measures were saved for this action.');
  await expect(response.locator('.diss-replay-response__explanation')).toHaveText(literalExplanation); await expect(response.locator('img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__replayResponseInjected)).toBeUndefined();
  const longMetrics = await response.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth, explanation: (() => { const p = node.querySelector('.diss-replay-response__explanation')!; return { client: p.clientWidth, scroll: p.scrollWidth }; })() }));
  expect(longMetrics.scroll).toBeLessThanOrEqual(longMetrics.client + 1); expect(longMetrics.explanation.scroll).toBeLessThanOrEqual(longMetrics.explanation.client + 1);
  await select(4); await expect(summary).toContainText('0 of 4 measures recorded'); await expect(response.locator('.diss-replay-response__explanation')).toHaveCount(0); await expect(response.locator('.diss-replay-response__empty')).toBeVisible();
  for (const position of positions) expect(Math.abs(position - positions[0])).toBeLessThan(1);
  await select(0);
  const metrics = await response.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
    summaryHeight: node.querySelector('summary')!.getBoundingClientRect().height, liveRegion: !!node.closest('[aria-live], [role="status"]'),
    cells: Array.from(node.querySelectorAll('summary, p, dt, dd, .diss-replay-response__reading, .diss-replay-response__change')).map(cell => ({ font: parseFloat(getComputedStyle(cell).fontSize), client: cell.clientWidth, scroll: cell.scrollWidth })),
  }));
  expect(metrics.width).toBeLessThanOrEqual(variant.available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1); expect(metrics.summaryHeight).toBeGreaterThanOrEqual(48); expect(metrics.liveRegion).toBe(false);
  for (const cell of metrics.cells) { expect(cell.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1); }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); await page.clock.resume(); let audit: any;
  try { audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-replay-response']] })); }
  finally { const endedAt = await page.evaluate(() => Date.now()); await page.clock.pauseAt(new Date(endedAt + pauseLeadMs)); }
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  await activate(page, toggle); await expect(response).toHaveCount(0); await expect(toggle).toBeFocused(); await page.clock.runFor(400);
  await activate(page, toggle); await expect(response).toBeVisible(); await expect(toggle).toBeFocused(); await expect(response).not.toHaveAttribute('open', '');
  await activate(page, summary); await expect(response).toHaveAttribute('open', '');
  await select(0); expect(await readings(response)).toEqual(first);
  await activate(page, page.getByRole('button', { name: 'Stop replay', exact: true })); await expect(panel).toHaveCount(0); await expect(launch).toBeFocused(); expect(await savedState(page)).toEqual(before);
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify({ fullBars, boundaryBars, first, second, partial, positions, longMetrics, metrics, historySelectionPreserved: true, savedStatePreserved: true }, null, 2));
});
