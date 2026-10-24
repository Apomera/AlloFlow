import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};
const moving={active:true,state:'Hopping between feeding spots',moving:.42,distance:0,phase:0,forage:0};
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});

describe('bird joint articulation follows recorded behavior',()=>{
  it('launches and lands both blue-tit feet together with a bounded airborne arc',()=>{
    const pose=distance=>api.birdArticulation('bluetits',{...moving,distance},7,false);
    for(const distance of [0,.0384,.2016,.24]){
      const p=pose(distance);expect(p.contact).toBe(true);expect(p.footLift).toBeCloseTo(0,10);expect(p.bodyLift).toBeCloseTo(0,10);
    }
    const apex=pose(.12);expect(apex.contact).toBe(false);expect(apex.mode).toBe('hop');
    expect(apex.bodyLift).toBeCloseTo(.065,10);expect(apex.footLift).toBeCloseTo(.021,10);expect(apex.footReach).toBeCloseTo(0,10);
    for(const boundary of [.0384,.2016,.24]){
      const a=pose(boundary-1e-7),b=pose(boundary+1e-7);
      for(const key of ['bodyLift','bodyPitch','footLift','footReach','shoulder','wrist','tailPitch'])expect(Math.abs(a[key]-b[key])).toBeLessThan(.00001);
    }
    // During a contact section, foot reach counters forward body travel.
    expect(pose(.02).footReach-pose(.01).footReach).toBeCloseTo(-.01/.8,10);
  });

  it('stops foot motion when stationary and opens balancing wings during escape',()=>{
    const airborne={...moving,distance:.12},normal=api.birdArticulation('bluetits',airborne,4,false);
    const escape=api.birdArticulation('bluetits',{...airborne,state:'Moving away',moving:.7},4,false);
    expect(escape.mode).toBe('escape');expect(escape.wingSpread).toBeGreaterThan(normal.wingSpread);expect(escape.bodyLift).toBeLessThan(.09);
    for(const state of ['Pecking','Preening','Not present']){
      const still={...airborne,state,moving:0,forage:state==='Pecking'?1:0},a=api.birdArticulation('bluetits',still,1,false),b=api.birdArticulation('bluetits',still,24,false);
      expect(a).toEqual(b);expect(a.contact).toBe(true);expect(a.footLift).toBe(0);expect(a.footReach).toBe(0);expect(a.wingSpread).toBe(0);
      if(state==='Pecking'){expect(a.mode).toBe('feed');expect(a.bodyPitch).toBeLessThan(0);expect(a.tailPitch).toBeGreaterThan(0);}
    }
  });

  it('coordinates a stationary feeding bow and neck reach while keeping both feet planted',()=>{
    const pose=forage=>api.birdArticulation('bluetits',{...moving,state:'Pecking',moving:0,forage},4,false);
    const upright=pose(0),half=pose(.5),deep=pose(1);
    expect(deep.bodyPitch).toBeLessThan(half.bodyPitch);expect(deep.headPitch).toBeLessThan(half.headPitch);
    expect(deep.headDrop).toBeGreaterThan(half.headDrop);expect(deep.headReach).toBeGreaterThan(half.headReach);
    for(const p of [upright,half,deep]){expect(p.contact).toBe(true);expect(p.footLift).toBe(0);expect(p.footReach).toBe(0);expect(p.wingSpread).toBe(0);}
    expect(upright.headDrop).toBe(0);expect(upright.headReach).toBe(0);
    expect(api.birdArticulation('bluetits',{...moving,state:'Preening',moving:0,forage:.3},4,false).headDrop).toBe(0);
    expect(pose(0)).toEqual(upright);expect(pose(1)).toEqual(deep);
  });

  it('eases the feeding neck through action changes and preening without a discrete reset',()=>{
    const joints=(state,forage)=>api.birdArticulation('bluetits',{...moving,state,moving:0,forage},4,false);
    const feeding=joints('Pecking',.8),recovering=joints('Hopping between feeding spots',.8);
    for(const key of ['headDrop','headReach','headPitch','bodyPitch'])expect(recovering[key]).toBe(feeding[key]);
    const recovery=[.8,.7,.52,.34,.3,.16,0].map(f=>joints('Hopping between feeding spots',f));
    for(let i=1;i<recovery.length;i++)expect(recovery[i].headDrop).toBeLessThanOrEqual(recovery[i-1].headDrop);
    expect(recovery.at(-1).headDrop).toBe(0);expect(recovery.at(-1).headReach).toBe(0);
    for(const boundary of [.3,.55])for(const key of ['bodyPitch','headPitch','headDrop','headReach'])expect(Math.abs(joints('Pecking',boundary-1e-7)[key]-joints('Preening',boundary+1e-7)[key])).toBeLessThan(1e-6);
  });

  it('reduces hop offsets while braking instead of dropping from full hop height at the stop threshold',()=>{
    const pose=movingSpeed=>api.birdArticulation('bluetits',{...moving,distance:.12,moving:movingSpeed},4,false);
    const full=pose(.42),slow=pose(.03),nearStop=pose(.015001),stopped=pose(0);
    expect(slow.bodyLift).toBeGreaterThan(0);expect(slow.bodyLift).toBeLessThan(full.bodyLift*.05);
    expect(nearStop.bodyLift).toBeLessThan(.001);expect(nearStop.footLift).toBeLessThan(.001);
    expect(stopped.bodyLift).toBeCloseTo(0,12);expect(stopped.footLift).toBeCloseTo(0,12);expect(stopped.contact).toBe(true);
  });

  it('flexes owl wrists behind the shoulder stroke and stabilizes the head while banking',()=>{
    const owl={active:true,phase:0,wingFlap:1,bank:.2};
    const flap=Array.from({length:30},(_,i)=>api.birdArticulation('owls',owl,i/10,false));
    const glide=Array.from({length:30},(_,i)=>api.birdArticulation('owls',{...owl,wingFlap:.12},i/10,false));
    const span=(values,key)=>Math.max(...values.map(p=>p[key]))-Math.min(...values.map(p=>p[key]));
    expect(span(flap,'shoulder')).toBeGreaterThan(span(glide,'shoulder')*5);
    expect(span(flap,'wrist')).toBeGreaterThan(span(glide,'wrist')*5);
    // At the shoulder's neutral crossing, its delayed wrist is still flexed.
    expect(flap[0].wrist).toBeGreaterThan(.15);expect(flap[0].shoulder).toBeCloseTo(.045,12);
    for(const p of flap){expect(p.mode).toBe('flap');expect(p.contact).toBe(false);expect(p.headPitch).toBe(-p.bodyPitch);expect(p.headRoll).toBeCloseTo(-.17,12);expect(p.tailFan).toBeGreaterThan(.2);}
    expect(glide.every(p=>p.mode==='glide')).toBe(true);
    const late=api.birdArticulation('owls',owl,25,false);
    expect(api.birdArticulation('owls',owl,25.2,false).shoulder).not.toBe(late.shoulder);
    expect(api.birdArticulation('owls',owl,25,false)).toEqual(late);
  });

  it('freezes a neutral pose in reduced motion regardless of time or earlier action',()=>{
    for(const id of ['owls','bluetits']){
      const start=api.birdArticulation(id,{},0,true);
      for(const time of [0,3,12,24])expect(api.birdArticulation(id,{...moving,distance:4,wingFlap:1,bank:.25,state:'Moving away'},time,true)).toEqual(start);
      expect(start.phase).toBe(0);expect(start.bodyLift).toBe(0);expect(start.headRoll).toBe(0);
    }
  });

  it('keeps all sampled joints finite, bounded, reproducible and separate from population data',()=>{
    let totalFeeds=0;
    // Retain all default-run checks and exercise feeding in the investigation
    // that deliberately brings blue tits and caterpillars close together.
    for(const [cfg,branch] of [[config,'experiment'],[api.investigation('insects').config,'baseline']]){
    const rows=api.compare(cfg)[branch],before=JSON.stringify(rows),frames=api.behaviorTimeline(cfg,rows);let hops=0,feeds=0;
    for(let step=0;step<frames.length;step++)for(const id of ['owls','bluetits'])for(const pose of frames[step][id]){
      const old=JSON.stringify(pose),p=api.birdArticulation(id,pose,step/10,false);
      expect(Object.entries(p).filter(([key])=>!['contact','mode'].includes(key)).every(([,value])=>Number.isFinite(value))).toBe(true);
      expect(Math.abs(p.bodyLift)).toBeLessThanOrEqual(.082);expect(Math.abs(p.shoulder)).toBeLessThan(.48);expect(Math.abs(p.wrist)).toBeLessThan(.27);
      expect(p.phase).toBeGreaterThanOrEqual(0);expect(p.phase).toBeLessThan(1);expect(p.wingSpread).toBeGreaterThanOrEqual(0);expect(p.wingSpread).toBeLessThanOrEqual(1);
      expect(Math.abs(p.footReach)).toBeLessThanOrEqual(.048+1e-12);expect(Math.abs(p.headRoll)).toBeLessThanOrEqual(.2125+1e-12);
      if(p.mode==='hop')hops++;if(p.mode==='feed')feeds++;
      expect(api.birdArticulation(id,pose,step/10,false)).toEqual(p);expect(JSON.stringify(pose)).toBe(old);
    }
    expect(hops).toBeGreaterThan(50);if(branch==='baseline')expect(feeds).toBeGreaterThan(0);totalFeeds+=feeds;expect(JSON.stringify(rows)).toBe(before);
    }
    expect(totalFeeds).toBeGreaterThan(0);
  });
});
