import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {nativeCeratopsidBodyHarness,THREE,vec} from './helpers/dino_native_ceratopsid_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const source=readFileSync(process.env.DINO_CERATOPSID_BODY_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeCeratopsidBodyHarness(source),ids=['triceratops','styracosaurus','centrosaurus','chasmosaurus'];
const serial=mesh=>({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),p:Array.from(mesh.geometry.attributes.position.array),ix:mesh.geometry.index?Array.from(mesh.geometry.index.array):null});
describe('Four fixed ceratopsid body frames',()=>{
  it('confines the profiles to the reviewed ceratopsids and identifies specimen limits',()=>{
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id))){
      expect(native.art.dinoCeratopsidBodyProfileFor(dn),dn.id).toBeNull();
      expect(native.art.dinoCeratopsidBodyAnchors(THREE,dn,{}),dn.id).toBeNull();
      expect(native.art.dinoCeratopsidBodyLimb(THREE,dn,{}),dn.id).toBeNull();
      const radii=[[.1,.2]];
      expect(native.art.dinoCeratopsidBodyTorsoRadii(dn,radii)===radii).toBe(true);
      expect(native.art.dinoCeratopsidBodyRib(THREE,dn,radii,null,0)===radii).toBe(true);
    }
    for(const id of ids)expect(native.art.dinoCeratopsidBodyProfileFor({id,group:'other'})).toBeNull();
    const plans=ids.map(id=>native.art.dinoCeratopsidBodyProfileFor(native.art.DINOS.find(dn=>dn.id===id)));
    expect(plans.map(plan=>plan.radiusHumerus)).toEqual([.60,.63,.62,.72]);
    expect(plans.every(plan=>plan.evidence.includes('individual'))).toBe(true);
    expect(plans[3].evidence.includes('Vagaceratops')).toBe(true);
    expect(plans.every(plan=>plan.limit.includes('not fossil measurements'))).toBe(true);
  });
  for(const id of ids)for(const scale of [.05,1,8])it(id+' connects native bones, skin and planted feet at scale '+scale,()=>{
    const built=native.build(id,scale,true,scale===8),baseline=native.build(id,scale,false,scale===8),c=built.context;
    try{
      const profile=native.art.dinoCeratopsidBodyProfileFor(c.dn),metadata=built.model.userData.dinoFullBodyAnatomy;
      expect(metadata.family).toBe('ceratopsids');expect(metadata.limbs).toHaveLength(4);
      expect(metadata.sources).toEqual(profile.sources);expect(c.hip.y>c.shoulder.y).toBe(true);
      expect(c.head.y<baseline.context.head.y).toBe(true);
      expect(built.contacts.map(item=>({p:item.point.toArray(),x:item.radiusX,z:item.radiusZ,part:item.part,side:item.side})))
        .toEqual(baseline.contacts.map(item=>({p:item.point.toArray(),x:item.radiusX,z:item.radiusZ,part:item.part,side:item.side})));
      expect(built.records.distal.map(item=>({kind:item.kind,meshes:item.meshes.map(serial)})))
        .toEqual(baseline.records.distal.map(item=>({kind:item.kind,meshes:item.meshes.map(serial)})));
      const insideTrunk=nativeMeshContains(c.bodyShell,c.ht*2e-6),failures=[],lengths=[];
      for(const limb of built.records.limbs){
        const [upper,lower,companion]=limb.bones.filter(bone=>bone.kind==='addLongBone');
        const [top,joint]=upper.args,[,distal]=lower.args;
        expect(limb.front?joint.x>top.x:joint.x<top.x,'opposed joint '+id).toBe(true);
        const ratio=joint.distanceTo(distal)/top.distanceTo(joint);
        expect(Math.abs(ratio-(limb.front?profile.radiusHumerus:profile.tibiaFemur))<1e-10).toBe(true);
        if(limb.front){
          expect(companion.args[0].x>joint.x).toBe(true);expect(companion.args[1].x>distal.x).toBe(true);
          expect(Math.abs(joint.z)>Math.abs(top.z)).toBe(true);
        }
        lengths.push({front:limb.front,length:top.distanceTo(joint)+joint.distanceTo(distal)});
        const insideLimb=nativeMeshContains(limb.skin,c.ht*2e-6);
        for(const bone of limb.bones)for(const mesh of bone.meshes)for(let v=0;v<mesh.geometry.attributes.position.count;v++){
          const point=vec().fromBufferAttribute(mesh.geometry.attributes.position,v).applyMatrix4(mesh.matrixWorld);
          if(!insideLimb(point)&&!insideTrunk(point))failures.push({front:limb.front,side:limb.side,kind:bone.kind,v,point:point.toArray()});
        }
      }
      const ratio=lengths.find(item=>item.front).length/lengths.find(item=>!item.front).length;
      expect(ratio<.95&&ratio>.60,'fore/hind ratio '+ratio).toBe(true);
      expect(failures.slice(0,8),'exposed represented proximal bones '+failures.length).toEqual([]);
      const ribFailures=[];
      for(const mode of [{bodyHeightScale:.91,bodyDepthScale:.89},{bodyHeightScale:1,bodyDepthScale:1}]){
        const torso=built.torsoForMode(mode);
        try{
          const inside=nativeMeshContains(torso.mesh,c.ht*2e-6);
          for(const rib of built.ribs)for(let v=0;v<rib.geometry.attributes.position.count;v++){
            const point=vec().fromBufferAttribute(rib.geometry.attributes.position,v).applyMatrix4(rib.matrixWorld);
            if(!inside(point))ribFailures.push({v,point:point.toArray(),mode});
          }
        }finally{torso.dispose();}
      }
      expect(ribFailures.slice(0,8),'native rib cage exposure '+ribFailures.length).toEqual([]);
      expect(c.neckPoints[0].toArray()).toEqual(c.shoulder.toArray());expect(c.neckPoints.at(-1).toArray()).toEqual(c.head.toArray());
      expect(c.neckJunction.radius>0&&c.neckJunction.t>=0&&c.neckJunction.t<=1).toBe(true);
      expect(Array.from(built.neck.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      expect(c.surfaceSnout.clone().sub(c.head).distanceTo(baseline.context.surfaceSnout.clone().sub(baseline.context.head))<c.ht*1e-12).toBe(true);
    }finally{built.dispose();baseline.dispose();}
  },30000);
  it('keeps regional thorax closures and limb contacts while broadening the posterior chest',()=>{
    for(const id of ids){
      const built=native.build(id,1),c=built.context;
      try{
        const profile=native.art.dinoCeratopsidBodyProfileFor(c.dn);
        const radii=native.art.dinoTorsoRadii(c.surfaceBodyHeight,c.surfaceBodyDepth,c.postcranialSurface);
        const before=radii.map(pair=>pair.slice()),adjusted=native.art.dinoCeratopsidBodyTorsoRadii(c.dn,radii);
        expect(radii).toEqual(before);
        for(const index of[0,1,5,6])expect(adjusted[index]).toEqual(radii[index]);
        expect(adjusted[2][0]/adjusted[2][1]>adjusted[3][0]/adjusted[3][1]).toBe(true);
        const p=c.bodyShell.geometry.attributes.position;
        function section(ring){let ymin=Infinity,ymax=-Infinity,zmin=Infinity,zmax=-Infinity;for(let side=0;side<=24;side++){const i=ring*25+side;ymin=Math.min(ymin,p.getY(i));ymax=Math.max(ymax,p.getY(i));zmin=Math.min(zmin,p.getZ(i));zmax=Math.max(zmax,p.getZ(i));}return{height:ymax-ymin,width:zmax-zmin};}
        const anterior=section(16),posterior=section(24);
        expect(posterior.width>anterior.width,'native regional width '+id).toBe(true);
        expect(anterior.height/anterior.width>posterior.height/posterior.width,'native regional aspect '+id).toBe(true);
        expect(profile.limit.includes('representative reconstructions')).toBe(true);
      }finally{built.dispose();}
    }
  });
  it('preserves offscope profiles and actual native body, limb, neck, rib and digit buffers exactly',()=>{
    const control=nativeCeratopsidBodyHarness(source.replace('  function dinoCeratopsidBodyProfileFor(dn) {','  function dinoCeratopsidBodyProfileFor(dn) { return null;'));
    for(const dn of native.art.DINOS.filter(dn=>!ids.includes(dn.id)))for(const name of['reconstructionProfileFor','postureProfileFor','postcranialSurfaceProfileFor','skeletalAnatomyProfileFor'])
      expect(native.art[name](dn),dn.id+' '+name).toEqual(control.art[name](dn));
    for(const id of['protoceratops','ankylosaurus','edmontosaurus']){
      const actual=native.build(id,1),expected=control.build(id,1);
      try{
        const signature=model=>{const meshes=[];model.traverse(mesh=>{if(mesh.isMesh)meshes.push(serial(mesh));});return meshes;};
        expect(signature(actual.model)).toEqual(signature(expected.model));
      }finally{actual.dispose();expected.dispose();}
    }
  });
});
