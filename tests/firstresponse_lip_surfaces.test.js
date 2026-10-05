import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const poses = ages.flatMap(age => [0, 8].map(phase => ({ age, phase })));
const lipNames = ['fr-manikin-upper-lip', 'fr-manikin-lower-lip'];
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
function frontRay(world, up, unit) {
  return new THREE.Raycaster(world.clone().addScaledVector(up, .1 * unit), up.clone().negate());
}
function skinGap(mesh, index, fixture) {
  const world = point(mesh, index).applyMatrix4(mesh.matrixWorld);
  const hit = frontRay(world, fixture.up, fixture.unit).intersectObject(fixture.head, false)[0];
  expect(hit, mesh.name + ' remains over actual skull triangles').toBeTruthy();
  return (hit.distance - .1 * fixture.unit) / fixture.unit;
}
function frontSample(mesh, fraction) {
  mesh.geometry.computeBoundingBox();
  const width = mesh.geometry.boundingBox.max.x, positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  let best = 0, cost = Infinity;
  for (let i = 0; i < positions.count; i++) {
    const next = Math.abs(positions.getX(i) / width - fraction) * 100 + (1 - normals.getY(i));
    if (next < cost) { best = i; cost = next; }
  }
  return best;
}
function weldedShell(mesh) {
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  const keys = [], welded = new Map(), edges = new Map(), adjacency = new Map();
  const centre = new THREE.Vector3();
  let minimumCoincidentDot = 1, minimumNormalLength = Infinity, maximumNormalLength = 0, finite = true;
  for (let i = 0; i < positions.count; i++) {
    const p = point(mesh, i), n = new THREE.Vector3().fromBufferAttribute(normals, i);
    finite &&= [...p.toArray(), ...n.toArray()].every(Number.isFinite);
    minimumNormalLength = Math.min(minimumNormalLength, n.length()); maximumNormalLength = Math.max(maximumNormalLength, n.length());
    const key = p.toArray().map(value => Math.round(value * 1e8)).join(','); keys.push(key);
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

describe('fitted manikin lip surfaces', () => {
  it.each(ages)('uses closed outward shells with continuous finite normals and symmetric contours for %s', age => {
    const { scene } = model(age, 0);
    for (const name of lipNames) {
      const mesh = object(scene, name), shell = weldedShell(mesh);
      expect(shell.finite, name).toBe(true); expect(shell.connected, name).toBe(true); expect(shell.euler, name).toBe(2);
      expect([...shell.edges.values()].every(edge => edge.count === 2 && edge.balance === 0), name + ' closed consistent triangle winding').toBe(true);
      expect(shell.volume, name + ' outward orientation').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot, name + ' normals agree with outward triangles').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999); expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot, name + ' normals meet at welded seams').toBeGreaterThan(.9999);
      for (const { position } of shell.welded.values()) {
        const mirrored = [-position.x, position.y, position.z].map(value => Math.round(value * 1e8)).join(',');
        expect(shell.welded.has(mirrored), name + ' bilateral surface symmetry').toBe(true);
      }
    }
  });

  it.each(poses)('keeps broad lip relief shallow and joins both corner tails to the actual $age skull in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase);
    for (const name of lipNames) {
      const mesh = object(fixture.scene, name), middle = [-.75, -.5, 0, .5, .75].map(fraction => skinGap(mesh, frontSample(mesh, fraction), fixture));
      expect(Math.min(...middle), name + ' visible front relief').toBeGreaterThan(.001);
      expect(Math.max(...middle), name + ' bounded front relief').toBeLessThan(.012);
      const shoulders = [-.95, .95].map(fraction => skinGap(mesh, frontSample(mesh, fraction), fixture));
      const tails = [-.995, -1, .995, 1].map(fraction => skinGap(mesh, frontSample(mesh, fraction), fixture));
      expect(Math.max(...shoulders), name + ' relief tapers toward corners').toBeLessThan(Math.max(...middle) / 2);
      expect(Math.max(...tails), name + ' corners do not float above skin').toBeLessThan(.0015);
      expect(Math.min(...tails), name + ' corner joins remain near skin').toBeGreaterThan(-.0025);
      expect(Math.max(...tails.map(Math.abs)), name + ' tapered endpoints').toBeLessThan(Math.max(...middle) / 2);
    }
  });

  it.each(poses)('keeps the thin mouth seam visible between both lips for $age in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase), seam = object(fixture.scene, 'fr-manikin-mouth');
    const lips = lipNames.map(name => object(fixture.scene, name));
    for (const fraction of [.25, .5, .75]) {
      const local = seam.geometry.parameters.path.getPoint(fraction), world = local.clone().applyMatrix4(seam.matrixWorld);
      const ray = frontRay(world, fixture.up, fixture.unit), seamHit = ray.intersectObject(seam, false)[0];
      expect(seamHit, 'mouth seam visible from the face front').toBeTruthy();
      const skinHit = ray.intersectObject(fixture.head, false)[0]; expect(skinHit).toBeTruthy();
      expect(skinHit.distance - seamHit.distance, 'seam above actual skin').toBeGreaterThan(.0005 * fixture.unit);
      expect(skinHit.distance - seamHit.distance, 'seam stays close to skin').toBeLessThan(.004 * fixture.unit);
      for (const lip of lips) {
        const hit = ray.intersectObject(lip, false)[0];
        if (hit) expect(hit.distance, lip.name + ' does not obscure the seam').toBeGreaterThan(seamHit.distance + .0005 * fixture.unit);
      }
      const upper = point(lips[0], frontSample(lips[0], (fraction - .5) * 2));
      const lower = point(lips[1], frontSample(lips[1], (fraction - .5) * 2));
      expect(upper.z, 'upper lip stays above the seam along the face').toBeLessThan(local.z);
      expect(lower.z, 'lower lip stays below the seam along the face').toBeGreaterThan(local.z);
      expect(lower.z - upper.z, 'seam stays thinner than the lip surface').toBeGreaterThan(seam.geometry.parameters.radius * 4);
    }
  });

  it.each(ages)('carries the %s lip surfaces with the head pivot through the recovery tilt', age => {
    const before = model(age, 0), after = model(age, 8);
    expect(before.pivot.quaternion.angleTo(after.pivot.quaternion), 'airway step visibly tilts the head').toBeGreaterThan(.02);
    for (const fixture of [before, after]) for (const name of [...lipNames, 'fr-manikin-mouth']) {
      const mesh = object(fixture.scene, name); expect(mesh.parent).toBe(fixture.pivot);
      expect(mesh.matrix.elements).toEqual(new THREE.Matrix4().elements);
      expect(fixture.content.picks.includes(mesh), 'facial detail is not an answer target').toBe(false);
      const local = point(mesh, Math.floor(mesh.geometry.attributes.position.count / 2));
      const world = local.clone().applyMatrix4(mesh.matrixWorld);
      expect(world.distanceTo(local.applyMatrix4(fixture.pivot.matrixWorld))).toBeLessThan(1e-8);
    }
    for (const name of lipNames) {
      const a = object(before.scene, name).geometry.attributes.position.array, b = object(after.scene, name).geometry.attributes.position.array;
      expect(Array.from(b), name + ' recovery changes pose rather than lip shape').toEqual(Array.from(a));
    }
  });

  it.each(ages)('preserves distinct flat colors for skin, lips and seam in %s app contrast', age => {
    const { scene, head } = model(age, 8, true), seam = object(scene, 'fr-manikin-mouth');
    expect(head.material.type).toBe('MeshBasicMaterial'); expect(seam.material.type).toBe('MeshBasicMaterial');
    for (const name of lipNames) {
      const lip = object(scene, name); expect(lip.material.type).toBe('MeshBasicMaterial');
      expect(head.material.color.r - lip.material.color.r, 'lip remains distinct from skin without lighting').toBeGreaterThan(.25);
      expect(lip.material.color.r - seam.material.color.r, 'closed seam remains distinct from lips without lighting').toBeGreaterThan(.05);
      expect(lip.material.transparent).toBe(false); expect(lip.material.opacity).toBe(1);
    }
  });
});
