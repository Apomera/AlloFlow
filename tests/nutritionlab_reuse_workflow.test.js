import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
function mount(saved = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep',
    kit_recipeBox: { recipes: [original], setting: 'keep' }, kit_mealPrep: { plans: [sourcePlan], draft: currentDraft },
    kit_shopping: { lists: [oldList] }, ...saved } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) {
    toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump();
  } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, state: () => toolData.nutritionLab,
    update: (key, value) => React.act(() => ctx.update('nutritionLab', key, value)) }; return mounted;
}
function button(view, label) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === label);
  expect(node, label).toBeTruthy(); return node;
}
function click(view, label) { React.act(() => button(view, label).click()); }
function change(view, label, value) {
  const node = view.container.querySelector('[aria-label="' + label + '"]'); expect(node, label).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
function copyArea(view) {
  const node = [...view.container.querySelectorAll('details')].find(el => el.querySelector(':scope > summary')?.textContent === 'Copy meals to current draft');
  expect(node).toBeTruthy(); return { container: node };
}
function selectMeal(view, name) {
  const area = copyArea(view);
  const node = [...area.container.querySelectorAll('input[type="checkbox"]')].find(el => (el.getAttribute('aria-label') || el.parentElement.textContent).includes(name));
  expect(node, name).toBeTruthy(); React.act(() => node.click());
}
const original = { id: 'soup', name: 'Family soup', servings: 2, time: 20, cuisine: 'Family', tags: 'dinner',
  ingredients: '1 cup broth\n1 carrot', steps: 'Warm at 180°C for 20 minutes.', notes: 'Family note.' };
const adapted = { ...original, name: 'White bean soup', ingredients: '2 cups stock\n1 can white beans', steps: 'Warm stock.\nAdd beans and simmer for 20 minutes.', notes: 'Adapted for our family.' };
const adaptedMeal = { id: 'adapted-meal', day: 'wednesday', meal: 'lunch', recipeId: original.id, recipeSnapshot: adapted, servings: 4, notes: 'Pack for school', custom: { keep: true } };
const riceMeal = { id: 'rice-meal', day: 'friday', meal: 'dinner', recipeId: 'rice', recipeSnapshot: { ...original, id: 'rice', name: 'Rice bowls', ingredients: '1 cup rice', steps: 'Cook rice.' }, servings: 2, notes: 'Friday meal' };
const sourcePlan = { id: 'source-plan', name: 'Last week', weekOf: '2026-10-26', prepDay: 'sunday', prepTime: 30, meals: [riceMeal, adaptedMeal], snacks: 'Fruit', customPlan: { keep: true } };
const currentDraft = { name: 'Current week', weekOf: '2026-11-09', prepDay: 'saturday', prepTime: 45, meals: [{ ...adaptedMeal, id: 'current-meal', day: 'monday' }], snacks: 'Yogurt', customDraft: { keep: true } };
const oldList = { id: 'old-list', name: 'Already shopping', items: [{ text: 'Apples', done: true }] };
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Saving planned recipe variations', () => {
  it('keeps an unreadable Recipe Box intact and reports that the copy was not saved', () => {
    const box = { recipes: 'unreadable imported recipes', setting: 'keep' };
    const view = mount({ kit_recipeBox: box });
    click(view, 'Save recipe from meal: White bean soup on Monday'); click(view, 'Save this recipe to Recipe Box');
    expect(view.state().kit_recipeBox).toEqual(box);
    expect(view.container.textContent).toContain('Your saved Recipe Box could not be read');
    expect(button(view, 'Save this recipe to Recipe Box').disabled).toBe(false);
  });
  it('saves original recipe amounts as an independent named recipe without changing the meal, plan, or existing editor draft', () => {
    const editorDraft = { editingId: null, form: { name: 'Unfinished idea', ingredients: '1 cup oats' } };
    const view = mount({ kit_recipeBox: { recipes: [original], editorDraft, setting: 'keep' } });
    const before = structuredClone(view.state());
    click(view, 'Save recipe from meal: White bean soup on Monday');
    change(view, 'Recipe Box name', 'My white bean soup'); click(view, 'Save this recipe to Recipe Box');
    const records = view.state().kit_recipeBox.recipes;
    expect(records).toHaveLength(2);
    const saved = records.find(recipe => recipe.id !== original.id);
    expect(saved).toMatchObject({ name: 'My white bean soup', servings: 2, ingredients: adapted.ingredients, steps: adapted.steps, notes: adapted.notes, time: 20 });
    expect(saved).not.toBe(adapted); expect(saved.id).not.toBe(original.id);
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.id === original.id)).toEqual(original);
    expect(view.state().kit_recipeBox.editorDraft).toEqual(editorDraft); expect(view.state().kit_recipeBox.setting).toBe('keep');
    expect(view.state().kit_mealPrep).toEqual(before.kit_mealPrep); expect(view.state().kit_shopping).toEqual(before.kit_shopping);
  });
  it('cancels without saving and keeps the snapshot shown when the plan changes during the dialog', () => {
    const view = mount(), before = structuredClone(view.state());
    click(view, 'Save recipe from meal: White bean soup on Monday'); change(view, 'Recipe Box name', 'Canceled copy');
    click(view, 'Cancel saving recipe'); expect(view.state()).toEqual(before);
    click(view, 'Save recipe from meal: White bean soup on Monday');
    const changed = structuredClone(view.state().kit_mealPrep); changed.draft.meals[0].recipeSnapshot.ingredients = '99 cups newer stock';
    view.update('kit_mealPrep', changed); change(view, 'Recipe Box name', 'Frozen copy'); click(view, 'Save this recipe to Recipe Box');
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.name === 'Frozen copy').ingredients).toBe(adapted.ingredients);
    expect(view.state().kit_mealPrep).toEqual(changed);
  });
  it('recognizes an exact existing recipe without adding another copy', () => {
    const view = mount({ kit_recipeBox: { recipes: [original, { ...adapted, id: 'already-saved' }] } });
    click(view, 'Save recipe from meal: White bean soup on Monday'); click(view, 'Save this recipe to Recipe Box');
    expect(view.state().kit_recipeBox.recipes).toHaveLength(2);
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.id === 'already-saved')).toMatchObject({ ...adapted, id: 'already-saved' });
  });
  it('keeps distinct ingredient variations even when another saved recipe has the requested name', () => {
    const view = mount({ kit_recipeBox: { recipes: [{ ...original, name: adapted.name }] } });
    click(view, 'Save recipe from meal: White bean soup on Monday'); click(view, 'Save this recipe to Recipe Box');
    expect(view.state().kit_recipeBox.recipes).toHaveLength(2);
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.id === original.id).ingredients).toBe(original.ingredients);
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.id !== original.id).ingredients).toBe(adapted.ingredients);
    expect(view.state().kit_recipeBox.recipes.find(recipe => recipe.id !== original.id).name).toBe('White bean soup (meal version)');
    const saved = structuredClone(view.state().kit_recipeBox);
    click(view, 'Return to meal'); click(view, 'Save recipe from meal: White bean soup on Monday'); click(view, 'Save this recipe to Recipe Box');
    expect(view.state().kit_recipeBox).toEqual(saved);
  });
});

describe('Copy selected meals into an existing draft', () => {
  it('preserves an open adaptation instead of discarding it to copy meals', () => {
    const view = mount();
    click(view, 'Adapt recipe: White bean soup on Monday');
    change(view, 'Adapted ingredients (one per line)', '1 can chickpeas');
    const before = structuredClone(view.state());
    selectMeal(view, 'Rice bowls'); click(copyArea(view), 'Copy selected meals to draft');
    expect(view.state()).toEqual(before);
    expect(view.container.querySelector('[aria-label="Adapted ingredients (one per line)"]').value).toBe('1 can chickpeas');
    expect(copyArea(view).container.textContent).toContain('Finish or cancel the open recipe action');
  });
  it('starts with nothing selected and appends only chosen snapshots while preserving both weeks', () => {
    const view = mount(), before = structuredClone(view.state()), area = copyArea(view);
    expect([...area.container.querySelectorAll('input[type="checkbox"]')].every(input => !input.checked)).toBe(true);
    selectMeal(view, 'White bean soup'); click(copyArea(view), 'Copy selected meals to draft');
    const prep = view.state().kit_mealPrep, copied = prep.draft.meals[1];
    expect(prep.draft.meals).toHaveLength(2); expect(prep.draft.meals[0]).toEqual(currentDraft.meals[0]);
    expect(prep.draft).toMatchObject({ name: 'Current week', weekOf: '2026-11-09', prepDay: 'saturday', prepTime: 45, snacks: 'Yogurt', customDraft: { keep: true } });
    expect(copied).toMatchObject({ day: 'wednesday', meal: 'lunch', servings: 4, notes: 'Pack for school', custom: { keep: true }, recipeSnapshot: adapted });
    expect(copied.id).not.toBe(adaptedMeal.id); expect(copied.id).not.toBe(currentDraft.meals[0].id);
    expect(copied.recipeSnapshot).not.toBe(adapted); expect(copied.custom).not.toBe(adaptedMeal.custom);
    expect(prep.plans).toEqual(before.kit_mealPrep.plans); expect(view.state().kit_recipeBox).toEqual(before.kit_recipeBox); expect(view.state().kit_shopping).toEqual(before.kit_shopping);
    expect([...copyArea(view).container.querySelectorAll('input[type="checkbox"]')].every(input => !input.checked)).toBe(true);
  });
  it('copies both duplicate-ID source entries with distinct new identities', () => {
    const plan = { ...sourcePlan, meals: [{ ...adaptedMeal, id: 'duplicate' }, { ...riceMeal, id: 'duplicate' }] };
    const view = mount({ kit_mealPrep: { plans: [plan], draft: currentDraft } });
    click(copyArea(view), 'Select all meals'); click(copyArea(view), 'Copy selected meals to draft');
    const meals = view.state().kit_mealPrep.draft.meals;
    expect(meals).toHaveLength(3); expect(new Set(meals.map(meal => meal.id)).size).toBe(3);
    expect(meals.slice(1).map(meal => meal.recipeSnapshot.name).sort()).toEqual(['Rice bowls', 'White bean soup']);
    expect(view.state().kit_mealPrep.plans).toEqual([plan]);
  });
  it('creates a usable fresh draft when one is absent', () => {
    const view = mount({ kit_mealPrep: { plans: [sourcePlan], setting: 'preserve' } });
    selectMeal(view, 'Rice bowls'); click(copyArea(view), 'Copy selected meals to draft');
    expect(view.state().kit_mealPrep.draft.meals).toHaveLength(1);
    expect(view.state().kit_mealPrep.draft.weekOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(view.state().kit_mealPrep.setting).toBe('preserve'); expect(view.state().kit_mealPrep.plans).toEqual([sourcePlan]);
  });
  it('undo removes only the copied entries while preserving later draft work', () => {
    const view = mount(); selectMeal(view, 'White bean soup'); click(copyArea(view), 'Copy selected meals to draft');
    const changed = structuredClone(view.state().kit_mealPrep);
    const later = { ...riceMeal, id: 'later-added', notes: 'Added after copying' };
    changed.draft.meals.push(later); changed.draft.name = 'Renamed afterward'; changed.draft.snacks = 'New snack';
    view.update('kit_mealPrep', changed); click(view, 'Undo copied meals');
    expect(view.state().kit_mealPrep.draft.meals).toEqual([currentDraft.meals[0], later]);
    expect(view.state().kit_mealPrep.draft).toMatchObject({ name: 'Renamed afterward', snacks: 'New snack', weekOf: currentDraft.weekOf });
    expect(view.state().kit_mealPrep.plans).toEqual([sourcePlan]); expect(view.state().kit_shopping.lists).toEqual([oldList]);
    expect(view.container.textContent).not.toContain('Undo copied meals');
  });
  it.each(['edited', 'removed', 'duplicated'])('refuses undo atomically when a copied entry was %s', alteration => {
    const view = mount(); click(copyArea(view), 'Select all meals'); click(copyArea(view), 'Copy selected meals to draft');
    const changed = structuredClone(view.state().kit_mealPrep);
    if (alteration === 'edited') changed.draft.meals[1].recipeSnapshot.ingredients = '3 cups newer rice';
    if (alteration === 'removed') changed.draft.meals.splice(1, 1);
    if (alteration === 'duplicated') changed.draft.meals.push(structuredClone(changed.draft.meals[1]));
    view.update('kit_mealPrep', changed); click(view, 'Undo copied meals');
    expect(view.state().kit_mealPrep).toEqual(changed);
    expect(view.container.textContent).toContain('Some copied meals changed or were removed');
  });
  it('rejects a two-meal copy atomically when only one space remains', () => {
    const full = { ...currentDraft, meals: Array.from({ length: 41 }, (_, index) => ({ ...currentDraft.meals[0], id: 'existing-' + index })) };
    const view = mount({ kit_mealPrep: { plans: [sourcePlan], draft: full } });
    click(copyArea(view), 'Select all meals'); const apply = button(copyArea(view), 'Copy selected meals to draft');
    if (!apply.disabled) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft).toEqual(full);
    selectMeal(view, 'Rice bowls'); click(copyArea(view), 'Copy selected meals to draft');
    expect(view.state().kit_mealPrep.draft.meals).toHaveLength(42);
  });
  it.each(['unreadable', [], { meals: 'payload' }, 0])('does not overwrite malformed destination draft %j', badDraft => {
    const view = mount({ kit_mealPrep: { plans: [sourcePlan], draft: badDraft, setting: 'keep' } });
    selectMeal(view, 'White bean soup'); const apply = button(copyArea(view), 'Copy selected meals to draft');
    if (!apply.disabled) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft).toBe(badDraft); expect(view.state().kit_mealPrep.setting).toBe('keep');
  });
  it('resets selected source indexes when imported meals reorder and preserves them across unrelated updates', () => {
    const view = mount(); selectMeal(view, 'White bean soup'); view.update('unrelated', 'still here');
    expect([...copyArea(view).container.querySelectorAll('input[type="checkbox"]')].filter(input => input.checked)).toHaveLength(1);
    const reordered = { ...sourcePlan, meals: [adaptedMeal, riceMeal] };
    view.update('kit_mealPrep', { plans: [reordered], draft: currentDraft });
    expect([...copyArea(view).container.querySelectorAll('input[type="checkbox"]')].every(input => !input.checked)).toBe(true);
    expect(view.state().kit_mealPrep.draft).toEqual(currentDraft);
  });
});
