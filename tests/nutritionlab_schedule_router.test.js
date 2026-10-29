import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < from) throw new Error('Missing scheduling source boundary: ' + start);
  return source.slice(from, to);
}
const makePlanRecipe = new Function('section', 'upd', 'navigate', 'nl_id', 'nl_today',
  slice('  // Recipe planning helpers', '  // Cooking instructions stay verbatim') +
  slice('    function planRecipe(', '    function shoppingForPlan(') + '\nreturn planRecipe;');
const recipe = { id: 'soup', name: 'Family soup', servings: 2, time: 20,
  ingredients: '2 cups broth\n1 carrot\nSalt to taste', steps: 'Simmer at 180°C for 20 minutes.', notes: 'Family notes' };
const existingMeal = { id: 'existing', day: 'monday', meal: 'dinner', recipeSnapshot: { ...recipe }, servings: 2 };
function setup(initial = {}) {
  let prep = initial;
  const update = vi.fn((key, value) => { expect(key).toBe('kit_mealPrep'); prep = value; });
  const navigate = vi.fn();
  const plan = makePlanRecipe(() => prep, update, navigate, () => 'fixed-id', () => '2026-11-02');
  return { plan, update, navigate, state: () => prep };
}

describe('Nutrition recipe schedule router', () => {
  it('retains the legacy single-meal call while creating a usable draft', () => {
    const view = setup(); const result = view.plan(recipe, 4);
    expect(result.ok).toBe(true); expect(view.state().draft.weekOf).toBe('2026-11-02');
    expect(view.state().draft.meals[0]).toMatchObject({ day: 'monday', meal: 'dinner', servings: 4, recipeId: 'soup' });
    expect(view.navigate).toHaveBeenCalledWith('mealPrep');
  });
  it('appends selected days atomically and preserves saved plans and current draft settings', () => {
    const initial = { setting: 'keep', plans: [{ id: 'old', custom: 'saved' }], draft: { editingId: 'edit-me', weekOf: '2026-11-09', prepDay: 'saturday', prepTime: 25, snacks: 'Fruit', custom: { keep: true }, meals: [existingMeal] } };
    const before = structuredClone(initial), view = setup(initial);
    expect(view.plan(recipe, 4, { days: ['wednesday', 'friday'], meal: 'lunch', notes: 'Pack a portion' }).ok).toBe(true);
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(view.state().plans).toEqual(before.plans); expect(view.state().setting).toBe('keep');
    expect(view.state().draft).toMatchObject({ editingId: 'edit-me', weekOf: '2026-11-09', prepDay: 'saturday', prepTime: 25, snacks: 'Fruit', custom: { keep: true } });
    expect(view.state().draft.meals[0]).toBe(existingMeal);
    expect(view.state().draft.meals.slice(1).map(meal => ({ day: meal.day, meal: meal.meal, servings: meal.servings, notes: meal.notes })))
      .toEqual([{ day: 'wednesday', meal: 'lunch', servings: 4, notes: 'Pack a portion' }, { day: 'friday', meal: 'lunch', servings: 4, notes: 'Pack a portion' }]);
    expect(initial).toEqual(before);
  });
  it('creates independent snapshots and collision-safe IDs when the generator repeats', () => {
    const old = { ...existingMeal, id: 'fixed-id' }, view = setup({ draft: { meals: [old] } });
    view.plan({ ...recipe, id: 0 }, 3, { days: ['tuesday', 'thursday', 'saturday'], meal: 'dinner' });
    const meals = view.state().draft.meals;
    expect(new Set(meals.map(meal => meal.id)).size).toBe(4);
    expect(meals.slice(1).every(meal => meal.recipeId === 0)).toBe(true);
    expect(meals[1].recipeSnapshot).not.toBe(meals[2].recipeSnapshot);
    expect(meals[1].recipeSnapshot).not.toBe(recipe);
    meals[1].recipeSnapshot.ingredients = 'Edited locally';
    expect(meals[2].recipeSnapshot.ingredients).toBe(recipe.ingredients); expect(recipe.ingredients).toContain('broth');
  });
  it('allows exactly 42 entries and refuses an oversized multi-day request without partial writes', () => {
    const initial = { draft: { meals: Array.from({ length: 40 }, (_, i) => ({ ...existingMeal, id: 'meal-' + i })) } };
    const view = setup(initial);
    expect(view.plan(recipe, 2, { days: ['monday', 'tuesday', 'wednesday'], meal: 'dinner' }).ok).toBe(false);
    expect(view.state()).toBe(initial); expect(view.update).not.toHaveBeenCalled(); expect(view.navigate).not.toHaveBeenCalled();
    expect(view.plan(recipe, 2, { days: ['monday', 'tuesday'], meal: 'dinner' }).ok).toBe(true);
    expect(view.state().draft.meals).toHaveLength(42);
  });
  it.each([
    null, [], 'monday', {}, { days: [], meal: 'dinner' },
    { days: ['monday', 'monday'], meal: 'dinner' }, { days: ['Monday'], meal: 'dinner' },
    { days: ['someday'], meal: 'dinner' }, { days: ['monday'], meal: 'brunch' },
    { days: ['monday'], meal: 'dinner', notes: { malformed: true } },
    { days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'monday'], meal: 'dinner' }
  ])('rejects malformed schedules atomically: %j', schedule => {
    const initial = { draft: { meals: [existingMeal] }, custom: 'keep' }, view = setup(initial);
    expect(view.plan(recipe, 4, schedule).ok).toBe(false);
    expect(view.state()).toBe(initial); expect(view.update).not.toHaveBeenCalled(); expect(view.navigate).not.toHaveBeenCalled();
  });
  it.each([0, -2, '', 'wrong', 101])('rejects invalid servings %j before writing', servings => {
    const initial = { draft: { meals: [existingMeal] } }, view = setup(initial);
    expect(view.plan(recipe, servings, { days: ['monday'], meal: 'dinner' }).ok).toBe(false);
    expect(view.state()).toBe(initial); expect(view.update).not.toHaveBeenCalled(); expect(view.navigate).not.toHaveBeenCalled();
  });
  it.each([{ draft: [] }, { draft: 'unreadable' }, { draft: { meals: 'unreadable' } }, { draft: { meals: {} } }])('preserves malformed drafts for recovery: %j', initial => {
    const view = setup(initial);
    expect(view.plan(recipe, 2, { days: ['monday'], meal: 'dinner' }).ok).toBe(false);
    expect(view.state()).toBe(initial); expect(view.update).not.toHaveBeenCalled(); expect(view.navigate).not.toHaveBeenCalled();
  });
});
