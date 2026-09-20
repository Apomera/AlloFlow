import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({paused:true,pacing:'live',phase:'flight',x:0,y:80,z:-400,yaw:0,graphicsTier:'eco',simulationClock:12,...patch});
describe('Illustrative butterfly observation',()=>{
  it('uses a bounded, deterministic pose with motion driven only by simulation time',()=>{
    for(let index=0;index<8;index++)for(const t of [0,1,90,3600]){
      const pose=BH.bhDroneButterflyPose(index,{simulationClock:t},false);
      expect(Object.values(pose.point).every(Number.isFinite)).toBe(true);
      expect(pose.point.y).toBeGreaterThanOrEqual(11);expect(pose.point.y).toBeLessThanOrEqual(48);
      expect(Math.hypot(pose.point.x-Math.sin(index*1.9)*150,pose.point.z-(-90-index*165))).toBeCloseTo(34,8);
      expect(pose.wingAngle).toBeGreaterThanOrEqual(.2);expect(pose.wingAngle).toBeLessThanOrEqual(1.05);
      expect(pose).toEqual(BH.bhDroneButterflyPose(index,{simulationClock:t},false));
    }
    expect(BH.bhDroneButterflyPose(0,{simulationClock:1},false)).not.toEqual(BH.bhDroneButterflyPose(0,{simulationClock:2},false));
  });
  it('holds every decorative pose still for reduced motion and handles missing model time',()=>{
    for(let i=0;i<8;i++)expect(BH.bhDroneButterflyPose(i,{simulationClock:0},true)).toEqual(BH.bhDroneButterflyPose(i,{simulationClock:500},true));
    for(const t of [-1,NaN,Infinity,undefined])expect(BH.bhDroneButterflyPose(0,{simulationClock:t},false)).toEqual(BH.bhDroneButterflyPose(0,{simulationClock:0},false));
    for(const i of [-1,8,.5,NaN])expect(BH.bhDroneButterflyPose(i,{},false)).toBeNull();
  });
  it('selects only a butterfly that the current graphics tier actually displays',()=>{
    const visible=tier=>Array.from({length:8},(_,i)=>i).filter(i=>BH.bhDroneButterflyVisible(i,tier));
    expect(visible('eco')).toEqual([0,1]);expect(visible('balanced')).toEqual([0,2,4,6]);expect(visible('high')).toHaveLength(8);
    const point=BH.bhDroneButterflyPose(1,flight(),true).point,s=flight({...point});
    expect(BH.bhDroneButterflySubject(s,true)).toMatchObject({index:1,distance:0,point});
    expect(BH.bhDroneButterflySubject({...s,graphicsTier:'balanced'},true).index).not.toBe(1);
    expect(BH.bhDroneButterflySubject(flight({x:NaN}),true)).toBeNull();
  });
  it('fits the complete avatar on portrait screens and targets the shared pose without moving it',()=>{
    const s=flight({energy:80,score:10,randomState:901,birds:[{x:1}],telemetry:[{t:3}]}),before=JSON.stringify(s);
    const wide=BH.bhDroneInspectionCamera(s,'butterfly',2,null,true),narrow=BH.bhDroneInspectionCamera(s,'butterfly',.5,null,true);
    expect(wide.target).toEqual(BH.bhDroneButterflyPose(wide.butterflyIndex,s,true).point);
    expect(narrow.target).toEqual(wide.target);expect(narrow.butterflyIndex).toBe(wide.butterflyIndex);
    const distance=p=>Math.hypot(p.position.x-p.target.x,p.position.y-p.target.y,p.position.z-p.target.z);
    expect(distance(narrow)).toBeGreaterThan(distance(wide));expect(JSON.stringify(s)).toBe(before);
    expect(BH.bhDroneInspectionCamera(s,'butterfly',NaN,null,true)).toEqual(BH.bhDroneInspectionCamera(s,'butterfly',1,null,true));
  });
  it('rejects observation during live flight, turn-based decisions, ended flights or invalid coordinates',()=>{
    for(const patch of [{paused:false},{pacing:'steps'},{phase:'end'},{x:NaN},{yaw:Infinity}])expect(BH.bhDroneInspectionCamera(flight(patch),'butterfly',1,null,true)).toBeNull();
  });
  it.each(['fore','hind'])('builds a complete finite %s wing with opaque decorative margin, vein and spot geometry',kind=>{
    const g=BH.bhDroneButterflyWing(kind),p=g.positions;
    expect(p.length%9).toBe(0);expect(g.tones).toHaveLength(p.length/3);expect(p.every(Number.isFinite)).toBe(true);
    expect(new Set(g.tones).size).toBeGreaterThan(4);
    for(let n=0;n<p.length;n+=9){const u=[p[n+3]-p[n],p[n+4]-p[n+1],p[n+5]-p[n+2]],v=[p[n+6]-p[n],p[n+7]-p[n+1],p[n+8]-p[n+2]];expect(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])).toBeGreaterThan(1e-8);}
    expect(g).toEqual(BH.bhDroneButterflyWing(kind));
  });
  it('keeps all scenery and camera helpers independent of course randomness',()=>{
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Unexpected course randomness');});
    try{expect(BH.bhDroneButterflyWing('fore')).not.toEqual(BH.bhDroneButterflyWing('hind'));expect(BH.bhDroneInspectionCamera(flight(),'butterfly',1,null,false)).toBeTruthy();}finally{random.mockRestore();}
    expect(BH.bhDroneButterflyWing('unknown')).toBeNull();
  });
});
