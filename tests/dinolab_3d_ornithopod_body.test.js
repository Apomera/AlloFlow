import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nativeOrnithopodBodyHarness, THREE, vec } from './helpers/dino_native_ornithopod_body_harness.js';
import { nativeMeshContains } from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_ORNITHOPOD_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeOrnithopodBodyHarness(source),ids=['iguanodon','edmontosaurus','maiasaura'];
const serial=mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),
  positions:Array.from(mesh.geometry.attributes.position.array),index:mesh.geometry.index?Array.from(mesh.geometry.index.array):null});
describe('Reviewed ornithopod full-body frame',()=>{
  it('gates the new frame and limb solver to exactly three represented taxa',()=>{
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id))){
      expect(native.art.dinoOrnithopodBodyProfileFor(dn),dn.id).toBeNull();
      expect(native.art.dinoOrnithopodBodyAnchors(THREE,dn,{}),dn.id).toBeNull();
      expect(native.art.dinoOrnithopodBodyLimb(THREE,dn,{}),dn.id).toBeNull();
    }
    for(const id of ids)expect(native.art.dinoOrnithopodBodyProfileFor({id,group:'other'})).toBeNull();
    const edm=native.art.DINOS.find(dn=>dn.id==='edmontosaurus');
    expect(edm.name).toBe('Edmontosaurus annectens');
    expect(native.art.dinoOrnithopodBodyProfileFor(edm).proportionBasis.includes('ROM 801')).toBe(true);
    const maia=native.art.dinoOrnithopodBodyProfileFor(native.art.DINOS.find(dn=>dn.id==='maiasaura'));
    expect(maia.proportionBasis.includes('not an adult Maiasaura mean')).toBe(true);
    expect(maia.locomotorLimit.includes('challenged')).toBe(true);
  });
  for(const id of ids)for(const scale of [.05,1,8]){
    it(id+' uses opposed native joints, shorter forelimbs and nested skeleton at scale '+scale,()=>{
      const built=native.build(id,scale,true,scale===8),baseline=native.build(id,scale,false,scale===8),c=built.context,profile=native.art.dinoOrnithopodBodyProfileFor(c.dn);
      try{
        expect(c.hip.y>c.shoulder.y).toBe(true);
        expect(built.model.userData.dinoFullBodyAnatomy.family).toBe('ornithopods');
        expect(built.model.userData.dinoFullBodyAnatomy.limbs).toHaveLength(4);
        expect(built.contacts.map(item=>({point:item.point.toArray(),radiusX:item.radiusX,radiusZ:item.radiusZ,part:item.part,side:item.side})))
          .toEqual(baseline.contacts.map(item=>({point:item.point.toArray(),radiusX:item.radiusX,radiusZ:item.radiusZ,part:item.part,side:item.side})));
        expect(built.records.distal.map(item=>({kind:item.kind,meshes:item.meshes.map(serial)})))
          .toEqual(baseline.records.distal.map(item=>({kind:item.kind,meshes:item.meshes.map(serial)})));
        const limbLengths=[];
        const insideBody=nativeMeshContains(c.bodyShell,c.ht*2e-6),failures=[];
        for(const limb of built.records.limbs){
          const [upper,lower,companion]=limb.bones.filter(bone=>bone.kind==='addLongBone');
          expect(!!upper&&!!lower&&!!companion).toBe(true);
          const [top,joint]=upper.args,[,distal]=lower.args;
          expect(limb.front?joint.x>top.x:joint.x<top.x,'opposed joint '+JSON.stringify({id,scale,front:limb.front,side:limb.side,top:top.toArray(),joint:joint.toArray()})).toBe(true);
          const ratio=joint.distanceTo(distal)/top.distanceTo(joint);
          expect(Math.abs(ratio-(limb.front?profile.radiusHumerus:profile.tibiaFemur))<1e-10).toBe(true);
          limbLengths.push({front:limb.front,side:limb.side,length:top.distanceTo(joint)+joint.distanceTo(distal)});
          const insideLimb=nativeMeshContains(limb.skin,c.ht*2e-6);
          for(const bone of limb.bones)for(const mesh of bone.meshes){
            const positions=mesh.geometry.attributes.position;
            for(let vertex=0;vertex<positions.count;vertex++){
              const point=vec().fromBufferAttribute(positions,vertex).applyMatrix4(mesh.matrixWorld);
              if(!insideLimb(point)&&!insideBody(point))failures.push({front:limb.front,side:limb.side,kind:bone.kind,vertex,point:point.toArray()});
            }
          }
          expect(Array.from(limb.skin.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
        }
        const fore=limbLengths.find(limb=>limb.front).length,hind=limbLengths.find(limb=>!limb.front).length;
        expect(fore/hind<.80&&fore/hind>.45,'fore/hind ratio '+fore/hind).toBe(true);
        expect(failures.slice(0,10),'exposed represented bone vertices '+failures.length).toEqual([]);
        expect(Math.abs((c.head.y-baseline.context.head.y)-.60*(c.shoulder.y-baseline.context.shoulder.y))<c.ht*1e-12).toBe(true);
        expect(Math.abs((c.tail.y-baseline.context.tail.y)-(c.hip.y-baseline.context.hip.y))<c.ht*1e-12).toBe(true);
      }finally{built.dispose();baseline.dispose();}
    },30000);
  }
  it('does not mutate input landmarks or impose an adult Maiasaura specimen ratio',()=>{
    const dn=native.art.DINOS.find(dn=>dn.id==='maiasaura');
    const frame={hip:vec(1,2,0),shoulder:vec(-1,1.8,0),head:vec(-2,3,0),tail:vec(4,1.6,0)};
    const original=Object.fromEntries(Object.entries(frame).map(([key,value])=>[key,value.toArray()]));
    const anchored=native.art.dinoOrnithopodBodyAnchors(THREE,dn,frame);
    expect(Object.fromEntries(Object.entries(frame).map(([key,value])=>[key,value.toArray()]))).toEqual(original);
    expect(anchored.hip===frame.hip).toBe(false);
    const limbFrame={front:true,topPoint:vec(-1,1,0),knee:vec(-.9,.5,0),ankle:vec(-1.2,.2,0),foot:vec(-1.4,.02,0)};
    const limbOriginal=Object.fromEntries(['topPoint','knee','ankle','foot'].map(key=>[key,limbFrame[key].toArray()]));
    const solved=native.art.dinoOrnithopodBodyLimb(THREE,dn,limbFrame);
    expect(Object.fromEntries(['topPoint','knee','ankle','foot'].map(key=>[key,limbFrame[key].toArray()]))).toEqual(limbOriginal);
    expect(solved.foot.toArray()).toEqual(limbFrame.foot.toArray());
    expect(native.art.dinoOrnithopodBodyProfileFor(dn).radiusHumerus).toBe(.90);
    expect(native.art.dinoOrnithopodBodyLimb(THREE,dn,{...limbFrame,ankle:limbFrame.topPoint})).toBeNull();
  });
  it('retains exact offscope anchors, postcranial profiles and actual native body/limb/digit buffers',()=>{
    const control=nativeOrnithopodBodyHarness(source.replace('  function dinoOrnithopodBodyProfileFor(dn) {','  function dinoOrnithopodBodyProfileFor(dn) { return null;'));
    for(const id of ['parasaurolophus','styracosaurus','tyrannosaurus']){
      const actual=native.build(id,1),expected=control.build(id,1);
      try{
        expect(actual.context.postcranialSurface).toEqual(expected.context.postcranialSurface);
        for(const key of ['hip','shoulder','head','tail'])expect(actual.context[key].toArray()).toEqual(expected.context[key].toArray());
        const signature=model=>{const meshes=[];model.traverse(mesh=>{if(mesh.isMesh)meshes.push(serial(mesh));});return meshes;};
        expect(signature(actual.model)).toEqual(signature(expected.model));
      }finally{actual.dispose();expected.dispose();}
    }
  });
});
