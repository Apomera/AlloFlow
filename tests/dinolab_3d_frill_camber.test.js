import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FRILL_CAMBER_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const previousSeam = "      return new THREE.Vector3(y * 0.60 + bow * r*r + height * 0.024 * (1-r*r),y,Math.cos(angle) * width * r * edge);";
const currentSeam = "      var point = new THREE.Vector3(y * 0.60 + bow * r*r + height * 0.024 * (1-r*r),y,Math.cos(angle) * width * r * edge);\n      if (solidCollar) {\n        // A shallow upper-sheet dish lets light describe the existing frill volume.\n        // Keep the skull root, lower sheet and rim fixed; this camber is interpretive.\n        var crown = Math.max(0, Math.sin(angle));\n        crown = crown*crown*(3-2*crown);\n        var interior = 6.75 * r*r * Math.pow(1-r*r, 2);\n        point.addScaledVector(normal, -height * 0.06 * interior * crown);\n      }\n      return point;";
if (source.split(currentSeam).length !== 2) throw new Error('The reviewed frill camber seam is missing or duplicated');
const baselineSource = source.replace(currentSeam, previousSeam);
function capture(text) {
  const anchor = "window.StemLab.registerTool('dinoLab'";
  if (!text.includes(anchor)) throw new Error('Dino Lab registration anchor missing');
  window.StemLab = { registerTool() {} };
  const nativeTopLevelNames=[...new Set([...text.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]))];
  new Function(text.replace(anchor, 'globalThis.__dinoFrillCamber = { DINOS, skeletalAnatomyProfileFor, ' + nativeTopLevelNames.join(',') + ' };' + anchor))();
  const result = globalThis.__dinoFrillCamber; delete globalThis.__dinoFrillCamber; return result;
}
const art = capture(source), oldArt = capture(baselineSource);
const normal = new THREE.Vector3(1, -.60, 0).normalize();
const sides = 128, backOffset = 1 + 9 * sides;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
function block(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker), end = text.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error('Actual construction seam missing: ' + startMarker);
  return text.slice(start, end);
}
const inContext = (code, result, context) => new Function('context', 'with (context) {' + code + 'return ' + result + ';}')(context);
function setup(scale = 1, bodyDepth = .70, bowLength = 8, id = 'triceratops') {
  const dn = art.DINOS.find(dino => dino.id === id);
  if (!dn) throw new Error('Catalog species missing: ' + id);
  const profile = art.cranialSurfaceProfileFor(dn);
  return { scale, dn, profile, ht: 3 * scale, len: bowLength * scale, bodyDepth: bodyDepth * scale,
    head: vec(-2.4, 1.78, 0).multiplyScalar(scale), height: .6 * profile.frillScale * scale,
    width: bodyDepth * .86 * profile.frillScale * scale, bow: bowLength * .010 * scale };
}
function geometryPair(data, solidCollar) {
  if (arguments.length < 2) solidCollar = true;
  return [art.dinoFrillGeometry(THREE, data.height, data.width, data.bow, solidCollar), oldArt.dinoFrillGeometry(THREE, data.height, data.width, data.bow, solidCollar)];
}
function geometryEqual(actual, old) {
  for (const name of ['position', 'normal', 'uv']) expect(actual.attributes[name].array).toEqual(old.attributes[name].array);
  expect(actual.index.array).toEqual(old.index.array);
  expect(actual.boundingBox.min.toArray()).toEqual(old.boundingBox.min.toArray()); expect(actual.boundingBox.max.toArray()).toEqual(old.boundingBox.max.toArray());
  expect(actual.boundingSphere.center.toArray()).toEqual(old.boundingSphere.center.toArray()); expect(actual.boundingSphere.radius).toBe(old.boundingSphere.radius);
  expect(actual.userData).toEqual(old.userData);
}
function vertexLocation(index) {
  if (index === 0 || index === backOffset) return { center: true, stationary: true };
  const front = index > backOffset ? index - backOffset : index, ring = Math.floor((front - 1) / sides), side = (front - 1) % sides;
  return { ring, side, stationary: ring === 8 || side === 0 || side >= sides / 2 };
}
function manifold(geometry) {
  const p = geometry.attributes.position, index = geometry.index.array, edges = new Map();
  let minArea = Infinity, volume = 0, reversedSheetTriangles = 0;
  for (let i = 0; i < index.length; i += 3) {
    const a = vec(0, 0, 0).fromBufferAttribute(p, index[i]), b = vec(0, 0, 0).fromBufferAttribute(p, index[i + 1]), c = vec(0, 0, 0).fromBufferAttribute(p, index[i + 2]);
    const cross = b.clone().sub(a).cross(c.clone().sub(a)); minArea = Math.min(minArea, cross.length() * .5);
    volume += a.dot(b.clone().cross(c)) / 6;
    if (cross.dot(normal) * (i < index.length / 2 ? 1 : -1) <= 0) reversedSheetTriangles++;
    const tri = [index[i], index[i + 1], index[i + 2]];
    for (let side = 0; side < 3; side++) {
      const x = tri[side], y = tri[(side + 1) % 3], key = x < y ? x + ',' + y : y + ',' + x;
      const old = edges.get(key) || { count: 0, orientation: 0 };
      old.count++; old.orientation += x < y ? 1 : -1; edges.set(key, old);
    }
  }
  return { minArea, volume, reversedSheetTriangles, edges: Array.from(edges.values()) };
}
function caller(data, isBone = false, baseline = false, hasFrill = true) {
  const model = new THREE.Group(), bodyMat = new THREE.MeshBasicMaterial(), boneMat = new THREE.MeshBasicMaterial();
  const context = { ...(baseline ? oldArt : art), THREE, vec, model, head: data.head, len: data.len, ht: data.ht, bodyDepth: data.bodyDepth, surfaceBodyDepth: data.bodyDepth,
    cranialSurface: data.profile, props: { species: data.dn }, boneMat,
    hasAnatomyPart: id => id === 'frill' && hasFrill,
    dinoFrillGeometry: (baseline ? oldArt : art).dinoFrillGeometry, dinoBonyFrillGeometry: (baseline ? oldArt : art).dinoBonyFrillGeometry, dinoStyracosaurusBonyFrillGeometry: (baseline ? oldArt : art).dinoStyracosaurusBonyFrillGeometry, dinoProtoceratopsFrillGeometry: (baseline ? oldArt : art).dinoProtoceratopsFrillGeometry, cranialMotionParts: [] };
  context.ceratopsidCranium=art.dinoCeratopsidCraniumFrame(THREE,data.dn,data.head,data.len,data.ht);
  context.dinoMarkSpecialPart = inContext(block(source, 'function dinoMarkSpecialPart(mesh, id) {', 'function dinoTagSpecialParts(before, id) {'), 'dinoMarkSpecialPart', context);
  const motion = inContext(block(source, 'function registerCranialMotion(part) {', 'scene.add(model);'), '({registerCranialMotion, captureCranialMotion})', context);
  const build = inContext(block(source, 'function addFrillSurface(mat, size) {', 'var hasHighSail ='), 'addFrillSurface', context);
  const before = model.children.slice(), mesh = build(isBone ? boneMat : bodyMat, isBone ? .95 : 1);
  motion.captureCranialMotion(before); model.updateMatrixWorld(true);
  return { data, mesh, model, bodyMat, boneMat, registered: context.cranialMotionParts, isBone };
}
function disposeBuilt(built) {
  if (built.mesh) { built.mesh.geometry.dispose(); if (built.mesh.material !== built.bodyMat && built.mesh.material !== built.boneMat) built.mesh.material.dispose(); }
  built.bodyMat.dispose(); built.boneMat.dispose();
}
function inside(mesh, point, tolerance) {
  const hits = new THREE.Raycaster(point, vec(1, .371, .217).normalize()).intersectObject(mesh, false), distances = [];
  for (const hit of hits) if (hit.distance > tolerance && !distances.some(distance => Math.abs(distance - hit.distance) < tolerance)) distances.push(hit.distance);
  return distances.length % 2 === 1;
}

describe('Dino Lab bounded Triceratops frill camber', () => {
  it('keeps false, absent and other truthy solidCollar inputs byte-identical to the prior native shell', () => {
    for (const gate of [false, undefined, null, 0, 1, 'true', {}, []]) {
      const [geometry, old] = geometryPair(setup(), gate);
      try { geometryEqual(geometry, old); } finally { geometry.dispose(); old.dispose(); }
    }
  });

  for (const scale of [.03, 1, 12]) for (const [bodyDepth, bowLength] of [[.60, 4], [1.04, 12]]) {
    it('forms a bounded closed outward camber at scale ' + scale + ', body depth ' + bodyDepth + ', bow length ' + bowLength, () => {
      const data = setup(scale, bodyDepth, bowLength), [geometry, old] = geometryPair(data);
      try {
        expect(geometry.attributes.position.count).toBe(2178); expect(geometry.index.count).toBe(13056);
        expect(geometry.attributes.uv.array).toEqual(old.attributes.uv.array); expect(geometry.index.array).toEqual(old.index.array);
        const p = geometry.attributes.position, n = geometry.attributes.normal, before = old.attributes.position;
        let changed = 0, peak = 0, maxNormalError = 0;
        for (let index = 0; index < p.count; index++) {
          const point = vec(0, 0, 0).fromBufferAttribute(p, index), oldPoint = vec(0, 0, 0).fromBufferAttribute(before, index), delta = point.clone().sub(oldPoint), location = vertexLocation(index);
          expect(point.toArray().every(Number.isFinite)).toBe(true); expect(vec(0, 0, 0).fromBufferAttribute(n, index).toArray().every(Number.isFinite)).toBe(true);
          expect(p.getZ(index)).toBe(before.getZ(index));
          if (location.stationary) expect(point.toArray()).toEqual(oldPoint.toArray());
          else {
            expect(delta.dot(normal)).toBeLessThanOrEqual(scale * 1e-6);
            expect(delta.clone().addScaledVector(normal, -delta.dot(normal)).length()).toBeLessThan(scale * 1e-6);
            expect(delta.length()).toBeLessThanOrEqual(data.height * .06 + scale * 1e-6);
            if (delta.length() > data.height * .001) changed++; peak = Math.max(peak, delta.length());
          }
          expect(geometry.boundingBox.containsPoint(point)).toBe(true);
          expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-6);
          maxNormalError = Math.max(maxNormalError, Math.abs(vec(0, 0, 0).fromBufferAttribute(n, index).length() - 1));
        }
        expect(changed).toBeGreaterThan(200); expect(peak).toBeGreaterThan(data.height * .045); expect(maxNormalError).toBeLessThan(1e-6);
        const topology = manifold(geometry);
        expect(topology.minArea).toBeGreaterThan(data.height * data.width * 1e-7); expect(topology.volume).toBeGreaterThan(0);
        expect(topology.edges.every(edge => edge.count === 2 && edge.orientation === 0)).toBe(true);
        expect(topology.reversedSheetTriangles).toBe(0);
        expect(geometry.userData).toEqual(old.userData);
      } finally { geometry.dispose(); old.dispose(); }
    });
  }

  it('preserves the vector thickness of all corresponding faces and shares the exact original perimeter', () => {
    for (const scale of [.03, 1, 12]) for (const [bodyDepth, bowLength] of [[.60, 4], [1.04, 12]]) {
      const data = setup(scale, bodyDepth, bowLength), [geometry, old] = geometryPair(data), p = geometry.attributes.position, before = old.attributes.position;
      try {
        for (let index = 0; index <= 8 * sides; index++) {
          const thickness = vec(0, 0, 0).fromBufferAttribute(p, index).sub(vec(0, 0, 0).fromBufferAttribute(p, index + backOffset));
          const previous = vec(0, 0, 0).fromBufferAttribute(before, index).sub(vec(0, 0, 0).fromBufferAttribute(before, index + backOffset));
          expect(thickness.distanceTo(previous)).toBeLessThan(scale * 1e-6); expect(thickness.dot(normal)).toBeGreaterThan(0);
        }
        for (let index = 1 + 8 * sides; index <= 9 * sides; index++) expect(vec(0, 0, 0).fromBufferAttribute(p, index).toArray()).toEqual(vec(0, 0, 0).fromBufferAttribute(before, index).toArray());
      } finally { geometry.dispose(); old.dispose(); }
    }
  });

  it('constructs body and bone frills in the shared life envelope with their material and tag contracts', () => {
    for (const isBone of [false, true]) {
      const data = setup(), built = caller(data, isBone), old = caller(data, isBone, true);
      try {
        expect(built.model.children).toHaveLength(1); expect(built.mesh.position.toArray()).toEqual([0, 0, 0]);
        expect(built.mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]); expect(built.mesh.scale.toArray()).toEqual([1, 1, 1]);
        expect(built.mesh.userData.dinoFeature).toBe('frill'); expect(built.mesh.userData.dinoPartIds).toEqual(['frill']); expect(built.mesh.userData.dinoRegion).toBe('head');
        expect(built.mesh.castShadow).toBe(true); expect(built.mesh.receiveShadow).toBe(true); expect(built.registered).toEqual([built.mesh]);
        expect(built.mesh.userData.dinoMotionParent).toBe('cranial');
        expect(built.mesh.material === built.bodyMat).toBe(!isBone);
        if (isBone) { expect(built.mesh.material === built.boneMat).toBe(false); expect(built.mesh.material.side).toBe(THREE.DoubleSide); expect(built.boneMat.side).toBe(THREE.FrontSide); }
        const p = built.mesh.geometry.attributes.position, uv = built.mesh.geometry.attributes.uv;
        for (let index=0; index<p.count; index++) if (uv.getY(index)<=.5) expect(vec(0,0,0).fromBufferAttribute(p,index).toArray()).toEqual(vec(0,0,0).fromBufferAttribute(old.mesh.geometry.attributes.position,index).toArray());
      } finally { disposeBuilt(built); disposeBuilt(old); }
    }
  });

  for (const id of ['styracosaurus', 'protoceratops']) {
    it('keeps the actual non-solid ' + id + ' caller geometry byte-identical in both display modes', () => {
      for (const isBone of [false, true]) {
        const built = caller(setup(1, .70, 8, id), isBone), old = caller(setup(1, .70, 8, id), isBone, true);
        try { geometryEqual(built.mesh.geometry, old.mesh.geometry); } finally { disposeBuilt(built); disposeBuilt(old); }
      }
    });
  }

  it('creates no geometry or motion registration when the frill anatomy part is absent', () => {
    const built = caller(setup(), false, false, false);
    try { expect(built.mesh).toBe(null); expect(built.model.children).toHaveLength(0); expect(built.registered).toHaveLength(0); }
    finally { disposeBuilt(built); }
  });

  it('moves both interpreted frill meshes rigidly through the established cranial shoulder transform', () => {
    for (const isBone of [false, true]) {
      const built = caller(setup(), isBone), saved = built.mesh.geometry.attributes.position.array.slice();
      const rig = new THREE.Group(), neck = new THREE.Object3D(), pivot = vec(-1.44, 1.285056, 0), rest = neck.quaternion.clone();
      built.model.add(rig, neck); rig.add(built.mesh); neck.position.copy(pivot); neck.rotation.set(.04, .08, .02);
      try {
        art.dinoConnectedCranialPose(THREE, rig, pivot, neck, rest); built.model.updateMatrixWorld(true);
        let error = 0;
        for (let index = 0; index < built.mesh.geometry.attributes.position.count; index++) {
          const point = vec(0, 0, 0).fromBufferAttribute(built.mesh.geometry.attributes.position, index);
          const expected = point.clone().sub(pivot).applyQuaternion(neck.quaternion).add(pivot), actual = point.applyMatrix4(built.mesh.matrixWorld);
          error = Math.max(error, expected.distanceTo(actual));
        }
        expect(error).toBeLessThan(1e-6); expect(built.mesh.geometry.attributes.position.array).toEqual(saved);
      } finally { disposeBuilt(built); }
    }
  });

});
