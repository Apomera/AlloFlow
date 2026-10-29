import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing selected-shopping source boundary: ' + start);
  return source.slice(first, last);
}
const { Selection, selectedPlan } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  function nlRecipeServings(', '  function NutritionRecipeCookMode(') +
  slice('  function nlSelectedShoppingPlan(', '  // 34) PersonalMealPrepPlanner') +
  '\nreturn { Selection: NutritionPlanShoppingSelection, selectedPlan: nlSelectedShoppingPlan };'
)(React, React.createElement, (_key, fallback) => fallback);

const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, ingredients: '1 cup beans\n1/2 cup rice\nSalt to taste', steps: 'Cook rice.\nWarm beans.' };
function seed() { return { id: 'week', weekOf: '2026-11-02', monThu: 'Extra family meal', snacks: 'Fruit', custom: { keep: true }, meals: [
  { id: 'fri', day: 'friday', meal: 'dinner', servings: 4, recipeSnapshot: { ...recipe }, notes: 'Pack a portion' },
  { id: 'mon', day: 'monday', meal: 'lunch', servings: 2, recipeSnapshot: { ...recipe, name: 'Lunch beans' } }
] }; }
let mounted;
function mount(plan = seed(), callback = vi.fn().mockReturnValue({ ok: true, message: 'Created selected groceries.' })) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let update;
  function Host() { const state = React.useState(plan); update = state[1]; return React.createElement(Selection, { plan: state[0], onCreateShoppingList: callback }); }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, callback, replace: next => React.act(() => update(next)) }; return mounted;
}
function button(view, name) { const node = [...view.container.querySelectorAll('button')].find(el => el.textContent === name); expect(node, name).toBeTruthy(); return node; }
function click(view, name) { React.act(() => button(view, name).click()); }
function checkbox(view, index) { return [...view.container.querySelectorAll('input[type="checkbox"]')].find(el => el.getAttribute('aria-label').startsWith('Include meal ' + (index + 1) + ':')); }
function toggle(view, index) { React.act(() => checkbox(view, index).click()); }
function preview(view) { return view.container.querySelector('[aria-label="Selected meal shopping preview"]')?.textContent || ''; }
function status(view) { return view.container.querySelector('[role="status"]').textContent; }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Selected meal shopping plans', () => {
  it('creates an independent selected plan with source metadata and all freeform notes', () => {
    const plan = seed(), before = structuredClone(plan), result = selectedPlan(plan, [1]);
    expect(result.error).toBe(''); expect(result.plan.meals).toEqual([plan.meals[1]]);
    expect(result.plan.shoppingSelection).toEqual({ mealIds: ['mon'], mealCount: 1, totalMealCount: 2 });
    expect(result.plan.listName).toBe('Selected meals for week of 2026-11-02');
    expect(result.plan).toMatchObject({ id: 'week', monThu: 'Extra family meal', snacks: 'Fruit', custom: { keep: true } });
    expect(result.plan.meals[0]).not.toBe(plan.meals[1]); expect(result.plan.meals[0].recipeSnapshot).not.toBe(plan.meals[1].recipeSnapshot);
    result.plan.meals[0].recipeSnapshot.ingredients = 'Changed'; result.plan.custom.keep = false;
    expect(plan).toEqual(before);
  });
  it('normalizes repeated indexes without confusing duplicate or missing meal IDs', () => {
    const plan = seed(); plan.meals[0].id = 0; delete plan.meals[1].id;
    expect(selectedPlan(plan, [1, 0, 1]).plan.shoppingSelection).toEqual({ mealIds: [0, null], mealCount: 2, totalMealCount: 2 });
    plan.meals[1].id = 0;
    expect(selectedPlan(plan, [1]).plan.meals[0].recipeSnapshot.name).toBe('Lunch beans');
  });
  it('rejects invalid, empty, oversized, or uncopyable selections without changing the input', () => {
    const plan = seed();
    for (const indexes of [[], [-1], [2], [0.5], ['0'], null]) expect(selectedPlan(plan, indexes).plan).toBeNull();
    expect(selectedPlan({ meals: 'bad' }, [0]).error).toContain('readable');
    const huge = { meals: Array.from({ length: 43 }, () => plan.meals[0]) };
    expect(selectedPlan(huge, huge.meals.map((_, index) => index)).error).toContain('42');
    expect(selectedPlan(huge, [42]).plan.meals).toHaveLength(1);
    const circular = seed(); circular.custom.self = circular;
    expect(selectedPlan(circular, [0]).error).toContain('could not be copied');
    expect(plan).toEqual(seed());
  });
  it('starts with all meals selected, orders them by day and previews their scaled combined ingredients', () => {
    const view = mount();
    expect([...view.container.querySelectorAll('input[type="checkbox"]')].map(el => el.getAttribute('aria-label'))).toEqual([
      'Include meal 2: Monday · Lunch · Lunch beans · 2 servings', 'Include meal 1: Friday · Dinner · Beans and rice · 4 servings'
    ]);
    expect(checkbox(view, 0).checked).toBe(true); expect(checkbox(view, 1).checked).toBe(true);
    expect(preview(view)).toContain('3 cups beans'); expect(preview(view)).toContain('1 1/2 cups rice');
    expect(preview(view)).toContain('review'); expect(view.container.textContent).toContain('2 of 2 meals selected');
  });
  it('selects the intended original index and creates only its ingredients without mutating the saved plan', () => {
    const plan = seed(), original = structuredClone(plan), view = mount(plan);
    toggle(view, 0);
    expect(preview(view)).toContain('1 cup beans'); expect(preview(view)).not.toContain('3 cups beans');
    click(view, 'Create list for selected meals');
    expect(view.callback).toHaveBeenCalledTimes(1);
    const selected = view.callback.mock.calls[0][0]; expect(selected.meals).toEqual([plan.meals[1]]);
    expect(selected.shoppingSelection.mealCount).toBe(1); expect(selected.snacks).toBe('Fruit');
    expect(status(view)).toBe('Created selected groceries.'); expect(plan).toEqual(original);
  });
  it('supports clear/select-all controls and disables creation for an empty selection', () => {
    const view = mount(); click(view, 'Clear meal selection');
    expect(button(view, 'Create list for selected meals').disabled).toBe(true); expect(view.container.textContent).toContain('0 of 2 meals selected');
    click(view, 'Create list for selected meals'); expect(view.callback).not.toHaveBeenCalled();
    click(view, 'Select all meals'); expect(checkbox(view, 0).checked).toBe(true); expect(checkbox(view, 1).checked).toBe(true);
  });
  it('keeps selections through unrelated host changes and equivalent cloned data', () => {
    const plan = seed(), view = mount(plan); toggle(view, 0);
    view.replace({ ...structuredClone(plan), custom: { changed: true }, snacks: 'New prep notes' });
    expect(checkbox(view, 0).checked).toBe(false); expect(checkbox(view, 1).checked).toBe(true);
    click(view, 'Create list for selected meals'); expect(view.callback.mock.calls[0][0].snacks).toBe('New prep notes');
  });
  it.each(['reorder', 'amount', 'recipe', 'date', 'identity'])('clears the selection after a saved plan %s change', kind => {
    const plan = seed(), view = mount(plan); toggle(view, 0); const changed = structuredClone(plan);
    if (kind === 'reorder') changed.meals.reverse();
    if (kind === 'amount') changed.meals[1].servings = 9;
    if (kind === 'recipe') changed.meals[1].recipeSnapshot.ingredients = '100 cups beans';
    if (kind === 'date') changed.weekOf = '2026-11-09';
    if (kind === 'identity') changed.id = 'other-week';
    view.replace(changed);
    expect([...view.container.querySelectorAll('input[type="checkbox"]')].every(el => !el.checked)).toBe(true);
    expect(button(view, 'Create list for selected meals').disabled).toBe(true);
    expect(status(view)).toContain('This plan changed');
    click(view, 'Select all meals'); expect(button(view, 'Create list for selected meals').disabled).toBe(false);
  });
  it('keeps duplicate-ID selection independent and does not redirect it after one duplicate disappears', () => {
    const plan = seed(); plan.meals[1].id = plan.meals[0].id; const view = mount(plan); toggle(view, 0);
    click(view, 'Create list for selected meals'); expect(view.callback.mock.calls[0][0].meals[0].recipeSnapshot.name).toBe('Lunch beans');
    view.replace({ ...plan, meals: [plan.meals[0]] });
    expect(checkbox(view, 0).checked).toBe(false); expect(button(view, 'Create list for selected meals').disabled).toBe(true);
  });
  it('shows malformed meal warnings and does not create an empty ingredient list', () => {
    const view = mount({ meals: [null, { day: 'unknown', servings: 0, recipeSnapshot: recipe }] });
    expect(view.container.textContent).toContain('Unscheduled'); expect(view.container.textContent).toContain('could not be read');
    expect(button(view, 'Create list for selected meals').disabled).toBe(true);
    expect(view.container.querySelector('[aria-label="Selected meal shopping preview"]')).toBeNull();
  });
  it('shows no-meals and unreadable-list states without throwing', () => {
    const view = mount({ meals: [] }); expect(view.container.textContent).toContain('no recipe meals');
    view.replace({ meals: 'bad' }); expect(view.container.textContent).toContain('could not be read');
    expect(view.container.querySelector('input[type="checkbox"]')).toBeNull();
  });
  it('reports unavailable, failed, and unconfirmed callbacks honestly', () => {
    const callback = vi.fn().mockReturnValueOnce({ ok: false, message: 'No list created.' }).mockImplementationOnce(() => { throw new Error('offline'); }).mockReturnValueOnce(undefined);
    const view = mount(seed(), callback);
    click(view, 'Create list for selected meals'); expect(status(view)).toBe('No list created.');
    click(view, 'Create list for selected meals'); expect(status(view)).toContain('could not be created');
    click(view, 'Create list for selected meals'); expect(status(view)).toContain('could not be confirmed');
  });
  it('ignores an outdated asynchronous result after the selected plan changes', async () => {
    let finish; const callback = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const plan = seed(), view = mount(plan, callback); click(view, 'Create list for selected meals');
    expect(status(view)).toBe('Creating the selected-meal shopping list…');
    expect(button(view, 'Creating shopping list…').disabled).toBe(true);
    view.replace({ ...plan, weekOf: '2026-11-09' });
    await React.act(async () => finish({ ok: true, message: 'Old plan created.' }));
    expect(status(view)).toContain('This plan changed'); expect(status(view)).not.toContain('Old plan created');
    expect(button(view, 'Create list for selected meals').disabled).toBe(true);
  });
});
