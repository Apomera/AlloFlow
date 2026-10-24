import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeDromaeosaurBodyHarness,THREE,vec} from './helpers/dino_native_dromaeosaur_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_DROMAEOSAUR_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeDromaeosaurBodyHarness(source),ids=['velociraptor','deinonychus'];
const serial=m=>({p:Array.from(m.geometry.attributes.position.array),i:m.geometry.index?Array.from(m.geometry.index.array):null,x:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray(),world:m.matrixWorld.toArray()});

describe('Velociraptor and Deinonychus supported full-body frames',()=>{
  it('uses paired specimens, combined ankle measurements, and bounded pelvic interpretations',()=>{
    const specimens=['IGM 100/986','MCZ 4371'],measurements=[[238,255,99],[336,368,164]];
    for(let i=0;i<ids.length;i++){
      const dn=native.art.DINOS.find(d=>d.id===ids[i]),p=native.art.dinoTheropodBodyProfileFor(dn);
      expect(p.specimen).toBe(specimens[i]);expect(p.measurements).toEqual(measurements[i]);
      expect(p.tibiaAnkleFemur).toBe(measurements[i][1]/measurements[i][0]);expect(p.metatarsalFemur).toBe(measurements[i][2]/measurements[i][0]);
      expect(p.proportionBasis).toContain('combined tibia plus astragalus/calcaneum');
      expect(p.proportionBasis).toContain('not cartilage-inclusive joint-center distances');
      expect(p.limit).toContain('do not establish speed');expect(p.limit).toContain('comparative authored');
      expect(p.sources[0].url).toBe('https://doi.org/10.1038/srep19828');
      expect(native.art.skeletalAnatomyProfileFor(dn).pubisMode).toBe('posterior');
    }
    expect(native.art.dinoTheropodBodyProfileFor(native.art.DINOS.find(d=>d.id==='deinonychus')).pelvicEvidence).toContain('postmortem displacement');
  });

  it('keeps the new body-only helper outside all other taxa',()=>{
    for(const dn of native.art.DINOS.filter(d=>!ids.includes(d.id)))expect(native.art.dinoDromaeosaurBodyTailStation(THREE,dn,{},.5),dn.id).toBeNull();
  });

  for(const id of ids)for(const scale of [.05,1,8])it(id+' retains real joint connections and encloses all reviewed bones at scale '+scale,()=>{
    let fixed=null;
    for(const tissue of [.90,1.13]){
      const b=native.build(id,scale,tissue),c=b.context,h=b.head;
      try{
        const profile=native.art.dinoTheropodBodyProfileFor(c.dn),metadata=c.model.userData.dinoFullBodyAnatomy;
        expect(metadata.family).toBe('theropods');expect(metadata.limbs).toHaveLength(4);
        expect(metadata.proportionBasis).toBe(profile.proportionBasis);expect(metadata.hindlimbSpecimen).toBe(profile.specimen);
        expect(metadata.anchors.head).toEqual(h.context.head.toArray());expect(b.contacts).toHaveLength(2);
        for(const l of metadata.limbs.filter(l=>!l.front)){
          const v=k=>vec(...l[k]),top=v('top'),knee=v('knee'),ankle=v('ankle'),foot=v('foot'),unit=top.distanceTo(knee);
          expect(knee.x<top.x).toBe(true);expect(knee.y>ankle.y&&ankle.y>foot.y).toBe(true);
          expect(Math.abs(knee.distanceTo(ankle)/unit-profile.tibiaAnkleFemur)).toBeLessThan(1e-10);
          expect(Math.abs(ankle.distanceTo(foot)/unit-profile.metatarsalFemur)).toBeLessThan(1e-10);
          expect(foot.y).toBe(Math.max(.008,c.ht*.010));
          expect(Math.abs(foot.x-c.hip.x-c.len*.005*c.skeletalProfile.distalLegScale*c.posture.footReach)).toBeLessThan(c.len*1e-12);
        }
        for(const l of metadata.limbs.filter(l=>l.front)){
          const arm=native.art.dinoTheropodForelimbFrame(THREE,c.dn,{shoulder:c.shoulder,len:c.len,ht:c.ht,bodyDepth:c.bodyDepth,bodyHeight:c.bodyHeight},l.side);
          const girdle=native.art.dinoTheropodBodyShoulderFrame(THREE,c.dn,{shoulder:c.shoulder,len:c.len,ht:c.ht,bodyHeight:c.bodyHeight,bodyDepth:c.bodyDepth},l.side);
          expect(l.top).toEqual(arm.start.toArray());expect(l.knee).toEqual(arm.elbow.toArray());expect(l.ankle).toEqual(arm.wrist.toArray());
          expect(girdle.socket.toArray()).toEqual(l.top);
          expect(l.foot).toEqual(arm.wrist.clone().addScaledVector(arm.handAlong,arm.unit).toArray());
        }
        const metatarsalShafts=[];c.model.traverse(m=>{if(m.isMesh&&m.userData.dinoDromaeosaurMetatarsalContext?.layer==='bone')metatarsalShafts.push(m);});
        expect(metatarsalShafts).toHaveLength(2);
        expect(c.model.userData.dinoDromaeosaurPes.feet).toHaveLength(2);
        expect(b.pedalBones.length).toBeGreaterThan(20);expect(b.pedalSkins.length).toBeGreaterThan(20);
        expect(b.pedalSkins.some(m=>m.userData.dinoDromaeosaurPedalElement.element==='metatarsal-envelope')).toBe(true);
        expect(b.baseCovers).toHaveLength(2);
        for(const cover of b.baseCovers){
          expect(cover.userData.dinoDromaeosaurPedalBase).toMatchObject({species:id,layer:'life',representative:true});
          expect(b.skins).toContain(cover);
        }
        for(const l of b.records.limbs){
          const tag=l.skin.userData.dinoDromaeosaurMetatarsalContext;
          expect(tag).toMatchObject({species:id,side:l.side,layer:'life',minU:5/6,representative:true});
          const uv=l.skin.geometry.attributes.uv;expect(uv).toBeTruthy();
          expect(Array.from({length:uv.count},(_,i)=>uv.getX(i)).some(u=>u>=tag.minU)).toBe(true);
        }
        // The reviewed cranium now joins the body contract: every actual skull
        // and cervical vertex must fit the assembled living surfaces.
        expect(h.context.model.userData.dinoTheropodCranium?.species).toBe(id);
        expect(c.model.userData.dinoTheropodManus.species).toBe(id);
        expect(b.armBones.length).toBeGreaterThan(25);expect(b.armSkins.length).toBeGreaterThan(15);
        const bones=[...b.bones,...b.records.limbs.flatMap(l=>l.bones.flatMap(r=>r.meshes)),...metatarsalShafts,...b.pedalBones,...h.bones,...b.armBones];
        const current=bones.map(serial);if(fixed)expect(current,'actual skeleton is fixed across tissue hypotheses').toEqual(fixed);else fixed=current;
        const inside=b.skins.map(m=>nativeMeshContains(m,c.ht*2e-6)),bad=[];let vertices=0;
        for(const m of bones)for(let i=0;i<m.geometry.attributes.position.count;i++){
          vertices++;const point=vec().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld);
          if(!inside.some(fn=>fn(point)))bad.push({name:m.name,vertex:i,point:point.toArray()});
        }
        expect(vertices).toBeGreaterThan(50000);expect(bad.slice(0,6),'actual reviewed exposed vertices '+bad.length).toEqual([]);

        // Arms now meet the same zero-exposure contract as the rest of the
        // reviewed body. The old generic-arm snapshot exemption is retired.
      }finally{b.dispose();}
    }
  },30000);
});
