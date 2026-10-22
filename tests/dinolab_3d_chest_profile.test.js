import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_CHEST_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Missing Dino Lab registration');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoChestProfile = { DINOS, postcranialSurfaceProfileFor, dinoTorsoRadii, dinoSurfaceGeometry, dinoCranialGeometry, dinoTheropodBodyTorso };' + anchor))();
const art = globalThis.__dinoChestProfile;
const vec = (x, y, z) => new THREE.Vector3(x, y, z);
const at = (attribute, i) => new THREE.Vector3().fromBufferAttribute(attribute, i);
const geometry = (data, options = {}) => art.dinoSurfaceGeometry(THREE, data.points, data.radii, { smoothProfile: true, ...options });
function sameBuffers(a, b) {
  expect(a.index.array).toEqual(b.index.array);
  for (const name of ['position', 'normal', 'uv']) expect(a.attributes[name].array).toEqual(b.attributes[name].array);
}
function envelope(scale, curved) {
  const points = [[-1, 0, 0], [0, 0, 0], [1.12, curved ? .08 : 0, 0], [2.12, curved ? -.05 : 0, 0],
    [3.12, curved ? .03 : 0, 0], [4, 0, 0], [4.96, 0, 0]].map(p => vec(...p).multiplyScalar(scale));
  const profile = art.postcranialSurfaceProfileFor(art.DINOS.find(d => d.id === 'diplodocus'));
  return { points, radii: art.dinoTorsoRadii(.7 * scale, .8 * scale, profile) };
}
function ringCenters(g, rings, sides) {
  return Array.from({ length: rings + 1 }, (_, ring) => {
    const sum = vec(0, 0, 0);
    for (let side = 0; side < sides; side++) sum.add(at(g.attributes.position, ring * (sides + 1) + side));
    return sum.multiplyScalar(1 / sides);
  });
}

// Inspect the generated triangles rather than trusting the loft's bookkeeping.
// Welding the duplicated UV seam must leave a closed sphere with paired winding.
function closedOutwardSurface(g, data, rings, sides, scale) {
  const p = g.attributes.position, n = g.attributes.normal, centers = ringCenters(g, rings, sides);
  const keys = new Map(), ids = [], edges = new Map(), used = new Set(), epsilon = scale * 1e-6;
  for (let i = 0; i < p.count; i++) {
    const point = at(p, i), normal = at(n, i);
    expect(point.toArray().every(Number.isFinite)).toBe(true);
    expect(normal.toArray().every(Number.isFinite)).toBe(true);
    expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
    expect(g.boundingBox.containsPoint(point)).toBe(true);
    expect(point.distanceTo(g.boundingSphere.center)).toBeLessThanOrEqual(g.boundingSphere.radius + epsilon);
    const key = point.toArray().map(x => Math.round(x / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    ids.push(keys.get(key));
  }
  const index = g.index.array, sideIndexCount = rings * sides * 6;
  const curve = new THREE.CatmullRomCurve3(data.points, false, 'centripetal');
  let volume = 0;
  for (let i = 0; i < index.length; i += 3) {
    const tri = Array.from(index.slice(i, i + 3)), a = at(p, tri[0]), b = at(p, tri[1]), c = at(p, tri[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    expect(normal.lengthSq()).toBeGreaterThan(scale ** 4 * 1e-16);
    let outward;
    if (i < sideIndexCount) {
      const pathCenter = tri.reduce((sum, id) => sum.add(centers[Math.floor(id / (sides + 1))]), vec(0, 0, 0)).multiplyScalar(1 / 3);
      outward = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(pathCenter);
    } else {
      const root = tri.includes((rings + 1) * (sides + 1));
      outward = curve.getTangent(root ? 0 : 1).multiplyScalar(root ? -1 : 1);
    }
    expect(normal.dot(outward)).toBeGreaterThan(0);
    volume += a.dot(b.clone().cross(c)) / 6;
    for (let j = 0; j < 3; j++) {
      const from = ids[tri[j]], to = ids[tri[(j + 1) % 3]];
      expect(from).not.toBe(to); used.add(from); used.add(to);
      const key = Math.min(from, to) + ',' + Math.max(from, to), edge = edges.get(key) || { count: 0, balance: 0 };
      edge.count++; edge.balance += from < to ? 1 : -1; edges.set(key, edge);
    }
  }
  expect([...edges.values()].every(edge => edge.count === 2 && edge.balance === 0)).toBe(true);
  expect(used.size - edges.size + index.length / 3).toBe(2);
  expect(volume).toBeGreaterThan(scale ** 3 * .01);
  for (let ring = 0; ring <= rings; ring++) {
    const first = ring * (sides + 1), last = first + sides;
    expect(at(p, first).distanceTo(at(p, last))).toBeLessThan(epsilon);
    expect(at(n, first).toArray()).toEqual(at(n, last).toArray());
  }
  return centers;
}

function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error('Missing construction section ' + start);
  return source.slice(a, b);
}
const chainCode = section('function addSoftTissueChain(', 'function addContourGroup(meshes)');
const bodyCode = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
function buildBody(id, showBody = true, forceSauropod) {
  const dn = art.DINOS.find(d => d.id === id);
  if (!dn) throw new Error('Missing species ' + id);
  const bodyMat = new THREE.MeshPhongMaterial(), model = new THREE.Group(), idleMotion = { breathingMeshes: [] };
  const shoulder = vec(-.4, 1.7, -.2), hip = vec(3.6, 1.76, -.2), postcranialSurface = art.postcranialSurfaceProfileFor(dn);
  const chain = new Function('THREE', 'props', 'bodyMat', 'model', 'dinoCranialGeometry', 'dinoSurfaceGeometry', chainCode + 'return addSoftTissueChain;')
    (THREE, { showBody }, bodyMat, model, art.dinoCranialGeometry, art.dinoSurfaceGeometry);
  const context = { THREE, vec, dn, bodyMat, model, idleMotion, shoulder, hip, postcranialSurface,
    bodyHeight: .7, bodyDepth: .8, bodyLen: 4, surfaceHypothesis: { bodyHeightScale: 1, bodyDepthScale: 1 },
    isSauropod: forceSauropod === undefined ? dn.group === 'sauropod' : forceSauropod,
    dinoTorsoRadii: art.dinoTorsoRadii, dinoTheropodBodyTorso: art.dinoTheropodBodyTorso, addSoftTissueChain: chain };
  const snapshots = JSON.stringify({ shoulder, hip, postcranialSurface });
  const result = new Function('context', 'with(context){' + bodyCode + 'return { bodyShell, torsoPoints, torsoRadii, thoraxCenter, abdomenCenter, pelvisCenter, theropodTorso:typeof theropodTorso==="undefined"?null:theropodTorso };}')(context);
  expect(JSON.stringify({ shoulder, hip, postcranialSurface })).toBe(snapshots);
  return { ...result, ...context, dispose() { result.bodyShell?.geometry.dispose(); bodyMat.dispose(); } };
}

describe('Dino Lab compact sauropod chest', () => {
  for (const scale of [.03, 1, 12]) for (const curved of [false, true]) for (const [rings, sides] of [[48, 24], [72, 40]]) {
    it('shortens only the anterior closure with a closed outward surface at scale ' + scale + ', curved ' + curved + ', sections ' + rings + '/' + sides, () => {
      const data = envelope(scale, curved), snapshot = JSON.stringify(data), options = { rings, sides, compactChest: true }, optionSnapshot = JSON.stringify(options);
      const baseline = geometry(data, { rings, sides }), compact = geometry(data, options);
      try {
        const centers = closedOutwardSurface(compact, data, rings, sides, scale), beforeCenters = ringCenters(baseline, rings, sides);
        expect(compact.index.array).toEqual(baseline.index.array);
        expect(compact.attributes.uv.array).toEqual(baseline.attributes.uv.array);
        expect(compact.attributes.position.count).toBe(baseline.attributes.position.count);
        const shoulderRing = rings / 6, p = compact.attributes.position, before = baseline.attributes.position;
        for (let ring = 0; ring <= rings; ring++) {
          if (ring) expect(centers[ring].x).toBeGreaterThan(centers[ring - 1].x);
          const displacement = centers[ring].x - beforeCenters[ring].x;
          if (ring < shoulderRing) {
            expect(displacement).toBeGreaterThan(0);
            expect(centers[ring].x).toBeLessThan(data.points[1].x);
          }
          for (let side = 0; side <= sides; side++) {
            const id = ring * (sides + 1) + side;
            expect(p.getY(id)).toBe(before.getY(id)); expect(p.getZ(id)).toBe(before.getZ(id));
            if (ring >= shoulderRing) expect(p.getX(id)).toBe(before.getX(id));
            else expect(Math.abs(p.getX(id) - before.getX(id) - displacement)).toBeLessThan(scale * 1e-6);
          }
        }
        // The chest closes well within its former anterior extension, without
        // collapsing onto the shoulder or changing the section's silhouette.
        const remaining = (data.points[1].x - centers[0].x) / (data.points[1].x - beforeCenters[0].x);
        expect(remaining).toBeGreaterThan(.3); expect(remaining).toBeLessThan(.5);
        const cap = (rings + 1) * (sides + 1);
        expect(at(p, cap).distanceTo(centers[0])).toBeLessThan(scale * 1e-6);
        expect(at(p, cap + 1).toArray()).toEqual(at(before, cap + 1).toArray());
        expect(p.getY(cap)).toBe(before.getY(cap)); expect(p.getZ(cap)).toBe(before.getZ(cap));
        expect(JSON.stringify(data)).toBe(snapshot); expect(JSON.stringify(options)).toBe(optionSnapshot);
      } finally { baseline.dispose(); compact.dispose(); }
    });
  }

  it('requires strict true and preserves every disabled buffer exactly', () => {
    const data = envelope(1, true), baseline = geometry(data);
    try { for (const flag of [undefined, false, null, 0, 1, 'true', {}, []]) {
      const disabled = geometry(data, { compactChest: flag });
      try { sameBuffers(disabled, baseline); } finally { disabled.dispose(); }
    } } finally { baseline.dispose(); }
  });

  it('leaves unsupported path lengths and non-forward chest spans exact', () => {
    const original = envelope(1, true);
    const cases = [
      { points: original.points.slice(0, 4), radii: original.radii.slice(0, 4) },
      { points: original.points.concat(vec(6, 0, 0)), radii: original.radii.concat([[.1, .1]]) },
      { points: original.points.map(p => vec(-p.x, p.y, p.z)), radii: original.radii },
      { points: original.points.map((p, i) => i === 0 ? vec(original.points[1].x, -.2, 0) : p.clone()), radii: original.radii }
    ];
    for (const data of cases) {
      const before = geometry(data), after = geometry(data, { compactChest: true });
      try { sameBuffers(after, before); } finally { before.dispose(); after.dispose(); }
    }
  });

  for (const id of ['diplodocus', 'amargasaurus', 'nigersaurus', 'brachiosaurus', 'tyrannosaurus', 'tarbosaurus']) {
    it('gates the actual torso caller and preserves mesh ownership for ' + id, () => {
      const built = buildBody(id), enabled = ['diplodocus', 'amargasaurus', 'nigersaurus'].includes(id);
      // Unreviewed powerful theropods retain the seven-station dorsal bridge.
      // The reviewed T.rex caller passes its aligned, explicitly sculpted arc.
      const waist = built.postcranialSurface.id === 'powerful-theropod', reviewed = id === 'tyrannosaurus';
      const data = { points: built.torsoPoints, radii: built.torsoRadii };
      const options = reviewed ? built.theropodTorso.options : waist ? { dorsalWaist: true } : { compactChest: enabled };
      const expected = geometry(data, options);
      const ordinary = geometry(data);
      expected.translate(-data.points[0].x, -data.points[0].y, -data.points[0].z);
      ordinary.translate(-data.points[0].x, -data.points[0].y, -data.points[0].z);
      try {
        const mesh = built.bodyShell;
        expect(built.model.children).toEqual([mesh]); sameBuffers(mesh.geometry, expected);
        if (enabled || waist) expect(mesh.geometry.attributes.position.array).not.toEqual(ordinary.attributes.position.array);
        else sameBuffers(mesh.geometry, ordinary);
        expect(mesh.position.toArray()).toEqual(data.points[0].toArray()); expect(mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
        expect(mesh.scale.toArray()).toEqual([1, 1, 1]); expect(mesh.material).toBe(built.bodyMat);
        expect(mesh.userData.dinoRegion).toBe('torso'); expect(mesh.name).toBe('continuous-torso');
        expect(mesh.castShadow).toBe(true); expect(mesh.receiveShadow).toBe(true);
        expect(built.idleMotion.body).toBe(mesh); expect(built.idleMotion.bodyBaseScale.toArray()).toEqual([1, 1, 1]);
        expect(built.idleMotion.bodyBaseScale).not.toBe(mesh.scale); expect(built.idleMotion.breathingMeshes).toHaveLength(0);
        expect(data.points[1].toArray()).toEqual(built.shoulder.toArray());
        if (reviewed) {
          expect(data.points).toHaveLength(11); expect(data.radii).toHaveLength(11);
          expect(options.smoothProfile).toBe(true); expect(options.sculptCaps).toBe(true); expect(options.rings).toBe(80);
          expect(typeof options.sculpt).toBe('function'); expect(built.postcranialSurface.id).toBe('powerful-theropod');
          // Inspect the actual sculpted caller result for closed, outward
          // triangles, finite normals, cap closure and matching seam normals.
          const worldGeometry=mesh.geometry.clone();worldGeometry.translate(...data.points[0].toArray());worldGeometry.computeBoundingBox();worldGeometry.computeBoundingSphere();
          try { closedOutwardSurface(worldGeometry,data,options.rings,24,1); } finally { worldGeometry.dispose(); }
        } else {
          expect(data.points).toHaveLength(7); expect(data.points[5].toArray()).toEqual(built.hip.toArray());
        }
      } finally { ordinary.dispose(); expected.dispose(); built.dispose(); }
    });
  }

  it('also requires the sauropod group when the long-low profile is present', () => {
    const built = buildBody('diplodocus', true, false), expected = geometry({ points: built.torsoPoints, radii: built.torsoRadii });
    expected.translate(-built.torsoPoints[0].x, -built.torsoPoints[0].y, -built.torsoPoints[0].z);
    try { sameBuffers(built.bodyShell.geometry, expected); } finally { expected.dispose(); built.dispose(); }
  });

  for (const id of ['diplodocus', 'brachiosaurus']) it('adds no torso or animation owner in the skeleton-only path for ' + id, () => {
    const built = buildBody(id, false);
    try {
      expect(built.bodyShell).toBeNull(); expect(built.model.children).toHaveLength(0);
      expect(built.idleMotion.body).toBeUndefined(); expect(built.idleMotion.bodyBaseScale).toBeUndefined();
      expect(built.idleMotion.breathingMeshes).toHaveLength(0);
    } finally { built.dispose(); }
  });
});
