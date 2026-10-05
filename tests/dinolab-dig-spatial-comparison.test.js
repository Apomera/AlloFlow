import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.DINO_SPATIAL_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8');
function block(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a + start.length); if (a < 0 || b < a || source.indexOf(start, a + start.length) >= 0) throw Error('Ambiguous spatial seam'); return source.slice(a, b); }
const checkpoint = block('// DINO_VOXEL_CHECKPOINT_MODEL_START', '// DINO_VOXEL_CHECKPOINT_MODEL_END');
const model = block('// DINO_VOXEL_SPATIAL_MODEL_START', '// DINO_VOXEL_SPATIAL_MODEL_END');
const ui = block('// DINO_VOXEL_SPATIAL_UI_START', '// DINO_VOXEL_SPATIAL_UI_END');
const engine = block('// DINO_VOXEL_SPATIAL_ENGINE_START', '// DINO_VOXEL_SPATIAL_ENGINE_END');
const build = block('// DINO_VOXEL_SPATIAL_BUILD_START', '// DINO_VOXEL_SPATIAL_BUILD_END');
const compare = new Function(checkpoint + model + ';return digVoxelSpatialComparison;')();
function survey(depths = {}, focus = 7, seed = 1) {
  const columns = Array.from({ length: 24 }, (_, index) => { const extra = depths[index] || {}, removed = extra.removed || 0;
    return { index, col: index % 6, row: Math.floor(index / 6), coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status: extra.status || (removed === 4 ? 'cleared' : removed ? 'partial' : 'covered') }; });
  return { seed, focus, columns, selected: columns[focus] };
}
const reference = { seed: 1, index: 0 };
describe('Dino current coordinate comparison', () => {
  it('compares two current public surfaces with a signed removal difference', () => {
    const result = compare(survey({ 0: { removed: 1 }, 7: { removed: 3 } }), reference);
    expect(result).toMatchObject({ kind: 'ready', seed: 1, difference: 2, sameRow: false, reference: { coord: 'A1', removed: 1, remaining: 3 }, selected: { coord: 'B2', removed: 3, remaining: 1 } });
    expect(compare(survey({ 0: { removed: 4 }, 7: { removed: 1 } }), reference).difference).toBe(-3);
  });
  it('distinguishes same coordinate, equal counts and same row', () => {
    expect(compare(survey({}, 0), reference)).toMatchObject({ kind: 'same', difference: 0, sameRow: true });
    expect(compare(survey({}, 5), reference)).toMatchObject({ kind: 'ready', difference: 0, sameRow: true });
  });
  it('updates both public records after excavation and Undo without changing the pinned coordinate', () => {
    const first = compare(survey({ 7: { removed: 2 } }), reference);
    const next = compare(survey({ 0: { removed: 1 }, 7: { removed: 3 } }), reference);
    expect(first.reference.removed).toBe(0); expect(next.reference.removed).toBe(1); expect(next.selected.removed).toBe(3);
    expect(compare(survey({ 7: { removed: 2 } }), reference)).toEqual(first); expect(reference).toEqual({ seed: 1, index: 0 });
  });
  it('retains recorded contact versus exposure even when removal counts are equal', () => {
    const result = compare(survey({ 0: { removed: 2, status: 'contact' }, 7: { removed: 2, status: 'exposed' } }), reference);
    expect(result.difference).toBe(0); expect(result.reference.status).toBe('contact'); expect(result.selected.status).toBe('exposed');
  });
  it('handles missing, stale and malformed saved references without exposing an old marker', () => {
    expect(compare(survey(), null).kind).toBe('missing'); expect(compare(survey({}, 7, 2), reference)).toMatchObject({ kind: 'stale', reference: null });
    for (const raw of [[], {}, false, { seed: 1, index: -1 }, { seed: 1, index: 24 }, { seed: 1, index: .5 }, { seed: '1', index: 0 }]) expect(compare(survey(), raw)).toMatchObject({ kind: 'invalid', reference: null });
  });
  it('rejects forged public counts, coordinates, duplicate cells, statuses and selected records', () => {
    const invalid = [s => s.columns[0].remaining = 3, s => s.columns[0].coord = 'B1', s => s.columns[1] = s.columns[0], s => s.columns[0].status = 'exposed', s => s.selected = { ...s.selected, removed: 4 }];
    for (const change of invalid) { const s = survey(); change(s); expect(compare(s, reference)).toEqual({ kind: 'invalid', reference: null, selected: null }); }
  });
  it('accepts a shuffled valid public survey and never reads hidden anatomy or stored historical counts', () => {
    const s = survey({ 7: { removed: 2 } }); s.columns.reverse();
    for (const object of [s, reference, ...s.columns]) for (const key of ['burial', 'hasBone', 'species', 'savedRemoved']) Object.defineProperty(object, key, { configurable: true, get() { throw Error('Hidden input read'); } });
    expect(compare(s, reference)).toMatchObject({ difference: 2, reference: { index: 0 }, selected: { index: 7 } });
    expect(JSON.stringify(compare(s, reference))).not.toMatch(/burial|hasBone|species|savedRemoved/);
  });
  it('copies bounded records without mutating or retaining mutable survey columns', () => {
    const s = survey({ 7: { removed: 2 } }); s.columns.forEach(Object.freeze); Object.freeze(s.columns); Object.freeze(s);
    const result = compare(s, reference); expect(result.reference).not.toBe(s.columns[0]); result.reference.removed = 4; expect(s.columns[0].removed).toBe(0);
  });
});

const React = { Fragment: 'fragment', createElement(type, props, ...children) { return { type, props: props || {}, children }; } };
const render = new Function(checkpoint + model + ui + ';return renderDinoDigSpatialComparison;')();
const T = { panel: '#fff', deeper: '#eef2f6', text: '#101828', soft: '#344054', border: '#aab5c4' };
function nodes(tree) { if (Array.isArray(tree)) return tree.flatMap(nodes); return tree && typeof tree === 'object' ? [tree, ...nodes(tree.children)] : []; }
function textOf(tree) { if (Array.isArray(tree)) return tree.map(textOf).join(' '); return tree && typeof tree === 'object' ? textOf(tree.children) : tree == null ? '' : String(tree); }
function tree(extra = {}) { return render(React, { survey: survey({ 0: { removed: 1 }, 7: { removed: 3 } }), reference, T, ...extra }); }
describe('Dino spatial comparison learning controls', () => {
  it('aligns two four-level profiles with explicit status and removal alternatives', () => {
    const all = nodes(tree()); const profiles = all.filter(n => n.props['data-dig-spatial-profile']); expect(profiles).toHaveLength(2);
    expect(profiles.map(n => n.props['data-dig-spatial-index'])).toEqual([0, 7]);
    expect(all.filter(n => n.props['data-dig-spatial-level'])).toHaveLength(8);
    expect(all.filter(n => n.props['data-dig-spatial-removed-level'] === 'true')).toHaveLength(4);
    expect(all.filter(n => n.type === 'svg').every(n => n.props.role === 'img' && n.props['aria-label'].includes('model layers'))).toBe(true);
  });
  it('keeps spatial comparison optional and exposes a concise live result and teaching question', () => {
    const result = tree(); expect(nodes(result).find(n => n.type === 'details').props.open).toBeUndefined();
    const status = nodes(result).find(n => n.props.id === 'dino-spatial-result'); expect(status.props.role).toBe('status'); expect(textOf(status)).toContain('B2 has 2 more');
    expect(textOf(result)).toContain('Both profiles update'); expect(textOf(result)).toContain('geological age, real depth, species identity');
  });
  it('uses native actions with only the public reference or selection payload', () => {
    const updates = [], selections = [], result = tree({ onReference: value => updates.push(value), onSelect: value => selections.push(value) });
    for (const id of ['pin', 'clear', 'select']) nodes(result).find(n => n.props.id === 'dino-spatial-' + id).props.onClick();
    expect(updates).toEqual([{ seed: 1, index: 7 }, null]); expect(selections).toEqual([0]);
  });
  it('disables unavailable commands and same-coordinate repinning; new sites cannot reuse the old reference', () => {
    expect(nodes(tree()).filter(n => n.type === 'button').every(n => n.props.disabled)).toBe(true);
    const same = tree({ survey: survey({}, 0), onReference() {} }); expect(nodes(same).find(n => n.props.id === 'dino-spatial-pin').props.disabled).toBe(true);
    expect(nodes(tree({ survey: survey({}, 7, 2) })).filter(n => n.props['data-dig-spatial-profile'])).toHaveLength(0);
  });
  it('explains row visibility and hides the whole panel in Find inspection', () => {
    expect(textOf(tree({ inspect: true }))).toContain('outside this inspected row');
    expect(textOf(tree({ inspect: true, survey: survey({}, 5) }))).toContain('Dashed violet outline');
    expect(tree({ findMode: true })).toBe(null);
  });
  it('registers every fallback phrase in both English branches', () => {
    const keys = []; const primary = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.dinolab;
    const mirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.dinolab;
    for (const match of ui.matchAll(/spt\('([^']+)', '((?:\\.|[^'\\])*)'/g)) { keys.push(match[1]); expect(primary['spatial_' + match[1]]).toBe(match[2]); expect(mirror['spatial_' + match[1]]).toBe(match[2]); }
    expect(new Set(keys).size).toBe(26);
  });
});

const sandbox = { module: { exports: {} }, console }; sandbox.exports = sandbox.module.exports;
vm.runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), sandbox); const THREE = sandbox.module.exports;
function markerFixture() {
  const scene = new THREE.Scene(), geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5, 0, -.5), new THREE.Vector3(.5, 0, -.5)]), material = new THREE.LineDashedMaterial();
  const api = new Function('THREE', 'scene', 'previousSurfaceGeo', 'checkpointBeforeMaterial', 'digVoxelSpatialComparison', 'var spatialReference=null;' + build + engine + ';return {syncSpatialReference,get marker(){return spatialReference;}};')(THREE, scene, geometry, material, compare);
  const p = { site: { seed: 1 }, survey: survey({ 0: { removed: 1 }, 7: { removed: 3 } }), spatialReference: reference, focus: 7 };
  return { api, p, scene, geometry, material };
}
describe('Dino retained reference surface marker', () => {
  it('borrows the existing immutable geometry and material without adding resources or pickers', () => {
    const f = markerFixture(); expect(f.api.marker.geometry).toBe(f.geometry); expect(f.api.marker.material).toBe(f.material); expect(f.scene.children).toHaveLength(1);
    expect(build).not.toMatch(/geometry\(|material\(|textures|pickers|new THREE\.(?:BufferGeometry|[A-Za-z]+Material|[A-Za-z]+Texture)\(/);
    expect(f.api.marker.name).toBe('dino-spatial-reference'); expect(f.api.marker.visible).toBe(false);
  });
  it('places the reference at its current public surface and updates it after excavation and Undo', () => {
    const f = markerFixture(); f.api.syncSpatialReference(f.p); expect(f.api.marker.visible).toBe(true); expect(f.api.marker.position.y).toBeCloseTo(3 * .52 + .10);
    expect(Array.from(f.api.marker.position.toArray())).toEqual([-2.5 * 1.08, 3 * .52 + .10, -1.5 * 1.08]);
    f.p.survey = survey({ 0: { removed: 3 } }); f.api.syncSpatialReference(f.p); expect(f.api.marker.position.y).toBeCloseTo(.52 + .10);
    f.p.survey = survey({ 0: { removed: 1 } }); f.api.syncSpatialReference(f.p); expect(f.api.marker.position.y).toBeCloseTo(3 * .52 + .10);
    expect(f.api.marker.userData).toMatchObject({ index: 0, removed: 1, remaining: 3, status: 'partial' });
  });
  it('filters row inspection and clears Find, missing, stale and forged observations', () => {
    for (const change of [p => p.inspect = true, p => p.findMode = true, p => p.spatialReference = null, p => p.site.seed = 2, p => p.spatialReference = { seed: 2, index: 0 }, p => p.survey.columns[0].remaining = 0, p => p.focus = 3]) {
      const f = markerFixture(); f.api.syncSpatialReference(f.p); change(f.p); f.api.syncSpatialReference(f.p); expect(f.api.marker.visible).toBe(false); expect(f.api.marker.userData).toEqual({});
    }
    const f = markerFixture(); f.p.inspect = true; f.p.focus = 5; f.p.survey = survey({}, 5); f.api.syncSpatialReference(f.p); expect(f.api.marker.visible).toBe(true);
  });
  it('never accesses hidden site data, changes excavation or replaces shared resources', () => {
    const f = markerFixture(); for (const key of ['boneCells', 'burial', 'candidates']) Object.defineProperty(f.p.site, key, { get() { throw Error('Hidden data read'); } });
    Object.defineProperty(f.p, 'state', { get() { throw Error('Excavation state read'); } });
    const before = JSON.stringify(f.p.survey), id = f.api.marker.uuid;
    for (let i = 0; i < 10; i++) f.api.syncSpatialReference(f.p);
    expect(JSON.stringify(f.p.survey)).toBe(before); expect(f.api.marker.uuid).toBe(id); expect(f.api.marker.geometry).toBe(f.geometry); expect(f.api.marker.material).toBe(f.material);
  });
});
