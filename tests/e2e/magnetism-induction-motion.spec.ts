import { test, expect, type Page } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_magnetism.js', toolId: 'magnetism',
  width: 1080, height: 1800, layout: 'document',
});
const artifacts = join(process.cwd(), 'tmp', 'magnetism-induction-motion');
const seed = {
  magnetism: {
    tab: 'induce', induceMode: 'hand', learningMode: 'guided',
    induceX: -100, inducePrevX: -100, induceTurns: 50,
    lastEMF: 0, peakEMF: 0, emfTrace: [], induceSpeedTrials: {},
    missionId: 'power_path', missionPanelOpen: true,
    labShellPanel: '', labShellMenuOpen: false, notebookTrials: [], notebookOpen: false,
    notebookClaim: 'A complete pass can produce voltage even when its net flux change is zero.',
    notebookReasoning: 'The magnet approaches and then leaves the coil, so the flux changes in both directions.',
  },
};

test.describe.configure({ mode: 'serial', timeout: 180_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(artifacts, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, width = 1080) {
  await page.setViewportSize({ width, height: 1100 });
  await harness.mount(page, seed, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((wrap, nextWidth) => {
    (wrap as HTMLElement).style.width = String(nextWidth) + 'px';
  }, width);
  await expect(page.getByRole('button', { name: 'Run timed motion', exact: true })).toBeVisible();
}

async function data(page: Page) {
  return page.evaluate(() => (window as any).__toolData.magnetism);
}

async function openPanel(page: Page, name: 'Evidence' | 'Mission') {
  await page.locator('#mag-shell-menu-button').click();
  await page.locator('#mag-shell-menu').getByRole('button', { name: new RegExp(name) }).click();
}

async function expectWorkbenchFocus(page: Page) {
  await expect(page.locator('#mag-induction-motion-workbench')).toBeFocused();
}

test('captures a bipolar pass, inspects without moving the live magnet, and reopens immutable saved data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mount(page);
  const studio = page.locator('[data-induction-motion-studio="true"]');
  await studio.getByRole('button', { name: 'Pass through coil', exact: true }).click();
  await studio.getByRole('slider', { name: 'Motion duration (s)', exact: true }).fill('2');
  await studio.getByRole('button', { name: 'Run timed motion', exact: true }).click();
  const sample = studio.getByRole('combobox', { name: 'Inspect motion sample', exact: true });
  await expect(sample.locator('option')).toHaveCount(41);
  expect((await data(page)).lastEMF).toBe(0);
  const recorded = (await data(page)).induceMotion;
  expect(recorded).toMatchObject({ version: 1, type: 'induction-motion', controls: { start: -80, finish: 80, duration: 2, turns: 50 } });
  expect(recorded.samples).toHaveLength(41);
  expect(recorded.peakMagnitude).toBeGreaterThan(0);
  expect(recorded.meanEMF).toBeCloseTo(0, 10);
  const livePosition = (await data(page)).induceX;
  await sample.selectOption('10');
  expect((await data(page)).induceX).toBe(livePosition);
  await expect(studio.locator('[data-motion-reading]')).toContainText('Flux is increasing');
  await expect(studio.getByRole('img', { name: /^Recorded magnet position/ })).toHaveAttribute('aria-label', /position -40\.0/);
  await sample.selectOption('30');
  expect((await data(page)).induceX).toBe(livePosition);
  await expect(studio.locator('[data-motion-reading]')).toContainText('Flux is decreasing');
  await expect(studio.getByRole('img', { name: /^Recorded magnet position/ })).toHaveAttribute('aria-label', /position 40\.0/);

  const csvEvent = page.waitForEvent('download');
  await studio.getByRole('button', { name: 'Save motion CSV', exact: true }).click();
  const csvDownload = await csvEvent;
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
  const csvPath = await csvDownload.path();
  expect(csvPath).not.toBeNull();
  const rows = (await readFile(csvPath!, 'utf8')).trim().split(/\r?\n/).map((line) => line.split(','));
  const columns = rows.shift()!;
  expect(rows).toHaveLength(41);
  const voltageIndex = columns.findIndex((column) => /voltage|emf/i.test(column));
  const timeIndex = columns.findIndex((column) => /^time(?:_|$)/i.test(column));
  expect(voltageIndex).toBeGreaterThanOrEqual(0);
  expect(timeIndex).toBeGreaterThanOrEqual(0);
  const voltages = rows.map((row) => Number(row[voltageIndex]));
  expect(Math.min(...voltages)).toBeLessThan(0);
  expect(Math.max(...voltages)).toBeGreaterThan(0);
  expect(voltages.reduce((sum, voltage) => sum + voltage, 0) / voltages.length).toBeCloseTo(0, 7);
  expect(Number(rows[0][timeIndex])).toBe(0);
  expect(Number(rows[40][timeIndex])).toBe(2);
  await csvDownload.saveAs(join(artifacts, 'complete-pass.csv'));
  await studio.getByRole('button', { name: 'Save motion trial', exact: true }).click();
  const saved = (await data(page)).notebookTrials;
  expect(saved).toHaveLength(1);
  expect(saved[0].motionExperiment).toEqual(recorded);
  const captured = saved[0].motionExperiment;

  await studio.getByRole('button', { name: 'Hold at center', exact: true }).click();
  await studio.getByRole('slider', { name: 'Motion duration (s)', exact: true }).fill('4');
  await page.getByRole('slider', { name: /^Turns on the coil \(N\)/ }).fill('100');
  // Draft edits and a different run cannot overwrite the saved experiment.
  expect((await data(page)).notebookTrials[0].motionExperiment).toEqual(captured);
  expect((await data(page)).induceMotion).toEqual(recorded);
  await expect(studio).toContainText('Controls changed for the next run; these recorded samples stay fixed.');
  await studio.getByRole('button', { name: 'Run timed motion', exact: true }).click();
  expect((await data(page)).notebookTrials[0].motionExperiment).toEqual(captured);
  await page.getByRole('tab', { name: /Electromagnet/ }).click();
  await openPanel(page, 'Evidence');
  const evidence = page.locator('[data-magnetism-shell-panel="evidence"]');
  const claim = 'A pass makes opposite voltage pulses although the starting and ending flux match.';
  await evidence.getByLabel('Claim supported by your evidence', { exact: true }).fill(claim);
  await evidence.getByRole('button', { name: /Reopen motion/ }).focus();
  await page.keyboard.press('Enter');
  await expectWorkbenchFocus(page);
  await expect(studio.getByRole('slider', { name: 'Motion duration (s)', exact: true })).toHaveValue('2');
  await expect(page.getByRole('slider', { name: /^Turns on the coil \(N\)/ })).toHaveValue('50');
  await expect(sample).toHaveValue('0');
  const restored = await data(page);
  expect(restored.tab).toBe('induce');
  expect(restored.induceMode).toBe('hand');
  expect(restored.lastEMF).toBe(0);
  expect(restored.induceMotion).toEqual(recorded);
  expect(restored.notebookTrials).toEqual(saved);
  expect(restored.notebookClaim).toBe(claim);
  await studio.screenshot({ path: join(artifacts, 'reopened-motion-desktop.png') });

  await openPanel(page, 'Mission');
  const mission = page.locator('[data-magnetism-shell-panel="mission"]');
  await mission.getByText(/^Lab report ·/).click();
  const reportEvent = page.waitForEvent('download');
  await mission.getByRole('button', { name: 'Save JSON report', exact: true }).click();
  const reportDownload = await reportEvent;
  const reportPath = await reportDownload.path();
  expect(reportPath).not.toBeNull();
  const report = JSON.parse(await readFile(reportPath!, 'utf8'));
  expect(report.claim).toBe(claim);
  expect(report.trials[0].motionExperiment).toEqual(captured);
  await reportDownload.saveAs(join(artifacts, 'motion-trial-report.json'));
  expect(errors).toEqual([]);
});

test('settles a hand-generated pulse to zero and opens the completed speed evidence notebook', async ({ page }) => {
  await mount(page);
  await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z'));
  const livePosition = page.locator('#mag-hand-generator-position');
  await livePosition.focus();
  await page.keyboard.press('ArrowRight');
  const pulse = await data(page);
  expect(pulse.induceX).toBe(-98);
  expect(Math.abs(pulse.lastEMF)).toBeGreaterThan(0);
  await page.clock.runFor(500);
  const settled = await data(page);
  expect(settled.lastEMF).toBe(0);
  expect(settled.peakEMF).toBeGreaterThanOrEqual(Math.abs(pulse.lastEMF));
  expect(settled.induceLastPulse).toBe(pulse.lastEMF);
  expect(settled.induceStepSeconds).toBeCloseTo(0.1, 8);
  expect(settled.emfTrace.some((value: number) => Math.abs(value) > 0)).toBe(true);
  await livePosition.dispatchEvent('pointerdown');
  await livePosition.fill('-60');
  await page.clock.runFor(200);
  await livePosition.fill('-20');
  const timedHandMove = await data(page);
  expect(timedHandMove.induceStepSeconds).toBeCloseTo(0.2, 8);
  expect(Math.abs(timedHandMove.lastEMF)).toBeGreaterThan(0);
  await livePosition.dispatchEvent('pointerup');
  expect((await data(page)).lastEMF).toBe(0);
  await page.keyboard.press('ArrowRight');
  expect(Math.abs((await data(page)).lastEMF)).toBeGreaterThan(0);
  await page.keyboard.press('Tab');
  expect((await data(page)).lastEMF).toBe(0);
  await livePosition.focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('tab', { name: /Electromagnet/ }).click();
  await page.clock.runFor(500);
  expect((await data(page)).lastEMF).toBe(0);
  await page.locator('#mag-tab-induce').click();

  const board = page.getByRole('region', { name: 'Generator speed evidence board', exact: true });
  await board.getByRole('button', { name: 'Slow · 1.00 s', exact: true }).click();
  await board.getByRole('button', { name: 'Fast · 0.25 s', exact: true }).click();
  await board.getByRole('button', { name: 'Hold still', exact: true }).click();
  const trials = (await data(page)).induceSpeedTrials;
  expect(trials.fast.voltage / trials.slow.voltage).toBeCloseTo(4, 10);
  expect(Math.abs(timedHandMove.lastEMF) / trials.slow.voltage).toBeCloseTo(5, 8);
  expect(trials.still.voltage).toBe(0);
  await expect(board).toContainText('Evidence complete');
  await board.getByRole('button', { name: 'Record evidence in notebook', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-magnetism-shell-panel="evidence"]')).toBeVisible();
  expect((await data(page)).labShellPanel).toBe('evidence');
});

test('supports keyboard sample inspection and reduced motion without phone overflow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, 390);
  const studio = page.locator('[data-induction-motion-studio="true"]');
  await studio.getByRole('button', { name: 'Approach coil', exact: true }).click();
  await studio.getByRole('button', { name: 'Run timed motion', exact: true }).focus();
  await page.keyboard.press('Enter');
  const sample = studio.getByRole('combobox', { name: 'Inspect motion sample', exact: true });
  await sample.selectOption('10');
  const livePosition = (await data(page)).induceX;
  await studio.getByRole('button', { name: 'Next motion sample', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(sample).toHaveValue('11');
  await studio.getByRole('button', { name: 'Previous motion sample', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(sample).toHaveValue('10');
  expect((await data(page)).induceX).toBe(livePosition);
  expect((await data(page)).lastEMF).toBe(0);
  const bounds = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.mag-root')!;
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, rootWidth: root.clientWidth, rootScroll: root.scrollWidth };
  });
  expect(bounds.documentWidth, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.viewport + 1);
  expect(bounds.rootScroll, JSON.stringify(bounds)).toBeLessThanOrEqual(bounds.rootWidth + 1);
  await studio.screenshot({ path: join(artifacts, 'motion-sample-phone.png') });
  await studio.getByText(/^Motion data table/).click();
  await expect(studio.getByRole('table').getByRole('row')).toHaveCount(42);
  await page.addScriptTag({ path: join(process.cwd(), 'node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-induction-motion-studio="true"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    return result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
  await studio.getByRole('button', { name: 'Save motion trial', exact: true }).click();
  await studio.getByRole('button', { name: 'View motion trials', exact: true }).click();
  await expect(page.locator('[data-magnetism-shell-panel="evidence"]')).toBeVisible();
});

test('finishes animated tube races and cancels or resolves them when controls or motion preferences change', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page);
  const eddyMode = page.getByRole('button', { name: /Eddy currents.*Lenz force/ });
  const handMode = page.getByRole('button', { name: /Hand generator.*move a magnet/ });
  await eddyMode.click();
  const race = page.getByRole('region', { name: 'Eddy-current tube race', exact: true });
  const drop = race.getByRole('button', { name: /Drop both magnets|Drop again/ });
  const finish = async () => {
    await expect.poll(async () => (await data(page)).tubeDone, { timeout: 10_000 }).toBe(true);
    const finished = await data(page);
    expect(finished.tubeRunning).toBe(false);
    expect(finished.tubeProg).toEqual({ cu: 1, pl: 1 });
    await expect(drop).toBeEnabled();
  };
  const start = async () => {
    await drop.click();
    await expect(race.getByRole('button', { name: 'falling...', exact: true })).toBeDisabled();
    await expect.poll(async () => (await data(page)).tubeProg.pl).toBeGreaterThan(0);
  };
  const ensureStopped = async () => {
    // Give a canceled callback a chance to run; it must not alter the reset state.
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const stopped = await data(page);
    expect(stopped.tubeRunning).toBe(false);
    expect(stopped.tubeDone).toBe(false);
    expect(stopped.tubeProg).toEqual({ cu: 0, pl: 0 });
  };

  await start();
  const falling = await data(page);
  expect(falling.tubeProg.pl).toBeGreaterThan(falling.tubeProg.cu);
  await finish();
  await start();
  await page.getByRole('button', { name: 'Solid plate/tube: closed loop', exact: true }).click();
  await ensureStopped();
  await expect(drop).toBeEnabled();
  await start();
  await handMode.click();
  await ensureStopped();
  await eddyMode.click();
  await expect(drop).toBeEnabled();
  await page.getByRole('button', { name: 'Slit plate/tube: open loop', exact: true }).click();
  await start();
  await page.getByRole('tab', { name: /Electromagnet/ }).click();
  await ensureStopped();
  await page.locator('#mag-tab-induce').click();
  await expect(drop).toBeEnabled();

  await start();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finish();
  await drop.click();
  await finish();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await start();
  await finish();
  await race.screenshot({ path: join(artifacts, 'tube-race-completed.png') });
  expect(errors).toEqual([]);
});
