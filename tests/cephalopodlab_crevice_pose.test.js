import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baseline=process.env.CEPHALOPOD_PASS72_BASELINE?readFileSync(process.env.CEPHALOPOD_PASS72_BASELINE,'utf8'):require('./helpers/cephalopod_pass72_reference.cjs').restorePass72Source(source);
function factory(s){const a=s.indexOf('function createCLHuntAnimal('),b=s.indexOf('// Compact, individually owned prey rig.',a);assert.ok(a>=0&&b>a);return new Function('T','species','Math',s.slice(a,b)+';return createCLHuntAnimal(T,species);');}
const build=factory(source),prior=factory(baseline),math=Object.assign(Object.create(Math),{random(){throw Error('Refuge pose consumed dive RNG');}});
const geometry=source.slice(source.indexOf('function createCLHuntRockCollisionFootprint('),source.indexOf('// Small rock-rooted fragments'));
const collision=new Function(geometry+';return{footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:true,squeezeBlend:1,...extra});
const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto'];
function rig(id='commonOcto',old=false){const animal=(old?prior:build)(T,{id,bodyColor:0x99775d},math);animal.root.position.y=.55*animal.scale;return animal;}
function release(a){const gs=new Set(),ms=new Set();a.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function corridor(width=.30){const rocks=[-1,1].map(sign=>{const r=new T.Mesh(new T.BoxGeometry(2,2,3),new T.MeshBasicMaterial());r.position.set(sign*(1+width/2),1,0);r.updateMatrixWorld(true);return r;});const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(r=>collision.footprint(T,r)),1,'commonOcto',0,.55);for(const r of rocks){r.geometry.dispose();r.material.dispose();}assert.ok(gap&&gap.walls?.length===2,'Actual movement detector must deliver finite wall segments');return gap;}
function pose(a,s=state()){a.arms.forEach(l=>l.compressCurrent=.55);a.update(7,0,s);}
function hash(a){const h=createHash('sha256');a.root.traverse(o=>{if(o.geometry)for(const [k,v]of Object.entries(o.geometry.attributes)){h.update(k);h.update(Buffer.from(v.array.buffer,v.array.byteOffset,v.array.byteLength));}if(o.instanceMatrix)h.update(Buffer.from(o.instanceMatrix.array.buffer));});return h.digest('hex');}
function points(a){return a.arms.flatMap(l=>l.points.flatMap(p=>p.toArray()));}
function delta(a,b){let max=0;for(let i=0;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-b[i]));return max;}
function contactStats(a,width){let penetrating=0,maxDepth=0,minSegment=Infinity,vertices=0;const p=new T.Vector3(),matrix=new T.Matrix4(),world=new T.Matrix4();a.root.updateMatrixWorld(true);
 function sample(mesh,transform){const attr=mesh.geometry.attributes.position;for(let k=0;k<attr.count;k++){p.fromBufferAttribute(attr,k).applyMatrix4(transform);assert.ok(Number.isFinite(p.x+p.y+p.z));vertices++;if(Math.abs(p.z)<1.5){const depth=Math.max(0,Math.abs(p.x)-width/2);if(depth>1e-6)penetrating++;maxDepth=Math.max(maxDepth,depth);}}}
 for(const l of a.arms){for(let j=1;j<l.points.length;j++)minSegment=Math.min(minSegment,l.points[j].distanceTo(l.points[j-1]));sample(l.mesh,l.mesh.matrixWorld);for(const n of l.mesh.geometry.attributes.normal.array)assert.ok(Number.isFinite(n));}
 a.root.traverse(o=>{if(o.name==='cl-webbing')sample(o,o.matrixWorld);if(o.isInstancedMesh&&o.name.includes('sucker'))for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);world.multiplyMatrices(o.matrixWorld,matrix);sample(o,world);}});
 return{penetrating,maxDepth,minSegment,vertices};
}

describe('Pass72 passage-aware octopus arm folding',()=>{
 it('keeps real arm, web and sucker vertices between straight walls across six body forms and headings',()=>{
  for(const id of ids)for(const yaw of [0,.73,Math.PI/2]){const a=rig(id),b=rig(id,true),width=id==='giantPacific'?.42:.30,s=state({crevice:corridor(width)});a.root.rotation.y=b.root.rotation.y=yaw;pose(a,s);pose(b,s);const before=contactStats(b,width),after=contactStats(a,width);assert.ok(before.penetrating>500,id+' baseline must expose the defect');assert.equal(after.penetrating,0,id+' yaw '+yaw+' depth '+after.maxDepth);assert.ok(after.minSegment>.005*a.scale,id+' flattened a tube segment');assert.ok(after.vertices>1500);release(a);release(b);}
 });
 it('preserves all twelve ordinary rigs byte for byte when no wall data is available',()=>{
  for(const id of [...ids,'humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus']){const a=rig(id),b=rig(id,true);for(const s of [state({squeezeBlend:0}),state({moving:true,reducedMotion:false}),state({jet:true,moving:true,reducedMotion:false}),state({strike:.65,strikeAim:{x:.3,y:.1,z:1},strikeBrace:.5,reducedMotion:false})]){a.update(7,.05,s);b.update(7,.05,s);assert.equal(hash(a),hash(b),id);}release(a);release(b);}
 });
 it('does not change any swimmer when refuge state is supplied accidentally',()=>{
  for(const id of ['humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus']){const a=rig(id),b=rig(id,true),s=state({crevice:corridor()});pose(a,s);pose(b,s);assert.equal(hash(a),hash(b),id);release(a);release(b);}
 });
 it('keeps frozen and reduced-motion arm buffers deterministic and retains mesh resources',()=>{
  const a=rig('giantPacific'),s=state({crevice:corridor(.42)});pose(a,s);const before=hash(a),resources=[];a.root.traverse(o=>{if(o.geometry)resources.push([o,o.geometry,o.material,Object.values(o.geometry.attributes).map(v=>v.array)]);});
  for(let i=0;i<4;i++){a.update(7,0,s);assert.equal(hash(a),before);}for(const [o,g,m,arrays]of resources){assert.equal(o.geometry,g);assert.equal(o.material,m);Object.values(g.attributes).forEach((v,i)=>assert.equal(v.array,arrays[i]));}assert.equal(contactStats(a,.42).penetrating,0);release(a);
 });
 it('retains safe finite wall contact through input easing and restores ordinary animation after the complete animal clears',()=>{
  const a=rig(),b=rig('commonOcto',true);pose(a,state({crevice:corridor()}));
  for(const blend of [1,.8,.5,.2,0]){pose(a,state({crevice:null,squeezeBlend:blend}));pose(b,state({squeezeBlend:blend}));assert.equal(contactStats(a,.30).penetrating,0,'The input clock must not unfold attached surfaces through rock');assert.ok(delta(points(a),points(b))>.01,'Contact must remain folded while the animal is still inside');}
  a.root.position.z=b.root.position.z=6;pose(a,state({crevice:null,squeezeBlend:0}));pose(b,state({squeezeBlend:0}));assert.equal(hash(a),hash(b));release(a);release(b);
 });
 it('releases every arm beyond finite mouths while retaining the cached exit frame',()=>{
  const a=rig(),b=rig('commonOcto',true);pose(a,state({crevice:corridor()}));a.root.position.z=b.root.position.z=4;pose(a,state({crevice:null}));pose(b);assert.equal(hash(a),hash(b));release(a);release(b);
 });
 it('rejects malformed planes instead of producing invalid geometry or a stale fold',()=>{
  const first=corridor().walls[0],second=corridor().walls[1];const malformed=[{width:.3,walls:[{...first,nx:NaN},second]},{width:.3,walls:[{...first,bx:first.ax,bz:first.az},second]},{width:.3,walls:[first,{...second,nx:first.nx,nz:first.nz}]},{width:Infinity,walls:corridor().walls}];
  for(const crevice of malformed){const a=rig(),b=rig('commonOcto',true);pose(a,state({crevice:corridor()}));pose(a,state({crevice}));pose(b);assert.equal(hash(a),hash(b));release(a);release(b);}
 });
 it('transforms actual wall segments to local rig coordinates after translation and rotation',()=>{
  const a=rig(),b=rig(),plain=corridor(),turned=corridor(),angle=.91,rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),p=new T.Vector3();
  for(const w of turned.walls){p.set(w.nx,0,w.nz).applyQuaternion(rotation);w.nx=p.x;w.nz=p.z;for(const prefix of ['a','b']){p.set(w[prefix+'x'],0,w[prefix+'z']).applyQuaternion(rotation);w[prefix+'x']=p.x+17;w[prefix+'z']=p.z-23;}}
  b.root.position.set(17,.55*b.scale,-23);b.root.quaternion.copy(rotation);pose(a,state({crevice:plain}));pose(b,state({crevice:turned}));assert.ok(delta(points(a),points(b))<1e-10);release(a);release(b);
 });
 it('keeps each arm bend direction continuous while the player turns inside a passage',()=>{
  const a=rig(),s=state({crevice:corridor()});pose(a,s);let previous=points(a);for(let yaw=.02;yaw<Math.PI*2;yaw+=.02){a.root.rotation.y=yaw;pose(a,s);const now=points(a);assert.ok(delta(now,previous)<.08,'Arm flipped at yaw '+yaw);previous=now;}release(a);
 });
});
