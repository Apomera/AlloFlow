import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});

describe('Decorative meadow mesh geometry',()=>{
  it.each(['shrub','grass','reed','seed'])('keeps %s geometry finite, nondegenerate and within observation bounds',kind=>{
    const mesh=BH.bhDroneVegetationMesh(kind),p=mesh.positions;
    expect(p.length%9).toBe(0);expect(p.length).toBeGreaterThan(30);expect(mesh.colors).toHaveLength(p.length);
    expect(mesh.colors.every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
    for(let i=0;i<p.length;i+=3){expect(Number.isFinite(p[i])).toBe(true);expect(Number.isFinite(p[i+1])).toBe(true);expect(Number.isFinite(p[i+2])).toBe(true);expect(Math.abs(p[i])).toBeLessThanOrEqual(1);expect(Math.abs(p[i+2])).toBeLessThanOrEqual(1);expect(p[i+1]).toBeGreaterThanOrEqual(kind==='shrub'||kind==='seed'?-1:0);expect(p[i+1]).toBeLessThanOrEqual(1);}
    for(let i=0;i<p.length;i+=9){const u=[p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2]],v=[p[i+6]-p[i],p[i+7]-p[i+1],p[i+8]-p[i+2]];expect(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(1e-9);}
  });
  it('keeps the grass support stalk connected to the head at normalized height one',()=>{
    const p=BH.bhDroneVegetationMesh('grass').positions;expect(p.filter((_,i)=>i%3===1)).toContain(1);
    const top=[];for(let i=0;i<p.length;i+=3)if(p[i+1]===1)top.push(Math.hypot(p[i],p[i+2]));
    expect(top.length).toBeGreaterThan(2);expect(Math.max(...top)).toBeLessThan(.03);
  });
  it('uses outward-facing triangles on the seed support so the single-sided material is visible',()=>{
    const p=BH.bhDroneVegetationMesh('seed').positions.slice(0,180);
    for(let i=0;i<p.length;i+=9){const u=[p[i+3]-p[i],p[i+4]-p[i+1],p[i+5]-p[i+2]],v=[p[i+6]-p[i],p[i+7]-p[i+1],p[i+8]-p[i+2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],center=[(p[i]+p[i+3]+p[i+6])/3,(p[i+1]+p[i+4]+p[i+7])/3,(p[i+2]+p[i+5]+p[i+8])/3];expect(n.reduce((sum,value,j)=>sum+value*center[j],0)).toBeGreaterThan(0);}
  });
  it('is deterministic without consuming external randomness or sharing mutable mesh arrays',()=>{
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Unexpected random use');});
    try{for(const kind of ['shrub','grass','reed','seed']){const a=BH.bhDroneVegetationMesh(kind),b=BH.bhDroneVegetationMesh(kind);expect(a).toEqual(b);a.positions[0]=999;expect(b.positions[0]).not.toBe(999);}expect(BH.bhDroneStreamDetail()).toEqual(BH.bhDroneStreamDetail());}finally{random.mockRestore();}
    expect(BH.bhDroneVegetationMesh('unknown')).toBeNull();
  });
  it('places shoreline stone extents outside the water strip on both banks',()=>{
    const stones=BH.bhDroneStreamDetail();expect(stones).toHaveLength(280);
    const sides=new Set();for(const p of stones){const offset=p.x-(-270+Math.sin(p.z*.004)*55);sides.add(Math.sign(offset));expect(Math.abs(offset)-Math.hypot(p.width,p.height,p.length)).toBeGreaterThan(14);expect(p.height).toBeGreaterThan(0);expect(p.tone).toBeGreaterThanOrEqual(0);expect(p.tone).toBeLessThan(4);}
    expect(sides.size).toBe(2);
  });
});
