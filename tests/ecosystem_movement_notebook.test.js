import {beforeEach,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={event:'none',enabled:{caterpillars:true,bluetits:true}};
function fixture(){
  const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),study=api.mammalMotionStudy(frames,'foxes',0);
  expect(study).not.toBeNull();
  const evidence=api.movementEvidence(study,'baseline',{checked:true,order:[0,1,2],firstOrder:[2,0,1],reflection:'I compared paw contact and body height.'});
  return {pair,study,evidence};
}
it('saves original sequence, exact pose evidence and branch without retaining mutable references',()=>{
  const {pair,study,evidence}=fixture(),note=api.capture(config,pair,evidence.step,evidence.focus,evidence.prediction,evidence.explanation,1,null,null,evidence.movement);
  expect(note.movement.branch).toBe('baseline');expect(note.movement.index).toBe(study.index);expect(note.movement.order).toEqual([2,0,1]);
  expect(note.movement.samples.map(s=>s.step)).toEqual(study.samples.map(s=>s.step));
  const before=JSON.stringify(note),normalized=api.notebook([note]);
  evidence.movement.samples[1].value=999;evidence.movement.order[0]=0;
  expect(JSON.stringify(note)).toBe(before);expect(normalized).toEqual([note]);
  const exported=api.notebookText(normalized);
  expect(exported).toContain('Prediction before sequence check:');expect(exported).toContain('Movement observation: baseline branch;');
  expect(exported).toContain('Snapshot times:');expect(exported).toContain('I compared paw contact and body height.');
  expect(exported).toContain('Your original snapshot order:');
});
it('rejects corrupt movement metadata while preserving the valid paired notebook observation',()=>{
  const {pair,evidence}=fixture(),valid=evidence.movement;
  const bad=[{...valid,branch:'other'},{...valid,index:16},{...valid,kind:'invented'},{...valid,studyId:'forged'},
    {...valid,order:[0,0,2]},{...valid,samples:valid.samples.map((p,k)=>k===1?{...p,step:valid.samples[0].step}:p)},
    {...valid,samples:valid.samples.map((p,k)=>k===1?{...p,value:NaN}:p)},
    {...valid,samples:valid.samples.map((p,k)=>k===0?{...p,supportFeet:5}:p)},
    {...valid,samples:valid.samples.map((p,k)=>k===0?{...p,foreContact:'yes'}:p)},
    {...valid,samples:valid.samples.map((p,k)=>k===0?{...p,pawAngle:NaN}:p)}];
  for(const movement of bad){
    expect(api.movementRecord(movement,config,evidence.step,evidence.focus)).toBeNull();
    const note=api.capture(config,pair,evidence.step,evidence.focus,'','',1,null,null,valid);note.movement=movement;
    const normalized=api.notebook([note]);expect(normalized).toHaveLength(1);expect(normalized[0].movement).toBeUndefined();
  }
  expect(api.movementRecord(valid,config,evidence.step+1,evidence.focus)).toBeNull();
  expect(api.movementRecord(valid,{enabled:{foxes:false}},evidence.step,evidence.focus)).toBeNull();
  expect(api.movementRecord(valid,config,evidence.step,'bluetits')).toBeNull();
});
it('requires a real checked order and retains the first commitment after revisions',()=>{
  const {study}=fixture();
  expect(api.movementEvidence(study,'baseline',{checked:false,order:[0,1,2]})).toBeNull();
  expect(api.movementEvidence(study,'baseline',{checked:true,order:[0,0,2]})).toBeNull();
  expect(api.movementEvidence(study,'wrong',{checked:true,order:[0,1,2]})).toBeNull();
  const result=api.movementEvidence(study,'experiment',{checked:true,order:[0,1,2],firstOrder:[2,1,0]});
  expect(result.movement.order).toEqual([2,1,0]);expect(result.explanation).toContain('Recorded order:');
  expect(result.prediction).toContain('Snapshot');expect(result.explanation).toContain('not measurements from wildlife');
});
it('keeps the ecological prediction and guided investigation separate from the movement answer',()=>{
  const guide=api.investigation('cascade'),pair=api.compare(guide.config),frames=api.behaviorTimeline(guide.config,pair.baseline),study=api.mammalMotionStudy(frames,'foxes',0);
  expect(study).not.toBeNull();
  const evidence=api.movementEvidence(study,'baseline',{checked:true,order:[0,1,2]}),ecological='Removing foxes will let the herbivores increase.',context={id:'cascade',forecast:'higher',limitation:'Check other influences outdoors.'};
  const movement={...evidence.movement,runPrediction:ecological};
  const note=api.capture(guide.config,pair,evidence.step,'foxes',evidence.prediction,evidence.explanation,1,context,null,movement);
  expect(note.prediction).toBe(evidence.prediction);expect(note.prediction).not.toBe(ecological);
  expect(note.movement.runPrediction).toBe(ecological);expect(note.investigation).toEqual(context);
  expect(api.notebook([note])[0]).toEqual(note);
  const text=api.notebookText([note]);expect(text).toContain('Ecological prediction before run: '+ecological);expect(text).toContain('Prediction before sequence check: '+evidence.prediction);
  expect(api.movementRecord({...movement,runPrediction:'x'.repeat(1500)},guide.config,evidence.step,'foxes').runPrediction).toHaveLength(1200);
});
it('keeps a listening forecast distinct from its original ecological prediction',()=>{
  const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),episode=api.encounters(frames,config).find(e=>e.kind==='listening');
  expect(episode).toBeTruthy();
  const selected=frames[episode.step][episode.actor.id][episode.actor.index],ecological='I expect fewer herbivores after adding predators.';
  const sighting={version:1,kind:'listening',branch:'baseline',actorIndex:episode.actor.index,cueId:episode.cue.id,cueIndex:episode.cue.index,state:'Listening',decisionDistance:selected.preyDistance,before:{step:episode.before,state:frames[episode.before].foxes[episode.actor.index].state},after:{step:episode.after,state:frames[episode.after].foxes[episode.actor.index].state},forecast:'approach',runPrediction:ecological};
  const note=api.capture(config,pair,episode.step,'foxes','The fox will pause to listen.','I compared its ears and the moving rabbit.',1,null,sighting);
  expect(note.sighting.runPrediction).toBe(ecological);expect(note.prediction).toBe('The fox will pause to listen.');
  expect(api.notebook([note])[0]).toEqual(note);expect(api.notebookText([note])).toContain('Ecological prediction before run: '+ecological);
});
