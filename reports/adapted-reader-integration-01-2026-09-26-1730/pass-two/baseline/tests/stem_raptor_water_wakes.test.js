import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('function advanceWaterWakeState('),end=source.indexOf('        function createWaterWakeMaterial',start);
const advance=Function('return ('+source.slice(start,end).trim()+')')();
const state=()=>({heading:null,opacity:0,length:1.1,width:0.7});
function settle(options={}){const p=state(),o={vx:2,vz:0,height:0,depth:0,water:4,fish:false,...options};for(let i=0;i<120;i++)advance(p,o.vx,o.vz,o.height,o.depth,o.water,o.fish,1/60,false);return p;}
describe('Raptor lake wake response',()=>{
  it('follows swimming direction and settles consistently across frame rates',()=>{
    const runs=[];for(const hz of [30,60,120]){const p=state();p.heading=Math.PI-0.04;for(let i=0;i<hz;i++)advance(p,-0.04,-1,0,0,4,false,1/hz,false);runs.push(p);}
    expect(runs[0].heading).toBeGreaterThan(Math.PI-0.04);expect(runs[0].heading).toBeLessThan(Math.PI+0.05);
    for(const key of ['heading','opacity','length','width'])expect(runs[0][key]).toBeCloseTo(runs[2][key],10);
  });
  it('limits surface disturbance to swimming animals and genuinely shallow fish',()=>{
    expect(settle().opacity).toBeGreaterThan(0.3);
    expect(settle({fish:true,depth:0.2}).opacity).toBeGreaterThan(0);
    expect(settle({fish:true,depth:0.2}).opacity).toBeLessThan(0.1);
    for(const options of [{fish:true,depth:2},{height:1},{water:-0.1},{vx:0,vz:0}])expect(settle(options).opacity).toBe(0);
  });
  it('lets residual ripples fade gently after stopping and hides them immediately for reduced motion',()=>{
    const p=settle(),before=p.opacity;advance(p,0,0,0,0,4,false,1/60,false);expect(p.opacity).toBeGreaterThan(0);expect(p.opacity).toBeLessThan(before);
    for(let i=0;i<120;i++)advance(p,0,0,0,0,4,false,1/60,false);expect(p.opacity).toBeLessThan(0.00001);
    p.opacity=0.3;advance(p,2,0,0,0,4,false,0,true);expect(p.opacity).toBe(0);
  });
  it('keeps geometry scale bounded at high speeds and retains heading at rest',()=>{
    const p=settle({vx:100});expect(p.width).toBeLessThanOrEqual(2.2);expect(p.length).toBeLessThanOrEqual(5.5);
    const heading=p.heading;advance(p,0,0,0,0,4,false,1/60,false);expect(p.heading).toBe(heading);
  });
});
