import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
export const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Execute the real production builders and callers with their native profiles.
// Keep coordinate/proportion formulas in the production source under test.
export function nativeTailHarness(source) {
  const registration = "window.StemLab.registerTool('dinoLab'";
  window.StemLab = { registerTool() {} };
  new Function(source.replace(registration, 'globalThis.__nativeDinoTail = { DINOS, reconstructionProfileFor, postureProfileFor, postcranialSurfaceProfileFor, skeletalAnatomyProfileFor, dinoTyrannosaurPose, dinoLongSnoutedTyrannosaurAnchors, dinoSurfaceGeometry, dinoCranialGeometry, dinoTorsoRadii, dinoTailSkinEnvelope, dinoSpinosaurusTailSection, dinoSpinosaurusTailEnvelope, dinoSurfacePartIds, dinoBlendSurfaceNormals, dinoSkinCoordinates, dinoBaryonychineSnoutAnchor: typeof dinoBaryonychineSnoutAnchor === "function" ? dinoBaryonychineSnoutAnchor : undefined, dinoBaryonychineRostrumFor: typeof dinoBaryonychineRostrumFor === "function" ? dinoBaryonychineRostrumFor : undefined };' + registration))();
  const art = globalThis.__nativeDinoTail; delete globalThis.__nativeDinoTail;
  const evaluate = (code, result, context) => new Function('context', 'with (context) {' + code + '\nreturn ' + result + ';}')(context);
  function section(start, end) {
    const a = source.indexOf(start), b = source.indexOf(end, a);
    if (a < 0 || b <= a) throw Error('Missing native source section ' + start);
    return source.slice(a, b);
  }
  function extract(name) {
    const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
    if (start < 0) throw Error('Missing ' + name);
    let depth = 1, end = open + 1;
    while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
    return source.slice(start, end);
  }
  const anchors = section('var detailScale = Math.min(1, ht / 2);', 'var evidenceAnchorPoints =');
  const torso = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
  const tail = section('var tailMidA =', 'var tailSurfaceCurve =');
  const tailBaseCaller = source.match(/^\s*var tailBaseRadius =.*;$/m)?.[0];
  const caudalCaller = source.match(/^\s*addVertebralChain\(hip,.*'caudal'\);$/m)?.[0];
  if (!caudalCaller) throw Error('Missing production caudal caller');
  const chevrons = section('var displayedChevronCount =', 'if (skeletalProfile.tailBracing)');
  const collar = section('// Match the exposed tail collar', '// Resolve the buried beak closure');

  function build(scale = 1, tissueScale = 1, transformed = false, id = 'spinosaurus') {
    const dn = art.DINOS.find(dino => dino.id === id), model = new THREE.Group();
    if (!dn) throw Error('Missing native species ' + id);
    const material = new THREE.MeshPhongMaterial({ side: THREE.DoubleSide });
    const ht = dn.heightM * scale, len = dn.lengthM * scale;
    const context = { ...art, THREE, vec, dn, model, bodyMat: material, boneMat: material, jointMat: material,
      props: { showBody: true, showSkeleton: true }, ht, len, isTheropod: dn.group === 'theropod', isSauropod: dn.group === 'sauropod', idleMotion: {},
      reconstructionProfile: art.reconstructionProfileFor(dn), posture: art.postureProfileFor(dn),
      postcranialSurface: art.postcranialSurfaceProfileFor(dn), skeletalProfile: art.skeletalAnatomyProfileFor(dn),
      surfaceHypothesis: { bodyHeightScale: 1, bodyDepthScale: 1, tailSoftTissueScale: tissueScale } };
    Object.assign(context, evaluate(anchors, '({detailScale, hip, shoulder, tail, head, snout, ceratopsidCranium: typeof ceratopsidCranium === "undefined" ? null : ceratopsidCranium, bodyCenter, bodyLen, bodyHeight, bodyDepth})', context));
    for (const name of ['addSoftTissueChain', 'addBone', 'addTaperedBoneSegment', 'addSkeletonEllipsoid', 'addVertebralChain']) context[name] = evaluate(extract(name), name, context);
    Object.assign(context, evaluate(torso, '({bodyShell, pelvisCenter, surfaceBodyHeight, surfaceBodyDepth})', context));
    context.tailBaseRadius = evaluate(tailBaseCaller, 'tailBaseRadius', context);
    Object.assign(context, evaluate(tail, '({tailMeshes, tailSkinRoot, tailSkinEnvelope})', context));
    const initial = model.children.length;
    evaluate(caudalCaller + chevrons, 'undefined', context);
    const bones = model.children.slice(initial);
    if (transformed) { model.position.set(scale, -.3 * scale, 2 * scale); model.rotation.set(.12, -.25, .18); model.scale.set(1.12, .94, 1.06); }
    model.updateMatrixWorld(true);
    return { context, model, skin: context.tailMeshes[0], bones,
      blend: () => evaluate(collar, 'undefined', context),
      dispose() { model.traverse(object => object.geometry?.dispose()); material.dispose(); } };
  }
  return { art, build };
}
