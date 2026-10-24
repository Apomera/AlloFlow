import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {nativeDromaeosaurBodyHarness,THREE,vec} from './helpers/dino_native_dromaeosaur_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_DROMAEOSAUR_PELVIS_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const native=nativeDromaeosaurBodyHarness(source),ids=['velociraptor','deinonychus'];
const tag=m=>m.userData.dinoDromaeosaurPelvicElement;
const meshes=b=>b.bones.filter(m=>tag(m));
const preserved=JSON.parse(readFileSync(resolve('tests/fixtures/dinolab_dromaeosaur_pelvis_preserved.json'),'utf8'));
const serial=m=>({p:Array.from(m.geometry.attributes.position.array),i:m.geometry.index?Array.from(m.geometry.index.array):null,x:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray(),world:m.matrixWorld.toArray()});
const hash=ms=>createHash('sha256').update(JSON.stringify(ms.map(serial))).digest('hex');
function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;while(depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
function closedOutward(mesh,scale){
 const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map(),tol=scale*1e-8;let volume=0;
 const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/tol)).join(',');
 for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));
  expect(b.clone().sub(a).cross(c.clone().sub(a)).length(),mesh.name+' nondegenerate triangle').toBeGreaterThan(tol*tol);volume+=a.dot(b.cross(c))/6;
  for(const[a,b]of[[0,1],[1,2],[2,0]]){const edge=[key(ix.getX(i+a)),key(ix.getX(i+b))].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}
 }
 expect([...edges.values()].filter(n=>n!==2),mesh.name+' closed solid').toEqual([]);expect(volume,mesh.name+' outward winding').toBeGreaterThan(tol**3);
}
function maximumLength(ms){const points=ms.flatMap(m=>Array.from({length:m.geometry.attributes.position.count},(_,i)=>vec().fromBufferAttribute(m.geometry.attributes.position,i)));let length=0;
 for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)length=Math.max(length,points[i].distanceTo(points[j]));return length;
}
describe('reviewed dromaeosaur pelvic bones and genuine life cover',()=>{
 it('uses exact-two scope, qualified specimen maxima and distinct ischial unions',()=>{
  for(const d of native.art.DINOS)expect(Boolean(native.art.dinoDromaeosaurPelvisProfileFor(d)),d.id).toBe(ids.includes(d.id));
  for(const id of ids){const dn=native.art.DINOS.find(d=>d.id===id),p=native.art.dinoDromaeosaurPelvisProfileFor(dn);
   expect(p.sources).toHaveLength(4);expect(p.dimensionsAreInterpretive).toBe(true);expect(p.limit).toContain('does not establish gait');
   expect(p.proportionBasis).toContain(id==='velociraptor'?'145.8 mm estimated':'380+ mm');
   expect(p.referenceMeasurements.femur).toBe(id==='velociraptor'?238:336);
   expect(p.referenceMeasurements.pubis.minimum===true).toBe(id==='deinonychus');
  }
 });
 for(const id of ids)for(const scale of [.05,1,8])it(id+' has real closed elements, mirrored sides and complete cover at '+scale,()=>{
  let fixed=null;
  for(const tissue of [.90,1.13]){
   const b=native.build(id,scale,tissue),c=b.context,pelvic=meshes(b);
   try{
    expect(pelvic).toHaveLength(10);const metadata=c.model.userData.dinoDromaeosaurPelvis;expect(metadata.species).toBe(id);expect(metadata.sides).toHaveLength(2);
    const serial=pelvic.map(m=>({p:Array.from(m.geometry.attributes.position.array),i:Array.from(m.geometry.index.array),x:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray()}));
    if(fixed)expect(serial,'actual bone buffers do not change with tissue').toEqual(fixed);else fixed=serial;
    const covers=b.skins.map(m=>nativeMeshContains(m,c.ht*2e-6)),bad=[];
    for(const m of pelvic){closedOutward(m,scale);expect([...m.geometry.attributes.position.array,...m.geometry.attributes.normal.array].every(Number.isFinite)).toBe(true);
     const a=m.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=vec().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld);if(!covers.some(f=>f(v)))bad.push({name:m.name,vertex:i,point:v.toArray()});}
    }
    expect(bad,'all actual native pelvic vertices must fit life').toEqual([]);
    const envelope=b.torso.userData.dinoDromaeosaurPelvicEnvelope;expect(envelope).toMatchObject({species:id,layer:'life',element:'posterior-torso',minU:.55,maxU:.98});
    for(const side of [-1,1]){
     const bones=pelvic.filter(m=>tag(m).side===side),entry=metadata.sides.find(s=>s.side===side),F=entry.femur,ref=metadata.referenceMeasurements;
     expect(bones.map(m=>tag(m).element).sort()).toEqual(['acetabular-rim','ilium','ischium','pubis','pubis']);
     const length=el=>maximumLength(bones.filter(m=>tag(m).element===el))/F;
     expect(length('ilium')).toBeGreaterThan(ref.ilium.value/ref.femur*.93);expect(length('ilium')).toBeLessThan(ref.ilium.value/ref.femur*1.08);
     expect(length('ischium')).toBeGreaterThan(ref.ischium.value/ref.femur*.88);expect(length('ischium')).toBeLessThan(ref.ischium.value/ref.femur*1.13);
     expect(length('pubis')).toBeGreaterThan(ref.pubis.value/ref.femur*(id==='deinonychus'?1:.92));expect(length('pubis')).toBeLessThan(ref.pubis.value/ref.femur*1.12);
     const ring=bones.find(m=>tag(m).element==='acetabular-rim');expect(ring.geometry.type).toBe('TorusGeometry');
     const pubic=bones.find(m=>tag(m).element==='pubis'&&tag(m).subelement==='shaft-and-boot');
     expect(tag(pubic).bootLongDimension/F).toBeCloseTo(id==='deinonychus'?.400:.145,10);
     const apron=bones.find(m=>tag(m).subelement==='medial-apron'),ap=apron.geometry.attributes.position,pp=pubic.geometry.attributes.position;
     expect(Array.from({length:ap.count},(_,i)=>Math.abs(ap.getZ(i))).filter(z=>z<F*1e-6).length,'actual paired pubic apron reaches its symphysis').toBeGreaterThanOrEqual(4);
     expect(Array.from({length:pp.count},(_,i)=>Math.abs(pp.getZ(i))).filter(z=>z<F*1e-6).length,'actual distal pubic feet meet').toBeGreaterThanOrEqual(3);
     const ischium=bones.find(m=>tag(m).element==='ischium'),ip=ischium.geometry.attributes.position,medialZ=Math.min(...Array.from({length:ip.count},(_,i)=>side*ip.getZ(i)));
     expect(medialZ<=0,'Deinonychus ischial symphysis differs from unfused Velociraptor tips').toBe(id==='deinonychus');
     const origin=vec(...entry.socket).add(vec(0,0,side*F*.2)),ray=new THREE.Raycaster(origin,vec(0,0,-side));
     expect(ray.intersectObjects(bones,false).filter(hit=>hit.distance<F*.4),'true acetabular center must remain open').toEqual([]);
     const positive=pelvic.filter(m=>tag(m).side===1),negative=pelvic.filter(m=>tag(m).side===-1);
     for(const a of positive){const b=negative.find(m=>tag(m).element===tag(a).element&&tag(m).subelement===tag(a).subelement),pa=a.geometry.attributes.position,pb=b.geometry.attributes.position;
      const keys=new Set(Array.from({length:pb.count},(_,i)=>[pb.getX(i),pb.getY(i),-pb.getZ(i)].map(v=>Math.round(v/(scale*1e-6))).join(',')));
      for(let i=0;i<pa.count;i++)expect(keys.has([pa.getX(i),pa.getY(i),pa.getZ(i)].map(v=>Math.round(v/(scale*1e-6))).join(',')),a.name+' bilateral bone surface').toBe(true);
     }
    }
   }finally{b.dispose();}
  }
 },60000);
 for(const id of ids)it(id+' preserves actual reviewed skull, neck, forelimbs, pes, hindlimb axes and tail buffers',()=>{
  const b=native.build(id,1,.90);try{
   const actual={anchors:b.context.model.userData.dinoFullBodyAnatomy.anchors,limbs:b.context.model.userData.dinoFullBodyAnatomy.limbs,skull:hash(b.head.bones),neck:hash([b.head.neck]),arms:hash(b.armBones),armSkins:hash(b.armSkins),feet:hash(b.pedalBones),footSkins:hash(b.pedalSkins),hindlimbs:hash(b.records.limbs.flatMap(l=>l.bones.flatMap(r=>r.meshes))),legSkins:hash(b.records.limbs.map(l=>l.skin)),tailSkin:hash([b.skins[1]])};
   expect(actual).toEqual(preserved.species[id]);
  }finally{b.dispose();}
 });
 for(const id of ids)it(id+' materializes identical frame evidence in actual Life-only and Bone-only common assembly',()=>{
  const b=native.build(id,1,.90),models=[];
  try{for(const showBody of [true,false]){
    const model=new THREE.Group();models.push(model);
    const c={...b.context,model,props:{showBody,showSkeleton:!showBody},idleMotion:{}};
    c.addSoftTissueChain=new Function('c','with(c){'+extract('addSoftTissueChain')+';return addSoftTissueChain;}')(c);
    const first=source.indexOf('var cladeName = String(dn.clade'),last=source.indexOf('function dorsalSurfacePoint(t)',first);
    const torso=new Function('c','with(c){'+source.slice(first,last)+';return bodyShell;}')(c);
    expect(Boolean(torso)).toBe(showBody);expect(model.userData.dinoDromaeosaurPelvis).toEqual(b.context.model.userData.dinoDromaeosaurPelvis);
    expect(model.userData.dinoDromaeosaurPelvis.tissueHypothesisIndependentAnchors).toBe(true);expect(model.userData.dinoDromaeosaurPelvis.sides).toHaveLength(2);
    expect(model.children.filter(m=>tag(m)),'common assembly does not fabricate hidden bone meshes').toEqual([]);
   }
  }finally{for(const model of models)model.traverse(m=>m.geometry?.dispose());b.dispose();}
 });
});
