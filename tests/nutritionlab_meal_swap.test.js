import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
function mountTool(saved = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_recipeBox: { recipes: [replacement] },
    kit_mealPrep: { plans: [], draft: draft() }, ...saved } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) {
    toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump();
  } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab,
    update: (key, value) => React.act(() => ctx.update('nutritionLab', key, value)) };
  return mounted;
}
function findButton(view, name) {
  return [...view.container.querySelectorAll('button')].find(node => {
    const label = node.getAttribute('aria-label') || node.textContent;
    return name instanceof RegExp ? name.test(label) : label === name;
  });
}
function click(view, name) { const node = findButton(view, name); expect(node, String(name)).toBeTruthy(); React.act(() => node.click()); }
function change(view, name, value) {
  const node = [...view.container.querySelectorAll('input,select,textarea')].find(node => node.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy();
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const original = { id: 'beans', name: 'Beans and rice', servings: 2, time: 20, cuisine: 'Family',
  ingredients: '1 cup beans\n1/2 cup rice', steps: 'Cook rice.\nWarm beans.', notes: 'Family recipe', tags: 'dinner' };
const replacement = { id: 'soup', name: 'Vegetable soup', servings: 2, time: 30, cuisine: 'Family',
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Simmer for 20 minutes.\nServe.', notes: 'Use a deep pan.', tags: 'dinner' };
const meal = (id = 'first', day = 'monday') => ({ id, day, meal: 'dinner', recipeId: original.id,
  recipeSnapshot: { ...original }, servings: 4, notes: 'Pack a lunch portion', custom: { keep: true } });
const draft = (meals = [meal()]) => ({ weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 40, meals, snacks: 'Fruit' });

beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Nutrition Lab flexible meal replacement', () => {
  function chooseSoup(view, title = 'Beans and rice', day = 'Monday') {
    click(view, 'Swap recipe: ' + title + ' on ' + day);
    change(view, 'Replacement recipe', 'saved:soup');
  }
  it('previews scaled ingredients and cancels without changing the draft', () => {
    const view = mountTool(); const before = structuredClone(view.state());
    chooseSoup(view);
    const preview = view.container.querySelector('[aria-label="Replacement ingredients"]');
    expect(preview.textContent).toContain('4 cups broth');
    expect(preview.textContent).toContain('2 carrot');
    expect(preview.textContent).toContain('review');
    expect(view.state()).toEqual(before);
    click(view, 'Cancel recipe swap');
    expect(view.state()).toEqual(before);
    expect(view.container.querySelector('[aria-label="Replacement recipe"]')).toBeNull();
  });
  it('swaps only the recipe while preserving schedule, servings, notes and independent snapshots', () => {
    const savedPlan = { ...draft(), id: 'saved' };
    const oldList = { id: 'old', name: 'Already shopping', items: [{ text: 'Beans', done: true }] };
    const view = mountTool({ kit_mealPrep: { plans: [savedPlan], draft: draft() }, kit_shopping: { lists: [oldList] } });
    chooseSoup(view); click(view, 'Use this recipe');
    const result = view.state().kit_mealPrep.draft.meals[0];
    expect(result).toMatchObject({ id: 'first', day: 'monday', meal: 'dinner', servings: 4, notes: 'Pack a lunch portion', custom: { keep: true }, recipeId: 'soup' });
    expect(result.recipeSnapshot).toMatchObject(replacement);
    expect(result.recipeSnapshot).not.toBe(replacement);
    expect(view.state().kit_recipeBox.recipes[0]).toEqual(replacement);
    expect(view.state().kit_mealPrep.plans).toEqual([savedPlan]);
    expect(view.state().kit_shopping.lists).toEqual([oldList]);
    click(view, 'Undo recipe swap');
    expect(view.state().kit_mealPrep.draft.meals).toEqual([meal()]);
    expect(view.state().kit_shopping.lists).toEqual([oldList]);
  });
  it('applies the previewed snapshot if the saved recipe changes or disappears', () => {
    const view = mountTool(); chooseSoup(view);
    view.update('kit_recipeBox', { recipes: [{ ...replacement, ingredients: '999 cups changed broth', steps: 'Changed instructions.' }] });
    expect(view.container.querySelector('[aria-label="Replacement ingredients"]').textContent).toContain('4 cups broth');
    click(view, 'Use this recipe');
    expect(view.state().kit_mealPrep.draft.meals[0].recipeSnapshot.ingredients).toBe(replacement.ingredients);
    expect(view.state().kit_mealPrep.draft.meals[0].recipeSnapshot.steps).toBe(replacement.steps);
  });
  it('finds the original meal after another meal changes array position', () => {
    const first = meal('friday', 'friday'), second = meal('monday', 'monday');
    first.recipeSnapshot.name = 'Friday rice';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([first, second]) } });
    chooseSoup(view);
    const current = view.state().kit_mealPrep;
    view.update('kit_mealPrep', { ...current, draft: { ...current.draft, meals: [second, first] } });
    click(view, 'Use this recipe');
    expect(view.state().kit_mealPrep.draft.meals.find(m => m.id === 'friday')).toEqual(first);
    expect(view.state().kit_mealPrep.draft.meals.find(m => m.id === 'monday').recipeId).toBe('soup');
  });
  it('refuses an outdated preview after the target meal changes', () => {
    const view = mountTool(); chooseSoup(view);
    const current = view.state().kit_mealPrep;
    const changed = { ...current.draft.meals[0], servings: 7, notes: 'A new amount' };
    view.update('kit_mealPrep', { ...current, draft: { ...current.draft, meals: [changed] } });
    const apply = findButton(view, 'Use this recipe');
    if (apply) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft.meals).toEqual([changed]);
  });
  it('never replaces another meal after the selected meal is removed', () => {
    const remaining = meal('other', 'friday'); remaining.recipeSnapshot.name = 'Friday rice';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([meal(), remaining]) } });
    chooseSoup(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([remaining]) });
    const apply = findButton(view, 'Use this recipe');
    if (apply) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft.meals).toEqual([remaining]);
  });
  it('rejects invalid replacement servings and does not replace the original', () => {
    const view = mountTool({ kit_recipeBox: { recipes: [{ ...replacement, servings: 0 }] } });
    chooseSoup(view);
    const apply = findButton(view, 'Use this recipe');
    if (apply) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft.meals).toEqual([meal()]);
    expect(view.container.textContent).toMatch(/servings/i);
  });
  it('filters replacement options and keeps the current meal until a choice is applied', () => {
    const view = mountTool();
    click(view, 'Swap recipe: Beans and rice on Monday');
    change(view, 'Search replacement recipes', 'vegetable soup');
    const options = [...view.container.querySelector('[aria-label="Replacement recipe"]').options];
    expect(options.some(o => o.value === 'saved:soup')).toBe(true);
    expect(options.filter(o => o.value)).toHaveLength(1);
    expect(view.state().kit_mealPrep.draft.meals).toEqual([meal()]);
  });
  it('undoes only the recipe while keeping newer schedule, servings and notes edits', () => {
    const view = mountTool(); chooseSoup(view); click(view, 'Use this recipe');
    change(view, 'Servings for Vegetable soup on Monday', '8');
    change(view, 'Day for Vegetable soup', 'wednesday');
    change(view, 'Notes for Vegetable soup', 'Pack all eight');
    click(view, 'Undo recipe swap');
    expect(view.state().kit_mealPrep.draft.meals[0]).toMatchObject({ recipeId: 'beans', recipeSnapshot: original, servings: '8', day: 'wednesday', notes: 'Pack all eight' });
  });
  it('clears pending recipe actions when the draft is saved', () => {
    const view = mountTool(); chooseSoup(view); click(view, 'Use this recipe'); click(view, 'Save meal plan');
    expect(view.state().kit_mealPrep.draft).toBeNull();
    expect(findButton(view, 'Undo recipe swap')).toBeUndefined();
    expect(view.state().kit_mealPrep.plans[0].meals[0].recipeId).toBe('soup');
    change(view, 'Meal notes', 'Next plan');
    expect(findButton(view, 'Undo recipe swap')).toBeUndefined();
  });
  it('keeps numeric recipe IDs when replacing an imported recipe', () => {
    const view = mountTool({ kit_recipeBox: { recipes: [{ ...replacement, id: 7 }] } });
    click(view, 'Swap recipe: Beans and rice on Monday');
    change(view, 'Replacement recipe', 'saved:7'); click(view, 'Use this recipe');
    expect(view.state().kit_mealPrep.draft.meals[0].recipeId).toBe(7);
  });
  it('can find an ID-less meal by its original reference after a reorder', () => {
    const selected = meal(); delete selected.id;
    const other = meal('other', 'friday'); other.recipeSnapshot.name = 'Friday rice';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected, other]) } });
    chooseSoup(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([other, selected]) }); click(view, 'Use this recipe');
    expect(view.state().kit_mealPrep.draft.meals[0]).toEqual(other);
    expect(view.state().kit_mealPrep.draft.meals[1].recipeId).toBe('soup');
  });
  it.each(['missing', 'duplicate'])('refuses an ambiguous %s meal identity after imported objects are replaced', kind => {
    const selected = meal(), other = meal('other', 'friday'); other.recipeSnapshot.name = 'Friday rice';
    if (kind === 'missing') delete selected.id;
    else other.id = selected.id;
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected, other]) } });
    chooseSoup(view);
    const fresh = structuredClone(draft([other, selected]));
    view.update('kit_mealPrep', { plans: [], draft: fresh });
    const apply = findButton(view, 'Use this recipe'); if (apply) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft).toEqual(fresh);
  });
  it('does not restore an older recipe over newly edited recipe instructions', () => {
    const view = mountTool(); chooseSoup(view); click(view, 'Use this recipe');
    const current = view.state().kit_mealPrep;
    const changed = structuredClone(current.draft);
    changed.meals[0].recipeSnapshot.steps = 'My newer cooking steps.';
    view.update('kit_mealPrep', { ...current, draft: changed });
    click(view, 'Undo recipe swap');
    expect(view.state().kit_mealPrep.draft).toEqual(changed);
    expect(view.container.textContent).toContain('cannot be restored over newer work');
  });
  it('does not redirect a swap to an identical duplicate after its selected meal is removed', () => {
    const selected = meal(), duplicate = structuredClone(selected);
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected, duplicate]) } });
    chooseSoup(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([duplicate]) });
    const apply = findButton(view, 'Use this recipe'); if (apply) React.act(() => apply.click());
    expect(view.state().kit_mealPrep.draft.meals).toEqual([duplicate]);
    expect(view.state().kit_mealPrep.draft.meals[0].recipeId).toBe('beans');
  });
  it('assigns an ID to an imported meal so undo keeps its later day and notes edits', () => {
    const imported = meal(); delete imported.id;
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([imported]) } });
    chooseSoup(view); click(view, 'Use this recipe');
    const id = view.state().kit_mealPrep.draft.meals[0].id;
    expect(typeof id).toBe('string'); expect(id).not.toBe('');
    change(view, 'Day for Vegetable soup', 'thursday');
    change(view, 'Notes for Vegetable soup', 'A later plan');
    click(view, 'Undo recipe swap');
    expect(view.state().kit_mealPrep.draft.meals[0]).toMatchObject({ id, day: 'thursday', notes: 'A later plan', recipeId: 'beans', recipeSnapshot: original });
  });
});
