import {describe,it,expect} from 'vitest';
import {api,nativeTheropodManus,THREE,vec,geometryHash} from './helpers/dino_native_theropod_manus_harness.js';

describe('dromaeosaur arm inspection uses the actual 3D solids',()=>{
 it('does not replace other taxa or fabricate missing arm geometry',()=>{
  for(const dn of api.DINOS.filter(d=>!['velociraptor','deinonychus'].includes(d.id)))expect(api.dinoDromaeosaurForelimbFocusBounds(THREE,new THREE.Group(),dn.id)).toBeNull();
  expect(api.dinoDromaeosaurForelimbFocusBounds(THREE,new THREE.Group(),'velociraptor')).toBeNull();
 });
 for(const id of ['velociraptor','deinonychus'])for(const layer of ['bone','life'])it(id+' frames every actual '+layer+' arm vertex under parent transforms',()=>{
  const b=nativeTheropodManus(id,1,.90,{body:layer==='life',bone:layer==='bone'});
  try{
   const model=b.context.model,parent=new THREE.Group();parent.add(model);parent.position.set(3,-2,1);parent.rotation.set(.1,.4,-.2);parent.scale.set(.9,1.1,1.2);model.position.set(.1,.2,-.1);model.rotation.set(.12,-.2,.05);
   model.updateWorldMatrix(true,true);const before=geometryHash(b.meshes),bounds=api.dinoDromaeosaurForelimbFocusBounds(THREE,model,id),inverse=model.matrixWorld.clone().invert();
   expect(bounds.armMeshes).toBe(b.meshes.length);expect(bounds.handMeshes).toBeGreaterThan(10);
   let n=0;for(const mesh of b.meshes){const tag=mesh.userData.dinoTheropodManualElement,p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){
    const point=vec().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);n++;
    expect(bounds.arm.containsPoint(point),mesh.name+' actual arm vertex').toBe(true);
    if(tag.ray||tag.element==='palm'||/carpal|wrist/.test(tag.element))expect(bounds.hand.containsPoint(point),mesh.name+' actual hand vertex').toBe(true);
   }}
   expect(n).toBeGreaterThan(1000);expect(geometryHash(b.meshes)).toBe(before);
   model.visible=false;expect(api.dinoDromaeosaurForelimbFocusBounds(THREE,model,id)).toBeNull();
  }finally{b.dispose();}
 });
});
