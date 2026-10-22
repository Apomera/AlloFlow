import {readFileSync} from 'node:fs';
import {nativeRosetteHarness,THREE,vec} from './dino_native_rosette_harness.js';
export {THREE,vec};
export const source=readFileSync(process.env.DINO_CARNOTAURUS_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
globalThis.window=globalThis.window||{StemLab:{registerTool(){}}};
const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
const factorySource='('+nativeRosetteHarness.toString()
  .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
  .replace('const toothMat =','const boneMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}); const toothMat =')
  .replace('boneMat: material','boneMat: boneMaterial')
  .replace('material.dispose(); toothMat.dispose();','material.dispose(); boneMaterial.dispose(); toothMat.dispose();')
  .replace('craniocervicalDetail: false','craniocervicalDetail: true')
  .replace('cervicalEnvelope,matureTyrannosaurPose','bodyHeight,cervicalEnvelope,matureTyrannosaurPose')
  .replace('evaluate(bones + shaping, context','evaluate(bones, context')+')';
const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec),native=factory(source);
export const api=native.art;
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Missing native Carnotaurus assembly '+start);return source.slice(a,b);}
const arm=section('// DINO_CARNOTAURUS_NATIVE_FORELIMB_START','// DINO_CARNOTAURUS_NATIVE_FORELIMB_END');
const neck=section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve =');
const hornAssembly=section('// DINO_CARNOTAURUS_HORN_ASSEMBLY_START','// DINO_CARNOTAURUS_HORN_ASSEMBLY_END');
const motion=section('function registerCranialMotion(part) {','scene.add(model);');
const hornLifeCall=source.split('\n').find(s=>s.includes('if(carnotaurusCranium) addReviewedCarnotaurusHorns(false);'));
const hornBoneCall=source.split('\n').find(s=>s.includes("if(carnotaurusCranium && hasAnatomyPart('horns')) addReviewedCarnotaurusHorns(true);"));
function run(code,result,c){return new Function('context','with(context){'+code+';return '+result+';}')(c);}
export function nativeCarnotaurus(scale=1,tissue=.90,visibility={body:true,bone:true}){
  const b=native.build('carnotaurus',scale,tissue),c=b.context;
  c.props={...c.props,showBody:visibility.body,showSkeleton:visibility.bone};
  c.addBodyPartAnchor=()=>null;
  for(const armSide of [-1,1]){c.armSide=armSide;run('(function(){'+arm+'})();','null',c);}
  c.neckMeshes=run(neck,'neckMeshes',c);
  c.cranialMotionParts=[];c.keratinMat=c.headMat;c.hasAnatomyPart=()=>true;
  Object.assign(c,run(motion,'({registerCranialMotion,captureCranialMotion})',c));
  c.addReviewedCarnotaurusHorns=run(hornAssembly,'addReviewedCarnotaurusHorns',c);
  run(hornLifeCall+'\n'+hornBoneCall,'null',c);
  c.model.updateMatrixWorld(true);
  const armMeshes=c.model.children.filter(m=>m.userData.dinoCarnotaurusElement);
  const horns=c.model.children.filter(m=>m.userData.dinoCarnotaurusHorn);
  return {...b,horns,hornCores:horns.filter(m=>m.userData.dinoCarnotaurusHorn.layer==='bone'),hornCoverings:horns.filter(m=>m.userData.dinoCarnotaurusHorn.layer==='covering'),armMeshes,armBones:armMeshes.filter(m=>m.userData.dinoCarnotaurusElement.layer==='bone'),
    armSkins:armMeshes.filter(m=>m.userData.dinoCarnotaurusElement.layer==='skin'),neck:c.neckMeshes[0]};
}
export function geometryHash(meshes){return JSON.stringify(meshes.map(m=>({p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:Array.from(m.geometry.index.array),position:m.position.toArray(),scale:m.scale.toArray(),q:m.quaternion.toArray()})));}
