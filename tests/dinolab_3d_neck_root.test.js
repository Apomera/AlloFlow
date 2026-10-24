import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_NECK_ROOT_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Missing Dino Lab registration');
window.StemLab = { registerTool() {} };
const nativeTopLevelNames=[...new Set([...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]))];
new Function(source.replace(anchor,
  'globalThis.__dinoNeckRoot = { DINOS, skeletalAnatomyProfileFor, ' + nativeTopLevelNames.join(',') + ' };' + anchor))();
const art = globalThis.__dinoNeckRoot;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function envelope(scale, curved) {
  const points = [vec(.4, 1.7, -.2), vec(-.4, curved ? 2.6 : 1.7, -.2),
    vec(-1.6, curved ? 3.7 : 1.7, curved ? .08 : -.2), vec(-3.8, curved ? 5.6 : 1.7, -.2)]
    .map(point => point.multiplyScalar(scale));
  return { points, radii: [[.46, .35], [.39, .31], [.21, .17], [.08, .065]].map(pair => pair.map(r => r * scale)) };
}
const geometry = (data, options = {}) => art.dinoSurfaceGeometry(THREE, data.points, data.radii, { smoothProfile: true, ...options });
const arraysEqual = (a, b) => {
  expect(a.index.array).toEqual(b.index.array);
  for (const name of ['position', 'normal', 'uv']) expect(a.attributes[name].array).toEqual(b.attributes[name].array);
};

// Weld the duplicated UV seam for a topological check. Directed edge balance also
// detects inconsistent winding, which a simple two-triangles-per-edge count misses.
function checkClosedSurface(mesh, data, rings, sides, scale) {
  const positions = mesh.attributes.position, normals = mesh.attributes.normal, ids = [], keys = new Map(), edges = new Map();
  const epsilon = scale * 1e-6, point = i => new THREE.Vector3().fromBufferAttribute(positions, i);
  for (let i = 0; i < positions.count; i++) {
    const key = point(i).toArray().map(v => Math.round(v / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    ids.push(keys.get(key));
    expect(point(i).toArray().every(Number.isFinite)).toBe(true);
    const normal = new THREE.Vector3().fromBufferAttribute(normals, i);
    expect(normal.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
  }
  const curve = new THREE.CatmullRomCurve3(data.points, false, 'centripetal');
  const index = mesh.index.array, sideIndexCount = rings * sides * 6;
  for (let i = 0; i < index.length; i += 3) {
    const tri = Array.from(index.slice(i, i + 3)), a = point(tri[0]), b = point(tri[1]), c = point(tri[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    expect(normal.length()).toBeGreaterThan(scale * scale * 1e-7);
    const center = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    let outward;
    if (i < sideIndexCount) {
      const t = tri.reduce((sum, id) => sum + Math.floor(id / (sides + 1)) / rings, 0) / 3;
      outward = center.sub(curve.getPoint(t));
    } else {
      const root = tri.includes((rings + 1) * (sides + 1));
      outward = curve.getTangent(root ? 0 : 1).multiplyScalar(root ? -1 : 1);
    }
    expect(normal.dot(outward)).toBeGreaterThan(0);
    for (let j = 0; j < 3; j++) {
      const from = ids[tri[j]], to = ids[tri[(j + 1) % 3]], key = from < to ? from + ',' + to : to + ',' + from;
      const edge = edges.get(key) || { count: 0, balance: 0 };
      edge.count++; edge.balance += from < to ? 1 : -1; edges.set(key, edge);
    }
  }
  expect([...edges.values()].every(edge => edge.count === 2 && edge.balance === 0)).toBe(true);
  for (let ring = 0; ring <= rings; ring++) {
    const first = ring * (sides + 1), last = first + sides;
    expect(point(first).distanceTo(point(last))).toBeLessThan(scale * 1e-6);
    expect([normals.getX(first), normals.getY(first), normals.getZ(first)])
      .toEqual([normals.getX(last), normals.getY(last), normals.getZ(last)]);
  }
}

function extract(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing construction section ' + start);
  return source.slice(a, b);
}
const chainCode = extract('function addSoftTissueChain(', 'function addContourGroup(meshes)');
const callerCode = extract('var neckSkinEnvelope = dinoCervicalSkinEnvelope(', 'var tailMidA =');
function specimen(id, scale = 1) {
  const dn = art.DINOS.find(dino => dino.id === id);
  if (!dn) throw new Error('Missing species ' + id);
  const isSauropod = dn.group === 'sauropod';
  const shoulder = vec(.4, 1.7, -.2).multiplyScalar(scale), head = shoulder.clone().add(vec(-2.5, isSauropod ? 3.1 : .3, 0).multiplyScalar(scale));
  const original = art.dinoCervicalEnvelope(THREE, shoulder, head, .8 * scale, .46 * scale, .08 * scale,
    art.postcranialSurfaceProfileFor(dn), isSauropod, dn.clade);
  return { dn, scale, isSauropod, shoulder, head, original };
}
function caller(data, showBody = true) {
  const bodyMat = new THREE.MeshBasicMaterial(), model = new THREE.Group(), idleMotion = { breathingMeshes: [] };
  const chain = new Function('THREE', 'props', 'bodyMat', 'model', 'dinoCranialGeometry', 'dinoSurfaceGeometry', chainCode + 'return addSoftTissueChain;')
    (THREE, { showBody }, bodyMat, model, art.dinoCranialGeometry, art.dinoSurfaceGeometry);
  const context = { ...art, THREE, dn:data.dn, model, surfaceHypothesis:{neckSoftTissueScale:1}, cervicalEnvelope: data.original, shoulder: data.shoulder, head: data.head,
    thoraxCenter: data.shoulder.clone().add(vec(.5, 0, 0)), cladeName: data.dn.clade, isSauropod: data.isSauropod,
    hasAnatomyPart: () => false, neckPoints: data.original.points, neckRadii: data.original.radii, bodyMat,
    idleMotion, addSoftTissueChain: chain, dinoCervicalSkinEnvelope: art.dinoCervicalSkinEnvelope,
    addContourGroup: meshes => meshes.map(mesh => { const contour = new THREE.Mesh(mesh.geometry, bodyMat); contour.position.copy(mesh.position); return contour; }) };
  const len=data.dn.lengthM*data.scale,ht=data.dn.heightM*data.scale;
  context.ceratopsidCranium=art.dinoCeratopsidCraniumFrame(THREE,data.dn,data.head,len,ht);
  context.lambeosaurBody=art.dinoLambeosaurBodyFrame(THREE,data.dn,{len,ht,headScale:art.reconstructionProfileFor(data.dn).head,
    shoulder:data.shoulder,hip:data.shoulder.clone().add(vec(len*.24,0,0)),head:data.head,
    snout:data.head.clone().add(vec(-len*.075,-ht*.020,0)),tail:data.shoulder.clone().add(vec(len*.52,0,0)),
    bodyHeight:.8*data.scale,bodyDepth:data.original.radii[0]});
  const result = new Function('context', 'with(context){' + callerCode + 'return { neckMeshes, neckContours, neckSurfaceCurve, neckSkinEnvelope };}')(context);
  return { ...result, idleMotion, bodyMat, model, context };
}
function dispose(result) { result.neckMeshes.forEach(mesh => mesh.geometry.dispose()); result.bodyMat.dispose(); }

describe('Dino Lab sauropod cervical root seating', () => {
  for (const scale of [.03, 1, 12]) for (const curved of [false, true]) for (const [rings, sides] of [[48, 24], [40, 16]]) {
    it('keeps a closed outward surface and unchanged distal anatomy at scale ' + scale + ', curved ' + curved + ', sections ' + rings + '/' + sides, () => {
      const data = envelope(scale, curved), original = JSON.stringify(data), options = { rings, sides, taperRoot: true }, optionSnapshot = JSON.stringify(options);
      const baseline = geometry(data, { rings, sides }), tapered = geometry(data, options);
      try {
        checkClosedSurface(tapered, data, rings, sides, scale);
        expect(tapered.index.array).toEqual(baseline.index.array);
        expect(tapered.attributes.uv.array).toEqual(baseline.attributes.uv.array);
        expect(tapered.attributes.position.count).toBe(baseline.attributes.position.count);
        const curve = new THREE.CatmullRomCurve3(data.points, false, 'centripetal');
        let previousRatio = 0;
        for (let ring = 0; ring <= rings; ring++) {
          const t = ring / rings, center = curve.getPoint(t);
          const ratios = [];
          for (let side = 0; side <= sides; side++) {
            const id = ring * (sides + 1) + side, start = id * 3;
            const before = new THREE.Vector3().fromBufferAttribute(baseline.attributes.position, id).sub(center);
            const after = new THREE.Vector3().fromBufferAttribute(tapered.attributes.position, id).sub(center);
            if (t >= .10) expect(tapered.attributes.position.array.slice(start, start + 3)).toEqual(baseline.attributes.position.array.slice(start, start + 3));
            else {
              const ratio = after.length() / before.length(); ratios.push(ratio);
              expect(ratio).toBeGreaterThanOrEqual(.75 - 1e-5); expect(ratio).toBeLessThan(1);
              expect(after.clone().normalize().distanceTo(before.clone().normalize())).toBeLessThan(1e-5);
              if (!ring) expect(Math.abs(ratio - .75)).toBeLessThan(1e-5);
            }
          }
          if (ratios.length) { const ratio = ratios.reduce((a, b) => a + b) / ratios.length; expect(ratio).toBeGreaterThan(previousRatio); previousRatio = ratio; }
        }
        const capStart = (rings + 1) * (sides + 1) * 3;
        expect(tapered.attributes.position.array.slice(capStart)).toEqual(baseline.attributes.position.array.slice(capStart));
        expect(new THREE.Vector3().fromBufferAttribute(tapered.attributes.position, capStart / 3).distanceTo(data.points[0])).toBeLessThan(scale * 1e-6);
        expect(new THREE.Vector3().fromBufferAttribute(tapered.attributes.position, capStart / 3 + 1).distanceTo(data.points.at(-1))).toBeLessThan(scale * 1e-6);
        expect(JSON.stringify(data)).toBe(original); expect(JSON.stringify(options)).toBe(optionSnapshot);
      } finally { baseline.dispose(); tapered.dispose(); }
    });
  }

  it('requires a strict true option and leaves every disabled surface buffer exact', () => {
    const data = envelope(1, true), original = geometry(data);
    try { for (const flag of [undefined, false, null, 0, 1, 'true', {}, []]) {
      const disabled = geometry(data, { taperRoot: flag });
      try { arraysEqual(disabled, original); } finally { disabled.dispose(); }
    } } finally { original.dispose(); }
  });

  for (const id of ['tyrannosaurus', 'spinosaurus', 'triceratops', 'stegosaurus', 'parasaurolophus', 'brachiosaurus', 'diplodocus']) {
    it('isolates root seating and preserves construction ownership for ' + id, () => {
      const data = specimen(id), snapshot = JSON.stringify(data.original), built = caller(data);
      const expected = geometry(data.original, data.isSauropod ? { taperRoot: true } : {});
      expected.translate(-data.shoulder.x, -data.shoulder.y, -data.shoulder.z);
      const fixedUV=expected.attributes.uv.array.slice(),fixedIndex=expected.index.array.slice();
      if(data.dn.id==='triceratops'){
        const reference=new THREE.Mesh(expected,built.bodyMat);reference.position.copy(data.shoulder);
        expect(art.dinoCeratopsidNapeGeometry(THREE,data.dn,reference,built.context.ceratopsidCranium,1)).toBe(true);
        expect(reference.userData.dinoCeratopsidNape.fixedSkeleton).toBe(true);
      }
      try {
        expect(expected.attributes.uv.array).toEqual(fixedUV);expect(expected.index.array).toEqual(fixedIndex);
        expect(built.neckMeshes[0].geometry.attributes.uv.array).toEqual(fixedUV);expect(built.neckMeshes[0].geometry.index.array).toEqual(fixedIndex);
        expect(built.neckMeshes).toHaveLength(1); expect(built.model.children).toHaveLength(1);
        const mesh = built.neckMeshes[0]; arraysEqual(mesh.geometry, expected);
        expect(mesh.position.toArray()).toEqual(data.shoulder.toArray());
        expect(mesh.material).toBe(built.bodyMat); expect(mesh.userData.dinoRegion).toBe('neck');
        expect(mesh.userData.dinoNeckTip).toEqual(data.head.toArray());
        expect(built.neckSkinEnvelope).toBe(data.original); expect(built.neckSurfaceCurve.points).toBe(data.original.points);
        expect(built.neckContours[0].geometry).toBe(mesh.geometry); expect(built.neckContours[0].position.toArray()).toEqual(data.shoulder.toArray());
        expect(built.idleMotion.neck).toBe(mesh); expect(built.idleMotion.neckContour).toBe(built.neckContours[0]);
        expect(built.idleMotion.breathingMeshes).toHaveLength(0);
        expect(JSON.stringify(data.original)).toBe(snapshot);
      } finally { expected.dispose(); dispose(built); }
    });
  }

  for (const scale of [.03, 1, 12]) it('preserves shoulder pivots, skull anchors and transformed bounds at scale ' + scale, () => {
    const data = specimen('brachiosaurus', scale), built = caller(data), mesh = built.neckMeshes[0];
    const raw = geometry(data.original, { taperRoot: true });
    const junctionBefore = art.dinoNeckJunction(THREE, data.original.points, data.original.radii, .6 * scale);
    try {
      mesh.rotation.set(.045, -.085, .025); mesh.scale.set(1, 1, 1.014); mesh.updateMatrixWorld(true);
      const expectedBounds = new THREE.Box3(), actualBounds = new THREE.Box3();
      for (let i = 0; i < raw.attributes.position.count; i++) {
        const expected = new THREE.Vector3().fromBufferAttribute(raw.attributes.position, i).sub(data.shoulder).multiply(mesh.scale).applyQuaternion(mesh.quaternion).add(data.shoulder);
        const actual = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i));
        expect(actual.distanceTo(expected)).toBeLessThan(scale * 1e-6);
        expectedBounds.expandByPoint(expected); actualBounds.expandByPoint(actual);
      }
      expect(mesh.localToWorld(new THREE.Vector3()).toArray()).toEqual(data.shoulder.toArray());
      expect(expectedBounds.min.distanceTo(actualBounds.min)).toBeLessThan(scale * 1e-6);
      expect(expectedBounds.max.distanceTo(actualBounds.max)).toBeLessThan(scale * 1e-6);
      const after = art.dinoNeckJunction(THREE, data.original.points, data.original.radii, .6 * scale);
      expect(after.point.toArray()).toEqual(junctionBefore.point.toArray()); expect(after.radius).toBe(junctionBefore.radius); expect(after.t).toBe(junctionBefore.t);
    } finally { raw.dispose(); dispose(built); }
  });

  it('adds no skin or animation ownership in the skeleton-only path', () => {
    const built = caller(specimen('brachiosaurus'), false);
    try { expect(built.neckMeshes).toHaveLength(0); expect(built.neckContours).toHaveLength(0); expect(built.model.children).toHaveLength(0); expect(built.idleMotion.neck).toBeUndefined(); }
    finally { dispose(built); }
  });
});
