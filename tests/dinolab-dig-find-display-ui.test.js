import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, name) {
  const start = '// DINO_VOXEL_' + name + '_START', end = '// DINO_VOXEL_' + name + '_END';
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino renderer ' + name);
  return text.slice(a, b);
}
const displaySource = bounded(source, 'FIND_DISPLAY_UI');
const panelSource = bounded(source, 'FIND_PANEL');
const renderControls = new Function(displaySource + '\nreturn renderDinoDigFindDisplayControls;')();
const renderPanel = new Function(displaySource + '\n' + panelSource + '\nreturn renderDinoDigFindPanel;')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const requestedKeys = [
  'look_surface', 'look_raking', 'look_outline', 'look_surface_note', 'look_raking_note', 'look_outline_note',
  'camera_oblique', 'camera_top', 'camera_end', 'display_controls_label', 'look_group', 'view_shortcuts', 'camera_hint', 'display_hint',
  'plate_group', 'plate_preview_label', 'plate_caption', 'plate_hint', 'plate_fallback'
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
const selected = freeze({ index: 7, coord: 'B2', row: 1, col: 1, removed: 2, remaining: 2, shape: 'elongate' });
const other = freeze({ index: 0, coord: 'A1', row: 0, col: 0, removed: 3, remaining: 1, shape: 'curved' });
function fixture(focus = 7) { return freeze({ focus, selected: focus === 7 ? selected : null, finds: [other, selected] }); }
function controls(extras = {}) { return renderControls(React, { selected, findMode: true, look: 'surface', T, translate, onLook() {}, onCamera() {}, ...extras }); }
function panel(model = fixture(), extras = {}) { return renderPanel(React, { finds: model, T, translate, ...extras }); }
// Each render creates fresh native event handlers. Compare the complete tree,
// including handler presence/type and all markup/CSS, without comparing closure
// identity; forwarding behavior is verified separately above.
function comparableTree(value, property = '') {
  if (typeof value === 'function') return '[function:' + property + ']';
  if (Array.isArray(value)) return value.map((child, index) => comparableTree(child, String(index)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, comparableTree(child, key)]));
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
  }
}

describe('shipped Dino exposed-find display controls', () => {
  it('ships the same isolated display helper and all 19 English strings in both mirrors', () => {
    expect(bounded(mirrorSource, 'FIND_DISPLAY_UI')).toBe(displaySource);
    expect(requestedKeys).toHaveLength(19);
    const calls = [...displaySource.matchAll(/ft\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    expect([...new Set(calls.map(match => 'find_' + match[1]))].sort()).toEqual([...requestedKeys].sort());
    for (const key of requestedKeys) {
      expect(typeof english[key], key).toBe('string');
      expect(mirror[key], key).toBe(english[key]);
      expect(english[key], key).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
    }
    for (const [, key, literal] of calls) expect(english['find_' + key], key).toBe(new Function('return ' + literal + ';')());
  });

  it.each(['surface', 'raking', 'outline'])('marks only the %s look as selected and gives the matching observation note', look => {
    const tree = controls({ look });
    const buttons = nodes(tree).filter(node => node.props['data-dig-find-look']);
    expect(buttons).toHaveLength(3);
    expect(buttons.filter(node => node.props['aria-pressed'] === true).map(node => node.props['data-dig-find-look'])).toEqual([look]);
    expect(buttons.every(node => node.type === 'button' && node.props.type === 'button')).toBe(true);
    expect(byId(tree, 'dino-find-display').props['data-dig-find-look-current']).toBe(look);
    expect(visibleText(byId(tree, 'dino-find-look-note'))).toBe(english['find_look_' + look + '_note']);
    expect(nodes(tree).filter(node => node.type === 'fieldset')).toHaveLength(2);
    expect(nodes(tree).filter(node => node.type === 'legend').map(visibleText)).toEqual([english.find_look_group, english.find_view_shortcuts]);
    assertReadable(tree);
  });

  it('falls back to the ordinary surface look for malformed saved display values', () => {
    for (const look of [undefined, null, {}, [], 9, 'unknown', 'Raking']) {
      const tree = controls({ look });
      expect(byId(tree, 'dino-find-display').props['data-dig-find-look-current']).toBe('surface');
      expect(visibleText(byId(tree, 'dino-find-look-note'))).toBe(english.find_look_surface_note);
      expect(nodes(tree).filter(node => node.props['data-dig-find-look'] && node.props['aria-pressed'] === true).map(node => node.props['data-dig-find-look'])).toEqual(['surface']);
    }
  });

  it('presents view shortcuts as momentary commands without claiming a persistent selected camera', () => {
    const tree = controls({ camera: 'top' });
    const cameras = nodes(tree).filter(node => node.props['data-dig-find-camera']);
    expect(cameras.map(node => node.props['data-dig-find-camera'])).toEqual(['oblique', 'top', 'end']);
    expect(cameras.map(visibleText)).toEqual([english.find_camera_oblique, english.find_camera_top, english.find_camera_end]);
    expect(cameras.every(node => node.props['aria-pressed'] === undefined && node.props['aria-current'] === undefined)).toBe(true);
    expect(visibleText(byId(tree, 'dino-find-camera-note'))).toBe(english.find_camera_hint);
    assertReadable(tree);
  });

  it('forwards only display commands and does not modify the public observation or call excavation actions', () => {
    const looks = [], cameras = [], otherActions = [], before = JSON.stringify(selected);
    const tree = controls({ onLook: (...args) => looks.push(args), onCamera: (...args) => cameras.push(args),
      onSelect: () => otherActions.push('select'), onExcavate: () => otherActions.push('excavate'), onInspect: () => otherActions.push('inspect') });
    for (const node of nodes(tree).filter(node => node.props['data-dig-find-look'])) node.props.onClick();
    for (const node of nodes(tree).filter(node => node.props['data-dig-find-camera'])) node.props.onClick();
    expect(looks).toEqual([['surface'], ['raking'], ['outline']]);
    expect(cameras).toEqual([['oblique'], ['top'], ['end']]);
    expect(otherActions).toEqual([]);
    expect(JSON.stringify(selected)).toBe(before);
  });

  it.each([undefined, false])('keeps the ordinary find panel markup and CSS unchanged outside find mode (%s)', findMode => {
    const model = fixture(), before = JSON.stringify(model), plain = panel(model);
    const tree = panel(model, { findMode, look: 'raking', onLook() {}, onCamera() {} });
    expect(comparableTree(tree)).toEqual(comparableTree(plain));
    expect(byId(tree, 'dino-find-display')).toBeUndefined();
    expect(nodes(tree).filter(node => node.type === 'style')).toHaveLength(1);
    expect(nodes(tree).filter(node => node.type === 'style').map(node => node.children.join('')).join('')).not.toContain('.dinolab-find-display');
    expect(JSON.stringify(model)).toBe(before);
  });

  it.each([null, { index: 23, coord: 'F4', shape: 'compact', removed: 4, remaining: 0 }])('does not show display controls for missing or stale exposed selection', stale => {
    const model = freeze({ ...fixture(23), selected: stale }), before = JSON.stringify(model);
    const tree = panel(model, { findMode: true, onLook() {}, onCamera() {} });
    expect(byId(tree, 'dino-find-display')).toBeUndefined();
    expect(byId(tree, 'dino-find-inspect')).toBeUndefined();
    expect(nodes(tree).filter(node => node.type === 'style')).toHaveLength(1);
    expect(nodes(tree).filter(node => node.type === 'style').map(node => node.children.join('')).join('')).not.toContain('.dinolab-find-display');
    expect(JSON.stringify(model)).toBe(before);
  });

  it('adds controls and their stylesheet only for the currently exposed selected find in find mode', () => {
    const model = fixture(), before = JSON.stringify(model);
    const tree = panel(model, { findMode: true, look: 'outline', onLook() {}, onCamera() {} });
    expect(byId(tree, 'dino-find-display').props['data-dig-find-look-current']).toBe('outline');
    expect(nodes(tree).filter(node => node.type === 'style')).toHaveLength(2);
    expect(nodes(tree).filter(node => node.type === 'button')).toHaveLength(7);
    expect(nodes(tree).filter(node => node.type === 'select')).toHaveLength(1);
    expect(JSON.stringify(model)).toBe(before);
    assertReadable(tree);
  });

  it('disables unavailable callbacks while keeping every choice explicitly named', () => {
    const tree = controls({ onLook: undefined, onCamera: undefined });
    const buttons = nodes(tree).filter(node => node.type === 'button');
    expect(buttons).toHaveLength(6);
    expect(buttons.every(node => node.props.disabled === true && visibleText(node).length > 0)).toBe(true);
    for (const button of buttons) expect(() => button.props.onClick()).not.toThrow();
  });

  it('uses no hidden burial, anatomy or species values for display controls', () => {
    const publicFind = { ...selected };
    for (const key of ['burial', 'hasBone', 'fossilY', 'species', 'anatomy', 'catalog', 'clues']) Object.defineProperty(publicFind, key, { get() { throw new Error('Read hidden ' + key); } });
    expect(() => controls({ selected: publicFind, look: 'raking' })).not.toThrow();
  });
});
