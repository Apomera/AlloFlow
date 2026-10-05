import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.DINO_CHECKPOINT_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous checkpoint engine seam: ' + start);
  return text.slice(a, b);
}
const dino3D = bounded(source, '  function makeDinoVoxelDig3D(React) {', '  var DinoVoxelDig3DStable = null;');
const model = bounded(source, '// DINO_VOXEL_CHECKPOINT_MODEL_START', '// DINO_VOXEL_CHECKPOINT_MODEL_END');
const helper = bounded(dino3D, '// DINO_VOXEL_CHECKPOINT_ENGINE_START', '// DINO_VOXEL_CHECKPOINT_ENGINE_END');
const guideBuild = bounded(dino3D, '// DINO_VOXEL_CHECKPOINT_BUILD_START', '// DINO_VOXEL_CHECKPOINT_BUILD_END');
const boundaryBuild = bounded(dino3D, '            function strokeSquare(half) {', '            var previousSurfaceMat =');
const dispose = bounded(dino3D, '        function dispose() {', "        setStatus('loading');");
const sync = bounded(dino3D, '        function sync() {', '        function dispose() {');
const H = new Function(model + '\nreturn {digVoxelCheckpointRecord,digVoxelCheckpoint};')();
const sandbox = { console, module: { exports: {} } }; sandbox.exports = sandbox.module.exports;
vm.runInNewContext(readFileSync(process.env.DINO_CHECKPOINT_THREE || 'vendor/three-r128/three.min.js', 'utf8'), sandbox);
const THREE = sandbox.module.exports;

function surveyAt(overrides = {}, seed = 42, focus = 0) {
  const columns = Array.from({ length: 24 }, (_, index) => {
    const extra = overrides[index] || {}, removed = extra.removed || 0;
    return { index, row: Math.floor(index / 6), col: index % 6,
      coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1),
      removed, remaining: 4 - removed, status: extra.status || (removed === 4 ? 'cleared' : removed ? 'partial' : 'covered'),
      shape: extra.status === 'exposed' ? ['curved', 'elongate', 'compact'][index % 3] : null };
  });
  return { seed, focus, coord: columns[focus].coord, selected: columns[focus], columns };
}
function fixture({ before = surveyAt(), current = surveyAt({ 0: { removed: 2 }, 7: { removed: 1 }, 23: { removed: 4 } }), guides = true, inspect = false, findMode = false, focus = 0, withoutModel = false, incoming } = {}) {
  const scene = new THREE.Scene(), geometries = [], materials = [], pickers = [], textures = [];
  const geometry = value => { geometries.push(value); return value; };
  const material = value => { materials.push(value); return value; };
  const build = new Function('THREE', 'scene', 'geometry', 'material', ...(withoutModel ? [] : ['digVoxelCheckpoint']),
    'var checkpointGroup=null,checkpointCells=[];\n' + boundaryBuild + '\n' +
    // The existing stroke pool computes these shared immutable line distances.
    'new THREE.LineSegments(previousSurfaceGeo).computeLineDistances();\n' + guideBuild + '\n' + helper + '\n' +
    'return {syncCheckpointGuides,checkpointGroup,checkpointCells,previousSurfaceGeo,currentSurfaceGeo,strokeBracketGeo,checkpointBeforeMaterial,checkpointCurrentMaterial};');
  const api = build(THREE, scene, geometry, material, H.digVoxelCheckpoint);
  const baseline = H.digVoxelCheckpointRecord(before);
  const p = { site: { seed: current.seed }, survey: current, checkpoint: incoming === undefined ? H.digVoxelCheckpoint(current, baseline) : incoming, checkpointGuides: guides, inspect, findMode, focus };
  api.syncCheckpointGuides(p);
  return { api, p, baseline, scene, geometries, materials, pickers, textures,
    updateSurvey(survey) { p.survey = survey; p.checkpoint = H.digVoxelCheckpoint(survey, baseline); api.syncCheckpointGuides(p); },
    visible() { return api.checkpointCells.filter(cell => cell.visible).map(cell => cell.userData.index); },
    lines(index) { return api.checkpointCells[index].children; } };
}
function expectCleared(f) {
  expect(f.api.checkpointGroup.visible).toBe(false);
  expect(f.api.checkpointGroup.userData).toEqual({ role: 'observed-checkpoint-comparison', seed: null, key: null, baselineKey: null, columnIndices: [], columns: [] });
  expect(f.visible()).toEqual([]);
  f.api.checkpointCells.forEach(cell => {
    expect(cell.userData).toEqual({});
    cell.children.forEach(line => { expect(line.visible).toBe(false); expect(line.userData).toEqual({}); });
  });
}
function snapshotGeometry(geometry) {
  return Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [name, [...attribute.array]]));
}
function canvasDescription(p, withoutModel = false) {
  const React = { createElement(type, props, ...children) { return { type, props, children }; },
    useRef(value) { return { current: value }; }, useState(value) { return [value, () => {}]; }, useEffect() {} };
  const parameters = ['digVoxelFind', 'digVoxelFindLook', ...(withoutModel ? [] : ['digVoxelCheckpoint'])];
  const factory = new Function(...parameters, dino3D + '\nreturn makeDinoVoxelDig3D;')(
    () => ({ coord: 'A1', selected: null }), value => value === 'raking' || value === 'outline' ? value : 'surface', H.digVoxelCheckpoint);
  const component = factory(React);
  const element = component({ ...p, state: { depths: Array(24).fill(0), contacts: Array(24).fill(false), tool: 'brush' },
    translate: (_key, fallback) => fallback, surveyGuides: false });
  const canvases = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'canvas') canvases.push(node);
    visit(node.children);
  }
  visit(element);
  expect(canvases).toHaveLength(1);
  return canvases[0].props['aria-describedby'];
}

describe('Dino retained checkpoint comparison guides', () => {
  it('retains exactly 24 groups and 72 annotations with two owned materials and the existing three geometries', () => {
    const f = fixture();
    expect(f.api.checkpointGroup.name).toBe('dino-checkpoint-guides');
    expect(f.api.checkpointGroup.userData.role).toBe('observed-checkpoint-comparison');
    expect(f.api.checkpointCells).toHaveLength(24); expect(f.api.checkpointGroup.children).toHaveLength(24);
    expect(f.geometries).toEqual([f.api.previousSurfaceGeo, f.api.currentSurfaceGeo, f.api.strokeBracketGeo]);
    expect(f.materials).toEqual([f.api.checkpointBeforeMaterial, f.api.checkpointCurrentMaterial]);
    expect(f.textures).toEqual([]); expect(f.pickers).toEqual([]);
    f.api.checkpointCells.forEach(cell => {
      expect(cell.children).toHaveLength(3); expect(cell.children.every(line => line.type === 'LineSegments' && !line.isMesh)).toBe(true);
      expect(Array.from(cell.children, line => line.geometry)).toEqual(f.geometries);
      expect(Array.from(cell.children, line => line.material)).toEqual([f.materials[0], f.materials[1], f.materials[1]]);
    });
    expect(guideBuild).not.toMatch(/new THREE\.(?:BufferGeometry|BoxGeometry|CanvasTexture|Mesh)\b|\bpickers\b.*(?:push|concat)|geometry\(/);
  });

  it('distinguishes saved dashed boundaries from solid current boundaries without writing depth or adding opacity to sediment', () => {
    const f = fixture(), before = f.api.checkpointBeforeMaterial, current = f.api.checkpointCurrentMaterial;
    expect(before.type).toBe('LineDashedMaterial'); expect(current.type).toBe('LineBasicMaterial');
    expect(before.name).toBe('dino-checkpoint-saved-material'); expect(current.name).toBe('dino-checkpoint-current-material');
    expect(before.color.getHexString()).toBe(new THREE.Color('#6d4c8d').convertSRGBToLinear().getHexString());
    expect(current.color.getHexString()).toBe(new THREE.Color('#176b72').convertSRGBToLinear().getHexString());
    for (const material of f.materials) { expect(material.depthTest).toBe(false); expect(material.depthWrite).toBe(false); expect(material.toneMapped).toBe(false); }
    for (const cell of f.api.checkpointCells) for (const line of cell.children) expect(line.renderOrder).toBe(7);
  });

  it('shows only columns changed over multiple completed strokes and spans their full observed removal', () => {
    const before = surveyAt({ 0: { removed: 1 }, 7: { removed: 2 } });
    const current = surveyAt({ 0: { removed: 4 }, 7: { removed: 3 }, 14: { removed: 2 }, 23: { removed: 4 } });
    const f = fixture({ before, current });
    expect(f.visible()).toEqual([0, 7, 14, 23]);
    expect(f.api.checkpointGroup.userData.columnIndices).toEqual([0, 7, 14, 23]);
    expect(f.api.checkpointGroup.userData).toMatchObject({ seed: 42, key: f.p.checkpoint.key, baselineKey: f.p.checkpoint.baselineKey });
    for (const index of f.visible()) {
      const column = f.p.checkpoint.columns[index], cell = f.api.checkpointCells[index], [saved, shown, span] = f.lines(index);
      expect(Array.from(cell.position.toArray())).toEqual([(column.col - 2.5) * 1.08, 0, (column.row - 1.5) * 1.08]);
      expect(saved.position.y).toBeCloseTo(column.beforeRemaining * .52 + .065, 10);
      expect(shown.position.y).toBeCloseTo(column.remaining * .52 + .040, 10);
      expect(span.position.y).toBeCloseTo(shown.position.y, 10); expect(span.scale.y).toBeCloseTo(column.delta * .52, 10);
      expect(span.userData).toEqual({ role: 'observed-removal-since-checkpoint', index, removedLayers: column.delta });
    }
  });

  it('marks a zero-removal recorded contact with observed surfaces and no removed span', () => {
    const f = fixture({ before: surveyAt({ 7: { removed: 2 } }), current: surveyAt({ 7: { removed: 2, status: 'contact' } }) });
    expect(f.visible()).toEqual([7]);
    const [saved, current, span] = f.lines(7);
    expect(saved.visible).toBe(true); expect(current.visible).toBe(true); expect(span.visible).toBe(false); expect(span.userData).toEqual({});
    expect(f.api.checkpointCells[7].userData).toMatchObject({ beforeStatus: 'partial', status: 'contact', delta: 0, changed: true });
    expect(current.userData).toMatchObject({ role: 'current-observed-surface', status: 'contact', remaining: 2 });
    expect(JSON.stringify(f.api.checkpointGroup.userData)).not.toMatch(/shape|burial|hasBone|fossil|anatom/);
  });

  it('accepts only recomputed public columns even when incoming renderer columns are forged', () => {
    const f = fixture();
    Object.defineProperties(f.p.checkpoint, {
      columns: { get() { throw Error('Renderer trusted incoming columns'); } },
      changedColumns: { get() { throw Error('Renderer trusted incoming changedColumns'); } }
    });
    f.api.syncCheckpointGuides(f.p);
    expect(f.visible()).toEqual([0, 7, 23]);
    expect(f.api.checkpointGroup.userData.columns.map(column => column.delta)).toEqual([2, 1, 4]);
  });

  it('defaults the optional guides to off and fully clears all previously visible metadata when switched off', () => {
    const f = fixture();
    for (const value of [undefined, false, null, 1, 'true']) {
      f.p.checkpointGuides = value; f.api.syncCheckpointGuides(f.p); expectCleared(f);
      f.p.checkpointGuides = true; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
    }
  });

  it('keeps ordinary and non-ready modes usable without any checkpoint model dependency', () => {
    const f = fixture({ withoutModel: true, incoming: null }); expectCleared(f);
    delete f.p.checkpoint; f.api.syncCheckpointGuides(f.p); expectCleared(f);
    expect(canvasDescription(f.p, true)).not.toContain('dino-checkpoint-');
    for (const kind of ['missing', 'invalid', 'stale', 'ahead']) {
      f.p.checkpoint = { kind }; f.api.syncCheckpointGuides(f.p); expectCleared(f);
      expect(canvasDescription(f.p, true)).not.toContain('dino-checkpoint-');
    }
  });

  it('clears every invalid, missing, stale or ahead result rather than leaving a previous surface visible', () => {
    const f = fixture(), ready = f.p.checkpoint;
    const invalidInputs = [null, {}, { ...ready, kind: 'missing' }, { ...ready, kind: 'invalid' }, { ...ready, kind: 'stale' }, { ...ready, kind: 'ahead' },
      { ...ready, key: ready.key + '-forged' }, { ...ready, baselineKey: ready.baselineKey + '-forged' }, { ...ready, seed: 43 }, { ...ready, baseline: { ...ready.baseline, seed: 43 } },
      { ...ready, baseline: { ...ready.baseline, columns: [] } }];
    for (const checkpoint of invalidInputs) {
      f.p.checkpoint = checkpoint; f.api.syncCheckpointGuides(f.p); expectCleared(f);
      f.p.checkpoint = ready; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
    }
    f.p.survey = surveyAt(); f.api.syncCheckpointGuides(f.p); expectCleared(f);
  });

  it('rejects an old survey even if its ready comparison still matches that survey after a new site loads', () => {
    const f = fixture(); f.p.site = { seed: 43 }; f.api.syncCheckpointGuides(f.p); expectCleared(f);
    f.p.site = { seed: 42 }; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
    f.p.survey = surveyAt({ 0: { removed: 2 } }, 43); f.p.checkpoint = H.digVoxelCheckpoint(f.p.survey, H.digVoxelCheckpointRecord(surveyAt({}, 43)));
    f.api.syncCheckpointGuides(f.p); expectCleared(f);
  });

  it('hides and clears Find guides then restores the unchanged public comparison on return', () => {
    const f = fixture(), checkpoint = JSON.stringify(f.p.checkpoint), survey = JSON.stringify(f.p.survey);
    f.p.findMode = true; f.api.syncCheckpointGuides(f.p); expectCleared(f);
    f.p.findMode = false; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
    expect(JSON.stringify(f.p.checkpoint)).toBe(checkpoint); expect(JSON.stringify(f.p.survey)).toBe(survey);
  });

  it('links canvas descriptions only to native guides for a validated ready comparison and current site', () => {
    const f = fixture(), ready = f.p.checkpoint;
    expect(canvasDescription(f.p)).toContain('dino-checkpoint-guides-hint dino-checkpoint-legend');
    for (const incoming of [null, {}, { ...ready, kind: 'stale' }, { ...ready, key: ready.key + '-forged' },
      { ...ready, baselineKey: ready.baselineKey + '-forged' }, { ...ready, seed: 43 }, { ...ready, baseline: { ...ready.baseline, columns: [] } }]) {
      f.p.checkpoint = incoming; expect(canvasDescription(f.p)).not.toContain('dino-checkpoint-');
    }
    f.p.checkpoint = ready;
    f.p.site = { seed: 43 }; expect(canvasDescription(f.p)).not.toContain('dino-checkpoint-');
    f.p.site = { seed: 42 }; f.p.survey = surveyAt(); expect(canvasDescription(f.p)).not.toContain('dino-checkpoint-');
    f.p.survey = surveyAt({ 0: { removed: 2 }, 7: { removed: 1 }, 23: { removed: 4 } });
    f.p.findMode = true; expect(canvasDescription(f.p)).not.toContain('dino-checkpoint-');
    f.p.findMode = false; f.p.checkpointGuides = false; expect(canvasDescription(f.p)).not.toContain('dino-checkpoint-');
    const unchanged = fixture({ before: surveyAt(), current: surveyAt() });
    expect(canvasDescription(unchanged.p)).toContain('dino-checkpoint-guides-hint dino-checkpoint-legend');
  });

  it('filters Section to the selected row and clears previously shown rows and invalid focus', () => {
    const f = fixture({ inspect: true, focus: 7 }); expect(f.visible()).toEqual([7]);
    f.p.focus = 23; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([23]);
    expect(f.api.checkpointCells[7].userData).toEqual({}); expect(f.lines(7).every(line => !line.visible && !Object.keys(line.userData).length)).toBe(true);
    for (const focus of [-1, 24, 7.5, null]) { f.p.focus = focus; f.api.syncCheckpointGuides(f.p); expectCleared(f); }
    f.p.inspect = false; f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
  });

  it('keeps all groups and lines hidden when a valid checkpoint has no changes', () => {
    const before = surveyAt({ 7: { removed: 2, status: 'contact' } });
    const f = fixture({ before, current: before }); expect(f.p.checkpoint.kind).toBe('ready'); expectCleared(f);
  });

  it('does not read excavation, camera, animation or hidden-find data and does not mutate the public survey', () => {
    const f = fixture(), snapshot = JSON.stringify({ checkpoint: f.p.checkpoint, survey: f.p.survey });
    for (const key of ['state', 'pose', 'camera', 'action', 'comparison', 'tool', 'layout']) Object.defineProperty(f.p, key, { get() { throw Error('Guide read ' + key); } });
    for (const key of ['boneCells', 'candidates', 'clues', 'burial']) Object.defineProperty(f.p.site, key, { get() { throw Error('Guide read hidden site ' + key); } });
    Object.freeze(f.p.checkpoint); f.p.survey.columns.forEach(Object.freeze); Object.freeze(f.p.survey.columns); Object.freeze(f.p.survey);
    f.api.syncCheckpointGuides(f.p); expect(f.visible()).toEqual([0, 7, 23]);
    expect(JSON.stringify({ checkpoint: f.p.checkpoint, survey: f.p.survey })).toBe(snapshot);
  });

  it('reuses immutable geometry, materials and all 72 lines across survey and view changes', () => {
    const f = fixture(), groups = f.api.checkpointCells.map(cell => cell.uuid), lines = f.api.checkpointCells.flatMap(cell => cell.children.map(line => line.uuid));
    const geometries = f.geometries.map(snapshotGeometry), materials = f.materials.map(material => material.uuid);
    for (let step = 0; step < 24; step++) {
      f.updateSurvey(surveyAt({ [step]: { removed: 1 + step % 4 } }));
      f.p.inspect = step % 2 === 0; f.p.focus = step; f.api.syncCheckpointGuides(f.p);
    }
    expect(f.api.checkpointCells.map(cell => cell.uuid)).toEqual(groups);
    expect(f.api.checkpointCells.flatMap(cell => cell.children.map(line => line.uuid))).toEqual(lines);
    expect(f.geometries.map(snapshotGeometry)).toEqual(geometries); expect(f.materials.map(material => material.uuid)).toEqual(materials);
    expect(f.geometries).toHaveLength(3); expect(f.materials).toHaveLength(2);
  });

  it('disposes each shared boundary geometry and each owned material once through existing engine cleanup', () => {
    const f = fixture(), disposed = [];
    f.geometries.forEach((geometry, index) => geometry.addEventListener('dispose', () => disposed.push('geometry-' + index)));
    f.materials.forEach(material => material.addEventListener('dispose', () => disposed.push(material.name)));
    const actualDispose = new Function('scene', 'geometries', 'materials', 'textures',
      'var alive=true,raf=0,poseTimer=0,observer=null,intersection=null,cleanups=[],engineRef={current:{}},instanced=[],batch=null,world=null,renderer=null;' +
      'var findPlateTarget=null,findPlateCameras=[],findPlatePixels=[],findPlateCanvases=[],findPlateObserved=null,findPlateVisible=false;\n' + dispose + '\nreturn dispose;')(f.scene, f.geometries, f.materials, f.textures);
    actualDispose(); expect(disposed.sort()).toEqual(['dino-checkpoint-current-material', 'dino-checkpoint-saved-material', 'geometry-0', 'geometry-1', 'geometry-2']);
  });

  it('syncs after each public observation and optional guide change, with descriptions gated to mounted native legends', () => {
    expect(sync).toContain('syncStrokeComparison(p);\n          syncCheckpointGuides(p);');
    expect(dino3D).toMatch(/engineRef\.current\.sync\(\);[^\n]+props\.checkpoint, props\.checkpointGuides/);
    expect(dino3D).toContain("checkpointDescriptionReady && props.checkpointGuides === true && !props.findMode ? ' dino-checkpoint-guides-hint dino-checkpoint-legend' : ''");
    expect(helper).not.toMatch(/digVoxelColumn|digVoxelExcavate|digVoxelLayout|requestAnimationFrame|\.burial|\.shape|\.hasBone/);
  });
});
