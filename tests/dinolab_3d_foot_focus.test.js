import {it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_FOOT_FOCUS_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const focusedStart="              // Distal foot detail uses the actual geometry on both sides.\n              // Keep regional context when the visible layer supplies no foot meshes.\n              var footDetail = /^(foot|toes)$/.test(part.id) && (anatomyMeshParts[part.id] || []).length > 0;\n              var bounds = footDetail ? new THREE.Box3() : studyBounds[part.region].clone();\n";
const formerStart="              var bounds = studyBounds[part.region].clone();\n";
if(source.split(focusedStart).length!==2)throw Error('Native selected-foot framing seam missing.');
const before=source.replace(focusedStart,formerStart);
function runContracts(THREE,source,before,register) {
 const vec=(x,y,z)=>new THREE.Vector3(x,y,z),box=(a,b)=>new THREE.Box3(vec(...a),vec(...b));
 function execute(text,definitions,anchors,parts,studyBounds,selected='foot') {
  const start=text.indexOf('            var bodyPartStudyBounds = {};'),end=text.indexOf('            model.userData.studyBounds = {};',start);
  assert.ok(start>=0&&end>start,'Native anatomy framing block missing');
  const model=new THREE.Group(),selectedBodyPartRef={current:selected};
  const factory=new Function('THREE','bodyPartDefinitions','bodyPartAnchors','anatomyMeshParts','studyBounds','ht','len','model','selectedBodyPartRef',text.slice(start,end)+'\nreturn {bodyPartStudyBounds,boundsForStudy};');
  const result=factory(THREE,definitions,anchors,parts,studyBounds,3,8,model,selectedBodyPartRef);
  return {...result,model,selectedBodyPartRef};
 }
 function context(transform) {
  const parent=new THREE.Group();if(transform){parent.position.set(7,2,-4);parent.rotation.y=Math.PI/5;parent.scale.setScalar(.75);}
  const meshes=[],anchors=[];
  for(const side of [-1,1]){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(.70,.15,.40),new THREE.MeshBasicMaterial());mesh.position.set(-.25,.075,side);parent.add(mesh);meshes.push(mesh);
   for(const id of ['foot','toes']){const anchor=new THREE.Object3D();anchor.position.set(-.30,.08,side);anchor.userData.dinoBodyPart=id;parent.add(anchor);anchors.push(anchor);}
  }
  parent.updateMatrixWorld(true);
  const definitions=[{id:'foot',region:'body'},{id:'toes',region:'body'},{id:'trunk',region:'body'},{id:'head',region:'head'}];
  const study={body:box([-20,-1,-20],[20,20,20]),head:box([-2,1,-1],[0,4,1]),full:box([-30,-2,-30],[30,30,30]),tail:box([3,1,-1],[12,3,1])};
  return {parent,meshes,anchors,definitions,study,parts:{foot:meshes,toes:meshes},dispose(){for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}}};
 }
 const sameBox=(a,b)=>assert.deepEqual(a.toArray?a.toArray():[a.min.toArray(),a.max.toArray()],[b.min.toArray(),b.max.toArray()]);
 for(const id of ['foot','toes'])register('selected '+id+' bounds frame both actual feet and exclude the broad trunk box',()=>{
  const c=context(),result=execute(source,c.definitions,c.anchors,c.parts,c.study,id),bounds=result.bodyPartStudyBounds[id];
  assert.ok(bounds.getSize(vec(0,0,0)).x<1.10);assert.ok(bounds.getSize(vec(0,0,0)).y<.60);assert.ok(bounds.getSize(vec(0,0,0)).z<2.80);
  for(const mesh of c.meshes){const meshBox=new THREE.Box3().setFromObject(mesh);assert.ok(bounds.containsBox(meshBox));}
  for(const anchor of c.anchors.filter(x=>x.userData.dinoBodyPart===id))assert.ok(bounds.containsPoint(anchor.getWorldPosition(vec(0,0,0))));
  assert.equal(result.boundsForStudy('body'),bounds);assert.equal(result.boundsForStudy('head'),c.study.head);
  const exact=new THREE.Box3();for(const mesh of c.meshes)exact.union(new THREE.Box3().setFromObject(mesh));for(const anchor of c.anchors.filter(x=>x.userData.dinoBodyPart===id))exact.expandByPoint(anchor.getWorldPosition(vec(0,0,0)));exact.expandByScalar(.18);sameBox(bounds,exact);
  c.dispose();
 });
 register('transformed selected foot geometry stays inside native bounds on both sides',()=>{
  const c=context(true),result=execute(source,c.definitions,c.anchors,c.parts,c.study),bounds=result.bodyPartStudyBounds.foot;
  for(const mesh of c.meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(bounds.containsPoint(vec(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(mesh.matrixWorld)));}
  assert.ok(bounds.getSize(vec(0,0,0)).x<3);assert.ok(bounds.getSize(vec(0,0,0)).y<1);assert.ok(bounds.getSize(vec(0,0,0)).z<3);c.dispose();
 });
 register('missing foot geometry keeps the established regional and landmark fallback',()=>{
  const c=context(),next=execute(source,c.definitions,c.anchors,{},c.study),old=execute(before,c.definitions,c.anchors,{},c.study);
  for(const id of ['foot','toes'])sameBox(next.bodyPartStudyBounds[id],old.bodyPartStudyBounds[id]);assert.ok(next.bodyPartStudyBounds.foot.containsBox(c.study.body));c.dispose();
 });
 register('no foot geometry or landmarks preserves nonempty regional bounds',()=>{
  const c=context(),result=execute(source,c.definitions,[],{},c.study);
  for(const id of ['foot','toes']){assert.ok(!result.bodyPartStudyBounds[id].isEmpty());assert.ok(result.bodyPartStudyBounds[id].containsBox(c.study.body));}c.dispose();
 });
 register('foot geometry without landmarks still determines finite bounded focus',()=>{
  const c=context(),result=execute(source,c.definitions,[],c.parts,c.study),bounds=result.bodyPartStudyBounds.foot;
  assert.ok(!bounds.isEmpty());assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));assert.ok(bounds.getSize(vec(0,0,0)).y<.60);
  for(const mesh of c.meshes)assert.ok(bounds.containsBox(new THREE.Box3().setFromObject(mesh)));c.dispose();
 });
 register('other anatomy selections keep their established regional framing',()=>{
  const c=context(),next=execute(source,c.definitions,c.anchors,c.parts,c.study),old=execute(before,c.definitions,c.anchors,c.parts,c.study);
  for(const id of ['trunk','head'])sameBox(next.bodyPartStudyBounds[id],old.bodyPartStudyBounds[id]);c.dispose();
 });
 register('full animal and unselected study bounds remain untouched',()=>{
  const c=context(),snap=Object.fromEntries(Object.entries(c.study).map(([id,b])=>[id,[b.min.toArray(),b.max.toArray()]])),result=execute(source,c.definitions,c.anchors,c.parts,c.study,'');
  for(const [id,b]of Object.entries(c.study)){assert.deepEqual([b.min.toArray(),b.max.toArray()],snap[id]);assert.equal(result.boundsForStudy(id),b);}assert.equal(result.boundsForStudy('full'),c.study.full);c.dispose();
 });
}


runContracts(THREE,source,before,(name,fn)=>it(name,fn));
