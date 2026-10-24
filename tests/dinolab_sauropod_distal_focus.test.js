import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_SAUROPOD_DISTAL_FOCUS_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
window.StemLab={registerTool(){}};
const marker="window.StemLab.registerTool('dinoLab'";
new Function(source.replace(marker,'globalThis.__distalFocus={dinoSauropodDistalFocusBounds,dinoSauropodDistalIsolation};'+marker))();
const {dinoSauropodDistalFocusBounds:focus,dinoSauropodDistalIsolation:isolate}=globalThis.__distalFocus;delete globalThis.__distalFocus;
function fixture(){
 const parent=new THREE.Group(),model=new THREE.Group();parent.add(model);parent.position.set(4,-2,1);parent.rotation.set(.2,-.4,.1);parent.scale.set(1.2,.9,1.1);model.rotation.y=.24;
 const material=new THREE.MeshBasicMaterial(),meshes=[];
 for(const front of [false,true])for(const side of[-1,1]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.25,.35,.2),material);mesh.position.set(front?-1:1,.2,side*.4);mesh.rotation.z=.2;mesh.userData.dinoSauropodDistalElement={species:'diplodocus',front,side,layer:'bone',ray:1,element:'metapodial'};model.add(mesh);meshes.push(mesh);}
 return{parent,model,meshes,material,dispose(){model.traverse(m=>m.geometry?.dispose());material.dispose();}};
}
describe('native paired sauropod hand and foot framing',()=>{
 it('fits actual local vertices despite transformed parents and does not mutate geometry or transforms',()=>{
  const f=fixture(),before=f.meshes.map(m=>[Array.from(m.geometry.attributes.position.array),m.position.toArray(),m.quaternion.toArray(),m.scale.toArray()]),out=focus(THREE,f.model,'diplodocus');
  expect(out.counts).toEqual({hand:{bone:48,life:0},foot:{bone:48,life:0}});
  const inverse=f.model.matrixWorld.clone().invert();for(const mesh of f.meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)expect(out[mesh.userData.dinoSauropodDistalElement.front?'hand':'foot'].containsPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse))).toBe(true);}
  expect(out.hand.max.x).toBeLessThan(out.foot.min.x);expect(out.detailHand.containsPoint(f.meshes[3].position)).toBe(true);expect(out.detailHand.containsPoint(f.meshes[2].position)).toBe(false);expect(out.detailFoot.containsPoint(f.meshes[1].position)).toBe(true);expect(out.detailFoot.containsPoint(f.meshes[0].position)).toBe(false);expect(f.meshes.map(m=>[Array.from(m.geometry.attributes.position.array),m.position.toArray(),m.quaternion.toArray(),m.scale.toArray()])).toEqual(before);f.dispose();
 });
 it('uses the actual living envelope when broader than bone and ignores scenery/contours',()=>{
  const f=fixture(),initial=focus(THREE,f.model,'diplodocus');const shell=f.meshes[0].clone();shell.geometry=new THREE.BoxGeometry(.8,.6,.6);shell.userData={dinoSauropodDistalElement:{species:'diplodocus',front:false,side:1,layer:'life',element:'pad'}};f.model.add(shell);
  const scenery=new THREE.Mesh(new THREE.BoxGeometry(100,100,100),f.material);f.model.add(scenery);const contour=shell.clone();contour.scale.setScalar(100);contour.userData={...shell.userData,dinoContour:true};f.model.add(contour);
  const out=focus(THREE,f.model,'diplodocus');expect(out.foot.getSize(new THREE.Vector3()).x).toBeGreaterThan(initial.foot.getSize(new THREE.Vector3()).x);expect(out.counts.foot).toEqual({bone:48,life:24});expect(out.foot.max.x).toBeLessThan(3);expect(out.hand.equals(initial.hand)).toBe(true);f.dispose();
 });
 it('excludes hidden groups and invalid points without inventing missing regions',()=>{
  const f=fixture(),group=new THREE.Group();f.model.add(group);for(const mesh of f.meshes.filter(m=>m.userData.dinoSauropodDistalElement.front))group.add(mesh);group.visible=false;
  const p=f.meshes[0].geometry.attributes.position;p.setXYZ(0,NaN,Infinity,0);const out=focus(THREE,f.model,'diplodocus');expect(out.hand).toBeNull();expect(out.counts.foot.bone).toBe(47);expect(out.foot.min.toArray().every(Number.isFinite)).toBe(true);f.model.visible=false;expect(focus(THREE,f.model,'diplodocus')).toBeNull();f.dispose();
 });
 it('is exact-four scoped and rejects unrelated/absent metadata',()=>{
  const f=fixture();expect(focus(THREE,f.model,'nigersaurus')).toBeNull();for(const id of ['brachiosaurus','apatosaurus','camarasaurus']){for(const mesh of f.meshes)mesh.userData.dinoSauropodDistalElement.species=id;expect(focus(THREE,f.model,id).hand).toBeInstanceOf(THREE.Box3);}expect(focus(THREE,new THREE.Group(),'diplodocus')).toBeNull();f.dispose();
 });
 it('isolates the actual pair and optional short context while restoring every prior visibility exactly',()=>{
  const f=fixture(),torso=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),f.material),hidden=f.meshes[1];hidden.visible=false;f.model.add(torso);
  const context=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),f.material);context.userData.dinoSauropodDistalContext={species:'diplodocus',front:true,side:1,layer:'life',lowerLegOnly:true};f.model.add(context);
  const snapshots=[];f.model.traverse(m=>{if(m.isMesh)snapshots.push([m,m.visible]);});const view=isolate(f.model,'diplodocus');view.apply('manus');expect(torso.visible).toBe(false);expect(context.visible).toBe(true);expect(f.meshes.filter(m=>m.visible)).toHaveLength(1);expect(f.meshes[3].visible).toBe(true);expect(f.model.userData.dinoSauropodDistalIsolation.side).toBe(1);view.apply('pes');expect(context.visible).toBe(false);expect(hidden.visible).toBe(false);expect(f.meshes.filter(m=>m.visible)).toHaveLength(0);
  view.apply(null);for(const[m,visible]of snapshots)expect(m.visible).toBe(visible);expect(f.model.userData.dinoSauropodDistalIsolation.active).toBe(false);
  torso.visible=false;view.apply('manus');view.apply(null);expect(torso.visible).toBe(false);f.dispose();
 });
 it('preserves ancestor visibility and rejects untagged or mismatched pseudo context',()=>{
  const f=fixture(),group=new THREE.Group();f.model.add(group);group.add(f.meshes[2]);group.visible=false;
  const wrong=f.meshes[0].clone();wrong.userData={dinoSauropodDistalContext:{species:'diplodocus',front:true,lowerLegOnly:false}};f.model.add(wrong);const view=isolate(f.model,'diplodocus');view.apply('manus');expect(wrong.visible).toBe(false);expect(group.visible).toBe(false);view.apply(null);expect(group.visible).toBe(false);expect(wrong.visible).toBe(true);expect(isolate(f.model,'nigersaurus')).toBeNull();f.dispose();
 });
});
