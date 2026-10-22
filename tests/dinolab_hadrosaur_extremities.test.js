import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeHadrosaurExtremitiesHarness,THREE,vec} from './helpers/dino_native_hadrosaur_extremities_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';
import {nativeLambeosaurBodyHarness} from './helpers/dino_native_lambeosaur_body_harness.js';

const source=readFileSync(process.env.DINO_HADROSAUR_EXTREMITIES_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8'),native=nativeHadrosaurExtremitiesHarness(source);
const ids=['parasaurolophus','corythosaurus','lambeosaurus','olorotitan','edmontosaurus'];
const hash=meshes=>{const h=createHash('sha256');for(const m of meshes){h.update(JSON.stringify([m.position.toArray(),m.quaternion.toArray(),m.scale.toArray()]));for(const attr of ['position','normal','uv'])if(m.geometry.attributes[attr])h.update(m.geometry.attributes[attr].array);if(m.geometry.index)h.update(m.geometry.index.array);}return h.digest('hex');};
const preserve=f=>({anatomy:f.model.userData.dinoFullBodyAnatomy,upperBones:hash(f.upper.flatMap(r=>r.meshes)),body:hash([f.context.bodyShell]),tail:hash(f.context.tailMeshes),contacts:f.context.plantedFootContacts.map(v=>({...v,point:v.point.toArray()}))});
describe('Native hadrosaur bundled manus and three-ray pes',()=>{
 it('gates exactly five species and qualifies counts, specimens and keratin',()=>{
  for(const dn of native.art.DINOS){const p=native.art.dinoHadrosaurExtremitiesProfileFor(dn);expect(Boolean(p),dn.id).toBe(ids.includes(dn.id));if(p){expect(p.sources).toHaveLength(4);expect(p.referenceDimensions).toBeNull();expect(p.sampledManualSeries).toBe(true);expect(p.uncertainty).toContain('not a universal fossil formula');}}
  expect(native.art.dinoHadrosaurExtremitiesProfileFor(null)).toBeNull();for(const id of ids)expect(native.art.dinoHadrosaurExtremitiesProfileFor({id,group:'other'})).toBeNull();
 });
 for(const id of ids)for(const scale of [.05,1,6])it(id+' has closed anatomical rays and genuine bone cover at '+scale,()=>{
  const f=native.build(id,scale,'both',scale===6),c=f.context,bad=[];
  try{
   const meta=f.model.userData.dinoHadrosaurExtremities;expect(meta.species).toBe(id);expect(meta.limbs).toHaveLength(4);
   for(const limb of f.limbs){const record=meta.limbs.find(x=>x.front===limb.front&&x.side===limb.side);expect(record.rays.map(r=>r.ray)).toEqual(limb.front?[2,3,4,5]:[2,3,4]);
    const bones=limb.bones.filter(m=>m.userData.dinoHadrosaurDistalElement),unguals=bones.filter(m=>m.userData.dinoHadrosaurDistalElement.element==='ungual');
    expect(unguals.map(m=>m.userData.dinoHadrosaurDistalElement.ray)).toEqual(limb.front?[2,3]:[2,3,4]);
    expect(bones.filter(m=>/metacarpal|metatarsal/.test(m.userData.dinoHadrosaurDistalElement.element))).toHaveLength(limb.front?4:3);
    const covers=[...limb.skins,c.bodyShell].map(m=>{const contains=nativeMeshContains(m,c.ht*2e-6),box=new THREE.Box3().setFromObject(m).expandByScalar(c.ht*2e-6);return v=>box.containsPoint(v)&&contains(v);});
    for(const m of limb.bones){const p=m.geometry.attributes.position,ix=m.geometry.index;const check=(v,kind)=>{if(!covers.some(fn=>fn(v)))bad.push({front:limb.front,side:limb.side,tag:m.userData.dinoHadrosaurDistalElement||'retained-limb',kind,p:v.toArray()});};
     for(let i=0;i<p.count;i++)check(vec().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld),'vertex');
     if(m.userData.dinoHadrosaurDistalElement?.element==='ungual')for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)).applyMatrix4(m.matrixWorld),b=vec().fromBufferAttribute(p,ix.getX(i+1)).applyMatrix4(m.matrixWorld),v=vec().fromBufferAttribute(p,ix.getX(i+2)).applyMatrix4(m.matrixWorld);check(a.clone().add(b).add(v).multiplyScalar(1/3),'face');check(a.clone().lerp(b,.5),'edge');}
    }
    const distal=limb.meshes.filter(m=>m.userData.dinoHadrosaurDistalElement?.layer==='life');const sole=new THREE.Box3().setFromObject(c.model);let min=Infinity;
    for(const m of distal){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)min=Math.min(min,c.model.worldToLocal(vec().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld)).y);}
    expect(Math.abs(min-record.ground)).toBeLessThan(c.ht*3e-6);
   }
   if(process.env.DINO_HADROSAUR_DIAGNOSTICS){const grouped={};for(const b of bad){const key=(b.front?'hand/':'foot/')+(b.tag.element||b.tag),row=grouped[key]||(grouped[key]={count:0,examples:[]});row.count++;if(row.examples.length<3)row.examples.push(b);}const evidence=JSON.stringify({id,scale,count:bad.length,grouped},null,2);writeFileSync(process.env.DINO_HADROSAUR_DIAGNOSTICS,evidence);writeFileSync(process.env.DINO_HADROSAUR_DIAGNOSTICS.replace('.json','-'+id+'-'+scale+'.json'),evidence);}
   expect(bad.slice(0,10),'uncovered real bone samples '+bad.length).toEqual([]);
   for(const m of f.meshes)for(const attr of ['position','normal','uv'])expect(Array.from(m.geometry.attributes[attr].array).every(Number.isFinite)).toBe(true);
  }finally{f.dispose();}
 },60000);
 it('has outward, closed, nondegenerate new bone, pad, envelope and hoof solids',()=>{
  const f=native.build('corythosaurus');try{const failures=[];
   for(const m of f.meshes){const p=m.geometry.attributes.position,ix=m.geometry.index,edges=new Map(),weld=new Map(),keys=[];let volume=0,minArea=Infinity;
    for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/(f.context.ht*1e-7))).join(',');if(!weld.has(k))weld.set(k,weld.size);keys.push(weld.get(k));}
    for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],a=vec().fromBufferAttribute(p,ids[0]),b=vec().fromBufferAttribute(p,ids[1]),c=vec().fromBufferAttribute(p,ids[2]);minArea=Math.min(minArea,b.clone().sub(a).cross(c.clone().sub(a)).length());volume+=a.dot(b.clone().cross(c))/6;
     for(let j=0;j<3;j++){const a=keys[ids[j]],b=keys[ids[(j+1)%3]],key=Math.min(a,b)+':'+Math.max(a,b),edge=edges.get(key)||{n:0,d:0};edge.n++;edge.d+=a<b?1:-1;edges.set(key,edge);}}
    const badEdges=[...edges.values()].filter(x=>x.n!==2||x.d!==0).length;if(badEdges||minArea<=f.context.ht*f.context.ht*1e-13||volume<=0)failures.push({tag:m.userData.dinoHadrosaurDistalElement,badEdges,minArea,volume});
    const plantar=m.geometry.userData.dinoHadrosaurPlantarFace;if(plantar){let area=0;for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));if([a,b,c].every(v=>Math.abs(v.y-plantar.plane)<f.context.ht*1e-6))area+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;}expect(area,m.name+' real planar plantar triangles').toBeGreaterThan(f.context.ht*f.context.ht*1e-5);}
   }expect(failures).toEqual([]);
  }finally{f.dispose();}
 });
 it('uses identical metadata in actual Life-only and Bone-only distal builders',()=>{
  for(const id of ids){const a=native.build(id,1,'bone'),b=native.build(id,1,'life');try{expect(a.model.userData.dinoHadrosaurExtremities).toEqual(b.model.userData.dinoHadrosaurExtremities);expect(a.bones.length).toBeGreaterThan(30);expect(a.life).toHaveLength(0);expect(b.life.length).toBeGreaterThan(15);expect(b.bones).toHaveLength(0);}finally{a.dispose();b.dispose();}}
 });
 it('mirrors the actual native ray bones and Life envelopes across the midline',()=>{
  const f=native.build('edmontosaurus');try{for(const a of f.meshes.filter(m=>m.userData.dinoHadrosaurDistalElement.side===1)){const tag=a.userData.dinoHadrosaurDistalElement,b=f.meshes.find(m=>{const t=m.userData.dinoHadrosaurDistalElement;return t.side===-1&&t.front===tag.front&&t.ray===tag.ray&&t.element===tag.element&&t.layer===tag.layer;});expect(b).toBeDefined();const p=a.geometry.attributes.position,q=b.geometry.attributes.position,keys=new Set(Array.from({length:q.count},(_,i)=>[q.getX(i),q.getY(i),-q.getZ(i)].map(v=>Math.round(v/(f.context.ht*1e-6))).join(',')));for(let i=0;i<p.count;i++)expect(keys.has([p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/(f.context.ht*1e-6))).join(',')),a.name).toBe(true);}}finally{f.dispose();}
 });
 it('retains Edmontosaurus local cranial geometry while translating its connected head and neck',()=>{
  const path='tests/fixtures/dinolab_hadrosaur_cranium_preserved.json';
  // Fixture authoring alone reads the archived source. Ordinary clean-checkout
  // tests compare actual native geometry with the permanent immutable record.
  if(process.env.DINO_HADROSAUR_GENERATE_CRANIAL_FIXTURE==='1'){
   const previousSource=readFileSync(process.env.DINO_HADROSAUR_BASELINE_SOURCE||'tmp/dinolab-hadrosaur-extremities/before.js','utf8'),sourceHash=createHash('sha256').update(previousSource).digest('hex');
   expect(sourceHash).toBe('4831937ee7c95260084fc5dac0fae6b623ee1ba83f0ab1ee56ced1d27b7abae9');
   const baseline=nativeLambeosaurBodyHarness(previousSource),f=baseline.build('edmontosaurus');
   try{const c=f.context,p=c.headShell.geometry.attributes.position,positions=[];f.model.updateMatrixWorld(true);
    for(let i=0;i<p.count;i++)positions.push(...c.model.worldToLocal(vec().fromBufferAttribute(p,i).applyMatrix4(c.headShell.matrixWorld)).sub(c.head).toArray());
    writeFileSync(path,JSON.stringify({sourceHash,species:'edmontosaurus',anchors:Object.fromEntries(['hip','shoulder','head','tail'].map(key=>[key,c[key].toArray()])),cranialSurface:c.cranialSurface,snoutOffset:c.snout.clone().sub(c.head).toArray(),skin:{positions,indices:Array.from(c.headShell.geometry.index.array)},neck:{relativeToHead:c.neckPoints.map(point=>point.clone().sub(c.head).toArray()),radii:c.neckRadii}},null,2)+'\n');
   }finally{f.dispose();}
  }
  const previous=JSON.parse(readFileSync(path,'utf8'));expect(previous.sourceHash).toBe('4831937ee7c95260084fc5dac0fae6b623ee1ba83f0ab1ee56ced1d27b7abae9');expect(previous.species).toBe('edmontosaurus');
  const current=nativeLambeosaurBodyHarness(source),f=current.build('edmontosaurus');
  try{const newer=f.context,headRise=newer.head.y-previous.anchors.head[1];expect(headRise).toBeGreaterThan(0);expect(headRise).toBeCloseTo(newer.shoulder.y-previous.anchors.shoulder[1],12);
   expect(newer.cranialSurface).toEqual(previous.cranialSurface);expect(newer.snout.clone().sub(newer.head).distanceTo(vec(...previous.snoutOffset))).toBeLessThan(newer.ht*1e-12);
   const q=newer.headShell.geometry.attributes.position;expect(q.count*3).toBe(previous.skin.positions.length);expect(Array.from(newer.headShell.geometry.index.array)).toEqual(previous.skin.indices);
   for(let i=0;i<q.count;i++){const x=vec(...previous.skin.positions.slice(i*3,i*3+3)),y=newer.model.worldToLocal(vec().fromBufferAttribute(q,i).applyMatrix4(newer.headShell.matrixWorld)).sub(newer.head);expect(x.distanceTo(y),'actual head-skin vertex relative to cranial anchor').toBeLessThan(newer.ht*1e-6);}
   expect(newer.neckPoints).toHaveLength(previous.neck.relativeToHead.length);expect(newer.neckRadii).toEqual(previous.neck.radii);
   for(let i=0;i<newer.neckPoints.length;i++)expect(newer.neckPoints[i].clone().sub(newer.head).distanceTo(vec(...previous.neck.relativeToHead[i]))).toBeLessThan(newer.ht*1e-12);
  }finally{f.dispose();}
 });
 it('preserves frozen bodies and contacts while truthfully re-solving the authored Edmontosaurus resting pose',()=>{
  const path='tests/fixtures/dinolab_hadrosaur_extremities_preserved.json';
  if(process.env.DINO_HADROSAUR_GENERATE_FIXTURE){const before=readFileSync('tmp/dinolab-hadrosaur-extremities/before.js','utf8'),old=nativeHadrosaurExtremitiesHarness(before),values={};for(const id of ids){const f=old.build(id);try{values[id]=preserve(f);}finally{f.dispose();}}writeFileSync(path,JSON.stringify({sourceHash:createHash('sha256').update(before).digest('hex'),species:values},null,2));}
  const fixture=JSON.parse(readFileSync(path,'utf8'));expect(fixture.sourceHash).toBe('4831937ee7c95260084fc5dac0fae6b623ee1ba83f0ab1ee56ced1d27b7abae9');for(const id of ids){const f=native.build(id);try{
   const actual=preserve(f),before=fixture.species[id];
   if(id!=='edmontosaurus'){expect(actual,id).toEqual(before);continue;}
   // Keep the immutable483 fixture. Edm now raises its connected body frame
   // and solves a moderate supporting stance; retained contacts, transverse
   // landmarks, proportions and local cranial anatomy remain testable.
   const {anchors:oldAnchors,limbs:oldLimbs,...oldBody}=before.anatomy,{anchors:newAnchors,limbs:newLimbs,...newBody}=actual.anatomy;
   expect(newBody).toEqual(oldBody);expect(actual.body).not.toBe(before.body);expect(actual.tail).not.toBe(before.tail);expect(actual.contacts).toEqual(before.contacts);
   for(const key of ['hip','shoulder','head','tail']){expect(newAnchors[key][0]).toBe(oldAnchors[key][0]);expect(newAnchors[key][2]).toBe(oldAnchors[key][2]);expect(newAnchors[key][1]).toBeGreaterThan(oldAnchors[key][1]);}
   expect(newAnchors.head[1]-oldAnchors.head[1]).toBeCloseTo(newAnchors.shoulder[1]-oldAnchors.shoulder[1],12);
   expect(newAnchors.tail[1]-oldAnchors.tail[1]).toBeCloseTo(newAnchors.hip[1]-oldAnchors.hip[1],12);
   expect(actual.upperBones).not.toBe(before.upperBones);expect(newLimbs).toHaveLength(4);
   const profile=native.art.dinoOrnithopodBodyProfileFor(f.context.dn);
   for(const limb of newLimbs){const old=oldLimbs.find(l=>l.front===limb.front&&l.side===limb.side),distal=f.model.userData.dinoHadrosaurExtremities.limbs.find(l=>l.front===limb.front&&l.side===limb.side);
    expect(limb.top[0]).toBe(old.top[0]);expect(limb.top[2]).toBe(old.top[2]);expect(limb.top[1]).toBeGreaterThan(old.top[1]);expect(limb.contact).toEqual(old.contact);expect(limb.foot).toEqual(old.foot);expect(limb.distal[2]).toBe(old.distal[2]);
    expect(limb.joint).not.toEqual(old.joint);expect(limb.distal).not.toEqual(old.distal);expect(limb.knee).toEqual(limb.joint);expect(limb.ankle).toEqual(limb.distal);expect(distal.ankle).toEqual(limb.distal);expect(distal.root).toEqual(old.contact);
    const upper=f.upper.find(r=>r.name==='addLongBone'&&r.args[0].equals(vec(...limb.top))),lower=f.upper.find(r=>r.name==='addLongBone'&&r.args[0].equals(vec(...limb.joint)));
    expect(upper).toBeDefined();expect(lower).toBeDefined();expect(upper.args[1].toArray()).toEqual(limb.joint);expect(lower.args[1].toArray()).toEqual(limb.distal);
    const ratio=lower.args[0].distanceTo(lower.args[1])/upper.args[0].distanceTo(upper.args[1]);expect(ratio).toBeCloseTo(limb.front?profile.radiusHumerus:profile.tibiaFemur,12);
    expect(limb.front?limb.joint[0]>limb.top[0]:limb.joint[0]<limb.top[0]).toBe(true);
    for(const record of [upper,lower]){const mesh=record.meshes.find(m=>m.userData.dinoLongBone),meta=mesh.geometry.userData.dinoLongBone,p=mesh.geometry.attributes.position,first=(meta.lengthSegments+1)*meta.radialSegments;
     const a=vec().fromBufferAttribute(p,first),b=vec().fromBufferAttribute(p,first+meta.radialSegments+1);expect(a.distanceTo(record.args[0])).toBeLessThan(f.context.ht*1e-6);expect(b.distanceTo(record.args[1])).toBeLessThan(f.context.ht*1e-6);
     expect((a.y-b.y)/a.distanceTo(b),'actual supporting long-bone cap axis').toBeGreaterThan(.60);
    }
   }
   // Read the cap-center vertices from the actual new shaft solids, rather
   // than proving uprightness from copied metadata. The supporting manual
   // II-IV bundle and all three metatarsals rise more than they drift in XZ.
   const supporting=f.bones.filter(m=>{const t=m.userData.dinoHadrosaurDistalElement;return /metacarpal|metatarsal/.test(t.element)&&(!t.front||t.ray!==5);});expect(supporting).toHaveLength(12);
   for(const m of supporting){const p=m.geometry.attributes.position,uv=m.geometry.attributes.uv,a=vec().fromBufferAttribute(p,p.count-2),b=vec().fromBufferAttribute(p,p.count-1);expect(uv.getX(p.count-2)).toBe(0);expect(uv.getX(p.count-1)).toBe(1);expect(a.y-b.y,m.name+' actual supporting shaft rise').toBeGreaterThan(Math.hypot(a.x-b.x,a.z-b.z));}
   expect(native.art.dinoHadrosaurExtremitiesProfileFor(f.context.dn).uncertainty).toContain('not measured sagittal motion limits');
  }finally{f.dispose();}}
 });
});
