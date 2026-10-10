import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const {restorePass66Source}=require('./helpers/cephalopod_pass66_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),prior=restorePass66Source(source);
const ids=['commonOcto','blueRinged','giantPacific','mimicOcto','caribReef','coconutOcto'],owned=[];
const hash=s=>createHash('sha256').update(s).digest('hex');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Arm caps consumed dive RNG');}});
function factory(s){const a=s.indexOf('function createCLHuntAnimal('),b=s.indexOf('// Compact, individually owned prey rig.',a);assert.ok(a>=0&&b>a);return new Function('T','species','Math',s.slice(a,b)+';return createCLHuntAnimal(T,species);');}
// Keep the current mantle in this arm-tip comparison; its shape has a dedicated regression suite.
const build=factory(source),oldBuild=factory(require('./helpers/cephalopod_pass68_reference.cjs').applyPass68ModelSource(prior));
function rig(id='commonOcto',old=false){const a=(old?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);owned.push(a);return a;}
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
const point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i),normal=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.normal,i);
function snapshot(a,omitArms=false){const rows=[];a.root.traverse(o=>{if(omitArms&&/^cl-arm-\d+$/.test(o.name))return;const r=[o.name,o.type,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible];if(o.geometry)r.push(Object.entries(o.geometry.attributes).map(([n,v])=>[n,Array.from(v.array)]),o.geometry.index?Array.from(o.geometry.index.array):null,o.instanceMatrix?Array.from(o.instanceMatrix.array):null);rows.push(r);});return hash(JSON.stringify(rows));}
function assertUnchanged(a,b){
  assert.equal(snapshot(a,true),snapshot(b,true),'All non-arm anatomy and sucker matrices remain exact');
  assert.deepEqual(a.root.position.toArray(),b.root.position.toArray());
  for(let i=0;i<8;i++){
    const arm=a.arms[i],old=b.arms[i],g=arm.mesh.geometry,h=old.mesh.geometry;
    assert.deepEqual(Array.from(g.attributes.position.array.subarray(0,189*3)),Array.from(h.attributes.position.array));
    assert.deepEqual(Array.from(g.attributes.normal.array.subarray(0,189*3)),Array.from(h.attributes.normal.array));
    assert.deepEqual(Array.from(g.index.array.subarray(0,960)),Array.from(h.index.array));
    assert.deepEqual(arm.points.map(p=>p.toArray()),old.points.map(p=>p.toArray()));
    assert.equal(g.attributes.position.count,199);assert.equal(g.attributes.normal.count,199);assert.equal(g.index.count,1032);
    assert.equal(arm.mesh.material.type,old.mesh.material.type);assert.equal(arm.mesh.material.customProgramCacheKey(),old.mesh.material.customProgramCacheKey());
  }
}
function capGeometry(arm,scale){
  const g=arm.mesh.geometry,c=arm.points[20],t=c.clone().sub(arm.points[19]).normalize(),r=.007*scale;
  for(let i=180;i<199;i++){
    assert.ok(point(g,i).toArray().every(Number.isFinite));assert.ok(normal(g,i).toArray().every(Number.isFinite));
    assert.ok(Math.abs(normal(g,i).length()-1)<1e-6,'Unit cap normal');
    assert.ok(Math.abs(point(g,i).distanceTo(c)-r)<3e-7,'Hemisphere stays on terminal sphere');
    assert.ok(point(g,i).clone().sub(c).dot(t)>-2e-7,'Cap lies beyond terminal ring');
  }
  assert.ok(point(g,180).distanceTo(point(g,188))<1e-7);assert.ok(point(g,189).distanceTo(point(g,197))<1e-7);
  assert.ok(normal(g,180).distanceTo(normal(g,188))<1e-7);assert.ok(normal(g,189).distanceTo(normal(g,197))<1e-7);
  assert.ok(normal(g,198).dot(t)>.999999);
  const welded=i=>i===188?180:i===197?189:i,edges=new Map();
  for(let offset=960;offset<g.index.count;offset+=3){
    const ix=[0,1,2].map(d=>g.index.getX(offset+d)),v=ix.map(i=>point(g,i)),cross=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    assert.ok(cross.length()>1e-10,'Cap triangle does not collapse');
    const radial=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3).sub(c);
    assert.ok(cross.dot(radial)>0,'Cap is wound outward');
    for(let e=0;e<3;e++){const a=welded(ix[e]),b=welded(ix[(e+1)%3]),key=Math.min(a,b)+':'+Math.max(a,b),entry=edges.get(key)||{count:0,direction:0,a,b};entry.count++;entry.direction+=a<b?1:-1;edges.set(key,entry);}
  }
  let boundary=0;for(const e of edges.values()){if(e.a>=180&&e.a<188&&e.b>=180&&e.b<188){assert.equal(e.count,1);boundary++;}else{assert.equal(e.count,2,'Closed cap interior');assert.equal(e.direction,0,'Opposed shared edges');}}
  assert.equal(boundary,8,'Only the cap attachment ring is open');
}
afterEach(()=>{for(const a of owned.splice(0)){const resources=new Set();a.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}});

describe('Rounded reef-octopus arm tips',()=>{
  it('recovers the accepted source and preserves complete swimming species',()=>{
    assert.equal(hash(prior),'17d91f44661bc82557a33ca15310a9de1957fdcafef5eb2f717414bff41f3981');
    for(const id of ['humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus']){
      const a=rig(id),b=rig(id,true);
      for(const state of [pose(),pose({moving:true,jet:true}),pose({strike:1,strikeAim:new T.Vector3(.6,-.2,1.4)}),pose({reducedMotion:true})]){a.update(2,.05,state);b.update(2,.05,state);assert.equal(snapshot(a),snapshot(b),id);}
    }
  });
  it('preserves every original tube vertex, face, centerline, cup and other body part through movement and directed grasps',()=>{
    const states=[pose(),pose({moving:true}),pose({moving:true,jet:true}),pose({strike:1,strikeAim:new T.Vector3(.5,-.37,1.3),strikeRadius:.3}),pose({strike:.7,strikeAim:new T.Vector3(.2,-.2,-1),strikeRadius:.3}),pose({strike:.6,strikeAim:new T.Vector3(0,1,1),strikeRadius:.3}),pose({strike:.85,strikeAim:new T.Vector3(0,-.3,.35),strikeRadius:.2}),pose({reducedMotion:true})];
    for(const id of ids){const a=rig(id),b=rig(id,true);for(let i=0;i<states.length;i++){const compression=i===5?.42:1;a.arms.forEach(arm=>arm.compressCurrent=compression);b.arms.forEach(arm=>arm.compressCurrent=compression);a.update(i*.2,.05,states[i]);b.update(i*.2,.05,states[i]);assertUnchanged(a,b);for(const arm of a.arms)capGeometry(arm,a.scale);}}
  });
  it('closes the original visible end hole to exterior rays on all eight arms',()=>{
    for(const id of ids){const a=rig(id),b=rig(id,true);a.update(2,.05,pose());b.update(2,.05,pose());
      for(let i=0;i<8;i++){
        const arm=a.arms[i],old=b.arms[i],end=arm.points[20],t=end.clone().sub(arm.points[19]).normalize(),offset=normal(arm.mesh.geometry,180).multiplyScalar(.007*a.scale*.18);
        const origin=end.clone().addScaledVector(t,.05*a.scale).add(offset),ray=new T.Raycaster(origin,t.clone().negate(),0,.049*a.scale);
        for(const candidate of [arm,old]){candidate.mesh.geometry.computeBoundingSphere();candidate.mesh.updateMatrixWorld(true);}
        const hit=ray.intersectObject(arm.mesh,false)[0];assert.ok(hit,id+' cap intercepts end ray');assert.ok(hit.faceIndex>=320);assert.ok(hit.distance>.042*a.scale&&hit.distance<.045*a.scale);
        assert.equal(ray.intersectObject(old.mesh,false).length,0,id+' baseline end was open');
      }
    }
  });
  it('retains buffers, materials and object counts through updates, pause and reduced motion',()=>{
    const a=rig(),b=rig('commonOcto',true),resources=[];
    a.root.traverse(o=>{if(o.geometry)resources.push({o,g:o.geometry,m:o.material,index:o.geometry.index,attributes:Object.entries(o.geometry.attributes).map(([name,v])=>({name,v,array:v.array})),instances:o.instanceMatrix});});
    let beforeCount=0,afterCount=0;a.root.traverse(()=>afterCount++);b.root.traverse(()=>beforeCount++);assert.equal(afterCount,beforeCount);
    for(let frame=0;frame<30;frame++)a.update(frame*.05,.05,pose({moving:true,jet:frame>15}));
    const frozen=snapshot(a);a.update(29*.05,0,pose({moving:true,jet:true}));assert.equal(snapshot(a),frozen);
    a.update(2,.05,pose({reducedMotion:true}));const still=snapshot(a);a.update(20,.05,pose({reducedMotion:true}));assert.equal(snapshot(a),still);
    for(const r of resources){assert.equal(r.o.geometry,r.g);assert.equal(r.o.material,r.m);assert.equal(r.g.index,r.index);assert.equal(r.o.instanceMatrix,r.instances);for(const attr of r.attributes){assert.equal(r.g.attributes[attr.name],attr.v);assert.equal(attr.v.array,attr.array);}}
  });
});
