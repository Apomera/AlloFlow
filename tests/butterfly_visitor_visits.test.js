import {beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const THREE=require('../vendor/three-r128/three.min.js');
let BF;
beforeAll(()=>{
  resetStemLab();
  window.__RR_TEST_EXPORTS__={};
  loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  BF=window.__RR_TEST_EXPORTS__.butterfly;
});

const POSE_KEYS=['x','y','z','yaw','bank','pitch','leftWing','rightWing','hindLag','feeding','perch'];
function angleBetween(a,b){return Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)));}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function patchFor(id,design='lawn'){
  const state=BF.freshState({restoration:{design}});
  return {state,patch:BF.habitats(state).find(p=>p.id===id)};
}
function samples(patch,index,seconds=90,step=.1){
  return Array.from({length:Math.floor(seconds/step)+1},(_,n)=>({time:n*step,pose:BF.visitorVisitPose(patch,index,n*step,false)}));
}
function phaseRuns(rows,phase){
  const runs=[];
  for(const row of rows){
    if(row.pose.phase!==phase)continue;
    const prior=runs[runs.length-1];
    if(prior&&row.time-prior[prior.length-1].time<.11)prior.push(row);
    else runs.push([row]);
  }
  return runs;
}

describe('Autonomous butterfly flower visits',()=>{
  it.each([
    ['milkweed','lawn'],['bergamot','lawn'],['restoration','flowers'],['restoration','mixed']
  ])('approaches real %s (%s) flowers, feeds for a while, and returns to flight', (id,design)=>{
    const {patch}=patchFor(id,design),rows=samples(patch,0);
    expect(new Set(rows.map(row=>row.pose.phase))).toEqual(new Set(['cruising','approaching','feeding','departing']));
    const runs=phaseRuns(rows,'feeding');
    expect(runs.length).toBeGreaterThanOrEqual(2);
    const flowers=new Set();
    for(const run of runs){
      // Ignore a clipped run at either end of the sampling window.
      if(run[0].time===0||run[run.length-1].time===90)continue;
      expect(run[run.length-1].time-run[0].time).toBeGreaterThanOrEqual(3);
      const perched=run[Math.floor(run.length/2)].pose;
      expect(perched.perch).toBe(1);
      expect(perched.feeding).toBeGreaterThan(.9);
      expect(perched.flower).not.toBeNull();
      for(const row of run){
        expect(distance(row.pose,perched)).toBeLessThan(1e-8);
        expect(row.pose.flower).toEqual(perched.flower);
      }
      // A chosen flower must belong to the same deterministic stem layout
      // as the rendered meadow, including both halves of a mixed plot.
      const mixed=id==='restoration'&&design==='mixed';
      const plantKinds=mixed?[0,1]:[patch.host?0:1];
      const stems=plantKinds.flatMap(pi=>Array.from({length:mixed?17:34},(_,index)=>BF.stemPose(patch,pi,index,mixed?17:34,mixed?(pi===0?-6:6):0)));
      const stem=stems.find(s=>Math.hypot(s.x-perched.flower.x,s.z-perched.flower.z)<1e-8);
      expect(stem).toBeDefined();
      expect(perched.flower.y).toBeGreaterThan(stem.height);
      expect(perched.flower.y-stem.height).toBeLessThan(1.5);
      expect(perched.y).toBeGreaterThan(perched.flower.y);
      expect(distance(perched,perched.flower)).toBeLessThan(2);
      flowers.add(JSON.stringify(perched.flower));
    }
    expect(flowers.size).toBeGreaterThan(1);
  });

  it('stays finite and crosses every arrival, feeding, departure, and cycle boundary smoothly',()=>{
    const {patch}=patchFor('milkweed');
    for(let index=0;index<4;index++){
      const rows=samples(patch,index);
      for(let n=0;n<rows.length;n++){
        const {time,pose}=rows[n];
        for(const key of POSE_KEYS)expect(Number.isFinite(pose[key])).toBe(true);
        expect(pose.perch).toBeGreaterThanOrEqual(0);expect(pose.perch).toBeLessThanOrEqual(1);
        expect(pose.feeding).toBeGreaterThanOrEqual(0);expect(pose.feeding).toBeLessThanOrEqual(1);
        expect(pose.y).toBeGreaterThan(0);
        const next=BF.visitorVisitPose(patch,index,time+.001,false);
        expect(distance(pose,next)).toBeLessThan(.04);
        // Cruising retains the pre-existing route tangent, which can turn
        // quickly at a near-stationary cusp; arrival and departure ease it.
        if(pose.phase!=='cruising'&&next.phase===pose.phase)expect(angleBetween(pose.yaw,next.yaw),`visitor ${index}, time ${time}, phase ${pose.phase}`).toBeLessThan(.04);
        expect(Math.abs(pose.rightWing-next.rightWing)).toBeLessThan(.06);
        if(!n||pose.phase===rows[n-1].pose.phase)continue;
        // Locate the actual phase edge rather than hoping a regular sample
        // happens to land on it, so even a one-frame teleport is caught.
        let lo=rows[n-1].time,hi=time;
        const beforePhase=rows[n-1].pose.phase;
        for(let j=0;j<30;j++){
          const mid=(lo+hi)/2;
          if(BF.visitorVisitPose(patch,index,mid,false).phase===beforePhase)lo=mid;else hi=mid;
        }
        const before=BF.visitorVisitPose(patch,index,lo-.0001,false),after=BF.visitorVisitPose(patch,index,hi+.0001,false);
        expect(distance(before,after)).toBeLessThan(.01);
        expect(angleBetween(before.yaw,after.yaw)).toBeLessThan(.01);
        for(const key of ['bank','pitch','leftWing','rightWing','hindLag','perch','feeding'])expect(Math.abs(before[key]-after[key])).toBeLessThan(.02);
      }
    }
  });

  it('staggers visitors so they do not all settle and take off together',()=>{
    const {patch}=patchFor('bergamot');
    const timelines=Array.from({length:4},(_,index)=>samples(patch,index));
    const firstFeeds=timelines.map(rows=>rows.find(row=>row.pose.phase==='feeding').time);
    expect(new Set(firstFeeds).size).toBeGreaterThan(2);
    expect(timelines[0].some((_,n)=>new Set(timelines.map(rows=>rows[n].pose.phase)).size>=3)).toBe(true);
  });

  it('settles and gently opens resting wings independently while the body stays anchored',()=>{
    const {patch}=patchFor('bergamot');
    const run=phaseRuns(samples(patch,0),'feeding').find(rows=>rows.length>40),anchor=run[0].pose;
    const openings=run.map(row=>Math.abs(row.pose.leftWing));
    expect(Math.max(...openings)-Math.min(...openings)).toBeGreaterThan(.2);
    expect(run.some(({pose})=>Math.abs(pose.leftWing+pose.rightWing)>.025)).toBe(true);
    expect(run.some(({pose})=>Math.abs(pose.hindLag)>.003)).toBe(true);
    for(let i=0;i<run.length;i++){
      const pose=run[i].pose;
      expect(distance(pose,anchor)).toBeLessThan(1e-8);
      expect(pose.flower).toEqual(anchor.flower);
      expect(pose.yaw).toBe(anchor.yaw);expect(pose.perch).toBe(1);
      for(const key of ['leftWing','rightWing']){
        expect(Math.abs(pose[key])).toBeGreaterThan(.8);
        expect(Math.abs(pose[key])).toBeLessThan(1.4);
        if(i)expect(Math.abs(pose[key]-run[i-1].pose[key])).toBeLessThan(.12);
      }
      expect(Math.abs(pose.hindLag)).toBeLessThan(.04);
    }
  });

  it.each(['cabbage-white','painted-lady','tiger-swallowtail','monarch'])('adds a bounded %s inspection sweep before a precise landing',id=>{
    const state=BF.freshState(),patches=BF.habitats(state).filter(p=>p.nectar),index=BF.visitorSpecies.indexOf(id),site=BF.visitorPatch(patches,index),scale=BF.meadowSpecies(id).scale;
    const before=JSON.stringify({state,site}),saved=BF.save(state),at=time=>BF.visitorVisitPose(site,index,time,false,id);
    // Discover the two visit windows from their actual phase transitions.
    const rows=Array.from({length:2001},(_,n)=>({time:n*.05,pose:at(n*.05)}));
    const runs=phaseRuns(rows,'approaching').filter(run=>run[0].time>.05&&run[run.length-1].time<99.95).slice(0,2);
    expect(runs).toHaveLength(2);
    function edge(lo,hi){
      const phase=at(lo).phase;
      for(let n=0;n<32;n++){const mid=(lo+hi)/2;if(at(mid).phase===phase)lo=mid;else hi=mid;}
      return (lo+hi)/2;
    }
    const sides=[];
    for(const run of runs){
      const start=edge(run[0].time-.05,run[0].time),end=edge(run[run.length-1].time,run[run.length-1].time+.05),duration=end-start,touchdown=at(end+.002);
      expect(touchdown.phase).toBe('feeding');expect(touchdown.perch).toBe(1);
      expect(touchdown.y-touchdown.flower.y).toBeCloseTo(.11*scale,10);
      expect(Math.hypot(touchdown.x-touchdown.flower.x,touchdown.z-touchdown.flower.z)).toBeCloseTo(.1*scale,10);
      // The uncurved reference uses the actual route, touchdown and perch blend.
      // This checks the visible behavior without copying the arc's pulse formula.
      function offset(fraction){
        const time=start+duration*fraction,pose=at(time),flight=BF.visitorFlightPose(site,index,time,false,id),weight=pose.perch;
        return {x:pose.x-(flight.x+(touchdown.x-flight.x)*weight),y:pose.y-(flight.y+(touchdown.y-flight.y)*weight),z:pose.z-(flight.z+(touchdown.z-flight.z)*weight)};
      }
      const middle=offset(.5),lateral=Math.hypot(middle.x,middle.z);
      expect(lateral).toBeGreaterThan(.25*scale);expect(lateral).toBeLessThan(.35*scale);
      expect(middle.y).toBeGreaterThan(.15*scale);expect(middle.y).toBeLessThan(.21*scale);
      sides.push(middle.x*Math.cos(touchdown.yaw)-middle.z*Math.sin(touchdown.yaw));
      expect(Math.abs(middle.x*Math.sin(touchdown.yaw)+middle.z*Math.cos(touchdown.yaw))).toBeLessThan(1e-9);
      for(let n=0;n<=30;n++){
        const d=offset(n/30);
        expect(Math.hypot(d.x,d.z)).toBeLessThanOrEqual(.35*scale);
        expect(d.y).toBeGreaterThanOrEqual(-1e-9);expect(d.y).toBeLessThanOrEqual(.21*scale);
      }
      for(const fraction of [.04,.96]){
        const d=offset(fraction);expect(Math.hypot(d.x,d.y,d.z)).toBeLessThan(1e-9);
      }
      for(const time of [end+.2,end+.9]){
        const feeding=at(time);expect(feeding.phase).toBe('feeding');
        expect(distance(feeding,touchdown)).toBeLessThan(1e-10);expect(feeding.flower).toEqual(touchdown.flower);
      }
      const time=start+duration*.5,paused=at(time),flex=BF.visitorWingFlex(site,index,time,false,id);
      at(time+91);expect(at(time)).toEqual(paused);
      expect(BF.visitorWingFlex(site,index,time,false,id)).toEqual(flex);
      const still=BF.visitorVisitPose(site,index,0,true,id);
      for(const clock of [time,time+91])expect(BF.visitorVisitPose(site,index,clock,true,id)).toEqual(still);
    }
    expect(sides[0]*sides[1]).toBeLessThan(0);
    expect(JSON.stringify({state,site})).toBe(before);expect(BF.save(state)).toEqual(saved);
  });

  it('never feeds on lawn or an unplanted restoration plot',()=>{
    for(const id of ['lawn','restoration']){
      const {patch}=patchFor(id);
      for(let index=0;index<4;index++)for(let time=0;time<=90;time+=.5){
        const pose=BF.visitorVisitPose(patch,index,time,false);
        expect(pose).toMatchObject({phase:'cruising',feeding:0,perch:0,flower:null});
        expect(pose).toMatchObject(BF.visitorFlightPose(patch,index,time,false));
      }
    }
  });

  it('freezes a visit at the same meadow time without changing learner state or patch data',()=>{
    const {state,patch}=patchFor('restoration','mixed');
    Object.assign(state,{clock:8,energy:42,observations:['milkweed']});
    const before=JSON.stringify({state,patch}),saved=BF.save(state);
    for(const phase of ['cruising','approaching','feeding','departing']){
      const sample=samples(patch,1).find(row=>row.pose.phase===phase);
      expect(sample).toBeDefined();
      const pose=BF.visitorVisitPose(patch,1,sample.time,false);
      BF.visitorVisitPose(patch,1,sample.time+90,false);
      expect(BF.visitorVisitPose(patch,1,sample.time,false)).toEqual(pose);
    }
    expect(JSON.stringify({state,patch})).toBe(before);
    expect(BF.save(state)).toEqual(saved);
  });

  it('keeps reduced motion completely still without an automatic feeding visit',()=>{
    const {patch}=patchFor('milkweed');
    for(let index=0;index<4;index++){
      const initial=BF.visitorVisitPose(patch,index,0,true);
      expect(initial).toMatchObject({phase:'cruising',feeding:0,perch:0,bank:0,pitch:0,hindLag:0});
      for(const time of [2,8,16,27,51,90])expect(BF.visitorVisitPose(patch,index,time,true)).toEqual(initial);
    }
  });

  it('assigns eligible adult flower patches and preserves finite, still poses for every identified species',()=>{
    const patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar);
    const ids=['cabbage-white','painted-lady','tiger-swallowtail','monarch'];
    expect(BF.meadowSpeciesList).toHaveLength(4);
    for(const [index,id] of ids.entries()){
      const site=BF.visitorPatch(patches,index);
      expect(site?.nectar).toBe(true);
      if(id==='cabbage-white')expect(site.id).toBe('milkweed');
      expect(BF.watchedVisitorIndex(patches,site.id,id)).toBe(index);
      const still=BF.visitorVisitPose(site,index,0,true,id);
      expect(still).toMatchObject({phase:'cruising',feeding:0,perch:0,flower:null});
      let feeding=false;
      for(let time=0;time<=90;time+=.5){
        const pose=BF.visitorVisitPose(site,index,time,false,id);
        for(const key of POSE_KEYS)expect(Number.isFinite(pose[key])).toBe(true);
        feeding||=pose.phase==='feeding'&&pose.feeding>.9;
        expect(BF.visitorVisitPose(site,index,time,true,id)).toEqual(still);
      }
      expect(feeding).toBe(true);
    }
    expect(ids[BF.watchedVisitorIndex(patches,'bergamot',null)]).toBe('monarch');
    expect(BF.visitorPatch(patches.filter(patch=>patch.id!=='milkweed'),0)).toBeFalsy();
    const site=BF.visitorPatch(patches,3);
    expect(BF.visitorVisitPose(site,3,17,false)).toEqual(BF.visitorVisitPose(site,3,17,false,'monarch'));
  });

  it.each(['cabbage-white','painted-lady','tiger-swallowtail','monarch'])('keeps %s membrane flex bounded and continuous through every visit phase',id=>{
    const state=BF.freshState(),patches=BF.habitats(state).filter(patch=>patch.nectar),index=BF.visitorSpecies.indexOf(id);
    const site=BF.visitorPatch(patches,index),before=JSON.stringify({state,site}),phases=new Set(),rows=[];
    const zero={left:0,right:0,leftTwist:0,rightTwist:0};
    let flightPeak=0;
    for(let time=0;time<=75;time+=.25){
      const pose=BF.visitorVisitPose(site,index,time,false,id),flex=BF.visitorWingFlex(site,index,time,false,id);
      const values=Object.values(flex);
      phases.add(pose.phase);rows.push({time,phase:pose.phase});
      expect(values.every(Number.isFinite)).toBe(true);
      // Bending stays small relative to the roughly seven-unit half-span.
      expect(Math.max(...values.map(Math.abs))).toBeLessThan(1);
      expect(Math.max(Math.abs(flex.leftTwist),Math.abs(flex.rightTwist))).toBeLessThan(.5);
      expect(BF.visitorWingFlex(site,index,time,true,id)).toEqual(zero);
      if(pose.phase==='cruising')flightPeak=Math.max(flightPeak,Math.abs(flex.left),Math.abs(flex.right));
      if(pose.phase==='feeding'&&pose.feeding>.9)expect(Math.max(...values.map(Math.abs))).toBeLessThan(.2);
    }
    expect(phases).toEqual(new Set(['cruising','approaching','feeding','departing']));
    expect(flightPeak).toBeGreaterThan(.12);
    // Locate the actual phase crossings, including departure back to flight.
    // Flex may change direction but must never snap to a different shape.
    for(let row=1;row<rows.length;row++){
      if(rows[row-1].phase===rows[row].phase)continue;
      let lo=rows[row-1].time,hi=rows[row].time;
      for(let search=0;search<18;search++){
        const middle=(lo+hi)/2;
        if(BF.visitorVisitPose(site,index,middle,false,id).phase===rows[row-1].phase)lo=middle;else hi=middle;
      }
      const a=BF.visitorWingFlex(site,index,lo-.0001,false,id),b=BF.visitorWingFlex(site,index,hi+.0001,false,id);
      for(const key of Object.keys(a))expect(Math.abs(a[key]-b[key])).toBeLessThan(.02);
    }
    for(const phase of phases){
      const time=rows.find(row=>row.phase===phase).time,paused=BF.visitorWingFlex(site,index,time,false,id);
      BF.visitorWingFlex(site,index,time+93,false,id);
      expect(BF.visitorWingFlex(site,index,time,false,id)).toEqual(paused);
    }
    expect(BF.visitorWingFlex(null,index,8,false,id)).toEqual(zero);
    expect(JSON.stringify({state,site})).toBe(before);
  });

  it('keeps feeding visitors attached to swaying blossoms, with a frozen pose when time stops',()=>{
    const world=BF.buildWorld(THREE,window.StemMeadow);
    try{
      const patches=BF.habitats(BF.freshState()).filter(p=>p.nectar);
      const index=world.visitors.findIndex(visitor=>visitor.speciesId==='monarch');
      expect(index).toBeGreaterThanOrEqual(0);
      const run=phaseRuns(samples(BF.visitorPatch(patches,index),index),'feeding').find(rows=>rows.length>30);
      const time=run[Math.floor(run.length/2)].time,visitor=world.visitors[index];
      function animate(t,reduced=false){
        world.animate(t,reduced,false);
        world.animateVisitors(t,reduced,patches,false);
      }
      function snapshot(){
        return world.visitors.map(v=>({position:v.root.position.toArray(),rotation:v.root.rotation.toArray(),wings:v.wings.map(w=>w.rotation.z),tube:v.proboscis.morphTargetInfluences[0]}));
      }
      function checkAnchor(){
        expect(visitor.root.userData.behavior).toBe('feeding');
        const point=visitor.root.position,flower=visitor.root.userData.flower;
        expect(point.y-flower.y).toBeCloseTo(.11,10);
        expect(Math.hypot(point.x-flower.x,point.z-flower.z)).toBeCloseTo(.1,10);
        expect(visitor.proboscis.morphTargetInfluences[0]).toBeGreaterThan(.9);
      }
      animate(time);checkAnchor();
      const first=visitor.root.position.clone();
      animate(time+.6);checkAnchor();
      expect(visitor.root.position.distanceTo(first)).toBeGreaterThan(.0001);
      const paused=snapshot();
      animate(time+.6);expect(snapshot()).toEqual(paused);
      animate(3,true);const reduced=snapshot();
      animate(80,true);expect(snapshot()).toEqual(reduced);
      world.visitors.forEach(v=>{
        expect(v.proboscis.morphTargetInfluences[0]).toBe(0);
        expect(v.proboscis.geometry).toBe(visitor.proboscis.geometry);
        for(const key of ['position','normal'])expect(Array.from(v.proboscis.geometry.morphAttributes[key][0].array).every(Number.isFinite)).toBe(true);
      });
      world.animateVisitors(time,false,patches,true);
      expect(world.visitors.every(v=>!v.root.visible)).toBe(true);
    }finally{
      const resources=new Set();
      world.scene.traverse(object=>{
        if(object.geometry)resources.add(object.geometry);
        if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));
      });
      resources.forEach(resource=>resource.dispose());
    }
  });
});
