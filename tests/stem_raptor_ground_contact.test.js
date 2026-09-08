import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name,end){const a=source.indexOf('function '+name+'('),b=source.indexOf(end,a);return Function('return ('+source.slice(a,b).trim()+')')();}
const pose=extract('updateRaptorWingPose','        headGroup.scale');
const profile={burstCycle:8,flapRate:0.012,flapDepth:0.58,tuck:0.38,glideDihedral:0.15};
describe('Raptor resting posture',()=>{
  it('folds smoothly at rest and unfolds progressively after takeoff',()=>{
    const state={angle:0.15,sweep:0,fold:0};pose(state,profile,1000,false,false,true,false,1/60);
    expect(state.fold).toBeGreaterThan(0);expect(state.fold).toBeLessThan(0.15);
    for(let i=0;i<120;i++)pose(state,profile,1000+i*1000/60,false,false,true,false,1/60);
    expect(state.fold).toBeGreaterThan(0.999);expect(state.angle).toBeCloseTo(0.08,5);
    const before=state.fold;pose(state,profile,3100,true,false,false,false,1/60);
    expect(state.fold).toBeLessThan(before);expect(state.fold).toBeGreaterThan(0.8);
    for(let i=0;i<120;i++)pose(state,profile,3100+i*1000/60,true,false,false,false,1/60);
    expect(state.fold).toBeLessThan(0.00001);
  });
  it('settles to the same quiet rest pose across frame rates and ignores held dive input',()=>{
    const outcomes=[];
    for(const hz of [30,60,120]){const state={angle:0.5,sweep:1,fold:0};for(let i=0;i<hz;i++)pose(state,profile,i*1000/hz,true,true,true,true,1/hz);outcomes.push(state);expect(state.angle).toBeCloseTo(0.08,5);expect(state.sweep).toBeLessThan(0.00001);}
    expect(outcomes[0].fold).toBeCloseTo(outcomes[2].fold,10);
  });
});
const advance=extract('advanceTouchdownDust','        function updateTouchdownFx');
describe('Raptor soft ground dust',()=>{
  it('integrates the same wind drift and drag across frame rates before contact',()=>{
    const runs=[];
    for(const hz of [20,60,120]){const p=new Float64Array([0,10,0]),v=new Float64Array([3,2,-1]);for(let i=0;i<hz;i++)advance(p,v,1/hz,9,-4,()=>-100);runs.push({p,v});}
    for(let i=0;i<3;i++){expect(runs[0].p[i]).toBeCloseTo(runs[2].p[i],10);expect(runs[0].v[i]).toBeCloseTo(runs[2].v[i],10);}
    expect(runs[0].p[0]).toBeGreaterThan(2);expect(runs[0].p[2]).toBeLessThan(-1);
  });
  it('keeps particles above their local terrain as they move up a slope',()=>{
    const p=new Float64Array([0,0.1,0,2,0.1,1]),v=new Float64Array([4,-2,0,2,-3,1]),ground=(x,z)=>x*0.3+z*0.1;
    for(let frame=0;frame<60;frame++){advance(p,v,1/60,5,0,ground);for(let i=0;i<p.length;i+=3){expect(p[i+1]).toBeGreaterThanOrEqual(ground(p[i],p[i+2])+0.035-1e-10);expect(Number.isFinite(p[i+1])).toBe(true);}}
  });
});
