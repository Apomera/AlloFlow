import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text) {
  const start = '// DINO_VOXEL_FIND_PANEL_START', end = '// DINO_VOXEL_FIND_PANEL_END';
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino find-panel renderer');
  return text.slice(a, b);
}
const rendererSource = bounded(source);
const renderPanel = new Function(rendererSource + '\nreturn renderDinoDigFindPanel;')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const requestedKeys = [
  'shape_curved', 'shape_elongate', 'shape_compact', 'shape_curved_note', 'shape_elongate_note', 'shape_compact_note',
  'shape_unknown', 'one_exposed', 'many_exposed', 'selected_title', 'shape_unknown_note', 'break_note', 'coordinate_label',
  'removed_label', 'removed_value', 'remaining_label', 'remaining_value', 'eyebrow', 'title', 'intro', 'select_label',
  'select_placeholder', 'select_none', 'select_option', 'inspect_button', 'controls_hint', 'prompts_title', 'prompt_outline',
  'prompt_ends', 'prompt_limits', 'unselected_title', 'empty_title', 'unselected_note', 'empty_note', 'limit'
].map(key => 'find_' + key);
const T = { panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) };
  }
};
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...tree.children.flatMap(nodes)];
}
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function visibleText(tree) {
  if (tree === null || tree === undefined || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden) return '';
  return tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.find_')).toBe(true);
  const registered = english[key.slice('stem.dinolab.'.length)];
  expect(typeof registered, 'unregistered English key: ' + key).toBe('string');
  expect(registered, 'English fallback differs: ' + key).toBe(fallback);
  return registered;
}
function find(index, shape = 'curved', removed = 2) {
  return { index, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), row: Math.floor(index / 6), col: index % 6, removed, remaining: 4 - removed, shape };
}
function fixture(focus = 22, list = [find(0, 'curved', 3), find(7, 'elongate', 2), find(22, 'compact', 2)]) {
  return { focus, selected: list.find(item => item.index === focus) || null, finds: list };
}
function render(model, extras = {}) { return renderPanel(React, { finds: model, T, translate, ...extras }); }
function assertReadable(tree) {
  expect(visibleText(tree)).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  expect(visibleText(tree)).not.toMatch(/\{[a-zA-Z_]+\}/);
  const ids = nodes(tree).filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of nodes(tree)) {
    for (const attr of ['aria-labelledby', 'aria-describedby']) if (node.props[attr]) {
      for (const id of node.props[attr].split(' ')) expect(ids, 'missing ' + attr + ': ' + id).toContain(id);
    }
    if (node.props.htmlFor) expect(ids).toContain(node.props.htmlFor);
  }
}

describe('shipped Dino exposed-find panel', () => {
  it('ships the same renderer and all 35 English strings in both mirrors', () => {
    expect(bounded(mirrorSource)).toBe(rendererSource);
    expect(requestedKeys).toHaveLength(35);
    const calls = [...rendererSource.matchAll(/ft\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    expect([...new Set(calls.map(match => 'find_' + match[1]))].sort()).toEqual([...requestedKeys].sort());
    for (const key of requestedKeys) {
      expect(typeof english[key], key).toBe('string');
      expect(english[key].length, key).toBeGreaterThan(0);
      expect(mirror[key], key).toBe(english[key]);
      expect(english[key], key).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
    }
    for (const [, key, literal] of calls) expect(english['find_' + key], key).toBe(new Function('return ' + literal + ';')());
  });

  it('offers no inspection when the site has no exposed fragment', () => {
    const model = freeze(fixture(0, [])), before = JSON.stringify(model), tree = render(model);
    expect(byId(tree, 'dino-find-panel').props['data-dig-find-count']).toBe(0);
    expect(byId(tree, 'dino-find-select').props.disabled).toBe(true);
    expect(byId(tree, 'dino-find-select').props.value).toBe('');
    expect(byId(tree, 'dino-find-empty').props['data-dig-find-empty']).toBe('none');
    expect(visibleText(byId(tree, 'dino-find-empty'))).toContain(english.find_empty_title);
    expect(visibleText(byId(tree, 'dino-find-empty'))).toContain(english.find_empty_note);
    expect(byId(tree, 'dino-find-inspect')).toBeUndefined();
    expect(byId(tree, 'dino-find-summary')).toBeUndefined();
    expect(JSON.stringify(model)).toBe(before);
    assertReadable(tree);
  });

  it('keeps an unexposed focus distinct from an empty site and lists only exposed members', () => {
    const model = freeze(fixture(23)), before = JSON.stringify(model), tree = render(model);
    const select = byId(tree, 'dino-find-select');
    expect(select.props.disabled).toBe(false);
    expect(select.props.value).toBe('');
    expect(select.children.map(option => option.props.value)).toEqual(['', '0', '7', '22']);
    expect(byId(tree, 'dino-find-empty').props['data-dig-find-empty']).toBe('unselected');
    expect(visibleText(byId(tree, 'dino-find-empty'))).toContain(english.find_unselected_title);
    expect(visibleText(byId(tree, 'dino-find-empty'))).toContain(english.find_unselected_note);
    expect(byId(tree, 'dino-find-inspect')).toBeUndefined();
    expect(byId(tree, 'dino-find-summary')).toBeUndefined();
    expect(JSON.stringify(model)).toBe(before);
    assertReadable(tree);
  });

  it.each([[0, 'curved'], [7, 'elongate'], [22, 'compact']])('shows the observed %s fragment with its %s outline and model counts', (index, shape) => {
    const model = freeze(fixture(index)), before = JSON.stringify(model), tree = render(model);
    const selected = model.selected, summary = byId(tree, 'dino-find-summary');
    expect(summary.props['data-dig-find-selected']).toBe(index);
    expect(byId(tree, 'dino-find-select').props.value).toBe(String(index));
    expect(nodes(summary).find(node => node.props['data-dig-find-shape'] !== undefined).props['data-dig-find-shape']).toBe(shape);
    expect(visibleText(summary)).toContain(english['find_shape_' + shape]);
    expect(visibleText(summary)).toContain(english['find_shape_' + shape + '_note']);
    expect(visibleText(summary)).toContain(english.find_removed_value.replace('{removed}', selected.removed));
    expect(visibleText(summary)).toContain(english.find_remaining_value.replace('{remaining}', selected.remaining));
    expect(visibleText(summary)).toContain(english.find_break_note);
    expect(visibleText(byId(tree, 'dino-find-inspect'))).toBe(english.find_inspect_button.replace('{coord}', selected.coord));
    expect(byId(tree, 'dino-find-empty')).toBeUndefined();
    expect(JSON.stringify(model)).toBe(before);
    assertReadable(tree);
  });

  it('supports index zero as a native select value and forwards selection without inspection', () => {
    const model = freeze(fixture(22)), before = JSON.stringify(model), selected = [], inspected = [];
    const tree = render(model, { onSelect: (...args) => selected.push(args), onInspect: (...args) => inspected.push(args) });
    byId(tree, 'dino-find-select').props.onChange({ target: { value: '0' } });
    expect(selected).toEqual([[0]]);
    expect(inspected).toEqual([]);
    expect(JSON.stringify(model)).toBe(before);
    expect(byId(tree, 'dino-find-select').props.value).toBe('22');
  });

  it('ignores the placeholder, malformed ids, and ids absent from the exposed list', () => {
    const model = freeze(fixture()), calls = [];
    const tree = render(model, { onSelect: (...args) => calls.push(args) });
    for (const value of ['', 'garbage', '-1', '24', '23', '1.5', '0x23']) byId(tree, 'dino-find-select').props.onChange({ target: { value } });
    expect(calls).toEqual([]);
  });

  it('inspects only the currently selected exposed id without modifying the model', () => {
    const model = freeze(fixture(7)), before = JSON.stringify(model), calls = [], selected = [];
    const tree = render(model, { onInspect: (...args) => calls.push(args), onSelect: (...args) => selected.push(args) });
    byId(tree, 'dino-find-inspect').props.onClick();
    expect(calls).toEqual([[7]]);
    expect(selected).toEqual([]);
    expect(JSON.stringify(model)).toBe(before);
    expect(nodes(tree).filter(node => node.type === 'button')).toHaveLength(1);
    expect(nodes(tree).filter(node => node.type === 'select')).toHaveLength(1);
  });

  it('cannot inspect a stale selected object absent from the current exposed members', () => {
    const model = freeze({ ...fixture(23), selected: find(23, 'curved', 4) }), before = JSON.stringify(model), calls = [];
    const tree = render(model, { onInspect: (...args) => calls.push(args) });
    expect(byId(tree, 'dino-find-inspect')).toBeUndefined();
    expect(byId(tree, 'dino-find-summary')).toBeUndefined();
    expect(byId(tree, 'dino-find-select').props.value).toBe('');
    expect(calls).toEqual([]);
    expect(JSON.stringify(model)).toBe(before);
  });

  it('uses the current exposed member rather than stale shape or layer counts on selected', () => {
    const model = freeze({ ...fixture(7), selected: { ...find(7, 'compact', 4), catalog: 'unobserved-private-value' } });
    const tree = render(model), summary = byId(tree, 'dino-find-summary');
    expect(visibleText(summary)).toContain(english.find_shape_elongate_note);
    expect(visibleText(summary)).not.toContain(english.find_shape_compact_note);
    expect(visibleText(summary)).toContain(english.find_removed_value.replace('{removed}', '2'));
    expect(visibleText(tree)).not.toContain('unobserved-private-value');
  });

  it('shows the singular find count and optional open prompts without a graded answer', () => {
    const tree = render(freeze(fixture(0, [find(0)])));
    expect(visibleText(tree)).toContain(english.find_one_exposed);
    const prompts = nodes(tree).find(node => node.type === 'details');
    expect(prompts).toBeDefined();
    expect(prompts.props.open).toBeUndefined();
    expect(visibleText(prompts)).toContain(english.find_prompts_title);
    expect(nodes(prompts).filter(node => node.type === 'li')).toHaveLength(3);
    expect(nodes(tree).filter(node => ['input', 'textarea'].includes(node.type))).toHaveLength(0);
    expect(visibleText(tree)).toContain(english.find_limit);
    expect(visibleText(tree)).toContain(english.find_controls_hint);
    assertReadable(tree);
  });

  it('does not read hidden dig, anatomy or species fields', () => {
    const model = fixture(7);
    for (const key of ['site', 'bones', 'burial', 'chosen', 'catalog', 'clues', 'anatomy']) Object.defineProperty(model, key, { get() { throw new Error('Read hidden ' + key); } });
    for (const item of model.finds) for (const key of ['burial', 'hasBone', 'fossilY', 'species', 'anatomy']) Object.defineProperty(item, key, { get() { throw new Error('Read hidden find ' + key); } });
    expect(() => render(model)).not.toThrow();
  });

  it.each([null, {}, { finds: null }])('omits a missing or invalid public model', model => {
    expect(render(model)).toBeNull();
  });
});
