import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({paused:true,pacing:'live',phase:'flight',x:20,y:115,z:-500,yaw:0,...patch});
describe('Paused scene inspection cameras',()=>{
  it('places side cameras relative to the bee and keeps their target on it',()=>{
    const s=Object.freeze(flight());
    expect(BH.bhDroneInspectionCamera(s,'left')).toMatchObject({position:{x:-80,y:151,z:-476},target:{x:20,y:115,z:-500}});
    expect(BH.bhDroneInspectionCamera(s,'right')).toMatchObject({position:{x:120,y:151,z:-476},target:{x:20,y:115,z:-500}});
  });
  it('rotates side viewpoints with heading without steering the bee',()=>{
    const s=flight({yaw:Math.PI/2}),before=JSON.stringify(s),r=BH.bhDroneInspectionCamera(s,'right');
    expect(r.position.x).toBeCloseTo(-4);expect(r.position.z).toBeCloseTo(-400);expect(JSON.stringify(s)).toBe(before);
  });
  it('provides an overhead view with enough offset to preserve a clear up direction',()=>{
    const r=BH.bhDroneInspectionCamera(flight(),'above');
    expect(r.position).toEqual({x:20,y:265,z:-445});expect(r.target).toEqual({x:20,y:115,z:-500});
  });
  it.each([{paused:false},{pacing:'steps'},{phase:'end'},{x:NaN},{yaw:undefined}])('never activates for an unavailable or advancing flight: %j',patch=>{
    expect(BH.bhDroneInspectionCamera(flight(patch),'above')).toBeNull();
  });
  it('returns control to the ordinary camera for flight view or unknown selections',()=>{
    expect(BH.bhDroneInspectionCamera(flight(),'flight')).toBeNull();expect(BH.bhDroneInspectionCamera(flight(),'invalid')).toBeNull();expect(BH.bhDroneInspectionCamera({},'above')).toBeNull();
  });
});
