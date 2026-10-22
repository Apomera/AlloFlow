import {readFileSync} from 'node:fs';
import {nativeRosetteHarness,THREE,vec} from './dino_native_rosette_harness.js';
export {THREE,vec};
export const source=readFileSync(process.env.DINO_DROMAEOSAUR_FORELIMB_SOURCE||process.env.DINO_THEROPOD_MANUS_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
globalThis.window=globalThis.window||{StemLab:{registerTool(){}}};
const names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
const factorySource='('+nativeRosetteHarness.toString()
  .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+names+'};')
  .replace('const toothMat =','const boneMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}); const toothMat =')
  .replace('boneMat: material','boneMat: boneMaterial')
  .replace('material.dispose(); toothMat.dispose();','material.dispose(); boneMaterial.dispose(); toothMat.dispose();')
  .replace('cervicalEnvelope,matureTyrannosaurPose','bodyHeight,cervicalEnvelope,matureTyrannosaurPose')+')';
const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec),native=factory(source);
export const api=native.art;
const start=source.indexOf('// DINO_REVIEWED_THEROPOD_FORELIMB_START'),end=source.indexOf('// DINO_REVIEWED_THEROPOD_FORELIMB_END',start);
if(start<0||end<=start)throw Error('Missing actual reviewed theropod forelimb assembly');
const branch=source.slice(start,end);
export function nativeTheropodManus(id,scale=1,tissue=.90,visibility={body:true,bone:true}){
  const b=native.build(id,scale,tissue),c=b.context;
  c.props={...c.props,showBody:visibility.body,showSkeleton:visibility.bone};c.keratinMat=c.headMat;
  // The isolated limb harness records actual bone and covering buffers;
  // native feather attachment is exercised by the browser integration flow.
  c.addContourPlumage=c.addLimbPlumage=()=>null;
  const anchors=[];c.addBodyPartAnchor=(id,point)=>{anchors.push({id,point:point.toArray()});return null;};
  for(const armSide of [-1,1]){c.armSide=armSide;new Function('context','with(context){(function(){'+branch+'})();}')(c);}
  c.model.updateMatrixWorld(true);
  const meshes=[];c.model.traverse(m=>{if(m.isMesh&&m.userData.dinoTheropodManualElement)meshes.push(m);});
  return {...b,meshes,anchors,bones:meshes.filter(m=>m.userData.dinoTheropodManualElement.layer==='bone'),life:meshes.filter(m=>m.userData.dinoTheropodManualElement.layer==='life')};
}
export function geometryHash(meshes){return JSON.stringify(meshes.map(m=>({name:m.name,p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:Array.from(m.geometry.index.array),position:m.position.toArray(),scale:m.scale.toArray(),q:m.quaternion.toArray()})));}
