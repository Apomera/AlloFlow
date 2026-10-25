import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing scene section: ' + start);
  return source.slice(a, b);
}
const num = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, createMigrationTailGeometry, createMigrationAnatomyMarkers, migrationStudyDistance };')(num);

const flightSpeedValues = new Function(
  section('  var SPECIES = [', '  // Resolve model behaviour') +
  section('  function migrNum(', '  // Sibling of migrNum') +
  section('  function migrFlightSpeedValues(', '  function migrFlightInvestigationSnapshot(') +
  '\nreturn migrFlightSpeedValues;'
)();

const createSpeedVectors = new Function(section('      function createMigrationSpeedVectors(', '      function initMigrationFlightScene(') + '\nreturn createMigrationSpeedVectors;')();

function fixture(id = 'canada_goose', count = 11) {
  const scene = new THREE.Scene();
  const flockRoot = new THREE.Group();
  flockRoot.position.y = 1.2;
  scene.add(flockRoot);
  const engine = { speciesId: id, time: 0, flyers: [], wingStepSerial: 0, wingStepPhase: 0 };
  for (let index = 0; index < count; index++) {
    const bird = model.createMigrationFlyer(THREE, { id }, index);
    bird.position.set(index * 1.65, 0.5 - index * 0.08, -5 + index * 1.9);
    bird.userData.baseY = bird.position.y;
    flockRoot.add(bird);
    engine.flyers.push(bird);
  }
  new Function('THREE', 'scene', 'flockRoot', 'engine', 'migrNum', 'createMigrationAnatomyMarkers', 'createMigrationSpeedVectors', section('          var WAKE_BIRDS = 5;', '          engine.rebuildFlock ='))(THREE, scene, flockRoot, engine, num, model.createMigrationAnatomyMarkers, createSpeedVectors);
  return { scene, flockRoot, engine };
}

describe('Migration Study orbit, anatomical landmarks, and manual wingbeat', () => {
  it('builds one finite scalloped tail buffer and vertex tints without per-feather meshes', () => {
    const geometry = model.createMigrationTailGeometry(THREE);
    expect(geometry.attributes.position.count).toBe(49);
    expect(geometry.attributes.color.count).toBe(49);
    expect(geometry.index.count).toBe(147);
    for (const attribute of Object.values(geometry.attributes)) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    const bird = model.createMigrationFlyer(THREE, { id: 'snow_goose' }, 0);
    let tails = 0;
    bird.traverse(part => { if (part.name === 'migration-tail-feathers') tails++; });
    expect(tails).toBe(1);
    expect(bird.userData.primaries[0].geometry.attributes.position.count).toBe(35);
    expect(bird.userData.primaries[0].geometry.attributes.color.count).toBe(35);
  });

  it('follows all four real anatomical parts while retaining pooled buffers', () => {
    const { engine } = fixture();
    engine.updateAnatomy(true, 8);
    const overlay = engine.anatomyOverlay;
    const positions = overlay.geometry.attributes.position.array;
    const snapshot = Array.from(positions);
    expect(overlay.visible).toBe(true);
    expect(overlay.geometry.drawRange.count).toBe(130);
    expect(engine.flyers[8].userData.anatomyAnchors.map(a => a.id)).toEqual(['head', 'inner-wing', 'primaries', 'tail']);
    expect(engine.flyers[8].userData.anatomyAnchors[2].node).toBe(engine.flyers[8].userData.primaries[1]);
    engine.updateAnatomy(true, 8);
    expect(overlay.geometry.attributes.position.array).toBe(positions);
    expect(Array.from(positions)).toEqual(snapshot);
    engine.flyers[8].position.x += 2;
    engine.updateAnatomy(true, 8);
    expect(positions[0] - snapshot[0]).toBeCloseTo(2, 5);
    const preWrist = Array.from(positions);
    engine.flyers[8].userData.wrists[1].rotation.z += 0.5;
    engine.updateAnatomy(true, 8);
    expect(Array.from(positions)).not.toEqual(preWrist);
    expect(Array.from(positions).every(Number.isFinite)).toBe(true);
  });

  it('still renders a wake for a selected follower beyond the first five birds', () => {
    const { engine } = fixture();
    engine.flyers.forEach((bird, index) => { bird.visible = index === 9; });
    engine.updateAirflow(true);
    expect(engine.airflow.children[0].geometry.drawRange.count).toBe(96);
    expect(engine.airflow.children[1].geometry.drawRange.count).toBe(12);
  });

  it('excludes bird anatomy for Monarchs and hides callouts on opt-out', () => {
    const bird = fixture();
    bird.engine.updateAnatomy(true, 0);
    bird.engine.updateAnatomy(false, 0);
    expect(bird.engine.anatomyOverlay.visible).toBe(false);
    const monarch = fixture('monarch', 18);
    monarch.engine.updateAnatomy(true, 0);
    expect(monarch.engine.anatomyOverlay.visible).toBe(false);
    expect(monarch.engine.flyers[0].userData.anatomyAnchors).toEqual([]);
  });

  it('orbits the selected moving bird with independent yaw, elevation, and zoom', () => {
    const { engine, flockRoot } = fixture();
    const camera = new THREE.PerspectiveCamera();
    Object.assign(engine, { camera, flockRoot, cameraTarget: new THREE.Vector3(), studyTarget: new THREE.Vector3(), studyOrbit: new THREE.Vector3(), cameraViews: { chase: new THREE.Vector3(0, 5.5, 18) } });
    const cameraFrame = new Function('engineNow', 'live', 'migrNum', 'reducedMotionRef', 'delta', 'studyBirdIndex', 'migrationStudyDistance', 'speedValues', 'guidesHidden = false', section('          var desired = engineNow.cameraViews[live.flightCamera]', '          if (engineNow.sunGlow)'));
    const live = { flightCamera: 'study', flightStudyYaw: 90, flightStudyPitch: 0, flightStudyZoom: 1 };
    cameraFrame(engine, live, num, { current: true }, 0.016, 8, model.migrationStudyDistance, flightSpeedValues('canada_goose', 8));
    const target = engine.flyers[8].getWorldPosition(new THREE.Vector3());
    const fittedRadius = model.migrationStudyDistance(engine.flyers[8], camera, 1);
    expect(camera.position.x).toBeCloseTo(target.x + fittedRadius, 5);
    expect(camera.position.y).toBeCloseTo(target.y, 5);
    expect(camera.position.z).toBeCloseTo(target.z, 5);
    live.flightStudyPitch = 60;
    live.flightStudyZoom = 1.6;
    cameraFrame(engine, live, num, { current: true }, 0.016, 8, model.migrationStudyDistance, flightSpeedValues('canada_goose', 8));
    expect(camera.position.distanceTo(target)).toBeCloseTo(fittedRadius / 1.6, 5);
    expect(camera.position.y - target.y).toBeCloseTo(Math.sin(Math.PI / 3) * fittedRadius / 1.6, 5);
    live.flightCamera = 'chase';
    cameraFrame(engine, live, num, { current: true }, 0.016, 8, model.migrationStudyDistance, flightSpeedValues('canada_goose', 8));
    expect(camera.position.toArray()).toEqual([0, 5.5, 18]);
    expect(engine.cameraTarget.toArray()).toEqual([0, 0, -5]);
  });

  it('advances wings once per explicit step while body and world time stay frozen', () => {
    const { engine } = fixture('canada_goose', 1);
    const frame = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
    const live = { flightCamera: 'study', flightStudyBird: 0, flightWingStep: 0 };
    frame(engine, live, num);
    const bird = engine.flyers[0];
    const before = bird.userData.wings[0].rotation.z;
    const bodyY = bird.position.y;
    live.flightWingStep = 1;
    frame(engine, live, num);
    expect(bird.userData.wings[0].rotation.z).not.toBe(before);
    expect(bird.position.y).toBe(bodyY);
    expect(engine.time).toBe(0);
    engine.updateAnatomy(true, 0);
    const anchors = bird.userData.anatomyAnchors;
    const primaryAnchor = anchors[2];
    expect(primaryAnchor.node).toBe(bird.userData.primaries[1]);
    const primaryStart = anchors.slice(0, 2).reduce((sum, anchor) => sum + anchor.outline.length / 3 + 4, 0) * 3;
    const expectedPrimary = primaryAnchor.node.localToWorld(new THREE.Vector3(primaryAnchor.outline[0], primaryAnchor.outline[1], primaryAnchor.outline[2]));
    const actualPrimary = new THREE.Vector3().fromArray(engine.anatomyOverlay.geometry.attributes.position.array, primaryStart);
    expect(actualPrimary.distanceTo(expectedPrimary)).toBeLessThan(0.000001);
    const stepped = bird.userData.wings[0].rotation.z;
    frame(engine, live, num);
    expect(bird.userData.wings[0].rotation.z).toBe(stepped);
    live.flightCamera = 'chase';
    frame(engine, live, num);
    expect(engine.flyers.every(f => f.visible)).toBe(true);
  });
});
