import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const factory=Function('THREE',body('preyBirdPalette')+body('createPreyBirdBodyGeometry')+body('createPreyWingGeometry')+body('advancePreyVisualPose')+body('preyKindFor')+body('createPreyTailGeometry')+body('buildPreyVisual')+';return {make:createPreyWingGeometry,advance:advancePreyVisualPose,build:buildPreyVisual};')(THREE);
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
  it('does not jump to a different pose when an alert changes without elapsed time',()=>{
    const p=pose();p.spread=1;
    factory.advance(p,0,1,3,18370,.7,false,0,false);
    const before={phase:p.phase,angle:p.wingAngle,rate:p.rate};
    factory.advance(p,0,1,3,18370,.7,true,0,false);
    expect({phase:p.phase,angle:p.wingAngle,rate:p.rate}).toEqual(before);
    factory.advance(p,0,1,3,18378,.7,true,1/120,false);
    expect(Math.abs(p.wingAngle-before.angle)).toBeLessThan(.06);
    expect(p.rate).toBeGreaterThan(8);expect(p.rate).toBeLessThan(9);
  });
  it('integrates the same alert and recovery motion at 30, 60 and 120 Hz',()=>{
    const results=[];
    for(const hz of [30,60,120]){
      const p=pose();p.spread=1;
      for(let i=0;i<hz*3;i++)factory.advance(p,0,1,3,100000+i*1000/hz,.7,i<hz,1/hz,false);
      results.push(p);
    }
    for(const key of ['phase','rate','wingAmplitude','wingAngle']){
      expect(results[0][key]).toBeCloseTo(results[2][key],9);
      expect(results[1][key]).toBeCloseTo(results[2][key],9);
    }
  });
  it('freezes decorative phase under reduced motion and resumes without a clock jump',()=>{
    const p=pose();p.spread=1;
    factory.advance(p,0,1,3,1000,.7,true,.1,false);
    const before={phase:p.phase,rate:p.rate,amplitude:p.wingAmplitude};
    factory.advance(p,0,1,3,60000,.7,false,60,true);
    expect({phase:p.phase,rate:p.rate,amplitude:p.wingAmplitude}).toEqual(before);
    expect(p.wingAngle).toBe(.08);
    factory.advance(p,0,1,3,60016,.7,false,1/60,false);
    expect(p.phase-before.phase).toBeGreaterThan(0);expect(p.phase-before.phase).toBeLessThan(.3);
  });
  it('keeps each bird recognizable with finite linear plumage and five existing meshes',()=>{
    const signatures=new Set();
    for(const id of ['pigeon','mourningDove','songbird','shorebird','duck','waterfowl','grouse','ptarmigan','smallOwl']){
      const bird=factory.build({id,color:0x9ca3af},2),meshes=[];
      bird.root.traverse(o=>{if(o.isMesh)meshes.push(o);});
      expect(meshes).toHaveLength(5);
      for(const mesh of meshes){
        expect(mesh.material.vertexColors).toBe(true);expect(mesh.material.map).toBeNull();
        const geometry=mesh.geometry;
        expect(geometry.attributes.color.count).toBe(geometry.attributes.position.count);
        expect(Array.from(geometry.attributes.color.array).every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
        expect(Array.from(geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);
      }
      signatures.add(Array.from(bird.body.geometry.attributes.color.array).map(v=>v.toFixed(4)).join(','));
      expect(new THREE.Box3().setFromObject(bird.root).min.y).toBeCloseTo(-2*.42*.72,5);
      const colors=bird.body.geometry.attributes.color;
      expect(new Set(Array.from(colors.array).map(v=>v.toFixed(3))).size).toBeGreaterThan(20);
      meshes.forEach(m=>m.geometry.dispose());new Set(meshes.map(m=>m.material)).forEach(m=>m.dispose());
    }
    expect(signatures.size).toBe(9);
  });
  it('uses a dark back and pale belly on a pigeon while keeping winter ptarmigan plumage light',()=>{
    function sample(id,top){
      const bird=factory.build({id,color:0xffffff},2),p=bird.body.geometry.attributes.position,c=bird.body.geometry.attributes.color;
      const values=[];for(let i=0;i<p.count;i++)if(top?p.getY(i)>.65:p.getY(i)<-.65)values.push(c.getX(i)*.2126+c.getY(i)*.7152+c.getZ(i)*.0722);
      return values.reduce((a,b)=>a+b,0)/values.length;
    }
    expect(sample('pigeon',false)).toBeGreaterThan(sample('pigeon',true)*2);
    expect(sample('ptarmigan',true)).toBeGreaterThan(.65);
  });
});
