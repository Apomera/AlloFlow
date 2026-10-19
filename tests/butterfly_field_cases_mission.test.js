import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab,React,ReactDOMServer} from './helpers/stem_widgets_smoke_harness.js';

// Transfer practice (field cases), the restoration-plot mission, the season
// note fix, and the meadow's new scenery. Every answer here is DERIVED from the
// tool's own season model; none is copied into this file.
const require=createRequire(import.meta.url);
const THREE=require('../vendor/three-r128/three.min.js');
let BF,world;
beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};
  loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  BF=window.__RR_TEST_EXPORTS__.butterfly;
  world=BF.buildWorld(THREE,window.StemMeadow);
});
afterAll(()=>{
  if(!world)return;const resources=new Set();
  world.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{resources.add(m);if(m.map)resources.add(m.map);});});
  resources.forEach(r=>r.dispose());
});
function render(toolData){
  const ctx={React,toolData:toolData||{},isDark:false,isContrast:false,setToolData(){},updateMulti(){}};
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
}
function habitatFor(c){return c.planting==='milkweed'?BF.plants.find(p=>p.id==='milkweed'):BF.designs.find(d=>d.id===c.planting);}

describe('Field cases are practice read off the season model',()=>{
  it('answers every case from seasonOutcome, never from a stored key',()=>{
    expect(BF.cases.length).toBe(6);
    for(const c of BF.cases){
      const o=BF.seasonOutcome(habitatFor(c),c.mowing),a=BF.caseAnswer(c);
      expect(a.stop).toBe(o.completes?'complete':o.blocked);
      expect(a.reason).toBe(o.completes?'none':o.cutShort?'cut':'missing');
      expect(Object.keys(c).sort()).toEqual(['id','mowing','planting','scene','title']);
    }
  });
  it('spreads the answers so no single choice is always right',()=>{
    const stops=new Set(BF.cases.map(c=>BF.caseAnswer(c).stop)),reasons=BF.cases.map(c=>BF.caseAnswer(c).reason);
    expect(stops.size).toBeGreaterThanOrEqual(3);
    for(const r of ['missing','cut','none'])expect(reasons.filter(x=>x===r).length).toBeGreaterThanOrEqual(2);
  });
  it('separates "never there" from "cut too soon" for the same caterpillar stage',()=>{
    const lawn=BF.cases.find(c=>c.id==='lawn'),roadside=BF.cases.find(c=>c.id==='roadside');
    expect(lawn.mowing).toBe(roadside.mowing);
    expect(BF.caseAnswer(lawn)).toMatchObject({stop:'caterpillar',reason:'missing'});
    expect(BF.caseAnswer(roadside)).toMatchObject({stop:'caterpillar',reason:'cut'});
  });
  it('checks, grades both parts, and refuses incomplete or unknown answers',()=>{
    const s=BF.freshState(),c=BF.cases[0],key=BF.caseAnswer(c);
    expect(BF.checkCase(s,'nowhere',key.stop,key.reason).ok).toBe(false);
    expect(BF.checkCase(s,c.id,'',key.reason).ok).toBe(false);
    expect(BF.checkCase(s,c.id,key.stop,'because').ok).toBe(false);
    expect(s.cases.answers).toEqual({});
    const wrongReason=BF.caseReasons.find(r=>r.id!==key.reason).id;
    const partial=BF.checkCase(s,c.id,key.stop,wrongReason);
    expect(partial).toMatchObject({ok:true,stopRight:true,reasonRight:false,matched:false});
    const right=BF.checkCase(s,c.id,key.stop,key.reason);
    expect(right).toMatchObject({ok:true,matched:true});
    expect(BF.casesSummary(s)).toEqual({checked:1,matched:1,total:6});
  });
  it('persists answers as a sibling in save version 6 and drops tampered rows',()=>{
    const s=BF.freshState();for(const c of BF.cases.slice(0,3)){const a=BF.caseAnswer(c);BF.checkCase(s,c.id,a.stop,a.reason);}
    const saved=BF.save(s);expect(saved.version).toBe(6);expect(Object.keys(saved.cases.answers)).toHaveLength(3);
    expect(BF.freshState(saved).cases).toEqual(saved.cases);
    const hostile=JSON.parse('{"answers":{"__proto__":{"stop":"egg","reason":"cut"},"garden":{"stop":"wing","reason":"cut"},"roadside":{"stop":"egg","reason":"cut","x":1},"ghost":{"stop":"egg","reason":"cut"}}}');
    const clean=BF.cleanCases(hostile);
    expect(clean).toEqual({answers:{roadside:{stop:'egg',reason:'cut'}}});
    expect(Object.getPrototypeOf(clean.answers)).toBe(Object.prototype);
    for(const bad of [null,7,'x',[],{answers:[1]}])expect(BF.cleanCases(bad)).toEqual({answers:{}});
    expect(BF.freshState({version:5}).cases).toEqual({answers:{}});
  });
  it('never counts a practice case as evidence, and labels it practice in the report',()=>{
    const s=BF.freshState();expect(BF.reportIsEmpty(s)).toBe(true);
    const c=BF.cases[1],a=BF.caseAnswer(c);BF.checkCase(s,c.id,a.stop,a.reason);
    expect(BF.evidenceFor(s).lines).toEqual([]);expect(BF.reportIsEmpty(s)).toBe(false);
    const report=BF.fieldReport(s);
    expect(report).toContain('PRACTICE: FIELD CASES (1 of 6 checked, 1 matched the model)');
    expect(report).toContain('They are not evidence about this meadow.');
  });
  it('renders checked and open cases with the model timeline on checked ones only',()=>{
    const a=BF.caseAnswer(BF.cases[0]);
    const html=render({butterfly:{cases:{answers:{[BF.cases[0].id]:{stop:a.stop,reason:a.reason}}}}});
    expect(html).toContain('Where would the generation stop?');
    expect(html).toContain('1 of 6 checked · 1 matched');
    expect(html).toContain('data-case="'+BF.cases[0].id+'" data-checked="true"');
    expect((html.match(/data-checked="false"/g)||[]).length).toBe(5);
    expect((html.match(/Check with the model/g)||[]).length).toBe(5);
    expect(html).toContain('data-bf-timeline="'+BF.cases[0].mowing+'" data-bf-reveal="true"');
  });
});

describe('A season note never contradicts its own result',()=>{
  it('attaches the mowing note only when timing decided the outcome',()=>{
    const patches=BF.plants.concat(BF.designs);
    for(const p of patches)for(const m of BF.mowings){
      const o=BF.seasonOutcome(p,m.id),note=BF.seasonNote(o,m);
      if(o.cutShort||o.completes)expect(note).toBe(' '+m.note);
      else expect(note,p.id+' '+m.id).toBe('');
    }
  });
  it('no longer tells a bergamot run that an adult emerged, or a lawn run that milkweed was cut',()=>{
    for(const [id,mow,wrong] of [['bergamot','late','adult has emerged'],['lawn','early','milkweed leaves a caterpillar would have fed on'],['bergamot','early','milkweed leaves a caterpillar would have fed on']]){
      const s=BF.freshState({observations:[id]}),result=BF.runSeason(s,id,mow,'stop');
      expect(result.ok).toBe(true);expect(result.result).toBe('stop');expect(result.message).not.toContain(wrong);
    }
    const s=BF.freshState({observations:['milkweed']}),cut=BF.runSeason(s,'milkweed','early','complete');
    expect(cut.message).toContain('milkweed leaves a caterpillar would have fed on');
  });
});

describe('The restoration mission reads only current records',()=>{
  function examinedPlot(design){const s=BF.freshState({observations:['milkweed','bergamot','lawn']});BF.applyPlan(s,design,'both');s.landed='restoration';BF.observe(s);s.landed=null;return s;}
  function follow(s){BF.layEggs(s,'restoration','complete');while(BF.advanceStage(s).ok);return BF.broodResult(s);}
  it('starts open with three unchecked steps',()=>{
    const m=BF.missionStatus(BF.freshState());
    expect(m.state).toBe('open');expect(m.checks.map(c=>c.done)).toEqual([false,false,false]);
  });
  it('supports a mixed planting only after a generation and a completing season',()=>{
    const s=examinedPlot('mixed');expect(BF.missionStatus(s).checks[0].done).toBe(true);
    expect(follow(s).ok).toBe(true);expect(BF.missionStatus(s).state).toBe('open');
    BF.runSeason(s,'restoration','mid','stop');expect(BF.missionStatus(s).state).toBe('timing');
    BF.runSeason(s,'restoration','never','complete');
    const m=BF.missionStatus(s);expect(m.state).toBe('supported');
    expect(m.summary).toContain('Plant milkweed + bergamot');expect(m.summary).toContain('leave it uncut this summer');
    expect(m.summary).not.toContain('cut in midsummer');expect(m.summary).toContain('does not promise how many monarchs survive');
  });
  it('tells a bergamot-only plan to rethink, and resets when the plot is replanted',()=>{
    const s=examinedPlot('flowers');follow(s);BF.runSeason(s,'restoration','never','stop');
    expect(BF.missionStatus(s).state).toBe('rethink');
    BF.applyPlan(s,'mixed','both');
    const m=BF.missionStatus(s);expect(m.state).toBe('open');expect(m.checks.map(c=>c.done)).toEqual([false,false,false]);
    expect(BF.fieldReport(s)).toContain('MY MISSION: THE RESTORATION PLOT');
  });
});

describe('New sourced content stays inside what the model and sources support',()=>{
  it('states no survival rate or population count',()=>{
    const all=BF.fieldFacts.map(f=>f.text).concat(Object.values(BF.stageUses)).join(' ');
    expect(all).not.toMatch(/\d+\s*%/);
    expect(all).not.toMatch(/\b\d+\s*(butterflies|monarchs|eggs)\b/i);
    const html=render();
    expect(html).toContain('Why only milkweed?');expect(html).toContain('Out in the real world');
    expect(html).not.toMatch(/\d+\s*(butterflies|monarchs|eggs)\s+(survive|survived)/i);
  });
  it('describes each stage the way the model treats it',()=>{
    expect(BF.stageUses.chrysalis).toMatch(/does not feed/);expect(BF.stageUses.egg).toMatch(/does not feed/);
    expect(BF.stageUses.caterpillar).toMatch(/milkweed/);expect(BF.stageUses.adult).toMatch(/nectar/);
    // The model's own needs agree: a nectar-only patch stops at the caterpillar.
    expect(BF.seasonOutcome(BF.plants.find(p=>p.id==='bergamot'),'never').blocked).toBe('caterpillar');
  });
  it('draws decorative stage icons, hidden from assistive technology',()=>{
    const html=render();
    for(const id of ['egg','caterpillar','chrysalis','adult','plot','notebook','cut'])expect(html).toContain('data-bf-icon="'+id+'"');
    const svgs=html.match(/<svg[^>]*>/g)||[];expect(svgs.length).toBeGreaterThan(10);
    for(const tag of svgs)expect(tag).toContain('aria-hidden="true"');
  });
});

describe('Read aloud',()=>{
  it('offers Listen only where speech exists, and asks the host to speak even when narration is muted',()=>{
    const withoutSpeech=document.createElement('div');withoutSpeech.innerHTML=render();
    expect(withoutSpeech.querySelector('button.bf-listen')).toBeNull();
    const spoken=[];
    const ctx={React,toolData:{},isDark:false,isContrast:false,setToolData(){},updateMulti(){},callTTS(text,voice,speed,opts){spoken.push({text,opts});return Promise.resolve(null);}};
    const html=ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.butterfly.render(ctx));
    // Latest message, mission, life cycle, and one per field case.
    expect((html.match(/class="bf-listen"/g)||[]).length).toBe(3+BF.cases.length);
    for(const what of ['latest message','your mission','the life cycle and facts',BF.cases[0].title])expect(html).toContain('Listen<span class="bf-sr"> · '+what+'</span>');
  });
});

describe('Meadow scenery',()=>{
  it('adds bumble bees that follow the sim clock, freeze for reduced motion, and leave the lawn plot',()=>{
    const bees=world.bees;expect(bees).toHaveLength(7);
    for(const bee of bees)expect(bee.root.name).toBe('meadow-bumblebee');
    world.animateBees(3,false,'mixed',false);const a=bees.map(b=>b.root.position.toArray());
    world.animateBees(3,false,'mixed',false);expect(bees.map(b=>b.root.position.toArray())).toEqual(a);
    world.animateBees(4.2,false,'mixed',false);expect(bees.map(b=>b.root.position.toArray())).not.toEqual(a);
    world.animateBees(1,true,'mixed',false);const still=bees.map(b=>b.root.position.toArray());
    world.animateBees(99,true,'mixed',false);expect(bees.map(b=>b.root.position.toArray())).toEqual(still);
    world.animateBees(2,false,'lawn',false);expect(bees.filter(b=>b.root.visible)).toHaveLength(5);
    world.animateBees(2,false,'flowers',true);expect(bees.filter(b=>b.root.visible)).toHaveLength(0);
    for(const b of bees)expect(b.root.position.toArray().every(Number.isFinite)).toBe(true);
  });
  it('names each patch with a trail sign beside it',()=>{
    for(const id of ['milkweed','bergamot','lawn','restoration']){
      const sign=world.scene.getObjectByName('trail-sign-'+id);expect(sign).toBeTruthy();
      const p=id==='restoration'?{x:-42,z:38}:BF.plants.find(x=>x.id===id);
      expect(Math.hypot(sign.position.x-p.x,sign.position.z-p.z)).toBeLessThan(21);
    }
  });
  it('paints the illustrated map along the same path the 3D meadow uses',()=>{
    const calls=[],g=new Proxy({},{get(target,key){if(key in target)return target[key];return (...args)=>{calls.push([key,args]);return {addColorStop(){},width:40};};},set(target,key,value){target[key]=value;return true;}});
    g.measureText=()=>({width:60});
    for(const design of ['lawn','flowers','mixed']){
      calls.length=0;const s=BF.freshState({restoration:{design}});
      BF.paintHabitatMap(g,900,520,s,false);
      const numbers=calls.flatMap(([,args])=>args.filter(v=>typeof v==='number'));
      expect(numbers.length).toBeGreaterThan(200);expect(numbers.every(Number.isFinite)).toBe(true);
    }
    const scale=520/240;
    calls.length=0;BF.paintHabitatMap(g,900,520,BF.freshState(),false);
    const pathPoint=calls.find(([k,args])=>k==='lineTo'&&Math.abs(args[1]-(260+(-114)*scale))<1e-6);
    expect(pathPoint[1][0]).toBeCloseTo(450+BF.meadowPathX(-114)*scale,6);
  });
});
