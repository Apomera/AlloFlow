import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
function mount(prep, extra = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_mealPrep: prep, ...extra } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) {
    toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump();
  } });
  function Host() { const [, setTick] = React.useState(0); bump = () => setTick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab.kit_mealPrep, all: () => toolData.nutritionLab,
    replace: next => React.act(() => ctx.update('nutritionLab', 'kit_mealPrep', next)),
    hostUpdate: () => React.act(() => ctx.update('nutritionLab', 'otherNote', 'kept')) };
  return mounted;
}
function findButton(scope, label) {
  return [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent) === label);
}
function click(scope, label) { const node = findButton(scope, label); expect(node, label).toBeTruthy(); React.act(() => node.click()); }
function change(scope, label, value) {
  const node = [...scope.querySelectorAll('input,select,textarea')].find(node => node.getAttribute('aria-label') === label);
  expect(node, label).toBeTruthy();
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function savedCards(view) { return [...view.container.querySelectorAll('article[aria-label^="Meal plan for week of "]')]; }
function card(view, date) {
  const node = savedCards(view).find(node => node.getAttribute('aria-label') === 'Meal plan for week of ' + date);
  expect(node, date).toBeTruthy(); return node;
}
const recipe = { id: 'soup', name: 'Vegetable soup', servings: 2, time: 25, cuisine: 'Family', ingredients: '2 cups broth\n1 carrot', steps: 'Simmer for 20 minutes.', notes: 'Use a deep pan.', tags: 'dinner' };
function plan(id = 'first', date = '2026-11-02', name = 'Family week') {
  return { id, name, weekOf: date, prepDay: 'sunday', prepTime: '45', meals: [
    { id: id + '-meal', day: 'monday', meal: 'dinner', recipeId: recipe.id, recipeSnapshot: { ...recipe }, servings: 4, notes: 'Packed portions', custom: { keep: 'meal data' } }
  ], monThu: 'Soup and sandwiches', tuFri: '', weMo: '', snacks: 'Fruit and yogurt', custom: { keep: 'plan data' } };
}
beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Nutrition meal-plan management', () => {
  it('saves a named plan and includes the name in its portable text', () => {
    const draft = plan(); delete draft.id;
    const view = mount({ plans: [], draft, setting: 'keep' });
    change(view.container, 'Plan name', 'School lunch rotation'); click(view.container, 'Save meal plan');
    expect(view.state().plans[0].name).toBe('School lunch rotation'); expect(view.state().setting).toBe('keep');
    expect(view.state().draft).toBeNull();
    expect(card(view, '2026-11-02').textContent).toContain('School lunch rotation');
    expect(card(view, '2026-11-02').querySelector('[aria-label="Plan text preview"]').textContent).toContain('School lunch rotation');
  });
  it('shows saved plans newest week first without reordering or losing stored records', () => {
    const older = plan('old', '2026-10-26', 'Older week'), newer = plan('new', '2026-11-16', 'Newer week');
    const undated = plan('bad', 'unreadable', 'Imported week'), unreadable = { legacy: 'keep' };
    const records = [older, null, undated, newer, unreadable];
    const view = mount({ plans: records });
    expect(savedCards(view).slice(0, 3).map(node => node.getAttribute('aria-label'))).toEqual([
      'Meal plan for week of 2026-11-16', 'Meal plan for week of 2026-10-26', 'Meal plan for week of unreadable'
    ]);
    expect(view.state().plans).toBe(records);
  });
  it.each([
    ['Weekend family', '2026-11-02'], ['2026-11-16', '2026-11-16'], ['broccoli pasta', '2026-11-16'], ['picnic sandwiches', '2026-11-16']
  ])('finds saved plans by name, date, recipe or notes: %s', (query, expectedDate) => {
    const first = plan('first', '2026-11-02', 'Weekend family'), second = plan('second', '2026-11-16', 'Busy week');
    second.meals[0].recipeSnapshot.name = 'Broccoli pasta'; second.snacks = 'Picnic sandwiches';
    const records = [first, second], view = mount({ plans: records });
    change(view.container, 'Search saved meal plans', query);
    expect(savedCards(view)).toHaveLength(1); expect(savedCards(view)[0].getAttribute('aria-label')).toBe('Meal plan for week of ' + expectedDate);
    view.hostUpdate(); expect(savedCards(view)).toHaveLength(1); expect(view.state().plans).toBe(records);
    change(view.container, 'Search saved meal plans', 'not in either plan'); expect(savedCards(view)).toHaveLength(0);
    change(view.container, 'Search saved meal plans', ''); expect(savedCards(view)).toHaveLength(2);
  });
  it('reuses a plan on a chosen date with independent snapshots and preserved notes', () => {
    const original = plan(), before = structuredClone(original), oldList = { id: 'old-list', items: [{ text: 'Apples', done: true }] };
    const view = mount({ plans: [original], setting: 'keep' }, { kit_shopping: { lists: [oldList] } });
    change(card(view, original.weekOf), 'New week date', '2027-01-04');
    click(card(view, original.weekOf), 'Create draft for this date');
    const draft = view.state().draft;
    expect(draft).toMatchObject({ name: before.name, weekOf: '2027-01-04', prepDay: before.prepDay, prepTime: before.prepTime, monThu: before.monThu, snacks: before.snacks, custom: before.custom });
    expect(draft.id).toBeUndefined(); expect(draft.editingId).toBeUndefined();
    expect(draft.meals[0].id).not.toBe(before.meals[0].id);
    expect(draft.meals[0].recipeSnapshot).toEqual(before.meals[0].recipeSnapshot); expect(draft.meals[0].recipeSnapshot).not.toBe(original.meals[0].recipeSnapshot);
    expect(view.state().plans).toEqual([before]); expect(view.all().kit_shopping.lists).toEqual([oldList]);
    click(view.container, 'Save meal plan'); expect(view.state().plans).toHaveLength(2);
    expect(view.state().plans[0].weekOf).toBe('2027-01-04'); expect(view.state().plans[1]).toEqual(before);
  });
  it.each(['', '2027-02-29'])('does not copy a plan to an invalid custom date %j', value => {
    const original = plan(), view = mount({ plans: [original] });
    change(card(view, original.weekOf), 'New week date', value); click(card(view, original.weekOf), 'Create draft for this date');
    expect(view.state().draft).toBeUndefined(); expect(view.state().plans).toEqual([original]);
  });
  it('protects a name-only draft from both custom-date and next-week reuse', () => {
    const original = plan(), view = mount({ plans: [original] });
    change(view.container, 'Plan name', 'My unfinished outline');
    const before = structuredClone(view.state().draft);
    change(card(view, original.weekOf), 'New week date', '2026-12-07'); click(card(view, original.weekOf), 'Create draft for this date');
    expect(view.state().draft).toEqual(before);
    click(view.container, 'Reuse plan for next week of ' + original.weekOf); expect(view.state().draft).toEqual(before);
  });
  it('updates a named plan while keeping unknown fields and its existing shopping list', () => {
    const original = plan(), oldList = { id: 'groceries', sourcePlanId: original.id, items: [{ text: 'Carrots', done: true }] };
    const view = mount({ plans: [original], setting: 'keep' }, { kit_shopping: { lists: [oldList] } });
    click(view.container, 'Edit plan for week of ' + original.weekOf); change(view.container, 'Plan name', 'Renamed week'); click(view.container, 'Update meal plan');
    expect(view.state().plans).toHaveLength(1); expect(view.state().plans[0]).toMatchObject({ id: original.id, name: 'Renamed week', custom: original.custom });
    expect(view.state().plans[0].meals[0].custom).toEqual(original.meals[0].custom);
    expect(view.all().kit_shopping.lists).toEqual([oldList]); expect(view.state().draft).toBeNull();
  });
  it('refuses to overwrite a newer saved plan and can save the editing draft separately', () => {
    const original = plan(), view = mount({ plans: [original], setting: 'keep' });
    click(view.container, 'Edit plan for week of ' + original.weekOf); change(view.container, 'Plan name', 'My draft version');
    const newer = { ...original, snacks: 'Newer household note', custom: { keep: 'new source' } };
    view.replace({ ...view.state(), plans: [newer] }); click(view.container, 'Update meal plan');
    expect(view.state().plans).toEqual([newer]); expect(view.state().draft.name).toBe('My draft version');
    click(view.container, 'Save draft as new plan');
    expect(view.state().plans).toHaveLength(2); expect(view.state().plans[1]).toEqual(newer);
    expect(view.state().plans[0]).toMatchObject({ name: 'My draft version', snacks: original.snacks, custom: original.custom });
    expect(view.state().plans[0].id).not.toBe(original.id); expect(view.state().draft).toBeNull();
  });
  it('recovers an editing draft after its original plan was removed', () => {
    const original = plan(), view = mount({ plans: [original] });
    click(view.container, 'Edit plan for week of ' + original.weekOf); change(view.container, 'Plan name', 'Recovered week');
    view.replace({ ...view.state(), plans: [] }); click(view.container, 'Update meal plan');
    expect(view.state().plans).toEqual([]); expect(view.state().draft.name).toBe('Recovered week');
    click(view.container, 'Save draft as new plan'); expect(view.state().plans[0].name).toBe('Recovered week');
    expect(view.state().plans[0].id).not.toBe(original.id);
  });
  it('does not overwrite either plan when imported duplicate IDs make an open edit ambiguous', () => {
    const original = plan(), view = mount({ plans: [original] });
    click(view.container, 'Edit plan for week of ' + original.weekOf); change(view.container, 'Plan name', 'Draft of one week');
    const duplicate = { ...structuredClone(original), weekOf: '2026-11-09', custom: { source: 'other plan' } };
    view.replace({ ...view.state(), plans: [original, duplicate] }); click(view.container, 'Update meal plan');
    expect(view.state().plans).toEqual([original, duplicate]); expect(view.state().draft).toBeTruthy();
    click(view.container, 'Save draft as new plan'); expect(view.state().plans).toHaveLength(3);
    expect(view.state().plans.slice(1)).toEqual([original, duplicate]); expect(view.state().plans[0].id).not.toBe(original.id);
  });
  it('refuses to open an ambiguous imported plan for direct editing', () => {
    const first = plan(), second = { ...structuredClone(first), custom: { source: 'second record' } };
    const view = mount({ plans: [first, second] });
    const buttons = [...view.container.querySelectorAll('button')].filter(node => node.getAttribute('aria-label') === 'Edit plan for week of ' + first.weekOf);
    React.act(() => buttons[1].click());
    expect(view.state().draft).toBeUndefined(); expect(view.state().plans).toEqual([first, second]);
    expect(view.container.textContent).toContain('cannot be identified uniquely');
  });
  it('keeps a persisted editing draft with no baseline from overwriting its source', () => {
    const original = plan(), draft = { ...structuredClone(original), editingId: original.id, name: 'Imported editing draft' };
    const view = mount({ plans: [original], draft });
    click(view.container, 'Update meal plan'); expect(view.state().plans).toEqual([original]);
    expect(view.state().draft.name).toBe('Imported editing draft');
    click(view.container, 'Save draft as new plan'); expect(view.state().plans).toHaveLength(2);
    expect(view.state().plans[0].name).toBe('Imported editing draft'); expect(view.state().plans[1]).toEqual(original);
  });
  it('edits numeric-zero plan IDs without creating a second source plan', () => {
    const original = plan(0), view = mount({ plans: [original] });
    click(view.container, 'Edit plan for week of ' + original.weekOf); change(view.container, 'Plan name', 'Numeric plan');
    click(view.container, 'Update meal plan');
    expect(view.state().plans).toHaveLength(1); expect(view.state().plans[0]).toMatchObject({ id: 0, name: 'Numeric plan' });
  });
  it.each([{ value: 'unreadable' }, { value: [] }, { value: { meals: 'payload' } }, { value: 0 }])('preserves malformed draft data until explicit clearing and restores it exactly: %j', ({ value }) => {
    const original = plan(), view = mount({ plans: [original], draft: value, setting: 'keep' });
    const before = structuredClone(value);
    change(view.container, 'Plan name', 'Should not overwrite');
    expect(view.state().draft).toBe(value); expect(view.state().draft).toEqual(before);
    click(view.container, 'Edit plan for week of ' + original.weekOf); expect(view.state().draft).toBe(value);
    click(view.container, 'Reuse plan for next week of ' + original.weekOf); expect(view.state().draft).toBe(value);
    change(card(view, original.weekOf), 'New week date', '2026-12-07');
    click(card(view, original.weekOf), 'Create draft for this date'); expect(view.state().draft).toBe(value);
    click(view.container, 'Add meal to draft'); click(view.container, 'Save meal plan');
    expect(view.state().draft).toBe(value); expect(view.state().plans).toEqual([original]);
    click(view.container, 'Clear draft'); expect(view.state().draft).toBeNull();
    click(view.container, 'Undo removal'); expect(view.state().draft).toBe(value); expect(view.state().draft).toEqual(before);
    expect(view.state().plans).toEqual([original]); expect(view.state().setting).toBe('keep');
  });
  it.each(['whole', 'selected'])('uses a named plan in its %s-meal shopping list title without changing source data', scope => {
    const original = plan(), before = structuredClone(original), oldList = { id: 'earlier-list', name: 'Already shopping', items: [{ text: 'Apples', done: true }] };
    const view = mount({ plans: [original] }, { kit_shopping: { lists: [oldList], setting: 'keep' } });
    if (scope === 'whole') click(view.container, 'Create shopping list for week of ' + original.weekOf);
    else click(card(view, original.weekOf), 'Create list for selected meals');
    const shopping = view.all().kit_shopping;
    expect(shopping.lists).toHaveLength(2); expect(shopping.lists[0].name).toContain(original.name);
    expect(shopping.lists[0].name).toContain(original.weekOf); expect(shopping.lists[0].sourcePlanId).toBe(original.id);
    if (scope === 'selected') {
      expect(shopping.lists[0].name).toContain('Selected meals');
      expect(shopping.lists[0].shoppingSelection).toMatchObject({ mealCount: 1, totalMealCount: 1 });
    }
    expect(shopping.lists[1]).toBe(oldList); expect(shopping.setting).toBe('keep');
    expect(view.state().plans[0]).toBe(original); expect(view.state().plans[0]).toEqual(before);
  });
});
