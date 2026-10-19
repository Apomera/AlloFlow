import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
let source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const anatomyStart = source.indexOf('      function createMigrationWingGeometry(');
const anatomyEnd = source.indexOf('      function migrationFormationPositions(', anatomyStart);
const anatomy = new Function(source.slice(anatomyStart, anatomyEnd) + '\nreturn { createMigrationFlyer, createMigrationAnatomyMarkers };')();

const speedVectorStart = source.indexOf('      function createMigrationSpeedVectors(');
const speedVectorEnd = source.indexOf('      function initMigrationFlightScene(', speedVectorStart);
const createSpeedVectors = new Function(source.slice(speedVectorStart, speedVectorEnd) + '\nreturn createMigrationSpeedVectors;')();

function fixture(id = 'canada_goose', count = 1) {
  const scene = new THREE.Scene();
  const flockRoot = new THREE.Group();
  flockRoot.position.y = 1.2;
  scene.add(flockRoot);
  const engine = { speciesId: id, time: 0, flyers: [] };
  for (let i = 0; i < count; i++) {
    const flyer = anatomy.createMigrationFlyer(THREE, { id }, i);
    flyer.position.set(i * 1.65, 0.5 - i * 0.08, -5 + i * 1.9);
    flockRoot.add(flyer);
    engine.flyers.push(flyer);
  }
  const overlayStart = source.indexOf('          var WAKE_BIRDS = 5;');
  const overlayEnd = source.indexOf('          engine.rebuildFlock =', overlayStart);
  new Function('THREE', 'scene', 'flockRoot', 'engine', 'createMigrationAnatomyMarkers', 'createMigrationSpeedVectors', source.slice(overlayStart, overlayEnd))(THREE, scene, flockRoot, engine, anatomy.createMigrationAnatomyMarkers, createSpeedVectors);
  return { scene, flockRoot, engine };
}

describe('Migration articulated anatomy and explanatory airflow', () => {
  it('builds two real wrist joints and mirrored, shared primary buffers for each bird species', () => {
    for (const id of ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit']) {
      const bird = anatomy.createMigrationFlyer(THREE, { id }, 0);
      expect(bird.userData.wrists).toHaveLength(2);
      expect(bird.userData.primaries[0].geometry).toBe(bird.userData.primaries[1].geometry);
      expect(bird.userData.primaries.map(p => p.scale.x)).toEqual([-1, 1]);
      expect(bird.userData.primaries[0].geometry.attributes.position.count).toBe(25);
      bird.traverse(part => {
        if (!part.geometry) return;
        for (const attribute of Object.values(part.geometry.attributes)) {
          expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
        }
      });
    }
  });

  it('trails the actual wing transforms and moves outside-upwash arrows with the flock', () => {
    const { engine } = fixture();
    engine.updateAirflow(true);
    expect(engine.airflow.visible).toBe(true);
    const wake = engine.airflow.children.find(p => p.userData.migrationOverlay === 'wingtip-wake');
    const upwash = engine.airflow.children.find(p => p.userData.migrationOverlay === 'upwash-cues');
    expect(wake.geometry.drawRange.count).toBe(96);
    expect(upwash.geometry.drawRange.count).toBe(12);
    const initial = Array.from(wake.geometry.attributes.position.array);
    const arrows = Array.from(upwash.geometry.attributes.position.array);
    const left = engine.flyers[0].userData.wakeAnchors[0];
    const leftPoint = left.node.localToWorld(left.point.clone());
    const right = engine.flyers[0].userData.wakeAnchors[1];
    const rightPoint = right.node.localToWorld(right.point.clone());
    expect(arrows[0]).toBeLessThan(leftPoint.x);
    expect(arrows[18]).toBeGreaterThan(rightPoint.x);
    expect(arrows[4]).toBeGreaterThan(arrows[1]);
    engine.flyers[0].position.x += 2;
    engine.updateAirflow(true);
    expect(wake.geometry.attributes.position.array[0] - initial[0]).toBeCloseTo(2, 5);
    engine.flyers[0].userData.wrists[0].rotation.z += 0.3;
    engine.updateAirflow(true);
    expect(wake.geometry.attributes.position.array[1]).not.toBe(initial[1]);
  });

  it('keeps pooled flow buffers stable at a frozen time and caps displayed birds', () => {
    const { engine } = fixture('snow_goose', 11);
    engine.time = 4;
    engine.updateAirflow(true);
    const path = engine.airflow.children[0];
    const positions = path.geometry.attributes.position.array;
    const snapshot = Array.from(positions);
    expect(path.geometry.drawRange.count).toBe(5 * 2 * 24 * 2);
    engine.updateAirflow(true);
    expect(path.geometry.attributes.position.array).toBe(positions);
    expect(Array.from(positions)).toEqual(snapshot);
    engine.time += 0.1;
    engine.updateAirflow(true);
    expect(Array.from(positions)).not.toEqual(snapshot);
  });

  it('rotates both outside wake edges upward in agreement with the upwash cues', () => {
    const { engine } = fixture();
    engine.time = 0;
    engine.updateAirflow(true);
    const wake = engine.airflow.children.find(p => p.userData.migrationOverlay === 'wingtip-wake');
    const positions = wake.geometry.attributes.position.array;
    // Each side has 24 line segments, two XYZ endpoints per segment. The
    // left outside lies at half a turn (progress 1/4); the right outside
    // starts at cos(0)=1. Temporal rotation must raise BOTH outside edges.
    const leftOutsideY = 6 * 6 + 1;
    const rightOutsideY = 24 * 6 + 1;
    const leftBefore = positions[leftOutsideY];
    const rightBefore = positions[rightOutsideY];
    engine.time = 0.1;
    engine.updateAirflow(true);
    expect(positions[leftOutsideY]).toBeGreaterThan(leftBefore);
    expect(positions[rightOutsideY]).toBeGreaterThan(rightBefore);
  });

  it('omits hidden study-view followers from the teaching geometry', () => {
    const flock = fixture('canada_goose', 11);
    flock.engine.flyers.forEach((bird, index) => { bird.visible = index === 0; });
    flock.engine.updateAirflow(true);
    const single = fixture('canada_goose', 1);
    single.engine.updateAirflow(true);
    for (let i = 0; i < 2; i++) {
      expect(flock.engine.airflow.children[i].geometry.drawRange.count).toBe(single.engine.airflow.children[i].geometry.drawRange.count);
    }
  });

  it('requires opt-in and omits the bird-wing flow model for Monarchs', () => {
    const bird = fixture();
    bird.engine.updateAirflow(false);
    expect(bird.engine.airflow.visible).toBe(false);
    const monarch = fixture('monarch', 18);
    monarch.engine.updateAirflow(true);
    expect(monarch.engine.airflow.visible).toBe(false);
    expect(monarch.engine.flyers[0].userData.wrists).toHaveLength(0);
  });
});
