import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const recipe = { id: 'rice', name: 'Rice bowls', servings: 2, time: 20,
  ingredients: '1 cup rice\nSalt to taste', steps: 'Cook for 20 minutes.\nPortion the rice.', notes: 'Use the large pot.' };
const makeMeal = (day, slot, servings, notes = '', changes = {}) => ({
  id: 0, recipeId: 'rice', day, meal: slot, servings, notes, recipeSnapshot: { ...recipe, ...changes }
});
const meals = [
  makeMeal('wednesday', 'lunch', 2.5, 'Pack for lunch.'),
  makeMeal('monday', 'dinner', 1, 'Use the green bowl.'),
  makeMeal('friday', 'dinner', 4, 'Separate dinner.')
];
let config, root, host, state, update;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab');
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(() => {
  React.act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
function mount(list, saved = false) {
  const plan = { name: 'Weeknight plan', weekOf: '2026-11-02', id: 'plan', meals: list };
  state = { view: 'myNutritionKit', nkView: 'mealPrep', kit_recipeBox: { recipes: [recipe] },
    kit_shopping: { lists: [{ name: 'Existing list', items: ['beans'] }] },
    kit_mealPrep: saved ? { plans: [plan] } : { plans: [], draft: plan } };
  const data = { nutritionLab: state };
  let renderAgain;
  const ctx = makeCtx({ toolData: data, update(section, key, value) {
    data[section] = state = { ...state, [key]: value }; renderAgain();
  } });
  update = (key, value) => React.act(() => ctx.update('nutritionLab', key, value));
  function Host() {
    const [, bump] = React.useState(0); renderAgain = () => bump(n => n + 1); return config.render(ctx);
  }
  React.act(() => root.render(React.createElement(Host)));
}
function batch() {
  return [...host.querySelectorAll('summary')].find(node => node.textContent === 'Cook repeated recipes together')?.parentElement;
}
function boxes() { return [...batch().querySelectorAll('input[type="checkbox"]')]; }
function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function action(parent, label) { return [...parent.querySelectorAll('button')].find(b => b.textContent === label); }
function cook() { return host.querySelector('[data-nutrition-cook-mode]'); }
function capacity(value) {
  const input = batch().querySelector('[aria-label="Maximum servings per cooking round"]');
  React.act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function round(number) { return batch().querySelector('section[aria-label^="Round ' + number + ' of "]'); }
function prepSheet() { return batch().querySelector('[data-nutrition-prep-takeaway]'); }
function sheetText() { return prepSheet().querySelector('[aria-label="Prep sheet text preview"]').textContent; }

describe('Batch cooking from the meal planner', () => {
  it.each([false, true])('cooks only selected portions in chronological order (saved plan: %s)', async saved => {
    mount(meals, saved);
    const original = structuredClone(state);
    expect(boxes().map(box => box.closest('label').textContent.split(' · ')[0])).toEqual(['Monday dinner', 'Wednesday lunch', 'Friday dinner']);
    click(batch().querySelector('summary'));
    click(boxes()[0]); expect(action(batch(), 'Start batch cooking')).toBeUndefined();
    click(boxes()[1]);
    expect(batch().textContent).toContain('2 meals · 3.5 servings to prepare');
    expect(batch().textContent).toContain('1 3/4 cups rice');
    expect(batch().textContent).toContain('Salt to taste (review for ×1 3/4 batch)');
    const trigger = action(batch(), 'Start batch cooking'); click(trigger);
    expect(document.activeElement).toBe(cook().querySelector('h2'));
    expect(cook().textContent).toContain('Monday dinner · 1 serving — Use the green bowl.');
    expect(cook().textContent).toContain('Wednesday lunch · 2.5 servings — Pack for lunch.');
    expect(cook().textContent).not.toContain('Separate dinner.');
    expect(cook().querySelector('[data-nutrition-current-step]').textContent).toBe('Cook for 20 minutes.');
    click(action(cook(), 'Mark step complete'));
    click(action(cook(), 'Leave cooking mode'));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(boxes().map(box => box.checked)).toEqual([true, true, false]);
    expect(state).toEqual(original);
  });
  it('distinguishes edited ingredients, instructions, notes and original yields even with colliding names and IDs', () => {
    mount([...meals, ...[{ ingredients: '1 cup peas' }, { steps: 'Steam instead.' }, { notes: 'Different method.' }, { servings: 4 }]
      .map(change => makeMeal('sunday', 'lunch', 1, '', change)), null, makeMeal('friday', 'dinner', 0)]);
    expect(boxes()).toHaveLength(3);
    const original = batch().querySelector('fieldset details');
    expect(original.textContent).toContain(recipe.steps);
    expect(original.textContent).not.toContain('Steam instead.');
  });
  it('starts a fresh selection after a portion changes and keeps unrelated rerenders stable', () => {
    mount(meals); click(boxes()[0]); click(boxes()[1]);
    update('otherSetting', true); expect(boxes().filter(box => box.checked)).toHaveLength(2);
    const draft = state.kit_mealPrep.draft;
    update('kit_mealPrep', { plans: [], draft: { ...draft, meals: [{ ...meals[0], servings: 3 }, ...meals.slice(1)] } });
    expect(boxes().some(box => box.checked)).toBe(false);
    expect(action(batch(), 'Start batch cooking')).toBeUndefined();
  });
  it('preserves an active checklist and portion notes when the draft is replaced', async () => {
    mount(meals); click(boxes()[0]); click(boxes()[1]); click(action(batch(), 'Start batch cooking'));
    click(action(cook(), 'Mark step complete'));
    update('kit_mealPrep', { plans: [], draft: { weekOf: '2026-11-09', meals: [] } });
    expect(cook().textContent).toContain('Wednesday lunch · 2.5 servings — Pack for lunch.');
    expect(cook().querySelector('progress').value).toBe(1);
    click(action(cook(), 'Leave cooking mode'));
    await vi.waitFor(() => expect(document.activeElement).toBe(host.querySelector('[data-nutrition-meal-planner]')));
    expect(state.kit_mealPrep.draft.meals).toEqual([]);
  });
  it('blocks an oversized batch and permits a smaller selection at exactly 100 servings', () => {
    mount([makeMeal('monday', 'dinner', '60'), makeMeal('tuesday', 'dinner', '40'), makeMeal('thursday', 'dinner', '.25')]);
    boxes().forEach(click);
    expect(batch().textContent).toContain('over 100 servings');
    expect(action(batch(), 'Start batch cooking')).toBeUndefined();
    click(boxes()[2]);
    expect(batch().textContent).toContain('2 meals · 100 servings');
    click(action(batch(), 'Start batch cooking')); expect(cook().textContent).toContain('50 cups rice');
  });
  it('omits the batch action when only one usable meal has the recipe', () => {
    mount([meals[0], makeMeal('monday', 'lunch', 0), makeMeal('unscheduled', 'dinner', 1), { notes: 'Freeform plan' }]);
    expect(batch()).toBeUndefined();
    expect(host.querySelector('button[aria-label="Start cooking: Rice bowls on Wednesday"]')).toBeTruthy();
  });
  it('previews each round and opens guided cooking with just its ingredients, portions and original instructions', async () => {
    mount(meals, true); const before = structuredClone(state);
    boxes().forEach(click); capacity('4');
    expect(batch().textContent).toContain('7.5 servings to prepare in 2 rounds');
    expect(round(1).textContent).toContain('1 3/4 cups rice');
    expect(round(1).textContent).toContain('Wednesday lunch · 2.5 servings — Pack for lunch.');
    expect(round(2).textContent).toContain('2 cups rice');
    const trigger = action(round(2), 'Start cooking round 2'); click(trigger);
    expect(cook().textContent).toContain('Round 2 of 2 · Portions for your meals');
    expect(cook().textContent).toContain('Friday dinner · 4 servings — Separate dinner.');
    expect(cook().textContent).not.toContain('Pack for lunch.');
    expect(cook().textContent).toContain('Salt to taste (review for ×2 batch)');
    expect(cook().querySelector('[data-nutrition-current-step]').textContent).toBe('Cook for 20 minutes.');
    click(action(cook(), 'Leave cooking mode'));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(batch().textContent).toContain('0 of 2 rounds prepared');
    expect(state).toEqual(before);
  });
  it('keeps marks for the same rounds, lets the cook undo them, and resets marks when the portions are regrouped', () => {
    mount(meals); boxes().forEach(click); capacity('4');
    const mark = () => action(round(2), 'Mark round 2 prepared');
    click(mark()); update('otherSetting', true);
    expect(mark().getAttribute('aria-pressed')).toBe('true');
    expect(batch().textContent).toContain('1 of 2 rounds prepared');
    capacity('5'); expect(mark().getAttribute('aria-pressed')).toBe('true');
    click(mark()); expect(batch().textContent).toContain('0 of 2 rounds prepared');
    click(mark()); click(boxes()[0]);
    expect(batch().textContent).toContain('0 of 2 rounds prepared');
    expect(mark().getAttribute('aria-pressed')).toBe('false');
    capacity(''); expect(round(1)).toBeNull();
    expect(action(batch(), 'Start batch cooking')).toBeTruthy();
  });
  it('explains invalid limits and supports totals over 100 by cooking whole meals in valid rounds', () => {
    mount([makeMeal('monday', 'dinner', 60), makeMeal('tuesday', 'lunch', 60)]);
    boxes().forEach(click); expect(batch().textContent).toContain('over 100 servings');
    capacity('100'); expect(batch().textContent).toContain('120 servings to prepare in 2 rounds');
    for (const value of ['0', '-1', '101', 'abc']) {
      capacity(value); expect(batch().textContent).toContain('Enter a round limit');
      expect(round(1)).toBeNull(); expect(action(batch(), 'Start batch cooking')).toBeUndefined();
    }
    capacity('40'); expect(batch().textContent).toContain('Monday dinner · 60 servings exceeds your limit');
    expect(round(1)).toBeNull();
    capacity('60'); expect(round(2).textContent).toContain('Tuesday lunch · 60 servings');
  });
  it('fits decimal portions at the exact capacity and keeps a real excess in a separate round', () => {
    mount([makeMeal('monday', 'dinner', '.1'), makeMeal('tuesday', 'dinner', '.2'), makeMeal('wednesday', 'dinner', '.3')]);
    boxes().forEach(click); capacity('0.3');
    expect(round(1).textContent).toContain('Round 1 of 2 · 0.3 servings');
    expect(round(1).textContent).toContain('Tuesday dinner · 0.2 servings');
    update('kit_mealPrep', { plans: [], draft: { ...state.kit_mealPrep.draft, meals: [makeMeal('monday', 'dinner', 50.00000000000001), makeMeal('tuesday', 'dinner', 50)] } });
    boxes().forEach(click); expect(batch().textContent).toContain('over 100 servings');
    capacity('100'); expect(round(2).textContent).toContain('Tuesday dinner · 50 servings');
  });
  it('exports only the chosen meals, exact saved instructions, review amounts and current prepared marks with the plan date', () => {
    mount(meals, true); const before = structuredClone(state);
    boxes().forEach(click); capacity('4');
    click(action(round(2), 'Mark round 2 prepared'));
    const text = sheetText();
    expect(text).toContain('Prep sheet — Rice bowls\nMeal plan: Weeknight plan\nWeek of: 2026-11-02\n2 cooking rounds');
    expect(text).toContain('Round 1 of 2 · [ ] To prepare');
    expect(text).toContain('Round 2 of 2 · [x] Prepared');
    expect(text).toContain('Monday dinner · 1 serving\n  Meal notes: Use the green bowl.');
    expect(text).toContain('Wednesday lunch · 2.5 servings\n  Meal notes: Pack for lunch.');
    expect(text).toContain('Ingredients for 3.5 servings:\n- 1 3/4 cups rice');
    expect(text).toContain('Ingredients for 4 servings:\n- 2 cups rice');
    expect(text).toContain('Salt to taste (review for ×2 batch) [review amount]');
    expect(text.split('Cooking steps (as saved):\n' + recipe.steps)).toHaveLength(3);
    expect(text).toContain('Recipe notes:\n' + recipe.notes);
    expect(state).toEqual(before);
    click(boxes()[2]);
    expect(sheetText()).not.toContain('Separate dinner.');
    expect(sheetText()).toContain('1 cooking round');
    expect(sheetText()).not.toContain('[x] Prepared');
  });
  it('copies the current prep sheet only after confirmation and keeps a text fallback on failure', async () => {
    const writer = vi.fn().mockResolvedValue(undefined); window.StemLab.writeClipboard = writer;
    mount(meals); boxes().forEach(click); capacity('4');
    const text = sheetText();
    await React.act(async () => action(prepSheet(), 'Copy prep sheet text').click());
    expect(writer).toHaveBeenCalledWith(text);
    expect(prepSheet().querySelector('[role="status"]').textContent).toBe('Prep sheet copied.');
    writer.mockResolvedValue(false);
    await React.act(async () => action(prepSheet(), 'Copy prep sheet text').click());
    expect(prepSheet().querySelector('[role="status"]').textContent).toContain('Clipboard copy was unavailable');
    expect(action(prepSheet(), 'Copy prep sheet text').disabled).toBe(false);
    expect(sheetText()).toBe(text);
  });
  it('retires pending copy results when a mark or plan metadata changes', async () => {
    let finish; window.StemLab.writeClipboard = () => new Promise(resolve => { finish = resolve; });
    mount(meals); boxes().forEach(click); capacity('4');
    click(action(prepSheet(), 'Copy prep sheet text'));
    click(action(round(2), 'Mark round 2 prepared'));
    await React.act(async () => finish());
    expect(prepSheet().querySelector('[role="status"]').textContent).toBe('');
    expect(sheetText()).toContain('[x] Prepared');
    click(action(prepSheet(), 'Copy prep sheet text'));
    const prep = state.kit_mealPrep;
    update('kit_mealPrep', { ...prep, draft: { ...prep.draft, name: 'Changed plan name' } });
    await React.act(async () => finish());
    expect(prepSheet().querySelector('[role="status"]').textContent).toBe('');
    expect(sheetText()).toContain('Meal plan: Changed plan name');
    expect(sheetText()).toContain('[x] Prepared');
  });
  it('starts fresh selections and prepared marks when another draft has the same meals and week', () => {
    mount(meals); boxes().forEach(click); capacity('4');
    click(action(round(2), 'Mark round 2 prepared'));
    const prep = state.kit_mealPrep;
    update('kit_mealPrep', { ...prep, draft: { ...prep.draft, id: 'different-plan' } });
    expect(prepSheet()).toBeNull();
    expect(boxes().every(input => !input.checked)).toBe(true);
    boxes().forEach(click); capacity('4');
    expect(sheetText()).not.toContain('[x] Prepared');
  });
  it('downloads the exact shown sheet with a safe filename and cleans up the URL and anchor', async () => {
    const exports = [], revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: blob => { exports.push({ blob }); return 'blob:prep-sheet'; }, revokeObjectURL: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { exports.at(-1).filename = this.download; });
    mount([makeMeal('monday', 'dinner', 2, '', { name: 'Rice:/bowls?' }), makeMeal('wednesday', 'lunch', 1, '', { name: 'Rice:/bowls?' })]);
    boxes().forEach(click); capacity('2');
    const expected = sheetText();
    expect(expected).toContain('Preparing: 1 serving\n');
    expect(expected).toContain('Ingredients for 1 serving:\n');
    click(action(prepSheet(), 'Download prep sheet text'));
    expect(exports).toHaveLength(1);
    expect(exports[0].filename).toBe('prep-sheet-Rice--bowls-.txt');
    expect(exports[0].blob.type).toBe('text/plain;charset=utf-8');
    const contents = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(exports[0].blob); });
    expect(contents).toBe(expected);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(prepSheet().querySelector('[role="status"]').textContent).toBe('Prep sheet text download started.');
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:prep-sheet'), { timeout: 2000 });
  });
  it('keeps imported duplicate-ID cards distinct and retains the focused unique card when another meal is removed', () => {
    const warnings = vi.spyOn(console, 'error');
    const duplicate = { ...meals[0], id: 'same' };
    mount([duplicate, { ...meals[1], id: 'same' }, { ...meals[2], id: 'unique' }]);
    const findFriday = () => host.querySelector('input[aria-label="Servings for Rice bowls on Friday"]');
    const friday = findFriday(); friday.focus();
    const draft = state.kit_mealPrep.draft;
    update('kit_mealPrep', { plans: [], draft: { ...draft, meals: draft.meals.slice(1) } });
    expect(host.querySelectorAll('[data-meal-id="same"]')).toHaveLength(1);
    expect(document.activeElement).toBe(friday);
    expect(findFriday()).toBe(friday);
    expect(warnings.mock.calls.flat().join(' ')).not.toMatch(/same key/);
  });
});
