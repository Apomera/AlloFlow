import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const start = source.indexOf('function brainAtlasNormalize3DPositions(');
const end = source.indexOf('function brainAtlasLoad3DDependencies(', start);
const normalize = new Function(source.slice(start, end) + '\nreturn brainAtlasNormalize3DPositions;')();

describe('Brain Atlas normalized model geometry', () => {
  it('preserves GPU-decoded positions and bounds while making CPU ray hits accurate', () => {
    const geometry = new THREE.BufferGeometry();
    const raw = new Int16Array([-32768, -32768, 16384, 32767, -32768, 16384, 0, 32767, 16384]);
    geometry.setAttribute('position', new THREE.BufferAttribute(raw, 3, true));
    const normals = new THREE.Int8BufferAttribute([0, 0, 127, 0, 0, 127, 0, 0, 127], 3, true);
    geometry.setAttribute('normal', normals);
    const decoded = Array.from(raw, value => Math.max(-1, value / 32767));
    const expectedBounds = new THREE.Box3().setFromArray(decoded);
    // GLTFLoader supplies bounds from the normalized accessor values.
    geometry.boundingBox = expectedBounds.clone();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.position.set(.25, -.1, .3);
    mesh.scale.setScalar(.7);
    mesh.updateMatrixWorld(true);
    const beforeWorldBounds = new THREE.Box3().setFromObject(mesh);

    expect(normalize(geometry, THREE)).toBe(true);
    const position = geometry.getAttribute('position');
    expect(position.normalized).toBe(false);
    expect(position.array).toBeInstanceOf(Float32Array);
    decoded.forEach((value, index) => expect(position.array[index]).toBeCloseTo(value, 7));
    expect(geometry.getAttribute('normal')).toBe(normals);
    const afterWorldBounds = new THREE.Box3().setFromObject(mesh);
    expect(afterWorldBounds.min.distanceTo(beforeWorldBounds.min)).toBeLessThan(1e-7);
    expect(afterWorldBounds.max.distanceTo(beforeWorldBounds.max)).toBeLessThan(1e-7);

    const raycaster = new THREE.Raycaster(new THREE.Vector3(.25, -.1, 3), new THREE.Vector3(0, 0, -1));
    const hits = raycaster.intersectObject(mesh, false);
    expect(hits).toHaveLength(1);
    expect(hits[0].point.z).toBeCloseTo(.3 + .7 * (16384 / 32767), 7);
    expect(afterWorldBounds.clone().expandByScalar(1e-7).containsPoint(hits[0].point)).toBe(true);
    expect(hits[0].distance).toBeLessThan(3);
    expect(normalize(geometry, THREE)).toBe(false);
  });

  it('decodes interleaved integer positions using their stride and offset', () => {
    const geometry = new THREE.BufferGeometry();
    const buffer = new THREE.InterleavedBuffer(new Int16Array([91, -32768, 0, 32767, 92, 93, 16384, -16384, 0, 94]), 5);
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(buffer, 3, 1, true));
    expect(normalize(geometry, THREE)).toBe(true);
    const values = Array.from(geometry.getAttribute('position').array);
    [-1, 0, 1, 16384 / 32767, -16384 / 32767, 0].forEach((value, index) => expect(values[index]).toBeCloseTo(value, 7));
    expect(Array.from(buffer.array)).toEqual([91, -32768, 0, 32767, 92, 93, 16384, -16384, 0, 94]);
  });

  it('handles unsigned normalized positions and leaves floating positions alone', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Uint8BufferAttribute([0, 128, 255], 3, true));
    expect(normalize(geometry, THREE)).toBe(true);
    expect(geometry.getAttribute('position').getX(0)).toBe(0);
    expect(geometry.getAttribute('position').getY(0)).toBeCloseTo(128 / 255, 7);
    expect(geometry.getAttribute('position').getZ(0)).toBe(1);
    const floating = new THREE.Float32BufferAttribute([.2, -.4, .8], 3);
    geometry.setAttribute('position', floating);
    expect(normalize(geometry, THREE)).toBe(false);
    expect(geometry.getAttribute('position')).toBe(floating);
  });

  it('picks only the half retained by the rendered clipping plane, including after flip', () => {
    const filterLine = source.split('\n').find(line => line.includes('hits = hits.filter') && line.includes('state.clipPlane.distanceToPoint'));
    const filterHits = new Function('hits', 'state', filterLine + '\nreturn hits;');
    const visible = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    const discarded = visible.clone();
    visible.position.z = .5; discarded.position.z = -.5;
    visible.updateMatrixWorld(true); discarded.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, -3), new THREE.Vector3(0, 0, 1));
    const hits = raycaster.intersectObjects([visible, discarded], false);
    expect(hits[0].object).toBe(discarded);
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const retained = filterHits(hits, { clipPlane, sliceAxis: 'axial' });
    expect(retained.length).toBeGreaterThan(0);
    expect(retained.every(hit => hit.object === visible)).toBe(true);
    // The renderer negates view-space positions before testing dot > constant.
    expect(retained.every(hit => hit.point.clone().negate().dot(clipPlane.normal) <= clipPlane.constant)).toBe(true);
    clipPlane.negate();
    expect(filterHits(hits, { clipPlane, sliceAxis: 'axial' }).every(hit => hit.object === discarded)).toBe(true);
  });
});
