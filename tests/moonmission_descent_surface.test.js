import { beforeEach, describe, expect, it, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync('stem_lab/stem_tool_moonmission.js','utf8');
let P;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_moonmission.js','moonMission');P=window.MoonMissionPure;});
const geometries=[];
function grid(xs=[-4,-1,2,7],zs=[-3,0,5],height=(x,z)=>3+x*x*.2-z*.3,flipped=false){
  const g=new T.BufferGeometry(),positions=[],indices=[];
  for(const z of zs)for(const x of xs)positions.push(x,height(x,z),z);
  for(let row=0;row<zs.length-1;row++)for(let col=0;col<xs.length-1;col++){
    const a=row*xs.length+col,b=a+xs.length,c=b+1,d=a+1;
    const flip=typeof flipped==='function'?flipped(col,row):flipped;
    indices.push(...(flip?[a,b,c,a,c,d]:[a,b,d,b,c,d]));
  }
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
  g.parameters={widthSegments:xs.length-1,heightSegments:zs.length-1};geometries.push(g);return g;
}
function rayHeight(g,x,z){
  const ray=new T.Ray(new T.Vector3(x,10000,z),new T.Vector3(0,-1,0));
  const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3(),p=g.attributes.position;
  for(let i=0;i<g.index.count;i+=3){
    a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));
    if(ray.intersectTriangle(a,b,c,false,hit))return hit.y;
  }return null;
}
function extract(name,indent=2){const m=source.match(new RegExp('^'+' '.repeat(indent)+'function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^'+' '.repeat(indent)+'\\}', 'm'));if(!m)throw Error(name);return m[0];}
const drawing=new Proxy({}, {get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true;}});
const hardwareHelpers=new Function('THREE','document',[extract('mmLunarRng'),extract('mmBuildSurfaceLM'),extract('landingPadSamples',4),extract('landingPadSupport',4),
  'return {build:mmBuildSurfaceLM,samples:landingPadSamples,support:landingPadSupport};'].join('\n'))(T,{createElement:()=>({setAttribute(){},getContext:()=>drawing})});
const hardware=hardwareHelpers.build(T,null,true);hardware.position.y=-2.2-.02*.78;
const pads=hardwareHelpers.samples(hardware);
afterAll(()=>{
  const geo=new Set(geometries),materials=new Set(),textures=new Set();
  hardware.traverse(n=>{if(n.geometry)geo.add(n.geometry);if(n.material)materials.add(n.material);});
  materials.forEach(m=>{if(m.map)textures.add(m.map);if(m.bumpMap)textures.add(m.bumpMap);m.dispose();});
  geo.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
});

describe('the rendered lunar surface',()=>{
  it('interpolates a plane on nonuniform cell widths',()=>{
    const s=P.createDescentTerrainSampler(grid(undefined,undefined,(x,z)=>8+2*x-3*z));
    for(const x of [-4,-2.5,0,2,4.5,7])for(const z of [-3,-1,0,2,5])expect(s.heightAt(x,z)).toBeCloseTo(8+2*x-3*z,10);
  });
  it('uses the rendered diagonal rather than a bilinear saddle',()=>{
    const s=P.createDescentTerrainSampler(grid([0,1],[0,1],(x,z)=>10*x*z));
    expect(s.heightAt(.25,.25)).toBe(0);expect(s.heightAt(.75,.75)).toBe(5);
    expect(s.heightAt(.75,.25)).toBe(0);
  });
  it('honors the other diagonal when the actual index selects it',()=>{
    const s=P.createDescentTerrainSampler(grid([0,1],[0,1],(x,z)=>10*x*z,true));
    expect(s.heightAt(.25,.25)).toBe(2.5);expect(s.heightAt(.75,.25)).toBe(2.5);expect(s.heightAt(.25,.75)).toBe(2.5);
  });
  it('agrees with independent ray intersections across mixed triangles',()=>{
    const g=grid(undefined,undefined,(x,z)=>Math.sin(x)*3-Math.cos(z)*2,(x,z)=>(x+z)%2===0),s=P.createDescentTerrainSampler(g);
    for(let i=0;i<55;i++){const x=-4+11*(i+.37)/55,z=-3+8*((i*17)%55+.23)/55;expect(s.heightAt(x,z)).toBeCloseTo(rayHeight(g,x,z),8);}
  });
  it('includes the exact outer edges and all grid nodes',()=>{
    const g=grid(),s=P.createDescentTerrainSampler(g),p=g.attributes.position;
    for(let i=0;i<p.count;i++)expect(s.heightAt(p.getX(i),p.getZ(i))).toBe(p.getY(i));
    for(const [x,z] of [[-4,1],[7,1],[0,-3],[0,5]])expect(s.heightAt(x,z)).toBeCloseTo(rayHeight(g,x,z),8);
  });
  it('is continuous across the shared cell diagonal',()=>{
    const s=P.createDescentTerrainSampler(grid([0,1],[0,1],(x,z)=>10*x*z));
    expect(Math.abs(s.heightAt(.4,.6-1e-9)-s.heightAt(.4,.6+1e-9))).toBeLessThan(2e-8);
  });
  it('rejects coordinates outside the drawn mesh or without finite values',()=>{
    const s=P.createDescentTerrainSampler(grid());
    for(const [x,z] of [[-4.01,0],[7.01,0],[0,-3.01],[0,5.01],[NaN,0],[0,Infinity],['1',0]])expect(s.heightAt(x,z)).toBeNull();
  });
  it('detaches the snapshot from later changes to mesh buffers',()=>{
    const g=grid(),s=P.createDescentTerrainSampler(g),h=s.heightAt(-4,-3);g.attributes.position.setY(0,h+100);
    expect(s.heightAt(-4,-3)).toBe(h);expect(Object.isFrozen(s)).toBe(true);expect(Object.isFrozen(s.bounds)).toBe(true);
  });
  it('rejects missing or inconsistent dimensions before allocating a field',()=>{
    expect(P.createDescentTerrainSampler(null)).toBeNull();expect(P.createDescentTerrainSampler({})).toBeNull();
    const g=grid();g.parameters.widthSegments=999999;expect(P.createDescentTerrainSampler(g)).toBeNull();
    g.parameters.widthSegments=2.5;expect(P.createDescentTerrainSampler(g)).toBeNull();
  });
  it('rejects reversed or non-Cartesian coordinates',()=>{
    const a=grid();a.attributes.position.setX(1,-5);expect(P.createDescentTerrainSampler(a)).toBeNull();
    const b=grid();b.attributes.position.setX(4,-3.5);expect(P.createDescentTerrainSampler(b)).toBeNull();
  });
  it('rejects nonfinite surface heights',()=>{
    const g=grid();g.attributes.position.setY(3,NaN);expect(P.createDescentTerrainSampler(g)).toBeNull();
  });
  it('rejects missing, incomplete and foreign-cell indices',()=>{
    const a=grid();a.setIndex(null);expect(P.createDescentTerrainSampler(a)).toBeNull();
    const b=grid();b.setIndex([0,1,2]);expect(P.createDescentTerrainSampler(b)).toBeNull();
    const c=grid();c.index.setX(0,11);expect(P.createDescentTerrainSampler(c)).toBeNull();
    const d=grid();d.index.setX(1,0);expect(P.createDescentTerrainSampler(d)).toBeNull();
  });
  it('accepts reversed face winding and swapped triangle order',()=>{
    const g=grid(),before=P.createDescentTerrainSampler(g);
    for(let i=0;i<g.index.count;i+=6){const v=Array.from(g.index.array.slice(i,i+6));g.index.array.set([v[5],v[4],v[3],v[2],v[1],v[0]],i);}
    const after=P.createDescentTerrainSampler(g);expect(after.heightAt(.25,1.7)).toBe(before.heightAt(.25,1.7));
  });
  it('translates surface heights with the actual geometry',()=>{
    const g=grid(),a=P.createDescentTerrainSampler(g);g.translate(37,80,-18);const b=P.createDescentTerrainSampler(g);
    for(const [x,z] of [[-4,-3],[.4,1.8],[7,5]])expect(b.heightAt(x+37,z-18)-a.heightAt(x,z)).toBeCloseTo(80,5);
  });
});

describe('ground strokes across crater faces',()=>{
  it('splits strokes so every interior point retains its surface clearance',()=>{
    const g=grid(undefined,undefined,(x,z)=>Math.sin(x)*3-Math.cos(z)*2,(x,z)=>(x+z)%2===0),s=P.createDescentTerrainSampler(g);
    const line=s.trace(-4,-2.7,7,4.8,.45);expect(line.length).toBeGreaterThan(3);
    for(let i=1;i<line.length;i++)for(const t of [.1,.3,.5,.7,.9]){
      const a=line[i-1],b=line[i],x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;
      expect(y-rayHeight(g,x,z)).toBeCloseTo(.45,8);
    }
  });
  it('keeps the exact endpoints and the requested lift',()=>{
    const s=P.createDescentTerrainSampler(grid()),line=s.trace(-4,-3,7,5,.3);
    expect(line[0]).toEqual({x:-4,z:-3,y:s.heightAt(-4,-3)+.3});expect(line.at(-1)).toEqual({x:7,z:5,y:s.heightAt(7,5)+.3});
    expect(Object.isFrozen(line)).toBe(true);expect(line.every(Object.isFrozen)).toBe(true);
  });
  it('has the same shape when traced in reverse',()=>{
    const s=P.createDescentTerrainSampler(grid()),a=s.trace(-3,-2,6,4,.45),b=s.trace(6,4,-3,-2,.45).slice().reverse();
    expect(a.length).toBe(b.length);a.forEach((p,i)=>['x','y','z'].forEach(k=>expect(p[k]).toBeCloseTo(b[i][k],10)));
  });
  it('handles vertical, horizontal, grid-edge and stationary strokes',()=>{
    const s=P.createDescentTerrainSampler(grid());
    for(const [x0,z0,x1,z1] of [[-4,0,7,0],[-1,-3,-1,5],[-4,-3,7,-3],[2,1,2,1]]){
      const line=s.trace(x0,z0,x1,z1);expect(line.length).toBeGreaterThanOrEqual(2);line.forEach(p=>expect(p.y).toBeCloseTo(s.heightAt(p.x,p.z),10));
    }
  });
  it('bounds output by mesh dimensions on a long diagonal',()=>{
    const xs=Array.from({length:25},(_,i)=>i*i*.1),zs=Array.from({length:18},(_,i)=>i*i*.2),s=P.createDescentTerrainSampler(grid(xs,zs));
    // The visible Float32 boundary can be slightly inside the authoring doubles.
    const line=s.trace(s.bounds.minX,s.bounds.minZ,s.bounds.maxX,s.bounds.maxZ);
    expect(line).not.toBeNull();expect(line.length).toBeLessThanOrEqual(2*(s.columns+s.rows)+2);
  });
  it('rejects strokes outside the surface or with invalid lift',()=>{
    const s=P.createDescentTerrainSampler(grid());
    expect(s.trace(-4.1,0,7,0)).toBeNull();expect(s.trace(0,0,Infinity,0)).toBeNull();expect(s.trace(0,0,1,1,NaN)).toBeNull();
  });
  for(const bank of [-.35,0,.35])it(`supports all actual foot rims on rendered relief at bank ${bank}`,()=>{
    const g=grid([-7,-3,0,2,7],[-7,-2,1,4,7],(x,z)=>Math.sin(x)*.6+Math.cos(z)*.4),s=P.createDescentTerrainSampler(g);
    const support=hardwareHelpers.support(pads,bank,s.heightAt,0,0),matrix=new T.Matrix4().makeRotationZ(-bank);
    for(const clearance of [0,2,12]){
      const gaps=pads.map(p=>{const v=new T.Vector3(p.x,p.y,p.z).applyMatrix4(matrix);return support+clearance+v.y-rayHeight(g,v.x,v.z);});
      expect(Math.min(...gaps)).toBeCloseTo(clearance,8);expect(gaps.every(gap=>gap>=clearance-1e-8)).toBe(true);
    }
  });
});
