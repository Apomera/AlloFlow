// Parent copies this file to tests/ after integrating the mission API.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api, f;
const copy=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),key=JSON.stringify(config)+'|baseline';
  const study=api.mammalMotionStudy(frames,'rabbits',0),strip=api.footfallPlan(frames,study),movementState={key,id:study.id,species:'rabbits',checked:true,order:['0','1','2'],firstOrder:['2','1','0'],reflection:'Own movement reflection.',footfall:{open:true,checked:true,samples:strip.samples,grid:strip.samples.map(s=>s.feet.map(p=>p.planted)),firstGrid:strip.samples.map(s=>s.feet.map(()=>false)),prediction:'clear',firstPrediction:'supported',reflection:'Own contact reflection.'}},data=api.movementEvidence(study,'baseline',movementState,strip),movement=api.capture(config,pair,data.step,'rabbits',data.prediction,data.explanation,1,null,null,data.movement);
  const plan=api.ethogramPlan(frames,'rabbits',0,0,4),codes=plan.samples.map(s=>s.category),ethogramRaw={version:1,branch:'baseline',species:'rabbits',index:0,start:0,interval:4,samples:plan.samples,codes,firstCodes:codes.map(()=>api.ethogramCategories()[0].id),reflection:'Own five-sample reflection.'},ethogram=api.capture(config,pair,8,'rabbits','Sample plan','Sampling explanation.',2,null,null,null,ethogramRaw);
  const encounter=api.encounters(frames,config).find(e=>e.kind==='listening'),trial=api.headlineTrial(frames,encounter),pins=[encounter.before+1,encounter.before+2,encounter.after],headline={version:1,branch:'baseline',trial,pins,sorts:pins.map(step=>api.headlineInterval(trial,step).classification),firstSorts:['supports','supports','supports'],verdict:'challenged',firstVerdict:'supported',reflection:'Own headline reflection.'},measured=api.pairEvidence(frames,encounter,[encounter.before,encounter.step,encounter.after]);
  const sight={version:1,kind:'listening',branch:'baseline',actorIndex:encounter.actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:frames[encounter.step][encounter.actor.id][encounter.actor.index].state,decisionDistance:frames[encounter.step][encounter.actor.id][encounter.actor.index].listenCue.distance,before:{step:encounter.before,state:frames[encounter.before][encounter.actor.id][encounter.actor.index].state},after:{step:encounter.after,state:frames[encounter.after][encounter.actor.id][encounter.actor.index].state},forecast:'approach',limitation:'Gaps do not establish capture.',headline,measurement:{version:1,samples:measured.samples,intervals:measured.intervals,claim:measured.trend,firstClaim:'steady',reflection:'Own ruler reflection.'}},interaction=api.capture(config,pair,encounter.step,encounter.actor.id,'Original action prediction','Own field explanation.',3,null,sight);
  const populationConfig=api.normalize({event:'remove',target:'foxes',eventStep:80,cover:10}),populationPair=api.compare(populationConfig),before=api.controlSample(populationPair,populationConfig,'rabbits',40),after=api.controlSample(populationPair,populationConfig,'rabbits',160),control={version:1,configKey:JSON.stringify(populationConfig),focus:'rabbits',before,after,estimates:{baseline:0,experiment:0,extra:0},firstEstimates:{baseline:0,experiment:0,extra:0},reflection:'Imperfect estimates still keep genuine evidence.',runPrediction:'Original population prediction.'},population=api.capture(populationConfig,populationPair,160,'rabbits','First estimates','Own population reflection.',4,null,null,null,null,control);
  f={config,pair,frames,key,study,strip,movementState,movement,plan,ethogram,encounter,trial,sight,interaction,population,populationConfig,populationPair,notes:[movement,ethogram,interaction,population],context:{hasRun:true,config,configKey:JSON.stringify(config),focus:'plants',cursor:240,motionStudy:movementState,fieldwork:null,ethogram:null,controlStudy:null}};
},60_000);

describe('field missions derived from actual saved evidence',()=>{
  it('counts original saved animal, pair and population evidence without requiring correct answers or awarding credit for checks',()=>{
    expect(api.missionEvidence(f.notes).map(m=>m.count)).toEqual([2,1,1]);
    const empty=api.missionRoute([],{...f.context,fieldwork:{key:f.key,id:f.encounter.id,revealed:true,saved:true},ethogram:{key:f.key,checked:true,saved:true}});
    expect(empty.covered).toBe(0);expect(empty.summary).toBe('Evidence saved for 0 of 3 missions.');
    expect(f.population.controlStudy.estimates).toEqual({baseline:0,experiment:0,extra:0});expect(api.missionEvidence([f.population])[2].count).toBe(1);
  });

  it('ignores generic observations, revealed encounters and malformed optional evidence instead of inventing completed work',()=>{
    const plain=api.capture(f.config,f.pair,20,'rabbits','Prediction','Explanation',5),sight=copy(f.sight);delete sight.headline;delete sight.measurement;
    const reveal=api.capture(f.config,f.pair,f.encounter.step,f.encounter.actor.id,'Prediction','Explanation',6,null,sight),bad=copy(f.ethogram);bad.ethogram.codes[0]='';
    expect(api.missionEvidence([plain,reveal,bad]).map(m=>m.count)).toEqual([0,0,0]);
  });

  it('counts each note once within a mission and selects the newest eligible original id rather than array order',()=>{
    const result=api.missionEvidence([f.ethogram,f.movement,f.ethogram]);expect(result[0].count).toBe(2);expect(result[0].noteIds).toEqual([1,2]);expect(result[0].latest).toEqual({noteId:2,kind:'ethogram'});
  });

  it('rejects unsupported saved bird-movement shapes before accessing mammal ordering fields',()=>{
    const raw={...copy(f.movement.movement),kind:'wingbeat'};delete raw.order;
    expect(api.movementRecord(raw,f.populationConfig,f.movement.step,'owls')).toBeNull();
    const note={...copy(f.movement),focus:'owls',config:f.populationConfig,movement:raw};
    expect(api.missionEvidence([note])[0].count).toBe(0);expect(()=>api.missionResume(note,'observe')).not.toThrow();expect(api.missionResume(note,'observe').ok).toBe(false);
  });

  it('recalculates progress immediately after deletion, falls back to the remaining note and keeps saved evidence after a run reset',()=>{
    const result=api.missionRoute(f.notes.filter(n=>n.id!==2&&n.id!==3),{hasRun:false});expect(result.covered).toBe(2);expect(result.missions[0].latest.noteId).toBe(1);expect(result.missions[1]).toMatchObject({count:0,latest:null,action:'setup'});
    expect(api.missionRoute(f.notes,{hasRun:false,motionStudy:f.movementState}).missions[0].draft).toBeNull();expect(api.missionRoute(f.notes,{hasRun:false}).covered).toBe(3);
    expect(api.missionRoute(f.notes,{hasRun:false}).missions.map(m=>m.action)).toEqual(['resume','resume','resume']);expect(api.missionRoute([],{hasRun:false}).missions.every(m=>m.action==='setup')).toBe(true);
  });

  it('finds current drafts across focus changes and continues the real representative without parsing encounter ids or marking inspections',()=>{
    const original=JSON.stringify(f.context),route=api.missionRoute(f.notes,f.context);expect(route.missions[0].action).toBe('continue');
    const movement=api.missionContinue(f.context,'observe');expect(movement).toMatchObject({ok:true,focus:'rabbits',index:0,branch:'baseline',target:'footfall'});expect(JSON.stringify(f.context)).toBe(original);
    const context={...f.context,motionStudy:null,fieldwork:{key:f.key,id:f.encounter.id,forecast:'approach',revealed:true,headline:{started:true,visited:[],pins:[]}}},before=JSON.stringify(context),next=api.missionContinue(context,'interaction');
    expect(next).toMatchObject({ok:true,focus:f.encounter.actor.id,index:f.encounter.actor.index,branch:'baseline',target:'headline'});expect(JSON.stringify(context)).toBe(before);
  });

  it('offers a chooser instead of reopening saved work over any still-valid current draft, including an activity under another focus',()=>{
    const route=api.missionRoute(f.notes,f.context);expect(route.missions[1]).toMatchObject({action:'open',otherDraft:true});expect(route.missions[2].action).not.toBe('resume');
    const clear={...f.context,motionStudy:null};expect(api.missionRoute(f.notes,clear).missions[1].action).toBe('resume');
    const stale={...f.context,motionStudy:{...f.movementState,key:'different run|baseline'}};expect(api.missionRoute(f.notes,stale).missions[0].action).toBe('resume');
  });

  it('restores exact first/latest answers and reflection as detached working copies of genuine movement, sampling, pair and control evidence',()=>{
    const original=JSON.stringify(f.notes);
    for(const [id,note,field] of [['observe',f.movement,'motionStudy'],['observe',f.ethogram,'ethogram'],['interaction',f.interaction,'fieldwork'],['population',f.population,'controlStudy']]){const result=api.missionResume(note,id);expect(result.ok,id+' '+note.id).toBe(true);expect(result[field]).toBeTruthy();expect(result.noteId).toBe(note.id);}
    const movement=api.missionResume(f.movement,'observe');expect(movement.motionStudy.order).toEqual(['0','1','2']);expect(movement.motionStudy.firstOrder).toEqual([2,1,0]);expect(movement.motionStudy.footfall.firstGrid).toEqual(f.movement.movement.footfall.firstGrid);movement.motionStudy.footfall.grid[0][0]=!movement.motionStudy.footfall.grid[0][0];
    const pair=api.missionResume(f.interaction,'interaction');expect(pair.fieldwork.headline.firstVerdict).toBe('supported');expect(pair.fieldwork.headline.verdict).toBe('challenged');expect(pair.fieldwork.reflection).toBe(f.interaction.explanation);pair.fieldwork.headline.pins[0]=999;
    expect(JSON.stringify(f.notes)).toBe(original);
  });

  it('keeps valid historical evidence counted and reviewable while refusing a current-model resume after any original quantitative sample changes',()=>{
    for(const [id,note,mutate] of [
      ['observe',f.movement,n=>{n.movement.samples[1].value+=.125;}],
      ['observe',f.ethogram,n=>{n.ethogram.samples[1].x+=.125;}],
      ['interaction',f.interaction,n=>{n.sighting.headline.trial.series[1].actor.x+=.125;n.sighting.headline.trial.series[1].cue.x+=.125;}],
      ['population',f.population,n=>{n.controlStudy.before.baseline+=.125;n.controlStudy.before.experiment+=.125;}]
    ]){const changed=copy(note);mutate(changed);expect(api.missionEvidence([changed]).find(m=>m.id===id).count).toBe(1);const before=JSON.stringify(changed),result=api.missionResume(changed,id);expect(result.ok).toBe(false);expect(result.reason).toContain('review');expect(JSON.stringify(changed)).toBe(before);}
  });

  it('checks both original ethogram sheets when resuming a sampling comparison',()=>{
    const second=api.ethogramPlan(f.frames,'rabbits',0,40,4),category=api.ethogramCategories()[0].id,raw={...copy(f.ethogram.ethogram),start:40,samples:second.samples,codes:second.samples.map(p=>p.category),reference:copy(f.ethogram.ethogram),comparison:{version:1,variable:'start',category,firstCategory:category,prediction:'higher',firstPrediction:'lower',reflection:'Two original sheets.'}},note=api.capture(f.config,f.pair,48,'rabbits','Sampling comparison','Two sheets.',7,null,null,null,raw);
    expect(note.ethogram.reference).toBeTruthy();expect(api.missionResume(note,'observe').ok).toBe(true);const changed=copy(note);changed.ethogram.reference.samples[0].z+=.125;expect(api.missionEvidence([changed])[0].count).toBe(1);expect(api.missionResume(changed,'observe').ok).toBe(false);
  });

  it('keeps legacy first movement predictions without inventing a checked latest answer',()=>{
    const note=copy(f.movement);delete note.movement.latestOrder;delete note.movement.reflection;const result=api.missionResume(note,'observe');expect(result.ok).toBe(true);expect(result.target).toBe('movement');expect(result.motionStudy).toMatchObject({checked:false,sequenceAttempted:false,reflection:''});expect(result.motionStudy.order).toEqual(['2','1','0']);
  });

  it('resumes a genuine ruler-only observation through the shared reopen path with exact original samples and first/latest claims',()=>{
    const note=copy(f.interaction);delete note.sighting.headline;const saved=JSON.stringify(note),result=api.missionResume(note,'interaction');expect(result.ok).toBe(true);expect(result.target).toBe('ruler');expect(result.fieldwork.measurement).toMatchObject({steps:note.sighting.measurement.samples.map(p=>p.step),claim:note.sighting.measurement.claim,firstClaim:note.sighting.measurement.firstClaim,reflection:note.sighting.measurement.reflection});expect(result.fieldwork.headline).toBeUndefined();expect(JSON.stringify(note)).toBe(saved);
  });

  it('opens actual ancestor details and focuses the category control within this panel without clicking, grading or using a timeout',()=>{
    const root=document.createElement('section');root.innerHTML='<details><summary>Existing activity</summary><details data-efw-headline-trial><summary>Headline</summary><input aria-label="Headline evidence interval" type="range" value="9"></details></details><article data-efw-note="3"><details><summary>Original saved evidence</summary><p>Frozen record</p></details></article>';document.body.append(root);
    const scroll=vi.fn(),input=root.querySelector('input');input.scrollIntoView=scroll;const click=vi.fn();input.addEventListener('click',click);
    expect(api.missionFocus(root,{target:'headline'})).toBe(true);expect([...root.querySelectorAll('details')].slice(0,2).every(d=>d.open)).toBe(true);expect(document.activeElement).toBe(input);expect(input.value).toBe('9');expect(click).not.toHaveBeenCalled();expect(scroll).toHaveBeenCalledWith({block:'center',behavior:'instant'});
    root.querySelector('article summary').scrollIntoView=scroll;expect(api.missionFocus(root,{target:'note',noteId:3})).toBe(true);expect(root.querySelector('article details').open).toBe(true);root.remove();
  });
});
