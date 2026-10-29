import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

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

const soup = { id: 'family-soup', name: 'Quick carrot soup', servings: 2, time: 15, favorite: true,
  cuisine: 'Family', tags: 'dinner, quick', ingredients: '2 cups broth\n1 carrot\nSalt to taste',
  steps: 'Warm at 180°C for 20 minutes.\nServe in bowls.', notes: 'Keep this family note.', custom: { source: 'Notebook' } };
const rice = { id: 'slow-rice', name: 'Slow rice', servings: 2, time: 60, favorite: true,
  ingredients: '1 cup rice\n2 cups broth', steps: 'Cook the rice.', cuisine: 'Family', tags: 'dinner' };
async function mount(page: Page, view = 'recipeBox') {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: view,
    kit_recipeBox: { recipes: [soup, rice], customSetting: 'preserve' }, kit_mealPrep: { plans: [] },
    kit_shopping: { lists: [{ id: 'old-list', name: 'Existing list', items: [{ text: 'Apples', done: true }] }] }
  } }, undefined, { expectCanvas: false });
}
async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Recipes, meal plans, and shopping', exact: true })
    .getByRole('button', { name, exact: true }).click();
}
async function noOverflowOrErrors(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}
async function downloadRecipe(page: Page, parent: Locator) {
  const takeaway = parent.locator('[data-nutrition-recipe-takeaway]');
  await takeaway.getByText('Take this recipe with you', { exact: true }).click();
  const event = page.waitForEvent('download');
  await takeaway.getByRole('button', { name: 'Download recipe text', exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toMatch(/\.txt$/);
  return readFile((await download.path())!, 'utf8');
}

test('desktop saves an interrupted recipe draft and downloads its scaled recipe', async ({ page }) => {
  await mount(page);
  const box = page.locator('[data-nutrition-recipe-box]');
  await expect(box.getByLabel('Recipe name', { exact: true })).toBeHidden();
  await box.locator('[data-nutrition-recipe-editor] > summary').focus();
  await page.keyboard.press('Enter');
  await box.getByLabel('Recipe name', { exact: true }).fill('Roasted carrot bowls');
  await box.getByLabel('Ingredients (one per line)', { exact: true }).fill('1 cup rice\n2 carrots\nSalt to taste');
  await box.getByLabel('Steps (one per line)', { exact: true }).fill('Roast at 200°C for 25 minutes.\nServe over rice.');
  await box.getByLabel('Recipe notes', { exact: true }).fill('Pack a lunch portion.');
  await navigate(page, 'Recipe Library');
  await expect(page.locator('[data-nutrition-recipe-library]')).toBeVisible();
  await navigate(page, 'My Recipe Box');
  await expect(box.getByLabel('Recipe name', { exact: true })).toHaveValue('Roasted carrot bowls');
  await expect(box.getByLabel('Ingredients (one per line)', { exact: true })).toHaveValue('1 cup rice\n2 carrots\nSalt to taste');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes)).toEqual([soup, rice]);
  await box.getByRole('button', { name: '+ Save recipe', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox);
  expect(saved.recipes).toHaveLength(3);
  expect(saved.customSetting).toBe('preserve');
  expect(saved.recipes.find((recipe: any) => recipe.id === soup.id)).toEqual(soup);
  await box.getByLabel('Servings to prepare', { exact: true }).fill('4');
  const text = await downloadRecipe(page, box);
  expect(text).toContain('2 cups rice');
  expect(text).toContain('4 carrots');
  expect(text).toContain('Salt to taste');
  expect(text).toContain('[review amount]');
  expect(text).toContain('Roast at 200°C for 25 minutes.\nServe over rice.');
  expect(text).toContain('Pack a lunch portion.');
  expect(saved.recipes[0].ingredients).toBe('1 cup rice\n2 carrots\nSalt to taste');
  await noOverflowOrErrors(page);
  await box.screenshot({ path: 'tmp/nutrition-recipe-takeaway-desktop.png' });
  await test.info().attach('recipe-takeaway', { path: 'tmp/nutrition-recipe-takeaway-desktop.png', contentType: 'image/png' });
});

test('phone finds a favorite by time and ingredient and previews it before adding a meal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page, 'mealPrep');
  const planner = page.locator('[data-nutrition-meal-planner]');
  await planner.getByLabel('Search recipes to plan', { exact: true }).fill('broth');
  await planner.getByLabel('Recipe source', { exact: true }).selectOption('favorites');
  await planner.getByLabel('Maximum recipe time', { exact: true }).selectOption('15');
  await expect(planner.getByLabel('Recipe filter results', { exact: true })).toContainText('1 of');
  const chooser = planner.getByLabel('Recipe to plan', { exact: true });
  expect(await chooser.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value)))
    .toEqual(['', 'saved:family-soup']);
  await chooser.selectOption('saved:family-soup');
  await planner.getByLabel('Planned servings', { exact: true }).fill('4');
  await planner.getByText('Preview ingredients for Quick carrot soup', { exact: true }).click();
  await expect(planner.getByRole('list', { name: 'Ingredients for planned meal', exact: true })).toContainText('4 cups broth');
  await expect(planner.getByRole('list', { name: 'Ingredients for planned meal', exact: true })).toContainText('review');
  await planner.getByLabel('Recipe source', { exact: true }).selectOption('library');
  await expect(chooser).toHaveValue('saved:family-soup');
  await expect(planner.getByLabel('Recipe filter results', { exact: true })).toContainText('selected recipe is kept');
  await planner.getByLabel('Meal day', { exact: true }).selectOption('wednesday');
  await planner.getByLabel('Meal slot', { exact: true }).selectOption('lunch');
  await planner.getByLabel('Meal notes', { exact: true }).fill('Bring a spoon');
  await noOverflowOrErrors(page);
  await planner.locator('fieldset').first().screenshot({ path: 'tmp/nutrition-planner-discovery-phone.png' });
  await planner.getByRole('button', { name: 'Add meal to draft', exact: true }).click();
  const state = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(state.kit_mealPrep.draft.meals).toHaveLength(1);
  expect(state.kit_mealPrep.draft.meals[0]).toMatchObject({ day: 'wednesday', meal: 'lunch', servings: 4, recipeId: soup.id, notes: 'Bring a spoon', recipeSnapshot: { ingredients: soup.ingredients, steps: soup.steps } });
  expect(state.kit_recipeBox.recipes).toEqual([soup, rice]);
  expect(state.kit_shopping.lists[0].items[0]).toEqual({ text: 'Apples', done: true });
  await noOverflowOrErrors(page);
  await test.info().attach('phone-recipe-finder', { path: 'tmp/nutrition-planner-discovery-phone.png', contentType: 'image/png' });
});

test('phone keeps saved recipe edits across tools and exports a starter without importing it', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mount(page);
  const box = page.locator('[data-nutrition-recipe-box]');
  await expect(box.getByLabel('Recipe name', { exact: true })).toBeHidden();
  await box.screenshot({ path: 'tmp/nutrition-recipe-workspace-phone.png' });
  await box.getByRole('button', { name: 'Edit recipe Quick carrot soup', exact: true }).click();
  await box.getByLabel('Recipe name', { exact: true }).fill('Family carrot soup');
  await box.getByLabel('Recipe notes', { exact: true }).fill('A new family variation.');
  await navigate(page, 'Meal Planner');
  await navigate(page, 'My Recipe Box');
  await expect(box.getByLabel('Recipe name', { exact: true })).toHaveValue('Family carrot soup');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes)).toEqual([soup, rice]);
  await box.getByRole('button', { name: 'Cancel editing', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes)).toEqual([soup, rice]);
  await box.getByRole('button', { name: 'Undo draft discard', exact: true }).click();
  await expect(box.getByLabel('Recipe name', { exact: true })).toHaveValue('Family carrot soup');
  await box.getByRole('button', { name: 'Save recipe changes', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes[0])).toMatchObject({ ...soup, name: 'Family carrot soup', notes: 'A new family variation.' });
  await navigate(page, 'Recipe Library');
  const library = page.locator('[data-nutrition-recipe-library]');
  await library.getByRole('button', { name: 'Open starter recipe Overnight Oats', exact: true }).click();
  await library.getByLabel('Servings to prepare', { exact: true }).fill('2');
  const text = await downloadRecipe(page, library);
  expect(text).toContain('1 cup rolled oats');
  expect(text).toContain('4. Refrigerate overnight (or at least 2 hours).');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes.length)).toBe(2);
  await noOverflowOrErrors(page);
  await library.locator('[data-nutrition-recipe-takeaway]').screenshot({ path: 'tmp/nutrition-recipe-takeaway-phone.png' });
  await test.info().attach('phone-recipe-workspace', { path: 'tmp/nutrition-recipe-workspace-phone.png', contentType: 'image/png' });
  await test.info().attach('phone-recipe-takeaway', { path: 'tmp/nutrition-recipe-takeaway-phone.png', contentType: 'image/png' });
});
