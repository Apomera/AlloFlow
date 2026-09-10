import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const api=Function('THREE',['createRaptorIrisGeometry','createRaptorBeakGeometry','createRaptorFacialDiscGeometry','selectRaptorGazeTarget','advanceRaptorGaze'].map(body).join('\n')+';return {iris:createRaptorIrisGeometry,face:createRaptorFacialDiscGeometry,beak:createRaptorBeakGeometry,select:selectRaptorGazeTarget,advance:advanceRaptorGaze};')(THREE);
const prey=(x,y,z)=>({mesh:{position:new THREE.Vector3(x,y,z)}});
describe('Raptor facial surfaces and gaze',()=>{
  it('forms a finite, closed, forward-projecting bill with a downturned hook',()=>{
    const g=api.beak(),p=g.attributes.position,n=g.attributes.normal,ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),edges=new Map();
    expect(p.count).toBe(g.userData.rings*g.userData.segments+2);expect(p.count).toBe(274);for(const values of [p.array,n.array])expect(Array.from(values).every(Number.isFinite)).toBe(true);
    for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(1e-7);for(let j=0;j<3;j++){const u=ids[i+j],v=ids[i+(j+1)%3],key=[Math.min(u,v),Math.max(u,v)].join(':');edges.set(key,(edges.get(key)||0)+1);}}
    expect([...edges.values()].every(count=>count===2)).toBe(true);const tip=(g.userData.rings-1)*g.userData.segments,middle=8*g.userData.segments;expect(p.getZ(tip)).toBeGreaterThan(p.getZ(0));expect(p.getY(tip)).toBeLessThan(p.getY(middle)-0.05);expect(n.getX(g.userData.segments)).toBeGreaterThan(0);expect(g.attributes.rhBillAlong.count).toBe(p.count);expect(g.attributes.rhBillSection.count).toBe(p.count);
  });
  it('fits curved owl cheeks to the head with finite colors and outward faces',()=>{
    const g=api.face(),p=g.attributes.position,n=g.attributes.normal,ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();expect(p.count).toBe(242);expect(g.attributes.color.count).toBe(p.count);
    for(let i=0;i<p.count;i++){a.fromBufferAttribute(p,i);expect(a.length()).toBeCloseTo(0.224,6);expect(n.getZ(i)).toBeGreaterThan(0);}
    for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).z).toBeGreaterThan(0);}
  });
  it('selects by three-dimensional distance and releases removed or distant prey',()=>{
    const origin=new THREE.Vector3(),high=prey(1,100,0),near=prey(25,-8,15);expect(api.select([high,near],null,origin)).toBe(near);expect(api.select([high],near,origin)).toBe(null);
    const distant=prey(0,0,85);expect(api.select([distant],null,origin)).toBe(null);expect(api.select([distant],distant,origin)).toBe(distant);distant.mesh.position.z=93;expect(api.select([distant],distant,origin)).toBe(null);
  });
  it('retains attention across small nearest-neighbor changes but accepts a much closer target',()=>{
    const origin=new THREE.Vector3(),current=prey(0,0,40),other=prey(0,0,39);expect(api.select([other,current],current,origin)).toBe(current);other.mesh.position.z=30;expect(api.select([other,current],current,origin)).toBe(other);
  });
  it('settles consistently across frame rates with bounded yaw and vertical gaze',()=>{
    const runs=[];for(const hz of [30,60,120]){const state={yaw:0,pitch:0};for(let i=0;i<hz;i++)api.advance(state,new THREE.Vector3(40,-80,10),true,1/hz,false);runs.push(state);expect(state.yaw).toBeLessThanOrEqual(1.15);expect(state.pitch).toBeLessThanOrEqual(0.6);expect(state.pitch).toBeGreaterThan(0.5);}
    expect(runs[0].yaw).toBeCloseTo(runs[2].yaw,10);expect(runs[0].pitch).toBeCloseTo(runs[2].pitch,10);
  });
  it('aims correctly in a pitched and banked body frame and recenters quietly',()=>{
    const body=new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2,2.4,0.25)),local=new THREE.Vector3(0.35,-0.22,1).normalize(),world=local.clone().applyQuaternion(body),direction=world.clone().applyQuaternion(body.clone().invert()),state={yaw:0,pitch:0};
    api.advance(state,direction,true,10,false);const head=new THREE.Quaternion().setFromEuler(new THREE.Euler(state.pitch,state.yaw,0,'YXZ')),facing=new THREE.Vector3(0,0,1).applyQuaternion(head).applyQuaternion(body);expect(facing.dot(world)).toBeGreaterThan(0.999999);
    const before={...state};api.advance(state,direction,false,1/60,false);expect(Math.abs(state.yaw)).toBeLessThan(Math.abs(before.yaw));expect(Math.abs(state.yaw-before.yaw)).toBeLessThan(0.03);
    api.advance(state,direction,true,1/60,true);expect(state).toEqual({yaw:0,pitch:0});
  });
});

describe('Raptor iris surface',()=>{
  it('forms an outward-facing dome with radial UVs and a seated rim',()=>{
    const g=api.iris(),p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal,ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();expect(p.count).toBe(193);
    for(let i=0;i<p.count;i++){expect(n.getZ(i)).toBeGreaterThan(0);expect(p.getX(i)/0.036).toBeCloseTo(uv.getX(i)*2-1,5);expect(p.getY(i)/0.028).toBeCloseTo(uv.getY(i)*2-1,5);expect(p.getZ(i)).toBeGreaterThanOrEqual(0);expect(p.getZ(i)).toBeLessThanOrEqual(0.009201);}
    for(let i=161;i<193;i++)expect(p.getZ(i)).toBe(0);
    for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).z).toBeGreaterThan(1e-8);}
    for(const attribute of Object.values(g.attributes))expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);g.dispose();
  });
});
