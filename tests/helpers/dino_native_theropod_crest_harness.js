import {readFileSync} from 'node:fs';
import {nativeReviewedTheropodCranium,THREE,vec} from './dino_native_theropod_cranium_harness.js';
export {THREE,vec};
export const source=readFileSync(process.env.DINO_THEROPOD_CREST_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
const native=nativeReviewedTheropodCranium(source);
export const api=native.art;
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Missing native crest assembly '+start);return source.slice(a,b);}
// Keep the real contiguous construction + life-call block. Extracting a
// single line from a taxon-only branch could falsely validate unreachable UI.
const assembly=section('// DINO_THEROPOD_CREST_ASSEMBLY_START','// DINO_CARNOTAURUS_HORN_ASSEMBLY_START');
const motion=section('function registerCranialMotion(part) {','scene.add(model);');
const lifeCall=source.split('\n').find(s=>s.includes('if(theropodCrests)addReviewedTheropodCrests(false);'));
const boneCall=source.split('\n').find(s=>s.includes('if(theropodCrests)addReviewedTheropodCrests(true);'));
if(!lifeCall||!boneCall)throw Error('Missing native crest layer call');
const run=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
export function nativeTheropodCrests(id,scale=1,tissue=.90,visibility={body:true,bone:true}){
  const b=native.build(id,scale,tissue),c=b.context;
  c.props={...c.props,showBody:visibility.body,showSkeleton:visibility.bone};
  c.cranialMotionParts=[];
  Object.assign(c,run(motion,'({registerCranialMotion,captureCranialMotion})',c));
  Object.assign(c,run(assembly,'({theropodCrests,addReviewedTheropodCrests})',c));
  run(boneCall,'null',c);c.model.updateMatrixWorld(true);
  const ornaments=c.model.children.filter(m=>m.userData.dinoTheropodCranialElement&&/^(nasolacrimal-crest|lacrimal-process)$/.test(m.userData.dinoTheropodCranialElement.element));
  return {...b,ornaments,cores:ornaments.filter(m=>m.userData.dinoTheropodCranialElement.layer==='bone'),coverings:ornaments.filter(m=>m.userData.dinoTheropodCranialElement.layer==='life')};
}
export function crestGeometryHash(meshes){return JSON.stringify(meshes.map(m=>({p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:Array.from(m.geometry.index.array),position:m.position.toArray(),scale:m.scale.toArray(),q:m.quaternion.toArray()})));}
