import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing recipe source boundary: ' + start);
  return source.slice(first, last);
}
const { Box, Library, query, matches } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  var NUTRITION_KIT_RECIPE_SEED = [', '  var NUTRITION_KIT_MAINE_SEASONAL_CALENDAR') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') +
  slice('  function PersonalRecipeLibrary(', '  // 144) PersonalMaineCalendar') +
  '\nreturn { Box: PersonalRecipeBox, Library: PersonalRecipeLibrary, query: nlRecipeIngredientQuery, matches: nlRecipeIngredientMatches };'
)(React, React.createElement, (_key, fallback) => fallback);

const soup = { id: 'soup', name: 'Family soup', servings: 2, time: 20, ingredients: '1 cup broth\n1 cup beans', steps: 'Heat at 180°C for 20 minutes.', favorite: true, custom: { source: 'Family' } };
const rice = { ...soup, id: 0, name: 'Rice bowl', time: 5, ingredients: '1 cup rice\n1 carrot', favorite: false };
let mounted;
function mount(Component = Box, initialData = { recipes: [soup, rice] }) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let data, updateData;
  const writes = vi.fn();
  function Host() {
    const state = React.useState(initialData); data = state[0]; updateData = state[1];
    return React.createElement(Component, { data, recipes: data.recipes,
      setData: next => { writes(next); updateData(next); } });
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => data, writes, replace: next => React.act(() => updateData(next)) };
  return mounted;
}
function input(view, label, value) {
  const node = view.container.querySelector('[aria-label="' + label + '"]'); expect(node, label).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  React.act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function click(view, name) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name);
  expect(node, name).toBeTruthy(); React.act(() => node.click());
}
const names = view => [...view.container.querySelectorAll('article h3')].map(el => el.textContent);
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.unstubAllGlobals(); });

describe('Ingredient text matching', () => {
  it('normalizes accents, punctuation and case, with whole words and no matching across lines', () => {
    const result = matches({ name: 'Milk rice', notes: 'cream', steps: 'Add flour', ingredients: '2 tbsp CRÈME fraîche\n1 cup buttermilk\n1 cup rice\nbeans' }, query('creme fraiche\nmilk\nrice beans\nflour\ncream'));
    expect(result.matched).toEqual(['creme fraiche']);
    expect(result.missing).toEqual(['milk', 'rice beans', 'flour', 'cream']);
  });
  it('deduplicates equivalent searches, accepts twelve and rejects oversized or unreadable input', () => {
    expect(query(' Rice \nrice\nCRÈME\ncreme\n\n')).toMatchObject({ valid: true, terms: [{ text: 'Rice', key: 'rice' }, { text: 'CRÈME', key: 'creme' }] });
    expect(query(Array.from({ length: 12 }, (_, n) => 'ingredient ' + n).join('\n')).valid).toBe(true);
    expect(query(Array.from({ length: 13 }, (_, n) => 'ingredient ' + n).join('\n'))).toMatchObject({ valid: false, error: expect.stringContaining('12') });
    expect(query('a'.repeat(601)).valid).toBe(false);
    expect(query('---')).toMatchObject({ valid: false });
    expect(query({ unsafe: true }).valid).toBe(false);
    expect(query(' \n ')).toMatchObject({ valid: true, terms: [] });
  });
  it('keeps original text, amounts and malformed saved ingredient fields untouched', () => {
    const recipe = { ingredients: { saved: 'keep' } };
    expect(matches(recipe, query('rice'))).toMatchObject({ matched: [], missing: ['rice'] });
    expect(recipe).toEqual({ ingredients: { saved: 'keep' } });
    const original = structuredClone(soup);
    expect(matches(soup, query('broth\nbeans'))).toMatchObject({ matched: ['broth', 'beans'], missing: [] });
    expect(soup).toEqual(original);
  });
});

describe('Saved recipe ingredient finder', () => {
  it('requires every ingredient by default and explains partial matches when any is chosen', () => {
    const view = mount(); input(view, 'Ingredients to find (one per line)', 'broth\nrice');
    expect(names(view)).toEqual([]);
    input(view, 'Ingredient matching', 'any'); expect(names(view)).toEqual(['Family soup', 'Rice bowl']);
    const cards = view.container.querySelectorAll('article');
    expect(cards[0].textContent).toContain('Matches: broth'); expect(cards[0].textContent).toContain('No text match: rice');
    expect(cards[1].textContent).toContain('Matches: rice'); expect(cards[1].textContent).toContain('No text match: broth');
    expect(view.writes).not.toHaveBeenCalled();
  });
  it('combines search, favorites and sorting, and clears filters without changing saved recipes', () => {
    const initial = { recipes: [soup, rice], preference: 'keep' }; const view = mount(Box, initial);
    input(view, 'Ingredients to find (one per line)', 'broth\nrice'); input(view, 'Ingredient matching', 'any');
    input(view, 'Sort saved recipes', 'time'); expect(names(view)).toEqual(['Rice bowl', 'Family soup']);
    input(view, 'Show saved recipes', 'favorites'); expect(names(view)).toEqual(['Family soup']);
    input(view, 'Search my recipes', 'absent'); expect(names(view)).toEqual([]);
    click(view, 'Clear saved recipe filters'); expect(names(view)).toEqual(['Rice bowl', 'Family soup']);
    expect(view.container.querySelector('[aria-label="Ingredients to find (one per line)"]').value).toBe('');
    expect(view.container.querySelector('[aria-label="Ingredient matching"]').value).toBe('all');
    expect(view.state()).toBe(initial); expect(view.writes).not.toHaveBeenCalled();
  });
  it('preserves ingredient filters through recipe details and keeps an unsaved editor draft', () => {
    const draft = { editingId: null, form: { name: 'Unsaved dinner', ingredients: '1 cup pasta' } };
    const initial = { recipes: [soup, rice], editorDraft: draft }; const view = mount(Box, initial);
    input(view, 'Ingredients to find (one per line)', 'rice'); click(view, 'Open recipe Rice bowl');
    expect(view.container.textContent).toContain('Heat at 180°C for 20 minutes.');
    click(view, '← Back to recipe box'); expect(names(view)).toEqual(['Rice bowl']);
    expect(view.container.querySelector('[aria-label="Ingredients to find (one per line)"]').value).toBe('rice');
    expect(view.container.querySelector('[aria-label="Recipe name"]').value).toBe('Unsaved dinner');
    expect(view.state().editorDraft).toBe(draft); expect(view.writes).not.toHaveBeenCalled();
  });
  it('updates matches after a recipe edit or removal and retains irregular saved records', () => {
    const legacy = { id: 'legacy', ingredients: 'rice' }; const view = mount(Box, { recipes: [legacy, soup, rice] });
    input(view, 'Ingredients to find (one per line)', 'broth'); expect(names(view)).toEqual(['Family soup']);
    view.replace({ recipes: [legacy, { ...soup, ingredients: '1 cup rice' }, rice] }); expect(names(view)).toEqual([]);
    click(view, 'Clear ingredient searches'); expect(names(view)).toHaveLength(2);
    expect(view.state().recipes[0]).toBe(legacy); expect(view.writes).not.toHaveBeenCalled();
  });
  it('rejects too many searches visibly, recovers via clear, and exposes contextual help', () => {
    const view = mount(); input(view, 'Ingredients to find (one per line)', Array.from({ length: 13 }, (_, n) => 'item ' + n).join('\n'));
    const field = view.container.querySelector('[aria-label="Ingredients to find (one per line)"]');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(view.container.textContent).toContain('Use up to 12'); expect(names(view)).toEqual([]);
    const help = document.getElementById(field.getAttribute('aria-describedby')); expect(help?.textContent).toContain('ingredient text');
    click(view, 'Clear ingredient searches'); expect(names(view)).toHaveLength(2);
    expect(field.getAttribute('aria-invalid')).toBe('false'); expect(view.writes).not.toHaveBeenCalled();
  });
});

describe('Starter recipe ingredient finder', () => {
  it('combines ingredient, category, time and search filters and keeps them after opening a recipe', () => {
    const view = mount(Library, { recipes: [] });
    input(view, 'Ingredients to find (one per line)', 'rolled oats\nchia seeds');
    input(view, 'Recipe category', 'breakfast'); input(view, 'Recipe time', '15'); input(view, 'Search starter recipes', 'overnight');
    expect(view.container.querySelectorAll('[aria-label^="Open starter recipe "]')).toHaveLength(1);
    expect(view.container.textContent).toContain('Matches: rolled oats · chia seeds');
    click(view, 'Open starter recipe Overnight Oats'); click(view, '← Back to library');
    expect(view.container.querySelector('[aria-label="Ingredients to find (one per line)"]').value).toBe('rolled oats\nchia seeds');
    expect(view.container.querySelector('[aria-label="Recipe category"]').value).toBe('breakfast');
    expect(view.container.querySelector('[aria-label="Recipe time"]').value).toBe('15');
    expect(view.writes).not.toHaveBeenCalled();
  });
  it('explains a missing ingredient in any mode and resets every discovery filter together', () => {
    const view = mount(Library, { recipes: [] });
    input(view, 'Ingredients to find (one per line)', 'rolled oats\nunobtainium'); input(view, 'Ingredient matching', 'any');
    expect(view.container.textContent).toContain('No text match: unobtainium');
    input(view, 'Ingredient matching', 'all'); expect(view.container.querySelector('[aria-label^="Open starter recipe "]')).toBeNull();
    click(view, 'Clear recipe filters');
    expect(view.container.querySelector('[aria-label="Ingredients to find (one per line)"]').value).toBe('');
    expect(view.container.querySelector('[aria-label="Ingredient matching"]').value).toBe('all');
    expect(view.container.querySelectorAll('[aria-label^="Open starter recipe "]').length).toBeGreaterThan(1);
    expect(view.writes).not.toHaveBeenCalled();
  });
});
