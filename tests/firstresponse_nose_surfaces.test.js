import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const poses = ages.flatMap(age => [0, 8].map(phase => ({ age, phase })));
const sides = ['left', 'right'];
const noseNames = ['fr-manikin-nose', ...sides.map(side => `fr-manikin-nostril-${side}`)];
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
  const head = object(scene, 'fr-manikin-head'), pivot = object(scene, 'fr-manikin-head-pivot');
  const unit = head.scale.x / .28 * pivot.getWorldScale(new THREE.Vector3()).x;
  const up = new THREE.Vector3(0, 1, 0).transformDirection(pivot.matrixWorld);
  return { scene, content, head, pivot, unit, up };
}
function point(mesh, index) { return new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index); }
function box(mesh) { mesh.geometry.computeBoundingBox(); return mesh.geometry.boundingBox; }
function frontRay(world, fixture) {
  return new THREE.Raycaster(world.clone().addScaledVector(fixture.up, .1 * fixture.unit), fixture.up.clone().negate());
}
function surfaceGap(mesh, index, target, fixture) {
  const world = point(mesh, index).applyMatrix4(mesh.matrixWorld);
  const hit = frontRay(world, fixture).intersectObject(target, false)[0];
  expect(hit, mesh.name + ' remains over actual ' + target.name + ' triangles').toBeTruthy();
  return (hit.distance - .1 * fixture.unit) / fixture.unit;
}
// Select front vertices by the geometry's own bounds, without reproducing its shaping functions.
function frontSample(mesh, xFraction, zFraction) {
  const bounds = box(mesh), positions = mesh.geometry.attributes.position;
  const centreX = (bounds.min.x + bounds.max.x) / 2, halfWidth = (bounds.max.x - bounds.min.x) / 2;
  const length = bounds.max.z - bounds.min.z;
  let best = 0, cost = Infinity;
  for (let i = 0; i < positions.count; i++) {
    const next = Math.abs((positions.getX(i) - centreX) / halfWidth - xFraction) * 100
      + Math.abs((positions.getZ(i) - bounds.min.z) / length - zFraction) * 100
      - positions.getY(i) / length;
    if (next < cost) { best = i; cost = next; }
  }
  return best;
}
function sectionWidth(mesh, zFraction) {
  const bounds = box(mesh), positions = mesh.geometry.attributes.position, length = bounds.max.z - bounds.min.z;
  const target = bounds.min.z + length * zFraction;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getZ(i) - target) < length * .03) {
    min = Math.min(min, positions.getX(i)); max = Math.max(max, positions.getX(i));
  }
  expect(Number.isFinite(min) && Number.isFinite(max), 'nose section contains sampled vertices').toBe(true);
  return max - min;
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

describe('fitted manikin nose surfaces', () => {
  it.each(ages)('uses closed outward nasal shells with finite continuous normals and bilateral symmetry for %s', age => {
    const { scene } = model(age, 0), shells = new Map();
    for (const name of noseNames) {
      const shell = weldedShell(object(scene, name)); shells.set(name, shell);
      expect(shell.finite, name).toBe(true); expect(shell.connected, name).toBe(true); expect(shell.euler, name).toBe(2);
      expect([...shell.edges.values()].every(edge => edge.count === 2 && edge.balance === 0), name + ' closed consistent triangle winding').toBe(true);
      expect(shell.volume, name + ' outward orientation').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot, name + ' normals agree with outward triangles').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999); expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot, name + ' normals meet at welded seams').toBeGreaterThan(.9999);
    }
    const nose = shells.get('fr-manikin-nose');
    for (const { position, normal } of nose.welded.values()) {
      const mirror = position.clone(); mirror.x *= -1;
      const matching = nose.welded.get(vertexKey(mirror)); expect(matching, 'symmetric nose contour').toBeTruthy();
      const reflectedNormal = normal.clone(); reflectedNormal.x *= -1;
      expect(matching.normal.dot(reflectedNormal), 'symmetric nose normals').toBeGreaterThan(.9999);
    }
    const left = shells.get('fr-manikin-nostril-left'), right = shells.get('fr-manikin-nostril-right');
    expect(left.welded.size).toBe(right.welded.size);
    for (const { position, normal } of right.welded.values()) {
      const mirror = position.clone(); mirror.x *= -1;
      const matching = left.welded.get(vertexKey(mirror)); expect(matching, 'bilateral nostril surface placement').toBeTruthy();
      const reflectedNormal = normal.clone(); reflectedNormal.x *= -1;
      expect(matching.normal.dot(reflectedNormal), 'mirrored nostril normals').toBeGreaterThan(.9999);
    }
  });

  it.each(poses)('keeps a narrow bridge and bounded rounded tip joined to the actual $age skull in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase), nose = object(fixture.scene, 'fr-manikin-nose');
    const middle = [.25, .45, .7].map(fraction => surfaceGap(nose, frontSample(nose, 0, fraction), fixture.head, fixture));
    expect(Math.min(...middle), 'bridge and tip project visibly from the actual skin').toBeGreaterThan(.006);
    expect(Math.max(...middle), 'rounded nasal relief stays bounded').toBeLessThan(.07);
    expect(middle[2], 'the tip has fuller relief than the bridge').toBeGreaterThan(middle[0] * 2);
    const shoulders = [-.94, .94].map(fraction => surfaceGap(nose, frontSample(nose, fraction, .7), fixture.head, fixture));
    expect(Math.max(...shoulders), 'tip relief tapers toward the cheeks').toBeLessThan(middle[2] * .55);
    // The sphere's equator is the join between its front and buried rear surfaces.
    const { widthSegments, heightSegments } = nose.geometry.parameters, equator = heightSegments / 2 * (widthSegments + 1);
    const perimeter = Array.from({ length: 12 }, (_, i) =>
      surfaceGap(nose, equator + Math.round(i * widthSegments / 12), fixture.head, fixture));
    expect(Math.max(...perimeter), 'the full nasal perimeter does not float above skin').toBeLessThan(.0025);
    expect(Math.min(...perimeter), 'buried perimeter joins remain close to skin').toBeGreaterThan(-.005);
    const bounds = box(nose), unit = fixture.head.scale.x / .28;
    expect((bounds.max.x - bounds.min.x) / unit, 'nose silhouette remains narrow').toBeGreaterThan(.05);
    expect((bounds.max.x - bounds.min.x) / unit, 'nose silhouette stays inside the central face').toBeLessThan(.09);
    expect((bounds.max.z - bounds.min.z) / (bounds.max.x - bounds.min.x), 'bridge stays longer than the nasal width').toBeGreaterThan(1.8);
    expect(sectionWidth(nose, .25), 'the bridge is narrower than the tip').toBeLessThan(sectionWidth(nose, .7) * .7);
  });

  it.each(poses)('fits shallow visible nostrils to actual $age nasal triangles in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase), nose = object(fixture.scene, 'fr-manikin-nose');
    for (const side of sides) {
      const nostril = object(fixture.scene, `fr-manikin-nostril-${side}`), bounds = box(nostril);
      const middle = [-.5, 0, .5].map(fraction => surfaceGap(nostril, frontSample(nostril, fraction, .5), nose, fixture));
      expect(Math.min(...middle), side + ' nostril front remains visible above the nasal surface').toBeGreaterThan(.0001);
      expect(Math.max(...middle), side + ' nostril relief stays shallow').toBeLessThan(.003);
      const edges = [[-1, .5], [1, .5], [0, 0], [0, 1]].map(([x, z]) => surfaceGap(nostril, frontSample(nostril, x, z), nose, fixture));
      expect(Math.max(...edges), side + ' boundary stays close to the actual nasal surface').toBeLessThan(.001);
      expect(Math.min(...edges), side + ' tucked boundary stays near the nasal surface').toBeGreaterThan(-.0016);
      expect(Math.max(...edges), side + ' outward relief tapers at the boundary').toBeLessThan(Math.max(...middle));
      expect((bounds.min.x + bounds.max.x) * (side === 'left' ? -1 : 1), side + ' nostril lies on its own side of the nose').toBeGreaterThan(0);
      const centreZ = (bounds.min.z + bounds.max.z) / 2, noseBounds = box(nose);
      expect(centreZ, side + ' nostril sits below the bridge').toBeGreaterThan(noseBounds.min.z + (noseBounds.max.z - noseBounds.min.z) * .7);
      expect(centreZ, side + ' nostril stays inside the nose tip').toBeLessThan(noseBounds.max.z);
    }
  });

  it.each(ages)('carries the %s nose and nostrils with the head pivot through the recovery tilt', age => {
    const before = model(age, 0), after = model(age, 8);
    expect(before.pivot.quaternion.angleTo(after.pivot.quaternion), 'airway step visibly tilts the head').toBeGreaterThan(.02);
    for (const fixture of [before, after]) for (const name of noseNames) {
      const mesh = object(fixture.scene, name); expect(mesh.parent).toBe(fixture.pivot);
      expect(mesh.matrix.elements).toEqual(new THREE.Matrix4().elements);
      expect(fixture.content.picks.includes(mesh), 'nasal detail is not an answer target').toBe(false);
      const local = point(mesh, Math.floor(mesh.geometry.attributes.position.count / 2)), world = local.clone().applyMatrix4(mesh.matrixWorld);
      expect(world.distanceTo(local.applyMatrix4(fixture.pivot.matrixWorld))).toBeLessThan(1e-8);
    }
    for (const name of noseNames) {
      const a = object(before.scene, name).geometry.attributes.position.array, b = object(after.scene, name).geometry.attributes.position.array;
      expect(Array.from(b), name + ' recovery changes pose rather than nasal shape').toEqual(Array.from(a));
    }
  });

  it.each(ages)('preserves opaque skin and distinct dark nostrils in %s app contrast', age => {
    const { scene, head } = model(age, 8, true), nose = object(scene, 'fr-manikin-nose');
    expect(head.material.type).toBe('MeshBasicMaterial'); expect(nose.material.type).toBe('MeshBasicMaterial');
    expect(nose.material.color.getHex(), 'nose retains the surrounding skin color').toBe(head.material.color.getHex());
    expect(nose.material.transparent).toBe(false); expect(nose.material.opacity).toBe(1);
    for (const side of sides) {
      const nostril = object(scene, `fr-manikin-nostril-${side}`); expect(nostril.material.type).toBe('MeshBasicMaterial');
      expect(nose.material.color.r - nostril.material.color.r, side + ' nostril remains distinct without lighting').toBeGreaterThan(.4);
      expect(nostril.material.transparent).toBe(false); expect(nostril.material.opacity).toBe(1);
    }
  });
});
