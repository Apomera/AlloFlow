import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {nativeMeshContains} from './dino_native_mesh_contains.js';
export const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
export const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export {nativeMeshContains};
export const source=readFileSync(process.env.DINO_SAUROPOD_CRANIUM_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');

export function nativeSauropodCranium(source){
 const raw=readFileSync('tests/helpers/dino_native_rosette_harness.js','utf8');
 const fnText=raw.slice(raw.indexOf('export function nativeRosetteHarness')).replace('export function','function');
 const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
 const factory=fnText.replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
  .replace("const envelope = section('var surfaceHeadFactor = reconstructionProfile.head', 'if (headShell) {');","const envelope = section('var surfaceHeadFactor = reconstructionProfile.head', 'registerCranialMotion(headShell);');")
  .replace('isTheropod: true, isSauropod: false','isTheropod: dn.group===\'theropod\', isSauropod: dn.group===\'sauropod\'')
  .replace('craniocervicalDetail: false','craniocervicalDetail: true')
  .replace('evaluate(bones + shaping, context','evaluate(bones, context')
  .replace('hip,tail,bodyDepth,surfaceSnout','hip,tail,bodyDepth,bodyHeight,bodyLen,bodyCenter,sauropodCranium,surfaceSnout')
  .replace('surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 }','surfaceHypothesis: { headSoftTissueScale:tissue, neckSoftTissueScale:tissue===.90?.88:1.12, bodyHeightScale:tissue===.90?.91:1.09, bodyDepthScale:tissue===.90?.89:1.10 }')
  .replace('  function build(id, scale = 1, tissue = .90) {','  for(const name of ["addTaperedBoneSegment","addVertebralChain"]){const start=source.indexOf("function "+name+"("),end=source.indexOf("\\n            function ",start+10);functionSections[name]=source.slice(start,end); }\n  function build(id, scale = 1, tissue = .90) {');
 const native=new Function('THREE','vec','return ('+factory+')(arguments[2]);')(THREE,vec,source);
 const section=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i);if(i<0||j<=i)throw Error('Native sauropod seam '+a);return source.slice(i,j);};
 const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
 return {...native,build(id,scale=1,tissue=.90){
  const b=native.build(id,scale,tissue),c=b.context;c.hasAnatomyPart=()=>true;c.idleMotion={};
  Object.assign(c,run(section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t) {'),'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
  const neck=run(section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve ='),'neckMeshes[0]',c);c.model.updateMatrixWorld(true);
  return {...b,neck,body:c.bodyShell,skins:[b.upper,b.lower,neck,c.bodyShell],tagged:b.bones.filter(m=>m.userData.dinoSauropodCranialElement)};
 }};
}
export const native=nativeSauropodCranium(source);
export function cranialBuffers(meshes){return JSON.stringify(meshes.map(m=>({name:m.name,p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:m.geometry.index&&Array.from(m.geometry.index.array),position:m.position.toArray(),q:m.quaternion.toArray(),scale:m.scale.toArray()})));}
