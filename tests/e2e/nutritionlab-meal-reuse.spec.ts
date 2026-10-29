import { test, expect, type Page } from '@playwright/test';
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
const original = { id: 'soup', name: 'Family soup', servings: 2, time: 20, cuisine: 'Family', tags: 'dinner',
  ingredients: '1 cup broth\n1 carrot', steps: 'Warm at 180°C for 20 minutes.', notes: 'Family note.' };
const adapted = { ...original, name: 'White bean soup', ingredients: '2 cups stock\n1 can white beans',
  steps: 'Warm stock at 180°C for 20 minutes.\nAdd beans and serve.', notes: 'Adapted for our family.' };
const soupMeal = { id: 'soup-meal', day: 'wednesday', meal: 'lunch', recipeId: original.id,
  recipeSnapshot: adapted, servings: 4, notes: 'Pack for school', custom: { keep: true } };
const riceMeal = { id: 'rice-meal', day: 'friday', meal: 'dinner', recipeId: 'rice',
  recipeSnapshot: { ...original, id: 'rice', name: 'Rice bowls', ingredients: '1 cup rice', steps: 'Cook rice.' }, servings: 2, notes: 'Friday meal' };
const sourcePlan = { id: 'old-plan', name: 'Last week', weekOf: '2026-10-26', prepDay: 'sunday', prepTime: 30,
  meals: [riceMeal, soupMeal], snacks: 'Fruit', custom: { keep: true } };
const currentDraft = { name: 'Current week', weekOf: '2026-11-09', prepDay: 'saturday', prepTime: 45,
  meals: [{ ...soupMeal, id: 'current-meal', day: 'monday' }], snacks: 'Yogurt', custom: { keep: true } };
const oldList = { id: 'old-list', name: 'Existing groceries', items: [{ text: 'Apples', done: true }] };
async function mount(page: Page, prep: Record<string, unknown> = { plans: [sourcePlan], draft: currentDraft }) {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep',
    kit_recipeBox: { recipes: [original] }, kit_mealPrep: prep, kit_shopping: { lists: [oldList] }
  } }, undefined, { expectCanvas: false });
}
async function navigate(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Recipes, meal plans, and shopping', exact: true }).getByRole('button', { name, exact: true }).click();
}
async function cleanLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop saves a planned variation with original amounts and schedules it again', async ({ page }) => {
  const originalDraft = { ...currentDraft, meals: [{ ...currentDraft.meals[0], recipeSnapshot: original }] };
  await mount(page, { plans: [sourcePlan], draft: originalDraft });
  await page.getByRole('button', { name: 'Adapt recipe: Family soup on Monday', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Adapt recipe for this meal', exact: true });
  await editor.getByLabel('Adapted recipe name', { exact: true }).fill(adapted.name);
  await editor.getByLabel('Adapted ingredients (one per line)', { exact: true }).fill(adapted.ingredients);
  await editor.getByLabel('Adapted cooking steps', { exact: true }).fill(adapted.steps);
  await editor.getByLabel('Adaptation notes', { exact: true }).fill(adapted.notes);
  await editor.getByRole('button', { name: 'Apply recipe to this meal', exact: true }).click();
  const plannedBeforeSave = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft);
  const trigger = page.getByRole('button', { name: 'Save recipe from meal: White bean soup on Monday', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const saver = page.getByRole('region', { name: 'Save planned recipe', exact: true });
  await saver.getByLabel('Recipe Box name', { exact: true }).fill('My white bean soup');
  await saver.getByText('Preview recipe to save', { exact: true }).click();
  await expect(saver.getByLabel('Original ingredients to save', { exact: true })).toContainText('2 cups stock');
  await expect(saver).toContainText('2');
  await cleanLayout(page); await saver.screenshot({ path: 'tmp/nutrition-save-planned-recipe-desktop.png' });
  await saver.getByRole('button', { name: 'Save this recipe to Recipe Box', exact: true }).click();
  await expect(saver.getByRole('button', { name: 'Saved to Recipe Box', exact: true })).toBeDisabled();
  const saved = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  const copy = saved.kit_recipeBox.recipes.find((recipe: any) => recipe.id !== original.id);
  expect(copy).toMatchObject({ name: 'My white bean soup', servings: 2, ingredients: adapted.ingredients, steps: adapted.steps });
  expect(saved.kit_mealPrep.draft).toEqual(plannedBeforeSave); expect(saved.kit_mealPrep.plans).toEqual([sourcePlan]);
  expect(saved.kit_shopping.lists).toEqual([oldList]);
  await saver.getByRole('button', { name: 'Return to meal', exact: true }).click(); await expect(trigger).toBeFocused();
  await navigate(page, 'My Recipe Box');
  await page.getByRole('button', { name: 'Open recipe My white bean soup', exact: true }).click();
  await page.getByLabel('Servings to prepare', { exact: true }).fill('6');
  await expect(page.getByRole('list', { name: 'Scaled ingredients', exact: true })).toContainText('6 cups stock');
  await page.getByRole('button', { name: 'Plan this recipe', exact: true }).click();
  const schedule = page.getByRole('region', { name: 'Schedule recipe', exact: true });
  await schedule.getByRole('checkbox', { name: 'Monday', exact: true }).uncheck();
  await schedule.getByRole('checkbox', { name: 'Thursday', exact: true }).check();
  await schedule.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  const result = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(result.kit_mealPrep.draft.meals).toHaveLength(2);
  expect(result.kit_mealPrep.draft.meals[1]).toMatchObject({ day: 'thursday', servings: 6, recipeSnapshot: { ingredients: adapted.ingredients } });
  expect(result.kit_recipeBox.recipes.find((recipe: any) => recipe.id === original.id)).toEqual(original);
  await cleanLayout(page);
  await test.info().attach('planned-recipe-copy', { path: 'tmp/nutrition-save-planned-recipe-desktop.png', contentType: 'image/png' });
});

test('phone copies selected meals into an existing week and leaves the original plans and lists intact', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await mount(page);
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-10-26', exact: true });
  const copier = saved.locator('[data-nutrition-plan-meal-copy]');
  await copier.locator(':scope > summary').click();
  await expect(copier.getByRole('checkbox').first()).not.toBeChecked();
  await expect(copier.getByLabel('Meal copy destination', { exact: true })).toContainText('2026-11-09');
  await copier.getByRole('checkbox', { name: /Copy meal .*White bean soup/ }).check();
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'unrelated', 'Keep selection'));
  await expect(copier.getByRole('checkbox', { name: /Copy meal .*White bean soup/ })).toBeChecked();
  await cleanLayout(page); await copier.screenshot({ path: 'tmp/nutrition-copy-meals-phone.png' });
  await copier.getByRole('button', { name: 'Copy selected meals to draft', exact: true }).focus(); await page.keyboard.press('Enter');
  const data = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(data.kit_mealPrep.draft).toMatchObject({ name: currentDraft.name, weekOf: currentDraft.weekOf, prepDay: 'saturday', prepTime: 45, snacks: 'Yogurt', custom: { keep: true } });
  expect(data.kit_mealPrep.draft.meals).toHaveLength(2); expect(data.kit_mealPrep.draft.meals[0]).toEqual(currentDraft.meals[0]);
  expect(data.kit_mealPrep.draft.meals[1]).toMatchObject({ day: 'wednesday', meal: 'lunch', servings: 4, notes: 'Pack for school', recipeSnapshot: adapted });
  expect(data.kit_mealPrep.draft.meals[1].id).not.toBe(soupMeal.id);
  expect(data.kit_mealPrep.plans).toEqual([sourcePlan]); expect(data.kit_shopping.lists).toEqual([oldList]);
  await expect(copier.getByRole('checkbox', { name: /Copy meal .*White bean soup/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Undo copied meals', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual({ ...currentDraft, monThu: '', tuFri: '', weMo: '' });
  await cleanLayout(page); await test.info().attach('copy-selected-meals', { path: 'tmp/nutrition-copy-meals-phone.png', contentType: 'image/png' });
});

test('phone cancels a recipe save and rejects an oversized meal copy without partial writes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const nearlyFull = { ...currentDraft, meals: Array.from({ length: 41 }, (_, index) => ({ ...currentDraft.meals[0], id: 'existing-' + index, recipeSnapshot: { ...adapted, name: 'Meal ' + index } })) };
  await mount(page, { plans: [sourcePlan], draft: nearlyFull });
  const trigger = page.getByRole('button', { name: 'Save recipe from meal: Meal 0 on Monday', exact: true });
  await trigger.click(); const saver = page.getByRole('region', { name: 'Save planned recipe', exact: true });
  await saver.getByLabel('Recipe Box name', { exact: true }).fill('Canceled recipe');
  await cleanLayout(page); await saver.screenshot({ path: 'tmp/nutrition-save-planned-recipe-phone.png' });
  await saver.getByRole('button', { name: 'Cancel saving recipe', exact: true }).click(); await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_recipeBox.recipes)).toEqual([original]);
  const copier = page.getByRole('article', { name: 'Meal plan for week of 2026-10-26', exact: true }).locator('[data-nutrition-plan-meal-copy]');
  await copier.locator(':scope > summary').click(); await copier.getByRole('button', { name: 'Select all meals', exact: true }).click();
  await expect(copier.getByRole('button', { name: 'Copy selected meals to draft', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(nearlyFull);
  await copier.getByRole('checkbox', { name: /Copy meal .*Rice bowls/ }).uncheck();
  await copier.getByRole('button', { name: 'Copy selected meals to draft', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft.meals.length)).toBe(42);
  await cleanLayout(page); await test.info().attach('phone-save-recipe', { path: 'tmp/nutrition-save-planned-recipe-phone.png', contentType: 'image/png' });
});
