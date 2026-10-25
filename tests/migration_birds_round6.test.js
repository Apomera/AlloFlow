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

  it('joins the Canada Goose cheeks and chinstrap on one head surface', () => {
    const bird = flyer('canada_goose'), head = named(bird, 'migration-bird-head')[0];
    expect(named(bird, 'migration-goose-chinstrap')).toHaveLength(0);
    expect(head.material.vertexColors).toBe(true); expect(head.material.color.getHex()).toBe(0xffffff);
    const p = head.geometry.attributes.position, c = head.geometry.attributes.color;
    expect(p.count).toBe(425); expect(c.count).toBe(p.count);
    const pale = [], left = new Set(), right = new Set();
    for (let i = 0; i < p.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(p, i); expect(point.length()).toBeCloseTo(.2, 5);
      if (Math.min(c.getX(i), c.getY(i), c.getZ(i)) > .8) {
        pale.push(point);
        const key = [Math.abs(point.x), point.y, point.z].map(v => Math.round(v * 1e6)).join(',');
        if (point.x < -1e-6) left.add(key); else if (point.x > 1e-6) right.add(key);
      }
    }
    expect(left.size).toBeGreaterThan(20); expect(left).toEqual(right);
    expect(Math.min(...pale.map(v => v.x))).toBeLessThan(-.19); expect(Math.max(...pale.map(v => v.x))).toBeGreaterThan(.19);
    expect(Math.min(...pale.map(v => v.y))).toBeLessThan(-.19); expect(Math.max(...pale.map(v => v.y))).toBeLessThan(.03);
    const bill = named(bird, 'migration-bird-bill')[0]; expect(bill.scale.x).toBeGreaterThan(bill.scale.z * 1.9);
  });

  it('puts red crown and pale cheeks on one crane head surface and retains the long straight bill', () => {
    const crane = flyer('sandhill_crane');
    const head = named(crane, 'migration-bird-head')[0];
    expect(named(crane, 'migration-crane-crown')).toHaveLength(0);
    expect(named(crane, 'migration-crane-cheek')).toHaveLength(0);
    expect(head.material.vertexColors).toBe(true); expect(head.material.color.getHex()).toBe(0xffffff);
    const p = head.geometry.attributes.position, c = head.geometry.attributes.color;
    let crown = 0; const paleLeft = new Set(), paleRight = new Set();
    for (let i = 0; i < p.count; i++) {
      if (c.getX(i) > c.getY(i) * 2 && c.getX(i) > c.getZ(i) * 2) { crown++; expect(p.getY(i)).toBeGreaterThan(0); }
      if (Math.min(c.getX(i), c.getY(i), c.getZ(i)) > .8) {
        // SphereGeometry duplicates its seam: compare unique mirrored surface points.
        const key = [Math.abs(p.getX(i)), p.getY(i), p.getZ(i)].map(v => Math.round(v * 1e6)).join(',');
        if (p.getX(i) < -.1) paleLeft.add(key); if (p.getX(i) > .1) paleRight.add(key);
      }
    }
    expect(crown).toBeGreaterThan(40); expect(paleLeft.size).toBeGreaterThan(15); expect([...paleRight].sort()).toEqual([...paleLeft].sort());
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

  it('keeps a pale tern face and black cap on one surface with a thinner red bill', () => {
    const bird = flyer('arctic_tern');
    const head = named(bird, 'migration-bird-head')[0];
    expect(named(bird, 'migration-tern-cap')).toHaveLength(0);
    const bill = named(bird, 'migration-bird-bill')[0];
    expect(head.material.color.getHex()).toBe(0xffffff);
    expect(head.material.vertexColors).toBe(true);
    expect(head.geometry.attributes.color.count).toBe(425);
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
