import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const sourcePath = process.env.MIGRATION_POSE_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const source = fs.readFileSync(path.join(process.cwd(), sourcePath), 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical marked pose section: ' + start);
  return source.slice(first, last);
}
const num = new Function(section('  function migrNum(', '  // Sibling of migrNum') + '\nreturn migrNum;')();
const createFlyer = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn createMigrationFlyer;')(num);
const createPose = new Function(section('      function createMigrationMarkedWingPose(', '      function initMigrationFlightScene(') + '\nreturn createMigrationMarkedWingPose;')();
const advance = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const dispose = new Function(section('      function disposeMigrationObject(', '      function releaseMigrationStudyPointer(') + '\nreturn disposeMigrationObject;')();
const renderControls = new Function('h', 'React', 't', 'species', 'studyView', 'formationMode', 'season',
  'studyMarkedPoseState', '_f3dEngineRef', '_liveVals', 'upd', 'announceToSR', 'migrNum', '_f3dStudyCyclePauseRef',
  'd', '_f3dHostRef', 'studyCyclePositionState', 'studyWingtipFollowState', 'studyGuidesHidden',
  section('  function MigrationStudyContextReadout(', '  function migrNum(') +
  section('      function migrationStudyCycleContext(', '      function renderFlight3D()') +
  section('        function renderStudySceneNoteAction(', '        function renderStudyObservation()') +
  section('        function renderMarkedWingPoseControls()', '        function renderStudyControls()') + '\nreturn renderMarkedWingPoseControls();');
const invalidateContext = new Function('useEffect', '_f3dEngineRef', 'studyMarkedPoseState', 'flightValues', 'studyView',
  section('      useEffect(function() {\n        var engine = _f3dEngineRef.current;\n        var marked = studyMarkedPoseState[0];', '      useEffect(function() {\n        return function() { destroyMigrationFlightEngine();'));

function walk(node, predicate, matches = []) {
  if (!node || typeof node !== 'object') return matches;
  if (Array.isArray(node)) { node.forEach(child => walk(child, predicate, matches)); return matches; }
  if (predicate(node)) matches.push(node);
  walk(node.props?.children, predicate, matches);
  return matches;
}
function fixture(speciesId = 'canada_goose', individual = 0) {
  const scene = new THREE.Scene(), flock = new THREE.Group(); scene.add(flock);
  flock.position.set(0.4, 1.2, -1); flock.rotation.y = 0.04;
  const bird = createFlyer(THREE, { id: speciesId }, individual);
  bird.position.set(individual * 1.65, 0.5, -5 + individual * 1.9);
  bird.userData.baseY = bird.position.y;
  flock.add(bird);
  const onClear = vi.fn(), root = createPose(THREE, onClear); scene.add(root);
  const engine = { flyers: [bird], time: 0, wingStepSerial: 0, wingStepPhase: 0 };
  function step(serial) { advance(engine, { flightCamera: 'study', flightStudyBird: 0, flightWingStep: serial }, num); scene.updateMatrixWorld(true); }
  step(0);
  return { scene, flock, bird, root, engine, onClear, step };
}
function activePositions(root) { return Array.from(root.geometry.attributes.position.array.slice(0, root.geometry.drawRange.count * 3)); }
function expectedBoundary(mesh, boundaryVertexCount) {
  if (boundaryVertexCount) {
    const positions = mesh.geometry.attributes.position, out = [];
    for (let i = 0; i < boundaryVertexCount; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(positions, i), new THREE.Vector3().fromBufferAttribute(positions, (i + 1) % boundaryVertexCount));
    }
    return out;
  }
  const edges = new THREE.EdgesGeometry(mesh.geometry, 180);
  const positions = edges.attributes.position;
  const out = Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i));
  edges.dispose(); return out;
}
function controls(seed = {}, suppliedFixture) {
  const three = suppliedFixture || fixture(seed.flightSpecies || 'canada_goose');
  const host = document.createElement('div'); host.setAttribute('data-flight-ready', 'true');
  let state = { flightSpecies: 'canada_goose', flightSeason: 'fall', flightFormation: 'natural', flightStudyBird: 0, flightWingStep: 0, flightPaused: false, ...seed };
  const statuses = [null, value => { statuses[0] = value; }];
  const pose = createPose(THREE, () => { statuses[0] = null; });
  three.scene.add(pose);
  const engineRef = { current: { host, flyers: [three.bird], speciesId: state.flightSpecies, formationMode: state.flightFormation, season: state.flightSeason, wingStepSerial: three.engine.wingStepSerial, markedWingPose: pose } };
  const live = { current: { flightPaused: state.flightPaused, flightWingStep: state.flightWingStep } }, writes = [], announce = vi.fn();
  let tree;
  const ui = {
    ...three, pose, engineRef, statuses, live, writes, announce,
    get state() { return state; },
    draw() {
      tree = renderControls(React.createElement, React, (_, fallback) => fallback,
        { id: state.flightSpecies }, { bird: state.flightStudyBird, step: state.flightWingStep }, state.flightFormation, state.flightSeason,
        statuses, engineRef, live,
        (key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; }, announce, num, { current: null }, state, { current: host }, [null], [null], false);
      return ReactDOMServer.renderToStaticMarkup(tree);
    },
    action(name) { return walk(tree, node => node.props?.['data-marked-pose-action'] === name)[0]; },
    click(name) { ui.action(name).props.onClick(); return ui.draw(); },
    status() { return walk(tree, node => node.props?.['data-marked-pose-status'])[0].props['data-marked-pose-status']; },
    change(values) {
      state = { ...state, ...values };
      invalidateContext(callback => callback(), engineRef, statuses,
        { speciesId: state.flightSpecies, formationMode: state.flightFormation, season: state.flightSeason }, { bird: state.flightStudyBird });
      return ui.draw();
    }
  };
  ui.draw(); return ui;
}

beforeEach(() => resetStemLab());
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('Migration temporary marked wing pose', () => {
  it.each(['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'])('captures actual %s wing boundaries in bird-local coordinates', speciesId => {
    const { root, bird, step } = fixture(speciesId, 2);
    step(3);
    expect(root.capturePose(bird, speciesId, 2)).toBe(true);
    expect(root.name).toBe('migration-marked-wing-pose');
    expect(root.userData).toMatchObject({ captured: true, speciesId, individual: 2, sourceBirdUuid: bird.uuid });
    expect(root.geometry.drawRange.count).toBeGreaterThan(100);
    expect(root.geometry.drawRange.count).toBeLessThan(300);
    expect(new Set(root.userData.sources.map(item => item.side))).toEqual(new Set([0, 1]));
    const inverse = bird.matrixWorld.clone().invert(), captured = root.geometry.attributes.position;
    for (const item of root.userData.sources) {
      const mesh = bird.getObjectByProperty('uuid', item.nodeUuid);
      expect(mesh.geometry.uuid).toBe(item.geometryUuid);
      const expected = expectedBoundary(mesh, item.boundaryVertexCount);
      expect(item.vertexCount).toBe(expected.length);
      expected.forEach((point, index) => {
        point.applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        const actual = new THREE.Vector3().fromBufferAttribute(captured, item.offset + index);
        expect(actual.distanceTo(point)).toBeLessThan(0.000001);
      });
    }
  });

  it('uses only the true Monarch membrane rim, excluding decorative cell and spot borders', () => {
    const { root, bird } = fixture('monarch');
    root.capturePose(bird, 'monarch', 0);
    expect(root.userData.sources).toHaveLength(4);
    for (const item of root.userData.sources) {
      const mesh = bird.getObjectByProperty('uuid', item.nodeUuid);
      expect(item.boundaryVertexCount).toBeGreaterThan(20);
      expect(item.vertexCount).toBe(item.boundaryVertexCount * 2);
      expect(item.boundaryVertexCount).toBeLessThan(mesh.geometry.attributes.position.count / 5);
      expect(['migration-monarch-forewing', 'migration-monarch-hindwing']).toContain(item.role);
    }
    expect(root.userData.vertexCount).toBe(256);
  });

  it('freezes articulated wrists and primaries while explicit wing steps change the live bird', () => {
    const { root, bird, step } = fixture('canada_goose');
    root.capturePose(bird, 'canada_goose', 0);
    const frozen = activePositions(root), wrist = bird.userData.wrists[1].quaternion.clone();
    expect(root.userData.sources.filter(item => item.role === 'migration-primary-feathers')).toHaveLength(2);
    step(2); root.updatePose(bird, 'study');
    expect(bird.userData.wrists[1].quaternion.angleTo(wrist)).toBeGreaterThan(0.01);
    expect(activePositions(root)).toEqual(frozen);
    root.capturePose(bird, 'canada_goose', 0);
    expect(activePositions(root)).not.toEqual(frozen);
    expect(root.userData.captureVersion).toBe(2);
  });

  it('keeps one buffer, both attributes and material through repeated capture, step and clear', () => {
    const { root, bird, step } = fixture('arctic_tern');
    const geometry = root.geometry, positions = geometry.attributes.position, distance = geometry.attributes.lineDistance, material = root.material;
    for (let i = 0; i < 20; i++) {
      step(i); expect(root.capturePose(bird, 'arctic_tern', 0)).toBe(true);
      root.updatePose(bird, 'study'); root.clearPose();
    }
    expect(root.geometry).toBe(geometry); expect(root.material).toBe(material);
    expect(root.geometry.attributes.position).toBe(positions);
    expect(root.geometry.attributes.lineDistance).toBe(distance);
    expect(root.geometry.drawRange.count).toBe(0); expect(root.visible).toBe(false);
  });

  it('uses real dashed distances and a distinct non-occluding line material', () => {
    const { root, bird } = fixture(); root.capturePose(bird, 'canada_goose', 0);
    expect(root.material.isLineDashedMaterial).toBe(true);
    expect(root.material.color.getHex()).toBe(0x301056);
    expect(root.material.dashSize).toBeGreaterThan(0); expect(root.material.gapSize).toBeGreaterThan(0);
    expect(root.material.depthWrite).toBe(false); expect(root.material.depthTest).toBe(false);
    expect(root.renderOrder).toBe(6); expect(root.matrixAutoUpdate).toBe(false);
    const positions = root.geometry.attributes.position, distances = root.geometry.attributes.lineDistance;
    for (let i = 0; i < root.geometry.drawRange.count; i += 2) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i), b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
      expect(distances.getX(i)).toBe(0);
      expect(distances.getX(i + 1)).toBeCloseTo(a.distanceTo(b), 6);
    }
  });

  it('adapts contrast only on theme changes while preserving every captured resource and position', () => {
    const { root, bird } = fixture(); root.capturePose(bird, 'canada_goose', 0);
    const geometry = root.geometry, material = root.material;
    const positions = geometry.attributes.position, distances = geometry.attributes.lineDistance;
    const versions = [positions.version, distances.version];
    const frozen = activePositions(root), uuid = root.uuid;
    const setHex = vi.spyOn(material.color, 'setHex');
    root.updatePose(bird, 'study', false);
    expect(material.color.getHex()).toBe(0x301056);
    expect(setHex).toHaveBeenCalledTimes(1);
    for (let frame = 0; frame < 10; frame++) root.updatePose(bird, 'study', false);
    expect(setHex).toHaveBeenCalledTimes(1);
    root.updatePose(bird, 'study', true);
    expect(material.color.getHex()).toBe(0xc4b5fd);
    expect(setHex).toHaveBeenCalledTimes(2);
    root.updatePose(bird, 'study', true);
    expect(setHex).toHaveBeenCalledTimes(2);
    root.updatePose(bird, 'study', false);
    expect(setHex).toHaveBeenCalledTimes(3);
    expect(root.uuid).toBe(uuid); expect(root.geometry).toBe(geometry); expect(root.material).toBe(material);
    expect(geometry.attributes.position).toBe(positions); expect(geometry.attributes.lineDistance).toBe(distances);
    expect([positions.version, distances.version]).toEqual(versions);
    expect(activePositions(root)).toEqual(frozen);
  });

  it('follows the bird body matrix while camera switches hide and restore the same reference', () => {
    const { root, bird, scene, flock } = fixture(); root.capturePose(bird, 'canada_goose', 0);
    const frozen = activePositions(root);
    bird.position.y += 0.2; bird.rotation.z = 0.03; flock.position.x += 0.7;
    root.updatePose(bird, 'study'); scene.updateMatrixWorld(true);
    expect(root.matrixWorld.elements).toEqual(bird.matrixWorld.elements);
    root.updatePose(bird, 'chase'); expect(root.visible).toBe(false); expect(root.userData.captured).toBe(true);
    root.updatePose(bird, 'study'); expect(root.visible).toBe(true);
    expect(activePositions(root)).toEqual(frozen);
  });

  it('invalidates the reference permanently when a different individual replaces the source', () => {
    const { root, bird, onClear } = fixture(); root.capturePose(bird, 'canada_goose', 0);
    const other = createFlyer(THREE, { id: 'canada_goose' }, 1);
    root.updatePose(other, 'study');
    expect(root.visible).toBe(false); expect(root.userData.captured).toBe(false); expect(onClear).toHaveBeenCalledOnce();
    root.updatePose(bird, 'study'); expect(root.visible).toBe(false);
    expect(root.geometry.drawRange.count).toBe(0); expect(root.userData.sources).toEqual([]);
  });

  it('disposes temporary edge buffers while leaving original wing resources intact', () => {
    const { root, bird } = fixture();
    const sourceGeometries = new Set(); bird.userData.wings.forEach(wing => wing.traverse(part => { if (part.isMesh) sourceGeometries.add(part.geometry); }));
    const disposed = [];
    const original = THREE.BufferGeometry.prototype.dispose;
    vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function() { disposed.push(this); return original.call(this); });
    root.capturePose(bird, 'canada_goose', 0);
    expect(disposed).toHaveLength(root.userData.sources.length);
    expect(disposed.every(geometry => geometry.type === 'EdgesGeometry' && !sourceGeometries.has(geometry))).toBe(true);
  });

  it('retains scene ownership through clear and flock removal, then disposes the pooled reference once', () => {
    const { root, bird, flock, scene } = fixture(); root.capturePose(bird, 'canada_goose', 0);
    const events = { geometry: 0, material: 0 };
    root.geometry.addEventListener('dispose', () => events.geometry++);
    root.material.addEventListener('dispose', () => events.material++);
    root.clearPose(); flock.remove(bird); dispose(bird);
    expect(root.parent).toBe(scene); expect(events).toEqual({ geometry: 0, material: 0 });
    dispose(scene); expect(events).toEqual({ geometry: 1, material: 1 });
  });

  it('rejects an unsupported or oversized wing instead of displaying a truncated reference', () => {
    const { root } = fixture(); expect(root.capturePose(null, 'canada_goose', 0)).toBe(false);
    const bird = new THREE.Group(), wing = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 600, 1, true), new THREE.MeshBasicMaterial());
    bird.add(wing); bird.userData.wings = [wing];
    expect(root.capturePose(bird, 'future-species', 0)).toBe(false);
    expect(root.geometry.drawRange.count).toBe(0); expect(root.userData.captured).toBe(false); expect(root.visible).toBe(false);
  });

  it('keeps marked and live wing vertices inside the existing default Study fit on phones and desktop', () => {
    const distance = new Function('migrNum', section('      function migrationStudyDistance(', '      function migrationAnatomyAtPoint(') + '\nreturn migrationStudyDistance;')(num);
    for (const species of ['canada_goose', 'arctic_tern', 'sandhill_crane', 'monarch']) for (const aspect of [804 / 678, 390 / 390]) {
      const { root, bird, step, scene } = fixture(species);
      step(3); root.capturePose(bird, species, 0); step(6); root.updatePose(bird, 'study'); scene.updateMatrixWorld(true);
      const target = bird.getWorldPosition(new THREE.Vector3()), camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 900);
      const radius = distance(bird, camera, 1);
      for (const [yaw, pitch] of [[90, 10], [0, 60], [180, 10]]) {
        camera.position.set(Math.sin(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180), Math.sin(pitch * Math.PI / 180), Math.cos(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180)).multiplyScalar(radius).add(target);
        camera.lookAt(target); camera.updateMatrixWorld(true);
        for (let i = 0; i < root.geometry.drawRange.count; i++) {
          const point = new THREE.Vector3().fromBufferAttribute(root.geometry.attributes.position, i).applyMatrix4(root.matrixWorld).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1);
        }
      }
    }
  });

  it('exposes native controls only in Study, with descriptions and clear initially disabled', () => {
    const tool = loadTool(sourcePath, 'migration');
    function render(camera) { const ctx = makeCtx({ toolData: { migration: { tab: 'flight3d', flightCamera: camera } } }); return ReactDOMServer.renderToStaticMarkup(React.createElement(function View() { return tool.render(ctx); })); }
    expect(render('chase')).not.toContain('data-study-marked-pose');
    expect(render('study')).toContain('data-study-marked-pose');
    const ui = controls(); expect(ui.action('mark').type).toBe('button'); expect(ui.action('clear').props.disabled).toBe(true);
    expect(ui.action('mark').props['aria-describedby']).toBe('migration-marked-pose-help migration-marked-pose-status');
    expect(ui.status()).toBe('empty');
  });

  it('native marking pauses and captures once while preserving evidence and all other settings', () => {
    const notes = { records: { 'canada_goose:head': { note: 'Keep this note' } } }, investigation = { prediction: 'Keep this prediction', evidence: 'Keep this draft' };
    const ui = controls({ flightStudyObservations: notes, flightInvestigation: investigation, flightWind: -4, flightWingStep: 6 });
    const html = ui.click('mark');
    expect(ui.writes).toEqual([{ flightPaused: true }]); expect(ui.live.current.flightPaused).toBe(true);
    expect(ui.pose.userData.captured).toBe(true); expect(ui.pose.userData.captureVersion).toBe(1);
    expect(ui.status()).toBe('marked'); expect(ui.action('clear').props.disabled).toBe(false);
    expect(ui.state.flightStudyObservations).toBe(notes); expect(ui.state.flightInvestigation).toBe(investigation);
    expect(ui.state.flightWind).toBe(-4); expect(ui.state.flightWingStep).toBe(6);
    expect(html).toContain('This does not record an observation');
    expect(ui.announce).toHaveBeenCalledWith(expect.stringContaining('Wing pose marked'));
  });

  it('native replace and clear reuse geometry and never resume flight or record evidence', () => {
    const ui = controls(); ui.click('mark'); const geometry = ui.pose.geometry, frozen = activePositions(ui.pose);
    ui.step(2); ui.click('mark'); expect(ui.pose.geometry).toBe(geometry); expect(activePositions(ui.pose)).not.toEqual(frozen);
    expect(ui.pose.userData.captureVersion).toBe(2);
    ui.click('clear'); expect(ui.status()).toBe('empty'); expect(ui.pose.visible).toBe(false); expect(ui.action('clear').props.disabled).toBe(true);
    expect(ui.state.flightPaused).toBe(true); expect(ui.writes).toEqual([{ flightPaused: true }, { flightPaused: true }]);
    expect(ui.state.flightStudyObservations).toBeUndefined();
  });

  it('labels the actual rendered reference manual step separately from the current requested step', () => {
    const ui = controls({ flightWingStep: 6 });
    // The pending state already requests step six, while the actual visible
    // engine geometry is still step zero. Mark preserves what is visible.
    const html = ui.click('mark');
    expect(ui.statuses[0].manualStep).toBe(0);
    expect(html).toContain('Reference manual step 0');
    expect(html).toContain('Current manual step 6');
    expect(ui.writes).toEqual([{ flightPaused: true }]);
    ui.step(6); ui.engineRef.current.wingStepSerial = ui.engine.wingStepSerial;
    expect(ui.click('mark')).toContain('Reference manual step 6');
  });

  it('native marking refuses unready, lost, stale or hidden scene contexts without pausing', () => {
    const cases = [
      ui => ui.engineRef.current.host.removeAttribute('data-flight-ready'),
      ui => ui.engineRef.current.host.setAttribute('data-flight-error', 'true'),
      ui => { ui.engineRef.current.speciesId = 'monarch'; },
      ui => { ui.engineRef.current.formationMode = 'solo'; },
      ui => { ui.engineRef.current.season = 'spring'; },
      ui => { ui.bird.visible = false; },
      ui => { ui.engineRef.current.disposed = true; }
    ];
    for (const mutate of cases) {
      const ui = controls(); mutate(ui); ui.click('mark');
      expect(ui.status()).toBe('unavailable'); expect(ui.pose.userData.captured).toBe(false); expect(ui.writes).toEqual([]);
      expect(ui.state.flightPaused).toBe(false);
    }
  });

  it.each([{ flightSpecies: 'monarch' }, { flightStudyBird: 1 }, { flightFormation: 'solo' }, { flightSeason: 'spring' }])('clears the geometry and transient UI state on context change %j', change => {
    const ui = controls(); ui.click('mark'); ui.change(change);
    expect(ui.status()).toBe('empty'); expect(ui.pose.userData.captured).toBe(false); expect(ui.statuses[0]).toBeNull();
    ui.change({ flightSpecies: 'canada_goose', flightStudyBird: 0, flightFormation: 'natural', flightSeason: 'fall' });
    expect(ui.status()).toBe('empty'); expect(ui.pose.visible).toBe(false);
  });

  it('keeps a mark when only camera and theme change', () => {
    const ui = controls(); ui.click('mark'); const frozen = activePositions(ui.pose);
    ui.change({ flightCamera: 'chase', isDark: true }); ui.pose.updatePose(ui.bird, 'chase');
    expect(ui.pose.visible).toBe(false); expect(ui.pose.userData.captured).toBe(true);
    ui.change({ flightCamera: 'study', isDark: false }); ui.pose.updatePose(ui.bird, 'study');
    expect(ui.pose.visible).toBe(true); expect(ui.status()).toBe('marked'); expect(activePositions(ui.pose)).toEqual(frozen);
  });
});
