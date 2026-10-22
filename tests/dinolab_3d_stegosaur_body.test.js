import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeStegosaurBodyHarness,nativeStegosaurHeadNeckHarness,THREE,vec} from './helpers/dino_native_stegosaur_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_STEGOSAUR_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeStegosaurBodyHarness(source),headNeck=nativeStegosaurHeadNeckHarness(source),ids=['stegosaurus','kentrosaurus','huayangosaurus','tuojiangosaurus'];
const serial=mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),p:Array.from(mesh.geometry.attributes.position.array),ix:mesh.geometry.index?Array.from(mesh.geometry.index.array):null});
describe('four reviewed stegosaur full-body frames',()=>{
  it('limits the profiles to the exact four taxa and separates measured from comparative proportions',()=>{
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id))){
      expect(native.art.dinoStegosaurBodyProfileFor(dn),dn.id).toBeNull();
      expect(native.art.dinoStegosaurBodyCraniumFrame(THREE,dn,vec(),1,1),dn.id).toBeNull();
      expect(native.art.dinoStegosaurBodyAnchors(THREE,dn,{}),dn.id).toBeNull();
      expect(native.art.dinoStegosaurBodyLimb(THREE,dn,{}),dn.id).toBeNull();
      const unchanged=[[.1,.2]];
      expect(native.art.dinoStegosaurBodyTorsoRadii(dn,unchanged)).toBe(unchanged);
      expect(native.art.dinoStegosaurBodyRib(THREE,dn,unchanged,null,0)).toBe(unchanged);
    }
    for(const id of ids)expect(native.art.dinoStegosaurBodyProfileFor({id,group:'other'})).toBeNull();
    const plans=ids.map(id=>native.art.dinoStegosaurBodyProfileFor(native.art.DINOS.find(dn=>dn.id===id)));
    expect(plans.map(plan=>plan.radiusHumerus)).toEqual([.69,.74,.82,.67]);
    expect(plans[0].proportionBasis).toContain('450 mm');
    expect(plans[0].proportionBasis).toContain('312 mm');
    expect(plans[0].proportionBasis).toContain('joint-center distances');
    expect(plans[0].evidence).toContain('not fully skeletally mature');
    expect(plans[1].evidence).toContain('largely erect');
    expect(plans[2].evidence).toContain('primitive postcranial');
    for(const plan of plans.slice(1))expect(plan.proportionBasis).toContain('comparative');
    expect(plans.every(plan=>plan.limit.includes('illustrative reconstructions'))).toBe(true);
    const frames=ids.map(id=>native.art.dinoStegosaurBodyCraniumFrame(THREE,native.art.DINOS.find(dn=>dn.id===id),vec(),1,1));
    expect(frames[2].height/frames[2].profile.span>frames[0].height/frames[0].profile.span).toBe(true);
    expect(frames.every(frame=>frame.metadata.limit.includes('not specimen measurements'))).toBe(true);
  });

  for(const id of ids)for(const scale of [.05,1,8])it(id+' seats actual proximal bones and ribs inside the body at scale '+scale,()=>{
    const built=native.build(id,scale,true,scale===8),original=native.build(id,scale,false,scale===8),c=built.context;
    try{
      const plan=native.art.dinoStegosaurBodyProfileFor(c.dn),metadata=c.model.userData.dinoFullBodyAnatomy;
      expect(metadata.family).toBe('stegosaurs');expect(metadata.limbs).toHaveLength(4);
      expect(metadata.sources).toEqual(plan.sources);expect(metadata.distalEvidence).toBe(plan.distalEvidence);
      expect(c.hip.y>c.shoulder.y).toBe(true);
      expect(c.head.y<c.shoulder.y).toBe(true);
      expect(c.head.y<original.context.head.y).toBe(true);
      // Bring both contacts under their girdles while retaining ground height,
      // lateral placement and the actual native distal shapes around each root.
      for(let index=0;index<built.contacts.length;index++){
        const actual=built.contacts[index],prior=original.contacts[index],hind=actual.part==='foot';
        expect(Math.abs(actual.point.x-prior.point.x-c.len*(hind?.025-.065*c.posture.footReach:-.012+.050*c.posture.footReach))<c.len*1e-12).toBe(true);
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
        {
          const record=metadata.limbs.find(record=>record.front===limb.front&&record.side===limb.side);
          expect(Math.abs(record.foot[0]-(limb.front?c.shoulder.x:c.hip.x)-c.len*(limb.front?-.012:.025))<c.len*1e-12).toBe(true);
          expect(Math.abs(distal.x-(limb.front?c.shoulder.x:c.hip.x)-c.len*(limb.front?-.006:.018))<c.len*1e-12).toBe(true);
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
      // Low reconstructed heads must still enclose actual occipital/atlas/
      // axis details AND every native intervening cervical-chain mesh.
      let fixedCranialBones=null;
      for(const tissue of [.90,1.13]){
        const cranial=headNeck.build(id,scale,tissue,scale===8);
        try{
          expect(cranial.context.model.userData.dinoFullBodyAnatomy.anchors).toEqual(metadata.anchors);
          expect(cranial.context.beakBeforeJaw,'native beak caller runs before lower-jaw landmarks initialize').toBe(true);
          expect(cranial.context.model.userData.dinoStegosaurCranium).toMatchObject({dimensionsAreInterpretive:true,tissueHypothesisIndependentAnchors:true});
          expect(cranial.context.snout.toArray()).toEqual(cranial.context.stegosaurCranium.metadata.snout);
          if(id==='huayangosaurus'){
            expect(cranial.context.skeletalProfile.keratinBeak).toBe(true);
            expect(cranial.beak.userData.dinoHuayangosaurusDentition).toMatchObject({upperToothlessBeak:false,lowerPredentaryCovering:true});
            expect(cranial.context.stegosaurCranium.metadata.evidence).toContain('premaxillary teeth');
            const p=cranial.beak.geometry.attributes.position;
            for(let vertex=0;vertex<p.count;vertex++){
              const point=cranial.context.model.worldToLocal(cranial.beak.localToWorld(vec().fromBufferAttribute(p,vertex)));
              expect(point.y<cranial.context.head.y,'actual lower-only predentary covering').toBe(true);
            }
          }
          const signature=cranial.bones.map(serial);
          if(fixedCranialBones)expect(signature,'fixed actual skull/cervical geometry through tissue hypotheses').toEqual(fixedCranialBones);
          else fixedCranialBones=signature;
          expect(cranial.context.cervicalChains).toHaveLength(1);
          expect(cranial.context.cervicalChains[0].args[6]).toBe('cervical');
          expect(cranial.context.cervicalChains[0].meshes.length).toBeGreaterThan(20);
          const contains=cranial.skins.map(mesh=>nativeMeshContains(mesh,c.ht*2e-6)),failures=[];let vertices=0;
          for(const mesh of cranial.bones)for(let vertex=0;vertex<mesh.geometry.attributes.position.count;vertex++){
            vertices++;const point=vec().fromBufferAttribute(mesh.geometry.attributes.position,vertex).applyMatrix4(mesh.matrixWorld);
            if(!contains.some(inside=>inside(point)))failures.push({name:mesh.name,vertex,point:point.toArray()});
          }
          expect(vertices).toBeGreaterThan(1000);
          expect(failures.slice(0,8),'exposed skull or cervical geometry '+failures.length+' tissue '+tissue).toEqual([]);
        }finally{cranial.dispose();}
      }
    }finally{built.dispose();original.dispose();}
  },30000);

  it('broadens the native mid-trunk without changing closures or girdle stations',()=>{
    for(const id of ids){
      const built=native.build(id),c=built.context;
      try{
        const radii=native.art.dinoTorsoRadii(c.bodyHeight*.91,c.bodyDepth*.89,c.postcranialSurface),before=radii.map(pair=>pair.slice());
        const adjusted=native.art.dinoStegosaurBodyTorsoRadii(c.dn,radii);
        expect(radii).toEqual(before);
        for(const index of[0,1,5,6])expect(adjusted[index]).toEqual(radii[index]);
        expect(adjusted[3][1]>radii[3][1]).toBe(true);expect(adjusted[3][0]>=radii[3][0]).toBe(true);
        expect(new THREE.Box3().setFromObject(c.bodyShell).getSize(vec()).z>c.bodyHeight*2).toBe(true);
      }finally{built.dispose();}
    }
  });

  it('uses sampled pedal formulas and labels missing and comparative foot evidence',()=>{
    for(const id of ids){
      const profile=native.art.skeletalAnatomyProfileFor(native.art.DINOS.find(dn=>dn.id===id));
      expect(profile.manualDigits).toBe(5);expect(profile.pedalDigits).toBe(3);
      expect(profile.pedalPhalanxFormula).toEqual(id==='huayangosaurus'?[2,3,3]:[2,2,2]);
      expect(profile.distalLimbEvidence).toContain('comparative proxies');
      if(id==='huayangosaurus')expect(profile.distalLimbEvidence).toContain('reduced fifth metatarsal');
      if(id==='stegosaurus')expect(profile.distalLimbEvidence).toContain('counts vary');
      if(id==='tuojiangosaurus')expect(profile.distalLimbEvidence).toContain('do not claim a recovered complete');
    }
  });

  it('seats sampled rigid armor on the fixed native frame and keeps the plates finite',()=>{
    for(const id of ids){
      const built=native.build(id),c=built.context;
      try{
        const frame={ht:c.ht,detailScale:c.detailScale,hip:c.hip,shoulder:c.shoulder,tail:c.tail,pelvisCenter:c.pelvisCenter,
          bodyHeight:c.bodyHeight,bodyDepth:c.bodyDepth,torsoPoints:c.torsoPoints,postcranialSurface:c.postcranialSurface,reconstructionProfile:c.reconstructionProfile};
        const entries=native.art.dinoStegosaurArmorLayout(THREE,c.dn,frame);
        expect(entries.length).toBeGreaterThan(0);
        const again=native.art.dinoStegosaurArmorLayout(THREE,c.dn,{...frame,surfaceHypothesis:{bodyHeightScale:1.09,bodyDepthScale:1.10}});
        expect(again.map(entry=>entry.root)).toEqual(entries.map(entry=>entry.root));
        if(id==='stegosaurus'||id==='huayangosaurus'){
          expect(entries.filter(entry=>entry.kind==='plate')).toHaveLength(17);
          expect(entries.filter(entry=>entry.kind==='spike')).toHaveLength(4);
          expect(native.art.dinoStegosaurArmorProfileFor(c.dn).note).toContain('sampled arrangement');
        }
        for(const entry of entries){
          expect(entry.placementIsInterpretive).toBe(true);
          for(const core of[false,true]){
            const geometry=native.art.dinoStegosaurArmorGeometry(THREE,entry,core);
            try{expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);}finally{geometry.dispose();}
          }
        }
      }finally{built.dispose();}
    }
  });

  it('omits unsupported ossified Stegosaurus sternal plates',()=>{
    const skeleton=native.art.skeletalAnatomyProfileFor(native.art.DINOS.find(dn=>dn.id==='stegosaurus'));
    expect(skeleton.sternalPlates).toBe(false);expect(skeleton.sternalRibCount).toBe(0);
    expect(skeleton.axial).toContain('Ossified sternal plates are omitted');expect(skeleton.axial).not.toContain('Paired sternal plates and segmented');
  });

  it('preserves profiles and native buffers for unreviewed species',()=>{
    const control=nativeStegosaurBodyHarness(source.replace('  function dinoStegosaurBodyProfileFor(dn) {','  function dinoStegosaurBodyProfileFor(dn) { return null;'));
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id)))for(const name of['reconstructionProfileFor','postureProfileFor','postcranialSurfaceProfileFor','skeletalAnatomyProfileFor'])
      expect(native.art[name](dn),dn.id+' '+name).toEqual(control.art[name](dn));
    for(const id of['ankylosaurus','triceratops','hesperosaurus']){
      const actual=native.build(id),expected=control.build(id);
      try{
        const signature=model=>{const meshes=[];model.traverse(mesh=>{if(mesh.isMesh)meshes.push(serial(mesh));});return meshes;};
        expect(signature(actual.model)).toEqual(signature(expected.model));
      }finally{actual.dispose();expected.dispose();}
    }
  });
});
