import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api,f;
const clone=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounter=api.encounters(frames,config).find(item=>item.kind==='spacing');
  expect(encounter).toBeTruthy();const context=api.spacingProbeCase(frames,encounter);expect(context).toBeTruthy();
  const pose=frames[encounter.step].rabbits[encounter.actor.index],sighting={version:1,kind:'spacing',branch:'baseline',actorIndex:encounter.actor.index,cueId:'rabbits',cueIndex:encounter.cue.index,state:pose.state,decisionDistance:pose.spacingCue.decisionDistance,before:{step:encounter.before,state:frames[encounter.before].rabbits[encounter.actor.index].state},after:{step:encounter.after,state:frames[encounter.after].rabbits[encounter.actor.index].state},forecast:'avoid',limitation:'One frozen navigation decision is not a modified animal trajectory.'};
  f={config,pair,frames,encounter,context,sighting};
});
function record(variable='distance',value=2.5,context=f.context,branch='baseline'){
  context=api.spacingProbeRun(context,'distance',context.recorded.decisionDistance).context;
  const control=api.spacingProbeRun(context,variable,variable==='distance'?context.recorded.decisionDistance:true),trial=api.spacingProbeRun(context,variable,value);
  return {version:2,branch,contextKey:api.spacingProbeContextKey(context,branch),control,trial,firstPrediction:'unsure',prediction:trial.outcome,reflection:'The collected control and changed input belong to exactly the same frozen decision.'};
}
function working(raw=record()){return {...clone(raw),variable:raw.trial.variable,...(raw.trial.variable==='distance'?{distance:raw.trial.value}:{feeding:raw.trial.value}),checked:true};}
function evidence(state=working(),branch='baseline',frames=f.frames){return api.spacingProbePairEvidence(frames,f.encounter,branch,state);}
function note(raw=record(),measured=false){
  const sighting={...f.sighting,probe:raw};
  // Only real measured evidence qualifies the existing interaction mission.
  // A cue experiment alone must never acquire that mission's credit.
  if(measured){const m=api.pairEvidence(f.frames,f.encounter,[f.encounter.before,f.encounter.step,f.encounter.after]);sighting.measurement={version:1,samples:m.samples,intervals:m.intervals,claim:m.trend,firstClaim:m.trend,reflection:'Measured the same fixed pair at all three original checkpoints.'};}
  return api.capture(f.config,f.pair,f.encounter.step,'rabbits','Original wildlife prediction.','Own observed encounter explanation.',1,null,sighting);
}

describe('deliberately collected paired controls in the existing neighbor cue bench',()=>{
  it('retains a real unchanged control and one changed-input trial with the exact full frozen case and branch',()=>{
    for(const raw of [record(),record('feeding',false)]){
      const saved=api.spacingProbeRecord(raw,f.sighting,'rabbits');expect(saved).toEqual(raw);
      expect(saved.control.control).toBe(true);expect(saved.control.modifiedInput).toEqual(f.context.input);expect(saved.control.modified).toEqual(saved.control.original);
      expect(saved.trial.control).toBe(false);expect(saved.control.context).toEqual(saved.trial.context);expect(saved.control.variable).toBe(saved.trial.variable);
      expect(JSON.parse(saved.contextKey)).toEqual({branch:'baseline',context:f.context});expect(evidence(working(raw))).toEqual(raw);
    }
  });
  it('rejects a recomputed original, missing control, changed control or unchanged intervention as a collected pair',()=>{
    const raw=record();
    for(const patch of [{control:null},{control:raw.control.original},{control:raw.trial},{trial:raw.control},{control:{...raw.control,value:raw.control.value+1e-13}}])expect(api.spacingProbePairRecord({...clone(raw),...patch},f.sighting,'rabbits')).toBeNull();
    expect(api.spacingProbePairRecord({...raw,version:1},f.sighting,'rabbits')).toBeNull();
  });
  it('locks both collected runs to one variable and rejects a second changed input or altered rule result',()=>{
    const raw=record();
    for(const mutate of [r=>{r.trial=record('feeding',false).trial;},r=>{r.trial.modifiedInput.food=false;},r=>{r.trial.modifiedInput.rabbits[r.trial.context.actorIndex].x+=.1;},r=>{r.trial.modifiedInput.rabbits[r.trial.context.cueIndex].state='Resting';},r=>{r.control.modifiedInput.rabbits[r.control.context.actorIndex].foodAvailable=false;},r=>{r.trial.outcome='invented';},r=>{r.control.modified.state='Resting';},r=>{r.trial.original.decisionDistance+=.1;}]){
      const changed=clone(raw);mutate(changed);expect(api.spacingProbePairRecord(changed,f.sighting,'rabbits')).toBeNull();
    }
  });
  it('binds full original inputs rather than the coarse onset id and rejects mixed contexts',()=>{
    const other=clone(f.context);other.input.rabbits[other.cueIndex].cooldown=other.input.rabbits[other.cueIndex].cooldown===0?1:0;
    // A neighbor's own spacing cooldown is retained evidence even when its
    // grazing pose still produces the same actor's local decision.
    const changed=record('distance',2.5,other),raw=record();expect(changed.trial.context.id).toBe(raw.trial.context.id);expect(changed.contextKey).not.toBe(raw.contextKey);
    expect(api.spacingProbePairRecord({...raw,control:changed.control},f.sighting,'rabbits')).toBeNull();
    expect(evidence(working(changed))).toBeNull();
  });
  it('requires exact canonical branch, actor, neighbor and onset provenance',()=>{
    const raw=record();
    for(const patch of [{branch:'experiment'},{contextKey:raw.contextKey+' '},{contextKey:'wrong'},{firstPrediction:''},{prediction:'wrong'}])expect(api.spacingProbePairRecord({...clone(raw),...patch},f.sighting,'rabbits')).toBeNull();
    for(const sighting of [{...f.sighting,branch:'experiment'},{...f.sighting,actorIndex:0},{...f.sighting,cueIndex:15},{...f.sighting,before:{step:f.context.step+1}},{...f.sighting,after:{step:f.context.step-1}},{...f.sighting,before:null},{...f.sighting,kind:'vigilance'}])expect(api.spacingProbePairRecord(raw,sighting,'rabbits')).toBeNull();
    expect(api.spacingProbePairRecord(raw,f.sighting,'foxes')).toBeNull();expect(evidence(working(raw),'experiment')).toBeNull();
  });
  it('guards uncollected, unchecked and reconfigured paired controls from silently disappearing on save',()=>{
    const original=working();
    for(const patch of [{control:null},{trial:null},{checked:false},{distance:1.4},{variable:'feeding',feeding:false},{contextKey:'wrong'},{prediction:''}]){
      const state={...clone(original),...patch},ready=api.fieldworkSaveReadiness(f.frames,f.encounter,'baseline',{probe:state});
      expect(api.spacingProbePairPending(f.frames,f.encounter,'baseline',state)).toBe(true);expect(ready.ok).toBe(false);expect(ready.probe).toBeNull();expect(ready.pending).toContainEqual(expect.objectContaining({id:'probe',target:'probe'}));
      expect(state.control).toEqual(patch.control===null?null:original.control);if(patch.trial!==null)expect(state.trial).toEqual(original.trial);
    }
    const ready=api.fieldworkSaveReadiness(f.frames,f.encounter,'baseline',{probe:original});expect(ready.ok).toBe(true);expect(ready.probe).toEqual(record());
  });
  it('leaves untouched and unsubmitted standalone v1 cue tests optional',()=>{
    for(const state of [undefined,{}, {open:true},{version:1,open:true,variable:'distance',distance:2.5,prediction:'unsure',trial:null}]){
      expect(api.spacingProbePairPending(f.frames,f.encounter,'baseline',state)).toBe(false);
      const ready=api.fieldworkSaveReadiness(f.frames,f.encounter,'baseline',{probe:state});expect(ready.ok).toBe(true);expect(ready.rows.some(row=>row.id==='probe')).toBe(false);
    }
  });
  it('preserves the first prediction and collected runs while checking a latest prediction on exactly the same inputs',()=>{
    const state=working(),before=JSON.stringify(state),revised={...clone(state),prediction:'continue',checked:false};
    expect(evidence(revised)).toBeNull();revised.checked=true;const saved=evidence(revised);
    expect(saved.firstPrediction).toBe('unsure');expect(saved.prediction).toBe('continue');expect(saved.control).toEqual(state.control);expect(saved.trial).toEqual(state.trial);expect(JSON.stringify(state)).toBe(before);
    saved.control.modifiedInput.rabbits[0].x=999;saved.trial.context.input.rabbits[0].x=999;expect(JSON.stringify(state)).toBe(before);
  });
  it('keeps standalone v1 save, reopen and export behavior and never fabricates an explicit control',()=>{
    const paired=record(),single={version:1,trial:paired.trial,firstPrediction:'continue',prediction:paired.trial.outcome,reflection:'Original single-trial evidence.'},saved=note(single,true),normalized=api.notebook([saved])[0];
    expect(normalized.sighting.probe).toEqual(single);expect(normalized.sighting.probe).not.toHaveProperty('control');
    const text=api.notebookText([saved]);expect(text).toContain('Frozen original rule inputs (JSON): ');expect(text).not.toContain('Frozen paired cue experiment (JSON): ');
    const resume=api.missionResume(saved,'interaction');expect(resume.ok).toBe(true);expect(resume.fieldwork.probe.version).toBe(1);expect(resume.fieldwork.probe).not.toHaveProperty('control');
  });
  it('round-trips both collected runs and first/latest answers without rewriting the ecological or wildlife predictions',()=>{
    const raw=record(),standalone=note(raw);expect(api.missionResume(standalone,'interaction').ok).toBe(false);expect(api.missionEvidence([standalone]).find(mission=>mission.id==='interaction').count).toBe(0);
    const saved=note(raw,true),frozen=JSON.stringify(saved),normalized=api.notebook([saved])[0];expect(normalized.sighting.probe).toEqual(raw);
    expect(saved.sighting.forecast).toBe('avoid');expect(saved.prediction).toBe('Original wildlife prediction.');
    const text=api.notebookText([saved]),prefix='Frozen paired cue experiment (JSON): ',line=text.split('\n').find(value=>value.startsWith(prefix));expect(JSON.parse(line.slice(prefix.length))).toEqual(raw);expect(text).toContain('deliberately collected unchanged-input control');
    const resume=api.missionResume(saved,'interaction');expect(resume.ok).toBe(true);expect(resume.fieldwork.probe).toMatchObject({...raw,checked:true,variable:'distance',distance:2.5});expect(evidence(resume.fieldwork.probe)).toEqual(raw);
    resume.fieldwork.probe.control.context.input.rabbits[0].z=999;expect(JSON.stringify(saved)).toBe(frozen);
  });
  it('retains coherent historical pairs in notes but refuses to reopen them as matching current decisions',()=>{
    const context=clone(f.context);context.input.rabbits.forEach(p=>{p.x+=.125;p.z+=.125;});
    const historical=record('distance',2.5,context),saved=note(historical,true),normalized=api.notebook([saved])[0],frozen=JSON.stringify(normalized);
    expect(normalized.sighting.probe).toEqual(historical);expect(evidence(working(historical))).toBeNull();expect(api.missionResume(normalized,'interaction').ok).toBe(false);expect(JSON.stringify(normalized)).toBe(frozen);
  });
  it('does not alter a frame, population, ordinary cue test, or source identity while collecting and checking the paired decisions',()=>{
    const before=JSON.stringify({frames:f.frames,pair:f.pair,context:f.context}),a=record(),b=record();expect(a).toEqual(b);
    expect(api.spacingProbeTrialSnapshot(a.control)).toEqual(a.control);expect(api.spacingProbeTrialSnapshot(a.trial)).toEqual(a.trial);expect(evidence(working(a))).toEqual(a);
    expect(JSON.stringify({frames:f.frames,pair:f.pair,context:f.context})).toBe(before);expect(api.compare(f.config)).toEqual(f.pair);
  });
  it('opens the existing collapsed cue disclosure and focuses a usable prediction control for keyboard return',()=>{
    const host=document.createElement('div');host.innerHTML='<details data-efw-cue-probe><summary>Cue bench</summary><select disabled aria-label="Cue test variable"><option>Distance</option></select><select aria-label="Cue test prediction"><option>Unsure</option></select></details>';document.body.appendChild(host);
    expect(api.fieldworkFocus(host,'probe')).toBe(true);expect(host.querySelector('details').open).toBe(true);expect(document.activeElement).toBe(host.querySelector('[aria-label="Cue test prediction"]'));host.remove();
  });
});
