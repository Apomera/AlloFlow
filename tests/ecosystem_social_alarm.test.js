import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const origin={x:0,z:0,active:true};
const socialConfig={enabled:{voles:false,owls:false},initial:{rabbits:90,foxes:6},cover:10,event:'none'};
const animal=(extra={})=>({active:true,x:0,z:0,...extra});
const source=(extra={})=>animal({x:1,state:'Alert',directAlarm:true,socialCue:null,threat:'foxes',threatIndex:0,...extra});
function fixture(extra={}){
  return {previous:{rabbits:[animal(),source(extra)],foxes:[animal({x:2})],owls:[]},counts:{rabbits:2,foxes:1,owls:0}};
}
const cue=(f,index=0,at=origin,id='rabbits')=>api.socialAlarm(id,index,at,f.previous,f.counts);

describe('nearby rabbit vigilance cue',()=>{
  it('returns detached source identity only for a local directly alarmed rabbit with a live predator',()=>{
    const f=fixture(),saved=JSON.stringify(f),a=cue(f),b=cue(f);
    expect(a).toEqual({id:'rabbits',index:1,distance:1,threatId:'foxes',threatIndex:0});
    expect(a).not.toBe(b);a.index=99;a.threatId='changed';
    expect(cue(f)).toEqual(b);expect(JSON.stringify(f)).toBe(saved);
    f.previous.rabbits[1]=source({state:'Retreating',threat:'owls'});f.previous.owls=[animal({x:3})];f.counts.owls=1;
    expect(cue(f)).toMatchObject({index:1,threatId:'owls',threatIndex:0});
  });

  it('uses bounded local distance, stable nearest ties and a distinct source',()=>{
    const f=fixture({x:1.6});expect(cue(f).distance).toBe(1.6);
    f.previous.rabbits[1].x=1.600001;expect(cue(f)).toBeNull();
    f.previous.rabbits[1]=source({x:1});f.previous.rabbits.push(source({x:-1}),source({x:0.5}));f.counts.rabbits=4;
    expect(cue(f).index).toBe(3);f.previous.rabbits.pop();f.counts.rabbits=3;expect(cue(f).index).toBe(1);
    f.previous.rabbits[1].x=0;expect(cue(f)).toMatchObject({index:1,distance:0});
    f.previous.rabbits=[source()];f.counts.rabbits=1;expect(cue(f)).toBeNull();
  });

  it('does not invent signals from calm, lingering, missing, disabled or malformed sources',()=>{
    const mutations=[
      f=>{f.previous.rabbits[1].active=false;},f=>{f.previous.rabbits[1].directAlarm=false;},
      f=>{delete f.previous.rabbits[1].directAlarm;},f=>{f.previous.rabbits[1].directAlarm=1;},
      f=>{f.previous.rabbits[1].state='Grazing';},f=>{f.previous.rabbits[1].state='Not present';},
      f=>{f.previous.rabbits[1].x=NaN;},f=>{f.previous.rabbits[1].z=Infinity;},f=>{f.previous.rabbits[1].x='1';},
      f=>{f.previous.rabbits[1]=null;},f=>{f.previous.rabbits=[];},f=>{delete f.previous.rabbits;},
      f=>{f.counts.rabbits=0;},f=>{f.counts.rabbits=1;},f=>{f.counts.rabbits=NaN;},f=>{f.counts.rabbits=1.5;}
    ];
    for(const mutate of mutations){const f=fixture();mutate(f);expect(cue(f)).toBeNull();}
    const f=fixture();for(const id of ['voles','foxes','owls','bluetits','caterpillars','plants','unknown'])expect(cue(f,0,origin,id)).toBeNull();
    for(const at of [null,{},animal({x:NaN}),animal({z:Infinity}),animal({active:false})])expect(cue(f,0,at)).toBeNull();
    for(const index of [-1,2,0.5,NaN])expect(cue(f,index)).toBeNull();
    for(const previous of [null,undefined,{},'bad'])expect(api.socialAlarm('rabbits',0,origin,previous,f.counts)).toBeNull();
    for(const counts of [null,undefined,{},'bad'])expect(api.socialAlarm('rabbits',0,origin,f.previous,counts)).toBeNull();
  });

  it('requires the recorded predator to be finite, active and currently represented',()=>{
    const mutations=[
      f=>{f.previous.rabbits[1].threat='voles';},f=>{f.previous.rabbits[1].threat='unknown';},
      f=>{f.previous.rabbits[1].threatIndex=-1;},f=>{f.previous.rabbits[1].threatIndex=0.5;},
      f=>{f.previous.rabbits[1].threatIndex=1;},f=>{delete f.previous.rabbits[1].threatIndex;},
      f=>{f.previous.foxes[0].active=false;},f=>{f.previous.foxes[0].x=NaN;},f=>{f.previous.foxes[0].z=Infinity;},
      f=>{f.previous.foxes[0]=null;},f=>{delete f.previous.foxes;},f=>{f.previous.foxes={};},
      f=>{f.counts.foxes=0;},f=>{delete f.counts.foxes;},f=>{f.counts.foxes=Infinity;},f=>{f.counts.foxes=0.5;}
    ];
    for(const mutate of mutations){const f=fixture();mutate(f);expect(cue(f)).toBeNull();}
  });

  it('prevents recursive propagation even if a socially cued source also carries direct alarm',()=>{
    for(const socialCue of [{id:'rabbits',index:2},false,0,'cue'])expect(cue(fixture({socialCue}))).toBeNull();
    const f=fixture({directAlarm:false,alarm:1,socialMemory:true});expect(cue(f)).toBeNull();
    f.previous.rabbits[1]=source();delete f.previous.rabbits[1].socialCue;expect(cue(f)).not.toBeNull();
  });
});

describe('recorded social vigilance in the meadow timeline',()=>{
  it('records local prior-sample sources with live predators and preserves exact replay and biomass',()=>{
    const config=socialConfig,pair=api.compare(config),saved=JSON.stringify(pair),frames=api.behaviorTimeline(config,pair.baseline);
    let seen=0,fading=0;
    for(let step=1;step<frames.length;step++)for(let index=0;index<16;index++){
      const p=frames[step].rabbits[index],social=p.socialCue;
      if(p.active&&p.state==='Alert'&&p.socialMemory&&!social&&p.threatDistance>=3.1){
        fading++;expect(api.explainBehavior('rabbits',p).cue).toBeNull();expect(api.explainBehavior('rabbits',p).text).toContain('fading');
        expect(p.social).toBeNull();expect(p.socialIndex).toBeNull();expect(p.attention?.kind).not.toBe('social');
      }
      if(!social)continue;
      seen++;expect(p.active).toBe(true);expect(p.directAlarm).toBe(false);expect(p.state).toBe('Alert');
      expect(social.id).toBe('rabbits');expect(social.index).not.toBe(index);expect(social.distance).toBeLessThanOrEqual(1.6);
      const before=frames[step-1],source=before.rabbits[social.index],recipient=before.rabbits[index],predator=before[social.threatId]?.[social.threatIndex];
      expect(source.active).toBe(true);expect(frames[step].rabbits[social.index].active).toBe(true);expect(source.directAlarm).toBe(true);expect(source.socialCue).toBeNull();
      expect(['Alert','Retreating']).toContain(source.state);expect(['foxes','owls']).toContain(social.threatId);
      expect(social.threatId).toBe(source.threat);expect(social.threatIndex).toBe(source.threatIndex);
      expect(predator.active).toBe(true);expect(frames[step][social.threatId][social.threatIndex].active).toBe(true);
      expect(social.distance).toBeCloseTo(Math.hypot(source.x-recipient.x,source.z-recipient.z),12);
      expect([source.x,source.z,predator.x,predator.z].every(Number.isFinite)).toBe(true);
      expect(p.alarm).toBeGreaterThanOrEqual(0.62);
      expect(p.social).toBe(social.id);expect(p.socialIndex).toBe(social.index);expect(p.socialDistance).toBe(social.distance);
      if(social.distance>1e-6){
        expect(p.attention).toMatchObject({kind:'social',id:'rabbits',index:social.index,x:source.x,z:source.z});
        expect(Math.abs(p.headTurn-recipient.headTurn)).toBeLessThanOrEqual(.09+1e-12);
      }
    }
    expect(seen).toBeGreaterThan(0);expect(fading).toBeGreaterThan(0);expect(frames).toEqual(api.behaviorTimeline(config,pair.baseline));expect(JSON.stringify(pair)).toBe(saved);
  });

  it('clears current cues when rabbits or all predators are absent and after predator removal',()=>{
    for(const enabled of [{rabbits:false},{foxes:false,owls:false}]){
      const config={event:'none',enabled},frames=api.behaviorTimeline(config,api.compare(config).baseline);
      expect(frames.every(frame=>frame.rabbits.every(p=>!p.socialCue))).toBe(true);
    }
    const config={event:'remove',target:'foxes',enabled:{owls:false}},frames=api.behaviorTimeline(config,api.compare(config).experiment);
    expect(frames.slice(80).every(frame=>frame.rabbits.every(p=>!p.socialCue&&!p.directAlarm))).toBe(true);
    // Removing sources from a prior sample invalidates their cue immediately.
    const f=fixture();delete f.previous.rabbits[1];expect(cue(f)).toBeNull();
    const g=fixture();delete g.previous.foxes[0];expect(cue(g)).toBeNull();
  });

  it('indexes a sustained real neighbor episode and shows the recorded rabbit pair',()=>{
    const frames=api.behaviorTimeline(socialConfig,api.compare(socialConfig).baseline),saved=JSON.stringify(frames);
    const encounters=api.encounters(frames,socialConfig),episode=encounters.find(e=>e.kind==='vigilance');
    expect(episode).toBeDefined();expect(episode.end-episode.start).toBeGreaterThanOrEqual(2);
    expect(episode.actor.id).toBe('rabbits');expect(episode.cue.id).toBe('rabbits');expect(episode.actor.index).not.toBe(episode.cue.index);
    expect(episode.expected).toBe('avoid');expect(episode.step).toBe(Math.floor((episode.start+episode.end)/2));
    for(let step=episode.start;step<=episode.end;step++){
      const p=frames[step].rabbits[episode.actor.index],social=p.socialCue,pair=api.interaction(frames[step],'rabbits',episode.actor.index);
      expect(p.state).toBe('Alert');expect(p.active).toBe(true);expect(p.directAlarm).toBe(false);
      expect(social).toMatchObject({id:'rabbits',index:episode.cue.index});expect(pair).toMatchObject({id:'rabbits',index:episode.cue.index});
      expect(pair.selected).toBe(p);expect(pair.other).toBe(frames[step].rabbits[episode.cue.index]);expect(pair.other.active).toBe(true);
      const source=frames[step-1].rabbits[social.index],predator=frames[step-1][social.threatId][social.threatIndex];
      expect(source.directAlarm).toBe(true);expect(source.socialCue).toBeNull();expect(predator.active).toBe(true);
      expect(api.explainBehavior('rabbits',p).cue).toMatchObject({id:'rabbits',index:episode.cue.index});
    }
    expect(api.encounters(frames,{...socialConfig,enabled:{...socialConfig.enabled,rabbits:false}}).some(e=>e.kind==='vigilance')).toBe(false);
    expect(JSON.stringify(frames)).toBe(saved);expect(api.encounters(frames,socialConfig)).toEqual(encounters);
  });

  it('preserves neighbor sightings in the notebook and rejects impossible category identities',()=>{
    const pair=api.compare(socialConfig),frames=api.behaviorTimeline(socialConfig,pair.baseline),episode=api.encounters(frames,socialConfig).find(e=>e.kind==='vigilance');
    expect(episode).toBeDefined();
    const current=frames[episode.step].rabbits[episode.actor.index];
    const sighting={version:1,kind:'vigilance',branch:'baseline',actorIndex:episode.actor.index,cueId:'rabbits',cueIndex:episode.cue.index,state:current.state,
      decisionDistance:current.socialCue.distance,before:{step:episode.before,state:frames[episode.before].rabbits[episode.actor.index].state},
      after:{step:episode.after,state:frames[episode.after].rabbits[episode.actor.index].state},forecast:'avoid',limitation:episode.limitation};
    const note=api.capture(socialConfig,pair,episode.step,'rabbits','I expect this rabbit to pause near its alert neighbor.','I compared the neighbor cue and direct predator cue.',1,null,sighting);
    expect(note.sighting).toEqual(sighting);expect(note.sighting).not.toBe(sighting);
    const restored=api.notebook(JSON.parse(JSON.stringify([note])));expect(restored).toEqual([note]);expect(restored[0].sighting).not.toBe(note.sighting);
    const text=api.notebookText([note]);expect(text).toContain(`Rabbits representative ${sighting.actorIndex+1}`);expect(text).toContain(`Cue animal: Rabbits representative ${sighting.cueIndex+1}`);expect(text).toContain(sighting.limitation);
    for(const invalid of [{cueIndex:sighting.actorIndex},{cueId:'voles'},{state:'Retreating'},{kind:'escape'}]){
      const raw={...note,sighting:{...sighting,...invalid}},clean=api.notebook([raw]);
      expect(clean).toHaveLength(1);expect(clean[0]).not.toHaveProperty('sighting');expect(clean[0].baseline).toEqual(note.baseline);expect(clean[0].prediction).toBe(note.prediction);
    }
    restored[0].sighting.before.state='changed';expect(note.sighting.before.state).toBe(sighting.before.state);
  });
});
