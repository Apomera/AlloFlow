import {beforeAll,describe,it,expect} from 'vitest';
import {React,ReactDOMClient,loadTool,resetStemLab,makeCtx} from './helpers/stem_widgets_smoke_harness.js';
let api,f,v;
beforeAll(()=>{
  resetStemLab();loadTool(process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.experiment),encounters=api.encounters(frames,config),encounter=encounters.find(row=>row.kind==='spacing'),other=encounters.find(row=>row.kind!=='spacing'),trial=api.inferenceTrial(frames,encounter,'experiment'),codes=api.inferenceClaims(trial).map(row=>row.category);
  expect(encounter).toBeTruthy();expect(other).toBeTruthy();
  f={config,encounter,other,trial,codes};
  const vigilanceConfig=api.normalize({soil:{enabled:false},enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none',target:'foxes',eventStep:80}),vigilancePair=api.compare(vigilanceConfig),vigilanceFrames=api.behaviorTimeline(vigilanceConfig,vigilancePair.experiment),vigilanceEncounter=api.encounters(vigilanceFrames,vigilanceConfig).find(row=>row.kind==='vigilance'),vigilanceTrial=api.inferenceTrial(vigilanceFrames,vigilanceEncounter,'experiment'),plan=api.cueChainCase(vigilanceFrames,vigilanceTrial);
  expect(plan).toBeTruthy();
  const vigilanceCodes=api.inferenceClaims(vigilanceTrial).map(row=>row.category),inference={open:true,trial:vigilanceTrial,codes:vigilanceCodes,firstCodes:vigilanceCodes.slice(),visited:[vigilanceTrial.before,vigilanceTrial.step,vigilanceTrial.after],checked:true,reflection:'Original source explanation.'};
  v={config:vigilanceConfig,frames:vigilanceFrames,encounter:vigilanceEncounter,trial:vigilanceTrial,plan,codes:vigilanceCodes,inference,answers:{cue:'neighbor',directInputStep:plan.trace.step-2,neighborInputStep:plan.trace.step-1}};
},60_000);
const copy=value=>JSON.parse(JSON.stringify(value));
function seed(){
  const state={key:JSON.stringify(f.config)+'|experiment',id:f.encounter.id,forecast:'avoid',revealed:true,reflection:'Original working explanation.',limit:'Original model limit.',saved:false,
    measurement:{open:false,steps:[null,null,null]},
    probe:{open:false,variable:'distance',distance:1,prediction:''},
    inference:{open:false,trial:copy(f.trial),codes:['','','',''],firstCodes:null,visited:[],checked:false,reflection:''}};
  return {ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original population prediction.'},showMeadow:true,cursor:f.encounter.step,focus:'rabbits',fieldwork:state}}};
}
function set(host,label,value){
  const control=host.querySelector('[aria-label="'+label+'"]');expect(control,label).toBeTruthy();
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control),'value').set.call(control,String(value));
  control.dispatchEvent(new Event(control.tagName==='SELECT'?'change':'input',{bubbles:true}));
}
function toggle(host,selector){
  const details=host.querySelector(selector);expect(details,selector).toBeTruthy();details.open=true;details.dispatchEvent(new Event('toggle'));
}
function click(host,text){
  const button=[...host.querySelectorAll('button')].find(node=>node.textContent===text);expect(button,text).toBeTruthy();expect(button.disabled,text).toBe(false);button.click();
}
function vigilanceSeed(){
  const fieldwork={key:JSON.stringify(v.config)+'|experiment',id:v.encounter.id,forecast:'avoid',revealed:true,reflection:'Original vigilance explanation.',limit:'Recorded cues do not establish real animal communication.',saved:false,inference:{...copy(v.inference),chain:{open:true}}};
  return {ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...v.config,run:{config:v.config,prediction:'Original vigilance prediction.'},showMeadow:true,cursor:v.encounter.step,focus:'rabbits',fieldwork}}};
}
async function client(run,initial=seed()){
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),tool=window.StemLab._registry.ecosystem,originalAct=globalThis.IS_REACT_ACT_ENVIRONMENT;let latest;
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  function Harness(){const [toolData,setToolData]=React.useState(initial);latest=toolData;return tool.render(makeCtx({toolData,setToolData}));}
  try{await React.act(async()=>root.render(React.createElement(Harness)));await run(host,()=>latest.ecosystem.foodWeb,initial);}
  finally{await React.act(async()=>root.unmount());host.remove();globalThis.IS_REACT_ACT_ENVIRONMENT=originalAct;}
}
describe('fieldwork draft transactions retain sibling changes before rendering',()=>{
  it('composes native detail toggles, two source classifications, a ruler inspection and reflections in one React batch',async()=>{
    await client(async(host,current)=>{
      const before=JSON.stringify(current().run);
      await React.act(async()=>{
        toggle(host,'[data-efw-pair-lab]');
        set(host,'Pair measurement time',f.encounter.before);
        toggle(host,'[data-efw-inference]');
        set(host,'Evidence statement 1 source',f.codes[0]);set(host,'Evidence statement 2 source',f.codes[1]);
        toggle(host,'[data-efw-cue-probe]');
        set(host,'Cue test variable','feeding');set(host,'Cue test prediction','unsure');
        set(host,'Wildlife explanation','Newest sibling explanation.');
        set(host,'Wildlife model limit','Newest sibling model limit.');
      });
      const state=current().fieldwork;
      expect(state).toMatchObject({id:f.encounter.id,reflection:'Newest sibling explanation.',limit:'Newest sibling model limit.',measurement:{open:true,steps:[null,null,null]},probe:{open:true,variable:'feeding',prediction:'unsure'},inference:{open:true,codes:[f.codes[0],f.codes[1],'',''],firstCodes:null}});
      expect(current().cursor).toBe(f.encounter.before);
      expect(JSON.stringify(current().run)).toBe(before);
      await React.act(async()=>{
        const buttons=[...host.querySelectorAll('[data-efw-inference] button')].filter(button=>/^Inspect evidence checkpoint [123]$/.test(button.textContent));
        expect(buttons).toHaveLength(3);buttons.forEach(button=>button.click());
      });
      expect(current().fieldwork.inference.visited.slice().sort((a,b)=>a-b)).toEqual([f.trial.before,f.trial.step,f.trial.after]);
      expect(current().fieldwork.probe).toMatchObject({open:true,variable:'feeding',prediction:'unsure'});
      expect(current().fieldwork.reflection).toBe('Newest sibling explanation.');
      expect(current().cursor).toBe(f.trial.after);
    });
  });
  it('replaces the full draft on another encounter and clears it on branch changes instead of merging old sheet state',async()=>{
    await client(async(host,current)=>{
      await React.act(async()=>{toggle(host,'[data-efw-pair-lab]');set(host,'Wildlife explanation','A draft that must not leak into another encounter.');});
      expect(current().fieldwork.measurement.open).toBe(true);
      await React.act(async()=>host.querySelector('[data-efw-encounter="'+f.other.kind+'"]').click());
      expect(current().fieldwork).toEqual({key:JSON.stringify(f.config)+'|experiment',id:f.other.id,forecast:'',revealed:false,reflection:'',limit:'',saved:false});
      await React.act(async()=>set(host,'Meadow scene data','baseline'));
      expect(current().fieldwork).toBeNull();
    });
  });
  it('returns to parent evidence sources before either hidden submitted child when parent sources need recovery',()=>{
    const chain={version:1,case:copy(v.plan),caseKey:JSON.stringify(v.plan),answers:copy(v.answers),firstAnswers:copy(v.answers),checked:false},link={version:1,trialId:v.trial.id,trialKey:JSON.stringify(v.trial),claimId:'checkpoints',pins:[v.trial.before,v.trial.after],firstPins:[v.trial.before,v.trial.after],checked:false};
    for(const [target,nested] of [['chain',{chain}],['link',{link}]]){
      const state={...copy(v.inference),...nested};
      expect(api.fieldworkSaveReadiness(v.frames,v.encounter,'experiment',{inference:state}).pending[0].target).toBe(target);
      for(const patch of [{checked:false},{codes:['',...v.codes.slice(1)]},{firstCodes:null},{visited:[v.trial.before]},{trial:copy(f.trial)}]){
        const ready=api.fieldworkSaveReadiness(v.frames,v.encounter,'experiment',{inference:{...state,...patch}});
        expect(ready.ok).toBe(false);expect(ready.pending[0]).toMatchObject({id:'inference',target:'inference',message:'Recheck the revised evidence sources before saving this observation.'});
      }
    }
  });
  it('recovers revised sources before the hidden cue chain, focuses both mounted sheets, and preserves first submissions',async()=>{
    await client(async(host,current)=>{
      const run=JSON.stringify(current().run);
      await React.act(async()=>{
        set(host,'Cue-chain cue role','neighbor');set(host,'Predator-input time used by neighbor',v.answers.directInputStep);set(host,'Neighbor-input time used by selected rabbit',v.answers.neighborInputStep);
      });
      await React.act(async()=>click(host,'Check cue chain'));
      expect(current().fieldwork.inference.chain).toMatchObject({checked:true,firstAnswers:v.answers,answers:v.answers});
      await React.act(async()=>set(host,'Cue-chain cue role','unsure'));
      expect(current().fieldwork.inference.chain.checked).toBe(false);
      expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Return to cue-chain choices')).toBe(true);
      const revisedCodes=v.codes.slice();revisedCodes[0]=v.codes[0]==='scene'?'rule':'scene';
      await React.act(async()=>set(host,'Evidence statement 1 source',revisedCodes[0]));
      expect(host.querySelector('[data-efw-cue-chain]')).toBeNull();
      expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Return to cue-chain choices')).toBe(false);
      expect(host.querySelector('[data-efw-save-sheet="inference"]').textContent).toContain('Recheck the revised evidence sources');
      await React.act(async()=>click(host,'Return to evidence sources'));
      expect(document.activeElement).toBe(host.querySelector('[aria-label="Evidence statement 1 source"]'));
      expect(current().fieldwork.inference.chain).toMatchObject({checked:false,firstAnswers:v.answers,answers:{...v.answers,cue:'unsure'}});
      await React.act(async()=>click(host,'Check revised evidence sources'));
      expect(host.querySelector('[data-efw-cue-chain]')).toBeTruthy();
      await React.act(async()=>click(host,'Return to cue-chain choices'));
      expect(document.activeElement).toBe(host.querySelector('[aria-label="Cue-chain cue role"]'));
      await React.act(async()=>click(host,'Check revised cue chain'));
      await React.act(async()=>click(host,'Save wildlife observation'));
      const saved=current().notebook[0].sighting.inference;
      expect(saved).toMatchObject({firstCodes:v.codes,codes:revisedCodes,chain:{firstAnswers:v.answers,answers:{...v.answers,cue:'unsure'}}});
      expect(JSON.stringify(current().run)).toBe(run);
    },vigilanceSeed());
  });
});
