import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({paused:true,pacing:'live',phase:'flight',x:20,y:80,z:-500,yaw:0,graphicsTier:'eco',...patch});

describe('Paused plant observation',()=>{
  it.each([['eco',2],['balanced',3],['high',5]])('selects only complete visible clumps at %s quality', (tier,count)=>{
    const layout=Array.from({length:5},(_,i)=>({kind:'grass',x:50-i*10,z:0,height:8,width:2}));
    const s=flight({x:0,y:5,z:0,graphicsTier:tier}),subject=BH.bhDronePlantSubject(s,'grass',layout);
    expect(subject.kindIndex).toBe(count-1);expect(subject.point.x).toBe(layout[count-1].x);
  });
  it('does not select an incomplete final clump when only some of its stems are drawn',()=>{
    const layout=[{kind:'reed',x:1,z:0,height:12,width:2}];
    expect(BH.bhDronePlantSubject(flight(),'reed',layout)).toBeNull();
  });
  it('uses the same deterministic layout without mutating flight data or plant records',()=>{
    const s=flight({randomState:123,energy:70,telemetry:[{t:2,x:20}]}),layout=BH.bhDroneHabitatLayout(),before=JSON.stringify({s,layout});
    for(const kind of ['shrub','grass','reed']){
      const subject=BH.bhDronePlantSubject(s,kind,layout),pose=BH.bhDroneInspectionCamera(s,kind,1.6,layout);
      expect(subject).not.toBeNull();expect(pose.target).toEqual(subject.point);expect(pose.plantIndex).toBe(subject.index);
      expect(pose.target.x).toBe(layout[subject.index].x);expect(pose.target.z).toBe(layout[subject.index].z);
      pose.target.x=999;expect(layout[subject.index].x).not.toBe(999);
    }
    expect(JSON.stringify({s,layout})).toBe(before);
  });
  it('fits narrow views by backing away while retaining the subject and finite camera coordinates',()=>{
    for(const kind of ['shrub','grass','reed']){
      const a=BH.bhDroneInspectionCamera(flight(),kind,2),b=BH.bhDroneInspectionCamera(flight(),kind,.4);
      const distance=p=>Math.hypot(p.position.x-p.target.x,p.position.y-p.target.y,p.position.z-p.target.z);
      expect(distance(b)).toBeGreaterThan(distance(a));expect(b.target).toEqual(a.target);
      expect(Object.values(b.position).every(Number.isFinite)).toBe(true);
      expect(BH.bhDroneInspectionCamera(flight(),kind,NaN)).toEqual(BH.bhDroneInspectionCamera(flight(),kind,1));
    }
  });
  it('ignores invalid coordinates, dimensions and unsupported plant forms',()=>{
    expect(BH.bhDronePlantSubject(flight(),'tree')).toBeNull();
    expect(BH.bhDronePlantSubject(flight({x:NaN}),'reed')).toBeNull();
    const layout=[null,{kind:'reed',x:0,z:0,height:-1,width:2},{kind:'reed',x:NaN,z:0,height:10,width:2}];
    expect(BH.bhDronePlantSubject(flight({graphicsTier:'high'}),'reed',layout)).toBeNull();
  });
  it.each([{paused:false},{pacing:'steps'},{phase:'end'},{yaw:NaN}])('does not inspect plants in an unavailable state: %j',patch=>{
    expect(BH.bhDroneInspectionCamera(flight(patch),'shrub',1)).toBeNull();
  });
});
