import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const api=Function('THREE',['createFishBodyGeometry','createFishFinGeometry','advanceFishSwim','preyKindFor','buildPreyVisual'].map(body).join('\n')+';return {build:buildPreyVisual,body:createFishBodyGeometry,fin:createFishFinGeometry,advance:advanceFishSwim};')(THREE);
const state=()=>({phase:null,rate:Math.PI*1.3,amplitude:0,tailYaw:0,bodyYaw:0,roll:0});
describe('Raptor fish surfaces and swimming',()=>{
  it('builds a three-mesh fish with finite shaded surfaces and a connected forked tail',()=>{
    const fish=api.build({id:'fish',color:0x60a5fa},2);let meshes=0;fish.root.traverse(o=>{if(o.isMesh){meshes++;const p=o.geometry.attributes.position,n=o.geometry.attributes.normal;for(let i=0;i<p.count;i++)expect([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)).toBe(true);}});
    expect(meshes).toBe(3);expect(fish.tail.position.z).toBe(-0.98);expect(fish.tail.rotation.x).toBe(0);
    const box=new THREE.Box3().setFromObject(fish.body);expect(box.min.z).toBeLessThan(fish.tail.position.z);expect(box.max.z).toBeGreaterThan(1);
    expect(fish.body.geometry.attributes.color.count).toBe(fish.body.geometry.attributes.position.count);
  });
  it('uses nondegenerate fin faces with a true notch between tail lobes',()=>{
    const geometry=api.fin(1,true),p=geometry.attributes.position,ids=geometry.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
    let notch=false;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<0.0001&&Math.abs(p.getZ(i)+0.23)<0.0001)notch=true;expect(notch).toBe(true);
    for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(0.001);}
  });
  it('keeps phase and amplitude consistent across frame rates through a speed change',()=>{
    const runs=[];for(const hz of [30,60,120]){const p=state();for(let i=0;i<hz*2;i++)api.advance(p,i<hz?0.2:1.4,1.5,1/hz,false,0.7);runs.push(p);}
    for(const key of ['phase','rate','amplitude','tailYaw','bodyYaw','roll'])expect(runs[0][key]).toBeCloseTo(runs[2][key],9);
    expect(runs[0].amplitude).toBeLessThanOrEqual(0.305);expect(Math.abs(runs[0].bodyYaw)).toBeLessThan(0.04);expect(Math.abs(runs[0].roll)).toBeLessThan(0.019);
  });
  it('freezes tail phase under reduced motion and ramps the stroke back in gently',()=>{
    const p=state();for(let i=0;i<60;i++)api.advance(p,1,1.5,1/60,false,0.7);const phase=p.phase;
    api.advance(p,1,1.5,10,true,0.7);expect(p.phase).toBe(phase);expect(p.tailYaw).toBe(0);expect(p.bodyYaw).toBe(0);expect(p.roll).toBe(0);
    api.advance(p,1,1.5,1/60,false,0.7);expect(p.amplitude).toBeGreaterThan(0);expect(p.amplitude).toBeLessThan(0.03);
  });
});
