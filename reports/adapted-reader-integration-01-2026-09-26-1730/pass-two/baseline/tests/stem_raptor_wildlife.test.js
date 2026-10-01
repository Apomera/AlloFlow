import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const factory=Function('THREE',body('createPreyWingGeometry')+body('advancePreyVisualPose')+body('preyKindFor')+body('createPreyTailGeometry')+body('buildPreyVisual')+';return {make:createPreyWingGeometry,advance:advancePreyVisualPose,build:buildPreyVisual};')(THREE);
const pose=()=>({heading:null,bank:0,spread:0,wingAngle:0.08});
describe('Raptor wildlife surfaces and movement',()=>{
  it('keeps tapered wings mirrored with finite upward normals and valid faces',()=>{
    const left=factory.make(2,-1),right=factory.make(2,1);
    for(let i=0;i<left.attributes.position.count;i++){
      const a=left.attributes.position,b=right.attributes.position;
      expect(a.getX(i)).toBe(-b.getX(i));expect(a.getY(i)).toBe(b.getY(i));expect(a.getZ(i)).toBe(b.getZ(i));
      for(const g of [left,right])expect(g.attributes.normal.getY(i)).toBeGreaterThan(0.7);
    }
    for(const g of [left,right]){const p=g.attributes.position,ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(0.00001);}}
    expect(right.attributes.position.count).toBe(45);
  });
  it('folds alongside the body at rest without changing the ground-contact envelope or mesh count',()=>{
    const bird=factory.build({id:'pigeon',color:0x9ca3af},2);let meshes=0;bird.root.traverse(o=>{if(o.isMesh)meshes++;});
    expect(meshes).toBe(5);expect(new THREE.Box3().setFromObject(bird.root).min.y).toBeCloseTo(-2*0.42*0.72,5);
    for(const wing of bird.wings){expect(wing.scale.x).toBe(0.3);wing.updateMatrixWorld(true);const p=wing.geometry.attributes.position,v=new THREE.Vector3();let reach=0;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(wing.matrixWorld);reach=Math.max(reach,Math.abs(v.x));}expect(reach).toBeLessThan(0.96);}
  });
  it('turns across the angle seam along the short arc and settles equally across frame rates',()=>{
    const seam=pose();seam.heading=Math.PI-0.05;factory.advance(seam,-0.05,-1,2,100,0,true,1/60,false);
    expect(Math.atan2(Math.sin(seam.heading-(Math.PI-0.05)),Math.cos(seam.heading-(Math.PI-0.05)))).toBeGreaterThan(0);
    const results=[];for(const hz of [30,60,120]){const p=pose();p.heading=0;for(let i=0;i<hz;i++)factory.advance(p,1,0,2,i*1000/hz,0,true,1/hz,false);results.push(p);expect(p.spread).toBeGreaterThan(0.999);expect(Math.abs(p.bank)).toBeLessThan(0.24);}
    expect(results[0].heading).toBeCloseTo(results[2].heading,10);expect(results[0].spread).toBeCloseTo(results[2].spread,10);
  });
  it('folds after landing and removes decorative banking and wingbeats under reduced motion',()=>{
    const p=pose();p.spread=1;p.bank=0.2;
    factory.advance(p,1,1,3,500,1,true,1/60,true);expect(p.bank).toBe(0);expect(p.wingAngle).toBe(0.08);
    for(let i=0;i<120;i++)factory.advance(p,0,0,0,500+i*16.667,1,false,1/60,false);
    expect(p.spread).toBeLessThan(0.00001);expect(p.wingAngle).toBeCloseTo(0.08,5);
  });
});
