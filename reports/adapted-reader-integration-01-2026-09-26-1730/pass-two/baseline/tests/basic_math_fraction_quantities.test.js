import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(()=>{
  const drawing=new Proxy({}, {get:(target,key)=>key in target?target[key]:(key==='createRadialGradient'||key==='createLinearGradient')?()=>({addColorStop(){}}):key==='measureText'?()=>({width:20}):()=>{}});
  vi.spyOn(window.HTMLCanvasElement.prototype,'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  resetStemLab();document.body.innerHTML='<div id="root"></div>';
  loadTool('stem_lab/stem_tool_fractions.js','fractionViz');window.__fracTabTracked=true;
});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;vi.restoreAllMocks();vi.unstubAllGlobals();});
const model=(...args)=>window.__FractionsCore.buildFractionQuantityModel(...args);
async function mount(patch={}){
  let latest;const awardXP=vi.fn(),callGemini=vi.fn();
  function App(){const[state,setState]=React.useState({_fractions:{navMode:'practice',tab:'operations',num1:3,den1:4,num2:1,den2:2,opMode:'mul',...patch}});latest=state;return window.StemLab._registry.fractionViz.render(makeCtx({toolData:state,setToolData:setState,awardXP,callGemini}));}
  root=ReactDOMClient.createRoot(document.getElementById('root'));await React.act(()=>root.render(React.createElement(App)));
  return {state:()=>latest._fractions,awardXP,callGemini};
}
const panel=()=>document.querySelector('[data-fraction-operations]');
async function click(label){const el=[...panel().querySelectorAll('button')].find(el=>el.textContent.trim()===label||el.getAttribute('aria-label')===label);expect(el,label).toBeTruthy();await React.act(()=>el.click());}
async function check(selector){const el=panel().querySelector(selector);expect(el).toBeTruthy();await React.act(()=>el.click());}
async function enter(label,value){const el=panel().querySelector('input[aria-label="'+label+'"]');expect(el).toBeTruthy();await React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});return el;}

describe('fraction quantity models',()=>{
  it.each([
    [3,4,1,2,3,8,4,2],
    [7,4,3,2,21,8,7,3],
    [20,1,20,1,400,1,20,20],
    [0,4,3,2,0,8,4,3]
  ])('represents every product piece for %i/%i × %i/%i',(a,b,c,d,pieces,den,rows,columns)=>expect(model('mul',a,b,c,d)).toMatchObject({ok:true,selectedCells:pieces,cellDenominator:den,rows,columns}));
  it('distinguishes leftover quantity from the fraction of a group',()=>{
    expect(model('div',7,4,3,4)).toMatchObject({ok:true,fullGroups:2,remainderQuantity:[1,4],partialGroup:[1,3],result:[7,3],groupSteps:3,availablePieces:7,piecesPerGroup:3});
  });
  it('uses common pieces for unlike denominators and a quotient below one',()=>{
    expect(model('div',1,2,3,4)).toMatchObject({commonDenominator:4,availablePieces:2,piecesPerGroup:3,fullGroups:0,partialGroup:[2,3],result:[2,3],groupSteps:1});
  });
  it('handles exact groups, zero amounts, and many small groups',()=>{
    expect(model('div',3,2,1,4)).toMatchObject({fullGroups:6,remainderPieces:0,groupSteps:6,result:[6,1]});
    expect(model('div',0,3,2,5)).toMatchObject({fullGroups:0,groupSteps:0,result:[0,1],relation:'equal'});
    expect(model('div',20,1,1,20)).toMatchObject({fullGroups:400,groupSteps:400,result:[400,1]});
  });
  it.each([['mul',3,4,1,2,'smaller'],['div',3,4,1,2,'larger'],['mul',3,4,3,2,'larger'],['div',3,4,3,2,'smaller'],['mul',3,4,2,2,'equal'],['div',0,4,3,2,'equal']])('compares %s with its first operand exactly',(op,a,b,c,d,relation)=>expect(model(op,a,b,c,d).relation).toBe(relation));
  it.each([['div',1,2,0,3,'zero'],['mul',-1,2,1,3,'range'],['mul',1,0,1,3,'range'],['mul',1,21,1,3,'range'],['mul',1.5,2,1,3,'range']])('withholds unsupported model %s %s/%s, %s/%s',(op,a,b,c,d,reason)=>expect(model(op,a,b,c,d)).toEqual({ok:false,reason}));
});

describe('fraction multiplication and division interaction',()=>{
  it('shows all improper-product pieces and retains a one-square-unit reference',async()=>{
    await mount({num1:7,den1:4,num2:3,den2:2});
    expect(panel().querySelectorAll('[data-product-piece="selected"]')).toHaveLength(21);
    expect(panel().querySelector('[data-product-piece-count]').textContent).toBe('21 × 1/8 = 21/8');
    const unit=panel().querySelector('[data-product-unit]');expect(unit.getAttribute('width')).toBe(unit.getAttribute('height'));
    expect(panel().textContent).toContain('can extend beyond one whole');
  });
  it('withholds every result representation until the optional magnitude prediction is checked',async()=>{
    const app=await mount();await check('input[type="checkbox"]');
    expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();
    expect(panel().textContent).not.toContain('3/8');expect(panel().textContent).not.toContain('Multiply straight across');
    await check('input[name="fraction-magnitude"][value="smaller"]');await click('Check prediction');
    expect(panel().querySelector('[data-fraction-magnitude-feedback]').textContent).toContain('Prediction confirmed');
    expect(panel().querySelector('[data-fraction-product-model]')).not.toBeNull();
    expect(app.awardXP).not.toHaveBeenCalled();expect(app.callGemini).not.toHaveBeenCalled();
  });
  it('offers a worked reveal without awarding or inventing a prediction',async()=>{
    const app=await mount({opMode:'div',opMagnitudePredict:true});await click('Reveal worked model');
    expect(panel().querySelector('[data-fraction-magnitude-feedback]').textContent).toContain('Larger than A');
    expect(panel().querySelector('[data-fraction-magnitude-feedback]').textContent).not.toContain('confirmed');
    expect(app.state().opMagnitudeChecked.choice).toBeNull();expect(app.awardXP).not.toHaveBeenCalled();
  });
  it('connects division leftovers to a fraction of the group and checks the inverse',async()=>{
    await mount({num1:7,den1:4,num2:3,den2:4,opMode:'div'});
    const partial=panel().querySelector('[data-division-partial]');expect(partial.dataset.divisionPartial).toBe('1/3');
    expect(partial.textContent).toContain('1/4 units remain');
    expect(panel().querySelector('[data-division-conclusion]').textContent).toContain('7/4 ÷ 3/4 = 2 + 1/3 = 7/3');
    expect(panel().textContent).toContain('7/3 × 3/4 = 7/4');
  });
  it('supports a bounded grouping walkthrough with explicit ungrouped quantity',async()=>{
    const app=await mount({num1:7,den1:4,num2:3,den2:4,opMode:'div'});await click('Start grouping');
    expect(panel().querySelector('[data-division-progress]').textContent).toContain('Amount still ungrouped: 7/4');
    expect(panel().querySelector('[data-division-conclusion]')).toBeNull();
    await click('Next group');expect(panel().querySelector('[data-division-progress]').textContent).toContain('Amount still ungrouped: 1');
    await click('Next group');expect(panel().querySelector('[data-division-progress]').textContent).toContain('Amount still ungrouped: 1/4');
    expect(panel().querySelector('[data-division-partial]')).toBeNull();
    await click('Next group');expect(panel().querySelector('[data-division-partial]')).not.toBeNull();
    expect(panel().querySelector('[data-division-progress]').textContent).toContain('Amount still ungrouped: 0');
    await click('Previous group');expect(app.state().opGrouping.step).toBe(2);expect(panel().querySelector('[data-division-partial]')).toBeNull();
    await click('Show all groups');expect(app.state().opGrouping.step).toBe(3);expect(app.awardXP).not.toHaveBeenCalled();
  });
  it('keeps large group counts explicit without creating hundreds of group cards',async()=>{
    await mount({num1:20,den1:1,num2:1,den2:20,opMode:'div'});
    expect(panel().querySelectorAll('[data-division-group]')).toHaveLength(8);
    expect(panel().querySelector('[data-division-omitted]').dataset.divisionOmitted).toBe('392');
    expect(panel().querySelector('[data-division-progress]').textContent).toContain('Full groups counted: 400');
  });
  it('treats zero dividend as zero groups and zero divisor as undefined',async()=>{
    await mount({num1:0,den1:2,num2:1,den2:3,opMode:'div'});
    expect(panel().querySelector('[data-division-conclusion]').textContent).toContain('quotient is zero');
    expect(panel().querySelectorAll('[data-division-group="empty"]')).toHaveLength(1);
    await enter('Fraction B numerator','0');expect(panel().querySelector('[data-fraction-division-model]')).toBeNull();
    expect(panel().textContent).toContain('Division by 0 is undefined');
  });
  it('retains incomplete, decimal, and out-of-range drafts without showing stale answers',async()=>{
    const app=await mount();await enter('Fraction A numerator','');
    expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();expect(app.state().num1).toBe(3);
    await enter('Fraction B denominator','25');await enter('Fraction A numerator','2');
    expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();
    expect(panel().querySelector('input[aria-label="Fraction B denominator"]').value).toBe('25');
    await enter('Fraction B denominator','3');expect(panel().querySelector('[data-product-piece-count]').textContent).toContain('2 × 1/12');
    await enter('Fraction A numerator','1.5');expect(app.state().num1).toBe(2);expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();
    await enter('Fraction A numerator','2.0');expect(panel().querySelector('[data-fraction-product-model]')).not.toBeNull();
    await enter('Fraction A numerator','1e1');expect(app.state().num1).toBe(10);expect(panel().querySelector('[data-product-piece-count]').dataset.productPieceCount).toBe('10');
  });
  it('restarts prediction and grouping context when operands or operation change',async()=>{
    const app=await mount({opMode:'div',opMagnitudePredict:true});await click('Reveal worked model');await click('Start grouping');
    await enter('Fraction A numerator','2');expect(app.state().opMagnitudeChecked).toBeNull();expect(app.state().opGrouping).toBeNull();
    expect(panel().querySelector('[data-fraction-division-model]')).toBeNull();await click('Reveal worked model');await click('Multiply');
    expect(app.state().opMagnitudeChecked).toBeNull();expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();
  });
  it('keeps signed prediction separate from the unsigned quantity activity',async()=>{
    await mount({opMagnitudePredict:true});await click('Signed fraction mode');
    expect(panel().querySelector('[data-fraction-prediction]')).toBeNull();expect(panel().textContent).toContain('Sign Detective: predict the result');
    expect(panel().textContent).toContain('Predict the sign before revealing');expect(panel().querySelector('[data-fraction-product-model]')).toBeNull();
  });
});
