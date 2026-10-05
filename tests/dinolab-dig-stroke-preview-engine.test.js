import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.DINO_STROKE_PREVIEW_SOURCE || 'stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function bounded(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous stroke preview seam: ' + start);
  return text.slice(a, b);
}
const dino3D = bounded(source, '  function makeDinoVoxelDig3D(React) {', '  var DinoVoxelDig3DStable = null;');
const model = bounded(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END');
const plan = bounded(source, '// DINO_VOXEL_DIG_PLAN_START', '// DINO_VOXEL_DIG_PLAN_END');
const find = bounded(source, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END');
const rng = bounded(source, '  function mulberry32(seed) {', '  // ═');
const revealed = bounded(source, '  function digRevealedCells(value) {', '  function digCluesFor');
const H = new Function(rng + revealed + model + plan + find + '\nreturn {digVoxelLayout,digVoxelState,digVoxelPlan,digVoxelExcavate,digVoxelColumn,digVoxelFind};')();
const helper = bounded(dino3D, '// DINO_VOXEL_TOOL_FOOTPRINT_ENGINE_START', '// DINO_VOXEL_TOOL_FOOTPRINT_ENGINE_END');
const selection = bounded(dino3D, '        function showSelection(index) {', '        // Survey guides use only');
const footprintBuild = bounded(dino3D, '            footprintGroup = new THREE.Group();', '            var selectGeo =');
const boundaryBuild = bounded(dino3D, '            function strokeSquare(half) {', '            var previousSurfaceMat =');
const envelopeBuild = bounded(dino3D, '            // Reuse immutable stroke-boundary geometry', '            // Fixed perimeter coordinates');
const events = bounded(dino3D, "            listen(canvas, 'pointerdown'", "            listen(canvas, 'webglcontextlost'");
const targetSync = bounded(dino3D, '          var currentView = viewKey(p)', '          var sectionRow =');
const cameraModes = bounded(dino3D, '        function viewKey(p)', '        function cameraPose');
const cameraInput = bounded(dino3D, '// DINO_VOXEL_CAMERA_INPUT_STATE_START', '// DINO_VOXEL_CAMERA_INPUT_ENGINE_END');
const picker = bounded(dino3D, '        function pick(event) {', '        // DINO_VOXEL_TOOL_FOOTPRINT_ENGINE_START');

// Exercise the shipped r128 geometry, materials and world transforms without GL.
const sandbox = { console, module: { exports: {} } }; sandbox.exports = sandbox.module.exports;
vm.runInNewContext(readFileSync(process.env.DINO_STROKE_PREVIEW_THREE || 'vendor/three-r128/three.min.js', 'utf8'), sandbox);
const THREE = sandbox.module.exports;
const defaultSite = () => ({ seed: 42, boneCells: { 7: true, 14: true, 23: true } });
function fixture({ site = defaultSite(), state, focus = 0, tool = 'brush', inspect = false, findMode = false, preview = true, translate = (_key, fallback) => fallback } = {}) {
  const geometries = [], materials = [], callbacks = new Map(), capture = new Set();
  const calls = { excavate: [], select: [], invalidate: 0, savePose: 0, queuePose: 0, picks: [] };
  const scene = new THREE.Scene(), selected = new THREE.Group(); scene.add(selected);
  const hud = { textContent: '', dataset: {} }, readout = { textContent: '' };
  const p = { site, state: state || H.digVoxelState(null, site, []), focus, inspect, findMode, preview, translate,
    onExcavate(index) { calls.excavate.push(index); }, onSelect(index) { calls.select.push(index); } };
  p.state.tool = tool;
  const latest = { current: p };
  const canvas = { style: {}, focus() { callbacks.get('focus')?.({}); },
    setPointerCapture(id) { capture.add(id); }, hasPointerCapture(id) { return capture.has(id); }, releasePointerCapture(id) { capture.delete(id); } };
  const geometry = value => { geometries.push(value); return value; };
  const material = value => { materials.push(value); return value; };
  const build = new Function('THREE', 'H', 'scene', 'selected', 'latest', 'canvas', 'geometry', 'material', 'callbacks', 'calls', 'hud', 'readout',
    'var digVoxelPlan=H.digVoxelPlan,digVoxelColumn=H.digVoxelColumn,digVoxelFind=H.digVoxelFind;\n' +
    'var footprintGroup=null,footprintCells=[],previewCandidateMaterial=null,previewHeldMaterial=null,previewProtectedMaterial=null,previewCandidateEdge=null,previewHeldEdge=null,previewEnvelopeSolidMaterial=null,previewEnvelopeConditionalMaterial=null;\n' +
    'var footprintTargetRef={current:hud},readoutRef={current:readout},hover=-1,pointer=null,lastView=null,lastFocus=null,lastSeed=null,lastObservation=null,pose={yaw:.72,pitch:.67,zoom:1},alive=true,contextLost=false,lastPose=null;\n' +
    'function invalidate(){calls.invalidate++;}function savePose(){calls.savePose++;}function queuePoseSave(){calls.queuePose++;}function flushPoseSave(){}function findLookLabel(){return "Surface";}\n' +
    cameraModes + '\n' + cameraInput + '\n' +
    'function sync(p){cameraPoseScope=cameraInputScope(p);lastPose=JSON.stringify([viewKey(p),p.site.seed,p.camera,p.pose,p.cameraReset,viewReset(p,viewKey(p))]);}function listen(target,type,callback){callbacks.set(type,callback);}function pick(event){calls.picks.push(event.index);return event.index==null?null:event.index;}\n' +
    footprintBuild + '\n' + boundaryBuild + '\n' + envelopeBuild + '\n' + helper + '\n' + selection + '\n' + events + '\n' +
    'return {showSelection,toolTargetIndex,syncToolFootprint,resetToolTarget,footprintGroup,footprintCells,strokeBracketGeo,currentSurfaceGeo,previewEnvelopeSolidMaterial,previewEnvelopeConditionalMaterial,' +
    'syncProps(){var p=latest.current;' + targetSync + 'lastSeed=p.site.seed;sync(p);showSelection(toolTargetIndex(p,hover));},' +
    'state(){return {hover,pointer,pose:{...pose},lastView,lastFocus,lastSeed,lastObservation};}};');
  const api = build(THREE, H, scene, selected, latest, canvas, geometry, material, callbacks, calls, hud, readout);
  api.syncProps();
  return { api, p, scene, selected, canvas, hud, readout, geometries, materials, calls,
    emit(type, event = {}) { const e = { pointerId: 1, button: 0, clientX: 0, clientY: 0, preventDefault() {}, ...event }; callbacks.get(type)(e); },
    target(index) { return api.footprintCells[index]; }, envelope(index) { return api.footprintCells[index].children[4]; },
    hover(index) { callbacks.get('pointermove')({ index, pointerId: 1, clientX: 0, clientY: 0 }); },
    bounds(index) { scene.updateMatrixWorld(true); return new THREE.Box3().setFromObject(api.footprintCells[index].children[4]); },
    visibleTargets() { return api.footprintCells.filter(target => target.visible).map(target => target.userData.digColumn); } };
}
function stateAt(site, tool, depths = {}, contacts = {}) {
  const state = H.digVoxelState(null, site, []); state.tool = tool;
  Object.entries(depths).forEach(([index, depth]) => { state.depths[index] = depth; });
  Object.entries(contacts).forEach(([index, contact]) => { state.contacts[index] = contact; });
  return H.digVoxelState(state, site, []);
}
function expectTarget(f, index, source = 'pointer') {
  expect(f.api.footprintGroup.userData.previewFocus).toBe(index);
  expect(f.api.footprintGroup.userData.plan.focus).toBe(index);
  expect(f.hud.dataset).toMatchObject({ digPreviewTarget: String(index), digPreviewTool: f.p.state.tool, digPreviewSource: source });
  expect(f.selected.position.x).toBeCloseTo((index % 6 - 2.5) * 1.08, 10);
  expect(f.selected.position.z).toBeCloseTo((Math.floor(index / 6) - 1.5) * 1.08, 10);
}

describe('Dino retained prospective stroke target', () => {
  it('aligns hover, selected marker and HUD without changing stored excavation state or camera', () => {
    const f = fixture(), original = JSON.stringify({ site: f.p.site, state: f.p.state }), pose = f.api.state().pose;
    f.hover(7); expectTarget(f, 7); expect(f.visibleTargets()).toEqual([7]);
    expect(f.hud.textContent).toBe('Next 3D stroke: Brush at B2');
    expect(f.readout.textContent).toContain('B2'); expect(f.p.focus).toBe(0);
    expect(JSON.stringify({ site: f.p.site, state: f.p.state })).toBe(original);
    expect(f.api.state().pose).toEqual(pose); expect(f.calls.excavate).toEqual([]); expect(f.calls.select).toEqual([]);
  });
  it('uses the previewed target for Enter and Space without duplicating pointer activation', () => {
    const f = fixture(); f.hover(7); f.emit('keydown', { key: 'Enter' }); f.emit('keydown', { key: ' ' });
    expect(f.calls.excavate).toEqual([7, 7]); expect(f.calls.select).toEqual([]); expectTarget(f, 7);
  });
  it('shows a touch-down target before any pointermove and repicks the actual release', () => {
    const f = fixture(); f.emit('pointerdown', { index: 7 }); expectTarget(f, 7); expect(f.calls.excavate).toEqual([]);
    f.emit('pointerup', { index: 8 }); expectTarget(f, 8); expect(f.calls.excavate).toEqual([8]); expect(f.calls.picks).toEqual([7, 8]);
  });
  it('restores selection after a ray miss and does not excavate a missed release', () => {
    const f = fixture(); f.hover(7); f.hover(null); expectTarget(f, 0, 'selection');
    f.emit('pointerdown', { index: 7 }); f.emit('pointerup', { index: null });
    expectTarget(f, 0, 'selection'); expect(f.calls.excavate).toEqual([]);
  });
  it('restores persistent focus on leave while preserving stored state', () => {
    const f = fixture(); f.hover(7); f.emit('pointerleave'); expectTarget(f, 0, 'selection');
    expect(f.api.state().hover).toBe(-1); expect(f.p.focus).toBe(0); expect(f.p.state.depths).toEqual(Array(24).fill(0));
  });
  it('clears an old hover when the already-selected native cell receives focus', () => {
    const f = fixture(); f.hover(7); f.emit('blur'); f.emit('focus'); f.emit('keydown', { key: 'Enter' });
    expectTarget(f, 0, 'selection'); expect(f.calls.excavate).toEqual([0]);
  });
  it('clears cancellation and prevents the later pointerup from becoming a stroke', () => {
    const f = fixture(); f.emit('pointerdown', { index: 7 }); f.emit('pointercancel'); f.emit('pointerup', { index: 8 });
    expectTarget(f, 0, 'selection'); expect(f.api.state().pointer).toBe(null); expect(f.calls.excavate).toEqual([]);
  });
  it('clears target at the orbit threshold and keeps release from excavating', () => {
    const f = fixture(); f.emit('pointerdown', { index: 7 });
    f.emit('pointermove', { index: 8, clientX: 6 }); expectTarget(f, 0, 'selection'); expect(f.api.state().pointer.moved).toBe(true);
    f.emit('pointerup', { index: 8 }); expect(f.calls.excavate).toEqual([]); expect(f.calls.savePose).toBe(1);
  });
  it('does not convert sub-threshold pointer motion into a drag or change its preview', () => {
    const f = fixture(); f.emit('pointerdown', { index: 7 }); f.emit('pointermove', { index: 8, clientX: 3, clientY: 2 });
    expectTarget(f, 7); expect(f.api.state().pointer.moved).toBe(false);
    f.emit('pointerup', { index: 8 }); expect(f.calls.excavate).toEqual([8]);
  });
  it('preserves active hover for a tool-only update and clips the trowel at a corner', () => {
    const f = fixture(); f.hover(23); f.p.state.tool = 'trowel'; f.api.syncProps();
    expectTarget(f, 23); expect(f.visibleTargets()).toEqual([16, 17, 22, 23]);
    expect(f.hud.textContent).toBe('Next 3D stroke: Trowel at F4'); expect(f.envelope(23).userData.certainty).toBe('conditional');
  });
  it('restores selection when native focus changes and cancels an in-progress pointer', () => {
    const f = fixture(); f.emit('pointerdown', { index: 7 }); f.p.focus = 14; f.api.syncProps();
    expectTarget(f, 14, 'selection'); expect(f.api.state().pointer).toBe(null); f.emit('pointerup', { index: 7 }); expect(f.calls.excavate).toEqual([]);
  });
  it('restores selection when the seed changes even if the public observation is identical', () => {
    const f = fixture(); f.hover(7); f.p.site = { seed: 43, boneCells: { 3: true } }; f.p.state = H.digVoxelState(null, f.p.site, []); f.api.syncProps();
    expectTarget(f, 0, 'selection'); expect(f.api.state().hover).toBe(-1);
  });
  it('restores selection and rebuilds height after excavation and Undo observations', () => {
    const f = fixture(); f.hover(7); f.p.state = H.digVoxelExcavate(f.p.site, f.p.state, 0, 'brush').state; f.api.syncProps();
    expectTarget(f, 0, 'selection'); expect(f.envelope(0).userData.top).toBeCloseTo(1.56, 10);
    f.hover(7); f.p.state.depths[0] = 0; f.api.syncProps(); expectTarget(f, 0, 'selection'); expect(f.envelope(0).userData.top).toBeCloseTo(2.08, 10);
  });
  it('restores selection when a zero-removal observation adds a fossil contact', () => {
    const site = defaultSite(), burial = H.digVoxelLayout(site).columns[23].burial;
    const f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 16: 4, 17: 4, 22: 4, 23: burial - 1 }) });
    const depths = [...f.p.state.depths]; f.hover(23);
    const result = H.digVoxelExcavate(site, f.p.state, 23, 'trowel'); expect(result.layersRemoved).toBe(0);
    f.p.state = result.state; f.api.syncProps();
    expectTarget(f, 0, 'selection'); expect(f.p.state.contacts[23]).toBe(true); expect(f.p.state.depths).toEqual(depths);
  });
  it('restores selection when section or find view replaces the full scene', () => {
    const f = fixture(); f.hover(7); f.p.inspect = true; f.api.syncProps(); expectTarget(f, 0, 'selection'); expect(f.api.footprintGroup.visible).toBe(false);
    f.p.inspect = false; f.p.findMode = true; f.api.syncProps(); expect(f.api.state().hover).toBe(-1); expect(f.api.footprintGroup.userData.previewFocus).toBe(0); expect(f.selected.visible).toBe(false);
  });
  it('clears hover when wheel zoom changes the ray framing', () => {
    const f = fixture(); f.hover(7); f.emit('wheel', { deltaY: -1 }); expectTarget(f, 0, 'selection');
    expect(f.api.state().pose.zoom).toBeCloseTo(Math.pow(1.08, .01), 10); expect(f.calls.queuePose).toBe(1);
  });
  it('clears hover after camera keys while retaining their existing pose behavior', () => {
    const f = fixture(); f.hover(7); f.emit('keydown', { key: 'ArrowLeft' }); expectTarget(f, 0, 'selection');
    expect(f.api.state().pose.yaw).toBeCloseTo(.6, 10); expect(f.calls.savePose).toBe(1);
    f.hover(7); f.emit('keydown', { key: '+' }); expectTarget(f, 0, 'selection'); expect(f.api.state().pose.zoom).toBeCloseTo(1.1, 10);
  });
  it('ignores unrelated keys and secondary pointer presses without clearing an active target', () => {
    const f = fixture(); f.hover(7); f.emit('keydown', { key: 'q' }); f.emit('pointerdown', { button: 2, index: 8 });
    expectTarget(f, 7); expect(f.api.state().pointer).toBe(null); expect(f.calls.picks).toEqual([7]);
  });
  it('bounds invalid targets and respects the selected section row', () => {
    const f = fixture({ focus: 7 });
    for (const value of [-1, 24, 2.5, null, undefined]) expect(f.api.toolTargetIndex(f.p, value)).toBe(7);
    f.p.inspect = true; expect(f.api.toolTargetIndex(f.p, 14)).toBe(7); expect(f.api.toolTargetIndex(f.p, 8)).toBe(8);
    f.p.findMode = true; expect(f.api.toolTargetIndex(f.p, 8)).toBe(7);
  });
  it('writes translated tool and coordinate text into the retained HUD', () => {
    const f = fixture({ translate: (key, fallback) => ({ 'stem.dinolab.voxel_brush': 'Pinceau', 'stem.dinolab.preview_target': '{coord} : prochain passage {tool}' })[key] || fallback });
    f.hover(7); expect(f.hud.textContent).toBe('B2 : prochain passage Pinceau'); expect(f.hud.dataset.digPreviewTool).toBe('brush');
  });
});

describe('Dino prospective removal envelopes', () => {
  it('uses a solid one-layer brush bound covering the exact physical voxel width', () => {
    const f = fixture(); f.hover(7); const envelope = f.envelope(7), bounds = f.bounds(7), size = bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1.062, 6); expect(size.z).toBeCloseTo(1.062, 6); expect(size.y).toBeCloseTo(.52, 10);
    expect(bounds.max.y).toBeCloseTo(2.08, 10); expect(bounds.min.y).toBeCloseTo(1.56, 10);
    expect(envelope.userData).toMatchObject({ certainty: 'guaranteed', minRemoval: 1, maxRemoval: 1, top: 2.08, bottom: 1.56, height: .52 });
    envelope.children.forEach(line => { expect(line.material.type).toBe('LineBasicMaterial'); expect(line.material.depthTest).toBe(false); expect(line.material.depthWrite).toBe(false); });
  });
  it('anchors conditional trowel bounds independently at each uneven column surface', () => {
    const site = defaultSite(), f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 0: 3, 1: 1, 6: 2 }) }); f.hover(7);
    for (const index of [0, 1, 6, 7]) {
      const remaining = 4 - f.p.state.depths[index], bounds = f.bounds(index), size = bounds.getSize(new THREE.Vector3());
      expect(size.x).toBeCloseTo(1.062, 6); expect(size.z).toBeCloseTo(1.062, 6); expect(size.y).toBeCloseTo(.52, 10);
      expect(bounds.max.y).toBeCloseTo(remaining * .52, 10); expect(bounds.min.y).toBeCloseTo((remaining - 1) * .52, 10);
      expect(f.envelope(index).userData).toMatchObject({ certainty: 'conditional', minRemoval: 0, maxRemoval: 1 });
      f.envelope(index).children.forEach(line => expect(line.material.type).toBe('LineDashedMaterial'));
    }
  });
  it('keeps recorded trowel contact stops at zero volume and retains the held cross', () => {
    const site = defaultSite(), burial = H.digVoxelLayout(site).columns[7].burial;
    const f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 7: burial - 1 }, { 7: true }) }); f.hover(7);
    expect(f.target(7).userData.status).toBe('contact-stop'); expect(f.target(7).children[3].visible).toBe(true); expect(f.target(7).children[2].visible).toBe(false);
    expect(f.envelope(7).visible).toBe(false); expect(f.envelope(7).userData).toMatchObject({ certainty: 'held', minRemoval: 0, maxRemoval: 0, height: 0 });
    expect(f.envelope(7).userData.top).toBe(f.envelope(7).userData.bottom);
    expect(f.envelope(0).visible).toBe(true);
  });
  it('does not promise removal at an unrecorded trowel stop but permits an observation', () => {
    const site = defaultSite(), burial = H.digVoxelLayout(site).columns[7].burial;
    const f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 7: burial - 1 }) }); f.hover(7);
    expect(f.envelope(7).userData).toMatchObject({ certainty: 'conditional', minRemoval: 0, maxRemoval: 1 });
    const result = H.digVoxelExcavate(site, f.p.state, 7, 'trowel');
    expect(result.state.depths[7]).toBe(f.p.state.depths[7]); expect(result.contactsFound).toContain(7);
    expect(result.state.contacts[7]).toBe(true);
  });
  it('shows no removal envelope anywhere in a trowel pass blocked by a protected center', () => {
    const site = defaultSite(), burial = H.digVoxelLayout(site).columns[7].burial;
    const f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 7: burial }) }); f.hover(7);
    expect(f.api.footprintGroup.userData.plan.blocked).toBe(true);
    for (const index of f.visibleTargets()) { expect(f.target(index).children[3].visible).toBe(true); expect(f.envelope(index).visible).toBe(false); expect(f.envelope(index).userData.height).toBe(0); }
    expect(f.target(0).userData.status).toBe('candidate');
  });
  it('shows no removal envelope anywhere in a trowel pass blocked by a cleared center', () => {
    const site = defaultSite(), f = fixture({ site, tool: 'trowel', state: stateAt(site, 'trowel', { 0: 4 }) }); f.hover(0);
    expect(f.api.footprintGroup.userData.plan.blockReason).toBe('cleared');
    for (const index of f.visibleTargets()) expect(f.envelope(index).userData).toMatchObject({ height: 0, maxRemoval: 0, certainty: 'held' });
  });
  it('allows a guaranteed brush envelope over recorded final cover without showing a buried shape', () => {
    const site = defaultSite(), burial = H.digVoxelLayout(site).columns[7].burial;
    const f = fixture({ site, state: stateAt(site, 'brush', { 7: burial - 1 }, { 7: true }) }); f.hover(7);
    expect(f.envelope(7).visible).toBe(true); expect(f.envelope(7).userData.certainty).toBe('guaranteed');
    expect(f.api.footprintGroup.userData.plan.columns[0].contact).toBe(true);
    expect(Object.keys(f.envelope(7).userData).sort()).toEqual(['bottom', 'certainty', 'digColumn', 'height', 'maxRemoval', 'minRemoval', 'role', 'top']);
    expect(JSON.stringify(f.api.footprintGroup.userData)).not.toMatch(/hasBone|burial|fossilY|shape/);
  });
  it('produces identical public envelopes for different hidden layouts with equal observations', () => {
    const a = fixture({ site: { seed: 42, boneCells: {} }, tool: 'trowel' }), b = fixture({ site: defaultSite(), tool: 'trowel' });
    a.hover(7); b.hover(7); expect(a.api.footprintGroup.userData.plan).toEqual(b.api.footprintGroup.userData.plan);
    for (const index of a.visibleTargets()) expect(a.envelope(index).userData).toEqual(b.envelope(index).userData);
  });
  it('hides the group in preview-off, section and find view without altering the target state', () => {
    const f = fixture(); f.hover(7); f.p.preview = false; f.api.syncProps(); expect(f.api.footprintGroup.visible).toBe(false); expect(f.scene.userData.previewFocus).toBe(null); expect(f.p.focus).toBe(0);
    f.p.preview = true; f.p.inspect = true; f.api.syncProps(); expect(f.api.footprintGroup.visible).toBe(false);
    f.p.inspect = false; f.p.findMode = true; f.api.syncProps(); expect(f.api.footprintGroup.visible).toBe(false);
  });
  it('retains all geometry and adds exactly two shared owned materials through repeated refreshes', () => {
    const f = fixture(), geometries = [...f.geometries], materials = [...f.materials], envelopeMaterials = f.materials.filter(m => m === f.api.previewEnvelopeSolidMaterial || m === f.api.previewEnvelopeConditionalMaterial);
    expect(envelopeMaterials).toHaveLength(2);
    for (let i = 0; i < 30; i++) { f.hover(i % 24); f.p.state.tool = i % 2 ? 'brush' : 'trowel'; f.api.syncProps(); }
    expect(f.geometries).toEqual(geometries); expect(f.materials).toEqual(materials);
    for (const target of f.api.footprintCells) { const envelope = target.children[4]; expect(envelope.children[0].geometry).toBe(f.api.strokeBracketGeo); expect(envelope.children[1].geometry).toBe(f.api.currentSurfaceGeo); expect(envelope.children[2].geometry).toBe(f.api.currentSurfaceGeo); }
    expect(envelopeBuild).not.toMatch(/geometry\(|texture\(|WebGLRenderTarget/);
  });
  it('keeps prospective guides outside the native raycaster target collection', () => {
    const f = fixture(), sediment = new THREE.Group(), pickers = [sediment], observed = [];
    sediment.userData.columnIndices = [7];
    class Raycaster { setFromCamera() {} intersectObjects(objects, recursive) { observed.push({ objects, recursive }); return [{ object: sediment, instanceId: 0 }]; } }
    const canvas = { getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; } };
    const actualPick = new Function('window', 'renderer', 'camera', 'batch', 'canvas', 'pickers', 'latest', picker + '\nreturn pick;')({ THREE: { ...THREE, Raycaster } }, {}, {}, {}, canvas, pickers, { current: f.p });
    expect(actualPick({ clientX: 50, clientY: 50 })).toBe(7); expect(observed).toEqual([{ objects: pickers, recursive: true }]);
    expect(observed[0].objects).not.toContain(f.api.footprintGroup); expect(observed[0].objects).not.toContain(f.envelope(7));
  });
});
