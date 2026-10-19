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
const names=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildMammalPreyParts','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose','advanceGroundPreyTerrain'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,gait:advanceGroundPreyGait,leg:setGroundPreyLegPose,terrain:advanceGroundPreyTerrain};')(THREE);
// Production prey carry their buildPreyVisual model as prey.animation; clearCarriedPrey reads it.
const carryFixture=Function('THREE','mesh','animation','var talonGroup=new THREE.Group();talonGroup.add(mesh);var carriedPrey={prey:{mesh:mesh,animation:animation}},studyBoundsDirty=false;'+body('clearCarriedPrey')+';return {clear:clearCarriedPrey,talonGroup:talonGroup,state:function(){return {carriedPrey:carriedPrey,studyBoundsDirty:studyBoundsDirty};}};');
const ids=['fawnDeer','pronghornCalf','fox'];
const make=(id,size=2)=>api.build({id,color:0xa16207},size);
function resources(model){const result=new Set();model.root.traverse(o=>{if(o.geometry)result.add(o.geometry);if(o.material)result.add(o.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function applyFeet(model){model.legs.forEach((leg,index)=>api.leg(leg,model.gait.strides[index]));}
function terrainPose(model,x,z,heading,size,height,dt=1/60,reduced=false){
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

describe('Mountain mammal prey detail',()=>{
  it('builds recognizable texture-free prey within seven meshes and one shared material',()=>{
    for(const id of ids){const m=make(id),meshes=[];m.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
      expect(m.kind).toBe('mammal');expect(meshes).toHaveLength(7);expect(new Set(meshes.map(mesh=>mesh.material)).size).toBe(1);
      expect(m.gait.quadruped).toBe(true);expect(m.gait.fox).toBe(id==='fox');
      for(const mesh of meshes){const g=mesh.geometry;
        expect(mesh.material.vertexColors).toBe(true);expect(mesh.material.map).toBeNull();
        expect(g.attributes.position.count).toBeGreaterThan(20);expect(g.attributes.color.count).toBe(g.attributes.position.count);
        for(const key of ['position','normal','color'])expect(Array.from(g.attributes[key].array).every(Number.isFinite)).toBe(true);
        expect(Array.from(g.attributes.color.array).every(value=>value>=0&&value<=1)).toBe(true);
      }dispose(m);
    }
  });
  it('gives deer taller profiles and gives the fox a longer, full tail',()=>{
    const fawn=make('fawnDeer'),calf=make('pronghornCalf'),fox=make('fox');
    const box=model=>new THREE.Box3().setFromObject(model),foxTail=box(fox.tail),fawnTail=box(fawn.tail),calfTail=box(calf.tail);
    expect(box(fawn.root).max.y).toBeGreaterThan(box(fox.root).max.y+.15);
    expect(box(calf.root).max.y).toBeGreaterThan(box(fox.root).max.y+.15);
    expect(foxTail.max.z-foxTail.min.z).toBeGreaterThan((fawnTail.max.z-fawnTail.min.z)*2);
    expect(foxTail.max.z-foxTail.min.z).toBeGreaterThan((calfTail.max.z-calfTail.min.z)*2);
    expect(foxTail.max.x-foxTail.min.x).toBeGreaterThan(.15);
    for(const m of [fawn,calf,fox]){const c=m.body.geometry.attributes.color,values=Array.from({length:c.count},(_,i)=>c.getX(i)*.2126+c.getY(i)*.7152+c.getZ(i)*.0722);
      expect(Math.max(...values)-Math.min(...values)).toBeGreaterThan(.15);dispose(m);
    }
  });
  it('places four independent feet at the original rest floor at every gameplay size',()=>{
    for(const id of ids)for(const size of [.75,2,6.3,7.2]){const m=make(id,size),box=new THREE.Box3().setFromObject(m.root);
      expect(m.legs).toHaveLength(4);expect(new Set(m.legs.map(leg=>leg.geometry)).size).toBe(4);
      expect(box.min.y).toBeCloseTo(-size*.42,5);
      expect(m.legs[0].position.x).toBeLessThan(0);expect(m.legs[1].position.x).toBeGreaterThan(0);
      expect(m.legs[2].position.x).toBeLessThan(0);expect(m.legs[3].position.x).toBeGreaterThan(0);
      expect(m.legs[0].position.z).toBeGreaterThan(0);expect(m.legs[1].position.z).toBeGreaterThan(0);
      expect(m.legs[2].position.z).toBeLessThan(0);expect(m.legs[3].position.z).toBeLessThan(0);
      for(const leg of m.legs){expect(leg.userData.depth).toBeGreaterThan(0);expect(leg.userData.reach).toBeGreaterThan(0);expect(Number.isFinite(leg.userData.restY)).toBe(true);}
      dispose(m);
    }
  });
  it('removes carried prey and disposes seven geometries and one shared material exactly once',()=>{
    for(const id of ids){const m=make(id),all=resources(m),counts=new Map();expect(all.size).toBe(8);
      all.forEach(resource=>{counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));});
      const preyMesh=new THREE.Group();preyMesh.add(m.root);const fixture=carryFixture(THREE,preyMesh,m);
      expect(preyMesh.parent).toBe(fixture.talonGroup);expect(fixture.state().carriedPrey.prey.mesh).toBe(preyMesh);
      fixture.clear();fixture.clear();
      expect(preyMesh.parent).toBeNull();expect(fixture.talonGroup.children).toHaveLength(0);
      expect(fixture.state()).toEqual({carriedPrey:null,studyBoundsDirty:true});
      expect(Array.from(counts.values())).toEqual(Array(8).fill(1));expect(counts.get(m.body.material)).toBe(1);
    }
  });
});

describe('Four-legged mammal movement',()=>{
  it('uses four distinct leg strides at walking speed and settles after stopping',()=>{
    for(const id of ids){const m=make(id),g=m.gait;g.phase=.7;g.effort=.2;
      api.gait(g,2,12,2,'mammal',0,false,.7);expect(new Set(g.strides.map(value=>value.toFixed(6))).size).toBe(4);
      for(let i=0;i<120;i++)api.gait(g,12,12,2,'mammal',1/60,false,.7);
      expect(g.effort).toBeGreaterThan(.99);
      for(let i=0;i<180;i++)api.gait(g,0,12,2,'mammal',1/60,false,.7);
      expect(g.effort).toBeLessThan(1e-8);expect(g.bob).toBeLessThan(1e-8);expect(Math.max(...g.strides.map(Math.abs))).toBeLessThan(1e-8);dispose(m);
    }
  });
  it('integrates acceleration, running and stopping consistently at 30, 60 and 120 Hz',()=>{
    for(const id of ids){const runs=[];
      for(const hz of [30,60,120]){const m=make(id),g=m.gait;for(let i=0;i<hz*3;i++)api.gait(g,i<hz?12:i<hz*2?3:0,12,2,'mammal',1/hz,false,.7);
        runs.push({phase:g.phase,rate:g.rate,effort:g.effort,bob:g.bob,tail:g.tail,strides:[...g.strides]});dispose(m);
      }
      for(const key of ['phase','rate','effort','bob','tail'])expect(runs[0][key]).toBeCloseTo(runs[2][key],9);
      for(let i=0;i<4;i++)expect(runs[0].strides[i]).toBeCloseTo(runs[2].strides[i],9);
    }
  });
  it('rests all four feet and freezes phase under reduced motion, then resumes smoothly',()=>{
    for(const id of ids){const m=make(id),g=m.gait;for(let i=0;i<90;i++)api.gait(g,12,12,2,'mammal',1/60,false,.7);
      const phase=g.phase;api.gait(g,12,12,2,'mammal',60,true,.7);applyFeet(m);
      expect(g.phase).toBe(phase);expect(g.strides).toEqual([0,0,0,0]);
      for(const key of ['rate','effort','front','hind','bob','tail'])expect(g[key]).toBe(0);
      expect(new THREE.Box3().setFromObject(m.root).min.y).toBeCloseTo(-.84,6);
      api.gait(g,12,12,2,'mammal',1/60,false,.7);expect(g.effort).toBeGreaterThan(0);expect(g.effort).toBeLessThan(.12);
      expect(Math.max(...g.strides.map(Math.abs))).toBeLessThan(.1);expect(g.phase-phase).toBeLessThan(.05);dispose(m);
    }
  });
  it('keeps feet above the contact plane throughout fast escape strides',()=>{
    for(const id of ids){const m=make(id),g=m.gait;for(let i=0;i<180;i++){
      api.gait(g,40,12,2,'mammal',1/60,false,.7);applyFeet(m);m.root.updateMatrixWorld(true);
      expect(g.effort).toBeGreaterThanOrEqual(0);expect(g.effort).toBeLessThanOrEqual(1);
      expect(Math.max(...g.strides.map(Math.abs))).toBeLessThanOrEqual(.8);expect(g.bob).toBeGreaterThanOrEqual(0);expect(g.bob).toBeLessThanOrEqual(.24);
      expect(footClearance(m,()=>-.84)).toBeGreaterThan(-1e-6);
    }dispose(m);}
  });
  it('animates transforms while preserving geometry buffers, upload versions and material identity',()=>{
    for(const id of ids){const m=make(id),before=[];m.root.traverse(mesh=>{if(!mesh.isMesh)return;
      before.push({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.fromEntries(['position','normal','color'].map(key=>[key,{array:mesh.geometry.attributes[key].array,version:mesh.geometry.attributes[key].version}]))});
    });const strides=m.gait.strides,terrain=m.gait.terrain;
      for(let i=0;i<120;i++){api.gait(m.gait,12,12,2,'mammal',1/60,false,.7);applyFeet(m);terrainPose(m,i*.04,0,.6,2,(x,z)=>.2*x-.1*z);}
      expect(m.gait.strides).toBe(strides);expect(m.gait.terrain).toBe(terrain);
      for(const item of before){expect(item.mesh.geometry).toBe(item.geometry);expect(item.mesh.material).toBe(item.material);
        for(const key of ['position','normal','color']){expect(item.mesh.geometry.attributes[key].array).toBe(item.attributes[key].array);expect(item.mesh.geometry.attributes[key].version).toBe(item.attributes[key].version);}
      }dispose(m);
    }
  });
});

describe('Mountain mammal terrain support',()=>{
  it('keeps every moving foot clear across three inclines and four headings for all three models',()=>{
    for(const id of ids)for(const slope of [[.32,.27],[-.35,.2],[.5,-.35]])for(const heading of [0,.7,Math.PI,5.4]){
      const m=make(id),height=(x,z)=>slope[0]*x+slope[1]*z;terrainPose(m,0,0,heading,2,()=>0,0,true);
      for(let i=0;i<45;i++){api.gait(m.gait,12,12,2,'mammal',1/60,false,.7);applyFeet(m);terrainPose(m,i*.03,0,heading,2,height);
        expect(footClearance(m,height)).toBeGreaterThan(-1e-5);
      }dispose(m);
    }
  }, 20000);
  it('retains terrain contact and quiet feet under reduced motion at large prey sizes',()=>{
    for(const id of ids)for(const size of [.75,6.3,7.2]){const m=make(id,size),height=(x,z)=>.3*x-.2*z;
      api.gait(m.gait,12,12,size,'mammal',.25,false,.7);api.gait(m.gait,0,12,size,'mammal',0,true,.7);applyFeet(m);
      const t=terrainPose(m,2,-3,.7,size,height,0,true);expect(t.contact).toBe(1);expect(t.lift).toBeGreaterThanOrEqual(0);
      expect(footClearance(m,height)).toBeGreaterThan(-1e-5);expect(footClearance(m,height)).toBeLessThan(.001);expect(m.gait.bob).toBe(0);dispose(m);
    }
  });
});
