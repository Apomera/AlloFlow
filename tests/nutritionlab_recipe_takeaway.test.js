import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing recipe takeaway source boundary: ' + start);
  return source.slice(first, last);
}
const { Takeaway, takeaway } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  function nlRecipeServings(', '  function NutritionRecipeCookMode(') +
  slice('  function nlRecipeTakeaway(', '  // 31) PersonalRecipeBox') +
  '\nreturn { Takeaway: NutritionRecipeTakeaway, takeaway: nlRecipeTakeaway };'
)(React, React.createElement, (_key, fallback) => fallback);

const recipe = { id: 'beans', name: 'Beans and rice', servings: 2, time: 20, cuisine: 'Family', tags: 'dinner',
  ingredients: '1 cup beans\n1/2 cup rice\nSalt to taste', steps: '1. Simmer for 20 minutes.\r\n\r\n2. Serve at 180°F.\n', notes: 'Family recipe.\nUse a deep pan.', custom: { keep: true } };
let mounted;
function mount(initial = { recipe, servings: 4 }) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let replace;
  function Host() { const state = React.useState(initial); replace = state[1]; return React.createElement(Takeaway, state[0]); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, replace: value => React.act(() => replace(value)) }; return mounted;
}
function button(view, name) { const result = [...view.container.querySelectorAll('button')].find(node => node.textContent === name); expect(result, name).toBeTruthy(); return result; }
function click(view, name) { React.act(() => button(view, name).click()); }
function status(view) { return view.container.querySelector('[role="status"]').textContent; }

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); window.StemLab = {}; });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Nutrition recipe takeaway', () => {
  it('exports scaled quantities and metadata without changing stored ingredients or cooking instructions', () => {
    const before = structuredClone(recipe), result = takeaway(recipe, 4);
    expect(result.text).toContain('Beans and rice\nOriginal recipe: 2 servings\nPreparing: 4 servings');
    expect(result.text).toContain('Cuisine: Family\nRecipe time (as saved): 20 minutes\nTags: dinner');
    expect(result.text).toContain('Ingredients for 4 servings:\n- 2 cups beans\n- 1 cup rice');
    expect(result.text).toContain('Salt to taste (review for ×2 batch) [review amount]');
    expect(result.text).toContain('Cooking steps (as saved):\n' + recipe.steps);
    expect(result.text).toContain('Recipe notes:\n' + recipe.notes);
    expect(result.filename).toBe('recipe-Beans and rice-4-servings.txt');
    expect(recipe).toEqual(before);
  });

  it('retains exact original ingredient lines for the original amount and marks manual quantities', () => {
    const result = takeaway(recipe, 2);
    expect(result.text).toContain('- 1 cup beans\n- 1/2 cup rice\n- Salt to taste [review amount]');
    expect(result.text).not.toContain('×');
  });

  it.each([0, 'bad', null])('exports original ingredients clearly when target %s cannot be scaled', target => {
    const result = takeaway(recipe, target);
    expect(result.text).toContain('Preparing: servings need review');
    expect(result.text).toContain('Ingredient amounts need review:');
    expect(result.text).toContain('Original ingredient text (not scaled):\n' + recipe.ingredients);
    expect(result.text).toContain(recipe.steps);
    expect(result.filename).toContain('-review-amounts.txt');
    expect(result.text).not.toContain('Ingredients for 0 servings');
  });

  it('keeps original quantities when original servings or ingredient size prevent scaling', () => {
    const originalUnknown = takeaway({ ...recipe, servings: null }, 4);
    expect(originalUnknown.text).toContain('Original recipe: servings not set');
    expect(originalUnknown.text).toContain('Original ingredient text (not scaled):\n' + recipe.ingredients);
    const ingredients = Array.from({ length: 501 }, (_, i) => '1 cup ingredient ' + i).join('\n');
    const oversized = takeaway({ ...recipe, ingredients }, 4);
    expect(oversized.text).toContain('more than 500 ingredient lines');
    expect(oversized.text).toContain(ingredients);
  });

  it('sanitizes only the filename and handles absent recipe data and unknown times', () => {
    const unusual = { ...recipe, name: '../CON:meal\\end?*\n. ', time: 'quick' };
    const result = takeaway(unusual, 0.5);
    expect(result.text).toContain(unusual.name.trim());
    expect(result.text).toContain('Recipe time (as saved): quick (review time)');
    expect(result.filename).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
    expect(result.filename).toMatch(/^recipe-.+-0\.5-servings\.txt$/);
    expect(takeaway({ ...recipe, time: 0 }, 2).text).toContain('Recipe time (as saved): 0 minutes');
    expect(takeaway(null, 2).text).toContain('No ingredients saved.');
    expect(takeaway(null, 2).text).toContain('No cooking steps saved.');
    expect(takeaway({ name: 'A'.repeat(1000) }, 2).filename.length).toBeLessThan(110);
  });

  it('previews and copies the selected serving amount only after clipboard confirmation', async () => {
    const writer = vi.fn().mockResolvedValue(undefined); window.StemLab = { writeClipboard: writer };
    const view = mount();
    expect(view.container.querySelector('[aria-label="Recipe text preview"]').textContent).toContain('2 cups beans');
    await React.act(async () => button(view, 'Copy recipe text').click());
    expect(writer).toHaveBeenCalledWith(takeaway(recipe, 4).text);
    expect(status(view)).toBe('Recipe copied.');
    view.replace({ recipe, servings: 1 });
    expect(view.container.querySelector('[aria-label="Recipe text preview"]').textContent).toContain('1/2 cup beans');
    expect(status(view)).toBe('');
  });

  it.each(['false', 'reject', 'throw'])('reports clipboard %s without losing the preview', async mode => {
    window.StemLab = { writeClipboard: mode === 'false' ? vi.fn().mockResolvedValue(false) : mode === 'reject' ? vi.fn().mockRejectedValue(new Error('blocked')) : () => { throw new Error('blocked'); } };
    const view = mount();
    await React.act(async () => button(view, 'Copy recipe text').click());
    expect(status(view)).toContain('Clipboard copy was unavailable');
    expect(status(view)).not.toContain('Recipe copied');
    expect(button(view, 'Copy recipe text').disabled).toBe(false);
    expect(view.container.querySelector('[aria-label="Recipe text preview"]').textContent).toContain(recipe.steps);
  });

  it('ignores late clipboard completion after servings, recipe or component changes', async () => {
    let finish; window.StemLab = { writeClipboard: () => new Promise(resolve => { finish = resolve; }) };
    const view = mount(); click(view, 'Copy recipe text');
    view.replace({ recipe, servings: 1 }); await React.act(async () => finish());
    expect(status(view)).toBe('');
    click(view, 'Copy recipe text'); view.replace({ recipe: { ...recipe, name: 'A different meal' }, servings: 1 });
    await React.act(async () => finish(false)); expect(status(view)).toBe('');
    click(view, 'Copy recipe text'); React.act(() => view.root.unmount()); mounted = null; view.container.remove();
    await React.act(async () => finish());
  });

  it('downloads the shown text and cleans up its temporary anchor and URL', () => {
    vi.useFakeTimers(); const names = [], blobs = [], revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:recipe'; }), revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { names.push(this.download); });
    const view = mount(); click(view, 'Download recipe text');
    expect(names).toEqual(['recipe-Beans and rice-4-servings.txt']);
    expect(blobs[0].type).toBe('text/plain;charset=utf-8');
    expect(status(view)).toBe('Recipe text download started.');
    expect(document.querySelector('a[download]')).toBeNull();
    React.act(() => vi.runAllTimers()); expect(revokeObjectURL).toHaveBeenCalledWith('blob:recipe');
  });

  it('reports download failure and revokes its URL even when clicking throws', () => {
    vi.useFakeTimers(); const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:recipe', revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('blocked'); });
    const view = mount(); click(view, 'Download recipe text');
    expect(status(view)).toContain('download could not start');
    expect(document.querySelector('a[download]')).toBeNull();
    React.act(() => vi.runAllTimers()); expect(revokeObjectURL).toHaveBeenCalledWith('blob:recipe');
  });

  it('keeps the download status when an earlier clipboard operation completes', async () => {
    vi.useFakeTimers(); let finish;
    window.StemLab = { writeClipboard: () => new Promise(resolve => { finish = resolve; }) };
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:recipe', revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const view = mount(); click(view, 'Copy recipe text'); click(view, 'Download recipe text');
    await React.act(async () => finish());
    expect(status(view)).toBe('Recipe text download started.');
    React.act(() => vi.runAllTimers());
  });
});
