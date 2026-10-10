import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');
function block(name) { const start = '// DINO_VOXEL_' + name + '_START', end = '// DINO_VOXEL_' + name + '_END'; const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b < a || source.indexOf(start, a + start.length) >= 0) throw Error('Missing/ambiguous guide seam'); return source.slice(a, b); }
const modelSource = block('CHECKPOINT_MODEL') + block('SPATIAL_MODEL') + block('COVER_GUIDES_MODEL');
const model = new Function(modelSource + ';return digVoxelCoverGuides;')();
function survey(a = 1, b = 3, focus = 7, seed = 1) {
  const columns = Array.from({ length: 24 }, (_, index) => { const removed = index === 0 ? a : index === 7 ? b : 0; return { index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1), removed, remaining: 4 - removed, status: removed === 4 ? 'cleared' : removed ? 'partial' : 'covered' }; });
  return { seed, focus, columns, selected: columns[focus] };
}
const reference = { seed: 1, index: 0 };
const options = { guides: true, seed: 1, focus: 7 };
describe('Dino removed-cover observation model', () => {
  it('reports only current removed cover for the reference and selected coordinate', () => {
    expect(model(survey(), reference, options)).toEqual({ seed: 1, columns: [
      { slot: 0, role: 'reference', index: 0, coord: 'A1', row: 0, col: 0, removed: 1, remaining: 3 },
      { slot: 1, role: 'selected', index: 7, coord: 'B2', row: 1, col: 1, removed: 3, remaining: 1 }
    ] });
  });
  it('keeps the option explicitly opt-in and clears missing, stale, mismatched and malformed observations', () => {
    for (const p of [{}, { ...options, guides: false }, { ...options, guides: 'true' }, { ...options, findMode: true }, { ...options, seed: 2 }, { ...options, focus: 0 }]) expect(model(survey(), reference, p).columns).toEqual([]);
    for (const r of [null, {}, { seed: 2, index: 0 }, { seed: 1, index: 24 }]) expect(model(survey(), r, options).columns).toEqual([]);
    const bad = survey(); bad.columns[0].remaining = 0; expect(model(bad, reference, options).columns).toEqual([]);
  });
  it('handles every bounded removal pair without outlining remaining cover', () => {
    for (let a = 0; a <= 4; a++) for (let b = 0; b <= 4; b++) {
      const result = model(survey(a, b), reference, options);
      expect(result.columns.map(c => c.removed)).toEqual([a, b].filter(Boolean));
      expect(result.columns.reduce((n, c) => n + c.removed, 0)).toBe(a + b);
    }
  });
  it('deduplicates the same coordinate and restricts guides to the inspected row', () => {
    expect(model(survey(2, 3, 0), reference, { ...options, focus: 0 }).columns.map(c => c.slot)).toEqual([0]);
    expect(model(survey(), reference, { ...options, inspect: true }).columns.map(c => c.index)).toEqual([7]);
  });
  it('uses fresh public observations after excavation and Undo', () => {
    const first = model(survey(1, 2), reference, options); expect(model(survey(2, 3), reference, options).columns.map(c => c.removed)).toEqual([2, 3]);
    expect(model(survey(1, 2), reference, options)).toEqual(first);
  });
  it('ignores hidden anatomy and does not retain or mutate input records', () => {
    const s = survey(); for (const obj of [s, ...s.columns]) { Object.defineProperty(obj, 'burial', { get() { throw Error('Hidden burial accessed'); } }); Object.freeze(obj); } Object.freeze(s.columns);
    const result = model(s, reference, options); expect(JSON.stringify(result)).not.toMatch(/burial|species|contact|hasBone/); result.columns[0].removed = 4; expect(s.columns[0].removed).toBe(1);
  });
});
const sandbox = { module: { exports: {} }, console }; sandbox.exports = sandbox.module.exports; vm.runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), sandbox); const THREE = sandbox.module.exports;
function fixture() {
  const scene = new THREE.Scene(), owned = [], materials = [new THREE.LineDashedMaterial({ dashSize: .14, gapSize: .085 }), new THREE.LineBasicMaterial()];
  const api = new Function('window', 'scene', 'geometry', 'spatialCoverMaterials', 'digVoxelCoverGuides', 'var spatialCover=null,spatialCoverColumns=[];' + block('COVER_GUIDES_ENGINE') + ';return {sync:syncCoverGuides,get group(){return spatialCover;}};')({ THREE }, scene, g => { owned.push(g); return g; }, materials, model);
  return { api, scene, owned, materials, p: { survey: survey(), spatialReference: reference, site: { seed: 1 }, focus: 7, coverGuides: true } };
}
function visible(f) { const result = []; if (f.api.group?.visible) f.api.group.children.forEach(c => { if (c.visible) c.children.forEach(b => { if (b.visible) result.push(b); }); }); return result; }
describe('Dino retained 3D removed-cover outlines', () => {
  it('allocates nothing while off, invalid or without removed cover', () => {
    const f = fixture(); for (const extra of [{ coverGuides: false }, { spatialReference: null }, { findMode: true }, { survey: survey(0, 0) }]) { f.api.sync({ ...f.p, ...extra }); expect(f.owned).toHaveLength(0); expect(f.api.group).toBeNull(); }
  });
  it('lazily creates one shared edge geometry and borrows both existing materials', () => {
    const f = fixture(); f.api.sync(f.p); expect(f.owned).toHaveLength(1); expect(f.scene.children).toHaveLength(1); expect(f.api.group.children).toHaveLength(2);
    f.api.group.children.forEach((c, slot) => { expect(c.children).toHaveLength(4); c.children.forEach(b => { expect(b.isLineSegments).toBe(true); expect(b.geometry).toBe(f.owned[0]); expect(b.material).toBe(f.materials[slot]); }); });
    expect(f.owned[0].attributes.position.count).toBe(24); expect(f.owned[0].attributes.lineDistance.count).toBe(24); expect(Array.from(f.owned[0].attributes.lineDistance.array).every(Number.isFinite)).toBe(true);
  });
  it('draws exactly the removed levels at the correct world coordinates and leaves a small gap between boxes', () => {
    const f = fixture(); f.api.sync(f.p); f.scene.updateMatrixWorld(true); expect(visible(f)).toHaveLength(4);
    for (const b of visible(f)) {
      const { index, level } = b.userData, position = b.getWorldPosition(new THREE.Vector3());
      expect(Array.from(position.toArray())).toEqual([(index % 6 - 2.5) * 1.08, (4.5 - level) * .52, (Math.floor(index / 6) - 1.5) * 1.08]);
      b.geometry.computeBoundingBox(); expect(b.geometry.boundingBox.max.y - b.geometry.boundingBox.min.y).toBe(.5);
    }
  });
  it('updates excavation and Undo without replacing pooled objects or geometry', () => {
    const f = fixture(); f.api.sync(f.p); const ids = f.api.group.children.flatMap(c => c.children.map(b => b.uuid));
    f.api.sync({ ...f.p, survey: survey(4, 4) }); expect(visible(f)).toHaveLength(8);
    f.api.sync(f.p); expect(visible(f)).toHaveLength(4); expect(f.owned).toHaveLength(1); expect(f.api.group.children.flatMap(c => c.children.map(b => b.uuid))).toEqual(ids);
  });
  it('clears all stale metadata when hidden and never resurrects old levels on reselection', () => {
    const f = fixture(); f.api.sync(f.p); for (const extra of [{ coverGuides: false }, { findMode: true }, { spatialReference: null }, { site: { seed: 2 } }]) { f.api.sync({ ...f.p, ...extra }); expect(visible(f)).toEqual([]); expect(f.api.group.userData).toEqual({}); f.api.group.children.forEach(c => { expect(c.userData).toEqual({}); c.children.forEach(b => expect(b.userData).toEqual({})); }); }
    f.api.sync({ ...f.p, survey: survey(1, 0) }); expect(visible(f)).toHaveLength(1);
  });
  it('retains only the selected row in Section and deduplicates an identical reference', () => {
    const f = fixture(); f.api.sync({ ...f.p, inspect: true }); expect(visible(f).map(b => b.userData.index)).toEqual([7, 7, 7]);
    f.api.sync({ ...f.p, focus: 0, survey: survey(2, 3, 0) }); expect(visible(f).map(b => b.userData.index)).toEqual([0, 0]);
  });
  it('reads no private excavation fields and never alters borrowed resources', () => {
    const f = fixture(), materialIds = f.materials.map(m => m.uuid); Object.defineProperty(f.p, 'state', { get() { throw Error('Private state read'); } }); Object.defineProperty(f.p.site, 'boneCells', { get() { throw Error('Hidden finds read'); } });
    f.api.sync(f.p); expect(f.materials.map(m => m.uuid)).toEqual(materialIds); expect(f.api.group.userData.columns).toEqual(model(f.p.survey, reference, options).columns);
  });
  it('registers the one new owned geometry for disposal and does not own borrowed materials', () => {
    const f = fixture(); f.api.sync(f.p); let geometries = 0, materials = 0; f.owned[0].addEventListener('dispose', () => geometries++); f.materials.forEach(m => m.addEventListener('dispose', () => materials++));
    f.owned.forEach(g => g.dispose()); expect(geometries).toBe(1); expect(materials).toBe(0);
  });
});
const React = { createElement(type, props, ...children) { return { type, props: props || {}, children }; } };
const ui = new Function(modelSource + block('COVER_GUIDES_UI') + ';return {control:renderDinoDigCoverGuideControl,legend:renderDinoDigCoverLegend};')();
const T = { text: '#101828', panel: '#fff', border: '#667085' };
function nodes(t) { return Array.isArray(t) ? t.flatMap(nodes) : t && typeof t === 'object' ? [t, ...nodes(t.children)] : []; }
function textOf(t) { return Array.isArray(t) ? t.map(textOf).join(' ') : t && typeof t === 'object' ? textOf(t.children) : t == null ? '' : String(t); }
describe('Dino removed-cover controls and explanation', () => {
  it('exposes a native opt-in checkbox with a linked explanation and boolean-only callback', () => {
    const calls = [], tree = ui.control(React, { survey: survey(), reference, T, onCoverGuides: value => calls.push(value) }); const checkbox = nodes(tree).find(n => n.type === 'input'); expect(checkbox.props.checked).toBe(false); expect(checkbox.props['aria-describedby']).toBe('dino-cover-guides-hint');
    checkbox.props.onChange({ target: { checked: true } }); checkbox.props.onChange({ target: { checked: false } }); expect(calls).toEqual([true, false]); expect(textOf(tree)).toContain('do not restore sediment or reveal buried finds');
  });
  it('hides unavailable controls and legends, and distinguishes reference versus selection without color alone', () => {
    expect(ui.control(React, { survey: survey(), reference: null, T })).toBeNull(); expect(ui.control(React, { survey: survey(), reference, T, findMode: true })).toBeNull();
    const props = { survey: survey(), spatialReference: reference, T, site: { seed: 1 }, focus: 7, coverGuides: true };
    const tree = ui.legend(React, props); expect(textOf(tree)).toContain('Reference A1: 1 removed · violet dashes'); expect(textOf(tree)).toContain('Selected B2: 3 removed · solid teal'); expect(textOf(tree)).toContain('not geological age');
    expect(ui.legend(React, { ...props, coverGuides: false })).toBeNull(); expect(nodes(ui.legend(React, { ...props, inspect: true })).filter(n => n.type === 'li')).toHaveLength(1);
  });
  it('registers every new explanation in both English registries', () => {
    const registries = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js'].map(p => JSON.parse(readFileSync(p, 'utf8')).stem.dinolab), phrases = [...block('COVER_GUIDES_UI').matchAll(/digCoverPhrase\(props,'([^']+)','([^']+)'/g)]; expect(phrases).toHaveLength(7);
    for (const registry of registries) for (const m of phrases) expect(registry['cover_guides_' + m[1]]).toBe(m[2]);
  });
});
