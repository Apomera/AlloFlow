import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoStudyBounds}=internals();
function mesh(x,y,z,region,feature){const m=new T.Mesh(new T.BoxGeometry(1,1,1));m.position.set(x,y,z);m.userData={dinoAnatomy:true,dinoRegion:region,dinoFeature:feature};return m;}
const seed=()=>new T.Box3(new T.Vector3(-1,-1,-1),new T.Vector3(1,1,1));
describe('Dino Lab anatomy study bounds',()=>{
 it('includes a selected surface and its distant attached crest',()=>{
  const model=new T.Group(),head=mesh(0,0,0,'head'),crest=mesh(0,3,0,null,'crest-feather');head.add(crest);model.add(head);
  const box=dinoStudyBounds(T,model,'head',seed());expect(box.max.y).toBeCloseTo(3.5);
 });
 it('excludes other anatomical regions even when they overlap the study',()=>{
  const model=new T.Group();model.add(mesh(0,0,0,'neck'));model.children[0].scale.x=100;
  expect(dinoStudyBounds(T,model,'head',seed()).equals(seed())).toBe(true);
 });
 it('excludes unmarked overlays and human reference meshes',()=>{
  const model=new T.Group(),overlay=mesh(0,0,0);overlay.userData={};overlay.scale.y=100;model.add(overlay);
  expect(dinoStudyBounds(T,model,'head',seed()).equals(seed())).toBe(true);
 });
 it('includes untagged bones centered inside the region',()=>{
  const model=new T.Group(),bone=mesh(.8,.8,0);model.add(bone);
  const box=dinoStudyBounds(T,model,'head',seed());expect(box.max.x).toBeCloseTo(1.3);expect(box.max.y).toBeCloseTo(1.3);
 });
 it('includes tail spikes beyond the initial tail box',()=>{
  const model=new T.Group();model.add(mesh(3,0,0,null,'tail-spike'));
  expect(dinoStudyBounds(T,model,'tail',seed()).max.x).toBeCloseTo(3.5);
 });
 it('uses transformed child geometry without modifying the seed',()=>{
  const model=new T.Group(),group=new T.Group();group.position.set(2,0,0);group.userData.dinoRegion='torso';group.add(mesh(0,0,0));model.add(group);
  const original=seed(),box=dinoStudyBounds(T,model,'torso',original);expect(box.max.x).toBeCloseTo(2.5);expect(original.equals(seed())).toBe(true);
 });
});
