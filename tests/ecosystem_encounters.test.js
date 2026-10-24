import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};
const neighborsConfig={enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'};
const pose=(state,extra={})=>({active:true,state,x:0,z:0,altitude:0.025,...extra});
const foxFrame=(cueIndex=0)=>({foxes:[pose('Stalking',{prey:'voles',preyIndex:cueIndex})],voles:[pose('Foraging',{x:1}),pose('Foraging',{x:2})]});

beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});

describe('recorded wildlife encounter catalog',()=>{
  it('finds actual contiguous episodes with the same present actor and recorded cue',()=>{
    // A community does not guarantee every close encounter. Cover the mixed
    // web, insect investigation and supported Rabbit neighbors preset separately.
    for(const cfg of [config,api.investigation('insects').config,neighborsConfig]){
    const pair=api.compare(cfg),pairBefore=JSON.stringify(pair),frames=api.behaviorTimeline(cfg,pair.baseline),before=JSON.stringify(frames);
    const encounters=api.encounters(frames,cfg);
    expect(encounters.map(e=>e.kind)).toEqual(expect.arrayContaining(cfg===config?['fox','listening','escape','owl']:cfg===neighborsConfig?['spacing']:['insects']));
    expect(new Set(encounters.map(e=>e.kind)).size).toBe(encounters.length);
    const allowed={fox:['Listening','Stalking','Tracking prey'],listening:['Listening'],escape:['Retreating','Alert'],owl:['Quartering over prey'],insects:['Pecking'],vigilance:['Alert'],spacing:['Giving space']};
    for(const encounter of encounters){
      const {actor,cue,start,end,step}=encounter;
      expect(end-start).toBeGreaterThanOrEqual(2);expect(step).toBe(Math.floor((start+end)/2));
      expect(encounter.before).toBe(Math.max(0,start-1));expect(encounter.after).toBe(Math.min(frames.length-1,end+1));
      expect(encounter.id).toContain(`${actor.id}:${actor.index}:${start}:${end}:${cue.id}:${cue.index}`);
      for(let sample=start;sample<=end;sample++){
        const selected=frames[sample][actor.id][actor.index],interaction=api.interaction(frames[sample],actor.id,actor.index);
        expect(selected.active).toBe(true);expect(allowed[encounter.kind]).toContain(selected.state);
        expect(interaction.id).toBe(cue.id);expect(interaction.index).toBe(cue.index);expect(interaction.other.active).toBe(true);
        if(encounter.kind==='listening'){expect(selected.listenCue).toMatchObject({id:cue.id,index:cue.index});expect(selected.listenCue.onsetMovement).toBeGreaterThanOrEqual(.12);}
        if(encounter.kind==='spacing'||encounter.kind==='vigilance'){
          expect(actor.id).toBe('rabbits');expect(cue.id).toBe('rabbits');expect(cue.index).not.toBe(actor.index);
          expect(selected[encounter.kind==='spacing'?'spacingCue':'socialCue']).toMatchObject({id:cue.id,index:cue.index});
          expect(api.links.some(link=>link.food===actor.id&&link.consumer===cue.id)).toBe(false);
          if(encounter.kind==='spacing'){expect(cue.index).toBeLessThan(actor.index);expect(interaction.other.state).toBe('Grazing');expect(interaction.other.foodAvailable).toBe(true);}
        }else expect(api.links.some(link=>encounter.kind==='escape'?link.food===actor.id&&link.consumer===cue.id:link.food===cue.id&&link.consumer===actor.id)).toBe(true);
        expect([selected.x,selected.z,selected.altitude,interaction.other.x,interaction.other.z,interaction.other.altitude].every(Number.isFinite)).toBe(true);
      }
      expect(encounter.limitation).toContain('does not show a capture');
    }
    expect(JSON.stringify(pair)).toBe(pairBefore);expect(JSON.stringify(frames)).toBe(before);
    }
  });

  it('returns deterministic detached metadata and uses configuration only to filter enabled groups',()=>{
    const frames=api.behaviorTimeline(config,api.compare(config).baseline),a=api.encounters(frames,config),b=api.encounters(frames,config);
    expect(a).toEqual(b);expect(a).not.toBe(b);expect(a[0].actor).not.toBe(b[0].actor);expect(a[0].cue).not.toBe(b[0].cue);
    expect(api.encounters(frames,{...config,event:'remove',target:'voles',eventStep:150,initial:{foxes:0},cover:80})).toEqual(a);
    a[0].actor.id='changed';a[0].cue.index=99;a[0].start=-1;
    expect(api.encounters(frames,config)).toEqual(b);expect(frames[b[0].step][b[0].actor.id][b[0].actor.index].active).toBe(true);
  });

  it('excludes disabled actors and cues, including optional insect groups',()=>{
    const frames=api.behaviorTimeline(config,api.compare(config).baseline);
    for(const id of ['foxes','owls','rabbits','voles','caterpillars','bluetits']){
      const disabled={...config,enabled:{...config.enabled,[id]:false}},encounters=api.encounters(frames,disabled);
      expect(encounters.every(e=>e.actor.id!==id&&e.cue.id!==id)).toBe(true);
    }
    expect(api.encounters(frames,{}).some(e=>e.kind==='insects')).toBe(false);
  });

  it('splits on identity changes and gaps instead of joining unrelated encounters',()=>{
    const frames=[foxFrame(0),foxFrame(0),foxFrame(0),foxFrame(1),foxFrame(1),foxFrame(1),foxFrame(1)];
    const encounter=api.encounters(frames,{})[0];
    expect(encounter).toMatchObject({kind:'fox',start:3,end:6,before:2,after:6,cue:{id:'voles',index:1}});
    const gap=[foxFrame(),foxFrame(),null,foxFrame(),foxFrame(),foxFrame()];
    expect(api.encounters(gap,{})[0]).toMatchObject({start:3,end:5,before:2,after:5});
    gap[4].voles[0].active=false;
    expect(api.encounters(gap,{})).toEqual([]);
    expect(api.encounters([foxFrame(),foxFrame()],{})).toEqual([]);
  });

  it('prefers a stalking episode and resolves equal candidates in stable traversal order',()=>{
    const listening=()=>{const frame=foxFrame();frame.foxes[0].state='Listening';return frame;};
    const frames=[...Array.from({length:6},listening),null,foxFrame(),foxFrame(),foxFrame(),null,foxFrame(),foxFrame(),foxFrame()];
    expect(api.encounters(frames,{})[0]).toMatchObject({start:7,end:9,expected:'approach'});
  });

  it('skips corrupt rows, absent representatives, invalid cues and unrelated diet links safely',()=>{
    for(const corrupt of [null,undefined,{},[],{foxes:{}},'invalid'])expect(api.encounters([corrupt,corrupt,corrupt],{})).toEqual([]);
    expect(api.encounters(null,{})).toEqual([]);expect(api.encounters({},{})).toEqual([]);
    const changes=[
      frame=>{frame.foxes[0].active=false;},
      frame=>{frame.voles[0].active=false;},
      frame=>{frame.foxes[0].x=NaN;},
      frame=>{frame.voles[0].altitude=Infinity;},
      frame=>{delete frame.voles;},
      frame=>{frame.foxes[0].prey='unknown';},
      frame=>{frame.foxes[0].preyIndex=16;},
      frame=>{frame.foxes[0].preyIndex=-1;},
      frame=>{frame.foxes[0].prey='plants';frame.plants=[pose('Growing')];},
      frame=>{frame.foxes[0].state='Pouncing';}
    ];
    for(const change of changes){const frames=Array.from({length:3},()=>{const frame=foxFrame();change(frame);return frame;});expect(api.encounters(frames,config)).toEqual([]);}
    const reduced=api.behaviorTimeline({...config,event:'remove',target:'foxes'},api.compare({...config,event:'remove',target:'foxes'}).experiment);
    for(const encounter of api.encounters(reduced,config))for(let step=encounter.start;step<=encounter.end;step++){
      if(step>=80){expect(encounter.actor.id).not.toBe('foxes');expect(encounter.cue.id).not.toBe('foxes');}
    }
  });
});

function capturedSighting(kind='fox',branch=kind==='insects'?'baseline':'experiment',id=1){
  const cfg=api.normalize(kind==='insects'?api.investigation('insects').config:kind==='spacing'?neighborsConfig:config),pair=api.compare(cfg),frames=api.behaviorTimeline(cfg,pair[branch]);
  const encounter=api.encounters(frames,cfg).find(item=>item.kind===kind),actor=encounter.actor;
  const current=frames[encounter.step][actor.id][actor.index],distanceKey=kind==='escape'?'threatDistance':'preyDistance';
  const sighting={version:1,kind,branch,actorIndex:actor.index,cueId:encounter.cue.id,cueIndex:encounter.cue.index,state:current.state,
    decisionDistance:kind==='spacing'?current.spacingCue.decisionDistance:current[distanceKey],before:{step:encounter.before,state:frames[encounter.before][actor.id][actor.index].state},
    after:{step:encounter.after,state:frames[encounter.after][actor.id][actor.index].state},forecast:encounter.expected,
    limitation:'Compare this illustrative scene with outdoor observations before making a wildlife claim.'};
  const note=api.capture(cfg,pair,encounter.step,actor.id,'My prediction before seeing this encounter.','I compared the three sampled actions.',id,null,sighting);
  return {cfg,pair,frames,encounter,sighting,note};
}

describe('wildlife observations in the field notebook',()=>{
  it('captures each encounter kind and retains independent original metadata and paired evidence',()=>{
    for(const [index,kind] of ['fox','escape','owl','insects','spacing'].entries()){
      const {cfg,pair,encounter,sighting,note}=capturedSighting(kind,index%2?'baseline':'experiment',index+1),saved=JSON.stringify(note);
      expect(note.config).toEqual(cfg);expect(note.baseline).toEqual(pair.baseline[encounter.step]);expect(note.experiment).toEqual(pair.experiment[encounter.step]);
      expect(note.sighting).toEqual(sighting);expect(note.sighting).not.toBe(sighting);
      expect(note.sighting.before).not.toBe(sighting.before);expect(note.sighting.after).not.toBe(sighting.after);
      sighting.before.state='changed';sighting.after.step=240;sighting.cueIndex=15;
      cfg.enabled[encounter.actor.id]=false;pair.baseline[encounter.step].values[encounter.actor.id]=999;
      expect(JSON.stringify(note)).toBe(saved);
      const restored=api.notebook(JSON.parse(JSON.stringify([note])));
      expect(restored).toEqual([note]);expect(restored[0].sighting).not.toBe(note.sighting);
      restored[0].sighting.before.state='changed again';restored[0].sighting.limitation='edited';restored[0].baseline.values[encounter.actor.id]=0;
      expect(JSON.stringify(note)).toBe(saved);
    }
  });

  it('preserves exact saved values, valid forecast choices, boundary checkpoints and normalized optional text',()=>{
    const {note}=capturedSighting();note.experiment.values.foxes=1.23456789e-10;
    for(const forecast of ['approach','avoid','feed','rest','unsure'])for(const distance of [null,0,0.0000000001234]){
      const raw={...note,sighting:{...note.sighting,forecast,decisionDistance:distance,before:{step:0,state:'First sample'},after:{step:240,state:'Last sample'},limitation:'x'.repeat(1200),extra:'ignore'}};
      const restored=api.notebook([raw])[0];
      expect(restored.experiment.values.foxes).toBe(1.23456789e-10);expect(restored.sighting.forecast).toBe(forecast);expect(restored.sighting.decisionDistance).toBe(distance);
      expect(restored.sighting.before).toEqual({step:0,state:'First sample'});expect(restored.sighting.after).toEqual({step:240,state:'Last sample'});
      expect(restored.sighting.limitation).toHaveLength(1000);expect(restored.sighting).not.toHaveProperty('extra');
    }
  });

  it('discards invalid sighting metadata while preserving the valid notebook evidence',()=>{
    const {note,cfg,pair,encounter}=capturedSighting(),invalid=[
      null,{}, {...note.sighting,version:2}, {...note.sighting,kind:'capture'}, {...note.sighting,branch:'live'},
      {...note.sighting,actorIndex:-1}, {...note.sighting,actorIndex:16}, {...note.sighting,actorIndex:1.5},
      {...note.sighting,cueIndex:-1}, {...note.sighting,cueIndex:16}, {...note.sighting,cueIndex:NaN},
      {...note.sighting,cueId:'unknown'}, {...note.sighting,cueId:'plants'}, {...note.sighting,cueId:'bluetits'},
      {...note.sighting,forecast:'capture'}, {...note.sighting,state:''}, {...note.sighting,state:42}, {...note.sighting,state:'x'.repeat(81)},
      {...note.sighting,decisionDistance:-1}, {...note.sighting,decisionDistance:NaN}, {...note.sighting,decisionDistance:Infinity}, {...note.sighting,decisionDistance:undefined},
      {...note.sighting,before:null}, {...note.sighting,before:{step:-1,state:'Listening'}}, {...note.sighting,before:{step:note.step+1,state:'Listening'}},
      {...note.sighting,before:{step:0.5,state:'Listening'}}, {...note.sighting,before:{step:0,state:''}},
      {...note.sighting,after:{step:241,state:'Tracking prey'}}, {...note.sighting,after:{step:note.step-1,state:'Tracking prey'}},
      {...note.sighting,after:{step:240,state:'x'.repeat(81)}}
    ];
    for(const sighting of invalid){
      const raw={...note,sighting},restored=api.notebook([raw]);
      expect(restored).toHaveLength(1);expect(restored[0]).not.toHaveProperty('sighting');
      expect(restored[0].baseline).toEqual(note.baseline);expect(restored[0].experiment).toEqual(note.experiment);
      expect(restored[0].prediction).toBe(note.prediction);expect(restored[0].explanation).toBe(note.explanation);
      expect(api.capture(cfg,pair,note.step,encounter.actor.id,note.prediction,note.explanation,1,null,sighting)).not.toHaveProperty('sighting');
    }
  });

  it('validates category actors, recorded diet links and both enabled groups without dropping evidence',()=>{
    const {note}=capturedSighting();
    const changes=[
      raw=>{raw.focus='rabbits';},raw=>{raw.focus='unknown';},raw=>{raw.sighting.kind='owl';},
      raw=>{raw.sighting.cueId='rabbits';raw.sighting.kind='insects';raw.focus='bluetits';},
      raw=>{raw.sighting.kind='escape';raw.focus='rabbits';raw.sighting.cueId='voles';},
      raw=>{raw.config.enabled.foxes=false;},raw=>{raw.config.enabled[raw.sighting.cueId]=false;}
    ];
    for(const change of changes){const raw=JSON.parse(JSON.stringify(note));change(raw);const restored=api.notebook([raw]);expect(restored).toHaveLength(1);expect(restored[0]).not.toHaveProperty('sighting');expect(restored[0].baseline).toEqual(note.baseline);expect(restored[0].experiment).toEqual(note.experiment);}
    const insect=capturedSighting('insects').note;
    for(const id of ['caterpillars','bluetits']){const raw=JSON.parse(JSON.stringify(insect));raw.config.enabled[id]=false;expect(api.notebook([raw])[0]).not.toHaveProperty('sighting');}
  });

  it('exports branch, representative identities, actions, decision distance, context and original evidence',()=>{
    const {note,encounter}=capturedSighting('fox','baseline');note.experiment.values.foxes=1.234e-10;
    const text=api.notebookText([note]),s=note.sighting;
    expect(text).toContain(`Wildlife observation: baseline branch; ${encounter.actor.name} representative ${s.actorIndex+1}; recorded action: ${s.state}`);
    expect(text).toContain(`Cue animal: ${encounter.cue.name} representative ${s.cueIndex+1}`);
    expect(text).toContain(`Before time ${(s.before.step/10).toFixed(1)}: ${s.before.state}; after time ${(s.after.step/10).toFixed(1)}: ${s.after.state}`);
    expect(text).toContain(`Decision distance: ${s.decisionDistance.toPrecision(8)} illustrative scene units`);
    expect(text).toContain(s.limitation);expect(text).toContain(note.prediction);expect(text).toContain(note.explanation);expect(text).toContain('1.2340000e-10');
    note.sighting.decisionDistance=null;expect(api.notebookText([note])).toContain('Decision distance: not recorded');
    const legacy={...note};delete legacy.sighting;expect(api.notebook([legacy])).toEqual([legacy]);expect(api.notebookText([legacy])).not.toContain('Wildlife observation:');
  });
});
