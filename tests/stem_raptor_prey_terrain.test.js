import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const names=['preyKindFor','mergeGroundPreyParts','buildGroundPreyParts','buildPreyVisual','advanceGroundPreyGait','setGroundPreyLegPose','advanceGroundPreyTerrain'];
const api=Function('THREE',names.map(body).join('\n')+';return {build:buildPreyVisual,gait:advanceGroundPreyGait,leg:setGroundPreyLegPose,terrain:advanceGroundPreyTerrain};')(THREE);
const state=()=>({pitch:null,roll:0,lift:0,contact:1});
function pose(model,x,z,heading,size,height,dt=1/60,reduced=false,extra=0){
  const t=model.gait.terrain,y=height(x,z)+size*.42+extra;
  api.terrain(t,x,y,z,heading,size,size*.42,dt,reduced,height);
  model.root.position.set(x,y+t.lift+model.gait.bob,z);model.root.rotation.set(t.pitch,heading,t.roll,'YXZ');model.root.updateMatrixWorld(true);
  return t;
}
function footClearance(model,height){let min=Infinity;const point=new THREE.Vector3();
  for(const leg of model.legs){const p=leg.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(leg.matrixWorld);min=Math.min(min,point.y-height(point.x,point.z));}}
  return min;
}
function dispose(model){const resources=new Set();model.root.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)resources.add(o.material);});resources.forEach(o=>o.dispose());}

describe('Ground prey terrain posture',()=>{
  it('preserves the resting contact height on level terrain at every visual size',()=>{
    for(const size of [.75,2,4]){const m=api.build({id:'rabbit',color:0xa78b6f},size),t=pose(m,12,-9,.7,size,()=>3);
      expect(t.pitch).toBeCloseTo(0,10);expect(t.roll).toBeCloseTo(0,10);expect(t.lift).toBeCloseTo(0,10);expect(footClearance(m,()=>3)).toBeCloseTo(0,6);dispose(m);
    }
  });
  it('aligns all eight ground models with the slope at different headings',()=>{
    const height=(x,z)=>.3*x-.2*z,normal=new THREE.Vector3(-.3,1,.2).normalize();
    for(const id of ['rodent','rabbit','hare','arcticHare','groundSquirrel','squirrel','lemming','skunk'])for(const heading of [0,.7,Math.PI,5.4]){
      const m=api.build({id,color:0xa78b6f},2),t=pose(m,12,-9,heading,2,height);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(m.root.quaternion);expect(up.dot(normal)).toBeCloseTo(1,9);
      expect(t.lift).toBeCloseTo(.84*(Math.sqrt(1+.3**2+.2**2)-1),8);expect(footClearance(m,height)).toBeCloseTo(0,5);dispose(m);
    }
  });
  it('keeps moving feet above sloping ground while the body eases into alignment',()=>{
    const height=(x,z)=>.32*x+.27*z;
    for(const id of ['rabbit','rodent','skunk'])for(const size of [.75,2,4]){
      const m=api.build({id,color:0xa78b6f},size);pose(m,0,0,0,size,()=>0);
      let previous=0;
      for(let i=0;i<90;i++){
        api.gait(m.gait,7,7,size,m.kind,1/60,false,.7);m.legs.forEach((leg,j)=>api.leg(leg,j===0?m.gait.front:m.gait.hind));
        const t=pose(m,i*.03,0,.6,size,height);expect(footClearance(m,height)).toBeGreaterThan(-1e-5);
        expect(Math.abs(t.pitch-previous)).toBeLessThan(.08);previous=t.pitch;
      }
      dispose(m);
    }
  });
  it('eases toward a new incline consistently at 30, 60 and 120 Hz',()=>{
    const values=[];
    for(const hz of [30,60,120]){const t=state();api.terrain(t,0,.84,0,.7,2,.84,0,false,()=>0);for(let i=0;i<hz;i++)api.terrain(t,0,.84,0,.7,2,.84,1/hz,false,(x,z)=>.3*x+.2*z);values.push(t);}
    for(const key of ['pitch','roll','lift','contact']){expect(values[0][key]).toBeCloseTo(values[1][key],9);expect(values[0][key]).toBeCloseTo(values[2][key],9);}
  });
  it('supports feet while crossing a gentle rounded crest and changing direction',()=>{
    const height=(x,z)=>.08*Math.sin(x*.4)+.05*Math.cos(z*.6),m=api.build({id:'rabbit',color:0xa78b6f},2);
    for(let i=0;i<160;i++){pose(m,-4+i*.05,Math.sin(i*.03),i*.018,2,height);expect(footClearance(m,height)).toBeGreaterThan(-.002);}
    dispose(m);
  });
  it('keeps terrain support when reduced motion removes decorative gait',()=>{
    const m=api.build({id:'rabbit',color:0xa78b6f},2),height=(x,z)=>.28*z;
    pose(m,0,0,0,2,()=>0);api.gait(m.gait,7,7,2,'rabbit',.25,false,.7);
    api.gait(m.gait,0,7,2,'rabbit',0,true,.7);m.legs.forEach(leg=>api.leg(leg,0));
    const t=pose(m,0,0,0,2,height,0,true);expect(t.pitch).toBeCloseTo(-Math.atan(.28),9);expect(t.lift).toBeGreaterThan(0);expect(m.gait.bob).toBe(0);expect(footClearance(m,height)).toBeCloseTo(0,5);dispose(m);
  });
  it('releases terrain tilt when prey is above the ground and restores it on landing',()=>{
    const m=api.build({id:'squirrel',color:0xa78b6f},2),height=(x,z)=>x*.3+z*.2;
    pose(m,0,0,0,2,height,0,true);expect(m.gait.terrain.contact).toBe(1);
    const airborne=pose(m,0,0,0,2,height,0,true,2);expect(airborne.contact).toBe(0);expect(airborne.pitch).toBeCloseTo(0);expect(airborne.roll).toBeCloseTo(0);expect(airborne.lift).toBe(0);
    pose(m,0,0,0,2,height,0,true);expect(footClearance(m,height)).toBeCloseTo(0,5);dispose(m);
  });
  it('bounds body tilt on steep slopes and reuses the posture object',()=>{
    const t=state(),identity=t;
    for(const heading of [0,1,2,3]){api.terrain(t,0,.84,0,heading,2,.84,1/30,false,(x,z)=>x*3-z*2);expect(t).toBe(identity);expect(Math.abs(t.pitch)).toBeLessThanOrEqual(.5);expect(Math.abs(t.roll)).toBeLessThanOrEqual(.5);expect(Object.values(t).every(Number.isFinite)).toBe(true);expect(t.lift).toBeGreaterThanOrEqual(0);}
  });
});
