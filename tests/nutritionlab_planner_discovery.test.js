import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
const soup = { id: 'soup', name: 'Family soup', cuisine: 'Coastal', time: 30, servings: 2,
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Simmer for 20 minutes.', tags: 'comfort, dinner', favorite: true };
const rice = { ...soup, id: 'rice', name: 'Rice bowls', cuisine: 'Weeknight', ingredients: '1 cup rice', time: 15, tags: 'lunch', favorite: false };
const salad = { ...soup, id: 'salad', name: 'Garden salad', cuisine: 'Fresh', ingredients: '2 cups lettuce', time: 0, tags: 'no-cook', favorite: true };

function mountTool(recipes = [soup, rice, salad]) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_recipeBox: { recipes }, kit_mealPrep: { plans: [], draft: null } } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab,
    update: (key, value) => React.act(() => ctx.update('nutritionLab', key, value)) };
  return mounted;
}
function control(view, name) {
  const node = [...view.container.querySelectorAll('input,select,textarea')].find(n => n.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy(); return node;
}
function change(view, name, value) {
  const node = control(view, name), prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
function click(view, name) {
  const node = [...view.container.querySelectorAll('button')].find(n => (n.getAttribute('aria-label') || n.textContent) === name);
  expect(node, name).toBeTruthy(); React.act(() => node.click());
}
function options(view) { return [...control(view, 'Recipe to plan').options].filter(n => n.value).map(n => n.value); }
function result(view) { return view.container.querySelector('[aria-label="Recipe filter results"]').textContent; }

beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Meal planner recipe discovery', () => {
  it('starts with all recipes and filters by saved, favorite, and library sources without changing data', () => {
    const view = mountTool(), before = structuredClone(view.state());
    expect(options(view).length).toBeGreaterThan(3);
    change(view, 'Recipe source', 'saved'); expect(options(view)).toEqual(['saved:soup', 'saved:rice', 'saved:salad']);
    change(view, 'Recipe source', 'favorites'); expect(options(view)).toEqual(['saved:soup', 'saved:salad']);
    change(view, 'Recipe source', 'library'); expect(options(view).length).toBeGreaterThan(0);
    expect(options(view).every(key => key.startsWith('library:'))).toBe(true);
    expect(view.state()).toEqual(before);
  });

  it.each([['BROTH', 'saved:soup'], [' coastal ', 'saved:soup'], ['comfort', 'saved:soup'], ['Rice bowls', 'saved:rice']])('searches recipe content for %s', (search, expected) => {
    const view = mountTool(); change(view, 'Recipe source', 'saved'); change(view, 'Search recipes to plan', search);
    expect(options(view)).toEqual([expected]); expect(result(view)).toMatch(/^1 of \d+ recipes match/);
  });

  it('combines source, search and time, includes known zero minutes and excludes unknown times', () => {
    const invalidTimes = ['', null, true, 'quick', -1, Infinity, '0x10', '1e1', 1441].map((time, i) => ({ ...soup, id: 'unknown-' + i, name: 'Unknown ' + i, time }));
    const view = mountTool([soup, rice, salad, ...invalidTimes]);
    change(view, 'Recipe source', 'saved'); change(view, 'Maximum recipe time', '15');
    expect(options(view)).toEqual(['saved:rice', 'saved:salad']);
    change(view, 'Recipe source', 'favorites'); expect(options(view)).toEqual(['saved:salad']);
    change(view, 'Search recipes to plan', 'lettuce'); expect(options(view)).toEqual(['saved:salad']);
    change(view, 'Search recipes to plan', 'broth'); expect(options(view)).toEqual([]);
    expect(view.container.textContent).toContain('No recipes match these filters');
  });

  it('keeps the chosen recipe outside filters without inflating the matching count or resetting its schedule', () => {
    const view = mountTool(); change(view, 'Recipe to plan', 'saved:soup'); change(view, 'Planned servings', '4');
    change(view, 'Meal day', 'thursday'); change(view, 'Meal slot', 'lunch'); change(view, 'Meal notes', 'Packed lunch');
    change(view, 'Recipe source', 'favorites'); change(view, 'Maximum recipe time', '15');
    expect(options(view)).toEqual(['saved:soup', 'saved:salad']);
    expect(result(view)).toMatch(/^1 of \d+ recipes match/); expect(result(view)).toContain('selected recipe is kept');
    change(view, 'Search recipes to plan', 'no match anywhere');
    expect(options(view)).toEqual(['saved:soup']); expect(result(view)).toMatch(/^0 of \d+ recipes match/);
    expect(control(view, 'Recipe to plan').value).toBe('saved:soup');
    expect(control(view, 'Planned servings').value).toBe('4');
    click(view, 'Add meal to draft');
    expect(view.state().kit_mealPrep.draft.meals[0]).toMatchObject({ day: 'thursday', meal: 'lunch', notes: 'Packed lunch', servings: 4, recipeId: 'soup' });
    expect(view.state().kit_recipeBox.recipes[0]).toEqual(soup);
  });

  it('previews scaled amounts and review lines before saving a separate recipe snapshot', () => {
    const view = mountTool(), before = structuredClone(view.state());
    change(view, 'Recipe to plan', 'saved:soup'); change(view, 'Planned servings', '4');
    const preview = view.container.querySelector('[aria-label="Ingredients for planned meal"]');
    expect(preview.textContent).toContain('4 cups broth'); expect(preview.textContent).toContain('2 carrot'); expect(preview.textContent).toContain('review');
    expect(view.container.querySelector('[aria-label="Selected recipe preview"]').textContent).toContain('30 min as written');
    expect(view.state()).toEqual(before);
    click(view, 'Add meal to draft');
    const saved = view.state().kit_mealPrep.draft.meals[0].recipeSnapshot;
    expect(saved).toMatchObject({ name: 'Family soup', ingredients: soup.ingredients, steps: soup.steps, servings: 2 });
    expect(saved).not.toBe(soup);
  });

  it('surfaces invalid planned servings and avoids a misleading ingredient preview', () => {
    const view = mountTool(); change(view, 'Recipe to plan', 'saved:soup'); change(view, 'Planned servings', '0');
    expect(view.container.querySelector('[aria-label="Ingredients for planned meal"]')).toBeNull();
    expect(view.container.textContent).toContain('Enter original and planned servings greater than 0');
    click(view, 'Add meal to draft'); expect(view.state().kit_mealPrep.draft).toBeNull();
  });

  it('clears discovery filters while keeping the chosen recipe, servings, and notes', () => {
    const view = mountTool(); change(view, 'Recipe to plan', 'saved:rice'); change(view, 'Planned servings', '6'); change(view, 'Meal notes', 'Save for tomorrow');
    change(view, 'Recipe source', 'favorites'); change(view, 'Maximum recipe time', '15'); change(view, 'Search recipes to plan', 'lettuce');
    click(view, 'Clear recipe filters');
    expect(control(view, 'Recipe source').value).toBe('all'); expect(control(view, 'Maximum recipe time').value).toBe('all'); expect(control(view, 'Search recipes to plan').value).toBe('');
    expect(control(view, 'Recipe to plan').value).toBe('saved:rice'); expect(control(view, 'Planned servings').value).toBe('6'); expect(control(view, 'Meal notes').value).toBe('Save for tomorrow');
    expect(options(view).length).toBeGreaterThan(3);
  });

  it('makes a removed selected recipe explicit and refuses to add it', () => {
    const view = mountTool(); change(view, 'Recipe to plan', 'saved:soup');
    view.update('kit_recipeBox', { recipes: [rice] });
    expect(control(view, 'Recipe to plan').selectedOptions[0].textContent).toBe('Selected recipe is no longer available');
    expect(view.container.textContent).toContain('Choose another recipe before adding a meal');
    expect(view.container.querySelector('[aria-label="Selected recipe preview"]')).toBeNull();
    click(view, 'Add meal to draft'); expect(view.state().kit_mealPrep.draft).toBeNull();
    change(view, 'Recipe to plan', 'saved:rice'); click(view, 'Add meal to draft');
    expect(view.state().kit_mealPrep.draft.meals[0].recipeId).toBe('rice');
  });

  it('gives duplicate and colliding imported recipe IDs separate choices and saves the selected snapshot', () => {
    const recipes = [{ ...soup, id: 'shared' }, { ...rice, id: 'shared' }, { ...salad, id: 'shared:entry-1' }];
    const view = mountTool(recipes); change(view, 'Recipe source', 'saved');
    const choices = [...control(view, 'Recipe to plan').options].filter(option => option.value);
    expect(choices).toHaveLength(3); expect(new Set(choices.map(option => option.value)).size).toBe(3);
    recipes.forEach(recipe => {
      const choice = choices.find(option => option.textContent === recipe.name + ' · My Recipe Box');
      expect(choice, recipe.name).toBeTruthy();
      change(view, 'Recipe to plan', choice.value); click(view, 'Add meal to draft');
    });
    expect(view.state().kit_mealPrep.draft.meals.map(meal => ({ name: meal.recipeSnapshot.name, ingredients: meal.recipeSnapshot.ingredients, recipeId: meal.recipeId })))
      .toEqual(recipes.map(recipe => ({ name: recipe.name, ingredients: recipe.ingredients, recipeId: recipe.id })));
    expect(view.state().kit_recipeBox.recipes).toEqual(recipes);
  });

  it('preserves numeric zero IDs while keeping ID-less and fallback-like imported IDs distinct', () => {
    const idless = { ...soup }; delete idless.id;
    const recipes = [idless, { ...rice, id: 'entry-0' }, { ...salad, id: 0 }, { ...soup, name: 'String zero soup', id: '0' }];
    const view = mountTool(recipes); change(view, 'Recipe source', 'saved');
    const choices = [...control(view, 'Recipe to plan').options].filter(option => option.value);
    expect(choices).toHaveLength(4); expect(new Set(choices.map(option => option.value)).size).toBe(4);
    expect(choices.find(option => option.textContent === 'Garden salad · My Recipe Box').value).toBe('saved:0');
    change(view, 'Recipe to plan', 'saved:0'); click(view, 'Add meal to draft');
    expect(view.state().kit_mealPrep.draft.meals[0]).toMatchObject({ recipeId: 0, recipeSnapshot: { name: salad.name, ingredients: salad.ingredients } });
    const idlessChoice = choices.find(option => option.textContent === 'Family soup · My Recipe Box');
    change(view, 'Recipe to plan', idlessChoice.value); click(view, 'Add meal to draft');
    expect(view.state().kit_mealPrep.draft.meals[1].recipeSnapshot).toMatchObject({ name: soup.name, ingredients: soup.ingredients });
    expect(view.state().kit_recipeBox.recipes[0].id).toBeUndefined();
    expect(view.state().kit_recipeBox.recipes[2].id).toBe(0);
  });
});
