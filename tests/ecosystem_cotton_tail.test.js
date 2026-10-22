import {beforeEach,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const xyz=(a,k)=>Array.from(a.slice(k*3,k*3+3));
const key=p=>p.map(n=>Math.round(n*1e10)).join(',');

describe('one connected rabbit cotton tail',()=>{
  it('closes a tapered bilateral skin with finite outward normals and no disconnected primitive seams',()=>{
    const g=api.rabbitTailSurface(),p=g.positions,n=g.normals,edges=new Map(),cloud=new Set();
    expect(p.length/3).toBe(761);expect(g.indices.length/3).toBe(1472);
    for(const field of ['positions','normals','uv','tints'])expect(g[field].every(Number.isFinite)).toBe(true);
    for(let k=0;k<p.length/3;k++){expect(Math.hypot(...xyz(n,k))).toBeCloseTo(1,12);cloud.add(key(xyz(p,k)));}
    for(let k=0;k<p.length/3;k++){const v=xyz(p,k);expect(cloud.has(key([v[0],v[1],-v[2]]))).toBe(true);}
    for(let f=0;f<g.indices.length;f+=3){
      const [a,b,c]=g.indices.slice(f,f+3);expect([a,b,c].every(k=>Number.isInteger(k)&&k>=0&&k<p.length/3)).toBe(true);
      const pa=xyz(p,a),pb=xyz(p,b),pc=xyz(p,c),u=pb.map((v,j)=>v-pa[j]),v=pc.map((x,j)=>x-pa[j]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      expect(Math.hypot(...cross)).toBeGreaterThan(1e-8);expect(cross.reduce((sum,x,j)=>sum+x*(n[a*3+j]+n[b*3+j]+n[c*3+j]),0)).toBeGreaterThan(0);
      for(const [first,last] of [[a,b],[b,c],[c,a]]){const pair=[key(xyz(p,first)),key(xyz(p,last))].sort().join('|');edges.set(pair,(edges.get(pair)||0)+1);}
    }
    expect([...edges.values()].every(count=>count===2)).toBe(true);
    for(const [a,b] of g.seams){expect(xyz(p,a)).toEqual(xyz(p,b));expect(xyz(n,a)).toEqual(xyz(n,b));expect(g.tints[a]).toBe(g.tints[b]);expect(g.uv[a*2+1]).toBe(0);expect(g.uv[b*2+1]).toBe(1);}
  });

  it('carries a continuous cream underside and grey back without a second overlapping sphere',()=>{
    const g=api.rabbitTailSurface(),p=g.positions;
    expect(Math.min(...g.tints)).toBe(0);expect(Math.max(...g.tints)).toBe(1);
    const top=[],bottom=[];g.tints.forEach((t,k)=>{if(p[k*3+1]>.035)top.push(t);if(p[k*3+1]<-.045)bottom.push(t);});
    expect(Math.max(...top)).toBeLessThan(.4);expect(Math.min(...bottom)).toBeGreaterThan(.8);
    expect(g.tints.filter(t=>t>.1&&t<.8).length).toBeGreaterThan(100);
    expect(g.positions[g.front*3]).toBeCloseTo(.074,12);expect(g.positions[g.rear*3]).toBeCloseTo(-.086,12);
    const centerRow=1+(g.rows/2-1)*(g.columns+1),quarter=1+(g.rows/4-1)*(g.columns+1);
    expect(Math.abs(p[centerRow*3+1]-.006)).toBeGreaterThan(Math.abs(p[quarter*3+1]-.006));
  });

  it('fits every complete triangle inside the actual original faceted two-ball envelope',()=>{
    const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js')),old=new T.IcosahedronGeometry(1,2),p=old.getAttribute('position'),planes=[];
    for(let f=0;f<p.count;f+=3){const a=new T.Vector3().fromBufferAttribute(p,f),b=new T.Vector3().fromBufferAttribute(p,f+1),c=new T.Vector3().fromBufferAttribute(p,f+2),normal=b.sub(a).cross(c.sub(a)).normalize();planes.push([normal.x,normal.y,normal.z,normal.dot(a)]);}
    const g=api.rabbitTailSurface(),samples=[];for(let k=0;k<g.positions.length;k+=3)samples.push(g.positions.slice(k,k+3));
    for(let f=0;f<g.indices.length;f+=3){const tri=g.indices.slice(f,f+3).map(v=>xyz(g.positions,v));for(const weights of [[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5]])samples.push([0,1,2].map(axis=>tri.reduce((sum,p,k)=>sum+p[axis]*weights[k],0)));}
    const mounts=[{center:[0,0,0],scale:[.082,.073,.071]},{center:[-.018,-.015,0],scale:[.071,.062,.062]}];let maxViolation=-Infinity;
    for(const p of samples){const violations=mounts.map(m=>planes.reduce((value,plane)=>Math.max(value,plane[0]*(p[0]-m.center[0])/m.scale[0]+plane[1]*(p[1]-m.center[1])/m.scale[1]+plane[2]*(p[2]-m.center[2])/m.scale[2]-plane[3]),-Infinity));maxViolation=Math.max(maxViolation,Math.min(...violations));}
    let triangleBound=-Infinity;
    for(let f=0;f<g.indices.length;f+=3){const tri=g.indices.slice(f,f+3).map(v=>xyz(g.positions,v));const bound=Math.min(...mounts.map(m=>Math.max(...tri.map(p=>planes.reduce((value,plane)=>Math.max(value,plane[0]*(p[0]-m.center[0])/m.scale[0]+plane[1]*(p[1]-m.center[1])/m.scale[1]+plane[2]*(p[2]-m.center[2])/m.scale[2]-plane[3]),-Infinity)))));triangleBound=Math.max(triangleBound,bound);}
    // A convex primitive contains the full triangle when it contains all three
    // vertices; this proves full-surface containment, beyond sampled points.
    expect(samples).toHaveLength(6649);expect(maxViolation).toBeLessThan(-.01);expect(triangleBound).toBeLessThan(-.01);
  });

  it('returns detached cached arrays and exposes the same skin through the existing surface API',()=>{
    const first=api.rabbitTailSurface(),before=JSON.stringify(first);first.positions[0]=999;first.normals[0]=999;first.tints[0]=999;first.seams[0][0]=999;
    expect(JSON.stringify(api.rabbitTailSurface())).toBe(before);expect(JSON.stringify(api.mammalSurface('rabbits','tail'))).toBe(before);
    expect(api.mammalSurface('voles','tail')).toBeNull();expect(api.mammalSurface('foxes','tail').part).toBe('tail');
  });

  it('keeps the same recorded tail angles and all actual vertices above terrain across movement, feeding and rest',()=>{
    const g=api.rabbitTailSurface(),setups=[{}, {event:'none',enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10}, {event:'restoreCover',enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},cover:10}];
    let checked=0,lowest=Infinity,resting=0,moving=0;
    for(const config of setups){const pair=api.compare(config),pairBefore=JSON.stringify(pair);for(const branch of ['baseline','experiment']){const frames=api.behaviorTimeline(config,pair[branch]),before=JSON.stringify(frames);
      for(const frame of frames)for(let index=0;index<16;index++){
        const p=frame.rabbits[index];if(!p.active)continue;const art=api.mammalArticulation('rabbits',p,false),post=api.mammalPosture('rabbits',p),size=.86*(.94+index%5*.028),cy=Math.cos(p.yaw),sy=Math.sin(p.yaw),ct=Math.cos(art.tailYaw),st=Math.sin(art.tailYaw),cp=Math.cos(art.tailPitch),sp=Math.sin(art.tailPitch);
        if(p.rest>.5)resting++;if(p.stride>.1)moving++;
        for(let k=0;k<g.positions.length;k+=3){const x0=cp*g.positions[k]-sp*g.positions[k+1],y0=sp*g.positions[k]+cp*g.positions[k+1],z0=g.positions[k+2],x=ct*x0+st*z0-.365,y=y0+.29,z=-st*x0+ct*z0,wx=p.x+size*(cy*x+sy*z),wz=p.z+size*(-sy*x+cy*z),wy=api.groundHeight(p.x,p.z)+p.altitude+post.drop+size*y;lowest=Math.min(lowest,wy-api.groundHeight(wx,wz));checked++;}
        expect(api.mammalArticulation('rabbits',p,false)).toEqual(art);
      }
      expect(JSON.stringify(frames)).toBe(before);expect(JSON.stringify(api.behaviorTimeline(config,pair[branch]))).toBe(before);
    }expect(JSON.stringify(pair)).toBe(pairBefore);}
    expect(checked).toBeGreaterThan(1000000);expect(resting).toBeGreaterThan(10);expect(moving).toBeGreaterThan(10);expect(lowest).toBeGreaterThan(.08);
  });
});
