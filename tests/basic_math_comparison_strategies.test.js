import { beforeEach, afterEach, it, describe, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(() => {
  const canvasContext=new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
  vi.spyOn(window.HTMLCanvasElement.prototype,'getContext').mockReturnValue(canvasContext);
  vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}});
  resetStemLab(); document.body.innerHTML='<div id="root"></div>'; });
afterEach(async () => { if(root)await React.act(()=>root.unmount()); root=null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(file,id,initial,adapter) {
  const tool=loadTool('stem_lab/stem_tool_'+file+'.js',id); let latest,setter;
  function App(){ const [state,setState]=React.useState({exploreScore:{correct:0,total:0},...initial});latest=state;setter=setState;return tool.render(makeCtx({toolData:state,labToolData:state,setToolData:setState,setLabToolData:setState,...(adapter?adapter(state,setState):{})})); }
  root=ReactDOMClient.createRoot(document.getElementById('root'));await React.act(()=>root.render(React.createElement(App)));
  return {state:()=>latest,patch:async(fn)=>React.act(()=>setter(fn))};
}
function button(name){const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===name||e.getAttribute('aria-label')===name);expect(el,name).toBeTruthy();return el;}
async function click(name){await React.act(()=>button(name).click());}
async function enter(input,value){const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;await React.act(()=>{set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
const fractions=(data={})=>({_fractions:{navMode:'practice',tab:'compare',mode:'bar',num1:7,den1:4,num2:4,den2:4,...data}});
describe('fraction comparison models and questions',()=>{
  it('marks a rounded difference as approximate',async()=>{
    await mount('fractions','fractionViz',fractions({num1:1,den1:3,num2:1,den2:2}));
    expect(document.body.textContent).toContain('difference ≈ 0.167');
  });
  it('represents an improper fraction as complete wholes and a remainder using equal-sized units',async()=>{
    await mount('fractions','fractionViz',fractions());
    const models=document.querySelectorAll('[data-compare-wholes]');
    expect(models[0].querySelectorAll('[data-compare-unit]')).toHaveLength(2);
    expect(models[1].querySelectorAll('[data-compare-unit]')).toHaveLength(1);
    expect(models[0].textContent).toContain('1 whole units + 3/4');
    expect([...document.querySelectorAll('[data-compare-unit]')].every(e=>e.style.width==='140px')).toBe(true);
    expect(models[0].querySelectorAll('[data-fraction-model="bar"]')[1].getAttribute('aria-label')).toContain('3 of 4');
  });
  it('keeps equal positions separately labelled and compares equivalent fractions exactly',async()=>{
    await mount('fractions','fractionViz',fractions({num1:1,den1:4,num2:2,den2:8}));
    expect(document.querySelector('[data-compare-line-key]').textContent).toContain('A: 1/4');
    expect(document.querySelector('[data-compare-line-key]').textContent).toContain('B: 2/8');
    expect(document.querySelector('[data-compare-explanation]').textContent).toContain('2/8 = 2/8');
    expect(document.body.textContent).toContain('1/4 = 2/8');
  });
  it('uses a common denominator to explain unlike parts',async()=>{
    await mount('fractions','fractionViz',fractions({num1:3,den1:4,num2:5,den2:6}));
    expect(document.querySelector('[data-compare-explanation]').textContent).toContain('3/4 = 9/12; 5/6 = 10/12');
    expect(document.querySelector('[data-compare-explanation]').textContent).toContain('9/12 < 10/12');
  });
  it('withholds explicit comparison explanations until the quiz is answered',async()=>{
    await mount('fractions','fractionViz',fractions({num1:1,den1:2,num2:1,den2:3,quiz:{n1:1,d1:2,n2:1,d2:3,answer:'1/2',opts:['1/2','1/3','They are equal'],answered:false}}));
    expect(document.querySelector('[data-compare-explanation]')).toBeNull();
    await click('1/3');
    expect(document.querySelector('[data-compare-explanation]')).toBeTruthy();
    expect(document.querySelector('[role="status"]').textContent).toContain('1/2 is larger.');
  });
  it('generates equivalent-fraction questions and does not score a rapid duplicate choice twice',async()=>{
    const award=vi.fn();vi.spyOn(Math,'random').mockReturnValue(.1);
    const app=await mount('fractions','fractionViz',fractions(),()=>({awardXP:award}));
    await click('Which fraction is larger?');
    expect(app.state()._fractions.quiz.answer).toBe('They are equal');
    const choice=button('They are equal');await React.act(()=>{choice.click();choice.click();});
    expect(app.state()._fractions.quizScore).toBe(1);
    expect(award).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('The fractions are equal.');
    expect(document.body.textContent).not.toContain('They are equal is larger');
  });
  it('clears a quiz when a fraction is edited and bounds input values to the declared range',async()=>{
    const app=await mount('fractions','fractionViz',fractions());await click('Which fraction is larger?');
    await enter(document.querySelector('input[aria-label="Fraction A numerator"]'),'99');
    expect(app.state()._fractions.num1).toBe(20);expect(app.state()._fractions.quiz).toBeNull();
    await enter(document.querySelector('input[aria-label="Fraction A denominator"]'),'0');expect(app.state()._fractions.den1).toBe(1);
  });
  it('names each model toggle correctly and preserves operands while switching models',async()=>{
    const app=await mount('fractions','fractionViz',fractions());await click('Pie models');
    expect(button('Pie models').getAttribute('aria-pressed')).toBe('true');
    expect(app.state()._fractions.num1).toBe(7);
    expect(document.querySelectorAll('[data-compare-wholes]')[0].querySelectorAll('[data-compare-unit]')).toHaveLength(2);
  });
  it('shows the magnitude and left-of-zero location for negative values carried from operations',async()=>{
    await mount('fractions','fractionViz',fractions({num1:-7,den1:4,num2:0,den2:4}));
    expect(document.querySelector('[data-compare-wholes]').textContent).toContain('Negative quantity');
    expect(document.querySelector('[data-compare-line]').getAttribute('aria-label')).toContain('A: -7/4');
    expect(document.querySelector('[data-compare-explanation]').textContent).toContain('-7/4 < 0/4');
  });
});
function multAdapter(state,setState){const set=key=>value=>setState(s=>({...s,[key]:typeof value==='function'?value(s[key]):value}));return {multTableChallenge:state.challenge,setMultTableChallenge:set('challenge'),multTableAnswer:state.answer,setMultTableAnswer:set('answer'),multTableFeedback:state.feedback,setMultTableFeedback:set('feedback'),exploreScore:state.exploreScore||{correct:0,total:0},setExploreScore:set('exploreScore'),setMultTableRevealed:set('revealed'),setMultTableHover:set('hover'),setMultTableHidden:set('hidden')};}
describe('multiplication strategy feedback',()=>{
  it('conserves dots across different splits and never scores strategy exploration as another answer',async()=>{
    const app=await mount('multtable','multtable',{challenge:{a:7,b:8,mode:'mult'},answer:'56'},multAdapter);
    expect(document.querySelector('[data-fact-strategy]')).toBeNull();await click('Check');
    expect(document.querySelectorAll('[data-strategy-part="first"]')).toHaveLength(40);
    expect(document.querySelectorAll('[data-strategy-part="second"]')).toHaveLength(16);
    await click('3 + 4 rows');
    expect(document.querySelectorAll('[data-strategy-part="first"]')).toHaveLength(24);
    expect(document.querySelectorAll('[data-strategy-part="second"]')).toHaveLength(32);
    expect(document.querySelector('[data-fact-strategy-equation]').textContent).toContain('24 + 32 = 56');
    expect(app.state().exploreScore).toEqual({correct:1,total:1});
    await click('Next question');expect(document.querySelector('[data-fact-strategy]')).toBeNull();
  });
  it.each([[7,8],[8,7]])('connects division to the correct number of equal groups',async(divisor,quotient)=>{
    await mount('multtable','multtable',{challenge:{a:7,b:8,mode:'div',divisor},answer:String(quotient)},multAdapter);await click('Check');
    expect(document.querySelector('[data-fact-strategy-equation]').textContent).toContain('56 ÷ '+divisor+' = '+quotient);
    expect(document.querySelectorAll('[data-strategy-part]')).toHaveLength(56);
  });
  it('handles a one-row fact without drawing an imaginary second group',async()=>{
    await mount('multtable','multtable',{challenge:{a:1,b:8,mode:'mult'},answer:'8'},multAdapter);await click('Check');
    expect(document.querySelectorAll('[data-strategy-part="second"]')).toHaveLength(0);
    expect(document.querySelector('[data-fact-strategy-equation]').textContent).toContain('8 + 0 = 8');
  });
});
