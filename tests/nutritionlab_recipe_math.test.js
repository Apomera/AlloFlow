import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
const start = source.indexOf('// Recipe planning helpers');
const end = source.indexOf('// 31) PersonalRecipeBox', start);
if (start < 0 || end < start) throw new Error('Recipe helpers not found');
const { snapshot, scale, shopping } = new Function(source.slice(start, end) +
  '\nreturn { snapshot: nlRecipeSnapshot, scale: nlRecipeScale, shopping: nlPlanShoppingItems };')();

const recipe = (ingredients, extra = {}) => ({ id: 'recipe', name: 'Test recipe', servings: 2, ingredients, steps: 'Bake at 200°C for 15 minutes.', ...extra });
const meal = (id, ingredients, extra = {}) => ({ id, servings: 2, recipeSnapshot: recipe(ingredients, extra) });

describe('Nutrition Lab recipe snapshots', () => {
  it('copies known scalar fields without sharing nested objects or rewriting recipe instructions', () => {
    const original = recipe('1 cup oats', { time: 15, sourceRecipeId: 'oats', notes: 'Family notes', custom: { keep: true } });
    const before = structuredClone(original);
    const saved = snapshot(original);
    expect(saved).toMatchObject({ servings: 2, time: 15, ingredients: '1 cup oats', steps: original.steps, sourceRecipeId: 'oats' });
    saved.ingredients = 'Changed snapshot';
    expect(original).toEqual(before);
    expect(saved).not.toHaveProperty('custom');
  });

  it.each([null, [], true, 'recipe', { name: {}, ingredients: [], servings: '2junk', steps: {} }])('normalizes malformed recipe fields without guessing servings: %j', value => {
    expect(snapshot(value)).toMatchObject({ name: 'Untitled recipe', ingredients: '', servings: null, steps: '' });
  });

  it('accepts numeric-string servings while keeping missing servings unknown', () => {
    expect(snapshot(recipe('', { servings: '2.5' })).servings).toBe(2.5);
    expect(snapshot(recipe('', { servings: undefined })).servings).toBeNull();
  });
});

describe('Nutrition Lab ingredient scaling', () => {
  it.each([
    ['1/2 cup oats', 1, 'cup', 'oats', '1 cup oats'],
    ['1 1/2 cups oats', 3, 'cup', 'oats', '3 cups oats'],
    ['1½ cups oats', 3, 'cup', 'oats', '3 cups oats'],
    ['½ cup milk', 1, 'cup', 'milk', '1 cup milk'],
    ['.25 tsp cinnamon', 0.5, 'tsp', 'cinnamon', '1/2 tsp cinnamon'],
    ['1.5 tablespoons oil', 3, 'tbsp', 'oil', '3 tbsp oil'],
    ['200g flour', 400, 'g', 'flour', '400 g flour'],
    ['2 eggs', 4, '', 'eggs', '4 eggs'],
    ['⅓ cup rice', 2 / 3, 'cup', 'rice', '2/3 cup rice'],
    ['2 cloves garlic minced', 4, 'clove', 'garlic minced', '4 cloves garlic minced'],
  ])('scales a clear leading amount in %s', (line, quantity, unit, ingredient, text) => {
    const result = scale(recipe(line), 4);
    expect(result.valid).toBe(true);
    expect(result.factor).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ quantity, unit, ingredient, text, manual: false });
  });

  it.each(['Salt + pepper', 'Optional: chicken/tofu', '1-2 onions', '1–2 onions', '1 to 2 cups broth', '1 or 2 eggs',
    '½–¾ cup milk', '1/0 cup milk', '1/2/3 cup milk', '1.2.3 cup milk', '1 3/2 cups oats', '-1 cup milk', '2eggs', '1 14-oz can beans', '2',
    '1 cup or 2 tbsp oil', '1 tbsp plus 1 tsp oil', '1 cup - 2 cups milk',
    '1 T salt', '1 t salt', '1 c milk', '1 fl oz milk', '1 fl. oz. milk', '1 fluid ounce milk',
    '1 cup (240 ml) milk', '1 cup/240ml milk', '1 cup(240ml) milk'])('preserves ambiguous quantity text in %s', line => {
    const result = scale(recipe(line), 4);
    expect(result.valid).toBe(true);
    expect(result.items[0]).toMatchObject({ quantity: null, unit: '', ingredient: line, manual: true });
    expect(result.items[0].text).toBe(line + ' (review for ×2 batch)');
    expect(scale(recipe(line), 2).items[0].text).toBe(line);
  });

  it.each([0, -1, 101, Infinity, NaN, null, '', {}, [], true, '2people', '1/2'])('rejects invalid target or original servings instead of inventing a multiplier: %j', servings => {
    expect(scale(recipe('1 cup oats'), servings)).toMatchObject({ valid: false, items: [] });
    expect(scale(recipe('1 cup oats', { servings }), 2)).toMatchObject({ valid: false, items: [] });
  });

  it('supports fractional servings and never changes steps or the original ingredients', () => {
    const original = recipe('1 cup oats\n\nSalt to taste\r\n1 tsp honey');
    const before = structuredClone(original);
    const result = scale(original, 0.25);
    expect(result.items).toHaveLength(3);
    expect(result.factor).toBe(0.125);
    expect(result.items[0].quantity).toBe(0.125);
    expect(original).toEqual(before);
    expect(result).not.toHaveProperty('steps');
  });

  it('scales package counts without changing the printed size of each package', () => {
    const result = scale(recipe('2 cans (15 oz each) tomatoes'), 4);
    expect(result.items[0]).toEqual({ quantity: 4, unit: 'can', ingredient: '(15 oz each) tomatoes', text: '4 cans (15 oz each) tomatoes', manual: false });
  });

  it('returns an empty valid list for empty ingredients, but reports an oversized recipe without truncation', () => {
    expect(scale(recipe(''), 2)).toMatchObject({ valid: true, items: [] });
    const excessive = scale(recipe(Array(501).fill('1 cup oats').join('\n')), 2);
    expect(excessive).toMatchObject({ valid: false, items: [] });
    expect(excessive.error).toContain('500');
  });
});

describe('Nutrition Lab shopping quantities', () => {
  it('combines only exact normalized ingredients with compatible units and keeps recipe sources', () => {
    const meals = [
      meal('a', '1 cup oats\n1 tbsp olive oil\nSalt to taste', { name: 'Breakfast' }),
      meal('b', '2 cups Oats\n2 tablespoons olive oil\n1 g oats\n1 cup rolled oats\nSalt to taste', { name: 'Snack' }),
    ];
    const before = structuredClone(meals);
    const result = shopping(meals);
    expect(result.items).toHaveLength(6);
    const oats = result.items.find(item => item.unit === 'cup' && item.ingredient === 'oats');
    expect(oats).toMatchObject({ text: '3 cups oats', quantity: 3, done: false, manual: false, sources: ['Breakfast', 'Snack'] });
    expect(result.items.find(item => item.unit === 'tbsp')).toMatchObject({ text: '3 tbsp olive oil', quantity: 3 });
    expect(result.items.filter(item => item.manual)).toHaveLength(2);
    expect(result.warnings).toHaveLength(2);
    expect(meals).toEqual(before);
  });

  it('counts repeated meals, scales planned servings, and produces stable unique IDs', () => {
    const meals = [meal('a', '1 cup oats'), { ...meal('b', '1 cup oats'), servings: 4 }];
    const first = shopping(meals);
    expect(first.items).toHaveLength(1);
    expect(first.items[0].quantity).toBe(3);
    expect(first.items[0].sources).toEqual(['Test recipe']);
    expect(shopping(meals)).toEqual(first);
    const changed = shopping([{ ...meals[0], servings: 3 }]);
    expect(changed.items[0].id).toBe(first.items[0].id);
    expect(changed.items[0].done).toBe(false);
  });

  it('warns about malformed, empty, or unscalable meals without silently adding quantities', () => {
    expect(shopping(null)).toMatchObject({ items: [], warnings: [expect.any(String)] });
    const result = shopping([null, meal('empty', ''), { ...meal('bad', '1 cup oats'), servings: -1 }]);
    expect(result.items).toEqual([]);
    expect(result.warnings).toHaveLength(3);
    expect(shopping(Array(43).fill(meal('a', '1 cup oats')))).toMatchObject({ items: [], warnings: [expect.stringContaining('42')] });
  });

  it('does not use object prototype keys as ingredient lookup storage', () => {
    const result = shopping([meal('a', '1 cup __proto__\n2 cup constructor'), meal('b', '1 cup __proto__')]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].quantity).toBe(2);
    expect(new Set(result.items.map(item => item.id)).size).toBe(2);
  });

  it('keeps unusual imported text without failing while creating item IDs', () => {
    const result = shopping([meal('a', '1 cup flour\ud800\nSalt\ud800')]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].ingredient).toBe('flour\ud800');
    expect(result.items[1].ingredient).toBe('Salt\ud800');
    expect(new Set(result.items.map(item => item.id)).size).toBe(2);
  });

  it('never merges ambiguous case-sensitive tablespoon/teaspoon shorthand', () => {
    const result = shopping([meal('a', '1 T salt'), meal('b', '1 t salt')]);
    expect(result.items).toHaveLength(2);
    expect(result.items.every(item => item.manual && item.quantity === null)).toBe(true);
    expect(result.items.map(item => item.text)).toEqual(['1 T salt', '1 t salt']);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
