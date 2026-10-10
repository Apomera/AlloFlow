import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const names=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,advance:advanceGroundPreyGait,leg:setGroundPreyLegPose};')(THREE);
const ids=['rodent','rabbit','hare','arcticHare','groundSquirrel','squirrel','lemming','skunk'];
const make=(id,size=2)=>api.build({id,color:0xa78b6f},size);
function dispose(model){const resources=new Set();model.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}

describe('Ground prey detail and contact',()=>{
  it('builds eight readable, texture-free models within five meshes and one material',()=>{
    for(const id of ids){
      const m=make(id),meshes=[];m.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
      expect(meshes).toHaveLength(5);expect(new Set(meshes.map(o=>o.material)).size).toBe(1);
      for(const mesh of meshes){
        expect(mesh.material.map).toBeNull();expect(mesh.material.vertexColors).toBe(true);
        const g=mesh.geometry;expect(g.attributes.color.count).toBe(g.attributes.position.count);
        for(const key of ['position','normal','color'])expect(Array.from(g.attributes[key].array).every(Number.isFinite)).toBe(true);
        expect(Array.from(g.attributes.color.array).every(v=>v>=0&&v<=1)).toBe(true);
      }
      dispose(m);
    }
  });
  it('places four paws in front and rear pairs at the original resting contact height',()=>{
    for(const id of ids)for(const size of [.75,2,4]){
      const m=make(id,size),box=new THREE.Box3().setFromObject(m.root);
      expect(box.min.y).toBeCloseTo(-size*.42,6);expect(m.legs).toHaveLength(2);
      expect(m.legs[0].position.z).toBeGreaterThan(0);expect(m.legs[1].position.z).toBeLessThan(0);
      for(const leg of m.legs){const p=leg.geometry.attributes.position;let left=0,right=0;
        for(let i=0;i<p.count;i++)if(p.getY(i)<-size*.24){if(p.getX(i)<0)left++;else right++;}
        expect(left).toBeGreaterThan(20);expect(right).toBeGreaterThan(20);
      }
      dispose(m);
    }
  });
  it('gives rabbits long ears, mice slender tails and squirrels raised bushy tails',()=>{
    const rabbit=make('rabbit'),hare=make('hare'),mouse=make('rodent'),squirrel=make('squirrel'),lemming=make('lemming');
    const bounds=m=>new THREE.Box3().setFromObject(m);
    expect(bounds(hare.root).max.y).toBeGreaterThan(bounds(rabbit.root).max.y+.15);
    expect(bounds(mouse.tail).min.z).toBeLessThan(bounds(lemming.tail).min.z-.5);
    expect(bounds(squirrel.tail).max.y).toBeGreaterThan(1.4);
    expect(bounds(mouse.tail).max.y-bounds(mouse.tail).min.y).toBeLessThan(.25);
    [rabbit,hare,mouse,squirrel,lemming].forEach(dispose);
  });
  it('makes skunk stripes and winter hare fur readable in linear color space',()=>{
    const skunk=make('skunk'),snow=make('arcticHare');
    const luminance=m=>{const c=m.body.geometry.attributes.color;return Array.from({length:c.count},(_,i)=>c.getX(i)*.2126+c.getY(i)*.7152+c.getZ(i)*.0722);};
    const markings=luminance(skunk);expect(Math.min(...markings)).toBeLessThan(.04);expect(Math.max(...markings)).toBeGreaterThan(.6);
    expect(Math.min(...luminance(snow))).toBeGreaterThan(.65);
    dispose(skunk);dispose(snow);
  });
  it('keeps swept paws above the original plane throughout every stride',()=>{
    for(const id of ids){const m=make(id),g=m.gait;
      for(let i=0;i<90;i++){
        api.advance(g,8,8,2,m.kind,1/30,false,.7);m.legs.forEach((leg,i)=>api.leg(leg,i===0?g.front:g.hind));
        const bottom=new THREE.Box3().setFromObject(m.root).min.y;
        expect(bottom).toBeGreaterThanOrEqual(-.84-1e-6);expect(bottom).toBeLessThan(-.68);
      }
      dispose(m);
    }
  });
});

describe('Ground prey speed-responsive gait',()=>{
  const state=()=>({phase:null,rate:0,effort:0,front:0,hind:0,bob:0,tail:0});
  it('holds a quiet stance when stationary and settles after stopping',()=>{
    const g=state();for(let i=0;i<60;i++)api.advance(g,0,7,2,'rabbit',1/60,false,.7);
    expect(g.front).toBe(0);expect(g.hind).toBe(0);expect(g.bob).toBe(0);expect(g.tail).toBe(0);expect(g.phase).toBe(.7);
    for(let i=0;i<60;i++)api.advance(g,7,7,2,'rabbit',1/60,false,.7);
    expect(g.effort).toBeGreaterThan(.99);const before=g.effort;
    api.advance(g,0,7,2,'rabbit',1/60,false,.7);expect(g.effort).toBeLessThan(before);expect(g.effort).toBeGreaterThan(.8);
    for(let i=0;i<120;i++)api.advance(g,0,7,2,'rabbit',1/60,false,.7);
    expect(g.effort).toBeLessThan(1e-6);expect(Math.abs(g.front)+Math.abs(g.hind)+g.bob).toBeLessThan(1e-6);
  });
  it('integrates acceleration and stopping consistently at 30, 60 and 120 Hz',()=>{
    const runs=[];for(const hz of [30,60,120]){const g=state();for(let i=0;i<hz*3;i++)api.advance(g,i<hz?7:i<hz*2?2:0,7,2,'rabbit',1/hz,false,.7);runs.push(g);}
    for(const key of ['phase','rate','effort','front','hind','bob','tail'])expect(runs[0][key]).toBeCloseTo(runs[2][key],9);
  });
  it('freezes phase and rests immediately under reduced motion, then eases back into movement',()=>{
    const g=state();for(let i=0;i<60;i++)api.advance(g,7,7,2,'rabbit',1/60,false,.7);const phase=g.phase;
    api.advance(g,7,7,2,'rabbit',60,true,.7);expect(g.phase).toBe(phase);
    for(const key of ['rate','effort','front','hind','bob','tail'])expect(g[key]).toBe(0);
    api.advance(g,7,7,2,'rabbit',1/60,false,.7);expect(g.effort).toBeGreaterThan(0);expect(g.effort).toBeLessThan(.12);expect(Math.abs(g.front)).toBeLessThan(.06);
  });
  it('keeps effort, foot angles and body lift bounded during a fast escape',()=>{
    for(const kind of ['rabbit','rodent','mammal']){const g=state();for(let i=0;i<300;i++){
      api.advance(g,40,.2,4,kind,1/60,false,.7);
      expect(g.effort).toBeGreaterThanOrEqual(0);expect(g.effort).toBeLessThanOrEqual(1);
      expect(Math.abs(g.front)).toBeLessThanOrEqual(.44);expect(Math.abs(g.hind)).toBeLessThanOrEqual(.6);
      expect(g.bob).toBeGreaterThanOrEqual(0);expect(g.bob).toBeLessThanOrEqual(4*(kind==='rabbit'?.075:.025));
    }}
  });
});
