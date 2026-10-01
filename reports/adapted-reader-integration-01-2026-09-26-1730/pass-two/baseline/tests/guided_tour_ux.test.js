import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
let React, ReactDOMClient, act, TourOverlay, root, container;
beforeAll(() => {
  const modules = resolve('desktop/web-app/node_modules');
  React = require(resolve(modules, 'react'));
  ReactDOMClient = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_misc_panels_module.js');
  TourOverlay = window.AlloModules.TourOverlay;
});
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = container = null; });
function mount(overrides = {}) {
  const next = vi.fn(), previous = vi.fn(), close = vi.fn();
  const props = { runTour: true, tourRect: {top:80,left:20,right:200,bottom:180,width:180,height:100},
    tourStep:0, tourSteps:[{title:'First',text:'First step.'},{title:'Second',text:'Last step.'}],
    t: key => ({'common.back':'Back','common.next':'Next','common.finish':'Finish','tour.exit':'Exit tour'}[key] || ''),
    handleNextTourStep:next,handlePrevTourStep:previous,handleSetRunTourToFalse:close,
    setRunTour:vi.fn(),setIsSpotlightMode:vi.fn(),setSpotlightMessage:vi.fn(),...overrides };
  container=document.createElement('form'); document.body.appendChild(container);
  root=ReactDOMClient.createRoot(container);
  act(()=>root.render(React.createElement(TourOverlay,props)));
  return {next,previous,close,props};
}
function shortcut() {
  const start=hostSource.indexOf('      const handleTourKeyDown = (e) => {');
  const end=hostSource.indexOf("      window.addEventListener('keydown', handleTourKeyDown)",start);
  const next=vi.fn(),previous=vi.fn(),close=vi.fn();
  const run=new Function('handleNextTourStep','handlePrevTourStep','handleSetRunTourToFalse','setRunTour',hostSource.slice(start,end)+'\nreturn handleTourKeyDown;')(next,previous,close,vi.fn());
  return {run,next,previous,close};
}
describe('Feature tour navigation',()=>{
  it('names Back, Next, Finish and Exit accurately without submitting forms',()=>{
    const h=mount({tourStep:1});
    const buttons=Array.from(container.querySelectorAll('button'));
    expect(buttons.map(b=>b.textContent.trim())).toEqual(['Exit tour','Back','Finish']);
    expect(buttons[1].getAttribute('aria-label')).toBe('Back');
    expect(buttons[2].getAttribute('aria-label')).toBe('Finish');
    expect(buttons.every(b=>b.type==='button')).toBe(true);
    act(()=>buttons[1].click());expect(h.previous).toHaveBeenCalledTimes(1);
    act(()=>buttons[2].click());expect(h.next).toHaveBeenCalledTimes(1);
  });
  it('closes once when Escape bubbles through the dialog',()=>{
    const h=mount(), keyboard=shortcut();
    window.addEventListener('keydown',keyboard.run);
    try {act(()=>container.querySelector('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true})));}
    finally{window.removeEventListener('keydown',keyboard.run);}
    expect(h.close).toHaveBeenCalledTimes(1);expect(keyboard.close).not.toHaveBeenCalled();
  });
  it('wraps keyboard focus within tour navigation',()=>{
    mount();const buttons=Array.from(container.querySelectorAll('button'));const last=buttons.at(-1);
    last.focus();act(()=>last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));
    expect(document.activeElement).toBe(buttons[0]);
  });
  it.each(['button','select','textarea','input','summary','a','div'])('preserves native shortcuts on %s',tag=>{
    const h=shortcut(),target=document.createElement(tag);
    if(tag==='a')target.href='#target';if(tag==='div')target.setAttribute('contenteditable','true');
    const preventDefault=vi.fn();h.run({target,code:'Space',preventDefault});h.run({target,code:'ArrowDown',preventDefault});
    expect(h.next).not.toHaveBeenCalled();expect(preventDefault).not.toHaveBeenCalled();
  });
  it('navigates from the tour surface and ignores modified or already-handled events',()=>{
    const h=shortcut(),target=document.createElement('div'),preventDefault=vi.fn();
    h.run({target,code:'ArrowRight',preventDefault});h.run({target,code:'ArrowLeft',preventDefault});
    expect(h.next).toHaveBeenCalledTimes(1);expect(h.previous).toHaveBeenCalledTimes(1);
    for(const flag of ['defaultPrevented','isComposing','altKey','ctrlKey','metaKey'])h.run({target,code:'ArrowRight',[flag]:true,preventDefault});
    expect(h.next).toHaveBeenCalledTimes(1);
  });
  it('allows Escape from an editing control',()=>{
    const h=shortcut();h.run({target:document.createElement('select'),code:'Escape',preventDefault:vi.fn()});expect(h.close).toHaveBeenCalledTimes(1);
  });
});
describe('Current feature tour content and anchors',()=>{
  it('introduces Guided Mode with a current entry point and reviewed delivery workflow',()=>{
    const start=hostSource.indexOf('const tourSteps = [');const end=hostSource.indexOf('\n  ];',start);
    const steps=new Function('t',hostSource.slice(start,end+5)+'\nreturn tourSteps;')(key=>key.split('.').reduce((v,k)=>v?.[k],strings));
    expect(new Set(steps.map(s=>s.id)).size).toBe(steps.length);
    expect(steps.every(s=>s.title?.trim()&&s.text?.trim())).toBe(true);
    expect(steps[0].helpKey).toBe('header_rerun_wizard');
    expect(steps[0].text).toContain('Document Builder');
    expect(steps.find(s=>s.id==='tour-tool-directions').text).toContain('Draft for me');
    expect(steps.find(s=>s.id==='tour-upload-source').text).toContain('unresolved issues');
  });
  it('resolves the visible Start & setup control when the desktop copy is hidden',()=>{
    const start=hostSource.indexOf('  const _resolveTourEl = (step) => {');const end=hostSource.indexOf('\n  // The pipeline guided tours',start);
    const resolveTarget=new Function(hostSource.slice(start,end)+'\nreturn _resolveTourEl;')();
    container=document.createElement('div');container.innerHTML='<button data-help-key="header_rerun_wizard" hidden>Desktop</button><button data-help-key="header_rerun_wizard">Mobile</button>';document.body.appendChild(container);
    const visible=container.lastChild;visible.getClientRects=()=>[{}];
    expect(resolveTarget({helpKey:'header_rerun_wizard'})).toBe(visible);
    expect(resolveTarget({helpKey:'missing'})).toBeNull();
  });
});

describe('Tour navigation across unavailable targets', () => {
  function navigation(steps, current, direction = 1, toolMap = {}) {
    const slice = (a,b) => hostSource.slice(hostSource.indexOf(a), hostSource.indexOf(b,hostSource.indexOf(a)));
    const context = { current: {} }, travel = { current: direction };
    const target = { scrollIntoView:vi.fn(),getBoundingClientRect:()=>({top:80,left:20,right:200,bottom:180,width:180,height:100}) };
    const resolveTarget = vi.fn(step=>step.visible ? target : null);
    const setStep=vi.fn(),setRunning=vi.fn(),setCustom=vi.fn(),setRect=vi.fn();
    const api = new Function('ctx', `
      const {steps:tourSteps,current:tourStep,context:_tourRunContextRef,travel:_tourTravelDirectionRef,resolveTarget:_resolveTourEl,setStep:setTourStep,setRunning:setRunTour,setCustom:setCustomTourSteps,setRect:setTourRect,toolMap:DOM_TO_TOOL_ID_MAP}=ctx;
      const runTour=true,spotlightMessage=null,customTourSteps=null,alloBotRef={current:null};
      const useCallback=fn=>fn;
      ${slice('  const _findTourStepIndex =','  const updateTourMetrics =')}
      ${slice('  const updateTourMetrics =','  const ensureToolVisible =')}
      ${slice('  const handleNextTourStep =','  useEffect(() => {\n      if (!runTour) return;')}
      return {next:handleNextTourStep,previous:handlePrevTourStep,measure:updateTourMetrics,find:_findTourStepIndex};
    `)({steps,current,context,travel,resolveTarget,setStep,setRunning,setCustom,setRect,toolMap});
    return {...api,context,travel,resolveTarget,setStep,setRunning,setCustom,setRect};
  }
  const steps=[{id:'first',visible:true},{id:'missing'},{id:'last',visible:true}];
  it('Back crosses an unavailable step without bouncing forward again',()=>{
    const h=navigation(steps,2);h.previous();expect(h.setStep).toHaveBeenCalledWith(0);expect(h.travel.current).toBe(-1);
  });
  it('Next crosses an unavailable step',()=>{
    const h=navigation(steps,0);h.next();expect(h.setStep).toHaveBeenCalledWith(2);
  });
  it('finishes when no later target can be reached',()=>{
    const h=navigation([{id:'first',visible:true},{id:'missing'}],0);h.next();expect(h.setRunning).toHaveBeenCalledWith(false);expect(h.setStep).toHaveBeenCalledWith(0);
  });
  it('does not move before the first available target',()=>{
    const h=navigation([{id:'missing'},{id:'visible',visible:true}],1);h.previous();expect(h.setStep).not.toHaveBeenCalled();expect(h.setRunning).not.toHaveBeenCalled();
  });
  it('preserves custom steps that reveal their target on entry',()=>{
    const onEnter=vi.fn(),h=navigation([{id:'first',visible:true},{id:'modal-target',onEnter}],0);h.next();expect(h.setStep).toHaveBeenCalledWith(1);expect(onEnter).not.toHaveBeenCalled();
  });
  it('preserves History and tool steps that the host reveals',()=>{
    const h=navigation([{id:'first',visible:true},{id:'tool'},{id:'tour-history-panel'}],0,1,{tool:'quiz'});
    expect(h.find([{id:'first',visible:true},{id:'tool'}],0,1)).toBe(1);
    expect(h.find([{id:'first',visible:true},{id:'tour-history-panel'}],0,1)).toBe(1);
  });
  it.each([-1,1])('keeps direction %s if a revealed target is still unavailable',direction=>{
    vi.useFakeTimers();try{const h=navigation(steps,1,direction);h.measure();vi.runAllTimers();expect(h.setStep).toHaveBeenCalledWith(direction===-1?0:2);}finally{vi.useRealTimers();}
  });
  it('ignores a delayed measurement after the tour or step changes',()=>{
    vi.useFakeTimers();try{const h=navigation(steps,1);h.measure();h.context.current={};vi.runAllTimers();expect(h.resolveTarget).not.toHaveBeenCalled();expect(h.setStep).not.toHaveBeenCalled();expect(h.setRect).not.toHaveBeenCalled();}finally{vi.useRealTimers();}
  });
  it('still measures the current tour target',()=>{
    vi.useFakeTimers();try{const h=navigation(steps,0);h.measure();vi.runAllTimers();expect(h.setRect).toHaveBeenCalledTimes(1);expect(h.setStep).not.toHaveBeenCalled();}finally{vi.useRealTimers();}
  });
  it('disables Back and names Finish when unavailable endpoints are omitted',()=>{
    mount({tourStep:1,canGoBack:false,canGoForward:false});
    expect(container.querySelector('button[aria-label="Back"]').disabled).toBe(true);
    expect(container.querySelector('button[aria-label="Finish"]')).toBeTruthy();
  });
});
