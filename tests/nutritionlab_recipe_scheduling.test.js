import fs from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) { const first = source.indexOf(start); return source.slice(first, source.indexOf(end, first)); }
const { Schedule, Box, Library } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') + slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  var NUTRITION_KIT_RECIPE_SEED = [', '  var NUTRITION_KIT_MAINE_SEASONAL_CALENDAR') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') +
  slice('  function PersonalRecipeLibrary(', '  // 144) PersonalMaineCalendar') +
  '\nreturn {Schedule:NutritionRecipeSchedule,Box:PersonalRecipeBox,Library:PersonalRecipeLibrary};'
)(React, React.createElement, (_key, fallback) => fallback);
const recipe = { id: 'soup', name: 'Family soup', cuisine: 'Family', time: 20, servings: 2,
  ingredients: '1 cup broth\n1/2 onion\nSalt to taste', steps: 'Heat at 180°C.\nCook for 20 minutes.', notes: 'Keep this note.', tags: 'dinner' };
let mounted;
function mount(Component = Schedule, props = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let current = props, replace;
  function Host() {
    const state = React.useState(props); current = state[0]; replace = state[1];
    return React.createElement(Component, { ...current, setData: next => replace(previous => ({ ...previous, data: next })) });
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
function input(view, label, value) {
  const node = field(view, label), prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  React.act(() => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
function toggle(view, day) {
  const label = [...view.container.querySelectorAll('label')].find(el => el.textContent === day); expect(label, day).toBeTruthy();
  React.act(() => label.querySelector('input').click());
}
afterEach(() => { if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } vi.restoreAllMocks(); });

describe('Recipe scheduling', () => {
  it('opens with a focused heading and makes no plan changes until confirmed', () => {
    const onPlanRecipe = vi.fn(() => ({ ok: true, message: 'Added one meal.' }));
    const view = mount(Schedule, { recipe, servings: 4, onPlanRecipe });
    expect(onPlanRecipe).not.toHaveBeenCalled(); expect(document.activeElement.textContent).toBe('Plan Family soup');
    expect(field(view, 'Servings per meal').value).toBe('4');
    expect(view.container.textContent).toContain('1 meal entry · 4 servings each');
    expect(view.container.querySelector('[aria-label="Ingredients per planned meal"]').textContent).toContain('2 cups broth');
    click(view, 'Add to meal plan');
    expect(onPlanRecipe).toHaveBeenCalledWith(recipe, 4, { days: ['monday'], meal: 'dinner', notes: '' });
    expect(view.container.textContent).toContain('Added one meal.');
    expect(button(view, 'Added to meal plan').disabled).toBe(true);
    React.act(() => button(view, 'Added to meal plan').click()); expect(onPlanRecipe).toHaveBeenCalledTimes(1);
  });
  it('orders multiple selected days chronologically and uses the same amount and trimmed notes for each entry', () => {
    const onPlanRecipe = vi.fn(() => ({ ok: true })); const view = mount(Schedule, { recipe, servings: 2, onPlanRecipe });
    toggle(view, 'Monday'); toggle(view, 'Friday'); toggle(view, 'Tuesday'); input(view, 'Scheduled meal slot', 'lunch');
    input(view, 'Servings per meal', '3.5'); input(view, 'Schedule notes', '  Pack before school  ');
    expect(view.container.textContent).toContain('2 meal entries · 3.5 servings each');
    expect(view.container.textContent).toContain('full ingredient amounts');
    click(view, 'Add to meal plan');
    expect(onPlanRecipe).toHaveBeenCalledWith(recipe, 3.5, { days: ['tuesday', 'friday'], meal: 'lunch', notes: 'Pack before school' });
  });
  it('requires at least one day and valid servings', () => {
    const onPlanRecipe = vi.fn(); const view = mount(Schedule, { recipe, servings: 2, onPlanRecipe });
    toggle(view, 'Monday'); click(view, 'Add to meal plan');
    expect(view.container.textContent).toContain('Choose at least one day'); expect(onPlanRecipe).not.toHaveBeenCalled();
    toggle(view, 'Sunday'); input(view, 'Servings per meal', '0'); click(view, 'Add to meal plan');
    expect(view.container.textContent).toContain('greater than 0'); expect(onPlanRecipe).not.toHaveBeenCalled();
    input(view, 'Servings per meal', '101'); click(view, 'Add to meal plan'); expect(onPlanRecipe).not.toHaveBeenCalled();
  });
  it('freezes recipe instructions and initial servings across host updates, preserving numeric zero IDs', () => {
    const sourceRecipe = { ...recipe, id: 0 }, onPlanRecipe = vi.fn(() => ({ ok: true }));
    const view = mount(Schedule, { recipe: sourceRecipe, servings: 4, onPlanRecipe });
    view.replace({ recipe: { ...sourceRecipe, ingredients: '999 cups changed broth', steps: 'New instructions.' }, servings: 8, onPlanRecipe });
    expect(field(view, 'Servings per meal').value).toBe('4'); click(view, 'Add to meal plan');
    expect(onPlanRecipe).toHaveBeenCalledWith(sourceRecipe, 4, { days: ['monday'], meal: 'dinner', notes: '' });
    expect(sourceRecipe.steps).toBe(recipe.steps);
  });
  it('keeps failed schedules editable and reports the host reason', () => {
    const onPlanRecipe = vi.fn().mockReturnValueOnce({ ok: false, message: 'Your draft has 42 meals.' }).mockReturnValueOnce({ ok: true });
    const view = mount(Schedule, { recipe, servings: 2, onPlanRecipe }); click(view, 'Add to meal plan');
    expect(view.container.textContent).toContain('Your draft has 42 meals.'); expect(button(view, 'Add to meal plan').disabled).toBe(false);
    input(view, 'Schedule notes', 'Try again'); click(view, 'Add to meal plan');
    expect(onPlanRecipe).toHaveBeenCalledTimes(2); expect(button(view, 'Added to meal plan').disabled).toBe(true);
  });
  it.each(['missing', 'throws', 'unconfirmed'])('does not claim success for a %s callback', mode => {
    const onPlanRecipe = mode === 'missing' ? undefined : mode === 'throws' ? () => { throw new Error('offline'); } : () => undefined;
    const view = mount(Schedule, { recipe, servings: 2, onPlanRecipe }); click(view, 'Add to meal plan');
    expect(view.container.textContent).not.toContain('Recipe added to your meal-plan draft.');
    expect(button(view, 'Add to meal plan').disabled).toBe(false);
  });
  it('waits for an async confirmation and blocks duplicate submissions', async () => {
    let resolve; const operation = new Promise(done => { resolve = done; }); const onPlanRecipe = vi.fn(() => operation);
    const view = mount(Schedule, { recipe, servings: 2, onPlanRecipe }); click(view, 'Add to meal plan');
    expect(button(view, 'Adding to meal plan…').disabled).toBe(true);
    await React.act(async () => { resolve({ ok: true, message: 'Saved by the host.' }); await operation; });
    expect(view.container.textContent).toContain('Saved by the host.'); expect(onPlanRecipe).toHaveBeenCalledTimes(1);
  });
  it('cancels Recipe Box scheduling without calling the planner and restores focus', () => {
    const onPlanRecipe = vi.fn(), view = mount(Box, { data: { recipes: [recipe] }, onPlanRecipe });
    click(view, 'Open recipe Family soup'); input(view, 'Servings to prepare', '6'); click(view, 'Plan this recipe');
    expect(field(view, 'Servings per meal').value).toBe('6'); toggle(view, 'Wednesday'); click(view, 'Cancel scheduling');
    expect(onPlanRecipe).not.toHaveBeenCalled(); expect(view.container.querySelector('[data-nutrition-recipe-schedule]')).toBeNull();
    expect(document.activeElement).toBe(button(view, 'Plan this recipe'));
    expect(view.props().data.recipes).toEqual([recipe]);
  });
  it('opens the same scheduler from the Recipe Library without importing the starter', () => {
    const onPlanRecipe = vi.fn(() => ({ ok: true })), onSaveRecipe = vi.fn();
    const view = mount(Library, { recipes: [], onPlanRecipe, onSaveRecipe });
    const open = [...view.container.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || '').startsWith('Open starter recipe '));
    React.act(() => open.click()); click(view, 'Plan this recipe'); toggle(view, 'Friday'); click(view, 'Add to meal plan');
    expect(onSaveRecipe).not.toHaveBeenCalled(); expect(onPlanRecipe).toHaveBeenCalledTimes(1);
    expect(onPlanRecipe.mock.calls[0][2]).toEqual({ days: ['monday', 'friday'], meal: 'dinner', notes: '' });
    click(view, 'Return to recipe'); expect(view.container.querySelector('[data-nutrition-recipe-schedule]')).toBeNull();
    expect(document.activeElement).toBe(button(view, 'Plan this recipe'));
  });
});
