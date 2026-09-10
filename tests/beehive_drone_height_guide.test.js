import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({paused:true,pacing:'live',phase:'flight',x:20,y:115,z:-500,yaw:.2,...patch});
describe('Paused height measurement',()=>{
  it('measures vertically to the model datum independently of nearby obstacles',()=>{
    const s=flight({obstacles:[{x:20,z:-500,h:90}],telemetry:[{altitude:80}],energy:72});
    const before=JSON.stringify(s),r=BH.bhDroneHeightGuide(s);
    expect(r).toMatchObject({altitude:115,ground:{x:20,y:0,z:-500},bee:{x:20,y:115,z:-500},text:'115 model ft above ground'});
    expect(r.ticks.map(p=>p.y)).toEqual([25,50,75,100]);expect(r.note).toContain('does not measure clearance');expect(JSON.stringify(s)).toBe(before);
  });
  it.each([0,.4,5,20,60,160,320,500,1000])('keeps a bounded ordered ruler at altitude %s',altitude=>{
    const r=BH.bhDroneHeightGuide(flight({y:altitude}));expect(r.ticks.length).toBeLessThanOrEqual(8);
    expect(r.ticks.every((p,i)=>p.y>0&&p.y<altitude&&(!i||p.y>r.ticks[i-1].y))).toBe(true);
    if(altitude===.4)expect(r.text).toBe('<1 model ft above ground');
  });
  it.each([{y:-1},{y:NaN},{x:Infinity},{z:undefined}])('does not invent a height for invalid coordinates: %j',patch=>{
    expect(BH.bhDroneHeightGuide(flight(patch))).toBeNull();expect(BH.bhDroneInspectionCamera(flight(patch),'height',1)).toBeNull();
  });
  it('frames the vertical midpoint and widens the camera for a narrow viewport',()=>{
    const s=Object.freeze(flight()),wide=BH.bhDroneInspectionCamera(s,'height',2),narrow=BH.bhDroneInspectionCamera(s,'height',.2);
    expect(wide.target).toEqual({x:20,y:57.5,z:-500});
    const distance=p=>Math.hypot(p.position.x-s.x,p.position.y-s.y/2,p.position.z-s.z);
    expect(distance(narrow)).toBeGreaterThan(distance(wide));expect(wide.position.y).toBeGreaterThan(57.5);
    expect(BH.bhDroneInspectionCamera(s,'height',NaN)).toEqual(BH.bhDroneInspectionCamera(s,'height',1));
  });
  it.each([{paused:false},{pacing:'steps'},{phase:'end'}])('cannot activate while unavailable: %j',patch=>{
    expect(BH.bhDroneInspectionCamera(flight(patch),'height',1)).toBeNull();
  });
});
