import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, ingredients: '1 cup beans\n1/2 cup rice', steps: 'Heat at 180°C for 20 minutes.' };
const meal = (id, day, servings = 2) => ({ id, day, meal: 'dinner', servings, notes: 'Note for ' + day, recipeSnapshot: { ...recipe }, custom: { keep: true } });
const first = meal('mon', 'monday'), second = meal('wed', 'wednesday', 1), third = meal('sun', 'sunday', 3);
const initial = { id: 'week', name: 'Flexible week', weekOf: '2026-11-02', prepDay: 'monday', prepTime: 30, meals: [third, second, first], snacks: 'Fruit', custom: { keep: true } };
let cfg, root, host, data, update;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); resetStemLab(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
afterEach(() => { React.act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(draft = initial, plans = []) {
  data = { view: 'myNutritionKit', nkView: 'mealPrep', kit_mealPrep: { draft: structuredClone(draft), plans: structuredClone(plans), setting: 'keep' }, kit_recipeBox: { recipes: [recipe] }, kit_shopping: { lists: [{ name: 'Existing groceries', items: ['milk'] }] } };
  const toolData = { nutritionLab: data }; let rerender;
  const ctx = makeCtx({ toolData, update(section, key, value) { toolData[section] = data = { ...data, [key]: value }; rerender(); } });
  update = (key, value) => React.act(() => ctx.update('nutritionLab', key, value));
  function Host() { const [, tick] = React.useState(0); rerender = () => tick(n => n + 1); return cfg.render(ctx); }
  React.act(() => root.render(React.createElement(Host)));
}
const area = () => host.querySelector('[data-nutrition-meal-servings]');
const button = (name, parent = host) => { const node = [...parent.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent) === name); expect(node, name).toBeTruthy(); return node; };
const click = (name, parent = host) => React.act(() => button(name, parent).click());
function select(index) { const node = area()?.querySelectorAll('input[type="checkbox"]')[index]; expect(node).toBeTruthy(); React.act(() => node.click()); }
function change(name, value) { const node = host.querySelector('[aria-label="' + name + '"]'); expect(node, name).toBeTruthy(); React.act(() => { const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); }); }
const draft = () => data.kit_mealPrep.draft;
const refresh = next => update('kit_mealPrep', { ...data.kit_mealPrep, draft: next });
function resize() { select(0); select(1); change('New servings per selected meal', '4'); click('Preview serving changes'); click('Apply serving changes'); }

describe('Selected meal serving changes', () => {
  it('previews ingredients in week order, then changes only selected serving counts', () => {
    mount(initial, [{ ...initial, id: 'saved' }]); const before = structuredClone(data);
    expect(button('Preview serving changes').disabled).toBe(true); select(0); select(1); change('New servings per selected meal', '4'); click('Preview serving changes');
    expect(area().textContent).toContain('Monday Dinner · 2 → 4 servings'); expect(area().textContent).toContain('Wednesday Dinner · 1 → 4 servings'); expect(area().textContent).toContain('2 cups beans'); expect(data).toEqual(before);
    click('Apply serving changes'); expect(draft().meals).toEqual([third, { ...second, servings: 4 }, { ...first, servings: 4 }]); expect(draft().custom).toEqual(initial.custom);
    expect(data.kit_mealPrep.plans).toEqual(before.kit_mealPrep.plans); expect(data.kit_recipeBox).toEqual(before.kit_recipeBox); expect(data.kit_shopping).toEqual(before.kit_shopping);
  });
  it('cancels and invalidates preview on target/selection changes without writing', () => {
    mount(); const before = structuredClone(draft()); select(0); click('Preview serving changes'); click('Cancel serving changes'); expect(draft()).toEqual(before);
    click('Preview serving changes'); change('New servings per selected meal', '3'); expect([...area().querySelectorAll('button')].some(b => b.textContent === 'Apply serving changes')).toBe(false);
    click('Preview serving changes'); select(1); expect([...area().querySelectorAll('button')].some(b => b.textContent === 'Apply serving changes')).toBe(false); expect(draft()).toEqual(before);
  });
  it.each(['0', '-1', '101', ''])('rejects invalid target %j without writing', value => {
    mount(); select(0); const before = structuredClone(draft()); change('New servings per selected meal', value); expect(button('Preview serving changes').disabled).toBe(true); expect(area().textContent).toContain('greater than 0'); expect(draft()).toEqual(before);
  });
  it('undoes only servings, retaining later notes, schedule, recipe changes, additions and order', async () => {
    mount(); resize(); await vi.waitFor(() => expect(document.activeElement).toBe(button('Undo serving changes')));
    const next = structuredClone(draft()); next.meals.reverse(); next.meals[0].day = 'friday'; next.meals[0].meal = 'lunch'; next.meals[0].notes = 'Later note'; next.meals[0].recipeSnapshot.ingredients = '2 cups beans'; next.meals.push(meal('later', 'saturday')); refresh(next); click('Undo serving changes');
    expect(draft().meals.map(m => m.id)).toEqual(['mon', 'wed', 'sun', 'later']); expect(draft().meals[0]).toMatchObject({ servings: 2, day: 'friday', meal: 'lunch', notes: 'Later note', recipeSnapshot: { ingredients: '2 cups beans' } }); expect(draft().meals[1].servings).toBe(1);
    await vi.waitFor(() => expect(document.activeElement).toBe(area().querySelector('summary'))); expect(area().textContent).not.toContain('Your draft changed');
  });
  it.each(['changed', 'removed', 'duplicate'])('refuses the entire Undo when a selected target is %s', kind => {
    mount(); resize(); const next = structuredClone(draft()); const target = next.meals.find(m => m.id === 'mon'); if (kind === 'changed') target.servings = 5; if (kind === 'removed') next.meals = next.meals.filter(m => m !== target); if (kind === 'duplicate') next.meals.push({ ...target }); refresh(next); const before = structuredClone(draft()); click('Undo serving changes'); expect(draft()).toEqual(before); expect(host.textContent).toContain('Undo serving changes was not applied');
  });
  it('resets stale selections but retains them through an unrelated plan-name edit', () => {
    mount(); select(0); change('Plan name', 'New name'); expect(area().querySelector('input[type="checkbox"]').checked).toBe(true); click('Preview serving changes');
    const next = structuredClone(draft()); next.meals[0].notes = 'Changed'; refresh(next); expect([...area().querySelectorAll('input[type="checkbox"]')].every(b => !b.checked)).toBe(true); expect(area().textContent).toContain('Your draft changed');
  });
  it('supports numeric-zero, duplicate and ID-less rows, with exact imported Undo and missing-field restoration', () => {
    const a = meal(0, 'monday'), b = meal('same', 'tuesday'), c = meal('same', 'wednesday'), d = meal(undefined, 'thursday'); delete d.servings;
    mount({ ...initial, meals: [a, b, c, d] }); click('Select all meals for servings'); change('New servings per selected meal', '4'); click('Preview serving changes'); click('Apply serving changes'); expect(draft().meals.map(m => m.id)).toEqual([0, 'same', 'same', undefined]); click('Undo serving changes'); expect(draft().meals).toEqual([a, b, c, d]); expect(Object.hasOwn(draft().meals[3], 'servings')).toBe(false);
  });
  it('rejects ambiguous imported Undo after a later change and keeps prior Undo through a no-op', () => {
    mount(); resize(); select(0); select(1); change('New servings per selected meal', '4'); click('Preview serving changes'); click('Apply serving changes'); click('Undo serving changes'); expect(draft().meals).toEqual(initial.meals);
    mount({ ...initial, meals: [meal('same', 'monday'), meal('same', 'wednesday')] }); click('Select all meals for servings'); change('New servings per selected meal', '4'); click('Preview serving changes'); click('Apply serving changes'); const next = structuredClone(draft()); next.meals[0].notes = 'Later'; refresh(next); click('Undo serving changes'); expect(draft()).toEqual(next);
  });
  it('protects open recipe actions and refuses an invalid saved recipe atomically', () => {
    mount(); select(0); click('Preview serving changes'); click('Adapt recipe: Beans and rice on Monday'); const before = structuredClone(draft()); click('Apply serving changes'); expect(draft()).toEqual(before); expect(area().textContent).toContain('Finish or cancel');
    mount({ ...initial, meals: [first, { ...second, recipeSnapshot: { ...recipe, servings: 0 } }] }); click('Select all meals for servings'); expect(button('Preview serving changes').disabled).toBe(true); expect(draft().meals[0].servings).toBe(2);
  });
  it('edits a saved plan through its draft and retires Undo after saving or clearing', () => {
    mount(null, [initial]); click('Edit plan for week of 2026-11-02'); resize(); expect(data.kit_mealPrep.plans[0]).toEqual(initial); click('Update meal plan'); expect(data.kit_mealPrep.plans[0].meals.map(m => m.servings)).toEqual([3, 4, 4]); expect(host.querySelector('[data-nutrition-meal-servings]')).toBeNull();
  });
  it('keeps fractional counts exact and refuses selections larger than the 42-meal limit', () => {
    mount(); select(0); change('New servings per selected meal', '0.5'); click('Preview serving changes'); click('Apply serving changes'); expect(draft().meals.find(m => m.id === 'mon').servings).toBe(0.5); click('Undo serving changes'); expect(draft().meals).toEqual(initial.meals);
    mount({ ...initial, meals: Array.from({ length: 43 }, (_, index) => meal('import-' + index, 'monday')) }); const before = structuredClone(draft()); click('Select all meals for servings'); expect(button('Preview serving changes').disabled).toBe(true); expect(area().textContent).toContain('up to 42 meals'); expect(draft()).toEqual(before);
  });
});
