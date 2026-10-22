import {readFileSync} from 'node:fs';
import {nativeTailHarness,THREE,vec} from './dino_native_tail_harness.js';
export {THREE,vec};
export const source=readFileSync(process.env.DINO_SAUROPOD_EXTREMITIES_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
globalThis.window=globalThis.window||{};
export function nativeSauropodExtremitiesHarness(text){
  const marker="window.StemLab.registerTool('dinoLab'",names=[...text.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
  window.StemLab={registerTool(){}};
  new Function(text.replace(marker,'globalThis.__nativeSauropodDistal={DINOS,'+names+'};'+marker))();
  const art=globalThis.__nativeSauropodDistal;delete globalThis.__nativeSauropodDistal;
  const native=nativeTailHarness(text);Object.assign(native.art,art);
  const evaluate=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
  function extract(name){const start=text.indexOf('function '+name+'('),open=text.indexOf('{',start);if(start<0)throw Error('Missing actual '+name);let depth=1,end=open+1;while(depth&&end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++;}return text.slice(start,end);}
  const stanceStart=text.indexOf('var stance = Math.max(0.055 * detailScale, bodyDepth * 0.68)'),stanceEnd=text.indexOf('} else {',text.indexOf('if (skeletalProfile.weightBearingForelimbs)',stanceStart));
  if(stanceStart<0||stanceEnd<stanceStart)throw Error('Missing actual four-leg sauropod callers');
  return {art,build(id,scale=1,visibility={body:true,bone:true}){
    const b=native.build(scale,.90,false,id),c=b.context,bone=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),keratin=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    const anchors=[];Object.assign(c,art,{props:{species:c.dn,showBody:visibility.body,showSkeleton:visibility.bone},headMat:c.bodyMat,boneMat:bone,keratinMat:keratin,toothMat:bone,muscleMat:c.bodyMat,
      bodyWireMat:c.bodyMat,cladeName:c.dn.clade,plantedFootContacts:[],idleMotion:{legs:[]},surfaceHypothesis:{...c.surfaceHypothesis,featureScales:true,hindWingFeathers:false}});
    c.addBodyPartAnchor=(id,point)=>{const anchor=new THREE.Object3D();anchor.position.copy(point);anchor.userData.dinoBodyPart=id;c.model.add(anchor);anchors.push(anchor);return anchor;};
    for(const name of ['addBone','addTaperedBoneSegment','addLongBone','addSkeletonCone','addAccentCone','addSkeletonEllipsoid','addLimbJoint','addLimbCrest','addBodyContour','addMuscleBelly','addEllipsoid','addKeratinCone','addSoftTissueCylinder','tagDistalSurface','addDigitFan','addSoftTissueDigitFan','addLeg'])c[name]=evaluate(extract(name),name,c);
    const limbs=[],actualAddLeg=c.addLeg;
    c.addLeg=(x,z,front)=>{const before=new Set(c.model.children);actualAddLeg(x,z,front);const meshes=c.model.children.filter(m=>!before.has(m)&&m.isMesh);limbs.push({front,side:z>=0?1:-1,meshes,bones:meshes.filter(m=>m.material===bone),skins:meshes.filter(m=>m.material===c.bodyMat)});};
    // Run the production caller, not a replacement renderer or synthetic root.
    evaluate(text.slice(stanceStart,stanceEnd)+'}','null',c);c.model.updateMatrixWorld(true);
    const meshes=[];c.model.traverse(m=>{if(m.isMesh&&m.userData.dinoSauropodDistalElement)meshes.push(m);});
    return {...b,context:c,anchors,limbs,meshes,bones:meshes.filter(m=>m.userData.dinoSauropodDistalElement.layer==='bone'),life:meshes.filter(m=>m.userData.dinoSauropodDistalElement.layer==='life'),
      dispose(){b.dispose();bone.dispose();keratin.dispose();}};
  }};
}
const native=nativeSauropodExtremitiesHarness(source);
export const api=native.art;
export const nativeSauropodExtremities=(...args)=>native.build(...args);
export const distalGeometryHash=meshes=>JSON.stringify(meshes.map(m=>({name:m.name,p:Array.from(m.geometry.attributes.position.array),ix:m.geometry.index&&Array.from(m.geometry.index.array),position:m.position.toArray(),scale:m.scale.toArray(),q:m.quaternion.toArray()})));
