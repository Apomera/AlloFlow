import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
function segmentDistance(a,b,o){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length)):0;return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z);}
it('takes a continuous detour around a head-on obstacle and reaches the far side',()=>{
  const obstacles=[{id:'rock',name:'a rock',x:0,z:0,radius:.7}];let p={x:-3,z:0,yaw:0},turns=0,maxSide=0;
  for(let step=0;step<240&&Math.hypot(p.x-3,p.z)>.08;step++){
    const next=api.groundStep('rabbits',0,p,3-p.x,-p.z,.7,.17,obstacles);
    expect(segmentDistance(p,next,obstacles[0])).toBeGreaterThanOrEqual(.7+api.groundRadius('rabbits',0)-1e-10);expect(Math.hypot(next.x-p.x,next.z-p.z)).toBeLessThanOrEqual(.070000001);expect(Math.abs(next.yaw-p.yaw)).toBeLessThanOrEqual(.170000001);
    if(next.navigation)turns++;maxSide=Math.max(maxSide,Math.abs(next.z));p=next;
  }
  expect(turns).toBeGreaterThan(5);expect(maxSide).toBeGreaterThan(.9);expect(Math.hypot(p.x-3,p.z)).toBeLessThan(.08);
});
it('checks the entire step and lets an initial overlap escape without teleporting',()=>{
  const obstacle={id:'wood',name:'fallen wood',x:0,z:0,radius:.7},start={x:-1.4,z:0,yaw:0};
  const fast=api.groundStep('foxes',0,start,1,0,20,.17,[obstacle]);expect(segmentDistance(start,fast,obstacle)).toBeGreaterThanOrEqual(.7+api.groundRadius('foxes',0));expect(fast.navigation.blocked).toBe(true);
  let p={x:0,z:0,yaw:0};
  for(let step=0;step<50;step++){const next=api.groundStep('rabbits',0,p,1,0,.7,.17,[obstacle]);expect(Math.hypot(next.x-p.x,next.z-p.z)).toBeLessThanOrEqual(.070000001);if(Math.hypot(p.x,p.z)<1.012)expect(Math.hypot(next.x,next.z)).toBeGreaterThanOrEqual(Math.hypot(p.x,p.z)-1e-10);p=next;}
  expect(Math.hypot(p.x,p.z)).toBeGreaterThan(1.1);
});
it('escapes overlapping envelopes by turning toward a shared clear direction',()=>{
  const obstacles=[{id:'a',name:'a rock',x:-.6,z:0,radius:.7},{id:'b',name:'wood',x:.6,z:0,radius:.7}];let p={x:0,z:0,yaw:0},moved=0;
  for(let i=0;i<100;i++){const next=api.groundStep('rabbits',0,p,3-p.x,-p.z,.7,.17,obstacles);for(const o of obstacles){const prior=Math.hypot(p.x-o.x,p.z-o.z);if(prior<1.012)expect(Math.hypot(next.x-o.x,next.z-o.z)).toBeGreaterThanOrEqual(prior-1e-9);}moved+=next.distance;p=next;}
  expect(moved).toBeGreaterThan(2);expect(obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>1)).toBe(true);
});
it('preserves grounded clearance, recorded travel, replay and biomass across complete timelines',()=>{
  const config={enabled:{caterpillars:true,bluetits:true},event:'remove',target:'foxes'},rows=api.compare(config).baseline,before=JSON.stringify(rows),frames=api.behaviorTimeline(config,rows),obstacles=api.groundObstacles();let avoided=0,checked=0;
  for(let step=1;step<frames.length;step++)for(const id of ['foxes','rabbits','voles','caterpillars','bluetits'])for(let i=0;i<16;i++){
    const p=frames[step][id][i],old=frames[step-1][id][i];if(!p.active||p.huntStage==='airborne')continue;
    if(p.navigation){avoided++;expect(obstacles.some(o=>o.id===p.navigation.id)).toBe(true);}
    expect(p.distance-old.distance).toBeCloseTo(Math.hypot(p.x-old.x,p.z-old.z),10);
    for(const o of obstacles){const radius=o.radius+api.groundRadius(id,i),oldDistance=Math.hypot(old.x-o.x,old.z-o.z);if(oldDistance>=radius){expect(segmentDistance(old,p,o)).toBeGreaterThanOrEqual(radius-1e-9);checked++;}else if(p.moving>0)expect(Math.hypot(p.x-o.x,p.z-o.z)).toBeGreaterThanOrEqual(oldDistance-1e-9);}
  }
  expect(avoided).toBeGreaterThan(30);expect(checked).toBeGreaterThan(1000);expect(frames.every(f=>f.owls.every(p=>!p.navigation))).toBe(true);expect(JSON.stringify(rows)).toBe(before);expect(api.behaviorTimeline(config,rows)).toEqual(frames);
});
