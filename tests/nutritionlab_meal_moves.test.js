import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, ingredients: '1 cup beans\n1/2 cup rice', steps: 'Cook rice.\nWarm beans.' };
const meal = (id, day, slot = 'dinner') => ({ id, day, meal: slot, servings: 2, notes: 'Notes for ' + day, recipeSnapshot: { ...recipe }, custom: { keep: true } });
const first = meal('mon', 'monday'), second = meal('wed', 'wednesday', 'lunch'), third = meal('sun', 'sunday');
const initial = { id: 'draft', weekOf: '2026-11-02', name: 'Flexible week', meals: [third, second, first], snacks: 'Fruit', custom: { keep: true } };
let cfg, root, host, data, update;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab');
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
});
afterEach(() => { React.act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(draft = initial, plans = []) {
  data = { view: 'myNutritionKit', nkView: 'mealPrep', kit_mealPrep: { draft: structuredClone(draft), plans: structuredClone(plans), customSetting: 'keep' },
    kit_recipeBox: { recipes: [recipe] }, kit_shopping: { lists: [{ name: 'Existing groceries', items: ['milk'] }] } };
  const toolData = { nutritionLab: data };
  let rerender;
  const ctx = makeCtx({ toolData, update(section, key, value) { toolData[section] = data = { ...data, [key]: value }; rerender(); } });
  update = (key, value) => React.act(() => ctx.update('nutritionLab', key, value));
  function Host() { const [, tick] = React.useState(0); rerender = () => tick(n => n + 1); return cfg.render(ctx); }
  React.act(() => root.render(React.createElement(Host)));
}
const area = () => host.querySelector('[data-nutrition-meal-move]');
const buttons = parent => [...parent.querySelectorAll('button')];
const button = (name, parent = host) => { const b = buttons(parent).find(b => (b.getAttribute('aria-label') || b.textContent) === name); expect(b, name).toBeTruthy(); return b; };
const click = (name, parent = host) => React.act(() => button(name, parent).click());
function select(index) {
  const box = area().querySelectorAll('input[type="checkbox"]')[index];
  expect(box).toBeTruthy(); React.act(() => box.click());
}
function change(name, value) {
  const input = host.querySelector('[aria-label="' + name + '"]'); expect(input, name).toBeTruthy();
  React.act(() => {
    const proto = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
    input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function move() { select(0); select(1); change('New day for selected meals', 'friday'); click('Preview meal moves'); click('Apply meal moves'); }
const draft = () => data.kit_mealPrep.draft;
const refresh = next => update('kit_mealPrep', { ...data.kit_mealPrep, draft: next });

describe('Selected meal rescheduling', () => {
  it('previews in week order, commits only chosen days and retains recipe amounts, notes, stored order and saved data', () => {
    mount(initial, [{ ...initial, id: 'saved' }]); const before = structuredClone(data);
    expect(button('Preview meal moves').disabled).toBe(true);
    const labels = [...area().querySelectorAll('input[type="checkbox"]')].map(b => b.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Select meal 3: Beans and rice · Monday Dinner',
      'Select meal 2: Beans and rice · Wednesday Lunch',
      'Select meal 1: Beans and rice · Sunday Dinner'
    ]);
    select(0); select(1); change('New day for selected meals', 'friday'); click('Preview meal moves');
    expect(area().textContent).toContain('Monday Dinner → Friday Dinner');
    expect(area().textContent).toContain('Wednesday Lunch → Friday Lunch');
    expect(data).toEqual(before);
    click('Apply meal moves');
    expect(draft().meals).toEqual([third, { ...second, day: 'friday' }, { ...first, day: 'friday' }]);
    expect(draft()).toMatchObject({ name: initial.name, custom: initial.custom, snacks: initial.snacks });
    expect(data.kit_mealPrep.plans).toEqual(before.kit_mealPrep.plans);
    expect(data.kit_recipeBox).toEqual(before.kit_recipeBox); expect(data.kit_shopping).toEqual(before.kit_shopping);
    expect([...area().querySelectorAll('input[type="checkbox"]')].every(b => !b.checked)).toBe(true);
    expect(area().textContent).toContain('2 meals moved.');
  });
  it('cancels a preview and changes the target without editing saved meals', () => {
    mount(); const before = structuredClone(draft()); select(0);
    change('Meal slot for selected meals', 'breakfast'); click('Preview meal moves'); click('Cancel meal moves');
    expect(draft()).toEqual(before); expect(button('Preview meal moves').disabled).toBe(false);
    click('Preview meal moves'); change('New day for selected meals', 'thursday');
    expect(buttons(area()).some(b => b.textContent === 'Apply meal moves')).toBe(false);
    expect(draft()).toEqual(before);
  });
  it('moves meal slots and undoes only the fields changed, preserving later notes, recipe edits, new meals and order', async () => {
    mount(); select(0); select(1); change('New day for selected meals', 'friday'); change('Meal slot for selected meals', 'breakfast');
    click('Preview meal moves'); click('Apply meal moves');
    await vi.waitFor(() => expect(document.activeElement).toBe(button('Undo meal moves')));
    const next = structuredClone(draft());
    next.meals.reverse(); next.meals[0].notes = 'New note'; next.meals[0].servings = 4;
    next.meals[0].recipeSnapshot.ingredients = '3 cups beans';
    next.meals.push(meal('later', 'saturday'));
    next.name = 'New plan name'; refresh(next);
    click('Undo meal moves');
    expect(draft().name).toBe('New plan name');
    expect(draft().meals.map(m => m.id)).toEqual(['mon', 'wed', 'sun', 'later']);
    expect(draft().meals[0]).toMatchObject({ day: 'monday', meal: 'dinner', notes: 'New note', servings: 4, recipeSnapshot: { ingredients: '3 cups beans' } });
    expect(draft().meals[1]).toMatchObject({ day: 'wednesday', meal: 'lunch' });
    await vi.waitFor(() => expect(document.activeElement).toBe(area().querySelector('summary')));
    expect(area().textContent).not.toContain('Your draft changed');
  });
  it('preserves a later independent slot edit when undo only owns the changed day', () => {
    mount(); move();
    const next = structuredClone(draft()); next.meals.find(m => m.id === 'mon').meal = 'snack'; refresh(next);
    click('Undo meal moves');
    expect(draft().meals.find(m => m.id === 'mon')).toMatchObject({ day: 'monday', meal: 'snack' });
  });
  it.each(['rescheduled', 'removed', 'duplicate'])('refuses all undo changes when a moved meal is %s', alteration => {
    mount(); move(); const next = structuredClone(draft());
    if (alteration === 'rescheduled') next.meals.find(m => m.id === 'mon').day = 'tuesday';
    if (alteration === 'removed') next.meals = next.meals.filter(m => m.id !== 'mon');
    if (alteration === 'duplicate') next.meals.push({ ...next.meals.find(m => m.id === 'mon') });
    refresh(next); const before = structuredClone(draft()); click('Undo meal moves');
    expect(draft()).toEqual(before); expect(host.textContent).toContain('Undo meal moves was not applied.');
  });
  it('resets selections after data changes and preserves them through unrelated updates', () => {
    mount(); select(0); update('unrelated', true);
    expect(area().querySelector('input[type="checkbox"]').checked).toBe(true);
    click('Preview meal moves');
    const next = structuredClone(draft()); next.meals.reverse(); refresh(next);
    expect([...area().querySelectorAll('input[type="checkbox"]')].some(b => b.checked)).toBe(false);
    expect(buttons(area()).some(b => b.textContent === 'Apply meal moves')).toBe(false);
    expect(area().textContent).toContain('Your draft changed.');
  });
  it('supports numeric-zero, duplicate and ID-less imported rows without changing their IDs', () => {
    const imported = { ...initial, meals: [{ ...first, id: 0 }, { ...second, id: 'same' }, { ...third, id: 'same' }, { day: 'tuesday', meal: 'snack', notes: 'Legacy row' }] };
    mount(imported); const original = structuredClone(draft().meals);
    click('Select all meals to move'); change('New day for selected meals', 'friday'); click('Preview meal moves'); click('Apply meal moves');
    expect(draft().meals.map(m => m.id)).toEqual([0, 'same', 'same', undefined]);
    click('Undo meal moves'); expect(draft().meals).toEqual(original);
  });
  it('refuses ambiguous imported undo after a later edit, and restores missing schedule properties exactly when safe', () => {
    mount({ ...initial, meals: [{ recipeSnapshot: recipe, notes: 'No day or slot' }, { ...second, id: 'same' }] });
    click('Select all meals to move'); change('New day for selected meals', 'friday'); change('Meal slot for selected meals', 'lunch');
    click('Preview meal moves'); click('Apply meal moves'); click('Undo meal moves');
    expect(draft().meals[0]).not.toHaveProperty('day'); expect(draft().meals[0]).not.toHaveProperty('meal');
    click('Select all meals to move'); click('Preview meal moves'); click('Apply meal moves');
    refresh({ ...draft(), meals: draft().meals.map((m, i) => i === 0 ? { ...m, notes: 'New note' } : m) });
    const before = structuredClone(draft()); click('Undo meal moves');
    expect(draft()).toEqual(before); expect(host.textContent).toContain('These imported meal entries changed.');
  });
  it('does not write for an unchanged schedule or erase the prior successful undo', () => {
    mount(); move();
    select(0); change('New day for selected meals', 'friday'); click('Preview meal moves');
    const before = structuredClone(draft()); click('Apply meal moves');
    expect(draft()).toEqual(before); expect(area().textContent).toContain('already on the selected schedule');
    click('Undo meal moves'); expect(draft().meals).toEqual(initial.meals);
  });
  it('protects unfinished recipe actions and edits a saved plan only through its draft', () => {
    const saved = { ...initial, id: 'saved-plan' };
    mount(null, [saved]); click('Edit plan for week of 2026-11-02');
    click('Adapt recipe: Beans and rice on Monday');
    move();
    expect(area().textContent).toContain('Finish or cancel the open recipe action');
    expect(host.querySelector('[data-nutrition-recipe-adaptation]')).toBeTruthy();
    expect(data.kit_mealPrep.plans).toEqual([saved]);
  });
  it('keeps unreadable data intact and resets move undo when the draft is replaced', () => {
    mount({ ...initial, meals: 'unreadable' });
    expect(area()).toBeNull(); expect(draft().meals).toBe('unreadable');
    refresh(structuredClone(initial)); move();
    refresh({ ...structuredClone(initial), id: 'another-draft' });
    const before = structuredClone(draft()); click('Undo meal moves');
    expect(draft()).toEqual(before); expect(host.textContent).toContain('different draft');
  });
});
