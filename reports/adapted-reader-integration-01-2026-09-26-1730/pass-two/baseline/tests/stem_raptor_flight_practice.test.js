import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name,end){const a=source.indexOf('function '+name+'(');return Function('return ('+source.slice(a,source.indexOf(end,a)).trim()+')')();}
const smooth=extract('smoothFlightAxis','        function clearHeldInputs');
const crossing=extract('practiceGateCrossing','        function ensurePracticeMeshes');
const route=extract('buildPracticeTrail','        // Swept plane crossing');

describe('Raptor smooth controls and practice trail',()=>{
  it('integrates the same steering angle across frame rates and settles after release',()=>{
    function run(pattern){const axis={value:0,integral:0};let angle=0,index=0;for(const [target,duration] of [[1,0.8],[0,0.25],[-1,0.4],[0,0.25]]){let elapsed=0;while(elapsed<duration-1e-10){const dt=Math.min(pattern[index++%pattern.length],duration-elapsed);smooth(axis,target,target===0?26:18,dt);angle+=axis.integral*1.5;elapsed+=dt;}}return {angle,value:axis.value};}
    const reference=run([1/60]);
    for(const pattern of [[1/30],[1/120],[0.008,0.033,0.05,0.017]]){const result=run(pattern);expect(result.angle).toBeCloseTo(reference.angle,9);expect(result.value).toBeCloseTo(reference.value,9);}
    expect(Math.abs(reference.value)).toBeLessThan(0.002);
  });
  it('scores actual forward ring crossings, including a fast pass between frames',()=>{
    const gate={x:0,y:30,z:0,nx:0,nz:1,radius:11};
    expect(crossing({x:-20,y:30,z:-20},{x:20,y:30,z:20},gate)).toMatchObject({hit:true,centered:true});
    expect(crossing({x:10,y:30,z:-20},{x:10,y:30,z:20},gate)).toMatchObject({hit:true,centered:false});
    expect(crossing({x:12,y:30,z:-20},{x:12,y:30,z:20},gate)).toMatchObject({hit:false,centered:false});
    expect(crossing({x:0,y:30,z:20},{x:0,y:30,z:-20},gate)).toBeNull();
    expect(crossing({x:0,y:30,z:-10},{x:0,y:30,z:-1},gate)).toBeNull();
    expect(crossing({x:0,y:30,z:0},{x:0,y:30,z:20},gate)).toBeNull();
  });
  it('keeps routes inside the flight area and above the sampled terrain',()=>{
    const ground=(x,z)=>Math.sin(x*0.08)*20+Math.cos(z*0.06)*12;
    expect(route({x:0,y:100,z:0},0,ground,100).every(gate=>gate.y<=88)).toBe(true);
    for(const origin of [{x:0,y:30,z:80},{x:335,y:40,z:325},{x:-335,y:40,z:-335},{x:290,y:40,z:-310}])for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const gates=route(origin,yaw,ground);expect(gates).toHaveLength(5);let previous=origin;
      for(const gate of gates){expect(Math.abs(gate.x)).toBeLessThanOrEqual(315);expect(Math.abs(gate.z)).toBeLessThanOrEqual(315);expect(gate.y).toBeGreaterThanOrEqual(ground(gate.x,gate.z)+28-1e-8);expect(Math.hypot(gate.nx,gate.nz)).toBeCloseTo(1,8);expect(Math.hypot(gate.x-previous.x,gate.z-previous.z)).toBeGreaterThan(40);previous=gate;}
    }
  });
});
