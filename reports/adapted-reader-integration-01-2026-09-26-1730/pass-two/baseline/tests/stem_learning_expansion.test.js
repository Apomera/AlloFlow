
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{
  resetStemLab(); document.body.innerHTML='<div id="root"></div>';
  const drawing=new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:20}):()=>{}});
  vi.spyOn(window.HTMLCanvasElement.prototype,'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
function algebra(){loadTool('stem_lab/stem_tool_algebracas.js','algebraCAS');return window.__alloCASPure;}
function bim(){loadTool('stem_lab/stem_tool_openbim.js','openBim');return window.OpenBIMBridge;}
function taxonomy(){return loadTool('stem_lab/stem_tool_organismid.js','organismId').testHooks;}
function graph(){loadTool('stem_lab/stem_tool_graphcalc.js','graphCalc');return window.__alloGraphAnalysis;}
async function mount(id,file,state,extra={}){
  loadTool(file,id);let latest;
  function App(){const[data,setData]=React.useState({[id]:state});latest=data;return window.StemLab._registry[id].render(makeCtx({toolData:data,setToolData:setData,callGemini:null,...extra}));}
  root=ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(()=>root.render(React.createElement(App)));
  return ()=>latest[id];
}
async function click(text){const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===text);expect(b,text).toBeTruthy();await React.act(()=>b.click());}

describe('exact local algebra',()=>{
  it.each([
    ['3x + 0.1 = 1.1','1/3'],['3(x-2)=x+4','5'],['-x/2=3','-6'],
    ['2x+1=2x+1','All real numbers'],['2x+1=2x+2','No solution'],
    ['x=-3/7','-3/7']
  ])('solves %s exactly',(eq,answer)=>expect(algebra().solveLinear(eq)).toMatchObject({ok:true,answer,verify:{exact:true,verified:true}}));
  it.each(['x^2=1','y=2','x/x=1','x=1=2','x/0=1','2x+=1'])('rejects unsupported %s',eq=>expect(algebra().solveLinear(eq).ok).toBe(false));
  it('rejects information-destroying steps and accepts reversible steps',()=>{
    const api=algebra();
    expect(api.checkLinearStep('3x+5=14','3x=9')).toMatchObject({equivalent:true});
    expect(api.checkLinearStep('3x+5=14','3x=19')).toMatchObject({equivalent:false});
    expect(api.checkLinearStep('x=3','0=0')).toMatchObject({equivalent:false});
    expect(api.checkLinearStep('0=1','x=x')).toMatchObject({equivalent:false});
    expect(api.checkLinearStep('x=3','x/x=1').ok).toBe(false);
  });
  it('all 108 local practice variants have an exact, unique solution',()=>{
    const api=algebra();
    for(const level of ['elementary','middle','advanced'])for(let i=0;i<36;i++){
      const q=api.linearPractice(level,i),result=api.solveLinear(q.problem);
      expect(result.kind).toBe('unique');expect(api.gradeLinear(q.problem,q.answer)).toMatchObject({decidable:true,correct:true});
      expect(api.gradeLinear(q.problem,'x=x').decidable).toBe(false);
    }
  });
  it('solves locally with no provider and keeps verification tied to history',async()=>{
    const state=await mount('algebraCAS','stem_lab/stem_tool_algebracas.js',{tab:'solve',expression:'3x + 0.1 = 1.1',mode:'solve'});
    const solve=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='TRY:');
    await React.act(()=>solve.click());
    expect(state().result).toContain('ANSWER: 1/3');
    expect(document.querySelector('[data-cas-verification]').dataset.casVerification).toBe('exact');
    expect(state().history[0].verify.exact).toBe(true);
    expect(state()._solveCount).toBe(1);expect(state()._modesUsed.solve).toBe(true);expect(state()._badgesEarned).toContain('firstSolve');
  });
  it('starts and grades practice without an AI call or duplicate credit',async()=>{
    const awardXP=vi.fn();
    const state=await mount('algebraCAS','stem_lab/stem_tool_algebracas.js',{tab:'practice',difficulty:'middle'},{awardXP});
    await click('Start local linear practice');
    const input=document.querySelector('input[aria-label="Practice answer input"]');
    await React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,state().practiceQ.answer);input.dispatchEvent(new Event('input',{bubbles:true}));});
    await React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(state().practiceFeedback).toMatchObject({correct:true,gradeSource:'verified'});
    expect(state().practiceScore).toBe(1);expect(awardXP).toHaveBeenCalledTimes(1);
  });
});

describe('OpenBIM inspectable design study',()=>{
  it('checks geometry as well as area',()=>{
    const api=bim();
    expect(api.evaluateDesignStudy({width:8,depth:6,workWidth:6,workDepth:4})).toMatchObject({area:48,workArea:24,fits:true,meetsBrief:true});
    expect(api.evaluateDesignStudy({width:4,depth:12,workWidth:6,workDepth:4})).toMatchObject({area:48,workArea:24,fits:false,meetsBrief:false});
    expect(api.evaluateDesignStudy({width:10,depth:10,workWidth:6,workDepth:4}).meetsBrief).toBe(false);
  });
  it('keeps imported dimensions bounded and clears imported approval',()=>{
    const api=bim(),plan=api.buildFallbackPlan('Science classroom',{});
    plan.designStudy={width:9,depth:6,workWidth:6,workDepth:4};
    const recipe=api.buildRecipe(plan),imported=api.normalizeImportedRecipe(JSON.stringify(recipe));
    expect(imported.plan.designStudy).toEqual(plan.designStudy);
    expect(imported.plan.status).toBe('proposal');
    expect(api.normalizeDesignStudy({width:Infinity,depth:-2,workWidth:'oops',workDepth:10000})).toEqual({width:8,depth:6,workWidth:6,workDepth:4});
  });
  it('compares dimension, inventory and spatial revisions without mutating either plan',()=>{
    const api=bim(),a=api.buildFallbackPlan('Science classroom',{}),b=JSON.parse(JSON.stringify(a));
    b.designStudy={width:9,depth:6,workWidth:6,workDepth:4};b.elements[0].count+=1;b.storeys[0].elevationMetres=2;
    const before=JSON.stringify([a,b]),diff=api.comparePlans(a,b);
    expect(diff.join(' ')).toContain('width: 8 m → 9 m');expect(diff.join(' ')).toContain('IfcWall');expect(diff.join(' ')).toContain('elevations');
    expect(JSON.stringify([a,b])).toBe(before);
  });
});

describe('taxonomy evidence and revisions',()=>{
  it.each([
    [['yes'],'Bird example'],[['no','yes','yes'],'Insect example'],
    [['no','yes','no','yes'],'Arachnid example'],[['no','no','yes'],'Fern example'],
    [['no','no','no','yes'],'Mushroom example'],[['no','no','no','no','yes'],'Moss example']
  ])('follows the teaching-key evidence %j',(answers,result)=>expect(taxonomy().observationRoute(answers).result).toBe(result));
  it('leaves incomplete or uncertain observations unresolved',()=>{
    const api=taxonomy();expect(api.observationRoute([]).result).toBeNull();expect(api.observationRoute(['unsure']).result).toBe('Unresolved');
    expect(api.photoIdEnabled()).toBe(false);
  });
  it('retains earlier notes, limits size and exports revision evidence',()=>{
    const api=taxonomy(),rows=[{id:'a',subject:'Visitor',note:'Six legs',claim:'Insect example'},{id:'b',previousId:'a',subject:'Visitor',note:'I counted eight',reason:'Recounted legs',claim:'Arachnid example'}];
    const text=api.observationMarkdown(rows);expect(text).toContain('Six legs');expect(text).toContain('I counted eight');expect(text).toContain('Revision of a');expect(text).toContain('Recounted legs');
    expect(api.observationJournal(Array.from({length:65},(_,i)=>({id:String(i),note:'x'.repeat(2500)})))).toHaveLength(60);
    expect(api.observationJournal(rows)[0].note).toBe('Six legs');
  });
});

describe('graph numerical provenance',()=>{
  it('finds sign-changing roots with strict substitution residuals',()=>{
    const result=graph().scan(x=>x*x-2,-2,2);
    expect(result.candidates).toHaveLength(2);
    for(const point of result.candidates){expect(point.residual).toBeLessThanOrEqual(1e-8);expect(Math.abs(point.x)).toBeCloseTo(Math.sqrt(2),7);}
    expect(result.samples).toBe(501);
  });
  it('finds a touching root between grid samples',()=>{
    const result=graph().scan(x=>(x-0.12345)**2,-1,1);
    expect(result.candidates).toHaveLength(1);expect(result.candidates[0].x).toBeCloseTo(.12345,7);
  });
  it('finds exact endpoint and grid roots',()=>{
    expect(graph().scan(x=>x*(x-1),0,1).candidates.map(r=>r.x)).toEqual([0,1]);
  });
  it.each([
    [x=>1/(x-.12345),'pole'],
    [x=>x<.12345?-.2:.2,'jump'],
    [x=>.000000001,'small nonzero constant'],
    [x=>(x-.12345)**2+.00001,'nonzero minimum']
  ])('does not report a %s as a root',(f)=>expect(graph().scan(f,-1,1).candidates).toEqual([]));
  it('identifies an all-zero sample set without inventing isolated roots',()=>{
    expect(graph().scan(()=>0,-1,1)).toMatchObject({zeroThroughoutSamples:true,candidates:[]});
  });
  it('rejects invalid windows and tolerates undefined domains',()=>{
    const api=graph();expect(api.scan(x=>x,1,1).error).toBeTruthy();
    expect(api.scan(x=>Math.sqrt(x)-1,-2,2).candidates[0].x).toBeCloseTo(1,6);
  });
});


describe('improper integral cutoff reasoning',()=>{
  function api(){loadTool('stem_lab/stem_tool_funcgrapher.js','funcGrapher');return window.__alloImproperIntegral;}
  it('computes finite-interval areas for all three endpoint examples',()=>{
    const a=api();
    expect(a.truncate(.5,.01).area).toBeCloseTo(1.8,12);
    expect(a.truncate(1,.01).area).toBeCloseTo(Math.log(100),12);
    expect(a.truncate(2,.01).area).toBeCloseTo(99,12);
  });
  it('distinguishes the convergent limit from divergent limits',()=>{
    const a=api();
    expect(a.truncate(.5,1e-10)).toMatchObject({limit:'2'});
    expect(a.truncate(.5,1e-10).area).toBeLessThan(2);
    expect(a.truncate(1,1e-10).limit).toBe('unbounded');
    expect(a.truncate(2,1e-10).limit).toBe('unbounded');
  });
  it.each([0,-1,1,Infinity,NaN])('rejects invalid cutoff %s',value=>expect(api().truncate(1,value).ok).toBe(false));
});
