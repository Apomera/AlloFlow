import {describe,it,expect} from 'vitest';
import {nativeTheropodManus,api,THREE,vec,geometryHash} from './helpers/dino_native_theropod_manus_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const ids=['velociraptor','deinonychus'];
const tag=mesh=>mesh.userData.dinoTheropodManualElement;
const world=(mesh,i)=>mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,i));
function axialLength(mesh){
  const a=mesh.geometry.userData.dinoTheropodBoneAxis,axis=vec(...a.end).sub(vec(...a.start)).normalize();
  let lo=Infinity,hi=-Infinity;
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){const at=world(mesh,i).dot(axis);lo=Math.min(lo,at);hi=Math.max(hi,at);}
  return hi-lo;
}
function capCenterLength(mesh){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.userData.dinoLongBone.radialSegments;
  return world(mesh,p.count-2*(n+1)).distanceTo(world(mesh,p.count-(n+1)));
}
function closedOutward(mesh,scale){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map(),tol=scale*1e-8;
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tol)).join(',');
  let volume=0;
  for(let i=0;i<ix.count;i+=3){
    const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));
    volume+=a.dot(b.cross(c))/6;
    for(const [a,b]of[[0,1],[1,2],[2,0]]){const ka=key(ix.getX(i+a)),kb=key(ix.getX(i+b));if(ka===kb)continue;const edge=[ka,kb].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  expect([...edges.values()].filter(n=>n!==2),mesh.name+' closed native solid').toEqual([]);
  expect(volume,mesh.name+' outward winding').toBeGreaterThan(tol**3);
}

describe('reviewed dromaeosaur full forelimbs and inward-facing hands',()=>{
  it('uses exact species and explicit evidence limits instead of an invented generic dromaeosaur hand',()=>{
    for(const d of api.DINOS)expect(Boolean(api.dinoDromaeosaurForelimbProfileFor(d)),d.id).toBe(ids.includes(d.id));
    const dn=api.DINOS.find(d=>d.id==='velociraptor');
    for(const d of [null,{...dn,group:'bird'},{...dn,clade:'Troodontidae'}])expect(api.dinoDromaeosaurForelimbProfileFor(d)).toBeNull();
    for(const id of ids){
      const d=api.DINOS.find(d=>d.id===id),p=api.dinoTheropodForelimbProfileFor(d),s=api.skeletalAnatomyProfileFor(d);
      expect(p.manualRays.map(r=>r.phalanges)).toEqual([2,3,4]);
      expect([s.manualMetacarpals,s.manualDigits,s.manualUnguals]).toEqual([3,3,3]);
      expect(p.manualRays.every(r=>r.clawBearing&&!r.vestigial&&!r.reduced)).toBe(true);
      expect(p.carpalSeriesComplete).toBe(false);expect(p.limit).toMatch(/not specimen scans/);
      expect(p.limit).toMatch(/resting flexion.*interpretive/);expect(p.limit).toMatch(/not a complete carpal series/);
      expect(p.sources.length).toBeGreaterThan(0);for(const ref of p.sources){expect(ref.url).toMatch(/^https:\/\//);expect(ref.title.length).toBeGreaterThan(10);}
    }
    expect(api.dinoDromaeosaurForelimbProfileFor({...dn,id:'utahraptor'})).toBeNull();
  });

  it.each(ids.flatMap(id=>[.04,1,6].map(scale=>[id,scale])))('%s has seated, closed and nested actual arm elements at scale %s',(id,scale)=>{
    const b=nativeTheropodManus(id,scale,.90),full=nativeTheropodManus(id,scale,1.13);
    try{
      const dn=api.DINOS.find(d=>d.id===id),p=api.dinoTheropodForelimbProfileFor(dn),meta=b.context.model.userData.dinoTheropodManus;
      expect(meta.arms).toHaveLength(2);expect(meta.carpalSeriesComplete).toBe(false);
      expect(meta.dimensionsAreInterpretive).toBe(true);expect(meta.tissueHypothesisIndependentAnchors).toBe(true);
      expect(geometryHash(full.bones)).toBe(geometryHash(b.bones));expect(full.anchors).toEqual(b.anchors);
      expect(full.context.model.userData.dinoTheropodManus).toEqual(meta);
      const contains=b.life.map(m=>nativeMeshContains(m,scale*2e-7));let checked=0;
      for(const m of b.bones)for(let i=0;i<m.geometry.attributes.position.count;i++){
        checked++;expect(contains.some(fn=>fn(world(m,i))),m.name+' uncovered actual bone vertex '+i).toBe(true);
      }
      expect(checked).toBeGreaterThan(6000);
      for(const m of b.meshes){
        for(const name of ['position','normal'])expect([...m.geometry.attributes[name].array].every(Number.isFinite)).toBe(true);
        const n=m.geometry.attributes.normal;for(let i=0;i<n.count;i++)expect(vec().fromBufferAttribute(n,i).length(),m.name).toBeCloseTo(1,4);
        closedOutward(m,scale);
      }
      for(const side of[-1,1]){
        const bones=b.bones.filter(m=>tag(m).side===side),life=b.life.filter(m=>tag(m).side===side);
        const find=(element,ray,index)=>bones.find(m=>tag(m).element===element&&(!ray||tag(m).ray===ray)&&(!index||tag(m).phalange===index));
        const a=meta.arms.find(a=>a.side===side),socket=api.dinoTheropodBodyShoulderFrame(THREE,dn,{shoulder:b.context.shoulder,len:b.context.len,ht:b.context.ht,bodyHeight:b.context.bodyHeight,bodyDepth:b.context.bodyDepth},side).socket;
        expect(a.start).toEqual(socket.toArray());expect(a.palmNormal).toEqual([0,0,-side]);
        expect(axialLength(find('radius'))/axialLength(find('humerus'))).toBeCloseTo(p.radiusRatio,5);
        // Bowing tilts the end sections: their outer rims can project a little
        // beyond the actual cap centers, whose separation retains the ratio.
        expect(capCenterLength(find('ulna'))/capCenterLength(find('humerus'))).toBeCloseTo(p.ulnaRatio,5);
        expect(axialLength(find('ulna'))/axialLength(find('humerus'))).toBeGreaterThan(p.ulnaRatio);
        expect(axialLength(find('ulna'))/axialLength(find('humerus'))).toBeLessThan(p.ulnaRatio+.015);
        expect(axialLength(find('metacarpal',1))).toBeLessThan(axialLength(find('metacarpal',2))*.56);
        expect(axialLength(find('metacarpal',3))).toBeLessThan(axialLength(find('metacarpal',2)));
        const r=find('radius').geometry.userData.dinoTheropodBoneAxis,u=find('ulna').geometry.userData.dinoTheropodBoneAxis;
        const axis=vec(...r.end).sub(vec(...r.start)).normalize(),delta=vec(...u.end).sub(vec(...r.end));
        const normal=delta.clone().addScaledVector(axis,-delta.dot(axis)).normalize(),middle=vec(...r.end).add(vec(...u.end)).multiplyScalar(.5);
        const mean=vec(),ulna=find('ulna');for(let i=0;i<ulna.geometry.attributes.position.count;i++)mean.add(world(ulna,i));mean.multiplyScalar(1/ulna.geometry.attributes.position.count);
        expect(mean.sub(vec(...u.start)).dot(normal),'actual ulna bows away from the radius').toBeGreaterThan(capCenterLength(ulna)*.004);
        for(let i=0;i<find('radius').geometry.attributes.position.count;i++)expect(world(find('radius'),i).sub(middle).dot(normal)).toBeLessThan(0);
        for(let i=0;i<find('ulna').geometry.attributes.position.count;i++)expect(world(find('ulna'),i).sub(middle).dot(normal)).toBeGreaterThan(0);
        expect(find('carpal-support').userData.dinoCarpalSupport).toEqual({proxy:true,completeSeries:false});
        for(const ray of p.manualRays){
          const rayBones=bones.filter(m=>tag(m).ray===ray.ray);
          expect(rayBones.filter(m=>tag(m).element==='metacarpal')).toHaveLength(1);
          expect(rayBones.filter(m=>['phalanx','ungual'].includes(tag(m).element))).toHaveLength(ray.phalanges);
          const penultimate=find('phalanx',ray.ray,ray.phalanges-1);
          for(let n=1;n<ray.phalanges-1;n++)expect(axialLength(penultimate)).toBeGreaterThan(axialLength(find('phalanx',ray.ray,n)));
          const core=find('ungual',ray.ray),cover=life.find(m=>tag(m).element==='ungual'&&tag(m).ray===ray.ray),inside=nativeMeshContains(cover,scale*1e-7);
          for(let i=0;i<core.geometry.attributes.position.count;i++)expect(inside(world(core,i)),core.name+' actual sheath').toBe(true);
          expect(core.userData.dinoManualAttachment.root).toEqual(cover.userData.dinoManualAttachment.root);
          const n=core.geometry.attributes.position.count;expect((world(core,n-2).z-world(core,n-1).z)*side).toBeLessThan(0);
        }
        expect(find('ungual',3).geometry.parameters.length).toBeLessThan(find('ungual',1).geometry.parameters.length);
        expect(find('ungual',3).geometry.parameters.length).toBeLessThan(find('ungual',2).geometry.parameters.length);
      }
    }finally{b.dispose();full.dispose();}
  });

  it('keeps the actual arm elements and meanings identical in independent Bone and Life layers',()=>{
    for(const id of ids){
      const both=nativeTheropodManus(id),bone=nativeTheropodManus(id,1,.9,{body:false,bone:true}),life=nativeTheropodManus(id,1,.9,{body:true,bone:false});
      try{
        expect(bone.life).toHaveLength(0);expect(life.bones).toHaveLength(0);
        expect(geometryHash(bone.bones)).toBe(geometryHash(both.bones));expect(geometryHash(life.life)).toBe(geometryHash(both.life));
        expect(bone.context.model.userData.dinoTheropodManus).toEqual(life.context.model.userData.dinoTheropodManus);
      }finally{both.dispose();bone.dispose();life.dispose();}
    }
  });
});
