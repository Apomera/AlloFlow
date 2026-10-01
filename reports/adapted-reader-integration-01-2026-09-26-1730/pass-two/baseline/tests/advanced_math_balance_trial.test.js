import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
beforeEach(() => {
  const drawing = new Proxy({}, {get:(target,key)=>key in target?target[key]:key==='measureText'?()=>({width:20}):()=>{}});
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
  resetStemLab();
  document.body.innerHTML='<div id="root"></div>';
  loadTool('stem_lab/stem_tool_algebracas.js','algebraCAS');
});
afterEach(async()=>{
  if(root)await React.act(()=>root.unmount());root=null;
  vi.restoreAllMocks();vi.unstubAllGlobals();
});
const check=(eq,x)=>window.__alloCASPure.balanceTrial(eq,x);
async function mount(patch={}) {
  let latest;const awardXP=vi.fn(),callGemini=vi.fn();
  function App(){const[state,setState]=React.useState({algebraCAS:{tab:'scale',scaleEq:'3x + 5 = 14',scaleTrialOpen:true,...patch}});latest=state;return window.StemLab._registry.algebraCAS.render(makeCtx({toolData:state,setToolData:setState,awardXP,callGemini}));}
  root=ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(()=>root.render(React.createElement(App)));
  return {state:()=>latest.algebraCAS,awardXP,callGemini};
}
const panel=()=>document.querySelector('[data-balance-trial]');
const result=()=>document.querySelector('[data-balance-trial-result]');
async function input(selector,value){const el=document.querySelector(selector);expect(el).toBeTruthy();await React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});return el;}
async function click(label){const el=[...document.querySelectorAll('button')].find(el=>{const copy=el.cloneNode(true);copy.querySelectorAll('[aria-hidden="true"]').forEach(node=>node.remove());return copy.textContent.trim()===label||el.getAttribute('aria-label')===label;});expect(el,label).toBeTruthy();await React.act(()=>el.click());}

describe('exact balance substitution',()=>{
  it('substitutes the same value everywhere and compares unequal sides',()=>{
    expect(check('3(x - 2) = x + 4','-1')).toMatchObject({ok:true,x:'-1',left:'-9',right:'3',difference:'-12',relation:'<',kind:'conditional',leftSubstitution:'3((-1)-2)',rightSubstitution:'(-1)+4'});
  });
  it('recognizes a fractional solution with exact decimal arithmetic',()=>{
    expect(check('3x + 0.1 = 1.1','1/3')).toMatchObject({ok:true,left:'11/10',right:'11/10',difference:'0',relation:'=',previousX:'-2/3',nextX:'4/3'});
  });
  it('does not round a tiny nonzero difference to equality',()=>{
    expect(check('x + 0.000000000000000001 = 1','1')).toMatchObject({relation:'>',difference:'1/1000000000000000000'});
  });
  it.each([
    ['2(x + 1) = 2x + 2','-3/2','identity','='],
    ['2(x + 1) = 2x + 3','-3/2','contradiction','<'],
    ['4 = 4','9','identity','='],
    ['4 = 5','9','contradiction','<']
  ])('classifies %s algebraically', (equation,x,kind,relation)=>expect(check(equation,x)).toMatchObject({ok:true,kind,relation}));
  it.each(['','1/0','0/0','x','Infinity','NaN','1/3junk','--2','2+3'])('rejects invalid trial input %s',x=>expect(check('x = 1',x)).toEqual({ok:false,reason:'value'}));
  it.each(['x^2 = 1','y = 2','2x + = 1','x = 1 = 2','x / x = 1'])('does not claim to check unsupported equation %s',eq=>expect(check(eq,'1')).toEqual({ok:false,reason:'equation'}));
  it('preserves exact values when the diagram cannot represent their numerical range',()=>{
    const trial=check('(10^100)*(10^100)*(10^100)*(10^100)x = 0','1');
    expect(trial.ok).toBe(true);expect(trial.relation).toBe('>');expect(trial.left.length).toBe(401);expect(trial.leftNumber).toBe(Infinity);
  });
});

describe('balance substitution interaction',()=>{
  it('waits for a check, supports Enter, and does not score or call AI',async()=>{
    const app=await mount();expect(result()).toBeNull();
    const field=await input('#balance-trial-x','3');
    await React.act(()=>field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(result().dataset.balanceTrialResult).toBe('=');
    expect(document.querySelector('[data-trial-substitution="left"]').textContent).toBe('3(3)+5 = 14');
    const square=document.querySelector('[data-trial-left-point]'),circle=document.querySelector('[data-trial-right-point]');
    expect(Number(square.getAttribute('x'))+7).toBe(Number(circle.getAttribute('cx')));
    expect(app.state().scaleEq).toBe('3x + 5 = 14');expect(app.state().scaleSolved).toBeUndefined();
    expect(app.awardXP).not.toHaveBeenCalled();expect(app.callGemini).not.toHaveBeenCalled();
  });
  it('clears a stale answer while a new value is being typed',async()=>{
    await mount({scaleTrialValue:'3',scaleTrialChecked:'3'});expect(result()).not.toBeNull();
    await input('#balance-trial-x','-');expect(result()).toBeNull();
    expect(panel().textContent).not.toContain('This value is a solution');
    await click('Check value');expect(document.querySelector('#balance-trial-x').getAttribute('aria-invalid')).toBe('true');
    expect(panel().textContent).toContain('nonzero denominator');expect(result()).toBeNull();
  });
  it('keeps x fixed while comparing a reversible step and still permits checks after solving',async()=>{
    const app=await mount({scaleTrialValue:'3',scaleTrialChecked:'3',scaleOpVal:'5'});
    await click('Subtract the entered value on both sides');
    expect(document.querySelector('[data-trial-operation-comparison]').textContent).toContain('Before: 14 = 14');
    expect(document.querySelector('[data-trial-operation-comparison]').textContent).toContain('After: 9 = 9');
    await input('input[aria-label="Value to apply to both sides"]','3');await click('Divide the entered value on both sides');
    expect(app.state().scaleSolved).toBe(true);expect(result().dataset.balanceTrialResult).toBe('=');
    await click('Test x + 1');expect(result().dataset.balanceTrialResult).toBe('>');
    expect(app.state().scaleEq).toBe('x = 3');expect(app.state().scaleTrialValue).toBe('4');
  });
  it('explains negative scaling without mistaking order reversal for a new solution',async()=>{
    await mount({scaleEq:'x + 2 = 5',scaleTrialValue:'0',scaleTrialChecked:'0',scaleOpVal:'-1'});
    await click('Multiply the entered value on both sides');
    const comparison=document.querySelector('[data-trial-operation-comparison]').textContent;
    expect(comparison).toContain('Before: 2 < 5');expect(comparison).toContain('After: -2 > -5');
    expect(comparison).toContain('neither equation true');expect(comparison).toContain('larger value switched');
    expect(document.querySelector('[data-trial-difference]').textContent).toBe('3');
  });
  it('steps fractions exactly and keeps the field and committed result together',async()=>{
    const app=await mount({scaleEq:'3x = 1',scaleTrialValue:'1/3',scaleTrialChecked:'1/3'});
    await click('Test x − 1');expect(app.state().scaleTrialValue).toBe('-2/3');expect(result().dataset.balanceTrialResult).toBe('<');
    await click('Test x + 1');expect(app.state().scaleTrialValue).toBe('1/3');expect(result().dataset.balanceTrialResult).toBe('=');
  });
  it('invalidates old checks and step comparisons when the equation is edited',async()=>{
    const app=await mount({scaleTrialValue:'3',scaleTrialChecked:'3',scalePreviousEq:'3x = 9'});
    await input('input[aria-label="Balance scale equation input"]','2x = 7');
    expect(result()).toBeNull();expect(app.state().scalePreviousEq).toBe('');expect(app.state().scaleTrialValue).toBe('3');
    await click('Check value');expect(result().dataset.balanceTrialResult).toBe('<');expect(document.querySelector('[data-trial-operation-comparison]')).toBeNull();
  });
  it('preserves a saved check when collapsed and keeps the disclosure target valid',async()=>{
    const app=await mount({scaleEq:'x + 1 = -1',scaleTrialValue:'-2',scaleTrialChecked:'-2'});
    await click('Test a value for x');expect(document.getElementById('balance-trial-content').hidden).toBe(true);
    expect(app.state().scaleTrialChecked).toBe('-2');
    await click('Test a value for x');expect(result().dataset.balanceTrialResult).toBe('=');
    expect(document.getElementById('balance-trial-x').value).toBe('-2');
  });
  it('explains identities and contradictions from their coefficients',async()=>{
    await mount({scaleEq:'2x + 1 = 2x + 1',scaleTrialValue:'0',scaleTrialChecked:'0'});
    expect(document.querySelector('[data-trial-generalization]').textContent).toContain('Every real x');
    await input('input[aria-label="Balance scale equation input"]','2x + 1 = 2x + 2');await click('Check value');
    expect(document.querySelector('[data-trial-generalization]').textContent).toContain('No value of x');
  });
  it('keeps exact results visible when a numerical plot is unavailable',async()=>{
    await mount({scaleEq:'(10^100)*(10^100)*(10^100)*(10^100)x = 0',scaleTrialValue:'1',scaleTrialChecked:'1'});
    expect(result().dataset.balanceTrialResult).toBe('>');expect(document.querySelector('[data-balance-trial-plot]')).toBeNull();
    expect(panel().textContent).toContain('outside the diagram');
  });
});
