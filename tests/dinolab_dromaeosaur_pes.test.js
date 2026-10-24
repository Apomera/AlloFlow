import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {api,source,THREE,vec,nativeDromaeosaurPes,nativeDromaeosaurPesHarness,pedalGeometryHash} from './helpers/dino_native_dromaeosaur_pes_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
const ids=['velociraptor','deinonychus'];
const world=(m,i)=>m.localToWorld(vec().fromBufferAttribute(m.geometry.attributes.position,i));
function closed(mesh,tolerance){
  const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map();let volume=0;
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tolerance)).join(',');
  for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));volume+=a.dot(b.cross(c))/6;
    for(const[a,b]of[[0,1],[1,2],[2,0]]){const x=key(ix.getX(i+a)),y=key(ix.getX(i+b));if(x===y)continue;const k=[x,y].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}}
  for(const n of edges.values())expect(n).toBe(2);expect(volume).toBeGreaterThan(tolerance**3);
}
function minimumY(mesh){let y=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++)y=Math.min(y,world(mesh,i).y);return y;}
describe('native reviewed dromaeosaur four-ray feet',()=>{
  it('gates exact species and separates preserved anatomy from the authored pose',()=>{
    for(const d of api.DINOS)expect(Boolean(api.dinoDromaeosaurPesProfileFor(d)),d.id).toBe(ids.includes(d.id));
    for(const id of ids){const dn=api.DINOS.find(d=>d.id===id),p=api.dinoDromaeosaurPesProfileFor(dn);
      expect(api.dinoDromaeosaurPesProfileFor({...dn,group:'other'})).toBeNull();
      expect(api.dinoDromaeosaurPesFrame(THREE,dn,{root:vec(NaN,0,0),side:1,len:2,ht:.5,bodyDepth:.1,detailScale:1})).toBeNull();
      expect(p.rays.map(r=>r.ray)).toEqual([1,2,3,4]);expect(p.rays.map(r=>r.modeledPhalanges)).toEqual([2,3,4,5]);
      expect(p.evidence).toMatch(/first toe is unreversed.*two specialized non-ungual phalanges/);
      expect(p.limit).toMatch(/not specimen scans or tested joint-motion limits/);expect(p.limit).toMatch(/does not claim every modeled element/);
      expect(p.limit).toMatch(/do not prove a hunting behavior/);expect(p.referenceSpecimens).not.toContain('IGM 100/980');
      expect(p.sources.some(s=>s.url==='https://doi.org/10.1371/journal.pone.0028964')).toBe(true);
    }
  });
  it.each(ids.flatMap(id=>[.05,1,8].map(scale=>[id,scale])))('%s contains every real pedal bone and curved core at scale %s',(id,scale)=>{
    const b=nativeDromaeosaurPes(id,scale),full=nativeDromaeosaurPes(id,scale,1.13);
    try{
      const meta=b.context.model.userData.dinoDromaeosaurPes;
      expect(meta).toMatchObject({species:id,dimensionsAreInterpretive:true,poseIsAuthored:true,notMotionSimulation:true,tissueHypothesisIndependentAnchors:true});
      expect(meta.feet.map(f=>f.side)).toEqual([-1,1]);expect(full.context.model.userData.dinoDromaeosaurPes).toEqual(meta);
      expect(pedalGeometryHash(full.bones)).toBe(pedalGeometryHash(b.bones));expect(pedalGeometryHash(full.life)).toBe(pedalGeometryHash(b.life));
      expect(pedalGeometryHash(full.baseCovers)).toBe(pedalGeometryHash(b.baseCovers));
      expect(b.baseCovers).toHaveLength(2);expect(b.shafts).toHaveLength(2);
      const actualLegSkins=b.context.idleMotion.legs.map(l=>l.mesh),joinedSkins=[...actualLegSkins,...b.life,...b.baseCovers].map(m=>nativeMeshContains(m,scale*2e-7));
      for(const basal of b.baseCovers){
        const tag=basal.userData.dinoDromaeosaurPedalBase,insidePad=nativeMeshContains(basal,scale*2e-7);
        expect(tag).toMatchObject({species:id,layer:'life',representative:true});expect(tag.ray).toBeUndefined();expect(basal.userData.dinoDromaeosaurPedalElement).toBeUndefined();
        const shaft=b.shafts.find(m=>m.userData.dinoDromaeosaurMetatarsalContext.side===tag.side),height=shaft.geometry.parameters.height;
        const basalRecord=meta.feet.find(f=>f.side===tag.side).basalCover;
        expect(basalRecord.retainedShaftRadius).toBe(shaft.geometry.parameters.radiusTop);expect(basalRecord.retainedShaftRadius).toBe(shaft.geometry.parameters.radiusBottom);
        expect(height).toBeGreaterThan(0);let distalVertices=0;
        for(let v=0;v<shaft.geometry.attributes.position.count;v++){
          const point=world(shaft,v);expect(joinedSkins.some(contains=>contains(point)),`${id} ${scale} retained actual shaft ${v}`).toBe(true);
          if(Math.abs(shaft.geometry.attributes.position.getY(v)-height*.5)<scale*1e-8){distalVertices++;expect(insidePad(point),`${id} ${scale} actual shaft distal cap ${v}`).toBe(true);}
        }
        expect(distalVertices).toBeGreaterThan(15);
        const intersects=mesh=>{for(let v=0;v<mesh.geometry.attributes.position.count;v++)if(insidePad(world(mesh,v)))return true;return false;};
        const leg=actualLegSkins.find(m=>m.userData.dinoRegion==='hindleg-'+tag.side);expect(intersects(leg),'basal cover overlaps actual distal leg skin').toBe(true);
        for(const ray of [1,2,3,4]){const metatarsal=b.life.find(m=>{const t=m.userData.dinoDromaeosaurPedalElement;return t.side===tag.side&&t.ray===ray&&t.element==='metatarsal-envelope';});expect(intersects(metatarsal),'basal cover overlaps actual metatarsal envelope '+ray).toBe(true);}
      }
      expect(new Set(b.meshes.map(m=>m.userData.dinoDromaeosaurPedalElement.id)).size).toBe(b.meshes.length);
      let checked=0;
      for(const side of [-1,1])for(const ray of [1,2,3,4]){
        const bone=b.bones.filter(m=>m.userData.dinoDromaeosaurPedalElement.side===side&&m.userData.dinoDromaeosaurPedalElement.ray===ray);
        const life=b.life.filter(m=>m.userData.dinoDromaeosaurPedalElement.side===side&&m.userData.dinoDromaeosaurPedalElement.ray===ray);
        expect(bone.filter(m=>m.userData.dinoDromaeosaurPedalElement.element==='phalanx')).toHaveLength(ray===1?1:ray);
        expect(bone.filter(m=>m.userData.dinoDromaeosaurPedalElement.element==='distal-metatarsal')).toHaveLength(1);
        const core=bone.find(m=>m.userData.dinoDromaeosaurPedalElement.element==='ungual-core'),cover=life.find(m=>m.userData.dinoDromaeosaurPedalElement.element==='ungual-covering');
        expect(core).toBeTruthy();expect(cover).toBeTruthy();const clawContains=nativeMeshContains(cover,scale*2e-7);
        const skin=life.filter(m=>m!==cover).map(m=>nativeMeshContains(m,scale*2e-7));
        for(const m of bone)for(let i=0;i<m.geometry.attributes.position.count;i++){
          checked++;expect(m===core?clawContains(world(m,i)):skin.some(contains=>contains(world(m,i))),`${id} ${scale} actual ${m.name} vertex ${i}`).toBe(true);
        }
        const foot=meta.feet.find(f=>f.side===side),record=foot.rays.find(r=>r.ray===ray);
        if(ray===1){expect(record.ungualTip[0]).toBeLessThan(record.ungualRoot[0]);expect(side*(record.base[2]-foot.root[2])).toBeLessThan(0);}
        if(ray===2){
          expect(side*(record.base[2]-foot.root[2])).toBeLessThan(0);
          const p=core.geometry.attributes.position,rows=48,sides=24,centers=[];
          for(let row=0;row<=rows;row++){const center=vec();for(let j=0;j<sides;j++)center.add(vec().fromBufferAttribute(p,row*sides+j));centers.push(center.multiplyScalar(1/sides));}
          const chord=new THREE.Line3(centers[0],centers.at(-1));let maxCurve=0;
          for(const center of centers)maxCurve=Math.max(maxCurve,center.distanceTo(chord.closestPointToPoint(center,true,vec())));
          expect(maxCurve).toBeGreaterThan(chord.distance()*.10);
          for(const other of [3,4]){const planted=b.life.find(m=>{const t=m.userData.dinoDromaeosaurPedalElement;return t.side===side&&t.ray===other&&t.element==='ungual-covering';});expect(minimumY(cover)).toBeGreaterThan(minimumY(planted)+b.context.len*.001);}
        }
      }
      expect(checked).toBeGreaterThan(8000);
      for(const m of [...b.meshes,...b.baseCovers]){
        expect(minimumY(m),`${id} ${scale} ground clearance ${m.name}`).toBeGreaterThan(0);
        expect(m.userData.dinoPartIds).toContain('foot');expect(m.userData.dinoPartIds).toContain('toes');
        for(const attr of ['position','normal'])expect(Array.from(m.geometry.attributes[attr].array).every(Number.isFinite)).toBe(true);
        const n=m.geometry.attributes.normal;for(let i=0;i<n.count;i++)expect(vec().fromBufferAttribute(n,i).length()).toBeCloseTo(1,4);
        closed(m,scale*1e-7);
      }
    }finally{b.dispose();full.dispose();}
  });
  it.each(ids)('%s uses the same actual paired pes in independent bone/life modes',id=>{
    const both=nativeDromaeosaurPes(id),bone=nativeDromaeosaurPes(id,1,.90,{body:false,bone:true}),life=nativeDromaeosaurPes(id,1,.90,{body:true,bone:false});
    try{expect(bone.life).toHaveLength(0);expect(bone.baseCovers).toHaveLength(0);expect(life.bones).toHaveLength(0);expect(life.baseCovers).toHaveLength(2);expect(pedalGeometryHash(bone.bones)).toBe(pedalGeometryHash(both.bones));expect(pedalGeometryHash(life.life)).toBe(pedalGeometryHash(both.life));expect(pedalGeometryHash(life.baseCovers)).toBe(pedalGeometryHash(both.baseCovers));expect(bone.context.model.userData.dinoDromaeosaurPes).toEqual(life.context.model.userData.dinoDromaeosaurPes);}finally{both.dispose();bone.dispose();life.dispose();}
  });
  it('keeps actual generic toes unchanged in unrelated taxa',()=>{
    // Independent native buffers rendered from the saved before.js. Retain the
    // frozen digest so this regression does not depend on an ignored tmp file.
    const expected={troodon:[36,'7eea3f8c88e7e72dde3fdbd04566b6f2447e7f457cf78ebbbe8ea881eb782646'],microraptor:[36,'54c9af8a4971384f4a1ab64d8c23388d754eecbe1af3bd263ab938bdd7ec78ab'],gallimimus:[28,'991919be02b3b812a5db501d05861f0a2795dbeb553b779dd748fb67fd1a0dba']};
    const current=nativeDromaeosaurPesHarness(source);
    const distal=b=>{const out=[];b.context.model.traverse(m=>{if(m.isMesh&&/^foot-/.test(m.userData.dinoRegion||''))out.push(m);});return out;};
    for(const id of ['troodon','microraptor','gallimimus']){const b=current.build(id);try{const meshes=distal(b);expect(b.meshes).toHaveLength(0);expect(meshes).toHaveLength(expected[id][0]);expect(createHash('sha256').update(pedalGeometryHash(meshes)).digest('hex')).toBe(expected[id][1]);}finally{b.dispose();}}
  });
});
