import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const a=source.indexOf('function updateVegetationWind('),b=source.indexOf('function applyVegetationWind(',a);
const update=Function('return ('+source.slice(a,b).trim()+')')();
describe('Raptor vegetation weather response',()=>{
  it('follows compass direction, settles in calm air, and caps extreme wind',()=>{
    const state={x:0,z:0};update(state,0,0,false,1);expect(state).toEqual({x:0,z:0});
    update(state,100,Math.PI/2,false,10);expect(state.x).toBeCloseTo(1,9);expect(state.z).toBeCloseTo(0,9);
    update(state,18,Math.PI,false,10);expect(state.x).toBeCloseTo(0,9);expect(state.z).toBeCloseTo(1,9);
    update(state,0,0,false,3);expect(Math.hypot(state.x,state.z)).toBeLessThan(0.0001);
    update(state,NaN,NaN,false,0.1);expect(Number.isFinite(state.x+state.z)).toBe(true);
  });
  it('smooths reversals consistently across frame rates and disables motion immediately',()=>{
    function run(pattern){const state={x:0,z:0};let frame=0;for(const [speed,dir,duration] of [[12,Math.PI/2,0.7],[18,-Math.PI/2,0.4],[0,0,0.3]]){let elapsed=0;while(elapsed<duration-1e-10){const dt=Math.min(pattern[frame++%pattern.length],duration-elapsed);update(state,speed,dir,false,dt);expect(Math.hypot(state.x,state.z)).toBeLessThanOrEqual(1);elapsed+=dt;}}return state;}
    const reference=run([1/60]);for(const frames of [[1/30],[1/120],[0.008,0.033,0.05]]){const state=run(frames);expect(state.x).toBeCloseTo(reference.x,9);expect(state.z).toBeCloseTo(reference.z,9);}
    const state={x:0.8,z:-0.2};update(state,18,Math.PI/2,true,0);expect(state).toEqual({x:0,z:0});
    update(state,18,Math.PI/2,false,1/60);expect(state.x).toBeGreaterThan(0);expect(state.x).toBeLessThan(0.06);
  });
});
