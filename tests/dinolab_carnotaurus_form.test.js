import {describe,it,expect} from 'vitest';
import {nativeCarnotaurus,api,THREE,vec,geometryHash} from './helpers/dino_native_carnotaurus_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const dn=api.DINOS.find(d=>d.id==='carnotaurus');
function world(mesh,index){return mesh.localToWorld(vec().fromBufferAttribute(mesh.geometry.attributes.position,index));}
function closed(mesh,tolerance){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tolerance)).join(',');
  let volume=0;
  for(let i=0;i<ix.count;i+=3){
    const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));
    volume+=a.dot(b.cross(c))/6;
    for(const[a,b]of[[0,1],[1,2],[2,0]]){const x=key(ix.getX(i+a)),y=key(ix.getX(i+b));if(x===y)continue;const edge=[x,y].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
  }
  for(const count of edges.values())expect(count).toBe(2);
  expect(volume).toBeGreaterThan(tolerance**3);
}
describe('exact Carnotaurus shared skull and holotype-informed reduced forelimbs',()=>{
  it('bounds species, hand completeness and sampled skin claims',()=>{
    for(const d of api.DINOS)expect(Boolean(api.dinoCarnotaurusProfileFor(d)),d.id).toBe(d.id==='carnotaurus');
    expect(api.dinoCarnotaurusProfileFor({...dn,clade:'other'})).toBeNull();
    expect(api.dinoCarnotaurusCraniumFrame(THREE,dn,vec(NaN,0,0),8,3)).toBeNull();
    expect(api.dinoCarnotaurusCraniumFrame(THREE,dn,vec(),Infinity,3)).toBeNull();
    expect(api.dinoCarnotaurusForelimbFrame(THREE,dn,{shoulder:vec(),len:8,ht:3,bodyDepth:NaN},1)).toBeNull();
    expect(api.cranialSurfaceProfileFor(dn).muzzleLengthScale).toBe(1);
    expect(api.skeletalAnatomyProfileFor(dn)).toMatchObject({hornSheath:true,hornSheathInferred:true,manualDigits:4,manualMetacarpals:4,manualPhalanxFormula:null,manualPhalangealFormulaComplete:false,manualUnguals:null,manualUngualCountComplete:false});
    expect(api.skeletalAnatomyProfileFor(dn).distalLimbEvidence).toMatch(/Distal elements of I and II remain uncertain.*tentative/);
    expect(api.dinoCarnotaurusProfileFor(dn).limit).toMatch(/rather than claiming a complete phalangeal formula/);
    expect(dn.blurb).not.toMatch(/comically|fast/);expect(dn.traits.join(' ')).not.toMatch(/built for speed/);
    expect(dn.facts.join(' ')).toMatch(/Sampled skin regions.*scattered/);
    expect(dn.facts.join(' ')).not.toMatch(/rows|no feathers/);expect(dn.uncertain).toMatch(/unsampled/);
    const parts=api.dinoDetailedBodyPartDefinitions(dn,false),part=id=>parts.find(p=>p.id===id);
    for(const id of ['head','skull','snout','jaw']){
      const guide=api.dinoPartInspectionFor(dn,part(id));
      expect(guide.question).toMatch(/facial reach.*skull height/);expect(guide.bone).toMatch(/short, high skull/);
      expect(guide.limit).toMatch(/not a specimen scan/);expect(guide.source.url).toBe('https://doi.org/10.1080/08912963.2020.1802445');
    }
    for(const id of ['hand','fingers']){
      const guide=api.dinoPartInspectionFor(dn,part(id));
      expect(guide.question).toMatch(/four complete clawed fingers/);expect(guide.bone).toMatch(/Metacarpal IV.*lacks a joint for a phalanx/);
      expect(guide.limit).toMatch(/Distal elements of digits I and II.*tentative/);
      expect(guide.source.url).toBe('https://doi.org/10.1111/j.1475-4983.2011.01091.x');
    }
    for(const id of ['forelimb','forearm','elbow'])expect(api.dinoPartInspectionFor(dn,part(id)).bone).toMatch(/one quarter/);
    expect(part('hand').characteristics).toMatch(/Four metacarpals do not establish four complete clawed fingers/);
    expect(part('wrist').characteristics).toMatch(/tiny nearby elements remain uncertain/);expect(part('wrist').detail).toMatch(/uncertain/);
    const skin=api.dinoPartInspectionFor(dn,part('skin'));
    expect(skin.bone).toMatch(/unossified/);expect(skin.limit).toMatch(/unsampled/);
    expect(skin.source.url).toBe('https://doi.org/10.1016/j.cretres.2021.104994');
    const hornGuide=api.dinoPartInspectionFor(dn,part('horns'));expect(hornGuide.bone).toMatch(/frontal bones.*blunt.*ovoid.*lateral/);
    expect(hornGuide.life).toMatch(/inferred cornified/);expect(hornGuide.limit).toMatch(/internal recesses/);
    expect(part('horns').characteristics).toMatch(/frontal-bone.*ovoid/);
  });
  it.each([.04,1,6])('keeps skull bones within the actual minimal head and neck skin at scale %s',scale=>{
    const b=nativeCarnotaurus(scale),full=nativeCarnotaurus(scale,1.13);
    try{
      const c=b.context,meta=c.model.userData.dinoCarnotaurusCranium;
      expect(meta).toMatchObject({specimen:'MACN-CH 894',dimensionInference:true,tissueHypothesisIndependentAnchors:true});
      expect(c.surfaceSnout.toArray()).toEqual(c.snout.toArray());expect(c.snout.toArray()).toEqual(meta.snout);
      expect(c.head.distanceTo(c.snout)/c.len).toBeLessThan(.052);
      expect(meta.dimensions.height/c.ht).toBeCloseTo(.12,10);
      expect(full.context.model.userData.dinoCarnotaurusCranium).toEqual(meta);
      expect(geometryHash(b.bones)).toBe(geometryHash(full.bones));
      expect(b.hornCores).toHaveLength(2);expect(b.hornCoverings).toHaveLength(2);
      expect(full.context.model.userData.dinoCarnotaurusHorns).toEqual(c.model.userData.dinoCarnotaurusHorns);
      expect(geometryHash(full.hornCores)).toBe(geometryHash(b.hornCores));expect(geometryHash(full.hornCoverings)).toBe(geometryHash(b.hornCoverings));
      const minimalHeadContains=nativeMeshContains(b.upper,scale*2e-6),vaultContains=nativeMeshContains(b.cranialVault,scale*2e-6);
      for(const fixture of [b,full])for(let i=0;i<fixture.hornCores.length;i++){
        const core=fixture.hornCores[i],cover=fixture.hornCoverings[i],info=core.userData.dinoCarnotaurusHorn;
        expect(core.position.toArray()).toEqual(cover.position.toArray());expect(info.root).toEqual(cover.userData.dinoCarnotaurusHorn.root);
        expect(Math.abs(info.axis[2])).toBeGreaterThan(.9);expect(info.axis[1]).toBeGreaterThan(0);expect(info.axis[1]).toBeLessThan(.4);
        const insideCover=nativeMeshContains(cover,scale*1e-7);let connected=false;
        for(let v=0;v<core.geometry.attributes.position.count;v++)expect(insideCover(world(core,v)),scale+' actual frontal core vertex '+v).toBe(true);
        for(const mesh of [core,cover]){
          const base=mesh.geometry.userData.dinoCarnotaurusHornGeometry;
          for(let v=0;v<base.baseVertexCount;v++){
            expect(minimalHeadContains(world(mesh,v)),scale+' buried minimum-head horn base '+v).toBe(true);
            if(mesh===core&&vaultContains(world(mesh,v)))connected=true;
          }
          expect(minimalHeadContains(world(mesh,base.baseCenter))).toBe(true);
          expect(mesh.userData.dinoMotionParent).toBe('cranial');expect(fixture.context.cranialMotionParts).toContain(mesh);
          for(const attr of ['position','normal','dinoKeratin'])expect(Array.from(mesh.geometry.attributes[attr].array).every(Number.isFinite)).toBe(true);
          const normals=mesh.geometry.attributes.normal;for(let v=0;v<normals.count;v++)expect(vec().fromBufferAttribute(normals,v).length()).toBeCloseTo(1,4);
          closed(mesh,scale*1e-7);
        }
        expect(connected,scale+' actual frontal core joins skull display').toBe(true);
      }
      const contains=[b.upper,b.lower,b.neck].map(m=>nativeMeshContains(m,scale*2e-6));let count=0;
      for(const mesh of b.bones)for(let v=0;v<mesh.geometry.attributes.position.count;v++){
        count++;expect(contains.some(fn=>fn(world(mesh,v))),`${scale} actual skull bone ${mesh.name} vertex ${v}`).toBe(true);
      }
      expect(count).toBeGreaterThan(1000);
    }finally{b.dispose();full.dispose();}
  });
  it.each([.04,1,6])('constructs parallel short forearms, four unequal metacarpals and nested digital skin at scale %s',scale=>{
    const b=nativeCarnotaurus(scale),full=nativeCarnotaurus(scale,1.13);
    try{
      expect(b.context.model.userData.dinoCarnotaurusManus.arms).toHaveLength(2);
      expect(full.context.model.userData.dinoCarnotaurusManus).toEqual(b.context.model.userData.dinoCarnotaurusManus);
      expect(geometryHash(full.armBones)).toBe(geometryHash(b.armBones));
      const contains=b.armSkins.map(m=>nativeMeshContains(m,scale*2e-7));
      for(const mesh of b.armBones)for(let v=0;v<mesh.geometry.attributes.position.count;v++)
        expect(contains.some(fn=>fn(world(mesh,v))),`${scale} actual forelimb bone ${mesh.name} vertex ${v}`).toBe(true);
      for(const mesh of b.armMeshes){
        for(const attribute of ['position','normal'])expect(Array.from(mesh.geometry.attributes[attribute].array).every(Number.isFinite)).toBe(true);
        const n=mesh.geometry.attributes.normal;for(let i=0;i<n.count;i++)expect(vec().fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);
        closed(mesh,scale*1e-7);
      }
      for(const side of [-1,1]){
        const bones=b.armBones.filter(m=>m.userData.dinoCarnotaurusElement.side===side);
        const find=(element,digit)=>bones.find(m=>m.userData.dinoCarnotaurusElement.element===element&&(!digit||m.userData.dinoCarnotaurusElement.digit===digit));
        const axes=m=>m.geometry.userData.dinoLongBone;
        const length=m=>vec(...axes(m).start).distanceTo(vec(...axes(m).end));
        const humerus=find('humerus'),radius=find('radius'),ulna=find('ulna');
        expect(length(radius)/length(humerus)).toBeCloseTo(.25,8);expect(length(ulna)/length(humerus)).toBeCloseTo(.25,8);
        const r=axes(radius),u=axes(ulna),direction=vec(...r.end).sub(vec(...r.start)).normalize();
        const delta=vec(...u.start).sub(vec(...r.start)),normal=delta.clone().addScaledVector(direction,-delta.dot(direction)).normalize();
        expect(vec(...u.end).sub(vec(...r.end)).distanceTo(delta)).toBeLessThan(scale*1e-9);
        const center=vec(...r.start).add(vec(...u.start)).multiplyScalar(.5);
        for(let i=0;i<radius.geometry.attributes.position.count;i++)expect(world(radius,i).sub(center).dot(normal)).toBeLessThan(0);
        for(let i=0;i<ulna.geometry.attributes.position.count;i++)expect(world(ulna,i).sub(center).dot(normal)).toBeGreaterThan(0);
        expect(bones.filter(m=>m.userData.dinoCarnotaurusElement.element==='metacarpal')).toHaveLength(4);
        expect(length(find('metacarpal',4))).toBeGreaterThan(length(find('metacarpal',2))*2);
        // Ruiz et al. (2011): I is similar to III; III is about 80% of II.
        // Measure rendered vertices along each shaft, rather than profile ratios.
        const renderedLength=mesh=>{
          const axis=vec(...axes(mesh).end).sub(vec(...axes(mesh).start)).normalize();
          let lo=Infinity,hi=-Infinity;
          for(let v=0;v<mesh.geometry.attributes.position.count;v++){const projection=world(mesh,v).dot(axis);lo=Math.min(lo,projection);hi=Math.max(hi,projection);}
          return hi-lo;
        };
        const mcpI=renderedLength(find('metacarpal',1)),mcpII=renderedLength(find('metacarpal',2)),mcpIII=renderedLength(find('metacarpal',3));
        expect(mcpI/mcpIII,scale+' rendered metacarpal I and III length relation').toBeCloseTo(1,4);
        expect(mcpI).toBeLessThan(mcpII);expect(mcpIII).toBeLessThan(mcpII);
        expect(bones.filter(m=>m.userData.dinoCarnotaurusElement.digit===4)).toHaveLength(1);
        for(const digit of [2,3])expect(length(find('proximal-phalanx',digit))).toBeGreaterThan(length(find('metacarpal',digit)));
        expect(axes(find('metacarpal',1)).start[1]).toBeGreaterThan(axes(find('metacarpal',4)).start[1]);
        expect(b.context.model.userData.dinoCarnotaurusManus.arms.find(a=>a.side===side).palmNormal).toEqual([0,0,-side]);
      }
    }finally{b.dispose();full.dispose();}
  });
  it('uses the same actual forelimb geometry in independent bone and life views',()=>{
    const both=nativeCarnotaurus(),bone=nativeCarnotaurus(1,.90,{body:false,bone:true}),life=nativeCarnotaurus(1,.90,{body:true,bone:false});
    try{
      expect(bone.armSkins).toHaveLength(0);expect(life.armBones).toHaveLength(0);
      expect(bone.hornCoverings).toHaveLength(0);expect(life.hornCores).toHaveLength(0);
      expect(geometryHash(bone.hornCores)).toBe(geometryHash(both.hornCores));expect(geometryHash(life.hornCoverings)).toBe(geometryHash(both.hornCoverings));
      expect(geometryHash(bone.armBones)).toBe(geometryHash(both.armBones));
      expect(geometryHash(life.armSkins)).toBe(geometryHash(both.armSkins));
      expect(bone.context.model.userData.dinoCarnotaurusManus).toEqual(life.context.model.userData.dinoCarnotaurusManus);
    }finally{both.dispose();bone.dispose();life.dispose();}
  });
});
