import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const poses = ages.flatMap(age => [0, 8].map(phase => ({ age, phase })));
const sides = ['left', 'right'];
const browNames = sides.map(side => `fr-manikin-brow-${side}`);
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
function bounds(mesh) { return box(mesh); }
// Find front samples from the mesh's own width and outward normals.
function frontSample(mesh, fraction) {
  const limits = bounds(mesh), centre = (limits.min.x + limits.max.x) / 2;
  const halfWidth = (limits.max.x - limits.min.x) / 2;
  const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
  let best = 0, cost = Infinity;
  for (let i = 0; i < positions.count; i++) {
    const next = Math.abs((positions.getX(i) - centre) / halfWidth - fraction) * 100 + 1 - normals.getY(i);
    if (next < cost) { best = i; cost = next; }
  }
  return best;
}
function sectionWidth(mesh, fraction) {
  const limits = bounds(mesh), centre = (limits.min.x + limits.max.x) / 2;
  const halfWidth = (limits.max.x - limits.min.x) / 2, positions = mesh.geometry.attributes.position;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs((positions.getX(i) - centre) / halfWidth - fraction) < .02) {
      min = Math.min(min, positions.getZ(i)); max = Math.max(max, positions.getZ(i));
    }
  }
  expect(Number.isFinite(min) && Number.isFinite(max), 'brow section contains actual vertices').toBe(true);
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

describe('fitted manikin brow surfaces', () => {
  it.each(ages)('uses closed outward brow shells with continuous finite normals and exact bilateral contours for %s', age => {
    const { scene } = model(age, 0), shells = new Map();
    for (const name of browNames) {
      const shell = weldedShell(object(scene, name)); shells.set(name, shell);
      expect(shell.finite, name).toBe(true); expect(shell.connected, name).toBe(true); expect(shell.euler, name).toBe(2);
      expect([...shell.edges.values()].every(edge => edge.count === 2 && edge.balance === 0), name + ' closed consistent triangle winding').toBe(true);
      expect(shell.volume, name + ' outward orientation').toBeGreaterThan(0);
      expect(shell.minimumFaceNormalDot, name + ' normals agree with outward triangles').toBeGreaterThan(0);
      expect(shell.minimumNormalLength).toBeGreaterThan(.9999); expect(shell.maximumNormalLength).toBeLessThan(1.0001);
      expect(shell.minimumCoincidentDot, name + ' normals meet at welded seams').toBeGreaterThan(.9999);
    }
    const left = shells.get('fr-manikin-brow-left'), right = shells.get('fr-manikin-brow-right');
    expect(left.welded.size).toBe(right.welded.size);
    for (const { position, normal } of right.welded.values()) {
      const mirror = position.clone(); mirror.x *= -1;
      const matching = left.welded.get(vertexKey(mirror)); expect(matching, 'bilateral brow contour').toBeTruthy();
      const reflectedNormal = normal.clone(); reflectedNormal.x *= -1;
      expect(matching.normal.dot(reflectedNormal), 'mirrored brow normals').toBeGreaterThan(.9999);
    }
  });

  it.each(poses)('keeps shallow arched brow relief and tapered joins on the actual $age skull in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase), headUnit = fixture.head.scale.x / .28;
    for (const name of browNames) {
      const mesh = object(fixture.scene, name);
      const middle = [-.65, -.4, 0, .4, .65].map(fraction => surfaceGap(mesh, frontSample(mesh, fraction), fixture.head, fixture));
      expect(Math.min(...middle), name + ' central brow relief remains visible above actual skin').toBeGreaterThan(.0001);
      expect(Math.max(...middle), name + ' front relief remains shallow').toBeLessThan(.006);
      const shoulders = [-.97, .97].map(fraction => surfaceGap(mesh, frontSample(mesh, fraction), fixture.head, fixture));
      const tails = [-1, 1].map(fraction => surfaceGap(mesh, frontSample(mesh, fraction), fixture.head, fixture));
      expect(Math.max(...shoulders), name + ' relief tapers toward the ends').toBeLessThan(Math.max(...middle) * .65);
      expect(Math.max(...tails), name + ' endpoints settle beneath the skin').toBeLessThan(-.0008);
      expect(Math.min(...tails), name + ' endpoint joins remain close to skin').toBeGreaterThan(-.004);
      expect(Math.max(...tails), name + ' outward relief diminishes at the ends').toBeLessThan(Math.max(...middle) * .5);
      // The source sphere's Y equator marks the front/rear join around the entire fitted shell.
      const { widthSegments, heightSegments } = mesh.geometry.parameters, equator = heightSegments / 2 * (widthSegments + 1);
      const joins = Array.from({ length: 24 }, (_, i) => surfaceGap(mesh,
        equator + Math.round(i * widthSegments / 24), fixture.head, fixture));
      // Mirrored brows use the lower skull facet on either side. The boundary
      // remains buried while allowing the two triangulated sides to differ.
      expect(Math.max(...joins), name + ' complete brow boundary remains beneath actual skull triangles').toBeLessThan(-.0008);
      expect(Math.min(...joins), name + ' tucked boundary stays near actual skin').toBeGreaterThan(-.004);
      const centre = point(mesh, frontSample(mesh, 0)), ends = [-1, 1].map(fraction => point(mesh, frontSample(mesh, fraction)));
      expect(centre.z, name + ' middle retains a visible natural arch').toBeLessThan(Math.min(...ends.map(p => p.z)) - .002 * headUnit);
      const limits = bounds(mesh);
      expect((limits.max.x - limits.min.x) / headUnit, name + ' brow remains localized above one eye').toBeGreaterThan(.09);
      expect((limits.max.x - limits.min.x) / headUnit).toBeLessThan(.14);
      expect(sectionWidth(mesh, 0), name + ' surface narrows toward both endpoints').toBeGreaterThan(Math.max(sectionWidth(mesh, -.85), sectionWidth(mesh, .85)) * 1.5);
    }
  });

  it.each(poses)('keeps both brow surfaces separate from actual $age eyelids and closed eye seams in pose $phase', ({ age, phase }) => {
    const fixture = model(age, phase), headUnit = fixture.head.scale.x / .28;
    for (const side of sides) {
      const brow = object(fixture.scene, 'fr-manikin-brow-' + side), browBounds = bounds(brow);
      const upper = object(fixture.scene, 'fr-manikin-upper-lid-' + side), lower = object(fixture.scene, 'fr-manikin-lower-lid-' + side);
      const seam = object(fixture.scene, 'fr-manikin-eye-' + side);
      for (const mesh of [upper, lower, seam]) {
        expect(bounds(mesh).min.z - browBounds.max.z, brow.name + ' full vertex contour stays above ' + mesh.name).toBeGreaterThan(.008 * headUnit);
      }
      expect(browBounds.min.x * (side === 'left' ? -1 : 1) > 0 && browBounds.max.x * (side === 'left' ? -1 : 1) > 0,
        side + ' brow remains on its own side of the face').toBe(true);
      for (const fraction of [.25, .5, .75]) {
        const local = seam.geometry.parameters.path.getPoint(fraction), world = local.clone().applyMatrix4(seam.matrixWorld);
        const ray = frontRay(world, fixture), eyeHit = ray.intersectObject(seam, false)[0];
        expect(eyeHit, side + ' actual closed eye seam remains visible').toBeTruthy();
        const hit = ray.intersectObject(brow, false)[0];
        if (hit) expect(hit.distance, side + ' brow does not obscure the closed eye seam').toBeGreaterThan(eyeHit.distance + .0005 * fixture.unit);
      }
    }
  });

  it.each(ages)('carries the %s brow surfaces with the head pivot without changing their shape through recovery', age => {
    const before = model(age, 0), after = model(age, 8);
    expect(before.pivot.quaternion.angleTo(after.pivot.quaternion), 'airway step visibly tilts the head').toBeGreaterThan(.02);
    for (const fixture of [before, after]) for (const name of browNames) {
      const mesh = object(fixture.scene, name); expect(mesh.parent).toBe(fixture.pivot);
      expect(mesh.matrix.elements).toEqual(new THREE.Matrix4().elements);
      expect(fixture.content.picks.includes(mesh), 'brow detail is not an answer target').toBe(false);
      const local = point(mesh, frontSample(mesh, 0)), world = local.clone().applyMatrix4(mesh.matrixWorld);
      expect(world.distanceTo(local.applyMatrix4(fixture.pivot.matrixWorld))).toBeLessThan(1e-8);
    }
    for (const name of browNames) {
      const a = object(before.scene, name), b = object(after.scene, name);
      for (const attribute of ['position', 'normal']) expect(Array.from(b.geometry.attributes[attribute].array), name + ' recovery preserves local ' + attribute).toEqual(Array.from(a.geometry.attributes[attribute].array));
      expect(Array.from(b.geometry.index.array), name + ' recovery preserves triangle connectivity').toEqual(Array.from(a.geometry.index.array));
      const first = point(a, frontSample(a, 0)).applyMatrix4(a.matrixWorld), last = point(b, frontSample(b, 0)).applyMatrix4(b.matrixWorld);
      expect(first.distanceTo(last), name + ' actual surface follows visible head movement').toBeGreaterThan(.002 * before.unit);
    }
  });

  it.each(ages)('preserves opaque distinct brow detail and fitted geometry in %s app contrast', age => {
    const standard = model(age, 8), contrast = model(age, 8, true);
    expect(contrast.head.material.type).toBe('MeshBasicMaterial');
    for (const side of sides) {
      const name = 'fr-manikin-brow-' + side, brow = object(contrast.scene, name), ordinary = object(standard.scene, name);
      const seam = object(contrast.scene, 'fr-manikin-eye-' + side);
      expect(brow.material.type).toBe('MeshBasicMaterial');
      expect(contrast.head.material.color.r - brow.material.color.r, side + ' brow remains distinct without lighting').toBeGreaterThan(.4);
      expect(brow.material.color.getHex(), side + ' eyebrow retains the eye detail contrast').toBe(seam.material.color.getHex());
      expect(brow.material.transparent).toBe(false); expect(brow.material.opacity).toBe(1);
      for (const attribute of ['position', 'normal']) expect(Array.from(brow.geometry.attributes[attribute].array), side + ' contrast retains local ' + attribute).toEqual(Array.from(ordinary.geometry.attributes[attribute].array));
      expect(Array.from(brow.geometry.index.array), side + ' contrast retains closed topology').toEqual(Array.from(ordinary.geometry.index.array));
    }
  });
});
