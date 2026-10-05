import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.DINOLAB_CHECKPOINT_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a || source.indexOf(start, a + 1) >= 0) throw Error('Missing or ambiguous checkpoint seam: ' + start);
  return source.slice(a, b);
}
const helperSource = bounded('// DINO_VOXEL_CHECKPOINT_UI_START', '// DINO_VOXEL_CHECKPOINT_UI_END');
const H = new Function(bounded('// DINO_VOXEL_CHECKPOINT_MODEL_START', '// DINO_VOXEL_CHECKPOINT_MODEL_END') + '\n' + helperSource + '\nreturn {digVoxelCheckpointRecord,digVoxelCheckpoint,digVoxelCheckpointNotes,renderDinoDigCheckpoint};')();
const parsedEnglish = JSON.parse(readFileSync(process.env.DINOLAB_CHECKPOINT_ENGLISH || 'ui_strings.js', 'utf8'));
const english = parsedEnglish.stem ? parsedEnglish.stem.dinolab : parsedEnglish;
const T = { panel: '#ffffff', deeper: '#eee7db', text: '#181511', soft: '#595044', border: '#b9ad9b' };
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false) }; } };
function nodes(tree) { return tree && typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : []; }
function byId(tree, id) { return nodes(tree).find(node => node.props.id === id); }
function visibleText(tree) { return tree == null || tree === false ? '' : typeof tree !== 'object' ? String(tree) : tree.type === 'style' || tree.props.hidden || tree.props['aria-hidden'] === 'true' ? '' : tree.children.map(visibleText).join(' ').replace(/\s+/g, ' ').trim(); }
function survey(patches = {}, seed = 42, focus = 0) {
  const columns = Array.from({ length: 24 }, (_, index) => {
    const [removed, status] = patches[index] || [0,'covered'];
    return { index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status, shape: status === 'exposed' ? ['curved','elongate','compact'][index % 3] : null };
  });
  return { seed, focus, selected: columns[focus], columns };
}
function translate(key, fallback) {
  expect(key.startsWith('stem.dinolab.checkpoint_')).toBe(true);
  expect(english[key.slice('stem.dinolab.'.length)], key).toBe(fallback);
  return fallback;
}
function panel(observed = survey({ 1: [1,'partial'], 7: [2,'contact'], 14: [3,'exposed'] }), extras = {}) {
  return H.renderDinoDigCheckpoint(React, { survey: observed, checkpoint: H.digVoxelCheckpoint(observed, H.digVoxelCheckpointRecord(survey())), guides: true, onRecord() {}, onClear() {}, onGuides() {}, onSelect() {}, onNote() {}, T, translate, ...extras });
}
function assertReadable(tree) {
  expect(visibleText(tree)).not.toMatch(/\{[a-zA-Z_]+\}|\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/i);
  const ids = nodes(tree).filter(node => node.props.id).map(node => node.props.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const node of nodes(tree)) {
    for (const attr of ['aria-labelledby','aria-describedby']) if (node.props[attr]) for (const id of node.props[attr].split(' ')) expect(ids, 'missing ' + attr + ': ' + id).toContain(id);
    if (node.props.htmlFor) expect(ids).toContain(node.props.htmlFor);
  }
}

describe('native manually saved checkpoint comparison panel', () => {
  it('registers every readable fallback and begins with a closed native disclosure', () => {
    const calls = [...helperSource.matchAll(/ct\('([^']+)', ('(?:\\.|[^'\\])*')/g)];
    const keys = [...new Set(calls.map(match => 'checkpoint_' + match[1]))];
    expect(keys).toHaveLength(42);
    for (const [, suffix, literal] of calls) expect(english['checkpoint_' + suffix], suffix).toBe(new Function('return ' + literal + ';')());
    const tree = panel(); assertReadable(tree);
    expect(byId(tree, 'dino-checkpoint-details').type).toBe('details');
    expect(byId(tree, 'dino-checkpoint-details').props.open).toBeUndefined();
    expect(byId(tree, 'dino-checkpoint-save').props.disabled).toBe(false);
    expect(visibleText(byId(tree, 'dino-checkpoint-save'))).toBe('Replace comparison baseline');
  });

  it('renders matching 24-cell maps with public counts/status descriptions and no fragment form', () => {
    const tree = panel(), baseline = byId(tree, 'dino-checkpoint-baseline-map'), current = byId(tree, 'dino-checkpoint-current-map');
    expect(baseline.children).toHaveLength(24); expect(current.children).toHaveLength(24);
    baseline.children.forEach((cell, index) => { expect(cell.props['data-dig-checkpoint-cell']).toBe(index); expect(cell.props['aria-label']).toContain('0 of 4 model layers removed. Covered.'); });
    expect(current.children[14].props['aria-label']).toBe('C3: 3 of 4 model layers removed. Fragment exposed.');
    expect(current.children[7].props['aria-label']).toContain('Contact recorded.');
    const levels = nodes(tree).filter(node => node.props['data-dig-checkpoint-level'] !== undefined);
    expect(levels).toHaveLength(192);
    baseline.children.forEach(cell => {
      const stack = nodes(cell).filter(node => node.props['data-dig-checkpoint-level'] !== undefined);
      expect(stack.map(node => node.props['data-dig-checkpoint-level'])).toEqual([1,2,3,4]);
      expect(stack.every(node => node.props['data-dig-checkpoint-level-removed'] === 'false')).toBe(true);
      expect(stack.map(node => node.props.style.background)).toEqual(['#9c7244','#b0804f','#76543b','#514a40']);
    });
    const exposedStack = nodes(current.children[14]).filter(node => node.props['data-dig-checkpoint-level'] !== undefined);
    expect(exposedStack.map(node => node.props['data-dig-checkpoint-level-removed'])).toEqual(['true','true','true','false']);
    expect(exposedStack[3].props.style.background).toBe('#514a40');
    expect(nodes(tree).filter(node => node.props['data-dig-checkpoint-select'] !== undefined).map(node => node.props['data-dig-checkpoint-select'])).toEqual([1,7,14]);
    expect(visibleText(tree)).not.toMatch(/curved|elongate|compact|Tyrannosaurus|burial|diagnostic/);
    expect(helperSource).toContain('grid-template-columns:repeat(6,minmax(0,1fr))');
    expect(helperSource).toContain('@container(max-width:680px)');
    expect(helperSource).toContain('min-height:44px');
  });

  it('sends only manual save, clear and selection commands; no map click excavates', () => {
    const calls = [], tree = panel(undefined, { onRecord(...args) { calls.push(['save',...args]); }, onClear(...args) { calls.push(['clear',...args]); }, onSelect(index) { calls.push(['select',index]); } });
    byId(tree, 'dino-checkpoint-save').props.onClick(); byId(tree, 'dino-checkpoint-clear').props.onClick();
    nodes(tree).find(node => node.props['data-dig-checkpoint-select'] === 7).props.onClick();
    expect(calls).toEqual([['save'],['clear'],['select',7]]);
    for (const cell of byId(tree, 'dino-checkpoint-current-map').children) expect(cell.props.onClick).toBeUndefined();
  });

  it('keeps active guide descriptions outside details and removes them whenever guides are inactive', () => {
    const tree = panel(), details = byId(tree, 'dino-checkpoint-details');
    expect(nodes(details).map(node => node.props.id)).not.toContain('dino-checkpoint-guides-hint');
    expect(nodes(details).map(node => node.props.id)).not.toContain('dino-checkpoint-legend');
    expect(byId(tree, 'dino-checkpoint-guides-hint')).toBeDefined(); expect(byId(tree, 'dino-checkpoint-legend')).toBeDefined();
    expect(visibleText(byId(tree, 'dino-checkpoint-legend'))).toContain('Saved surface · dashed violet');
    expect(helperSource).toContain('#6d4c8d'); expect(helperSource).toContain('#176b72');
    const off = panel(undefined, { guides: false });
    expect(byId(off, 'dino-checkpoint-guides-hint')).toBeUndefined(); expect(byId(off, 'dino-checkpoint-legend')).toBeUndefined(); assertReadable(off);
    const calls = [], controls = panel(undefined, { onGuides(value) { calls.push(value); } });
    byId(controls, 'dino-checkpoint-guides').props.onChange({ target: { checked: false } });
    byId(controls, 'dino-checkpoint-guides').props.onChange({ target: { checked: 'true' } });
    expect(calls).toEqual([false]);
  });

  it('hides all historical maps, guides and notes for missing/stale/invalid/ahead comparisons and Find mode', () => {
    const current = survey(), cases = [
      H.digVoxelCheckpoint(current, null), H.digVoxelCheckpoint(current, {}),
      H.digVoxelCheckpoint(current, H.digVoxelCheckpointRecord(survey({}, 71))),
      H.digVoxelCheckpoint(current, H.digVoxelCheckpointRecord(survey({ 2: [2,'contact'] })))
    ];
    for (const checkpoint of cases) {
      const tree = panel(current, { checkpoint, notes: { key: 'old', observation: 'old exposed fragment' } });
      expect(byId(tree, 'dino-checkpoint-panel').props['data-dig-checkpoint-kind']).toBe(checkpoint.kind);
      for (const id of ['dino-checkpoint-baseline-map','dino-checkpoint-current-map','dino-checkpoint-guides-hint','dino-checkpoint-legend','dino-checkpoint-note-observation']) expect(byId(tree, id)).toBeUndefined();
      expect(visibleText(tree)).not.toContain('old exposed fragment'); assertReadable(tree);
    }
    expect(panel(current, { findMode: true })).toBeNull();
  });

  it('recomputes the ready observation model and rejects a forged or stale incoming key', () => {
    const current = survey(), good = H.digVoxelCheckpoint(current, H.digVoxelCheckpointRecord(current));
    for (const checkpoint of [{ ...good, key: 'forged' }, { ...good, seed: 71 }, { ...good, baselineKey: 'forged' }, { ...good, baseline: H.digVoxelCheckpointRecord(survey({ 2: [2,'exposed'] })) }]) {
      const tree = panel(current, { checkpoint });
      expect(byId(tree, 'dino-checkpoint-panel').props['data-dig-checkpoint-kind']).toBe('invalid');
      expect(byId(tree, 'dino-checkpoint-current-map')).toBeUndefined(); expect(byId(tree, 'dino-checkpoint-note-observation')).toBeUndefined();
    }
    const empty = panel(current, { checkpoint: good });
    expect(visibleText(byId(empty, 'dino-checkpoint-status'))).toContain('match your saved checkpoint');
    expect(nodes(empty).filter(node => node.props['data-dig-checkpoint-select'] !== undefined)).toHaveLength(0);
  });

  it('renders controlled bounded reasoning fields and preserves literal writing safely', () => {
    const current = survey({ 2: [1,'partial'] }), comparison = H.digVoxelCheckpoint(current, H.digVoxelCheckpointRecord(survey()));
    const calls = [], tree = panel(current, { checkpoint: comparison, notes: { key: comparison.baselineKey, observation: '<script>A1</script>', interpretation: 'Evidence', next: 'Try B2' }, onNote(field, value) { calls.push([field,value]); } });
    const observation = byId(tree, 'dino-checkpoint-note-observation');
    expect(observation.props.value).toBe('<script>A1</script>'); expect(observation.props.maxLength).toBe(400);
    expect(observation.props.dangerouslySetInnerHTML).toBeUndefined();
    observation.props.onChange({ target: { value: 'x'.repeat(450) } });
    observation.props.onChange({ target: { value: 9 } });
    expect(calls).toEqual([['observation','x'.repeat(400)]]);
    expect(nodes(tree).filter(node => node.type === 'textarea').map(node => node.props['data-dig-checkpoint-note'])).toEqual(['observation','interpretation','next']);
    assertReadable(tree);
  });

  it('disables callbacks that are unavailable and does not trigger them through direct handler calls', () => {
    const tree = panel(undefined, { onRecord: null, onClear: null, onGuides: null, onSelect: null, onNote: null });
    for (const id of ['dino-checkpoint-save','dino-checkpoint-clear','dino-checkpoint-guides','dino-checkpoint-note-observation']) expect(byId(tree, id).props.disabled).toBe(true);
    expect(() => byId(tree, 'dino-checkpoint-save').props.onClick()).not.toThrow();
    expect(() => byId(tree, 'dino-checkpoint-clear').props.onClick()).not.toThrow();
    expect(() => byId(tree, 'dino-checkpoint-note-observation').props.onChange({ target: { value: 'text' } })).not.toThrow();
  });
});
