import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8');
const helperStart = source.indexOf('function createCLReefFootprint(');
const helperEnd = source.indexOf('function createCLHuntAnimal(', helperStart);
const settleStart = source.indexOf('function settleReefCorals(');
const settleEnd = source.indexOf('function updateGround(', settleStart);
if (helperStart < 0 || helperEnd <= helperStart || settleStart < 0 || settleEnd <= settleStart) throw new Error('Could not find production reef placement functions');
const helpers = source.slice(helperStart, helperEnd);
const build = new Function('Math', helpers + ';return { footprint:createCLReefFootprint, site:findCLReefSite };');
const forbiddenRandom = Object.assign(Object.create(Math), { random() { throw new Error('Placement consumed the dive RNG'); } });
const { footprint, site } = build(forbiddenRandom);
const small = { minX: -.4, maxX: .4, minY: -.5, maxY: .5, minZ: -.3, maxZ: .3 };
const overlaps = (p, f, b) => p.x + f.minX < b.maxX && p.x + f.maxX > b.minX && p.z + f.minZ < b.maxZ && p.z + f.maxZ > b.minZ;

function mesh(width = 1, height = 2, depth = 1) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial());
}
function settlement(rocks, corals) {
  const terrain = (x, z) => .025 * x - .01 * z;
  for (const object of rocks.concat(corals)) object.userData.reefFootprint = footprint(THREE, object);
  for (const coral of corals) Object.assign(coral.userData, { groundOffset: -coral.userData.reefFootprint.minY, coralHex: 0xc94e6d, substrateRadius: 1.1, substrate: 'coral' });
  const settle = new Function('Math', 'rocks', 'corals', 'terrainHeight', helpers + source.slice(settleStart, settleEnd) + ';return settleReefCorals;')(forbiddenRandom, rocks, corals, terrain);
  return { settle, terrain };
}

describe('Cephalopod reef placement', () => {
  it('measures actual rotated and scaled vertices without translating or mutating the mesh', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 3], 3));
    const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    object.rotation.set(.4, .7, -.3); object.scale.set(1.4, .6, 1.8); object.position.set(300, -20, 500);
    const before = { position: object.position.toArray(), rotation: object.rotation.toArray(), vertices: Array.from(geometry.attributes.position.array) };
    object.updateMatrixWorld(true);
    const points = [];
    for (let i = 0; i < geometry.attributes.position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(object.matrixWorld).sub(object.position));
    const actual = footprint(THREE, object);
    for (const axis of ['x', 'y', 'z']) {
      expect(actual['min' + axis.toUpperCase()]).toBeCloseTo(Math.min(...points.map(p => p[axis])), 10);
      expect(actual['max' + axis.toUpperCase()]).toBeCloseTo(Math.max(...points.map(p => p[axis])), 10);
    }
    expect({ position: object.position.toArray(), rotation: object.rotation.toArray(), vertices: Array.from(geometry.attributes.position.array) }).toEqual(before);
    geometry.computeBoundingBox();
    const overestimate = geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(), object.quaternion, object.scale));
    expect(overestimate.getSize(new THREE.Vector3()).length()).toBeGreaterThan(new THREE.Vector3(actual.maxX-actual.minX, actual.maxY-actual.minY, actual.maxZ-actual.minZ).length());
  });

  it('keeps a clear site stable and relocates a blocked one deterministically without consuming RNG', () => {
    const desired = { x: 3, z: -2 }, options = { center: { x: 0, z: 0 }, maxDistance: 20, index: 4 };
    const blockers = [{ minX: 1, maxX: 5, minZ: -4, maxZ: 0 }];
    expect(site(desired, small, [], options)).toEqual(desired);
    const input = JSON.stringify({ desired, blockers, small, options });
    const first = site(desired, small, blockers, options);
    expect(first).not.toBeNull(); expect(first).not.toEqual(desired);
    expect(overlaps(first, small, blockers[0])).toBe(false);
    for (let repeat = 0; repeat < 5; repeat++) expect(site(desired, small, blockers, options)).toEqual(first);
    expect(site(first, small, blockers, options)).toEqual(first);
    expect(JSON.stringify({ desired, blockers, small, options })).toBe(input);
  });

  it('keeps resolved recycling sites inside the allowed annulus even when the original candidate is invalid', () => {
    const center = { x: 230, z: -160 }, options = { center, minDistance: 55, maxDistance: 95, index: 9 };
    const blockers = [{ minX: 220, maxX: 244, minZ: -110, maxZ: -90 }];
    for (const desired of [{ x: 230, z: -160 }, { x: 230, z: -100 }, { x: 430, z: -160 }]) {
      const placed = site(desired, small, blockers, options);
      expect(placed).not.toBeNull();
      const radius = Math.hypot(placed.x-center.x, placed.z-center.z);
      expect(radius).toBeGreaterThanOrEqual(55); expect(radius).toBeLessThanOrEqual(95);
      expect(overlaps(placed, small, blockers[0])).toBe(false);
    }
  });

  it('uses a bounded area fallback when the nearby search is blocked and returns null when everything is blocked', () => {
    const options = { center: { x: 0, z: 0 }, maxDistance: 20, index: 1 };
    const centralBlock = { minX: -13, maxX: 13, minZ: -13, maxZ: 13 };
    const placed = site({ x: 0, z: 0 }, small, [centralBlock], options);
    expect(placed).not.toBeNull(); expect(overlaps(placed, small, centralBlock)).toBe(false);
    expect(Math.hypot(placed.x, placed.z)).toBeGreaterThan(12); expect(Math.hypot(placed.x, placed.z)).toBeLessThanOrEqual(20);
    let checks = 0;
    const fullBlock = { get minX() { checks++; return -100; }, maxX: 100, minZ: -100, maxZ: 100 };
    expect(site({ x: 0, z: 0 }, small, [fullBlock], options)).toBeNull();
    expect(checks).toBeGreaterThan(0); expect(checks).toBeLessThan(10000);
  });

  it('moves an obstructed surviving colony without replacing resources or metadata and grounds it immediately', () => {
    const rock = mesh(4, 3, 4), coral = mesh(1, 2, .8), neighbor = mesh(1.3, 1.5, .9);
    rock.position.set(-8, 0, 8); coral.position.set(-8, 1, 8); neighbor.position.set(-14, 1, 8);
    coral.rotation.set(0, .45, .14);
    const { settle, terrain } = settlement([rock], [coral, neighbor]);
    const owned = { geometry: coral.geometry, material: coral.material, metadata: { hex: coral.userData.coralHex, radius: coral.userData.substrateRadius, offset: coral.userData.groundOffset } };
    let disposed = false; coral.geometry.addEventListener('dispose', () => { disposed = true; }); coral.material.addEventListener('dispose', () => { disposed = true; });
    settle({ x: 0, z: 0 }, []);
    expect(coral.visible && coral.userData.reefPlacementValid).toBe(true);
    expect(Math.hypot(coral.position.x+8, coral.position.z-8)).toBeGreaterThan(.1);
    expect(coral.position.y + coral.userData.reefFootprint.minY).toBeCloseTo(terrain(coral.position.x, coral.position.z), 10);
    expect(coral.geometry).toBe(owned.geometry); expect(coral.material).toBe(owned.material); expect(disposed).toBe(false);
    expect({ hex: coral.userData.coralHex, radius: coral.userData.substrateRadius, offset: coral.userData.groundOffset }).toEqual(owned.metadata);
    const stable = [coral.position.toArray(), neighbor.position.toArray()];
    settle({ x: 0, z: 0 }, []);
    expect([coral.position.toArray(), neighbor.position.toArray()]).toEqual(stable);
  });

  it('keeps a fully blocked colony pooled but inactive and restores it when space becomes available', () => {
    const rock = mesh(400, 3, 400), coral = mesh();
    coral.position.set(-8, 1, 8);
    const { settle } = settlement([rock], [coral]);
    const geometry = coral.geometry, material = coral.material;
    settle(null, []);
    expect(coral.visible).toBe(false); expect(coral.userData.reefPlacementValid).toBe(false);
    expect(coral.geometry).toBe(geometry); expect(coral.material).toBe(material);
    rock.position.set(500, 0, 500);
    settle(null, []);
    expect(coral.visible).toBe(true); expect(coral.userData.reefPlacementValid).toBe(true);
    expect(coral.geometry).toBe(geometry); expect(coral.material).toBe(material);
  });
});
