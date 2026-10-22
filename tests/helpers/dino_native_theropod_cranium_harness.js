import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {nativeMeshContains} from './dino_native_mesh_contains.js';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
globalThis.window={};
export function nativeReviewedTheropodCranium(source){
  const raw=readFileSync('tests/helpers/dino_native_rosette_harness.js','utf8');
  const fnText=raw.slice(raw.indexOf('export function nativeRosetteHarness')).replace('export function','function');
  const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
  let factory=fnText.replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
    .replace('craniocervicalDetail: false','craniocervicalDetail: true')
    .replace('evaluate(bones + shaping, context','evaluate(bones, context')
    .replace('hip,tail,bodyDepth,surfaceSnout','hip,tail,bodyDepth,bodyHeight,bodyLen,bodyCenter,surfaceSnout')
    .replace('{head,snout,headShell,detailScale','{theropodCranium,head,snout,headShell,detailScale')
    .replace('surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 }','surfaceHypothesis: { headSoftTissueScale:tissue, neckSoftTissueScale:tissue===.90?.88:1.12, bodyHeightScale:tissue===.90?.91:1.09, bodyDepthScale:tissue===.90?.89:1.10 }')
    .replace('    const existing = new Set(model.children);','    const actualChain=context.addVertebralChain;context.cervicalChains=[];context.addVertebralChain=(...args)=>{const prior=new Set(model.children);const value=actualChain(...args);context.cervicalChains.push({args,meshes:model.children.filter(mesh=>!prior.has(mesh))});return value;};\n    const existing = new Set(model.children);')
    .replace('  function build(id, scale = 1, tissue = .90) {','  for(const name of ["addTaperedBoneSegment","addVertebralChain"]){const start=source.indexOf("function "+name+"("),end=source.indexOf("\\n            function ",start+10);functionSections[name]=source.slice(start,end); }\n  function build(id, scale = 1, tissue = .90) {');
  const native=new Function('THREE','vec','return ('+factory+')(arguments[2]);')(THREE,vec,source);
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error(a);return source.slice(start,end);}
  const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  return {...native,build(id,scale=1,tissue=.90){
    const b=native.build(id,scale,tissue),c=b.context;c.hasAnatomyPart=()=>true;c.idleMotion={};
    Object.assign(c,run(section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t) {'),'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
    const neck=run(section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve ='),'neckMeshes[0]',c);c.model.updateMatrixWorld(true);
    return {...b,neck,body:c.bodyShell,skins:[b.upper,b.lower,neck,c.bodyShell]};
  }};
}
export {THREE,vec,nativeMeshContains};

// Run the production landmark placement and seated mouth-strip caller on the
// actual head/jaw meshes; retain their raycast frames for regression checks.
export function nativeTheropodFacialDetails(source,b){
  const section=(a,z)=>{const i=source.indexOf(a),j=source.indexOf(z,i);if(i<0||j<=i)throw Error(a);return source.slice(i,j);};
  const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  const c={...b.context,headShell:b.upper,lowerJawShell:b.lower};
  Object.assign(c,run(section('var faceScale = reconstructionProfile.head;','// Seat surface details'),'({faceScale,eyeRadius,eyeCenterX})',c));
  c.faceSurfacePoint=run(section('function faceSurfacePoint(point, side, inset) {','var bodyContour = addBodyContour(bodyShell);'),'faceSurfacePoint',c);
  c.addFacialStrip=run(section('function addFacialStrip(points, width, relief, side, material, feature, options) {','function addContourPlumage('),'addFacialStrip',c);
  c.mouthCreaseMat=c.headMat;
  return[-1,1].map(side=>{
    c.faceSide=side;
    const eye=run(section('var eyePos = head.clone().add(vec(','var browPoints ='),'({point:eyePos,frame:eyeFrame,radius:eyeRadius})',c);
    const nostril=run(section('var nostrilPos = head.clone().lerp(surfaceSnout,','if (nostrilFrame && !nostrilMat) {'),'({point:nostrilPos,frame:nostrilFrame,radius:nostrilRadius})',c);
    run(section('var mouthStart = head.clone().lerp(surfaceSnout,','              });'),'undefined',c);
    b.context.model.updateMatrixWorld(true);
    const mouth=b.upper.children.find(mesh=>mesh.name==='mouth-crease-'+side);
    return{side,eye,nostril,mouth};
  });
}
