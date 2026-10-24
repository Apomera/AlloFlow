import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function nativeFunction(name, indent) {
  const start = ' '.repeat(indent) + 'function ' + name + '(';
  const a = source.indexOf(start), b = source.indexOf('\n' + ' '.repeat(indent) + 'function ', a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing native dorsal-spine function: ' + name);
  return source.slice(a, b);
}
const registration = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(registration)) throw new Error('Missing Dino Lab registration');
window.StemLab = { registerTool() {} };
const nativeApiNames = [...new Set([...source.matchAll(/^  function (\w+)\(/gm)].map(match => match[1]))];
new Function(source.replace(registration,
  'globalThis.__dorsalSpineNative = { DINOS, skeletalAnatomyProfileFor, ' + nativeApiNames.join(',') + ' };' + registration))();
const art = globalThis.__dorsalSpineNative;
delete globalThis.__dorsalSpineNative;
const geometryFor = new Function(nativeFunction('dinoDorsalSpineGeometry', 2) + '\nreturn dinoDorsalSpineGeometry;')();
const callerCode = nativeFunction('addDorsalSpine', 12);
const chainCode = nativeFunction('addVertebralChain', 12);
const nativeHelpers = ['addBone', 'addTaperedBoneSegment', 'addSkeletonEllipsoid'].map(name => nativeFunction(name, 12)).join('\n');
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const at = (attribute, index) => vec().fromBufferAttribute(attribute, index);
const nearVector = (actual, expected, tolerance = 1e-6) => expect(actual.distanceTo(expected)).toBeLessThan(tolerance);
function disposeModel(model) { model.traverse(part => part.geometry?.dispose()); }
function ringCenter(geometry, row) {
  const center = vec();
  for (let column = 0; column < 16; column++) center.add(at(geometry.attributes.position, row * 16 + column));
  return center.divideScalar(16);
}

describe('Dino Lab dorsal neural spine geometry', () => {
  for (const scale of [.025, 1, 15]) for (const dimensions of [[.1, .02, .009], [.03, .004, .003], [.4, .02, .008]]) {
    it('closes an oriented surface at scale ' + scale + ' for dimensions ' + dimensions, () => {
      const [length, startRadius, endRadius] = dimensions.map(x => x * scale);
      const geometry = geometryFor(THREE, length, startRadius, endRadius);
      try {
        const p = geometry.attributes.position, n = geometry.attributes.normal, indices = geometry.index.array;
        const tolerance = scale * 1e-8;
        expect(geometry.userData.dinoDorsalSpineSurface).toEqual({ lengthSegments: 20, radialSegments: 16 });
        expect(p.count).toBe(338); expect(n.count).toBe(p.count); expect(indices.length / 3).toBe(640);
        const keys = Array.from({ length: p.count }, (_, i) => at(p, i).toArray().map(x => Math.round(x / tolerance)).join(','));
        const edges = new Map(); let volume = 0;
        for (let i = 0; i < p.count; i++) {
          const point = at(p, i), normal = at(n, i);
          expect(point.toArray().every(Number.isFinite)).toBe(true); expect(normal.toArray().every(Number.isFinite)).toBe(true);
          expect(Math.abs(normal.length() - 1)).toBeLessThan(2e-6);
          expect(geometry.boundingBox.containsPoint(point)).toBe(true);
          expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + tolerance);
        }
        for (let i = 0; i < indices.length; i += 3) {
          const ids = Array.from(indices.slice(i, i + 3)), a = at(p, ids[0]), b = at(p, ids[1]), c = at(p, ids[2]);
          const face = b.clone().sub(a).cross(c.clone().sub(a));
          expect(face.length()).toBeGreaterThan(scale * scale * 1e-10);
          expect(face.dot(at(n, ids[0]).add(at(n, ids[1])).add(at(n, ids[2])))).toBeGreaterThan(0);
          volume += a.dot(b.clone().cross(c)) / 6;
          for (let j = 0; j < 3; j++) {
            const from = keys[ids[j]], to = keys[ids[(j + 1) % 3]], key = [from, to].sort().join('|');
            const edge = edges.get(key) || { count: 0, direction: 0 };
            edge.count++; edge.direction += from < to ? 1 : -1; edges.set(key, edge);
          }
        }
        expect(volume).toBeGreaterThan(0);
        for (const edge of edges.values()) expect(edge).toEqual({ count: 2, direction: 0 });
        expect(new Set(keys).size - edges.size + indices.length / 3).toBe(2);
        for (let column = 0; column < 16; column++) {
          const root = at(p, column);
          expect(root.y).toBeCloseTo(-length / 2, 7); expect(Math.hypot(root.x, root.z)).toBeCloseTo(startRadius, 7);
        }
        nearVector(at(p, 320), vec(0, length / 2), scale * 1e-7);
      } finally { geometry.dispose(); }
    });
  }

  it('broadens and flattens above the circular root, then closes in a rounded crown', () => {
    const length = .1, startRadius = .02, endRadius = .009, geometry = geometryFor(THREE, length, startRadius, endRadius);
    try {
      const p = geometry.attributes.position;
      nearVector(ringCenter(geometry, 0), vec(0, -length / 2));
      nearVector(ringCenter(geometry, 10), vec());
      const midWidth = Math.abs(p.getX(160)), midDepth = Math.abs(p.getZ(164)), oldMidRadius = (startRadius + endRadius) / 2;
      expect(midWidth).toBeGreaterThan(oldMidRadius * 2); expect(midDepth).toBeLessThan(oldMidRadius);
      expect(midWidth / midDepth).toBeGreaterThan(3);
      let previousY = -Infinity;
      for (let row = 0; row < 20; row++) {
        const center = ringCenter(geometry, row); expect(center.y).toBeGreaterThan(previousY); previousY = center.y;
        for (let column = 0; column < 16; column++) {
          const point = at(p, row * 16 + column), opposite = at(p, row * 16 + (column + 8) % 16);
          nearVector(point.clone().add(opposite), center.clone().multiplyScalar(2));
          expect(Math.abs(point.x)).toBeLessThanOrEqual(Math.max(startRadius * 2.1, endRadius * 3.5) + 1e-7);
          expect(Math.abs(point.z)).toBeLessThanOrEqual(Math.max(startRadius, endRadius) + 1e-7);
        }
      }
      expect(Math.abs(p.getX(19 * 16))).toBeLessThan(Math.abs(p.getX(17 * 16)));
      expect(Math.abs(p.getZ(19 * 16 + 4))).toBeLessThan(Math.abs(p.getZ(17 * 16 + 4)));
      nearVector(at(p, 320), vec(0, length / 2));
      expect(geometry.boundingBox.min.y).toBeCloseTo(-length / 2, 7);
      expect(geometry.boundingBox.max.y).toBeCloseTo(length / 2, 7);
    } finally { geometry.dispose(); }
  });

  it('shares seam indices and keeps the attachment cap separate from the side normals', () => {
    const geometry = geometryFor(THREE, .1, .02, .009);
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal, ids = Array.from(geometry.index.array);
      expect(new Set(Array.from({ length: 320 }, (_, i) => at(p, i).toArray().join(','))).size).toBe(320);
      for (let row = 0; row < 19; row++) {
        const seam = [row * 16, row * 16 + 15, (row + 1) * 16, (row + 1) * 16 + 15];
        let triangles = 0;
        for (let i = 0; i < 19 * 16 * 6; i += 3) if (ids.slice(i, i + 3).every(id => seam.includes(id))) triangles++;
        expect(triangles).toBe(2);
      }
      expect(Math.max(...ids.slice(0, (19 * 32 + 16) * 3))).toBe(320);
      for (let i = 321; i < p.count; i++) {
        expect(p.getY(i)).toBeCloseTo(-.05, 7); nearVector(at(n, i), vec(0, -1, 0));
      }
      expect(at(n, 0).dot(vec(0, -1, 0))).toBeLessThan(.95);
      nearVector(at(n, 320), vec(0, 1, 0));
    } finally { geometry.dispose(); }
  });

  it('rejects invalid dimensions before allocating geometry', () => {
    let allocations = 0;
    const guarded = { ...THREE, BufferGeometry: class { constructor() { allocations++; throw new Error('Unexpected allocation'); } } };
    for (const invalid of [0, -.1, NaN, Infinity]) for (let i = 0; i < 3; i++) {
      const dimensions = [.1, .02, .009]; dimensions[i] = invalid;
      expect(geometryFor(guarded, ...dimensions)).toBeNull();
    }
    expect(allocations).toBe(0);
  });

  it('keeps geometry and metadata independent between spine meshes', () => {
    const first = geometryFor(THREE, .1, .02, .009), second = geometryFor(THREE, .1, .02, .009);
    try {
      expect(first).not.toBe(second); expect(first.attributes.position.array).not.toBe(second.attributes.position.array);
      expect(first.userData.dinoDorsalSpineSurface).not.toBe(second.userData.dinoDorsalSpineSurface);
      first.attributes.position.array[0] = 42; first.userData.dinoDorsalSpineSurface.radialSegments = 4;
      expect(second.attributes.position.getX(0)).toBeCloseTo(.02, 7);
      expect(second.userData.dinoDorsalSpineSurface.radialSegments).toBe(16);
    } finally { first.dispose(); second.dispose(); }
  });
});

function caller({ showSkeleton = true, helper = geometryFor } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), calls = [];
  const context = { THREE, model, boneMat, props: { showSkeleton }, dinoDorsalSpineGeometry(...args) { calls.push(args); return helper(...args); } };
  const add = new Function('context', 'with (context) {' + callerCode + '\nreturn addDorsalSpine;}')(context);
  return { add, model, boneMat, calls, dispose() { disposeModel(model); boneMat.dispose(); } };
}

describe('Dino Lab native dorsal spine caller', () => {
  for (const scale of [.025, 1, 15]) for (const direction of [[0, 1, 0], [0, -1, 0], [.3, -.4, .7]]) {
    it('preserves both axial endpoints at scale ' + scale + ' toward ' + direction, () => {
      const built = caller(), a = vec(-.7, 1.8, .4).multiplyScalar(scale), b = a.clone().add(vec(...direction).normalize().multiplyScalar(.1 * scale));
      const before = [a.toArray(), b.toArray()], material = new THREE.MeshStandardMaterial();
      try {
        const spine = built.add(a, b, .02 * scale, .009 * scale, material);
        expect(built.model.children).toEqual([spine]); expect(built.calls).toHaveLength(1);
        expect(spine.name).toBe('dorsal-neural-spine'); expect(spine.material).toBe(material); expect(spine.castShadow).toBe(true);
        expect(spine.scale.toArray()).toEqual([1, 1, 1]); nearVector(spine.position, a.clone().lerp(b, .5), scale * 1e-6);
        spine.updateMatrixWorld(true);
        nearVector(ringCenter(spine.geometry, 0).applyMatrix4(spine.matrixWorld), a, scale * 1e-6);
        nearVector(at(spine.geometry.attributes.position, 320).applyMatrix4(spine.matrixWorld), b, scale * 1e-6);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(spine.matrixWorld);
        nearVector(at(spine.geometry.attributes.normal, 321).applyMatrix3(normalMatrix).normalize(), b.clone().sub(a).normalize().negate(), 1e-6);
        expect([a.toArray(), b.toArray()]).toEqual(before);
        expect(spine.userData.dinoDorsalSpine).toEqual({ start: before[0], end: before[1], startRadius: .02 * scale, endRadius: .009 * scale });
        spine.userData.dinoDorsalSpine.start[0] = 900; expect([a.toArray(), b.toArray()]).toEqual(before);
      } finally { built.dispose(); material.dispose(); }
    });
  }

  it('uses the bone material by default', () => {
    const built = caller();
    try { expect(built.add(vec(), vec(0, .1), .02, .009).material).toBe(built.boneMat); }
    finally { built.dispose(); }
  });

  it('does no geometry work with the skeleton hidden', () => {
    const built = caller({ showSkeleton: false, helper() { throw new Error('Hidden geometry allocation'); } });
    try {
      expect(built.add(vec(), vec(0, .1), .02, .009)).toBeNull();
      expect(built.model.children).toHaveLength(0); expect(built.calls).toHaveLength(0);
    } finally { built.dispose(); }
  });

  it('leaves the model empty for invalid axes, dimensions or rejected helper geometry', () => {
    const built = caller(), rejected = caller({ helper() { return null; } });
    try {
      for (const end of [vec(), vec(Infinity), vec(NaN)]) expect(built.add(vec(), end, .02, .009)).toBeNull();
      for (const invalid of [0, -.1, NaN, Infinity]) for (const i of [0, 1]) {
        const radii = [.02, .009]; radii[i] = invalid;
        expect(built.add(vec(), vec(0, .1), ...radii)).toBeNull();
      }
      expect(rejected.add(vec(), vec(0, .1), .02, .009)).toBeNull();
      expect(built.model.children).toHaveLength(0); expect(rejected.model.children).toHaveLength(0);
    } finally { built.dispose(); rejected.dispose(); }
  });
});

function nativeChain({ scale = 1, region = 'dorsal', reverse = false, legacy = false, showSkeleton = true, collapsed = false } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), jointMat = new THREE.MeshStandardMaterial();
  const start = vec(reverse ? 1 : -1, 2, .1).multiplyScalar(scale), end = collapsed ? start.clone() : vec(reverse ? -1 : 1, 2.15, -.1).multiplyScalar(scale);
  const dn = art.DINOS.find(species => species.id === 'tyrannosaurus');
  const context = { THREE, vec, ...art, model, boneMat, jointMat, dn, props: { showSkeleton },
    len: 8 * scale, ht: 3 * scale, bodyHeight: .58 * scale, shoulder: start.clone(), head: end.clone(),
    skeletalProfile: { ...art.skeletalAnatomyProfileFor(dn), proximalCaudalProcessCount: 3 },
    dinoDorsalSpineGeometry: geometryFor };
  const legacyReplacement = legacy ? '\naddDorsalSpine = function(a,b,r0,r1,m) { var spine = addTaperedBoneSegment(a,b,r0,r1,m); if (spine) spine.userData.legacyDorsalSpine = true; return spine; };\n' : '';
  const add = new Function('context', 'with (context) {' + nativeHelpers + callerCode + chainCode + legacyReplacement + '\nreturn addVertebralChain;}')(context);
  add(start, end, 8, .05 * scale, .055 * scale, 1.55, region);
  return { context, model, start, end, dispose() { disposeModel(model); boneMat.dispose(); jointMat.dispose(); } };
}
function snapshot(mesh, context) {
  return { type: mesh.geometry.type, parameters: mesh.geometry.parameters, position: mesh.position.toArray(), scale: mesh.scale.toArray(), quaternion: mesh.quaternion.toArray(),
    castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, renderOrder: mesh.renderOrder, material: mesh.material === context.boneMat ? 'bone' : 'joint',
    positions: Array.from(mesh.geometry.attributes.position.array), normals: Array.from(mesh.geometry.attributes.normal.array), indices: Array.from(mesh.geometry.index.array) };
}

describe('Dino Lab native vertebral chain integration', () => {
  for (const options of [{ scale: .025 }, { scale: 1 }, { scale: 15 }, { scale: 1, reverse: true }]) {
    it('preserves arch roots and every other dorsal-chain mesh for ' + JSON.stringify(options), () => {
      const built = nativeChain(options), legacy = nativeChain({ ...options, legacy: true });
      try {
        const spines = built.model.children.filter(mesh => mesh.userData.dinoDorsalSpine), oldSpines = legacy.model.children.filter(mesh => mesh.userData.legacyDorsalSpine);
        expect(spines).toHaveLength(7); expect(oldSpines).toHaveLength(7); expect(built.model.children).toHaveLength(60);
        for (const [i, spine] of spines.entries()) {
          const old = oldSpines[i], metadata = spine.userData.dinoDorsalSpine, radius = (.05 + .005 * (i + 1) / 8) * options.scale;
          const expectedCenter = built.start.clone().lerp(built.end, (i + 1) / 8).add(vec(0, radius * .82, 0));
          nearVector(vec(...metadata.start), expectedCenter, options.scale * 1e-6);
          nearVector(vec(...metadata.end), expectedCenter.clone().add(vec(0, radius * 1.55, 0)), options.scale * 1e-6);
          expect(spine.position.toArray()).toEqual(old.position.toArray()); expect(spine.quaternion.toArray()).toEqual(old.quaternion.toArray());
          expect(spine.scale.toArray()).toEqual(old.scale.toArray()); expect(spine.castShadow).toBe(old.castShadow);
          expect(metadata.startRadius).toBe(old.geometry.parameters.radiusBottom); expect(metadata.endRadius).toBe(old.geometry.parameters.radiusTop);
          const index = built.model.children.indexOf(spine), supports = built.model.children.slice(index - 2, index);
          spine.updateMatrixWorld(true);
          nearVector(ringCenter(spine.geometry, 0).applyMatrix4(spine.matrixWorld), expectedCenter, options.scale * 1e-6);
          for (const [sideIndex, support] of supports.entries()) {
            expect(support.geometry.type).toBe('CylinderGeometry'); support.updateMatrixWorld(true);
            const supportEnd = vec(0, support.geometry.parameters.height / 2).applyMatrix4(support.matrixWorld);
            nearVector(supportEnd, expectedCenter.clone().add(vec(0, 0, (sideIndex ? 1 : -1) * radius * .22)), options.scale * 1e-6);
            // Preserve the existing root/arch relation, including the small endpoint offset;
            // the separate arch legs do not imply their centers lie inside the root disk.
            expect(supportEnd.distanceTo(expectedCenter)).toBeCloseTo(radius * .22, 7);
            expect(Math.max(0, radius * .22 - metadata.startRadius)).toBe(Math.max(0, radius * .22 - old.geometry.parameters.radiusBottom));
          }
        }
        const remaining = built.model.children.filter(mesh => !mesh.userData.dinoDorsalSpine);
        const oldRemaining = legacy.model.children.filter(mesh => !mesh.userData.legacyDorsalSpine);
        expect(remaining.map(mesh => snapshot(mesh, built.context))).toEqual(oldRemaining.map(mesh => snapshot(mesh, legacy.context)));
        const triangles = model => model.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);
        expect(triangles(built.model) - triangles(legacy.model)).toBe(7 * 592);
      } finally { built.dispose(); legacy.dispose(); }
    });
  }

  for (const region of ['cervical', 'caudal']) {
    it('keeps every ' + region + ' chain mesh unchanged', () => {
      const built = nativeChain({ region }), legacy = nativeChain({ region, legacy: true });
      try {
        expect(built.model.children.filter(mesh => mesh.userData.dinoDorsalSpine)).toHaveLength(0);
        expect(legacy.model.children.filter(mesh => mesh.userData.legacyDorsalSpine)).toHaveLength(0);
        expect(built.model.children).toHaveLength(region === 'cervical' ? 54 : 60);
        expect(built.model.children.map(mesh => snapshot(mesh, built.context))).toEqual(legacy.model.children.map(mesh => snapshot(mesh, legacy.context)));
      } finally { built.dispose(); legacy.dispose(); }
    });
  }

  it('retains hidden-skeleton and collapsed-chain gates', () => {
    const hidden = nativeChain({ showSkeleton: false }), collapsed = nativeChain({ collapsed: true });
    try { expect(hidden.model.children).toHaveLength(0); expect(collapsed.model.children).toHaveLength(0); }
    finally { hidden.dispose(); collapsed.dispose(); }
  });
});
