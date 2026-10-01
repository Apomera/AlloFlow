import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1080, height: 900,
  extraScripts: ['node_modules/axe-core/axe.min.js']
});
test.describe.configure({ timeout: 120000 });
test.use({ viewport: { width: 1080, height: 900 }, reducedMotion: 'reduce' });
test.beforeAll(async () => { mkdirSync('scratch/beehive-first-release', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: any, dark = false) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate((isDark: boolean) => {
    const w = window as any;
    w.__mount({ beehive: { viewMode: 'beekeeper', day: 17, honey: 31, workers: 12345, tutorialDone: true, soundOn: false, motionPaused: true,
      honeyInvestigation: { version: 'honey-stores-1', active: true, step: 0 } } });
    w.__ctx.isDark = isDark; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, dark);
  await expect(page.locator('[data-beehive-honey-lab]')).toBeVisible();
}
async function keyChoose(page: any, field: string, value: string) {
  const radio = page.locator('input[name="bee-honey-' + field + '"]').filter({ visible: true });
  const options = await radio.evaluateAll((nodes: HTMLInputElement[]) => nodes.map(n => n.value));
  const target = radio.nth(options.indexOf(value));
  await target.focus(); await page.keyboard.press('Space');
  await expect(target).toBeChecked();
}
async function keyButton(page: any, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await button.focus(); await page.keyboard.press('Enter');
}
async function toCompare(page: any) {
  await keyChoose(page, 'initialPrediction', 'lower');
  await keyChoose(page, 'initialReason', 'The colony may use more food than the foragers bring in.');
  await keyButton(page, 'Run the baseline');
  await expect(page.locator('#bee-honey-step-title')).toBeFocused();
  await keyButton(page, 'Plan a comparison');
  await keyChoose(page, 'actionId', 'feed_bees');
  await keyChoose(page, 'expectedDirection', 'higher');
  await keyChoose(page, 'planReason', 'Supplemental food changes the starting food available, but the dearth continues.');
  await keyButton(page, 'Register plan and run B');
  await expect(page.locator('[data-honey-fair-comparison]')).toHaveAttribute('data-honey-fair-comparison', 'matched');
}
async function audit(page: any) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-honey-lab]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
}
test('keyboard investigation saves evidence, restores focus, and keeps the original colony', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/desktop-predict.png', fullPage: true });
  await toCompare(page); await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/desktop-compare.png', fullPage: true });
  await keyButton(page, 'Explain the result');
  await keyChoose(page, 'explanationChoice', 'budget');
  await keyButton(page, 'Try a new situation');
  await keyChoose(page, 'transferPrediction', 'lower');
  await keyButton(page, 'Save investigation');
  await expect(page.locator('[data-honey-step]')).toHaveAttribute('data-honey-step', '6');
  await audit(page);
  const state = await page.evaluate(() => (window as any).__toolData.beehive);
  expect(state).toMatchObject({ day: 17, honey: 31, workers: 12345 });
  expect(state.notebook.honeyStores.text).toContain('Run B Day 55');
  await keyButton(page, 'Open Science Notebook');
  await expect(page.locator('[data-honey-notebook-record]')).toBeVisible();
  await expect(page.locator('[data-beehive-notebook]')).toBeFocused();
  expect(errors).toEqual([]);
});
test('reflows at 390 and 320 pixels with readable tables and contrasting light and dark themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await mount(page);
  await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/mobile-predict.png', fullPage: true });
  await toCompare(page); await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/mobile-compare.png', fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.getByText('Read both food budgets', { exact: true }).click();
    const tables = page.locator('.bhh-table-wrap');
    await expect(tables.first()).toBeVisible();
    await tables.first().focus(); await page.keyboard.press('ArrowRight');
    await page.getByText('Read both food budgets', { exact: true }).click();
  }
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/mobile-dark.png', fullPage: true });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.screenshot({ path: 'scratch/beehive-first-release/mobile-forced-colors.png', fullPage: true });
  await expect(page.getByRole('button', { name: 'Explain the result', exact: true })).toBeVisible();
});
test('keeps lesson usable with enlarged text and preserves a paused draft', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await keyChoose(page, 'initialPrediction', 'lower');
  await keyButton(page, 'Return to my hive');
  await expect(page.locator('[data-open-honey-lab]')).toBeFocused();
  await keyButton(page, 'Resume investigation');
  await expect(page.locator('input[value="lower"]')).toBeChecked();
  await expect(page.locator('#bee-honey-step-title')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await audit(page);
  await page.screenshot({ path: 'scratch/beehive-first-release/enlarged-text.png', fullPage: true });
});
