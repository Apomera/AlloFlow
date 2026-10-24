import {readFileSync} from 'node:fs';
import {nativeTailHarness,THREE,vec} from './dino_native_tail_harness.js';
export {THREE,vec};
globalThis.window=globalThis.window||{};
export const source=readFileSync(process.env.DINO_DROMAEOSAUR_PES_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
export function nativeDromaeosaurPesHarness(text){
  const marker="window.StemLab.registerTool('dinoLab'",names=[...text.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
  window.StemLab={registerTool(){}};
  new Function(text.replace(marker,'globalThis.__nativePedal={DINOS,reconstructionProfileFor,postureProfileFor,postcranialSurfaceProfileFor,skeletalAnatomyProfileFor,'+names+'};'+marker))();
  const art=globalThis.__nativePedal;delete globalThis.__nativePedal;
  const native=nativeTailHarness(text);Object.assign(native.art,art);
  const evaluate=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  function extract(name){const start=text.indexOf('function '+name+'('),open=text.indexOf('{',start);if(start<0)throw Error('Missing native '+name);let depth=1,end=open+1;while(depth&&end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++;}return text.slice(start,end);}
  const stanceStart=text.indexOf('var stance = Math.max(0.055 * detailScale, bodyDepth * 0.68)'),stanceEnd=text.indexOf('if (skeletalProfile.weightBearingForelimbs)',stanceStart);
  if(stanceStart<0||stanceEnd<=stanceStart)throw Error('Missing actual paired hindleg callers');
  return {art,build(id,scale=1,tissue=.90,visibility={body:true,bone:true}){
    const b=native.build(scale,tissue,false,id),c=b.context,boneMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),keratinMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const anchors=[];
    Object.assign(c,art,{props:{species:c.dn,showBody:visibility.body,showSkeleton:visibility.bone},headMat:c.bodyMat,boneMat:boneMaterial,keratinMat:keratinMaterial,
      bodyWireMat:c.bodyMat,muscleMat:c.bodyMat,toothMat:boneMaterial,cladeName:c.dn.clade,plantedFootContacts:[],idleMotion:{legs:[]},
      surfaceHypothesis:{...c.surfaceHypothesis,headSoftTissueScale:tissue,featureScales:true,hindWingFeathers:false}});
    c.addBodyPartAnchor=(id,point)=>{const anchor=new THREE.Object3D();anchor.position.copy(point);anchor.userData.dinoBodyPart=id;c.model.add(anchor);anchors.push(anchor);return anchor;};
    const functions=['addBone','addLongBone','addSkeletonCone','addAccentCone','addSkeletonEllipsoid','addLimbJoint','addLimbCrest','addBodyContour',
      'addMuscleBelly','addEllipsoid','addKeratinCone','addSoftTissueCylinder','tagDistalSurface','addDigitFan','addSoftTissueDigitFan','addLeg'];
    for(const name of functions)c[name]=evaluate(extract(name),name,c);
    // These complete production functions invoke the scoped bypasses; there is
    // no standalone substitute foot renderer or synthetic root calculation.
    evaluate(text.slice(stanceStart,stanceEnd),'null',c);c.model.updateMatrixWorld(true);
    const meshes=[],baseCovers=[],shafts=[];c.model.traverse(mesh=>{if(!mesh.isMesh)return;if(mesh.userData.dinoDromaeosaurPedalElement)meshes.push(mesh);
      if(mesh.userData.dinoDromaeosaurPedalBase)baseCovers.push(mesh);if(mesh.userData.dinoDromaeosaurMetatarsalContext?.layer==='bone')shafts.push(mesh);});
    return {...b,context:c,anchors,meshes,baseCovers,shafts,bones:meshes.filter(m=>m.userData.dinoDromaeosaurPedalElement.layer==='bone'),
      life:meshes.filter(m=>m.userData.dinoDromaeosaurPedalElement.layer==='life'),
      dispose(){b.dispose();boneMaterial.dispose();keratinMaterial.dispose();}};
  }};
}
const native=nativeDromaeosaurPesHarness(source);
export const api=native.art;
export const nativeDromaeosaurPes=(...args)=>native.build(...args);
export function pedalGeometryHash(meshes){return JSON.stringify(meshes.map(m=>({name:m.name,p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:m.geometry.index&&Array.from(m.geometry.index.array),position:m.position.toArray(),scale:m.scale.toArray(),q:m.quaternion.toArray()})));}
