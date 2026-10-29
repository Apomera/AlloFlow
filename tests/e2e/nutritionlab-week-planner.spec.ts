import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFile } from 'node:fs/promises';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_nutritionlab.js', toolId: 'nutritionLab',
  width: 1200, height: 900, layout: 'document', appStyles: true,
  probes: `document.getElementById('wrap').style.width = '100%';`,
});
test.describe.configure({ timeout: 120000, retries: 0, mode: 'default' });
test.use({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin
    ? route.continue() : route.abort('blockedbyclient'));
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const recipe = { id: 'beans-rice', name: 'Beans and Rice', time: 20, servings: 2, cuisine: 'Family',
  ingredients: '1 cup beans\n1/2 cup rice\nSalt to taste', steps: '1. Cook rice according to the package.\n2. Warm the beans.\n3. Serve the beans with rice.', tags: 'dinner', notes: 'A flexible family meal.' };
const meals = [
  { id: 'friday', day: 'friday', meal: 'dinner', recipeId: recipe.id, recipeSnapshot: { ...recipe }, servings: 4, notes: 'Family dinner' },
  { id: 'monday', day: 'monday', meal: 'lunch', recipeId: recipe.id, recipeSnapshot: { ...recipe, name: 'Lunch bowls' }, servings: 2, notes: 'Pack before school' },
  { id: 'wednesday', day: 'wednesday', meal: 'dinner', recipeId: recipe.id, recipeSnapshot: { ...recipe, name: 'Wednesday bowls' }, servings: 3, notes: 'Use the vegetables we have' }
];
const savedPlan = { id: 'family-week', weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 45, meals, snacks: 'Fruit and yogurt' };
async function mount(page: Page, draft = false) {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_mealPrep: draft ? { plans: [], draft: savedPlan } : { plans: [savedPlan] } } }, undefined, { expectCanvas: false });
}
async function noOverflowOrErrors(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop weekly view orders days and reuses a saved plan independently', async ({ page }) => {
  await mount(page);
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  await expect(saved).toContainText('Wednesday bowls');
  await page.getByRole('button', { name: 'Reuse plan for next week of 2026-11-02', exact: true }).click();
  await expect(page.getByLabel('Week of', { exact: true })).toHaveValue('2026-11-09');
  const overview = page.getByRole('region', { name: 'Week at a glance', exact: true }).first();
  const names = await overview.locator('[data-week-day] li').allTextContents();
  expect(names).toEqual(['LunchLunch bowls', 'DinnerWednesday bowls', 'DinnerBeans and Rice']);
  await page.getByRole('spinbutton', { name: 'Servings for Lunch bowls on Monday', exact: true }).fill('3');
  await page.getByRole('button', { name: 'Repeat meal: Wednesday bowls on Wednesday', exact: true }).click();
  const state = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep);
  expect(state.draft.meals).toHaveLength(4);
  expect(state.plans[0].meals).toHaveLength(3);
  expect(state.plans[0].meals.find((meal: any) => meal.id === 'monday').servings).toBe(2);
  await noOverflowOrErrors(page);
  await overview.screenshot({ path: 'tmp/nutrition-week-desktop.png' });
  await test.info().attach('weekly-overview', { path: 'tmp/nutrition-week-desktop.png', contentType: 'image/png' });
});

test('phone weekly plan and saved-recipe cooking remain readable and keyboard operable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page);
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  await noOverflowOrErrors(page);
  await saved.screenshot({ path: 'tmp/nutrition-week-phone.png' });
  const start = page.getByRole('button', { name: 'Start cooking: Beans and Rice on Friday', exact: true });
  await start.focus(); await page.keyboard.press('Enter');
  const cooking = page.getByRole('region', { name: 'Guided cooking', exact: true });
  await expect(cooking.getByRole('checkbox', { name: '2 cups beans', exact: true })).toBeVisible();
  await expect(cooking.locator('[data-nutrition-current-step]')).toHaveText('1. Cook rice according to the package.');
  await cooking.getByRole('checkbox', { name: '2 cups beans', exact: true }).check();
  await cooking.getByRole('button', { name: 'Mark step complete', exact: true }).click();
  await cooking.getByRole('button', { name: 'Next step', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(cooking.locator('[data-nutrition-current-step]')).toHaveText('2. Warm the beans.');
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'unrelated', 'preserve cooking'));
  await expect(cooking.getByRole('checkbox', { name: '2 cups beans', exact: true })).toBeChecked();
  await expect(cooking.getByRole('progressbar', { name: 'Cooking steps completed' })).toHaveAttribute('value', '1');
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-cooking-phone.png', fullPage: true });
  await cooking.getByRole('button', { name: 'Leave cooking mode', exact: true }).click();
  await expect(start).toBeFocused();
  await page.getByRole('button', { name: 'Create shopping list for week of 2026-11-02', exact: true }).click();
  const shopping = page.getByRole('region', { name: 'My Shopping Lists', exact: true });
  const firstItem = shopping.getByRole('list', { name: 'Shopping items', exact: true }).getByRole('checkbox').first();
  const firstItemText = await firstItem.locator('..').textContent();
  await firstItem.check();
  await shopping.getByRole('button', { name: 'Remaining shopping items', exact: true }).click();
  await expect(shopping.getByRole('button', { name: 'Remaining shopping items', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const remainingItems = shopping.getByRole('list', { name: 'Shopping items', exact: true }).getByRole('checkbox');
  await expect(remainingItems).toHaveCount(4);
  const downloadPromise = page.waitForEvent('download');
  await shopping.getByRole('button', { name: 'Download text list', exact: true }).click();
  const download = await downloadPromise;
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('Meals for week of 2026-11-02');
  expect(text).not.toContain(firstItemText!.trim());
  expect(text).toContain('rice');
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-shopping-takeaway-phone.png', fullPage: true });
  await test.info().attach('phone-shopping-takeaway', { path: 'tmp/nutrition-shopping-takeaway-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-week', { path: 'tmp/nutrition-week-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-cooking', { path: 'tmp/nutrition-cooking-phone.png', contentType: 'image/png' });
});
