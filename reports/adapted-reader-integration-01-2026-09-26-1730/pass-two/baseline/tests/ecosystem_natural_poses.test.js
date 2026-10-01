import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
describe('presentation-only wildlife poses',()=>{
  it('spreads each animal group across the clearing rather than at a single center',()=>{
    for(const id of ['rabbits','voles','foxes','owls']){
      const poses=Array.from({length:7},(_,i)=>api.meadowPose(id,i,0,false));
      expect(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))).toBeGreaterThan(6);
      expect(Math.max(...poses.map(p=>p.z))-Math.min(...poses.map(p=>p.z))).toBeGreaterThan(4);
    }
  });
  it('pauses ground travel between walking bouts without sliding feet',()=>{
    const resting=api.meadowPose('rabbits',0,4,false),later=api.meadowPose('rabbits',0,5,false);
    expect([resting.x,resting.z]).toEqual([later.x,later.z]);
    expect(resting.gait).toBe(0);expect(resting.moving).toBe(0);
    const walking=api.meadowPose('rabbits',0,1,false);
    expect(walking.moving).toBeGreaterThan(0.5);
    expect([walking.x,walking.z]).not.toEqual([resting.x,resting.z]);
  });
  it('faces along the walking path and crosses rest boundaries continuously',()=>{
    for(const id of ['rabbits','voles','foxes']){
      const before=api.meadowPose(id,0,8-1e-5,false),after=api.meadowPose(id,0,8+1e-5,false);
      expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeLessThan(0.001);
    }
    const p=api.meadowPose('rabbits',0,1,false),next=api.meadowPose('rabbits',0,1.001,false);
    const dx=next.x-p.x,dz=next.z-p.z,distance=Math.hypot(dx,dz);
    expect((dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))/distance).toBeGreaterThan(0.99);
  });
  it('reproduces poses exactly when scrubbing back and forward',()=>{
    const earlier=api.meadowPose('foxes',3,8,false);
    expect(api.meadowPose('foxes',3,20,false)).not.toEqual(earlier);
    expect(api.meadowPose('foxes',3,8,false)).toEqual(earlier);
  });
  it('keeps reduced-motion poses still at every timeline sample',()=>{
    for(const id of ['rabbits','voles','foxes','owls']){
      const still=api.meadowPose(id,2,0,true);
      expect(api.meadowPose(id,2,24,true)).toEqual(still);
      expect(still.gait).toBe(0);
    }
  });
  it('keeps all poses finite and within the visible clearing with appropriate height',()=>{
    for(const id of ['rabbits','voles','foxes','owls'])for(let i=0;i<16;i++)for(const t of [0,8,16,24]){
      const p=api.meadowPose(id,i,t,false);
      expect(Object.values(p).every(Number.isFinite)).toBe(true);
      expect(Math.abs(p.x)).toBeLessThan(10);expect(Math.abs(p.z)).toBeLessThan(8);
      expect(p.altitude).toBeGreaterThan(0);
      if(id==='owls')expect(p.altitude).toBeGreaterThan(1.8);else expect(p.altitude).toBe(0.025);
    }
  });
});
