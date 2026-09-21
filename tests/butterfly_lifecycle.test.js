import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});

// Land on a patch and record the evidence the lifecycle activity requires.
function examined(s,id){const p=BF.habitats(s).find(p=>p.id===id);Object.assign(s,{x:p.x,z:p.z});BF.land(s);BF.observe(s);return s;}
function runToEnd(s){for(let i=0;i<10&&BF.advanceStage(s).ok;i++);return s;}

describe('Butterfly life cycle investigation',()=>{
 it('refuses eggs without a prediction, a real patch, or recorded evidence',()=>{
   const s=BF.freshState(),before=JSON.stringify(s);
   for(const [id,guess] of [['milkweed',''],['milkweed','constructor'],['constructor','complete'],[null,'complete'],['__proto__','stalls']])
     expect(BF.layEggs(s,id,guess).ok).toBe(false);
   // A valid patch and prediction still fail while the patch is unexamined.
   expect(BF.layEggs(s,'milkweed','complete').ok).toBe(false);
   expect(JSON.stringify(s)).toBe(before);
   examined(s,'milkweed');expect(BF.layEggs(s,'milkweed','complete').ok).toBe(true);
 });

 it('carries a generation to the adult stage only where milkweed leaves grow',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');
   expect(s.lifecycle.stage).toBe('egg');
   runToEnd(s);
   expect(s.lifecycle.stage).toBe('adult');
   const result=BF.broodResult(s);
   expect(result.ok).toBe(true);expect(result.message).toContain('Prediction matched.');
   expect(s.lifecycle.broods).toEqual([{patch:'milkweed',prediction:'complete',result:'complete'}]);
   expect(s.lifecycle.stage).toBeNull();expect(s.lifecycle.prediction).toBeNull();
 });

 it('stops a generation at the caterpillar stage on a nectar-only patch',()=>{
   const s=examined(BF.freshState(),'bergamot');
   BF.layEggs(s,'bergamot','complete');
   runToEnd(s);
   // Nectar feeds the adult the learner flies; it does not feed the caterpillar.
   expect(s.lifecycle.stage).toBe('caterpillar');
   expect(BF.advanceStage(s).ok).toBe(false);
   const result=BF.broodResult(s);
   expect(result.message).toContain('Different from your prediction.');
   expect(result.message).toContain('adult nectar cannot substitute');
   expect(s.lifecycle.broods).toEqual([{patch:'bergamot',prediction:'complete',result:'stalls'}]);
 });

 it('stops on bare lawn just as it does on flowers, for the same reason',()=>{
   const s=examined(BF.freshState(),'lawn');
   BF.layEggs(s,'lawn','stalls');
   runToEnd(s);
   expect(s.lifecycle.stage).toBe('caterpillar');
   expect(BF.broodResult(s).message).toContain('Prediction matched.');
   expect(BF.broodFor(s,'lawn').result).toBe('stalls');
 });

 it('will not record a result before the generation has gone as far as it can',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');
   expect(BF.broodResult(s).ok).toBe(false);
   BF.advanceStage(s);
   expect(BF.broodResult(s).ok).toBe(false);
   expect(s.lifecycle.broods).toEqual([]);
 });

 it('reflects the restoration plot as it is currently planted',()=>{
   const s=BF.freshState();
   BF.applyPlan(s,'flowers','nectar');examined(s,'restoration');
   BF.layEggs(s,'restoration','complete');runToEnd(s);
   expect(s.lifecycle.stage).toBe('caterpillar');
   BF.broodResult(s);
   expect(BF.broodFor(s,'restoration').result).toBe('stalls');
   // Replant with milkweed and the same plot now carries a generation through.
   BF.applyPlan(s,'mixed','both');examined(s,'restoration');
   BF.layEggs(s,'restoration','complete');runToEnd(s);
   BF.broodResult(s);
   // One row PER PLANTING: the bergamot-only result is kept as a record of what
   // that planting did, but only the current planting is reported for the plot.
   expect(s.lifecycle.broods).toHaveLength(2);
   expect(s.lifecycle.broods.map(b=>b.plan)).toEqual(['flowers','mixed']);
   expect(BF.broodFor(s,'restoration').result).toBe('complete');
   expect(BF.broodRowsFor(s,'restoration')).toHaveLength(2);
 });

 it('abandons a running generation when the plot it lives on is replanted',()=>{
   const s=BF.freshState();
   BF.applyPlan(s,'mixed','both');examined(s,'restoration');
   BF.layEggs(s,'restoration','complete');BF.advanceStage(s);
   expect(s.lifecycle.stage).toBe('caterpillar');
   BF.applyPlan(s,'lawn','neither');
   // The habitat it depended on is gone, so it cannot be recorded as a result.
   expect(s.lifecycle.stage).toBeNull();expect(s.lifecycle.patch).toBeNull();
   expect(s.lifecycle.broods).toEqual([]);expect(BF.broodResult(s).ok).toBe(false);
 });

 it('leaves a generation on a reference patch untouched when the plot is replanted',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');BF.advanceStage(s);
   BF.applyPlan(s,'mixed','both');
   expect(s.lifecycle.patch).toBe('milkweed');expect(s.lifecycle.stage).toBe('caterpillar');
 });

 it('lets the learner abandon a running generation without recording evidence',()=>{
   const s=examined(BF.freshState(),'milkweed');
   expect(BF.abandonBrood(s).ok).toBe(false);
   BF.layEggs(s,'milkweed','complete');BF.advanceStage(s);
   const result=BF.abandonBrood(s);
   expect(result.ok).toBe(true);expect(result.message).toContain('Nothing was recorded');
   // An unfinished generation says nothing about the habitat, so no row appears.
   expect(s.lifecycle.broods).toEqual([]);
   expect(s.lifecycle.stage).toBeNull();expect(s.lifecycle.prediction).toBeNull();
   expect(s.lifecycle.patch).toBeNull();
   // The choosers are usable again, so the learner is not stuck.
   expect(BF.layEggs(s,'milkweed','stalls').ok).toBe(true);
 });

 it('keeps an earlier recorded result visible after abandoning a rerun',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   BF.layEggs(s,'milkweed','stalls');BF.advanceStage(s);
   BF.abandonBrood(s);
   // The finished record stands; only the abandoned rerun is discarded.
   expect(s.lifecycle.broods).toEqual([{patch:'milkweed',prediction:'complete',result:'complete'}]);
   expect(s.lifecycle.patch).toBe('milkweed');
 });

 it('does not fly, spend energy, or grant patch evidence while a generation runs',()=>{
   const s=examined(BF.freshState(),'milkweed');
   Object.assign(s,{energy:44,clock:9,paused:true});
   const observations=JSON.stringify(s.observations);
   BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   expect(s.energy).toBe(44);expect(s.clock).toBe(9);expect(s.paused).toBe(true);
   expect(JSON.stringify(s.observations)).toBe(observations);
 });

 it('keeps one record per patch and round-trips saves without aliasing',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','stalls');runToEnd(s);BF.broodResult(s);
   expect(BF.broodFor(s,'milkweed').prediction).toBe('stalls');
   // Following the same patch again replaces that row rather than appending.
   BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   expect(s.lifecycle.broods).toHaveLength(1);
   expect(BF.broodFor(s,'milkweed').prediction).toBe('complete');
   const saved=BF.save(s),restored=BF.freshState(saved);
   expect(saved.version).toBe(4);
   expect(restored.lifecycle).toEqual(s.lifecycle);
   saved.lifecycle.broods[0].result='stalls';
   expect(s.lifecycle.broods[0].result).toBe('complete');
   expect(restored.lifecycle.broods[0].result).toBe('complete');
 });

 it('rejects tampered saved lifecycle values and bounds the history',()=>{
   const s=BF.freshState({lifecycle:{patch:'constructor',prediction:'toString',stage:'__proto__',
     broods:[null,'bad',{patch:'milkweed',result:'complete'},{patch:'nowhere',prediction:'complete',result:'complete'},
       {patch:'lawn',prediction:'stalls',result:'stalls',extra:'unsafe'},
       ...Array(20).fill({patch:'bergamot',prediction:'complete',result:'stalls'})]}});
   expect(s.lifecycle.patch).toBeNull();expect(s.lifecycle.prediction).toBeNull();expect(s.lifecycle.stage).toBeNull();
   // Only the last 12 entries are considered, so the leading records fall off;
   // what survives is stripped of unknown fields and deduplicated by patch.
   expect(s.lifecycle.broods).toEqual([{patch:'bergamot',prediction:'complete',result:'stalls'}]);
   // A short tampered history keeps its valid rows and drops the invalid ones.
   expect(BF.freshState({lifecycle:{broods:[null,'bad',{patch:'milkweed',result:'complete'},
     {patch:'nowhere',prediction:'complete',result:'complete'},
     {patch:'lawn',prediction:'stalls',result:'stalls',extra:'unsafe'}]}}).lifecycle.broods)
     .toEqual([{patch:'lawn',prediction:'stalls',result:'stalls'}]);
   expect(BF.freshState({lifecycle:{broods:'invalid'}}).lifecycle.broods).toEqual([]);
   expect(BF.freshState({lifecycle:'invalid'}).lifecycle.broods).toEqual([]);
   expect(BF.freshState().lifecycle).toEqual({patch:null,prediction:null,stage:null,broods:[]});
 });

 it('clamps a restored stage to what that patch can actually support',()=>{
   // A tampered save, or a plot replanted by an older build, could name a
   // stage the patch refuses to advance to. The track would then sit at a
   // stage the same patch will not move past.
   const impossible=BF.freshState({observations:['lawn'],
     lifecycle:{patch:'lawn',prediction:'complete',stage:'adult',broods:[]}});
   expect(impossible.lifecycle.stage).toBe('caterpillar');
   expect(impossible.lifecycle.patch).toBe('lawn');
   // The restoration plot is judged against its CURRENT planting.
   const bare=BF.freshState({restoration:{design:'lawn',prediction:null,trials:[{design:'lawn',prediction:'neither'}]},
     lifecycle:{patch:'restoration',prediction:'complete',stage:'adult',broods:[]}});
   expect(bare.lifecycle.stage).toBe('caterpillar');
   const planted=BF.freshState({restoration:{design:'mixed',prediction:null,trials:[{design:'mixed',prediction:'both'}]},
     lifecycle:{patch:'restoration',prediction:'complete',stage:'adult',broods:[]}});
   expect(planted.lifecycle.stage).toBe('adult');
 });

 it('leaves every legal restored stage untouched',()=>{
   for(const [patch,stage] of [['lawn','egg'],['lawn','caterpillar'],['bergamot','caterpillar'],
     ['milkweed','egg'],['milkweed','chrysalis'],['milkweed','adult']]){
     const s=BF.freshState({observations:['lawn','bergamot','milkweed'],
       lifecycle:{patch,prediction:'complete',stage,broods:[]}});
     expect(s.lifecycle.stage).toBe(stage);
   }
 });

 it('agrees with the stage track the panel renders',()=>{
   const milkweed=BF.habitats(BF.freshState()).find(p=>p.id==='milkweed');
   const bergamot=BF.habitats(BF.freshState()).find(p=>p.id==='bergamot');
   expect(BF.reachedStage(milkweed)).toBe(BF.stages.length-1);
   expect(BF.reachedStage(bergamot)).toBe(1);
   expect(BF.expectedOutcome(milkweed)).toBe('complete');
   expect(BF.expectedOutcome(bergamot)).toBe('stalls');
   // Every stage reads as thriving on milkweed and failing where there is none.
   BF.stages.forEach((st,i)=>{
     expect(BF.stageStatus(milkweed,i)).toBe('thriving');
     expect(BF.stageStatus(bergamot,i)).toBe('failing');
   });
 });
});

describe('Butterfly evidence-based conclusion',()=>{
 it('refuses to judge a claim before any generation has been followed',()=>{
   const s=examined(BF.freshState(),'milkweed');
   for(const c of BF.claims){
     const v=BF.judgeClaim(s,c.id);
     expect(v.tested).toBe(false);
     expect(v.verdict).toBe('You have not tested this claim yet.');
     // An untested claim must point at the investigation that WOULD test it.
     // A timing claim needs a matched pair of seasons, not a followed
     // generation, so the two kinds of claim send the learner to different
     // places. Both must still name a concrete next step.
     expect(v.why).toContain(c.needs==='season'?'run the SAME patch twice':'follow a generation');
   }
 });

 it('still withholds a verdict when only planting comparisons exist',()=>{
   const s=BF.freshState();
   BF.applyPlan(s,'mixed','both');examined(s,'restoration');
   expect(s.restoration.trials).toHaveLength(1);
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(false);
 });

 it('supports the sound claim and rejects the unsound ones once tested',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   expect(BF.judgeClaim(s,'needs-both')).toMatchObject({tested:true,verdict:'Your records support that claim.'});
   for(const id of ['nectar-enough','green-enough'])
     expect(BF.judgeClaim(s,id).verdict).toBe('Your records do not support that claim.');
   // Exactly one claim is the sound one, so the panel cannot affirm two.
   expect(BF.claims.filter(c=>c.sound).map(c=>c.id)).toEqual(['needs-both']);
 });

 it('builds the evidence list only from records the learner actually made',()=>{
   const s=BF.freshState();
   expect(BF.evidenceFor(s).lines).toEqual([]);
   examined(s,'bergamot');
   const afterPatch=BF.evidenceFor(s);
   expect(afterPatch.lines).toHaveLength(1);
   expect(afterPatch.lines[0]).toMatchObject({kind:'patch'});
   expect(afterPatch.lines[0].text).toContain('nectar present');
   expect(afterPatch.lines[0].text).toContain('no milkweed leaves');
   BF.layEggs(s,'bergamot','stalls');runToEnd(s);BF.broodResult(s);
   const afterBrood=BF.evidenceFor(s);
   expect(afterBrood.lines.filter(l=>l.kind==='brood')).toHaveLength(1);
   expect(afterBrood.broodsStalled).toEqual(['Wild bergamot']);
   expect(afterBrood.broodsComplete).toEqual([]);
 });

 it('separates generations that completed from those that stalled',()=>{
   const s=BF.freshState();
   examined(s,'milkweed');BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   examined(s,'lawn');BF.layEggs(s,'lawn','stalls');runToEnd(s);BF.broodResult(s);
   const ev=BF.evidenceFor(s);
   expect(ev.broodsComplete).toEqual(['Common milkweed']);
   expect(ev.broodsStalled).toEqual(['Mown lawn']);
   expect(ev.broods).toBe(2);
 });

 it('reports what the patch makes possible, not how many would survive',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');runToEnd(s);
   const msg=BF.broodResult(s).message;
   // "carried a generation all the way to an adult" read as a survival claim.
   expect(msg).toContain('not a count of how many would survive');
   expect(msg).not.toContain('all the way to an adult');
 });

 it('rejects an unknown claim id instead of inventing a verdict',()=>{
   const s=examined(BF.freshState(),'milkweed');
   for(const id of [null,'','constructor','__proto__','toString','unknown'])
     expect(BF.judgeClaim(s,id)).toBeNull();
 });

 it('does not mutate the session when a claim is judged',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.layEggs(s,'milkweed','complete');runToEnd(s);BF.broodResult(s);
   const before=JSON.stringify(s),saved=BF.save(s);
   BF.claims.forEach(c=>{BF.judgeClaim(s,c.id);BF.evidenceFor(s);});
   expect(JSON.stringify(s)).toBe(before);
   expect(BF.save(s)).toEqual(saved);
 });
});
