import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({paused:true,pacing:'live',phase:'flight',x:20,y:80,z:-500,yaw:0,birds:[{x:40,y:90,z:-540,vx:1,vz:-1}],...patch});
describe('Paused wildlife observation',()=>{
  it('selects the nearest finite bird in three dimensions, keeping a stable index for ties',()=>{
    const s=flight({x:0,y:0,z:0,birds:[null,{x:0,y:NaN,z:0},{x:3,y:4,z:0},{x:-3,y:4,z:0},{x:1,y:30,z:0}]});
    expect(BH.bhDroneNearestBird(s)).toMatchObject({index:2,distance:5,point:{x:3,y:4,z:0}});
    expect(BH.bhDronePredatorReadout(s).distance).toBe(5);
  });
  it('targets the actual bird and leaves all flight and predator data untouched',()=>{
    const s=flight({energy:83,score:20,telemetry:[{t:2,x:12}],randomState:1234}),before=JSON.stringify(s),p=BH.bhDroneInspectionCamera(s,'bird',1.5);
    expect(p.target).toEqual({x:40,y:90,z:-540});expect(p.birdIndex).toBe(0);expect(p.label).toBe('Observing bee-eater 1');
    expect(p.position.y).toBeGreaterThan(s.birds[0].y);expect(JSON.stringify(s)).toBe(before);
    p.target.x=999;expect(s.birds[0].x).toBe(40);
  });
  it('backs the camera away on a narrow screen without changing its subject',()=>{
    const s=flight(),wide=BH.bhDroneInspectionCamera(s,'bird',2),narrow=BH.bhDroneInspectionCamera(s,'bird',.5);
    const distance=p=>Math.hypot(p.position.x-p.target.x,p.position.y-p.target.y,p.position.z-p.target.z);
    expect(distance(narrow)).toBeGreaterThan(distance(wide));expect(narrow.target).toEqual(wide.target);
    expect(BH.bhDroneInspectionCamera(s,'bird',NaN)).toEqual(BH.bhDroneInspectionCamera(s,'bird',1));
  });
  it('retains finite observation positions for stationary birds and missing velocity',()=>{
    for(const bird of [{x:0,y:80,z:0,vx:0,vz:0},{x:0,y:80,z:0}]){
      const p=BH.bhDroneInspectionCamera(flight({birds:[bird]}),'bird',1);expect(Object.values(p.position).every(Number.isFinite)).toBe(true);
    }
  });
  it.each([{paused:false},{pacing:'steps'},{phase:'end'},{birds:[]},{birds:[{x:0,y:NaN,z:0}]},{x:NaN}])('does not activate an unavailable observation: %j',patch=>{
    expect(BH.bhDroneInspectionCamera(flight(patch),'bird',1)).toBeNull();
  });
});
