import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < from) throw new Error('Missing meal adaptation source boundary: ' + start);
  return source.slice(from, to);
}
const Adapt = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  // Recipe planning helpers', '  // Cooking instructions stay verbatim') +
  slice('  // Planned recipe adaptation', '  // 31) PersonalRecipeBox') + '\nreturn NutritionRecipeAdaptation;'
)(React, React.createElement, (_key, fallback) => fallback);
const recipe = { id: 'soup', name: 'Family soup', cuisine: 'Family', time: 20, servings: 2,
  ingredients: '1 cup broth\n1/2 onion\nSalt to taste', steps: 'Heat at 180°C.\nCook for 20 minutes.', notes: 'Keep this note.', tags: 'dinner', sourceRecipeId: 'starter-soup' };
let mounted;
function mount(props = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let current, replace;
  function Host() {
    const state = React.useState({ recipe, servings: 4, ...props }); current = state[0]; replace = state[1];
    return React.createElement(Adapt, current);
  }
  const root = ReactDOMClient.createRoot(container); React.act(() => root.render(React.createElement(Host)));
  mounted = { root, container, props: () => current, replace: next => React.act(() => replace(next)) }; return mounted;
}
function button(view, name) {
  const node = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name);
  expect(node, name).toBeTruthy(); return node;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function field(view, name) {
  const node = view.container.querySelector('[aria-label="' + name + '"]'); expect(node, name).toBeTruthy(); return node;
}
function input(view, name, value) {
  const node = field(view, name), prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks();
});

describe('Planned recipe adaptation editor', () => {
  it('focuses its heading and previews original quantities without applying anything', () => {
    const onApply = vi.fn(), view = mount({ onApply });
    expect(document.activeElement.textContent).toBe('Adapt Family soup');
    expect(field(view, 'Original recipe servings').value).toBe('2');
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('2 cups broth');
    expect(field(view, 'Adapted cooking steps').value).toBe(recipe.steps);
    expect(onApply).not.toHaveBeenCalled();
  });
  it('applies user-authored amounts and instructions only after confirmation, retaining source metadata', () => {
    const onApply = vi.fn(() => ({ ok: true, message: 'Updated this meal only.' })), view = mount({ onApply });
    input(view, 'Adapted recipe name', '  My soup  ');
    input(view, 'Adapted ingredients (one per line)', '1 cup oat drink\n1 carrot\nHerbs to taste');
    input(view, 'Adapted cooking steps', 'Heat at 160°C.\nSimmer for 12 minutes.');
    input(view, 'Adaptation notes', 'Use my chosen ingredients.');
    expect(onApply).not.toHaveBeenCalled();
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('2 cups oat drink');
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('review for ×2');
    click(view, 'Apply recipe to this meal');
    expect(onApply).toHaveBeenCalledWith({ ...recipe, name: 'My soup', ingredients: '1 cup oat drink\n1 carrot\nHerbs to taste', steps: 'Heat at 160°C.\nSimmer for 12 minutes.', notes: 'Use my chosen ingredients.' });
    expect(view.container.textContent).toContain('Updated this meal only.');
    expect(button(view, 'Recipe applied to this meal').disabled).toBe(true);
    expect(recipe.ingredients).toBe('1 cup broth\n1/2 onion\nSalt to taste');
    expect(recipe.steps).toContain('180°C');
  });
  it('recomputes quantities when original servings change while preserving entered cooking times', () => {
    const onApply = vi.fn(() => ({ ok: true })), view = mount({ onApply });
    input(view, 'Original recipe servings', '8');
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('1/2 cup broth');
    expect(field(view, 'Adapted cooking steps').value).toContain('20 minutes');
    click(view, 'Apply recipe to this meal');
    expect(onApply.mock.calls[0][0]).toMatchObject({ servings: 8, time: 20, steps: recipe.steps });
  });
  it('freezes the source recipe and planned servings across unrelated host updates, including numeric zero IDs', () => {
    const original = { ...recipe, id: 0 }, onApply = vi.fn(() => ({ ok: true }));
    const view = mount({ recipe: original, servings: 4, onApply });
    view.replace({ recipe: { ...original, ingredients: '999 cups new broth', notes: 'New saved recipe' }, servings: 12, onApply });
    expect(view.container.textContent).toContain('4 planned servings');
    expect(field(view, 'Adapted ingredients for this meal').textContent).toContain('2 cups broth');
    click(view, 'Apply recipe to this meal');
    expect(onApply).toHaveBeenCalledWith(original);
    expect(onApply.mock.calls[0][0]).not.toBe(original);
  });
  it('cancels local changes without applying or mutating a recipe', () => {
    const onApply = vi.fn(), onCancel = vi.fn(), before = structuredClone(recipe), view = mount({ onApply, onCancel });
    input(view, 'Adapted ingredients (one per line)', '1 cup something else');
    click(view, 'Cancel recipe changes');
    expect(onCancel).toHaveBeenCalledTimes(1); expect(onApply).not.toHaveBeenCalled(); expect(recipe).toEqual(before);
  });
  it('requires a recipe name and valid original servings, preserving the draft on failure', () => {
    const onApply = vi.fn(), view = mount({ onApply });
    input(view, 'Adapted recipe name', '  '); click(view, 'Apply recipe to this meal');
    expect(view.container.textContent).toContain('Give this adapted recipe a name'); expect(onApply).not.toHaveBeenCalled();
    input(view, 'Adapted recipe name', 'My soup'); input(view, 'Original recipe servings', '0'); click(view, 'Apply recipe to this meal');
    expect(view.container.textContent).toContain('greater than 0'); expect(onApply).not.toHaveBeenCalled();
    expect(field(view, 'Adapted recipe name').value).toBe('My soup');
  });
  it('rejects invalid planned servings rather than inventing a target amount', () => {
    const onApply = vi.fn(), view = mount({ servings: 'invalid', onApply });
    click(view, 'Apply recipe to this meal');
    expect(onApply).not.toHaveBeenCalled(); expect(view.container.textContent).toContain('Review the planned servings');
  });
  it('rejects ingredient lists over the scaling limit without dropping any entered lines', () => {
    const onApply = vi.fn(), view = mount({ onApply });
    const lines = Array.from({ length: 501 }, (_, index) => '1 cup ingredient ' + index).join('\n');
    input(view, 'Adapted ingredients (one per line)', lines); click(view, 'Apply recipe to this meal');
    expect(view.container.textContent).toContain('more than 500 ingredient lines');
    expect(field(view, 'Adapted ingredients (one per line)').value).toBe(lines); expect(onApply).not.toHaveBeenCalled();
  });
  it('allows an explicit empty ingredient list while explaining its shopping-list effect', () => {
    const onApply = vi.fn(() => ({ ok: true })), view = mount({ onApply });
    input(view, 'Adapted ingredients (one per line)', ''); input(view, 'Adapted cooking steps', '');
    expect(view.container.textContent).toContain('will not add ingredients to a shopping list');
    click(view, 'Apply recipe to this meal'); expect(onApply.mock.calls[0][0]).toMatchObject({ ingredients: '', steps: '' });
  });
  it('keeps rejected changes editable and reports the host reason before a retry', () => {
    const onApply = vi.fn().mockReturnValueOnce({ ok: false, message: 'The planned meal changed. Reopen the editor.' }).mockReturnValueOnce({ ok: true });
    const view = mount({ onApply }); click(view, 'Apply recipe to this meal');
    expect(view.container.textContent).toContain('The planned meal changed'); expect(button(view, 'Apply recipe to this meal').disabled).toBe(false);
    input(view, 'Adaptation notes', 'Retry note'); click(view, 'Apply recipe to this meal');
    expect(onApply).toHaveBeenCalledTimes(2); expect(onApply.mock.calls[1][0].notes).toBe('Retry note');
  });
  it.each(['missing', 'throws', 'unconfirmed'])('does not claim success for a %s callback', mode => {
    const onApply = mode === 'missing' ? undefined : mode === 'throws' ? () => { throw new Error('offline'); } : () => undefined;
    const view = mount({ onApply }); click(view, 'Apply recipe to this meal');
    expect(view.container.textContent).not.toContain('The adapted recipe was applied');
    expect(button(view, 'Apply recipe to this meal').disabled).toBe(false);
  });
  it('waits for async confirmation and rejects duplicate calls even within the same event batch', async () => {
    let resolve; const operation = new Promise(done => { resolve = done; }); const onApply = vi.fn(() => operation);
    const view = mount({ onApply, onCancel: vi.fn() });
    const apply = button(view, 'Apply recipe to this meal');
    React.act(() => { apply.click(); apply.click(); });
    expect(onApply).toHaveBeenCalledTimes(1); expect(button(view, 'Applying recipe changes…').disabled).toBe(true);
    expect(button(view, 'Cancel recipe changes').disabled).toBe(true);
    await React.act(async () => { resolve({ ok: true, message: 'Stored by the host.' }); await operation; });
    expect(view.container.textContent).toContain('Stored by the host.');
    expect(button(view, 'Recipe applied to this meal').disabled).toBe(true);
    click(view, 'Return to meal'); expect(view.props().onCancel).toHaveBeenCalledTimes(1);
  });
  it('handles rejected asynchronous writes without clearing the edited instructions', async () => {
    const onApply = vi.fn(() => Promise.reject(new Error('offline'))), view = mount({ onApply });
    input(view, 'Adapted cooking steps', 'Keep these draft instructions.');
    await React.act(async () => { button(view, 'Apply recipe to this meal').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(button(view, 'Apply recipe to this meal').disabled).toBe(false);
    expect(field(view, 'Adapted cooking steps').value).toBe('Keep these draft instructions.');
    expect(view.container.textContent).toContain('could not be confirmed');
  });
});
