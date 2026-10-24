import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
let api,f;
const clone=value=>JSON.parse(JSON.stringify(value));
const trialKey=trial=>JSON.stringify(api.inferenceSnapshot(trial));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounter=api.encounters(frames,config).find(item=>item.kind==='spacing'),trial=api.inferenceTrial(frames,encounter,'baseline');
  expect(trial).toBeTruthy();
  const codes=api.inferenceClaims(trial).map(card=>card.category),baseState={open:true,trial,visited:[trial.before,trial.step,trial.after],codes,firstCodes:codes.map(code=>code==='scene'?'unsupported':'scene'),checked:true,reflection:'The scene and model information have different evidence sources.'};
  const link={version:1,trialId:trial.id,trialKey:trialKey(trial),claimId:'checkpoints',pins:[trial.before,trial.after],firstPins:[trial.step],reflection:'The statement names both endpoints, so the middle sample alone is insufficient.',open:true,checked:true};
  const state={...baseState,link},inference=api.inferenceEvidence(frames,encounter,'baseline',state);
  expect(inference.link).toBeTruthy();
  const sight={version:1,kind:encounter.kind,branch:'baseline',actorIndex:encounter.actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:trial.samples[1].actor.state,decisionDistance:trial.decision.distance,before:{step:trial.before,state:trial.samples[0].actor.state},after:{step:trial.after,state:trial.samples[2].actor.state},forecast:'avoid',limitation:'The endpoints do not establish all intervening actions.',inference};
  const note=api.capture(config,pair,encounter.step,encounter.actor.id,'Original action prediction.','Original field explanation.',1,null,sight);
  f={config,pair,frames,encounter,trial,codes,baseState,link,state,inference,sight,note};
},60_000);

describe('linking a bounded scene claim to its original checkpoints',()=>{
  it('distinguishes insufficient, sufficient-extra and smallest supporting evidence without treating extra context as a false claim',()=>{
    const t=f.trial;
    for(const pins of [[t.before],[t.step],[t.after],[t.before,t.step],[t.step,t.after]])expect(api.evidenceLinkCheck(t,pins).status).toBe('insufficient');
    const extra=api.evidenceLinkCheck(t,[t.before,t.step,t.after],[t.step]);expect(extra.status).toBe('extra');expect(extra.firstStatus).toBe('insufficient');expect(extra.extra).toEqual([t.step]);expect(extra.missing).toEqual([]);
    const minimal=api.evidenceLinkCheck(t,[t.after,t.before],[t.step]);expect(minimal.status).toBe('minimal');expect(minimal.required).toEqual([t.before,t.after]);expect(minimal.pins).toEqual([t.before,t.after]);expect(minimal.claim.id).toBe('checkpoints');expect(minimal.claim.text).toContain('first');expect(minimal.claim.text).toContain('last');
  });

  it('normalizes detached chronological step arrays and derives all feedback instead of trusting supplied status fields',()=>{
    const raw={...clone(f.link),pins:[f.trial.after,f.trial.before],firstPins:[f.trial.after,f.trial.step],status:'minimal',firstStatus:'minimal'},before=JSON.stringify(raw),record=api.evidenceLinkRecord(raw,f.trial);
    expect(record).toEqual({version:1,trialId:f.trial.id,trialKey:trialKey(f.trial),claimId:'checkpoints',pins:[f.trial.before,f.trial.after],firstPins:[f.trial.step,f.trial.after],reflection:f.link.reflection});
    expect(api.evidenceLinkCheck(f.trial,record.pins,record.firstPins).firstStatus).toBe('insufficient');expect(record).not.toHaveProperty('status');
    record.pins[0]=999;record.firstPins[0]=999;expect(JSON.stringify(raw)).toBe(before);
    const check=api.evidenceLinkCheck(f.trial,raw.pins,raw.firstPins);check.required[0]=999;check.claim.text='Changed';expect(api.evidenceLinkCheck(f.trial,raw.pins,raw.firstPins).required).toEqual([f.trial.before,f.trial.after]);
  });

  it('rejects empty, duplicate, sparse, fractional, coerced and non-original checkpoint assignments',()=>{
    const t=f.trial,sparse=Array(1),bad=[[],[t.before,t.before],[t.before,t.step,t.after,t.after],[t.before+.5],[String(t.before)],[NaN],[Infinity],[null],[undefined],[{}],sparse,[-1],[241]];
    for(const pins of bad){expect(api.evidenceLinkCheck(t,pins)).toBeNull();expect(api.evidenceLinkCheck(t,[t.before],pins)).toBeNull();expect(api.evidenceLinkRecord({...f.link,pins},t)).toBeNull();expect(api.evidenceLinkRecord({...f.link,firstPins:pins},t)).toBeNull();}
    for(const patch of [{version:2},{trialId:'another-trial'},{claimId:'action'},{firstPins:null},{firstPins:undefined}])expect(api.evidenceLinkRecord({...f.link,...patch},t)).toBeNull();
    const corrupt=clone(t);corrupt.samples[0].gap+=.125;expect(api.evidenceLinkCheck(corrupt,[t.before])).toBeNull();expect(api.evidenceLinkRecord(f.link,corrupt)).toBeNull();
  });

  it('omits untouched and never-submitted optional links while retaining the checked source classifications',()=>{
    for(const link of [undefined,{}, {open:true,pins:[],firstPins:null,checked:false},{version:1,trialId:f.trial.id,claimId:'checkpoints',open:true,pins:[f.trial.step],firstPins:null,checked:false}]){
      expect(api.evidenceLinkPending(link,f.trial)).toBe(false);const evidence=api.inferenceEvidence(f.frames,f.encounter,'baseline',{...f.baseState,link});expect(evidence).toBeTruthy();expect(evidence.link).toBeUndefined();expect(evidence.firstCodes).toEqual(f.baseState.firstCodes);
    }
  });

  it('blocks unchecked submitted revisions and mismatched trial assignments without mutating first pins or silently rebinding them',()=>{
    const before=JSON.stringify(f.state);
    for(const patch of [{checked:false},{trialId:'different-original',checked:true},{trialKey:'different-full-original',checked:true},{claimId:'action',checked:true},{pins:[],checked:true},{firstPins:['1'],checked:true}]){
      const state={...clone(f.state),link:{...clone(f.link),...patch}};expect(api.evidenceLinkPending(state.link,f.trial)).toBe(true);expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',state)).toBeNull();
    }
    const extra={...clone(f.state),link:{...clone(f.link),pins:[f.trial.before,f.trial.step,f.trial.after],checked:true}},saved=api.inferenceEvidence(f.frames,f.encounter,'baseline',extra);
    expect(saved.link.firstPins).toEqual([f.trial.step]);expect(api.evidenceLinkCheck(f.trial,saved.link.pins,saved.link.firstPins).status).toBe('extra');expect(JSON.stringify(f.state)).toBe(before);
  });


  it('binds every submitted link to the exact normalized branch, positions, state labels and cue decision even when the coarse trial ID is unchanged',()=>{
    const originals=[
      ['branch',t=>{t.branch='experiment';}],
      ['position',t=>{const p=t.samples[0];p.cue.x+=.125;p.gap=Math.hypot(p.actor.x-p.cue.x,p.actor.z-p.cue.z);}],
      ['state',t=>{t.samples[0].actor.state=t.samples[0].actor.state==='Grazing'?'Alert':'Grazing';}],
      ['decision',t=>{t.decision.distance=(t.decision.distance??0)+.125;}]
    ];
    const before=JSON.stringify({trial:f.trial,link:f.link});
    for(const [label,alter] of originals){
      const different=clone(f.trial);alter(different);const normalized=api.inferenceSnapshot(different);
      expect(normalized,label).toBeTruthy();expect(normalized.id,label).toBe(f.trial.id);expect(trialKey(normalized),label).not.toBe(f.link.trialKey);
      expect(api.evidenceLinkRecord(f.link,normalized),label).toBeNull();expect(api.evidenceLinkPending(f.link,normalized),label).toBe(true);
      const originalHistoricalLink={...clone(f.link),trialKey:trialKey(normalized)},accepted=api.evidenceLinkRecord(originalHistoricalLink,normalized);
      expect(accepted,label).toBeTruthy();expect(accepted.trialKey,label).toBe(trialKey(normalized));expect(accepted.firstPins,label).toEqual([f.trial.step]);
    }
    expect(JSON.stringify({trial:f.trial,link:f.link})).toBe(before);
  });

  it('requires an exact string provenance key and does not coerce or mutate immutable assignments',()=>{
    for(const key of [undefined,null,true,1,NaN,Infinity,{},[],f.trial.id,JSON.stringify(f.trial).replace('"branch":"baseline"','"branch":"experiment"'),' '+f.link.trialKey]){
      const raw={...clone(f.link),trialKey:key};expect(api.evidenceLinkRecord(raw,f.trial)).toBeNull();expect(api.evidenceLinkPending(raw,f.trial)).toBe(true);
    }
    const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;},immutableTrial=freeze(clone(f.trial)),immutableLink=freeze(clone(f.link)),before=JSON.stringify({trial:immutableTrial,link:immutableLink});
    const record=api.evidenceLinkRecord(immutableLink,immutableTrial);expect(record).toBeTruthy();record.pins.reverse();record.firstPins.push(f.trial.after);expect(JSON.stringify({trial:immutableTrial,link:immutableLink})).toBe(before);
  });

  it('visibly blocks copied submitted pins from a same-ID different branch while preserving the frozen original key',()=>{
    const trial={...clone(f.trial),branch:'experiment'},link=clone(f.link),state={...clone(f.baseState),trial,link},fieldwork={key:JSON.stringify(f.config)+'|experiment',id:f.encounter.id,forecast:'avoid',revealed:true,reflection:'Own prose.',limit:'Own limit.',saved:false,inference:state},before=JSON.stringify(state);
    const seed={ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original prediction.'},showMeadow:true,cursor:f.encounter.step,focus:f.encounter.actor.id,fieldwork}}};
    const host=document.createElement('div');host.innerHTML=renderTool('ecosystem',seed);const section=host.querySelector('[data-efw-evidence-link]');
    expect(section.textContent).toContain('This submitted link belongs to a different original trial.');expect(section.querySelector('[data-efw-link-feedback]')).toBeNull();
    expect([...section.querySelectorAll('input[type="checkbox"]')].every(input=>input.disabled)).toBe(true);expect([...section.querySelectorAll('button')].find(button=>button.textContent==='Check revised checkpoint pins').disabled).toBe(true);
    expect([...host.querySelectorAll('button')].find(button=>button.textContent==='Save wildlife observation').disabled).toBe(true);expect(JSON.stringify(state)).toBe(before);expect(state.link.trialKey).toBe(f.link.trialKey);
  });

  it('preserves the exact optional link in frozen notebook export and bounds its separate reflection',()=>{
    const notes=api.notebook([f.note]);expect(notes).toEqual([f.note]);expect(notes[0].sighting.inference.link).toEqual(api.evidenceLinkRecord(f.link,f.trial));
    const text=api.notebookText(notes);expect(text).toContain('Checkpoint evidence link:');expect(text).toContain('First checkpoint pins: Encounter');expect(text).toContain('Latest checkpoint pins: Before');expect(text).toContain('smallest supporting set');expect(text).toContain('every intervening moment');expect(text).toContain(f.link.reflection);
    const prefix='Frozen evidence / inference trial (JSON): ',frozen=text.split('\n').find(line=>line.startsWith(prefix));expect(JSON.parse(frozen.slice(prefix.length)).link).toEqual(notes[0].sighting.inference.link);
    notes[0].sighting.inference.link.pins[0]=999;notes[0].sighting.inference.link.reflection='Changed';expect(api.notebook([f.note])[0]).toEqual(f.note);
    expect(api.evidenceLinkRecord({...f.link,reflection:'x'.repeat(1600)},f.trial).reflection).toHaveLength(1200);
  });

  it('drops only malformed optional link metadata while keeping valid original source classifications and notes',()=>{
    const raw=clone(f.sight);raw.inference.link.trialId='not-this-trial';const note=api.capture(f.config,f.pair,f.encounter.step,f.encounter.actor.id,'Original action prediction.','Original field explanation.',2,null,raw);
    expect(note.sighting.inference).toBeTruthy();expect(note.sighting.inference.link).toBeUndefined();expect(note.sighting.inference.firstCodes).toEqual(f.baseState.firstCodes);expect(api.notebook([note])).toHaveLength(1);
  });

  it('restores detached first/latest pins through the existing strict measured-mission continuation, without awarding credit for pinning alone',()=>{
    expect(api.missionEvidence([f.note]).map(item=>item.count)).toEqual([0,0,0]);
    const measured=api.pairEvidence(f.frames,f.encounter,[f.trial.before,f.trial.step,f.trial.after]),raw={...clone(f.sight),measurement:{version:1,samples:measured.samples,intervals:measured.intervals,claim:measured.trend,firstClaim:'steady',reflection:'Independent measured evidence.'}},note=api.capture(f.config,f.pair,f.encounter.step,f.encounter.actor.id,'Original forecast.','Original explanation.',3,null,raw),before=JSON.stringify(note),resume=api.missionResume(note,'interaction');
    expect(resume.ok).toBe(true);expect(resume.fieldwork.inference.link).toEqual({...f.note.sighting.inference.link,open:true,checked:true});
    resume.fieldwork.inference.link.pins[0]=999;resume.fieldwork.inference.link.firstPins[0]=999;resume.fieldwork.inference.link.reflection='Revised working prose.';expect(JSON.stringify(note)).toBe(before);
    expect(api.missionEvidence([note])[1].count).toBe(1);
  });

  it('retains a coherent historical trial and its original link while refusing current-model continuation',()=>{
    const historical=clone(f.note),point=historical.sighting.inference.trial.samples[0];point.cue.x+=.125;point.gap=Math.hypot(point.actor.x-point.cue.x,point.actor.z-point.cue.z);
    historical.sighting.inference.link.trialKey=trialKey(historical.sighting.inference.trial);
    const restored=api.notebook([historical])[0];expect(restored.sighting.inference.link).toEqual({...f.note.sighting.inference.link,trialKey:trialKey(historical.sighting.inference.trial)});expect(api.inferenceMatches(restored.sighting.inference,f.frames,f.encounter)).toBe(false);
    expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',{...f.state,trial:restored.sighting.inference.trial})).toBeNull();expect(restored.sighting.inference.trial.samples[0].cue.x).toBe(point.cue.x);
  });

  it('renders the optional accessible checkbox task and an explicit parent-save revision guard without invoking WebGL',()=>{
    const trial={...clone(f.trial),branch:'experiment'},pending={...clone(f.link),trialKey:trialKey(trial),checked:false},state={...clone(f.baseState),trial,link:pending},fieldwork={key:JSON.stringify(f.config)+'|experiment',id:f.encounter.id,forecast:'avoid',revealed:true,reflection:'Own prose.',limit:'Own limit.',saved:false,inference:state};
    const seed={ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original prediction.'},showMeadow:true,cursor:f.encounter.step,focus:f.encounter.actor.id,fieldwork}}};
    const html=renderTool('ecosystem',seed),host=document.createElement('div');host.innerHTML=html;
    const section=host.querySelector('[data-efw-evidence-link]');expect(section).toBeTruthy();expect(section.querySelector('summary').textContent).toBe('Pin evidence to this statement');
    for(const name of ['Before','Encounter','After'])expect(section.querySelector('input[aria-label="Pin '+name+' checkpoint"]')?.getAttribute('type')).toBe('checkbox');
    const save=[...host.querySelectorAll('button')].find(button=>button.textContent==='Save wildlife observation');expect(save.disabled).toBe(true);expect(host.textContent).toContain('Check the revised checkpoint pins before saving this observation.');
    expect(html).toContain('data-efw-link-pending');expect(html).not.toContain('<canvas');
  });
});
