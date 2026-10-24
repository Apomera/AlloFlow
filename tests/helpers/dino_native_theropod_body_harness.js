import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeRosetteHarness} from './dino_native_rosette_harness.js';
import {nativeOrnithopodBodyHarness,THREE,vec} from './dino_native_ornithopod_body_harness.js';
import {nativeTailHarness} from './dino_native_tail_harness.js';
export {THREE,vec};

export function nativeTheropodBodyHarness(source){
  // Execute exactly the two weight-bearing hindlimbs. The independent manual
  // harness exercises the free arms, not imaginary quadrupedal front feet.
  // Read untransformed text: Vite rewrites imported identifiers inside a
  // function's toString(), which cannot carry its private SSR bindings here.
  const helperText=readFileSync(resolve('tests/helpers/dino_native_ornithopod_body_harness.js'),'utf8');
  const bodyFactoryText=helperText.slice(helperText.indexOf('export function nativeOrnithopodBodyHarness')).replace('export function','function').replace('for (const front of [false, true])','for (const front of [false])');
  const factory=new Function('nativeTailHarness','THREE','vec','return ('+bodyFactoryText+');')(nativeTailHarness,THREE,vec);
  const native=factory(source,{anchorName:'dinoTheropodBodyAnchors',limbName:'dinoTheropodBodyHindlimb'});
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing theropod native seam '+a);return source.slice(start,end);}
  function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);if(start<0)throw Error(name);let depth=1,end=open+1;while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
  const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  function build(id,scale=1,tissue=.90,transformed=false){
    const built=native.build(id,scale,true,transformed),c=built.context;
    Object.assign(c,{surfaceHypothesis:{headSoftTissueScale:tissue,neckSoftTissueScale:tissue===.90?.88:1.12,bodyHeightScale:tissue===.90?.91:1.09,bodyDepthScale:tissue===.90?.89:1.10,tailSoftTissueScale:tissue===.90?.88:1.12,featureScales:true},skeletonCavityMat:c.boneMat,costalJointMat:c.jointMat,pneumaticMarkerMat:c.boneMat});
    const prior=new Set(c.model.children);
    Object.assign(c,run(section('var cladeName = String(dn.clade','function dorsalSurfacePoint(t)'),'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
    const torso=c.bodyShell;
    c.tailBaseRadius=run(source.match(/^\s*var tailBaseRadius =.*;$/m)[0],"tailBaseRadius",c);
    const tail=run(section("var tailMidA =","var tailSurfaceCurve ="),"tailMeshes[0]",c);
    for(const name of ['addTaperedBoneSegment','addCurvedBone','addGirdleBlade','addScapularBlade','addJoint'])c[name]=run(extract(name),name,c);
    const bonePrior=new Set(c.model.children);
    const axialStart=source.includes('if(lambeosaurBody){dinoAddLambeosaurBodyCage(')?'if(lambeosaurBody){dinoAddLambeosaurBodyCage(':'var ribCount = isSauropod ? 10 : 9;';
    const axial=section(axialStart,'function addAnatomyCallout(label, anchor, offset)');
    run(axial,'undefined',c);
    const bones=c.model.children.filter(mesh=>mesh.isMesh&&!bonePrior.has(mesh));
    const arms=[];
    if(source.includes("// DINO_REVIEWED_THEROPOD_FORELIMB_START")){
      const arm=section("// DINO_REVIEWED_THEROPOD_FORELIMB_START","// DINO_REVIEWED_THEROPOD_FORELIMB_END");
      for(const side of [-1,1]){c.armSide=side;const before=new Set(c.model.children);run("(function(){"+arm+"})();","undefined",c);arms.push(...c.model.children.filter(mesh=>mesh.isMesh&&!before.has(mesh)&&mesh.userData.dinoTheropodManualElement?.layer==='life'));}
    }
    c.model.updateMatrixWorld(true);
    return {...built,torso,bones,arms,skins:[torso,tail,...built.records.limbs.map(limb=>limb.skin),...arms],tissue};
  }
  return {...native,build};
}

export function nativeTheropodHeadNeckHarness(source){
  const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]).join(',');
  const factorySource='('+nativeRosetteHarness.toString()
    .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
    .replace('craniocervicalDetail: false','craniocervicalDetail: true')
    .replace('evaluate(bones + shaping, context','evaluate(bones, context')
    .replace('hip,tail,bodyDepth,surfaceSnout','hip,tail,bodyDepth,bodyHeight,bodyLen,bodyCenter,surfaceSnout')
    .replace('surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 }','surfaceHypothesis: { headSoftTissueScale:tissue, neckSoftTissueScale:tissue===.90?.88:1.12, bodyHeightScale:tissue===.90?.91:1.09, bodyDepthScale:tissue===.90?.89:1.10 }')
    .replace('    const existing = new Set(model.children);','    const actualChain=context.addVertebralChain;context.cervicalChains=[];context.addVertebralChain=(...args)=>{const prior=new Set(model.children);const value=actualChain(...args);context.cervicalChains.push({args,meshes:model.children.filter(mesh=>!prior.has(mesh))});return value;};\n    const existing = new Set(model.children);')
    .replace('  function build(id, scale = 1, tissue = .90) {','  for(const name of ["addTaperedBoneSegment","addVertebralChain"]){const start=source.indexOf("function "+name+"("),end=source.indexOf("\\n            function ",start+10);functionSections[name]=source.slice(start,end); }\n  function build(id, scale = 1, tissue = .90) {')+')';
  const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec),native=factory(source);
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing native head/neck '+a);return source.slice(start,end);}
  const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  function build(id,scale=1,tissue=.90,transformed=false){
    const built=native.build(id,scale,tissue),c=built.context;c.hasAnatomyPart=()=>true;c.idleMotion={};
    Object.assign(c,run(section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t) {'),'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
    const neck=run(section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve ='),'neckMeshes[0]',c);
    if(transformed){c.model.position.set(scale,-.3*scale,2*scale);c.model.rotation.set(.12,-.25,.18);c.model.scale.set(1.12,.94,1.06);}c.model.updateMatrixWorld(true);
    return {...built,neck,body:c.bodyShell,skins:[built.upper,built.lower,neck,c.bodyShell]};
  }
  return {...native,build};
}
