import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b < a) throw new Error(start); return source.slice(a, b); }
const Box = new Function('R_NL', 'nlH', '__alloNLT', slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') + slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') + '\nreturn PersonalRecipeBox;')(React, React.createElement, (_key, fallback) => fallback);
const soup = { id: 'soup', name: 'Family soup', cuisine: 'Family', servings: 2, time: 20, ingredients: '1 cup broth\n1/2 carrot\nSalt to taste\n1–2 onions', steps: 'Heat at 180°C for 20 minutes.\nStir.', tags: 'dinner, family', notes: 'Family note', favorite: true, custom: { keep: true } };
const rice = { ...soup, id: 'rice', name: 'Rice bowl' };
let mounted;
function mount(initial = { recipes: [soup, rice] }, extra = {}) {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); }
  const container = document.createElement('div'); document.body.appendChild(container); let data, replace;
  const writes = vi.fn();
  function Host() { const state = React.useState(initial); data = state[0]; replace = state[1]; return React.createElement(Box, { data, setData: next => { writes(next); replace(next); }, ...extra }); }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, state: () => data, writes, replace: next => React.act(() => replace(next)) }; return mounted;
}
function button(view, name) { const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name); expect(node, name).toBeTruthy(); return node; }
function click(view, name) { React.act(() => button(view, name).click()); }
function input(view, name, value) { const node = view.container.querySelector('[aria-label="' + name + '"]'); expect(node, name).toBeTruthy(); const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); }
function review(view) { const node = view.container.querySelector('[data-nutrition-scaled-copy] input[type="checkbox"]'); expect(node).toBeTruthy(); React.act(() => node.click()); return node; }
function start(view, count = '4', name = 'Family soup') { click(view, 'Open recipe ' + name); input(view, 'Servings to prepare', count); click(view, 'Edit a scaled copy'); }
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Separate scaled Recipe Box drafts', () => {
  it('creates a draft with supported quantities scaled and unsupported lines clearly identified, without changing saved data', () => {
    const unknown = { legacy: 'keep' }, plan = { meals: [{ recipeSnapshot: { ...soup }, servings: 2 }] };
    const initial = { recipes: [soup, unknown, rice], plan, preference: 'keep' }; const view = mount(initial); start(view);
    expect(view.state().recipes).toBe(initial.recipes); expect(view.state().plan).toBe(plan); expect(view.state().preference).toBe('keep');
    expect(view.state().editorDraft.form).toEqual({ name: 'Family soup (4 servings)', cuisine: 'Family', time: '20', servings: '4', ingredients: '2 cups broth\n1 carrot\nSalt to taste\n1–2 onions', steps: soup.steps, tags: soup.tags, notes: soup.notes });
    expect(view.state().editorDraft.editingId).toBeNull(); expect(view.state().editorDraft.scaledCopy.manualLines).toEqual(['Salt to taste', '1–2 onions']);
    expect(view.container.querySelector('[data-nutrition-scaled-copy]').textContent).toContain('Review 2 unchanged ingredient lines');
    expect(view.container.textContent).toContain('times, and temperatures were copied as written');
    expect(button(view, '+ Save recipe').disabled).toBe(true); expect(document.activeElement.getAttribute('aria-label')).toBe('Recipe name');
  });
  it('requires review, saves a distinct recipe, and uses its new original yield without scaling twice', () => {
    const shopping = vi.fn(() => ({ ok: true, message: 'Created.' })), plan = vi.fn(() => ({ ok: true, message: 'Planned.' }));
    const initial = { recipes: [soup, rice], settings: { keep: true } }; const view = mount(initial, { onRecipeShopping: shopping, onPlanRecipe: plan }); start(view);
    const draftBefore = view.state().editorDraft; click(view, '+ Save recipe'); expect(view.state().editorDraft).toBe(draftBefore); expect(view.state().recipes).toHaveLength(2);
    review(view); expect(button(view, '+ Save recipe').disabled).toBe(false); click(view, '+ Save recipe');
    const saved = view.state().recipes[0]; expect(saved).toMatchObject({ name: 'Family soup (4 servings)', servings: 4, time: 20, ingredients: '2 cups broth\n1 carrot\nSalt to taste\n1–2 onions', steps: soup.steps, tags: soup.tags, notes: soup.notes, copiedFromRecipeId: 'soup' });
    expect(saved.id).not.toBe(soup.id); expect(view.state().recipes.slice(1)).toEqual(initial.recipes); expect(view.state().recipes[1]).toBe(soup); expect(view.state().settings).toBe(initial.settings); expect(view.state().editorDraft).toBeNull();
    expect(view.container.querySelector('[aria-label="Scaled ingredients"]').textContent).toContain('2 cups broth'); expect(view.container.querySelector('[aria-label="Scaled ingredients"]').textContent).not.toContain('4 cups broth');
    click(view, 'Create shopping list'); expect(shopping).toHaveBeenCalledWith(saved, 4);
    click(view, 'Plan this recipe'); click(view, 'Add to meal plan'); expect(plan.mock.calls[0][0]).toMatchObject({ id: saved.id, servings: 4, ingredients: saved.ingredients }); expect(plan.mock.calls[0][1]).toBe(4); expect(plan.mock.calls[0][2].days).toEqual(['monday']);
    expect(soup.servings).toBe(2); expect(soup.ingredients).toContain('1 cup broth');
  });
  it.each(['', '0', '-1', '101'])('disables scaled drafting for invalid target %j without data writes', count => {
    const view = mount(); click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', count); const before = view.state(); expect(button(view, 'Edit a scaled copy').disabled).toBe(true); click(view, 'Edit a scaled copy'); expect(view.state()).toBe(before); expect(view.writes).not.toHaveBeenCalled();
  });
  it.each([{ ...soup, servings: 0 }, { ...soup, ingredients: Array(501).fill('1 cup broth').join('\n') }])('refuses an unscalable original', recipe => {
    const view = mount({ recipes: [recipe] }); click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '4'); expect(button(view, 'Edit a scaled copy').disabled).toBe(true); expect(view.writes).not.toHaveBeenCalled();
  });
  it('supports fractional source yields, a numeric-zero ID and colliding default names', () => {
    const source = { ...soup, id: 0, servings: 0.5, ingredients: '1/2 cup oats' }; const existing = { ...rice, name: 'Family soup (1 serving)' }; const view = mount({ recipes: [source, existing] }); start(view, '1');
    expect(view.state().editorDraft.form).toMatchObject({ name: 'Family soup (1 serving) (copy 2)', servings: '1', ingredients: '1 cup oats' }); review(view); click(view, '+ Save recipe'); expect(view.state().recipes[0].copiedFromRecipeId).toBe(0); expect(view.state().recipes[0].servings).toBe(1); expect(view.state().recipes[1]).toBe(source); expect(view.state().recipes[2]).toBe(existing);
  });
  it.each([{ form: { name: 'Unfinished new recipe' }, editingId: null }, { form: { name: 'Unfinished saved edit' }, editingId: 'rice', original: '{}' }, 'unreadable'])('preserves an existing recipe draft exactly: %j', editorDraft => {
    const initial = { recipes: [soup, rice], editorDraft }; const view = mount(initial); start(view); expect(view.state()).toBe(initial); expect(view.state().editorDraft).toBe(editorDraft); expect(view.writes).not.toHaveBeenCalled(); expect(view.container.textContent).toContain('Your existing draft has been kept'); expect(view.container.querySelector('[data-nutrition-scaled-copy]')).toBeNull();
  });
  it('persists the draft and its review across remounts, and allows discard then exact Undo', () => {
    let view = mount(); start(view); input(view, 'Recipe name', 'Soup for a gathering'); review(view); const savedDraft = view.state().editorDraft; view = mount(view.state()); expect(view.container.querySelector('[data-nutrition-scaled-copy] input').checked).toBe(true); expect(button(view, '+ Save recipe').disabled).toBe(false);
    click(view, 'Discard recipe draft'); expect(view.state().editorDraft).toBeNull(); click(view, 'Undo draft discard'); expect(view.state().editorDraft).toBe(savedDraft); expect(view.container.querySelector('[aria-label="Recipe name"]').value).toBe('Soup for a gathering'); expect(view.container.querySelector('[data-nutrition-scaled-copy] input').checked).toBe(true);
  });
  it.each([['Ingredients (one per line)', '3 cups broth'], ['Original recipe servings', '6'], ['Steps (one per line)', 'Use a larger pan.'], ['Recipe time (minutes)', '45']])('requires a fresh review after changing %s', (label, value) => {
    const view = mount(); start(view); review(view); input(view, label, value); expect(view.container.querySelector('[data-nutrition-scaled-copy] input').checked).toBe(false); expect(button(view, '+ Save recipe').disabled).toBe(true); review(view); expect(button(view, '+ Save recipe').disabled).toBe(false); click(view, '+ Save recipe'); expect(view.state().recipes[1]).toBe(soup);
  });
  it('keeps review for naming and descriptive edits and detects external changes to reviewed ingredients', () => {
    const view = mount(); start(view); review(view); for (const [label, value] of [['Recipe name', 'Big soup'], ['Cuisine', 'Home'], ['Recipe notes', 'Pack in jars.'], ['Tags (comma-separated)', 'lunch']]) input(view, label, value);
    expect(button(view, '+ Save recipe').disabled).toBe(false); const current = view.state(); const changed = { ...current, editorDraft: { ...current.editorDraft, form: { ...current.editorDraft.form, ingredients: '4 cups broth' } } }; view.replace(changed); expect(button(view, '+ Save recipe').disabled).toBe(true); expect(view.state().recipes[0]).toBe(soup);
  });
  it('keeps malformed review metadata intact and prevents it being saved as an edit to the original', () => {
    let view = mount(); start(view); const current = view.state(); const tampered = { ...current, editorDraft: { ...current.editorDraft, editingId: 'soup', original: JSON.stringify(soup) } }; view.replace(tampered); expect(button(view, 'Save recipe changes').disabled).toBe(true); expect(view.container.textContent).toContain('unreadable review details'); expect(view.state().recipes[0]).toBe(soup);
    view = mount({ recipes: [soup], editorDraft: { form: { name: 'Kept draft', time: '20', servings: '4' }, scaledCopy: 'bad' } }); expect(button(view, '+ Save recipe').disabled).toBe(true); expect(view.state().editorDraft.scaledCopy).toBe('bad');
  });
  it('disables drafting in a view without persistence and keeps regular original-amount copies unchanged', () => {
    let view = mount({ recipes: [soup] }, { setData: undefined }); click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '4'); expect(button(view, 'Edit a scaled copy').disabled).toBe(true); expect(view.writes).not.toHaveBeenCalled();
    view = mount(); click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '4'); click(view, 'Make a copy'); expect(view.state().recipes[0]).toMatchObject({ name: 'Family soup (copy)', servings: 2, ingredients: soup.ingredients });
  });
});
