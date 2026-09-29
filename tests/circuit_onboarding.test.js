import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const {act}=React;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;

describe('Circuit first-use guide',()=>{
  let root,host,config,latest,seed,frames,scrollOriginal;
  const guide=()=>host.querySelector('.circuit-start-guide');
  const button=text=>Array.from(host.querySelectorAll('button')).find(b=>b.textContent===text);
  function Harness({locale=''}){
    const [toolData,setToolData]=React.useState(seed);
    latest=toolData;
    return config.render(makeCtx({toolData,setToolData,t:(_key,fallback)=>locale+fallback}));
  }
  const render=async(locale='')=>{await act(async()=>root.render(React.createElement(Harness,{locale})));};
  const click=async(text)=>{await act(async()=>button(text).click());await act(async()=>{frames.splice(0).forEach(fn=>fn(0));});};
  beforeEach(()=>{
    const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:0})},{get:(obj,key)=>obj[key]||(()=>{})});
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context);
    frames=[];vi.stubGlobal('requestAnimationFrame',fn=>{frames.push(fn);return frames.length;});
    scrollOriginal=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=vi.fn();
    resetStemLab();config=loadTool('stem_lab/stem_tool_circuit.js','circuit');
    seed={_circuit:{pauseMotion:true,components:[]},_circuitNetwork:{reflection:'Keep the network'}};
    host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
  });
  afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();if(scrollOriginal)Element.prototype.scrollIntoView=scrollOriginal;else delete Element.prototype.scrollIntoView;});

  it('shows a three-step invitation on a new empty bench without loading a design or moving focus',async()=>{
    await render();expect(guide().open).toBe(true);expect(guide().querySelectorAll('li')).toHaveLength(3);
    expect(latest._circuit.components).toEqual([]);expect(latest._circuit.undo).toBeUndefined();
    expect(host.contains(document.activeElement)).toBe(false);
  });
  it('keeps the guide compact for existing builds and makes starting the bulb experiment undoable',async()=>{
    seed._circuit={pauseMotion:true,mode:'parallel',voltage:7,components:[{id:40,type:'resistor',value:470}],prediction:'Keep my notes'};
    await render();expect(guide().open).toBe(false);
    await act(async()=>{guide().open=true;guide().dispatchEvent(new Event('toggle'));});
    expect(latest._circuit.voltage).toBe(7);
    await click('Start with a bulb');
    expect(latest._circuit).toMatchObject({voltage:9,mode:'series',lessonId:'loop',lessonOpen:true,startGuideOpen:false,prediction:'Keep my notes'});
    expect(latest._circuit.components.map(p=>p.type)).toEqual(['bulb','switch']);
    expect(latest._circuit.components[1].closed).toBe(false);
    expect(latest._circuit.undo).toHaveLength(1);
    expect(document.activeElement).toBe(host.querySelector('#circuit-lesson-question'));
    await click('Undo');
    expect(latest._circuit).toMatchObject({mode:'parallel',voltage:7,components:[{id:40,type:'resistor',value:470}],prediction:'Keep my notes'});
    expect(latest._circuitNetwork.reflection).toBe('Keep the network');
  });
  it('resumes the current lesson without changing the live circuit or its explanation',async()=>{
    seed._circuit={pauseMotion:true,startGuideOpen:true,lessonId:'paths',lessonOpen:false,lessonExplanation:'Two paths add their current.',voltage:14,components:[{id:73,type:'resistor',value:210}],undo:[]};
    await render();const parts=latest._circuit.components;
    await click('Resume my experiment');
    expect(latest._circuit.components).toBe(parts);expect(latest._circuit.voltage).toBe(14);
    expect(latest._circuit.undo).toEqual([]);expect(latest._circuit.lessonExplanation).toBe('Two paths add their current.');
    expect(latest._circuit.lessonOpen).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#circuit-lesson-question'));
  });
  it('lets a learner build freely, keeps the dismissal, and can be reopened',async()=>{
    await render();await click('Build on my own');
    expect(guide().open).toBe(false);expect(latest._circuit.startGuideOpen).toBe(false);
    expect(document.activeElement.id).toBe('circuit-parts-heading');expect(latest._circuit.components).toEqual([]);
    await render();expect(guide().open).toBe(false);
    await act(async()=>{guide().open=true;guide().dispatchEvent(new Event('toggle'));});
    expect(latest._circuit.startGuideOpen).toBe(true);
    expect(latest._circuit.undo).toBeUndefined();
  });
  it('updates the guide language without resetting its saved open state or the circuit',async()=>{
    await render('EN: ');expect(guide().textContent).toContain('EN: Start with a bulb');
    await click('EN: Build on my own');
    await render('FR: ');expect(guide().querySelector('summary').textContent).toContain('FR: Quick start & controls');
    expect(guide().open).toBe(false);expect(latest._circuit.components).toEqual([]);
  });
});
