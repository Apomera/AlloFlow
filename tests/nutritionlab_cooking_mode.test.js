import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing source boundary: ' + start);
  return source.slice(first, last);
}
const { Cook, Box, Library, steps } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  var NUTRITION_KIT_RECIPE_SEED = [', '  var NUTRITION_KIT_MAINE_SEASONAL_CALENDAR') +
  slice('  // Recipe planning helpers', '  // 32) PersonalCookingSkills') +
  slice('  function PersonalRecipeLibrary(', '  // 144) PersonalMaineCalendar') +
  '\nreturn { Cook: NutritionRecipeCookMode, Box: PersonalRecipeBox, Library: PersonalRecipeLibrary, steps: nlRecipeSteps };'
)(React, React.createElement, (_key, fallback) => fallback);

const recipe = {
  id: 'soup', name: 'Family soup', servings: 2, time: 25,
  ingredients: '1 cup broth\n1/2 onion\nSalt to taste',
  steps: '1. Heat to 180°C.\n2. Simmer 20 minutes.\n3. Serve.', notes: 'Keep this family note.'
};
let mounted;
function mount(Component, props) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const render = next => React.act(() => root.render(React.createElement(Component, next)));
  mounted = { host, root, render }; render(props); return mounted;
}
function button(name) {
  const node = [...mounted.host.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent) === name);
  expect(node, name).toBeTruthy(); return node;
}
function click(name) { React.act(() => button(name).click()); }
function current() { return mounted.host.querySelector('[data-nutrition-current-step]').textContent; }
function setServings(value) {
  const node = mounted.host.querySelector('input[aria-label="Servings to prepare"]');
  React.act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  vi.unstubAllGlobals();
});

describe('Nutrition guided cooking', () => {
  it('uses only line boundaries without rewriting numbers, times, or temperatures', () => {
    expect(steps('  1.5 cups; heat to 180°C.\r\n\r\nRest 10–15 minutes.  ')).toEqual(['1.5 cups; heat to 180°C.', 'Rest 10–15 minutes.']);
    expect(steps(null)).toEqual([]); expect(steps(['a'])).toEqual([]);
  });

  it('focuses the recipe heading, shows scaled ingredients, and leaves source instructions untouched', () => {
    const before = JSON.stringify(recipe);
    const view = mount(Cook, { recipe, servings: 4, onClose() {} });
    expect(document.activeElement).toBe(view.host.querySelector('h2'));
    expect(current()).toBe('1. Heat to 180°C.');
    expect(view.host.textContent).toContain('2 cups broth');
    expect(view.host.textContent).toContain('1 onion');
    expect(view.host.textContent).toContain('Salt to taste (review for ×2 batch)');
    expect(view.host.textContent).toContain('20 minutes');
    expect(JSON.stringify(recipe)).toBe(before);
    expect(button('Previous step').disabled).toBe(true);
  });

  it('separates navigation from completion, retains checks, and can jump back to a step', () => {
    const view = mount(Cook, { recipe, servings: 2 });
    click('Next step'); expect(current()).toBe('2. Simmer 20 minutes.');
    expect(view.host.querySelector('progress').value).toBe(0);
    click('Mark step complete'); expect(view.host.querySelector('progress').value).toBe(1);
    click('Next step'); expect(button('Next step').disabled).toBe(true);
    click('Mark step complete'); click('Go to step 1'); click('Mark step complete');
    expect(view.host.querySelector('progress').value).toBe(3);
    expect(view.host.textContent).toContain('All steps checked.');
    click('Go to step 2, checked'); expect(button('Uncheck this step').getAttribute('aria-pressed')).toBe('true');
    click('Uncheck this step'); expect(view.host.querySelector('progress').value).toBe(2);
    expect(view.host.textContent).not.toContain('All steps checked.');
  });

  it('keeps ingredient checkmarks independent of cooking steps and asks before restarting', () => {
    const view = mount(Cook, { recipe, servings: 2 });
    const first = view.host.querySelector('input[type="checkbox"]');
    React.act(() => first.click()); click('Mark step complete'); click('Next step');
    expect(view.host.textContent).toContain('1 of 3 ingredients checked');
    click('Restart cooking checklist'); click('Keep my progress');
    expect(first.checked).toBe(true); expect(view.host.querySelector('progress').value).toBe(1);
    expect(current()).toBe('2. Simmer 20 minutes.');
    click('Restart cooking checklist'); click('Restart checklist');
    expect(first.checked).toBe(false); expect(view.host.querySelector('progress').value).toBe(0);
    expect(current()).toBe('1. Heat to 180°C.');
  });

  it('freezes the session recipe and amount through parent updates without losing progress', () => {
    const view = mount(Cook, { recipe, servings: 4 }); click('Mark step complete'); click('Next step');
    view.render({ recipe: { ...recipe, name: 'New title', ingredients: '99 cups water', steps: 'Discard original steps.' }, servings: 8 });
    expect(view.host.querySelector('h2').textContent).toBe('Family soup');
    expect(view.host.textContent).toContain('2 cups broth');
    expect(current()).toBe('2. Simmer 20 minutes.');
    expect(view.host.querySelector('progress').value).toBe(1);
  });

  it('handles absent instructions or invalid servings without invented steps or quantities', () => {
    const view = mount(Cook, { recipe: { name: 'Notes only', ingredients: '1 cup rice' }, servings: 'bad' });
    expect(view.host.textContent).toContain('No steps saved yet');
    expect(view.host.textContent).toContain('Enter original and planned servings');
    expect(view.host.querySelector('[data-nutrition-current-step]')).toBeNull();
    expect(view.host.querySelector('progress')).toBeNull();
    expect(view.host.textContent).not.toMatch(/NaN|undefined/);
  });

  it('calls the parent close action without modifying the recipe', () => {
    const close = vi.fn(); mount(Cook, { recipe, servings: 2, onClose: close });
    click('Leave cooking mode'); expect(close).toHaveBeenCalledTimes(1);
  });

  it('launches from Recipe Box with chosen servings, restores trigger focus, and clears progress on reentry', () => {
    const view = mount(Box, { data: { recipes: [recipe] }, setData: vi.fn() });
    click('Open recipe Family soup'); setServings('4'); click('Start cooking');
    expect(view.host.querySelector('[data-nutrition-cook-mode]')).toBeTruthy();
    expect(view.host.textContent).toContain('2 cups broth'); click('Mark step complete');
    click('Leave cooking mode'); expect(document.activeElement).toBe(button('Start cooking'));
    expect(view.host.querySelector('input[aria-label="Servings to prepare"]').value).toBe('4');
    click('Start cooking'); expect(view.host.querySelector('progress').value).toBe(0);
  });

  it('launches from starter Library and blocks cooking with invalid serving amounts', () => {
    const view = mount(Library, {}); click('Open starter recipe Overnight Oats');
    setServings('0'); expect(button('Start cooking').disabled).toBe(true);
    setServings('2'); click('Start cooking'); expect(view.host.textContent).toContain('1 cup rolled oats');
    click('Leave cooking mode'); expect(document.activeElement).toBe(button('Start cooking'));
    expect(view.host.querySelector('input[aria-label="Servings to prepare"]').value).toBe('2');
  });

  it.each([Box, Library])('shows a rejected planning action instead of silently staying on the recipe', Component => {
    const onPlanRecipe = vi.fn(() => ({ ok: false, message: 'Your draft has 42 meals. Save it first.' }));
    const view = mount(Component, { data: { recipes: [recipe] }, onPlanRecipe });
    click(Component === Box ? 'Open recipe Family soup' : 'Open starter recipe Overnight Oats');
    click('Plan this recipe');
    expect(onPlanRecipe).not.toHaveBeenCalled();
    click('Add to meal plan');
    expect(onPlanRecipe).toHaveBeenCalledTimes(1);
    expect([...view.host.querySelectorAll('[role="status"]')].some(node => node.textContent.includes('Your draft has 42 meals.'))).toBe(true);
  });
});
