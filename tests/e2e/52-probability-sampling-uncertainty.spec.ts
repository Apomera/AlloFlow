import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_probability.js',
  toolId: 'probability',
  width: 360,
  height: 1400,
  appStyles: true,
});

test.describe.configure({ timeout: 120_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('sampling-uncertainty panel remains readable at a narrow tool width', async ({ page }) => {
  // An all-heads run puts both the observed marker and interval endpoint at
  // 100%, the worst case for accidental right-edge overflow.
  const results = Array(20).fill('H');
  await harness.mount(page, { probability: {
    mode: 'coin', trials: results.length, results,
    convergenceHistory: [{ t: 10, pct: 100 }, { t: 20, pct: 100 }],
  } }, undefined, { expectCanvas: false });

  const panel = page.getByRole('region', { name: /Sampling Uncertainty/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Unusual for this model.')).toBeVisible();
  await expect(page.getByRole('img', { name: /Wilson 95 percent interval/ })).toBeVisible();

  const fit = await panel.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    wrapRight: document.getElementById('wrap')!.getBoundingClientRect().right,
  }));
  expect(fit.scrollWidth, 'uncertainty panel has horizontal overflow').toBeLessThanOrEqual(fit.clientWidth + 1);
  expect(fit.left, 'panel escaped the tool on the left').toBeGreaterThanOrEqual(0);
  expect(fit.right, 'panel escaped the 360px tool on the right').toBeLessThanOrEqual(fit.wrapRight + 1);

  const errors = await page.evaluate(() => (window as any).__events.errors);
  expect(errors).toEqual([]);

  await page.addScriptTag({ path: resolve('desktop/web-app/node_modules/axe-core/axe.min.js') });
  const violations = await panel.evaluate(async (element) => {
    const results = await (window as any).axe.run(element);
    return results.violations
      .filter((violation: any) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation: any) => ({ id: violation.id, targets: violation.nodes.map((node: any) => node.target) }));
  });
  expect(violations).toEqual([]);
});

test('dependent-draw explanation replaces rather than overlays the interval', async ({ page }) => {
  const results = ['Red', 'Blue', 'Red', 'Blue', 'Red', 'Blue'];
  await harness.mount(page, { probability: {
    mode: 'marbleBag', mbWithoutReplacement: true,
    customOutcomes: [
      { label: 'Red', count: 3, color: '#ef4444' },
      { label: 'Blue', count: 3, color: '#3b82f6' },
    ],
    trials: results.length, results,
  } }, undefined, { expectCanvas: false });

  const panel = page.getByRole('region', { name: /Sampling Uncertainty/ });
  await expect(panel.getByText(/Interval paused:/)).toBeVisible();
  await expect(panel.getByRole('img')).toHaveCount(0);
});
