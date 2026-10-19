import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
function timeline(config={event:'none'}){const pair=api.compare(config);return api.behaviorTimeline(config,pair.baseline);}
function pose(extra={}){return {active:true,x:1,z:2,altitude:0.025,distance:0,phase:0,stride:0,moving:0,yaw:0,forage:0,rest:0,crouch:0,pounce:0,state:'Searching',...extra};}

describe('hands-on mammal movement studies',()=>{
  it.each(['rabbits','foxes'])('indexes the original %s animal without altering a recorded sample',id=>{
    const frames=timeline(),original=JSON.stringify(frames),study=api.motionStudy(frames,id,0);
    expect(study).not.toBeNull();expect(study.sequence).toBe(true);expect(study.species).toBe(id);expect(study.layout).toEqual([1,2,0]);
    expect(study.samples).toHaveLength(3);expect(study.samples[0].step).toBeLessThan(study.samples[1].step);expect(study.samples[1].step).toBeLessThan(study.samples[2].step);
    for(const sample of study.samples){
      const p=frames[sample.step][id][0],art=api.mammalArticulation(id,p,false);
      expect(p.active).toBe(true);expect(sample.value).toBe(study.kind==='pounce'?p.altitude:study.kind==='bound'?art.flightLift:id==='rabbits'?art.hindLift:art.foreLift);
      expect(sample.supportFeet).toBe(art.supportFeet);expect(sample.foreContact).toBe(art.foreContact);expect(sample.hindContact).toBe(art.hindContact);
    }
    if(study.kind==='hind-paw'||study.kind==='fore-paw'){
      const key=id==='rabbits'?'hindContact':'foreContact';
      expect(study.samples.map(s=>s[key])).toEqual([true,false,true]);
    }
    if(study.kind==='bound'){expect(study.samples[0].supportFeet).toBeGreaterThan(0);expect(study.samples[1].supportFeet).toBe(0);expect(study.samples[2].supportFeet).toBeGreaterThan(0);expect(study.samples[1].value).toBeGreaterThan(0);}
    expect(api.motionStudy(frames,id,0)).toEqual(study);expect(JSON.stringify(frames)).toBe(original);
    study.samples[0].value=100;study.layout[0]=0;expect(api.motionStudy(frames,id,0).samples[0].value).not.toBe(100);expect(api.motionStudy(frames,id,0).layout).toEqual([1,2,0]);
  });

  it('follows the exact prepare, airborne and recovery samples of a complete fox attempt',()=>{
    const frames=[pose({huntStage:'prepare',state:'Preparing to pounce'}),pose({huntStage:'airborne',state:'Pouncing',pounce:0.4,altitude:0.153}),pose({huntStage:'airborne',state:'Pouncing',pounce:1,altitude:0.345}),pose({huntStage:'airborne',state:'Pouncing',pounce:0.2,altitude:0.089}),pose({huntStage:'recover',state:'Recovering'})].map(p=>({foxes:[p]}));
    const study=api.motionStudy(frames,'foxes',0);
    expect(study.kind).toBe('pounce');expect(study.samples.map(s=>s.step)).toEqual([0,2,4]);expect(study.samples[1].supportFeet).toBe(0);expect(study.samples.map(s=>s.state)).toEqual(['Preparing to pounce','Pouncing','Recovering']);
    expect(api.motionStudy(frames.slice(0,4),'foxes',0)).toBeNull();expect(api.motionStudy(frames.slice(1),'foxes',0)).toBeNull();
  });

  it('prefers a whole rabbit bound only when the real rig records shared flight, and retains the slow paw alternative',()=>{
    const frames=speed=>Array.from({length:100},(_,i)=>({rabbits:[pose({distance:i*0.02,stride:1,moving:speed,state:speed>0.5?'Retreating':'Grazing'})]}));
    const bound=api.motionStudy(frames(0.8),'rabbits',0);
    expect(bound.kind).toBe('bound');expect(bound.samples[0].supportFeet).toBeGreaterThan(0);expect(bound.samples[1].supportFeet).toBe(0);expect(bound.samples[2].supportFeet).toBeGreaterThan(0);
    expect(bound.samples[1].value).toBeGreaterThan(0.003);expect(bound.samples.map(s=>s.step)).toEqual([...bound.samples.map(s=>s.step)].sort((a,b)=>a-b));
    const slow=api.motionStudy(frames(0.1),'rabbits',0);
    expect(slow.kind).toBe('hind-paw');expect(slow.samples.map(s=>s.hindContact)).toEqual([true,false,true]);expect(slow.samples[1].supportFeet).toBeGreaterThan(0);
  });

  it('does not bridge absent or corrupt samples to construct a pounce',()=>{
    const prep={foxes:[pose({huntStage:'prepare'})]},air={foxes:[pose({huntStage:'airborne',pounce:1,altitude:0.345})]},recover={foxes:[pose({huntStage:'recover'})]};
    for(const gap of [null,{foxes:[]},{foxes:[pose({active:false})]},{foxes:[pose({distance:NaN})]}])expect(api.motionStudy([prep,gap,air,recover],'foxes',0)).toBeNull();
    for(const bad of [null,{},[],[null,null,null]])expect(api.motionStudy(bad,'rabbits',0)).toBeNull();
    for(const bad of [-1,16,0.5,null])expect(api.motionStudy([prep,air,recover],'foxes',bad)).toBeNull();
    const absent=timeline({enabled:{rabbits:false,foxes:false},event:'none'});
    for(const id of ['rabbits','foxes'])expect(api.motionStudy(absent,id,0)).toBeNull();
  });

  it('checks every snapshot once, reports positional evidence and leaves the arrangement intact',()=>{
    const study=api.motionStudy(timeline(),'rabbits',0);
    for(const order of [null,[],['','',''],['0','1','x'],['0','1']])expect(api.motionSequence(study,order)).toMatchObject({valid:false,correct:false});
    expect(api.motionSequence(study,['0','0','2'])).toMatchObject({valid:false,correct:false,reason:expect.stringContaining('Use each snapshot once')});
    const order=['1','2','0'],copy=order.slice(),wrong=api.motionSequence(study,order);
    expect(wrong).toMatchObject({valid:true,correct:false,positions:[false,false,false]});expect(wrong.orderedSteps).toEqual(order.map(k=>study.samples[Number(k)].step));expect(order).toEqual(copy);
    expect(api.motionSequence(study,['0','1','2'])).toMatchObject({valid:true,correct:true,positions:[true,true,true]});
    expect(api.motionSequence({...study,samples:[study.samples[1],study.samples[0],study.samples[2]]},[0,1,2]).valid).toBe(false);
    expect(api.motionSequence({...study,sequence:false},[0,1,2]).valid).toBe(false);
  });

  it('saves the first committed sequence with original numeric/contact evidence and branch context',()=>{
    const study=api.motionStudy(timeline(),'rabbits',0),state={checked:true,order:['0','1','2'],firstOrder:['1','0','2'],reflection:'The hind paw rises while the front paws support the body.'};
    const original=JSON.stringify({study,state}),note=api.movementEvidence(study,'baseline',state);
    expect(note.step).toBe(study.samples[1].step);expect(note.focus).toBe('rabbits');expect(note.prediction).toContain('Snapshot A → Snapshot C → Snapshot B');
    expect(note.explanation).toContain('baseline branch; representative 1');expect(note.explanation).toContain(study.samples[1].value.toFixed(3));expect(note.explanation).toContain(state.reflection);
    expect(note.movement).toMatchObject({version:1,branch:'baseline',index:0,studyId:study.id,kind:study.kind,order:[1,0,2]});
    expect(note.movement.samples.map(s=>s.step)).toEqual(study.samples.map(s=>s.step));expect(JSON.stringify({study,state})).toBe(original);
    note.movement.samples[0].value=99;expect(study.samples[0].value).not.toBe(99);
    expect(api.movementEvidence(study,'other',state)).toBeNull();expect(api.movementEvidence(study,'baseline',{...state,checked:false})).toBeNull();expect(api.movementEvidence(study,'baseline',{...state,order:[0,0,1]})).toBeNull();
  });
});
