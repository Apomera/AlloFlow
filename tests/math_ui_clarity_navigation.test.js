import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  resetStemLab(); document.body.innerHTML='<div id="root"></div>';
});
afterEach(async () => { if(root) await React.act(()=>root.unmount()); root=null; vi.unstubAllGlobals(); });
async function mount(file,id,key,patch={}) {
  loadTool('stem_lab/stem_tool_'+file+'.js',id);
  let latest;
  function App() {
    const [state,setState]=React.useState({[key]:patch}); latest=state[key];
    return window.StemLab._registry[id].render(makeCtx({toolData:state,setToolData:setState}));
  }
  root=ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(()=>root.render(React.createElement(App)));
  return ()=>latest;
}
async function click(el) { expect(el).toBeTruthy(); await React.act(()=>el.click()); }
async function press(el,key,extra={}) { await React.act(()=>el.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}))); }
const moneyTabs=()=>[...document.querySelectorAll('#money-activity-list [role="tab"]')];
const moneyMore=()=>document.querySelector('[data-money-more-activities]');

describe('math tool UI clarity',()=>{
  it('preserves access to all ten Money Math activities',async()=>{
    await mount('money','moneyMath','_moneyMath');
    expect(moneyTabs()).toHaveLength(4);
    await click(moneyMore()); expect(moneyMore().getAttribute('aria-expanded')).toBe('true');
    expect(moneyTabs()).toHaveLength(10);
    for(const id of moneyTabs().map(el=>el.id)) {
      await click(document.getElementById(id));
      expect(document.getElementById(id).getAttribute('aria-selected')).toBe('true');
      const panel=document.getElementById('money-tool-panel');
      expect(panel.getAttribute('aria-labelledby')).toBe(id);
      expect(panel.textContent.trim().length).toBeGreaterThan(10);
    }
  });
  it('keeps a restored secondary activity visible without clearing the board or budget',async()=>{
    const state=await mount('money','moneyMath','_moneyMath',{tab:'budget',currency:'EUR',placed:[{id:'eur-c1',name:'1 cent',value:.01}],budgetIncomeDraft:'1250',finSub:'loan'});
    expect(moneyTabs()).toHaveLength(5);
    await click(moneyMore()); await click(moneyMore());
    expect(document.getElementById('money-tool-tab-budget').getAttribute('aria-selected')).toBe('true');
    expect(state()).toMatchObject({tab:'budget',currency:'EUR',placed:[{id:'eur-c1',name:'1 cent',value:.01}],budgetIncomeDraft:'1250',finSub:'loan'});
  });
  it('uses the visible Money Math list for arrow, Home, and End navigation',async()=>{
    await mount('money','moneyMath','_moneyMath');
    await press(moneyTabs()[0],'End');
    expect(document.activeElement.id).toBe('money-tool-tab-store');
    await press(document.activeElement,'ArrowRight');
    expect(document.activeElement.id).toBe('money-tool-tab-coins');
    await click(moneyMore()); await press(moneyTabs()[0],'End');
    expect(document.activeElement.id).toBe('money-tool-tab-inquiry');
    await click(moneyMore());
    expect(document.getElementById('money-tool-tab-inquiry')).toBeTruthy();
    await press(document.getElementById('money-tool-tab-inquiry'),'Home');
    expect(document.activeElement.id).toBe('money-tool-tab-coins');
  });
  it('makes the fifth Unit Converter activity reachable with its advertised shortcut',async()=>{
    const state=await mount('unitconvert','unitConvert','unitConvert',{category:'length',fromUnit:'m',toUnit:'cm',value:3});
    const tab=document.getElementById('stem-unitconvert-tab-convert');
    await press(tab,'5');
    expect(state().tab).toBe('magHunt');
    expect(document.getElementById('stem-unitconvert-tab-magHunt').textContent).toBe('Compare scales');
    await press(document.getElementById('stem-unitconvert-tab-magHunt'),'1');
    expect(state()).toMatchObject({tab:'convert',fromUnit:'m',toUnit:'cm',value:3});
  });
  it('leaves modified shortcuts and editable fields alone in Unit Converter',async()=>{
    const state=await mount('unitconvert','unitConvert','unitConvert',{tab:'convert'});
    const tab=document.getElementById('stem-unitconvert-tab-convert');
    for(const modifier of ['ctrlKey','altKey','metaKey']) await press(tab,'5',{[modifier]:true});
    const input=document.querySelector('#root input');
    expect(input).toBeTruthy(); await press(input,'5');
    expect(state().tab).toBe('convert');
    await press(tab,'End');
    expect(document.activeElement.id).toBe('stem-unitconvert-tab-magHunt');
  });
});


it('keeps all nine measurement categories available and reports the current selection',async()=>{
  const state=await mount('unitconvert','unitConvert','unitConvert',{category:'length'});
  const picker=document.querySelector('[data-unit-category-picker]');
  expect(picker.open).toBe(false);
  expect(picker.querySelector('summary').textContent).toContain('Length');
  await click(picker.querySelector('summary'));
  expect(picker.open).toBe(true);
  const choices=[...picker.querySelectorAll('button')];
  expect(choices).toHaveLength(9);
  await click(choices.find(button=>button.textContent.includes('Temp')));
  expect(state().category).toBe('temperature');
  expect(picker.querySelector('summary').textContent).toContain('Temp');
});
