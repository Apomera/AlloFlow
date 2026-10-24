import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_SAUROPOD_SKULL_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8'),marker="window.StemLab.registerTool('dinoLab'";
window.StemLab={registerTool(){}};
new Function(source.replace(marker,'globalThis.__sauropodFocus={DINOS,dinoSauropodHeadFocusBounds};'+marker))();
const api=globalThis.__sauropodFocus;delete globalThis.__sauropodFocus;
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(species){
 const parent=new THREE.Group(),model=new THREE.Group(),material=new THREE.MeshBasicMaterial();parent.add(model);
 parent.position.set(4,-2,1);parent.rotation.set(.2,-.4,.1);parent.scale.set(1.2,.9,1.1);model.position.set(.2,.1,-.3);model.rotation.y=.24;
 const bone=new THREE.Mesh(new THREE.TorusGeometry(.32,.035,12,32),material);bone.position.set(-.1,.2,.16);bone.userData.dinoSauropodCranialElement={species,layer:'bone',side:1,element:'bony-naris-rim'};model.add(bone);
 const upper=new THREE.Mesh(new THREE.BoxGeometry(.6,.25,.35,2),material);upper.position.set(-.1,.1,0);
 upper.userData.dinoSauropodCranium={species,layer:'life',element:'cranial-envelope',cranialMinU:.5};
 // One distant cervical socket is excluded from framing by its declared UV.
 const p=upper.geometry.attributes.position,uv=upper.geometry.attributes.uv;for(let i=0;i<p.count;i++){uv.setX(i,i===0?0:1);if(i===0)p.setX(i,8);}p.needsUpdate=true;model.add(upper);
 const jaw=new THREE.Mesh(new THREE.BoxGeometry(.7,.12,.3),material);jaw.position.set(-.15,-.1,0);jaw.userData.dinoSauropodCranium={species,layer:'life',element:'mandibular-envelope'};model.add(jaw);
 const scenery=new THREE.Mesh(new THREE.BoxGeometry(80,20,60),material);scenery.userData.dinoRegion='habitat';model.add(scenery);
 const contour=bone.clone();contour.position.x=20;contour.userData={...bone.userData,dinoContour:true};model.add(contour);
 parent.updateMatrixWorld(true);
 return{parent,model,bone,upper,jaw,dispose(){const geometries=new Set();model.traverse(m=>{if(m.geometry)geometries.add(m.geometry);});geometries.forEach(g=>g.dispose());material.dispose();}};
}
describe('native sauropod skull framing',()=>{
 it('limits framing to the two reviewed catalog reconstructions and returns no invented bounds',()=>{
  for(const dn of api.DINOS.filter(d=>!['diplodocus','camarasaurus'].includes(d.id)))expect(api.dinoSauropodHeadFocusBounds(THREE,new THREE.Group(),dn.id)).toBeNull();
  expect(api.dinoSauropodHeadFocusBounds(THREE,new THREE.Group(),'diplodocus')).toBeNull();
 });
 for(const species of ['diplodocus','camarasaurus'])it(species+' retains every cranial vertex under parent transforms while omitting scenery and the cervical socket',()=>{
  const f=fixture(species);try{
   const saved=Array.from(f.upper.geometry.attributes.position.array),r=api.dinoSauropodHeadFocusBounds(THREE,f.model,species),inverse=f.model.matrixWorld.clone().invert();
   expect(r).not.toBeNull();expect(r.counts.bone).toBe(f.bone.geometry.attributes.position.count);expect(r.counts.upper).toBe(f.upper.geometry.attributes.position.count-1);expect(r.counts.jaw).toBe(f.jaw.geometry.attributes.position.count);
   for(const mesh of[f.bone,f.upper,f.jaw])for(let i=mesh===f.upper?1:0;i<mesh.geometry.attributes.position.count;i++){
    const local=vec().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);expect(r.bounds.containsPoint(local)).toBe(true);
   }
   expect(r.bounds.getSize(vec()).length()).toBeLessThan(2);expect(r.bounds.containsPoint(vec(8,0,0))).toBe(false);expect(Array.from(f.upper.geometry.attributes.position.array)).toEqual(saved);
   f.parent.position.add(vec(9,-3,4));f.parent.updateMatrixWorld(true);const moved=api.dinoSauropodHeadFocusBounds(THREE,f.model,species);expect(moved.bounds.min.distanceTo(r.bounds.min)).toBeLessThan(1e-12);expect(moved.bounds.max.distanceTo(r.bounds.max)).toBeLessThan(1e-12);
   f.model.visible=false;expect(api.dinoSauropodHeadFocusBounds(THREE,f.model,species)).toBeNull();
  }finally{f.dispose();}
 });
 it('does not treat a hidden bone or invalid upper UV contract as visible skull anatomy',()=>{
  const f=fixture('diplodocus');try{f.bone.visible=false;f.upper.userData.dinoSauropodCranium.cranialMinU=1;f.jaw.visible=false;expect(api.dinoSauropodHeadFocusBounds(THREE,f.model,'diplodocus')).toBeNull();}finally{f.dispose();}
 });
});
