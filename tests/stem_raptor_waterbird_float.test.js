import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function extract(name,end){const start=source.indexOf('function '+name+'(');return Function('return ('+source.slice(start,source.indexOf(end,start)).trim()+')')();}
const sample=extract('sampleLakeSurface','        function advanceWaterBirdFloat');
const advance=extract('advanceWaterBirdFloat','        function createPreyWingGeometry');
const state=()=>({height:0,slopeX:0,slopeZ:0,pitch:0,roll:0,offset:0,contact:0});
describe('Raptor waterbird flotation',()=>{
  it('matches height derivatives in deep water and fades wave displacement at the shore',()=>{
    for(const wind of [[0,0],[0.5,-0.3],[-0.4,0.7]])for(const time of [0,1.4,20]){
      const p=sample({},24,-31,8,time,...wind),epsilon=0.0001;
      const dx=(sample({},24+epsilon,-31,8,time,...wind).height-sample({},24-epsilon,-31,8,time,...wind).height)/(2*epsilon);
      const dz=(sample({},24,-31+epsilon,8,time,...wind).height-sample({},24,-31-epsilon,8,time,...wind).height)/(2*epsilon);
      expect(p.slopeX).toBeCloseTo(dx,8);expect(p.slopeZ).toBeCloseTo(dz,8);expect(Math.abs(p.height)).toBeLessThan(0.385);
      expect(sample({},24,-31,0,time,...wind).height).toBeCloseTo(0,10);expect(sample({},118,0,8,time,...wind).height).toBeCloseTo(0,10);
    }
  });
  it('places the lower body into the current wave without moving its collision center',()=>{
    const p=state();p.height=0.13;const clearance=0.7,rootY=-1.5+clearance;
    advance(p,0,0,clearance,1/60,false);
    expect(p.contact).toBe(1);expect(p.offset).toBeCloseTo(0.13-clearance*0.42,10);
    const underside=rootY+p.offset-clearance,waveY=-1.5+p.height;
    expect(waveY-underside).toBeCloseTo(clearance*0.42,10);
  });
  it('rocks along the bird heading and settles consistently across frame rates',()=>{
    const runs=[];
    for(const hz of [30,60,120]){const p=state();p.slopeX=0.08;p.slopeZ=-0.04;for(let i=0;i<hz;i++)advance(p,0,0,0.7,1/hz,false);runs.push(p);expect(p.pitch).toBeGreaterThan(0);expect(p.roll).toBeGreaterThan(0);}
    expect(runs[0].pitch).toBeCloseTo(runs[2].pitch,10);expect(runs[0].roll).toBeCloseTo(runs[2].roll,10);
    const turned=state();turned.slopeX=0.08;turned.slopeZ=-0.04;advance(turned,Math.PI/2,0,0.7,1,false);expect(turned.pitch).toBeLessThan(0);expect(turned.roll).toBeGreaterThan(0);
  });
  it('releases the water smoothly during takeoff and removes rocking under reduced motion',()=>{
    const p=state();p.height=0.1;p.pitch=0.1;p.roll=-0.1;
    advance(p,0,0.475,0.7,1/60,false);expect(p.contact).toBeCloseTo(0.5,8);
    advance(p,0,1,0.7,1/60,false);expect(p.contact).toBe(0);expect(p.offset).toBeCloseTo(0,10);
    advance(p,0,0,0.7,0,true);expect(p.pitch).toBe(0);expect(p.roll).toBe(0);expect(p.offset).toBeCloseTo(0.1-0.7*0.42,10);
  });
});
