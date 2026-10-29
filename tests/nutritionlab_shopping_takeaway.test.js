import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
function slice(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last < first) throw new Error('Missing shopping source boundary: ' + start);
  return source.slice(first, last);
}
const { Shopping, takeaway } = new Function('R_NL', 'nlH', '__alloNLT',
  slice('  var _nlInkCache', '  // DATA') +
  slice('  function nl_today()', '  function nlNEDABanner(') +
  slice('  function nlShoppingTakeaway(', '  // 34) PersonalMealPrepPlanner') +
  '\nreturn { Shopping: PersonalShoppingList, takeaway: nlShoppingTakeaway };'
)(React, React.createElement, (_key, fallback) => fallback);

let mounted;
function mount(initialData) {
  const container = document.createElement('div'); document.body.appendChild(container);
  let data;
  function Host() {
    const state = React.useState(initialData); data = state[0];
    return React.createElement(Shopping, { data, setData: state[1] });
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => data };
  return mounted;
}
function button(view, name) {
  const result = [...view.container.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent) === name);
  expect(result, name).toBeTruthy(); return result;
}
function click(view, name) { React.act(() => button(view, name).click()); }
function change(view, name, value) {
  const node = [...view.container.querySelectorAll('input,select')].find(input => input.getAttribute('aria-label') === name);
  expect(node, name).toBeTruthy();
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
function rows(view) { return [...view.container.querySelectorAll('[aria-label="Shopping items"] > li')]; }
function status(view) { return view.container.querySelector('[role="status"]').textContent; }
const seed = () => ({ activeListId: 'week', setting: 'preserve', lists: [{ id: 'week', name: 'Weekend', custom: 42,
  warnings: ['Check the package sizes.'], items: [
    { id: 'a', text: 'Apples', done: true, sources: ['Fruit salad'] },
    { id: 'b', text: '2 cups beans', quantity: 2, unit: 'cup', done: false, sources: ['Beans and rice'] },
    { id: 'c', text: 'Rice', done: false, custom: 'keep' },
  ] }] });

beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); window.StemLab = {}; });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Nutrition shopping take-away', () => {
  it('exports only remaining quantities by default, optionally includes sources, and never mutates saved data', () => {
    const list = seed().lists[0], original = structuredClone(list);
    const result = takeaway(list, 'remaining', false);
    expect(result.count).toBe(2);
    expect(result.text).toContain('Weekend\nRemaining items');
    expect(result.text).toContain('[ ] 2 cups beans');
    expect(result.text).not.toContain('Apples');
    expect(result.text).not.toContain('Beans and rice');
    expect(result.text).toContain('Check the package sizes.');
    const all = takeaway(list, 'all', true);
    expect(all.count).toBe(3);
    expect(all.text).toContain('[x] Apples');
    expect(all.text).toContain('For: Beans and rice');
    expect(list).toEqual(original);
  });

  it('retains legacy text and handles irregular data with safe download names', () => {
    const result = takeaway({ name: '../CON:week\\end?. ', items: ['Oats', null, { text: 'Milk\nplain', done: false }] }, 'all', true);
    expect(result.text).toContain('[ ] Oats');
    expect(result.text).toContain('Unnamed item — review');
    expect(result.text).toContain('Milk\n    plain');
    expect(result.filename).not.toMatch(/[<>:"/\\|?*\u0000-\u001f]/);
    expect(result.filename.startsWith('shopping-')).toBe(true);
    expect(result.filename.endsWith('-all.txt')).toBe(true);
    expect(takeaway({ items: 'broken' }, 'all', false).count).toBe(0);
    expect(takeaway(null, 'remaining', false).text).toContain('Shopping list');
  });

  it('filters by completion while editing, checking, removing and undoing the original record', () => {
    const original = seed(), view = mount(original);
    click(view, 'Remaining shopping items');
    expect(rows(view)).toHaveLength(2);
    expect(rows(view).map(row => row.textContent).join()).not.toContain('Apples');
    click(view, 'Edit item: Rice'); change(view, 'Item text', 'Brown rice'); click(view, 'Save item');
    expect(view.state().lists[0].items[0].text).toBe('Apples');
    expect(view.state().lists[0].items[1].text).toBe('2 cups beans');
    expect(view.state().lists[0].items[2]).toMatchObject({ id: 'c', text: 'Brown rice', custom: 'keep', done: false });
    click(view, 'Remove item: 2 cups beans');
    expect(view.state().lists[0].items.map(item => item.id)).toEqual(['a', 'c']);
    click(view, 'Undo removal');
    expect(view.state().lists[0].items.map(item => item.id)).toEqual(['a', 'b', 'c']);
    React.act(() => rows(view)[1].querySelector('input[type="checkbox"]').click());
    expect(view.state().lists[0].items[2].done).toBe(true);
    expect(view.state().lists[0].items[1].done).toBe(false);
    expect(rows(view)).toHaveLength(1);
    expect(document.activeElement).toBe(button(view, 'Remaining shopping items'));
    expect(view.state().setting).toBe('preserve');
    expect(view.state().lists[0].custom).toBe(42);
  });

  it('distinguishes an empty filter and shows newly added items when the checked filter is active', () => {
    const data = seed(); data.lists[0].items.forEach(item => { item.done = true; });
    const view = mount(data);
    click(view, 'Remaining shopping items');
    expect(rows(view)).toHaveLength(0);
    expect(view.container.textContent).toContain('Everything is checked. Choose All or Checked');
    expect(view.container.textContent).not.toContain('This list is empty.');
    click(view, 'Checked shopping items');
    change(view, 'New shopping item', 'Lemon'); click(view, 'Add shopping item');
    expect(button(view, 'Remaining shopping items').getAttribute('aria-pressed')).toBe('true');
    expect(rows(view)).toHaveLength(1);
    expect(rows(view)[0].textContent).toContain('Lemon');
    expect(view.state().lists[0].items).toHaveLength(4);
  });

  it('copies remaining items regardless of the visible filter and reports success after resolution', async () => {
    const writer = vi.fn().mockResolvedValue(undefined); window.StemLab = { writeClipboard: writer };
    const view = mount(seed()); click(view, 'Checked shopping items');
    change(view, 'Recipe names in export', 'include');
    await React.act(async () => button(view, 'Copy remaining items').click());
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer.mock.calls[0][0]).toContain('2 cups beans');
    expect(writer.mock.calls[0][0]).toContain('For: Beans and rice');
    expect(writer.mock.calls[0][0]).not.toContain('Apples');
    expect(status(view)).toBe('2 remaining items copied.');
    expect(view.state()).toEqual(seed());
  });

  it.each(['false', 'reject', 'throw'])('reports clipboard %s without claiming success', async mode => {
    window.StemLab = { writeClipboard: mode === 'false' ? vi.fn().mockResolvedValue(false) : mode === 'reject' ? vi.fn().mockRejectedValue(new Error('blocked')) : () => { throw new Error('missing'); } };
    const view = mount(seed());
    await React.act(async () => button(view, 'Copy remaining items').click());
    expect(status(view)).toContain('Clipboard copy was unavailable');
    expect(status(view)).not.toContain('copied');
    expect(button(view, 'Copy remaining items').disabled).toBe(false);
  });

  it('does not overwrite a different list status when an earlier clipboard request resolves', async () => {
    let resolveCopy;
    window.StemLab = { writeClipboard: () => new Promise(resolve => { resolveCopy = resolve; }) };
    const data = seed(); data.lists.push({ id: 'other', name: 'Other', items: [{ text: 'Tea', done: false }] });
    const view = mount(data);
    click(view, 'Copy remaining items'); expect(status(view)).toContain('Copying');
    change(view, 'Shopping list', 'other');
    await React.act(async () => resolveCopy());
    expect(status(view)).toBe('');
    expect(button(view, 'Copy remaining items').disabled).toBe(false);
    expect(rows(view)[0].textContent).toContain('Tea');
  });

  it('downloads chosen scope without changing checkmarks and cleans up the object URL', async () => {
    vi.useFakeTimers();
    const blobs = [], names = [];
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:shopping'; }), revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { names.push(this.download); });
    const view = mount(seed());
    change(view, 'Text list includes', 'all');
    click(view, 'Download text list');
    expect(names).toEqual(['shopping-Weekend-all.txt']);
    expect(blobs[0].type).toBe('text/plain;charset=utf-8');
    expect(status(view)).toBe('Text list download started: 3 items.');
    expect(document.querySelector('a[download]')).toBeNull();
    React.act(() => vi.runAllTimers());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:shopping');
    expect(view.state()).toEqual(seed());
  });

  it('reports download failure and does not export empty remaining selections', () => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('blocked'); }), revokeObjectURL: vi.fn() });
    window.StemLab = { writeClipboard: vi.fn() };
    const view = mount(seed());
    click(view, 'Download text list'); expect(status(view)).toContain('download could not start');
    const boxes = [...view.container.querySelectorAll('[aria-label="Shopping items"] input[type="checkbox"]')];
    React.act(() => boxes[1].click()); React.act(() => boxes[2].click());
    click(view, 'Copy remaining items');
    expect(status(view)).toContain('no remaining items to export');
    expect(window.StemLab.writeClipboard).not.toHaveBeenCalled();
  });
});
