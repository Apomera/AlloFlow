import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const mirrorSource = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
const english = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
const mirrorEnglish = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous shipped UI seam: ' + start);
  return text.slice(a, b);
}
const legendSource = section(source, '// DINO_VOXEL_PREVIEW_LEGEND_START', '// DINO_VOXEL_PREVIEW_LEGEND_END');
const planSource = section(source, '// DINO_VOXEL_ACTION_PLAN_UI_START', '// DINO_VOXEL_ACTION_PLAN_UI_END');
const componentSource = section(source, '  function makeDinoVoxelDig3D(React)', '  var DinoVoxelDig3DStable = null;');
const terrainSource = section(source, '// DINO_VOXEL_TERRAIN_UI_START', '// DINO_VOXEL_TERRAIN_UI_END');
const H = new Function(legendSource + '\n' + planSource + '\n' + terrainSource + '\nreturn {renderDinoDigPreviewLegend,renderDinoDigActionPlan,renderDinoDigTerrainDisplay};')();
// This fixture executes the actual React render branches, without starting a GPU
// engine. Find eligibility is separately covered by the shipped model tests.
const makeComponent = new Function('digVoxelFind', 'digVoxelFindLook', componentSource + '\nreturn makeDinoVoxelDig3D;')(
  () => ({ selected: null }), value => value === 'outline' || value === 'raking' ? value : 'surface');
const React = {
  createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }; },
  useRef(value) { return { current: value }; }, useEffect() {}, useState(value) { return [value, () => { throw Error('Render changed React state'); }]; }
};
const Component = makeComponent(React);
const keys = ['target','canvas_key','legend_title','solid','dashed','held','volume_hint','target_hint','selected_hint'].map(key => 'preview_' + key);
const themes = [
  { name: 'default', panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' },
  { name: 'dark', panel: '#142126', deeper: '#0a1418', text: '#edf8f3', soft: '#becdc8', border: '#5c7870' },
  { name: 'contrast', panel: '#000000', deeper: '#000000', text: '#ffffff', soft: '#ffffff', border: '#ffffff' }
];
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []; }
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function text(tree, includeDecorative = false) {
  if (tree == null || tree === false) return '';
  if (typeof tree !== 'object') return String(tree);
  if (tree.type === 'style' || tree.props.hidden || (!includeDecorative && tree.props['aria-hidden'] === 'true')) return '';
  return tree.children.map(child => text(child, includeDecorative)).join(' ').replace(/\s+/g, ' ').trim();
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.')).toBe(true);
  const value = english[key.slice('stem.dinolab.'.length)];
  expect(typeof value, 'Unregistered UI key ' + key).toBe('string');
  expect(value, 'Fallback differs for ' + key).toBe(fallback);
  return value;
}
function plan(focus = 7, tool = 'brush') {
  const coord = String.fromCharCode(65 + focus % 6) + (Math.floor(focus / 6) + 1);
  return { focus, coord, tool, blocked: false, blockReason: null, footprint: [focus],
    columns: [{ index: focus, row: Math.floor(focus / 6), col: focus % 6, coord, removed: 1, remaining: 3, contact: false, status: 'candidate', minRemoval: tool === 'brush' ? 1 : 0, maxRemoval: 1 }],
    minRemoval: tool === 'brush' ? 1 : 0, maxRemoval: 1, maxAffected: 1, eligibleCount: 1, protectedCount: 0, clearedCount: 0, contactCount: 0, contactStopCount: 0 };
}
function legend(extras = {}) { return H.renderDinoDigPreviewLegend(React, { plan: plan(), T: themes[0], translate, ...extras }); }
function panel(extras = {}) { return H.renderDinoDigActionPlan(React, { plan: plan(), T: themes[0], translate, inspect: false, preview: true, ...extras }); }
function stage(extras = {}) {
  const focus = extras.focus === undefined ? 7 : extras.focus;
  return Component({ site: { seed: 1 }, state: { version: 1, seed: 1, depths: Array(24).fill(0), contacts: Array(24).fill(false), tool: 'brush', focus },
    focus, inspect: false, findMode: false, preview: true, surveyGuides: false, translate, ...extras });
}
function descriptions(tree) { return byId(tree, 'dino-voxel-canvas').props['aria-describedby'].split(' '); }
function expectReadable(tree) {
  const value = text(tree, true);
  expect(value).not.toMatch(/\{[A-Za-z_]+\}|\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  const ids = nodes(tree).filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('shipped prospective 3D stroke preview UI', () => {
  it('ships the same helper, component and exactly nine preview English phrases in both mirrors', () => {
    expect(section(mirrorSource, '// DINO_VOXEL_PREVIEW_LEGEND_START', '// DINO_VOXEL_PREVIEW_LEGEND_END')).toBe(legendSource);
    expect(section(mirrorSource, '  function makeDinoVoxelDig3D(React)', '  var DinoVoxelDig3DStable = null;')).toBe(componentSource);
    expect(Object.keys(english).filter(key => key.startsWith('preview_')).sort()).toEqual([...keys].sort());
    const calls = [...legendSource.matchAll(/text\('([^']+)', ('(?:\\.|[^'\\])*')/g)].map(([, suffix, literal]) => ['preview_' + suffix, literal]);
    calls.push(...[...componentSource.matchAll(/props\.translate\('stem\.dinolab\.(preview_[^']+)',('(?:\\.|[^'\\])*')/g)].map(([, key, literal]) => [key, literal]));
    expect([...new Set(calls.map(([key]) => key))].sort()).toEqual([...keys].sort());
    for (const [key, literal] of calls) expect(english[key], key).toBe(new Function('return ' + literal + ';')());
    for (const key of keys) { expect(mirrorEnglish[key], key).toBe(english[key]); expect(english[key]).not.toMatch(/\\u[0-9a-f]{4}/i); }
  });

  it('provides a visible native group with its own heading and three named removal encodings', () => {
    const tree = legend();
    expect(tree.props).toMatchObject({ id: 'dino-preview-volume-legend', role: 'group', 'aria-labelledby': 'dino-preview-legend-title', 'data-dig-preview-selected': 7 });
    expect(tree.props.hidden).toBeUndefined(); expect(tree.props['aria-hidden']).toBeUndefined();
    expect(text(byId(tree, 'dino-preview-legend-title'))).toBe(english.preview_legend_title);
    const rows = nodes(tree).filter(node => node.props['data-dig-preview-key']);
    expect(rows.map(node => node.props['data-dig-preview-key'])).toEqual(['guaranteed','conditional','held']);
    expect(rows.map(node => text(node))).toEqual([english.preview_solid,english.preview_dashed,english.preview_held]);
    expectReadable(tree);
  });

  it('uses distinct solid, dashed and crossed geometry without relying on color', () => {
    const icons = nodes(legend()).filter(node => node.props['data-dig-preview-symbol']);
    expect(icons).toHaveLength(3);
    expect(icons.every(node => node.type === 'svg' && node.props['aria-hidden'] === 'true' && node.props.focusable === 'false')).toBe(true);
    const paths = icons.map(icon => nodes(icon).find(node => node.type === 'path').props);
    expect(paths[0].strokeDasharray).toBeUndefined(); expect(paths[1].strokeDasharray).toBeTruthy(); expect(paths[2].strokeDasharray).toBeUndefined();
    expect(paths[0].d).toBe(paths[1].d); expect(paths[2].d).not.toBe(paths[0].d);
    expect((paths[2].d.match(/M/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(paths.every(path => path.stroke === 'currentColor' && path.fill === 'none')).toBe(true);
  });

  it('explains a single top-layer volume, contact uncertainty, and zero removal without promising no observation', () => {
    const tree = legend();
    expect(text(byId(tree, 'dino-preview-volume-hint'))).toBe(english.preview_volume_hint);
    expect(english.preview_volume_hint).toContain('one top model layer'); expect(english.preview_volume_hint).toContain('may stop at contact');
    expect(english.preview_held).toContain('0 layer removals');
    expect(text(tree)).not.toMatch(/no effect|no observation|probability|percent chance|centimet|million years|will find/i);
  });

  it.each([[0,'A1'],[7,'B2'],[23,'F4']])('identifies stored selected column %i independently from the transient canvas preview', (focus, coord) => {
    const tree = legend({ plan: plan(focus) });
    expect(text(tree)).toContain(english.preview_selected_hint.replace('{coord}', coord));
    expect(text(byId(tree, 'dino-preview-target-hint'))).toBe(english.preview_target_hint);
    expect(text(tree)).toContain('does not select a column or excavate'); expectReadable(tree);
  });

  it('adds no buttons, event handlers, live announcements or state writes to the explanatory legend', () => {
    const calls = [], model = freeze(plan()), before = JSON.stringify(model);
    const tree = legend({ plan: model, onSelect: () => calls.push('select'), onExcavate: () => calls.push('excavate'), onPreview: () => calls.push('preview') });
    expect(nodes(tree).some(node => ['button','input','select','textarea'].includes(node.type))).toBe(false);
    expect(nodes(tree).some(node => Object.keys(node.props).some(key => /^on[A-Z]/.test(key)) || node.props['aria-live'] || node.props.role === 'status')).toBe(false);
    expect(calls).toEqual([]); expect(JSON.stringify(model)).toBe(before);
  });

  it('reads only the selected public coordinate, ignoring hidden plan fields', () => {
    const publicPlan = { focus: 7 };
    for (const key of ['burial','hasBone','fossilY','coverRemaining','boneCells','species','clues','catalog','shape']) Object.defineProperty(publicPlan, key, { enumerable: true, get() { throw Error('Hidden read: ' + key); } });
    expect(() => legend({ plan: publicPlan })).not.toThrow();
  });

  it('declines malformed selected columns rather than formatting invented coordinates', () => {
    for (const focus of [undefined,null,-1,24,1.5,NaN,Infinity,'7']) expect(legend({ plan: { focus } })).toBeNull();
    expect(legend({ plan: null })).toBeNull(); expect(legend({ T: null })).toBeNull();
  });

  it.each(themes)('keeps bounded, readable text and semantic shape keys in the $name theme', T => {
    const tree = legend({ T }), css = nodes(tree).find(node => node.type === 'style').children.join('');
    expect(text(tree)).toBe(text(legend())); expect(css).toContain(T.text); expect(css).toContain(T.soft); expect(css).toContain(T.border);
    expect(css).toContain('overflow-wrap:anywhere'); expect(css).toContain('min-width:0'); expectReadable(tree);
  });

  it('falls back to readable native phrases when a translator returns no value', () => {
    for (const translate of [undefined,() => null,() => undefined]) expect(text(legend({ translate }))).toBe(text(legend()));
  });

  it('shows the legend in the enabled full-site plan without adding another control', () => {
    const calls = [], model = freeze(plan()), before = JSON.stringify(model), tree = panel({ plan: model, onPreview: next => calls.push(next) });
    expect(byId(tree, 'dino-preview-volume-legend')).toBeDefined();
    const buttons = nodes(tree).filter(node => node.type === 'button'); expect(buttons).toHaveLength(1);
    expect(buttons[0].props.id).toBe('dino-footprint-toggle'); buttons[0].props.onClick(); expect(calls).toEqual([false]); expect(JSON.stringify(model)).toBe(before);
  });

  it.each([{ inspect: true, preview: true },{ inspect: false, preview: false },{ inspect: true, preview: false }])('omits instructional legend for inspection or hidden preview: %j', branch => {
    const tree = panel(branch); expect(byId(tree, 'dino-preview-volume-legend')).toBeUndefined();
    expect(text(tree)).not.toContain(english.preview_target_hint); expect(text(tree)).not.toContain(english.preview_selected_hint);
  });

  it.each([[0,'brush','Brush','A1'],[7,'trowel','Trowel','B2'],[23,'brush','Brush','F4']])('renders the initial target %i/%s with resolved native text and retained ref', (focus, tool, name, coord) => {
    const state = freeze({ version: 1, seed: 1, depths: Array(24).fill(0), contacts: Array(24).fill(false), tool, focus });
    const before = JSON.stringify(state), tree = stage({ focus, state }), target = byId(tree, 'dino-preview-target');
    expect(text(target, true)).toBe(english.preview_target.replace('{tool}', name).replace('{coord}', coord));
    expect(target.props).toMatchObject({ 'data-dig-preview-target': focus, 'data-dig-preview-tool': tool, 'data-dig-preview-source': 'selection' });
    expect(target.props.ref).toEqual({ current: null }); expect(descriptions(tree)).toContain('dino-preview-volume-legend');
    expect(text(tree, true)).toContain(english.preview_canvas_key); expect(JSON.stringify(state)).toBe(before); expectReadable(tree);
  });

  it.each([{ preview: false },{ inspect: true },{ findMode: true }])('removes target HUD and legend association outside the active full-site preview: %j', branch => {
    const tree = stage(branch); expect(byId(tree, 'dino-preview-target')).toBeUndefined();
    expect(descriptions(tree)).not.toContain('dino-preview-volume-legend'); expect(text(tree, true)).not.toContain(english.preview_canvas_key);
    expect(descriptions(tree)).toContain('dino-voxel-controls-hint');
  });

  it('keeps the decorative pointer HUD bounded and silent while native canvas refers to the visible legend', () => {
    const tree = stage(), target = byId(tree, 'dino-preview-target');
    const wrapper = nodes(tree).find(node => node.children.includes(target));
    expect(wrapper.props['aria-hidden']).toBe('true'); expect(wrapper.props.style.pointerEvents).toBe('none');
    expect(wrapper.props.style.maxWidth).toBe('calc(100% - 28px)'); expect(wrapper.props.style.overflowWrap).toBe('anywhere');
    expect(nodes(wrapper).some(node => node.props['aria-live'] || node.props.role === 'status')).toBe(false);
    const combined = React.createElement('div', {}, tree, panel(), H.renderDinoDigTerrainDisplay(React, { look: 'daylight', onLook() {}, T: themes[0], translate, findMode: false, inspect: false }), React.createElement('p', { id: 'dino-voxel-controls-hint' }, 'Existing canvas controls'));
    const ids = nodes(combined).filter(node => node.props.id).map(node => node.props.id);
    for (const node of nodes(combined)) for (const attr of ['aria-labelledby','aria-describedby']) if (node.props[attr]) for (const id of node.props[attr].split(' ')) expect(ids, attr + ': ' + id).toContain(id);
    expectReadable(combined);
  });
});
