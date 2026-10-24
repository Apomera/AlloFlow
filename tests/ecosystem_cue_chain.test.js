import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab,renderTool} from './helpers/stem_widgets_smoke_harness.js';
let api,f;
const clone=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounter=api.encounters(frames,config).find(item=>item.kind==='vigilance'),trial=api.inferenceTrial(frames,encounter,'baseline'),plan=api.cueChainCase(frames,trial);
  expect(plan).toBeTruthy();
  const S=plan.trace.step,answers={cue:'neighbor',directInputStep:S-2,neighborInputStep:S-1},firstAnswers={cue:'predator',directInputStep:S,neighborInputStep:'unsure'},chain={version:1,case:plan,caseKey:JSON.stringify(plan),answers,firstAnswers,reflection:'The neighbor used earlier predator positions; the selected rabbit then used its neighbor’s alert. Current display positions are later.',open:true,checked:true};
  const codes=api.inferenceClaims(trial).map(card=>card.category),baseState={open:true,trial,visited:[trial.before,trial.step,trial.after],codes,firstCodes:codes.slice(),checked:true,reflection:'Recorded labels and cue metadata support different statements.'},state={...baseState,chain},inference=api.inferenceEvidence(frames,encounter,'baseline',state);
  expect(inference?.chain).toBeTruthy();
  const sight={version:1,kind:encounter.kind,branch:'baseline',actorIndex:encounter.actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:trial.samples[1].actor.state,decisionDistance:trial.decision.distance,before:{step:trial.before,state:trial.samples[0].actor.state},after:{step:trial.after,state:trial.samples[2].actor.state},forecast:'avoid',limitation:'A model-rule chain does not establish real animal communication.',inference};
  const note=api.capture(config,pair,encounter.step,'rabbits','Original action prediction.','Original observation.',1,null,sight);
  f={config,pair,frames,encounter,trial,plan,S,answers,firstAnswers,chain,codes,baseState,state,inference,sight,note};
},60_000);

describe('optional recorded vigilance cue-chain detective',()=>{
  it('uses an actual original checkpoint and separates the two input generations from current display poses without mutation',()=>{
    const before=JSON.stringify({frames:f.frames,population:f.pair}),plan=api.cueChainCase(f.frames,f.trial),trace=api.vigilanceTrace(f.frames,f.S,f.trial.actor.index);
    expect(plan.trace).toEqual(trace);expect([f.trial.before,f.trial.step,f.trial.after]).toContain(plan.trace.step);expect(plan.trace.step).toBe(f.trial.step);
    expect(plan.trace.directDecisionStep).toBe(f.S-2);expect(plan.trace.neighborDecisionStep).toBe(f.S-1);expect(plan.trace.source.index).toBe(f.trial.cue.index);expect(plan.trace.receiver.index).toBe(f.trial.actor.index);
    const xy=(step,id,index)=>{const pose=f.frames[step][id][index];return [pose.x,pose.z];};
    expect(plan.trace.inputs).toEqual({predator:xy(f.S-2,plan.trace.predator.id,plan.trace.predator.index),directObserver:xy(f.S-2,'rabbits',plan.trace.source.index),neighbor:xy(f.S-1,'rabbits',plan.trace.source.index),receiver:xy(f.S-1,'rabbits',plan.trace.receiver.index)});
    for(const role of ['receiver','source','predator']){const item=plan.trace[role],pose=f.frames[f.S][item.id][item.index];expect(item.pose).toEqual({active:true,state:pose.state,x:pose.x,z:pose.z,yaw:pose.yaw,altitude:pose.altitude});}
    plan.trace.predator.pose.x=999;plan.trace.inputs.predator[0]=999;expect(api.cueChainCase(f.frames,f.trial)).toEqual(f.plan);expect(JSON.stringify({frames:f.frames,population:f.pair})).toBe(before);
  });

  it('rejects forged roles generations food links and malformed input/display data',()=>{
    const changes=[p=>{p.branch='experiment';},p=>{p.trialKey='copied';},p=>{p.trace.step++;},p=>{p.trace.directDecisionStep++;},p=>{p.trace.neighborDecisionStep--;},p=>{p.trace.receiver.index=p.trace.source.index;},p=>{p.trace.predator.id='owls';},p=>{p.trace.receiver.pose.state='Grazing';},p=>{p.trace.receiver.pose.x+=.1;},p=>{p.trace.source.pose.z+=.1;},p=>{p.trace.source.pose.state='Checking after retreat';},p=>{p.trace.source.pose.active=false;},p=>{p.trace.source.pose.x=NaN;},p=>{p.trace.predator.pose.yaw=Infinity;},p=>{p.trace.inputs.predator=[0];},p=>{p.trace.inputs.receiver[0]='0';},p=>{p.trace.directDistance+=.1;},p=>{p.trace.decisionDistance+=.1;}];
    for(const change of changes){const raw=clone(f.plan);change(raw);expect(api.cueChainSnapshot(raw,f.trial)).toBeNull();}
    for(const input of [null,{},[],{...f.trial,kind:'spacing'}])expect(api.cueChainCase(f.frames,input)).toBeNull();
    const frames=f.frames.slice(),at=f.S-2;frames[at]={...frames[at],foxes:frames[at].foxes.map(p=>({...p}))};frames[at].foxes[f.plan.trace.predator.index].x+=.125;
    expect(api.inferenceTrial(frames,f.encounter,'baseline')).toEqual(f.trial);expect(api.cueChainCase(frames,f.trial)).toBeNull();expect(api.cueChainMatches(f.chain,frames,f.trial)).toBe(false);
  });

  it('checks role and exact original times while treating explicit uncertainty as an answer without false certainty',()=>{
    const correct=api.cueChainCheck(f.plan,f.trial,f.answers,f.firstAnswers);expect(correct.matches).toBe(3);expect(correct.uncertain).toBe(0);expect(correct.firstAnswers).toEqual(f.firstAnswers);
    const uncertain=api.cueChainCheck(f.plan,f.trial,{cue:'unsure',directInputStep:'unsure',neighborInputStep:'unsure'});expect(uncertain.matches).toBe(0);expect(uncertain.uncertain).toBe(3);expect(uncertain.rows.every(row=>row.correct===null)).toBe(true);
    for(const patch of [{cue:''},{cue:'foxes'},{directInputStep:String(f.S-2)},{neighborInputStep:f.S-.5},{directInputStep:f.S+1},{neighborInputStep:null}])expect(api.cueChainCheck(f.plan,f.trial,{...f.answers,...patch})).toBeNull();
    expect(api.cueChainCheck(f.plan,f.trial,f.answers,{...f.firstAnswers,cue:'invalid'})).toBeNull();
    for(const plan of [null,{},[],{trace:null},{trace:{}},{trace:{step:1}},{trace:{step:241}},{trace:{step:'160'}},{trace:{step:NaN}},{trace:{step:Infinity}}])expect(api.cueChainAnswers(f.answers,plan)).toBeNull();
  });

  it('normalizes detached frozen first/latest answers and bounds explanation text without trusting a supplied score',()=>{
    const raw={...clone(f.chain),matches:3,firstPrediction:'neighbor',reflection:'x'.repeat(1600)},before=JSON.stringify(raw),record=api.cueChainRecord(raw,f.trial);
    expect(record.firstAnswers).toEqual(f.firstAnswers);expect(record.answers).toEqual(f.answers);expect(record.reflection).toHaveLength(1200);expect(record).not.toHaveProperty('matches');expect(record).not.toHaveProperty('firstPrediction');
    record.firstAnswers.cue='neighbor';record.answers.directInputStep=999;record.case.trace.inputs.predator[0]=999;expect(JSON.stringify(raw)).toBe(before);
    for(const patch of [{version:2},{caseKey:'another-case'},{caseKey:undefined},{firstAnswers:null},{answers:{}}])expect(api.cueChainRecord({...clone(f.chain),...patch},f.trial)).toBeNull();
  });

  it('keeps unopened or never-submitted sheets optional and leaves legacy v1 inference records unchanged',()=>{
    const legacy=api.inferenceEvidence(f.frames,f.encounter,'baseline',f.baseState);expect(legacy).not.toHaveProperty('chain');
    for(const chain of [undefined,{}, {open:true,answers:{}}, {version:1,case:f.plan,caseKey:JSON.stringify(f.plan),answers:f.firstAnswers,firstAnswers:null,checked:false}]){
      expect(api.cueChainPending(chain,f.frames,f.trial)).toBe(false);const state={...f.baseState,chain},record=api.inferenceEvidence(f.frames,f.encounter,'baseline',state);
      expect(record).toEqual(legacy);expect(api.fieldworkSaveReadiness(f.frames,f.encounter,'baseline',{inference:state}).ok).toBe(true);
    }
    expect(api.inferenceText(legacy,true).join('\n')).not.toContain('Cue-chain detective');
    const malformed=clone(f.sight);malformed.inference.chain.caseKey='not-this-case';const note=api.capture(f.config,f.pair,f.encounter.step,'rabbits','Original prediction.','Original observation.',3,null,malformed);
    expect(note.sighting.inference.codes).toEqual(f.codes);expect(note.sighting.inference.chain).toBeUndefined();
  });

  it('blocks unchecked or stale submitted revisions and retains the first answers until an explicit new sheet',()=>{
    const before=JSON.stringify(f.state);
    for(const patch of [{checked:false},{caseKey:'copied'},{answers:{...f.answers,directInputStep:null}}]){
      const chain={...clone(f.chain),...patch};expect(api.cueChainPending(chain,f.frames,f.trial)).toBe(true);expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',{...f.baseState,chain})).toBeNull();
      const ready=api.fieldworkSaveReadiness(f.frames,f.encounter,'baseline',{inference:{...f.baseState,chain}});expect(ready.ok).toBe(false);expect(ready.pending[0]).toMatchObject({id:'inference',target:'chain'});
    }
    const revised={...clone(f.chain),answers:{cue:'unsure',directInputStep:f.S-2,neighborInputStep:f.S-1},checked:true},saved=api.inferenceEvidence(f.frames,f.encounter,'baseline',{...f.baseState,chain:revised});expect(saved.chain.firstAnswers).toEqual(f.firstAnswers);expect(saved.chain.answers.cue).toBe('unsure');expect(JSON.stringify(f.state)).toBe(before);
  });

  it('preserves the exact frozen optional chain through capture normalization and portable notebook export',()=>{
    const note=api.notebook([f.note])[0],record=note.sighting.inference.chain;expect(record).toEqual(api.cueChainRecord(f.chain,f.trial));
    const text=api.notebookText([note]);expect(text).toContain('First submitted cue prediction: predator directly');expect(text).toContain('not a claim that the learner had not inspected');expect(text).toContain('earlier');expect(text).toContain(f.chain.reflection);
    const prefix='Frozen cue-chain case (JSON): ',line=text.split('\n').find(value=>value.startsWith(prefix));expect(JSON.parse(line.slice(prefix.length))).toEqual(record);
    record.firstAnswers.cue='neighbor';record.case.trace.predator.pose.x=999;expect(api.notebook([f.note])[0]).toEqual(f.note);
  });

  it('keeps coherent historical chain evidence visible while refusing to restore it onto changed current inputs',()=>{
    const historical=clone(f.note),chain=historical.sighting.inference.chain;chain.case.trace.predator.pose.x+=.125;chain.caseKey=JSON.stringify(chain.case);
    const note=api.notebook([historical])[0];expect(note.sighting.inference.chain).toEqual(chain);expect(api.inferenceMatches(note.sighting.inference,f.frames,f.encounter)).toBe(false);expect(api.inferenceText(note.sighting.inference,true).join('\n')).toContain('Cue-chain detective');
    expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',{...f.baseState,chain:{...clone(chain),checked:true}})).toBeNull();
  });

  it('adds no mission credit on its own and restores detached chain answers only with independently measured mission evidence',()=>{
    expect(api.missionEvidence([f.note]).map(row=>row.count)).toEqual([0,0,0]);
    const measured=api.pairEvidence(f.frames,f.encounter,[f.trial.before,f.trial.step,f.trial.after]),sight={...clone(f.sight),measurement:{version:1,samples:measured.samples,intervals:measured.intervals,claim:measured.trend,firstClaim:'steady',reflection:'Separate pair measurements.'}},note=api.capture(f.config,f.pair,f.encounter.step,'rabbits','Original forecast.','Original observation.',2,null,sight),before=JSON.stringify(note),resume=api.missionResume(note,'interaction');
    expect(resume.ok).toBe(true);expect(resume.fieldwork.inference.chain).toEqual({...f.note.sighting.inference.chain,open:true,checked:true});resume.fieldwork.inference.chain.firstAnswers.cue='neighbor';expect(JSON.stringify(note)).toBe(before);expect(api.missionEvidence([note])[1].count).toBe(1);
  });

  it('renders semantic role/time controls and a specific keyboard return target while a submitted revision blocks only its parent save',()=>{
    // SSR has no branch-switch effect: its initial meadow branch is experiment.
    const frames=api.behaviorTimeline(f.config,f.pair.experiment),encounter=api.encounters(frames,f.config).find(item=>item.kind==='vigilance'),trial=api.inferenceTrial(frames,encounter,'experiment'),plan=api.cueChainCase(frames,trial);expect(plan).toBeTruthy();
    const S=plan.trace.step,codes=api.inferenceClaims(trial).map(card=>card.category),chain={...clone(f.chain),case:plan,caseKey:JSON.stringify(plan),answers:{cue:'neighbor',directInputStep:S-2,neighborInputStep:S-1},firstAnswers:{cue:'predator',directInputStep:S,neighborInputStep:'unsure'},checked:false},state={...clone(f.baseState),trial,visited:[trial.before,trial.step,trial.after],codes,firstCodes:codes.slice(),chain},fieldwork={key:JSON.stringify(f.config)+'|experiment',id:encounter.id,forecast:'avoid',revealed:true,reflection:'Own explanation.',limit:'Own limit.',saved:false,inference:state};
    const html=renderTool('ecosystem',{ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original prediction.'},showMeadow:true,cursor:trial.step,focus:'rabbits',fieldwork}}}),host=document.createElement('div');host.innerHTML=html;
    const section=host.querySelector('[data-efw-cue-chain]');expect(section).toBeTruthy();expect(section.querySelector('summary').textContent).toBe('Cue-chain detective');expect(section.querySelector('table caption').textContent).toContain('earlier inputs');expect(section.querySelectorAll('select')).toHaveLength(3);expect(section.textContent).toContain('not a blind-prediction test');
    expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Save wildlife observation').disabled).toBe(true);expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Return to cue-chain choices')).toBe(true);expect(html).not.toContain('<canvas');
  });
});
