import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  if (first < 0 || last <= first) throw new Error('Missing canonical scene section: ' + start);
  return source.slice(first, last);
}
const num = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, createMigrationAnatomyMarkers, migrationStudyDistance };')(num);

const createSpeedVectors = new Function(section('      function createMigrationSpeedVectors(', '      function initMigrationFlightScene(') + '\nreturn createMigrationSpeedVectors;')();

function fixture(id = 'canada_goose', count = 1) {
  const scene = new THREE.Scene();
  const flockRoot = new THREE.Group();
  flockRoot.position.y = 1.2;
  scene.add(flockRoot);
  const camera = new THREE.PerspectiveCamera(54, 804 / 678, 0.1, 900);
  const engine = { speciesId: id, time: 0, flyers: [], wingStepSerial: 0, wingStepPhase: 0, camera, host: { clientHeight: 678 } };
  for (let index = 0; index < count; index++) {
    const bird = model.createMigrationFlyer(THREE, { id }, index);
    bird.position.set(index * 1.65, 0.5 - index * 0.08, -5 + index * 1.9);
    bird.userData.baseY = bird.position.y;
    flockRoot.add(bird);
    engine.flyers.push(bird);
  }
  new Function('THREE', 'scene', 'flockRoot', 'engine', 'migrNum', 'createMigrationAnatomyMarkers', 'createMigrationSpeedVectors', section('          var WAKE_BIRDS = 5;', '          engine.rebuildFlock ='))(THREE, scene, flockRoot, engine, num, model.createMigrationAnatomyMarkers, createSpeedVectors);
  return { scene, flockRoot, camera, engine };
}

function lookAtBird(camera, bird, yaw, pitch, zoom = 1) {
  const target = bird.getWorldPosition(new THREE.Vector3());
  const distance = model.migrationStudyDistance(bird, camera, zoom);
  const heading = yaw * Math.PI / 180, elevation = pitch * Math.PI / 180;
  camera.position.set(Math.sin(heading) * Math.cos(elevation), Math.sin(elevation), Math.cos(heading) * Math.cos(elevation)).multiplyScalar(distance).add(target);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return distance;
}

describe('Migration species framing and identified anatomy', () => {
  it('fits all eight species and the animated feather envelope at default zoom on wide and narrow screens', () => {
    const species = ['canada_goose', 'snow_goose', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'sandhill_crane', 'bartailed_godwit', 'monarch'];
    for (const id of species) {
      const bird = model.createMigrationFlyer(THREE, { id }, 0);
      expect(Number.isFinite(bird.userData.studyRadius)).toBe(true);
      for (const aspect of [2.1, 390 / 360, 0.65]) {
        const camera = new THREE.PerspectiveCamera(54, aspect, 0.1, 900);
        for (const [yaw, pitch] of [[0, 15], [35, 15], [90, 10], [180, 10], [0, 60], [-90, -10]]) {
          lookAtBird(camera, bird, yaw, pitch);
          for (const phase of [-Math.PI / 2, 0, Math.PI / 2]) {
            bird.userData.wings[0].rotation.z = Math.sin(phase) * bird.userData.flapAmount;
            bird.userData.wings[1].rotation.z = -Math.sin(phase) * bird.userData.flapAmount;
            for (let joint = 0; joint < bird.userData.wrists.length; joint++) {
              const side = joint === 0 ? -1 : 1;
              bird.userData.wrists[joint].rotation.z = side * (0.08 + Math.sin(phase - 0.65) * 0.15);
              bird.userData.wrists[joint].rotation.y = side * (0.06 + Math.max(0, Math.sin(phase)) * 0.13);
            }
            bird.updateMatrixWorld(true);
            const projectedBounds = { maxX: 0, maxY: 0, minZ: Infinity, maxZ: -Infinity, vertices: 0 };
            const projected = new THREE.Vector3();
            bird.traverse(part => {
              const positions = part.geometry?.attributes?.position;
              if (!positions) return;
              for (let vertex = 0; vertex < positions.count; vertex++) {
                projected.fromBufferAttribute(positions, vertex).applyMatrix4(part.matrixWorld).project(camera);
                projectedBounds.maxX = Math.max(projectedBounds.maxX, Math.abs(projected.x));
                projectedBounds.maxY = Math.max(projectedBounds.maxY, Math.abs(projected.y));
                projectedBounds.minZ = Math.min(projectedBounds.minZ, projected.z);
                projectedBounds.maxZ = Math.max(projectedBounds.maxZ, projected.z);
                projectedBounds.vertices++;
              }
            });
            expect(projectedBounds.vertices).toBeGreaterThan(0);
            expect(projectedBounds.maxX, id + ' horizontal fit').toBeLessThan(1);
            expect(projectedBounds.maxY, id + ' vertical fit').toBeLessThan(1);
            expect(projectedBounds.minZ).toBeGreaterThan(-1);
            expect(projectedBounds.maxZ).toBeLessThan(1);
          }
        }
      }
    }
  });

  it('adjusts for species size and viewport while preserving bounded deliberate zoom', () => {
    const bird = model.createMigrationFlyer(THREE, { id: 'sandhill_crane' }, 0);
    const small = model.createMigrationFlyer(THREE, { id: 'ruby_hummingbird' }, 0);
    const camera = new THREE.PerspectiveCamera(54, 2, 0.1, 900);
    const wide = model.migrationStudyDistance(bird, camera, 1);
    expect(model.migrationStudyDistance(small, camera, 1)).toBeLessThan(wide);
    camera.aspect = 0.65;
    expect(model.migrationStudyDistance(bird, camera, 1)).toBeGreaterThan(wide);
    expect(model.migrationStudyDistance(bird, camera, -5)).toBeCloseTo(model.migrationStudyDistance(bird, camera, 0.65), 8);
    expect(model.migrationStudyDistance(bird, camera, 99)).toBeCloseTo(model.migrationStudyDistance(bird, camera, 1.6), 8);
    expect(Number.isFinite(model.migrationStudyDistance(null, null, NaN))).toBe(true);
  });

  it('uses four camera-facing, dark-backed numbered markers that match the legend and follow the selected bird', () => {
    const { engine, camera } = fixture('canada_goose', 10);
    const selected = engine.flyers[9];
    lookAtBird(camera, selected, 35, 15);
    engine.updateAnatomy(true, 9);
    const root = engine.anatomyMarkers;
    expect(root.name).toBe('migration-anatomy-markers');
    expect(root.visible).toBe(true);
    expect(root.children.map(marker => marker.userData.markerNumber)).toEqual([1, 2, 3, 4]);
    expect(root.children.map(marker => marker.userData.anatomyId)).toEqual(['head', 'inner-wing', 'primaries', 'tail']);
    expect(root.children.map(marker => marker.children[0].material.color.getHex())).toEqual([0xfbbf24, 0x67e8f9, 0x86efac, 0xf9a8d4]);
    const pooledGeometry = root.children.map(marker => marker.children.map(part => part.geometry));
    const before = root.children.map(marker => marker.position.clone());
    for (const marker of root.children) {
      expect(marker.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0, 6);
      expect(marker.children[1].material.color.getHex()).toBe(0x082437);
      expect(marker.children[2].geometry.index.count).toBeGreaterThan(12);
      const disk = marker.children[0];
      disk.updateWorldMatrix(true, false);
      const viewHeight = engine.host.clientHeight, viewWidth = engine.host.clientWidth || viewHeight * camera.aspect;
      const projectPixel = world => {
        const point = world.clone().project(camera);
        return new THREE.Vector2((point.x + 1) * viewWidth / 2, (1 - point.y) * viewHeight / 2);
      };
      const center = projectPixel(new THREE.Vector3().applyMatrix4(disk.matrixWorld));
      for (let vertex = 1; vertex < disk.geometry.attributes.position.count; vertex++) {
        const rendered = projectPixel(new THREE.Vector3().fromBufferAttribute(disk.geometry.attributes.position, vertex).applyMatrix4(disk.matrixWorld));
        expect(rendered.distanceTo(center)).toBeCloseTo(13, 4);
      }
      const screen = marker.position.clone().project(camera);
      expect(Math.abs(screen.x)).toBeLessThan(0.95);
      expect(Math.abs(screen.y)).toBeLessThan(0.95);
    }
    selected.position.x += 2;
    lookAtBird(camera, selected, -90, 10);
    engine.updateAnatomy(true, 9);
    expect(root.children[0].position.distanceTo(before[0])).toBeGreaterThan(1);
    root.children.forEach((marker, index) => {
      expect(marker.children.map(part => part.geometry)).toEqual(pooledGeometry[index]);
      expect(marker.quaternion.angleTo(camera.quaternion)).toBeCloseTo(0, 6);
    });
    expect(engine.anatomyOverlay.geometry.drawRange.count).toBe(130);
  });

  it('keeps phone marker centers clear of the scene controls and route overlay', () => {
    const { engine, camera } = fixture('arctic_tern');
    engine.host.clientHeight = 390;
    camera.aspect = 1;
    lookAtBird(camera, engine.flyers[0], 0, 60);
    engine.updateAnatomy(true, 0);
    for (const marker of engine.anatomyMarkers.children) {
      const projected = marker.position.clone().project(camera);
      const pixelY = (1 - projected.y) * 390 / 2;
      expect(pixelY).toBeGreaterThanOrEqual(127.99);
      expect(pixelY).toBeLessThanOrEqual(302.01);
    }
  });

  it('hides both anatomy representations on opt-out and for Monarchs', () => {
    const bird = fixture();
    bird.engine.updateAnatomy(true, 0);
    bird.engine.updateAnatomy(false, 0);
    expect(bird.engine.anatomyMarkers.visible).toBe(false);
    expect(bird.engine.anatomyOverlay.visible).toBe(false);
    const monarch = fixture('monarch');
    monarch.engine.updateAnatomy(true, 0);
    expect(monarch.engine.anatomyMarkers.visible).toBe(false);
    expect(monarch.engine.anatomyOverlay.visible).toBe(false);
  });

  it('highlights exactly the selected numbered region while retaining context and pooled geometry', () => {
    const { engine, camera } = fixture();
    lookAtBird(camera, engine.flyers[0], 35, 15);
    const geometry = engine.anatomyMarkers.children.map(marker => marker.children[3].geometry);
    const ids = ['head', 'inner-wing', 'primaries', 'tail'];
    for (const [index, id] of ids.entries()) {
      engine.updateAnatomy(true, 0, id);
      expect(engine.anatomyMarkers.userData.selectedAnatomyId).toBe(id);
      expect(engine.anatomyMarkers.children.map(marker => marker.userData.focused)).toEqual(ids.map((_, i) => i === index));
      expect(engine.anatomyMarkers.children.map(marker => marker.children[3].visible)).toEqual(ids.map((_, i) => i === index));
      expect(engine.anatomyMarkers.children.every(marker => marker.visible)).toBe(true);
      expect(engine.anatomyOverlay.geometry.drawRange.count).toBe(130);
      expect(engine.anatomyMarkers.children.map(marker => marker.children[3].geometry)).toEqual(geometry);
    }
    engine.updateAnatomy(false, 0, 'tail');
    expect(engine.anatomyMarkers.visible).toBe(false);
    expect(engine.anatomyMarkers.userData.selectedAnatomyId).toBe('');
  });

  it('keeps numbered marker centers inside a narrow viewport at maximum deliberate zoom', () => {
    const { engine, camera } = fixture('arctic_tern');
    Object.assign(engine.host, { clientWidth: 320, clientHeight: 390 });
    camera.aspect = 320 / 390;
    for (const [yaw, pitch] of [[180, 10], [90, 10], [0, 60]]) {
      lookAtBird(camera, engine.flyers[0], yaw, pitch, 1.6);
      engine.updateAnatomy(true, 0, 'primaries');
      for (const marker of engine.anatomyMarkers.children) {
        const point = marker.position.clone().project(camera);
        const pixelX = (point.x + 1) * 320 / 2;
        expect(pixelX).toBeGreaterThanOrEqual(27.99);
        expect(pixelX).toBeLessThanOrEqual(292.01);
      }
    }
  });

  it('isolates Study against the sky then restores landscape and moving corridor objects', () => {
    const { engine } = fixture();
    engine.landTiles = [{ group: new THREE.Group() }, { group: new THREE.Group() }];
    engine.movers = [new THREE.Group(), new THREE.Group()];
    engine.streaks = new THREE.Group();
    engine.updateAirflow(true);
    engine.updateStudyBackdrop(true);
    expect(engine.landTiles.every(tile => !tile.group.visible)).toBe(true);
    expect(engine.movers.every(mover => !mover.visible)).toBe(true);
    expect(engine.streaks.visible).toBe(false);
    expect(engine.airflow.visible).toBe(true);
    engine.updateStudyBackdrop(false);
    expect(engine.landTiles.every(tile => tile.group.visible)).toBe(true);
    expect(engine.movers.every(mover => mover.visible)).toBe(true);
    expect(engine.streaks.visible).toBe(true);
  });

  it('honors rapid queued wing steps and serial wrapping without moving the bird body', () => {
    const frame = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
    const burst = fixture().engine;
    const sequential = fixture().engine;
    const live = { flightCamera: 'study', flightStudyBird: 0, flightWingStep: 3 };
    frame(burst, live, num);
    for (let step = 1; step <= 3; step++) frame(sequential, { ...live, flightWingStep: step }, num);
    expect(burst.wingStepPhase).toBeCloseTo(3 * Math.PI / 4, 8);
    expect(burst.flyers[0].userData.wings[0].rotation.z).toBeCloseTo(sequential.flyers[0].userData.wings[0].rotation.z, 8);
    expect(burst.time).toBe(0);
    expect(burst.flyers[0].position.y).toBe(sequential.flyers[0].position.y);
    burst.wingStepSerial = 1000000;
    const beforeWrap = burst.wingStepPhase;
    frame(burst, { ...live, flightWingStep: 0 }, num);
    expect(burst.wingStepPhase).toBeCloseTo((beforeWrap + Math.PI / 4) % (Math.PI * 2), 8);
  });
});
