import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baseline=process.env.CEPHALOPOD_PASS73_BASELINE?readFileSync(process.env.CEPHALOPOD_PASS73_BASELINE,'utf8'):require('./helpers/cephalopod_pass73_reference.cjs').restorePass73Source(source);
function factory(s){const a=s.indexOf('function createCLHuntAnimal('),b=s.indexOf('// Compact, individually owned prey rig.',a);assert.ok(a>=0&&b>a);return new Function('T','species','Math',s.slice(a,b)+';return createCLHuntAnimal(T,species);');}
const build=factory(source),prior=factory(baseline),math=Object.assign(Object.create(Math),{random(){throw Error('Body refuge frame consumed dive RNG');}});
const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto'],swimmers=['humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const collisionSource=source.slice(source.indexOf('function createCLHuntRockCollisionFootprint('),source.indexOf('// Small rock-rooted fragments'));
const collision=new Function(collisionSource+';return{footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
const state=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',display:false,reducedMotion:true,squeezeBlend:1,refugeHideBlend:1,refugePeekBlend:0,...extra});
// Pass74 reef head, eye and arm tip/curl anatomy is gated on reefMantle (orbital_form, arm_tip_form,
// living_arm_motion). Exact comparisons with the Pass73 baseline turn only those gates off.
const gatedBuild=factory(require('./helpers/cephalopod_pass74_reference.cjs').withoutPass74ReefAnatomy(source));
function rig(id='commonOcto',old=false,gated=false){return(old?prior:gated?gatedBuild:build)(T,{id,bodyColor:0x99775d},math);}
// Compare digests: a failing deepEqual on these multi-megabyte snapshots exhausts the worker heap.
const digest=rows=>require('node:crypto').createHash('sha256').update(JSON.stringify(rows)).digest('hex');
function release(a){const gs=new Set(),ms=new Set();a.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
function corridor(width=.30){const rocks=[-1,1].map(sign=>{const r=new T.Mesh(new T.BoxGeometry(2,2,3),new T.MeshBasicMaterial());r.position.set(sign*(1+width/2),1,0);r.updateMatrixWorld(true);return r;});const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(r=>collision.footprint(T,r)),1,'commonOcto',0,.55);for(const r of rocks){r.geometry.dispose();r.material.dispose();}assert.ok(gap?.walls?.length===2);return gap;}
function pose(a,s=state()){a.arms.forEach(l=>l.compressCurrent=.55);a.update(7,0,s);a.root.updateMatrixWorld(true);}
function body(a){return a.root.getObjectByName('cl-crevice-body');}
function bodyMeshes(a){const out=[];if(body(a))body(a).traverse(o=>{if(o.isMesh)out.push(o);});else a.root.traverse(o=>{if(o.isMesh&&['cl-mantle','cl-head','cl-eye-rim','cl-iris','cl-pupil','cl-eye-lid','cl-siphon-tube','cl-siphon-rim'].includes(o.name))out.push(o);});return out;}
function bounds(a,width=.3){let minY=Infinity,maxY=-Infinity,maxPenetration=0,penetrating=0,count=0;const p=new T.Vector3();for(const m of bodyMeshes(a)){const attr=m.geometry.attributes.position;for(let k=0;k<attr.count;k++){p.fromBufferAttribute(attr,k).applyMatrix4(m.matrixWorld);assert.ok(Number.isFinite(p.x+p.y+p.z));minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);if(Math.abs(p.z)<1.5){const depth=Math.max(0,Math.abs(p.x)-width/2);if(depth>1e-6)penetrating++;maxPenetration=Math.max(maxPenetration,depth);}count++;}}return{minY,maxY,penetrating,maxPenetration,count};}
function snapshot(a){const result=[];a.root.updateMatrixWorld(true);a.root.traverse(o=>{if(o.isMesh){result.push([o.name,o.matrixWorld.elements.slice(),...Object.entries(o.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)]),o.instanceMatrix?Array.from(o.instanceMatrix.array):null]);}});return result;}
function bodyVertices(a){const p=new T.Vector3(),out=[];for(const m of bodyMeshes(a)){const attr=m.geometry.attributes.position;for(let k=0;k<attr.count;k++){p.fromBufferAttribute(attr,k).applyMatrix4(m.matrixWorld);out.push(...p.toArray());}}return out;}
const distance=(a,b)=>a.reduce((m,x,i)=>Math.max(m,Math.abs(x-b[i])),0);
function finiteWallContacts(a,width=.3){const result={body:0,tubes:0,cups:0,web:0,total:0,maxDepth:0},p=new T.Vector3(),instance=new T.Matrix4(),world=new T.Matrix4();
 function sample(mesh,matrix,kind){const attr=mesh.geometry.attributes.position;for(let k=0;k<attr.count;k++){p.fromBufferAttribute(attr,k).applyMatrix4(matrix);assert.ok(Number.isFinite(p.x+p.y+p.z));result.total++;if(p.y<0||p.y>2||Math.abs(p.z)>=1.5-1e-6||Math.abs(p.x)>=2+width/2)continue;const depth=Math.max(0,Math.abs(p.x)-width/2);if(depth>1e-6){result[kind]++;result.maxDepth=Math.max(result.maxDepth,depth);}}}
 for(const mesh of bodyMeshes(a))sample(mesh,mesh.matrixWorld,'body');for(const arm of a.arms)sample(arm.mesh,arm.mesh.matrixWorld,'tubes');a.root.traverse(mesh=>{if(mesh.name==='cl-webbing')sample(mesh,mesh.matrixWorld,'web');if(mesh.isInstancedMesh&&mesh.name.includes('sucker'))for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,instance);world.multiplyMatrices(mesh.matrixWorld,instance);sample(mesh,world,'cups');}});return result;
}

describe('Pass73 passage-aligned octopus body posture',()=>{
 it('keeps real mantle, head, funnel, eyes and warning-ring vertices between settled straight walls',()=>{
  for(const id of ids)for(const yaw of [0,.73,Math.PI/2]){const a=rig(id),b=rig(id,true),width=id==='giantPacific'?.42:.3,s=state({crevice:corridor(width)});a.root.rotation.y=b.root.rotation.y=yaw;pose(a,s);pose(b,s);const before=bounds(b,width),after=bounds(a,width);assert.ok(before.penetrating>100,id+' baseline defect missing');assert.equal(after.penetrating,0,id+' yaw '+yaw+' depth '+after.maxPenetration);assert.ok(after.count>2000);release(a);release(b);}
 });
 it('keeps eye domes, lids and funnel in the same attached body frame',()=>{
  const a=rig();pose(a,state({crevice:corridor()}));const frame=body(a),names=[];frame.traverse(o=>{if(o.isMesh)names.push(o.name);});for(const name of ['cl-mantle','cl-head','cl-eye-rim','cl-iris','cl-pupil','cl-eye-lid'])assert.ok(names.includes(name),name);assert.ok(a.root.getObjectByName('cl-siphon').parent===frame);assert.ok(frame.matrix.determinant()>0.01);release(a);
 });
 it('lowers the settled silhouette without pushing its retained underside into the floor',()=>{
  for(const id of ids){const a=rig(id),s=state({crevice:corridor(id==='giantPacific'?.42:.3),refugeHideBlend:0});a.root.position.y=.55*a.scale;pose(a,s);const open=bounds(a);pose(a,{...s,refugeHideBlend:1});const tucked=bounds(a);assert.ok(tucked.maxY<open.maxY-.10*a.scale,id+' not visibly tucked');assert.ok(tucked.minY>=0,id+' body crossed floor');release(a);}
 });
 it('preserves all twelve ordinary mesh world matrices and geometry exactly',()=>{
  for(const id of [...ids,...swimmers]){const a=rig(id,false,true),b=rig(id,true);for(const s of [state({squeezeBlend:0}),state({moving:true,reducedMotion:false}),state({jet:true,moving:true,reducedMotion:false}),state({strike:.65,strikeAim:{x:.3,y:.1,z:1},strikeBrace:.5,reducedMotion:false})]){a.update(7,.05,s);b.update(7,.05,s);assert.equal(digest(snapshot(a)),digest(snapshot(b)),id);}release(a);release(b);}
 });
 it('does not change swimmer species when refuge inputs are supplied accidentally',()=>{
  for(const id of swimmers){const a=rig(id),b=rig(id,true),s=state({crevice:corridor()});pose(a,s);pose(b,s);assert.deepEqual(snapshot(a),snapshot(b),id);assert.equal(body(a),undefined);release(a);release(b);}
 });
 it('holds dt-zero and reduced-motion postures and retained GPU resource identities',()=>{
  const a=rig('giantPacific'),s=state({crevice:corridor(.42)});pose(a,s);const before=snapshot(a),resources=[];a.root.traverse(o=>{if(o.isMesh)resources.push([o,o.geometry,o.material,Object.values(o.geometry.attributes).map(v=>v.array)]);});for(let n=0;n<4;n++){pose(a,s);assert.deepEqual(snapshot(a),before);}for(const [o,g,m,arrays]of resources){assert.equal(o.geometry,g);assert.equal(o.material,m);Object.values(g.attributes).forEach((v,i)=>assert.equal(v.array,arrays[i]));}release(a);
 });
 it('releases the complete body frame after clearing either finite mouth',()=>{
  for(const z of [-4,4]){const a=rig();pose(a,state({crevice:corridor()}));a.root.position.z=z;pose(a,state({crevice:null}));assert.ok(body(a).matrix.equals(new T.Matrix4()));release(a);}
 });
 it('eases the common body frame continuously as it emerges through a finite mouth',()=>{
  const a=rig(),s=state({crevice:corridor()});pose(a,s);let previous=body(a).matrix.elements.slice();for(let z=.02;z<=4;z+=.02){a.root.position.z=z;pose(a,{...s,crevice:null});const current=body(a).matrix.elements.slice();assert.ok(distance(current,previous)<.025,'Mouth transition jumped at '+z);previous=current;}assert.ok(body(a).matrix.equals(new T.Matrix4()));release(a);
 });
 it('uses translated and rotated finite passage metadata in the same physical frame',()=>{
  const a=rig(),b=rig(),plain=corridor(),turned=corridor(),angle=.91,rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),p=new T.Vector3();
  for(const w of turned.walls){p.set(w.nx,0,w.nz).applyQuaternion(rotation);w.nx=p.x;w.nz=p.z;for(const prefix of ['a','b']){p.set(w[prefix+'x'],0,w[prefix+'z']).applyQuaternion(rotation);w[prefix+'x']=p.x+17;w[prefix+'z']=p.z-23;}}b.root.position.set(17,0,-23);b.root.quaternion.copy(rotation);pose(a,state({crevice:plain}));pose(b,state({crevice:turned}));assert.ok(distance(body(a).matrix.elements,body(b).matrix.elements)<1e-10);release(a);release(b);
 });
 it('rejects malformed wall metadata without stale body transforms or invalid normals',()=>{
  const first=corridor().walls[0],second=corridor().walls[1];for(const crevice of [{width:.3,walls:[{...first,nx:NaN},second]},{width:.3,walls:[{...first,bx:first.ax,bz:first.az},second]},{width:.3,walls:[first,{...second,nx:first.nx,nz:first.nz}]},{width:Infinity,walls:[first,second]}]){const a=rig('commonOcto',false,true),b=rig('commonOcto',true);pose(a,state({crevice:corridor()}));pose(a,state({crevice}));pose(b);assert.ok(body(a).matrix.equals(new T.Matrix4()));assert.equal(digest(snapshot(a)),digest(snapshot(b)));for(const m of bodyMeshes(a))for(const normal of m.geometry.attributes.normal.array)assert.ok(Number.isFinite(normal));release(a);release(b);}
 });
 it('keeps wall clearance and a continuous body transform through a full turn',()=>{
  const a=rig(),s=state({crevice:corridor()});pose(a,s);let previous=body(a).matrix.elements.slice();for(let yaw=.02;yaw<Math.PI*2;yaw+=.02){a.root.rotation.y=yaw;pose(a,s);assert.equal(bounds(a).penetrating,0,'yaw '+yaw);const current=body(a).matrix.elements.slice();assert.ok(distance(current,previous)<.04,'Body flipped at yaw '+yaw);previous=current;}release(a);
 });
 it('keeps actual body, arm, web and cup vertices clear at both partial mouths despite low or zero input blend',()=>{
  for(const id of ids)for(const direction of [-1,1])for(const yaw of [0,.73]){const a=rig(id),width=id==='giantPacific'?.42:.3,gap=corridor(width);a.root.rotation.y=yaw;a.root.position.y=.55*a.scale;pose(a,state({crevice:gap}));for(const z of [1.40,1.55,1.72,1.90,2.10])for(const blend of [1,.10,0]){a.root.position.z=direction*z;pose(a,state({crevice:null,squeezeBlend:blend,refugeHideBlend:0}));const contact=finiteWallContacts(a,width);assert.equal(contact.body+contact.tubes+contact.cups+contact.web,0,id+' z '+a.root.position.z+' yaw '+yaw+' blend '+blend+' '+JSON.stringify(contact));assert.ok(contact.total>16000);}release(a);}
 });
 it('retains safe cached contact at zero blend and restores ordinary surfaces after the complete animal clears',()=>{
  const a=rig(),b=rig(),gap=corridor();pose(a,state({crevice:gap}));pose(a,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));assert.ok(!body(a).matrix.equals(new T.Matrix4()));assert.equal(finiteWallContacts(a).body+finiteWallContacts(a).cups,0);a.root.position.z=b.root.position.z=6;pose(a,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));pose(b,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));assert.deepEqual(snapshot(a),snapshot(b));release(a);release(b);
 });
 it('releases cached body and arm folding after ascending clear of actual rock heights',()=>{
  const a=rig(),b=rig(),gap=corridor();assert.ok(gap.walls.every(w=>w.minY===0&&w.maxY===2));pose(a,state({crevice:gap}));a.root.position.y=b.root.position.y=5.5;pose(a,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));pose(b,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));assert.deepEqual(snapshot(a),snapshot(b));release(a);release(b);
 });
 it('retires the old corridor frame on a side departure without pulling arm roots back through rock',()=>{
  const a=rig(),b=rig(),gap=corridor();pose(a,state({crevice:gap}));a.root.position.set(3,.55,2.5);b.root.position.copy(a.root.position);pose(a,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));pose(b,state({crevice:null,squeezeBlend:0,refugeHideBlend:0}));assert.ok(body(a).matrix.equals(new T.Matrix4()));assert.deepEqual(snapshot(a),snapshot(b));release(a);release(b);
 });
 it('keeps all sampled surfaces safe through a millimetre retreat scan while input compression eases to zero',()=>{
  const a=rig(),gap=corridor();a.root.position.set(0,.55,-1.349);pose(a,state({crevice:gap,refugeHideBlend:0}));let previous=body(a).matrix.elements.slice(),minSegment=Infinity;
  for(let mm=1350;mm<=1950;mm++){a.root.position.z=-mm/1000;pose(a,state({crevice:null,squeezeBlend:Math.max(0,(1650-mm)/300),refugeHideBlend:0}));if(mm%10===0){const contact=finiteWallContacts(a);assert.equal(contact.body+contact.tubes+contact.cups+contact.web,0,'mm '+mm+' '+JSON.stringify(contact));}for(const arm of a.arms)for(let j=1;j<arm.points.length;j++)minSegment=Math.min(minSegment,arm.points[j].distanceTo(arm.points[j-1]));const current=body(a).matrix.elements.slice();assert.ok(distance(current,previous)<.01,'Body release jumped at '+mm);previous=current;}
  assert.ok(minSegment>.001);release(a);
 });
});
