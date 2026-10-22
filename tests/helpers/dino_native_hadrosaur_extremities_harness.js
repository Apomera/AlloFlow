import {readFileSync} from 'node:fs';
import {nativeTailHarness,THREE,vec} from './dino_native_tail_harness.js';
export {THREE,vec};

export function nativeHadrosaurExtremitiesHarness(source){
 const marker="window.StemLab.registerTool('dinoLab'",names=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
 window.StemLab={registerTool(){}};
 new Function(source.replace(marker,'globalThis.__hadrosaurDistalNative={DINOS,'+names+'};'+marker))();
 const art=globalThis.__hadrosaurDistalNative;delete globalThis.__hadrosaurDistalNative;
 const native=nativeTailHarness(source);Object.assign(native.art,art);
 const evaluate=(code,result,c)=>new Function('context','with(context){'+code+';return '+result+';}')(c);
 function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);if(start<0)throw Error(name);let depth=1,end=open+1;while(depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
 const start=source.indexOf('var stance = Math.max(0.055 * detailScale, bodyDepth * 0.68)'),end=source.indexOf('} else {',source.indexOf('if (skeletalProfile.weightBearingForelimbs)',start));
 if(start<0||end<=start)throw Error('Missing actual four-limb callers');
 function build(id,scale=1,mode='both',transformed=false){
  const base=native.build(scale,.90,false,id),c=base.context,bone=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),keratin=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const anchors=[],upper=[];Object.assign(c,art,{props:{species:c.dn,showBody:mode!=='bone',showSkeleton:mode!=='life'},headMat:c.bodyMat,boneMat:bone,keratinMat:keratin,toothMat:bone,muscleMat:c.bodyMat,bodyWireMat:c.bodyMat,
   cladeName:c.dn.clade,plantedFootContacts:[],idleMotion:{legs:[]},surfaceHypothesis:{...c.surfaceHypothesis,featureScales:true,hindWingFeathers:false}});
  c.addBodyPartAnchor=(id,point)=>{const a=new THREE.Object3D();a.position.copy(point);a.userData.dinoBodyPart=id;c.model.add(a);anchors.push(a);return a;};
  c.addIguanodontThumb=c.addContourPlumage=c.addLimbPlumage=()=>null;
  for(const name of ['addBone','addTaperedBoneSegment','addLongBone','addSkeletonCone','addAccentCone','addSkeletonEllipsoid','addLimbJoint','addLimbCrest','addBodyContour','addMuscleBelly','addEllipsoid','addKeratinCone','addSoftTissueCylinder','tagDistalSurface','addDigitFan','addSoftTissueDigitFan','addLeg'])c[name]=evaluate(extract(name),name,c);
  let distalDepth=0;
  for(const name of ['addDigitFan','addSoftTissueDigitFan']){const actual=c[name];c[name]=(...args)=>{distalDepth++;try{return actual(...args);}finally{distalDepth--;}};}
  for(const name of ['addLongBone','addLimbJoint','addLimbCrest']){const actual=c[name];c[name]=(...args)=>{const before=new Set(c.model.children),result=actual(...args);if(!distalDepth)upper.push({name,args,meshes:c.model.children.filter(m=>m.isMesh&&!before.has(m))});return result;};}
  const limbs=[],actual=c.addLeg;
  c.addLeg=(x,z,front)=>{const before=new Set(c.model.children);actual(x,z,front);const meshes=c.model.children.filter(m=>m.isMesh&&!before.has(m)&&!m.userData.dinoContour);limbs.push({front,side:z>=0?1:-1,meshes,bones:meshes.filter(m=>m.material===bone),skins:meshes.filter(m=>m.material===c.bodyMat||m.material===keratin)});};
  evaluate(source.slice(start,end)+'}','undefined',c);
  if(transformed){c.model.position.set(scale,-.3*scale,2*scale);c.model.rotation.set(.12,-.25,.18);c.model.scale.set(1.12,.94,1.06);}c.model.updateMatrixWorld(true);
  const meshes=[];c.model.traverse(m=>{if(m.isMesh&&m.userData.dinoHadrosaurDistalElement)meshes.push(m);});
  return {...base,context:c,limbs,upper,anchors,meshes,bones:meshes.filter(m=>m.userData.dinoHadrosaurDistalElement.layer==='bone'),life:meshes.filter(m=>m.userData.dinoHadrosaurDistalElement.layer==='life'),
   dispose(){base.dispose();bone.dispose();keratin.dispose();}};
 }
 return {art,build};
}
