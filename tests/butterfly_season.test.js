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

 it('never states a survival rate or a number of butterflies',()=>{
   const s=examined(BF.freshState(),'milkweed');
   BF.runSeason(s,'milkweed','never','complete');
   const html=render(BF.save(s));
   expect(html).toContain('not how many monarchs survive');
   expect(html).not.toMatch(/\d+\s*(butterflies|monarchs|eggs)\s+(survive|survived)/i);
 });
});
