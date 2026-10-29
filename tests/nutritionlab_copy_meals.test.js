import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing meal copy source boundary: ' + start);
  return source.slice(first, last);
}
const { Copy, select, destination } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  function nlRecipeServings(', '  function NutritionRecipeCookMode(') +
  slice('  // Copying selected planned meals', '  // 34) PersonalMealPrepPlanner') +
  '\nreturn { Copy: NutritionPlanMealCopy, select: nlMealCopySelection, destination: nlMealCopyDraftStatus };'
)(React, React.createElement, (_key, fallback) => fallback);
const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, ingredients: '1 cup beans\n1/2 cup rice', steps: 'Cook rice.\nWarm beans.' };
function plan() { return { id: 'source', weekOf: '2026-11-02', custom: { keep: true }, meals: [
  { id: 'friday', day: 'friday', meal: 'dinner', servings: 4, notes: 'Pack a portion', recipeSnapshot: { ...recipe }, custom: { saved: true } },
  { id: 'monday', day: 'monday', meal: 'lunch', servings: 2, notes: 'School lunch', recipeSnapshot: { ...recipe, name: 'Lunch beans' } }
] }; }
let mounted;
function mount(saved = plan(), draft = { weekOf: '2026-11-09', meals: [] }, callback = vi.fn().mockReturnValue({ ok: true, message: 'Copied to draft.' })) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let replace;
  function Host() {
    const state = React.useState({ plan: saved, draft }); replace = state[1];
    return React.createElement(Copy, { ...state[0], onCopyMeals: callback });
  }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, callback, replace: value => React.act(() => replace(value)) }; return mounted;
}
function button(view, name) { const node = [...view.container.querySelectorAll('button')].find(el => el.textContent === name); expect(node, name).toBeTruthy(); return node; }
function click(view, name) { React.act(() => button(view, name).click()); }
function checkbox(view, index) { return [...view.container.querySelectorAll('input[type="checkbox"]')].find(el => el.getAttribute('aria-label').startsWith('Copy meal ' + (index + 1) + ':')); }
function toggle(view, index) { React.act(() => checkbox(view, index).click()); }
function status(view) { return view.container.querySelector('[role="status"]').textContent; }
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Copying selected meals to an existing draft', () => {
  it('deep-copies only selected meal snapshots and preserves their custom data and source context', () => {
    const original = plan(), before = structuredClone(original), result = select(original, [0]);
    expect(result.error).toBe(''); expect(result.context).toEqual({ sourcePlanId: 'source', sourceWeekOf: '2026-11-02' });
    expect(result.meals).toEqual([original.meals[0]]); expect(result.meals[0]).not.toBe(original.meals[0]);
    result.meals[0].recipeSnapshot.steps = 'New steps'; result.meals[0].custom.saved = false;
    expect(original).toEqual(before);
  });
  it('deduplicates indexes and keeps duplicate or missing meal identities independent', () => {
    const original = plan(); original.id = 0; original.meals[1].id = original.meals[0].id;
    expect(select(original, [1, 0, 1]).meals.map(meal => meal.recipeSnapshot.name)).toEqual(['Beans and rice', 'Lunch beans']);
    expect(select(original, [1]).context.sourcePlanId).toBe(0);
    delete original.meals[1].id; expect(select(original, [1]).meals[0].id).toBeUndefined();
  });
  it('refuses malformed selections, oversized batches, and uncopyable selected data without mutation', () => {
    const saved = plan();
    for (const indexes of [[], [-1], [2], [0.5], ['0'], null]) expect(select(saved, indexes).meals).toBeNull();
    expect(select({ meals: 'bad' }, [0]).error).toContain('readable');
    const huge = { meals: Array.from({ length: 43 }, () => saved.meals[0]) };
    expect(select(huge, huge.meals.map((_, i) => i)).error).toContain('42');
    expect(select(huge, [42]).meals).toHaveLength(1);
    const circular = plan(); circular.meals[0].custom.self = circular;
    expect(select(circular, [0]).error).toContain('could not be copied');
    expect(saved).toEqual(plan());
  });
  it.each(['day', 'slot', 'servings', 'recipe', 'null'])('rejects a whole selection with one invalid %s entry', kind => {
    const saved = plan();
    if (kind === 'day') saved.meals[1].day = 'someday';
    if (kind === 'slot') saved.meals[1].meal = 'brunch';
    if (kind === 'servings') saved.meals[1].servings = 0;
    if (kind === 'recipe') saved.meals[1].recipeSnapshot.servings = 0;
    if (kind === 'null') saved.meals[1] = null;
    expect(select(saved, [0, 1]).meals).toBeNull();
    expect(select(saved, [0]).meals).toHaveLength(1);
  });
  it('describes remaining space and rejects unreadable destinations', () => {
    expect(destination(null)).toMatchObject({ valid: true, remaining: 42 });
    expect(destination({ weekOf: '2026-12-07', meals: [plan().meals[0]] })).toMatchObject({ valid: true, remaining: 41, week: '2026-12-07' });
    expect(destination({ meals: Array(45).fill(null) }).remaining).toBe(0);
    for (const draft of ['bad', [], 0, { meals: {} }, { meals: 'bad' }]) expect(destination(draft).valid).toBe(false);
  });
  it('starts unselected and shows meals chronologically with a destination week', () => {
    const view = mount();
    expect([...view.container.querySelectorAll('input[type="checkbox"]')].map(el => el.getAttribute('aria-label'))).toEqual([
      'Copy meal 2: Monday · Lunch · Lunch beans · 2 servings', 'Copy meal 1: Friday · Dinner · Beans and rice · 4 servings'
    ]);
    expect([...view.container.querySelectorAll('input[type="checkbox"]')].every(el => !el.checked)).toBe(true);
    expect(view.container.querySelector('[aria-label="Meal copy destination"]').textContent).toContain('2026-11-09');
    expect(button(view, 'Copy selected meals to draft').disabled).toBe(true);
    click(view, 'Copy selected meals to draft'); expect(view.callback).not.toHaveBeenCalled();
  });
  it('copies the selected original index and clears selection only after confirmed success', () => {
    const saved = plan(), before = structuredClone(saved), view = mount(saved);
    toggle(view, 1); click(view, 'Copy selected meals to draft');
    expect(view.callback).toHaveBeenCalledTimes(1);
    expect(view.callback.mock.calls[0][0]).toEqual([saved.meals[1]]);
    expect(view.callback.mock.calls[0][0][0]).not.toBe(saved.meals[1]);
    expect(view.callback.mock.calls[0][1]).toEqual({ sourcePlanId: 'source', sourceWeekOf: '2026-11-02' });
    expect(checkbox(view, 1).checked).toBe(false); expect(status(view)).toBe('Copied to draft.'); expect(saved).toEqual(before);
  });
  it('preserves selection through equivalent source clones and unrelated draft edits', () => {
    const saved = plan(), view = mount(saved); toggle(view, 0);
    view.replace({ plan: { ...structuredClone(saved), custom: { changed: true } }, draft: { weekOf: '2026-11-16', notes: 'Updated', meals: [] } });
    expect(checkbox(view, 0).checked).toBe(true);
    expect(view.container.querySelector('[aria-label="Meal copy destination"]').textContent).toContain('2026-11-16');
    click(view, 'Copy selected meals to draft'); expect(view.callback.mock.calls[0][0][0].day).toBe('friday');
  });
  it.each(['reorder', 'amount', 'identity', 'date'])('clears selection after the source plan %s changes', kind => {
    const saved = plan(), view = mount(saved); toggle(view, 0); const changed = structuredClone(saved);
    if (kind === 'reorder') changed.meals.reverse();
    if (kind === 'amount') changed.meals[0].servings = 5;
    if (kind === 'identity') changed.id = 'another-plan';
    if (kind === 'date') changed.weekOf = '2026-12-07';
    view.replace({ plan: changed, draft: null });
    expect([...view.container.querySelectorAll('input[type="checkbox"]')].every(el => !el.checked)).toBe(true);
    expect(status(view)).toContain('This saved plan changed');
    click(view, 'Copy selected meals to draft'); expect(view.callback).not.toHaveBeenCalled();
  });
  it('does not redirect duplicate-ID selection after removing the selected source meal', () => {
    const saved = plan(); saved.meals[1].id = saved.meals[0].id;
    const view = mount(saved); toggle(view, 1);
    view.replace({ plan: { ...saved, meals: [saved.meals[0]] }, draft: null });
    expect(checkbox(view, 0).checked).toBe(false);
    click(view, 'Copy selected meals to draft'); expect(view.callback).not.toHaveBeenCalled();
  });
  it('blocks an oversized selection atomically while allowing a smaller one', () => {
    const saved = plan(), view = mount(saved, { weekOf: '2026-11-09', meals: Array.from({ length: 41 }, () => saved.meals[0]) });
    click(view, 'Select all meals'); expect(button(view, 'Copy selected meals to draft').disabled).toBe(true);
    expect(view.container.textContent).toContain('exceeds the available space');
    click(view, 'Copy selected meals to draft'); expect(view.callback).not.toHaveBeenCalled();
    toggle(view, 0); click(view, 'Copy selected meals to draft'); expect(view.callback.mock.calls[0][0]).toHaveLength(1);
  });
  it('shows unreadable destination and empty source states without modifying data', () => {
    const saved = plan(), view = mount(saved, { meals: 'legacy data' });
    toggle(view, 0); expect(view.container.textContent).toContain('current draft could not be read');
    click(view, 'Copy selected meals to draft'); expect(view.callback).not.toHaveBeenCalled();
    view.replace({ plan: { meals: [] }, draft: null }); expect(view.container.textContent).toContain('no recipe meals to copy');
    view.replace({ plan: { meals: 'bad' }, draft: null }); expect(view.container.textContent).toContain('saved meal list could not be read');
  });
  it('keeps selection on failed, unavailable, throwing or unconfirmed callbacks', () => {
    const callback = vi.fn().mockReturnValueOnce({ ok: false, message: 'No room left.' }).mockImplementationOnce(() => { throw new Error('failed'); }).mockReturnValueOnce(undefined);
    const view = mount(plan(), null, callback); toggle(view, 0);
    click(view, 'Copy selected meals to draft'); expect(status(view)).toBe('No room left.'); expect(checkbox(view, 0).checked).toBe(true);
    click(view, 'Copy selected meals to draft'); expect(status(view)).toContain('could not be confirmed');
    click(view, 'Copy selected meals to draft'); expect(status(view)).toContain('could not be confirmed'); expect(checkbox(view, 0).checked).toBe(true);
  });
  it('blocks repeated synchronous clicks in the same render batch', () => {
    const view = mount(); toggle(view, 0); const submit = button(view, 'Copy selected meals to draft');
    React.act(() => { submit.click(); submit.click(); });
    expect(view.callback).toHaveBeenCalledTimes(1);
    toggle(view, 0); click(view, 'Copy selected meals to draft'); expect(view.callback).toHaveBeenCalledTimes(2);
  });
  it('ignores an asynchronous result after the source selection changes', async () => {
    let finish; const callback = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const saved = plan(), view = mount(saved, null, callback); toggle(view, 0); click(view, 'Copy selected meals to draft');
    expect(button(view, 'Copying meals…').disabled).toBe(true);
    view.replace({ plan: { ...saved, weekOf: '2026-11-16' }, draft: null });
    await React.act(async () => finish({ ok: true, message: 'Old selection copied.' }));
    expect(status(view)).toContain('This saved plan changed'); expect(status(view)).not.toContain('Old selection copied');
    expect(checkbox(view, 0).checked).toBe(false);
  });
});
