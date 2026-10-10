import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_TAIL_COLLAR_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
window.StemLab = { registerTool() {} };
new Function(source.replace(registration, 'globalThis.__tailCollar = { DINOS, postcranialSurfaceProfileFor, dinoSurfaceGeometry, dinoCranialGeometry, dinoTorsoRadii, dinoTailSkinEnvelope, dinoBlendSurfaceNormals, dinoSkinCoordinates, dinoSurfacePartIds };' + registration))();
const art = globalThis.__tailCollar; delete globalThis.__tailCollar;
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function section(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a); if (a < 0 || b <= a) throw Error('Missing construction section ' + start); return source.slice(a, b); }
const chainCode = section('function addSoftTissueChain(', 'function addContourGroup(meshes)');
const torsoCode = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
const tailCode = section('var tailMidA =', 'var tailSurfaceCurve =');
const blendCode = section('// Match the exposed tail collar', '// Frame anatomy, not sprites');
const evaluate = (code, result, context) => new Function('context', 'with (context) {' + code + '\nreturn ' + result + ';}')(context);
function build(id, scale = 1, transformed = false) {
  const dn = art.DINOS.find(d => d.id === id), model = new THREE.Group(), material = new THREE.MeshPhongMaterial();
  if (!dn) throw Error('Missing native species ' + id);
  const ht = dn.heightM * scale, len = dn.lengthM * scale, isSauropod = dn.group === 'sauropod', isTheropod = dn.group === 'theropod';
  const hip = vec(len * .12, ht * (isTheropod ? .78 : .45), 0), shoulder = vec(-len * (isTheropod ? .12 : .18), ht * (isSauropod ? .55 : .48), 0);
  const profile = art.postcranialSurfaceProfileFor(dn), bodyHeight = ht * (isSauropod ? .18 : .19);
  const context = { ...art, THREE, vec, dn, model, bodyMat: material, props: { showBody: true },
    ht, len, detailScale: Math.min(1, ht / 2), hip, shoulder, tail: vec(len * .52, ht * (isTheropod ? .65 : .34), 0),
    bodyHeight, bodyDepth: bodyHeight * (isTheropod ? .92 : 1.08), bodyLen: Math.abs(hip.x - shoulder.x) * .72,
    surfaceHypothesis: { bodyHeightScale: 1, bodyDepthScale: 1, tailSoftTissueScale: 1 }, reconstructionProfile: { tailTip: 1 },
    postcranialSurface: profile, isSauropod, isTheropod, idleMotion: {},
    tailBaseRadius: Math.max(.045 * Math.min(1, ht / 2), ht * (isTheropod ? .105 : .075)) * profile.tailBaseFullness };
  context.addSoftTissueChain = evaluate(chainCode, 'addSoftTissueChain', context);
  Object.assign(context, evaluate(torsoCode, '({bodyShell, pelvisCenter, surfaceBodyHeight, surfaceBodyDepth})', context));
  Object.assign(context, evaluate(tailCode, '({tailMeshes, tailSkinRoot, tailSkinEnvelope})', context));
  if (transformed) { model.position.set(scale, -.3 * scale, 2 * scale); model.rotation.set(.12, -.25, .18); model.scale.set(1.12, .94, 1.06); }
  model.updateMatrixWorld(true);
  return { context, model, tail: context.tailMeshes[0], torso: context.bodyShell,
    blend: () => evaluate(blendCode, 'undefined', context),
    dispose() { model.traverse(o => o.geometry?.dispose()); material.dispose(); } };
}
function snapshot(mesh) {
  mesh.updateWorldMatrix(true, false); const g = mesh.geometry;
  return { position: Array.from(g.attributes.position.array), normal: Array.from(g.attributes.normal.array), uv: Array.from(g.attributes.uv.array), index: Array.from(g.index.array), matrix: mesh.matrix.toArray(), world: mesh.matrixWorld.toArray(), box: [g.boundingBox.min.toArray(), g.boundingBox.max.toArray()], sphere: [g.boundingSphere.center.toArray(), g.boundingSphere.radius] };
}
function sameShape(mesh, before) { const after = snapshot(mesh); delete after.normal; const expected = { ...before }; delete expected.normal; expect(after).toEqual(expected); }

describe('Sauropod tail collar shading', () => {
  for (const id of ['brachiosaurus', 'diplodocus', 'nigersaurus', 'alamosaurus', 'plateosaurus']) it('softens the native pelvic join while preserving tail geometry for ' + id, () => {
    const b = build(id), before = snapshot(b.tail), torso = snapshot(b.torso), version = b.torso.geometry.attributes.normal.version;
    try {
      b.blend(); const result = b.tail.userData.dinoTailNormalBlend;
      expect(result.changed[0]).toBe(0); expect(result.changed[1]).toBeGreaterThan(0);
      sameShape(b.tail, before); expect(snapshot(b.torso)).toEqual(torso); expect(b.torso.geometry.attributes.normal.version).toBe(version);
      expect(b.tail.position.toArray()).toEqual(b.context.hip.toArray());
      const g = b.tail.geometry, normals = g.attributes.normal;
      for (let i = 0; i < normals.count; i++) { const n = vec().fromBufferAttribute(normals, i); expect(n.toArray().every(Number.isFinite)).toBe(true); expect(Math.abs(n.length() - 1)).toBeLessThan(1e-6); }
      for (let ring = 0; ring <= 48; ring++) expect(vec().fromBufferAttribute(normals, ring * 25).distanceTo(vec().fromBufferAttribute(normals, ring * 25 + 24))).toBeLessThan(2e-6);
      // The middle and distal tail retain their established lighting as well as shape.
      expect(Array.from(normals.array.slice(30 * 25 * 3, 49 * 25 * 3))).toEqual(before.normal.slice(30 * 25 * 3, 49 * 25 * 3));
      art.dinoSkinCoordinates(THREE, g, b.tail.matrixWorld, true);
      const nm = new THREE.Matrix3().getNormalMatrix(b.tail.matrixWorld);
      for (let i = 0; i < normals.count; i++) expect(vec().fromBufferAttribute(g.attributes.dinoSkinNormal, i).distanceTo(vec().fromBufferAttribute(normals, i).applyMatrix3(nm).normalize())).toBeLessThan(1e-6);
    } finally { b.dispose(); }
  });
  for (const scale of [.03, 4]) it('preserves the planted coordinate frame at transformed scale ' + scale, () => {
    const b = build('brachiosaurus', scale, true), before = snapshot(b.tail), torso = snapshot(b.torso);
    try { b.blend(); expect(b.tail.userData.dinoTailNormalBlend.changed[1]).toBeGreaterThan(0); sameShape(b.tail, before); expect(snapshot(b.torso)).toEqual(torso); }
    finally { b.dispose(); }
  });
  for (const id of ['tyrannosaurus', 'triceratops']) it('keeps the native off-group model exact for ' + id, () => {
    const b = build(id), tail = snapshot(b.tail), torso = snapshot(b.torso);
    try { b.blend(); expect(b.tail.userData.dinoTailNormalBlend).toBeUndefined(); expect(snapshot(b.tail)).toEqual(tail); expect(snapshot(b.torso)).toEqual(torso); }
    finally { b.dispose(); }
  });
  for (const missing of ['torso', 'tail']) it('handles absent ' + missing + ' skin without changes', () => {
    const b = build('brachiosaurus'), tail = snapshot(b.tail), torso = snapshot(b.torso);
    try { if (missing === 'torso') b.context.bodyShell = null; else b.context.tailMeshes = undefined; b.blend(); expect(snapshot(b.tail)).toEqual(tail); expect(snapshot(b.torso)).toEqual(torso); }
    finally { b.dispose(); }
  });
});
