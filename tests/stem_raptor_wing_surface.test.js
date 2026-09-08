import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name,end,scope={}){const a=source.indexOf('function '+name+'('),b=source.indexOf(end,a);return Function(...Object.keys(scope),'return ('+source.slice(a,b).trim()+')')(...Object.values(scope));}
function surface(primaryFingers=5,isOspreyWing=false){return extract('sampleRaptorWingSurface','        function createTaperedWing',{wingSpan:3,wingDepth:0.64,silhouetteProfile:{primaryFingers,sweep:-0.26,tipWidth:0.58},isOspreyWing});}
describe('Raptor sculpted wing surfaces',()=>{
  it('keeps both wings mirrored with a raised chord and continuous elbow',()=>{
    for(const fingers of [0,5])for(const osprey of [false,true]){
      const sample=surface(fingers,osprey);
      for(let i=0;i<=20;i++)for(let j=0;j<=6;j++){
        const a=sample(i/20,j/6,-1),b=sample(i/20,j/6,1);
        expect(a.x).toBe(-b.x);expect(a.y).toBe(b.y);expect(a.z).toBe(b.z);expect(Object.values(a).every(Number.isFinite)).toBe(true);
      }
      expect(sample(0.5,0.5,1).y).toBeGreaterThan(sample(0.5,0,1).y+0.03);
      for(const elbow of [0.5,0.52])for(const v of [0,1])expect(Math.abs(sample(elbow-1e-6,v,1).z-sample(elbow+1e-6,v,1).z)).toBeLessThan(0.00001);
    }
  });
  it('scales detail with consistently upward normals and nondegenerate triangles',()=>{
    const counts=[];
    for(const quality of ['low','balanced','high'])for(const side of [-1,1]){
      const make=extract('createTaperedWing','        var leftWingSurface',{THREE,graphicsQuality:quality,sampleRaptorWingSurface:surface()});
      const g=make(side),p=g.attributes.position,n=g.attributes.normal;counts.push(p.count);
      for(let i=0;i<n.count;i++){expect(n.getY(i)).toBeGreaterThan(0.8);expect(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))).toBeCloseTo(1,5);}
      const ids=g.index.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
      for(let i=0;i<ids.length;i+=3){a.fromBufferAttribute(p,ids[i]);b.fromBufferAttribute(p,ids[i+1]);c.fromBufferAttribute(p,ids[i+2]);expect(b.sub(a).cross(c.sub(a)).length()).toBeGreaterThan(0.0001);}
      g.dispose();
    }
    expect(counts).toEqual([77,77,105,105,133,133]);
  });
});
const flex=extract('updateRaptorPrimaryFlex','        // Each primary pivots');
describe('Raptor outer-feather follow-through',()=>{
  it('responds smoothly, stays bounded, and settles after the wing stops',()=>{
    const state={angle:0,bend:0};let peak=0;
    for(let i=0;i<240;i++){flex(state,Math.sin(i/60*8)*0.6,0,false,1/60);peak=Math.max(peak,Math.abs(state.bend));expect(Math.abs(state.bend)).toBeLessThanOrEqual(0.16);}
    expect(peak).toBeGreaterThan(0.03);
    for(let i=0;i<180;i++)flex(state,0.15,0,false,1/60);
    expect(Math.abs(state.bend)).toBeLessThan(0.00001);
  });
  it('reduces follow-through in a dive and clears it immediately when motion is disabled',()=>{
    const open={angle:0,bend:0},tucked={angle:0,bend:0};
    for(let i=0;i<12;i++){flex(open,0.6,0,false,1/60);flex(tucked,0.6,1,false,1/60);}
    expect(Math.abs(tucked.bend)).toBeCloseTo(Math.abs(open.bend)*0.2,6);
    flex(open,0.2,0,true,1/60);expect(open).toEqual({angle:0.2,bend:0});
    flex(open,0.2,0,false,1/60);expect(open.bend).toBe(0);
  });
});
