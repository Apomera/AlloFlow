import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, marker) {
  const a = text.indexOf('// ' + marker + '_START'), b = text.indexOf('// ' + marker + '_END', a);
  if (a < 0 || b <= a) throw new Error('Missing shipped Dino find plate section: ' + marker);
  return text.slice(a, b);
}
const modelSource = bounded(source, 'DINO_VOXEL_DIG_FIND_PLATE');
const helperSource = bounded(source, 'DINO_VOXEL_FIND_DISPLAY_UI');
const H = new Function(modelSource + '\n' + helperSource + '\nreturn {digVoxelFindPlate, renderDinoDigFindDisplayControls};')();
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
const T = { panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }; } };
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []; }
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function withAttr(tree, name) { return nodes(tree).filter(node => node.props[name] !== undefined); }
function text(tree) {
  if (tree === null || tree === undefined || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true') return '';
  return tree.children.map(text).join(' ').replace(/\s+/g, ' ').trim();
}
function selected(index = 6, removed = 2) { return { index, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), row: Math.floor(index / 6), col: index % 6, shape: ['curved','elongate','compact'][index % 3], removed, remaining: 4 - removed }; }
function translate(key, fallback) { expect(key.startsWith('stem.dinolab.find_')).toBe(true); expect(english[key.slice('stem.dinolab.'.length)], key).toBe(fallback); return fallback; }
function panel(extras = {}) {
  const record = extras.selected === undefined ? selected() : extras.selected;
  const look = extras.look === undefined ? 'surface' : extras.look;
  const seed = extras.seed === undefined ? 71 : extras.seed;
  const plate = extras.plate === undefined ? H.digVoxelFindPlate(seed, record, look) : extras.plate;
  return H.renderDinoDigFindDisplayControls(React, { selected: record, findMode: true, look, plate, onLook() {}, onCamera() {}, T, translate, ...extras });
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function comparable(value) { if (typeof value === 'function') return '[function]'; if (Array.isArray(value)) return value.map(comparable); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, comparable(child)])); return value; }

describe('shipped exposed-fragment reference-view plate UI', () => {
  it('ships the exact same bounded helper and five registered readable fallback phrases in both mirrors', () => {
    expect(bounded(mirrorSource, 'DINO_VOXEL_FIND_DISPLAY_UI')).toBe(helperSource);
    const calls = [...helperSource.matchAll(/ft\('(plate_[^']+)', ('(?:\\.|[^'\\])*')/g)];
    expect([...new Set(calls.map(match => 'find_' + match[1]))]).toHaveLength(5);
    for (const [, suffix, literal] of calls) {
      const key = 'find_' + suffix;
      expect(english[key], key).toBe(new Function('return ' + literal + ';')()); expect(mirror[key], key).toBe(english[key]);
    }
  });

  it('renders exactly three fixed-size decorative canvases with canonical views and the active observation key', () => {
    const tree = panel(), plate = H.digVoxelFindPlate(71, selected(), 'surface'), canvases = withAttr(tree, 'data-dig-find-plate-view');
    expect(canvases.map(node => node.props.id)).toEqual(['dino-find-plate-oblique','dino-find-plate-top','dino-find-plate-end']);
    expect(canvases.map(node => node.props['data-dig-find-plate-view'])).toEqual(['oblique','top','end']);
    for (const node of canvases) {
      expect(node.type).toBe('canvas'); expect(node.props.width).toBe(256); expect(node.props.height).toBe(176);
      expect(node.props['aria-hidden']).toBe('true'); expect(node.props['data-dig-find-plate-key']).toBe(plate.key);
      expect(node.props['data-dig-find-plate-ready']).toBe('false'); expect(node.props.key).toBe(plate.key + ':' + node.props['data-dig-find-plate-view']);
    }
    const wrapper = byId(tree, 'dino-find-view-plate');
    expect(wrapper.props.role).toBe('group'); expect(wrapper.props['data-dig-find-plate-selected']).toBe(6); expect(wrapper.props['data-dig-find-plate-key']).toBe(plate.key);
  });

  it('keeps camera shortcuts native, momentary and limited to the three existing commands', () => {
    const commands = [], forbidden = [], tree = panel({ onCamera: value => commands.push(value), onExcavate: () => forbidden.push('dig'), onReveal: () => forbidden.push('reveal') });
    const buttons = withAttr(tree, 'data-dig-find-camera');
    expect(buttons.map(button => text(button))).toEqual(['Oblique','Top','End']);
    expect(buttons.every(button => button.type === 'button' && button.props.type === 'button' && button.props['aria-pressed'] === undefined)).toBe(true);
    buttons.forEach(button => button.props.onClick());
    expect(commands).toEqual(['oblique','top','end']); expect(forbidden).toEqual([]);
  });

  it('preserves the existing three lighting/display choices and their normalized active state', () => {
    const changes = [], tree = panel({ look: 'raking', onLook: value => changes.push(value) }), buttons = withAttr(tree, 'data-dig-find-look');
    expect(buttons.map(button => button.props['data-dig-find-look'])).toEqual(['surface','raking','outline']);
    expect(buttons.filter(button => button.props['aria-pressed']).map(button => button.props['data-dig-find-look'])).toEqual(['raking']);
    buttons.forEach(button => button.props.onClick()); expect(changes).toEqual(['surface','raking','outline']);
  });

  it('names the exposed coordinate and chosen display look with common framing in every caption', () => {
    for (const [look, label] of [['surface','Surface'],['raking','Raking light'],['outline','Outline']]) {
      const tree = panel({ look });
      expect(text(byId(tree, 'dino-find-plate-caption'))).toBe(`The three previews show A2 with ${label}, using the same framing.`);
      expect(byId(tree, 'dino-find-display').props['data-dig-find-look-current']).toBe(look);
    }
  });

  it('explains contour changes across viewpoints and gives a durable 3D alternative to preview images', () => {
    const tree = panel();
    expect(text(byId(tree, 'dino-find-plate-hint'))).toContain('one fragment’s outline changes with viewpoint');
    expect(text(byId(tree, 'dino-find-plate-hint'))).toContain('features hidden by the first view');
    expect(text(byId(tree, 'dino-find-plate-fallback'))).toBe('Use the view buttons to inspect the fragment in 3D when previews are unavailable.');
    expect(text(tree)).not.toMatch(/loading|please wait|measured|centimet|millimet|million years|score|unlock|submit/i);
  });

  it('adds no controls, saved response fields, or export actions beyond the six existing buttons', () => {
    const tree = panel();
    expect(nodes(tree).filter(node => ['button','input','select','textarea'].includes(node.type))).toHaveLength(6);
    expect(nodes(tree).some(node => node.props.onChange || node.props.onInput)).toBe(false);
    expect(text(tree)).not.toMatch(/notebook|download|export|record answer/i);
  });

  it('does not render find-view controls in full excavation, row inspection or without a valid selected index', () => {
    expect(panel({ findMode: false })).toBeNull(); expect(panel({ findMode: undefined })).toBeNull(); expect(panel({ selected: null })).toBeNull();
    for (const index of [-1,24,1.5,NaN,Infinity,'6']) expect(panel({ selected: { ...selected(), index } })).toBeNull();
  });

  it('falls back to working native camera commands without fabricated canvases for absent or malformed plates', () => {
    for (const plate of [null, false, [], 'plate', {}, { seed: -1, key: 'bad' }, { seed: 71, key: 'bad' }]) {
      const commands = [], tree = panel({ plate, onCamera: value => commands.push(value) });
      expect(withAttr(tree, 'data-dig-find-plate-view')).toHaveLength(0);
      expect(byId(tree, 'dino-find-plate-caption')).toBeUndefined(); expect(byId(tree, 'dino-find-view-plate').props['data-dig-find-plate-key']).toBeUndefined();
      withAttr(tree, 'data-dig-find-camera').forEach(button => button.props.onClick()); expect(commands).toEqual(['oblique','top','end']);
      expect(text(byId(tree, 'dino-find-plate-fallback'))).toContain('previews are unavailable');
    }
  });

  it('does not show a stale plate after selecting another fragment or changing its observed removal count', () => {
    const previous = H.digVoxelFindPlate(71, selected(), 'surface');
    expect(withAttr(panel({ selected: selected(7), plate: previous }), 'data-dig-find-plate-view')).toHaveLength(0);
    expect(withAttr(panel({ selected: selected(6,3), plate: previous }), 'data-dig-find-plate-view')).toHaveLength(0);
  });

  it('does not show previews with an old look key after switching display treatment', () => {
    const previous = H.digVoxelFindPlate(71, selected(), 'surface');
    expect(withAttr(panel({ look: 'raking', plate: previous }), 'data-dig-find-plate-view')).toHaveLength(0);
    expect(withAttr(panel({ look: 'outline', plate: previous }), 'data-dig-find-plate-view')).toHaveLength(0);
  });

  it('changes all canvas observation keys on seed, selection, depth or display changes', () => {
    const cases = [{}, { seed: 72 }, { selected: selected(7) }, { selected: selected(6,3) }, { look: 'raking' }, { look: 'outline' }];
    const keys = cases.map(extras => withAttr(panel(extras), 'data-dig-find-plate-view').map(canvas => canvas.props.key));
    expect(new Set(keys.map(value => value[0])).size).toBe(cases.length);
    expect(keys.every(value => value.length === 3 && new Set(value).size === 3)).toBe(true);
  });

  it('uses fresh canonical view metadata rather than reading arbitrary supplied views or hidden properties', () => {
    const record = selected(), plate = H.digVoxelFindPlate(71, record, 'surface');
    for (const key of ['views','burial','species','association']) Object.defineProperty(plate, key, { enumerable: true, get() { throw new Error('Read unsafe plate ' + key); } });
    for (const key of ['burial','fossilY','hasBone','anatomy']) Object.defineProperty(record, key, { enumerable: true, get() { throw new Error('Read hidden find ' + key); } });
    expect(() => panel({ selected: record, plate })).not.toThrow();
    expect(withAttr(panel({ selected: record, plate }), 'data-dig-find-plate-view')).toHaveLength(3);
  });

  it('normalizes unsupported look tokens to the existing Surface treatment consistently', () => {
    for (const look of [undefined, null, 'glossy', 'Raking', 1, {}]) {
      const tree = panel({ look });
      expect(byId(tree, 'dino-find-display').props['data-dig-find-look-current']).toBe('surface');
      expect(text(byId(tree, 'dino-find-plate-caption'))).toContain('with Surface');
    }
  });

  it('disables each original action independently when its callback is unavailable', () => {
    const tree = panel({ onCamera: null, onLook: null });
    expect(withAttr(tree, 'data-dig-find-camera').every(button => button.props.disabled)).toBe(true);
    expect(withAttr(tree, 'data-dig-find-look').every(button => button.props.disabled)).toBe(true);
    expect(() => withAttr(tree, 'data-dig-find-camera')[0].props.onClick()).not.toThrow();
    expect(() => withAttr(tree, 'data-dig-find-look')[0].props.onClick()).not.toThrow();
  });

  it('keeps one canvas per button, decorative image content and working textual accessible names', () => {
    const buttons = withAttr(panel(), 'data-dig-find-camera');
    for (const button of buttons) {
      expect(button.children.filter(child => child.type === 'canvas')).toHaveLength(1);
      expect(button.children.filter(child => child.type === 'span')).toHaveLength(1);
      expect(button.props['aria-label']).toBeUndefined(); expect(button.props['aria-describedby']).toBe('dino-find-camera-note dino-find-plate-hint');
    }
  });

  it('uses responsive image fitting and compact image-label rows at narrow widths', () => {
    const css = nodes(panel()).find(node => node.type === 'style').children.join('');
    expect(css).toContain('aspect-ratio:256/176'); expect(css).toContain('.dinolab-find-plate-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(css).toContain('@container(max-width:250px)'); expect(css).toContain('grid-template-columns:minmax(76px,96px) minmax(0,1fr)');
    expect(css).toContain('min-height:72px'); expect(css).not.toContain('overflow-x:auto');
  });

  it('keeps valid unique IDs and accessible description references with readable translated text', () => {
    for (const extra of [{}, { look: 'raking' }, { plate: null }]) {
      const tree = panel(extra), all = nodes(tree), ids = all.filter(node => node.props.id).map(node => node.props.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const node of all) for (const key of ['aria-labelledby','aria-describedby']) if (node.props[key]) for (const id of node.props[key].split(' ')) expect(ids, key + ':' + id).toContain(id);
      expect(text(tree)).not.toMatch(/\{[a-zA-Z_]+\}/); expect(text(tree)).not.toMatch(/\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
    }
  });

  it('renders deterministically and leaves frozen plate/find observations unchanged', () => {
    const record = freeze(selected()), plate = freeze(H.digVoxelFindPlate(71, record, 'surface')), before = JSON.stringify({ record, plate });
    expect(comparable(panel({ selected: record, plate }))).toEqual(comparable(panel({ selected: record, plate })));
    expect(JSON.stringify({ record, plate })).toBe(before);
  });
});
