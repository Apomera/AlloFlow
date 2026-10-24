import {nativeRosetteHarness} from './dino_native_rosette_harness.js';
import {nativeOrnithopodBodyHarness,THREE,vec} from './dino_native_ornithopod_body_harness.js';
export {THREE,vec};

// Execute production anchors, torso, ribs, long bones, joints and feet. Only
// rendering and UI plumbing are replaced by the shared native mesh harness.
export function nativeStegosaurBodyHarness(source) {
  const native=nativeOrnithopodBodyHarness(source,{anchorName:'dinoStegosaurBodyAnchors',limbName:'dinoStegosaurBodyLimb'});
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing native seam '+a);return source.slice(start,end);}
  function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);if(start<0)throw Error(name);let depth=1,end=open+1;while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
  const evaluate=(code,result,context)=>new Function('context','with(context){'+code+'\nreturn '+result+';}')(context);
  function build(id,scale=1,enabled=true,transformed=false){
    const built=native.build(id,scale,enabled,transformed),c=built.context;
    // Capture actual production torso stations for rigid armor tests without
    // constructing a second torso mesh.
    Object.assign(c,evaluate(section('var cladeName = String(dn.clade','var torsoRadii ='),'({torsoPoints})',c));
    const before=new Set(c.model.children);
    c.addCurvedBone=evaluate(extract('addCurvedBone'),'addCurvedBone',c);
    evaluate(section('var ribCount = isSauropod ? 10 : 9;','if (skeletalProfile.gastralia)'),'undefined',c);
    const ribs=c.model.children.filter(mesh=>mesh.isMesh&&!before.has(mesh));
    c.model.updateMatrixWorld(true);
    function torsoForMode(mode){
      const old=c.surfaceHypothesis,prior=new Set(c.model.children);
      c.surfaceHypothesis={...old,...mode};
      const mesh=evaluate(section('var cladeName = String(dn.clade','function dorsalSurfacePoint(t)'),'bodyShell',c);
      c.surfaceHypothesis=old;c.model.updateMatrixWorld(true);
      return {mesh,dispose(){c.model.children.filter(child=>!prior.has(child)).forEach(child=>{child.geometry?.dispose();c.model.remove(child);});}};
    }
    return {...built,ribs,torsoForMode};
  }
  return {...native,build};
}

// Activate the production craniocervical details AND the actual intervening
// cervical chain. Shared cranial harnesses normally stub that chain.
// Run the actual beak caller before jaw landmarks initialize, matching source
// order; the containment meshes are assembled afterwards.
export function nativeStegosaurHeadNeckHarness(source) {
  const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]).join(',');
  const factorySource='('+nativeRosetteHarness.toString()
    .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
    .replace('isTheropod: true, isSauropod: false','isTheropod: false, isSauropod: false')
    .replace('craniocervicalDetail: false','craniocervicalDetail: true')
    .replace('evaluate(bones + shaping, context','evaluate(bones, context')
    .replace("    const upper = context.headShell, lower = evaluate(jaw, context, 'lowerJawShell');",
      "    const upper=context.headShell;context.keratinMat=context.bodyMat;context.lowerJawStart=undefined;context.lowerJawEnd=undefined;context.beakBeforeJaw=context.lowerJawStart===undefined&&context.lowerJawEnd===undefined;context.predentaryBeak=evaluate(section('              if (skeletalProfile.keratinBeak) {','              var integumentSeed'),context,'keratinBeak');\n    const jawBuilt=evaluate(jaw,context,'({lowerJawShell,lowerJawStart,lowerJawEnd})');Object.assign(context,jawBuilt);const lower=jawBuilt.lowerJawShell;")
    .replace('    const existing = new Set(model.children);',
      '    const actualChain=context.addVertebralChain;context.cervicalChains=[];context.addVertebralChain=(...args)=>{const prior=new Set(model.children);const value=actualChain(...args);context.cervicalChains.push({args,meshes:model.children.filter(mesh=>!prior.has(mesh))});return value;};\n    const existing = new Set(model.children);')
    .replace('{head,snout,headShell,detailScale','{ceratopsidCranium,armoredCranium,head,snout,headShell,detailScale')
    .replace('hip,tail,bodyDepth,surfaceSnout','hip,tail,bodyDepth,bodyHeight,bodyLen,bodyCenter,surfaceSnout')
    .replace('surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 }',
      'surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: tissue===.90?.88:1.12, bodyHeightScale: tissue===.90?.91:1.09, bodyDepthScale:tissue===.90?.89:1.10 }')
    .replace('  function build(id, scale = 1, tissue = .90) {',
      '  for(const name of ["addTaperedBoneSegment","addVertebralChain"]){const start=source.indexOf("function "+name+"("),end=source.indexOf("\\n            function ",start+10);functionSections[name]=source.slice(start,end);}\n  function build(id, scale = 1, tissue = .90) {')+')';
  const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec),native=factory(source);
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing native head/neck '+a);return source.slice(start,end);}
  const torso=section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t) {');
  const neck=section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve =');
  function run(code,result,context){return new Function('context','with(context){'+code+';return '+result+';}')(context);}
  function build(id,scale=1,tissue=.90,transformed=false){
    const built=native.build(id,scale,tissue),c=built.context;
    c.hasAnatomyPart=()=>true;c.idleMotion={};
    Object.assign(c,run(torso,'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
    const neckMeshes=run(neck,'neckMeshes',c);
    const beak=c.predentaryBeak;
    if(transformed){c.model.position.set(scale,-.3*scale,2*scale);c.model.rotation.set(.12,-.25,.18);c.model.scale.set(1.12,.94,1.06);}
    c.model.updateMatrixWorld(true);
    return {...built,neck:neckMeshes[0],body:c.bodyShell,beak:beak,skins:[built.upper,built.lower,neckMeshes[0],c.bodyShell]};
  }
  return {...native,build};
}
