import { nativeTailHarness, THREE, vec } from './dino_native_tail_harness.js';
export { THREE, vec };

export function nativeOrnithopodBodyHarness(source, reviewed = {}) {
  const marker = "window.StemLab.registerTool('dinoLab'";
  const names = [...new Set([...source.matchAll(/^  function (dino\w+)\(/gm)].map(match => match[1]))];
  window.StemLab = { registerTool() {} };
  new Function(source.replace(marker, 'globalThis.__ornithopodBodyNative={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,skeletalAnatomyProfileFor,' + names.join(',') + '};' + marker))();
  const art = globalThis.__ornithopodBodyNative; delete globalThis.__ornithopodBodyNative;
  const native = nativeTailHarness(source); Object.assign(native.art, art);
  const evaluate = (code, result, context) => new Function('context', 'with(context){' + code + '\nreturn ' + result + ';}')(context);
  function extract(name) {
    const start = source.indexOf('function ' + name + '('), open = source.indexOf('{', start);
    if (start < 0) throw Error('Missing native builder ' + name);
    let depth = 1, end = open + 1;
    while (depth && end < source.length) { if (source[end] === '{') depth++; if (source[end] === '}') depth--; end++; }
    return source.slice(start, end);
  }
  function build(id, scale = 1, enabled = true, transformed = false) {
    const anchorName = reviewed.anchorName || 'dinoOrnithopodBodyAnchors';
    const limbName = reviewed.limbName || 'dinoOrnithopodBodyLimb';
    const savedAnchors = native.art[anchorName];
    if (!enabled) native.art[anchorName] = () => null;
    let base;
    try { base = native.build(scale, 1, false, id); } finally { native.art[anchorName] = savedAnchors; }
    const context = base.context, material = context.bodyMat;
    Object.assign(context, art, { cladeName: context.dn.clade, bodyWireMat: material, headMat: material, keratinMat: material, muscleMat: material, toothMat: material,
      plantedFootContacts: [], idleMotion: { legs: [] }, surfaceHypothesis: { featureScales: true } });
    if (!enabled) context[limbName] = () => null;
    const records = { bones: [], distal: [], anchors: [], thumbs: [], limbs: [] };
    context.addBodyPartAnchor = (id, point) => {
      const anchor = new THREE.Object3D(); anchor.position.copy(point); anchor.userData.dinoBodyPart = id;
      context.model.add(anchor); records.anchors.push(anchor); return anchor;
    };
    context.addIguanodontThumb = (...args) => { records.thumbs.push(args.map(value => value?.isVector3 ? value.toArray() : value)); return null; };
    context.addContourPlumage = context.addLimbPlumage = () => null;
    const builders = ['addBone', 'addLongBone', 'addSkeletonCone', 'addAccentCone', 'addSkeletonEllipsoid', 'addLimbJoint', 'addLimbCrest',
      'addBodyContour', 'addMuscleBelly', 'addEllipsoid', 'addKeratinCone', 'addSoftTissueCylinder', 'tagDistalSurface',
      'addDigitFan', 'addSoftTissueDigitFan'];
    for (const name of builders) context[name] = evaluate(extract(name), name, context);
    let distalDepth = 0;
    for (const name of ['addLongBone', 'addLimbJoint', 'addLimbCrest', 'addDigitFan', 'addSoftTissueDigitFan']) {
      const actual = context[name];
      context[name] = (...args) => {
        const before = new Set(context.model.children), distal = name.includes('DigitFan');
        if (distal) distalDepth++;
        let result; try { result = actual(...args); } finally { if (distal) distalDepth--; }
        const meshes = context.model.children.filter(mesh => mesh.isMesh && !before.has(mesh));
        if (name.includes('DigitFan')) records.distal.push({ kind: name, args, meshes });
        else if (!distalDepth) records.bones.push({ kind: name, args, meshes });
        return result;
      };
    }
    const addLeg = evaluate(extract('addLeg'), 'addLeg', context);
    const stance = Math.max(.055 * context.detailScale, context.bodyDepth * .68) * context.skeletalProfile.stanceWidth;
    for (const front of [false, true]) for (const side of [-1, 1]) {
      const boneStart = records.bones.length, anchorStart = records.anchors.length;
      addLeg((front ? context.shoulder : context.hip).x, side * stance, front);
      records.limbs.push({ front, side, skin: context.idleMotion.legs.at(-1).mesh,
        bones: records.bones.slice(boneStart), anchors: records.anchors.slice(anchorStart) });
    }
    if (transformed) { context.model.position.set(scale, -.3 * scale, 2 * scale); context.model.rotation.set(.12, -.25, .18); context.model.scale.set(1.12, .94, 1.06); }
    context.model.updateMatrixWorld(true);
    return { ...base, context, records, contacts: context.plantedFootContacts };
  }
  return { art, build };
}
