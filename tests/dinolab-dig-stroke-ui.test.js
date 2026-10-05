import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text) {
  const start = '// DINO_VOXEL_STROKE_UI_START', end = '// DINO_VOXEL_STROKE_UI_END';
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino stroke comparison UI');
  return text.slice(a, b);
}
const helperSource = bounded(source);
const renderComparison = new Function(helperSource + '\nreturn renderDinoDigStrokeComparison;')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const requestedKeys = [
  'brush', 'trowel', 'row_caption', 'selection_caption', 'site_caption', 'contact_new', 'contact_recorded', 'contact_cleared', 'contact_none',
  'title', 'intro', 'tool_value', 'totals_label', 'changed_label', 'removed_label', 'contacts_label', 'show_previous', 'toggle_hint',
  'legend_before', 'legend_now', 'column_header', 'before_header', 'now_header', 'removed_header', 'contact_header', 'row_empty', 'selection_empty', 'units'
].map(key => 'stroke_' + key);
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
  if (tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true') return '';
  return tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim();
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.stroke_')).toBe(true);
  const registered = english[key.slice('stem.dinolab.'.length)];
  expect(typeof registered, 'unregistered English key: ' + key).toBe('string');
  expect(registered, 'English fallback differs: ' + key).toBe(fallback);
  return registered;
}
function column(index, beforeRemoved = 0, removed = beforeRemoved + 1, contactBefore = false, contactAfter = false) {
  const row = Math.floor(index / 6), col = index % 6;
  return { index, coord: String.fromCharCode(65 + col) + (row + 1), row, col, beforeRemoved, removed,
    beforeRemaining: 4 - beforeRemoved, remaining: 4 - removed, delta: removed - beforeRemoved,
    contactBefore, contactAfter, newContact: !contactBefore && contactAfter };
}
function model(columns = [column(0), column(7, 2, 2, false, true), column(8, 1, 2)], tool = 'trowel') {
  return freeze({ seed: 71, tool, changedCount: columns.length, removedLayers: columns.reduce((sum, entry) => sum + entry.delta, 0),
    newContacts: columns.filter(entry => entry.newContact).length, columns });
}
function panel(comparison = model(), extras = {}) {
  return renderComparison(React, { comparison, show: true, onShow() {}, inspect: false, findMode: false, focus: 7, T, translate, ...extras });
}
function rows(tree) { return nodes(tree).filter(node => node.props['data-dig-stroke-column'] !== undefined); }
function profiles(tree) { return nodes(tree).filter(node => node.props['data-dig-stroke-profile'] !== undefined); }
function totals(tree) { return nodes(tree).filter(node => node.type === 'dd').map(visibleText); }
function comparable(value, property = '') {
  if (typeof value === 'function') return '[function:' + property + ']';
  if (Array.isArray(value)) return value.map((child, index) => comparable(child, String(index)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, comparable(child, key)]));
  return value;
}
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

describe('shipped Dino observed last-stroke comparison UI', () => {
  it('ships the same bounded helper and all 28 readable English phrases in both mirrors', () => {
    expect(bounded(mirrorSource)).toBe(helperSource);
    const calls = [...helperSource.matchAll(/stt\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    expect(requestedKeys).toHaveLength(28);
    expect([...new Set(calls.map(match => 'stroke_' + match[1]))].sort()).toEqual([...requestedKeys].sort());
    for (const key of requestedKeys) {
      expect(typeof english[key], key).toBe('string');
      expect(mirror[key], key).toBe(english[key]);
      expect(english[key], key).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
    }
    for (const [, key, literal] of calls) expect(english['stroke_' + key], key).toBe(new Function('return ' + literal + ';')());
  });

  it('presents the actual observed columns and clearly names whole-stroke totals', () => {
    const tree = panel();
    expect(byId(tree, 'dino-stroke-heading').children).toEqual(['Last excavation']);
    expect(rows(tree).map(row => row.props['data-dig-stroke-column'])).toEqual([0, 7, 8]);
    expect(profiles(tree).map(profile => profile.props['data-dig-stroke-profile'])).toEqual([0, 7, 8]);
    expect(totals(tree)).toEqual(['3', '2', '1']);
    expect(visibleText(tree)).toContain('Whole-stroke totals');
    expect(nodes(tree).find(node => node.type === 'caption').children).toEqual(['Changed columns across the site']);
    expect(nodes(tree).filter(node => node.type === 'th' && node.props.scope === 'col').map(visibleText)).toEqual(['Column', 'Before remaining', 'Now remaining', 'Removed', 'Contact']);
    expect(nodes(tree).filter(node => node.type === 'th' && node.props.scope === 'row').map(visibleText)).toEqual(['A1', 'B2', 'C2']);
    assertReadable(tree);
  });

  it('shows truthful paired surface bars while the accessible table carries numeric values', () => {
    const tree = panel(model([column(0), column(23, 3, 4)], 'trowel'));
    const before = nodes(tree).filter(node => node.props['data-dig-stroke-before'] !== undefined);
    const now = nodes(tree).filter(node => node.props['data-dig-stroke-now'] !== undefined);
    expect(before.map(node => node.props.style.width)).toEqual(['100%', '25%']);
    expect(now.map(node => node.props.style.width)).toEqual(['75%', '0%']);
    expect(now[1].props.style.visibility).toBe('hidden');
    expect(nodes(tree).find(node => node.props.className === 'dinolab-stroke-profiles').props['aria-hidden']).toBe('true');
    expect(rows(tree).map(row => row.children.slice(1, 4).map(visibleText))).toEqual([['4', '3', '1'], ['1', '0', '1']]);
    expect(visibleText(tree)).toContain('Dashed: previous surface');
    expect(visibleText(tree)).toContain('Solid: current surface');
  });

  it.each([true, false])('uses a controlled, named native checkbox for overlay visibility (%s)', show => {
    const tree = panel(undefined, { show }), input = byId(tree, 'dino-stroke-compare');
    expect(input.type).toBe('input');
    expect(input.props.type).toBe('checkbox');
    expect(input.props.checked).toBe(show);
    expect(input.props.disabled).toBe(false);
    expect(input.props['aria-describedby']).toBe('dino-stroke-toggle-hint');
    const label = nodes(tree).find(node => node.props.htmlFor === 'dino-stroke-compare');
    expect(visibleText(label)).toBe('Show previous surfaces in 3D');
    expect(nodes(tree).filter(node => node.type === 'button' || node.type === 'select')).toEqual([]);
    assertReadable(tree);
  });

  it('forwards only a boolean display preference and does not offer excavation or selection actions', () => {
    const calls = [], unrelated = [], comparison = model(), before = JSON.stringify(comparison);
    const tree = panel(comparison, { onShow: (...args) => calls.push(args), onSelect: () => unrelated.push('select'), onExcavate: () => unrelated.push('dig') });
    const handler = byId(tree, 'dino-stroke-compare').props.onChange;
    handler({ target: { checked: true } });
    handler({ target: { checked: false } });
    handler({ target: { checked: 1 } });
    expect(calls).toEqual([[true], [false], [true]]);
    expect(unrelated).toEqual([]);
    expect(JSON.stringify(comparison)).toBe(before);
  });

  it('keeps the table and every observed profile visible when the 3D overlay is unchecked', () => {
    const checked = panel(), unchecked = panel(undefined, { show: false });
    expect(comparable(rows(unchecked))).toEqual(comparable(rows(checked)));
    expect(comparable(profiles(unchecked))).toEqual(comparable(profiles(checked)));
    expect(totals(unchecked)).toEqual(totals(checked));
    expect(nodes(unchecked).filter(node => node.type === 'table')).toHaveLength(1);
  });

  it('keeps the last-stroke tool and whole-site record fixed when current tool or focus changes', () => {
    const comparison = model(), original = panel(comparison, { currentTool: 'brush', focus: 0 });
    const next = panel(comparison, { currentTool: 'trowel', focus: 23 });
    expect(comparable(next)).toEqual(comparable(original));
    expect(byId(next, 'dino-stroke-comparison').props['data-dig-stroke-tool']).toBe('trowel');
    expect(visibleText(next)).toContain('Trowel stroke');
    expect(visibleText(next)).toContain('The record stays the same when you change tools or select another column.');
  });

  it('filters section content to the selected row while preserving explicitly whole-stroke totals', () => {
    const tree = panel(undefined, { inspect: true, focus: 7 });
    expect(rows(tree).map(row => row.props['data-dig-stroke-column'])).toEqual([7, 8]);
    expect(profiles(tree).map(profile => profile.props['data-dig-stroke-profile'])).toEqual([7, 8]);
    expect(totals(tree)).toEqual(['3', '2', '1']);
    expect(nodes(tree).find(node => node.type === 'caption').children).toEqual(['Changed columns in row 2']);
    expect(byId(tree, 'dino-stroke-comparison').props['data-dig-stroke-visible-count']).toBe(2);
    assertReadable(tree);
  });

  it('keeps meaningful table headers and toggle with a clear empty note for an unchanged section row', () => {
    const tree = panel(undefined, { inspect: true, focus: 23 });
    expect(rows(tree)).toEqual([]);
    expect(profiles(tree)).toEqual([]);
    expect(nodes(tree).filter(node => node.type === 'th' && node.props.scope === 'col')).toHaveLength(5);
    expect(byId(tree, 'dino-stroke-compare')).toBeDefined();
    expect(visibleText(byId(tree, 'dino-stroke-row-empty'))).toBe('No columns in row 4 changed during this stroke.');
    expect(totals(tree)).toEqual(['3', '2', '1']);
    assertReadable(tree);
  });

  it('does not silently choose another section row for malformed or absent focus', () => {
    for (const focus of [undefined, null, -1, 24, 1.5, '7', {}, NaN]) {
      const tree = panel(undefined, { inspect: true, focus });
      expect(rows(tree)).toEqual([]);
      expect(nodes(tree).find(node => node.type === 'caption').children).toEqual(['Choose a site row to compare']);
      expect(visibleText(byId(tree, 'dino-stroke-row-empty'))).toBe('Select a site column to choose the row shown in this comparison.');
      assertReadable(tree);
    }
  });

  it('renders nothing in close-up find mode or before an eligible actual stroke exists', () => {
    expect(panel(undefined, { findMode: true })).toBeNull();
    for (const comparison of [null, undefined, {}, { columns: [] }, { tool: 'brush', columns: [] }, { tool: 'unknown', columns: [column(0)] }, { tool: 'brush', columns: {} }]) {
      expect(renderComparison(React, { comparison, T })).toBeNull();
    }
  });

  it('drops malformed, unchanged, contradictory, or out-of-bounds observations instead of fabricating values', () => {
    const valid = column(0), malformed = [
      null, {}, { ...valid, index: 24 }, { ...valid, index: '0' }, { ...valid, row: 1 }, { ...valid, coord: 'F4' },
      { ...valid, beforeRemaining: 5 }, { ...valid, remaining: -1 }, { ...valid, remaining: '3' }, { ...valid, delta: 2 },
      { ...valid, beforeRemoved: 1 }, { ...valid, contactBefore: 'false' }, { ...valid, newContact: true },
      column(0, 2, 1), column(0, 0, 0), column(0, 2, 2, true, false)
    ];
    for (const bad of malformed) expect(panel({ tool: 'brush', columns: [bad] })).toBeNull();
    const tree = panel({ tool: 'brush', changedCount: 999, removedLayers: -2, newContacts: 800, columns: [null, valid] });
    expect(totals(tree)).toEqual(['1', '1', '0']);
    expect(rows(tree)).toHaveLength(1);
  });

  it('bounds displayed records to nine supplied columns and removes duplicate coordinates without double-counting', () => {
    const tree = panel(model(Array.from({ length: 24 }, (_, index) => column(index))));
    expect(rows(tree)).toHaveLength(9);
    expect(profiles(tree)).toHaveLength(9);
    expect(totals(tree)).toEqual(['9', '9', '0']);
    const duplicated = panel(model([column(7), column(7), column(8)]));
    expect(rows(duplicated).map(row => row.props['data-dig-stroke-column'])).toEqual([7, 8]);
    expect(totals(duplicated)).toEqual(['2', '2', '0']);
  });

  it('reports newly encountered contact-only strokes with zero removal and equal before/after surfaces', () => {
    const tree = panel(model([column(7, 2, 2, false, true)]));
    expect(totals(tree)).toEqual(['1', '0', '1']);
    expect(rows(tree)[0].children.slice(1).map(visibleText)).toEqual(['2', '2', '0', 'New contact']);
    expect(nodes(tree).find(node => node.props['data-dig-stroke-before'] !== undefined).props.style.width).toBe('50%');
    expect(nodes(tree).find(node => node.props['data-dig-stroke-now'] !== undefined).props.style.width).toBe('50%');
  });

  it('reports brush-cleared observed contacts without counting another new contact', () => {
    const tree = panel(model([column(7, 2, 3, true, false)], 'brush'));
    expect(totals(tree)).toEqual(['1', '1', '0']);
    expect(rows(tree)[0].children.slice(1).map(visibleText)).toEqual(['2', '1', '1', 'Contact cleared']);
    expect(nodes(tree).find(node => node.props['data-dig-stroke-contact'] === 'cleared')).toBeDefined();
    expect(visibleText(tree)).toContain('Brush stroke');
  });

  it('distinguishes a previously recorded contact from a new contact', () => {
    const tree = panel(model([column(7, 1, 2, true, true)], 'brush'));
    expect(totals(tree)).toEqual(['1', '1', '0']);
    expect(rows(tree)[0].children[4].children).toEqual(['Previously recorded']);
    expect(nodes(tree).find(node => node.props['data-dig-stroke-contact'] === 'recorded')).toBeDefined();
  });

  it('uses only observed layer and contact fields, keeps input immutable, and never reads hidden fossil data', () => {
    const entry = column(7, 2, 2, false, true);
    for (const key of ['burial', 'hasBone', 'fossilY', 'species', 'anatomy', 'catalog', 'clues']) Object.defineProperty(entry, key, { get() { throw new Error('Read hidden ' + key); } });
    const comparison = model([entry]), before = JSON.stringify(comparison);
    expect(() => panel(comparison)).not.toThrow();
    expect(JSON.stringify(comparison)).toBe(before);
    expect(visibleText(panel(comparison))).not.toMatch(/species|anatomy|burial|probability|catalog|clue/i);
  });

  it('disables unavailable overlay handlers while preserving a readable comparison', () => {
    const tree = panel(undefined, { onShow: undefined }), input = byId(tree, 'dino-stroke-compare');
    expect(input.props.disabled).toBe(true);
    expect(() => input.props.onChange({ target: { checked: false } })).not.toThrow();
    expect(rows(tree)).toHaveLength(3);
  });

  it('renders identical readable fallback phrases and interpolation when translation is absent or null', () => {
    const registered = panel(undefined, { inspect: true });
    expect(comparable(panel(undefined, { inspect: true, translate: undefined }))).toEqual(comparable(registered));
    expect(comparable(panel(undefined, { inspect: true, translate: () => null }))).toEqual(comparable(registered));
    assertReadable(registered);
  });

  it('keeps all labels and description references valid across sections, tools, disabled and unchecked states', () => {
    for (const inspect of [false, true]) for (const focus of [0, 7, 23]) for (const show of [false, true]) {
      assertReadable(panel(undefined, { inspect, focus, show, onShow: undefined }));
      assertReadable(panel(model([column(7, 2, 3, true, false)], 'brush'), { inspect, focus, show }));
    }
  });
});
