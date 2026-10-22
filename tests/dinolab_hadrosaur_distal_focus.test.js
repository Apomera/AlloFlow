import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_HADROSAUR_DISTAL_FOCUS_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
window.StemLab={registerTool(){}};
const marker="window.StemLab.registerTool('dinoLab'";
new Function(source.replace(marker,'globalThis.__hadrosaurFocus={dinoHadrosaurDistalFocusBounds,dinoHadrosaurDistalIsolation};'+marker))();
const {dinoHadrosaurDistalFocusBounds:focus,dinoHadrosaurDistalIsolation:isolate}=globalThis.__hadrosaurFocus;delete globalThis.__hadrosaurFocus;
function fixture(){
 const parent=new THREE.Group(),model=new THREE.Group();parent.add(model);parent.position.set(4,-2,1);parent.rotation.set(.2,-.4,.1);parent.scale.set(1.2,.9,1.1);model.rotation.y=.24;
 const material=new THREE.MeshBasicMaterial(),meshes=[];
 for(const front of [false,true])for(const side of[-1,1]){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.25,.35,.2),material);mesh.position.set(front?-1:1,.2,side*.4);mesh.rotation.z=.2;mesh.userData.dinoHadrosaurDistalElement={species:'corythosaurus',front,side,layer:'bone',ray:2,element:'metapodial'};model.add(mesh);meshes.push(mesh);}
 return{parent,model,meshes,material,dispose(){model.traverse(m=>m.geometry?.dispose());material.dispose();}};
}

describe('native hadrosaur hand and foot detail framing',()=>{
 it('fits actual local vertices with transformed parents without changing geometry or transforms',()=>{
  const f=fixture(),before=f.meshes.map(m=>[Array.from(m.geometry.attributes.position.array),m.position.toArray(),m.quaternion.toArray(),m.scale.toArray()]),out=focus(THREE,f.model,'corythosaurus');
  expect(out.counts).toEqual({hand:{bone:48,life:0},foot:{bone:48,life:0}});
  const inverse=f.model.matrixWorld.clone().invert();for(const mesh of f.meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)expect(out[mesh.userData.dinoHadrosaurDistalElement.front?'hand':'foot'].containsPoint(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse))).toBe(true);}
  expect(out.hand.max.x).toBeLessThan(out.foot.min.x);expect(out.detailHand.containsPoint(f.meshes[3].position)).toBe(true);expect(out.detailHand.containsPoint(f.meshes[2].position)).toBe(false);expect(out.detailFoot.containsPoint(f.meshes[1].position)).toBe(true);expect(out.detailFoot.containsPoint(f.meshes[0].position)).toBe(false);expect(f.meshes.map(m=>[Array.from(m.geometry.attributes.position.array),m.position.toArray(),m.quaternion.toArray(),m.scale.toArray()])).toEqual(before);f.dispose();
 });
 it('fits a broader living covering and ignores scenery and contours',()=>{
  const f=fixture(),initial=focus(THREE,f.model,'corythosaurus');const shell=f.meshes[0].clone();shell.geometry=new THREE.BoxGeometry(.8,.6,.6);shell.userData={dinoHadrosaurDistalElement:{species:'corythosaurus',front:false,side:1,layer:'life',ray:0,element:'pad'}};f.model.add(shell);
  const scenery=new THREE.Mesh(new THREE.BoxGeometry(100,100,100),f.material);f.model.add(scenery);const contour=shell.clone();contour.scale.setScalar(100);contour.userData={...shell.userData,dinoContour:true};f.model.add(contour);
  const out=focus(THREE,f.model,'corythosaurus');expect(out.foot.getSize(new THREE.Vector3()).x).toBeGreaterThan(initial.foot.getSize(new THREE.Vector3()).x);expect(out.counts.foot).toEqual({bone:48,life:24});expect(out.foot.max.x).toBeLessThan(3);expect(out.hand.equals(initial.hand)).toBe(true);f.dispose();
 });
 it('excludes hidden ancestors and invalid points without inventing missing regions',()=>{
  const f=fixture(),group=new THREE.Group();f.model.add(group);for(const mesh of f.meshes.filter(m=>m.userData.dinoHadrosaurDistalElement.front))group.add(mesh);group.visible=false;
  const p=f.meshes[0].geometry.attributes.position;p.setXYZ(0,NaN,Infinity,0);const out=focus(THREE,f.model,'corythosaurus');expect(out.hand).toBeNull();expect(out.counts.foot.bone).toBe(47);expect(out.foot.min.toArray().every(Number.isFinite)).toBe(true);f.model.visible=false;expect(focus(THREE,f.model,'corythosaurus')).toBeNull();f.dispose();
 });
 it('gates exactly five reviewed animals and rejects unrelated or absent metadata',()=>{
  const f=fixture();for(const id of ['maiasaura','iguanodon','saurolophus','triceratops'])expect(focus(THREE,f.model,id)).toBeNull();for(const id of ['parasaurolophus','lambeosaurus','olorotitan','edmontosaurus']){for(const mesh of f.meshes)mesh.userData.dinoHadrosaurDistalElement.species=id;expect(focus(THREE,f.model,id).hand).toBeInstanceOf(THREE.Box3);}expect(focus(THREE,new THREE.Group(),'corythosaurus')).toBeNull();f.dispose();
 });
 it('shows only the selected near-side foot and restores exact prior visibility',()=>{
  const f=fixture(),torso=new THREE.Mesh(new THREE.BoxGeometry(4,4,4),f.material),hidden=f.meshes[0];hidden.visible=false;f.model.add(torso);
  const context=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),f.material);context.userData.dinoHadrosaurDistalContext={species:'corythosaurus',front:true,side:1,layer:'life',lowerLegOnly:true};f.model.add(context);
  const snapshots=[];f.model.traverse(m=>{if(m.isMesh)snapshots.push([m,m.visible]);});const view=isolate(f.model,'corythosaurus');view.apply('manus');expect(torso.visible).toBe(false);expect(context.visible).toBe(true);expect(f.meshes.filter(m=>m.visible)).toHaveLength(1);expect(f.meshes[3].visible).toBe(true);expect(f.model.userData.dinoHadrosaurDistalIsolation.side).toBe(1);view.apply('pes');expect(context.visible).toBe(false);expect(hidden.visible).toBe(false);expect(f.meshes[1].visible).toBe(true);
  view.apply(null);for(const[m,visible]of snapshots)expect(m.visible).toBe(visible);expect(f.model.userData.dinoHadrosaurDistalIsolation.active).toBe(false);
  torso.visible=false;view.apply('manus');view.apply(null);expect(torso.visible).toBe(false);f.dispose();
 });
 it('preserves ancestor visibility and rejects mismatched pseudo context',()=>{
  const f=fixture(),group=new THREE.Group();f.model.add(group);group.add(f.meshes[2]);group.visible=false;
  const wrong=f.meshes[0].clone();wrong.userData={dinoHadrosaurDistalContext:{species:'corythosaurus',front:true,side:1,lowerLegOnly:false}};f.model.add(wrong);const view=isolate(f.model,'corythosaurus');view.apply('manus');expect(wrong.visible).toBe(false);expect(group.visible).toBe(false);view.apply(null);expect(group.visible).toBe(false);expect(wrong.visible).toBe(true);expect(isolate(f.model,'maiasaura')).toBeNull();f.dispose();
 });
 it('keeps the animal visible when the requested native ray set is absent',()=>{
  const f=fixture();for(const m of f.meshes)m.userData={};const view=isolate(f.model,'corythosaurus');expect(view.apply('manus')).toMatchObject({active:false,kind:null});expect(f.meshes.every(m=>m.visible)).toBe(true);f.dispose();
 });
 it('ignores forged side, layer and non-position attributes in framing',()=>{
  const f=fixture();for(const m of f.meshes)m.userData.dinoHadrosaurDistalElement.side=0;expect(focus(THREE,f.model,'corythosaurus')).toBeNull();
  f.meshes[0].userData.dinoHadrosaurDistalElement.side=1;f.meshes[0].userData.dinoHadrosaurDistalElement.layer='evidence';expect(focus(THREE,f.model,'corythosaurus')).toBeNull();
  f.meshes[0].userData.dinoHadrosaurDistalElement.layer='bone';f.meshes[0].geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array([0,0,1,1]),2));expect(focus(THREE,f.model,'corythosaurus')).toBeNull();f.dispose();
 });
});
