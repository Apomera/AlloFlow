import { createRequire } from 'node:module';
import { resolve } from 'node:path';
export const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
export const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function nativeRosetteHarness(source) {
  const marker = "window.StemLab.registerTool('dinoLab'";
  window.StemLab = { registerTool() {} };
  new Function(source.replace(marker, 'globalThis.__rosette={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,cranialSurfaceProfileFor,skeletalAnatomyProfileFor,dinoTyrannosaurPose,dinoLongSnoutedTyrannosaurAnchors,dinoCervicalEnvelope,dinoNeckJunction,dinoTheropodCranialRadii,dinoCranialGeometry,dinoSurfaceGeometry,dinoJawProfile,dinoCranialDisplayProfile,dinoBaryonychineRostrumFor,dinoBaryonychineSnoutAnchor,dinoBaryonychineWidthAt,dinoBaryonychineBoneGeometry,dinoShapeBaryonychineRostrum,dinoPartInspectionFor,dinoPartViewpointTaskFor};' + marker))();
  const art = globalThis.__rosette; delete globalThis.__rosette;
  function section(start, end, from = 0) {
    const a = source.indexOf(start, from), b = source.indexOf(end, a);
    if (a < 0 || b < a) throw new Error('Missing native rosette assembly: ' + start);
    return source.slice(a, b);
  }
  const evaluate = (code, context, result) => new Function('context', 'with(context){' + code + ';return ' + result + ';}')(context);
  const anchors = section('var detailScale = Math.min(1, ht / 2);', 'var evidenceAnchorPoints =');
  const envelope = section('var surfaceHeadFactor = reconstructionProfile.head', 'if (headShell) {');
  const chain = section('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {', 'function addContourGroup(meshes)');
  const jaw = section('var jawHeightScale = isTheropod', '[-1, 1].forEach(function (faceSide)');
  const boneStart = source.indexOf('var cranialBoneBefore = model.children.slice();');
  const bones = section('var cranialBoneBefore = model.children.slice();', 'captureCranialMotion(cranialBoneBefore);');
  const shaping = section('                if (/^(baryonyx|suchomimus)$/.test(dn.id)) {', '                for (var neuralSpineIndex', boneStart);
  const functionSections = {
    addBone: section('function addBone(a, b, radius) {', 'function addTaperedBoneSegment('),
    addCranialBone: section('function addCranialBone(a, b, radius, mat) {', 'function addJoint('),
    addSkeletonEllipsoid: section('function addSkeletonEllipsoid(pos, scale, mat) {', 'function addSkeletonCone('),
    addSkeletonCone: section('function addSkeletonCone(base, tip, radius, mat) {', 'function addRespiratoryVolume(')
  };
  // addSkeletonCone's following helper varies in earlier source revisions.
  const coneStart = source.indexOf('function addSkeletonCone(base, tip, radius, mat) {');
  const coneEnd = source.indexOf('\n            function ', coneStart + 10);
  functionSections.addSkeletonCone = source.slice(coneStart, coneEnd);

  function build(id, scale = 1, tissue = .90) {
    const dn = art.DINOS.find(d => d.id === id), model = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const toothMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const cavityMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const boneBefore = new Map();
    const context = { ...art, THREE, dn, len: dn.lengthM * scale, ht: dn.heightM * scale, vec,
      model, props: { species: dn, showBody: true, showSkeleton: true }, isTheropod: true, isSauropod: false, cladeName: dn.clade,
      reconstructionProfile: art.reconstructionProfileFor(dn), posture: art.postureProfileFor(dn), postcranialSurface: art.postcranialSurfaceProfileFor(dn),
      cranialSurface: art.cranialSurfaceProfileFor(dn), skeletalProfile: { ...art.skeletalAnatomyProfileFor(dn), craniocervicalDetail: false },
      surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 },
      headMat: material, bodyMat: material, boneMat: material, cranialAccentMat: material, jointMat: material, jawJointMat: material, hyoidMat: material,
      toothMat, skeletonCavityMat: cavityMat, addBodyContour() {}, registerCranialMotion(mesh) { return mesh; }, captureCranialMotion() {}, addVertebralChain() {} };
    context.dinoShapeBaryonychineRostrum = (...args) => {
      const mesh = args[2], kind = args[5];
      if (/^bone/.test(kind)) {
        if (kind === 'bone') {
          mesh.updateMatrix();
          const sampled = art.dinoBaryonychineBoneGeometry(THREE, dn, mesh.geometry, mesh.matrix, args[3], args[4]);
          if (sampled !== mesh.geometry) { mesh.geometry.dispose(); mesh.geometry = sampled; }
        }
        mesh.updateWorldMatrix(true, false);
        boneBefore.set(mesh, Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position, i))));
      }
      return art.dinoShapeBaryonychineRostrum(...args);
    };
    context.addSoftTissueChain = evaluate(chain, context, 'addSoftTissueChain');
    Object.assign(context, evaluate(anchors + 'var surfaceBodyHeight=bodyHeight*surfaceHypothesis.bodyHeightScale;' + envelope, context,
      '{head,snout,headShell,detailScale,len,ht,shoulder,hip,tail,bodyDepth,surfaceSnout,surfaceHeadHeight,surfaceHeadDepth,surfaceHeadLength,cervicalEnvelope,matureTyrannosaurPose}'));
    const upper = context.headShell, lower = evaluate(jaw, context, 'lowerJawShell');
    for (const [name, code] of Object.entries(functionSections)) context[name] = evaluate(code, context, name);
    const existing = new Set(model.children);
    const result = evaluate(bones + shaping, context, '{cranialVault,cranialRostrum,skullLength,skullHeight,skullDepth}');
    model.updateMatrixWorld(true);
    return { art, context, upper, lower, boneBefore, ...result,
      bones: model.children.filter(mesh => !existing.has(mesh) && mesh.material !== cavityMat),
      teeth: model.children.filter(mesh => mesh.material === toothMat),
      dispose() { model.traverse(mesh => { if (mesh.geometry) mesh.geometry.dispose(); }); material.dispose(); toothMat.dispose(); cavityMat.dispose(); } };
  }
  return { art, build };
}
