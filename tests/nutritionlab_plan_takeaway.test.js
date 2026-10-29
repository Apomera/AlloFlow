import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing plan takeaway source boundary: ' + start);
  return source.slice(first, last);
}
const { Takeaway, takeaway } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  function nlRecipeServings(', '  function NutritionRecipeCookMode(') +
  slice('  function nlMealPlanTakeaway(', '  // 34) PersonalMealPrepPlanner') +
  '\nreturn { Takeaway: NutritionPlanTakeaway, takeaway: nlMealPlanTakeaway };'
)(React, React.createElement, (_key, fallback) => fallback);

const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, ingredients: '1 cup beans\n1/2 cup rice\nSalt to taste', steps: '1. Simmer for 20 minutes.\n2. Serve at 180°F.', notes: 'A family recipe.' };
function seed() {
  return { id: 'week', weekOf: '2026-10-26', prepDay: 'sunday', prepTime: 0,
    meals: [
      { id: 'fri', day: 'friday', meal: 'dinner', servings: 4, recipeSnapshot: { ...recipe }, notes: 'Pack a portion.' },
      { id: 'mon-lunch', day: 'monday', meal: 'lunch', servings: 2, recipeSnapshot: { ...recipe, name: 'Lunch beans' } },
      { id: 'mon-breakfast', day: 'monday', meal: 'breakfast', servings: 1, recipeSnapshot: { ...recipe, name: 'Breakfast beans' } }
    ], monThu: 'Soup on Thursday', tuFri: 'Family dinner', weMo: 'Eat out', snacks: 'Apples\nWash the rice.' };
}

let mounted;
function mount(initialPlan) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let setPlan;
  function Host() { const state = React.useState(initialPlan); setPlan = state[1]; return React.createElement(Takeaway, { plan: state[0] }); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, replace: plan => React.act(() => setPlan(plan)) }; return mounted;
}
function button(view, label) { const found = [...view.container.querySelectorAll('button')].find(node => node.textContent === label); expect(found, label).toBeTruthy(); return found; }
function click(view, label) { React.act(() => button(view, label).click()); }
function scope(view, value) {
  const input = view.container.querySelector('[aria-label="Plan text includes"]');
  React.act(() => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('change', { bubbles: true })); });
}
function status(view) { return view.container.querySelector('[role="status"]').textContent; }

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); window.StemLab = {}; });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Nutrition weekly plan takeaway', () => {
  it('orders the entire week and includes servings, prep and all legacy notes without changing saved data', () => {
    const plan = seed(), original = structuredClone(plan), result = takeaway(plan, false);
    expect(result.text).toContain('Meal plan — week of 2026-10-26\nPrep: Sunday · 0 minutes');
    expect(result.text.indexOf('Breakfast: Breakfast beans')).toBeLessThan(result.text.indexOf('Lunch: Lunch beans'));
    expect(result.text.indexOf('Lunch: Lunch beans')).toBeLessThan(result.text.indexOf('Dinner: Beans and rice'));
    expect(result.text).toContain('Dinner: Beans and rice · 4 servings\nMeal notes: Pack a portion.');
    expect(result.text).toContain('Tuesday\nOpen');
    expect(result.text).toContain('Mon/Thu meals:\nSoup on Thursday');
    expect(result.text).toContain('Tue/Fri meals:\nFamily dinner');
    expect(result.text).toContain('Wednesday meal:\nEat out');
    expect(result.text).toContain('Snacks and prep notes:\nApples\nWash the rice.');
    expect(result.text).not.toContain('Cooking steps');
    expect(result.filename).toBe('meal-plan-2026-10-26-schedule.txt');
    expect(plan).toEqual(original);
  });

  it('exports separately scaled recipes and verbatim cooking instructions with manual amounts marked', () => {
    const result = takeaway(seed(), true);
    expect(result.text).toContain('- 2 cups beans\n- 1 cup rice');
    expect(result.text).toContain('Salt to taste (review for ×2 batch) [review amount]');
    expect(result.text).toContain('Cooking steps (as saved):\n' + recipe.steps);
    expect(result.text).toContain('Recipe notes:\nA family recipe.');
    expect(result.text.match(/Cooking steps \(as saved\):/g)).toHaveLength(3);
    expect(result.filename).toBe('meal-plan-2026-10-26-with-recipes.txt');
  });

  it('keeps unknown days and malformed entries visible instead of omitting them', () => {
    const result = takeaway({ meals: [null, { day: 'someday', meal: 'picnic', recipeSnapshot: recipe, servings: 'broken' }] }, true);
    expect(result.text).toContain('Unscheduled meals — choose a day');
    expect(result.text).toContain('Untitled recipe · servings not set');
    expect(result.text).toContain('Saved day: someday');
    expect(result.text).toContain('Picnic: Beans and rice · broken servings');
    expect(result.text).toContain('Review amounts: Enter original and planned servings');
    expect(result.text).toContain('Original ingredient text (not scaled):\n' + recipe.ingredients);
    expect(takeaway({ meals: 'broken' }, false).text).toContain('saved meal list could not be read');
    expect(takeaway(null, false).filename).toBe('meal-plan-undated-schedule.txt');
  });

  it('retains long ingredient text when safe scaling rejects it and sanitizes filenames only', () => {
    const ingredients = Array.from({ length: 501 }, (_, i) => '1 cup ingredient ' + i).join('\n');
    const plan = { weekOf: '../CON:week\\end?. ', meals: [{ recipeSnapshot: { ...recipe, ingredients }, servings: 4 }] };
    const result = takeaway(plan, true);
    expect(result.text).toContain(ingredients);
    expect(result.text).toContain('more than 500 ingredient lines');
    expect(result.text).toContain('../CON:week\\end?. ');
    expect(result.filename).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
    expect(result.filename).toMatch(/^meal-plan-.+-with-recipes\.txt$/);
  });

  it('previews and copies the selected scope after clipboard confirmation', async () => {
    const writer = vi.fn().mockResolvedValue(undefined); window.StemLab = { writeClipboard: writer };
    const plan = seed(), view = mount(plan);
    expect(view.container.querySelector('[aria-label="Plan text preview"]').textContent).not.toContain('Cooking steps');
    scope(view, 'recipes');
    expect(view.container.querySelector('[aria-label="Plan text preview"]').textContent).toContain(recipe.steps);
    await React.act(async () => button(view, 'Copy plan text').click());
    expect(writer).toHaveBeenCalledWith(takeaway(plan, true).text);
    expect(status(view)).toBe('Meal plan copied.');
    expect(plan).toEqual(seed());
  });

  it.each(['false', 'reject', 'throw'])('reports clipboard %s and leaves text available', async mode => {
    window.StemLab = { writeClipboard: mode === 'false' ? vi.fn().mockResolvedValue(false) : mode === 'reject' ? vi.fn().mockRejectedValue(new Error('blocked')) : () => { throw new Error('missing'); } };
    const view = mount(seed());
    await React.act(async () => button(view, 'Copy plan text').click());
    expect(status(view)).toContain('Clipboard copy was unavailable');
    expect(status(view)).not.toContain('copied');
    expect(button(view, 'Copy plan text').disabled).toBe(false);
    expect(view.container.querySelector('[aria-label="Plan text preview"]').textContent).toContain('Beans and rice');
  });

  it('ignores a late clipboard completion after the plan or export scope changes', async () => {
    let finish;
    window.StemLab = { writeClipboard: () => new Promise(resolve => { finish = resolve; }) };
    const view = mount(seed()); click(view, 'Copy plan text');
    expect(status(view)).toBe('Copying plan…');
    view.replace({ ...seed(), weekOf: '2026-11-02' });
    await React.act(async () => finish());
    expect(status(view)).toBe('');
    click(view, 'Copy plan text'); scope(view, 'recipes');
    await React.act(async () => finish(false));
    expect(status(view)).toBe('');
    expect(button(view, 'Copy plan text').disabled).toBe(false);
  });

  it('downloads the previewed text, removes its anchor and revokes the object URL', () => {
    vi.useFakeTimers();
    const blobs = [], names = [], revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:meal-plan'; }), revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { names.push(this.download); });
    const view = mount(seed()); scope(view, 'recipes'); click(view, 'Download plan text');
    expect(names).toEqual(['meal-plan-2026-10-26-with-recipes.txt']);
    expect(blobs[0].type).toBe('text/plain;charset=utf-8');
    expect(status(view)).toBe('Meal plan text download started.');
    expect(document.querySelector('a[download]')).toBeNull();
    React.act(() => vi.runAllTimers());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:meal-plan');
  });

  it('reports a download failure and cleans up after an anchor click throws', () => {
    vi.useFakeTimers(); const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:meal-plan', revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('blocked'); });
    const view = mount(seed()); click(view, 'Download plan text');
    expect(status(view)).toContain('download could not start');
    expect(document.querySelector('a[download]')).toBeNull();
    React.act(() => vi.runAllTimers()); expect(revokeObjectURL).toHaveBeenCalledWith('blob:meal-plan');
  });

  it('keeps a download status when an earlier clipboard request finishes', async () => {
    vi.useFakeTimers(); let finish;
    window.StemLab = { writeClipboard: () => new Promise(resolve => { finish = resolve; }) };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:meal-plan', revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const view = mount(seed()); click(view, 'Copy plan text'); click(view, 'Download plan text');
    await React.act(async () => finish());
    expect(status(view)).toBe('Meal plan text download started.');
    React.act(() => vi.runAllTimers());
  });
});
