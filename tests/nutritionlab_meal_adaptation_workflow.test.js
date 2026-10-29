import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
function mountTool(saved = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_recipeBox: { recipes: [original] },
    kit_mealPrep: { plans: [], draft: draft() }, ...saved } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) {
    toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump();
  } });
  function Host() { const [, tick] = React.useState(0); bump = () => tick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab,
    update: (key, value) => React.act(() => ctx.update('nutritionLab', key, value)) }; return mounted;
}
function button(view, name) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name);
  expect(node, name).toBeTruthy(); return node;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function field(view, name) { const node = view.container.querySelector('[aria-label="' + name + '"]'); expect(node, name).toBeTruthy(); return node; }
function change(view, name, value) {
  const node = field(view, name), prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
const original = { id: 'beans', name: 'Beans and rice', servings: 2, time: 20, cuisine: 'Family',
  ingredients: '1 cup beans\n1/2 cup rice', steps: 'Cook rice.\nWarm beans.', notes: 'Family recipe', tags: 'dinner' };
const meal = (id = 'first', day = 'monday') => ({ id, day, meal: 'dinner', recipeId: original.id,
  recipeSnapshot: { ...original }, servings: 4, notes: 'Pack a lunch portion', custom: { keep: true } });
const draft = (meals = [meal()]) => ({ weekOf: '2026-11-02', prepDay: 'sunday', prepTime: 40, meals, snacks: 'Fruit' });
function begin(view, name = original.name, day = 'Monday') { click(view, 'Adapt recipe: ' + name + ' on ' + day); }
function adapt(view) {
  change(view, 'Adapted recipe name', 'Lentils and rice');
  change(view, 'Adapted ingredients (one per line)', '1 cup lentils\n1/2 cup rice');
  change(view, 'Adapted cooking steps', 'Cook rice.\nWarm lentils for 15 minutes.');
}
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Meal recipe adaptation workflow', () => {
  it('changes only the draft meal until saving, then uses that snapshot in a new shopping list', () => {
    const savedPlan = { ...draft(), id: 'saved-plan', customPlan: 'keep' };
    const oldList = { id: 'old', name: 'Old groceries', items: [{ text: 'Beans', done: true }] };
    const view = mountTool({ kit_mealPrep: { plans: [savedPlan], setting: 'keep' }, kit_shopping: { lists: [oldList] } });
    click(view, 'Edit plan for week of 2026-11-02'); begin(view); adapt(view);
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('2 cups lentils');
    expect(view.state().kit_mealPrep.plans).toEqual([savedPlan]);
    expect(view.state().kit_mealPrep.draft.meals[0].recipeSnapshot).toEqual(original);
    click(view, 'Apply recipe to this meal');
    const changed = view.state().kit_mealPrep.draft.meals[0];
    expect(changed).toMatchObject({ id: 'first', day: 'monday', meal: 'dinner', recipeId: 'beans', servings: 4, notes: 'Pack a lunch portion', custom: { keep: true } });
    expect(changed.recipeSnapshot).toMatchObject({ name: 'Lentils and rice', ingredients: '1 cup lentils\n1/2 cup rice', steps: 'Cook rice.\nWarm lentils for 15 minutes.' });
    expect(view.state().kit_mealPrep.plans).toEqual([savedPlan]);
    expect(view.state().kit_recipeBox.recipes).toEqual([original]); expect(view.state().kit_shopping.lists).toEqual([oldList]);
    click(view, 'Update meal plan');
    expect(view.state().kit_mealPrep.plans[0].meals[0].recipeSnapshot.name).toBe('Lentils and rice');
    expect(view.state().kit_mealPrep.plans[0].customPlan).toBe('keep'); expect(savedPlan.meals[0].recipeSnapshot).toEqual(original);
    click(view, 'Create shopping list for week of 2026-11-02');
    const generated = view.state().kit_shopping.lists.find(list => list.sourcePlanId === 'saved-plan');
    expect(generated.items.map(item => item.text).join('\n')).toContain('2 cups lentils');
    expect(generated.items.map(item => item.text).join('\n')).not.toContain('beans');
    expect(view.state().kit_shopping.lists.find(list => list.id === 'old')).toEqual(oldList);
    expect(view.state().kit_recipeBox.recipes).toEqual([original]);
  });
  it('cancels unconfirmed changes without changing any saved data', () => {
    const view = mountTool(), before = structuredClone(view.state()); begin(view); adapt(view); click(view, 'Cancel recipe changes');
    expect(view.state()).toEqual(before); expect(view.container.querySelector('[data-nutrition-recipe-adaptation]')).toBeNull();
  });
  it.each(['notes', 'servings'])('refuses stale adaptation after target %s change', changedField => {
    const view = mountTool(); begin(view); adapt(view);
    change(view, changedField === 'notes' ? 'Notes for Beans and rice' : 'Servings for Beans and rice on Monday', changedField === 'notes' ? 'New meal note' : '7');
    const newer = structuredClone(view.state().kit_mealPrep.draft);
    click(view, 'Apply recipe to this meal');
    expect(view.state().kit_mealPrep.draft).toEqual(newer); expect(newer.meals[0].recipeSnapshot).toEqual(original);
    expect(view.container.textContent).toContain('This meal changed while you were editing');
  });
  it('does not apply changes to another meal after its target is removed', () => {
    const other = meal('other', 'friday'); other.recipeSnapshot.name = 'Friday meal';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([meal(), other]) } }); begin(view); adapt(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([other]) }); click(view, 'Apply recipe to this meal');
    expect(view.state().kit_mealPrep.draft.meals).toEqual([other]); expect(view.container.textContent).toContain('This meal changed while you were editing');
  });
  it('undoes the adapted recipe while retaining newer day, servings, and notes edits', () => {
    const view = mountTool(); begin(view); adapt(view); click(view, 'Apply recipe to this meal');
    change(view, 'Day for Lentils and rice', 'wednesday'); change(view, 'Servings for Lentils and rice on Wednesday', '6');
    change(view, 'Notes for Lentils and rice', 'Keep this new note'); click(view, 'Undo recipe change');
    expect(view.state().kit_mealPrep.draft.meals[0]).toMatchObject({ id: 'first', day: 'wednesday', servings: '6', notes: 'Keep this new note', recipeId: 'beans', recipeSnapshot: original });
  });
  it('adapts an ID-less meal after reorder, assigns a unique ID, and can undo after another edit', () => {
    const selected = meal(); delete selected.id;
    const other = meal('other', 'friday'); other.recipeSnapshot.name = 'Friday meal';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected, other]) } }); begin(view); adapt(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([other, selected]) }); click(view, 'Apply recipe to this meal');
    const changed = view.state().kit_mealPrep.draft.meals[1]; expect(changed.id).toBeTruthy(); expect(changed.id).not.toBe('other');
    expect(view.state().kit_mealPrep.draft.meals[0]).toEqual(other);
    change(view, 'Notes for Lentils and rice', 'A newer note'); click(view, 'Undo recipe change');
    expect(view.state().kit_mealPrep.draft.meals[1]).toMatchObject({ id: changed.id, notes: 'A newer note', recipeSnapshot: original });
  });
  it('gives an adapted duplicate-ID entry a distinct identity without changing its sibling', () => {
    const first = meal('duplicate'), second = meal('duplicate', 'friday'); second.recipeSnapshot.name = 'Friday meal';
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([first, second]) } }); begin(view, 'Friday meal', 'Friday'); adapt(view);
    click(view, 'Apply recipe to this meal');
    const meals = view.state().kit_mealPrep.draft.meals;
    expect(meals[0]).toEqual(first); expect(meals[1].id).not.toBe('duplicate'); expect(meals[1].recipeSnapshot.name).toBe('Lentils and rice');
    expect(second.recipeSnapshot.name).toBe('Friday meal');
  });
  it('never redirects to an identical duplicate when the selected duplicate was removed', () => {
    const selected = meal(), other = structuredClone(selected);
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected, other]) } }); begin(view); adapt(view);
    view.update('kit_mealPrep', { plans: [], draft: draft([other]) }); click(view, 'Apply recipe to this meal');
    expect(view.state().kit_mealPrep.draft.meals).toEqual([other]); expect(other.recipeSnapshot.name).toBe(original.name);
  });
  it('refuses an ID-less target replaced by a new imported object while the editor is open', () => {
    const selected = meal(); delete selected.id;
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([selected]) } }); begin(view); adapt(view);
    const replacement = structuredClone(selected); view.update('kit_mealPrep', { plans: [], draft: draft([replacement]) });
    click(view, 'Apply recipe to this meal'); expect(view.state().kit_mealPrep.draft.meals).toEqual([replacement]);
    expect(view.container.textContent).toContain('This meal changed while you were editing');
  });
  it('resets the frozen editor when switching directly to another planned recipe', () => {
    const first = meal(), second = meal('second', 'friday');
    second.recipeSnapshot = { ...original, name: 'Friday rice', ingredients: '2 cups rice', servings: 3, steps: 'Cook for 10 minutes.', notes: 'Friday note' };
    const view = mountTool({ kit_mealPrep: { plans: [], draft: draft([first, second]) } }); begin(view); adapt(view);
    begin(view, 'Friday rice', 'Friday');
    expect(field(view, 'Adapted recipe name').value).toBe('Friday rice'); expect(field(view, 'Original recipe servings').value).toBe('3');
    expect(field(view, 'Adapted ingredients (one per line)').value).toBe('2 cups rice');
    expect(field(view, 'Adapted cooking steps').value).toBe('Cook for 10 minutes.');
    expect(view.state().kit_mealPrep.draft.meals).toEqual([first, second]);
    change(view, 'Adaptation notes', 'Only Friday changes'); click(view, 'Apply recipe to this meal');
    expect(view.state().kit_mealPrep.draft.meals[0]).toEqual(first);
    expect(view.state().kit_mealPrep.draft.meals[1].recipeSnapshot.notes).toBe('Only Friday changes');
  });
  it('uses the planned recipe snapshot after its Recipe Box source is removed', () => {
    const view = mountTool(); begin(view); adapt(view); view.update('kit_recipeBox', { recipes: [] });
    click(view, 'Apply recipe to this meal'); expect(view.state().kit_mealPrep.draft.meals[0].recipeSnapshot.name).toBe('Lentils and rice');
    expect(view.state().kit_recipeBox.recipes).toEqual([]);
  });
});
