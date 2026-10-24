import { beforeAll, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab, renderTool, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
let api,f;
const clone=value=>JSON.parse(JSON.stringify(value));
beforeAll(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;
  const config=api.normalize({enabled:{voles:false,owls:false,caterpillars:false,bluetits:false},initial:{rabbits:90,foxes:6},capacity:160,cover:10,event:'none'}),pair=api.compare(config),frames=api.behaviorTimeline(config,pair.experiment),encounter=api.encounters(frames,config).find(item=>item.kind==='spacing');
  const trial=api.inferenceTrial(frames,encounter,'experiment'),codes=api.inferenceClaims(trial).map(card=>card.category),steps=[encounter.before,encounter.step,encounter.after],measured=api.pairEvidence(frames,encounter,steps),headlineTrial=api.headlineTrial(frames,encounter),pins=[encounter.before+1,encounter.before+2,encounter.before+3],sorts=pins.map(step=>api.headlineInterval(headlineTrial,step).classification);
  expect(measured).toBeTruthy();expect(headlineTrial).toBeTruthy();
  const state={key:JSON.stringify(config)+'|experiment',id:encounter.id,forecast:'avoid',revealed:true,reflection:'Own encounter explanation.',limit:'Scene gaps do not establish a capture.',saved:false,
    measurement:{open:true,steps,claim:measured.trend,firstClaim:measured.trend==='steady'?'mixed':'steady',checked:true,reflection:'Measured current gaps.'},
    headline:{open:true,started:true,pins,sorts,firstSorts:sorts.map(value=>value==='supports'?'challenges':'supports'),visited:[...new Set(pins.flatMap(step=>[step-1,step]))],verdict:'challenged',firstVerdict:'supported',checked:true,reflection:'A full audit tests an every-step claim.'},
    inference:{open:true,trial,visited:[trial.before,trial.step,trial.after],codes,firstCodes:codes.map(()=> 'unsupported'),checked:true,reflection:'Scene labels and model cues have different sources.',link:{version:1,trialId:trial.id,trialKey:JSON.stringify(trial),claimId:'checkpoints',pins:[trial.before,trial.after],firstPins:[trial.step],checked:true,reflection:'Both endpoints are needed.'}}
  };
  f={config,pair,frames,encounter,trial,measured,state};
},60_000);
const readiness=state=>api.fieldworkSaveReadiness(f.frames,f.encounter,'experiment',state);
function htmlFor(state){return renderTool('ecosystem',{ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original population prediction.'},showMeadow:true,cursor:f.encounter.step,focus:f.encounter.actor.id,fieldwork:state}}});}

describe('fieldwork save readiness preserves submitted revisions',()=>{
  it('keeps untouched, unopened and never-submitted optional activities optional',()=>{
    for(const state of [{},{measurement:{open:true,steps:[f.encounter.before,null,null],checked:false},headline:{open:true,started:true,firstVerdict:'unsure',pins:[f.encounter.before+1],sorts:[''],firstSorts:null},inference:{open:true,trial:f.trial,codes:['','','',''],firstCodes:null,checked:false,link:{open:true,pins:[f.trial.step],firstPins:null,checked:false}}}]){
      const ready=readiness(state);expect(ready.ok).toBe(true);expect(ready.pending).toEqual([]);expect(ready.rows.map(row=>row.status)).toEqual(['optional','optional','optional']);expect(ready.measurement).toBeNull();expect(ready.headline).toBeNull();expect(ready.inference).toBeNull();
    }
  });
  it('collects detached checked records with first and latest answers for exactly the current recorded evidence',()=>{
    const before=JSON.stringify({state:f.state,frames:f.frames,pair:f.pair}),ready=readiness(f.state);
    expect(ready.ok).toBe(true);expect(ready.rows.map(row=>row.status)).toEqual(['included','included','included']);
    expect(ready.measurement).toMatchObject({claim:f.state.measurement.claim,firstClaim:f.state.measurement.firstClaim,reflection:f.state.measurement.reflection});
    expect(ready.headline).toMatchObject({firstSorts:f.state.headline.firstSorts,sorts:f.state.headline.sorts,firstVerdict:'supported',verdict:'challenged'});
    expect(ready.inference.link).toMatchObject({firstPins:[f.trial.step],pins:[f.trial.before,f.trial.after],trialKey:JSON.stringify(f.trial)});
    ready.measurement.samples[0].actor.x=999;ready.headline.pins[0]=999;ready.headline.trial.series[0].cue.z=999;ready.inference.link.firstPins[0]=999;
    expect(JSON.stringify({state:f.state,frames:f.frames,pair:f.pair})).toBe(before);
  });
  it('blocks a revised submitted ruler claim or incomplete replacement sample set instead of silently dropping it',()=>{
    for(const patch of [{claim:'mixed',checked:false},{steps:[f.encounter.before,null,f.encounter.after],firstClaim:'',checked:false,revisionPending:true},{revisionPending:true,checked:true},{steps:[f.encounter.step,f.encounter.before,f.encounter.after],checked:true},{claim:'not-a-claim',checked:true}]){
      const state={...clone(f.state),measurement:{...clone(f.state.measurement),...patch}},before=JSON.stringify(state),ready=readiness(state);
      expect(ready.ok).toBe(false);expect(ready.pending[0]).toMatchObject({id:'ruler',target:'ruler'});expect(ready.measurement).toBeNull();expect(ready.headline).toBeTruthy();expect(JSON.stringify(state)).toBe(before);
    }
  });
  it('requires rechecking revised headline verdicts or classifications and retains their original commitments',()=>{
    for(const patch of [{checked:false,verdict:'supported'},{checked:false,sorts:['supports','supports','supports']},{checked:true,visited:[]},{checked:true,firstVerdict:''}]){
      const state={...clone(f.state),headline:{...clone(f.state.headline),...patch}},before=JSON.stringify(state),ready=readiness(state);
      expect(ready.ok).toBe(false);expect(ready.pending[0].target).toBe('headline');expect(ready.headline).toBeNull();expect(ready.measurement).toBeTruthy();expect(JSON.stringify(state)).toBe(before);
    }
    const state=clone(f.state);state.headline.checked=false;expect(readiness(state).ok).toBe(false);state.headline.checked=true;expect(readiness(state).headline.firstSorts).toEqual(f.state.headline.firstSorts);
  });
  it('preserves source and checkpoint-pin revision guards, including same-ID different-original-trial rejection',()=>{
    const source=clone(f.state);source.inference.checked=false;expect(readiness(source).pending).toContainEqual(expect.objectContaining({target:'inference'}));
    const pins=clone(f.state);pins.inference.link.checked=false;expect(readiness(pins).pending).toContainEqual(expect.objectContaining({target:'link',message:'Check the revised checkpoint pins before saving this observation.'}));
    const copied=clone(f.state);copied.inference.link.trialKey=copied.inference.link.trialKey.replace('"branch":"experiment"','"branch":"baseline"');expect(readiness(copied).ok).toBe(false);expect(readiness(copied).inference).toBeNull();
    const historical=clone(f.state),point=historical.inference.trial.samples[0];point.cue.x+=.125;point.gap=Math.hypot(point.actor.x-point.cue.x,point.actor.z-point.cue.z);historical.inference.link.trialKey=JSON.stringify(api.inferenceSnapshot(historical.inference.trial));expect(readiness(historical).ok).toBe(false);
  });
  it('cannot manufacture a checked record through a removed representative or a broken measurement interval',()=>{
    const frames=clone(f.frames);frames[f.encounter.step][f.encounter.actor.id][f.encounter.actor.index].active=false;
    const ready=api.fieldworkSaveReadiness(frames,f.encounter,'experiment',f.state);expect(ready.ok).toBe(false);expect(ready.rows.every(row=>row.status==='pending')).toBe(true);
    expect(api.fieldworkSaveReadiness(f.frames,null,'experiment',{}).ok).toBe(false);expect(api.fieldworkSaveReadiness(f.frames,f.encounter,'other',f.state).ok).toBe(false);
  });
  it('round-trips all included records without changing the saved first answers or population run',()=>{
    const ready=readiness(f.state),t=f.trial,sight={version:1,kind:f.encounter.kind,branch:'experiment',actorIndex:t.actor.index,cueId:t.cue.id,cueIndex:t.cue.index,state:t.samples[1].actor.state,decisionDistance:t.decision.distance,before:{step:t.before,state:t.samples[0].actor.state},after:{step:t.after,state:t.samples[2].actor.state},forecast:'avoid',limitation:'Illustrative scene.',measurement:ready.measurement,headline:ready.headline,inference:ready.inference};
    const before=JSON.stringify(f.pair),note=api.capture(f.config,f.pair,f.encounter.step,t.actor.id,'Original action prediction','Own explanation.',1,null,sight),restored=api.notebook([note])[0];
    expect(restored.sighting.measurement).toEqual(ready.measurement);expect(restored.sighting.headline).toEqual(ready.headline);expect(restored.sighting.inference).toEqual(ready.inference);expect(JSON.stringify(f.pair)).toBe(before);
    const reopened=api.missionResume(restored,'interaction');expect(reopened.ok).toBe(true);expect(readiness(reopened.fieldwork).ok).toBe(true);expect(reopened.fieldwork.measurement.firstClaim).toBe(f.state.measurement.firstClaim);expect(reopened.fieldwork.headline.firstSorts).toEqual(f.state.headline.firstSorts);
  });
  it('renders honest per-sheet save status and keyboard-operable return buttons while never-submitted sheets leave saving enabled',()=>{
    const pending=clone(f.state);pending.measurement.checked=false;pending.measurement.open=false;pending.headline.checked=false;pending.headline.open=false;
    const host=document.createElement('div');host.innerHTML=htmlFor(pending);document.body.appendChild(host);
    const summary=host.querySelector('[data-efw-save-readiness]');expect(summary.textContent).toContain('What this observation will save');expect(summary.querySelector('[data-efw-save-sheet="ruler"]').getAttribute('data-status')).toBe('pending');expect(summary.querySelector('[data-efw-save-sheet="headline"]').getAttribute('data-status')).toBe('pending');
    const save=[...host.querySelectorAll('button')].find(button=>button.textContent==='Save wildlife observation');expect(save.disabled).toBe(true);expect(summary.textContent).toContain('Return to pair measurements');expect(summary.textContent).toContain('Return to headline evidence');host.remove();
    const optional=document.createElement('div');optional.innerHTML=htmlFor({key:f.state.key,id:f.state.id,forecast:'avoid',revealed:true,measurement:{open:true,steps:[f.encounter.before,null,null]},headline:{open:true,started:true,firstVerdict:'supported',firstSorts:null}});expect([...optional.querySelectorAll('button')].find(button=>button.textContent==='Save wildlife observation').disabled).toBe(false);
  });
  it('opens collapsed sheets and enclosing original-evidence details before focusing usable real controls',()=>{
    const host=document.createElement('div');host.innerHTML='<details data-efw-inference><summary>Sources</summary><select aria-label="Evidence statement 1 source"><option>Scene</option></select><details data-efw-evidence-link><summary>Pins</summary><input type="checkbox" aria-label="Pin Before checkpoint"></details></details><details data-efw-pair-lab><summary>Ruler</summary><input aria-label="Pair measurement time"><select aria-label="Pair gap claim"><option>Mixed</option></select></details><details data-efw-headline-trial><summary>Headline</summary><div aria-label="Headline verdict"><button>Supported</button></div></details>';document.body.appendChild(host);
    for(const [target,selector] of [['ruler','[aria-label="Pair gap claim"]'],['headline','[aria-label="Headline verdict"] button'],['inference','[aria-label="Evidence statement 1 source"]'],['link','[aria-label="Pin Before checkpoint"]']]){expect(api.fieldworkFocus(host,target)).toBe(true);expect(document.activeElement).toBe(host.querySelector(selector));for(let node=document.activeElement.parentElement;node!==host;node=node.parentElement)if(node.tagName==='DETAILS')expect(node.open).toBe(true);}
    expect(api.fieldworkFocus(host,'other')).toBe(false);expect(api.fieldworkFocus(null,'ruler')).toBe(false);host.remove();
  });
  it('persists collapsed source and checkpoint-pin details together before real-client Return focuses the nested input',async()=>{
    const state=clone(f.state);state.inference.open=false;state.inference.link.open=false;state.inference.link.checked=false;
    const seed={ecosystem:{tab:'foodweb',tutorialDismissed:true,foodWeb:{...f.config,run:{config:f.config,prediction:'Original population prediction.'},showMeadow:true,cursor:f.encounter.step,focus:f.encounter.actor.id,fieldwork:state}}};
    const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),tool=window.StemLab._registry.ecosystem;let latest;
    const originalAct=globalThis.IS_REACT_ACT_ENVIRONMENT;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    function Harness(){const [toolData,setToolData]=React.useState(seed);latest=toolData;return tool.render(makeCtx({toolData,setToolData}));}
    try {
      await React.act(async()=>root.render(React.createElement(Harness)));
      const source=host.querySelector('[data-efw-inference]'),link=host.querySelector('[data-efw-evidence-link]');expect(source.open).toBe(false);expect(link.open).toBe(false);
      const button=[...host.querySelectorAll('[data-efw-save-readiness] button')].find(item=>item.textContent==='Return to checkpoint pins');expect(button).toBeTruthy();
      await React.act(async()=>{button.click();await new Promise(resolve=>setTimeout(resolve,0));});
      expect(source.open).toBe(true);expect(link.open).toBe(true);expect(document.activeElement).toBe(link.querySelector('input[type="checkbox"]'));
      expect(latest.ecosystem.foodWeb.fieldwork.inference).toMatchObject({open:true,link:{open:true,checked:false,firstPins:[f.trial.step]}});
    } finally {await React.act(async()=>root.unmount());host.remove();globalThis.IS_REACT_ACT_ENVIRONMENT=originalAct;}
  });
});
