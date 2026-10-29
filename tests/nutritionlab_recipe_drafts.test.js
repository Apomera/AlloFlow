import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }
const Box = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') + '\nreturn PersonalRecipeBox;'
)(React, React.createElement, (_key, fallback) => fallback);
let mounted;
function mount(initial = {}, writable = true) {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); }
  const container = document.createElement('div'); document.body.appendChild(container);
  let data, replace;
  function Host() {
    const state = React.useState(initial); data = state[0]; replace = state[1];
    return React.createElement(Box, { data, setData: writable ? replace : undefined });
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, state: () => data, replace: next => React.act(() => replace(next)) }; return mounted;
}
function click(view, label) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === label);
  expect(node, label).toBeTruthy(); React.act(() => node.click());
}
function field(view, label) { return view.container.querySelector('[aria-label="' + label + '"]'); }
function input(view, label, value) {
  const node = field(view, label); expect(node, label).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
const soup = { id: 'soup', name: 'Family soup', servings: 2, time: 20, ingredients: '1 cup broth', steps: 'Heat at 180°C for 20 minutes.', notes: 'Family notes', tags: 'dinner', custom: { source: 'Grandma' } };
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });

describe('Saved recipe editor drafts', () => {
  it('opens an empty box editor but keeps an existing collection compact without creating a draft', () => {
    let view = mount({ recipes: [] });
    expect(view.container.querySelector('[data-nutrition-recipe-editor]').open).toBe(true);
    expect(view.state().editorDraft).toBeUndefined();
    view = mount({ recipes: [soup] });
    expect(view.container.querySelector('[data-nutrition-recipe-editor]').open).toBe(false);
    expect(view.state().editorDraft).toBeUndefined();
  });
  it('persists all typed values and restores them after a serialized remount without adding a recipe', () => {
    let view = mount({ recipes: [soup], setting: 'keep' });
    input(view, 'Recipe name', 'Draft noodles'); input(view, 'Recipe time (minutes)', '0');
    input(view, 'Original recipe servings', '2.5'); input(view, 'Ingredients (one per line)', '1 cup noodles\nSalt to taste');
    input(view, 'Steps (one per line)', 'Mix.\nServe.'); input(view, 'Recipe notes', 'A note');
    const saved = structuredClone(view.state());
    expect(saved.recipes).toEqual([soup]); expect(saved.setting).toBe('keep');
    view = mount(saved);
    expect(view.container.querySelector('[data-nutrition-recipe-editor]').open).toBe(true);
    expect(field(view, 'Recipe name').value).toBe('Draft noodles');
    expect(field(view, 'Recipe time (minutes)').value).toBe('0');
    expect(field(view, 'Ingredients (one per line)').value).toContain('Salt to taste');
    click(view, '+ Save recipe');
    expect(view.state().editorDraft).toBeNull(); expect(view.state().recipes).toHaveLength(2);
    expect(view.state().recipes[0]).toMatchObject({ name: 'Draft noodles', servings: 2.5, time: 0, notes: 'A note' });
  });
  it('restores an editing draft and preserves the original until save', () => {
    let view = mount({ recipes: [soup] }); click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'My soup');
    const saved = structuredClone(view.state()); expect(saved.recipes).toEqual([soup]);
    view = mount(saved); expect(field(view, 'Recipe name').value).toBe('My soup');
    click(view, 'Save recipe changes');
    expect(view.state().recipes).toHaveLength(1); expect(view.state().recipes[0]).toMatchObject({ id: 'soup', name: 'My soup', custom: soup.custom });
    expect(view.state().editorDraft).toBeNull(); expect(soup.name).toBe('Family soup');
  });
  it('discards and restores drafts without changing saved recipes or unrelated fields', () => {
    const view = mount({ recipes: [soup], setting: 7 }); click(view, 'Edit recipe Family soup'); input(view, 'Recipe notes', 'Draft note');
    const saved = structuredClone(view.state().editorDraft);
    click(view, 'Cancel editing'); expect(view.state().editorDraft).toBeNull(); expect(view.state().recipes).toEqual([soup]);
    click(view, 'Undo draft discard'); expect(view.state().editorDraft).toEqual(saved); expect(view.state().setting).toBe(7);
    expect(field(view, 'Recipe notes').value).toBe('Draft note');
  });
  it('does not restore a discarded draft over newer work', () => {
    const view = mount(); input(view, 'Recipe name', 'Old draft'); click(view, 'Discard recipe draft');
    input(view, 'Recipe name', 'New draft'); click(view, 'Undo draft discard');
    expect(field(view, 'Recipe name').value).toBe('New draft');
    expect(view.container.textContent).toContain('before restoring');
  });
  it('does not overwrite a draft when another saved recipe is opened for editing', () => {
    const view = mount({ recipes: [soup] }); input(view, 'Recipe name', 'Work in progress');
    click(view, 'Edit recipe Family soup');
    expect(field(view, 'Recipe name').value).toBe('Work in progress'); expect(view.state().editorDraft.editingId).toBeNull();
    expect(view.container.textContent).toContain('before editing another recipe');
  });
  it('keeps newer recipe changes and can save the old draft as an independent recipe', () => {
    const view = mount({ recipes: [soup] }); click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'My draft');
    const newer = { ...soup, steps: 'Newer instructions.', favorite: true };
    view.replace({ ...view.state(), recipes: [newer] }); click(view, 'Save recipe changes');
    expect(view.state().recipes).toEqual([newer]); expect(view.state().editorDraft).toBeTruthy();
    click(view, 'Save draft as new recipe');
    expect(view.state().recipes).toHaveLength(2); expect(view.state().recipes[1]).toEqual(newer);
    expect(view.state().recipes[0]).toMatchObject({ name: 'My draft', steps: soup.steps, copiedFromRecipeId: soup.id, custom: soup.custom });
    expect(view.state().recipes[0].id).not.toBe(soup.id); expect(view.state().recipes[0].custom).not.toBe(newer.custom);
    expect(view.state().editorDraft).toBeNull();
  });
  it('recovers a draft whose original recipe was deleted', () => {
    const view = mount({ recipes: [soup] }); click(view, 'Edit recipe Family soup'); input(view, 'Recipe name', 'Recovered soup');
    view.replace({ ...view.state(), recipes: [] }); click(view, 'Save recipe changes');
    expect(view.state().recipes).toEqual([]); click(view, 'Save draft as new recipe');
    expect(view.state().recipes[0]).toMatchObject({ name: 'Recovered soup', ingredients: soup.ingredients });
  });
  it('keeps draft work intact when validation fails or favorites change', () => {
    const view = mount({ recipes: [soup] }); click(view, 'Edit recipe Family soup'); input(view, 'Original recipe servings', '0');
    click(view, 'Favorite recipe Family soup'); click(view, 'Save recipe changes');
    expect(view.state().recipes[0].favorite).toBe(true); expect(view.state().editorDraft.form.servings).toBe('0');
    input(view, 'Original recipe servings', '4'); click(view, 'Save recipe changes');
    expect(view.state().recipes[0]).toMatchObject({ favorite: true, servings: 4 });
  });
  it('keeps unreadable drafts until explicitly cleared and allows undo', () => {
    const view = mount({ recipes: [soup], editorDraft: { imported: 'unreadable' } });
    input(view, 'Recipe name', 'Should not replace'); expect(view.state().editorDraft).toEqual({ imported: 'unreadable' });
    click(view, 'Clear unreadable recipe draft'); expect(view.state().editorDraft).toBeNull();
    click(view, 'Undo draft discard'); expect(view.state().editorDraft).toEqual({ imported: 'unreadable' });
  });
  it('supports numeric zero recipe IDs for persisted editing', () => {
    const view = mount({ recipes: [{ ...soup, id: 0 }] }); click(view, 'Edit recipe Family soup');
    input(view, 'Recipe name', 'Zero ID soup'); click(view, 'Save recipe changes');
    expect(view.state().recipes).toHaveLength(1); expect(view.state().recipes[0]).toMatchObject({ id: 0, name: 'Zero ID soup' });
  });
  it('refuses ambiguous imported recipe IDs and preserves both originals', () => {
    const duplicate = { ...soup, custom: { source: 'Second record' } };
    const view = mount({ recipes: [soup, duplicate] });
    const buttons = [...view.container.querySelectorAll('button')].filter(el => el.getAttribute('aria-label') === 'Edit recipe Family soup');
    React.act(() => buttons[1].click());
    expect(view.state().editorDraft).toBeUndefined(); expect(view.state().recipes).toEqual([soup, duplicate]);
    expect(view.container.textContent).toContain('cannot be identified uniquely');
  });
  it('does not overwrite a recipe from a persisted edit draft missing its baseline', () => {
    const view = mount({ recipes: [soup], editorDraft: { editingId: soup.id, form: { ...soup, name: 'Imported draft' } } });
    click(view, 'Save recipe changes'); expect(view.state().recipes).toEqual([soup]);
    click(view, 'Save draft as new recipe'); expect(view.state().recipes).toHaveLength(2);
    expect(view.state().recipes[0].name).toBe('Imported draft'); expect(view.state().recipes[1]).toEqual(soup);
  });
  it('does not promise saved drafts when the host cannot persist', () => {
    const view = mount({ recipes: [soup] }, false); input(view, 'Recipe name', 'Temporary');
    expect(field(view, 'Recipe name').value).toBe('Temporary'); click(view, '+ Save recipe');
    expect(view.state().editorDraft).toBeUndefined(); expect(view.state().recipes).toEqual([soup]);
    expect(view.container.textContent).toContain('Saving is unavailable');
  });
});
