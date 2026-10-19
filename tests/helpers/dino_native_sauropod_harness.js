import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { nativeMeshContains } from './dino_native_mesh_contains.js';
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const path = process.env.DINO_SAUROPOD_BODY_SOURCE || 'stem_lab/stem_tool_dinolab.js';
const source = readFileSync(path,'utf8');
globalThis.window = { StemLab: { registerTool() {} } };
const names = [...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]);
names.push('skeletalAnatomyProfileFor');
new Function(source.replace("window.StemLab.registerTool('dinoLab'", 'globalThis.__sauropodNative={DINOS,'+names.join(',')+"};window.StemLab.registerTool('dinoLab'"))();
export const api = globalThis.__sauropodNative;
export const species = ['brachiosaurus','diplodocus','apatosaurus','camarasaurus'];
const vec = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function section(start,end) { const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Native section missing: '+start);return source.slice(a,b); }
function run(code,result,context) { return new Function('context','with(context){'+code+'\nreturn '+result+';}')(context); }
function factory(name,context) { const a=source.indexOf('function '+name+'('),b=source.indexOf('\n            function ',a+1);if(a<0||b<a)throw Error('Native factory missing '+name);return run(source.slice(a,b),name,context); }
const nativeFactories=section('function addBone(a, b, radius) {','function addSoftTissueCylinder(a, b, startRadius, endRadius, mat) {');
const nativeChain=section('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {','function addContourGroup(meshes)');
const nativeAnchors=section('var detailScale = Math.min(1, ht / 2);','var evidenceAnchorPoints =');
const nativeTorso=section('var surfaceBodyHeight = bodyHeight * surfaceHypothesis.bodyHeightScale;','function dorsalSurfacePoint(t)');
const nativeHead=section('var surfaceHeadFactor = reconstructionProfile.head','if (headShell) {');
const nativeNeck=section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve =');
const nativeLeg=section('function addLeg(x, z, front) {','var stance =');
const nativeDigits=section('function tagDistalSurface(mesh, front, sideSign, partIds, feature) {','function surfaceAnchor(surface, center, outward) {');

export function nativeBuild(id,scale=1,tissue='lean') {
  const dn=api.DINOS.find(d=>d.id===id),model=new THREE.Group();
  const boneMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),bodyMat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const c={ THREE,...api,vec,dn,model,len:dn.lengthM*scale,ht:dn.heightM*scale,
    isTheropod:false,isSauropod:true,cladeName:dn.clade,
    reconstructionProfile:api.reconstructionProfileFor(dn),posture:api.postureProfileFor(dn),postcranialSurface:api.postcranialSurfaceProfileFor(dn),
    cranialSurface:api.cranialSurfaceProfileFor(dn),skeletalProfile:api.skeletalAnatomyProfileFor(dn),
    props:{species:dn,showBody:true,showSkeleton:true},surfaceHypothesis:{bodyHeightScale:tissue==='lean'?.91:1.09,bodyDepthScale:tissue==='lean'?.89:1.10,headSoftTissueScale:tissue==='lean'?.90:1.13,neckSoftTissueScale:tissue==='lean'?.88:1.12,featureScales:true},
    boneMat,bodyMat,headMat:bodyMat,jointMat:boneMat,jawJointMat:boneMat,cranialAccentMat:boneMat,skeletonCavityMat:boneMat,bodyWireMat:bodyMat,keratinMat:bodyMat,
    idleMotion:{legs:[],breathingMeshes:[]},plantedFootContacts:[],addBodyPartAnchor(){return null;},addDigitFan(){},addSoftTissueDigitFan(){},addMuscleBelly(){},addIguanodontThumb(){},addContourPlumage(){},addLimbPlumage(){},addBodyContour(){return null;} };
  Object.assign(c,run(nativeFactories,'({addBone,addTaperedBoneSegment,addLongBone,addLimbJoint,addLimbCrest,addGirdleBlade,addScapularBlade,addSkeletonEllipsoid,addSkeletonCone,addDorsalSpine,addVertebralChain})',c));
  c.addSoftTissueChain=run(nativeChain,'addSoftTissueChain',c);
  c.addEllipsoid=factory('addEllipsoid',c);
  c.addKeratinCone=factory('addKeratinCone',c);
  Object.assign(c,run(nativeAnchors,'({hip,shoulder,head,tail,snout,ceratopsidCranium:typeof ceratopsidCranium === "undefined" ? null : ceratopsidCranium,bodyHeight,bodyDepth,bodyLen,bodyCenter,detailScale,matureTyrannosaurPose})',c));
  Object.assign(c,run(nativeTorso,'({bodyShell,surfaceBodyHeight,surfaceBodyDepth,torsoPoints,torsoRadii})',c));
  Object.assign(c,run(nativeHead,'({headShell,cervicalEnvelope,neckPoints,neckRadii,neckBaseRadius,neckTipRadius,surfaceHeadLength,surfaceHeadHeight,surfaceHeadDepth})',c));
  Object.assign(c,run(nativeNeck,'({neckMeshes})',c));
  const before=new Set(model.children),skullLength=Math.max(.20*c.detailScale,c.len*.040)*c.reconstructionProfile.head;
  const axisEnd=c.head.clone().add(c.shoulder.clone().sub(c.head).normalize().multiplyScalar(skullLength*.84));
  c.addVertebralChain(c.shoulder,axisEnd,12,Math.max(.044*c.detailScale,c.ht*.015),Math.max(.032*c.detailScale,c.ht*.010),1.25,'cervical',null);
  const cervical=model.children.filter(mesh=>!before.has(mesh)&&mesh.isMesh);
  const ribBefore=new Set(model.children);
  for(let i=1;i<=c.skeletalProfile.cervicalRibCount;i++)for(const side of [-1,1]) {const r=api.dinoSauropodBodyRib(THREE,dn,c.neckPoints,i/(c.skeletalProfile.cervicalRibCount+1),c.len,c.ht,c.bodyHeight,side);c.addBone(r.base,r.tip,r.radius);}
  const cervicalRibs=model.children.filter(mesh=>!ribBefore.has(mesh)&&mesh.isMesh);
  const addLeg=run(nativeLeg,'addLeg',c),limbs=[];
  c.addSoftTissueDigitFan=run(nativeDigits,'addSoftTissueDigitFan',c);
  const stance=Math.max(.055*c.detailScale,c.bodyDepth*.68)*c.skeletalProfile.stanceWidth;
  for(const front of [false,true])for(const side of [-1,1]) {
    const old=new Set(model.children);addLeg((front?c.shoulder:c.hip).x,side*stance,front);
    const meshes=model.children.filter(mesh=>!old.has(mesh)&&mesh.isMesh);
    limbs.push({front,side,skin:meshes.find(mesh=>mesh.userData.dinoSurface==='continuous'),coverings:meshes.filter(mesh=>mesh.material===bodyMat),bones:meshes.filter(mesh=>mesh.material===boneMat)});
  }
  model.updateMatrixWorld(true);
  return {dn,model,c,body:c.bodyShell,neck:c.neckMeshes[0],head:c.headShell,cervical,cervicalRibs,limbs,dispose(){model.traverse(mesh=>{if(mesh.geometry)mesh.geometry.dispose();});bodyMat.dispose();boneMat.dispose();}};
}

const containmentCache=new WeakMap();
function inside(mesh,p,tolerance) {
  let cached=containmentCache.get(mesh);
  if(!cached||cached.tolerance!==tolerance){cached={tolerance,contains:nativeMeshContains(mesh,tolerance)};containmentCache.set(mesh,cached);}
  return cached.contains(p);
}
function originalRayInside(mesh,p,tolerance) {
  const hits=new THREE.Raycaster(p,vec(1,.371,.217).normalize()).intersectObject(mesh,false),distances=[];
  for(const h of hits)if(h.distance>tolerance&&!distances.some(d=>Math.abs(d-h.distance)<tolerance))distances.push(h.distance);
  return distances.length%2===1;
}
const hash=meshes=>{const h=createHash('sha256');for(const mesh of meshes){for(const name of ['position','normal','uv'])if(mesh.geometry.attributes[name])h.update(mesh.geometry.attributes[name].array);if(mesh.geometry.index)h.update(mesh.geometry.index.array);h.update(JSON.stringify([mesh.position.toArray(),mesh.quaternion.toArray(),mesh.scale.toArray()]));}return h.digest('hex');};

export {THREE,inside,originalRayInside,hash};
