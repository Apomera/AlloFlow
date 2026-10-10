import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const names=['preyKindFor','mergeGroundPreyParts','buildRainforestPreyParts','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose','advanceGroundPreyTerrain','initialPreyVelocity'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,gait:advanceGroundPreyGait,leg:setGroundPreyLegPose,terrain:advanceGroundPreyTerrain,velocity:initialPreyVelocity};')(THREE);
const carryFixture=Function('THREE','mesh','var talonGroup=new THREE.Group();talonGroup.add(mesh);var carriedPrey={prey:{mesh:mesh}},studyBoundsDirty=false;'+body('clearCarriedPrey')+';return {clear:clearCarriedPrey,talonGroup:talonGroup,state:function(){return {carriedPrey:carriedPrey,studyBoundsDirty:studyBoundsDirty};}};');
const ids=['sloth','howlerMonkey','capuchin','coati'];
const speeds={sloth:.25,howlerMonkey:5,capuchin:6.5,coati:5};
const make=(id,size=2)=>api.build({id,color:0x57534e,speedMps:speeds[id],behavior:id==='sloth'?'still':id==='coati'?'wander':'flee-on-sight'},size);
function resources(model){const result=new Set();model.root.traverse(o=>{if(o.geometry)result.add(o.geometry);if(o.material)result.add(o.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function applyFeet(model){model.legs.forEach((leg,index)=>api.leg(leg,model.gait.strides[index]));}
function pose(model,x,z,heading,size,height,dt=1/60,reduced=false){
  const t=model.gait.terrain,y=height(x,z)+size*.42;
  api.terrain(t,x,y,z,heading,size,size*.42,dt,reduced,height);
  model.root.position.set(x,y+t.lift+model.gait.bob,z);model.root.rotation.set(t.pitch,heading,t.roll,'YXZ');model.root.updateMatrixWorld(true);return t;
}
function footClearance(model,height){
  let min=Infinity;const point=new THREE.Vector3();
  for(const leg of model.legs){const p=leg.geometry.attributes.position;for(let i=0;i<p.count;i++){
    point.fromBufferAttribute(p,i).applyMatrix4(leg.matrixWorld);min=Math.min(min,point.y-height(point.x,point.z));
  }}return min;
}
function luminances(mesh){const c=mesh.geometry.attributes.color;return Array.from({length:c.count},(_,i)=>c.getX(i)*.2126+c.getY(i)*.7152+c.getZ(i)*.0722);}
const mean=values=>values.reduce((total,value)=>total+value,0)/values.length;

describe('Rainforest prey species detail',()=>{
  it('builds finite, texture-free species within seven meshes and one shared material',()=>{
    for(const id of ids){const m=make(id),meshes=[];m.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
      expect(m.kind).toBe('mammal');expect(meshes).toHaveLength(7);expect(new Set(meshes.map(mesh=>mesh.material)).size).toBe(1);
      expect(m.gait.quadruped).toBe(true);expect(m.gait.strides).toHaveLength(4);
      expect(meshes.map(mesh=>mesh.name).sort()).toEqual(['body','head','tail','front-left','front-right','hind-left','hind-right'].map(name=>'prey-rainforest-'+name).sort());
      for(const mesh of meshes){const g=mesh.geometry;
        expect(mesh.material.vertexColors).toBe(true);expect(mesh.material.map).toBeNull();
        expect(g.attributes.position.count).toBeGreaterThan(20);expect(g.attributes.color.count).toBe(g.attributes.position.count);
        for(const key of ['position','normal','color'])expect(Array.from(g.attributes[key].array).every(Number.isFinite)).toBe(true);
        expect(Array.from(g.attributes.color.array).every(value=>value>=0&&value<=1)).toBe(true);
      }dispose(m);
    }
  });

  it('distinguishes the sloth silhouette, capuchin face and banded coati tail',()=>{
    const models=Object.fromEntries(ids.map(id=>[id,make(id)])),box=mesh=>new THREE.Box3().setFromObject(mesh),span=mesh=>box(mesh).getSize(new THREE.Vector3());
    const slothTail=span(models.sloth.tail).length();
    for(const id of ['howlerMonkey','capuchin','coati'])expect(span(models[id].tail).length()).toBeGreaterThan(slothTail*3);
    const head=id=>models[id].root.getObjectByName('prey-rainforest-head');
    expect(mean(luminances(head('capuchin')))).toBeGreaterThan(mean(luminances(head('howlerMonkey'))));
    for(const id of ids){const values=luminances(head(id));expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.12);}
    const bands=luminances(models.coati.tail);expect(Math.max(...bands)-Math.min(...bands)).toBeGreaterThan(.12);
    expect(span(models.coati.tail).y).toBeGreaterThan(span(models.coati.tail).x*2);
    for(const m of Object.values(models))dispose(m);
  });

  it('preserves the original contact floor and supports four independent limb sweeps at gameplay sizes',()=>{
    for(const id of ids)for(const size of [.75,2,3.15,4.05,4.5]){const m=make(id,size),box=new THREE.Box3().setFromObject(m.root),terrain=m.gait.terrain;
      expect(box.min.y).toBeCloseTo(-size*.42,5);expect(m.legs).toHaveLength(4);expect(new Set(m.legs.map(leg=>leg.geometry)).size).toBe(4);
      for(let i=0;i<4;i++){const leg=m.legs[i];leg.geometry.computeBoundingBox();const b=leg.geometry.boundingBox;
        expect(Math.sign(leg.position.x)).toBe(i%2===0?-1:1);expect(Math.sign(leg.position.z)).toBe(i<2?1:-1);
        expect(leg.userData.depth).toBeGreaterThan(0);expect(leg.userData.reach).toBeGreaterThan(0);expect(Number.isFinite(leg.userData.restY)).toBe(true);
        expect(terrain.supportX*size).toBeGreaterThanOrEqual(Math.abs(leg.position.x)+Math.max(Math.abs(b.min.x),Math.abs(b.max.x)));
        expect(terrain.supportZ*size).toBeGreaterThanOrEqual(Math.abs(leg.position.z)+Math.hypot(leg.userData.depth,leg.userData.reach));
      }dispose(m);
    }
  });

  it('clears carried prey and disposes seven geometries and one shared material exactly once',()=>{
    for(const id of ids){const m=make(id),all=resources(m),counts=new Map();expect(all.size).toBe(8);
      all.forEach(resource=>{counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));});
      const preyMesh=new THREE.Group();preyMesh.add(m.root);const fixture=carryFixture(THREE,preyMesh);
      expect(preyMesh.parent).toBe(fixture.talonGroup);fixture.clear();fixture.clear();
      expect(preyMesh.parent).toBeNull();expect(fixture.talonGroup.children).toHaveLength(0);
      expect(fixture.state()).toEqual({carriedPrey:null,studyBoundsDirty:true});expect(Array.from(counts.values())).toEqual(Array(8).fill(1));
    }
  });
});

describe('Rainforest prey movement',()=>{
  it('keeps still prey stationary while retaining the existing spawn speed distribution for moving prey',()=>{
    for(const sample of [0,.1,.25,.5,.75,1]){
      expect(Math.abs(api.velocity({behavior:'still',speedMps:.25},sample))).toBe(0);
      for(const behavior of ['wander','flee-on-sight'])for(const speedMps of [.25,5,6.5,12]){
        expect(api.velocity({behavior,speedMps},sample)).toBe((sample-.5)*speedMps*.3);
      }
    }
  });

  it('gives slow sloths a restrained cadence and settles every species when it stops',()=>{
    const models=Object.fromEntries(ids.map(id=>[id,make(id)]));
    for(const id of ids){const m=models[id];for(let i=0;i<120;i++)api.gait(m.gait,speeds[id],speeds[id],2,'mammal',1/60,false,.7);
      expect(m.gait.effort).toBeGreaterThan(.9);expect(m.gait.rate).toBeGreaterThan(0);expect(m.gait.bob).toBeGreaterThanOrEqual(0);
    }
    for(const id of ['howlerMonkey','capuchin','coati']){
      expect(models.sloth.gait.rate).toBeLessThan(models[id].gait.rate*.4);
      expect(Math.max(...models.sloth.gait.strides.map(Math.abs))).toBeLessThan(.2);
    }
    for(const m of Object.values(models)){for(let i=0;i<180;i++)api.gait(m.gait,0,5,2,'mammal',1/60,false,.7);
      expect(m.gait.effort).toBeLessThan(1e-8);expect(m.gait.rate).toBeLessThan(1e-7);expect(m.gait.bob).toBeLessThan(1e-8);expect(Math.max(...m.gait.strides.map(Math.abs))).toBeLessThan(1e-8);dispose(m);
    }
  });

  it('integrates acceleration, walking and stopping consistently at 30, 60 and 120 Hz',()=>{
    for(const id of ids){const runs=[];
      for(const hz of [30,60,120]){const m=make(id),g=m.gait;for(let i=0;i<hz*3;i++)api.gait(g,i<hz?speeds[id]:i<hz*2?speeds[id]*.45:0,speeds[id],2,'mammal',1/hz,false,.7);
        runs.push({phase:g.phase,rate:g.rate,effort:g.effort,bob:g.bob,tail:g.tail,strides:[...g.strides]});dispose(m);
      }
      for(const key of ['phase','rate','effort','bob','tail']){expect(runs[0][key]).toBeCloseTo(runs[1][key],9);expect(runs[0][key]).toBeCloseTo(runs[2][key],9);}
      for(let i=0;i<4;i++)expect(runs[0].strides[i]).toBeCloseTo(runs[2].strides[i],9);
    }
  });

  it('rests all four feet and freezes phase under reduced motion, then resumes smoothly',()=>{
    for(const id of ids){const m=make(id),g=m.gait;for(let i=0;i<90;i++)api.gait(g,speeds[id],speeds[id],2,'mammal',1/60,false,.7);
      const phase=g.phase;api.gait(g,speeds[id],speeds[id],2,'mammal',60,true,.7);applyFeet(m);
      expect(g.phase).toBe(phase);expect(g.strides).toEqual([0,0,0,0]);for(const key of ['rate','effort','front','hind','bob','tail'])expect(g[key]).toBe(0);
      expect(new THREE.Box3().setFromObject(m.root).min.y).toBeCloseTo(-.84,6);
      api.gait(g,speeds[id],speeds[id],2,'mammal',1/60,false,.7);expect(g.effort).toBeGreaterThan(0);expect(g.effort).toBeLessThan(.12);
      expect(Math.max(...g.strides.map(Math.abs))).toBeLessThan(.1);expect(g.phase-phase).toBeLessThan(.05);dispose(m);
    }
  });

  it('keeps swept feet above the contact plane throughout rapid motion',()=>{
    for(const id of ids){const m=make(id),g=m.gait;for(let i=0;i<180;i++){
      api.gait(g,speeds[id]*4,speeds[id],2,'mammal',1/60,false,.7);applyFeet(m);m.root.updateMatrixWorld(true);
      expect(g.effort).toBeGreaterThanOrEqual(0);expect(g.effort).toBeLessThanOrEqual(1);expect(Math.max(...g.strides.map(Math.abs))).toBeLessThanOrEqual(.6);
      expect(g.bob).toBeGreaterThanOrEqual(0);expect(g.bob).toBeLessThan(.06);expect(footClearance(m,()=>-.84)).toBeGreaterThan(-1e-6);
    }dispose(m);}
  });

  it('preserves geometry buffers, upload versions, material identity and posture objects during motion',()=>{
    for(const id of ids){const m=make(id),before=[];m.root.traverse(mesh=>{if(!mesh.isMesh)return;
      before.push({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.fromEntries(['position','normal','color'].map(key=>[key,{array:mesh.geometry.attributes[key].array,version:mesh.geometry.attributes[key].version}]))});
    });const strides=m.gait.strides,terrain=m.gait.terrain;
      for(let i=0;i<120;i++){api.gait(m.gait,speeds[id],speeds[id],2,'mammal',1/60,false,.7);applyFeet(m);pose(m,i*.04,0,.6,2,(x,z)=>.2*x-.1*z);}
      expect(m.gait.strides).toBe(strides);expect(m.gait.terrain).toBe(terrain);
      for(const item of before){expect(item.mesh.geometry).toBe(item.geometry);expect(item.mesh.material).toBe(item.material);
        for(const key of ['position','normal','color']){expect(item.mesh.geometry.attributes[key].array).toBe(item.attributes[key].array);expect(item.mesh.geometry.attributes[key].version).toBe(item.attributes[key].version);}
      }dispose(m);
    }
  });
});

describe('Rainforest prey terrain support',()=>{
  it('keeps every moving foot clear across 48 combinations of model, incline and heading',()=>{
    for(const id of ids)for(const slope of [[.32,.27],[-.35,.2],[.5,-.35]])for(const heading of [0,.7,Math.PI,5.4]){
      const m=make(id),height=(x,z)=>slope[0]*x+slope[1]*z;pose(m,0,0,heading,2,()=>0,0,true);
      for(let i=0;i<45;i++){api.gait(m.gait,speeds[id],speeds[id],2,'mammal',1/60,false,.7);applyFeet(m);pose(m,i*.03,0,heading,2,height);
        expect(footClearance(m,height)).toBeGreaterThan(-1e-5);
      }dispose(m);
    }
  });

  it('supports changing headings over a rounded crest and keeps slope contact when reduced motion rests the feet',()=>{
    const crest=(x,z)=>.08*Math.sin(x*.4)+.05*Math.cos(z*.6),incline=(x,z)=>.3*x-.2*z;
    for(const id of ids){const m=make(id);
      for(let i=0;i<160;i++){api.gait(m.gait,speeds[id],speeds[id],2,'mammal',1/60,false,.7);applyFeet(m);pose(m,-4+i*.05,Math.sin(i*.03),i*.018,2,crest);
        expect(footClearance(m,crest)).toBeGreaterThan(-.002);
      }dispose(m);
      for(const size of [.75,3.15,4.05,4.5]){const quiet=make(id,size);api.gait(quiet.gait,speeds[id],speeds[id],size,'mammal',.25,false,.7);
        api.gait(quiet.gait,0,speeds[id],size,'mammal',0,true,.7);applyFeet(quiet);const t=pose(quiet,2,-3,.7,size,incline,0,true);
        expect(t.contact).toBe(1);expect(t.lift).toBeGreaterThanOrEqual(0);expect(quiet.gait.bob).toBe(0);
        expect(footClearance(quiet,incline)).toBeGreaterThan(-1e-5);expect(footClearance(quiet,incline)).toBeLessThan(.001);dispose(quiet);
      }
    }
  });
});
