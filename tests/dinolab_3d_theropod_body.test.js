import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeTheropodBodyHarness,nativeTheropodHeadNeckHarness,THREE,vec} from './helpers/dino_native_theropod_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const source=readFileSync(process.env.DINO_THEROPOD_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeTheropodBodyHarness(source),heads=nativeTheropodHeadNeckHarness(source),ids=['tyrannosaurus','allosaurus','coelophysis','dilophosaurus'];
const serial=mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),positions:Array.from(mesh.geometry.attributes.position.array),index:mesh.geometry.index?Array.from(mesh.geometry.index.array):null});
describe('four reviewed theropod whole-body frames',()=>{
  it('uses one paired hindlimb dataset and labels the combined ankle segment and reconstruction limits',()=>{
    const values=[[1269,1166,680],[985,810,423],[229,227,138],[600,560,298]];
    for(let i=0;i<ids.length;i++){
      const p=native.art.dinoTheropodBodyProfileFor(native.art.DINOS.find(d=>d.id===ids[i]));
      expect(p.measurements).toEqual(values[i]);expect(p.tibiaAnkleFemur).toBe(values[i][1]/values[i][0]);expect(p.metatarsalFemur).toBe(values[i][2]/values[i][0]);
      expect(p.proportionBasis).toContain('astragalus/calcaneum');expect(p.proportionBasis).toContain('not cartilage-inclusive joint-center distances');
      expect(p.limit).toContain('do not establish speed');expect(p.limit).toContain('comparative authored');
      expect(p.sources[0].url).toBe('https://doi.org/10.1038/srep19828');
    }
    const rex=native.art.DINOS.find(d=>d.id==='tyrannosaurus');expect(native.art.postcranialSurfaceProfileFor(rex).id).toBe('powerful-theropod');
  });
  it('scopes the shared frame to the exact six reviewed species',()=>{
    for(const d of native.art.DINOS.filter(d=>![...ids,'velociraptor','deinonychus'].includes(d.id))){
      expect(native.art.dinoTheropodBodyProfileFor(d),d.id).toBeNull();
      expect(native.art.dinoTheropodBodyAnchors(THREE,d,{}),d.id).toBeNull();
      expect(native.art.dinoTheropodBodyHindlimb(THREE,d,{}),d.id).toBeNull();
      expect(native.art.dinoTheropodBodyPelvisFrame(THREE,d,{},1),d.id).toBeNull();
      expect(native.art.dinoTheropodBodyShoulderFrame(THREE,d,{},1),d.id).toBeNull();
    }
  });
  for(const id of ids)for(const scale of [.05,1,8])it(id+' encloses native ribs, pelvis, girdles, hindlimbs and curved neck at scale '+scale,()=>{
    let fixed=null;
    for(const tissue of [.90,1.13]){
      const b=native.build(id,scale,tissue,scale===8),h=heads.build(id,scale,tissue,scale===8),c=b.context;
      try{
        const p=native.art.dinoTheropodBodyProfileFor(c.dn),metadata=c.model.userData.dinoFullBodyAnatomy;
        expect(metadata.family).toBe('theropods');expect(metadata.limbs).toHaveLength(4);expect(metadata.anchors.head).toEqual(h.context.head.toArray());
        expect(metadata.proportionBasis).toBe(p.proportionBasis);expect(metadata.hindlimbSpecimen).toBe(p.specimen);
        expect(b.records.limbs).toHaveLength(2);expect(b.contacts).toHaveLength(2);
        for(const l of metadata.limbs.filter(l=>!l.front)){
          expect(l.front).toBe(false);const v=k=>vec(...l[k]),top=v('top'),knee=v('knee'),ankle=v('ankle'),foot=v('foot'),unit=top.distanceTo(knee);
          expect(knee.x<top.x,'forward knee flexion').toBe(true);expect(knee.y>ankle.y&&ankle.y>foot.y,'raised digitigrade ankle').toBe(true);
          expect(Math.abs(knee.distanceTo(ankle)/unit-p.tibiaAnkleFemur)).toBeLessThan(1e-10);
          expect(Math.abs(ankle.distanceTo(foot)/unit-p.metatarsalFemur)).toBeLessThan(1e-10);
          expect(foot.y).toBe(Math.max(.008,c.ht*.010));
          expect(Math.abs(foot.x-c.hip.x-c.len*.005*c.skeletalProfile.distalLegScale*c.posture.footReach)).toBeLessThan(c.len*1e-12);
          const socket=native.art.dinoTheropodBodyPelvisFrame(THREE,c.dn,{hip:c.hip,len:c.len,ht:c.ht,bodyHeight:c.bodyHeight,bodyDepth:c.bodyDepth,detailScale:c.detailScale,stanceWidth:c.skeletalProfile.stanceWidth,footReach:c.posture.footReach},l.side);
          expect(socket.socket.toArray()).toEqual(l.top);
        }
        const current=[...b.bones,...b.records.limbs.flatMap(l=>l.bones.flatMap(r=>r.meshes)),...h.context.cervicalChains.flatMap(l=>l.meshes)].map(serial);
        if(fixed)expect(current,'tissue-independent actual skeleton buffers').toEqual(fixed);else fixed=current;
        const contains=[...b.skins,h.neck,h.upper,h.lower].map(mesh=>nativeMeshContains(mesh,c.ht*2e-6)),bad=[];
        let vertices=0;
        for(const mesh of [...b.bones,...b.records.limbs.flatMap(l=>l.bones.flatMap(r=>r.meshes)),...h.context.cervicalChains.flatMap(l=>l.meshes)])for(let i=0;i<mesh.geometry.attributes.position.count;i++){
          vertices++;const point=vec().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
          if(!contains.some(inside=>inside(point)))bad.push({name:mesh.name,vertex:i,point:point.toArray()});
        }
        expect(vertices).toBeGreaterThan(50000);expect(bad.slice(0,6),'actual exposed vertices '+bad.length+' tissue '+tissue).toEqual([]);
        const neck=h.context.cervicalEnvelope;expect(neck.points).toHaveLength(6);
        const axis=h.context.head.clone().sub(h.context.shoulder);
        const offsets=neck.points.map((point,i)=>point.y-h.context.shoulder.clone().lerp(h.context.head,[0,.12,.30,.56,.80,1][i]).y);
        expect(offsets[2]<0&&offsets[4]>0,'authored S-shaped cervical centerline').toBe(true);
        const pelvisWidth=new THREE.Box3().setFromObject(b.torso).getSize(vec()).z;expect(pelvisWidth>0&&Number.isFinite(pelvisWidth)).toBe(true);
      }finally{b.dispose();h.dispose();}
    }
  },30000);
  it('preserves existing head and snout frames while supporting a curved neck',()=>{
    const f={hip:vec(1,2,0),shoulder:vec(-1,1.8,0),head:vec(-3,3,0),tail:vec(5,1.7,0)};
    for(const id of ids){const d=native.art.DINOS.find(d=>d.id===id),posed=native.art.dinoTheropodBodyAnchors(THREE,d,f);expect(posed.head.toArray()).toEqual(f.head.toArray());expect(posed.tail.toArray()).toEqual(f.tail.toArray());expect(posed.head).not.toBe(f.head);}
  });
  it('preserves all unreviewed numerical profiles',()=>{
    const control=nativeTheropodBodyHarness(source.replace('  function dinoTheropodBodyProfileFor(dn) {','  function dinoTheropodBodyProfileFor(dn) { return null;'));
    for(const dn of native.art.DINOS.filter(d=>![...ids,'velociraptor','deinonychus'].includes(d.id)))for(const name of ['reconstructionProfileFor','postureProfileFor','postcranialSurfaceProfileFor','skeletalAnatomyProfileFor'])expect(native.art[name](dn),dn.id+' '+name).toEqual(control.art[name](dn));
  });
});
