import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let api, f;
const clone=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounters=api.encounters(frames,config),encounter=encounters.find(item=>item.kind==='listening');
  expect(encounter).toBeTruthy();
  const trial=api.inferenceTrial(frames,encounter,'baseline');expect(trial).toBeTruthy();
  const codes=api.inferenceClaims(trial).map(card=>card.category),state={open:true,trial,visited:[trial.before,trial.step,trial.after],codes,firstCodes:codes.map(()=> 'unsupported'),checked:true,reflection:'The recorded action is visible; a cue is rule information, and sound is not simulated.'};
  const inference=api.inferenceEvidence(frames,encounter,'baseline',state);expect(inference).toBeTruthy();
  const sight={version:1,kind:encounter.kind,branch:'baseline',actorIndex:encounter.actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:trial.samples[1].actor.state,decisionDistance:trial.decision.distance,before:{step:trial.before,state:trial.samples[0].actor.state},after:{step:trial.after,state:trial.samples[2].actor.state},forecast:encounter.expected,limitation:'These samples do not establish capture or biomass.',inference};
  const note=api.capture(config,pair,encounter.step,encounter.actor.id,'Original wildlife action prediction','Own general encounter explanation.',1,null,sight);
  f={config,pair,frames,encounters,encounter,trial,codes,state,inference,sight,note};
},60_000);

describe('encounter evidence and inference challenge',()=>{
  it('freezes three actual original checkpoints and derives four encounter-specific statements without mutating the recording',()=>{
    const before=JSON.stringify({frames:f.frames,pair:f.pair}),a=api.inferenceTrial(f.frames,f.encounter,'baseline'),b=api.inferenceTrial(f.frames,f.encounter,'baseline');
    expect(a).toEqual(b);expect(a.samples.map(point=>point.step)).toEqual([f.encounter.before,f.encounter.step,f.encounter.after]);
    expect(a.actor).toEqual({id:f.encounter.actor.id,index:f.encounter.actor.index});expect(a.cue).toEqual({id:f.encounter.cue.id,index:f.encounter.cue.index});
    for(const point of a.samples){expect(point.actor.x).toBe(f.frames[point.step][a.actor.id][a.actor.index].x);expect(point.cue.z).toBe(f.frames[point.step][a.cue.id][a.cue.index].z);expect(point.gap).toBeCloseTo(Math.hypot(point.actor.x-point.cue.x,point.actor.z-point.cue.z),12);}
    const cards=api.inferenceClaims(a);expect(cards).toHaveLength(4);expect(cards.map(card=>card.category).sort()).toEqual(['rule','scene','scene','unsupported']);expect(cards.find(card=>card.id==='limit').text).toContain('sound wave');
    a.samples[0].actor.x=999;a.decision.distance=999;cards[0].text='Forged';expect(api.inferenceTrial(f.frames,f.encounter,'baseline')).toEqual(b);expect(JSON.stringify({frames:f.frames,pair:f.pair})).toBe(before);
  });

  it('uses present identities and recorded rule cues for every available encounter kind instead of proximity alone',()=>{
    for(const encounter of f.encounters){const trial=api.inferenceTrial(f.frames,encounter,'baseline');expect(trial).toBeTruthy();expect(trial.decision).toMatchObject({id:encounter.cue.id,index:encounter.cue.index});expect(api.inferenceClaims(trial).find(card=>card.id==='rule').text).toContain('animation used');}
    const changed=clone(f.encounter);changed.cue.index=15;expect(api.inferenceTrial(f.frames,changed,'baseline')).toBeNull();
    expect(api.inferenceTrial(null,f.encounter,'baseline')).toBeNull();expect(api.inferenceTrial(f.frames,null,'baseline')).toBeNull();expect(api.inferenceTrial(f.frames,f.encounter,'other')).toBeNull();
  });

  it('keeps first and revised source judgments separate and allows an imperfect first submission as genuine saved evidence',()=>{
    const checked=api.inferenceCheck(f.trial,f.codes,f.state.firstCodes);expect(checked.matches).toBe(4);expect(checked.firstMatches).toBe(1);
    expect(checked.cards.every((card,k)=>card.firstCode===f.state.firstCodes[k]&&card.code===f.codes[k])).toBe(true);
    const codes=f.codes.slice();codes[0]=codes[0]==='scene'?'rule':'scene';expect(api.inferenceCheck(f.trial,codes,f.state.firstCodes).matches).toBe(3);expect(api.inferenceCheck(f.trial,codes,f.state.firstCodes).firstMatches).toBe(1);
    expect(f.note.sighting.inference.firstCodes).toEqual(f.state.firstCodes);expect(f.note.sighting.inference.codes).toEqual(f.codes);expect(f.note.prediction).toBe('Original wildlife action prediction');
    for(const bad of [[],['scene'],['scene','scene','rule','invented']]){expect(api.inferenceCheck(f.trial,bad,f.codes)).toBeNull();expect(api.inferenceCheck(f.trial,f.codes,bad)).toBeNull();}
  });

  it('requires a complete checked sheet and all three original inspections before producing saveable evidence',()=>{
    const original=JSON.stringify(f.state);
    for(const patch of [{checked:false},{visited:[]},{visited:[f.trial.before,f.trial.step]},{visited:[f.trial.before,f.trial.step,f.trial.step]},{visited:[f.trial.before,f.trial.step,f.trial.after,239]},{codes:['','','','']},{firstCodes:null}])expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',{...clone(f.state),...patch})).toBeNull();
    expect(api.inferenceEvidence(f.frames,f.encounter,'experiment',f.state)).toBeNull();
    expect(api.inferenceEvidence(f.frames,f.encounter,'baseline',f.state)).toEqual(f.inference);expect(JSON.stringify(f.state)).toBe(original);
  });

  it('rejects malformed frozen samples, impossible identities and forged arithmetic or decision metadata',()=>{
    const mutations=[t=>{t.samples.pop();},t=>{t.samples[0].step=t.step;},t=>{t.samples[1].gap+=.01;},t=>{t.samples[2].actor.x=Infinity;},t=>{t.actor.id='plants';},t=>{t.actor.index=16;},t=>{t.cue={...t.actor};},t=>{t.samples[1].actor.active=false;},t=>{t.samples[1].actor.state='Walking';},t=>{t.samples[0].actor.state='';},t=>{t.samples[0].actor.state='Invented action';},t=>{t.samples[0].actor.active=true;t.samples[0].actor.state='Not present';},t=>{t.samples[2].cue.active=false;t.samples[2].cue.state='Grazing';},t=>{t.decision.id='owls';},t=>{t.decision.distance=-1;},t=>{t.branch='other';},t=>{t.before=t.step;},t=>{t.after=241;}];
    for(const mutate of mutations){const trial=clone(f.trial);mutate(trial);expect(api.inferenceSnapshot(trial)).toBeNull();}
  });

  it('rejects mismatched or incomplete note evidence without dropping a valid original wildlife observation',()=>{
    const mutations=[r=>{r.firstCodes=null;},r=>{r.codes[0]='invented';},r=>{r.visited.pop();},r=>{r.trial.branch='experiment';},r=>{r.trial.decision.distance=r.trial.decision.distance===null?.01:r.trial.decision.distance+.01;},r=>{r.trial.samples[0].actor.state='Forged action';}];
    for(const mutate of mutations){const raw=clone(f.sight);mutate(raw.inference);expect(api.inferenceRecord(raw.inference,raw,f.encounter.actor.id,f.encounter.step)).toBeNull();const note=api.capture(f.config,f.pair,f.encounter.step,f.encounter.actor.id,'Own prediction','Own explanation',1,null,raw);expect(note.sighting).toBeTruthy();expect(note.sighting.inference).toBeUndefined();expect(api.notebook([note])).toHaveLength(1);}
    expect(api.inferenceRecord(f.inference,{...f.sight,actorIndex:15},f.encounter.actor.id,f.encounter.step)).toBeNull();
    expect(api.inferenceRecord(f.inference,f.sight,'rabbits',f.encounter.step)).toBeNull();expect(api.inferenceRecord(f.inference,f.sight,f.encounter.actor.id,f.encounter.step+1)).toBeNull();
  });

  it('round-trips detached original classifications and quantitative checkpoints through notebook text and JSON',()=>{
    const restored=api.notebook([f.note]);expect(restored).toEqual([f.note]);
    const text=api.notebookText(restored);expect(text).toContain('Evidence or inference challenge: baseline branch');expect(text).toContain('First source:');expect(text).toContain('Latest source:');expect(text).toContain('sound waves');expect(text).toContain('Original wildlife action prediction');expect(text).toContain('Own general encounter explanation.');
    const frozen=text.split('\n').find(line=>line.startsWith('Frozen evidence / inference trial (JSON): '));expect(JSON.parse(frozen.slice('Frozen evidence / inference trial (JSON): '.length))).toEqual(f.inference);
    restored[0].sighting.inference.trial.samples[0].cue.z=999;restored[0].sighting.inference.codes[0]='rule';expect(api.notebook([f.note])[0]).toEqual(f.note);
    const raw=clone(f.inference);raw.reflection='x'.repeat(2000);expect(api.inferenceRecord(raw,f.sight,f.encounter.actor.id,f.encounter.step).reflection).toHaveLength(1600);
  });

  it('requires exact current quantitative evidence for working continuation while preserving a coherent historical original',()=>{
    expect(api.inferenceMatches(f.inference,f.frames,f.encounter)).toBe(true);
    const historical=clone(f.note),trial=historical.sighting.inference.trial;
    trial.samples[0].cue.x+=.125;trial.samples[0].gap=Math.hypot(trial.samples[0].actor.x-trial.samples[0].cue.x,trial.samples[0].actor.z-trial.samples[0].cue.z);
    expect(api.notebook([historical])[0].sighting.inference.trial.samples[0].cue.x).toBe(trial.samples[0].cue.x);expect(api.inferenceMatches(historical.sighting.inference,f.frames,f.encounter)).toBe(false);
    const raw=clone(f.sight),measured=api.pairEvidence(f.frames,f.encounter,[f.encounter.before,f.encounter.step,f.encounter.after]);raw.measurement={version:1,samples:measured.samples,intervals:measured.intervals,claim:measured.trend,firstClaim:'steady',reflection:'My exact pair measurements.'};
    const eligible=api.capture(f.config,f.pair,f.encounter.step,f.encounter.actor.id,'Own forecast','Own general explanation',2,null,raw),resume=api.missionResume(eligible,'interaction');expect(resume.ok).toBe(true);expect(resume.fieldwork.inference.codes).toEqual(f.codes);expect(resume.fieldwork.inference.firstCodes).toEqual(f.state.firstCodes);expect(resume.fieldwork.inference.trial).toEqual(f.trial);
    eligible.sighting.inference=historical.sighting.inference;const before=JSON.stringify(eligible);expect(api.missionResume(eligible,'interaction').ok).toBe(false);expect(JSON.stringify(eligible)).toBe(before);
  });

  it('does not turn classification checks or inference-only saved notes into measurement mission credit',()=>{
    expect(api.missionEvidence([f.note]).map(item=>item.count)).toEqual([0,0,0]);
    const route=api.missionRoute([],{hasRun:true,config:f.config,configKey:JSON.stringify(f.config),cursor:f.encounter.step,fieldwork:{key:JSON.stringify(f.config)+'|baseline',id:f.encounter.id,revealed:true,inference:f.state,saved:true}});expect(route.covered).toBe(0);expect(route.missions[1].action).toBe('continue');
    expect(api.compare(f.config)).toEqual(f.pair);
  });
});
