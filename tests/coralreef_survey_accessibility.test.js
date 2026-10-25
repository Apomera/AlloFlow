import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act, source = readFileSync(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'utf8');
const functions = {};
function visit(n) { if (!n || typeof n !== 'object') return; if (n.type === 'FunctionDeclaration') functions[n.id.name] = source.slice(n.start,n.end); for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v); }
visit(parse(source,{ecmaVersion:'latest'}));
const reveal = new Function('return (' + functions.guideReveal + ')')();
const Dive3D = new Function('ensureReef3D','guideReveal','DiveLoading','btnStyle','cardStyle','mutedStyle','return (' + functions.Dive3D + ')')(
  () => ensure(), reveal, function Loading({env,label,value}) { return env.h('div',{'data-test-loading':value,role:'status'},label); }, () => ({}), () => ({}), () => ({}));
let ensure, engines, ready, mounted;
const button = (host,label) => [...host.querySelectorAll('button')].find(b=>b.textContent.trim()===label);
async function click(node) { expect(node).toBeTruthy(); await act(async()=>node.click()); }
beforeEach(()=>{
  mounted=[];engines=[];ready=true;ensure=()=>Promise.resolve({stub:true});
  window.Reef3D={mount(canvas,options) {
    let state={ready,pointIndex:0,paused:options.reducedMotion,reducedMotion:options.reducedMotion};
    const ctl={canvas,options,dispose:vi.fn(),getState:()=>state,lookCamera:vi.fn(),zoomCamera:vi.fn(),resetCamera:vi.fn(),
      emit(p) {state={...state,...p};options.onState(state);},
      goToPoint:vi.fn(i=>ctl.emit({pointIndex:i})),setPaused:vi.fn(p=>ctl.emit({paused:p})),
      setReducedMotion:vi.fn(value=>{if(value!==state.reducedMotion)ctl.emit({reducedMotion:value,paused:value||state.paused});})};
    engines.push(ctl);options.onState(state);return ctl;
  }};
});
afterEach(async()=>{while(mounted.length){const t=mounted.pop();await act(async()=>t.root.unmount());t.host.remove();}delete window.Reef3D;vi.restoreAllMocks();});
async function mountSurvey({reduce=false,pointIndex=5}={}) {
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host), layout={seed:47,points:Array.from({length:40},(_,i)=>({distanceM:i*0.5}))};
  let update, data;
  function Shell(){const [state,setState]=React.useState({reduce,pointIndex});update=p=>setState(s=>({...s,...p}));data=state;
    const env={React,h:React.createElement,P:{},ctx:{reduceMotion:state.reduce},t:(_,fallback)=>fallback,fill:(s,args)=>s.replace(/\{(\w+)\}/g,(_,k)=>args[k])};
    return React.createElement('div',null,React.createElement('button',{'data-outside':true},'Keep surveying'),React.createElement(Dive3D,{env,layout,pointIndex:state.pointIndex,onPoint:i=>update({pointIndex:i})}));}
  const t={host,root,layout,get data(){return data;},async update(p){await act(async()=>update(p));}};mounted.push(t);await act(async()=>root.render(React.createElement(Shell)));return t;
}

describe('survey camera accessibility and continuity',()=>{
  it('focuses a stable title, skips the unready canvas, and retains point synchronization',async()=>{
    ready=false;const t=await mountSurvey(),ctl=engines[0],title=t.host.querySelector('[data-survey-dive-title]');
    expect(document.activeElement).toBe(title);expect(ctl.canvas.tabIndex).toBe(-1);expect(ctl.canvas.getAttribute('aria-busy')).toBe('true');expect(t.data.pointIndex).toBe(5);
    await act(async()=>ctl.emit({ready:true}));expect(ctl.canvas.tabIndex).toBe(0);expect(ctl.canvas.getAttribute('aria-busy')).toBe('false');expect(document.activeElement).toBe(title);
    await act(async()=>ctl.emit({pointIndex:7}));expect(t.data.pointIndex).toBe(7);await t.update({pointIndex:8});expect(ctl.getState().pointIndex).toBe(8);expect(engines).toHaveLength(1);
  });
  it('offers named look, zoom, reset and pause controls without changing the survey point',async()=>{
    const t=await mountSurvey(),ctl=engines[0],area=t.host.querySelector('[data-survey-camera-controls]');area.open=true;
    await click(button(t.host,'Pause the reef'));expect(ctl.getState().paused).toBe(true);
    for(const [label,dx,dy] of [['Look left',-40,0],['Look right',40,0],['Look up',0,-40],['Look down',0,40]]){const b=button(area,label);b.focus();await click(b);expect(ctl.lookCamera).toHaveBeenLastCalledWith(dx,dy);expect(document.activeElement).toBe(b);}
    await click(button(area,'Zoom in'));expect(ctl.zoomCamera).toHaveBeenLastCalledWith(-0.18,undefined);await click(button(area,'Zoom out'));expect(ctl.zoomCamera).toHaveBeenLastCalledWith(0.18,undefined);
    await click(button(area,'Reset camera'));expect(ctl.resetCamera).toHaveBeenCalledTimes(1);expect(t.data.pointIndex).toBe(5);expect(ctl.getState().paused).toBe(true);
    await click(button(t.host,'Resume the reef'));expect(ctl.getState().paused).toBe(false);
  });
  it('keeps one status region and does not reannounce it for point or progress updates',async()=>{
    const t=await mountSurvey(),ctl=engines[0],region=t.host.querySelector('[data-survey-dive-status]'),changes=[];
    expect(region.getAttribute('role')).toBe('status');expect(region.textContent).toContain('Survey reef ready.');const observer=new MutationObserver(records=>changes.push(...records));observer.observe(region,{childList:true,characterData:true,subtree:true});
    await act(async()=>{ctl.emit({pointIndex:6});ctl.options.onProgress(0.8);});expect(changes).toHaveLength(0);
    await click(button(t.host,'Pause the reef'));expect(region.textContent).toContain('Survey reef paused.');expect(changes).toHaveLength(1);expect(t.host.querySelector('[data-survey-dive-status]')).toBe(region);observer.disconnect();
  });
  it.each(['canvas','control'])('recovers lost %s focus on error and returns retry focus to the same title',async target=>{
    const t=await mountSurvey(),ctl=engines[0],title=t.host.querySelector('[data-survey-dive-title]');
    if(target==='canvas')ctl.canvas.focus();else {t.host.querySelector('[data-survey-camera-controls]').open=true;button(t.host,'Look left').focus();}
    await act(async()=>ctl.options.onError(new Error('lost')));expect(document.activeElement).toBe(title);expect(ctl.canvas.tabIndex).toBe(-1);expect(ctl.dispose).toHaveBeenCalledTimes(1);
    const retry=button(t.host,'Try the 3D view again');retry.focus();await click(retry);expect(document.activeElement).toBe(title);expect(engines).toHaveLength(2);expect(t.data.pointIndex).toBe(5);
  });
  it('leaves unrelated focus alone when loading or rendering fails',async()=>{
    const t=await mountSurvey(),outside=t.host.querySelector('[data-outside]');outside.focus();await act(async()=>engines[0].options.onError(new Error('lost')));expect(document.activeElement).toBe(outside);expect(t.host.querySelector('[role="alert"]').textContent).toContain('keep surveying');
  });
  it('honors the latest motion preference after async loader resolution',async()=>{
    let release;ensure=()=>new Promise(resolve=>{release=resolve;});const t=await mountSurvey();await t.update({reduce:true});expect(engines).toHaveLength(0);
    await act(async()=>release({stub:true}));const ctl=engines[0];expect(ctl.options.reducedMotion).toBe(true);expect(ctl.getState().paused).toBe(true);expect(button(t.host,'Resume the reef').getAttribute('aria-disabled')).toBe('true');expect(t.data.pointIndex).toBe(5);
  });
  it.each([false,true])('pauses a live survey without remounting, including staged readiness %s',async staged=>{
    ready=!staged;const t=await mountSurvey(),ctl=engines[0];await t.update({reduce:true});expect(ctl.getState()).toMatchObject({reducedMotion:true,paused:true,pointIndex:5});expect(engines).toHaveLength(1);expect(ctl.dispose).not.toHaveBeenCalled();
    if(staged)await act(async()=>ctl.emit({ready:true}));const resume=button(t.host,'Resume the reef');expect(resume.getAttribute('aria-disabled')).toBe('true');expect(document.getElementById(resume.getAttribute('aria-describedby')).textContent).toContain('Reduce motion is on');
    await click(resume);expect(ctl.setPaused).not.toHaveBeenCalled();
    await t.update({reduce:false});expect(ctl.getState().paused).toBe(true);expect(resume.hasAttribute('aria-disabled')).toBe(false);expect(engines).toHaveLength(1);expect(t.data.pointIndex).toBe(5);
    await click(resume);expect(ctl.getState().paused).toBe(false);await t.update({pointIndex:10});expect(ctl.getState().paused).toBe(false);expect(ctl.getState().pointIndex).toBe(10);
  });
  it('retains pause-button focus when Reduce motion changes and prevents resume while enabled',async()=>{
    const t=await mountSurvey(),ctl=engines[0],pause=button(t.host,'Pause the reef');pause.focus();await t.update({reduce:true});expect(document.activeElement).toBe(pause);expect(pause.getAttribute('aria-disabled')).toBe('true');await click(pause);expect(ctl.setPaused).not.toHaveBeenCalled();expect(ctl.getState().paused).toBe(true);
  });
});
