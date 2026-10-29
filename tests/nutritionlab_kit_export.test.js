import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing Nutrition Kit source boundary');
  return source.slice(first, last);
}
const helpers = slice('  function nl_today()', '  function nlNEDABanner(');
const ink = slice('  var _nlInkCache', '  // DATA');
const exporting = slice('  function nutritionKitExportData(', '  // 117) PersonalSleepNutritionLink');
const library = slice('  function PersonalRecipeLibrary(', '  // 144) PersonalMaineCalendar');
const box = slice('  function PersonalRecipeBox(', '  // 32) PersonalCookingSkills');
const seeds = slice('  var NUTRITION_KIT_RECIPE_SEED = [', '  var NUTRITION_KIT_MAINE_SEASONAL_CALENDAR');
const recipeHelpers = slice('  // Recipe planning helpers', '  // 31) PersonalRecipeBox');
const { prepare, Export, Library, RecipeBox } = new Function('R_NL', 'nlH', '__alloNLT',
  ink + helpers + seeds + recipeHelpers + library + box + exporting + '\nreturn { prepare: nutritionKitExportData, Export: PersonalNutritionKitExport, Library: PersonalRecipeLibrary, RecipeBox: PersonalRecipeBox };'
)(React, React.createElement, (_key, fallback) => fallback);

let mounted;
function mount(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted = { root, host };
  React.act(() => root.render(React.createElement(Component, props)));
  return host;
}
function click(host, text) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  expect(button, text).toBeTruthy();
  React.act(() => button.click());
}
function csvRows(csv) {
  const cells = [...csv.matchAll(/"((?:[^"]|"")*)"(?:,|\r\n|$)/g)].map(match => match[1].replace(/""/g, '"'));
  return Array.from({ length: cells.length / 6 }, (_, index) => cells.slice(index * 6, index * 6 + 6));
}
beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Nutrition Kit complete exports', () => {
  it('includes meals, recipes, shopping lists, plans, nested routines and settings without changing saved data', () => {
    const state = {
      view: 'myNutritionKit', nlBadges: { labelReader: true },
      kit_meal: { meals: [{ id: 'm1', date: '2026-10-28', name: 'Lunch', notes: 'Rice, beans\nand "family" time' }] },
      kit_recipeBox: { recipes: [{ name: 'Soup', ingredients: '1 onion\n2 cups broth', steps: 'Simmer.' }] },
      kit_shopping: { lists: [{ name: 'Weekend', items: [{ text: 'Oats', done: true }] }] },
      kit_prep: { plans: [{ weekOf: '2026-10-26', monThu: 'Soup' }] },
      kit_routine: { routines: { weekday: ['Lunch'], weekend: [] } },
      kit_hydration: { entries: [{ date: '2026-10-28', amountMl: 250 }], targetMl: 2500 },
      kit_rotation: { rotation: { monday: 'Tacos', tuesday: '' } }
    };
    const before = JSON.stringify(state);
    const result = prepare(state);
    expect(result.error).toBe('');
    expect(result.sections).toBe(7);
    expect(result.rows).toBe(8);
    expect(JSON.parse(result.json)).toEqual(Object.fromEntries(Object.entries(state).filter(([key]) => key.startsWith('kit_'))));
    const rows = csvRows(result.csv);
    expect(rows[0]).toEqual(['Tool', 'Collection', 'Record', 'Date', 'Summary', 'Data (JSON)']);
    expect(rows.find(row => row[0] === 'kit_meal')[3]).toBe('2026-10-28');
    expect(JSON.parse(rows.find(row => row[0] === 'kit_meal')[5])).toEqual(state.kit_meal.meals[0]);
    expect(JSON.parse(rows.find(row => row[0] === 'kit_shopping')[5])).toEqual(state.kit_shopping.lists[0]);
    expect(JSON.parse(rows.find(row => row[0] === 'kit_routine')[5])).toEqual(state.kit_routine.routines);
    expect(rows.find(row => row[0] === 'kit_prep')[3]).toBe('2026-10-26');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps empty collections in JSON and safely exports legacy scalar or irregular records', () => {
    const state = { kit_empty: { meals: [] }, kit_legacy: 'notes', kit_null: null, kit_unusual: { entries: [null, 0, false, { nested: ['a', 'b'] }] } };
    const result = prepare(state);
    expect(result.error).toBe('');
    expect(JSON.parse(result.json)).toEqual(state);
    expect(result.rows).toBe(6);
    for (const invalid of [null, undefined, 'bad', 42, []]) expect(prepare(invalid)).toMatchObject({ sections: 0, rows: 0, error: '' });
    const circular = {}; circular.self = circular;
    expect(prepare({ kit_bad: circular }).error).toContain('could not be prepared');
  });

  it('escapes CSV commas, quotes and newlines and neutralizes formula-like values without altering JSON', () => {
    const state = { kit_notes: ['=1+1', '\t@SUM(A1)', '-2+3', '+cmd', 'Milk, "plain"\nOats'] };
    const result = prepare(state);
    const rows = csvRows(result.csv).slice(1);
    expect(rows.map(row => row[4])).toEqual(["'=1+1", "'\t@SUM(A1)", "'-2+3", "'+cmd", 'Milk, "plain"\nOats']);
    expect(rows.map(row => JSON.parse(row[5]))).toEqual(state.kit_notes);
    expect(JSON.parse(result.json)).toEqual(state);
  });

  it('announces empty and malformed state without crashing or starting a download', () => {
    const host = mount(Export, { allData: {} });
    click(host, 'Download Kit JSON');
    expect(host.querySelector('[role="status"]').textContent).toContain('No saved Kit data');
    const circular = {}; circular.self = circular;
    React.act(() => mounted.root.render(React.createElement(Export, { allData: { kit_bad: circular } })));
    click(host, 'Download records as CSV');
    expect(host.querySelector('[role="status"]').textContent).toContain('could not be prepared');
  });

  it('reports asynchronous clipboard failures and offers the complete preview', async () => {
    window.StemLab = { writeClipboard: vi.fn().mockRejectedValue(new Error('denied')) };
    const host = mount(Export, { allData: { kit_meal: { meals: [{ name: 'Lunch' }] } } });
    await React.act(async () => click(host, 'Copy Kit JSON'));
    expect(host.querySelector('[role="status"]').textContent).toContain('Clipboard copy was unavailable');
    click(host, 'Show JSON preview');
    expect(host.querySelector('pre').textContent).toContain('Lunch');
    expect(host.querySelector('button[aria-expanded="true"]')).toBeTruthy();
  });

  it('starts JSON and CSV downloads and releases each object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:nutrition-kit');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const names = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { names.push(this.download); });
    const host = mount(Export, { allData: { kit_meal: { meals: [{ name: 'Lunch' }] } } });
    click(host, 'Download Kit JSON');
    click(host, 'Download records as CSV');
    expect(names).toEqual(['nutrition-kit.json', 'nutrition-kit.csv']);
    expect(host.querySelector('[role="status"]').textContent).toBe('CSV download started.');
    expect(document.querySelector('a[download="nutrition-kit.json"]')).toBeNull();
    React.act(() => vi.runAllTimers());
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});

describe('Nutrition Kit card contents', () => {
  it('renders recipe ingredients and cooking steps after opening an actual library recipe', () => {
    const host = mount(Library, {});
    click(host, 'Overnight Oats');
    expect(host.textContent).toContain('Ingredients');
    expect(host.textContent).toContain('Steps');
    expect(host.textContent).toContain('1/2 cup');
    expect(host.textContent).toMatch(/refrigerat|overnight/i);
  });

  it('preserves the Recipe Box form and multiple sibling card children', () => {
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(RecipeBox, { data: { recipes: [] }, setData() {} }));
    expect(html).toContain('Recipe name');
    expect(html).toContain('Ingredients (one per line)');
    expect(html).toContain('Steps (one per line)');
    expect(html).toContain('Save recipe');
  });
});
