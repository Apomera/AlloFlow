import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing recipe source boundary: ' + start);
  return source.slice(first, last);
}
const { Box, Library } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  var NUTRITION_KIT_RECIPE_SEED = [', '  var NUTRITION_KIT_MAINE_SEASONAL_CALENDAR') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') +
  slice('  function PersonalRecipeLibrary(', '  // 144) PersonalMaineCalendar') +
  '\nreturn { Box: PersonalRecipeBox, Library: PersonalRecipeLibrary };'
)(React, React.createElement, (_key, fallback) => fallback);

let mounted;
function mount(Component, initialData = {}, extra = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let data = initialData, updateData;
  function Host() {
    const state = React.useState(initialData); data = state[0]; updateData = state[1];
    const props = { data, setData: updateData, recipes: data.recipes, ...extra };
    if (Component === Library) props.onSaveRecipe = recipe => {
      const result = extra.onSaveRecipe?.(recipe);
      updateData(previous => ({ ...previous, recipes: [...(previous.recipes || []), { ...recipe, id: 'saved-' + recipe.id, sourceRecipeId: recipe.id }] }));
      return result || { ok: true, message: 'Saved starter copy.' };
    };
    return React.createElement(Component, props);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => data, replace: value => React.act(() => updateData(value)) };
  return mounted;
}
function button(view, name) {
  const found = [...view.container.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent) === name);
  expect(found, name).toBeTruthy(); return found;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function input(view, name, value) {
  const node = [...view.container.querySelectorAll('input,textarea,select')].find(el => el.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  React.act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const soup = { id: 'soup', name: 'Family soup', cuisine: 'Family', time: 25, servings: 2, ingredients: '1 cup broth\n1/2 onion\nSalt to taste', steps: '1. Heat at 180°C.\n2. Simmer 20 minutes.', tags: 'dinner, family', notes: 'Keep this note.', customField: { source: 'Grandma' } };

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('Nutrition Recipe Box', () => {
  it('validates editable inputs and saves a usable recipe while preserving section settings', () => {
    const view = mount(Box, { recipes: [], preference: 'family' });
    click(view, '+ Save recipe'); expect(view.container.textContent).toContain('Add a recipe name');
    input(view, 'Recipe name', 'Quick beans'); input(view, 'Recipe time (minutes)', '-1');
    click(view, '+ Save recipe'); expect(view.container.textContent).toContain('0 to 1440');
    input(view, 'Recipe time (minutes)', '15'); input(view, 'Original recipe servings', '0');
    click(view, '+ Save recipe'); expect(view.container.textContent).toContain('greater than 0');
    input(view, 'Original recipe servings', '2.5'); input(view, 'Ingredients (one per line)', '1 can beans');
    input(view, 'Steps (one per line)', 'Heat gently.'); click(view, '+ Save recipe');
    expect(view.state().preference).toBe('family');
    expect(view.state().recipes[0]).toMatchObject({ name: 'Quick beans', time: 15, servings: 2.5, ingredients: '1 can beans', steps: 'Heat gently.' });
    expect(view.container.textContent).toContain('Recipe saved to your box.');
  });

  it('cancels edits without changing the original and preserves unknown recipe fields when saving', () => {
    const view = mount(Box, { recipes: [soup] });
    click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'Not saved'); click(view, 'Cancel editing');
    expect(view.state().recipes[0]).toEqual(soup);
    click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'Updated family soup'); click(view, 'Save recipe changes');
    expect(view.state().recipes).toHaveLength(1);
    expect(view.state().recipes[0]).toMatchObject({ id: 'soup', name: 'Updated family soup', customField: { source: 'Grandma' }, notes: 'Keep this note.' });
    expect(soup.name).toBe('Family soup');
  });

  it('scales ingredient previews and hands the chosen amount to planning without changing cooking instructions', () => {
    const onPlanRecipe = vi.fn(), onRecipeShopping = vi.fn();
    const view = mount(Box, { recipes: [soup] }, { onPlanRecipe, onRecipeShopping });
    click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '4');
    const preview = view.container.querySelector('[aria-label="Scaled ingredients"]').textContent;
    expect(preview).toMatch(/2 cups? broth/); expect(preview).toContain('1 onion'); expect(preview).toContain('review');
    expect(view.container.textContent).toContain('180°C'); expect(view.container.textContent).toContain('20 minutes');
    click(view, 'Plan this recipe'); expect(onPlanRecipe).not.toHaveBeenCalled(); click(view, 'Add to meal plan'); click(view, 'Create shopping list');
    expect(onPlanRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: soup.id, ingredients: soup.ingredients, steps: soup.steps }), 4, { days: ['monday'], meal: 'dinner', notes: '' }); expect(onRecipeShopping).toHaveBeenCalledWith(soup, 4);
    expect(view.state().recipes[0]).toEqual(soup);
    input(view, 'Servings to prepare', '0');
    expect(button(view, 'Plan this recipe').disabled).toBe(true); expect(button(view, 'Create shopping list').disabled).toBe(true);
  });

  it('searches recipes and can undo removal while retaining irregular legacy records', () => {
    const irregular = { legacy: 'keep me' };
    const view = mount(Box, { recipes: [irregular, soup, { ...soup, id: 'rice', name: 'Rice bowl', ingredients: '1 cup rice' }] });
    input(view, 'Search my recipes', 'rice');
    expect(view.container.querySelector('[aria-label="Open recipe Family soup"]')).toBeNull();
    click(view, 'Remove recipe Rice bowl'); expect(view.state().recipes).toHaveLength(2);
    click(view, 'Undo recipe removal'); expect(view.state().recipes).toHaveLength(3); expect(view.state().recipes[0]).toBe(irregular);
    expect(view.container.textContent).toContain('Some saved records could not be displayed');
  });

  it('recovers gracefully when a selected recipe disappears or a saved collection is malformed', () => {
    const view = mount(Box, { recipes: [soup] }); click(view, 'Open recipe Family soup');
    view.replace({ recipes: 'broken' });
    expect(view.container.textContent).toContain('That recipe is no longer available');
    expect(view.container.querySelector('[aria-label="Recipe name"]')).toBeTruthy();
  });
});

describe('Nutrition starter Recipe Library', () => {
  it('saves one editable copy and prevents duplicate imports after the parent updates', () => {
    const onSaveRecipe = vi.fn(); const view = mount(Library, { recipes: [] }, { onSaveRecipe });
    click(view, 'Open starter recipe Overnight Oats'); click(view, 'Save to Recipe Box');
    expect(onSaveRecipe).toHaveBeenCalledTimes(1);
    expect(button(view, 'Saved in Recipe Box').disabled).toBe(true);
    click(view, 'Saved in Recipe Box'); expect(onSaveRecipe).toHaveBeenCalledTimes(1);
    expect(view.state().recipes[0].sourceRecipeId).toBe('overnight-oats');
  });

  it('preserves browsing filters after opening recipes and can clear an empty result', () => {
    const view = mount(Library, { recipes: [] });
    input(view, 'Search starter recipes', 'oats'); input(view, 'Recipe time', '15');
    click(view, 'Open starter recipe Overnight Oats'); click(view, '← Back to library');
    expect(view.container.querySelector('[aria-label="Search starter recipes"]').value).toBe('oats');
    input(view, 'Search starter recipes', 'no-such-ingredient'); expect(view.container.textContent).toContain('No recipes match');
    click(view, 'Clear recipe filters'); expect(view.container.querySelector('[aria-label="Search starter recipes"]').value).toBe('');
    expect(view.container.querySelector('[aria-label="Recipe time"]').value).toBe('all');
  });
});
