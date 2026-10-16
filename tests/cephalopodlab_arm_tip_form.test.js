import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baselinePath=process.env.CEPHALOPOD_TIP_BASELINE;
if(process.env.CEPHALOPOD_EXPECT_ARM_TIP==='1'&&!baselinePath)throw Error('CEPHALOPOD_EXPECT_ARM_TIP requires CEPHALOPOD_TIP_BASELINE');
const baseline=baselinePath?readFileSync(baselinePath,'utf8'):null;
const changed=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const protectedSpecies=['blueRinged','humboldtSquid','cuttlefish','bobtailSquid','vampireSquid','dumboOcto','nautilus'];
const allocated=[],noRandom=Object.assign(Object.create(Math),{random(){throw Error('Tip refinement consumed dive RNG');}});
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
const poses=[pose(),pose({moving:true}),pose({moving:true,jet:true}),pose({strike:.5,strikeAim:new T.Vector3(.6,-.25,1.3),strikeRadius:.3,strikeBrace:.8}),pose({strike:1,strikeAim:new T.Vector3(-.6,-.2,1.4),strikeRadius:.3,strikeBrace:.8}),pose({reducedMotion:true})];
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
function factory(text){return new Function('T','species','Math',region(text,'function createCLHuntAnimal(','// Compact, individually owned prey rig.')+';return createCLHuntAnimal(T,species);');}
const build=factory(source),oldBuild=baseline?factory(baseline):null;
function rig(id,prior=false){const r=(prior?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);allocated.push(r);return r;}
const vertex=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
const normal=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.normal,i);
function fingerprint(r){const h=createHash('sha256');r.root.traverse(o=>{h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));if(o.geometry){for(const [name,a]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index){const a=o.geometry.index.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}}if(o.instanceMatrix){const a=o.instanceMatrix.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}});return h.digest('hex');}
function resources(r){const rows=[];r.root.traverse(o=>{if(o.geometry)rows.push({o,g:o.geometry,m:o.material,index:o.geometry.index,attrs:Object.entries(o.geometry.attributes).map(([name,a])=>({name,a,array:a.array})),instances:o.instanceMatrix,instanceArray:o.instanceMatrix?.array});});return rows;}
function retained(rows){for(const row of rows){assert.equal(row.o.geometry,row.g);assert.equal(row.o.material,row.m);assert.equal(row.g.index,row.index);for(const a of row.attrs){assert.equal(row.g.attributes[a.name],a.a);assert.equal(a.a.array,a.array);assert.ok(a.array.every(Number.isFinite));}assert.equal(row.o.instanceMatrix,row.instances);assert.equal(row.o.instanceMatrix?.array,row.instanceArray);}}
function assertAcceptedContacts(r,before,label){
  assert.equal(r.arms.length,before.arms.length);
  for(let arm=0;arm<r.arms.length;arm++){
    const current=r.arms[arm],prior=before.arms[arm],g=current.mesh.geometry,old=prior.mesh.geometry;
    assert.deepEqual(current.points.map(p=>p.toArray()),prior.points.map(p=>p.toArray()),label+' exact arm skeleton');
    assert.deepEqual(g.index.array,old.index.array,label+' retained face indices');
    assert.equal(g.attributes.position.count,old.attributes.position.count,label+' retained vertex count');
    for(const name of ['position','normal'])assert.deepEqual(g.attributes[name].array.subarray(0,15*9*3),old.attributes[name].array.subarray(0,15*9*3),label+' exact rings 0–14 '+name);
  }
  const cups=r.root.getObjectByName('cl-suckers'),oldCups=before.root.getObjectByName('cl-suckers');
  assert.equal(cups.count,oldCups.count);assert.deepEqual(cups.instanceMatrix.array,oldCups.instanceMatrix.array,label+' exact sucker contacts');
  const web=r.root.getObjectByName('cl-webbing').geometry,oldWeb=before.root.getObjectByName('cl-webbing').geometry;
  for(const name of ['position','normal'])assert.deepEqual(web.attributes[name].array,oldWeb.attributes[name].array,label+' exact web '+name);
}
function assertTipNormals(r,label,acceptedRefuge=null){
  for(const arm of r.arms){const g=arm.mesh.geometry,armLabel=label+' arm '+arm.index;
    if(acceptedRefuge)assert.deepEqual(g.attributes.normal.array,acceptedRefuge.arms[arm.index].mesh.geometry.attributes.normal.array,armLabel+' exact accepted refuge normal buffer');
    for(let i=15*9;i<g.attributes.normal.count;i++){const n=normal(g,i);assert.ok(Number.isFinite(n.x+n.y+n.z),armLabel+' vertex '+i+' finite normal');assert.ok(Math.abs(n.length()-1)<.000002,armLabel+' vertex '+i+' unit normal');}
    for(let ring=15;ring<=21;ring++){
      assert.ok(vertex(g,ring*9).distanceTo(vertex(g,ring*9+8))<.000001*r.scale,armLabel+' ring '+ring+' closed position seam');
      assert.deepEqual(normal(g,ring*9).toArray(),normal(g,ring*9+8).toArray(),armLabel+' ring '+ring+' joined normal seam');
      for(let side=0;side<8;side++){
        const n=normal(g,ring*9+side),center=arm.points[Math.min(20,ring)],radial=vertex(g,ring*9+side).sub(center).normalize();
        assert.ok(n.dot(radial)>.55,armLabel+' ring '+ring+' side '+side+' outward normal dot '+n.dot(radial));
        // Accepted wall folds already include sharp tangent reversals. In that
        // state exact baseline normals above replace an inapplicable smoothness gate.
        if(!acceptedRefuge)assert.ok(n.dot(normal(g,(ring-1)*9+side))>.30,armLabel+' ring '+ring+' side '+side+' adjacent normal dot '+n.dot(normal(g,(ring-1)*9+side)));
      }
    }
    const tipDirection=arm.points[20].clone().sub(arm.points[19]).normalize();
    assert.ok(normal(g,198).dot(tipDirection)>.9999,armLabel+' outward cap pole');
    for(let face=14*8*6;face<g.index.count;face+=3){
      const indices=[g.index.getX(face),g.index.getX(face+1),g.index.getX(face+2)],a=vertex(g,indices[0]),b=vertex(g,indices[1]),c=vertex(g,indices[2]);
      const faceNormal=b.sub(a).cross(c.sub(a)),average=normal(g,indices[0]).add(normal(g,indices[1])).add(normal(g,indices[2])).normalize();
      assert.ok(faceNormal.length()>1e-11*r.scale*r.scale,armLabel+' face '+face/3+' nondegenerate triangle');
      if(!acceptedRefuge)assert.ok(faceNormal.normalize().dot(average)>.25,armLabel+' face '+face/3+' outward consistent triangle winding');
    }
  }
}
const collision=new Function(region(source,'function createCLHuntRockCollisionFootprint(','// Small rock-rooted fragments')+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
function corridor(width){const rocks=[-1,1].map(sign=>{const r=new T.Mesh(new T.BoxGeometry(2,2,3),new T.MeshBasicMaterial());r.position.set(sign*(1+width/2),1,0);r.updateMatrixWorld(true);return r;});const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(r=>collision.footprint(T,r)),1,'commonOcto',0,.55);for(const r of rocks){r.geometry.dispose();r.material.dispose();}assert.equal(gap?.walls?.length,2);return gap;}
function limbVertices(r,visit){const p=new T.Vector3(),instance=new T.Matrix4(),world=new T.Matrix4();r.root.updateMatrixWorld(true);r.root.traverseVisible(o=>{if(!o.isMesh||!/^cl-arm-|^cl-webbing$|^cl-suckers$/.test(o.name))return;for(let n=0;n<(o.isInstancedMesh?o.count:1);n++){if(o.isInstancedMesh){o.getMatrixAt(n,instance);world.multiplyMatrices(o.matrixWorld,instance);}else world.copy(o.matrixWorld);for(let i=0;i<o.geometry.attributes.position.count;i++){p.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(world);assert.ok(Number.isFinite(p.x+p.y+p.z));visit(p,o);}}});}
afterEach(()=>{for(const r of allocated.splice(0)){const owned=new Set();r.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])owned.add(m);});owned.forEach(o=>o.dispose());}});

describe('Refined reef octopus arm tips from current runtime',()=>{
  it('narrows only sucker-free ends into progressively slender closed tips',()=>{
    for(const id of changed){const r=rig(id);r.update(0,0,pose({reducedMotion:true}));for(const arm of r.arms){const g=arm.mesh.geometry;let previous=Infinity;
      for(let ring=14;ring<=20;ring++){const radii=Array.from({length:8},(_,side)=>vertex(g,ring*9+side).distanceTo(arm.points[ring])),radius=radii.reduce((a,b)=>a+b)/8,accepted=(arm.radius*Math.pow(1-ring/20,.8)+.007)*r.scale;
        assert.ok(radius<previous,id+' monotonic taper');previous=radius;assert.ok(Math.max(...radii)-Math.min(...radii)<.000001*r.scale,id+' circular retained section');
        if(ring===14)assert.ok(Math.abs(radius-accepted)<.000001*r.scale,id+' exact contact-ring radius');else assert.ok(radius<accepted&&radius>=accepted*.35,id+' bounded finer distal radius');
        if(ring===20){assert.ok(radius/accepted>=.35&&radius/accepted<=.45,id+' visibly refined terminal radius');for(let i=189;i<199;i++)assert.ok(Math.abs(vertex(g,i).distanceTo(arm.points[20])-radius)<.000002*r.scale,id+' rounded terminal cap');}
      }
    }}
  });

  it('keeps distal normals outward, smooth, finite and joined through rest, jet and directed grasp',()=>{
    for(const id of changed){const r=rig(id);for(let step=0;step<poses.length;step++){for(let frame=0;frame<4;frame++)r.update(step+frame*.05,.05,poses[step]);assertTipNormals(r,id+' pose '+step);}}
  });

  it('retains geometry, topology and buffers while reduced-motion tips remain static',()=>{
    for(const id of changed){const r=rig(id),refs=resources(r);r.update(1,.05,pose({reducedMotion:true}));const frozen=fingerprint(r);
      for(const time of [10,40,100]){r.update(time,.05,pose({moving:true,jet:true,strike:1,reducedMotion:true}));assert.equal(fingerprint(r),frozen,id+' static reduced-motion tip');}
      for(let frame=0;frame<40;frame++)r.update(frame/30,1/30,poses[frame%poses.length]);retained(refs);assert.equal(resources(r).length,refs.length,id+' retained drawables');
    }
  });

  it.skipIf(!baseline)('retains complete protected rigs and exact skeletons, topology, contacts and web against the accepted runtime',()=>{
    for(const id of [...changed,...protectedSpecies]){const r=rig(id),before=rig(id,true);assert.equal(resources(r).length,resources(before).length,id+' drawable count');
      for(let step=0;step<poses.length;step++){for(let frame=0;frame<4;frame++){r.update(step+frame*.05,.05,poses[step]);before.update(step+frame*.05,.05,poses[step]);}
        if(protectedSpecies.includes(id))assert.equal(fingerprint(r),fingerprint(before),id+' protected entire rig');else assertAcceptedContacts(r,before,id+' pose '+step);
      }
    }
  });

  it.skipIf(!baseline)('keeps each refined distal section and cap inside its accepted envelope without a lighting kink at the contact boundary',()=>{
    for(const id of changed){const r=rig(id),before=rig(id,true);for(let step=0;step<poses.length;step++){r.update(step*.05,.05,poses[step]);before.update(step*.05,.05,poses[step]);
      for(let arm=0;arm<8;arm++){const a=r.arms[arm],b=before.arms[arm],g=a.mesh.geometry,old=b.mesh.geometry;
        for(let ring=15;ring<=21;ring++)for(let side=0;side<9;side++){const index=ring*9+side,center=a.points[Math.min(20,ring)],current=vertex(g,index).sub(center),prior=vertex(old,index).sub(center);
          assert.ok(current.length()<=prior.length()+1e-7*r.scale,id+' radius remains inside accepted envelope');assert.ok(current.clone().cross(prior).length()<1e-7*r.scale*r.scale,id+' same radial ray');assert.ok(current.dot(prior)>0,id+' no inversion');
        }
        const center=a.points[20],currentPole=vertex(g,198).sub(center),oldPole=vertex(old,198).sub(center);assert.ok(currentPole.length()<oldPole.length());assert.ok(currentPole.clone().cross(oldPole).length()<1e-7*r.scale*r.scale);
        for(let side=0;side<8;side++){const currentJoin=normal(g,14*9+side).dot(normal(g,15*9+side)),acceptedJoin=normal(old,14*9+side).dot(normal(old,15*9+side));assert.ok(currentJoin>acceptedJoin-.12,id+' gentle normal transition after contact ring');}
      }
    }}
  });

  it.skipIf(!baseline)('preserves contacts and containment inside valid finite refuge walls during partial and full compression',()=>{
    for(const id of changed)for(const yaw of [0,.73,Math.PI/2])for(const compression of [.55,.75,1]){const r=rig(id),before=rig(id,true),width=id==='giantPacific'?.42:.30,crevice=corridor(width),state=pose({moving:true,squeezeBlend:1,crevice});
      for(const animal of [r,before]){animal.root.position.y=.55*animal.scale;animal.root.rotation.y=yaw;animal.arms.forEach(a=>a.compressCurrent=compression);animal.update(7,.05,state);}
      assertAcceptedContacts(r,before,id+' refuge compression '+compression);let samples=0,maxDepth=0;
      limbVertices(r,p=>{samples++;if(Math.abs(p.z)<1.5)maxDepth=Math.max(maxDepth,Math.abs(p.x)-width/2);});assert.ok(samples>1500);assert.ok(maxDepth<1e-6,id+' finite-wall penetration '+maxDepth);assertTipNormals(r,id+' refuge yaw '+yaw+' compression '+compression,before);
    }
  },20000);

  it.skipIf(!baseline)('retains or improves actual reef terrain clearance at the accepted rest heights',()=>{
    const terrain=new Function(region(source,'function terrainHeight(x,z){','function distance3(')+';return terrainHeight;')();
    const baseRest=Number(source.match(/var FLOOR_REST_Y = ([\d.]+);/)[1]),restFor=new Function('FLOOR_REST_Y','speciesId','bodyScale','return '+source.match(/var floorRestY=([^;]+);/)[1]+';');
    const rootY=new Function('gameState','isJetting','now','return '+source.match(/octopus\.position\.y = ([^;]+);/)[1]+';');
    for(const id of changed){const r=rig(id),before=rig(id,true),rest=restFor(baseRest,id,r.scale);for(const moving of [false,true])for(const time of [0,2.5])for(const yaw of [0,.8,1.6]){
      const clearances=[];for(const animal of [r,before]){animal.update(time,.05,pose({moving}));animal.root.rotation.y=yaw;animal.root.position.y=rootY({verticalY:rest,a11y:{reducedMotion:false}},false,time*1000);let clearance=Infinity;limbVertices(animal,p=>{clearance=Math.min(clearance,p.y-terrain(p.x,p.z));});clearances.push(clearance);}
      assert.ok(clearances[0]>0,id+' positive terrain clearance');assert.ok(clearances[0]>=clearances[1]-1e-6,id+' conservative terrain clearance');
    }}
  },20000);
});
