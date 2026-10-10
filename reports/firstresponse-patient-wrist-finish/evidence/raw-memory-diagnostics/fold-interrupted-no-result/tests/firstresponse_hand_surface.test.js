import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const THREE = {};
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const ages = ['adult', 'child', 'infant'];
const scenes = [];
let build, previousRegistry;

beforeAll(() => {
  previousRegistry = window.StemLab;
  window.StemLab = {
    _registry: {}, isRegistered: () => false,
    makeBayViewer(config) {
      build = config.buildScene;
      return { attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status: () => 'failed' };
    },
    registerTool(id, config) { this._registry[id] = config; },
  };
  new Function(source)();
  expect(build).toBeTypeOf('function');
});
afterEach(() => {
  for (const scene of scenes.splice(0)) {
    scene.traverse(object => {
      object.geometry?.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material?.dispose();
    });
  }
});
afterAll(() => { window.StemLab = previousRegistry; });

function model(age, tab = 'depth', phase = 0) {
  const scene = new THREE.Scene();
  scenes.push(scene);
  const content = build(THREE, {
    scene, phase, dark: true, contrast: false, wantShadow: false,
    trim: color => new THREE.MeshPhongMaterial({ color }), sceneProps: { tab, age },
  });
  return (settings = {}) => {
    content.frame(0, { depthLab: { age, ...settings }, childHands: 'two' }, true);
    scene.updateMatrixWorld(true);
    return scene;
  };
}

function object(scene, name) {
  const found = scene.getObjectByName(name);
  expect(found, name).toBeTruthy();
  return found;
}
function vertices(mesh, reference = null) {
  const matrix = reference
    ? new THREE.Matrix4().copy(reference.matrixWorld).invert().multiply(mesh.matrixWorld)
    : mesh.matrixWorld;
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, index) =>
    new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(matrix));
}
function skinMeshes(scene) {
  const found = [];
  scene.traverse(mesh => {
    if (/^fr-(patient-(left|right)|rescuer-(lower|upper))-(finger-[0-3]|thumb)-surface$/.test(mesh.name)) found.push(mesh);
  });
  return found;
}
function surfaceGap(point, skin, outward, offset) {
  const hit = new THREE.Raycaster(point.clone().addScaledVector(outward, offset), outward.clone().negate())
    .intersectObject(skin, false)[0];
  expect(hit, skin.name + ' did not meet the detail ray').toBeTruthy();
  return hit.distance - offset;
}
function assertNailFit(scene, prefix) {
  const hand = object(scene, prefix);
  const scale = hand.getWorldScale(new THREE.Vector3()).x;
  const handPrefix = prefix.replace(/-hand$/, '');
  for (const digit of ['finger-0', 'finger-1', 'finger-2', 'finger-3', 'thumb']) {
    const nail = object(scene, handPrefix + (digit === 'thumb' ? '-thumb-nail' : '-nail-' + digit.slice(-1)));
    const skin = object(scene, handPrefix + '-' + digit + '-surface');
    const outward = new THREE.Vector3(0, 1, 0).transformDirection(nail.matrixWorld);
    for (const point of vertices(nail)) {
      const gap = surfaceGap(point, skin, outward, .06 * scale);
      expect(gap, nail.name + ' sinks into the finger').toBeGreaterThan(-.0008 * scale);
      expect(gap, nail.name + ' floats above the finger').toBeLessThan(.004 * scale);
    }
  }
}

function assertClosed(mesh) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  expect(position.array.every(Number.isFinite), mesh.name + ' positions').toBe(true);
  expect(normal.array.every(Number.isFinite), mesh.name + ' normals').toBe(true);
  for (let i = 0; i < normal.count; i++) {
    expect(new THREE.Vector3().fromBufferAttribute(normal, i).length(), mesh.name + ' unit normal').toBeCloseTo(1, 5);
  }

  // Welding geometric positions catches holes even when a render seam uses
  // duplicate vertices. Degenerate pole triangles do not bound a surface.
  const points = Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i));
  const keys = points.map(point => point.toArray().map(value => Math.round(value * 1e7)).join(','));
  const indices = geometry.index ? Array.from(geometry.index.array) : points.map((_, i) => i);
  const edges = new Map();
  let volume = 0, triangles = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = indices.slice(i, i + 3);
    const cross = points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
    if (cross.lengthSq() < 1e-20) continue;
    triangles++;
    volume += points[a].dot(points[b].clone().cross(points[c])) / 6;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const key = [keys[from], keys[to]].sort().join('|');
      const edge = edges.get(key) || { count: 0, winding: 0 };
      edge.count++;
      edge.winding += keys[from] < keys[to] ? 1 : -1;
      edges.set(key, edge);
    }
  }
  expect(triangles, mesh.name + ' skin triangles').toBeGreaterThan(100);
  expect(volume, mesh.name + ' outward winding').toBeGreaterThan(0);
  for (const edge of edges.values()) {
    expect(edge.count, mesh.name + ' open or non-manifold edge').toBe(2);
    expect(edge.winding, mesh.name + ' inconsistent triangle winding').toBe(0);
  }
}

function assertMirror(left, right, leftHand, rightHand) {
  const expected = vertices(left, leftHand).map(point => new THREE.Vector3(-point.x, point.y, point.z));
  const actual = vertices(right, rightHand);
  expect(actual.length, right.name + ' mirrored vertex count').toBe(expected.length);
  for (const point of expected) {
    const nearest = Math.min(...actual.map(candidate => point.distanceToSquared(candidate)));
    expect(Math.sqrt(nearest), right.name + ' mirrored surface').toBeLessThan(1e-5);
  }
}

describe('First Response hand skin surfaces', () => {
  it.each(ages)('uses closed, outward-facing finger and thumb surfaces with finite normals for %s', age => {
    const scene = model(age)();
    const surfaces = skinMeshes(scene);
    expect(surfaces).toHaveLength(age === 'infant' ? 15 : 20);
    for (const surface of surfaces) assertClosed(surface);
  });

  it.each(ages)('keeps every patient nail fitted to actual skin through recovery poses for %s', age => {
    for (const phase of [0, 2, 5, 8]) {
      const scene = model(age, 'recovery', phase)();
      for (const side of ['left', 'right']) assertNailFit(scene, 'fr-patient-' + side + '-hand');
    }
  });

  it.each(ages)('keeps every rescuer nail fitted through chest compression and release for %s', age => {
    const sample = model(age);
    for (const motion of ['release', 'press']) {
      const scene = sample({ motion });
      for (const side of age === 'infant' ? ['lower'] : ['lower', 'upper']) assertNailFit(scene, 'fr-rescuer-' + side);
    }
  });

  it.each(ages)('mirrors patient fingers, thumbs and nails between the two hands for %s', age => {
    const scene = model(age, 'recovery', 8)();
    const leftHand = object(scene, 'fr-patient-left-hand'), rightHand = object(scene, 'fr-patient-right-hand');
    for (let i = 0; i < 4; i++) {
      assertMirror(object(scene, 'fr-patient-left-finger-' + i + '-surface'), object(scene, 'fr-patient-right-finger-' + (3 - i) + '-surface'), leftHand, rightHand);
      assertMirror(object(scene, 'fr-patient-left-nail-' + i), object(scene, 'fr-patient-right-nail-' + (3 - i)), leftHand, rightHand);
    }
    for (const suffix of ['thumb-surface', 'thumb-nail']) assertMirror(object(scene, 'fr-patient-left-' + suffix), object(scene, 'fr-patient-right-' + suffix), leftHand, rightHand);
    const leftCrease = object(scene, 'fr-patient-left-palm-crease');
    const rightCrease = object(scene, 'fr-patient-right-palm-crease');
    const rightPoints = rightCrease.geometry.parameters.path.getPoints(32);
    for (const [index, local] of leftCrease.geometry.parameters.path.getPoints(32).entries()) {
      const expected = leftHand.worldToLocal(local.clone().applyMatrix4(leftCrease.matrixWorld));
      expected.x *= -1;
      const actual = rightHand.worldToLocal(rightPoints[index].clone().applyMatrix4(rightCrease.matrixWorld));
      expect(expected.distanceTo(actual), 'primary palm crease mirrored skin path').toBeLessThan(1e-5);
    }
  });

  it.each(['adult', 'child'])('mirrors the upper and lower rescuer digits and nails for %s', age => {
    const scene = model(age)();
    const lower = object(scene, 'fr-rescuer-lower'), upper = object(scene, 'fr-rescuer-upper');
    for (let i = 0; i < 4; i++) {
      assertMirror(object(scene, 'fr-rescuer-lower-finger-' + i + '-surface'), object(scene, 'fr-rescuer-upper-finger-' + (3 - i) + '-surface'), lower, upper);
      assertMirror(object(scene, 'fr-rescuer-lower-nail-' + i), object(scene, 'fr-rescuer-upper-nail-' + (3 - i)), lower, upper);
    }
    for (const suffix of ['thumb-surface', 'thumb-nail']) assertMirror(object(scene, 'fr-rescuer-lower-' + suffix), object(scene, 'fr-rescuer-upper-' + suffix), lower, upper);
  });

  it.each(ages)('makes the thumb-adjacent index finger longer than the little finger on every hand for %s', age => {
    const scene = model(age)();
    const prefixes = ['fr-patient-left', 'fr-patient-right', 'fr-rescuer-lower', ...(age === 'infant' ? [] : ['fr-rescuer-upper'])];
    for (const prefix of prefixes) {
      const hand = object(scene, prefix + (prefix.includes('patient') ? '-hand' : ''));
      const thumb = object(scene, prefix + '-thumb-tip').getWorldPosition(new THREE.Vector3());
      hand.worldToLocal(thumb);
      const fingers = Array.from({ length: 4 }, (_, i) => {
        const points = vertices(object(scene, prefix + '-finger-' + i + '-surface'), hand);
        const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
        const z = points.map(point => point.z);
        return { distance: Math.abs(x - thumb.x), length: Math.max(...z) - Math.min(...z) };
      }).sort((a, b) => a.distance - b.distance);
      expect(fingers[0].length - fingers[3].length, prefix + ' index/little anatomy').toBeGreaterThan(.008);
    }
  });

  it.each(ages)('keeps the entire rescuer hand above the chest contact plane for %s', age => {
    const sample = model(age);
    for (const motion of ['release', 'press']) {
      const scene = sample({ motion });
      const contactY = object(scene, 'fr-depth-marker').position.y;
      for (const side of age === 'infant' ? ['lower'] : ['lower', 'upper']) {
        const hand = object(scene, 'fr-rescuer-' + side);
        hand.traverse(mesh => {
          if (!mesh.geometry) return;
          for (const point of vertices(mesh)) expect(point.y, mesh.name + ' chest clearance').toBeGreaterThan(contactY - 1e-6);
        });
      }
    }
  });

  it.each(ages)('fits the palm crease to actual patient skin after recovery rotation for %s', age => {
    for (const phase of [0, 2, 8]) {
      const scene = model(age, 'recovery', phase)();
      for (const side of ['left', 'right']) {
        const prefix = 'fr-patient-' + side;
        const hand = object(scene, prefix + '-hand'), skin = object(scene, prefix + '-palm');
        const crease = object(scene, prefix + '-palm-crease');
        const outward = new THREE.Vector3(0, 1, 0).transformDirection(hand.matrixWorld);
        const scale = hand.getWorldScale(new THREE.Vector3()).x;
        for (const local of crease.geometry.parameters.path.getPoints(32)) {
          const gap = surfaceGap(local.clone().applyMatrix4(crease.matrixWorld), skin, outward, .06 * scale);
          expect(gap, crease.name + ' skin fit').toBeGreaterThan(-.001 * scale);
          expect(gap, crease.name + ' skin fit').toBeLessThan(.004 * scale);
        }
      }
    }
  });
});
