import {describe,it,expect} from 'vitest';
import {nativeTheropodManus,api,THREE,vec,geometryHash} from './helpers/dino_native_theropod_manus_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const ids=['tyrannosaurus','allosaurus','coelophysis','dilophosaurus'];
const world=(mesh,index)=>mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,index));
const info=mesh=>mesh.userData.dinoTheropodManualElement;
function actualAxialLength(mesh){
  const axis=mesh.geometry.userData.dinoTheropodBoneAxis;
  const direction=vec(...axis.end).sub(vec(...axis.start)).normalize();
  let lo=Infinity,hi=-Infinity;
  for(let v=0;v<mesh.geometry.attributes.position.count;v++){
    const p=world(mesh,v).dot(direction);lo=Math.min(lo,p);hi=Math.max(hi,p);
  }
  return hi-lo;
}
function closed(mesh,tolerance){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tolerance)).join(',');
  let volume=0;
  for(let i=0;i<ix.count;i+=3){
    const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));
    volume+=a.dot(b.cross(c))/6;
    for(const[a,b]of[[0,1],[1,2],[2,0]]){
      const x=key(ix.getX(i+a)),y=key(ix.getX(i+b));if(x===y)continue;
      const edge=[x,y].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);
    }
  }
  for(const count of edges.values())expect(count,mesh.name+' closed edge incidence').toBe(2);
  expect(volume,mesh.name+' outward winding').toBeGreaterThan(tolerance**3);
}
describe('reviewed theropod forelimbs and real manual elements',()=>{
  it('limits exact species and distinguishes reference counts from inferred proportions',()=>{
    for(const dn of api.DINOS)expect(Boolean(api.dinoTheropodForelimbProfileFor(dn)),dn.id).toBe([...ids,'velociraptor','deinonychus'].includes(dn.id));
    expect(api.dinoTheropodForelimbProfileFor({...api.DINOS[0],group:'other'})).toBeNull();
    const expected={tyrannosaurus:[3,2,2],allosaurus:[3,3,3],coelophysis:[5,4,3],dilophosaurus:[4,4,3]};
    for(const id of ids){
      const dn=api.DINOS.find(d=>d.id===id),p=api.dinoTheropodForelimbProfileFor(dn),s=api.skeletalAnatomyProfileFor(dn);
      expect([s.manualMetacarpals,s.manualDigits,s.manualUnguals]).toEqual(expected[id]);
      expect(p.carpalSeriesComplete).toBe(false);expect(p.limit).toMatch(/resting flexion.*interpretive/);
      expect(s.manualFormulaBasis).toMatch(/not a claim.*every individual/);
      for(const source of p.sources){expect(source.title.length).toBeGreaterThan(8);expect(source.url).toMatch(/^https:\/\//);}
      for(const ray of p.manualRays)for(const key of ['clawBearing','reduced','vestigial'])expect(typeof ray[key]).toBe('boolean');
      expect(api.dinoTheropodForelimbFrame(THREE,dn,{shoulder:vec(),len:4,ht:2,bodyHeight:.2,bodyDepth:NaN},1)).toBeNull();
    }
  });
  it.each(ids.flatMap(id=>[.04,1,6].map(scale=>[id,scale])))('%s has nested finite actual forelimb geometry at scale %s',(id,scale)=>{
    const b=nativeTheropodManus(id,scale),full=nativeTheropodManus(id,scale,1.13);
    try{
      const p=api.dinoTheropodForelimbProfileFor(api.DINOS.find(d=>d.id===id)),meta=b.context.model.userData.dinoTheropodManus;
      expect(meta.arms).toHaveLength(2);expect(meta.dimensionsAreInterpretive).toBe(true);
      expect(meta.tissueHypothesisIndependentAnchors).toBe(true);expect(meta.carpalSeriesComplete).toBe(false);
      expect(full.context.model.userData.dinoTheropodManus).toEqual(meta);
      expect(geometryHash(full.bones)).toBe(geometryHash(b.bones));
      expect(full.anchors).toEqual(b.anchors);
      const contains=b.life.map(mesh=>nativeMeshContains(mesh,scale*2e-7));
      let tested=0;
      for(const mesh of b.bones)for(let v=0;v<mesh.geometry.attributes.position.count;v++){
        tested++;expect(contains.some(fn=>fn(world(mesh,v))),id+' '+scale+' bone '+mesh.name+' vertex '+v).toBe(true);
      }
      expect(tested).toBeGreaterThan(1000);
      for(const mesh of b.meshes){
        expect(mesh.userData.dinoPartIds).toContain(info(mesh).ray||info(mesh).element==='palm'?'hand':'forelimb');
        for(const name of ['position','normal'])expect(Array.from(mesh.geometry.attributes[name].array).every(Number.isFinite)).toBe(true);
        const normals=mesh.geometry.attributes.normal;
        for(let v=0;v<normals.count;v++)expect(vec().fromBufferAttribute(normals,v).length(),mesh.name).toBeCloseTo(1,4);
        closed(mesh,scale*1e-8);
      }
      for(const side of [-1,1]){
        const bones=b.bones.filter(m=>info(m).side===side),life=b.life.filter(m=>info(m).side===side);
        const find=(element,ray,phalange)=>bones.find(m=>info(m).element===element&&(!ray||info(m).ray===ray)&&(!phalange||info(m).phalange===phalange));
        const humerus=find('humerus'),radius=find('radius'),ulna=find('ulna');
        expect(actualAxialLength(radius)/actualAxialLength(humerus)).toBeCloseTo(p.radiusRatio,5);
        expect(actualAxialLength(ulna)/actualAxialLength(humerus)).toBeCloseTo(p.ulnaRatio,5);
        const r=radius.geometry.userData.dinoTheropodBoneAxis,u=ulna.geometry.userData.dinoTheropodBoneAxis;
        const axis=vec(...r.end).sub(vec(...r.start)).normalize(),delta=vec(...u.end).sub(vec(...r.end));
        const normal=delta.clone().addScaledVector(axis,-delta.dot(axis)).normalize(),middle=vec(...r.end).add(vec(...u.end)).multiplyScalar(.5);
        for(let v=0;v<radius.geometry.attributes.position.count;v++)expect(world(radius,v).sub(middle).dot(normal)).toBeLessThan(0);
        for(let v=0;v<ulna.geometry.attributes.position.count;v++)expect(world(ulna,v).sub(middle).dot(normal)).toBeGreaterThan(0);
        expect(meta.arms.find(a=>a.side===side).palmNormal).toEqual([0,0,-side]);
        const actualPhalanges=ray=>bones.filter(m=>info(m).ray===ray&&['phalanx','ungual'].includes(info(m).element));
        for(const ray of p.manualRays){
          expect(bones.filter(m=>info(m).ray===ray.ray&&info(m).element==='metacarpal')).toHaveLength(1);
          expect(actualPhalanges(ray.ray)).toHaveLength(ray.phalanges);
          const core=find('ungual',ray.ray),cover=life.find(m=>info(m).ray===ray.ray&&info(m).element==='ungual');
          expect(Boolean(core)).toBe(ray.clawBearing);expect(Boolean(cover)).toBe(ray.clawBearing);
          if(core){
            const inside=nativeMeshContains(cover,scale*1e-7);for(let v=0;v<core.geometry.attributes.position.count;v++)expect(inside(world(core,v)),core.name+' actual covering').toBe(true);
            const count=core.geometry.attributes.position.count;
            expect((world(core,count-2).z-world(core,count-1).z)*side,core.name+' claw curls toward medial palm').toBeLessThan(0);
          }
          if(ray.vestigial)expect(life.filter(m=>info(m).ray===ray.ray)).toHaveLength(0);
        }
        if(id==='coelophysis'){
          expect(actualAxialLength(find('metacarpal',5))).toBeLessThan(actualAxialLength(find('metacarpal',1)));
          expect(actualAxialLength(find('phalanx',2,2))).toBeGreaterThan(actualAxialLength(find('phalanx',2,1)));
          expect(actualAxialLength(find('phalanx',3,3))).toBeGreaterThan(actualAxialLength(find('phalanx',3,1)));
          expect(find('ungual',1).geometry.parameters.length).toBeGreaterThan(find('ungual',2).geometry.parameters.length);
        }
        if(id==='dilophosaurus'){
          expect(actualAxialLength(find('metacarpal',3))).toBeGreaterThan(actualAxialLength(find('metacarpal',2)));
          expect(actualAxialLength(find('metacarpal',4))).toBeGreaterThan(actualAxialLength(find('metacarpal',1)));
          const iv=find('metacarpal',4),iii=find('metacarpal',3);
          expect((world(iv,0).z-world(iii,0).z)*-side).toBeGreaterThan(0);
        }
      }
    }finally{b.dispose();full.dispose();}
  });
  it('keeps the same actual bones, skin and ray metadata in independent views',()=>{
    for(const id of ids){
      const both=nativeTheropodManus(id),bone=nativeTheropodManus(id,1,.90,{body:false,bone:true}),life=nativeTheropodManus(id,1,.90,{body:true,bone:false});
      try{
        expect(bone.life).toHaveLength(0);expect(life.bones).toHaveLength(0);
        expect(geometryHash(bone.bones)).toBe(geometryHash(both.bones));expect(geometryHash(life.life)).toBe(geometryHash(both.life));
        expect(bone.context.model.userData.dinoTheropodManus).toEqual(life.context.model.userData.dinoTheropodManus);
      }finally{both.dispose();bone.dispose();life.dispose();}
    }
  });
});
