import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_PELVIS_FOCUS_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8'),marker="window.StemLab.registerTool('dinoLab'";
window.StemLab={registerTool(){}};
new Function(source.replace(marker,'globalThis.__pelvisFocus={DINOS,dinoDromaeosaurPelvisFocusBounds};'+marker))();
const api=globalThis.__pelvisFocus;delete globalThis.__pelvisFocus;
const vec=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function fixture(species){
 const parent=new THREE.Group(),model=new THREE.Group(),material=new THREE.MeshBasicMaterial();parent.add(model);
 parent.position.set(4,-2,1);parent.rotation.set(.2,-.4,.1);parent.scale.set(1.2,.9,1.1);model.position.set(.2,.1,-.3);model.rotation.y=.24;
 const bone=new THREE.Mesh(new THREE.TorusGeometry(.25,.035,12,32),material);bone.position.set(-.1,.1,.16);bone.userData.dinoDromaeosaurPelvicElement={species,layer:'bone',side:1,element:'acetabular-rim'};model.add(bone);
 const skin=new THREE.Mesh(new THREE.BoxGeometry(.6,.25,.35,2),material);skin.position.set(-.1,.1,0);skin.userData.dinoDromaeosaurPelvicEnvelope={species,layer:'life',element:'posterior-torso',minU:.55,maxU:.98};
 // Exclude two distant thoracic/terminal vertices using their real UV values.
 const p=skin.geometry.attributes.position,uv=skin.geometry.attributes.uv;for(let i=0;i<p.count;i++){uv.setX(i,i===0?0:i===1?1:.7);if(i<2)p.setX(i,i===0?8:-8);}p.needsUpdate=true;model.add(skin);
 const scenery=new THREE.Mesh(new THREE.BoxGeometry(80,20,60),material);scenery.userData.dinoRegion='habitat';model.add(scenery);
 const contour=bone.clone();contour.position.x=20;contour.userData={...bone.userData,dinoContour:true};model.add(contour);
 parent.updateMatrixWorld(true);
 return{parent,model,bone,skin,dispose(){const geometries=new Set();model.traverse(m=>{if(m.geometry)geometries.add(m.geometry);});geometries.forEach(g=>g.dispose());material.dispose();}};
}
describe('native dromaeosaur pelvic framing',()=>{
 it('limits close framing to the two reviewed taxa and never invents an empty region',()=>{
  for(const dn of api.DINOS.filter(d=>!['velociraptor','deinonychus'].includes(d.id)))expect(api.dinoDromaeosaurPelvisFocusBounds(THREE,new THREE.Group(),dn.id)).toBeNull();
  expect(api.dinoDromaeosaurPelvisFocusBounds(THREE,new THREE.Group(),'velociraptor')).toBeNull();
 });
 for(const species of ['velociraptor','deinonychus'])it(species+' retains the actual pelvic window under parent transforms without reframing the entire thorax',()=>{
  const f=fixture(species);try{
   const saved=Array.from(f.skin.geometry.attributes.position.array),r=api.dinoDromaeosaurPelvisFocusBounds(THREE,f.model,species),inverse=f.model.matrixWorld.clone().invert();
   expect(r.counts).toEqual({bone:f.bone.geometry.attributes.position.count,life:f.skin.geometry.attributes.position.count-2});
   for(const mesh of[f.bone,f.skin])for(let i=mesh===f.skin?2:0;i<mesh.geometry.attributes.position.count;i++){const local=vec().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);expect(r.bounds.containsPoint(local)).toBe(true);}
   expect(r.bounds.getSize(vec()).length()).toBeLessThan(2);expect(r.bounds.containsPoint(vec(8,0,0))).toBe(false);expect(r.bounds.containsPoint(vec(-8,0,0))).toBe(false);expect(Array.from(f.skin.geometry.attributes.position.array)).toEqual(saved);
   f.parent.position.add(vec(9,-3,4));f.parent.updateMatrixWorld(true);const moved=api.dinoDromaeosaurPelvisFocusBounds(THREE,f.model,species);expect(moved.bounds.min.distanceTo(r.bounds.min)).toBeLessThan(1e-12);expect(moved.bounds.max.distanceTo(r.bounds.max)).toBeLessThan(1e-12);
   f.model.visible=false;expect(api.dinoDromaeosaurPelvisFocusBounds(THREE,f.model,species)).toBeNull();
  }finally{f.dispose();}
 });
 it('rejects invalid UV windows, missing UVs and hidden bones rather than including unrelated tissue',()=>{
  const f=fixture('velociraptor');try{
   f.bone.visible=false;const skin=f.skin.userData.dinoDromaeosaurPelvicEnvelope;
   for(const range of [[.7,.6],[-.1,.9],[.3,1.1],[NaN,.8]]){[skin.minU,skin.maxU]=range;expect(api.dinoDromaeosaurPelvisFocusBounds(THREE,f.model,'velociraptor')).toBeNull();}
   [skin.minU,skin.maxU]=[.55,.98];f.skin.geometry.deleteAttribute('uv');expect(api.dinoDromaeosaurPelvisFocusBounds(THREE,f.model,'velociraptor')).toBeNull();
  }finally{f.dispose();}
 });
});
