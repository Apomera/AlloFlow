import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_WINGTIP_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical wingtip section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, migrationStudyDistance };')(num);
const createPath = new Function(section('      function createMigrationWingtipPath(', '      function initMigrationFlightScene(') + '\nreturn createMigrationWingtipPath;')();
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
function fixture(id = 'canada_goose', individual = 0) {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(0.3, 1.2, 0.4); flock.rotation.y = 0.04;
  const bird = model.createMigrationFlyer(THREE, { id }, individual); flock.add(bird);
  bird.position.set(individual * 1.65, 0.5, -5 + individual * 1.9); bird.userData.baseY = 0.5;
  bird.userData.applyWingPhase(1.234);
  const root = createPath(THREE); scene.add(root);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 900);
  camera.position.set(4.5, 3, 3); camera.lookAt(bird.position); camera.updateMatrixWorld(true);
  const engine = { flyers: [bird], time: 0, wingStepSerial: 0, wingStepPhase: 0 };
  scene.updateMatrixWorld(true);
  return {
    scene, flock, bird, root, camera, engine,
    update(enabled = true, mode = 'study', dark = false, selected = bird, species = id, index = individual) { root.updatePath(enabled, mode, selected, species, index, camera, dark, 390); scene.updateMatrixWorld(true); },
    step(serial) { advance(engine, { flightCamera: 'study', flightStudyBird: 0, flightWingStep: serial }, num); scene.updateMatrixWorld(true); },
    cycle() { return root.getObjectByName('migration-wingtip-cycle'); },
    point(side) { return root.getObjectByName(side === 0 ? 'migration-wingtip-left-point' : 'migration-wingtip-right-point'); }
  };
}
function anchorFor(bird, side) {
  let mesh = bird.userData.primaries[side];
  if (!mesh) bird.userData.wings[side].traverse(part => { if (part.name === 'migration-monarch-forewing') mesh = part; });
  const positions = mesh.geometry.attributes.position;
  const limit = mesh.geometry.userData.monarchBoundaryVertexCount || positions.count;
  let index = 0;
  for (let i = 1; i < limit; i++) if (positions.getX(i) > positions.getX(index) || (positions.getX(i) === positions.getX(index) && positions.getZ(i) > positions.getZ(index))) index = i;
  return { mesh, index, point: new THREE.Vector3().fromBufferAttribute(positions, index) };
}
function snapshot(bird) {
  const out = [];
  bird.traverse(node => out.push({ node, rotation: node.rotation.toArray(), quaternion: node.quaternion.clone(), matrix: node.matrix.toArray(), world: node.matrixWorld.toArray(), dirty: node.matrixWorldNeedsUpdate }));
  return out;
}
function expectRestored(states) {
  for (const saved of states) {
    expect(saved.node.rotation.toArray()).toEqual(saved.rotation);
    expect(saved.node.quaternion.angleTo(saved.quaternion)).toBeLessThan(0.000001);
    expect(saved.node.matrix.toArray()).toEqual(saved.matrix);
    expect(saved.node.matrixWorld.toArray()).toEqual(saved.world);
    expect(saved.node.matrixWorldNeedsUpdate).toBe(saved.dirty);
  }
}
function walk(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, out)); return out; }
  if (predicate(node)) out.push(node);
  walk(node.props?.children, predicate, out); return out;
}
function view(seed = {}) {
  const tool = loadTool(sourcePath, 'migration');
  let state = { tab: 'flight3d', flightCamera: 'study', ...seed }, tree;
  const writes = [];
  const ctx = makeCtx({ update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; } });
  const ui = {
    get state() { return state; }, writes,
    draw() { ctx.toolData = { migration: state }; return ReactDOMServer.renderToStaticMarkup(React.createElement(function View() { tree = tool.render(ctx); return tree; })); },
    nodes(predicate) { return walk(tree, predicate); },
    checkbox() { const group = ui.nodes(node => node.props?.['data-study-wingtip-path'])[0]; return group && walk(group, node => node.type === 'input')[0]; },
    toggle(checked) { ui.checkbox().props.onChange({ target: { checked } }); return ui.draw(); },
    change(values) { state = { ...state, ...values }; return ui.draw(); }
  };
  ui.draw(); return ui;
}
beforeEach(() => resetStemLab());
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Migration body-relative wingtip cycle guide', () => {
  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('samples actual %s outer geometry through one complete cycle', id => {
    const f = fixture(id, 2); f.update();
    const cycle = f.cycle(), positions = cycle.geometry.attributes.position;
    expect(f.root.userData).toMatchObject({ available: true, sourceBirdUuid: f.bird.uuid, sampleCount: 64, speciesId: id, individual: 2, buildVersion: 1 });
    expect(cycle.geometry.drawRange.count).toBe(256);
    const inverse = f.bird.matrixWorld.clone().invert();
    for (let side = 0; side < 2; side++) {
      const expected = anchorFor(f.bird, side), metadata = f.root.userData.sources[side];
      expect(metadata).toMatchObject({ side, nodeUuid: expected.mesh.uuid, geometryUuid: expected.mesh.geometry.uuid, vertexIndex: expected.index });
      for (let sample = 0; sample < 64; sample++) {
        f.bird.userData.applyWingPhase(sample * Math.PI * 2 / 64); f.bird.updateWorldMatrix(true, true);
        const point = expected.point.clone().applyMatrix4(expected.mesh.matrixWorld).applyMatrix4(inverse);
        const actual = new THREE.Vector3().fromBufferAttribute(positions, side * 128 + sample * 2);
        expect(actual.distanceTo(point)).toBeLessThan(0.000001);
      }
      const start = new THREE.Vector3().fromBufferAttribute(positions, side * 128);
      const end = new THREE.Vector3().fromBufferAttribute(positions, side * 128 + 127);
      expect(start.toArray()).toEqual(end.toArray());
    }
    if (id === 'monarch') expect(f.root.userData.sources.every(item => item.vertexIndex < f.bird.getObjectByProperty('uuid', item.nodeUuid).geometry.userData.monarchBoundaryVertexCount)).toBe(true);
  });

  it('restores exact live joint Eulers and matrices without changing body time or counters', () => {
    const f = fixture('arctic_tern', 1);
    f.bird.userData.wings[0].rotation.y = 0.12;
    f.bird.userData.wrists[1].rotation.x = -0.09;
    f.scene.updateMatrixWorld(true);
    const saved = snapshot(f.bird), phase = f.bird.userData.phase;
    const counters = { time: f.engine.time, step: f.engine.wingStepSerial, phase: f.engine.wingStepPhase };
    f.update(); expectRestored(saved);
    expect({ time: f.engine.time, step: f.engine.wingStepSerial, phase: f.engine.wingStepPhase }).toEqual(counters);
    expect(f.bird.userData.phase).toBe(phase);
  });

  it('restores joints in finally on sampling failure and avoids retrying that source every frame', () => {
    const f = fixture(); const saved = snapshot(f.bird), original = f.bird.userData.applyWingPhase;
    let calls = 0; f.bird.userData.applyWingPhase = phase => { if (++calls === 5) throw new Error('injected sampling failure'); original(phase); };
    f.update(); expectRestored(saved); expect(f.root.visible).toBe(false); expect(f.root.userData.available).toBe(false);
    f.update(); expect(calls).toBe(5); expect(f.root.userData.buildVersion).toBe(1);
    f.bird.userData.applyWingPhase = original; f.root.invalidate(); f.update(); expect(f.root.visible).toBe(true);
  });

  it('uses the same articulation method in the actual RAF wing step and in the sampler', () => {
    const f = fixture(); const apply = vi.spyOn(f.bird.userData, 'applyWingPhase');
    f.step(2); expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][0]).toBeCloseTo(f.bird.userData.phase + Math.PI / 2, 10);
    f.update(); expect(apply).toHaveBeenCalledTimes(65);
    f.update(); expect(apply).toHaveBeenCalledTimes(65);
  });

  it('keeps markers on the true live tips as wing joints move while the path stays frozen', () => {
    const f = fixture('monarch'); f.update();
    const positions = Array.from(f.cycle().geometry.attributes.position.array), version = f.cycle().geometry.attributes.position.version;
    const before = f.point(0).position.clone();
    f.step(3); f.update(); expect(f.point(0).position.distanceTo(before)).toBeGreaterThan(0.01);
    for (let side = 0; side < 2; side++) {
      const anchor = anchorFor(f.bird, side), inverse = f.bird.matrixWorld.clone().invert();
      const actual = anchor.point.applyMatrix4(anchor.mesh.matrixWorld).applyMatrix4(inverse);
      expect(f.point(side).position.distanceTo(actual)).toBeLessThan(0.000001);
    }
    expect(Array.from(f.cycle().geometry.attributes.position.array)).toEqual(positions);
    expect(f.cycle().geometry.attributes.position.version).toBe(version); expect(f.root.userData.buildVersion).toBe(1);
  });

  it('distinguishes anatomical sides with solid and dashed distances rather than color alone', () => {
    const f = fixture(); f.update(); const distances = f.cycle().geometry.attributes.lineDistance;
    expect(f.cycle().material.isLineDashedMaterial).toBe(true);
    for (let i = 0; i < 128; i++) expect(distances.getX(i)).toBe(0);
    expect(distances.getX(128)).toBe(0); expect(distances.getX(255)).toBeGreaterThan(0.5);
    for (let i = 129; i < 256; i++) expect(distances.getX(i)).toBeGreaterThanOrEqual(distances.getX(i - 1));
  });

  it('adapts contrast only on theme changes and preserves all positions and resource identities', () => {
    const f = fixture(); f.update(); const cycle = f.cycle(), geometry = cycle.geometry, material = cycle.material;
    const attributes = { ...geometry.attributes }, frozen = Array.from(attributes.position.array), positionVersion = attributes.position.version;
    const day = [0x021016, 0x240c01], night = [0x67e8f9, 0xfbbf24];
    for (const dark of [false, true, true, false]) {
      const previousColorVersion = attributes.color.version, previousTheme = f.root.userData.isDark;
      f.update(true, 'study', dark);
      expect(attributes.color.version).toBe(previousColorVersion + (previousTheme !== dark ? 1 : 0));
      for (let side = 0; side < 2; side++) {
        const expected = new THREE.Color((dark ? night : day)[side]), vertex = side * 128;
        expect(attributes.color.getX(vertex)).toBeCloseTo(expected.r, 6);
        expect(attributes.color.getY(vertex)).toBeCloseTo(expected.g, 6);
        expect(attributes.color.getZ(vertex)).toBeCloseTo(expected.b, 6);
        expect(f.point(side).material.color.getHex()).toBe((dark ? night : day)[side]);
      }
    }
    expect(cycle.geometry).toBe(geometry); expect(cycle.material).toBe(material);
    for (const key of Object.keys(attributes)) expect(geometry.attributes[key]).toBe(attributes[key]);
    expect(attributes.position.version).toBe(positionVersion); expect(Array.from(attributes.position.array)).toEqual(frozen);
    expect(f.root.userData.buildVersion).toBe(1);
  });

  it('reuses the same sample and resources across camera, orbit, zoom and opt-out changes', () => {
    const f = fixture(); f.update(); const cycle = f.cycle(), geometry = cycle.geometry, points = [f.point(0), f.point(1)];
    const apply = vi.spyOn(f.bird.userData, 'applyWingPhase');
    for (let i = 0; i < 20; i++) { f.camera.position.x += 0.1; f.update(i % 2 === 0, i % 3 ? 'study' : 'chase'); }
    expect(apply).not.toHaveBeenCalled(); expect(f.root.userData.buildVersion).toBe(1);
    expect(f.cycle()).toBe(cycle); expect(cycle.geometry).toBe(geometry); expect(f.point(0)).toBe(points[0]); expect(f.point(1)).toBe(points[1]);
    f.update(true, 'study'); expect(f.root.visible).toBe(true);
  });

  it('invalidates old source references while disabled and rebuilds only for a newly selected bird', () => {
    const f = fixture(); f.update(); const geometry = f.cycle().geometry;
    const other = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0); f.flock.add(other);
    f.update(false, 'chase', false, other, 'monarch', 0);
    expect(f.root.userData.sources).toEqual([]); expect(f.root.userData.sourceBirdUuid).toBe(''); expect(f.cycle().geometry.drawRange.count).toBe(0);
    f.update(true, 'study', false, other, 'monarch', 0);
    expect(f.root.userData.sourceBirdUuid).toBe(other.uuid); expect(f.root.userData.buildVersion).toBe(2); expect(f.cycle().geometry).toBe(geometry);
  });

  it('keeps scene ownership through explicit invalidation and disposes each pooled resource once', () => {
    const f = fixture(); f.update();
    const resources = new Set(); f.root.traverse(part => { if (part.geometry) resources.add(part.geometry); if (part.material) resources.add(part.material); });
    const events = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => events.set(resource, events.get(resource) + 1));
    f.root.invalidate(); expect(f.root.parent).toBe(f.scene); expect([...events.values()].every(count => count === 0)).toBe(true);
    dispose(f.scene); expect([...events.values()].every(count => count === 1)).toBe(true);
  });

  it('rejects incomplete wing metadata without throwing or scheduling repeated failed builds', () => {
    const f = fixture(), malformed = new THREE.Group(); malformed.userData = { wings: [], applyWingPhase() {} };
    expect(() => f.update(true, 'study', false, malformed, 'unknown', 0)).not.toThrow();
    expect(f.root.visible).toBe(false); expect(f.root.userData.buildVersion).toBe(1);
    f.update(true, 'study', false, malformed, 'unknown', 0); expect(f.root.userData.buildVersion).toBe(1);
  });

  it('keeps the path invalidated across later RAF updates after the actual context-loss listener', () => {
    const f = fixture();
    const host = document.createElement('div'), canvas = document.createElement('canvas');
    host.setAttribute('data-flight-ready', 'true'); host.append(canvas); document.body.append(host);
    const engine = Object.assign(f.engine, { wingtipPath: f.root, markedWingPose: { clearPose: vi.fn() },
      speciesId: 'canada_goose', camera: f.camera, viewHeight: 390 });
    const live = { flightShowWingtipPath: true, flightCamera: 'study', isDark: false };
    const frame = new Function('engineNow', 'live', 'studyBirdIndex', 'host', 'followedTipSide', 'guidesHidden',
      section('          engineNow.wingtipPath.updatePath(', '          engineNow.renderer.render('));
    const installLoss = new Function('renderer', 'cancelMigrationStudyPreview', 'engine', 'host', 'statusNode', 't',
      'studyCyclePositionState', '_liveVals', '_f3dStudyCyclePauseRef', 'studyWingtipFollowState', '_f3dStudyStepAckRef',
      section("          renderer.domElement.addEventListener('webglcontextlost'", "          host.setAttribute('data-flight-ready', 'true');"));
    const stepAckRef = { current: { pending: { manualStep: 20 } } };
    installLoss({ domElement: canvas }, vi.fn(), engine, host, document.createElement('div'), (_, fallback) => fallback,
      [null, vi.fn()], { current: live }, { current: null }, [null, vi.fn()], stepAckRef);
    frame(engine, live, 0, host, undefined, false);
    expect(f.root.visible).toBe(true);
    const version = f.root.userData.buildVersion;
    frame(engine, live, 0, host, undefined, true);
    expect(f.root.visible).toBe(false); expect(f.root.userData.buildVersion).toBe(version);
    expect(live.flightShowWingtipPath).toBe(true);
    frame(engine, live, 0, host, undefined, false); expect(f.root.visible).toBe(true);
    engine.studyGuidesOwner = { sourceUuid: f.root.userData.sourceBirdUuid };
    const event = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(event);
    expect(stepAckRef.current.pending).toBeNull();
    expect(engine.studyGuidesOwner).toBeNull();
    expect(event.defaultPrevented).toBe(true); expect(host.hasAttribute('data-flight-ready')).toBe(false);
    // Keep the preference enabled and continue the real RAF call. The guard
    // must prevent a later frame from rebuilding the cache just invalidated.
    for (let laterFrame = 0; laterFrame < 5; laterFrame++) frame(engine, live, 0, host, undefined, false);
    expect(live.flightShowWingtipPath).toBe(true);
    expect(f.root.userData.buildVersion).toBe(version);
    expect(f.root.userData.available).toBe(false); expect(f.root.visible).toBe(false);
    expect(f.root.userData.sourceBirdUuid).toBe(''); expect(f.root.userData.sources).toEqual([]);
    expect(f.cycle().geometry.drawRange.count).toBe(0);
  });

  it('fits all sampled paths and live markers inside the default Study camera on desktop and phone', () => {
    for (const id of ['canada_goose', 'arctic_tern', 'sandhill_crane', 'monarch']) for (const aspect of [804 / 678, 390 / 390]) {
      const f = fixture(id); f.camera.aspect = aspect; f.camera.updateProjectionMatrix();
      for (const [yaw, pitch] of [[180, 10], [0, 60], [90, 10]]) {
        const target = f.bird.getWorldPosition(new THREE.Vector3()), radius = model.migrationStudyDistance(f.bird, f.camera, 1);
        f.camera.position.set(Math.sin(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180), Math.sin(pitch * Math.PI / 180), Math.cos(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180)).multiplyScalar(radius).add(target);
        f.camera.lookAt(target); f.camera.updateMatrixWorld(true); f.update();
        const attribute = f.cycle().geometry.attributes.position;
        for (let i = 0; i < 256; i++) {
          const point = new THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(f.root.matrixWorld).project(f.camera);
          expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1);
        }
        for (const side of [0, 1]) {
          const center = f.point(side).getWorldPosition(new THREE.Vector3()).project(f.camera);
          expect(Math.abs(center.x)).toBeLessThan(0.96); expect(Math.abs(center.y)).toBeLessThan(0.96);
        }
      }
    }
  });

  it('provides a native opt-in checkbox only in Study with linked guidance', () => {
    const ui = view(); expect(ui.checkbox().props.checked).toBe(false);
    expect(ui.checkbox().props['aria-controls']).toBe('migration-flight-stage');
    expect(ui.checkbox().props['aria-describedby']).toBe('migration-wingtip-path-help');
    expect(ui.nodes(node => node.props?.['data-wingtip-path-legend'])).toHaveLength(0);
    ui.change({ flightCamera: 'chase' }); expect(ui.checkbox()).toBeUndefined();
  });

  it('writes only the path preference and leaves all learning evidence, physics and poses intact', () => {
    const observations = { records: {}, drafts: { 'canada_goose:head': 'Keep this note' } }, investigation = { evidence: 'Keep this explanation' };
    const ui = view({ flightStudyObservations: observations, flightInvestigation: investigation, flightWind: -10, flightPaused: false, flightWingStep: 5 });
    const html = ui.toggle(true);
    expect(ui.writes).toEqual([{ flightShowWingtipPath: true }]); expect(ui.state.flightStudyObservations).toBe(observations); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.flightWind).toBe(-10); expect(ui.state.flightPaused).toBe(false); expect(ui.state.flightWingStep).toBe(5);
    expect(html).toContain('Before showing the path, predict'); expect(html).toContain('Describe what changed in your observation notes');
    expect(html).toContain('Individual’s left: solid path'); expect(html).toContain('Individual’s right: dashed path');
    expect(html).toContain('not a flight track, distance scale, or measured wingbeat rate');
  });

  it('retains the preference outside Study and treats malformed saved flags as opt-out', () => {
    const ui = view({ flightShowWingtipPath: 'true' }); expect(ui.checkbox().props.checked).toBe(false);
    ui.toggle(true); ui.change({ flightCamera: 'side' }); expect(ui.checkbox()).toBeUndefined();
    ui.change({ flightCamera: 'study', flightSpecies: 'monarch' }); expect(ui.checkbox().props.checked).toBe(true);
    ui.toggle(false); expect(ui.nodes(node => node.props?.['data-wingtip-path-legend'])).toHaveLength(0);
  });
});
