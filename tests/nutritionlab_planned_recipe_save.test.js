import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < from) throw new Error('Missing planned recipe save source boundary: ' + start);
  return source.slice(from, to);
}
const Save = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  // Recipe planning helpers', '  // Cooking instructions stay verbatim') +
  slice('  // Saving a planned recipe', '  // 31) PersonalRecipeBox') + '\nreturn NutritionPlannedRecipeSave;'
)(React, React.createElement, (_key, fallback) => fallback);
const recipe = { id: 'soup', name: 'Family soup', servings: 2, time: 20, cuisine: 'Family',
  ingredients: '1 cup broth\r\n1/2 onion\r\nSalt to taste', steps: 'Heat at 180°C.\r\nCook for 20 minutes.',
  notes: 'Keep this note.', tags: 'dinner, family', sourceRecipeId: 'starter-soup' };
let mounted;
function mount(props = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let current, replace;
  function Host() {
    const state = React.useState({ recipe, ...props }); current = state[0]; replace = state[1];
    return React.createElement(Save, current);
  }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, props: () => current, replace: next => React.act(() => replace(next)) }; return mounted;
}
function button(view, label) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === label);
  expect(node, label).toBeTruthy(); return node;
}
function click(view, label) { React.act(() => button(view, label).click()); }
function field(view, label) { const node = view.container.querySelector('[aria-label="' + label + '"]'); expect(node, label).toBeTruthy(); return node; }
function name(view, value) {
  const node = field(view, 'Recipe Box name');
  React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks();
});

describe('Save a planned recipe to Recipe Box', () => {
  it('focuses the heading and previews original amounts and exact instructions without saving', () => {
    const onSave = vi.fn(), view = mount({ onSave });
    expect(document.activeElement.textContent).toBe('Keep Family soup in Recipe Box');
    expect(field(view, 'Recipe Box name').value).toBe('Family soup');
    expect(view.container.textContent).toContain('Original recipe: 2 servings');
    expect(view.container.textContent).toContain('Saves original recipe amounts; your meal keeps its planned servings.');
    expect(field(view, 'Original ingredients to save').textContent).toBe(recipe.ingredients);
    expect(field(view, 'Original cooking steps to save').textContent).toBe(recipe.steps);
    expect(onSave).not.toHaveBeenCalled();
  });
  it('submits the original recipe snapshot and trimmed chosen name only after explicit confirmation', () => {
    const onSave = vi.fn(() => ({ ok: true, message: 'Saved an independent recipe.' })), view = mount({ onSave, onCancel: vi.fn() });
    name(view, '  My chickpea soup  '); expect(onSave).not.toHaveBeenCalled();
    click(view, 'Save this recipe to Recipe Box');
    expect(onSave).toHaveBeenCalledWith(recipe, 'My chickpea soup');
    expect(onSave.mock.calls[0][0]).not.toBe(recipe);
    expect(onSave.mock.calls[0][0].servings).toBe(2);
    expect(view.container.textContent).toContain('Saved an independent recipe.');
    expect(button(view, 'Saved to Recipe Box').disabled).toBe(true);
    expect(field(view, 'Recipe Box name').disabled).toBe(true);
    click(view, 'Return to meal'); expect(view.props().onCancel).toHaveBeenCalledTimes(1);
    expect(recipe.name).toBe('Family soup');
  });
  it('preserves frozen source data and typed name across host updates, including numeric zero IDs', () => {
    const original = { ...recipe, id: 0 }, onSave = vi.fn(() => ({ ok: true }));
    const view = mount({ recipe: original, onSave }); name(view, 'My variation');
    view.replace({ recipe: { ...original, servings: 8, ingredients: '999 cups changed stock', steps: 'Changed steps.' }, onSave });
    expect(field(view, 'Recipe Box name').value).toBe('My variation');
    expect(field(view, 'Original ingredients to save').textContent).toBe(recipe.ingredients);
    expect(view.container.textContent).toContain('Original recipe: 2 servings');
    click(view, 'Save this recipe to Recipe Box');
    expect(onSave).toHaveBeenCalledWith(original, 'My variation');
  });
  it('cancels without writing or mutating the source recipe', () => {
    const onSave = vi.fn(), onCancel = vi.fn(), before = structuredClone(recipe), view = mount({ onSave, onCancel });
    name(view, 'Never saved'); click(view, 'Cancel saving recipe');
    expect(onCancel).toHaveBeenCalledTimes(1); expect(onSave).not.toHaveBeenCalled(); expect(recipe).toEqual(before);
  });
  it('requires a nonblank name while keeping the panel editable', () => {
    const onSave = vi.fn(), view = mount({ onSave }); name(view, '  '); click(view, 'Save this recipe to Recipe Box');
    expect(onSave).not.toHaveBeenCalled(); expect(view.container.textContent).toContain('Give this recipe a name');
    expect(field(view, 'Recipe Box name').disabled).toBe(false);
  });
  it('shows empty source fields honestly and lets host validation explain missing original servings', () => {
    const onSave = vi.fn(() => ({ ok: false, message: 'Adapt the meal to set original servings first.' }));
    const view = mount({ recipe: { name: 'Imported recipe' }, onSave });
    expect(view.container.textContent).toContain('Original recipe servings are not set');
    expect(field(view, 'Original ingredients to save').textContent).toBe('No ingredient lines saved.');
    expect(field(view, 'Original cooking steps to save').textContent).toBe('No cooking steps saved.');
    click(view, 'Save this recipe to Recipe Box');
    expect(onSave.mock.calls[0][0].servings).toBeNull();
    expect(view.container.textContent).toContain('set original servings first');
    expect(button(view, 'Save this recipe to Recipe Box').disabled).toBe(false);
  });
  it('renders one original serving without changing its quantity text', () => {
    const view = mount({ recipe: { ...recipe, servings: 1, ingredients: '1/3 cup broth' } });
    expect(view.container.textContent).toContain('Original recipe: 1 serving');
    expect(view.container.textContent).not.toContain('Original recipe: 1 servings');
    expect(field(view, 'Original ingredients to save').textContent).toBe('1/3 cup broth');
  });
  it('reports a rejected save and can retry with a new name', () => {
    const onSave = vi.fn().mockReturnValueOnce({ ok: false, message: 'Choose a different name.' }).mockReturnValueOnce({ ok: true });
    const view = mount({ onSave }); click(view, 'Save this recipe to Recipe Box');
    expect(view.container.textContent).toContain('Choose a different name.');
    name(view, 'New name'); click(view, 'Save this recipe to Recipe Box');
    expect(onSave).toHaveBeenCalledTimes(2); expect(onSave.mock.calls[1][1]).toBe('New name');
    expect(view.container.textContent).toContain('Recipe saved to your Recipe Box.');
  });
  it('uses a fresh callback argument so a rejected callback cannot corrupt the frozen preview', () => {
    const onSave = vi.fn().mockImplementationOnce(copy => { copy.ingredients = 'Changed by callback'; return { ok: false, message: 'Retry.' }; }).mockReturnValueOnce({ ok: true });
    const view = mount({ onSave }); click(view, 'Save this recipe to Recipe Box');
    expect(field(view, 'Original ingredients to save').textContent).toBe(recipe.ingredients);
    click(view, 'Save this recipe to Recipe Box'); expect(onSave.mock.calls[1][0].ingredients).toBe(recipe.ingredients);
  });
  it.each(['missing', 'throws', 'unconfirmed'])('does not claim success for a %s callback', mode => {
    const onSave = mode === 'missing' ? undefined : mode === 'throws' ? () => { throw new Error('offline'); } : () => undefined;
    const view = mount({ onSave }); click(view, 'Save this recipe to Recipe Box');
    expect(view.container.textContent).not.toContain('Recipe saved to your Recipe Box.');
    expect(button(view, 'Save this recipe to Recipe Box').disabled).toBe(false);
  });
  it('waits for async confirmation and prevents same-batch double submits', async () => {
    let resolve; const operation = new Promise(done => { resolve = done; });
    const onSave = vi.fn(() => operation), view = mount({ onSave, onCancel: vi.fn() });
    const save = button(view, 'Save this recipe to Recipe Box');
    React.act(() => { save.click(); save.click(); });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(button(view, 'Saving recipe…').disabled).toBe(true);
    expect(button(view, 'Cancel saving recipe').disabled).toBe(true);
    await React.act(async () => { resolve({ ok: true, message: 'Host confirmed.' }); await operation; });
    expect(view.container.textContent).toContain('Host confirmed.');
    expect(button(view, 'Saved to Recipe Box').disabled).toBe(true);
  });
  it('recovers from rejected asynchronous writes without losing the chosen name', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('offline'))), view = mount({ onSave }); name(view, 'Keep this name');
    await React.act(async () => { button(view, 'Save this recipe to Recipe Box').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(field(view, 'Recipe Box name').value).toBe('Keep this name');
    expect(button(view, 'Save this recipe to Recipe Box').disabled).toBe(false);
    expect(view.container.textContent).toContain('could not be confirmed');
  });
});
