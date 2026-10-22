import{nativeTheropodBodyHarness,nativeTheropodHeadNeckHarness,THREE,vec}from'./dino_native_theropod_body_harness.js';
export{THREE,vec};
export function nativeDromaeosaurBodyHarness(source){
 const body=nativeTheropodBodyHarness(source),head=nativeTheropodHeadNeckHarness(source);
 return{art:body.art,build(id,scale=1,tissue=.90){
  const b=body.build(id,scale,tissue),h=head.build(id,scale,tissue),c=b.context;
  // The body builder executes the same reviewed forelimb caller as the viewer.
  // Read its real tagged buffers; do not separately invoke the retired generic arms.
  const armBones=[],armSkins=[];
  c.model.traverse(m=>{if(!m.isMesh)return;const tag=m.userData?.dinoTheropodManualElement;if(tag)(tag.layer==='bone'?armBones:armSkins).push(m);});
  c.model.updateMatrixWorld(true);
  // The original body recorder predates the dedicated pes. Its native digit
  // callers already execute, but its skin list contains only the leg shaft.
  // Include the actual tagged pedal meshes, including their proximal covers.
  const pedalBones=[],pedalSkins=[],baseCovers=[];
  c.model.traverse(m=>{if(!m.isMesh)return;const tag=m.userData?.dinoDromaeosaurPedalElement,base=m.userData?.dinoDromaeosaurPedalBase;if(tag?.species===id)(tag.layer==='bone'?pedalBones:pedalSkins).push(m);if(base?.species===id&&base.layer==='life')baseCovers.push(m);});
  return{...b,head:h,armBones,armSkins,pedalBones,pedalSkins,baseCovers,skins:[...b.skins,...pedalSkins,...baseCovers,...armSkins,...h.skins],dispose(){b.dispose();h.dispose();}};
 }};
}
