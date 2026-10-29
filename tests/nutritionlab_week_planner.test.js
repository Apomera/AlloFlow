import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg, mounted;
function mountTool(prep) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'myNutritionKit', nkView: 'mealPrep', kit_mealPrep: prep } };
  let bump;
  const ctx = makeCtx({ toolData, update(section, key, value) {
    toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump();
  } });
  function Host() { const [, setTick] = React.useState(0); bump = () => setTick(n => n + 1); return cfg.render(ctx); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab.kit_mealPrep,
    update: () => React.act(() => ctx.update('nutritionLab', 'unrelated', 'kept')) };
  return mounted;
}
function button(view, name) {
  const result = [...view.container.querySelectorAll('button')].find(node => {
    const label = node.getAttribute('aria-label') || node.textContent;
    return name instanceof RegExp ? name.test(label) : label === name;
  });
  expect(result, String(name)).toBeTruthy(); return result;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function change(view, name, value) {
  const node = [...view.container.querySelectorAll('input,select,textarea')].find(node => node.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy();
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const recipe = { id: 'beans', name: 'Beans and Rice', cuisine: 'Family', time: 20, servings: 2,
  ingredients: '1 cup beans\n1/2 cup rice', steps: '1. Cook rice.\n2. Warm beans.\n3. Serve together.', tags: 'dinner', notes: 'Family favorite.' };
const meal = (id, day, slot = 'dinner') => ({ id, day, meal: slot, recipeId: 'beans', recipeSnapshot: { ...recipe, name: id }, servings: 2, notes: '' });
const plan = (date = '2026-11-02', meals = [meal('Family dinner', 'monday')]) => ({ id: 'saved-plan', weekOf: date, prepDay: 'sunday', prepTime: '60', meals, monThu: 'Family soup', snacks: 'Fruit', custom: { text: 'Preserve me' } });

beforeEach(() => { resetStemLab(); localStorage.clear(); cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab'); });
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } document.body.innerHTML = ''; });

describe('Nutrition Lab weekly planning', () => {
  it('shows meals chronologically without changing stored order or editing the wrong meal', () => {
    const meals = [meal('Friday lunch', 'friday', 'lunch'), meal('Monday dinner', 'monday'), meal('Monday breakfast', 'monday', 'breakfast')];
    const view = mountTool({ plans: [], draft: { ...plan(), meals } });
    const overview = view.container.querySelector('[aria-label="Week at a glance"]');
    expect(overview).toBeTruthy();
    expect([...overview.querySelectorAll('[data-week-day]')].map(node => node.getAttribute('data-week-day'))).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    expect([...view.container.querySelectorAll('[data-meal-id]')].map(node => node.getAttribute('data-meal-id'))).toEqual(['Monday breakfast', 'Monday dinner', 'Friday lunch']);
    expect(view.state().draft.meals.map(item => item.id)).toEqual(meals.map(item => item.id));
    change(view, 'Servings for Monday breakfast on Monday', '4');
    expect(view.state().draft.meals.map(item => item.servings)).toEqual([2, 2, '4']);
    change(view, 'Day for Friday lunch', 'tuesday');
    expect(view.state().draft.meals[0].day).toBe('tuesday');
    expect(view.state().draft.meals[1].day).toBe('monday');
  });

  it('keeps malformed days visible and repairable rather than dropping the meal', () => {
    const view = mountTool({ plans: [], draft: { ...plan(), meals: [meal('Imported lunch', 'not-a-day', 'lunch')] } });
    expect(view.container.textContent).toContain('Unscheduled meals');
    expect(view.container.textContent).toContain('Imported lunch');
    change(view, 'Day for Imported lunch', 'wednesday');
    expect(view.state().draft.meals[0].day).toBe('wednesday');
    expect(view.container.textContent).not.toContain('Unscheduled meals');
  });

  it('repeats a meal with a new identity and independent recipe snapshot', () => {
    const original = meal('Family dinner', 'monday');
    const view = mountTool({ plans: [], draft: { ...plan(), meals: [original] } });
    click(view, 'Repeat meal: Family dinner on Monday');
    const meals = view.state().draft.meals;
    expect(meals).toHaveLength(2);
    expect(meals[1].id).not.toBe(original.id);
    expect(meals[1].recipeSnapshot).toEqual(original.recipeSnapshot);
    expect(meals[1].recipeSnapshot).not.toBe(original.recipeSnapshot);
    expect(meals[0]).toEqual(original);
    view.update(); expect(view.state().draft.meals).toHaveLength(2);
  });

  it('does not repeat beyond the 42-meal plan limit', () => {
    const meals = Array.from({ length: 42 }, (_, i) => meal('Meal ' + i, 'monday'));
    const view = mountTool({ plans: [], draft: { ...plan(), meals } });
    click(view, 'Repeat meal: Meal 0 on Monday');
    expect(view.state().draft.meals).toHaveLength(42);
    expect(view.container.textContent).toContain('42');
  });

  it.each([
    ['2026-10-26', '2026-11-02'],
    ['2026-12-28', '2027-01-04'],
    ['2028-02-28', '2028-03-06']
  ])('reuses %s in %s without changing the original plan or its snapshots', (date, nextDate) => {
    const original = plan(date); const before = structuredClone(original);
    const view = mountTool({ plans: [original], setting: 'keep' });
    click(view, 'Reuse plan for next week of ' + date);
    const draft = view.state().draft;
    expect(draft.weekOf).toBe(nextDate);
    expect(draft.editingId).toBeUndefined();
    expect(draft.monThu).toBe(before.monThu);
    expect(draft.snacks).toBe(before.snacks);
    expect(draft.custom).toEqual(before.custom);
    expect(draft.meals[0].id).not.toBe(before.meals[0].id);
    expect(draft.meals[0].recipeSnapshot).toEqual(before.meals[0].recipeSnapshot);
    expect(draft.meals[0].recipeSnapshot).not.toBe(original.meals[0].recipeSnapshot);
    expect(view.state().plans).toEqual([before]);
    click(view, 'Save meal plan');
    expect(view.state().plans).toHaveLength(2);
    expect(view.state().plans[0].weekOf).toBe(nextDate);
    expect(view.state().plans[0].id).not.toBe(before.id);
    expect(view.state().plans[1]).toEqual(before);
    expect(view.state().setting).toBe('keep');
  });

  it('does not replace an in-progress draft when reusing a saved plan', () => {
    const draft = { ...plan('2026-11-16'), meals: [meal('Keep this draft', 'friday')] };
    const view = mountTool({ plans: [plan()], draft });
    const before = structuredClone(view.state().draft);
    click(view, 'Reuse plan for next week of 2026-11-02');
    expect(view.state().draft).toEqual(before);
    expect(view.container.textContent).toMatch(/save.*draft/i);
  });

  it('protects metadata-only drafts, allows explicit clearing, and never undoes over a new draft', () => {
    const view = mountTool({ plans: [plan()], draft: { weekOf: '2026-11-23', prepDay: 'sunday', prepTime: '60', meals: [] } });
    click(view, 'Reuse plan for next week of 2026-11-02');
    expect(view.state().draft.weekOf).toBe('2026-11-23');
    expect(view.state().draft.meals).toEqual([]);
    click(view, 'Clear draft');
    expect(view.state().draft).toBeNull();
    change(view, 'Week of', '2026-12-07');
    click(view, 'Undo removal');
    expect(view.state().draft.weekOf).toBe('2026-12-07');
    expect(view.container.textContent).toMatch(/save or clear/i);
    click(view, 'Clear draft');
    click(view, 'Reuse plan for next week of 2026-11-02');
    expect(view.state().draft.weekOf).toBe('2026-11-09');
    expect(view.state().draft.meals).toHaveLength(1);
    expect(view.state().plans[0].weekOf).toBe('2026-11-02');
  });

  it('rejects an invalid saved date rather than producing an invalid next week', () => {
    const view = mountTool({ plans: [plan('not-a-date')] });
    click(view, 'Reuse plan for next week of not-a-date');
    expect(view.state().draft).toBeUndefined();
    expect(view.container.textContent).not.toMatch(/NaN|Invalid Date/);
  });

  it('opens cooking with the saved recipe snapshot and planned servings', () => {
    const saved = plan(); saved.meals[0].servings = 4;
    const view = mountTool({ plans: [saved] });
    click(view, 'Start cooking: Family dinner on Monday');
    expect(view.container.textContent).toContain('Cook rice.');
    expect(view.container.textContent).toContain('2 cups beans');
    expect(view.state().plans).toEqual([saved]);
  });
});
