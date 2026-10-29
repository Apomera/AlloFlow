import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

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
async function mount(page: Page, saved: Record<string, unknown> = {}) {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: 'recipeLib', ...saved } }, undefined, { expectCanvas: false });
}
async function noOverflowOrErrors(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop takes a starter recipe through a scaled plan and editable shopping list', async ({ page }) => {
  const oldList = { id: 'old', name: 'Existing groceries', items: [{ text: 'Apples', done: true }] };
  await mount(page, { kit_shopping: { lists: [oldList] } });
  await page.getByRole('button', { name: 'Open starter recipe Overnight Oats', exact: true }).click();
  await page.getByRole('button', { name: 'Save to Recipe Box', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved in Recipe Box', exact: true })).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Servings to prepare', exact: true }).fill('2');
  await expect(page.getByRole('list', { name: 'Scaled ingredients', exact: true })).toContainText('1 cup rolled oats');
  await page.getByRole('button', { name: 'Plan this recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  await expect(page.getByText('My Meal Planner', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Meal notes', exact: true })).toHaveCSS('border-top-width', '1px');
  await page.getByLabel('Week of', { exact: true }).fill('2026-11-02');
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  const plan = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  await expect(plan).toContainText('Overnight Oats');
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-meal-plan-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Create shopping list for week of 2026-11-02', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'New shopping item', exact: true })).toHaveCSS('border-top-width', '1px');
  const checkbox = page.getByRole('checkbox').first();
  await checkbox.check();
  await page.getByRole('textbox', { name: 'New shopping item', exact: true }).fill('Apples');
  await page.getByRole('button', { name: 'Add shopping item', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Apples/ })).toBeVisible();
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'hostNote', 'preserve shopping'));
  await expect(checkbox).toBeChecked();
  const data = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(data.kit_recipeBox.recipes.filter((recipe: any) => recipe.sourceRecipeId === 'overnight-oats')).toHaveLength(1);
  expect(data.kit_mealPrep.plans[0].meals[0].servings).toBe(2);
  expect(data.kit_mealPrep.plans[0].meals[0].recipeSnapshot.name).toBe('Overnight Oats');
  expect(data.kit_shopping.lists.find((list: any) => list.id === oldList.id)).toEqual(oldList);
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-shopping-desktop.png', fullPage: true });
  await test.info().attach('desktop-meal-plan', { path: 'tmp/nutrition-meal-plan-desktop.png', contentType: 'image/png' });
  await test.info().attach('desktop-shopping', { path: 'tmp/nutrition-shopping-desktop.png', contentType: 'image/png' });
});

test('phone recipe, planning and shopping remain readable and operable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page);
  await page.getByRole('button', { name: 'Open starter recipe Overnight Oats', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Overnight Oats', exact: true })).toBeVisible();
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-recipe-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'Plan this recipe', exact: true }).click();
  await page.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  await page.getByLabel('Week of', { exact: true }).fill('2026-11-09');
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Meal plan for week of 2026-11-09', exact: true })).toContainText('Overnight Oats');
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-meal-plan-phone.png', fullPage: true });
  await page.getByRole('button', { name: 'Create shopping list for week of 2026-11-09', exact: true }).click();
  await page.getByRole('checkbox').first().check();
  await expect(page.getByRole('checkbox').first()).toBeChecked();
  await noOverflowOrErrors(page);
  await page.screenshot({ path: 'tmp/nutrition-shopping-phone.png', fullPage: true });
  await test.info().attach('phone-recipe', { path: 'tmp/nutrition-recipe-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-meal-plan', { path: 'tmp/nutrition-meal-plan-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-shopping', { path: 'tmp/nutrition-shopping-phone.png', contentType: 'image/png' });
});
