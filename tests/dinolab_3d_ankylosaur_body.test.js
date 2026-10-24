import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeAnkylosaurBodyHarness,THREE,vec} from './helpers/dino_native_ankylosaur_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_ANKYLOSAUR_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeAnkylosaurBodyHarness(source),ids=['ankylosaurus','euoplocephalus','sauropelta','borealopelta'];
const serial=mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),p:Array.from(mesh.geometry.attributes.position.array),ix:mesh.geometry.index?Array.from(mesh.geometry.index.array):null});
describe('four reviewed armored full-body frames',()=>{
  it('limits the profiles to the exact four taxa and separates measured from comparative proportions',()=>{
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id))){
      expect(native.art.dinoAnkylosaurBodyProfileFor(dn),dn.id).toBeNull();
      expect(native.art.dinoAnkylosaurBodyAnchors(THREE,dn,{}),dn.id).toBeNull();
      expect(native.art.dinoAnkylosaurBodyLimb(THREE,dn,{}),dn.id).toBeNull();
      const unchanged=[[.1,.2]];
      expect(native.art.dinoAnkylosaurBodyTorsoRadii(dn,unchanged)).toBe(unchanged);
      expect(native.art.dinoAnkylosaurBodyRib(THREE,dn,unchanged,null,0)).toBe(unchanged);
    }
    for(const id of ids)expect(native.art.dinoAnkylosaurBodyProfileFor({id,group:'other'})).toBeNull();
    const plans=ids.map(id=>native.art.dinoAnkylosaurBodyProfileFor(native.art.DINOS.find(dn=>dn.id===id)));
    expect(plans.map(plan=>plan.radiusHumerus)).toEqual([.64,.62,.68,.68]);
    expect(plans[0].evidence).toContain('comparative');
    expect(plans[1].evidence).toContain('AMNH 5403');
    expect(plans[2].evidence).toContain('AMNH 3016');
    expect(plans[3].evidence).toContain('obscured');
    expect(plans.every(plan=>plan.limit.includes('illustrative reconstructions'))).toBe(true);
  });

  for(const id of ids)for(const scale of [.05,1,8])it(id+' seats actual proximal bones and ribs inside the body at scale '+scale,()=>{
    const built=native.build(id,scale,true,scale===8),original=native.build(id,scale,false,scale===8),c=built.context;
    try{
      const plan=native.art.dinoAnkylosaurBodyProfileFor(c.dn),metadata=c.model.userData.dinoFullBodyAnatomy;
      expect(metadata.family).toBe('ankylosaurs');expect(metadata.limbs).toHaveLength(4);
      expect(metadata.sources).toEqual(plan.sources);expect(metadata.distalEvidence).toBe(plan.distalEvidence);
      expect(c.hip.y>c.shoulder.y).toBe(true);
      expect(c.head.y<c.shoulder.y+c.ht*.04).toBe(true);
      expect(c.head.y<original.context.head.y).toBe(true);
      // Move the hind contact under the trunk while retaining ground height,
      // lateral placement and the actual native distal shapes around each root.
      for(let index=0;index<built.contacts.length;index++){
        const actual=built.contacts[index],prior=original.contacts[index],hind=actual.part==='foot';
        expect(Math.abs(actual.point.x-prior.point.x-(hind?c.len*(.025-.065*c.posture.footReach):0))<c.len*1e-12).toBe(true);
        expect(actual.point.y).toBe(prior.point.y);expect(actual.point.z).toBe(prior.point.z);
        expect([actual.radiusX,actual.radiusZ,actual.part,actual.side]).toEqual([prior.radiusX,prior.radiusZ,prior.part,prior.side]);
      }
      expect(built.records.distal).toHaveLength(original.records.distal.length);
      for(let index=0;index<built.records.distal.length;index++){
        const actual=built.records.distal[index],prior=original.records.distal[index];
        expect(actual.kind).toBe(prior.kind);expect(actual.meshes).toHaveLength(prior.meshes.length);
        const actualRoot=actual.args[0].clone().applyMatrix4(c.model.matrixWorld),priorRoot=prior.args[0].clone().applyMatrix4(original.context.model.matrixWorld);
        let maximumError=0;
        for(let meshIndex=0;meshIndex<actual.meshes.length;meshIndex++){
          const mesh=actual.meshes[meshIndex],before=prior.meshes[meshIndex],positions=mesh.geometry.attributes.position,priorPositions=before.geometry.attributes.position;
          expect(positions.count).toBe(priorPositions.count);
          expect(mesh.geometry.index?Array.from(mesh.geometry.index.array):null).toEqual(before.geometry.index?Array.from(before.geometry.index.array):null);
          for(let vertex=0;vertex<positions.count;vertex++){
            const a=mesh.localToWorld(vec().fromBufferAttribute(positions,vertex)).sub(actualRoot);
            const b=before.localToWorld(vec().fromBufferAttribute(priorPositions,vertex)).sub(priorRoot);
            maximumError=Math.max(maximumError,a.distanceTo(b));
          }
        }
        expect(maximumError,'foot-relative native shape').toBeLessThan(c.ht*2e-6);
      }
      const insideTrunk=nativeMeshContains(c.bodyShell,c.ht*2e-6),failures=[];
      for(const limb of built.records.limbs){
        const [upper,lower,companion]=limb.bones.filter(bone=>bone.kind==='addLongBone'),[top,joint]=upper.args,[,distal]=lower.args;
        expect(limb.front?joint.x>top.x:joint.x<top.x,'opposed limb joint').toBe(true);
        expect(joint.y>distal.y,'joint above wrist or ankle').toBe(true);
        expect(distal.y>limb.anchors.find(anchor=>anchor.userData.dinoBodyPart===(limb.front?'hand':'foot')).position.y,'distal joint above planted contact').toBe(true);
        const ratio=joint.distanceTo(distal)/top.distanceTo(joint);
        expect(Math.abs(ratio-(limb.front?plan.radiusHumerus:plan.tibiaFemur))<1e-10).toBe(true);
        if(limb.front){expect(companion.args[0].x>joint.x).toBe(true);expect(companion.args[1].x>distal.x).toBe(true);}
        else {
          const record=metadata.limbs.find(record=>!record.front&&record.side===limb.side);
          expect(Math.abs(record.foot[0]-c.hip.x-c.len*.025)<c.len*1e-12).toBe(true);
          expect(Math.abs(distal.x-c.hip.x-c.len*.018)<c.len*1e-12).toBe(true);
        }
        const insideLimb=nativeMeshContains(limb.skin,c.ht*2e-6);
        for(const bone of limb.bones)for(const mesh of bone.meshes)for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex++){
          const point=vec().fromBufferAttribute(mesh.geometry.attributes.position,vertex).applyMatrix4(mesh.matrixWorld);
          if(!insideLimb(point)&&!insideTrunk(point))failures.push({front:limb.front,kind:bone.kind,vertex,point:point.toArray()});
        }
      }
      expect(failures.slice(0,8),'exposed proximal geometry '+failures.length).toEqual([]);
      for(const mode of [{bodyHeightScale:.91,bodyDepthScale:.89},{bodyHeightScale:1.09,bodyDepthScale:1.10}]){
        const torso=built.torsoForMode(mode),failures=[];
        try{
          const inside=nativeMeshContains(torso.mesh,c.ht*2e-6);
          for(const rib of built.ribs)for(let vertex=0;vertex<rib.geometry.attributes.position.count;vertex++){
            const point=vec().fromBufferAttribute(rib.geometry.attributes.position,vertex).applyMatrix4(rib.matrixWorld);
            if(!inside(point))failures.push({vertex,point:point.toArray()});
          }
          expect(failures.slice(0,8),'exposed rib geometry '+failures.length).toEqual([]);
        }finally{torso.dispose();}
      }
    }finally{built.dispose();original.dispose();}
  },30000);

  it('broadens the native mid-trunk without changing closures or girdle stations',()=>{
    for(const id of ids){
      const built=native.build(id),c=built.context;
      try{
        const radii=native.art.dinoTorsoRadii(c.bodyHeight*.91,c.bodyDepth*.89,c.postcranialSurface),before=radii.map(pair=>pair.slice());
        const adjusted=native.art.dinoAnkylosaurBodyTorsoRadii(c.dn,radii);
        expect(radii).toEqual(before);
        for(const index of[0,1,5,6])expect(adjusted[index]).toEqual(radii[index]);
        expect(adjusted[3][1]>radii[3][1]).toBe(true);expect(adjusted[3][0]<radii[3][0]).toBe(true);
        expect(new THREE.Box3().setFromObject(c.bodyShell).getSize(vec()).z>c.bodyHeight*2).toBe(true);
      }finally{built.dispose();}
    }
  });

  it('uses supported pedal counts and identifies formula uncertainty',()=>{
    const euo=native.art.skeletalAnatomyProfileFor(native.art.DINOS.find(dn=>dn.id==='euoplocephalus'));
    const sauro=native.art.skeletalAnatomyProfileFor(native.art.DINOS.find(dn=>dn.id==='sauropelta'));
    expect(euo.pedalDigits).toBe(3);expect(euo.pedalPhalanxFormula).toEqual([3,4,4]);expect(euo.distalLimbEvidence).toContain('four or five');
    expect(sauro.pedalDigits).toBe(4);expect(sauro.pedalPhalanxFormula).toEqual([2,3,4,4]);expect(sauro.distalLimbEvidence).toContain('reduced fifth metatarsal');
    for(const id of['ankylosaurus','borealopelta'])expect(native.art.skeletalAnatomyProfileFor(native.art.DINOS.find(dn=>dn.id===id)).distalLimbEvidence).toContain('comparative proxies');
  });

  it('preserves profiles and native buffers for unreviewed species',()=>{
    const control=nativeAnkylosaurBodyHarness(source.replace('  function dinoAnkylosaurBodyProfileFor(dn) {','  function dinoAnkylosaurBodyProfileFor(dn) { return null;'));
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id)))for(const name of['reconstructionProfileFor','postureProfileFor','postcranialSurfaceProfileFor','skeletalAnatomyProfileFor'])
      expect(native.art[name](dn),dn.id+' '+name).toEqual(control.art[name](dn));
    for(const id of['edmontonia','triceratops','stegosaurus']){
      const actual=native.build(id),expected=control.build(id);
      try{
        const signature=model=>{const meshes=[];model.traverse(mesh=>{if(mesh.isMesh)meshes.push(serial(mesh));});return meshes;};
        expect(signature(actual.model)).toEqual(signature(expected.model));
      }finally{actual.dispose();expected.dispose();}
    }
  });
});
