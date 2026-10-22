import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration="window.StemLab.registerTool('dinoLab'";
window.StemLab={registerTool(){}};
const nativeTopLevelNames=[...new Set([...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]))];
new Function(source.replace(registration,'globalThis.__scapularNative={DINOS,skeletalAnatomyProfileFor,'+nativeTopLevelNames.join(',')+'};'+registration))();
const art=globalThis.__scapularNative;delete globalThis.__scapularNative;

function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing native scapular section: ' + start);
  return source.slice(a, b);
}
function nativeFunction(name, indent) {
  const start = ' '.repeat(indent) + 'function ' + name + '(';
  return section(start, '\n' + ' '.repeat(indent) + 'function ');
}
const geometryFor = new Function(nativeFunction('dinoScapularBladeGeometry', 2) + '\nreturn dinoScapularBladeGeometry;')();
const callerCode = nativeFunction('addScapularBlade', 12);
const nativeHelpers = ['addTaperedBoneSegment', 'addGirdleBlade', 'addSkeletonEllipsoid'].map(name => nativeFunction(name, 12)).join('\n');
const shoulderCode = section('              var shoulderHalf = Math.max(0.13 * detailScale, bodyDepth * 0.66);', '              if (skeletalProfile.sternalPlates) {');
const pelvisCode = section('              var reviewedPelvicProfile=dinoDromaeosaurPelvisProfileFor(dn);', '              } // Legacy cage and girdles are bypassed');
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const at = (attribute, index) => vec().fromBufferAttribute(attribute, index);
const nearVector = (actual, expected, tolerance = 1e-6) => expect(actual.distanceTo(expected)).toBeLessThan(tolerance);
function ringCenter(geometry, row) {
  const center = vec(), sides = geometry.userData.dinoScapularSurface.radialSegments;
  for (let column = 0; column < sides; column++) center.add(at(geometry.attributes.position, row * sides + column));
  return center.divideScalar(sides);
}
function disposeModel(model) { model.traverse(part => part.geometry?.dispose()); }

describe('Dino Lab scapular blade surface', () => {
  it('forms a closed, outward oriented manifold with no collapsed triangles', () => {
    const geometry = geometryFor(THREE);
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal, indices = geometry.index.array;
      expect(geometry.userData.dinoScapularSurface).toEqual({ lengthSegments: 24, radialSegments: 24 });
      expect(p.count).toBe(602); expect(n.count).toBe(p.count); expect(indices.length / 3).toBe(1152);
      const keys = Array.from({ length: p.count }, (_, i) => at(p, i).toArray().map(x => Math.round(x / 1e-7)).join(','));
      const edges = new Map(); let volume = 0;
      for (let i = 0; i < p.count; i++) {
        expect(at(p, i).toArray().every(Number.isFinite)).toBe(true);
        expect(at(n, i).toArray().every(Number.isFinite)).toBe(true);
        expect(Math.abs(at(n, i).length() - 1)).toBeLessThan(2e-6);
      }
      for (let i = 0; i < indices.length; i += 3) {
        const ids = Array.from(indices.slice(i, i + 3)), a = at(p, ids[0]), b = at(p, ids[1]), c = at(p, ids[2]);
        const face = b.clone().sub(a).cross(c.clone().sub(a));
        expect(face.length()).toBeGreaterThan(1e-7);
        expect(face.dot(at(n, ids[0]).add(at(n, ids[1])).add(at(n, ids[2])))).toBeGreaterThan(0);
        volume += a.dot(b.clone().cross(c)) / 6;
        for (let j = 0; j < 3; j++) {
          const from = keys[ids[j]], to = keys[ids[(j + 1) % 3]], key = [from, to].sort().join('|');
          const edge = edges.get(key) || { count: 0, direction: 0 };
          edge.count++; edge.direction += from < to ? 1 : -1; edges.set(key, edge);
        }
      }
      expect(volume).toBeGreaterThan(2); expect(volume).toBeLessThan(8);
      for (const edge of edges.values()) expect(edge).toEqual({ count: 2, direction: 0 });
      expect(new Set(keys).size - edges.size + indices.length / 3).toBe(2);
    } finally { geometry.dispose(); }
  });

  it('has a broad symmetric blade, a finite attachment root and a single rounded tip', () => {
    const geometry = geometryFor(THREE);
    try {
      const p = geometry.attributes.position, rows = 24, sides = 24;
      nearVector(at(p, 0), vec(.34, -1, 0));
      nearVector(at(p, 6), vec(0, -1, -.62));
      nearVector(at(p, 12 * sides), vec(1, 0, 0));
      nearVector(at(p, 12 * sides + 6), vec(0, 0, -1));
      nearVector(at(p, rows * sides), vec(0, 1, 0));
      let previousY = -Infinity;
      for (let row = 0; row < rows; row++) {
        const center = ringCenter(geometry, row);
        expect(center.y).toBeGreaterThan(previousY); expect(center.y).toBeLessThan(1);
        expect(Math.abs(center.x)).toBeLessThan(1e-7); expect(Math.abs(center.z)).toBeLessThan(1e-7);
        previousY = center.y;
        for (let column = 0; column < sides; column++) {
          const point = at(p, row * sides + column), opposite = at(p, row * sides + (column + sides / 2) % sides);
          nearVector(point.clone().add(opposite), center.clone().multiplyScalar(2));
          expect(Math.abs(point.x)).toBeLessThanOrEqual(1); expect(Math.abs(point.z)).toBeLessThanOrEqual(1);
          expect(Math.abs(point.y - center.y)).toBeLessThan(1e-7);
        }
      }
      // The mid-blade shoulders spread more broadly than the former circular cross-section.
      expect(at(p, 12 * sides + 3).z).toBeLessThan(-.75);
      expect(at(p, (rows - 1) * sides).x).toBeLessThan(.2);
      expect(geometry.boundingBox.min.toArray()).toEqual([-1, -1, -1]);
      expect(geometry.boundingBox.max.toArray()).toEqual([1, 1, 1]);
      for (let i = 0; i < p.count; i++) {
        const point = at(p, i);
        expect(geometry.boundingBox.containsPoint(point)).toBe(true);
        expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + 1e-6);
      }
    } finally { geometry.dispose(); }
  });

  it('shares sidewall vertices across the angular seam and isolates flat attachment-cap normals', () => {
    const geometry = geometryFor(THREE);
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal, ids = geometry.index.array;
      const sides = 24, rows = 24, pole = sides * rows, sideTriangleCount = (rows - 1) * sides * 2 + sides;
      expect(new Set(Array.from({ length: pole }, (_, i) => at(p, i).toArray().join(','))).size).toBe(pole);
      const sideIds = Array.from(ids.slice(0, sideTriangleCount * 3));
      expect(Math.max(...sideIds)).toBe(pole);
      for (let row = 0; row < rows - 1; row++) {
        const seam = [row * sides, row * sides + sides - 1, (row + 1) * sides, (row + 1) * sides + sides - 1];
        let joined = 0;
        for (let i = 0; i < sideIds.length; i += 3) {
          const triangle = sideIds.slice(i, i + 3);
          if (triangle.every(id => seam.includes(id))) joined++;
        }
        expect(joined).toBe(2);
        expect(at(n, row * sides).dot(at(n, row * sides + sides - 1))).toBeGreaterThan(.8);
      }
      // All cap vertices remain at the root plane with analytic outward normals.
      for (let i = pole + 1; i < p.count; i++) {
        expect(p.getY(i)).toBe(-1); nearVector(at(n, i), vec(0, -1, 0));
      }
      expect(at(n, 0).dot(vec(0, -1, 0))).toBeLessThan(.95);
      nearVector(at(n, pole), vec(0, 1, 0));
    } finally { geometry.dispose(); }
  });

  it('returns independent disposable geometry and metadata for each blade', () => {
    const first = geometryFor(THREE), second = geometryFor(THREE);
    try {
      expect(first).not.toBe(second); expect(first.attributes.position.array).not.toBe(second.attributes.position.array);
      expect(first.userData.dinoScapularSurface).not.toBe(second.userData.dinoScapularSurface);
      first.attributes.position.array[0] = 42; first.userData.dinoScapularSurface.radialSegments = 4;
      expect(second.attributes.position.getX(0)).toBeCloseTo(.34, 6);
      expect(second.userData.dinoScapularSurface.radialSegments).toBe(24);
    } finally { first.dispose(); second.dispose(); }
  });
});

function caller({ showSkeleton = true, girdleDetail = true, helper = geometryFor } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), calls = [];
  const context = { THREE, model, boneMat, props: { showSkeleton }, skeletalProfile: { girdleDetail },
    dinoScapularBladeGeometry(...args) { calls.push(args); return helper(...args); } };
  const add = new Function('context', 'with (context) {' + callerCode + '\nreturn addScapularBlade;}')(context);
  return { add, model, boneMat, calls, dispose() { disposeModel(model); boneMat.dispose(); } };
}

describe('Dino Lab native scapular caller', () => {
  for (const scale of [.025, 1, 15]) for (const direction of [[0, 1, 0], [0, -1, 0], [.3, -.4, .7]]) {
    it('preserves endpoints and dimensions at scale ' + scale + ' toward ' + direction, () => {
      const built = caller(), a = vec(-.7, 1.8, .4).multiplyScalar(scale), b = a.clone().add(vec(...direction).normalize().multiplyScalar(.6 * scale));
      const before = [a.toArray(), b.toArray()], material = new THREE.MeshStandardMaterial();
      try {
        const blade = built.add(a, b, .15 * scale, .025 * scale, material);
        expect(built.model.children).toEqual([blade]); expect(built.calls).toHaveLength(1);
        expect(blade.name).toBe('scapular-blade'); expect(blade.material).toBe(material); expect(blade.castShadow).toBe(true);
        expect(blade.scale.toArray()).toEqual([.15 * scale, a.distanceTo(b) / 2, .025 * scale]);
        nearVector(blade.position, a.clone().lerp(b, .5), scale * 1e-6);
        blade.updateMatrixWorld(true);
        nearVector(vec(0, -1, 0).applyMatrix4(blade.matrixWorld), a, scale * 1e-6);
        nearVector(vec(0, 1, 0).applyMatrix4(blade.matrixWorld), b, scale * 1e-6);
        nearVector(ringCenter(blade.geometry, 0).applyMatrix4(blade.matrixWorld), a, scale * 1e-6);
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(blade.matrixWorld);
        for (let i = 0; i < blade.geometry.attributes.normal.count; i++) {
          const normal = at(blade.geometry.attributes.normal, i).applyMatrix3(normalMatrix).normalize();
          expect(normal.toArray().every(Number.isFinite)).toBe(true); expect(normal.length()).toBeCloseTo(1, 6);
        }
        expect([a.toArray(), b.toArray()]).toEqual(before);
        expect(blade.userData.dinoScapularBlade).toEqual({ start: before[0], end: before[1], width: .15 * scale, thickness: .025 * scale });
        blade.userData.dinoScapularBlade.start[0] = 900;
        expect([a.toArray(), b.toArray()]).toEqual(before);
      } finally { built.dispose(); material.dispose(); }
    });
  }

  it('uses the bone material by default', () => {
    const built = caller();
    try { expect(built.add(vec(), vec(0, 1), .1, .02).material).toBe(built.boneMat); }
    finally { built.dispose(); }
  });

  it('skips all allocations when skeleton or girdle detail is disabled', () => {
    for (const options of [{ showSkeleton: false }, { girdleDetail: false }]) {
      const built = caller({ ...options, helper() { throw new Error('Disabled geometry allocation'); } });
      try {
        expect(built.add(vec(), vec(0, 1), .1, .02)).toBeNull();
        expect(built.model.children).toHaveLength(0); expect(built.calls).toHaveLength(0);
      } finally { built.dispose(); }
    }
  });

  it('rejects nonfinite or collapsed axes and nonpositive dimensions before allocation', () => {
    const built = caller({ helper() { throw new Error('Invalid geometry allocation'); } });
    try {
      for (const end of [vec(), vec(Infinity), vec(NaN)]) expect(built.add(vec(), end, .1, .02)).toBeNull();
      for (const start of [vec(Infinity), vec(NaN)]) expect(built.add(start, vec(), .1, .02)).toBeNull();
      for (const invalid of [0, -.1, NaN, Infinity]) for (const dimension of [0, 1]) {
        const sizes = [.1, .02]; sizes[dimension] = invalid;
        expect(built.add(vec(), vec(0, 1), ...sizes)).toBeNull();
      }
      expect(built.model.children).toHaveLength(0); expect(built.calls).toHaveLength(0);
    } finally { built.dispose(); }
  });
});

function nativeGirdles({ scale = 1, broad = false, girdleDetail = true, legacy = false } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), skeletonCavityMat = new THREE.MeshStandardMaterial();
  const dn=art.DINOS.find(d=>d.id==='ceratosaurus');
  if(!dn)throw Error('Missing native unreviewed girdle control');
  const context = { ...art, THREE, vec, dn, isSauropod:false, posture:{footReach:1}, model, boneMat, skeletonCavityMat, props: { showSkeleton: true },
    detailScale: scale, ht: 2 * scale, len: 4 * scale, bodyHeight: (broad ? 1.8 : 1) * scale, bodyDepth: (broad ? .8 : .5) * scale,
    shoulder: vec(-1, 2, 0).multiplyScalar(scale), hip: vec(1, 2, 0).multiplyScalar(scale),
    skeletalProfile: { girdleDetail, scapularBladeScale: broad ? 1.22 : 1, coracoidPlateScale: 1, pubisMode: 'posterior', pubisScale: 1, supracetabularShelfScale: 1, prepubicProcess: true },
    dinoScapularBladeGeometry: geometryFor };
  const legacyReplacement = legacy ? '\naddScapularBlade = function(a,b,w,t,m) { var blade = addGirdleBlade(a,b,w,t,m); if (blade) blade.userData.legacyScapularBlade = true; return blade; };\n' : '';
  new Function('context', 'with (context) {' + nativeHelpers + callerCode + legacyReplacement + shoulderCode + pelvisCode + '}')(context);
  return { context, model, dispose() { disposeModel(model); boneMat.dispose(); skeletonCavityMat.dispose(); } };
}
function meshSnapshot(mesh, context) {
  return { type: mesh.geometry.type, parameters: mesh.geometry.parameters, position: mesh.position.toArray(), scale: mesh.scale.toArray(),
    quaternion: mesh.quaternion.toArray(), castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, renderOrder: mesh.renderOrder,
    material: mesh.material === context.boneMat ? 'bone' : 'cavity',
    positions: Array.from(mesh.geometry.attributes.position.array), normals: Array.from(mesh.geometry.attributes.normal.array), indices: Array.from(mesh.geometry.index.array) };
}

describe('Dino Lab native shoulder and pelvic integration', () => {
  for (const options of [{ scale: .025 }, { scale: 1 }, { scale: 15 }, { scale: 1, broad: true }]) {
    it('seats two blades on their supporting shafts and preserves neighboring girdles for ' + JSON.stringify(options), () => {
      const built = nativeGirdles(options), legacy = nativeGirdles({ ...options, legacy: true });
      try {
        const blades = built.model.children.filter(mesh => mesh.userData.dinoScapularBlade);
        const oldBlades = legacy.model.children.filter(mesh => mesh.userData.legacyScapularBlade);
        expect(blades).toHaveLength(2); expect(oldBlades).toHaveLength(2);
        expect(built.model.children).toHaveLength(legacy.model.children.length);
        for (const [i, blade] of blades.entries()) {
          const old = oldBlades[i], metadata = blade.userData.dinoScapularBlade;
          expect(blade.position.toArray()).toEqual(old.position.toArray()); expect(blade.scale.toArray()).toEqual(old.scale.toArray());
          expect(blade.quaternion.toArray()).toEqual(old.quaternion.toArray()); expect(blade.castShadow).toBe(old.castShadow);
          blade.updateMatrixWorld(true);
          const start = vec(...metadata.start), end = vec(...metadata.end), support = built.model.children[built.model.children.indexOf(blade) - 1];
          expect(support.geometry.type).toBe('CylinderGeometry'); support.updateMatrixWorld(true);
          nearVector(vec(0, support.geometry.parameters.height / 2, 0).applyMatrix4(support.matrixWorld), start, options.scale * 1e-6);
          nearVector(ringCenter(blade.geometry, 0).applyMatrix4(blade.matrixWorld), start, options.scale * 1e-6);
          nearVector(vec(0, 1).applyMatrix4(blade.matrixWorld), end, options.scale * 1e-6);
          // A finite root cap surrounds the shared support endpoint in both transverse directions.
          const p = blade.geometry.attributes.position;
          expect(at(p, 0).distanceTo(vec(0, -1))).toBeGreaterThan(.3);
          expect(at(p, 6).distanceTo(vec(0, -1))).toBeGreaterThan(.6);
          expect(support.geometry.parameters.radiusTop).toBeGreaterThan(0);
          expect(blade.material).toBe(built.context.boneMat);
        }
        const withoutBlades = built.model.children.filter(mesh => !mesh.userData.dinoScapularBlade);
        const oldWithoutBlades = legacy.model.children.filter(mesh => !mesh.userData.legacyScapularBlade);
        expect(withoutBlades.map(mesh => meshSnapshot(mesh, built.context))).toEqual(oldWithoutBlades.map(mesh => meshSnapshot(mesh, legacy.context)));
        const otherGirdles = withoutBlades.filter(mesh => mesh.geometry.type === 'SphereGeometry' && mesh.geometry.parameters.widthSegments === 16);
        expect(otherGirdles).toHaveLength(14);
        for (const girdle of otherGirdles) expect(girdle.geometry.parameters.heightSegments).toBe(10);
        const triangles = model => model.children.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);
        expect(triangles(built.model) - triangles(legacy.model)).toBe(1728);
      } finally { built.dispose(); legacy.dispose(); }
    });
  }

  it('keeps the established bilateral shoulder landmarks', () => {
    const built = nativeGirdles();
    try {
      const blades = built.model.children.filter(mesh => mesh.userData.dinoScapularBlade);
      for (const [i, side] of [-1, 1].entries()) {
        const metadata = blades[i].userData.dinoScapularBlade;
        nearVector(vec(...metadata.start), vec(-.816, 2.3, side * .264));
        nearVector(vec(...metadata.end), vec(-.54, 2.56, side * .2244));
        expect(metadata.width).toBeCloseTo(.15, 12); expect(metadata.thickness).toBeCloseTo(.0275, 12);
      }
    } finally { built.dispose(); }
  });

  it('omits scapular and shared girdle blades when girdle detail is disabled', () => {
    const built = nativeGirdles({ girdleDetail: false });
    try {
      expect(built.model.children.filter(mesh => mesh.userData.dinoScapularBlade)).toHaveLength(0);
      expect(built.model.children.filter(mesh => mesh.geometry.type === 'SphereGeometry' && mesh.geometry.parameters.widthSegments === 16)).toHaveLength(0);
      expect(built.model.children.filter(mesh => mesh.geometry.type === 'TorusGeometry')).toHaveLength(4);
    } finally { built.dispose(); }
  });
});
