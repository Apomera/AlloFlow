import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={event:'none',cover:10,initial:{rabbits:90,foxes:6},enabled:{voles:false,owls:false}};
function fixture(){
  const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),encounter=api.encounters(frames,config).find(e=>e.kind==='listening');
  expect(encounter).toBeTruthy();
  const steps=[encounter.start,Math.floor((encounter.start+encounter.end)/2),encounter.end],evidence=api.pairEvidence(frames,encounter,steps);
  expect(evidence).not.toBeNull();
  const p=frames[encounter.step].foxes[encounter.actor.index];
  const sighting={version:1,kind:encounter.kind,branch:'baseline',actorIndex:encounter.actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:p.state,decisionDistance:p.preyDistance,before:{step:encounter.before,state:frames[encounter.before].foxes[encounter.actor.index].state},after:{step:encounter.after,state:frames[encounter.after].foxes[encounter.actor.index].state},forecast:'approach',runPrediction:'I predict a smaller herbivore biomass index.',measurement:{version:1,samples:evidence.samples,intervals:evidence.intervals,trend:'forged-trend',claim:evidence.trend,firstClaim:evidence.trend==='closer'?'farther':'closer',reflection:'The partner moved while the fox paused.'}};
  return {pair,frames,encounter,evidence,sighting};
}
it('saves detached current-position measurements, both claims and exact path evidence with the original experiment prediction',()=>{
  const {pair,encounter,evidence,sighting}=fixture(),note=api.capture(config,pair,encounter.step,'foxes','The fox will listen.','I watched its ears.',1,null,sighting);
  expect(note.sighting.measurement.trend).toBe(evidence.trend);expect(note.sighting.measurement.samples).toEqual(evidence.samples);expect(note.sighting.measurement.intervals).toEqual(evidence.intervals);
  expect(note.sighting.measurement.firstClaim).toBe(sighting.measurement.firstClaim);expect(note.sighting.measurement.claim).toBe(evidence.trend);expect(note.sighting.runPrediction).toBe(sighting.runPrediction);
  const before=JSON.stringify(note);sighting.measurement.samples[0].actor.x=999;sighting.measurement.intervals[0].actorTravel=999;
  expect(JSON.stringify(note)).toBe(before);expect(api.notebook([note])).toEqual([note]);
  const text=api.notebookText([note]);expect(text).toContain('Field ruler: horizontal scene separation; first claim');expect(text).toContain('Ruler A at time');expect(text).toContain('sampled selected path');expect(text).toContain('The partner moved while the fox paused.');expect(text).toContain('Ecological prediction before run: '+note.sighting.runPrediction);
});
it('rejects corrupted ruler identities, gap arithmetic and chronology without dropping valid wildlife evidence',()=>{
  const {pair,encounter,sighting}=fixture();
  const mutations=[m=>{m.claim='survival';},m=>{m.firstClaim='invented';},m=>{m.samples.pop();},m=>{m.samples[1].step=m.samples[0].step;},m=>{m.samples[0].gap+=.2;},m=>{m.samples[0].actor.id='owls';},m=>{m.samples[0].cue.index=15;},m=>{m.samples[0].actor.x=Infinity;},m=>{m.samples[0].actor.state='';},m=>{m.intervals[0].delta+=.2;},m=>{m.intervals[0].actorTravel=-1;},m=>{m.intervals[0].to=m.intervals[0].from;}];
  for(const mutate of mutations){
    const raw=structuredClone(sighting);mutate(raw.measurement);
    expect(api.pairRecord(raw.measurement,raw,'foxes')).toBeNull();
    const note=api.capture(config,pair,encounter.step,'foxes','','',1,null,raw);
    expect(note.sighting).toBeDefined();expect(note.sighting.measurement).toBeUndefined();expect(api.notebook([note])).toHaveLength(1);
  }
});
it('preserves measured evidence after working settings change and bounds optional prose',()=>{
  const {pair,encounter,sighting}=fixture();sighting.measurement.reflection='z'.repeat(2000);
  const note=api.capture(config,pair,encounter.step,'foxes','','',1,null,sighting),saved=JSON.stringify(note);
  api.behaviorTimeline({cover:80,event:'remove',target:'rabbits'},api.compare({cover:80,event:'remove',target:'rabbits'}).experiment);
  expect(JSON.stringify(note)).toBe(saved);expect(api.notebook([note])[0].sighting.measurement.reflection).toHaveLength(1200);
  const normalized=api.notebook([note]);normalized[0].sighting.measurement.samples[1].gap=999;
  expect(JSON.stringify(note)).toBe(saved);
});
