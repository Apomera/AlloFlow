import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_FORELIMB_BLEND_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(registration)) throw new Error('Dino Lab registration missing');
window.StemLab = { registerTool() {} };
// Native construction sections call reviewed clade helpers added after this
// harness originated. Export their real closure-backed functions rather than
// replacing anatomy branches with stubs or maintaining an incomplete whitelist.
const nativeHelpers = [...new Set([...source.matchAll(/^  function (\w+)\(/gm)].map(match => match[1]))];
new Function(source.replace(registration,
  'globalThis.__forelimbBlend = { DINOS, skeletalAnatomyProfileFor, postcranialSurfaceProfileFor, ' + nativeHelpers.join(',') + ' };' + registration))();
const art = globalThis.__forelimbBlend;
delete globalThis.__forelimbBlend;
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
// Isolate the shoulder phase; full finish() tests still execute all later phases.
const forelimbCode = section('// Join the resting forelimb lighting', '// Soften the inferred hip-to-thigh transition');
const inContext = (code, result, context) => new Function('context', 'with (context) {' + code + '\nreturn ' + result + ';}')(context);

// Construct the native torso and planted leg surfaces. Decoration-only helpers
// are recorded so that the test remains independent of texture and WebGL setup.
function build(id = 'brachiosaurus', scale = 1, showBody = true, transformed = false) {
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
      const firstBefore = Array.from(args[1].geometry.attributes.normal.array), firstVersion = args[1].geometry.attributes.normal.version;
      const result = art.dinoBlendSurfaceNormals(...args);
      records.blends.push({ first: args[1], second: args[2], width: args[3], secondOnly: args[5], firstBefore, firstVersion, firstAfter: Array.from(args[1].geometry.attributes.normal.array), secondAfter: Array.from(args[2].geometry.attributes.normal.array), result }); return result;
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
  // Resolve the native connected frame before its torso and limb callers.
  // The fixture also exercises a lambeosaur, whose frame is no longer optional.
  context.snout = context.head.clone().add(vec(-context.len * .075, -context.ht * .020, 0));
  context.tail = vec(context.len * .52, context.ht * .34, 0);
  context.lambeosaurBody = art.dinoLambeosaurBodyFrame(THREE, dn, {
    len: context.len, ht: context.ht, headScale: art.reconstructionProfileFor(dn).head,
    shoulder: context.shoulder, hip: context.hip, head: context.head,
    snout: context.snout, tail: context.tail, bodyHeight: context.bodyHeight, bodyDepth: context.bodyDepth
  });
  if (context.lambeosaurBody) {
    const frame = context.lambeosaurBody;
    context.shoulder.copy(frame.shoulder); context.hip.copy(frame.hip); context.tail.copy(frame.tail);
    context.bodyDepth = frame.bodyDepth; context.bodyLen = Math.abs(context.hip.x - context.shoulder.x) * .72;
    model.userData.dinoFullBodyAnatomy = frame.metadata; model.userData.dinoLambeosaurBody = frame.metadata;
  }
  context.addSoftTissueChain = inContext(chainCode, 'addSoftTissueChain', context);
  Object.assign(context, inContext(torsoCode, '({ bodyShell, surfaceBodyDepth, surfaceBodyHeight })', context));
  const addLeg = inContext(legCode, 'addLeg', context);
  const stance = Math.max(.055 * scale, context.bodyDepth * .68) * context.skeletalProfile.stanceWidth;
  for (const front of [false, true]) for (const side of [1, -1]) addLeg((front ? context.shoulder : context.hip).x, side * stance, front);
  if (transformed) { model.position.set(2 * scale, -.3 * scale, scale); model.rotation.set(.12, -.25, .18); model.scale.set(1.12, .94, 1.06); }
  model.updateMatrixWorld(true);
  return { context, records, model, material, finish() { return inContext(finishCode, 'specimenBounds', context); },
    blendOnly() { return inContext(forelimbCode, 'undefined', context); },
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

describe('Dino Lab local weight-bearing forelimb shading', () => {
  for (const id of ['brachiosaurus', 'diplodocus', 'protoceratops', 'triceratops', 'styracosaurus', 'psittacosaurus']) for (const scale of [.03, 1, 12]) {
    it('smooths both planted shoulders and preserves all surface positions at scale ' + scale + ' for ' + id, () => {
      const built = build(id, scale), { bodyShell, idleMotion } = built.context;
      const meshes = [bodyShell, ...idleMotion.legs.map(e => e.mesh)], before = meshes.map(snapshot), anchorBefore = anchors(built);
      const operationBefore = JSON.stringify(built.records.operations), contacts = JSON.stringify(built.context.plantedFootContacts);
      try {
        built.blendOnly(); expect(built.records.blends).toHaveLength(2);
        for (let i = 0; i < meshes.length; i++) { preserved(meshes[i], before[i], i < 3); checkNormals(meshes[i]); }
        for (const entry of idleMotion.legs.filter(e => e.front)) {
          const result = entry.mesh.userData.dinoForelimbNormalBlend;
          expect(result.changed[0]).toBe(0); expect(result.changed[1]).toBeGreaterThan(0);
          expect(result.testedTriangles).toBeGreaterThan(0); expect(entry.forelimbBlendWidth).toBeGreaterThan(0);
          expect(built.records.planted).toContain(entry.mesh); expect(entry.mesh.userData.dinoPlantedPivot).toEqual(entry.mesh.position.toArray());
          expect(entry.contour.geometry).toBe(entry.mesh.geometry); expect(entry.mesh.material).toBe(built.material);
          const old = before[meshes.indexOf(entry.mesh)].normal, position = entry.mesh.geometry.attributes.position, normal = entry.mesh.geometry.attributes.normal;
          let protectedDistal = 0;
          for (let i = 0; i < position.count; i++) {
            const point = entry.mesh.localToWorld(at(position, i));
            if (point.y < built.context.shoulder.y * .40) { protectedDistal++; expect(at(normal, i).toArray()).toEqual(old.slice(i * 3, i * 3 + 3)); }
          }
          expect(protectedDistal).toBeGreaterThan(100);
        }
        expect(anchors(built)).toEqual(anchorBefore); expect(JSON.stringify(built.records.operations)).toBe(operationBefore);
        expect(JSON.stringify(built.context.plantedFootContacts)).toBe(contacts);
      } finally { built.dispose(); }
    });
  }

  it('supports the narrower rebbachisaurid shoulders with stable unit seam normals', () => {
    const built = build('nigersaurus');
    try { built.blendOnly(); expect(built.records.blends).toHaveLength(2); for (const call of built.records.blends) { expect(call.result.changed[1]).toBeGreaterThan(0); checkNormals(call.first); checkNormals(call.second); } }
    finally { built.dispose(); }
  });

  for (const id of ['iguanodon', 'tyrannosaurus']) it('leaves every actual off-group surface byte-identical for ' + id, () => {
    const built = build(id), meshes = [built.context.bodyShell, ...built.context.idleMotion.legs.map(e => e.mesh)], before = meshes.map(snapshot);
    try { built.blendOnly(); expect(built.records.blends).toHaveLength(0); expect(built.context.idleMotion.legs.every(e => e.forelimbBlendWidth === 0)).toBe(true); meshes.forEach((mesh, i) => preserved(mesh, before[i], true)); }
    finally { built.dispose(); }
  });

  it('blends both native lambeosaur shoulders while preserving their meshes, anchors, contacts and fixed torso normals', () => {
    const built = build('parasaurolophus'), { bodyShell, idleMotion } = built.context;
    const meshes = [bodyShell, ...idleMotion.legs.map(entry => entry.mesh)], before = meshes.map(snapshot), anchorBefore = anchors(built), contacts = JSON.stringify(built.context.plantedFootContacts);
    try {
      expect(built.context.lambeosaurBody.metadata.species).toBe('parasaurolophus');
      built.blendOnly();
      expect(built.records.blends).toHaveLength(2);
      const forelimbs = idleMotion.legs.filter(entry => entry.front);
      expect(forelimbs).toHaveLength(2);
      for (const call of built.records.blends) {
        expect(call.first).toBe(bodyShell); expect(forelimbs.some(entry => entry.mesh === call.second)).toBe(true);
        expect(call.secondOnly).toBe(true); expect(call.result.changed[0]).toBe(0); expect(call.result.changed[1]).toBeGreaterThan(0);
        // These newer native lofts have different ring counts and sections.
        // Check every real normal without imposing the older 48x24 topology.
        for (const mesh of [call.first, call.second]) {
          const normals = mesh.geometry.attributes.normal;
          for (let i = 0; i < normals.count; i++) { const normal = at(normals, i); expect(normal.toArray().every(Number.isFinite)).toBe(true); expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6); }
        }
      }
      meshes.forEach((mesh, i) => preserved(mesh, before[i])); preserved(bodyShell, before[0], true);
      expect(anchors(built)).toEqual(anchorBefore); expect(JSON.stringify(built.context.plantedFootContacts)).toBe(contacts);
    } finally { built.dispose(); }
  });

  it('does not blend positive-width entries outside the eligible clades', () => {
    const built = build(), meshes = [built.context.bodyShell, ...built.context.idleMotion.legs.map(e => e.mesh)], before = meshes.map(snapshot);
    try { built.context.isSauropod = false; built.blendOnly(); expect(built.records.blends).toHaveLength(0); meshes.forEach((m, i) => preserved(m, before[i], true)); }
    finally { built.dispose(); }
  });

  it('does not access or mutate planted limbs when the life torso is absent', () => {
    const built = build(), legs = built.context.idleMotion.legs, before = legs.map(e => snapshot(e.mesh));
    try { built.context.bodyShell = null; built.blendOnly(); expect(built.records.blends).toHaveLength(0); legs.forEach((e, i) => preserved(e.mesh, before[i], true)); }
    finally { built.dispose(); }
  });

  for (const id of ['brachiosaurus', 'protoceratops']) it('creates no skin, motion entries or blending in the skeleton-only construction path for ' + id, () => {
    const built = build(id, 1, false);
    try { expect(built.context.bodyShell).toBeNull(); expect(built.context.idleMotion.legs).toHaveLength(0); built.blendOnly(); expect(built.records.blends).toHaveLength(0); expect(built.records.planted).toHaveLength(0); }
    finally { built.dispose(); }
  });

  for (const id of ['brachiosaurus', 'protoceratops']) it('uses the planted coordinate frame under an existing transformed model without moving anchors for ' + id, () => {
    const built = build(id, 1, true, true), meshes = [built.context.bodyShell, ...built.context.idleMotion.legs.map(e => e.mesh)];
    const before = meshes.map(snapshot), anchorBefore = anchors(built);
    try { built.blendOnly(); expect(built.records.blends).toHaveLength(2); for (const call of built.records.blends) expect(call.result.changed[1]).toBeGreaterThan(0); meshes.forEach((mesh, i) => { preserved(mesh, before[i], i < 3); checkNormals(mesh); }); expect(anchors(built)).toEqual(anchorBefore); }
    finally { built.dispose(); }
  });

  for (const id of ['brachiosaurus', 'protoceratops', 'triceratops', 'styracosaurus']) it('finishes head and neck joins before forelimbs and bakes their resulting normal fields once for ' + id, () => {
    const built = build(id);
    for (const region of ['head', 'neck']) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), built.material); mesh.position.set(-4, 2, 0); mesh.userData.dinoRegion = region; built.model.add(mesh);
      if (region === 'head') built.context.headShell = mesh; else built.context.neckMeshes = [mesh];
    }
    built.model.updateMatrixWorld(true);
    try {
      built.finish(); expect(built.records.blends).toHaveLength(4);
      const pairs = built.records.blends.map(call => [call.first.userData.dinoRegion, call.second.userData.dinoRegion]);
      expect(pairs).toEqual([['head', 'neck'], ['torso', 'neck'], ['torso', 'foreleg-1'], ['torso', 'foreleg--1']]);
      expect(built.records.baked).toHaveLength(7); expect(built.records.baked.every(r => r.blendCount === 4)).toBe(true);
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
});

function planes(scale, transformed) {
  const model = new THREE.Group(), material = new THREE.MeshBasicMaterial();
  const first = new THREE.Mesh(new THREE.PlaneGeometry(scale * 2, scale * 2, 4, 4), material);
  const second = new THREE.Mesh(first.geometry.clone(), material);
  const n = second.geometry.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, .6, 0, .8);
  model.add(first, second);
  if (transformed) { model.rotation.set(.15, -.35, .2); model.scale.set(1.2, .7, .9); model.position.set(scale, scale * -.3, scale * 2); }
  model.updateMatrixWorld(true);
  for (const mesh of [first, second]) { mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); }
  return { first, second, dispose() { first.geometry.dispose(); second.geometry.dispose(); material.dispose(); } };
}

describe('One-sided normal blending protects established adjoining surfaces', () => {
  for (const scale of [.03, 1, 12]) for (const transformed of [false, true]) {
    it('keeps first normals and attribute version exact while shading only the second at scale ' + scale + ', transformed ' + transformed, () => {
      const pair = planes(scale, transformed), before = [snapshot(pair.first), snapshot(pair.second)];
      const firstNormal = pair.first.geometry.attributes.normal, secondNormal = pair.second.geometry.attributes.normal;
      const firstVersion = firstNormal.version, secondVersion = secondNormal.version;
      const matrix = new THREE.Matrix3().getNormalMatrix(pair.first.matrixWorld);
      const expected = vec(0, 0, 1).applyMatrix3(matrix).normalize();
      try {
        const result = art.dinoBlendSurfaceNormals(THREE, pair.first, pair.second, scale * .2, null, true);
        expect(result.changed).toEqual([0, secondNormal.count]); expect(result.testedTriangles).toBeGreaterThan(0);
        expect(firstNormal.version).toBe(firstVersion); expect(secondNormal.version).toBe(secondVersion + 1);
        expect(pair.first.geometry.attributes.normal).toBe(firstNormal); expect(pair.second.geometry.attributes.normal).toBe(secondNormal);
        preserved(pair.first, before[0], true); preserved(pair.second, before[1]);
        for (let i = 0; i < secondNormal.count; i++) {
          const normal = at(secondNormal, i); expect(normal.toArray().every(Number.isFinite)).toBe(true);
          expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
          expect(normal.applyMatrix3(matrix).normalize().distanceTo(expected)).toBeLessThan(1e-6);
        }
      } finally { pair.dispose(); }
    });
  }

  it('fades the fixed-surface match with distance and preserves normals at and beyond the blend width', () => {
    const width = .2, initial = vec(.6, 0, .8), target = vec(0, 0, 1), angles = [];
    for (const distance of [0, .05, .1, .15, .2, .21]) {
      const pair = planes(1, false);
      pair.second.position.z = distance; pair.second.updateMatrixWorld(true);
      const before = [snapshot(pair.first), snapshot(pair.second)];
      const firstVersion = pair.first.geometry.attributes.normal.version, secondVersion = pair.second.geometry.attributes.normal.version;
      try {
        const result = art.dinoBlendSurfaceNormals(THREE, pair.first, pair.second, width, null, true);
        preserved(pair.first, before[0], true); preserved(pair.second, before[1], distance >= width);
        expect(pair.first.geometry.attributes.normal.version).toBe(firstVersion);
        expect(result.changed).toEqual([0, distance < width ? 25 : 0]);
        expect(pair.second.geometry.attributes.normal.version).toBe(secondVersion + (distance < width ? 1 : 0));
        const normal = at(pair.second.geometry.attributes.normal, 12);
        expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
        if (distance === 0) expect(normal.distanceTo(target)).toBeLessThan(1e-6);
        if (distance === width / 2) expect(normal.distanceTo(initial.clone().add(target).normalize())).toBeLessThan(1e-6);
        angles.push(normal.angleTo(target));
      } finally { pair.dispose(); }
    }
    for (let i = 1; i < 5; i++) expect(angles[i]).toBeGreaterThan(angles[i - 1]);
    expect(angles[5]).toBe(angles[4]);
  });

  it('respects the front boundary and reaches the fixed normal only beyond its transition band', () => {
    const pair = planes(1, false), before = [snapshot(pair.first), snapshot(pair.second)];
    const initial = vec(.6, 0, .8), target = vec(0, 0, 1), halfway = initial.clone().add(target).normalize();
    try {
      const result = art.dinoBlendSurfaceNormals(THREE, pair.first, pair.second, 1, 0, true);
      expect(result.changed).toEqual([0, 10]); preserved(pair.first, before[0], true); preserved(pair.second, before[1]);
      const positions = pair.second.geometry.attributes.position, normals = pair.second.geometry.attributes.normal;
      for (let i = 0; i < normals.count; i++) {
        const x = positions.getX(i), normal = at(normals, i);
        if (x <= 0) expect(normal.toArray()).toEqual(before[1].normal.slice(i * 3, i * 3 + 3));
        else expect(normal.distanceTo(x === .5 ? halfway : target)).toBeLessThan(1e-6);
      }
    } finally { pair.dispose(); }
  });

  it('never pulls perpendicular or opposed surfaces toward the fixed normal', () => {
    for (const direction of [vec(1, 0, 0), vec(.6, 0, -.8)]) {
      const pair = planes(1, false), normals = pair.second.geometry.attributes.normal;
      for (let i = 0; i < normals.count; i++) normals.setXYZ(i, direction.x, direction.y, direction.z);
      const before = [snapshot(pair.first), snapshot(pair.second)];
      const versions = [pair.first.geometry.attributes.normal.version, normals.version];
      try {
        const result = art.dinoBlendSurfaceNormals(THREE, pair.first, pair.second, .2, null, true);
        expect(result.changed).toEqual([0, 0]); expect(result.testedTriangles).toBeGreaterThan(0);
        preserved(pair.first, before[0], true); preserved(pair.second, before[1], true);
        expect([pair.first.geometry.attributes.normal.version, normals.version]).toEqual(versions);
      } finally { pair.dispose(); }
    }
  });

  it('requires strict true and retains the default symmetric result for all other option values', () => {
    const reference = planes(1, false);
    try {
      const expectedSummary = art.dinoBlendSurfaceNormals(THREE, reference.first, reference.second, .2);
      const expected = [snapshot(reference.first), snapshot(reference.second)], expectedNormal = vec(.6, 0, 1.8).normalize();
      expect(expectedSummary.changed).toEqual([25, 25]);
      for (const mesh of [reference.first, reference.second]) for (let i = 0; i < 25; i++)
        expect(at(mesh.geometry.attributes.normal, i).distanceTo(expectedNormal)).toBeLessThan(1e-6);
      for (const value of [undefined, false, null, 0, 1, 'true', {}, [], NaN]) {
        const pair = planes(1, false);
        try {
          const summary = art.dinoBlendSurfaceNormals(THREE, pair.first, pair.second, .2, null, value);
          expect(summary).toEqual(expectedSummary); expect(snapshot(pair.first)).toEqual(expected[0]); expect(snapshot(pair.second)).toEqual(expected[1]);
        } finally { pair.dispose(); }
      }
    } finally { reference.dispose(); }
  });

  it('produces identical native forelimb normals in either processing order while retaining the torso field', () => {
    const forward = build('brachiosaurus'), reverse = build('brachiosaurus');
    const original = snapshot(forward.context.bodyShell), version = forward.context.bodyShell.geometry.attributes.normal.version;
    reverse.context.idleMotion.legs.reverse();
    try {
      forward.blendOnly(); reverse.blendOnly();
      preserved(forward.context.bodyShell, original, true); preserved(reverse.context.bodyShell, original, true);
      expect(forward.context.bodyShell.geometry.attributes.normal.version).toBe(version);
      expect(reverse.context.bodyShell.geometry.attributes.normal.version).toBe(version);
      for (const entry of forward.context.idleMotion.legs) {
        const other = reverse.context.idleMotion.legs.find(e => e.mesh.userData.dinoRegion === entry.mesh.userData.dinoRegion);
        expect(snapshot(other.mesh)).toEqual(snapshot(entry.mesh));
      }
      for (const built of [forward, reverse]) for (const call of built.records.blends) {
        expect(call.secondOnly).toBe(true); expect(call.result.changed[0]).toBe(0);
        expect(call.firstBefore).toEqual(call.firstAfter); expect(call.first.geometry.attributes.normal.version).toBe(call.firstVersion);
      }
    } finally { forward.dispose(); reverse.dispose(); }
  });

  it('preserves a freshly blended native shoulder and neck field through both forelimbs and the skin bake', () => {
    const built = build('brachiosaurus');
    const head = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), built.material);
    head.position.set(-4, 2, 0); head.userData.dinoRegion = 'head'; built.model.add(head); built.context.headShell = head;
    const neck = new THREE.Mesh(new THREE.SphereGeometry(.5, 24, 16), built.material);
    neck.position.copy(built.context.shoulder).add(vec(.15, -.20, .20)); neck.userData.dinoRegion = 'neck'; built.model.add(neck); built.context.neckMeshes = [neck];
    built.model.updateMatrixWorld(true);
    try {
      built.finish();
      const shoulder = built.records.blends[1], forelimbs = built.records.blends.slice(2);
      expect(shoulder.first).toBe(built.context.bodyShell); expect(shoulder.second).toBe(neck);
      expect(shoulder.result.changed[0]).toBeGreaterThan(0); expect(shoulder.result.changed[1]).toBeGreaterThan(0);
      expect(forelimbs).toHaveLength(2);
      for (const call of forelimbs) {
        expect(call.secondOnly).toBe(true); expect(call.result.changed[0]).toBe(0); expect(call.result.changed[1]).toBeGreaterThan(0);
        expect(call.firstBefore).toEqual(shoulder.firstAfter); expect(call.firstAfter).toEqual(shoulder.firstAfter);
        expect(call.first.geometry.attributes.normal.version).toBe(call.firstVersion);
      }
      expect(Array.from(neck.geometry.attributes.normal.array)).toEqual(shoulder.secondAfter);
      expect(Array.from(built.context.bodyShell.geometry.attributes.normal.array)).toEqual(shoulder.firstAfter);
      for (const mesh of [neck, built.context.bodyShell]) {
        const baked = built.records.baked.find(record => record.geometry === mesh.geometry);
        expect(baked.normal).toEqual(Array.from(mesh.geometry.attributes.normal.array)); expect(baked.blendCount).toBe(4);
      }
    } finally { built.dispose(); }
  });
});
