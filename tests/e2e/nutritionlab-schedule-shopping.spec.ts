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

const soup = { id: 'family-soup', name: 'Family soup', servings: 2, time: 20, cuisine: 'Family', tags: 'dinner',
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Simmer at 180°C for 20 minutes.\nServe in bowls.', notes: 'A family recipe.' };
const rice = { id: 'rice', name: 'Rice bowls', servings: 2, time: 25,
  ingredients: '1 cup rice\n1 can beans', steps: 'Cook rice and warm the beans.' };
const oldList = { id: 'old-list', name: 'Already shopping', items: [{ text: 'Apples', done: true }] };
const originalMeal = { id: 'rice-meal', day: 'monday', meal: 'dinner', recipeId: rice.id, recipeSnapshot: { ...rice }, servings: 2, notes: 'Family dinner' };
const originalDraft = { weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 40, meals: [originalMeal], snacks: 'Fruit', custom: 'keep' };
async function mount(page: Page, saved: Record<string, unknown> = {}) {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: 'recipeBox',
    kit_recipeBox: { recipes: [soup, rice] }, kit_mealPrep: { plans: [], draft: originalDraft },
    kit_shopping: { lists: [oldList] }, ...saved } }, undefined, { expectCanvas: false });
}
async function cleanLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop schedules selected days and shops only for one planned meal', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Open recipe Family soup', exact: true }).click();
  await page.getByLabel('Servings to prepare', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Plan this recipe', exact: true }).click();
  const schedule = page.getByRole('region', { name: 'Schedule recipe', exact: true });
  await expect(schedule.getByRole('heading', { name: 'Plan Family soup', exact: true })).toBeFocused();
  await schedule.getByRole('checkbox', { name: 'Monday', exact: true }).uncheck();
  await schedule.getByRole('checkbox', { name: 'Wednesday', exact: true }).check();
  await schedule.getByRole('checkbox', { name: 'Friday', exact: true }).check();
  await schedule.getByLabel('Scheduled meal slot', { exact: true }).selectOption('lunch');
  await schedule.getByLabel('Schedule notes', { exact: true }).fill('Pack before school');
  await schedule.getByText('Ingredients for each planned meal', { exact: true }).click();
  await expect(schedule.getByRole('list', { name: 'Ingredients per planned meal', exact: true })).toContainText('4 cups broth');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(originalDraft);
  await cleanLayout(page);
  await schedule.screenshot({ path: 'tmp/nutrition-schedule-desktop.png' });
  await schedule.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  const prepared = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft);
  expect(prepared.meals).toHaveLength(3);
  expect(prepared.meals[0]).toEqual(originalMeal);
  expect(prepared.meals.slice(1).map((meal: any) => ({ day: meal.day, slot: meal.meal, servings: meal.servings, notes: meal.notes })))
    .toEqual([{ day: 'wednesday', slot: 'lunch', servings: 4, notes: 'Pack before school' }, { day: 'friday', slot: 'lunch', servings: 4, notes: 'Pack before school' }]);
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  const savedBefore = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.plans);
  const plan = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  const selection = plan.locator('[data-nutrition-plan-shopping-selection]');
  await selection.locator(':scope > summary').click();
  await selection.getByRole('button', { name: 'Clear meal selection', exact: true }).click();
  await expect(selection.getByRole('button', { name: 'Create list for selected meals', exact: true })).toBeDisabled();
  await selection.getByRole('checkbox', { name: 'Include meal 2: Wednesday · Lunch · Family soup · 4 servings', exact: true }).check();
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'hostNote', 'Keep my selection'));
  await expect(selection.getByRole('checkbox', { name: 'Include meal 2: Wednesday · Lunch · Family soup · 4 servings', exact: true })).toBeChecked();
  await selection.getByText('Preview ingredients for selected meals', { exact: true }).click();
  const preview = selection.getByRole('list', { name: 'Selected meal shopping preview', exact: true });
  await expect(preview).toContainText('4 cups broth'); await expect(preview).not.toContainText('rice');
  await cleanLayout(page);
  await selection.screenshot({ path: 'tmp/nutrition-selected-shopping-desktop.png' });
  await selection.getByRole('button', { name: 'Create list for selected meals', exact: true }).click();
  const data = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  const generated = data.kit_shopping.lists.find((list: any) => list.id !== oldList.id);
  expect(generated.items.map((item: any) => item.text).join('\n')).toContain('4 cups broth');
  expect(generated.items.map((item: any) => item.text).join('\n')).not.toContain('rice');
  expect(generated.shoppingSelection).toMatchObject({ mealCount: 1, totalMealCount: 3 });
  expect(generated.warnings.join(' ')).toContain('Freeform');
  expect(data.kit_shopping.lists.find((list: any) => list.id === oldList.id)).toEqual(oldList);
  expect(data.kit_mealPrep.plans).toEqual(savedBefore);
  await expect(page.getByText('Ingredients from 1 of 3 planned meals.', { exact: true })).toBeVisible();
  await cleanLayout(page);
  await test.info().attach('recipe-schedule', { path: 'tmp/nutrition-schedule-desktop.png', contentType: 'image/png' });
  await test.info().attach('selected-shopping', { path: 'tmp/nutrition-selected-shopping-desktop.png', contentType: 'image/png' });
});

test('phone scheduling validates days, cancels cleanly, and keeps a frozen recipe preview', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await mount(page);
  await page.getByRole('button', { name: 'Open recipe Family soup', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Plan this recipe', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const schedule = page.getByRole('region', { name: 'Schedule recipe', exact: true });
  await schedule.getByRole('checkbox', { name: 'Monday', exact: true }).uncheck();
  await schedule.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  await expect(schedule).toContainText('Choose at least one day');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(originalDraft);
  await schedule.getByLabel('Schedule notes', { exact: true }).fill('Do not save this');
  await schedule.getByRole('button', { name: 'Cancel scheduling', exact: true }).click();
  await expect(trigger).toBeFocused(); expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(originalDraft);
  await trigger.click();
  await expect(schedule.getByRole('checkbox', { name: 'Monday', exact: true })).toBeChecked();
  await expect(schedule.getByLabel('Schedule notes', { exact: true })).toHaveValue('');
  await schedule.getByRole('checkbox', { name: 'Thursday', exact: true }).focus(); await page.keyboard.press('Space');
  await schedule.getByLabel('Servings per meal', { exact: true }).fill('3');
  await schedule.getByText('Ingredients for each planned meal', { exact: true }).click();
  await page.evaluate(() => { const w = window as any; const box = w.__toolData.nutritionLab.kit_recipeBox;
    w.__ctx.update('nutritionLab', 'kit_recipeBox', { ...box, recipes: box.recipes.map((recipe: any) => recipe.id === 'family-soup' ? { ...recipe, ingredients: '999 cups changed broth', steps: 'New instructions.' } : recipe) }); });
  await expect(schedule.getByRole('list', { name: 'Ingredients per planned meal', exact: true })).toContainText('3 cups broth');
  await expect(schedule).not.toContainText('999'); await cleanLayout(page);
  await schedule.screenshot({ path: 'tmp/nutrition-schedule-phone.png' });
  await schedule.getByRole('button', { name: 'Add to meal plan', exact: true }).click();
  const meals = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft.meals);
  expect(meals.slice(1).map((meal: any) => meal.day)).toEqual(['monday', 'thursday']);
  expect(meals[1].recipeSnapshot.ingredients).toBe(soup.ingredients);
  expect(meals[2].recipeSnapshot.steps).toBe(soup.steps);
  await cleanLayout(page);
  await test.info().attach('phone-scheduling', { path: 'tmp/nutrition-schedule-phone.png', contentType: 'image/png' });
});

test('phone selection resets after a changed imported plan and never silently selects different meals', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const saved = { ...originalDraft, id: 'imported', meals: [originalMeal, { ...originalMeal, id: originalMeal.id, day: 'friday', recipeId: soup.id, recipeSnapshot: { ...soup }, servings: 4 }] };
  await mount(page, { nkView: 'mealPrep', kit_mealPrep: { plans: [saved] } });
  const plan = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  const selection = plan.locator('[data-nutrition-plan-shopping-selection]');
  await selection.locator(':scope > summary').click();
  await selection.getByRole('button', { name: 'Clear meal selection', exact: true }).click();
  await selection.getByRole('checkbox', { name: 'Include meal 2: Friday · Dinner · Family soup · 4 servings', exact: true }).check();
  await page.evaluate(() => { const w = window as any; const prep = w.__toolData.nutritionLab.kit_mealPrep;
    w.__ctx.update('nutritionLab', 'kit_mealPrep', { ...prep, plans: prep.plans.map((plan: any) => ({ ...plan, meals: [...plan.meals].reverse() })) }); });
  await expect(selection).toContainText('This plan changed.');
  await expect(selection.getByRole('checkbox', { name: 'Include meal 1: Friday · Dinner · Family soup · 4 servings', exact: true })).not.toBeChecked();
  await expect(selection.getByRole('button', { name: 'Create list for selected meals', exact: true })).toBeDisabled();
  await selection.getByRole('checkbox', { name: 'Include meal 1: Friday · Dinner · Family soup · 4 servings', exact: true }).check();
  await selection.getByText('Preview ingredients for selected meals', { exact: true }).click();
  await expect(selection.getByRole('list', { name: 'Selected meal shopping preview', exact: true })).toContainText('4 cups broth');
  await cleanLayout(page); await selection.screenshot({ path: 'tmp/nutrition-selected-shopping-phone.png' });
  await selection.getByRole('button', { name: 'Create list for selected meals', exact: true }).click();
  const generated = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_shopping.lists[0]);
  expect(generated.shoppingSelection).toMatchObject({ mealCount: 1, totalMealCount: 2 });
  expect(generated.items.map((item: any) => item.text).join('\n')).not.toContain('rice');
  await cleanLayout(page);
  await test.info().attach('phone-selected-shopping', { path: 'tmp/nutrition-selected-shopping-phone.png', contentType: 'image/png' });
});
