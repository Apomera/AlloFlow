import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';
let BF;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');BF=window.__RR_TEST_EXPORTS__.butterfly;});

// A patch the learner has examined, so season runs are unlocked.
function examined(s,id){s.observations.push(id);return s;}
function mixedPlot(s){BF.applyPlan(s,'mixed','both');s.restoration.trials=[{design:'mixed',prediction:'both'}];return BF.habitats(s)[3];}
function render(toolData){
  const ctx={React,toolData:toolData||{},isDark:false,isContrast:false,setToolData(){},updateMulti(){}};
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}

describe('Butterfly mowing and timing',()=>{
 it('completes a generation on a full-resource plot only while it stays standing',()=>{
   const s=BF.freshState(),plot=mixedPlot(s);
   // Same plot, same plants. Only the cut date changes.
   expect(BF.seasonOutcome(plot,'never').completes).toBe(true);
   expect(BF.seasonOutcome(plot,'late').completes).toBe(true);
   expect(BF.seasonOutcome(plot,'early').completes).toBe(false);
   expect(BF.seasonOutcome(plot,'mid').completes).toBe(false);
 });

 it('names WHICH stage was cut short, and distinguishes that from a missing resource',()=>{
   const s=BF.freshState(),plot=mixedPlot(s);
   const early=BF.seasonOutcome(plot,'early'),mid=BF.seasonOutcome(plot,'mid');
   expect(early.blocked).toBe('caterpillar');expect(early.cutShort).toBe(true);
   expect(mid.blocked).toBe('chrysalis');expect(mid.cutShort).toBe(true);
   // A nectar-only patch fails for a different reason, and must not be
   // reported as "cut short" -- nothing was ever there to cut.
   const berg=BF.habitats(s).find(p=>p.id==='bergamot');
   const b=BF.seasonOutcome(berg,'never');
   expect(b.completes).toBe(false);expect(b.cutShort).toBe(false);
   expect(b.reason).toContain('nothing here to use');
 });

 it('fails a bare patch at the egg stage but a nectar patch at the caterpillar stage',()=>{
   const s=BF.freshState();
   // Matches what the life cycle activity tells the learner: an egg on the
   // wrong plant still hatches; the caterpillar is the stage that starves.
   expect(BF.seasonOutcome(BF.habitats(s).find(p=>p.id==='lawn'),'never').blocked).toBe('egg');
   expect(BF.seasonOutcome(BF.habitats(s).find(p=>p.id==='bergamot'),'never').blocked).toBe('caterpillar');
 });

 it('refuses to run a season on a patch with no recorded evidence',()=>{
   const s=BF.freshState();
   const blocked=BF.runSeason(s,'milkweed','never','complete');
   expect(blocked.ok).toBe(false);
   expect(blocked.message).toContain('Examine');
   expect(s.season.runs).toEqual([]);
   examined(s,'milkweed');
   expect(BF.runSeason(s,'milkweed','never','complete').ok).toBe(true);
 });

 it('requires a prediction and records whether it matched',()=>{
   const s=examined(BF.freshState(),'milkweed');
   expect(BF.runSeason(s,'milkweed','never','').ok).toBe(false);
   expect(BF.runSeason(s,'milkweed','never','maybe').ok).toBe(false);
   expect(s.season.runs).toEqual([]);
   const hit=BF.runSeason(s,'milkweed','never','complete');
   expect(hit.matched).toBe(true);expect(hit.message).toContain('Prediction matched.');
   const miss=BF.runSeason(s,'milkweed','early','complete');
   expect(miss.matched).toBe(false);expect(miss.message).toContain('Different from your prediction.');
   expect(s.season.runs).toHaveLength(2);
 });

 it('keeps one row per patch-and-mowing pair rather than growing without bound',()=>{
   const s=examined(BF.freshState(),'milkweed');
   for(let i=0;i<5;i++)BF.runSeason(s,'milkweed','never','complete');
   expect(s.season.runs).toHaveLength(1);
   BF.runSeason(s,'milkweed','early','stop');
   expect(s.season.runs).toHaveLength(2);
 });

 it('treats a contrasting pair on ONE patch as the only evidence about timing',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');
   // One run, however conclusive it looks, cannot isolate timing.
   expect(BF.timingPairs(s)).toEqual([]);
   expect(BF.judgeClaim(s,'timing-irrelevant').tested).toBe(false);
   BF.runSeason(s,'milkweed','early','stop');
   expect(BF.timingPairs(s)).toEqual([{patch:'milkweed',kept:'never',cut:'early'}]);
   const v=BF.judgeClaim(s,'timing-irrelevant');
   expect(v.tested).toBe(true);
   expect(v.verdict).toContain('do not support');
 });

 it('does not let season runs stand in for a followed generation, or the reverse',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');BF.runSeason(s,'milkweed','early','stop');
   // Seasons are recorded, but the resource claim still needs a brood.
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(false);
   const t=examined(BF.freshState(),'milkweed');
   BF.layEggs(t,'milkweed','complete');
   while(BF.advanceStage(t).ok);
   BF.broodResult(t);
   expect(BF.judgeClaim(t,'needs-both').tested).toBe(true);
   // ...and a brood says nothing about mowing timing.
   expect(BF.judgeClaim(t,'timing-irrelevant').tested).toBe(false);
 });

 it('reports season evidence among the records the learner made',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');BF.runSeason(s,'milkweed','early','stop');
   const lines=BF.judgeClaim(s,'timing-irrelevant').evidence.lines;
   expect(lines.filter(l=>l.kind==='season')).toHaveLength(2);
   const pair=lines.filter(l=>l.kind==='timing');
   expect(pair).toHaveLength(1);
   expect(pair[0].text).toContain('Same plants, different timing.');
 });

 it('round-trips season records and rejects tampered saves',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');
   const saved=BF.save(s);
   expect(saved.version).toBe(4);
   expect(BF.freshState(saved).season).toEqual(s.season);
   // Mutating the save must not reach back into live state.
   saved.season.runs[0].result='stop';
   expect(s.season.runs[0].result).toBe('complete');
   const hostile=BF.freshState({season:{mowing:'__proto__',prediction:'toString',runs:[
     null,'nope',
     {patch:'constructor',mowing:'never',prediction:'complete',result:'complete'},
     {patch:'milkweed',mowing:'nope',prediction:'complete',result:'complete'},
     {patch:'milkweed',mowing:'never',prediction:'complete',result:'complete',injected:'x'}]}});
   expect(hostile.season.mowing).toBe('never');
   expect(hostile.season.prediction).toBeNull();
   expect(hostile.season.runs).toEqual([{patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'}]);
 });

 it('renders the panel, the week track and the timing callout',()=>{
   expect(render()).toContain('Does it matter WHEN the patch is cut?');
   expect(render()).toContain('No seasons run yet.');
   const html=render({butterfly:{version:4,observations:['milkweed'],
     restoration:{design:'lawn',prediction:null,trials:[]},
     lifecycle:{patch:null,prediction:null,stage:null,broods:[]},
     season:{mowing:'early',prediction:null,runs:[
       {patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'},
       {patch:'milkweed',mowing:'early',prediction:'complete',result:'stop'}]}}});
   expect(html).toContain('Seasons you have run · 2 recorded');
   expect(html).toContain('data-bf-timing-pair');
   expect(html).toContain('Ran the whole cycle');
   expect(html).toContain('Stopped early');
 });

 it('stops counting a restoration run once the plot has been replanted',()=>{
   const s=BF.freshState();
   // Plant it, examine it, and establish a timing pair on THAT planting.
   BF.applyPlan(s,'mixed','both');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   BF.runSeason(s,'restoration','never','complete');
   BF.runSeason(s,'restoration','early','stop');
   expect(BF.timingPairs(s)).toHaveLength(1);
   expect(BF.judgeClaim(s,'timing-irrelevant').tested).toBe(true);
   // Replant the same plot as bare lawn. The old rows describe plants that are
   // no longer there, so they must stop counting as evidence about the plot.
   BF.applyPlan(s,'lawn','neither');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   expect(s.season.runs).toHaveLength(2);        // kept as a record
   expect(BF.currentSeasonRuns(s)).toHaveLength(0); // but not counted
   expect(BF.timingPairs(s)).toEqual([]);
   expect(BF.judgeClaim(s,'timing-irrelevant').tested).toBe(false);
   const ev=BF.judgeClaim(s,'timing-irrelevant').evidence;
   expect(ev.lines.filter(l=>l.kind==='season')).toHaveLength(0);
   expect(ev.seasons).toBe(0);
   // Replanting it back makes those runs describe the ground again.
   BF.applyPlan(s,'mixed','both');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   expect(BF.currentSeasonRuns(s)).toHaveLength(2);
   expect(BF.judgeClaim(s,'timing-irrelevant').tested).toBe(true);
 });

 it('keeps one row per planting, so the two plantings do not overwrite each other',()=>{
   const s=BF.freshState();
   BF.applyPlan(s,'mixed','both');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   BF.runSeason(s,'restoration','never','complete');
   BF.applyPlan(s,'flowers','nectar');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   BF.runSeason(s,'restoration','never','complete');
   // Same patch, same mowing, different planting: both rows survive.
   expect(s.season.runs).toHaveLength(2);
   expect(s.season.runs.map(r=>r.plan)).toEqual(['mixed','flowers']);
   expect(BF.currentSeasonRuns(s)).toHaveLength(1);
   // The bergamot-only planting cannot carry a caterpillar, so it stops early.
   expect(BF.currentSeasonRuns(s)[0].result).toBe('stop');
   // Re-running the SAME planting replaces its own row rather than adding one.
   BF.runSeason(s,'restoration','never','stop');
   expect(s.season.runs).toHaveLength(2);
 });

 it('drops a restoration row that arrives with no planting recorded',()=>{
   // A row with no plan cannot be matched to a planting, so it can never be
   // shown truthfully. Fixed patches are unaffected.
   const s=BF.freshState({season:{mowing:'never',prediction:null,runs:[
     {patch:'restoration',mowing:'never',prediction:'complete',result:'complete'},
     {patch:'restoration',mowing:'early',prediction:'stop',result:'stop',plan:'nope'},
     {patch:'restoration',mowing:'mid',prediction:'stop',result:'stop',plan:'mixed'},
     {patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'}]}});
   expect(s.season.runs).toEqual([
     {patch:'restoration',mowing:'mid',prediction:'stop',result:'stop',plan:'mixed'},
     {patch:'milkweed',mowing:'never',prediction:'complete',result:'complete'}]);
 });

 it('marks a replanted row in the table instead of letting it vanish',()=>{
   const html=render({butterfly:{version:4,observations:[],
     restoration:{design:'lawn',prediction:null,trials:[{design:'lawn',prediction:'neither'}]},
     lifecycle:{patch:null,prediction:null,stage:null,broods:[]},
     season:{mowing:'never',prediction:null,runs:[
       {patch:'restoration',mowing:'never',prediction:'complete',result:'complete',plan:'mixed'}]}}});
   expect(html).toContain('replanted since');
   expect(html).toContain('data-season-current="false"');
   expect(html).toContain('no longer describe what is growing there');
 });

 it('stops counting a FOLLOWED GENERATION once its plot has been replanted',()=>{
   const s=BF.freshState();
   BF.applyPlan(s,'mixed','both');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   BF.layEggs(s,'restoration','complete');while(BF.advanceStage(s).ok);BF.broodResult(s);
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(true);
   expect(BF.judgeClaim(s,'needs-both').evidence.broods).toBe(1);
   // Replant to bare lawn. Without this rule the evidence list carried two
   // contradictory lines: "no milkweed leaves" AND "reached the adult stage"
   // -- which is the exact misconception this tool exists to correct.
   BF.applyPlan(s,'lawn','neither');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   expect(s.lifecycle.broods).toHaveLength(1);      // kept as a record
   expect(BF.broodFor(s,'restoration')).toBeNull(); // but not current
   const ev=BF.judgeClaim(s,'needs-both').evidence;
   expect(ev.broods).toBe(0);
   expect(ev.lines.filter(l=>l.kind==='brood')).toHaveLength(0);
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(false);
   // Replanting back makes it describe the ground again.
   BF.applyPlan(s,'mixed','both');Object.assign(s,{x:-42,z:38});BF.land(s);BF.observe(s);
   expect(BF.broodFor(s,'restoration')).toMatchObject({result:'complete',plan:'mixed'});
   expect(BF.judgeClaim(s,'needs-both').tested).toBe(true);
 });

 it('leaves broods on the fixed patches alone, and drops an untagged restoration brood',()=>{
   const s=BF.freshState();s.observations.push('milkweed');
   BF.layEggs(s,'milkweed','complete');while(BF.advanceStage(s).ok);BF.broodResult(s);
   // A fixed patch cannot be replanted, so its row needs no tag and never goes stale.
   expect(BF.broodFor(s,'milkweed')).toEqual({patch:'milkweed',prediction:'complete',result:'complete'});
   const restored=BF.freshState({lifecycle:{patch:null,prediction:null,stage:null,broods:[
     {patch:'restoration',prediction:'complete',result:'complete'},
     {patch:'restoration',prediction:'complete',result:'complete',plan:'mixed'},
     {patch:'milkweed',prediction:'complete',result:'complete'}]}});
   expect(restored.lifecycle.broods).toEqual([
     {patch:'restoration',prediction:'complete',result:'complete',plan:'mixed'},
     {patch:'milkweed',prediction:'complete',result:'complete'}]);
 });

 it('names a replanted generation in the table instead of blanking the row',()=>{
   const html=render({butterfly:{version:4,observations:[],
     restoration:{design:'lawn',prediction:null,trials:[{design:'lawn',prediction:'neither'}]},
     lifecycle:{patch:null,prediction:null,stage:null,
       broods:[{patch:'restoration',prediction:'complete',result:'complete',plan:'mixed'}]},
     season:{mowing:'never',prediction:null,runs:[]}}});
   expect(html).toContain('data-brood-current="false"');
   expect(html).toContain('Milkweed + bergamot · replanted since');
 });

 it('never states a survival rate or a number of butterflies',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');
   const html=render(BF.save(s));
   expect(html).toContain('not how many monarchs survive');
   expect(html).not.toMatch(/\d+\s*(butterflies|monarchs|eggs)\s+(survive|survived)/i);
 });
});
