import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg;
let mounted;

function mountTool(saved = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', ...saved } };
  let bump;
  const ctx = makeCtx({ toolData,
    update(section, key, value) {
      toolData[section] = { ...toolData[section], [key]: value };
      if (bump) bump();
    }
  });
  function Host() {
    const [, setTick] = React.useState(0);
    bump = () => setTick(value => value + 1);
    return cfg.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab,
    update: (key, value) => React.act(() => ctx.update('nutritionLab', key, value)) };
  return mounted;
}
function button(view, name) {
  const result = [...view.container.querySelectorAll('button')].find(node => {
    const label = node.getAttribute('aria-label') || node.textContent;
    return name instanceof RegExp ? name.test(label) : label === name;
  });
  expect(result, String(name)).toBeTruthy();
  return result;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function field(view, name) {
  const result = [...view.container.querySelectorAll('input,select,textarea')].find(node =>
    node.getAttribute('aria-label') === name || [...(node.labels || [])].some(label => label.textContent.startsWith(name)));
  expect(result, name).toBeTruthy();
  return result;
}
function change(view, name, value) {
  const node = field(view, name);
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const recipe = { id: 'beans-rice', name: 'Beans and Rice', cuisine: 'Family', time: 20, servings: 2,
  ingredients: '1 cup beans\n1/2 cup rice\nSalt to taste', steps: 'Cook rice. Warm beans.', tags: 'dinner', notes: 'Keep this family note.' };
const meal = (id, servings = 4) => ({ id, day: 'monday', meal: 'dinner', recipeId: recipe.id, recipeSnapshot: { ...recipe }, servings, notes: '' });
const draft = { weekOf: '2026-11-02', prepDay: 'sunday', prepTime: '60', meals: [meal('meal-one')], monThu: '', tuFri: '', weMo: '', snacks: '' };

beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  document.body.innerHTML = '';
});

describe('Nutrition Kit connected meal planning', () => {
  it('saves a recipe snapshot and creates a scaled shopping list without replacing existing lists', () => {
    const existing = { id: 'old-list', name: 'Already shopping', items: [{ text: 'Apples', done: true }], custom: 'keep' };
    const view = mountTool({ nkView: 'mealPrep', kit_recipeBox: { recipes: [recipe] }, kit_mealPrep: { plans: [], draft }, kit_shopping: { lists: [existing], customSetting: true } });
    click(view, 'Save meal plan');
    const saved = view.state().kit_mealPrep.plans[0];
    expect(saved.weekOf).toBe('2026-11-02');
    expect(saved.meals[0].recipeSnapshot.ingredients).toBe(recipe.ingredients);
    expect(saved.meals[0].servings).toBe(4);
    click(view, 'Create shopping list for week of 2026-11-02');
    expect(view.state().nkView).toBe('shopping');
    expect(view.state().kit_shopping.lists).toHaveLength(2);
    expect(view.state().kit_shopping.lists.find(list => list.id === existing.id)).toEqual(existing);
    expect(view.state().kit_shopping.customSetting).toBe(true);
    const generated = view.state().kit_shopping.lists.find(list => list.sourcePlanId === saved.id);
    expect(generated.items.map(item => item.text).join('\n')).toContain('2 cup');
    expect(generated.items.map(item => item.text).join('\n')).toContain('1 cup rice');
    expect(generated.items.some(item => item.manual && item.text.includes('Salt to taste'))).toBe(true);
    const checkbox = [...view.container.querySelectorAll('input[type="checkbox"]')][0];
    expect(checkbox).toBeTruthy();
    React.act(() => checkbox.click());
    view.update('unrelatedNote', 'A host update');
    expect(view.state().kit_shopping.lists.find(list => list.id === generated.id).items[0].done).toBe(true);
  });

  it('uses saved recipe snapshots after the Recipe Box recipe changes or is removed', () => {
    const savedPlan = { ...draft, id: 'plan-one', meals: [meal('meal-one', 2)] };
    const view = mountTool({ nkView: 'mealPrep', kit_recipeBox: { recipes: [{ ...recipe, ingredients: '999 cups different beans' }] }, kit_mealPrep: { plans: [savedPlan] } });
    view.update('kit_recipeBox', { recipes: [] });
    click(view, 'Create shopping list for week of 2026-11-02');
    const items = view.state().kit_shopping.lists[0].items.map(item => item.text).join('\n');
    expect(items).toContain('1 cup beans');
    expect(items).not.toContain('999');
    expect(view.state().kit_mealPrep.plans[0]).toEqual(savedPlan);
  });

  it('preserves old freeform plans and their unknown fields when creating a new structured plan', () => {
    const legacy = { id: 'legacy', weekOf: '2026-10-26', prepDay: 'sunday', prepTime: '30', monThu: 'Family soup', tuFri: 'Leftovers', weMo: 'Pasta', snacks: 'Fruit', familyNote: 'Keep exactly' };
    const view = mountTool({ nkView: 'mealPrep', kit_mealPrep: { plans: [legacy], draft, customSetting: 'preserved' } });
    expect(view.container.textContent).toContain('Family soup');
    expect(view.container.textContent).toContain('Leftovers');
    click(view, 'Save meal plan');
    expect(view.state().kit_mealPrep.plans.find(plan => plan.id === 'legacy')).toEqual(legacy);
    expect(view.state().kit_mealPrep.customSetting).toBe('preserved');
  });

  it('retains draft changes through a parent update and a fresh mount', () => {
    const view = mountTool({ nkView: 'mealPrep', kit_mealPrep: { plans: [], draft } });
    change(view, 'Week of', '2026-11-09');
    view.update('unrelatedNote', 'Parent changed');
    expect(field(view, 'Week of').value).toBe('2026-11-09');
    const saved = structuredClone(view.state());
    React.act(() => view.root.unmount()); view.container.remove(); mounted = null;
    const reopened = mountTool(saved);
    expect(field(reopened, 'Week of').value).toBe('2026-11-09');
    expect(reopened.state().kit_mealPrep.draft.meals[0].recipeSnapshot.name).toBe(recipe.name);
  });

  it('edits and adds shopping items while retaining provenance, checkmarks, and unrelated lists', () => {
    const list = { id: 'planned', name: 'This week', sourcePlanId: 'plan-one', custom: 'keep', items: [{ id: 'beans', text: '2 cups beans', done: true, sources: ['Beans and Rice'] }] };
    const other = { id: 'other', name: 'Other list', items: [{ text: 'Milk', done: false }] };
    const view = mountTool({ nkView: 'shopping', kit_shopping: { lists: [list, other] } });
    click(view, 'Edit item: 2 cups beans');
    change(view, 'Item text', '2 cups canned beans');
    click(view, 'Save item');
    change(view, 'New shopping item', 'Lemon');
    click(view, 'Add shopping item');
    const updated = view.state().kit_shopping.lists.find(item => item.id === 'planned');
    expect(updated.sourcePlanId).toBe('plan-one');
    expect(updated.custom).toBe('keep');
    expect(updated.items[0]).toMatchObject({ text: '2 cups canned beans', done: true, sources: ['Beans and Rice'] });
    expect(updated.items[1]).toMatchObject({ text: 'Lemon', done: false });
    expect(view.state().kit_shopping.lists.find(item => item.id === 'other')).toEqual(other);
  });

  it('never applies a pending item edit to a different item after an earlier row is removed', () => {
    const view = mountTool({ nkView: 'shopping', kit_shopping: { lists: [{ id: 'list', name: 'Groceries', items: [
      { id: 'apples', text: 'Apples', done: false }, { id: 'beans', text: 'Beans', done: true }, { id: 'rice', text: 'Rice', done: false }
    ] }] } });
    click(view, 'Edit item: Beans');
    change(view, 'Item text', 'Canned beans');
    click(view, 'Remove item: Apples');
    expect(view.container.querySelector('input[aria-label="Item text"]')).toBeNull();
    expect(view.state().kit_shopping.lists[0].items).toEqual([
      { id: 'beans', text: 'Beans', done: true }, { id: 'rice', text: 'Rice', done: false }
    ]);
    click(view, 'Edit item: Beans');
    change(view, 'Item text', 'Canned beans');
    click(view, 'Save item');
    expect(view.state().kit_shopping.lists[0].items[0]).toMatchObject({ id: 'beans', text: 'Canned beans', done: true });
    expect(view.state().kit_shopping.lists[0].items[1].text).toBe('Rice');
    click(view, 'Undo removal');
    expect(view.state().kit_shopping.lists[0].items.map(item => item.text)).toEqual(['Apples', 'Canned beans', 'Rice']);
  });

  it('clears stale Undo when saving a draft or opening a different saved plan', () => {
    const laterPlan = { ...draft, id: 'later', weekOf: '2026-11-09', meals: [meal('later-meal', 2)] };
    const first = meal('first', 4), second = { ...meal('second', 2), day: 'tuesday' };
    const view = mountTool({ nkView: 'mealPrep', kit_mealPrep: { plans: [laterPlan], draft: { ...draft, meals: [first, second] } } });
    click(view, 'Remove meal: Beans and Rice on Monday');
    expect(button(view, 'Undo removal')).toBeTruthy();
    click(view, 'Save meal plan');
    expect([...view.container.querySelectorAll('button')].some(node => node.textContent === 'Undo removal')).toBe(false);
    expect(view.state().kit_mealPrep.plans[0].meals.map(item => item.id)).toEqual(['second']);
    click(view, 'Remove plan for week of 2026-11-02');
    expect(button(view, 'Undo removal')).toBeTruthy();
    click(view, 'Edit plan for week of 2026-11-09');
    expect([...view.container.querySelectorAll('button')].some(node => node.textContent === 'Undo removal')).toBe(false);
    expect(view.state().kit_mealPrep.draft.meals.map(item => item.id)).toEqual(['later-meal']);
    expect(view.state().kit_mealPrep.draft.editingId).toBe('later');
  });

  it('adds new plans beside imported records without IDs, and can edit the imported record separately', () => {
    const imported = { weekOf: '2026-10-26', prepDay: 'sunday', prepTime: '30', monThu: 'Family soup', familyNote: 'Keep this imported field' };
    const view = mountTool({ nkView: 'mealPrep', kit_mealPrep: { plans: [imported], draft } });
    click(view, 'Save meal plan');
    expect(view.state().kit_mealPrep.plans).toHaveLength(2);
    expect(view.state().kit_mealPrep.plans.find(plan => plan.weekOf === '2026-10-26')).toEqual(imported);
    click(view, 'Edit plan for week of 2026-10-26');
    change(view, 'Mon/Thu meals', 'Family soup and bread');
    click(view, 'Update meal plan');
    expect(view.state().kit_mealPrep.plans).toHaveLength(2);
    const edited = view.state().kit_mealPrep.plans.find(plan => plan.weekOf === '2026-10-26');
    expect(edited.id).toBeTruthy();
    expect(edited.monThu).toBe('Family soup and bread');
    expect(edited.familyNote).toBe(imported.familyNote);
    expect(view.state().kit_mealPrep.plans.find(plan => plan.weekOf === '2026-11-02').meals[0].recipeSnapshot.name).toBe(recipe.name);
  });

  it.each([
    { nkView: 'mealPrep', kit_recipeBox: { recipes: 'bad' }, kit_mealPrep: { plans: 'bad', draft: { meals: 'bad' } } },
    { nkView: 'shopping', kit_shopping: { lists: 'bad' } },
    { nkView: 'shopping', kit_shopping: { lists: [null, { id: 'legacy', name: 'Legacy list', items: 'bad' }] } },
  ])('renders useful controls from malformed saved data: %j', saved => {
    const view = mountTool(saved);
    expect(view.container.querySelector('button')).toBeTruthy();
    expect(view.container.textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(view.container.textContent).toMatch(/Meal Planner|Shopping Lists/);
  });
});
