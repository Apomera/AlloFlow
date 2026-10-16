import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing native long-bone section: ' + start);
  return source.slice(a, b);
}
const helperStart = source.indexOf('  function dinoLongBoneGeometry(');
const helperEnd = source.indexOf('\n  function ', helperStart + 1);
if (helperStart < 0 || helperEnd < helperStart) throw new Error('Missing long-bone geometry helper');
const geometryFor = new Function(source.slice(helperStart, helperEnd) + '\nreturn dinoLongBoneGeometry;')();
const callerCode = section('            function addLongBone(', '            function addLimbJoint(');
const fallbackCode = section('            function addBone(', '            function addTaperedBoneSegment(');
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const at = (attribute, index) => vec().fromBufferAttribute(attribute, index);
const ringCenter = (g, row) => {
  const result = vec(), sides = g.userData.dinoLongBone.radialSegments;
  for (let i = 0; i < sides; i++) result.add(at(g.attributes.position, row * sides + i));
  return result.divideScalar(sides);
};
function make({ scale = 1, bow = .12, direction = [0, 1, 0], rotation } = {}) {
  const start = vec(.2, -.4, .1), end = start.clone().add(vec(...direction).normalize().multiplyScalar(2));
  const offset = vec(.12, 0, .035).multiplyScalar(bow / .12);
  const midpoint = start.clone().add(end).multiplyScalar(.5).add(offset);
  const points = [start, end, midpoint].map(p => p.multiplyScalar(scale));
  if (rotation) points.forEach(p => p.applyQuaternion(rotation));
  const radii = [.13, .076, .118].map(r => r * scale);
  return { points, radii, geometry: geometryFor(THREE, ...points, ...radii), scale };
}
function assertGeometry({ geometry: g, points: [start, end, midpoint], radii, scale }) {
  const { lengthSegments: rows, radialSegments: sides } = g.userData.dinoLongBone;
  const positions = g.attributes.position, normals = g.attributes.normal, index = g.index.array;
  const tolerance = scale * 8e-7;
  expect(rows).toBe(12); expect(sides).toBe(16);
  expect(positions.count).toBe((rows + 1) * sides + 2 * (sides + 1));
  expect(index.length / 3).toBe(rows * sides * 2 + sides * 2);
  for (let i = 0; i < positions.count; i++) {
    const p = at(positions, i), n = at(normals, i);
    expect(p.toArray().every(Number.isFinite)).toBe(true);
    expect(n.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(n.length() - 1)).toBeLessThan(2e-6);
    expect(g.boundingBox.containsPoint(p)).toBe(true);
    expect(p.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + tolerance);
  }
  const centers = [], widths = [];
  for (let row = 0; row <= rows; row++) {
    const center = ringCenter(g, row); centers.push(center);
    const t = row / rows;
    // Three-point quadratic interpolation, independent of the construction's bow form.
    const expected = start.clone().multiplyScalar((1 - t) * (1 - 2 * t))
      .addScaledVector(midpoint, 4 * t * (1 - t)).addScaledVector(end, t * (2 * t - 1));
    expect(center.distanceTo(expected)).toBeLessThan(tolerance);
    const width = at(positions, row * sides).distanceTo(center); widths.push(width);
    for (let column = 0; column < sides; column++) {
      const i = row * sides + column, radial = at(positions, i).sub(center);
      expect(Math.abs(radial.length() - width)).toBeLessThan(tolerance);
      expect(at(normals, i).dot(radial.normalize())).toBeGreaterThan(.90);
    }
  }
  [0, rows / 2, rows].forEach((row, i) => {
    expect(centers[row].distanceTo([start, midpoint, end][i])).toBeLessThan(tolerance);
    expect(Math.abs(widths[row] - radii[i])).toBeLessThan(tolerance);
  });
  for (let row = 1; row <= rows; row++) {
    if (row <= rows / 2) expect(widths[row]).toBeLessThan(widths[row - 1]);
    else expect(widths[row]).toBeGreaterThan(widths[row - 1]);
  }
  const edges = new Map(), vertexKeys = Array.from({ length: positions.count }, (_, i) =>
    at(positions, i).toArray().map(v => Math.round(v / tolerance)).join(','));
  let volume = 0;
  for (let i = 0; i < index.length; i += 3) {
    const ids = Array.from(index.slice(i, i + 3)), a = at(positions, ids[0]), b = at(positions, ids[1]), c = at(positions, ids[2]);
    const face = b.clone().sub(a).cross(c.clone().sub(a));
    expect(face.length()).toBeGreaterThan(scale * scale * 1e-7);
    expect(face.dot(at(normals, ids[0]).add(at(normals, ids[1])).add(at(normals, ids[2])))).toBeGreaterThan(0);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let j = 0; j < 3; j++) {
      const from = vertexKeys[ids[j]], to = vertexKeys[ids[(j + 1) % 3]], key = [from, to].sort().join('|');
      const edge = edges.get(key) || { count: 0, direction: 0 };
      edge.count++; edge.direction += from < to ? 1 : -1; edges.set(key, edge);
    }
    if (i < rows * sides * 6) {
      const rings = ids.map(id => Math.floor(id / sides));
      expect(Math.max(...rings) - Math.min(...rings)).toBe(1);
    }
  }
  expect(volume).toBeGreaterThan(0);
  for (const edge of edges.values()) expect(edge).toEqual({ count: 2, direction: 0 });
  // Cap normals are independent from the sidewall; there is no midpoint disc.
  for (const cap of [0, 1]) {
    const centerIndex = (rows + 1) * sides + cap * (sides + 1), n = at(normals, centerIndex);
    for (let i = 1; i <= sides; i++) expect(at(normals, centerIndex + i).distanceTo(n)).toBeLessThan(2e-6);
    const outward = centers[cap ? rows : 0].clone().sub(centers[cap ? rows - 1 : 1]).normalize();
    expect(n.dot(outward)).toBeGreaterThan(.99);
  }
  for (let column = 0; column < sides; column++) {
    const middle = at(normals, rows / 2 * sides + column);
    expect(middle.dot(at(normals, (rows / 2 - 1) * sides + column))).toBeGreaterThan(.99);
    expect(middle.dot(at(normals, (rows / 2 + 1) * sides + column))).toBeGreaterThan(.99);
  }
}

describe('Dino Lab continuous long-bone surface', () => {
  for (const scale of [.03, 1, 15]) for (const bow of [-.12, 0, .12]) {
    it('forms a closed smooth shaft without a waist cap at scale ' + scale + ', bow ' + bow, () => {
      const specimen = make({ scale, bow });
      try { assertGeometry(specimen); } finally { specimen.geometry.dispose(); }
    });
  }
  for (const direction of [[1, 0, 0], [0, 0, 1], [1e-10, 1e-10, 1]]) {
    it('keeps a stable frame for a straight near-axis shaft ' + direction.join(','), () => {
      const specimen = make({ direction, bow: 0 });
      try { assertGeometry(specimen); } finally { specimen.geometry.dispose(); }
    });
  }
  it('rotates bowed geometry and normals with its three anatomical points', () => {
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(.41, -.73, .22));
    const original = make(), rotated = make({ rotation });
    try {
      assertGeometry(rotated);
      expect(Array.from(rotated.geometry.index.array)).toEqual(Array.from(original.geometry.index.array));
      for (const attribute of ['position', 'normal']) for (let i = 0; i < original.geometry.attributes[attribute].count; i++) {
        expect(at(original.geometry.attributes[attribute], i).applyQuaternion(rotation)
          .distanceTo(at(rotated.geometry.attributes[attribute], i))).toBeLessThan(2e-6);
      }
    } finally { original.geometry.dispose(); rotated.geometry.dispose(); }
  });
  it('keeps caller vectors immutable and stores independent diagnostic point arrays', () => {
    const points = [vec(-1, 2, .5), vec(1, -1, .3), vec(.1, .6, .4)], before = points.map(p => p.toArray());
    const g = geometryFor(THREE, ...points, .13, .076, .118);
    try {
      expect(points.map(p => p.toArray())).toEqual(before);
      expect([g.userData.dinoLongBone.start, g.userData.dinoLongBone.end, g.userData.dinoLongBone.midpoint]).toEqual(before);
      g.userData.dinoLongBone.midpoint[0] = 900;
      expect(points.map(p => p.toArray())).toEqual(before);
    } finally { g.dispose(); }
  });
  it('rejects a zero length, nonfinite length or nonpositive radius before allocating geometry', () => {
    let allocations = 0;
    const guarded = { ...THREE, BufferGeometry: class { constructor() { allocations++; throw new Error('Unexpected geometry allocation'); } } };
    expect(geometryFor(guarded, vec(), vec(), vec(), .1, .1, .1)).toBeNull();
    expect(geometryFor(guarded, vec(), vec(Infinity), vec(), .1, .1, .1)).toBeNull();
    for (const invalid of [0, -.1, NaN, Infinity]) for (let station = 0; station < 3; station++) {
      const widths = [.1, .08, .12]; widths[station] = invalid;
      expect(geometryFor(guarded, vec(), vec(0, 2), vec(0, 1), ...widths)).toBeNull();
    }
    expect(allocations).toBe(0);
  });
});

function caller({ showSkeleton = true, detail = true, helper = geometryFor } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), calls = [];
  const context = { THREE, vec, model, boneMat, props: { showSkeleton }, skeletalProfile: { longBoneDetail: detail },
    dinoLongBoneGeometry(...args) { calls.push(args); return helper(...args); } };
  const add = new Function('context', 'with (context) {' + fallbackCode + callerCode + '\nreturn addLongBone;}')(context);
  return { add, model, boneMat, calls, dispose() { model.traverse(part => part.geometry?.dispose()); boneMat.dispose(); } };
}
describe('Dino Lab native addLongBone caller', () => {
  it('creates one matte shaft per limb segment with preserved endpoints, widths and midpoint return', () => {
    const built = caller();
    try {
      for (let i = 0; i < 12; i++) {
        const a = vec(i * .1, 2, (i % 2 ? -1 : 1) * .3), b = vec(i * .1 + .2, .7, a.z), before = [a.toArray(), b.toArray()];
        const radius = .07, amount = .012, side = i % 2 ? -1 : 1;
        const expected = a.clone().add(b).multiplyScalar(.5).add(vec(1.3, .2).normalize().multiplyScalar(a.distanceTo(b) * amount * side));
        const midpoint = built.add(a, b, radius, amount, side, 1.42, 1.22), mesh = built.model.children[i];
        expect(midpoint.isVector3).toBe(true); expect(midpoint.distanceTo(expected)).toBeLessThan(1e-12);
        expect(mesh.name).toBe('continuous-long-bone'); expect(mesh.castShadow).toBe(true);
        expect(mesh.material).toBe(built.boneMat); expect(mesh.position.toArray()).toEqual([0, 0, 0]);
        expect(mesh.userData.dinoLongBone).toBe(mesh.geometry.userData.dinoLongBone);
        expect(mesh.userData.dinoLongBone).toMatchObject({ start: before[0], end: before[1], proximalRadius: radius * 1.42, midRadius: radius * .76, distalRadius: radius * 1.22 });
        expect(ringCenter(mesh.geometry, 6).distanceTo(midpoint)).toBeLessThan(1e-6);
        expect([a.toArray(), b.toArray()]).toEqual(before);
      }
      expect(built.model.children).toHaveLength(12); expect(built.calls).toHaveLength(12);
    } finally { built.dispose(); }
  });
  it('keeps default widths and the established bow-axis fallback for vertical depth segments', () => {
    const built = caller();
    try {
      const midpoint = built.add(vec(), vec(0, 0, 2), .1, .02, -1);
      expect(midpoint.toArray()).toEqual([-.04, 0, 1]);
      const widths = built.model.children[0].userData.dinoLongBone;
      for (const [name, expected] of Object.entries({ proximalRadius: .13, midRadius: .076, distalRadius: .118 })) {
        expect(widths[name]).toBeCloseTo(expected, 12);
      }
    } finally { built.dispose(); }
  });
  it('allocates no shaft, mesh or helper work in the hidden skeleton/body-only path', () => {
    const built = caller({ showSkeleton: false, helper() { throw new Error('Hidden helper access'); } });
    try { expect(built.add(null, null, null)).toBeNull(); expect(built.calls).toHaveLength(0); expect(built.model.children).toHaveLength(0); }
    finally { built.dispose(); }
  });
  it('preserves the simple cylinder fallback and its mesh return for low-detail species', () => {
    const built = caller({ detail: false, helper() { throw new Error('Unexpected detailed geometry'); } });
    try {
      const a = vec(-1, 2, .4), b = vec(.3, .2, -.5), result = built.add(a, b, .04, .01, -1, 1.4, 1.2);
      expect(result).toBe(built.model.children[0]); expect(built.calls).toHaveLength(0);
      expect(result.geometry.type).toBe('CylinderGeometry');
      expect(result.geometry.parameters).toMatchObject({ radiusTop: .04, radiusBottom: .04, height: a.distanceTo(b), radialSegments: 10 });
      expect(result.position.distanceTo(a.clone().add(b).multiplyScalar(.5))).toBeLessThan(1e-12);
      expect(result.userData.dinoLongBone).toBeUndefined();
    } finally { built.dispose(); }
  });
  it('leaves the model empty when joints coincide or the geometry helper cannot build a shaft', () => {
    const built = caller({ helper() { return null; } });
    try {
      expect(built.add(vec(), vec(), .1)).toBeNull(); expect(built.calls).toHaveLength(0);
      expect(built.add(vec(), vec(0, 1), .1)).toBeNull(); expect(built.calls).toHaveLength(1);
      expect(built.model.children).toHaveLength(0);
    } finally { built.dispose(); }
  });
});
