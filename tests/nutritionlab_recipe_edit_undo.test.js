import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b < a) throw new Error(start); return source.slice(a, b); }
const Box = new Function('R_NL', 'nlH', '__alloNLT', slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') + slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') + '\nreturn PersonalRecipeBox;')(React, React.createElement, (_key, fallback) => fallback);
const soup = { id: 'soup', name: 'Family soup', cuisine: 'Family', servings: 2, time: 20, ingredients: '1 cup broth\n1 carrot', steps: 'Heat at 180°C for 20 minutes.', tags: 'dinner', notes: 'Family note', custom: { keep: true } };
const rice = { ...soup, id: 'rice', name: 'Rice bowl' };
let mounted;
function mount(initial = { recipes: [soup, rice] }) {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); }
  const container = document.createElement('div'); document.body.appendChild(container); let data, replace, writable = true;
  const writes = vi.fn();
  function Host() { const state = React.useState(initial); data = state[0]; replace = state[1]; return React.createElement(Box, { data, setData: writable ? next => { writes(next); replace(next); } : undefined }); }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, state: () => data, writes, replace: next => React.act(() => replace(next)), writable: next => { writable = next; React.act(() => root.render(React.createElement(Host))); } }; return mounted;
}
function button(view, name) { const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name); expect(node, name).toBeTruthy(); return node; }
function click(view, name) { React.act(() => button(view, name).click()); }
function input(view, name, value) { const node = view.container.querySelector('[aria-label="' + name + '"]'); expect(node, name).toBeTruthy(); const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); }
function edit(view, name = 'Family soup', nextName = 'Updated soup') { click(view, 'Edit recipe ' + name); input(view, 'Recipe name', nextName); click(view, 'Save recipe changes'); }
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.unstubAllGlobals(); });

describe('Undo a saved Recipe Box edit', () => {
  it('restores changed fields while retaining later favorites, metadata, another recipe, order and planned snapshots', () => {
    const plan = { meals: [{ recipeSnapshot: { ...soup } }] }; const initial = { recipes: [soup, rice], plan, preference: 'keep' }; const view = mount(initial);
    click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'Updated soup'); input(view, 'Ingredients (one per line)', '2 cups broth'); click(view, 'Save recipe changes');
    expect(document.activeElement).toBe(button(view, 'Undo recipe changes'));
    click(view, 'Favorite recipe Updated soup');
    const latest = view.state(); const edited = { ...latest.recipes[0], custom: { keep: true, later: true } }; const addition = { ...rice, id: 'new', name: 'New meal' };
    view.replace({ ...latest, recipes: [addition, latest.recipes[1], edited] });
    click(view, 'Undo recipe changes');
    expect(view.state().recipes.map(r => r.id)).toEqual(['new', 'rice', 'soup']);
    expect(view.state().recipes[2]).toMatchObject({ ...soup, favorite: true, custom: { keep: true, later: true } });
    expect(view.state().recipes[0]).toBe(addition); expect(view.state().recipes[1]).toBe(rice); expect(view.state().plan).toBe(plan); expect(view.state().preference).toBe('keep');
    expect(document.activeElement.textContent).toBe('Family soup'); expect(view.container.querySelector('[data-nutrition-recipe-edit-undo]')).toBeNull(); expect(soup.name).toBe('Family soup');
  });
  it('keeps later edits to fields that the saved edit did not change', () => {
    const view = mount(); edit(view); const current = view.state(); view.replace({ ...current, recipes: [{ ...current.recipes[0], notes: 'Later note', steps: 'Later instructions.' }, rice] }); click(view, 'Undo recipe changes');
    expect(view.state().recipes[0]).toMatchObject({ name: soup.name, notes: 'Later note', steps: 'Later instructions.' });
  });
  it.each(['changed', 'removed', 'duplicate'])('refuses an unsafe %s target without modifying any records', kind => {
    const view = mount(); edit(view); const current = view.state(); const target = current.recipes[0];
    const records = kind === 'changed' ? [{ ...target, name: 'Newer version' }, rice] : kind === 'removed' ? [rice] : [target, { ...target }, rice];
    view.replace({ ...current, recipes: records }); const before = view.state(), count = view.writes.mock.calls.length; click(view, 'Undo recipe changes'); expect(view.state()).toBe(before); expect(view.writes).toHaveBeenCalledTimes(count); expect(view.container.textContent).toMatch(/changed|identified|available/);
  });
  it('protects an active draft, then permits Undo after explicitly canceling it', () => {
    const view = mount(); edit(view); click(view, 'Edit recipe'); input(view, 'Recipe notes', 'Unfinished note');
    const draft = view.state().editorDraft, records = view.state().recipes; click(view, 'Undo recipe changes');
    expect(view.state().editorDraft).toBe(draft); expect(view.state().recipes).toBe(records); expect(view.container.textContent).toContain('Save or discard');
    click(view, 'Cancel editing'); click(view, 'Undo recipe changes'); expect(view.state().recipes[0]).toEqual(soup);
  });
  it('keeps the edit and its Undo when saving is unavailable', () => {
    const view = mount(); edit(view); const current = view.state(); view.writable(false); click(view, 'Undo recipe changes');
    expect(view.state()).toBe(current); expect(view.container.textContent).toContain('Saving is unavailable'); expect(button(view, 'Undo recipe changes')).toBeTruthy();
  });
  it('preserves the previous Undo after a no-op save and replaces it after the next real edit', () => {
    const view = mount(); edit(view); click(view, 'Edit recipe'); click(view, 'Save recipe changes'); click(view, 'Undo recipe changes'); expect(view.state().recipes[0]).toEqual(soup);
    click(view, 'Edit recipe'); input(view, 'Recipe name', 'First edit'); click(view, 'Save recipe changes'); click(view, 'Edit recipe'); input(view, 'Recipe name', 'Second edit'); click(view, 'Save recipe changes'); click(view, 'Undo recipe changes'); expect(view.state().recipes[0].name).toBe('First edit');
  });
  it('restores absent properties and irregular original ingredient values for numeric-zero IDs', () => {
    const original = { id: 0, name: 'Legacy recipe', time: '20', servings: '2', ingredients: { original: ['keep'] }, custom: { source: 'import' } };
    const view = mount({ recipes: [original] }); edit(view, 'Legacy recipe', 'Revised legacy'); click(view, 'Undo recipe changes'); expect(view.state().recipes[0]).toEqual(original); expect(Object.hasOwn(view.state().recipes[0], 'notes')).toBe(false); expect(view.state().recipes[0].ingredients).not.toBe(original.ingredients);
  });
  it('retires an edited recipe Undo when that recipe is explicitly removed, including after removal Undo', () => {
    const view = mount(); edit(view); click(view, '← Back to recipe box'); click(view, 'Remove recipe Updated soup'); expect(view.container.querySelector('[data-nutrition-recipe-edit-undo]')).toBeNull(); click(view, 'Undo recipe removal'); expect(view.state().recipes[0].name).toBe('Updated soup'); expect(view.container.querySelector('[data-nutrition-recipe-edit-undo]')).toBeNull();
  });
  it('does not invent an edit Undo for a newly added recipe or an unchanged save', () => {
    const view = mount(); click(view, 'Edit recipe Family soup'); click(view, 'Save recipe changes'); expect(view.container.querySelector('[data-nutrition-recipe-edit-undo]')).toBeNull();
    click(view, '← Back to recipe box'); input(view, 'Recipe name', 'New recipe'); click(view, '+ Save recipe'); expect(view.container.querySelector('[data-nutrition-recipe-edit-undo]')).toBeNull();
  });
});
