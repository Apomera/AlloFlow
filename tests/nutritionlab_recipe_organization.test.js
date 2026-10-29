import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing recipe source boundary: ' + start);
  return source.slice(first, last);
}
const Box = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') +
  '\nreturn PersonalRecipeBox;'
)(React, React.createElement, (_key, fallback) => fallback);

let mounted;
function mount(initialData = {}, extra = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let data = initialData, updateData;
  function Host() {
    const state = React.useState(initialData); data = state[0]; updateData = state[1];
    return React.createElement(Box, { data, setData: updateData, ...extra });
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => data, replace: value => React.act(() => updateData(value)) };
  return mounted;
}
function button(view, name) {
  const found = [...view.container.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent) === name);
  expect(found, name).toBeTruthy(); return found;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function input(view, name, value) {
  const node = [...view.container.querySelectorAll('input,textarea,select')].find(el => el.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  React.act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function names(view) { return [...view.container.querySelectorAll('article h3')].map(el => el.textContent); }
const soup = { id: 'soup', name: 'Family soup', date: '2026-10-10', time: 25, servings: 2, ingredients: '1 cup broth\n1/2 onion', steps: 'Simmer 20 minutes.', tags: 'dinner, family', notes: 'Keep this note.', customField: { source: 'Grandma' }, sourceRecipeId: 'starter-soup' };
const rice = { ...soup, id: 'rice', name: 'Rice bowl', time: 15, date: '2026-10-15', ingredients: '1 cup rice' };

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Recipe Box organization', () => {
  it('persists favorites immutably while preserving unknown records and section settings', () => {
    const legacy = { legacy: 'keep' };
    const view = mount({ recipes: [soup, legacy, rice], preference: 'family' });
    click(view, 'Favorite recipe Family soup');
    expect(view.state().recipes[0]).toMatchObject({ id: 'soup', favorite: true, customField: soup.customField, sourceRecipeId: 'starter-soup' });
    expect(soup.favorite).toBeUndefined();
    expect(view.state().recipes[1]).toBe(legacy);
    expect(view.state().recipes[2]).toBe(rice);
    expect(view.state().preference).toBe('family');
    expect(button(view, 'Favorite recipe Family soup').getAttribute('aria-pressed')).toBe('true');
    click(view, 'Open recipe Family soup');
    expect(button(view, 'Favorite recipe Family soup').getAttribute('aria-pressed')).toBe('true');
    click(view, 'Favorite recipe Family soup');
    expect(view.state().recipes[0].favorite).toBe(false);
    expect(view.container.textContent).toContain('removed from favorites');
  });

  it('combines favorites with search and restores focus when unfavoriting hides the row', () => {
    vi.useFakeTimers();
    const view = mount({ recipes: [{ ...soup, favorite: true }, { ...rice, favorite: true }] });
    input(view, 'Show saved recipes', 'favorites'); input(view, 'Search my recipes', 'broth');
    expect(names(view)).toEqual(['Family soup']);
    button(view, 'Favorite recipe Family soup').focus(); click(view, 'Favorite recipe Family soup');
    React.act(() => vi.runAllTimers());
    expect(names(view)).toEqual([]);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Show saved recipes');
    expect(view.container.textContent).toContain('No favorite recipes match');
    click(view, 'Clear saved recipe filters');
    expect(names(view)).toEqual(['Rice bowl', 'Family soup']);
    expect(view.container.querySelector('[aria-label="Show saved recipes"]').value).toBe('all');
  });

  it('sorts by added date and name without reordering saved data', () => {
    const unknown = { ...soup, id: 'unknown', name: 'Apple oats', date: '2026-02-31' };
    const original = [soup, unknown, rice];
    const view = mount({ recipes: original });
    expect(names(view)).toEqual(['Rice bowl', 'Family soup', 'Apple oats']);
    input(view, 'Sort saved recipes', 'name');
    expect(names(view)).toEqual(['Apple oats', 'Family soup', 'Rice bowl']);
    expect(view.state().recipes).toBe(original);
    expect(view.state().recipes.map(r => r.id)).toEqual(['soup', 'unknown', 'rice']);
    click(view, 'Open recipe Family soup'); click(view, '← Back to recipe box');
    expect(view.container.querySelector('[aria-label="Sort saved recipes"]').value).toBe('name');
  });

  it('sorts valid cooking times first including zero, leaving missing or malformed values last', () => {
    const recipes = [
      { ...soup, id: 'missing', name: 'Missing', time: '' },
      { ...soup, id: 'bad', name: 'Malformed', time: 'quick' },
      soup, { ...soup, id: 'zero', name: 'No cook', time: 0 }, rice,
      { ...soup, id: 'null', name: 'Null', time: null }
    ];
    const view = mount({ recipes }); input(view, 'Sort saved recipes', 'time');
    expect(names(view)).toEqual(['No cook', 'Rice bowl', 'Family soup', 'Missing', 'Malformed', 'Null']);
    expect(view.container.textContent).toContain('Time not set');
    expect(view.state().recipes).toBe(recipes);
  });

  it('creates an independent editable copy with provenance, using original amounts after scaling', () => {
    const original = { ...soup, favorite: true };
    const view = mount({ recipes: [original], preference: 'family' });
    click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '6'); click(view, 'Make a copy');
    const copy = view.state().recipes[0];
    expect(copy).toMatchObject({ name: 'Family soup (copy)', servings: 2, ingredients: soup.ingredients, sourceRecipeId: 'starter-soup', copiedFromRecipeId: 'soup', favorite: false });
    expect(copy.id).not.toBe(original.id);
    expect(copy.customField).toEqual(original.customField); expect(copy.customField).not.toBe(original.customField);
    expect(view.state().recipes[1]).toBe(original); expect(view.state().preference).toBe('family');
    expect(view.container.querySelector('[aria-label="Servings to prepare"]').value).toBe('2');
    click(view, 'Edit recipe'); input(view, 'Recipe name', 'My adapted soup'); input(view, 'Ingredients (one per line)', '2 cups broth'); click(view, 'Save recipe changes');
    expect(view.state().recipes[0]).toMatchObject({ name: 'My adapted soup', ingredients: '2 cups broth', sourceRecipeId: 'starter-soup' });
    expect(view.state().recipes[1]).toBe(original); expect(original.name).toBe('Family soup');
  });

  it('gives repeat copies distinct names and ids even if the id generator repeats', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100); vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const view = mount({ recipes: [soup] });
    click(view, 'Make a copy of recipe Family soup'); click(view, '← Back to recipe box');
    click(view, 'Make a copy of recipe Family soup');
    expect(view.state().recipes[0].name).toBe('Family soup (copy 2)');
    expect(new Set(view.state().recipes.map(r => r.id)).size).toBe(3);
    expect(view.state().recipes[1].name).toBe('Family soup (copy)');
  });

  it('retains the in-progress recipe form when a copy is opened and the user returns', () => {
    const view = mount({ recipes: [soup] });
    input(view, 'Recipe name', 'Unsaved dinner'); input(view, 'Ingredients (one per line)', '1 can beans');
    click(view, 'Make a copy of recipe Family soup'); click(view, '← Back to recipe box');
    expect(view.container.querySelector('[aria-label="Recipe name"]').value).toBe('Unsaved dinner');
    expect(view.container.querySelector('[aria-label="Ingredients (one per line)"]').value).toBe('1 can beans');
  });

  it('keeps favorites and copies honest when saving is unavailable', () => {
    const view = mount({ recipes: [soup] }, { setData: undefined });
    click(view, 'Favorite recipe Family soup');
    expect(view.container.textContent).toContain('Saving is unavailable');
    expect(button(view, 'Favorite recipe Family soup').getAttribute('aria-pressed')).toBe('false');
    click(view, 'Make a copy of recipe Family soup');
    expect(view.state().recipes).toEqual([soup]);
    expect(view.container.textContent).not.toContain('Copy saved');
  });

  it('reports an unsupported copy without losing existing recipes', () => {
    const circular = { ...soup }; circular.customField = circular;
    const view = mount({ recipes: [circular] }); click(view, 'Make a copy of recipe Family soup');
    expect(view.container.textContent).toContain('could not be copied');
    expect(view.state().recipes).toEqual([circular]);
  });
});
