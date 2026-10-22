import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api,config,pair,frames,fixtures;
const clone=value=>JSON.parse(JSON.stringify(value));
const unknown=()=>Array.from({length:3},()=>Array(4).fill('uncertain'));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'});pair=api.compare(config);frames=api.behaviorTimeline(config,pair.experiment);
  fixtures={};for(const species of ['foxes','rabbits']){const study=api.motionStudy(frames,species,0),plan=api.footfallPlan(frames,study);expect(plan).toBeTruthy();fixtures[species]={study,plan,grid:plan.samples.map(sample=>sample.feet.map(foot=>foot.planted))};}
},60_000);
function state(f,grid=unknown()) {return {version:2,sampleKey:JSON.stringify(api.footfallIdentity(f.plan,'experiment')),open:true,grid:clone(grid),firstGrid:unknown(),prediction:'unsure',firstPrediction:'unsure',visited:[0,1,2],checked:true,reflection:'A hidden paw is uncertain, not necessarily clear.'};}
function movement(f,footfall=state(f)){return {key:JSON.stringify(config)+'|experiment',id:f.study.id,species:f.study.species,checked:true,order:[0,1,2],firstOrder:[2,0,1],sequenceAttempted:true,reflection:'Original order and movement evidence.',footfall,saved:false};}
function evidence(f,footfall=state(f)){return api.movementEvidence(f.study,'experiment',movement(f,footfall),f.plan);}
function note(f,footfall=state(f)){const e=evidence(f,footfall);return api.capture(config,pair,e.step,f.study.species,e.prediction,e.explanation,1,null,null,e.movement);}

describe('uncertainty-aware footfall observations',()=>{
  it('requires all twelve explicit contact, clear or uncertain marks; null and holes stay unanswered',()=>{
    const f=fixtures.rabbits;expect(api.footfallCheck(f.plan,unknown()).unresolved).toBe(12);
    const sparse=unknown();delete sparse[1][2];
    for(const grid of [null,[],[[],[],[]],sparse,...[null,undefined,'',0,1,'false','unknown',{},NaN].map(value=>{const g=unknown();g[0][0]=value;return g;})]){expect(api.footfallBounds(grid)).toBeNull();expect(api.footfallCheck(f.plan,grid)).toBeNull();if(grid!=null)expect(api.footfallCheck(f.plan,f.grid,grid)).toBeNull();}
    const sparsePlan={...f.plan,samples:Array(3)};expect(api.footfallIdentity(sparsePlan,'experiment')).toBeNull();expect(api.footfallCheck(sparsePlan,unknown())).toBeNull();
  });
  it('does not grade twelve uncertain observations as wrong or clear and never invents an accuracy denominator',()=>{
    for(const f of Object.values(fixtures)){const check=api.footfallCheck(f.plan,unknown(),unknown());expect(check).toMatchObject({total:12,resolved:0,unresolved:12,matches:0,mismatches:0,firstResolved:0,firstUnresolved:12,firstMatches:0,firstMismatches:0});expect(check.bounds).toEqual({samples:Array.from({length:3},()=>({min:0,max:4,unresolved:4})),unresolved:12,claim:'insufficient'});expect(check.samples.every(sample=>sample.correct.every(value=>value===null))).toBe(true);}
  });
  it('derives support bounds only from learner marks even when they contradict the rig',()=>{
    const f=fixtures.rabbits,grid=[[true,'uncertain',false,false],[false,false,false,false],['uncertain',false,false,false]],bounds=api.footfallBounds(grid),check=api.footfallCheck(f.plan,grid,unknown());
    expect(bounds).toEqual({samples:[{min:1,max:2,unresolved:1},{min:0,max:0,unresolved:0},{min:0,max:1,unresolved:1}],unresolved:2,claim:'clear'});expect(check.bounds).toEqual(bounds);expect(check.resolved).toBe(10);expect(check.matches+check.mismatches).toBe(10);
    const supported=Array.from({length:3},()=>[true,'uncertain','uncertain','uncertain']);expect(api.footfallBounds(supported).claim).toBe('supported');
    const unresolved=Array.from({length:3},()=>[false,'uncertain',false,false]);expect(api.footfallBounds(unresolved).claim).toBe('insufficient');
  });
  it('preserves first uncertainty separately when later definite marks match the original model contacts',()=>{
    for(const f of Object.values(fixtures)){const before=JSON.stringify(f),check=api.footfallCheck(f.plan,f.grid,unknown());expect(check).toMatchObject({matches:12,mismatches:0,resolved:12,unresolved:0,firstResolved:0,firstUnresolved:12});expect(check.firstBounds.claim).toBe('insufficient');check.bounds.samples[0].min=999;check.samples[0].correct[0]=null;expect(JSON.stringify(f)).toBe(before);}
  });
  it('binds checked v2 evidence to the immutable branch, animal, study and all normalized contact coordinates',()=>{
    const f=fixtures.rabbits,s=state(f,f.grid),original=JSON.stringify({s,f});expect(api.footfallEvidence(f.plan,f.study,'experiment',s).version).toBe(2);
    for(const patch of [{checked:false},{sampleKey:'wrong'},{sampleKey:undefined},{visited:[]},{visited:[0,1,1]},{firstGrid:[]},{grid:[[null,false,false,false],...f.grid.slice(1)]}])expect(api.footfallEvidence(f.plan,f.study,'experiment',{...clone(s),...patch})).toBeNull();
    expect(api.footfallEvidence(f.plan,f.study,'baseline',s)).toBeNull();expect(api.footfallEvidence(f.plan,{...f.study,index:1},'experiment',s)).toBeNull();
    const changed=clone(f.plan);changed.samples[0].feet[2].x+=.125;expect(api.footfallIdentity(changed,'experiment').studyId).toBe(f.study.id);expect(api.footfallEvidence(changed,f.study,'experiment',s)).toBeNull();
    const saved=api.footfallEvidence(f.plan,f.study,'experiment',s);saved.samples[0].feet[0].x=999;saved.firstGrid[0][0]=true;expect(JSON.stringify({s,f})).toBe(original);
  });
  it('normalizes v2 uncertainty without coercion and keeps legacy v1 boolean records exactly intact',()=>{
    const f=fixtures.foxes,m=evidence(f,state(f,f.grid)).movement,raw=m.footfall;expect(api.footfallRecord(raw,m,'foxes')).toEqual(raw);
    for(const patch of [{branch:'baseline'},{species:'rabbits'},{index:1},{sampleKey:{}},{sampleKey:raw.sampleKey+' '},{grid:unknown().map(column=>column.map(()=>null))}])expect(api.footfallRecord({...clone(raw),...patch},m,'foxes')).toBeNull();
    const old={version:1,studyId:f.study.id,samples:clone(f.plan.samples),grid:clone(f.grid),firstGrid:clone(f.grid),prediction:'supported',firstPrediction:'unsure',reflection:'Legacy original footfall evidence.'};expect(api.footfallRecord(old,m,'foxes')).toEqual(old);expect(api.footfallRecord({...old,grid:unknown()},m,'foxes')).toBeNull();
    const sparse=clone(raw);sparse.samples=Array(3);expect(api.footfallRecord(sparse,m,'foxes')).toBeNull();
  });
  it('does not bind unverifiable old working first answers to current samples while exact saved v1 strips can migrate',()=>{
    const f=fixtures.rabbits,legacy={version:1,open:true,checked:true,grid:clone(f.grid),firstGrid:clone(f.grid),prediction:'supported',firstPrediction:'unsure',visited:[0,1,2]},before=JSON.stringify(legacy);
    expect(api.footfallEvidence(f.plan,f.study,'experiment',legacy)).toBeNull();expect(api.footfallPending(f.plan,f.study,'experiment',legacy)).toBe(true);expect(evidence(f,legacy)).toBeNull();expect(JSON.stringify(legacy)).toBe(before);
    const exact={...clone(legacy),samples:clone(f.plan.samples)};expect(api.footfallEvidence(f.plan,f.study,'experiment',exact).version).toBe(1);
    const revised={...exact,version:2,sampleKey:JSON.stringify(api.footfallIdentity(f.plan,'experiment')),grid:unknown()};expect(api.footfallEvidence(f.plan,f.study,'experiment',revised)).toMatchObject({version:2,firstGrid:f.grid,grid:unknown()});
  });
  it('blocks submitted unchecked revisions from movement saving but leaves never-submitted optional drafts optional',()=>{
    const f=fixtures.rabbits,s=state(f);s.checked=false;expect(api.footfallPending(f.plan,f.study,'experiment',s)).toBe(true);expect(evidence(f,s)).toBeNull();
    const optional={open:true,version:2,sampleKey:s.sampleKey,grid:[[null,null,null,null],[null,null,null,null],[null,null,null,null]],firstGrid:null,checked:false};expect(api.footfallPending(f.plan,f.study,'experiment',optional)).toBe(false);expect(evidence(f,optional).movement.footfall).toBeUndefined();
    s.checked=true;expect(api.footfallPending(f.plan,f.study,'experiment',s)).toBe(false);expect(evidence(f,s).movement.footfall.grid).toEqual(unknown());
  });
  it('round-trips first and latest uncertainty grids through saved notebook, export and strict working continuation',()=>{
    const f=fixtures.rabbits,s=state(f,f.grid),saved=note(f,s),frozen=JSON.stringify(saved),normalized=api.notebook([saved])[0];expect(normalized).toEqual(saved);expect(normalized.movement.footfall).toMatchObject({version:2,branch:'experiment',species:'rabbits',index:0,firstGrid:unknown(),grid:f.grid});
    const text=api.notebookText([saved]);expect(text).toContain('Left hind uncertain');expect(text).toContain('First uncertain marks: 12; latest uncertain marks: 0.');expect(text).toContain('Latest observational support bounds:');const prefix='Frozen footfall evidence (JSON): ',line=text.split('\n').find(value=>value.startsWith(prefix));expect(JSON.parse(line.slice(prefix.length))).toEqual(saved.movement.footfall);
    const resume=api.missionResume(saved,'observe');expect(resume.ok).toBe(true);expect(resume.motionStudy.footfall.firstGrid).toEqual(unknown());expect(api.footfallPending(f.plan,f.study,'experiment',resume.motionStudy.footfall)).toBe(false);resume.motionStudy.footfall.firstGrid[0][0]=true;expect(JSON.stringify(saved)).toBe(frozen);
  });
  it('keeps a coherent historical strip frozen while refusing to apply it to changed live samples',()=>{
    const f=fixtures.rabbits,saved=note(f),historical=clone(saved),strip=historical.movement.footfall;strip.samples[0].feet[2].x+=.125;strip.sampleKey=JSON.stringify(api.footfallIdentity({studyId:strip.studyId,species:strip.species,index:strip.index,samples:strip.samples},strip.branch));
    const normalized=api.notebook([historical])[0];expect(normalized.movement.footfall).toEqual(strip);expect(api.missionResume(normalized,'observe').ok).toBe(false);expect(api.footfallEvidence(f.plan,f.study,'experiment',{...strip,checked:true,visited:[0,1,2]})).toBeNull();expect(api.missionResume(saved,'observe').ok).toBe(true);
  });
  it('changes only the requested observation angle while preserving branch, representative, time and all four recorded feet',()=>{
    for(const f of Object.values(fixtures)){const before=JSON.stringify({f,frames,pair});for(let k=0;k<3;k++)for(const angle of ['left','right','above']){const view=api.footfallView(f.plan,'experiment',k,angle,0);expect(view).toMatchObject({branch:'experiment',species:f.study.species,index:0,step:f.plan.samples[k].step,angle});expect(view.sample).toEqual(f.plan.samples[k]);expect(view.elevation).toBe(angle==='above'?1.5:.18);expect(view.orbit).toBeCloseTo(f.plan.samples[k].body.yaw+(angle==='right'?Math.PI/2:-Math.PI/2),14);view.sample.feet[0].x=999;}expect(JSON.stringify({f,frames,pair})).toBe(before);}
    const f=fixtures.rabbits;for(const args of [[-1,'left',0],[3,'above',0],[0,'rear',0],[0,'left',NaN]])expect(api.footfallView(f.plan,'experiment',...args)).toBeNull();
  });
  it('does not award mission evidence merely for uncertainty marks or camera requests, or save an unanswered strip',()=>{
    const f=fixtures.rabbits,s=state(f),route=api.missionRoute([],{hasRun:true,config,configKey:JSON.stringify(config),motionStudy:movement(f,s)});expect(route.covered).toBe(0);expect(api.missionEvidence([]).map(item=>item.count)).toEqual([0,0,0]);
    s.grid[0][0]=null;expect(api.footfallEvidence(f.plan,f.study,'experiment',s)).toBeNull();expect(evidence(f,s)).toBeNull();
    const saved=note(f);expect(api.missionEvidence([saved]).map(item=>item.count)).toEqual([1,0,0]);
  });
});
