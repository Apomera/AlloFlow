import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const act=(s,steps)=>steps.reduce((state,[a,v])=>R.act(state,a,v),s);
// These fixed schedules exercise the original timed-mixing protocol.
const start=()=>R.restore({...R.startRescue('fragile',2,'practice'),mixingModel:1});
const totalWater=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+s.pot.reserve;
const finish=s=>R.submit({...R.act(s,'plate'),answers:[2,null]});

describe('Concurrent mixing and separation kinetics',()=>{
 it('integrates the competing rates, preserving ingredient amounts',()=>{
  const initial=Object.freeze(C.create({oilMl:25,starchG:.12,dispersion:.08}));
  const mixed=C.mixDuring(initial,{waterMl:120,temperature:90,seconds:6,effortPerSecond:1/6});
  const settle=C.constants.settlingRate/(1+C.constants.starchStability*.1),mix=C.constants.mixingRate/6,equilibrium=.98*mix/(mix+settle);
  expect(mixed.dispersion).toBeCloseTo(equilibrium+(.08-equilibrium)*Math.exp(-(mix+settle)*6),13);
  expect(mixed).toMatchObject({oilMl:25,starchG:.12});expect(initial.dispersion).toBe(.08);
  expect(mixed.dispersion).toBeLessThan(C.mix(initial,{waterMl:120,temperature:90,effort:1}).dispersion);
 });
 it('gives the same result for any subdivision at fixed inputs',()=>{
  for(const temperature of [22,90,115,140])for(const effortPerSecond of [0,1/6,2]){
   const initial=C.create({oilMl:25,starchG:.12,dispersion:.8}),options={waterMl:120,temperature,effortPerSecond};
   const once=C.mixDuring(initial,{...options,seconds:12});let split=initial;
   for(let i=0;i<48;i++)split=C.mixDuring(split,{...options,seconds:.25});
   expect(split.dispersion).toBeCloseTo(once.dispersion,12);
  }
 });
 it('with no mixing effort matches settling exactly and with no elapsed time changes nothing',()=>{
  const initial=C.create({oilMl:25,starchG:.12,dispersion:.8}),options={waterMl:120,temperature:115,seconds:6};
  expect(C.mixDuring(initial,{...options,effortPerSecond:0})).toEqual(C.advance(initial,options));
  expect(C.mixDuring(initial,{...options,effortPerSecond:1/6,seconds:0})).toEqual(initial);
 });
 it('does not turn prolonged stirring into a cure for excessive heat or insufficient water',()=>{
  const initial=C.create({oilMl:25,starchG:.12,dispersion:.08});
  const warm=C.mixDuring(initial,{waterMl:120,temperature:90,seconds:120,effortPerSecond:1/6});
  const hot=C.mixDuring(initial,{waterMl:120,temperature:120,seconds:120,effortPerSecond:1/6});
  const dry=C.mixDuring(initial,{waterMl:8,temperature:90,seconds:120,effortPerSecond:1/6});
  expect(warm.dispersion).toBeGreaterThan(.9);expect(hot.dispersion).toBeLessThan(.2);expect(dry.dispersion).toBeLessThan(.25);
 });
 it('validates new rate inputs without mutating supplied options',()=>{
  const initial=C.create({oilMl:25,starchG:.12,dispersion:.08}),options=Object.freeze({waterMl:120,temperature:90,seconds:6,effortPerSecond:1/6});
  C.mixDuring(initial,options);expect(options.seconds).toBe(6);
  for(const key of ['waterMl','seconds','effortPerSecond'])for(const value of [-1,NaN,Infinity,'1',undefined])expect(()=>C.mixDuring(initial,{...options,[key]:value})).toThrow(RangeError);
 });
});

describe('A completed mix consumes simulated cooking time',()=>{
 it('advertises the fixed duration only for the new mixing model and actual mixing operations',()=>{
  for(const s of [R.start('mushroom',2),...R.rescues.map(r=>R.startRescue(r.id,0))]){
   expect(s.mixingModel).toBe(2);expect(R.evidence(s).mixingModel).toBe(2);
   for(const action of ['stirPan','stirSweep','combine'])expect(R.mixingDuration(s,action)).toBe(6);
   for(const action of ['taste','pour','advance','unknown'])expect(R.mixingDuration(s,action)).toBe(0);
   const legacy={...s};delete legacy.mixingModel;expect(R.mixingDuration(legacy,'stirPan')).toBe(0);
  }
 });
 it('advances cooling, evaporation, absorption and pasta softening during a fold',()=>{
  const initial=start(),next=R.act(initial,'stirSweep','button'),waited=R.act(initial,'advance',6);
  expect(next.time).toBe(6);expect(next.pan.temp).toBeLessThan(initial.pan.temp);expect(next.pan.moisture).toBeLessThan(initial.pan.moisture);
  expect(next.pan.absorbedWaterMl).toBeGreaterThan(0);expect(next.pan.evaporatedWaterMl).toBeGreaterThan(0);expect(next.pot.progress).toBeGreaterThan(initial.pot.progress);
  for(const key of ['temp','moisture','absorbedWaterMl','evaporatedWaterMl'])expect(next.pan[key]).toBe(waited.pan[key]);
  expect(next.pot.progress).toBe(waited.pot.progress);expect(next.pan.chemistry.dispersion).toBeGreaterThan(waited.pan.chemistry.dispersion);
  expect(next.pan.lastStir).toBe(6);expect(initial.time).toBe(0);
 });
 it('heats and cooks the second vessel while the learner mixes the pan',()=>{
  const initial=start();Object.assign(initial.pot,{temp:98,water:1000,heat:3,drained:false,progress:.8});initial.pan.combined=false;
  const next=R.act(initial,'stirPan');expect(next.pot.temp).toBeGreaterThan(initial.pot.temp);expect(next.pot.water).toBeLessThan(initial.pot.water);expect(next.pot.progress).toBeGreaterThan(initial.pot.progress);
  expect(next.log).toHaveLength(1);expect(next.log[0]).toMatchObject({action:'stirPan',startedAt:0,durationSeconds:6,time:6,accepted:true});
 });
 it('uses identical cooking physics for simplified, button and gesture mixes',()=>{
  const initial=start(),button=R.act(initial,'stirSweep','button'),gesture=R.act(initial,'stirSweep','gesture','scene-stir'),simplified=R.act(initial,'stirPan');
  for(const next of [gesture,simplified]){expect(next.time).toBe(button.time);expect(next.pan).toEqual(button.pan);expect(next.pot).toEqual(button.pot);}
  expect(gesture.log[0].interaction).toBe('scene-stir');expect(button.log[0].value).toBe('button');
 });
 it('adds pasta starch before the combine operation and cooks during its toss',()=>{
  const initial=start();initial.pan.combined=false;initial.pot.surfaceStarchG=.64;
  const next=R.act(initial,'combine');expect(next.time).toBe(6);expect(next.pan.combined).toBe(true);expect(next.pot.surfaceStarchG).toBe(0);
  expect(next.pan.chemistry.starchG).toBeCloseTo(initial.pan.chemistry.starchG+.64,12);expect(next.pot.progress).toBeGreaterThan(initial.pot.progress);
  expect(next.log[0]).toMatchObject({action:'combine',startedAt:0,durationSeconds:6,time:6,accepted:true});
 });
 it('never grants unlimited mixing while time and the dish stand still',()=>{
  const initial=start();let s=initial;for(let i=0;i<20;i++)s=R.act(s,'stirSweep','button');
  expect(s.time).toBe(120);expect(s.pan.temp).toBeLessThan(initial.pan.temp);expect(s.pan.moisture).toBeLessThan(initial.pan.moisture);expect(s.pot.progress).toBeGreaterThan(initial.pot.progress);
  expect(totalWater(s)).toBeCloseTo(totalWater(initial),10);expect(s.pan.chemistry.oilMl).toBe(25);expect(s.pan.chemistry.starchG).toBe(.12);
 });
 it('records no duration or physical change for rejected and unfinished operations',()=>{
  const initial=R.start('mushroom',2),rejected=R.act(initial,'stirSweep','button');
  expect(rejected.time).toBe(0);expect(rejected.pan).toEqual(initial.pan);expect(rejected.pot).toEqual(initial.pot);expect(rejected.log[0].accepted).toBe(false);expect(rejected.log[0]).not.toHaveProperty('durationSeconds');
  expect(R.act(initial,'stirSweep','unfinished')).toBe(initial);
  const combined=start(),duplicate=R.act(combined,'combine');expect(duplicate.time).toBe(combined.time);expect(duplicate.pan).toEqual(combined.pan);expect(duplicate.log[0].accepted).toBe(false);
 });
 it('refuses a partial operation at the cook limit but accepts exactly six seconds',()=>{
  const late=start();late.time=3595;const rejected=R.act(late,'stirPan');
  expect(rejected.time).toBe(3595);expect(rejected.pan).toEqual(late.pan);expect(rejected.log[0].accepted).toBe(false);expect(rejected.feedback).toContain('no part of the mix');expect(rejected.log[0]).not.toHaveProperty('startedAt');
  const exact={...late,time:3594},done=R.act(exact,'stirPan');expect(done.time).toBe(3600);expect(done.log[0]).toMatchObject({accepted:true,startedAt:3594,durationSeconds:6});
 });
 it('keeps a completed scorching mix accepted and invalidates the previous dish check',()=>{
  const initial=start();Object.assign(initial.pan,{temp:260,heat:3,moisture:0,damage:.99,tasted:true,lastStir:-100});
  const done=R.act(initial,'stirSweep','button');expect(done.time).toBe(6);expect(done.pan.damage).toBeGreaterThanOrEqual(1);expect(done.pan.tasted).toBe(false);
  expect(done.log[0].accepted).toBe(true);expect(done.feedback).toContain('scorched during the mix');
 });
 it('does not repeat a stale pre-mix texture claim after the timed operation',()=>{
  const initial=R.startRescue('watery',1,'demonstrate');initial.pan.moisture=181;
  const done=R.act(initial,'stirSweep','button');expect(done.pan.moisture).toBeLessThan(180);
  expect(done.feedback).toContain('Check the coating and pasta again');expect(done.feedback).not.toContain('still looks loose');
  expect(done.feedback).not.toContain('coats the pasta');
 });
 it('starts stability evidence only when the learner checks after a completed adjustment',()=>{
  const prepared=act(start(),[['taste'],['pour',30],['stirSweep','button'],['taste']]);
  expect(R.emulsionCheck(prepared)).toMatchObject({baselineAt:0,firstCheckAt:6,observedSeconds:0,met:false});
  const done=act(prepared,[['advance',60],['advance',60],['taste']]);expect(done.time).toBe(126);expect(R.emulsionCheck(done)).toMatchObject({observedSeconds:120,met:true});
  const remixed=R.act(done,'stirPan');expect(remixed.time).toBe(132);expect(R.emulsionCheck(remixed)).toMatchObject({firstCheckAt:null,observedSeconds:0,met:false});
 });
 it('still exposes transient folding and supports several lasting repair choices',()=>{
  const once=act(start(),[['taste'],['stirSweep','button'],['taste']]),later=act(once,[['advance',60],['advance',60],['taste']]);
  expect(R.sauceChemistry(once).coating).toBe(true);expect(R.sauceChemistry(later).oilDroplets).toBe(true);expect(R.emulsionCheck(later).met).toBe(false);
  for(const amount of [10,30,50,100]){
   const done=finish(act(start(),[['taste'],['pour',amount],['stirSweep','button'],['taste'],['advance',60],['advance',60],['taste']]));
   expect(R.criteria(done).every(c=>c.met)).toBe(true);
  }
 });
 it('rebuilds timing and physics from actions and ignores forged timing metadata',()=>{
  const done=finish(act(start(),[['taste'],['pour',30],['stirSweep','button'],['taste'],['advance',60],['advance',60],['taste']])),raw=JSON.parse(JSON.stringify(done));
  raw.time=999;raw.log[2].startedAt=999;raw.log[2].durationSeconds=0;raw.log[2].time=999;raw.pan.temp=999;
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,3).state.time).toBe(6);expect(R.replay(done,3).action).toMatchObject({startedAt:0,durationSeconds:6,time:6});
  expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);expect(R.evidence(done).mixingModel).toBe(1);
 });
 it('preserves instantaneous flag-absent attempts and omits new metadata from their evidence',()=>{
  const initial=start();delete initial.mixingModel;const mixed=R.act(initial,'stirSweep','button'),done=finish(act(mixed,[['taste']]));
  expect(mixed.time).toBe(0);expect(mixed.pan.temp).toBe(initial.pan.temp);expect(mixed.pan.moisture).toBe(initial.pan.moisture);
  expect(mixed.log[0]).not.toHaveProperty('startedAt');expect(mixed.log[0]).not.toHaveProperty('durationSeconds');expect(R.evidence(done)).not.toHaveProperty('mixingModel');
  expect(R.restore(done)).toEqual(done);expect(R.replay(done,1).state.time).toBe(0);expect(R.replay(done,1).state).not.toHaveProperty('mixingModel');
 });
 it('rejects unsupported versions and a timed model without sauce physics',()=>{
  const initial=start();for(const mixingModel of [null,0,3,'1',true])expect(R.restore({...initial,mixingModel})).toBeNull();
  const raw=R.start('mushroom',2);delete raw.sauceModel;expect(R.restore(raw)).toBeNull();
  const done=finish(act(start(),[['stirSweep','button'],['taste']]));expect(R.replay({...done,mixingModel:3},0)).toBeNull();
 });
});
