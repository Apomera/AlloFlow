import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});
const IDS=['cabbage-white','painted-lady','tiger-swallowtail','monarch'];
const WINGS=['leftWing','rightWing','hindLag'];
function bodyDistance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function sample(site,index,time,id,reduced=false){return BF.visitorVisitPose(site,index,time,reduced,id);}
function visit(id){
  const index=BF.visitorSpecies.indexOf(id),state=BF.freshState({restoration:{design:'mixed'}}),sites=BF.habitats(state).filter(p=>p.nectar),site=BF.visitorPatch(sites,index);
  // Locate one complete visit through public phases, rather than duplicating
  // the implementation's dwell lengths, offsets or cycle arithmetic.
  const edges=[];let time=0,previous=sample(site,index,time,id).phase;
  for(time=.05;time<=80;time+=.05){
    const phase=sample(site,index,time,id).phase;
    if(phase===previous)continue;
    let lo=time-.05,hi=time;
    for(let n=0;n<36;n++){const mid=(lo+hi)/2;if(sample(site,index,mid,id).phase===previous)lo=mid;else hi=mid;}
    edges.push({from:previous,to:phase,time:(lo+hi)/2});previous=phase;
  }
  const first=edges.findIndex(edge=>edge.from==='cruising'&&edge.to==='approaching'),cycle=edges.slice(first,first+4);
  expect(cycle.map(edge=>edge.to)).toEqual(['approaching','feeding','departing','cruising']);
  return {state,site,index,id,edges:cycle,approach:cycle[0].time,land:cycle[1].time,takeoff:cycle[2].time,cruise:cycle[3].time};
}
function atFraction(v,start,end,f){return sample(v.site,v.index,start+(end-start)*f,v.id);}

describe('Butterfly flower approach and takeoff preparation',()=>{
  it.each(IDS)('retains active %s braking flutters after its body starts settling',id=>{
    const v=visit(id),time=v.approach+(v.land-v.approach)*.25,pose=sample(v.site,v.index,time,id),flight=BF.visitorFlightPose(v.site,v.index,time,false,id);
    expect(pose.phase).toBe('approaching');expect(pose.perch).toBeGreaterThan(.08);expect(pose.perch).toBeLessThan(.14);
    expect(bodyDistance(pose,flight)).toBeGreaterThan(.01);
    // The animal has begun approaching the flower while its wings still
    // support flight; body settling alone must not prematurely fold them.
    for(const key of WINGS)expect(pose[key]).toBeCloseTo(flight[key],11);
  });

  it.each(IDS)('returns %s wings to powered flight before its body leaves the flower area',id=>{
    const v=visit(id),time=v.takeoff+(v.cruise-v.takeoff)*.43,pose=sample(v.site,v.index,time,id),flight=BF.visitorFlightPose(v.site,v.index,time,false,id);
    expect(pose.phase).toBe('departing');expect(pose.perch).toBeGreaterThan(.6);expect(pose.perch).toBeLessThan(.7);
    for(const key of WINGS)expect(pose[key]).toBeCloseTo(flight[key],11);
    // Early departure also contains substantial active strokes while the
    // original body attachment is still dominant.
    const early=Array.from({length:41},(_,n)=>atFraction(v,v.takeoff,v.cruise,.3+n*.0025));
    expect(early.every(pose=>pose.perch>.68)).toBe(true);
    expect(Math.max(...early.map(pose=>pose.rightWing))-Math.min(...early.map(pose=>pose.rightWing))).toBeGreaterThan(.15);
  });

  it.each(IDS)('preserves exact %s flower anchors, final alignment and departure',id=>{
    const v=visit(id),profile=BF.meadowSpecies(id),anchor=atFraction(v,v.land,v.takeoff,.5);
    expect(anchor.perch).toBe(1);expect(anchor.feeding).toBeGreaterThan(.99);
    expect(anchor.x).toBeCloseTo(anchor.flower.x+Math.sin(anchor.yaw)*.1*profile.scale,11);
    expect(anchor.y).toBeCloseTo(anchor.flower.y+.11*profile.scale,11);
    expect(anchor.z).toBeCloseTo(anchor.flower.z+Math.cos(anchor.yaw)*.1*profile.scale,11);
    for(let n=1;n<40;n++){
      const pose=atFraction(v,v.land,v.takeoff,n/40);
      expect(bodyDistance(pose,anchor)).toBeLessThan(1e-11);expect(pose.yaw).toBe(anchor.yaw);expect(pose.flower).toEqual(anchor.flower);expect(pose.perch).toBe(1);
    }
    for(const [start,end] of [[v.approach,v.land],[v.takeoff,v.cruise]])for(let n=1;n<20;n++){
      const fraction=n/20,time=start+(end-start)*fraction,pose=sample(v.site,v.index,time,id),flight=BF.visitorFlightPose(v.site,v.index,time,false,id);
      // The inspection sweep changes middle approach positions; early/final
      // alignment and every departure sample retain the original body blend.
      if(start===v.takeoff||fraction<=.08||fraction>=.9)for(const key of ['x','y','z'])expect(pose[key]).toBeCloseTo(flight[key]+(anchor[key]-flight[key])*pose.perch,10);
      expect(pose.bank).toBeCloseTo(flight.bank*(1-pose.perch),11);
      const dip=-.04-.012*Math.sin(time*2.8+v.index);
      expect(pose.pitch).toBeCloseTo(flight.pitch+(dip-flight.pitch)*pose.perch,11);
    }
  });

  it.each(IDS)('keeps %s wing value, velocity and acceleration continuous across every visit phase',id=>{
    const v=visit(id),h=.0002;
    const edges=v.edges.concat([
      {from:'active approach',to:'settling fold',time:v.approach+(v.land-v.approach)*.32},
      {from:'takeoff opening',to:'active departure',time:v.takeoff+(v.cruise-v.takeoff)*.42}
    ]);
    for(const edge of edges)for(const key of WINGS){
      const value=offset=>sample(v.site,v.index,edge.time+offset,id)[key],f0=value(0),lm=value(-h),l2=value(-2*h),l3=value(-3*h),rp=value(h),r2=value(2*h),r3=value(3*h);
      expect(Math.abs(lm-rp),`${id} ${edge.from}/${edge.to} ${key} value`).toBeLessThan(.025);
      const leftVelocity=(3*f0-4*lm+l2)/(2*h),rightVelocity=(-3*f0+4*rp-r2)/(2*h);
      expect(Math.abs(leftVelocity-rightVelocity),`${id} ${edge.to} ${key} velocity`).toBeLessThan(.03);
      const leftAcceleration=(2*f0-5*lm+4*l2-l3)/(h*h),rightAcceleration=(2*f0-5*rp+4*r2-r3)/(h*h);
      expect(Math.abs(leftAcceleration-rightAcceleration),`${id} ${edge.to} ${key} acceleration`).toBeLessThan(.35);
    }
  });

  it.each(IDS)('freezes every %s phase at shared meadow time and leaves reduced motion and evidence unchanged',id=>{
    const v=visit(id),before=JSON.stringify({state:v.state,site:v.site}),saved=BF.save(v.state);
    for(const time of [v.approach-.5,(v.approach+v.land)/2,(v.land+v.takeoff)/2,(v.takeoff+v.cruise)/2]){
      const paused=sample(v.site,v.index,time,id),flex=BF.visitorWingFlex(v.site,v.index,time,false,id,paused);
      sample(v.site,v.index,time+120,id);
      expect(sample(v.site,v.index,time,id)).toEqual(paused);expect(BF.visitorWingFlex(v.site,v.index,time,false,id)).toEqual(flex);
      const still=sample(v.site,v.index,0,id,true);
      expect(sample(v.site,v.index,time,id,true)).toEqual(still);expect(BF.visitorWingFlex(v.site,v.index,time,true,id)).toEqual({left:0,right:0,leftTwist:0,rightTwist:0});
    }
    expect(JSON.stringify({state:v.state,site:v.site})).toBe(before);expect(BF.save(v.state)).toEqual(saved);
  });
});
