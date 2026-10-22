import {describe,it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeLambeosaurBodyHarness,THREE,vec} from './helpers/dino_native_lambeosaur_body_harness.js';
import {nativeMeshContains} from './helpers/dino_native_mesh_contains.js';

const source=readFileSync(process.env.DINO_LAMBEOSAUR_BODY_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
const native=nativeLambeosaurBodyHarness(source),ids=['parasaurolophus','corythosaurus','lambeosaurus','olorotitan'];
const hashMesh=m=>({position:m.position.toArray(),quaternion:m.quaternion.toArray(),scale:m.scale.toArray(),positions:createHash('sha256').update(Buffer.from(m.geometry.attributes.position.array.buffer)).digest('hex'),indices:createHash('sha256').update(Buffer.from(m.geometry.index.array.buffer)).digest('hex')});
function cranialSignature(harness,id){const f=harness.build(id);try{const c=f.context,scale=c.reconstructionProfile.head,material=c.bodyMat;
 const display=harness.art.dinoCranialDisplayProfile(THREE,c.dn,c.head,c.snout,Math.max(.20*c.detailScale,c.len*.066)*scale,Math.max(.045*c.detailScale,c.ht*.058)*scale,Math.max(.035*c.detailScale,c.ht*.058)*scale,c.detailScale,false);
 const vault=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);vault.position.copy(display.vaultCenter);vault.scale.copy(display.vaultScale);f.model.add(vault);
 const life=harness.art.dinoAddLambeosaurCrest(THREE,c.dn,f.model,c.head,c.len,c.ht,scale,material,false,c.headShell),bone=harness.art.dinoAddLambeosaurCrest(THREE,c.dn,f.model,c.head,c.len,c.ht,scale,material,true,vault);
 return {head:c.head.toArray(),snout:c.snout.toArray(),skin:hashMesh(c.headShell),life:hashMesh(life),bone:hashMesh(bone)};
 }finally{f.dispose();}}
describe('Native comparative lambeosaur full bodies',()=>{
 it('preserves frozen baseline head, snout, cranial skin and both reviewed crest buffers',()=>{
  const path='tests/fixtures/dinolab_lambeosaur_body_preserved.json';
  if(process.env.DINO_LAMBEOSAUR_GENERATE_FIXTURE){const before=readFileSync('tmp/dinolab-lambeosaur-body/before.js','utf8'),baseline=nativeLambeosaurBodyHarness(before);writeFileSync(path,JSON.stringify({sourceHash:createHash('sha256').update(before).digest('hex'),species:Object.fromEntries(ids.map(id=>[id,cranialSignature(baseline,id)]))},null,2));}
  const fixture=JSON.parse(readFileSync(path,'utf8'));expect(fixture.sourceHash).toBe('ff64c32240de2ba19e88a2395bdebf668a46a317d4951022727fe6b842e0e59c');
  for(const id of ids)expect(cranialSignature(native,id),id).toEqual(fixture.species[id]);
 });
 it('gates exact four profiles and declares specimen limits without exact dimensions',()=>{
  for(const dn of native.art.DINOS){const p=native.art.dinoLambeosaurBodyProfileFor(dn);if(!ids.includes(dn.id)){expect(p,dn.id).toBeNull();continue;}expect(p.sources).toHaveLength(4);expect(p.authoredDimensions).toBe(true);expect(p.referenceDimensions).toBeNull();expect(p.sampledSeries).toBe(true);expect(p.specimen.length).toBeGreaterThan(10);expect(p.uncertainty.length).toBeGreaterThan(80);}
  expect(native.art.dinoLambeosaurBodyProfileFor(null)).toBeNull();
  for(const id of ids)expect(native.art.dinoLambeosaurBodyProfileFor({id,group:'other'})).toBeNull();
 });
 for(const id of ids)for(const scale of [.05,1,6])it(id+' actual axial, cage, girdle and limb bones are enclosed at scale '+scale,()=>{
  const f=native.build(id,scale,'both',.88,scale===6),c=f.context;
  try{
   const meta=f.model.userData.dinoFullBodyAnatomy;expect(meta.species).toBe(id);expect(meta.family).toBe('ornithopods');expect(meta.limbs).toHaveLength(4);expect(c.hip.y).toBeGreaterThan(c.shoulder.y);
   const regions=new Set(f.bone.map(m=>m.userData.dinoLambeosaurBodyElement.region));expect([...regions].sort()).toEqual(['girdle','limbs','neck','tail','trunk']);
   for(const mesh of f.bone){const station=mesh.userData.dinoLambeosaurAxisStation;if(!station)continue;const region=station.region==='cervical'?'neck':station.region==='caudal'?'tail':'torso',curve=new THREE.CatmullRomCurve3(meta.axial[region].map(p=>vec(...p)),false,'centripetal'),actual=c.model.worldToLocal(mesh.getWorldPosition(vec()));expect(actual.distanceTo(curve.getPoint(station.t))).toBeLessThan(c.ht*1e-8);}
   for(const limb of f.records.limbs){const record=meta.limbs.find(x=>x.front===limb.front&&x.side===limb.side),long=limb.bones.filter(x=>x.kind==='addLongBone');expect(record.top).toEqual(long[0].args[0].toArray());expect(record.knee).toEqual(long[0].args[1].toArray());expect(record.ankle).toEqual(long[1].args[1].toArray());expect(record.foot).toEqual(f.records.distal.find(x=>x.kind==='addDigitFan'&&x.args[1]===limb.front&&x.args[2]===limb.side).args[0].toArray());expect(limb.front?record.knee[0]>record.top[0]:record.knee[0]<record.top[0]).toBe(true);}
   expect(f.contacts).toHaveLength(4);for(const contact of f.contacts)expect(Math.abs(c.model.worldToLocal(contact.point.clone().applyMatrix4(c.model.matrixWorld)).y-c.ht*.01)).toBeLessThan(c.ht*1e-8);
   const distal=f.records.distal.filter(row=>row.kind==='addSoftTissueDigitFan').flatMap(row=>row.meshes).filter(m=>!m.userData.dinoContour);
   const coverings=[...f.skin,c.headShell,...distal].map(m=>{const contains=nativeMeshContains(m,c.ht*2e-6),box=new THREE.Box3().setFromObject(m).expandByScalar(c.ht*2e-6);return point=>box.containsPoint(point)&&contains(point);}),failures=[];
   for(const m of f.bone){const p=m.geometry.attributes.position,ix=m.geometry.index;const check=(v,kind)=>{if(!coverings.some(contains=>contains(v)))failures.push({tag:m.userData.dinoLambeosaurBodyElement,kind,p:v.toArray()});};
    for(let i=0;i<p.count;i++)check(vec().fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld),'vertex');
    // Broad girdle surfaces need actual triangle interiors and edges as well.
    if(m.userData.dinoLambeosaurBodyElement.region==='girdle')for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)).applyMatrix4(m.matrixWorld),b=vec().fromBufferAttribute(p,ix.getX(i+1)).applyMatrix4(m.matrixWorld),v=vec().fromBufferAttribute(p,ix.getX(i+2)).applyMatrix4(m.matrixWorld);check(a.clone().add(b).add(v).multiplyScalar(1/3),'face');check(a.clone().lerp(b,.5),'edge');}
   }
   if(process.env.DINO_LAMBEOSAUR_DIAGNOSTICS){const grouped={};for(const item of failures){const key=item.tag.region+'/'+item.tag.element;const row=grouped[key]||(grouped[key]={count:0,examples:[]});row.count++;if(row.examples.length<3)row.examples.push(item);}writeFileSync(process.env.DINO_LAMBEOSAUR_DIAGNOSTICS,JSON.stringify({id,scale,count:failures.length,grouped},null,2));}
   expect(failures.slice(0,12),'exposed actual bone samples '+failures.length).toEqual([]);
   for(const m of f.tagged)for(const attr of ['position','normal'])expect(Array.from(m.geometry.attributes[attr].array).every(Number.isFinite)).toBe(true);
  }finally{f.dispose();}
 },60000);
 it('makes Olorotitan neck longer without changing the cranial anchor',()=>{
  const values=ids.map(id=>{const f=native.build(id);try{const c=f.context;expect(c.head.toArray()).toEqual(c.lambeosaurBody.metadata.anchors.head);return {id,span:c.shoulder.distanceTo(c.head)/c.len};}finally{f.dispose();}});
  expect(values.find(x=>x.id==='olorotitan').span).toBeGreaterThan(Math.max(...values.filter(x=>x.id!=='olorotitan').map(x=>x.span))*1.15);
 });
 it('uses the same actual four-limb and axial frame in Bone-only and Life-only builders',()=>{
  for(const id of ids){const bone=native.build(id,1,'bone'),life=native.build(id,1,'life');try{
   expect(bone.model.userData.dinoFullBodyAnatomy).toEqual(life.model.userData.dinoFullBodyAnatomy);
   expect(bone.tagged.length).toBeGreaterThan(50);expect(life.tagged.length).toBeGreaterThan(6);
   expect(bone.tagged.every(m=>m.userData.dinoLambeosaurBodyElement.layer==='bone')).toBe(true);
   expect(life.tagged.every(m=>m.userData.dinoLambeosaurBodyElement.layer==='life')).toBe(true);
   for(const limb of bone.records.limbs){expect(limb.skin).toBeNull();expect(limb.bones.flatMap(x=>x.meshes).length).toBeGreaterThan(5);}
   for(const limb of life.records.limbs){expect(limb.skin).not.toBeNull();expect(limb.bones.flatMap(x=>x.meshes)).toHaveLength(0);}
  }finally{bone.dispose();life.dispose();}}
 });
 it('builds closed, outward and nondegenerate new blades, rib tubes and Life skins',()=>{
  const f=native.build('corythosaurus');try{
   const meshes=f.tagged.filter(m=>m.userData.dinoLambeosaurBodyElement.layer==='life'||! /sampled-|limb-bones/.test(m.userData.dinoLambeosaurBodyElement.element));
   const failures=[];
   for(const mesh of meshes){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,edges=new Map(),weld=new Map(),keys=[];let volume=0,minArea=Infinity;
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v/(f.context.ht*1e-7))).join(',');if(!weld.has(key))weld.set(key,weld.size);keys.push(weld.get(key));}
    for(let i=0;i<ix.count;i+=3){const indices=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],a=vec().fromBufferAttribute(p,indices[0]),b=vec().fromBufferAttribute(p,indices[1]),c=vec().fromBufferAttribute(p,indices[2]);const area=b.clone().sub(a).cross(c.clone().sub(a)).length();minArea=Math.min(minArea,area);volume+=a.dot(b.clone().cross(c))/6;
     for(let j=0;j<3;j++){const x=keys[indices[j]],y=keys[indices[(j+1)%3]],key=Math.min(x,y)+':'+Math.max(x,y),record=edges.get(key)||{count:0,balance:0};record.count++;record.balance+=x<y?1:-1;edges.set(key,record);}
    }
    const badEdges=[...edges.values()].filter(e=>e.count!==2||e.balance!==0).length;
    if(badEdges||minArea<=f.context.ht*f.context.ht*1e-13||volume<=0)failures.push({tag:mesh.userData.dinoLambeosaurBodyElement,badEdges,minArea,volume});
   }
   expect(failures).toEqual([]);
  }finally{f.dispose();}
 });
});
