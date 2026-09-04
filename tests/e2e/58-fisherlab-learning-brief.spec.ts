import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_fisherlab.js', toolId: 'fisherLab', width: 1180, height: 980, appStyles: true, extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('warmups explain errors, retain topic choices, and lead to evidence without awarding progress', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  const warmup = page.locator('[data-fisherlab-warmup]');
  await expect(page.getByRole('heading', { name: 'Read the water. Make your call.' })).toBeVisible();
  await expect(warmup.getByText('Take it into the lab.', { exact: false })).toHaveCount(0);
  const before = await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'));
  await warmup.getByRole('button', { name: 'It halves: 30 to 15 minutes' }).click();
  await expect(warmup.getByRole('status')).toContainText('Reconsider your claim');
  await expect(warmup.getByRole('status')).toContainText('Time = distance ÷ speed');
  await warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' }).click();
  await expect(warmup.getByRole('status')).toContainText('Supported by the evidence');
  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await expect(warmup.getByRole('status')).toBeEmpty();
  await warmup.getByRole('button', { name: '80% of all fish in the region are this species', exact: true }).click();
  await expect(warmup.getByRole('status')).toContainText('Reconsider your claim');
  await warmup.getByRole('button', { name: '80% of this catch sample are this species', exact: true }).click();
  await expect(warmup.getByRole('status')).toContainText('Supported by the evidence');
  await warmup.getByLabel('Warmup topic').selectOption('measurement');
  await warmup.getByRole('button', { name: 'Check alignment and repeat the measurement' }).click();
  await expect(warmup.getByRole('status')).toContainText('0.4 units');
  await warmup.getByLabel('Warmup topic').selectOption('navigation');
  await expect(warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('fisherLab.state.v1'))).toEqual(before);
  await warmup.getByLabel('Warmup topic').selectOption('sampling');
  await warmup.getByRole('button', { name: /Examine journal evidence/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Field Journal');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('briefing and warmup fit a phone with large text and keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '390px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  const warmup = page.locator('[data-fisherlab-warmup]');
  const answer = warmup.getByRole('button', { name: 'It doubles: 30 to 60 minutes' });
  await answer.focus();
  await page.keyboard.press('Enter');
  await expect(answer).toHaveAttribute('aria-pressed', 'true');
  await warmup.getByText('Need a discussion starter?', { exact: true }).click();
  await expect(warmup.getByText(/My claim is/)).toBeVisible();
  const metrics = await page.evaluate(() => {
    const selectors = ['[data-fisherlab-command]', '[data-fisherlab-warmup]'];
    return selectors.map(selector => { const el = document.querySelector(selector)! as HTMLElement; return { client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right }; });
  });
  for (const metric of metrics) { expect(metric.scroll).toBeLessThanOrEqual(metric.client + 1); expect(metric.right).toBeLessThanOrEqual(390); }
  const violations = await page.evaluate(async () => (await (window as any).axe.run('[data-fisherlab-warmup]', { runOnly: { type: 'rule', values: ['color-contrast', 'button-name', 'label', 'aria-valid-attr-value', 'aria-allowed-attr'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(violations).toEqual([]);
  await page.screenshot({ path: 'scratch/fisherlab-learning-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '1180px'; });
  await page.getByRole('button', { name: 'Large text', exact: true }).click();
  await page.screenshot({ path: 'scratch/fisherlab-learning-desktop.png', fullPage: true });
});
