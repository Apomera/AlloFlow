import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(()=>{resetStemLab();document.body.innerHTML='<div id="root"></div>';});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;});
async function mount(file,id,initial){const tool=loadTool('stem_lab/stem_tool_'+file+'.js',id);let latest,setter;function App(){const[state,setState]=React.useState(initial);latest=state;setter=setState;return tool.render(makeCtx({toolData:state,labToolData:state,setToolData:setState,setLabToolData:setState}));}root=ReactDOMClient.createRoot(document.getElementById('root'));await React.act(()=>root.render(React.createElement(App)));return{state:()=>latest,patch:async fn=>React.act(()=>setter(fn))};}
function button(label){const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===label||e.getAttribute('aria-label')===label);expect(el,label).toBeTruthy();return el;}
async function click(label){await React.act(()=>button(label).click());}
const blocks=data=>({_manipulatives:{mode:'blocks',soundEnabled:false,b10:{ones:14,tens:0,hundreds:0,thousands:0},...data}});
describe('base-ten trade comparisons',()=>{
  it('shows actual representations before and after a trade and reverses it without losing other state',async()=>{
    const app=await mount('manipulatives','base10',blocks({b10Challenge:{target:14,type:'build'},score:{correct:2,total:3}}));
    await click('10 ones → 1 ten');
    expect(document.querySelector('[data-trade-side="before"]').textContent).toContain('14 × 1 = 14');
    expect(document.querySelector('[data-trade-side="after"]').textContent).toContain('1 × 10 + 4 × 1 = 14');
    expect(document.querySelector('[data-trade-equivalence]').textContent).toContain('10 × 1 = 1 × 10');
    await click('Undo this trade');
    expect(app.state()._manipulatives.b10).toEqual({ones:14,tens:0,hundreds:0,thousands:0});
    expect(app.state()._manipulatives.b10Challenge.target).toBe(14);
    expect(app.state()._manipulatives.score).toEqual({correct:2,total:3});
    expect(app.state()._manipulatives.regroupCount).toBe(1);
    expect(document.querySelector('[data-block-trade]')).toBeNull();
  });
  it.each([
    ['ones','tens','10 ones → 1 ten',10,1,10],
    ['tens','hundreds','10 tens → 1 hundred',10,1,100],
    ['hundreds','thousands','10 hundreds → 1 thousand',10,1,1000],
    ['tens','ones','1 ten → 10 ones',1,10,10],
    ['hundreds','tens','1 hundred → 10 tens',1,10,100],
    ['thousands','hundreds','1 thousand → 10 hundreds',1,10,1000]
  ])('conserves value for %s to %s',async(from,to,label,removed,added,total)=>{
    const initial={ones:0,tens:0,hundreds:0,thousands:0,[from]:removed};
    const app=await mount('manipulatives','base10',blocks({b10:initial}));await click(label);
    expect(app.state()._manipulatives.b10[from]).toBe(0);expect(app.state()._manipulatives.b10[to]).toBe(added);
    expect(document.querySelector('[data-trade-equivalence]').textContent).toContain('The total stays the same: '+total+'.');
  });
  it('invalidates the previous trade and feedback when blocks are manually edited',async()=>{
    const app=await mount('manipulatives','base10',blocks());await click('10 ones → 1 ten');
    await app.patch(s=>({_manipulatives:{...s._manipulatives,b10Feedback:{correct:true,msg:'saved feedback'}}}));
    await click('Add one block to Ones');
    expect(document.querySelector('[data-block-trade]')).toBeNull();expect(app.state()._manipulatives.b10Feedback).toBeNull();
    expect(app.state()._manipulatives.b10.ones).toBe(5);
  });
  it('never reduces a large ungrouped count when the add control is activated',async()=>{
    const app=await mount('manipulatives','base10',blocks({b10:{ones:19,tens:1,hundreds:0,thousands:0}}));
    await click('1 ten → 10 ones');expect(app.state()._manipulatives.b10.ones).toBe(29);
    expect(button('Add one block to Ones').disabled).toBe(true);await click('Add one block to Ones');
    expect(app.state()._manipulatives.b10.ones).toBe(29);
    await click('10 ones → 1 ten');expect(button('Add one block to Ones').disabled).toBe(false);
    await click('Add one block to Ones');expect(app.state()._manipulatives.b10.ones).toBe(20);
  });
  it('starts the fourteen-ones exploration without a stale addition prompt',async()=>{
    const app=await mount('manipulatives','base10',blocks({b10:{ones:0,tens:0,hundreds:0,thousands:0},b10Challenge:null,b10AddMode:true,b10Addends:{a:300,b:303,sum:603}}));
    await click('Start with 14 ones');
    expect(app.state()._manipulatives.b10Challenge).toBeNull();expect(app.state()._manipulatives.b10Addends).toBeNull();
    expect(app.state()._manipulatives.b10.ones).toBe(14);
  });
  it('blocks duplicate exchange activation before React commits the new counts',async()=>{
    const app=await mount('manipulatives','base10',blocks());const trade=button('10 ones → 1 ten');await React.act(()=>{trade.click();trade.click();});
    expect(app.state()._manipulatives.regroupCount).toBe(1);expect(app.state()._manipulatives.b10.ones).toBe(4);
  });
});
describe('arithmetic exchange comparisons',()=>{
  it('distinguishes equal-value exchanges across zero from taking away',async()=>{
    await mount('arithmetic','arithmeticStudio',{_arithmeticStudio:{operation:'subtract',a:102,b:38}});
    await click('Next step');
    expect(document.querySelector('[data-place="10"]').dataset.placeDelta).toBe('10');
    expect(document.querySelector('[data-place="100"]').dataset.placeDelta).toBe('-1');
    expect(document.querySelector('[data-value-change]').textContent).toContain('both representations have value 102');
    await click('Next step');expect(document.querySelector('[data-place="1"]').dataset.placeDelta).toBe('10');
    await click('Next step');expect(document.querySelector('[data-step-comparison]').dataset.stepComparison).toBe('remove');
    expect(document.querySelector('[data-value-change]').textContent).toContain('102 − 38 = 64');
    await click('Previous step');expect(document.querySelector('[data-value-change]').textContent).toContain('both representations have value 102');
  });
  it('shows carry changes in the correct places while conserving the sum',async()=>{
    await mount('arithmetic','arithmeticStudio',{_arithmeticStudio:{operation:'add',a:58,b:67}});
    await click('Next step');expect(document.querySelector('[data-place="1"]').dataset.placeDelta).toBe('-10');
    expect(document.querySelector('[data-place="10"]').dataset.placeDelta).toBe('1');
    expect(document.querySelector('[data-value-change]').textContent).toContain('value 125');
    await click('Next step');expect(document.querySelector('[data-place="100"]').dataset.placeDelta).toBe('1');
    expect(document.querySelector('[data-value-change]').textContent).toContain('value 125');
  });
  it('clears the comparison when changed operands restart the model',async()=>{
    const app=await mount('arithmetic','arithmeticStudio',{_arithmeticStudio:{operation:'add',a:58,b:67}});await click('Next step');
    await app.patch(s=>({_arithmeticStudio:{...s._arithmeticStudio,a:23,b:14}}));
    expect(document.querySelector('[data-step-comparison]')).toBeNull();
    expect([...document.querySelectorAll('[data-place-delta]')].every(e=>e.dataset.placeDelta==='0')).toBe(true);
  });
});
