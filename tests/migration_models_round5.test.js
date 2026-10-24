import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing model section: ' + start);
  return source.slice(a, b);
}
const num = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const model = new Function('migrNum', section('      function createMigrationWingGeometry(', '      function migrationFormationPositions(') + '\nreturn { createMigrationFlyer, createMigrationMonarchWingGeometry, migrationStudyDistance };')(num);
const frame = new Function('engineNow', 'live', 'migrNum', section('          var studyBirdIndex =', '          engineNow.flockRoot.position.x'));
const dispose = new Function(section('      function disposeMigrationObject(', '      function destroyMigrationFlightEngine(') + '\nreturn disposeMigrationObject;')();
const partsNamed = (flyer, name) => { const found = []; flyer.traverse(part => { if (part.name === name) found.push(part); }); return found; };
const worldVertex = (part, index) => new THREE.Vector3().fromBufferAttribute(part.geometry.attributes.position, index).applyMatrix4(part.matrixWorld);

describe('Migration Monarch segmented butterfly and patterned wing geometry', () => {
  it.each(['fore', 'hind'])('builds finite indexed %s membranes with two-sided cells and pale margin spots', lobe => {
    const geometry = model.createMigrationMonarchWingGeometry(THREE, lobe);
    const position = geometry.attributes.position, colors = geometry.attributes.color;
    expect(position.count).toBeGreaterThan(100);
    expect(position.count).toBeLessThan(650);
    expect(colors.count).toBe(position.count);
    expect(geometry.index.count % 3).toBe(0);
    expect(Math.max(...geometry.index.array)).toBeLessThan(position.count);
    for (const attribute of Object.values(geometry.attributes)) expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    const uniqueColors = new Set(Array.from({ length: colors.count }, (_, index) => [colors.getX(index), colors.getY(index), colors.getZ(index)].join(',')));
    expect(uniqueColors.size).toBe(5);
    expect(geometry.userData.monarchCellCount).toBe(14);
    expect(geometry.userData.monarchSpotCount).toBe(lobe === 'fore' ? 13 : 11);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox.min.x).toBeGreaterThan(0);
    expect(geometry.boundingBox.max.x).toBeLessThan(0.9);
    expect(geometry.boundingBox.min.z).toBeGreaterThan(-0.7);
    expect(geometry.boundingBox.max.z).toBeLessThan(0.7);
    // Every colored panel and dot has a second face at the same x/z.
    const paintLayers = new Map();
    for (let index = 0; index < colors.count; index++) {
      if (Math.max(colors.getX(index), colors.getY(index), colors.getZ(index)) < 0.2) continue;
      const key = [position.getX(index), position.getZ(index), colors.getX(index), colors.getY(index), colors.getZ(index)].join(',');
      const values = paintLayers.get(key) || [];
      values.push(position.getY(index)); paintLayers.set(key, values);
    }
    for (const values of paintLayers.values()) {
      expect(values.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.007);
    }
  });

  it('makes four distinguishable lobes with mirrored pooled buffers and one material', () => {
    const flyer = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0);
    expect(flyer.userData.wings).toHaveLength(2);
    expect(flyer.userData.wrists).toEqual([]);
    expect(flyer.userData.primaries).toEqual([]);
    expect(flyer.userData.anatomyAnchors).toEqual([]);
    flyer.updateMatrixWorld(true);
    for (const lobe of ['fore', 'hind']) {
      const wings = partsNamed(flyer, 'migration-monarch-' + lobe + 'wing');
      expect(wings).toHaveLength(2);
      expect(wings[0].parent).toBe(flyer.userData.wings[0]);
      expect(wings[1].parent).toBe(flyer.userData.wings[1]);
      expect(wings[0].geometry).toBe(wings[1].geometry);
      expect(wings[0].material).toBe(wings[1].material);
      expect(wings[0].material.vertexColors).toBe(true);
      expect(wings[0].material.side).toBe(THREE.DoubleSide);
      expect(wings.map(wing => wing.userData.monarchSide)).toEqual([-1, 1]);
      const count = wings[0].geometry.attributes.position.count;
      for (let vertex = 0; vertex < count; vertex += 11) {
        const left = worldVertex(wings[0], vertex), right = worldVertex(wings[1], vertex);
        expect(left.x).toBeCloseTo(-right.x, 7);
        expect(left.y).toBeCloseTo(right.y, 7);
        expect(left.z).toBeCloseTo(right.z, 7);
      }
    }
    expect(partsNamed(flyer, 'migration-monarch-forewing')[0].geometry).not.toBe(partsNamed(flyer, 'migration-monarch-hindwing')[0].geometry);
  });

  it('replaces the tube with rounded head, thorax, tapered abdomen, clubbed antennae and six legs', () => {
    const flyer = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0);
    const head = flyer.getObjectByName('migration-monarch-head');
    const thorax = flyer.getObjectByName('migration-monarch-thorax');
    const abdomen = flyer.getObjectByName('migration-monarch-abdomen');
    expect(head.geometry.type).toBe('SphereGeometry');
    expect(thorax.geometry.type).toBe('SphereGeometry');
    expect(abdomen.geometry.type).toBe('SphereGeometry');
    expect(head.position.z).toBeLessThan(thorax.position.z);
    expect(thorax.position.z).toBeLessThan(abdomen.position.z);
    expect(abdomen.scale.z).toBeGreaterThan(abdomen.scale.x * 2);
    const antennae = flyer.getObjectByName('migration-monarch-antennae');
    expect(antennae.children).toHaveLength(4);
    expect(antennae.children[0].geometry).toBe(antennae.children[2].geometry);
    expect(antennae.children[0].geometry.type).toBe('TubeGeometry');
    expect(antennae.children[0].scale.x).toBe(-antennae.children[2].scale.x);
    expect(antennae.children[1].position.x).toBe(-antennae.children[3].position.x);
    expect(flyer.getObjectByName('migration-monarch-body-spots').geometry.attributes.position.count).toBe(84);
    expect(flyer.getObjectByName('migration-monarch-legs').geometry.attributes.position.count).toBe(24);
  });

  it('articulates both lobes together through paused steps without reallocating or moving the body', () => {
    const flyer = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0);
    flyer.userData.baseY = 0;
    const engine = { time: 0, flyers: [flyer], wingStepSerial: 0, wingStepPhase: 0 };
    const live = { flightCamera: 'study', flightStudyBird: 0, flightWingStep: 0 };
    frame(engine, live, num);
    flyer.updateMatrixWorld(true);
    const lobes = partsNamed(flyer, 'migration-monarch-forewing').concat(partsNamed(flyer, 'migration-monarch-hindwing'));
    const refs = lobes.map(lobe => ({ geometry: lobe.geometry, array: lobe.geometry.attributes.position.array, values: Array.from(lobe.geometry.attributes.position.array) }));
    const before = lobes.map(lobe => worldVertex(lobe, 3));
    const bodyBefore = flyer.getObjectByName('migration-monarch-thorax').getWorldPosition(new THREE.Vector3());
    for (let step = 1; step <= 8; step++) {
      live.flightWingStep = step;
      frame(engine, live, num);
      flyer.updateMatrixWorld(true);
      for (let index = 0; index < lobes.length; index++) {
        expect(lobes[index].geometry).toBe(refs[index].geometry);
        expect(lobes[index].geometry.attributes.position.array).toBe(refs[index].array);
        expect(Array.from(refs[index].array)).toEqual(refs[index].values);
        if (step === 1) expect(worldVertex(lobes[index], 3).distanceTo(before[index])).toBeGreaterThan(0.005);
      }
      expect(flyer.getObjectByName('migration-monarch-thorax').getWorldPosition(new THREE.Vector3()).distanceTo(bodyBefore)).toBe(0);
      expect(flyer.userData.wings[0].rotation.z).toBe(-flyer.userData.wings[1].rotation.z);
      flyer.traverse(part => {
        const positions = part.geometry && part.geometry.attributes.position;
        if (positions) for (let vertex = 0; vertex < positions.count; vertex++) expect(worldVertex(part, vertex).length()).toBeLessThanOrEqual(flyer.userData.studyRadius);
      });
      expect(engine.time).toBe(0);
    }
  });

  it('keeps resources bounded and releases every pooled geometry and material on disposal', () => {
    const flyer = model.createMigrationFlyer(THREE, { id: 'monarch' }, 0);
    const geometries = new Set(), materials = new Set();
    let drawableCount = 0;
    flyer.traverse(part => { if (part.geometry) { geometries.add(part.geometry); drawableCount++; } if (part.material) materials.add(part.material); });
    expect(drawableCount).toBeLessThanOrEqual(14);
    expect(geometries.size).toBeLessThanOrEqual(10);
    expect(materials.size).toBe(4);
    const disposedGeometries = new Set(), disposedMaterials = new Set();
    for (const geometry of geometries) geometry.addEventListener('dispose', () => disposedGeometries.add(geometry));
    for (const material of materials) material.addEventListener('dispose', () => disposedMaterials.add(material));
    dispose(flyer);
    expect(disposedGeometries).toEqual(geometries);
    expect(disposedMaterials).toEqual(materials);
  });
});
