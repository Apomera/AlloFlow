import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted=[];
let scroll,media,oldScroll;
beforeEach(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','coralReef');scroll=vi.fn();vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addListener(){},removeListener(){}})));media=window.matchMedia;oldScroll=Object.getOwnPropertyDescriptor(Element.prototype,'scrollIntoView');Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,writable:true,value:scroll});});
afterEach(async()=>{while(mounted.length){const t=mounted.pop();await React.act(async()=>t.root.unmount());t.host.remove();}if(oldScroll)Object.defineProperty(Element.prototype,'scrollIntoView',oldScroll);else delete Element.prototype.scrollIntoView;vi.restoreAllMocks();vi.unstubAllGlobals();});
async function click(el){expect(el,'control exists').toBeTruthy();await React.act(async()=>{el.focus();el.click();await Promise.resolve();});}
async function mount(reduceMotion=false){let data={coralReef:{section:'guide',speciesBookmarks:{clownfish:true,blue_tang:true},speciesFieldNotes:{clownfish:'Preserve note'},speciesLog:{green_turtle:{firstSeen:1}}}};const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.coralReef;
function Shell(){const[state,setState]=React.useState(data);data=state;return cfg.render({React,toolData:state,setToolData:setState,t:(key,fallback)=>fallback||key,reduceMotion});}const t={host,root,get data(){return data.coralReef;}};mounted.push(t);await React.act(async()=>root.render(React.createElement(Shell)));await click(host.querySelector('[data-start-practice]'));const select=host.querySelector('[data-practice-collection-select]');await React.act(async()=>{select.value='saved';select.dispatchEvent(new Event('change',{bubbles:true}));});scroll.mockClear();return t;}
const heading=t=>t.host.querySelector('.cr-dxp-heading');
const revealCalls=t=>scroll.mock.contexts.map((node,i)=>({node,args:scroll.mock.calls[i]})).filter(call=>call.node===heading(t));
async function answerAndNext(t){await click(t.host.querySelector('[data-practice-skip]'));await click(t.host.querySelector('[data-practice-next]'));}
describe('practice question transitions keep the next observation in view',()=>{
  it.each([[false,false,'smooth'],[true,false,'auto'],[false,true,'auto']])('reveals start/next/completion/retry with host reduce=%s system reduce=%s',async(hostReduce,systemReduce,behavior)=>{
    const t=await mount(hostReduce);media.mockReturnValue({matches:systemReduce});
    await click(t.host.querySelector('[data-practice-start]'));expect(revealCalls(t)).toHaveLength(1);expect(scroll).toHaveBeenLastCalledWith({block:'start',behavior});expect(document.activeElement).toBe(heading(t));
    scroll.mockClear();await answerAndNext(t);expect(heading(t).textContent).toBe('Organism 2 of 2');expect(revealCalls(t)).toHaveLength(1);expect(scroll).toHaveBeenLastCalledWith({block:'start',behavior});expect(document.activeElement).toBe(heading(t));
    scroll.mockClear();await answerAndNext(t);expect(t.host.querySelector('[data-marine-practice="complete"]')).toBeTruthy();expect(revealCalls(t)).toHaveLength(1);expect(scroll).toHaveBeenLastCalledWith({block:'start',behavior});
    scroll.mockClear();await click(t.host.querySelector('[data-practice-second-look]'));expect(heading(t).textContent).toBe('Organism 1 of 2');expect(revealCalls(t)).toHaveLength(1);expect(t.host.querySelector('[data-practice-feedback]')).toBeNull();
    expect(t.data.speciesPractice).toMatchObject({rounds:1,answered:0,correct:0,last:{total:2,skipped:2,hinted:0}});expect(t.data.speciesFieldNotes).toEqual({clownfish:'Preserve note'});expect(t.data.speciesLog).toEqual({green_turtle:{firstSeen:1}});
  });
  it('does not reveal a new question on answer, zoom, help, or a same-question profile return',async()=>{
    const t=await mount();await click(t.host.querySelector('[data-practice-start]'));scroll.mockClear();await click(t.host.querySelector('[data-practice-zoom="in"]'));expect(revealCalls(t)).toHaveLength(0);
    await click(t.host.querySelector('[data-practice-compare-toggle]'));expect(revealCalls(t)).toHaveLength(0);await click(t.host.querySelector('[data-practice-comparison-close]'));
    await click(t.host.querySelector('[data-practice-skip]'));expect(revealCalls(t)).toHaveLength(0);const text=t.host.querySelector('[data-practice-feedback]').textContent;
    const study=[...t.host.querySelectorAll('button')].find(b=>b.textContent==='Study profile');await click(study);await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,35));});scroll.mockClear();await click(t.host.querySelector('[data-close-profile]'));
    expect(revealCalls(t)).toHaveLength(0);expect(document.activeElement).toBe(t.host.querySelector('[data-practice-feedback]'));expect(t.host.querySelector('[data-practice-feedback]').textContent).toBe(text);expect(t.host.querySelector('[data-practice-scale="1.25"]')).toBeTruthy();expect(t.data.speciesPractice).toBeUndefined();
  });
});
