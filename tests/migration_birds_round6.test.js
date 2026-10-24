import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const THREE = require(path.join(process.cwd(), 'vendor/three-r128/three.min.js'));
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_migration.js'), 'utf8');
const first = source.indexOf('      function createMigrationWingGeometry(');
const last = source.indexOf('      function migrationFormationPositions(', first);
if (first < 0 || last <= first) throw new Error('Missing canonical scene functions');
const num = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const model = new Function('migrNum', source.slice(first, last) + '\nreturn { createMigrationFlyer, createMigrationNeckGeometry, createMigrationTernStreamerGeometry, migrationStudyDistance };')(num);
const flyer = id => model.createMigrationFlyer(THREE, { id }, 0);
function named(root, name) {
  const found = [];
  root.traverse(part => { if (part.name === name) found.push(part); });
  return found;
}
function finiteGeometry(root) {
  root.traverse(part => {
    if (!part.geometry) return;
    for (const attribute of Object.values(part.geometry.attributes)) {
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
  });
}
function ringCenter(positions, ring, radial) {
  const center = new THREE.Vector3();
  for (let spoke = 0; spoke < radial; spoke++) center.add(new THREE.Vector3().fromBufferAttribute(positions, ring * radial + spoke));
  return center.divideScalar(radial);
}

describe('Migration bird silhouettes and connected field markings', () => {
  it.each(['canada_goose', 'snow_goose', 'sandhill_crane'])('constructs an outward-facing curved tapered neck for %s', id => {
    const bird = flyer(id);
    const neck = named(bird, 'migration-bird-neck')[0];
    expect(neck.geometry.type).toBe('BufferGeometry');
    const positions = neck.geometry.attributes.position;
    const radial = neck.geometry.userData.migrationNeckRadial;
    const lastRing = neck.geometry.userData.migrationNeckRings - 1;
    expect(positions.count).toBe(152);
    expect(neck.geometry.index.count).toBe(900);
    const start = ringCenter(positions, 0, radial);
    const middle = ringCenter(positions, 7, radial);
    const end = ringCenter(positions, lastRing, radial);
    const firstRadius = new THREE.Vector3().fromBufferAttribute(positions, 0).distanceTo(start);
    const lastRadius = new THREE.Vector3().fromBufferAttribute(positions, lastRing * radial).distanceTo(end);
    expect(firstRadius).toBeGreaterThan(lastRadius * 1.9);
    const straight = end.clone().sub(start);
    const departure = middle.clone().sub(start).cross(straight).length() / straight.length();
    expect(departure).toBeGreaterThan(0.005);
    expect(neck.geometry.attributes.normal.getX(7 * radial)).toBeGreaterThan(0.85);
    const head = named(bird, 'migration-bird-head')[0];
    expect(head.position.distanceTo(end)).toBeLessThan(0.15);
    expect(head.position.z).toBeLessThan(end.z);
    finiteGeometry(bird);
  });

  it('wraps a single Canada chinstrap below the head and keeps it surface-aligned', () => {
    const bird = flyer('canada_goose');
    const head = named(bird, 'migration-bird-head')[0];
    const marks = named(bird, 'migration-goose-chinstrap');
    expect(marks).toHaveLength(1);
    const mark = marks[0];
    expect(mark.position.toArray()).toEqual(head.position.toArray());
    expect(mark.scale.toArray()).toEqual(head.scale.toArray());
    const p = mark.geometry.attributes.position;
    expect(p.count).toBe(85);
    const points = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
    expect(Math.min(...points.map(v => v.x))).toBeLessThan(-0.18);
    expect(Math.max(...points.map(v => v.x))).toBeGreaterThan(0.18);
    expect(Math.min(...points.map(v => v.y))).toBeLessThan(-0.19);
    for (const point of points) expect(point.length()).toBeCloseTo(0.204, 5);
    const bill = named(bird, 'migration-bird-bill')[0];
    expect(bill.scale.x).toBeGreaterThan(bill.scale.z * 1.9);
  });

  it('puts the red crane crown above pale cheeks and lengthens the straight bill', () => {
    const crane = flyer('sandhill_crane');
    const head = named(crane, 'migration-bird-head')[0];
    const crown = named(crane, 'migration-crane-crown')[0];
    expect(crown.material.color.getHex()).toBe(0xb91c1c);
    const crownP = crown.geometry.attributes.position;
    for (let vertex = 0; vertex < crownP.count; vertex++) expect(crownP.getY(vertex)).toBeGreaterThan(0.11);
    expect(crown.position.toArray()).toEqual(head.position.toArray());
    const cheeks = named(crane, 'migration-crane-cheek');
    expect(cheeks).toHaveLength(2);
    expect(cheeks[0].geometry).toBe(cheeks[1].geometry);
    expect(cheeks[0].material).toBe(cheeks[1].material);
    expect(cheeks[0].material.color.getHex()).toBe(0xe3e0d8);
    const bill = named(crane, 'migration-bird-bill')[0];
    expect(bill.geometry.parameters.height).toBeGreaterThan(head.geometry.parameters.radius * 2);
    expect(named(crane, 'migration-goose-chinstrap')).toHaveLength(0);
  });

  it('gives the tern two pale cambered feather streamers with a shared buffer', () => {
    const bird = flyer('arctic_tern');
    const streamers = named(bird, 'migration-tern-tail-streamer');
    expect(streamers).toHaveLength(2);
    expect(streamers[0].geometry).toBe(streamers[1].geometry);
    expect(streamers[0].material).toBe(streamers[1].material);
    expect(streamers[0].scale.x * streamers[1].scale.x).toBe(-1);
    const geometry = streamers[0].geometry;
    expect(geometry.type).toBe('BufferGeometry');
    expect(geometry.attributes.position.count).toBe(16);
    expect(geometry.index.count).toBe(54);
    expect(geometry.attributes.color.count).toBe(16);
    expect(streamers[0].material.color.getHex()).toBe(0xf3f5f8);
    expect(streamers[0].material.side).toBe(THREE.DoubleSide);
    expect(named(bird, 'migration-tail-feathers')).toHaveLength(0);
    const p = geometry.attributes.position;
    expect(p.getZ(15)).toBeCloseTo(1.62, 5);
    expect(p.getX(15)).toBeCloseTo(0.34, 5);
    expect(p.getY(1)).toBeGreaterThan(p.getY(0));
    const tipWidth = Math.abs(p.getX(14) - p.getX(12));
    const baseWidth = Math.abs(p.getX(2) - p.getX(0));
    expect(baseWidth).toBeGreaterThan(tipWidth * 4);
    finiteGeometry(bird);
  });

  it('keeps a pale tern face below a separate black cap and a thinner red bill', () => {
    const bird = flyer('arctic_tern');
    const head = named(bird, 'migration-bird-head')[0];
    const cap = named(bird, 'migration-tern-cap')[0];
    const bill = named(bird, 'migration-bird-bill')[0];
    expect(head.material.color.getHex()).toBe(0xf3f5f8);
    expect(cap.material.color.getHex()).toBe(0x111827);
    expect(cap.position.toArray()).toEqual(head.position.toArray());
    expect(bill.material.color.getHex()).toBe(0xdc2626);
    expect(bill.geometry.parameters.radius).toBeLessThan(0.05);
  });

  it.each(['canada_goose', 'snow_goose', 'sandhill_crane', 'arctic_tern', 'ruby_hummingbird', 'peregrine', 'bartailed_godwit'])('retains articulated wings, anatomy and a finite fitted envelope for %s', id => {
    const bird = flyer(id);
    expect(bird.userData.wings).toHaveLength(2);
    expect(bird.userData.wrists).toHaveLength(2);
    expect(bird.userData.primaries).toHaveLength(2);
    expect(bird.userData.primaries[0].geometry).toBe(bird.userData.primaries[1].geometry);
    expect(bird.userData.anatomyAnchors.map(a => a.id)).toEqual(['head', 'inner-wing', 'primaries', 'tail']);
    const head = named(bird, 'migration-bird-head')[0];
    const anchor = bird.userData.anatomyAnchors[0];
    expect(anchor.point.z).toBe(head.position.z);
    expect(anchor.point.y).toBeGreaterThan(head.position.y);
    expect(anchor.node).toBe(bird);
    expect(bird.userData.studyRadius).toBeGreaterThan(1);
    expect(bird.userData.studyRadius).toBeLessThan(4);
    const camera = new THREE.PerspectiveCamera(54, 390 / 700, 0.1, 100);
    expect(model.migrationStudyDistance(bird, camera, 1.6)).toBeGreaterThan(bird.userData.studyRadius);
    let extent = 0;
    bird.updateMatrixWorld(true);
    bird.traverse(part => {
      if (!part.geometry) return;
      const positions = part.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) extent = Math.max(extent, new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(part.matrixWorld).length());
    });
    expect(bird.userData.studyRadius).toBeGreaterThan(extent);
    finiteGeometry(bird);
  });

  it('keeps insect buffers and bird-only markings separate', () => {
    const monarch = flyer('monarch');
    expect(named(monarch, 'migration-bird-neck')).toHaveLength(0);
    expect(named(monarch, 'migration-bird-head')).toHaveLength(0);
    expect(named(monarch, 'migration-monarch-forewing')).toHaveLength(2);
    expect(named(monarch, 'migration-monarch-hindwing')).toHaveLength(2);
    expect(monarch.userData.anatomyAnchors).toEqual([]);
    finiteGeometry(monarch);
  });
});
