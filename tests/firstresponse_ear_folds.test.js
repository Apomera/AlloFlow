import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const poses = ages.flatMap(age => [0, 8].map(phase => ({ age, phase })));
const sides = ['left', 'right'];
const scenes = [];
let build;

beforeEach(() => {
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      build = config.buildScene;
      return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' };
    },
    registerTool(id, config) { this._registry[id] = config; },
  };
  new Function(source)();
});
afterEach(() => {
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
  });
});

function object(scene, name) {
  const found = scene.getObjectByName(name); expect(found, name).toBeTruthy(); return found;
}
function model(age, phase, contrast = false) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = build(THREE, {
    scene, phase, dark: true, contrast, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab: 'recovery', age },
  });
  content.frame(0, {}, true); scene.updateMatrixWorld(true);
  return { scene, content, pivot: object(scene, 'fr-manikin-head-pivot'), head: object(scene, 'fr-manikin-head') };
}
function earModel(fixture, side) {
  const ear = object(fixture.scene, 'fr-manikin-ear-' + side);
  return { ...fixture, ear, side, sign: side === 'left' ? -1 : 1,
    fold: object(fixture.scene, ear.name + '-antihelix'), base: object(fixture.scene, ear.name + '-base'),
    concha: object(fixture.scene, ear.name + '-concha'), helix: object(fixture.scene, ear.name + '-helix'),
    unit: ear.getWorldScale(new THREE.Vector3()).x,
    outward: new THREE.Vector3(side === 'left' ? -1 : 1, 0, 0).transformDirection(ear.matrixWorld) };
}
function point(mesh, index) { return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index); }
function localBounds(mesh) {
  mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
}
function surfaceRay(world, fixture) {
  return new THREE.Raycaster(world.clone().addScaledVector(fixture.outward, .1 * fixture.unit), fixture.outward.clone().negate());
}
function surfaceGap(mesh, index, target, fixture) {
  const world = point(mesh, index).applyMatrix4(mesh.matrixWorld);
  const hit = surfaceRay(world, fixture).intersectObject(target, false)[0];
  expect(hit, mesh.name + ' remains over actual ' + target.name + ' triangles').toBeTruthy();
  return (hit.distance - .1 * fixture.unit) / fixture.unit;
}
// Primitive coordinates identify the longitudinal samples and the front/rear
// boundary. The assertions below measure the deformed meshes against actual
// ear triangles rather than reimplementing their surface-fitting equations.
function primitive(mesh) {
  const p = mesh.geometry.parameters;
  expect(p && p.widthSegments && p.heightSegments, mesh.name + ' retains its sphere parameters').toBeTruthy();
  const geometry = new THREE.SphereGeometry(p.radius, p.widthSegments, p.heightSegments,
    p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
  expect(geometry.attributes.position.count).toBe(mesh.geometry.attributes.position.count);
  const positions = geometry.attributes.position.array.slice(); geometry.dispose();
  return positions;
}
function frontSample(mesh, coordinates, longitudinal) {
  let best = 0, cost = Infinity;
  for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    const next = Math.abs(coordinates[i * 3 + 1] - longitudinal) * 100 + 1 - coordinates[i * 3];
    if (next < cost) { best = i; cost = next; }
  }
  return best;
}
function joins(mesh, coordinates) {
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => i)
    .filter(i => Math.abs(coordinates[i * 3]) < 1e-6);
}
function nearestTriangleDistance(point, mesh) {
  const positions = mesh.geometry.attributes.position, indices = mesh.geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i);
  const triangle = new THREE.Triangle(), closest = new THREE.Vector3(); let minimum = Infinity;
  for (let i = 0; i < indices.length; i += 3) {
    triangle.set(new THREE.Vector3().fromBufferAttribute(positions, indices[i]).applyMatrix4(mesh.matrix),
      new THREE.Vector3().fromBufferAttribute(positions, indices[i + 1]).applyMatrix4(mesh.matrix),
      new THREE.Vector3().fromBufferAttribute(positions, indices[i + 2]).applyMatrix4(mesh.matrix));
    minimum = Math.min(minimum, triangle.closestPointToPoint(point, closest).distanceTo(point));
  }
  return minimum;
}
function vertexKey(position) { return position.toArray().map(value => Math.round(value * 1e8)).join(','); }
function weldedShell(mesh) {
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  const keys = [], welded = new Map(), edges = new Map(), adjacency = new Map(), centre = new THREE.Vector3();
  let minimumCoincidentDot = 1, minimumNormalLength = Infinity, maximumNormalLength = 0, finite = true;
  for (let i = 0; i < positions.count; i++) {
    const p = point(mesh, i), n = new THREE.Vector3().fromBufferAttribute(normals, i);
    finite &&= [...p.toArray(), ...n.toArray()].every(Number.isFinite);
    minimumNormalLength = Math.min(minimumNormalLength, n.length()); maximumNormalLength = Math.max(maximumNormalLength, n.length());
    const key = vertexKey(p); keys.push(key);
    if (welded.has(key)) minimumCoincidentDot = Math.min(minimumCoincidentDot, n.dot(welded.get(key).normal));
    else { welded.set(key, { position: p, normal: n }); centre.add(p); }
  }
  centre.divideScalar(welded.size);
  let faces = 0, volume = 0, minimumFaceNormalDot = 1;
  const indices = mesh.geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i);
  for (let i = 0; i < indices.length; i += 3) {
    const ids = [indices[i], indices[i + 1], indices[i + 2]], triangle = ids.map(id => point(mesh, id));
    const cross = triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0]));
    if (new Set(ids.map(id => keys[id])).size < 3 || cross.lengthSq() < 1e-24) continue;
    faces++;
    volume += triangle[0].clone().sub(centre).dot(triangle[1].clone().sub(centre).cross(triangle[2].clone().sub(centre))) / 6;
    const vertexNormal = ids.reduce((sum, id) => sum.add(new THREE.Vector3().fromBufferAttribute(normals, id)), new THREE.Vector3()).normalize();
    minimumFaceNormalDot = Math.min(minimumFaceNormalDot, cross.normalize().dot(vertexNormal));
    for (let edge = 0; edge < 3; edge++) {
      const a = keys[ids[edge]], b = keys[ids[(edge + 1) % 3]], ordered = [a, b].sort(), key = ordered.join('|');
      const entry = edges.get(key) || { count: 0, balance: 0 }; entry.count++; entry.balance += a === ordered[0] ? 1 : -1; edges.set(key, entry);
      if (!adjacency.has(a)) adjacency.set(a, new Set()); if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b); adjacency.get(b).add(a);
    }
  }
  const reached = new Set(), queue = [adjacency.keys().next().value];
  while (queue.length) { const key = queue.pop(); if (reached.has(key)) continue; reached.add(key); queue.push(...adjacency.get(key)); }
  return { welded, edges, faces, volume, minimumCoincidentDot, minimumNormalLength, maximumNormalLength, finite, minimumFaceNormalDot,
    connected: reached.size === adjacency.size, euler: adjacency.size - edges.size + faces };
}
function materialState(material) {
  return { type: material.type, color: material.color.getHex(), opacity: material.opacity, transparent: material.transparent,
    side: material.side, shininess: material.shininess, depthWrite: material.depthWrite, depthTest: material.depthTest };
}

describe('fitted manikin inner ear folds', () => {
  it.each(ages)('uses closed outward ear-fold shells with continuous finite normals and bilateral geometry for %s', age => {
    const fixture = model(age, 0), shells = {};
    for (const side of sides) {
      const { fold } = earModel(fixture, side), shell = weldedShell(fold); shells[side] = shell;
      expect(shell.finite, fold.name).toBe(true); expect(shell.connected, fold.name).toBe(true); expect(shell.euler, fold.name).toBe(2);
      expect([...shell.edges.values()].every(edge => edge.count === 2 && edge.balance === 0), fold.name + ' closed consistent triangle winding').toBe(true);
      expect(shell.volume, fold.name + ' outward orientation').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot, fold.name + ' normals agree with outward triangles').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999); expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot, fold.name + ' normals meet at welded seams').toBeGreaterThan(.9999);
    }
    expect(shells.left.welded.size).toBe(shells.right.welded.size);
    for (const { position, normal } of shells.right.welded.values()) {
      const mirror = position.clone(); mirror.x *= -1;
      const matching = shells.left.welded.get(vertexKey(mirror)); expect(matching, 'bilateral ear-fold contour').toBeTruthy();
      const reflectedNormal = normal.clone(); reflectedNormal.x *= -1;
      expect(matching.normal.dot(reflectedNormal), 'mirrored ear-fold normals').toBeGreaterThan(.9999);
    }
  });

  it.each(poses)('keeps shallow relief and tapered buried joins on the actual $age ear base in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase);
    for (const side of sides) {
      const ear = earModel(fixture, side), coordinates = primitive(ear.fold);
      const middle = [-.65, -.35, 0, .35, .65].map(u => surfaceGap(ear.fold, frontSample(ear.fold, coordinates, u), ear.base, ear));
      expect(Math.min(...middle), ear.fold.name + ' fold remains visible above actual ear skin').toBeGreaterThan(.0001);
      expect(Math.max(...middle), ear.fold.name + ' relief remains shallow').toBeLessThan(.008);
      const shoulders = [-.97, .97].map(u => surfaceGap(ear.fold, frontSample(ear.fold, coordinates, u), ear.base, ear));
      const ends = [-1, 1].map(u => surfaceGap(ear.fold, frontSample(ear.fold, coordinates, u), ear.base, ear));
      expect(Math.max(...shoulders), ear.fold.name + ' relief tapers before both endpoints').toBeLessThan(Math.max(...middle) * .65);
      expect(Math.max(...ends), ear.fold.name + ' tips tuck beneath actual ear triangles').toBeLessThan(-.0001);
      expect(Math.min(...ends), ear.fold.name + ' tips remain close to ear skin').toBeGreaterThan(-.003);
      const boundary = joins(ear.fold, coordinates).map(i => surfaceGap(ear.fold, i, ear.base, ear));
      expect(boundary.length, ear.fold.name + ' complete primitive boundary is sampled').toBeGreaterThan(40);
      expect(Math.max(...boundary), ear.fold.name + ' entire front/rear join remains buried').toBeLessThan(-.0001);
      expect(Math.min(...boundary), ear.fold.name + ' buried join remains shallow').toBeGreaterThan(-.003);
    }
  });

  it.each(poses)('keeps the $age inner folds inside the ear outline and clear of the outer helix in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase);
    for (const side of sides) {
      const ear = earModel(fixture, side), coordinates = primitive(ear.fold), foldBounds = localBounds(ear.fold), baseBounds = localBounds(ear.base);
      for (const axis of ['y', 'z']) {
        expect(foldBounds.min[axis] - baseBounds.min[axis], ear.fold.name + ' stays inside the lower ear outline').toBeGreaterThan(.012);
        expect(baseBounds.max[axis] - foldBounds.max[axis], ear.fold.name + ' stays inside the upper ear outline').toBeGreaterThan(.012);
      }
      let conchaSamples = 0;
      for (const u of [-.65, -.35, 0, .35, .65]) {
        const i = frontSample(ear.fold, coordinates, u), local = point(ear.fold, i).applyMatrix4(ear.fold.matrix);
        expect(nearestTriangleDistance(local, ear.helix), ear.fold.name + ' stays separate from actual outer-helix triangles').toBeGreaterThan(.003);
        const world = local.clone().applyMatrix4(ear.ear.matrixWorld), ray = surfaceRay(world, ear), concha = ray.intersectObject(ear.concha, false)[0];
        if (concha) {
          conchaSamples++;
          const fold = ray.intersectObject(ear.fold, false)[0]; expect(fold, ear.fold.name + ' visible fold over concha').toBeTruthy();
          expect(concha.distance - fold.distance, ear.fold.name + ' central fold sits above the actual concha').toBeGreaterThan(.0001 * ear.unit);
        }
      }
      expect(conchaSamples, ear.fold.name + ' samples cross actual inner-ear shading').toBeGreaterThan(0);
    }
  });

  it.each(ages)('carries the %s inner ear folds with the head and preserves shape and material through recovery', age => {
    const before = model(age, 0), after = model(age, 8);
    expect(before.pivot.quaternion.angleTo(after.pivot.quaternion), 'airway step visibly tilts the head').toBeGreaterThan(.02);
    for (const fixture of [before, after]) for (const side of sides) {
      const ear = earModel(fixture, side);
      expect(ear.fold.parent).toBe(ear.ear); expect(ear.ear.parent).toBe(fixture.pivot);
      expect(ear.fold.matrix.elements).toEqual(new THREE.Matrix4().elements);
      expect(fixture.content.picks.includes(ear.fold), 'inner ear detail is not an answer target').toBe(false);
      const local = point(ear.fold, frontSample(ear.fold, primitive(ear.fold), 0)), world = local.clone().applyMatrix4(ear.fold.matrixWorld);
      expect(world.distanceTo(local.applyMatrix4(ear.ear.matrixWorld))).toBeLessThan(1e-8);
    }
    for (const side of sides) {
      const a = earModel(before, side), b = earModel(after, side);
      for (const attribute of ['position', 'normal']) expect(Array.from(b.fold.geometry.attributes[attribute].array), a.fold.name + ' recovery preserves local ' + attribute).toEqual(Array.from(a.fold.geometry.attributes[attribute].array));
      expect(Array.from(b.fold.geometry.index.array), a.fold.name + ' recovery preserves triangle connectivity').toEqual(Array.from(a.fold.geometry.index.array));
      expect(materialState(b.fold.material), a.fold.name + ' recovery preserves skin material').toEqual(materialState(a.fold.material));
      expect(b.ear.scale.toArray(), a.fold.name + ' recovery preserves age scaling').toEqual(a.ear.scale.toArray());
      const first = point(a.fold, frontSample(a.fold, primitive(a.fold), 0)).applyMatrix4(a.fold.matrixWorld);
      const last = point(b.fold, frontSample(b.fold, primitive(b.fold), 0)).applyMatrix4(b.fold.matrixWorld);
      expect(first.distanceTo(last), a.fold.name + ' fold follows visible head movement').toBeGreaterThan(.002 * a.unit);
    }
  });

  it.each(ages)('preserves opaque skin relief and distinct concha shading in %s app contrast', age => {
    const standard = model(age, 8), contrast = model(age, 8, true);
    expect(contrast.head.material.type).toBe('MeshBasicMaterial');
    for (const side of sides) {
      const ear = earModel(contrast, side), ordinary = earModel(standard, side);
      expect(ear.fold.material.type).toBe('MeshBasicMaterial');
      expect(ear.fold.material.color.getHex(), ear.fold.name + ' remains the ear skin color').toBe(ear.base.material.color.getHex());
      expect(ear.fold.material.color.r - ear.concha.material.color.r, ear.fold.name + ' remains distinct from the recessed concha').toBeGreaterThan(.4);
      expect(ear.fold.material.transparent).toBe(false); expect(ear.fold.material.opacity).toBe(1);
      for (const attribute of ['position', 'normal']) expect(Array.from(ear.fold.geometry.attributes[attribute].array), ear.fold.name + ' contrast retains local ' + attribute).toEqual(Array.from(ordinary.fold.geometry.attributes[attribute].array));
      expect(Array.from(ear.fold.geometry.index.array), ear.fold.name + ' contrast retains closed topology').toEqual(Array.from(ordinary.fold.geometry.index.array));
    }
  });
});
