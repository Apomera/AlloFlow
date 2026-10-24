import {beforeAll,describe,it,expect} from 'vitest';
import {React,ReactDOMClient,loadTool,resetStemLab,makeCtx,renderTool} from './helpers/stem_widgets_smoke_harness.js';
let api,f;
const clone=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool(process.env.ECOLOGY_TOOL_SOURCE||'stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({soil:{enabled:false},enabled:{rabbits:false,voles:false,foxes:true,owls:false,caterpillars:false,bluetits:false},initial:{foxes:20},capacity:160,cover:0,event:'none',target:'foxes',eventStep:80}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.experiment),episode=api.foxCrossingEpisode(frames),plan=api.crossingEthogramPlan(frames);
  expect(episode).toBeTruthy();expect(plan).toBeTruthy();
  const categories=plan.samples.map(sample=>sample.category),first=categories.map((code,k)=>k===1?'resting':code),record={version:1,branch:'experiment',species:'foxes',index:plan.index,start:plan.start,interval:plan.interval,samples:clone(plan.samples),firstCodes:first,codes:categories,reflection:'My code describes a broad category; position and body detail do not show intention.'},note=api.capture(config,pair,plan.samples[2].step,'foxes','Original ecosystem prediction.',record.reflection,1,null,null,null,record);
  f={config,pair,frames,episode,plan,categories,first,record,note};
},60_000);
function metadata(plan){return {id:plan.id,species:plan.species,index:plan.index,start:plan.start,interval:plan.interval,branch:'experiment'};}
function seed(){
  const other=api.ethogramPlan(f.frames,'foxes',f.plan.index,f.plan.start+1,1),key=JSON.stringify(f.config)+'|experiment';
  return {ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Keep this original population prediction.'},showMeadow:true,cursor:other.start,focus:'foxes',fieldwork:{key,id:'untouched-working-encounter',forecast:'unsure',reflection:'Keep encounter draft.'},motionStudy:{key,id:'untouched-working-movement',species:'foxes',reflection:'Keep movement draft.'},ethogram:{key,open:true,plan:metadata(other),draftStart:other.start,draftInterval:other.interval,codes:['resting','','','',''],firstCodes:null,visited:[0],checked:false,reflection:'An older ethogram draft.',saved:false},notebook:[clone(f.note)],notebookSequence:1}}};
}
function set(host,label,value){const el=host.querySelector('[aria-label="'+label+'"]');expect(el,label).toBeTruthy();Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));}
function button(host,name){const el=[...host.querySelectorAll('button')].find(row=>row.textContent===name);expect(el,name).toBeTruthy();return el;}
async function client(run){
  const initial=seed(),host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),tool=window.StemLab._registry.ecosystem,originalAct=globalThis.IS_REACT_ACT_ENVIRONMENT,originalScroll=Element.prototype.scrollIntoView;let latest;
  if(!originalScroll)Element.prototype.scrollIntoView=function(){};globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  function Harness(){const [toolData,setToolData]=React.useState(initial);latest=toolData;return tool.render(makeCtx({toolData,setToolData}));}
  try{await React.act(async()=>root.render(React.createElement(Harness)));await run(host,()=>latest.ecosystem.foodWeb,initial.ecosystem.foodWeb);}
  finally{await React.act(async()=>root.unmount());host.remove();globalThis.IS_REACT_ACT_ENVIRONMENT=originalAct;if(!originalScroll)delete Element.prototype.scrollIntoView;}
}
describe('guided crossing entry reuses the existing ethogram',()=>{
  it('chooses five equally spaced real checkpoints before, during and after the same crossing without modifying source data',()=>{
    const before=JSON.stringify({frames:f.frames,pair:f.pair}),plan=api.crossingEthogramPlan(f.frames);expect(plan.species).toBe('foxes');expect(plan.index).toBe(f.episode.index);expect(plan.start).toBe(f.episode.start-1);expect(plan.samples.map(row=>row.step)).toEqual([60,65,70,75,80]);
    expect(plan.samples.every(row=>row.state==='Searching')).toBe(true);expect(f.frames[plan.start].foxes[plan.index].crossingCue).toBeFalsy();expect(f.frames[plan.end].foxes[plan.index].crossingCue).toBeFalsy();
    const stages=plan.samples.map(row=>f.frames[row.step].foxes[plan.index].crossingCue?.stage||null);expect(stages).toContain('watch');expect(stages).toContain('release');expect(api.ethogramPlan(f.frames,plan.species,plan.index,plan.start,plan.interval)).toEqual(plan);
    plan.samples[0].x=999;expect(api.crossingEthogramPlan(f.frames)).toEqual(f.plan);expect(JSON.stringify({frames:f.frames,pair:f.pair})).toBe(before);
  });
  it('refuses missing crossings, incomplete after windows, a disappearance and malformed crossing metadata',()=>{
    for(const frames of [null,[],{},f.frames.slice(0,f.episode.start+16)])expect(api.crossingEthogramPlan(frames)).toBeNull();
    const single=f.frames.slice(0,f.plan.end+1).map(frame=>({...frame,foxes:frame.foxes.map((pose,index)=>({...pose,crossingCue:index===f.episode.index&&pose.crossingCue?.startStep===f.episode.start?clone(pose.crossingCue):null}))}));
    expect(api.crossingEthogramPlan(single)).toEqual(f.plan);
    const missing=clone(single);missing.forEach(frame=>frame.foxes.forEach(pose=>pose.crossingCue=null));expect(api.crossingEthogramPlan(missing)).toBeNull();
    const gap=clone(single);gap[f.plan.start+2].foxes[f.plan.index].active=false;expect(api.crossingEthogramPlan(gap)).toBeNull();
    const forged=clone(single);forged.forEach(frame=>{const cue=frame.foxes[f.plan.index].crossingCue;if(cue)cue.receiverIndex=0;});expect(api.crossingEthogramPlan(forged)).toBeNull();
    for(const change of [frames=>{frames[f.plan.samples[1].step].foxes[f.episode.sourceIndex].x+=.125;},frames=>{frames[f.plan.samples[1].step].foxes[f.plan.index].crossingCue.x+=.125;},frames=>{frames[f.episode.start+1].foxes[f.plan.index].crossingCue.receiverMovement+=.1;}]){const corrupt=clone(single);change(corrupt);expect(api.crossingEthogramPlan(corrupt)).toBeNull();}
  });
  it('derives progress from only distinct valid visit indexes and declared codes without changing either input',()=>{
    const visited=[0,0,'1',4,5,-1,NaN],codes=['moving','bad','resting',null,''],before={visited:visited.slice(),codes:codes.slice()},progress=api.ethogramProgress(f.plan,codes,visited);
    expect(progress).toEqual({inspected:2,coded:2,visited:[0,4],nextVisit:1,nextCode:1});expect(visited).toEqual(before.visited);expect(codes).toEqual(before.codes);
    expect(api.ethogramProgress(f.plan,f.categories,[4,3,2,1,0,0])).toMatchObject({inspected:5,coded:5,nextVisit:-1,nextCode:-1});for(const plan of [null,{}, {samples:[]},{samples:[{step:0},{step:0},{step:2},{step:3},{step:4}]}])expect(api.ethogramProgress(plan,[],[])).toBeNull();
  });
  it('renders a contextual goal only for the actual matching plan and never changes a draft to compute progress',()=>{
    const data=seed(),before=JSON.stringify(data);let html=renderTool('ecosystem',data);expect(html).toContain('Replace ethogram with crossing sheet');expect(html).not.toContain('data-efw-crossing-observation-goal');expect(JSON.stringify(data)).toBe(before);
    data.ecosystem.foodWeb.ethogram={...data.ecosystem.foodWeb.ethogram,plan:metadata(f.plan),draftStart:f.plan.start,draftInterval:f.plan.interval};html=renderTool('ecosystem',data);expect(html).toContain('data-efw-crossing-observation-goal');expect(html).toContain('does not establish the fox');expect(html).toContain('1 of 5 checkpoints inspected');expect(html).toContain('aria-live="polite"');
    const none=clone(data);none.ecosystem.foodWeb.ethogram=null;expect(renderTool('ecosystem',none)).toContain('Start fox-crossing observation sheet');
  });
  it('leaves notebook schema, exact samples, first/latest codes and portable export unchanged',()=>{
    const note=api.notebook([f.note])[0];expect(note.ethogram).toEqual(f.record);expect(Object.keys(note.ethogram).sort()).toEqual(Object.keys(f.record).sort());
    expect(note.ethogram).not.toHaveProperty('crossing');expect(note.ethogram).not.toHaveProperty('goal');const text=api.notebookText([note]);expect(text).toContain(f.record.reflection);for(const sample of f.plan.samples)expect(text).toContain((sample.step/10).toFixed(1));expect(api.missionResume(note,'observe').ethogram.firstCodes).toEqual(f.first);
    const restored=api.missionResume(note,'observe').ethogram;restored.codes[0]='resting';expect(api.notebook([f.note])[0]).toEqual(note);
  });
  it('keeps pure inspection separate from explicit launch and composes native toggles, next inspection and coding revisions before saving',async()=>{
    await client(async(host,current,initial)=>{
      const untouched=JSON.stringify({fieldwork:initial.fieldwork,motionStudy:initial.motionStudy,ethogram:initial.ethogram,notebook:initial.notebook,run:initial.run});
      await React.act(async()=>button(host,'Inspect a fox crossing').click());expect(JSON.stringify({fieldwork:current().fieldwork,motionStudy:current().motionStudy,ethogram:current().ethogram,notebook:current().notebook,run:current().run})).toBe(untouched);
      await React.act(async()=>button(host,'Replace ethogram with crossing sheet').click());expect(current().fieldwork).toBeNull();expect(current().motionStudy).toBeNull();expect(current().ethogram).toMatchObject({plan:metadata(f.plan),codes:['','','','',''],firstCodes:null,visited:[0],reflection:'',checked:false,saved:false});expect(document.activeElement.getAttribute('aria-label')).toBe('Ethogram sample 1 code');
      expect(JSON.stringify(current().notebook)).toBe(JSON.stringify(initial.notebook));expect(JSON.stringify(current().run)).toBe(JSON.stringify(initial.run));
      await React.act(async()=>{const details=host.querySelector('[data-efw-ethogram]');details.open=false;details.dispatchEvent(new Event('toggle'));});
      await React.act(async()=>{const details=host.querySelector('[data-efw-ethogram]');details.open=true;details.dispatchEvent(new Event('toggle'));set(host,'Ethogram sample 1 code',f.categories[0]);set(host,'Ethogram sample 2 code','resting');button(host,'Inspect next checkpoint').click();});
      expect(current().ethogram).toMatchObject({open:true,visited:[0,1],codes:[f.categories[0],'resting','','','']});expect(document.activeElement.getAttribute('aria-label')).toBe('Ethogram sample 2 code');
      for(let k=2;k<5;k++){await React.act(async()=>{button(host,'Inspect next checkpoint').click();set(host,'Ethogram sample '+(k+1)+' code',f.categories[k]);});expect(document.activeElement.getAttribute('aria-label')).toBe('Ethogram sample '+(k+1)+' code');}
      await React.act(async()=>button(host,'Check my ethogram').click());expect(current().ethogram.firstCodes).toEqual(f.first);const staleSave=button(host,'Save ethogram observation');
      await React.act(async()=>{set(host,'Ethogram reflection','I revised my category while keeping body detail distinct from intention.');set(host,'Ethogram sample 2 code',f.categories[1]);staleSave.click();});
      expect(current().notebook).toHaveLength(1);expect(current().ethogram).toMatchObject({checked:false,firstCodes:f.first,codes:f.categories});
      await React.act(async()=>button(host,'Check revised ethogram').click());await React.act(async()=>button(host,'Save ethogram observation').click());const note=current().notebook[1];expect(note.ethogram.firstCodes).toEqual(f.first);expect(note.ethogram.codes).toEqual(f.categories);expect(note.ethogram.reflection).toContain('I revised');expect(current().ethogram.saved).toBe(true);expect(JSON.stringify(current().notebook[0])).toBe(JSON.stringify(initial.notebook[0]));
    });
  });
});
