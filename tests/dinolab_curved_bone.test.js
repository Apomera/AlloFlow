import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing native curved-bone section: ' + start);
  return source.slice(a, b);
}
const helperStart = source.indexOf('  function dinoCurvedBoneGeometry(');
const helperEnd = source.indexOf('\n  function ', helperStart + 1);
if (helperStart < 0 || helperEnd < helperStart) throw new Error('Missing curved-bone geometry helper');
const geometryFor = new Function(source.slice(helperStart, helperEnd) + '\nreturn dinoCurvedBoneGeometry;')();
const callerCode = section('            function addCurvedBone(', '            function addLongBone(');
const nativeHelpers = section('            function addBone(', '            function addCurvedBone(')
  + section('            function addGirdleBlade(', '            function addCranialBone(')
  + section('            function addSkeletonEllipsoid(', '            function addSkeletonCone(');
const ribCode = section('              var ribCount = isSauropod ? 10 : 9;', '              var cervicalRibCount =');
const sternalCode = section('              if (skeletalProfile.sternalPlates) {\n                for (var sternalRibIndex', '              if (isTheropod) {');
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const at = (attribute, index) => vec().fromBufferAttribute(attribute, index);
function ringCenter(g, row) {
  const result = vec(), sides = g.userData.dinoCurvedBone.radialSegments;
  for (let i = 0; i < sides; i++) result.add(at(g.attributes.position, row * sides + i));
  return result.divideScalar(sides);
}
const paths = {
  rib: [[0, 0, 0], [.04, -.15, .3], [.08, -.65, .5], [.11, -1.05, .35], [.15, -1.3, 0]],
  spatial: [[0, 0, 0], [.3, -.2, .2], [.7, -.6, .15], [1.05, -.8, -.1], [1.4, -1, .05]],
  straight: [[0, 0, 0], [0, .8, 0], [0, 1.5, 0]],
  depth: [[0, 0, 0], [0, 0, 1], [1e-10, 1e-10, 2]],
  twoPoint: [[-.2, .5, .1], [.7, -.1, .8]]
};
function specimen(path, scale = 1) {
  const points = path.map(p => vec(...p).multiplyScalar(scale));
  return { points, scale, radii: [.025 * scale, .013 * scale], geometry: geometryFor(THREE, points, .025 * scale, .013 * scale) };
}
function assertSurface({ geometry: g, points, radii, scale }) {
  expect(g).not.toBeNull();
  const { lengthSegments: rows, radialSegments: sides } = g.userData.dinoCurvedBone;
  const positions = g.attributes.position, normals = g.attributes.normal, index = g.index.array;
  const tolerance = scale * 8e-7;
  expect(rows).toBe((points.length - 1) * 8); expect(sides).toBe(12);
  expect(positions.count).toBe((rows + 1) * sides + 2 * (sides + 1));
  expect(index.length / 3).toBe(rows * sides * 2 + sides * 2);
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
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
    const center = ringCenter(g, row), t = row / rows, tangent = curve.getTangent(t).normalize();
    centers.push(center);
    expect(center.distanceTo(curve.getPoint(t))).toBeLessThan(tolerance);
    const width = at(positions, row * sides).distanceTo(center); widths.push(width);
    for (let column = 0; column < sides; column++) {
      const i = row * sides + column, radial = at(positions, i).sub(center);
      expect(Math.abs(radial.length() - width)).toBeLessThan(tolerance);
      expect(Math.abs(radial.dot(tangent))).toBeLessThan(tolerance);
      expect(at(normals, i).dot(radial.normalize())).toBeGreaterThan(.85);
      if (row > 0) expect(at(normals, i).dot(at(normals, i - sides))).toBeGreaterThan(.85);
    }
  }
  points.forEach((point, i) => expect(centers[i * 8].distanceTo(point)).toBeLessThan(tolerance));
  expect(Math.abs(widths[0] - radii[0])).toBeLessThan(tolerance);
  expect(Math.abs(widths[rows] - radii[1])).toBeLessThan(tolerance);
  for (let i = 1; i <= rows; i++) expect(widths[i]).toBeLessThan(widths[i - 1]);
  const edges = new Map(), keys = Array.from({ length: positions.count }, (_, i) =>
    at(positions, i).toArray().map(v => Math.round(v / tolerance)).join(','));
  let volume = 0;
  for (let i = 0; i < index.length; i += 3) {
    const ids = Array.from(index.slice(i, i + 3)), a = at(positions, ids[0]), b = at(positions, ids[1]), c = at(positions, ids[2]);
    const face = b.clone().sub(a).cross(c.clone().sub(a));
    expect(face.length()).toBeGreaterThan(scale * scale * 1e-9);
    expect(face.dot(at(normals, ids[0]).add(at(normals, ids[1])).add(at(normals, ids[2])))).toBeGreaterThan(0);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let j = 0; j < 3; j++) {
      const from = keys[ids[j]], to = keys[ids[(j + 1) % 3]], key = [from, to].sort().join('|');
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
  // Only the two outer ends have cap vertices; internal landmarks share sidewall indices.
  for (const cap of [0, 1]) {
    const centerIndex = (rows + 1) * sides + cap * (sides + 1), n = at(normals, centerIndex);
    const expectedNormal = curve.getTangent(cap).normalize().multiplyScalar(cap ? 1 : -1);
    expect(n.dot(expectedNormal)).toBeGreaterThan(.99999);
    for (let i = 1; i <= sides; i++) expect(at(normals, centerIndex + i).distanceTo(n)).toBeLessThan(2e-6);
  }
}

describe('Dino Lab continuous curved-bone surface', () => {
  for (const scale of [.025, 1, 15]) for (const path of ['rib', 'spatial']) {
    it('closes and smoothly shades the ' + path + ' path at scale ' + scale, () => {
      const built = specimen(paths[path], scale);
      try { assertSurface(built); } finally { built.geometry?.dispose(); }
    });
  }
  for (const path of ['straight', 'depth', 'twoPoint']) {
    it('keeps finite oriented rings for ' + path + ' paths', () => {
      const built = specimen(paths[path]);
      try { assertSurface(built); } finally { built.geometry?.dispose(); }
    });
  }
  it('preserves source vectors and separates diagnostic arrays from them', () => {
    const points = paths.rib.map(p => vec(...p)), before = points.map(p => p.toArray());
    const g = geometryFor(THREE, points, .025, .013);
    try {
      expect(points.map(p => p.toArray())).toEqual(before);
      expect(g.userData.dinoCurvedBone.points).toEqual(before);
      g.userData.dinoCurvedBone.points[1][0] = 900;
      expect(points.map(p => p.toArray())).toEqual(before);
    } finally { g.dispose(); }
  });
  it('rejects invalid points, zero spans and invalid widths before geometry allocation', () => {
    let allocations = 0;
    const guarded = { ...THREE, BufferGeometry: class { constructor() { allocations++; throw new Error('Unexpected geometry allocation'); } } };
    for (const points of [null, [], [vec()], [vec(), vec()], [vec(), vec(1), vec(1)], [vec(), null], [vec(), { x: 1, y: 1, z: 1 }], [vec(), vec(Infinity)], [vec(), vec(NaN)]]) {
      expect(geometryFor(guarded, points, .03, .02)).toBeNull();
    }
    for (const invalid of [0, -.1, NaN, Infinity]) for (const station of [0, 1]) {
      const widths = [.03, .02]; widths[station] = invalid;
      expect(geometryFor(guarded, [vec(), vec(0, 1)], ...widths)).toBeNull();
    }
    expect(allocations).toBe(0);
  });
});

function caller({ showSkeleton = true, helper = geometryFor } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), calls = [];
  const context = { THREE, vec, model, boneMat, props: { showSkeleton },
    dinoCurvedBoneGeometry(...args) { calls.push(args); return helper(...args); } };
  const add = new Function('context', 'with (context) {' + callerCode + '\nreturn addCurvedBone;}')(context);
  return { add, model, boneMat, calls, dispose() { model.traverse(part => part.geometry?.dispose()); boneMat.dispose(); } };
}
describe('Dino Lab native addCurvedBone caller', () => {
  it('uses one shadow-casting mesh with the requested material and original middle-point return', () => {
    const built = caller(), material = new THREE.MeshStandardMaterial(), points = paths.rib.map(p => vec(...p));
    try {
      expect(built.add(points, .025, .013, material)).toBe(points[2]);
      expect(built.model.children).toHaveLength(1); expect(built.calls).toHaveLength(1);
      const mesh = built.model.children[0];
      expect(mesh.name).toBe('continuous-curved-bone'); expect(mesh.castShadow).toBe(true);
      expect(mesh.material).toBe(material); expect(mesh.position.toArray()).toEqual([0, 0, 0]);
      expect(mesh.userData.dinoCurvedBone).toBe(mesh.geometry.userData.dinoCurvedBone);
      expect(mesh.userData.dinoCurvedBone.points).toEqual(paths.rib);
      built.add(points, .025, .013);
      expect(built.model.children[1].material).toBe(built.boneMat);
    } finally { built.dispose(); material.dispose(); }
  });
  it('does no geometry work when the skeleton is hidden or a path is missing', () => {
    const hidden = caller({ showSkeleton: false, helper() { throw new Error('Hidden helper access'); } });
    const shown = caller();
    try {
      expect(hidden.add(paths.rib.map(p => vec(...p)), .025, .013)).toBeNull();
      for (const points of [null, [], [vec()]]) expect(shown.add(points, .025, .013)).toBeNull();
      expect(hidden.calls).toHaveLength(0); expect(hidden.model.children).toHaveLength(0);
      expect(shown.calls).toHaveLength(0); expect(shown.model.children).toHaveLength(0);
    } finally { hidden.dispose(); shown.dispose(); }
  });
  it('leaves the model empty when the helper rejects a path', () => {
    const built = caller({ helper() { return null; } });
    try {
      expect(built.add([vec(), vec(1)], .02, .01)).toBeNull();
      expect(built.calls).toHaveLength(1); expect(built.model.children).toHaveLength(0);
    } finally { built.dispose(); }
  });
});

function nativeThorax({ scale = 1, isSauropod = false, bodyHeight = 1, bodyDepth = .5, reverse = false, showSkeleton = true, profile = {} } = {}) {
  const model = new THREE.Group(), boneMat = new THREE.MeshStandardMaterial(), jointMat = new THREE.MeshStandardMaterial(), costalJointMat = new THREE.MeshStandardMaterial();
  const shoulder = vec(reverse ? 1 : -1, 2, 0).multiplyScalar(scale), hip = vec(reverse ? -1 : 1, 2, 0).multiplyScalar(scale);
  const context = { THREE, vec, model, boneMat, jointMat, costalJointMat, shoulder, hip, props: { showSkeleton }, isSauropod,
    detailScale: scale, ht: 2 * scale, len: 4 * scale, bodyLen: 2 * scale, bodyHeight: bodyHeight * scale, bodyDepth: bodyDepth * scale,
    shoulderHalf: Math.max(.13, bodyDepth * .66) * scale,
    skeletalProfile: { ribHeadDetail: true, girdleDetail: true, uncinateProcesses: true, uncinateCount: 4, gastralia: true, sternalPlates: true, sternalRibCount: 3, ...profile },
    dinoCurvedBoneGeometry: geometryFor };
  const anchors = new Function('context', 'with (context) {' + nativeHelpers + callerCode + ribCode + sternalCode + '\nreturn ribDistalAnchors;}')(context);
  return { model, context, anchors, dispose() { model.traverse(part => part.geometry?.dispose()); for (const material of [boneMat, jointMat, costalJointMat]) material.dispose(); } };
}
function nearArray(actual, expected, tolerance = 1e-6) {
  expect(vec(...actual).distanceTo(vec(...expected))).toBeLessThan(tolerance);
}
describe('Dino Lab native rib, gastral and sternal integration', () => {
  it('retains established rib heads, distal joints, gastral crossings and sternal endpoints', () => {
    const built = nativeThorax();
    try {
      const curves = built.model.children.filter(m => m.userData.dinoCurvedBone);
      expect(curves).toHaveLength(34);
      const ribs = curves.filter(m => m.userData.dinoCurvedBone.points.length === 5);
      expect(ribs).toHaveLength(18);
      // Frozen model-space landmarks from the preceding segmented-bone construction.
      nearArray(ribs[0].userData.dinoCurvedBone.points[0], [-.8, 1.975, -.1381598667131223]);
      nearArray(ribs[0].userData.dinoCurvedBone.points.at(-1), [-.8, 1.08, -.12]);
      nearArray(ribs[1].userData.dinoCurvedBone.points.at(-1), [-.8, 1.08, .12]);
      nearArray(curves[18].userData.dinoCurvedBone.points[0], [-.6266666666666667, 1.0958333333333332, -.195]);
      nearArray(curves[18].userData.dinoCurvedBone.points.at(-1), [-.6426666666666667, 1.0958333333333332, .016]);
      nearArray(curves[19].userData.dinoCurvedBone.points.at(-1), [-.6906666666666667, 1.0928333333333333, -.016]);
      nearArray(curves[28].userData.dinoCurvedBone.points[0], [-.6, 1.08, -.12]);
      nearArray(curves[28].userData.dinoCurvedBone.points.at(-1), [-.98, 1.4, -.099]);
      nearArray(curves[33].userData.dinoCurvedBone.points.at(-1), [-.868, 1.4, .099]);
      const firstHeadSegments = built.model.children.filter(m => m.geometry.type === 'CylinderGeometry').slice(0, 2);
      expect(firstHeadSegments).toHaveLength(2);
      for (const [i, mesh] of firstHeadSegments.entries()) {
        mesh.updateMatrixWorld(true);
        const half = mesh.geometry.parameters.height / 2;
        nearArray(vec(0, -half).applyMatrix4(mesh.matrixWorld).toArray(), [[-.8, 1.975, -.035], [-.8, 2.07, -.1025]][i]);
        nearArray(vec(0, half).applyMatrix4(mesh.matrixWorld).toArray(), ribs[0].userData.dinoCurvedBone.points[0]);
      }
      for (let row = 0; row < 9; row++) for (let side = 0; side < 2; side++) {
        const rib = ribs[row * 2 + side], metadata = rib.userData.dinoCurvedBone;
        nearArray(ringCenter(rib.geometry, metadata.lengthSegments).toArray(), built.anchors[row][side].toArray());
        expect(built.anchors[row][side].toArray()).toEqual(metadata.points.at(-1));
      }
    } finally { built.dispose(); }
  });
  for (const options of [
    { scale: .03 }, { scale: 1, reverse: true }, { scale: 15 },
    { scale: 1, isSauropod: true, bodyHeight: 1.8, bodyDepth: .8 },
    { scale: 1, isSauropod: true, bodyHeight: .7, bodyDepth: .9 }
  ]) {
    it('seats uncinate blades inside the sampled rib surface for ' + JSON.stringify(options), () => {
      const built = nativeThorax(options), { context } = built;
      try {
        const ribs = built.model.children.filter(m => m.userData.dinoCurvedBone?.points.length === 5);
        expect(ribs).toHaveLength(options.isSauropod ? 20 : 18);
        const attachments = built.model.children.filter(m => m.userData.dinoCurvedBoneAttachment);
        expect(attachments).toHaveLength(8);
        for (const blade of attachments) {
          const attachment = blade.userData.dinoCurvedBoneAttachment;
          const rib = ribs.find(m => JSON.stringify(m.userData.dinoCurvedBone.points) === JSON.stringify(attachment.points));
          expect(rib).toBeDefined();
          const meta = rib.userData.dinoCurvedBone, base = vec(...attachment.base), tip = vec(...attachment.tip);
          const radius = meta.startRadius + (meta.endRadius - meta.startRadius) * attachment.t;
          let centerDistance = Infinity, surfaceDistance = Infinity;
          for (let row = 0; row < meta.lengthSegments; row++) {
            const line = new THREE.Line3(ringCenter(rib.geometry, row), ringCenter(rib.geometry, row + 1));
            centerDistance = Math.min(centerDistance, line.closestPointToPoint(base, true, vec()).distanceTo(base));
          }
          const p = rib.geometry.attributes.position, ids = rib.geometry.index.array;
          for (let i = 0; i < ids.length; i += 3) {
            const triangle = new THREE.Triangle(at(p, ids[i]), at(p, ids[i + 1]), at(p, ids[i + 2]));
            surfaceDistance = Math.min(surfaceDistance, triangle.closestPointToPoint(base, vec()).distanceTo(base));
          }
          expect(centerDistance).toBeLessThan(radius * .1);
          expect(surfaceDistance).toBeGreaterThan(radius * .8);
          expect(surfaceDistance).toBeLessThan(radius * 1.05);
          const side = Math.sign(base.z), direction = options.reverse ? -1 : 1;
          nearArray(tip.clone().sub(base).toArray(), [direction * Math.max(.11 * context.detailScale, context.bodyLen * .12), context.bodyHeight * .12, -side * Math.max(.010 * context.detailScale, context.bodyDepth * .035)], 1e-7 * context.detailScale);
          nearArray(attachment.originalBase, vec(...attachment.points[1]).lerp(vec(...attachment.points[2]), .54).toArray());
          blade.updateMatrixWorld(true);
          nearArray(vec(0, -1).applyMatrix4(blade.matrixWorld).toArray(), attachment.base, 1e-6 * context.detailScale);
          nearArray(vec(0, 1).applyMatrix4(blade.matrixWorld).toArray(), attachment.tip, 1e-6 * context.detailScale);
          expect(blade.material).toBe(context.boneMat); expect(blade.castShadow).toBe(true);
        }
      } finally { built.dispose(); }
    });
  }
  it('respects rib-head, gastral, sternal, uncinate and hidden-skeleton feature gates', () => {
    const simple = nativeThorax({ profile: { ribHeadDetail: false, gastralia: false, sternalPlates: false, uncinateProcesses: false } });
    const hidden = nativeThorax({ showSkeleton: false });
    try {
      expect(simple.model.children.filter(m => m.userData.dinoCurvedBone)).toHaveLength(18);
      expect(simple.model.children.filter(m => m.geometry.type === 'CylinderGeometry')).toHaveLength(18);
      expect(simple.model.children.filter(m => m.userData.dinoCurvedBoneAttachment)).toHaveLength(0);
      expect(hidden.model.children).toHaveLength(0);
    } finally { simple.dispose(); hidden.dispose(); }
  });
});
