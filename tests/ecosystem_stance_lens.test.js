import {beforeAll,describe,it,expect} from 'vitest';
import {React,ReactDOMClient,makeCtx,loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api,config,pair,frames;
const copy=x=>JSON.parse(JSON.stringify(x));
beforeAll(()=>{
  resetStemLab();loadTool(process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80,soil:{enabled:false}});
  pair=api.compare(config);frames=api.behaviorTimeline(config,pair.baseline);
},60_000);
function fixture(species='rabbits',branch='baseline'){
  const recorded=branch==='baseline'?frames:api.behaviorTimeline(config,pair.experiment),study=api.motionStudy(recorded,species,0),plan=api.stancePlan(recorded,study,branch),measurement=api.stanceMeasure(plan);
  expect(plan).toBeTruthy();expect(measurement).toBeTruthy();
  return {study,plan,measurement,state:{key:measurement.key,visited:[measurement.first,measurement.last],choice:'body',firstChoice:'paw',checked:true}};
}
function control(host,label,value){const node=host.querySelector('[aria-label="'+label+'"]');expect(node).toBeTruthy();Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node),'value').set.call(node,value);node.dispatchEvent(new Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));}
function click(host,text){const node=[...host.querySelectorAll('button')].find(n=>n.textContent===text);expect(node,text).toBeTruthy();expect(node.disabled,text).toBe(false);node.click();}
async function client(run,submitted=false){
  const f=fixture('rabbits','experiment'),host=document.createElement('div'),initial={ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...config,run:{config,prediction:'Original ecological forecast.'},focus:'rabbits',cursor:f.measurement.first,showMeadow:true,notebook:[],motionStudy:{key:JSON.stringify(config)+'|experiment',id:f.study.id,species:'rabbits',checked:true,order:['0','1','2'],firstOrder:[2,0,1],sequenceAttempted:true,reflection:'Original reflection.',saved:false,stance:submitted?{...f.state,open:true}:{key:f.measurement.key,open:true,visited:[],choice:'',firstChoice:null,checked:false}}}}};
  document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT;let latest;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  function Harness(){const [toolData,setToolData]=React.useState(initial);latest=toolData;return window.StemLab._registry.ecosystem.render(makeCtx({toolData,setToolData}));}
  try{await React.act(async()=>root.render(React.createElement(Harness)));await run(host,()=>latest.ecosystem.foodWeb,f);}finally{await React.act(async()=>root.unmount());host.remove();globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;}
}
describe('continuous recorded planted-paw investigation',()=>{
  it('finds genuine consecutive fox and rabbit intervals with a moving body and held world contact, without changing the recording',()=>{
    const frozen=JSON.stringify({pair,frames});
    for(const species of ['foxes','rabbits']){
      const {study,plan,measurement:m}=fixture(species);expect(plan.samples.length).toBeGreaterThanOrEqual(2);expect(plan.samples.length).toBeLessThanOrEqual(7);expect(m.bodyTravel).toBeGreaterThanOrEqual(.008);expect(m.pawTravel).toBeLessThanOrEqual(1e-7);
      for(const [k,p] of plan.samples.entries()){
        const pose=frames[p.step][species][study.index],foot=pose.footPlants[plan.paw];expect(p.body).toEqual({x:pose.x,z:pose.z,yaw:pose.yaw});expect([p.foot.x,p.foot.z,p.foot.planted,p.foot.held]).toEqual([foot.x,foot.z,foot.planted,foot.held]);if(k){expect(p.step).toBe(plan.samples[k-1].step+1);expect(p.foot.held).toBe(true);}
      }
      plan.samples[0].body.x=999;plan.samples[0].foot.z=999;
    }
    expect(JSON.stringify({pair,frames})).toBe(frozen);
  });
  it('requires a valid original movement window and branch rather than inventing an interval from incomplete contacts',()=>{
    const {study}=fixture();for(const branch of ['wrong',null])expect(api.stancePlan(frames,study,branch)).toBeNull();
    for(const mutate of [s=>s.sequence=false,s=>s.index=16,s=>s.species='owls',s=>s.samples[1].step=s.samples[0].step]){const altered=copy(study);mutate(altered);expect(api.stancePlan(frames,altered,'baseline')).toBeNull();}
    const partial=copy(frames);partial[study.samples[1].step].rabbits[0].footPlants[0].x=NaN;expect(api.stancePlan(partial,study,'baseline')).toBeNull();
  });
  it('rejects malformed, nonconsecutive, drifting, unsupported or unheld evidence and does not alias normalized coordinates',()=>{
    const {plan}=fixture();for(const mutate of [p=>p.version=2,p=>p.branch='wrong',p=>p.species='owls',p=>p.index=16,p=>p.studyId='foxes:0:wrong',p=>p.paw=4,p=>p.samples[1].step+=1,p=>p.samples[0].body.x=NaN,p=>p.samples[0].body.yaw=Infinity,p=>p.samples[1].foot.id='wrong',p=>p.samples[1].foot.held=false,p=>p.samples[0].foot.planted=false,p=>p.samples[1].foot.x+=.0001]){
      const changed=copy(plan);mutate(changed);expect(api.stanceMeasure(changed)).toBeNull();
    }
    expect(api.stanceMeasure({...plan,samples:plan.samples.slice(0,1)})).toBeNull();const before=JSON.stringify(plan),id=api.stanceIdentity(plan);id.samples[0].foot.x=999;expect(JSON.stringify(plan)).toBe(before);
  });
  it('adds every consecutive segment and distinguishes traveled path from endpoint displacement',()=>{
    const {plan}=fixture(),points=[[0,0],[.03,0],[.03,.04],[0,0]],loop={...plan,samples:points.map(([x,z],k)=>({step:10+k,state:'Searching',body:{x,z,yaw:0},foot:{id:plan.samples[0].foot.id,x:1,z:1,planted:true,held:k>0}}))},m=api.stanceMeasure(loop);
    expect(m.bodyTravel).toBeCloseTo(.12,12);expect(m.bodyDisplacement).toBe(0);expect(m.pawTravel).toBe(0);expect(m.pawDisplacement).toBe(0);expect(m.elapsed).toBeCloseTo(.3,12);
    const still=copy(loop);still.samples.forEach(p=>{p.body.x=0;p.body.z=0;});expect(api.stanceMeasure(still)).toBeNull();
  });
  it('requires both endpoints and a source-bound choice, preserving the first choice when revised',()=>{
    const {plan,state,measurement:m}=fixture();expect(api.stanceCheck(plan,state)).toMatchObject({correct:true,firstChoice:'paw',choice:'body'});
    for(const patch of [{visited:[m.first]},{visited:[m.last]},{choice:''},{choice:'flying'},{firstChoice:'flying'},{key:'stale'}])expect(api.stanceCheck(plan,{...state,...patch})).toBeNull();
    expect(api.stanceCheck(plan,{...state,choice:'unsure'}).correct).toBeNull();expect(api.stanceCheck(plan,{...state,choice:'both'}).correct).toBe(false);
    const changed=copy(plan);changed.samples[0].body.x+=.00001;expect(api.stanceCheck(changed,state)).toBeNull();expect(api.stanceText(plan,{...state,checked:false})).toBeNull();expect(api.stanceText(plan,{...state,firstChoice:null})).toBeNull();
  });
  it('appends explicit measured text without truncating writing, duplicating it, or accepting a stale result',()=>{
    const {plan,state}=fixture(),text=api.stanceText(plan,state),before='My original observation.',next=api.stanceAppend(before,plan,state);expect(next).toBe(before+'\n\n'+text);expect(text).toContain('First choice: the paw moved farther. Latest: the body moved farther.');expect(text).toContain('consecutive recorded samples');expect(text).toContain('not a measured wildlife gait');
    expect(api.stanceAppend(next,plan,state)).toBeNull();expect(api.stanceAppend('x'.repeat(1200),plan,state)).toBeNull();expect(api.stanceAppend(null,plan,state)).toBeNull();expect(api.stanceAppend(before,plan,{...state,key:'old'})).toBeNull();expect(api.stanceAppend(before,plan,{...state,checked:false})).toBeNull();
    const room=1200-text.length-2;expect(api.stanceAppend('x'.repeat(room),plan,state)).toHaveLength(1200);expect(api.stanceAppend('x'.repeat(room+1),plan,state)).toBeNull();
  });
  it('uses the existing saved reflection and export format without adding a notebook schema or mutable lens state',()=>{
    const {study,plan,state}=fixture(),reflection=api.stanceAppend('I compared the body with one held paw.',plan,state),working={checked:true,order:[0,1,2],firstOrder:[2,0,1],reflection,stance:state},evidence=api.movementEvidence(study,'baseline',working),note=api.capture(config,pair,evidence.step,'rabbits',evidence.prediction,evidence.explanation,1,null,null,evidence.movement),normalized=api.notebook([note]);
    expect(note.movement.reflection).toBe(reflection);expect(note.movement).not.toHaveProperty('stance');expect(note.movement.version).toBe(1);expect(normalized).toEqual([note]);expect(api.notebookText(normalized)).toContain(reflection);const frozen=JSON.stringify(note);working.stance.choice='both';working.reflection='changed';expect(JSON.stringify(note)).toBe(frozen);
  });
  it('keeps the optional unstarted or unfinished lens from blocking a valid movement observation',()=>{
    const {study,plan}=fixture();for(const stance of [undefined,{}, {open:true,choice:'paw',checked:false}]){
      const evidence=api.movementEvidence(study,'baseline',{checked:true,order:[0,1,2],firstOrder:[2,1,0],reflection:'Independent movement reflection.',stance});expect(evidence.movement.reflection).toBe('Independent movement reflection.');expect(evidence.movement).not.toHaveProperty('stance');
    }
    expect(api.stanceCheck(plan,{})).toBeNull();
  });
  it('composes consecutive native inspections, revisions, explicit append and save in React batches using the latest reflection',async()=>{
    await client(async(host,current,f)=>{
      await React.act(async()=>{control(host,'Planted-paw comparison choice','paw');click(host,'Inspect stance start');click(host,'Inspect stance end');control(host,'Movement evidence reflection','Newest sibling reflection.');host.querySelector('[data-efw-motion-sample="0"]').click();});
      expect(current().motionStudy).toMatchObject({reflection:'Newest sibling reflection.',stance:{choice:'paw',visited:[f.measurement.first,f.measurement.last],checked:false}});
      await React.act(async()=>click(host,'Check planted-paw comparison'));
      await React.act(async()=>{control(host,'Planted-paw comparison choice','body');click(host,'Recheck planted-paw comparison');});
      await React.act(async()=>{click(host,'Add comparison to my movement reflection');click(host,'Save movement observation');});
      expect(current().motionStudy.stance).toMatchObject({firstChoice:'paw',choice:'body',checked:true});expect(current().notebook).toHaveLength(1);const note=current().notebook[0];expect(note.movement.reflection).toMatch(/^Newest sibling reflection\.\n\nPlanted-paw comparison:/);expect(note.movement.reflection).toContain('First choice: the paw moved farther. Latest: the body moved farther.');expect(note.movement).not.toHaveProperty('stance');
      await React.act(async()=>{const reopen=host.querySelector('[aria-label="Reopen observation '+note.id+'"]');expect(reopen).toBeTruthy();reopen.click();});expect(current().motionStudy).toMatchObject({id:f.study.id,species:'rabbits',checked:true,saved:true,reflection:note.movement.reflection});expect(current().motionStudy.stance).toBeUndefined();expect(current().notebook[0]).toEqual(note);
    });
  });
  it('does not restore a previous study when its old lens handlers fire after switching animals in the same React batch',async()=>{
    for(const [label,value] of [['Movement evidence reflection','Stale writing after switching.'],['Planted-paw comparison choice','both']])await client(async(host,current)=>{
      await React.act(async()=>{click(host,'Study a fox movement');click(host,'Add comparison to my movement reflection');click(host,'Inspect stance end');click(host,'Inspect footfall checkpoint 1');host.querySelector('[data-efw-motion-sample="0"]').click();control(host,label,value);});
      expect(current().focus).toBe('foxes');expect(current().motionStudy.species).toBe('foxes');expect(current().motionStudy.id.startsWith('foxes:')).toBe(true);expect(current().motionStudy.reflection).toBe('');expect(current().motionStudy.checked).toBe(false);expect(current().motionStudy.stance).toBeUndefined();expect(current().notebook).toHaveLength(0);
    },true);
  });
});
