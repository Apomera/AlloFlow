import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const point=(array,k)=>array.slice(k*3,k*3+3),key=p=>p.map(v=>Math.round(v*1e10)).join(',');
const sub=(a,b)=>a.map((v,k)=>v-b[k]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((sum,v,k)=>sum+v*b[k],0);
const mounts={foxes:{hinge:[.355,.603,0],center:[.145,-.020,0],scale:[.162,.023,.045],head:[.24,.58,0]},rabbits:{hinge:[.278,.388,0],center:[.072,-.010,0],scale:[.079,.023,.061],head:[.24,.4,0]}};

describe('closed mammal chin skins and fitted neutral mouth margins',()=>{
  it('replaces each primitive with a closed, outward, nondegenerate chin skin and a welded UV seam',()=>{
    for(const id of ['foxes','rabbits']){
      const g=api.mammalJawSurface(id),count=g.positions.length/3,edges=new Map();
      expect(g.part).toBe('jaw');expect(count).toBe(629);expect(g.indices.length/3).toBe(1216);expect(g.hinge).toEqual(mounts[id].hinge);
      expect(g.original).toEqual({center:mounts[id].center,scale:mounts[id].scale});
      for(const name of ['positions','normals','uv','tints'])expect(g[name].every(Number.isFinite)).toBe(true);
      expect(g.indices.every(v=>Number.isInteger(v)&&v>=0&&v<count)).toBe(true);
      for(let k=0;k<count;k++)expect(Math.hypot(...point(g.normals,k))).toBeCloseTo(1,10);
      let minArea=Infinity,minAlignment=Infinity;
      for(let f=0;f<g.indices.length;f+=3){const [a,b,c]=g.indices.slice(f,f+3),normal=cross(sub(point(g.positions,b),point(g.positions,a)),sub(point(g.positions,c),point(g.positions,a))),sum=point(g.normals,a).map((v,k)=>v+g.normals[b*3+k]+g.normals[c*3+k]);minArea=Math.min(minArea,Math.hypot(...normal));minAlignment=Math.min(minAlignment,dot(normal,sum));for(const [u,v]of[[a,b],[b,c],[c,a]]){const edge=[key(point(g.positions,u)),key(point(g.positions,v))].sort().join('|');edges.set(edge,(edges.get(edge)||0)+1);}}
      expect(minArea).toBeGreaterThan(1e-10);expect(minAlignment).toBeGreaterThan(0);expect([...edges.values()].every(n=>n===2)).toBe(true);
      for(const [a,b]of g.seams){expect(point(g.positions,a)).toEqual(point(g.positions,b));expect(point(g.normals,a)).toEqual(point(g.normals,b));expect(g.uv[a*2+1]).toBe(0);expect(g.uv[b*2+1]).toBe(1);}
      const unique=new Set(Array.from({length:count},(_,k)=>key(point(g.positions,k))));expect(unique.size-edges.size+g.indices.length/3).toBe(2);
    }
  });

  it('keeps the fox in its actual old tapered jaw volume and the exposed rabbit chin in the unchanged full-skull bounds',()=>{
    const require=createRequire(import.meta.url),T=require(resolve(process.cwd(),'vendor/three-r128/three.min.js')),old=new T.SphereGeometry(1,20,12),p=old.getAttribute('position');
    for(let k=0;k<p.count;k++){const x=p.getX(k),taper=.8-.28*x;p.setXYZ(k,x,p.getY(k)*taper,p.getZ(k)*taper);}
    const planes=[];for(let f=0;f<old.index.count;f+=3){const a=new T.Vector3().fromBufferAttribute(p,old.index.getX(f)),b=new T.Vector3().fromBufferAttribute(p,old.index.getX(f+1)),c=new T.Vector3().fromBufferAttribute(p,old.index.getX(f+2)),n=b.sub(a).cross(c.sub(a));if(n.length()<1e-10)continue;n.normalize();planes.push([n.x,n.y,n.z,n.dot(a)]);}
    for(const id of ['foxes','rabbits']){const g=api.mammalJawSurface(id),m=mounts[id],skull=api.mammalSurface(id,'head'),bounds=[0,1,2].map(axis=>{const a=skull.positions.filter((_,k)=>k%3===axis);return [Math.min(...a),Math.max(...a)];});let violation=-Infinity,exposed=0;for(let k=0;k<g.positions.length;k+=3){const p=[0,1,2].map(a=>(g.positions[k+a]-m.center[a])/m.scale[a]);for(const n of planes)violation=Math.max(violation,n[0]*p[0]+n[1]*p[1]+n[2]*p[2]-n[3]);const a=point(g.positions,k/3).map((v,axis)=>v+g.hinge[axis]),site=api.skullSite(id,a[0],a[1],a[2]<0?-1:1);if(!site||Math.abs(a[2])>Math.abs(site.position[2])+.00001)exposed++;if(id==='rabbits')for(let axis=0;axis<3;axis++){expect(a[axis]).toBeGreaterThan(bounds[axis][0]);expect(a[axis]).toBeLessThan(bounds[axis][1]);}}expect(exposed).toBeGreaterThan(0);if(id==='foxes'){expect(violation).toBeLessThan(0);expect(g.referenceEnvelope).toBe('old-jaw-volume');}else{expect(violation).toBeGreaterThan(0);expect(g.referenceEnvelope).toBe('full-skull-bounds');}}
  });

  it('fits both thin neutral mouth margins to actual skull triangles and preserves their normal offset without moving a skull vertex',()=>{
    for(const id of ['foxes','rabbits']){
      const before=JSON.stringify(api.mammalSurface(id,'head')),g=api.mammalMouthSurface(id),skull=api.mammalSurface(id,'head');
      expect(g.part).toBe('mouth-margin');expect(g.positions.length/3).toBe(260);expect(g.indices.length/3).toBe(256);expect(g.headHome).toEqual(mounts[id].head);expect(g.sites).toHaveLength(260);expect(g.lift).toBe(.00045);
      for(const name of ['positions','normals','uv'])expect(g[name].every(Number.isFinite)).toBe(true);
      let minGap=Infinity,maxGap=-Infinity,minAlignment=Infinity;
      g.sites.forEach((site,k)=>{expect(site.barycentric.reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);expect(Math.min(...site.barycentric)).toBeGreaterThanOrEqual(-1e-10);const face=skull.indices.slice(site.triangle*3,site.triangle*3+3),hit=[0,1,2].map(axis=>face.reduce((sum,v,j)=>sum+skull.positions[v*3+axis]*site.barycentric[j],0));for(let axis=0;axis<3;axis++){expect(hit[axis]).toBeCloseTo(site.position[axis],12);expect(g.positions[k*3+axis]+g.headHome[axis]).toBeCloseTo(hit[axis]+site.normal[axis]*g.lift,12);}const p=point(g.positions,k).map((v,axis)=>v+g.headHome[axis]),outer=api.skullSite(id,p[0],p[1],site.side);expect(outer).toBeTruthy();const gap=site.side*(p[2]-outer.position[2]);minGap=Math.min(minGap,gap);maxGap=Math.max(maxGap,gap);});
      for(let f=0;f<g.indices.length;f+=3){const [a,b,c]=g.indices.slice(f,f+3),n=cross(sub(point(g.positions,b),point(g.positions,a)),sub(point(g.positions,c),point(g.positions,a)));minAlignment=Math.min(minAlignment,dot(n,point(g.normals,a)));}
      expect(minGap).toBeGreaterThan(0);expect(maxGap).toBeLessThan(.002);expect(minAlignment).toBeGreaterThan(0);expect(JSON.stringify(api.mammalSurface(id,'head'))).toBe(before);
    }
  });

  it('returns detached species-specific cached data and finite null fallbacks',()=>{
    for(const id of ['foxes','rabbits'])for(const getter of [api.mammalJawSurface,api.mammalMouthSurface]){const a=getter(id),before=JSON.stringify(a);a.positions[0]=999;a.normals[0]=999;a.indices[0]=999;if(a.sites){a.sites[0].position[0]=999;a.sites[0].barycentric[0]=999;}else{a.hinge[0]=999;a.original.scale[0]=999;}expect(JSON.stringify(getter(id))).toBe(before);}
    expect(api.mammalJawSurface('foxes').positions).not.toEqual(api.mammalJawSurface('rabbits').positions);
    for(const id of ['voles','owls',undefined,null]){expect(api.mammalJawSurface(id)).toBeNull();expect(api.mammalMouthSurface(id)).toBeNull();}
  });

  it('uses the original recorded grazing jaw clock and leaves head, eye, nasal, paw and population results unchanged',()=>{
    const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),before=JSON.stringify({pair,frames});
    let closed=null,open=null;frames.forEach((f,step)=>f.rabbits.forEach((p,index)=>{if(!p.active||p.state!=='Grazing')return;const art=api.mammalArticulation('rabbits',p,false);if(!closed||art.jawOpen<closed.art.jawOpen)closed={p,art,step,index};if(!open||art.jawOpen>open.art.jawOpen)open={p,art,step,index};}));
    expect(closed).toBeTruthy();expect(open.art.jawOpen-closed.art.jawOpen).toBeGreaterThan(.024);expect(open.art.jawOpen).toBeLessThanOrEqual(.047);expect(Math.abs(open.art.jawSide)).toBeLessThanOrEqual(.022);
    for(const id of ['foxes','rabbits']){api.mammalJawSurface(id);api.mammalMouthSurface(id);const p=frames[0][id][0],a=api.mammalArticulation(id,p,false);api.mammalJawSurface(id);expect(api.mammalArticulation(id,p,false)).toEqual(a);expect(api.mammalArticulation(id,open.p,true).jawOpen).toBe(0);expect(api.mammalArticulation(id,open.p,true).jawSide).toBe(0);}
    const p=open.p,neutral={...p,activity:0},moving=api.mammalArticulation('rabbits',p,false);expect(moving).toEqual(open.art);for(const hind of [true,false])for(const side of [-1,1])expect(api.rabbitFooting(p,open.index,hind,side)).toEqual(api.rabbitFooting(neutral,open.index,hind,side));
    expect(JSON.stringify({pair,frames})).toBe(before);expect(api.compare(config)).toEqual(pair);
  });
});
