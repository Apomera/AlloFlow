import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
const baselinePath=process.env.CEPHALOPOD_ARM_BASELINE;
if(process.env.CEPHALOPOD_EXPECT_ARM_GESTURE==='1'&&!baselinePath)throw Error('CEPHALOPOD_EXPECT_ARM_GESTURE requires CEPHALOPOD_ARM_BASELINE');
const baseline=baselinePath?readFileSync(baselinePath,'utf8'):null;
const changed=['commonOcto','giantPacific','mimicOcto','caribReef','coconutOcto'];
const reef=[...changed,'blueRinged'];
const protectedPoses={
  blueRinged:'c21c9971f292f4fc3d2370322b68913179ba3d0bb245fad552ce94a04ff128f2',
  humboldtSquid:'bd62c6e4e60397eebf6ad61138676c058230ec408dcd153c999c991b9d2310bf',
  cuttlefish:'35ee4ccf73fbb3d70da887680a642039dc5a7db2415ab943c89fcbf74d82ca9c',
  bobtailSquid:'832e098dd2f2f49b97b528331cb5a71f19202ab988aecb3a7ed17a7b814c0f48',
  vampireSquid:'849068ad658354ca6e3c13bea4e7dfedaf094c7773851b153d74355cbecf39d7',
  dumboOcto:'adc3875eb1d5faa632d5d687fe698aed222f40b332fb0b5f318fd417243b8d4a',
  nautilus:'7d59383ffa63a2ebea5683f072f7a20e9c28005fd3dca9e3cc5f1c3f6505213c',
};
const allocated=[],noRandom=Object.assign(Object.create(Math),{random(){throw Error('Arm pose consumed dive RNG');}});
const pose=(extra={})=>({moving:false,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false,...extra});
function region(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b);}
function factory(text){return new Function('T','species','Math',region(text,'function createCLHuntAnimal(','// Compact, individually owned prey rig.')+';return createCLHuntAnimal(T,species);');}
const build=factory(source),oldBuild=baseline?factory(baseline):null;
function rig(id='commonOcto',prior=false){const r=(prior?oldBuild:build)(T,{id,bodyColor:0xbc6048},noRandom);allocated.push(r);return r;}
function fingerprint(r){
  const h=createHash('sha256');
  r.root.traverse(o=>{
    h.update(JSON.stringify([o.type,o.name,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));
    if(o.geometry){for(const [name,a]of Object.entries(o.geometry.attributes)){h.update(name);h.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}if(o.geometry.index){const a=o.geometry.index.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}}
    if(o.instanceMatrix){const a=o.instanceMatrix.array;h.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
  });return h.digest('hex');
}
const points=r=>r.arms.flatMap(a=>a.points.map(p=>p.clone()));
const delta=(a,b)=>Math.max(...a.map((p,i)=>p.distanceTo(b[i])));
const vertex=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
const normal=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.normal,i);
function resources(r){const rows=[];r.root.traverse(o=>{if(o.geometry)rows.push({o,g:o.geometry,m:o.material,index:o.geometry.index,attrs:Object.entries(o.geometry.attributes).map(([n,a])=>({n,a,array:a.array})),instances:o.instanceMatrix,instanceArray:o.instanceMatrix?.array});});return rows;}
function retained(rows){for(const row of rows){assert.equal(row.o.geometry,row.g);assert.equal(row.o.material,row.m);assert.equal(row.g.index,row.index);for(const a of row.attrs){assert.equal(row.g.attributes[a.n],a.a);assert.equal(a.a.array,a.array);assert.ok(a.array.every(Number.isFinite));}assert.equal(row.o.instanceMatrix,row.instances);assert.equal(row.o.instanceMatrix?.array,row.instanceArray);if(row.instanceArray)assert.ok(row.instanceArray.every(Number.isFinite));}}
function assertTubes(r,label){
  for(const arm of r.arms){const nominal=arm.length*r.scale*(arm.compressCurrent||1)/20;
    for(let j=1;j<=20;j++){const separation=arm.points[j].distanceTo(arm.points[j-1]);assert.ok(separation>nominal*.40,label+' separated rings');assert.ok(separation<arm.length*r.scale/20*1.6,label+' bounded extension');assert.ok(normal(arm.mesh.geometry,j*9).dot(normal(arm.mesh.geometry,(j-1)*9))>.45,label+' coherent oral frame');}
    assert.ok(arm.mesh.geometry.attributes.position.array.every(Number.isFinite));
  }
}
function assertAttachments(r,label){
  const cups=r.root.getObjectByName('cl-suckers'),web=r.root.getObjectByName('cl-webbing').geometry,matrix=new T.Matrix4(),origin=new T.Vector3(),rotation=new T.Quaternion(),size=new T.Vector3();
  for(let arm=0;arm<8;arm++)for(let ring=3;ring<15;ring++)for(let row=0;row<2;row++){
    cups.getMatrixAt(arm*24+(ring-3)*2+row,matrix);matrix.decompose(origin,rotation,size);
    const g=r.arms[arm].mesh.geometry,face=((ring-1)*8+(row?3:4))*2+1;
    const triangle=new T.Triangle(...[0,1,2].map(i=>vertex(g,g.index.getX(face*3+i)))),oral=new T.Vector3(0,1,0).applyQuaternion(rotation);
    assert.ok(size.x>0&&matrix.elements.every(Number.isFinite),label+' finite sucker');
    assert.ok(oral.dot(triangle.getNormal(new T.Vector3()))>.99999,label+' sucker follows actual skin normal');
    assert.ok(Math.abs(triangle.getPlane(new T.Plane()).distanceToPoint(origin)/size.x-.08)<.0003,label+' sucker sits on actual rendered triangle');
  }
  for(let arm=0;arm<8;arm++)assert.ok(vertex(web,arm*54+8).distanceTo(r.arms[arm].points[5])<.02*r.scale,label+' web seam');
  for(let i=0;i<web.attributes.normal.count;i++)assert.ok(Math.abs(normal(web,i).length()-1)<.0001,label+' unit web normal');
}
function segmentDistance(a,b,c,d){
  const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c),aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),den=aa*cc-bb*bb;
  let sn=den,sd=den,tn=den,td=den;
  if(den<1e-14){sn=0;sd=1;tn=ee;td=cc;}else{sn=bb*ee-cc*dd;tn=aa*ee-bb*dd;if(sn<0){sn=0;tn=ee;td=cc;}else if(sn>sd){sn=sd;tn=ee+bb;td=cc;}}
  if(tn<0){tn=0;if(-dd<0)sn=0;else if(-dd>aa)sn=sd;else{sn=-dd;sd=aa;}}
  else if(tn>td){tn=td;if(-dd+bb<0)sn=0;else if(-dd+bb>aa)sn=sd;else{sn=-dd+bb;sd=aa;}}
  const s=Math.abs(sn)<1e-14?0:sn/sd,t=Math.abs(tn)<1e-14?0:tn/td;
  return {distance:w.addScaledVector(u,s).addScaledVector(v,-t).length(),s,t};
}
function assertAdjacentDistalArms(r,label){
  for(let a=0;a<8;a++){const first=r.arms[a],second=r.arms[(a+1)%8];for(let i=6;i<20;i++)for(let j=6;j<20;j++){
    const closest=segmentDistance(first.points[i],first.points[i+1],second.points[j],second.points[j+1]);
    const ra=(first.radius*Math.pow(1-(i+closest.s)/20,.8)+.007)*r.scale,rb=(second.radius*Math.pow(1-(j+closest.t)/20,.8)+.007)*r.scale;
    assert.ok(closest.distance>ra+rb,label+' adjacent arms '+a+'/'+((a+1)%8)+' rings '+i+'/'+j+' clearance '+(closest.distance-ra-rb));
  }}
}
const collision=new Function(region(source,'function createCLHuntRockCollisionFootprint(','// Small rock-rooted fragments')+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice};')();
function corridor(width){
  const rocks=[-1,1].map(sign=>{const r=new T.Mesh(new T.BoxGeometry(2,2,3),new T.MeshBasicMaterial());r.position.set(sign*(1+width/2),1,0);r.updateMatrixWorld(true);return r;});
  const gap=collision.find({x:0,z:0},.55,rocks,rocks.map(r=>collision.footprint(T,r)),1,'commonOcto',0,.55);
  for(const r of rocks){r.geometry.dispose();r.material.dispose();}assert.equal(gap?.walls?.length,2);return gap;
}
function worldVertices(r,visit,limbsOnly=false){
  const p=new T.Vector3(),instance=new T.Matrix4(),world=new T.Matrix4();r.root.updateMatrixWorld(true);
  r.root.traverseVisible(o=>{if(!o.isMesh||(limbsOnly&&!/^cl-arm-|^cl-webbing$|^cl-suckers$/.test(o.name)))return;
    for(let n=0;n<(o.isInstancedMesh?o.count:1);n++){if(o.isInstancedMesh){o.getMatrixAt(n,instance);world.multiplyMatrices(o.matrixWorld,instance);}else world.copy(o.matrixWorld);for(let i=0;i<o.geometry.attributes.position.count;i++){p.fromBufferAttribute(o.geometry.attributes.position,i).applyMatrix4(world);assert.ok(Number.isFinite(p.x+p.y+p.z));visit(p,o);}}
  });
}
afterEach(()=>{for(const r of allocated.splice(0)){const owned=new Set();r.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])owned.add(m);});owned.forEach(o=>o.dispose());}});

describe('Living reef octopus arm motion from current runtime',()=>{
  it('preserves seven excluded species across idle, movement, jet, directed strike and reduced motion',()=>{
    // Captured directly from accepted 2d933ef54c10be53fe775a640f39026d0da4ea7a7a9b16881c66629ecac7c2d7; no inverse source reconstruction.
    for(const [id,expected]of Object.entries(protectedPoses)){const r=rig(id),samples=[];for(let i=0;i<5;i++){r.update([0,.25,.5,1,2][i],i?.05:0,{moving:i>0,jet:i===2,strike:i===3?1:0,strikeAim:new T.Vector3(.55,-.25,1.4),strikeRadius:.3,strikeBrace:i===3?.8:0,camo:.7,substrate:'rock',reducedMotion:i===4});samples.push(fingerprint(r));}assert.equal(createHash('sha256').update(samples.join('\n')).digest('hex'),expected,id);}
  });

  it('forms visible distal planar curls in the static accessible pose without arm intersections',()=>{
    for(const id of changed){const r=rig(id);r.update(0,0,pose({reducedMotion:true}));
      for(const arm of r.arms){const initial=arm.points[6].clone().sub(arm.points[5]),terminal=arm.points[20].clone().sub(arm.points[19]);const turn=Math.abs(Math.atan2(initial.x*terminal.z-initial.z*terminal.x,initial.x*terminal.x+initial.z*terminal.z));assert.ok(turn>1.0&&turn<2.4,id+' visible planar curl '+arm.index+': '+turn);}
      assertAdjacentDistalArms(r,id+' static');
    }
  });

  it('maintains distal arm clearance through independently phased idle and crawling gestures',()=>{
    for(const id of ['commonOcto','giantPacific'])for(const moving of [false,true]){const r=rig(id);for(let frame=0;frame<180;frame++){r.update(frame/30,1/30,pose({moving}));if(frame%12===0)assertAdjacentDistalArms(r,id+' moving='+moving+' frame='+frame);}}
  },20000);

  it('keeps jet launch and release continuous with separated tubes at ordinary and squeezed widths',()=>{
    for(const id of changed)for(const compression of [1,.55,.42]){const r=rig(id);r.arms.forEach(a=>a.compressCurrent=compression);
      for(let frame=0;frame<40;frame++){r.update(frame/30,1/30,pose({moving:true,jet:frame>=4&&frame<24}));assertTubes(r,id);}
      const before=points(r);r.update(39/30,0,pose({jet:true,moving:false}));assert.ok(delta(before,points(r))<1e-12,id+' input edge at zero dt');
    }
  });

  it('integrates arm phases consistently at 30, 60 and 120 Hz and clamps resumed-frame gaps',()=>{
    for(const id of ['commonOcto','giantPacific']){const samples=[];
      for(const fps of [30,60,120]){const r=rig(id);for(let i=1;i<=fps;i++)r.update(i/fps,1/fps,pose({moving:true,jet:true}));const boost=points(r);for(let i=1;i<=fps;i++)r.update(1+i/fps,1/fps,pose());samples.push({boost,rest:points(r)});}
      for(const sample of samples.slice(1)){assert.ok(delta(sample.boost,samples[0].boost)<1e-9,id+' boost phase');assert.ok(delta(sample.rest,samples[0].rest)<1e-9,id+' release phase');}
      const a=rig(id),b=rig(id);for(let i=0;i<4;i++){a.update(i*.05,.05,pose({jet:true}));b.update(i*.05,.05,pose({jet:true}));}a.update(.2,.05,pose());b.update(.2,4,pose());assert.equal(fingerprint(a),fingerprint(b),id+' bounded dt');const frozen=fingerprint(b);b.update(.2,-1,pose());assert.equal(fingerprint(b),frozen,id+' negative dt');
    }
  });

  it('keeps reduced-motion shapes static and maintains retained resources and immutable gameplay inputs',()=>{
    for(const id of changed){const r=rig(id),refs=resources(r),rootPosition=r.root.position.toArray(),rootRotation=r.root.quaternion.toArray();
      r.update(3,.05,pose({reducedMotion:true}));const still=fingerprint(r);
      const settings=Object.freeze(pose({moving:true,jet:true,strike:1,strikeAim:Object.freeze(new T.Vector3(.5,-.2,1.4)),strikeRadius:.3,reducedMotion:true,stamina:42}));
      for(const time of [8,40,100]){r.update(time,.05,settings);assert.equal(fingerprint(r),still,id+' static accessible shape');}
      for(let frame=0;frame<40;frame++)r.update(frame/30,1/30,pose({moving:frame%3>0,jet:frame<15,strike:frame===25?1:0,strikeAim:new T.Vector3(.5,-.2,1.4),strikeRadius:.3}));
      retained(refs);assert.equal(settings.stamina,42);assert.equal(settings.strikeAim.x,.5);assert.deepEqual(r.root.position.toArray(),rootPosition);assert.deepEqual(r.root.quaternion.toArray(),rootRotation);
    }
  });

  it('preserves three separate rendered contact sections and returning tips for directed reaches',()=>{
    for(const id of reef)for(const target of [[.55,-.37,1.35],[-.65,-.2,1.5],[.2,-.2,-1],[0,1,1]]){
      const r=rig(id),aim=new T.Vector3(...target),radius=.3;for(let i=0;i<8;i++)r.update(i/30,1/30,pose({moving:true,jet:true}));r.update(8/30,1/30,pose({moving:true,jet:true,strike:1,strikeAim:aim,strikeRadius:radius,strikeBrace:.8}));
      const direction=aim.clone().sub(new T.Vector3(0,-.22,.20)).normalize(),across=new T.Vector3(direction.z,0,-direction.x).normalize(),up=new T.Vector3().crossVectors(direction,across),contacts=[];
      for(let index=1;index<=3;index++){const arm=r.arms[index],side=2-index,expected=aim.clone().addScaledVector(across,side*radius).addScaledVector(up,radius*(side?.32:.60)).multiplyScalar(r.scale);const contact=Array.from({length:8},(_,i)=>vertex(arm.mesh.geometry,14*9+i)).reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/8);assert.ok(contact.distanceTo(expected)<1e-6,id+' ring14 rendered contact');contacts.push(contact);assert.ok(arm.points[15].clone().sub(arm.points[14]).dot(direction)>0);assert.ok(arm.points[20].clone().sub(arm.points[19]).dot(direction)<0);}
      assert.ok(contacts[0].distanceTo(contacts[2])>.59*r.scale,id+' distinct contact sides');assertAttachments(r,id);
    }
  });

  it('keeps sucker cups attached to actual triangles and web seams attached through varied gestures',()=>{
    for(const id of changed){const r=rig(id);for(const s of [pose(),pose({moving:true}),pose({moving:true,jet:true}),pose({strike:.5,strikeAim:new T.Vector3(.6,-.25,1.3),strikeRadius:.3}),pose({reducedMotion:true})]){for(let i=0;i<4;i++)r.update(i*.05,.05,s);assertAttachments(r,id);}}
  });

  it('keeps every actual arm, web and sucker vertex inside finite refuge walls',()=>{
    for(const id of reef)for(const yaw of [0,.73,Math.PI/2])for(const compression of [.55,.75]){const r=rig(id),width=id==='giantPacific'?.42:.30,crevice=corridor(width);r.root.position.y=.55*r.scale;r.root.rotation.y=yaw;r.arms.forEach(a=>a.compressCurrent=compression);r.update(7,.05,pose({moving:true,squeezeBlend:1,crevice}));let samples=0,maxDepth=0;
      worldVertices(r,p=>{samples++;if(Math.abs(p.z)<1.5)maxDepth=Math.max(maxDepth,Math.abs(p.x)-width/2);},true);assert.ok(samples>1500);assert.ok(maxDepth<1e-6,id+' yaw '+yaw+' compression '+compression+' refuge penetration '+maxDepth);assertAttachments(r,id+' compression '+compression+' refuge');
    }
  });

  it('clears real reef terrain with rendered limbs and sucker instances at each species rest height',()=>{
    const terrain=new Function(region(source,'function terrainHeight(x,z){','function distance3(')+';return terrainHeight;')();
    const baseRest=Number(source.match(/var FLOOR_REST_Y = ([\d.]+);/)[1]),restFor=new Function('FLOOR_REST_Y','speciesId','bodyScale','return '+source.match(/var floorRestY=([^;]+);/)[1]+';');
    const rootY=new Function('gameState','isJetting','now','return '+source.match(/octopus\.position\.y = ([^;]+);/)[1]+';');
    for(const id of changed){const r=rig(id),rest=restFor(baseRest,id,r.scale);for(const moving of [false,true])for(const time of [0,.5,1,2,4,7]){r.update(time,.05,pose({moving}));for(const yaw of [0,.8,1.6,2.4]){r.root.rotation.y=yaw;r.root.position.y=rootY({verticalY:rest,a11y:{reducedMotion:false}},false,time*1000);let clearance=Infinity;worldVertices(r,p=>{clearance=Math.min(clearance,p.y-terrain(p.x,p.z));},true);assert.ok(clearance>0,id+' moving='+moving+' time='+time+' yaw='+yaw+' clearance='+clearance);}}}
  },20000);

  it.skipIf(!baseline)('preserves protected rigs and topology against the explicit accepted runtime',()=>{
    for(const id of [...changed,...Object.keys(protectedPoses)]){const r=rig(id),before=rig(id,true);assert.equal(resources(r).length,resources(before).length,id+' drawable count');for(let step=0;step<8;step++){const s=pose({moving:step>0,jet:step>=2&&step<5,strike:step===6?1:0,strikeAim:new T.Vector3(.6,-.2,1.3),strikeRadius:.3,reducedMotion:step===7});r.update(step*.05,.05,s);before.update(step*.05,.05,s);if(protectedPoses[id])assert.equal(fingerprint(r),fingerprint(before),id+' accepted pose');}for(let arm=0;arm<r.arms.length;arm++){assert.equal(r.arms[arm].mesh.geometry.attributes.position.count,before.arms[arm].mesh.geometry.attributes.position.count);assert.deepEqual(r.arms[arm].mesh.geometry.index.array,before.arms[arm].mesh.geometry.index.array);}}
  });

  it.skipIf(!baseline)('retains the arm crown and exact web while restoring original curves for strong interactions',()=>{
    for(const id of changed){const r=rig(id),before=rig(id,true);for(let step=0;step<30;step++){
      const state=pose({moving:step>=3,jet:step>=8&&step<25});r.update(step/30,1/30,state);before.update(step/30,1/30,state);
      for(let arm=0;arm<8;arm++){
        for(let ring=0;ring<=6;ring++)assert.deepEqual(r.arms[arm].points[ring].toArray(),before.arms[arm].points[ring].toArray(),id+' crown center');
        for(const name of ['position','normal'])assert.deepEqual(r.arms[arm].mesh.geometry.attributes[name].array.subarray(0,6*9*3),before.arms[arm].mesh.geometry.attributes[name].array.subarray(0,6*9*3),id+' rendered crown '+name);
      }
      const web=r.root.getObjectByName('cl-webbing').geometry,oldWeb=before.root.getObjectByName('cl-webbing').geometry;
      for(const name of ['position','normal'])assert.deepEqual(web.attributes[name].array,oldWeb.attributes[name].array,id+' unchanged web');
    }
    for(const state of [pose({strike:1,strikeAim:new T.Vector3(.6,-.25,1.3),strikeRadius:.3}),pose({reducedMotion:true})]){
      if(state.reducedMotion){r.arms.forEach(a=>a.compressCurrent=.55);before.arms.forEach(a=>a.compressCurrent=.55);}
      r.update(2,.05,state);before.update(2,.05,state);for(let arm=0;arm<8;arm++){assert.deepEqual(r.arms[arm].mesh.geometry.attributes.position.array,before.arms[arm].mesh.geometry.attributes.position.array,id+' interaction keeps original curve');assert.deepEqual(r.arms[arm].mesh.geometry.attributes.normal.array,before.arms[arm].mesh.geometry.attributes.normal.array,id+' interaction keeps original normals');}
    }}
  });
});
