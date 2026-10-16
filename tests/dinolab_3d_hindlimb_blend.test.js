import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_HINDLIMB_BLEND_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(registration)) throw new Error('Dino Lab registration missing');
window.StemLab = { registerTool() {} };
new Function(source.replace(registration,
  'globalThis.__hindlimbBlend = { DINOS, skeletalAnatomyProfileFor, postcranialSurfaceProfileFor, dinoFootSurfaceProfileFor, dinoIguanodontThumbEnabled, dinoCeratopsianForelegRadii, dinoSurfaceGeometry, dinoCranialGeometry, dinoTorsoRadii, dinoPlantLimbSurface, dinoBlendSurfaceNormals, dinoSkinCoordinates, dinoBeakSkinClosure };' + registration))();
const art = globalThis.__hindlimbBlend;
delete globalThis.__hindlimbBlend;
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const at = (attribute, index) => vec().fromBufferAttribute(attribute, index);
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing native construction section: ' + start);
  return source.slice(a, b);
}
const chainCode = section('function addSoftTissueChain(', 'function addContourGroup(meshes)');
const torsoCode = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
const legCode = section('function addLeg(x, z, front) {', 'var stance =');
const finishCode = section('// Soften only the rear cranial join', 'var studyBounds =');
const hindlimbCode = section('// Soften the inferred hip-to-thigh transition', '// Match the exposed tail collar');
const inContext = (code, result, context) => new Function('context', 'with (context) {' + code + '\nreturn ' + result + ';}')(context);

// Construct the native torso and planted leg surfaces. Decoration-only helpers
// are recorded so that the test remains independent of texture and WebGL setup.
function build(id = 'tyrannosaurus', scale = 1, showBody = true, transformed = false) {
  const dn = art.DINOS.find(d => d.id === id);
  if (!dn) throw new Error('Missing catalog species ' + id);
  const model = new THREE.Group(), material = new THREE.MeshPhongMaterial();
  material.userData.dinoSkinMapping = true;
  const records = { anchors: [], operations: [], planted: [], blends: [], baked: [] };
  const record = name => (...args) => { records.operations.push({ name, args: args.map(a => a?.isVector3 ? a.toArray() : a) }); return null; };
  const context = {
    THREE, vec, ...art, model, bodyMat: material, bodyWireMat: material,
    props: { showBody, showSkeleton: false }, dn, cladeName: dn.clade,
    detailScale: scale, len: 8 * scale, ht: 3 * scale, bodyLen: 2.88 * scale,
    bodyHeight: .58 * scale, bodyDepth: .70 * scale,
    shoulder: vec(-1.44, 1.45, 0).multiplyScalar(scale), hip: vec(1.44, 1.30, 0).multiplyScalar(scale),
    posture: { kneeFlex: .05, footReach: 1 },
    skeletalProfile: art.skeletalAnatomyProfileFor(dn), postcranialSurface: art.postcranialSurfaceProfileFor(dn),
    isSauropod: dn.group === 'sauropod', isTheropod: dn.group === 'theropod',
    surfaceHypothesis: { bodyHeightScale: 1, bodyDepthScale: 1, featureScales: true },
    idleMotion: { legs: [], breathingMeshes: [] }, plantedFootContacts: [],
    headShell: null, neckMeshes: [], tailMeshes: [], surfaceHeadHeight: .2 * scale, surfaceHeadDepth: .2 * scale,
    neckBaseRadius: .15 * scale, head: vec(-4, 2, 0).multiplyScalar(scale),
    addBodyPartAnchor(part, point) {
      const anchor = new THREE.Object3D(); anchor.position.copy(point); anchor.userData.dinoBodyPart = part;
      model.add(anchor); records.anchors.push(anchor); return anchor;
    },
    dinoPlantLimbSurface(...args) { records.planted.push(args[1]); return art.dinoPlantLimbSurface(...args); },
    dinoBlendSurfaceNormals(...args) {
      const firstBefore = Array.from(args[1].geometry.attributes.normal.array), firstVersion = args[1].geometry.attributes.normal.version, secondVersion = args[2].geometry.attributes.normal.version;
      const result = art.dinoBlendSurfaceNormals(...args);
      records.blends.push({ first: args[1], second: args[2], width: args[3], secondOnly: args[5], firstBefore, firstVersion, secondVersion, plantedAtCall: records.planted.includes(args[2]), firstAfter: Array.from(args[1].geometry.attributes.normal.array), secondAfter: Array.from(args[2].geometry.attributes.normal.array), result }); return result;
    },
    dinoSkinCoordinates(...args) {
      records.baked.push({ geometry: args[1], normal: Array.from(args[1].attributes.normal.array), blendCount: records.blends.length });
      return art.dinoSkinCoordinates(...args);
    },
    addBone: record('bone'), addLongBone: record('longBone'), addLimbJoint: record('joint'), addLimbCrest: record('crest'),
    addDigitFan: record('digits'), addSoftTissueDigitFan: record('softDigits'), addIguanodontThumb: record('thumb'),
    addMuscleBelly: record('muscle'), addContourPlumage: record('contourPlumage'), addLimbPlumage: record('limbPlumage'),
    addBodyContour(mesh) {
      const contour = new THREE.Mesh(mesh.geometry, material); contour.userData.dinoContour = true;
      contour.position.copy(mesh.position); model.add(contour); return contour;
    }
  };
  context.addSoftTissueChain = inContext(chainCode, 'addSoftTissueChain', context);
  Object.assign(context, inContext(torsoCode, '({ bodyShell, surfaceBodyDepth, surfaceBodyHeight })', context));
  const addLeg = inContext(legCode, 'addLeg', context);
  const stance = Math.max(.055 * scale, context.bodyDepth * .68) * context.skeletalProfile.stanceWidth;
  for (const front of [false, true]) for (const side of [1, -1]) addLeg((front ? context.shoulder : context.hip).x, side * stance, front);
  if (transformed) { model.position.set(2 * scale, -.3 * scale, scale); model.rotation.set(.12, -.25, .18); model.scale.set(1.12, .94, 1.06); }
  model.updateMatrixWorld(true);
  return { context, records, model, material, finish() { return inContext(finishCode, 'specimenBounds', context); },
    blendOnly() { return inContext(hindlimbCode, 'undefined', context); },
    dispose() { const geometries = new Set(); model.traverse(p => { if (p.geometry) geometries.add(p.geometry); }); geometries.forEach(g => g.dispose()); material.dispose(); } };
}
function snapshot(mesh) {
  const g = mesh.geometry;
  return { position: Array.from(g.attributes.position.array), normal: Array.from(g.attributes.normal.array), uv: Array.from(g.attributes.uv.array), index: Array.from(g.index.array),
    matrix: mesh.matrix.toArray(), world: mesh.matrixWorld.toArray(), box: [g.boundingBox.min.toArray(), g.boundingBox.max.toArray()],
    sphere: [g.boundingSphere.center.toArray(), g.boundingSphere.radius], pivot: mesh.userData.dinoPlantedPivot?.slice() };
}
function preserved(mesh, before, normals = false) {
  const actual = snapshot(mesh), expected = { ...before };
  if (!normals) { delete actual.normal; delete expected.normal; }
  expect(actual).toEqual(expected);
}
function checkNormals(mesh) {
  const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal;
  for (let i = 0; i < n.count; i++) { const normal = at(n, i); expect(normal.toArray().every(Number.isFinite)).toBe(true); expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6); }
  for (let ring = 0; ring <= 48; ring++) {
    const first = ring * 25, last = first + 24;
    expect(at(p, first).distanceTo(at(p, last))).toBeLessThan(1e-5);
    expect(at(n, first).distanceTo(at(n, last))).toBeLessThan(2e-6);
  }
}
function anchors(built) { return built.records.anchors.map(a => ({ point: a.getWorldPosition(vec()).toArray(), local: a.position.toArray(), parent: a.parent.uuid })); }

function entries(built) { return built.context.idleMotion.legs; }
function allMeshes(built) { return [built.context.bodyShell, ...entries(built).map(e => e.mesh)]; }
function immutableState(built) {
  return {
    anchors: anchors(built), operations: JSON.stringify(built.records.operations),
    contacts: JSON.stringify(built.context.plantedFootContacts),
    motion: entries(built).map(e => ({ front: e.front, side: e.side, rotation: e.baseRotation.toArray(), position: e.mesh.position.toArray(), parent: e.mesh.parent.uuid, contourParent: e.contour.parent.uuid })),
    profile: JSON.stringify(built.context.postcranialSurface), skeleton: JSON.stringify(built.context.skeletalProfile)
  };
}
function assertLocalHipChange(built, before) {
  const meshes = allMeshes(built), body = built.context.bodyShell;
  expect(built.records.blends).toHaveLength(2);
  preserved(body, before[0], true);
  for (const call of built.records.blends) {
    expect(call.first).toBe(body); expect(call.secondOnly).toBe(true);
    expect(call.firstAfter).toEqual(call.firstBefore);
    expect(call.first.geometry.attributes.normal.version).toBe(call.firstVersion);
    expect(call.second.geometry.attributes.normal.version).toBe(call.secondVersion + 1);
    expect(call.result.changed[0]).toBe(0); expect(call.result.changed[1]).toBeGreaterThan(0);
    expect(call.result.testedTriangles).toBeGreaterThan(0); expect(call.plantedAtCall).toBe(true);
  }
  for (const entry of entries(built)) {
    const mesh = entry.mesh, previous = before[meshes.indexOf(mesh)];
    preserved(mesh, previous, entry.front); checkNormals(mesh);
    expect(entry.contour.geometry).toBe(mesh.geometry); expect(mesh.material).toBe(built.material);
    expect(mesh.userData.dinoPlantedPivot).toEqual(mesh.position.toArray());
    if (entry.front) {
      expect(entry.hindlimbBlendWidth).toBe(0); expect(mesh.userData.dinoHindlimbNormalBlend).toBeUndefined();
      continue;
    }
    const result = mesh.userData.dinoHindlimbNormalBlend;
    expect(result.changed).toEqual(built.records.blends.find(call => call.second === mesh).result.changed);
    expect(entry.hindlimbBlendWidth).toBeGreaterThan(0);
    expect(entry.hindlimbBlendWidth).toBeLessThanOrEqual(built.context.surfaceBodyDepth * .30);
    const positions = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
    let protectedDistal = 0, modifiedProximal = 0;
    for (let i = 0; i < positions.count; i++) {
      const point = built.model.worldToLocal(mesh.localToWorld(at(positions, i)));
      const old = previous.normal.slice(i * 3, i * 3 + 3), next = at(normals, i).toArray();
      if (point.y < built.context.hip.y * .40) {
        protectedDistal++; expect(next).toEqual(old);
      } else if (next.some((v, j) => v !== old[j])) modifiedProximal++;
    }
    expect(protectedDistal).toBeGreaterThan(100); expect(modifiedProximal).toBeGreaterThan(0);
  }
}

describe('Dino Lab local tyrannosauroid hip shading', () => {
  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) for (const scale of [.03, 1, 12]) {
    it('joins both planted thighs while preserving shape, distal shading and anatomy at scale ' + scale + ' for ' + id, () => {
      const built = build(id, scale), before = allMeshes(built).map(snapshot), state = immutableState(built);
      try {
        expect(built.context.postcranialSurface.id).toBe('powerful-theropod');
        built.blendOnly(); assertLocalHipChange(built, before);
        expect(built.records.blends.map(c => c.second.userData.dinoRegion)).toEqual(['hindleg-1', 'hindleg--1']);
        expect(immutableState(built)).toEqual(state);
      } finally { built.dispose(); }
    });
  }

  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) {
    it('uses planted mesh coordinates under rotation and nonuniform model scale for ' + id, () => {
      const built = build(id, 1, true, true), before = allMeshes(built).map(snapshot), state = immutableState(built);
      try { built.blendOnly(); assertLocalHipChange(built, before); expect(immutableState(built)).toEqual(state); }
      finally { built.dispose(); }
    });
  }

  for (const id of ['brachiosaurus', 'diplodocus', 'protoceratops', 'triceratops', 'parasaurolophus', 'velociraptor']) {
    it('leaves off-profile anatomy and every normal exact for ' + id, () => {
      const built = build(id), meshes = allMeshes(built), before = meshes.map(snapshot), state = immutableState(built);
      try {
        expect(built.context.postcranialSurface.id).not.toBe('powerful-theropod');
        built.blendOnly(); expect(built.records.blends).toHaveLength(0);
        expect(entries(built).every(e => e.hindlimbBlendWidth === 0)).toBe(true);
        meshes.forEach((m, i) => preserved(m, before[i], true)); expect(immutableState(built)).toEqual(state);
      } finally { built.dispose(); }
    });
  }

  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) {
    it('does not create or shade life surfaces in fossil-only construction for ' + id, () => {
      const built = build(id, 1, false);
      try {
        expect(built.context.bodyShell).toBeNull(); expect(entries(built)).toHaveLength(0);
        built.blendOnly(); expect(built.records.blends).toHaveLength(0); expect(built.records.planted).toHaveLength(0);
      } finally { built.dispose(); }
    });
  }

  it('does not access leg entries without a life torso', () => {
    const built = build(), meshes = allMeshes(built), before = meshes.map(snapshot);
    try {
      built.context.bodyShell = null;
      built.context.idleMotion.legs = new Proxy([], { get() { throw new Error('Unexpected limb access'); } });
      built.blendOnly(); expect(built.records.blends).toHaveLength(0); meshes.forEach((m, i) => preserved(m, before[i], true));
    } finally { built.dispose(); }
  });

  it('rejects positive widths when the current surface profile is ineligible', () => {
    const built = build(), meshes = allMeshes(built), before = meshes.map(snapshot);
    try {
      built.context.postcranialSurface = { ...built.context.postcranialSurface, id: 'ineligible' };
      built.blendOnly(); expect(built.records.blends).toHaveLength(0); meshes.forEach((m, i) => preserved(m, before[i], true));
    } finally { built.dispose(); }
  });

  for (const width of [0, -1, NaN]) it('skips entries with inactive blend width ' + width, () => {
    const built = build(), meshes = allMeshes(built), before = meshes.map(snapshot);
    try {
      entries(built).forEach(e => { e.hindlimbBlendWidth = width; }); built.blendOnly();
      expect(built.records.blends).toHaveLength(0); meshes.forEach((m, i) => preserved(m, before[i], true));
    } finally { built.dispose(); }
  });

  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) {
    it('finishes cranial and shoulder joins before hips and bakes the completed normals once for ' + id, () => {
      const built = build(id);
      for (const region of ['head', 'neck', 'tail']) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), built.material);
        mesh.position.set(region === 'tail' ? 4 : -4, 2, 0); mesh.userData.dinoRegion = region; built.model.add(mesh);
        if (region === 'head') built.context.headShell = mesh;
        else if (region === 'neck') built.context.neckMeshes = [mesh];
        else built.context.tailMeshes = [mesh];
      }
      built.model.updateMatrixWorld(true);
      const tail = built.context.tailMeshes[0]; tail.geometry.computeBoundingBox(); tail.geometry.computeBoundingSphere();
      const tailBefore = snapshot(tail);
      try {
        built.finish();
        expect(built.records.blends.map(call => [call.first.userData.dinoRegion, call.second.userData.dinoRegion])).toEqual([
          ['head', 'neck'], ['torso', 'neck'], ['torso', 'hindleg-1'], ['torso', 'hindleg--1']
        ]);
        expect(built.records.baked).toHaveLength(8); expect(built.records.baked.every(r => r.blendCount === 4)).toBe(true);
        expect(new Set(built.records.baked.map(r => r.geometry)).size).toBe(8); preserved(tail, tailBefore, true);
        for (const call of built.records.blends.slice(2)) {
          expect(call.firstAfter).toEqual(call.firstBefore); expect(call.secondOnly).toBe(true); expect(call.plantedAtCall).toBe(true);
          expect(call.result.changed[1]).toBeGreaterThan(0);
        }
        built.model.traverse(mesh => {
          if (!mesh.isMesh || mesh.userData.dinoContour) return;
          const g = mesh.geometry, matrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
          for (let i = 0; i < g.attributes.normal.count; i++) {
            expect(at(g.attributes.dinoSkinNormal, i).distanceTo(at(g.attributes.normal, i).applyMatrix3(matrix).normalize())).toBeLessThan(1e-6);
            expect(at(g.attributes.dinoSkinPosition, i).distanceTo(at(g.attributes.position, i).applyMatrix4(mesh.matrixWorld))).toBeLessThan(1e-6);
          }
        });
      } finally { built.dispose(); }
    });
  }
});
