import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;for(;depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}return Function('return ('+source.slice(start,end)+')')();}
const conform=extract('conformRaptorShadow'),profile=extract('raptorShadowProfile');
describe('Raptor terrain shadow',()=>{
  it('keeps every vertex above curved terrain through changes in heading and footprint size',()=>{
    const geometry=new THREE.PlaneGeometry(1,1,10,10),p=geometry.attributes.position,uv=geometry.attributes.uv,buffer=p.array;
    const height=(x,z)=>x*0.3-z*0.15+Math.sin(x*0.6)*0.35;
    for(const heading of [0,0.7,Math.PI,5.4])for(const width of [2,6,12]){
      const x=12,z=-9,y=height(x,z);conform(geometry,x,z,y,width,heading,height);
      for(let i=0;i<p.count;i++){
        expect(p.getY(i)+y-height(x+p.getX(i),z+p.getZ(i))).toBeCloseTo(0.035,5);
        expect(Math.hypot(p.getX(i),p.getZ(i))).toBeCloseTo(Math.hypot(uv.getX(i)-0.5,uv.getY(i)-0.5)*width,5);
      }
      expect(p.array).toBe(buffer);
    }
    // All triangles face upward, including when the terrain patch twists.
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<geometry.index.count;i+=3){a.fromBufferAttribute(p,geometry.index.getX(i));b.fromBufferAttribute(p,geometry.index.getX(i+1));c.fromBufferAttribute(p,geometry.index.getX(i+2));expect(b.sub(a).cross(c.sub(a)).y).toBeGreaterThan(0);}
  });
  it('softens and fades progressively with height and keeps tucked silhouettes compact',()=>{
    let priorDiffusion=-1,priorFade=2;
    for(const height of [-1,0,1,10,50,85,150,220,500]){const state=profile(height,0,0,0);expect(state.diffusion).toBeGreaterThanOrEqual(priorDiffusion);expect(state.fade).toBeLessThanOrEqual(priorFade);priorDiffusion=state.diffusion;priorFade=state.fade;}
    expect(profile(220,0,0,0).fade).toBe(0);
    expect(profile(0,1,0.08,0).span).toBeLessThan(0.25);
    expect(profile(0,0,0.8,0.3).span).toBeLessThan(profile(0,0,0,0).span);
    expect(profile(0,0,Math.PI/2,Math.PI/2).span).toBeGreaterThan(0);
  });
});
