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
    concha: object(fixture.scene, ear.name + '-concha'), rim: object(fixture.scene, ear.name + '-helix'),
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
  // Project actual base triangles along ear-local X. Barycentric tolerance
  // retains samples on shared triangle edges without world-transform rounding.
  const cache = surfaceGap.facets || (surfaceGap.facets = new WeakMap());
  let facets = cache.get(target);
  if (!facets) {
    const positions = target.geometry.attributes.position, indices = target.geometry.index?.array || Array.from({ length: positions.count }, (_, i) => i);
    const vertices = Array.from({ length: positions.count }, (_, i) => point(target, i).applyMatrix4(target.matrix));
    facets = [];
    for (let i = 0; i < indices.length; i += 3) {
      const a = vertices[indices[i]], b = vertices[indices[i + 1]], c = vertices[indices[i + 2]];
      const denominator = (b.y - c.y) * (a.z - c.z) + (c.z - b.z) * (a.y - c.y);
      if (Math.abs(denominator) < 1e-18) continue;
      facets.push({ ax: a.x, bx: b.x, cx: c.x, cy: c.y, cz: c.z,
        bycy: b.y - c.y, czbz: c.z - b.z, cyay: c.y - a.y, azcz: a.z - c.z, denominator });
    }
    cache.set(target, facets);
  }
  const local = point(mesh, index).applyMatrix4(mesh.matrix); let outermost = -Infinity;
  for (const facet of facets) {
    const y = local.y - facet.cy, z = local.z - facet.cz;
    const a = (facet.bycy * z + facet.czbz * y) / facet.denominator;
    const b = (facet.cyay * z + facet.azcz * y) / facet.denominator, c = 1 - a - b;
    if (Math.min(a, b, c) < -1e-10 || Math.max(a, b, c) > 1 + 1e-10) continue;
    outermost = Math.max(outermost, fixture.sign * (a * facet.ax + b * facet.bx + c * facet.cx));
  }
  expect(Number.isFinite(outermost), mesh.name + ' remains over actual ' + target.name + ' triangles').toBe(true);
  return fixture.sign * local.x - outermost;
}
// Native torus UVs select loop sections and the two front/rear join rows.
// All relief and clearance assertions use the resulting actual mesh triangles.
function rimSample(mesh, u, v = .25) {
  const uv = mesh.geometry.attributes.uv;
  expect(uv, mesh.name + ' retains its torus UVs').toBeTruthy();
  let best = 0, cost = Infinity;
  for (let i = 0; i < uv.count; i++) {
    const next = Math.abs(uv.getX(i) - u) + Math.abs(uv.getY(i) - v);
    if (next < cost) { best = i; cost = next; }
  }
  return best;
}
function rimJoins(mesh) {
  const uv = mesh.geometry.attributes.uv;
  return Array.from({ length: uv.count }, (_, i) => i)
    .filter(i => Math.min(Math.abs(uv.getY(i)), Math.abs(uv.getY(i) - .5), Math.abs(uv.getY(i) - 1)) < 1e-6);
}
function foldFrontSample(ear, t) {
  const pathPoint = ear.fold.geometry.parameters.path.getPoint(t), positions = ear.fold.geometry.attributes.position, normals = ear.fold.geometry.attributes.normal;
  let best = 0, cost = Infinity;
  for (let i = 0; i < positions.count; i++) {
    const next = Math.hypot(positions.getY(i) - pathPoint.y, positions.getZ(i) - pathPoint.z) * 1000 + 1 - ear.sign * normals.getX(i);
    if (next < cost) { best = i; cost = next; }
  }
  return best;
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

describe('fitted manikin outer ear rims', () => {
  it.each(ages)('uses closed genus-one ear rims with continuous outward normals and bilateral geometry for %s', age => {
    const fixture = model(age, 0), shells = {};
    for (const side of sides) {
      const { rim } = earModel(fixture, side), shell = weldedShell(rim); shells[side] = shell;
      expect(shell.finite, rim.name).toBe(true); expect(shell.connected, rim.name).toBe(true); expect(shell.euler, rim.name + ' retains an open inner-ear centre').toBe(0);
      expect([...shell.edges.values()].every(edge => edge.count === 2 && edge.balance === 0), rim.name + ' closed consistent triangle winding').toBe(true);
      expect(shell.volume, rim.name + ' outward orientation').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot, rim.name + ' normals agree with outward triangles').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999); expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot, rim.name + ' normals meet at both welded seams').toBeGreaterThan(.9999);
    }
    expect(shells.left.welded.size).toBe(shells.right.welded.size);
    for (const { position, normal } of shells.right.welded.values()) {
      const mirror = position.clone(); mirror.x *= -1;
      const matching = shells.left.welded.get(vertexKey(mirror)); expect(matching, 'bilateral outer-ear contour').toBeTruthy();
      const reflectedNormal = normal.clone(); reflectedNormal.x *= -1;
      expect(matching.normal.dot(reflectedNormal), 'mirrored outer-ear normals').toBeGreaterThan(.9999);
    }
  });

  it.each(poses)('keeps upper rim relief and a seated lower lobe with buried joins on the actual $age ear in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase);
    for (const side of sides) {
      const ear = earModel(fixture, side), path = ear.rim.geometry.parameters.path;
      expect(path.closed, ear.rim.name + ' retained ear outline is a closed curve').toBe(true);
      expect(path.points.length, ear.rim.name + ' retains all original outline controls').toBe(16);
      expect(path.getPoint(0).distanceTo(path.getPoint(1)), ear.rim.name + ' centreline wraps continuously').toBeLessThan(1e-8);
      const samples = Array.from({ length: 64 }, (_, i) => rimSample(ear.rim, i / 64));
      const front = samples.map(i => surfaceGap(ear.rim, i, ear.base, ear));
      const upper = samples.filter(i => point(ear.rim, i).z <= .010).map(i => surfaceGap(ear.rim, i, ear.base, ear));
      const lower = samples.filter(i => point(ear.rim, i).z >= .052).map(i => surfaceGap(ear.rim, i, ear.base, ear));
      expect(upper.length, ear.rim.name + ' samples the raised upper rim').toBeGreaterThan(16);
      expect(lower.length, ear.rim.name + ' samples the lower lobe arc').toBeGreaterThan(4);
      expect(Math.min(...upper), ear.rim.name + ' upper rim remains visibly above ear skin').toBeGreaterThan(.001);
      expect(Math.max(...lower), ear.rim.name + ' lower rim blends beneath the ear lobe surface').toBeLessThan(-.0001);
      expect(Math.min(...front), ear.rim.name + ' faded rim remains close beneath the lobe').toBeGreaterThan(-.003);
      expect(Math.max(...front), ear.rim.name + ' front rim stays close to actual ear skin').toBeLessThan(.010);
      const boundary = rimJoins(ear.rim).map(i => surfaceGap(ear.rim, i, ear.base, ear));
      expect(boundary.length, ear.rim.name + ' both full front/rear boundaries are sampled').toBeGreaterThan(120);
      expect(Math.max(...boundary), ear.rim.name + ' both complete join loops remain buried').toBeLessThan(-.0001);
      expect(Math.min(...boundary), ear.rim.name + ' buried joins stay close to skin').toBeGreaterThan(-.003);
      for (let i = 0; i < samples.length; i++) {
        const a = point(ear.rim, samples[i]), b = point(ear.rim, samples[(i + 1) % samples.length]);
        expect(a.distanceTo(b), ear.rim.name + ' neighboring front sections follow a continuous loop').toBeLessThan(.008);
      }
      for (const v of [0, .125, .25, .375, .5, .625, .75, .875, 1]) {
        const first = rimSample(ear.rim, 0, v), last = rimSample(ear.rim, 1, v);
        expect(point(ear.rim, first).distanceTo(point(ear.rim, last)), ear.rim.name + ' loop seam meets at every cross section').toBeLessThan(1e-9);
        const normals = ear.rim.geometry.attributes.normal;
        expect(new THREE.Vector3().fromBufferAttribute(normals, first).dot(new THREE.Vector3().fromBufferAttribute(normals, last)), ear.rim.name + ' loop seam shades continuously').toBeGreaterThan(.9999);
      }
      const sections = Array.from({ length: 64 }, (_, i) => {
        const a = point(ear.rim, rimSample(ear.rim, i / 64, 0)), b = point(ear.rim, rimSample(ear.rim, i / 64, .5));
        return { z: (a.z + b.z) / 2, width: Math.hypot(a.y - b.y, a.z - b.z) };
      }).sort((a, b) => a.z - b.z);
      const average = list => list.reduce((sum, section) => sum + section.width, 0) / list.length;
      expect(average(sections.slice(-16)), ear.rim.name + ' lower contour softens relative to the upper rim').toBeLessThan(average(sections.slice(0, 16)) * .9);
    }
  });

  it.each(poses)('keeps the $age rims inside the ear outline and clear of visible inner-ear detail in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase);
    for (const side of sides) {
      const ear = earModel(fixture, side), rimBounds = localBounds(ear.rim), baseBounds = localBounds(ear.base);
      for (const axis of ['y', 'z']) {
        expect(rimBounds.min[axis] - baseBounds.min[axis], ear.rim.name + ' remains within the lower ear outline').toBeGreaterThan(.001);
        expect(baseBounds.max[axis] - rimBounds.max[axis], ear.rim.name + ' remains within the upper ear outline').toBeGreaterThan(.001);
      }
      for (const t of [.1, .3, .5, .7, .9]) {
        const i = foldFrontSample(ear, t), local = point(ear.fold, i).applyMatrix4(ear.fold.matrix);
        expect(nearestTriangleDistance(local, ear.rim), ear.rim.name + ' stays separate from actual inner-fold vertices').toBeGreaterThan(.003);
        const ray = surfaceRay(local.clone().applyMatrix4(ear.ear.matrixWorld), ear), fold = ray.intersectObject(ear.fold, false)[0];
        expect(fold, ear.fold.name + ' actual front detail remains visible').toBeTruthy();
        const rim = ray.intersectObject(ear.rim, false)[0];
        if (rim) expect(rim.distance - fold.distance, ear.rim.name + ' leaves the inner fold unobscured').toBeGreaterThan(.0001 * ear.unit);
      }
      for (const fraction of [0, .125, .25, .375, .5, .625, .75, .875, 1]) {
        const indices = ear.concha.geometry.index.array, triangle = Math.round(fraction * (indices.length / 3 - 1)) * 3;
        const local = point(ear.concha, indices[triangle]).add(point(ear.concha, indices[triangle + 1])).add(point(ear.concha, indices[triangle + 2])).divideScalar(3);
        const world = local.applyMatrix4(ear.concha.matrixWorld), ray = surfaceRay(world, ear);
        const concha = ray.intersectObject(ear.concha, false)[0]; expect(concha, ear.concha.name + ' actual recessed surface remains present').toBeTruthy();
        const rim = ray.intersectObject(ear.rim, false)[0];
        if (rim) expect(rim.distance - concha.distance, ear.rim.name + ' leaves recessed shading unobscured').toBeGreaterThan(.0001 * ear.unit);
      }
    }
  });

  it.each(ages)('carries the %s ear rims with the head and preserves geometry and material through recovery', age => {
    const before = model(age, 0), after = model(age, 8);
    expect(before.pivot.quaternion.angleTo(after.pivot.quaternion), 'airway step visibly tilts the head').toBeGreaterThan(.02);
    for (const fixture of [before, after]) for (const side of sides) {
      const ear = earModel(fixture, side);
      expect(ear.rim.parent).toBe(ear.ear); expect(ear.ear.parent).toBe(fixture.pivot);
      expect(ear.rim.matrix.elements).toEqual(new THREE.Matrix4().elements);
      expect(fixture.content.picks.includes(ear.rim), 'outer ear detail is not an answer target').toBe(false);
      const local = point(ear.rim, rimSample(ear.rim, .5)), world = local.clone().applyMatrix4(ear.rim.matrixWorld);
      expect(world.distanceTo(local.applyMatrix4(ear.ear.matrixWorld))).toBeLessThan(1e-8);
    }
    for (const side of sides) {
      const a = earModel(before, side), b = earModel(after, side);
      for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(b.rim.geometry.attributes[attribute].array), a.rim.name + ' recovery preserves local ' + attribute).toEqual(Array.from(a.rim.geometry.attributes[attribute].array));
      expect(Array.from(b.rim.geometry.index.array), a.rim.name + ' recovery preserves triangle connectivity').toEqual(Array.from(a.rim.geometry.index.array));
      expect(materialState(b.rim.material), a.rim.name + ' recovery preserves skin material').toEqual(materialState(a.rim.material));
      expect(b.ear.scale.toArray(), a.rim.name + ' recovery preserves age scaling').toEqual(a.ear.scale.toArray());
      const first = point(a.rim, rimSample(a.rim, .5)).applyMatrix4(a.rim.matrixWorld), last = point(b.rim, rimSample(b.rim, .5)).applyMatrix4(b.rim.matrixWorld);
      expect(first.distanceTo(last), a.rim.name + ' rim follows visible head movement').toBeGreaterThan(.002 * a.unit);
    }
  });

  it.each(ages)('preserves opaque ear skin and distinct recessed shading in %s app contrast', age => {
    const standard = model(age, 8), contrast = model(age, 8, true);
    expect(contrast.head.material.type).toBe('MeshBasicMaterial');
    for (const side of sides) {
      const ear = earModel(contrast, side), ordinary = earModel(standard, side);
      expect(ear.rim.material.type).toBe('MeshBasicMaterial');
      expect(ear.rim.material.color.getHex(), ear.rim.name + ' retains ear skin color').toBe(ear.base.material.color.getHex());
      expect(ear.rim.material.color.r - ear.concha.material.color.r, ear.rim.name + ' remains distinct from recessed shading').toBeGreaterThan(.4);
      expect(ear.rim.material.transparent).toBe(false); expect(ear.rim.material.opacity).toBe(1);
      for (const attribute of ['position', 'normal', 'uv']) expect(Array.from(ear.rim.geometry.attributes[attribute].array), ear.rim.name + ' contrast retains local ' + attribute).toEqual(Array.from(ordinary.rim.geometry.attributes[attribute].array));
      expect(Array.from(ear.rim.geometry.index.array), ear.rim.name + ' contrast retains closed topology').toEqual(Array.from(ordinary.rim.geometry.index.array));
    }
  });
});
