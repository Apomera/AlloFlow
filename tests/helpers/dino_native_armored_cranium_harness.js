import { readFileSync } from 'node:fs';
import { nativeRosetteHarness, THREE, vec } from './dino_native_rosette_harness.js';
export { THREE, vec };
export const source=readFileSync(process.env.DINO_ARMORED_CRANIUM_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
globalThis.window=globalThis.window||{StemLab:{registerTool(){}}};
const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
const factorySource='('+nativeRosetteHarness.toString()
  .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
  .replace('const toothMat =','const boneMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}); const toothMat =')
  .replace('boneMat: material','boneMat: boneMaterial')
  .replace('material.dispose(); toothMat.dispose();','material.dispose(); boneMaterial.dispose(); toothMat.dispose();')
  .replace('isTheropod: true, isSauropod: false','isTheropod: false, isSauropod: false')
  .replace('craniocervicalDetail: false','craniocervicalDetail: true')
  .replace('evaluate(bones + shaping, context','evaluate(bones, context')
  .replace('{head,snout,headShell,detailScale','{ceratopsidCranium,armoredCranium,head,snout,headShell,detailScale')
  .replace('hip,tail,bodyDepth,surfaceSnout','hip,tail,bodyDepth,bodyHeight,bodyLen,bodyCenter,surfaceSnout')
  .replace('surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: .88, bodyHeightScale: .91 }',
    'surfaceHypothesis: { headSoftTissueScale: tissue, neckSoftTissueScale: tissue===.90?.88:1.12, bodyHeightScale: tissue===.90?.91:1.09, bodyDepthScale:tissue===.90?.89:1.10 }')+')';
const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec),native=factory(source);
export const api=native.art;
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Missing native armored assembly '+start);return source.slice(a,b);}
function run(code,result,c){return new Function('context','with(context){'+code+';return '+result+';}')(c);}
const torso=section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t) {');
const neck=section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve =');
const display=section('var reviewedArmoredDisplay=null;','var reviewedStegosaurArmor = null;');
const faceSeat=section('function faceSurfacePoint(point, side, inset) {','var bodyContour = addBodyContour(bodyShell);');
const nostrilPlacement=section('var nostrilPos = head.clone().lerp(surfaceSnout,','if (nostrilFrame && !nostrilMat) {');
export function nativeArmoredCranium(id,scale=1,tissue=.90){
  const b=native.build(id,scale,tissue),c=b.context;
  c.idleMotion={};c.headShell=b.upper;c.anatomyAccentMat=c.headMat;c.hasAnatomyPart=()=>true;
  Object.assign(c,run(torso,'({bodyShell,torsoPoints,torsoRadii,surfaceBodyHeight,surfaceBodyDepth,pelvisCenter})',c));
  c.neckMeshes=run(neck,'neckMeshes',c);
  c.addReviewedArmoredDisplay=run(display,'addReviewedArmoredDisplay',c);
  c.addReviewedArmoredDisplay(c.headMat,false);c.addReviewedArmoredDisplay(c.boneMat,true);
  c.model.updateMatrixWorld(true);
  const coverings=c.model.children.filter(m=>m.userData.dinoArmoredElement?.layer==='covering');
  const dermalBones=c.model.children.filter(m=>m.userData.dinoArmoredElement?.layer==='bone');
  return {...b,coverings,dermalBones,body:c.bodyShell,neck:c.neckMeshes[0],skins:[b.upper,b.lower,c.neckMeshes[0],c.bodyShell]};
}
export function rayInside(mesh,point,tolerance){
  const hits=new THREE.Raycaster(point,vec(1,.371,.217).normalize()).intersectObject(mesh,false),distances=[];
  for(const hit of hits)if(hit.distance>tolerance&&!distances.some(d=>Math.abs(d-hit.distance)<tolerance))distances.push(hit.distance);
  return distances.length%2===1;
}
export function nativeArmoredNostrilFrames(b,heightOverride){
  const c={...b.context,headShell:b.upper,cranialSurface:{...b.context.cranialSurface}};
  if(Number.isFinite(heightOverride))c.cranialSurface.nostrilHeightScale=heightOverride;
  c.faceSurfacePoint=run(faceSeat,'faceSurfacePoint',c);
  return[-1,1].map(side=>{
    c.faceSide=side;
    const result=run(nostrilPlacement,'({point:nostrilPos,frame:nostrilFrame,radius:nostrilRadius})',c);
    const normal=result.frame?vec(0,0,side).applyQuaternion(result.frame):vec(0,0,side);
    return{...result,normal,side};
  });
}
export function geometryHash(meshes){
  return JSON.stringify(meshes.map(m=>({p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),
    ix:m.geometry.index?Array.from(m.geometry.index.array):null,pos:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray()})));
}
