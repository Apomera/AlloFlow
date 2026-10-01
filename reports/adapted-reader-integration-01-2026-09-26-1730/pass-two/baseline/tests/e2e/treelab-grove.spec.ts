import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 900,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 240_000 });
test.use({ viewport: { width: 1365, height: 1000 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('plays, saves, rewinds and finishes a grove without changing the lab tree', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => {
    const w = window as any, tree = w.__alloTreeLabEngine.newTree('willow');
    w.__mount({ treeLab: { view: 'grove', tree, speciesId: 'willow', playing: true } });
  });
  const grove = page.getByRole('region', { name: 'Grove campaign', exact: true });
  const original = await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.treeLab.tree));
  await expect(grove).toBeVisible();
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.treeLab.tree))).toBe(original);
  await page.locator('#grove-mode').selectOption('generated');
  await page.locator('#grove-seed').fill('RIVER-07');
  await grove.screenshot({ path: '.tmp/tree-review/grove-setup.png' });
  await page.getByRole('button', { name: 'Begin Grove Journey' }).click();
  await page.getByRole('radio', { name: /Invest in offspring/ }).check();
  await page.getByRole('button', { name: 'Live through year 1' }).click();
  await expect(page.locator('.grove-receipt')).toContainText('YEAR 1');
  await expect(page.locator('[data-grove-established]')).toHaveText('0');
  await page.getByRole('button', { name: 'Live through year 2' }).click();
  const saved = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__ctx.toolData)));
  const forecast = await page.locator('.grove-forecast').innerText();
  const receipt = await page.locator('.grove-receipt').innerText();
  await page.evaluate(saved => { const w = window as any; w.__destroy(); w.__mount(saved); }, saved);
  await expect(page.locator('.grove-receipt')).toHaveText(receipt, { useInnerText: true });
  await expect(page.locator('.grove-forecast')).toHaveText(forecast, { useInnerText: true });
  await page.getByRole('button', { name: 'Try the previous year again' }).click();
  await page.getByRole('button', { name: 'Live through year 2' }).click();
  await expect(page.locator('.grove-receipt')).toHaveText(receipt, { useInnerText: true });
  await expect(page.locator('.grove-forecast')).toHaveText(forecast, { useInnerText: true });
  for (let year = 3; year <= 8; year++) await page.getByRole('button', { name: 'Live through year ' + year }).click();
  await expect(page.locator('[data-grove-ending]')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify((window as any).__ctx.toolData.treeLab.tree))).toBe(original);
  await grove.screenshot({ path: '.tmp/tree-review/grove-complete.png' });
  await page.getByText('Field journal ·', { exact: false }).click();
  await expect(page.getByRole('list', { name: 'Journey timeline' }).locator('li')).toHaveCount(8);
  await page.getByText('Replay or choose a new grove', { exact: true }).click();
  await page.getByRole('button', { name: 'Replay this grove from the start' }).click();
  await expect(page.locator('.grove-year')).toContainText('0 / 8');
  await expect(page.locator('.grove-notebook').first()).toContainText('Read a year in the grove');
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('supports keyboard patch selection, themes, and phone layout', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.evaluate(() => { const w = window as any; w.__mount({ treeLab: { view: 'grove', groveRun: { version: 1, seed: 'GROVE-01', mode: 'deck', choices: [{ priority: 'offspring', route: 'mixed' }] } } }); });
  const patch = page.getByRole('button', { name: /^Stream bend:/ });
  await patch.focus(); await page.keyboard.press('Enter');
  await expect(patch).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Selected patch' })).toContainText('Stream bend');
  await page.getByRole('radio', { name: /Build roots/ }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('radio', { name: /Build roots/ })).toBeChecked();
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.reduceMotion = true; w.__rerender(); }, theme);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-grove', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
    await page.locator('.allo-tree-grove').screenshot({ path: `.tmp/tree-review/grove-${theme}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { const w = window as any; document.getElementById('wrap')!.style.width = '100%'; w.__ctx.isContrast = false; w.__ctx.isDark = false; w.__rerender(); });
  await page.locator('.grove-map').scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const actions = page.getByRole('button', { name: 'Live through year 2' });
  await actions.scrollIntoViewIfNeeded(); await expect(actions).toBeVisible();
  await page.locator('.allo-tree-grove').screenshot({ path: '.tmp/tree-review/grove-phone.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
