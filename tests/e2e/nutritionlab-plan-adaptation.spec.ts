import { test, expect, type Page } from '@playwright/test';
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

const soup = { id: 'soup', name: 'Family soup', servings: 2, time: 20, cuisine: 'Family', tags: 'dinner',
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Warm at 180°C for 20 minutes.\nServe in bowls.', notes: 'Original family note.' };
const originalMeal = { id: 'soup-meal', day: 'wednesday', meal: 'lunch', recipeId: soup.id,
  recipeSnapshot: { ...soup }, servings: 4, notes: 'Pack before school', custom: { keep: true } };
const draft = { name: 'School week', weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 30,
  meals: [originalMeal], monThu: '', tuFri: '', weMo: '', snacks: 'Fruit', custom: 'Keep this plan setting' };
const oldList = { id: 'old-list', name: 'Already shopping', items: [{ text: 'Apples', done: true }] };
async function mount(page: Page, prep: Record<string, unknown> = { plans: [], draft }) {
  await harness.mount(page, { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep',
    kit_recipeBox: { recipes: [soup] }, kit_mealPrep: prep, kit_shopping: { lists: [oldList] }
  } }, undefined, { expectCanvas: false });
}
async function cleanLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
}

test('desktop adapts one planned recipe and uses its quantities in cooking, exports and shopping', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Adapt recipe: Family soup on Wednesday', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Adapt recipe for this meal', exact: true });
  await expect(editor.getByRole('heading', { name: 'Adapt Family soup', exact: true })).toBeFocused();
  await editor.getByLabel('Adapted recipe name', { exact: true }).fill('White bean soup');
  await editor.getByLabel('Adapted ingredients (one per line)', { exact: true }).fill('2 cups vegetable stock\n1 can white beans\nPepper to taste');
  await editor.getByLabel('Adapted cooking steps', { exact: true }).fill('Warm the stock at 180°C for 20 minutes.\nAdd the beans and serve.');
  await editor.getByLabel('Adaptation notes', { exact: true }).fill('Use the white beans from our pantry.');
  const preview = editor.getByRole('list', { name: 'Adapted ingredients for this meal', exact: true });
  await expect(preview).toContainText('4 cups vegetable stock');
  await expect(preview).toContainText('2 cans white beans');
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(draft);
  await cleanLayout(page); await editor.screenshot({ path: 'tmp/nutrition-meal-adaptation-desktop.png' });
  await editor.getByRole('button', { name: 'Apply recipe to this meal', exact: true }).click();
  const changed = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(changed.kit_mealPrep.draft.meals[0]).toMatchObject({ id: originalMeal.id, day: 'wednesday', meal: 'lunch', servings: 4, notes: originalMeal.notes, custom: { keep: true } });
  expect(changed.kit_mealPrep.draft.meals[0].recipeSnapshot).toMatchObject({ name: 'White bean soup', ingredients: '2 cups vegetable stock\n1 can white beans\nPepper to taste', notes: 'Use the white beans from our pantry.' });
  expect(changed.kit_recipeBox.recipes).toEqual([soup]); expect(changed.kit_shopping.lists).toEqual([oldList]);
  await page.getByRole('button', { name: 'Start cooking: White bean soup on Wednesday', exact: true }).click();
  const cooking = page.getByRole('region', { name: 'Guided cooking', exact: true });
  await expect(cooking.locator('[data-nutrition-current-step]')).toHaveText('Warm the stock at 180°C for 20 minutes.');
  await expect(cooking.getByRole('checkbox', { name: '2 cans white beans', exact: true })).toBeVisible();
  await cooking.getByRole('button', { name: 'Leave cooking mode', exact: true }).click();
  await page.getByLabel('Plan name', { exact: true }).fill('Flexible school lunches');
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  const takeaway = saved.locator('[data-nutrition-plan-takeaway]');
  await takeaway.locator(':scope > summary').click();
  await takeaway.getByLabel('Plan text includes', { exact: true }).selectOption('recipes');
  const downloaded = page.waitForEvent('download');
  await takeaway.getByRole('button', { name: 'Download plan text', exact: true }).click();
  const download = await downloaded;
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('Flexible school lunches'); expect(text).toContain('4 cups vegetable stock');
  expect(text).toContain('Warm the stock at 180°C for 20 minutes.\nAdd the beans and serve.');
  expect(text).toContain('Pack before school');
  await saved.getByRole('button', { name: 'Create shopping list for week of 2026-11-02', exact: true }).click();
  const data = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  const list = data.kit_shopping.lists.find((item: any) => item.id !== oldList.id);
  expect(list.name).toBe('Flexible school lunches for week of 2026-11-02');
  await expect(page.getByLabel('List name', { exact: true })).toHaveValue('Flexible school lunches for week of 2026-11-02');
  expect(list.items.map((item: any) => item.text).join('\n')).toContain('2 cans white beans');
  expect(list.items.map((item: any) => item.text).join('\n')).not.toContain('carrot');
  expect(data.kit_shopping.lists.find((item: any) => item.id === oldList.id)).toEqual(oldList);
  expect(data.kit_recipeBox.recipes).toEqual([soup]); await cleanLayout(page);
  await test.info().attach('adapted-meal', { path: 'tmp/nutrition-meal-adaptation-desktop.png', contentType: 'image/png' });
});

test('phone cancels recipe adaptation without changing the meal and validates edited servings', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 }); await mount(page);
  const trigger = page.getByRole('button', { name: 'Adapt recipe: Family soup on Wednesday', exact: true });
  await trigger.focus(); await page.keyboard.press('Enter');
  const editor = page.getByRole('region', { name: 'Adapt recipe for this meal', exact: true });
  await editor.getByLabel('Adapted recipe name', { exact: true }).fill('Canceled edit');
  await editor.getByRole('button', { name: 'Cancel recipe changes', exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(draft);
  await trigger.click();
  await expect(editor.getByLabel('Adapted recipe name', { exact: true })).toHaveValue('Family soup');
  await editor.getByLabel('Original recipe servings', { exact: true }).fill('0');
  const apply = editor.getByRole('button', { name: 'Apply recipe to this meal', exact: true });
  if (await apply.isEnabled()) await apply.click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(draft);
  await expect(editor).toContainText('servings');
  await editor.getByLabel('Original recipe servings', { exact: true }).fill('2');
  await editor.getByLabel('Adapted ingredients (one per line)', { exact: true }).fill('2 cups vegetable stock\n1 can chickpeas');
  await expect(editor.getByRole('list', { name: 'Adapted ingredients for this meal', exact: true })).toContainText('2 cans chickpeas');
  await page.evaluate(() => (window as any).__ctx.update('nutritionLab', 'hostNote', 'Keep adaptation work'));
  await expect(editor.getByLabel('Adapted ingredients (one per line)', { exact: true })).toHaveValue('2 cups vegetable stock\n1 can chickpeas');
  await cleanLayout(page); await editor.screenshot({ path: 'tmp/nutrition-meal-adaptation-phone.png' });
  await apply.focus(); await page.keyboard.press('Enter');
  const data = await page.evaluate(() => (window as any).__toolData.nutritionLab);
  expect(data.kit_mealPrep.draft.meals[0].recipeSnapshot.ingredients).toBe('2 cups vegetable stock\n1 can chickpeas');
  expect(data.kit_mealPrep.draft.meals[0].servings).toBe(4);
  expect(data.kit_recipeBox.recipes).toEqual([soup]); await cleanLayout(page);
  await page.getByLabel('Notes for Family soup', { exact: true }).fill('A newer packing note');
  await page.getByRole('button', { name: 'Undo recipe change', exact: true }).click();
  const undone = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft.meals[0]);
  expect(undone.recipeSnapshot.ingredients).toBe(soup.ingredients);
  expect(undone.notes).toBe('A newer packing note');
  await test.info().attach('phone-adaptation', { path: 'tmp/nutrition-meal-adaptation-phone.png', contentType: 'image/png' });
});

test('phone finds a named plan and reuses it on a chosen date without overwriting an active draft', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const school = { ...draft, id: 'school-plan' };
  const other = { ...draft, id: 'weekend-plan', name: 'Weekend cooking', weekOf: '2026-11-09', snacks: 'Picnic snacks' };
  await mount(page, { plans: [school, other], custom: 'Keep this setting' });
  await page.getByLabel('Search saved meal plans', { exact: true }).fill('School week');
  const saved = page.getByRole('article', { name: 'Meal plan for week of 2026-11-02', exact: true });
  await expect(saved).toBeVisible();
  await expect(page.getByRole('article', { name: 'Meal plan for week of 2026-11-09', exact: true })).toHaveCount(0);
  await saved.getByText('Reuse on another date', { exact: true }).click();
  await saved.getByLabel('New week date', { exact: true }).fill('2027-01-04');
  await saved.getByRole('button', { name: 'Create draft for this date', exact: true }).click();
  await expect(page.getByLabel('Week of', { exact: true })).toHaveValue('2027-01-04');
  await expect(page.getByLabel('Plan name', { exact: true })).toHaveValue('School week');
  const firstCopy = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep);
  expect(firstCopy.plans).toEqual([school, other]); expect(firstCopy.custom).toBe('Keep this setting');
  expect(firstCopy.draft.meals[0].id).not.toBe(originalMeal.id);
  await saved.getByLabel('New week date', { exact: true }).fill('2027-02-01');
  await saved.getByRole('button', { name: 'Create draft for this date', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft)).toEqual(firstCopy.draft);
  await page.getByLabel('Plan name', { exact: true }).fill('January lunches');
  await page.getByRole('button', { name: 'Save meal plan', exact: true }).click();
  await page.getByLabel('Search saved meal plans', { exact: true }).fill('January');
  const copied = page.getByRole('article', { name: 'Meal plan for week of 2027-01-04', exact: true });
  await expect(copied).toContainText('January lunches');
  const savedState = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep);
  expect(savedState.plans).toHaveLength(3); expect(savedState.plans.find((plan: any) => plan.id === school.id)).toEqual(school);
  await cleanLayout(page); await copied.screenshot({ path: 'tmp/nutrition-named-plan-phone.png' });
  await test.info().attach('named-plan-reuse', { path: 'tmp/nutrition-named-plan-phone.png', contentType: 'image/png' });
});

test('switching the adaptation target starts from that meal instead of applying the previous form', async ({ page }) => {
  const rice = { ...soup, id: 'rice', name: 'Rice bowls', ingredients: '1 cup rice\n1 can beans', steps: 'Cook the rice.\nWarm the beans.' };
  const second = { ...originalMeal, id: 'rice-meal', day: 'friday', recipeId: rice.id, recipeSnapshot: rice, notes: 'Friday dinner' };
  await mount(page, { plans: [], draft: { ...draft, meals: [originalMeal, second] } });
  await page.getByRole('button', { name: 'Adapt recipe: Family soup on Wednesday', exact: true }).click();
  const editor = page.getByRole('region', { name: 'Adapt recipe for this meal', exact: true });
  await editor.getByLabel('Adapted recipe name', { exact: true }).fill('Unsaved soup idea');
  await editor.getByLabel('Adapted ingredients (one per line)', { exact: true }).fill('999 cups wrong ingredient');
  await page.getByRole('button', { name: 'Adapt recipe: Rice bowls on Friday', exact: true }).click();
  await expect(editor.getByLabel('Adapted recipe name', { exact: true })).toHaveValue('Rice bowls');
  await expect(editor.getByLabel('Adapted ingredients (one per line)', { exact: true })).toHaveValue(rice.ingredients);
  await editor.getByLabel('Adapted ingredients (one per line)', { exact: true }).fill('1 cup brown rice\n1 can beans');
  await editor.getByRole('button', { name: 'Apply recipe to this meal', exact: true }).click();
  const meals = await page.evaluate(() => (window as any).__toolData.nutritionLab.kit_mealPrep.draft.meals);
  expect(meals[0]).toEqual(originalMeal);
  expect(meals[1]).toMatchObject({ id: second.id, day: 'friday', notes: 'Friday dinner', recipeSnapshot: { name: 'Rice bowls', ingredients: '1 cup brown rice\n1 can beans' } });
  await cleanLayout(page);
});
