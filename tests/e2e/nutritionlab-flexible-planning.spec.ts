import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { readFile } from 'node:fs/promises';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_nutritionlab.js', toolId: 'nutritionLab',
  width: 1200, height: 900, layout: 'document', appStyles: true,
  probes: `document.getElementById('wrap').style.width = '100%';` });
test.describe.configure({ timeout: 120000, retries: 0, mode: 'default' });
test.use({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === new URL(harness.url).origin
    ? route.continue() : route.abort('blockedbyclient'));
});
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const rice = { id: 'beans-rice', name: 'Beans and Rice', time: 20, servings: 2, cuisine: 'Family',
  ingredients: '1 cup beans\n1/2 cup rice', steps: 'Cook rice.\nWarm the beans.', tags: 'dinner', notes: 'A flexible family meal.' };
const soup = { id: 'soup', name: 'Vegetable soup', time: 30, servings: 2, cuisine: 'Family',
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Simmer for 20 minutes.\nServe in bowls.', tags: 'dinner', notes: 'Use a deep pot.' };
const draft = { weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 45, monThu: '', tuFri: '', weMo: '', snacks: 'Fruit and yogurt', meals: [
  { id: 'friday', day: 'friday', meal: 'dinner', recipeId: rice.id, recipeSnapshot: { ...rice }, servings: 4, notes: 'Family dinner' },
  { id: 'monday', day: 'monday', meal: 'lunch', recipeId: rice.id, recipeSnapshot: { ...rice, name: 'Lunch bowls' }, servings: 2, notes: 'Pack before school' }
] };
async function mount(page: Page, view = 'mealPrep') {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: view,
    kit_mealPrep: { plans: [], draft }, kit_recipeBox: { recipes: [rice, soup] },
    kit_shopping: { lists: [{ id: 'old', name: 'Existing groceries', items: [{ text: 'Apples', done: true }] }] }
  } }, undefined, { expectCanvas: false });
}
async function noOverflowOrErrors(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop swaps a planned recipe and downloads its saved recipe snapshot', async ({ page }) => {
  await mount(page);
  const swap = page.getByRole('button', { name: 'Swap recipe: Beans and Rice on Friday', exact: true });
  await swap.focus(); await page.keyboard.press('Enter');
  const preview = page.getByRole('region', { name: 'Swap recipe for Beans and Rice', exact: true });
  await expect(preview).toBeVisible();
  await preview.getByLabel('Search replacement recipes', { exact: true }).fill('soup');
  await preview.getByLabel('Replacement recipe', { exact: true }).selectOption('saved:soup');
  await expect(preview.getByRole('list', { name: 'Replacement ingredients', exact: true })).toContainText('4 cups broth');
  await noOverflowOrErrors(page);
  await preview.screenshot({ path: 'tmp/nutrition-swap-desktop.png' });
  await preview.getByRole('button', { name: 'Use this recipe', exact: true }).click();
  const changed = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(changed.kit_mealPrep.draft.meals[0]).toMatchObject({ id: 'friday', day: 'friday', meal: 'dinner', servings: 4, notes: 'Family dinner', recipeId: 'soup' });
  expect(changed.kit_shopping.lists[0].items[0]).toEqual({ text: 'Apples', done: true });
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  await saved.getByText('Take this plan with you', { exact: true }).click();
  await saved.getByLabel('Plan text includes', { exact: true }).selectOption('recipes');
  const downloadEvent = page.waitForEvent('download');
  await saved.getByRole('button', { name: 'Download plan text', exact: true }).click();
  const download = await downloadEvent;
  const content = await readFile((await download.path())!, 'utf8');
  expect(content).toContain('Vegetable soup');
  expect(content).toContain('4 cups broth');
  expect(content).toContain('Simmer for 20 minutes.');
  expect(content).toContain('Family dinner');
  expect(content).toContain('Fruit and yogurt');
  expect(content.indexOf('Lunch bowls')).toBeLessThan(content.indexOf('Vegetable soup'));
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  await noOverflowOrErrors(page);
  await test.info().attach('swap-preview', { path: 'tmp/nutrition-swap-desktop.png', contentType: 'image/png' });
});

test('phone can cancel and undo a recipe swap without changing the rest of the week', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page);
  const swap = page.getByRole('button', { name: 'Swap recipe: Beans and Rice on Friday', exact: true });
  await swap.click();
  const preview = page.getByRole('region', { name: 'Swap recipe for Beans and Rice', exact: true });
  await preview.getByLabel('Replacement recipe', { exact: true }).selectOption('saved:soup');
  await noOverflowOrErrors(page);
  await preview.screenshot({ path: 'tmp/nutrition-swap-phone.png' });
  await preview.getByRole('button', { name: 'Cancel recipe swap', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(draft);
  await swap.click();
  await preview.getByLabel('Replacement recipe', { exact: true }).selectOption('saved:soup');
  await preview.getByRole('button', { name: 'Use this recipe', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Undo recipe swap', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(draft);
  await page.getByText('Take this plan with you', { exact: true }).click();
  await page.getByLabel('Plan text includes', { exact: true }).selectOption('recipes');
  await noOverflowOrErrors(page);
  await page.getByText('Take this plan with you', { exact: true }).locator('..').screenshot({ path: 'tmp/nutrition-plan-takeaway-phone.png' });
  await test.info().attach('phone-recipe-swap', { path: 'tmp/nutrition-swap-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-plan-takeaway', { path: 'tmp/nutrition-plan-takeaway-phone.png', contentType: 'image/png' });
});

test('phone organizes favorites and adapts a recipe copy without changing its original', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page, 'recipeBox');
  const box = page.locator('[data-nutrition-recipe-box]');
  const favorite = box.getByRole('button', { name: 'Favorite recipe Vegetable soup', exact: true });
  await favorite.focus(); await page.keyboard.press('Enter');
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await box.getByLabel('Show saved recipes', { exact: true }).selectOption('favorites');
  await expect(box.getByRole('article')).toHaveCount(1);
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'unrelated', 'preserve favorites'));
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await box.getByRole('button', { name: 'Make a copy of recipe Vegetable soup', exact: true }).click();
  await expect(box.getByRole('heading', { name: 'Vegetable soup (copy)', exact: true })).toBeVisible();
  await box.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  await box.getByLabel('Recipe name', { exact: true }).fill('Quick vegetable soup');
  await box.getByLabel('Recipe time (minutes)', { exact: true }).fill('15');
  await box.getByLabel('Ingredients (one per line)', { exact: true }).fill('1 cup broth\n1 carrot');
  await box.getByRole('button', { name: 'Save recipe changes', exact: true }).click();
  const recipes = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes);
  expect(recipes).toHaveLength(3);
  expect(recipes.find((recipe: any) => recipe.id === 'soup')).toEqual({ ...soup, favorite: true });
  expect(recipes.find((recipe: any) => recipe.name === 'Quick vegetable soup')).toMatchObject({ favorite: false, copiedFromRecipeId: 'soup', time: 15, ingredients: '1 cup broth\n1 carrot' });
  await box.getByRole('button', { name: '← Back to recipe box', exact: true }).click();
  await box.getByLabel('Show saved recipes', { exact: true }).selectOption('all');
  await box.getByLabel('Sort saved recipes', { exact: true }).selectOption('time');
  await expect(box.getByRole('article').first().getByRole('heading')).toHaveText('Quick vegetable soup');
  await box.getByLabel('Sort saved recipes', { exact: true }).selectOption('name');
  expect(await box.getByRole('article').getByRole('heading').allTextContents()).toEqual(['Beans and Rice', 'Quick vegetable soup', 'Vegetable soup']);
  await noOverflowOrErrors(page);
  await box.screenshot({ path: 'tmp/nutrition-recipe-organization-phone.png' });
  await test.info().attach('phone-recipe-organization', { path: 'tmp/nutrition-recipe-organization-phone.png', contentType: 'image/png' });
});
