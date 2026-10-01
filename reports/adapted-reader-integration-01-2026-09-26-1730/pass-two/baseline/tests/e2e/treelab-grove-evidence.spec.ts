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

test('predicts, reads where the year happened, rewinds, and compares replays in the ledger', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  // Pick a world whose first loss lands within the run, and mount the year before it.
  const world = await page.evaluate(() => {
    const E = (window as any).__alloTreeLabEngine;
    for (const mode of ['deck', 'generated']) for (let s = 0; s < 40; s++) {
      const choices = Array(8).fill({ priority: 'offspring', route: 'seed' });
      const state = E.groveRestore({ version: 1, mode, seed: 'L' + s, choices });
      const year = state.receipts.findIndex((r: any) => r.deaths > 0) + 1;
      if (year) return { mode, seed: 'L' + s, year, choices: choices.slice(0, year - 1) };
    }
    return null;
  });
  expect(world).not.toBeNull();
  await page.evaluate(world => {
    const w = window as any;
    w.__mount({ treeLab: { view: 'grove', groveRun: { version: 1, seed: world.seed, mode: world.mode, choices: world.choices }, grovePriority: 'offspring', groveRoute: 'seed' } });
    w.__ctx.reduceMotion = true;
  }, world);
  // Choose the prediction that will match, so the journal's prediction discovery is earned deterministically.
  const actual = await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine;
    const next = E.groveAdvance(E.groveRestore(w.__ctx.toolData.treeLab.groveRun), { priority: 'offspring', route: 'seed' });
    const r = next.receipts[next.receipts.length - 1];
    return { arrivals: r.arrivals === 0 ? 'none' : r.arrivals <= 2 ? 'some' : 'many', food: r.net < 0 ? 'shortfall' : 'surplus' };
  });
  // The mounted year precedes a loss, so the forecast should already flag dry patches.
  const dryExpected = await page.evaluate(() => {
    const w = window as any, E = w.__alloTreeLabEngine, run = w.__ctx.toolData.treeLab.groveRun;
    const state = E.groveRestore(run), next = E.groveEvent(run, state.year + 1);
    return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(i => E.groveEnvironment(state, i, next).soilWater < 0.35).length;
  });
  await expect(page.locator('.grove-patch.is-dry-next')).toHaveCount(dryExpected);
  if (dryExpected) {
    await expect(page.locator('.grove-risk')).toContainText('Dry next year');
    await page.locator('.grove-forecast').screenshot({ path: '.tmp/tree-review/grove-forecast-risk.png' });
    await page.locator('.grove-map').screenshot({ path: '.tmp/tree-review/grove-map-dry-next.png' });
  }
  await page.locator('#grove-predict-arrivals').selectOption(actual.arrivals);
  await page.locator('#grove-predict-food').selectOption(actual.food);
  await page.getByRole('radio', { name: /Invest in offspring/ }).check();
  await page.locator('#grove-route').selectOption('seed');
  await page.getByRole('button', { name: 'Live through year ' + world!.year }).click();
  const receipt = page.locator('.grove-receipt');
  await expect(receipt).toContainText('YEAR ' + world!.year);
  await expect(page.locator('[data-grove-prediction]')).toContainText('Matched: you predicted');
  await expect(receipt).toContainText('Stored food across living trees');
  await expect(page.locator('.grove-where')).toContainText('died');
  await expect(page.locator('.grove-patch-badge.is-loss').first()).toBeVisible();
  await expect(page.locator('.grove-patch-count').filter({ hasText: 'snag' }).first()).toBeVisible();
  // Reduced motion is on for this test: arrivals must render without the pop-in class.
  await expect(page.locator('.grove-glyph.is-new')).toHaveCount(0);
  await expect(page.locator('.grove-patch-water i')).toHaveCount(9);
  await expect(page.locator('.grove-progress span').nth(world!.year - 1)).toContainText(String(world!.year));
  expect(await page.evaluate(() => (window as any).__ctx.toolData.treeLab.grovePending)).toBeNull();
  // The decision column links to the evidence; activating it focuses the receipt region.
  await page.getByRole('link', { name: 'Read the year ' + world!.year + ' evidence ↓' }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe('grove-receipt');
  await expect(page.locator('.grove-habitat')).toHaveCount(9);
  await page.locator('.grove-map').screenshot({ path: '.tmp/tree-review/grove-evidence-map.png' });
  await receipt.screenshot({ path: '.tmp/tree-review/grove-evidence-receipt.png' });
  // Rewinding drops the prediction for the undone year; replaying it gives the same evidence.
  const text = await page.locator('.grove-where').innerText();
  await page.getByRole('button', { name: 'Try the previous year again' }).click();
  await expect(page.locator('[data-grove-prediction]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Live through year ' + world!.year }).click();
  await expect(page.locator('.grove-where')).toContainText('died');
  expect(await page.locator('.grove-where').innerText()).toBe(text);
  for (let year = world!.year + 1; year <= 8; year++) await page.getByRole('button', { name: 'Live through year ' + year }).click();
  await expect(page.locator('[data-grove-ending]')).toBeVisible();
  // The advance button vanished with the ending, so focus must land on the ending heading.
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement)?.textContent || '')).toMatch(/living legacy|story can grow|run has ended/);
  await expect(page.locator('[data-grove-ending]')).toContainText('the comparison is fair');
  // Sharing: the shell copy hook receives the run summary; a failing host falls back to selectable text.
  await page.evaluate(() => { const w = window as any; w.__copied = null; w.alloCopyText = (t: string) => { w.__copied = t; return Promise.resolve(true); }; });
  await page.getByRole('button', { name: 'Copy run summary' }).click();
  await expect(page.locator('.grove-share [role="status"]')).toContainText('Run summary copied');
  expect(await page.evaluate(() => (window as any).__copied)).toMatch(/^Grove Journey · code L\d+ · event deck\nYear 1: /);
  await page.evaluate(() => { const w = window as any; w.alloCopyText = () => Promise.resolve(false); document.execCommand = () => false; });
  await page.getByRole('button', { name: 'Copy grove code' }).click();
  await expect(page.locator('.grove-share [role="status"]')).toContainText('Ctrl+C');
  await expect(page.locator('.grove-share-text')).toHaveValue(world!.seed);
  // Skip link: focus it from the top of the grove and activate it.
  await page.locator('.grove-skip').focus();
  await expect(page.locator('.grove-skip')).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.id || '')).toBe('grove-decisions');
  expect(await page.evaluate(() => (window as any).__ctx.toolData.treeLab.groveLedger.length)).toBe(1);
  await page.locator('#grove-note').fill('Offspring every year, even in the dry year.');
  await page.locator('#grove-note').blur();
  expect(await page.evaluate(() => (window as any).__ctx.toolData.treeLab.groveLedger[0].note)).toBe('Offspring every year, even in the dry year.');
  await page.getByText('Replay or choose a new grove', { exact: true }).click();
  await page.getByRole('button', { name: 'Replay this grove from the start' }).click();
  await page.getByRole('radio', { name: /Keep reserves/ }).check();
  for (let year = 1; year <= 8; year++) await page.getByRole('button', { name: 'Live through year ' + year }).click();
  await expect(page.locator('[data-grove-ending]')).toContainText('Other runs of ' + world!.seed);
  await expect(page.getByRole('list', { name: 'Earlier runs of this grove' }).locator('li')).toHaveCount(1);
  await expect(page.getByRole('list', { name: 'Earlier runs of this grove' })).toContainText('Offspring every year, even in the dry year.');
  await expect(page.locator('#grove-note')).toHaveValue('');
  await expect(page.locator('.grove-patch.is-dry-next')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.treeLab.groveLedger.length)).toBe(2);
  await page.getByText('Field journal ·', { exact: false }).click();
  const journal = page.locator('.grove-notebook').first();
  await expect(journal).toContainText('Made a prediction that matched the evidence');
  await expect(journal).toContainText('Compared two runs of the same grove');
  await expect(page.locator('.grove-chart svg')).toBeVisible();
  await expect(page.locator('.grove-chart polyline')).toHaveCount(2);
  await page.locator('.grove-chart').screenshot({ path: '.tmp/tree-review/grove-journal-chart.png' });
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => { const w = window as any; w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.reduceMotion = true; w.__rerender(); }, theme);
    const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-grove', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
    expect(issues, theme).toEqual([]);
    await page.locator('.allo-tree-grove').screenshot({ path: `.tmp/tree-review/grove-evidence-${theme}.png` });
  }
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('reads the campaign in K-2 wording with the same evidence and no accessibility violations', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  const world = await page.evaluate(() => {
    const E = (window as any).__alloTreeLabEngine;
    for (const mode of ['deck', 'generated']) for (let s = 0; s < 40; s++) {
      const choices = Array(8).fill({ priority: 'offspring', route: 'seed' });
      const state = E.groveRestore({ version: 1, mode, seed: 'L' + s, choices });
      const year = state.receipts.findIndex((r: any) => r.deaths > 0) + 1;
      if (year) return { mode, seed: 'L' + s, choices: choices.slice(0, year) };
    }
    return null;
  });
  await page.evaluate(world => {
    const w = window as any;
    w.__mount({ treeLab: { view: 'grove', bandOverride: 'k2', groveRun: { version: 1, seed: world.seed, mode: world.mode, choices: world.choices } } });
    w.__ctx.reduceMotion = true;
  }, world);
  await expect(page.locator('.grove-stats')).toContainText('trees alive');
  await expect(page.locator('.grove-priorities')).toContainText('Pick a card for this year');
  await expect(page.locator('.grove-receipt')).toContainText('Card used:');
  await expect(page.locator('.grove-where')).toContainText('The soil was too dry for a small tree.');
  const issues = await page.evaluate(async () => (await (window as any).axe.run('.allo-tree-grove', { resultTypes: ['violations'] })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })));
  expect(issues).toEqual([]);
  await page.locator('.grove-decisions').screenshot({ path: '.tmp/tree-review/grove-k2-decisions.png' });
  await page.locator('.grove-receipt').screenshot({ path: '.tmp/tree-review/grove-k2-receipt.png' });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
