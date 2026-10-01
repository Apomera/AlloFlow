import { expect, test } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_probability.js',
  toolId: 'probability',
  width: 360,
  height: 1600,
  appStyles: true,
});

test.describe.configure({ timeout: 120_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('Auto-Run announces discrete state changes and stops after Reset and unmount', async ({ page }) => {
  await harness.mount(page, { probability: {
    mode: 'coin', results: [], trials: 0, convergenceHistory: [], _autoSpeed: 250,
  } }, undefined, { expectCanvas: false });

  // The production host supplies announceToSR. GlHarness intentionally stubs it,
  // so bridge that host callback to the tool's real polite status region and
  // rerender once before exercising the controls.
  await page.evaluate(() => {
    (window as any).__ctx.announceToSR = (message: string) => {
      const live = document.getElementById('allo-live-probability');
      if (live) live.textContent = String(message);
    };
    (window as any).__rerender();
  });

  const controls = page.getByRole('group', { name: 'Automatic simulation controls' });
  await expect(controls).toBeVisible();

  const auto = controls.getByRole('button', { name: 'Automatic simulation', exact: true });
  await expect(auto).toHaveAttribute('aria-pressed', 'false');

  const speedGroup = controls.getByRole('group', { name: 'Automatic simulation speed' });
  const speedButtons = speedGroup.getByRole('button');
  await expect(speedButtons).toHaveCount(4);
  expect(await speedButtons.evaluateAll((buttons) =>
    buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').length,
  )).toBe(1);
  await expect(speedGroup.getByRole('button', { name: /Normal/i })).toHaveAttribute('aria-pressed', 'true');

  const turbo = speedGroup.getByRole('button', { name: /Turbo/i });
  await turbo.focus();
  await page.keyboard.press('Space');
  await expect(turbo).toBeFocused();
  await expect(turbo).toHaveAttribute('aria-pressed', 'true');

  const status = page.locator('#allo-live-probability');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toHaveText('Automatic simulation speed set to Turbo.');

  await auto.focus();
  await page.keyboard.press('Space');
  await expect(auto).toBeFocused();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toHaveText('Automatic simulation started.');

  await page.waitForFunction(() => ((window as any).__toolData.probability.trials || 0) >= 4);

  const reset = page.getByRole('button', { name: 'Reset current run' });
  await reset.focus();
  await page.keyboard.press('Enter');
  await expect(reset).toBeFocused();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(status).toHaveText('Current run reset. Automatic simulation and animations stopped.');

  const afterReset = await page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return { trials: d.trials, results: d.results.length, running: d._autoRunning };
  });
  expect(afterReset).toEqual({ trials: 0, results: 0, running: false });
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return { trials: d.trials, results: d.results.length, running: d._autoRunning };
  })).toEqual(afterReset);

  await auto.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => ((window as any).__toolData.probability.trials || 0) >= 4);
  await page.evaluate(() => (window as any).__destroy());
  await page.waitForTimeout(30);
  const afterUnmount = await page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return { trials: d.trials, results: d.results.length };
  });
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return { trials: d.trials, results: d.results.length };
  })).toEqual(afterUnmount);
});

test('Pi slow-drop Reset clears its timer and totals', async ({ page }) => {
  await harness.mount(page, { probability: {
    mode: 'pi', results: [], trials: 0, convergenceHistory: [],
    _piPoints: [], _piTotal: 0, _piInside: 0,
  } }, undefined, { expectCanvas: false });

  const slowDrop = page.getByRole('button', { name: /Slow-drop 100 points one at a time/i });
  await slowDrop.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => ((window as any).__toolData.probability._piTotal || 0) >= 2);

  const reset = page.getByRole('button', { name: 'Reset current run' });
  await reset.focus();
  await page.keyboard.press('Enter');
  await expect(reset).toBeFocused();

  const readPi = () => page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return {
      total: d._piTotal || 0,
      inside: d._piInside || 0,
      trials: d.trials || 0,
      results: (d.results || []).length,
      points: (d._piPoints || []).length,
    };
  });
  expect(await readPi()).toEqual({ total: 0, inside: 0, trials: 0, results: 0, points: 0 });
  await page.waitForTimeout(350);
  expect(await readPi()).toEqual({ total: 0, inside: 0, trials: 0, results: 0, points: 0 });
});

test('two-dice Auto-Run preserves the rolled pair and renders the same sum', async ({ page }) => {
  await harness.mount(page, { probability: {
    mode: 'dice2', diceSides: 6, results: [], trials: 0,
    convergenceHistory: [], _autoSpeed: 20,
  } }, undefined, { expectCanvas: false });

  await page.evaluate(() => {
    let draw = 0;
    Math.random = () => [0.01, 0.99][draw++ % 2];
  });

  const controls = page.getByRole('group', { name: 'Automatic simulation controls' });
  const auto = controls.getByRole('button', { name: 'Automatic simulation', exact: true });
  await auto.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => ((window as any).__toolData.probability.trials || 0) >= 4);
  await page.keyboard.press('Space');
  await expect(auto).toHaveAttribute('aria-pressed', 'false');

  const pausedAt = await page.evaluate(() => (window as any).__toolData.probability.trials);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__toolData.probability.trials)).toBe(pausedAt);

  const result = await page.evaluate(() => {
    const d = (window as any).__toolData.probability;
    return { pair: d._lastPair, lastResult: d.lastResult };
  });
  expect(result.pair).toEqual([1, 6]);
  expect(result.pair[0] + result.pair[1]).toBe(result.lastResult);

  const dieNames = await page.getByRole('img', { name: /^d6 showing/i })
    .evaluateAll((dice) => dice.map((die) => die.getAttribute('aria-label')));
  expect(dieNames).toEqual(['d6 showing 1', 'd6 showing 6']);
  const lastResult = page.getByText('Last result', { exact: true }).locator('..').locator('p').first();
  await expect(lastResult).toHaveText(String(result.lastResult));
});
