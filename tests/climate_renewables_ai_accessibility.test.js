import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const { act }=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers=[];
let frames;
function deferred() {
  let resolve,reject;
  const promise=new Promise((done,fail)=>{resolve=done;reject=fail;});
  return {promise,resolve,reject};
}
function mountTool(path,helper,seed={},gradeLevel='8th Grade') {
  resetStemLab(); const config=loadTool(path,'climateExplorer');
  const host=document.createElement('div'); document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),award=vi.fn();
  let current,patch,mounted=true,writes=0;
  function Host() {
    const [data,setData]=React.useState({climateExplorer:{tab:'renewables',heroMotionPaused:true,...seed}});
    current=data.climateExplorer;
    patch=value=>setData(previous=>({...previous,climateExplorer:{...previous.climateExplorer,...value}}));
    return config.render(makeCtx({toolData:data,setToolData:updater=>{writes++;setData(updater);},callGemini:helper,gradeLevel,awardXP:award}));
  }
  act(()=>root.render(React.createElement(Host)));
  const unmount=()=>{if(mounted){act(()=>root.unmount());host.remove();mounted=false;}};
  disposers.push(unmount);
  return {host,award,unmount,state:()=>current,writes:()=>writes,patch:value=>act(()=>patch(value)),one:selector=>host.querySelector(selector)};
}
async function settle() {
  await act(async()=>{await Promise.resolve();await Promise.resolve();vi.runOnlyPendingTimers();});
  await act(async()=>{frames.splice(0).forEach(callback=>callback(16));await Promise.resolve();});
  await act(async()=>{vi.runOnlyPendingTimers();await Promise.resolve();});
}
async function activate(button) {expect(button).toBeTruthy();button.focus();act(()=>button.click());await settle();}
async function finish(request,value='A balanced mix needs firm generation and storage.',reject=false) {
  await act(async()=>{if(reject)request.reject(new Error('Local fixture failure'));else request.resolve(value);await Promise.resolve();});
  await settle();
}
async function changeRange(input,value) {
  input.focus();
  act(()=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await settle();
}
function ai(view) {return view.one('#ce-renewables-ai');}
function status(view) {return view.one('#ce-renewables-ai-status');}
function panel(view) {return view.one('#ce-renewables-ai-response');}

beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);frames=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.push(callback);return frames.length;});
  vi.stubGlobal('cancelAnimationFrame',vi.fn());vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async()=>{
  disposers.splice(0).forEach(dispose=>dispose());await settle();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
});

describe.each(paths)('Renewables AI accessibility: %s',path=>{
  it('provides persistent named targets without calling the service or moving focus on mount',async()=>{
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();disposers.push(()=>outside.remove());
    const helper=vi.fn(),view=mountTool(path,helper);await settle();
    expect(helper).not.toHaveBeenCalled();expect(document.activeElement).toBe(outside);
    expect(ai(view).type).toBe('button');expect(ai(view).getAttribute('aria-controls')).toBe(panel(view).id);
    expect(ai(view).getAttribute('aria-describedby').split(/\s+/)).toEqual(['ce-renewables-ai-help','ce-renewables-ai-status']);
    expect(status(view).getAttribute('role')).toBe('status');expect(status(view).getAttribute('aria-live')).toBe('polite');
    expect(status(view).getAttribute('aria-atomic')).toBe('true');expect(panel(view).hidden).toBe(true);
    expect(panel(view).getAttribute('role')).toBe('region');expect(panel(view).getAttribute('aria-labelledby')).toBe('ce-renewables-ai-response-title');
    expect(view.one('#ce-renewables-ai-response-title').textContent.trim()).toBeTruthy();
  });

  it('keeps the pending control focusable with a stable name and rejects duplicate clicks in the same batch',async()=>{
    const request=deferred(),helper=vi.fn(()=>request.promise),view=mountTool(path,helper);await settle();
    const button=ai(view),name=button.textContent,notice=status(view);button.focus();
    act(()=>{button.click();button.click();});await settle();await activate(button);
    expect(helper).toHaveBeenCalledTimes(1);expect(button.disabled).toBe(false);expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');expect(button.textContent).toBe(name);expect(document.activeElement).toBe(button);
    expect(status(view)).toBe(notice);expect(notice.textContent).toMatch(/analyzing/i);expect(panel(view).hidden).toBe(true);
    await finish(request);expect(button.getAttribute('aria-busy')).toBe('false');expect(button.getAttribute('aria-disabled')).toBe('false');
  });

  it('uses the current grade and actual model threshold and renders a successful response as literal readable text',async()=>{
    const request=deferred(),helper=vi.fn(()=>request.promise),view=mountTool(path,helper,{rsSolar:100,rsWind:0,rsHydro:0,rsNuclear:0,rsStorage:0,rsTimespan:10,studentNote:'Keep my note'});await settle();
    const button=ai(view);await activate(button);
    expect(helper).toHaveBeenCalledTimes(1);const [prompt,...options]=helper.mock.calls[0];
    expect(prompt).toContain('8th Grade student');expect(prompt).toContain('100% solar');expect(prompt).toContain('10-year');
    expect(prompt).toContain('teaching threshold of 85');expect(prompt).toContain('brownout risk in this model');expect(prompt).not.toContain('100% needed');
    expect(options).toEqual([true,false,0.8]);
    await finish(request,'  Storage supports this mix. <strong>This is plain text.</strong>  ');
    expect(panel(view).hidden).toBe(false);expect(status(view).textContent).toMatch(/analysis ready/i);
    expect(view.one('#ce-renewables-ai-response-content').textContent).toBe('Storage supports this mix. <strong>This is plain text.</strong>');
    expect(panel(view).querySelector('strong')).toBeNull();expect(document.activeElement).toBe(button);
    expect(view.state().studentNote).toBe('Keep my note');expect(view.state().rsSolar).toBe(100);expect(view.state().badges.aiConsultant).toBeTruthy();
  });

  it('does not steal focus when a delayed analysis succeeds after the learner moves to another control',async()=>{
    const request=deferred(),view=mountTool(path,vi.fn(()=>request.promise));await settle();await activate(ai(view));
    const other=view.one('#ce-renewables-preset-0');other.focus();await finish(request);
    expect(document.activeElement).toBe(other);expect(panel(view).hidden).toBe(false);
  });

  it.each([
    ['rejected promise',()=>Promise.reject(new Error('Fixture rejection'))],
    ['synchronous throw',()=>{throw new Error('Fixture throw');}],
    ['false response',()=>false],['missing response',()=>undefined],['null response',()=>null],
    ['object response',()=>({text:'Not the service contract'})],['array response',()=>['Not a string']],
    ['number response',()=>42],['empty response',()=>''],['whitespace response',()=>'  \n  ']
  ])('shows a retryable error for %s without dropping focus or changing the design',async(_name,first)=>{
    const helper=vi.fn().mockImplementationOnce(first).mockResolvedValue('Retry succeeded.'),view=mountTool(path,helper,{rsStorage:30,studentNote:'Keep this'});await settle();
    const button=ai(view);await activate(button);
    expect(status(view).textContent).toMatch(/could not|try again/i);expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('false');expect(document.activeElement).toBe(button);expect(panel(view).hidden).toBe(true);
    expect(view.state().rsStorage).toBe(30);expect(view.state().studentNote).toBe('Keep this');expect(view.state().badges?.aiConsultant).toBeFalsy();
    await activate(button);expect(helper).toHaveBeenCalledTimes(2);expect(panel(view).hidden).toBe(false);
    expect(view.one('#ce-renewables-ai-response-content').textContent).toBe('Retry succeeded.');expect(document.activeElement).toBe(button);
  });

  it('accepts a synchronous text response through the same success path',async()=>{
    const view=mountTool(path,vi.fn(()=>'A synchronous local fixture.'));await settle();await activate(ai(view));
    expect(panel(view).hidden).toBe(false);expect(view.one('#ce-renewables-ai-response-content').textContent).toBe('A synchronous local fixture.');
    expect(view.state().badges.aiConsultant).toBeTruthy();
  });

  it.each([null,42,{},[],true,'   '])('recovers from malformed grade %j without crashing and uses the readable fallback',async grade=>{
    const helper=vi.fn(()=>Promise.resolve('Grade-safe fixture.')),view=mountTool(path,helper,{},grade);await settle();await activate(ai(view));
    expect(helper.mock.calls[0][0]).toContain('5th Grade student');expect(panel(view).hidden).toBe(false);
  });

  it('reopens saved pending work without locking the button or presenting legacy text as current analysis',async()=>{
    const helper=vi.fn(()=>Promise.resolve('A new analysis.')),view=mountTool(path,helper,{aiLoading:true,aiResponse:'Legacy without a saved mix',rsAIStatus:'pending',rsAIRequestId:'old-request'});await settle();
    expect(ai(view).disabled).toBe(false);expect(ai(view).getAttribute('aria-busy')).toBe('false');expect(status(view).textContent).toMatch(/no longer active/i);
    expect(panel(view).hidden).toBe(true);expect(view.host.textContent).not.toContain('Legacy without a saved mix');
    await activate(ai(view));expect(panel(view).hidden).toBe(false);expect(helper).toHaveBeenCalledTimes(1);
  });

  it('explains an unbound legacy result and ignores malformed saved response objects',async()=>{
    const view=mountTool(path,vi.fn(),{aiResponse:'Saved legacy text',rsAIResponse:{text:'unsafe object'},rsAIStatus:'success'});await settle();
    expect(status(view).textContent).toMatch(/saved analysis did not include its energy mix/i);expect(panel(view).hidden).toBe(true);
    expect(view.host.textContent).not.toContain('unsafe object');expect(ai(view).getAttribute('aria-disabled')).toBe('false');
  });

  it.each([['rsSolar',40],['rsWind',40],['rsHydro',40],['rsNuclear',40],['rsStorage',40],['rsTimespan',50]])('ignores a late reply when %s changes outside the control event path',async(key,value)=>{
    const request=deferred(),view=mountTool(path,vi.fn(()=>request.promise));await settle();await activate(ai(view));
    view.patch({[key]:value,studentNote:'Newer edit'});await settle();const writes=view.writes();await finish(request,'Stale result');
    expect(view.writes()).toBe(writes);expect(view.state()[key]).toBe(value);expect(view.state().studentNote).toBe('Newer edit');
    expect(panel(view).hidden).toBe(true);expect(view.host.textContent).not.toContain('Stale result');expect(view.state().badges?.aiConsultant).toBeFalsy();
    expect(ai(view).getAttribute('aria-busy')).toBe('false');
  });

  it('invalidates a request when a real slider moves away and back to the same mix',async()=>{
    const request=deferred(),view=mountTool(path,vi.fn(()=>request.promise));await settle();await activate(ai(view));
    const slider=view.one('#ce-renewables-solar');await changeRange(slider,35);await changeRange(slider,10);
    expect(view.state().rsSolar).toBe(10);expect(status(view).textContent).toMatch(/design has changed/i);await finish(request,'Obsolete same-mix result');
    expect(panel(view).hidden).toBe(true);expect(document.activeElement).toBe(slider);expect(view.state().badges?.aiConsultant).toBeFalsy();
  });

  it('lets a new design request finish first without an older request replacing its result',async()=>{
    const old=deferred(),recent=deferred(),helper=vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise),view=mountTool(path,helper);await settle();
    await activate(ai(view));await activate(view.one('#ce-renewables-preset-1'));await activate(ai(view));
    expect(helper).toHaveBeenCalledTimes(2);await finish(recent,'The current balanced design.');const writes=view.writes();
    await finish(old,'The obsolete design.');expect(view.writes()).toBe(writes);
    expect(view.one('#ce-renewables-ai-response-content').textContent).toBe('The current balanced design.');expect(view.state().rsStorage).toBe(30);
  });

  it('hides a completed result after a genuine timespan change and allows fresh analysis',async()=>{
    const helper=vi.fn(()=>Promise.resolve('Current design explanation.')),view=mountTool(path,helper);await settle();await activate(ai(view));
    expect(panel(view).hidden).toBe(false);await activate(view.one('#ce-renewables-timespan-50'));
    expect(panel(view).hidden).toBe(true);expect(status(view).textContent).toMatch(/design has changed/i);await activate(ai(view));
    expect(helper).toHaveBeenCalledTimes(2);expect(panel(view).hidden).toBe(false);expect(helper.mock.calls[1][0]).toContain('50-year');
  });

  it.each([false,true])('ignores a late %s rejection after navigation away and back, including badge writes',async reject=>{
    const request=deferred(),view=mountTool(path,vi.fn(()=>request.promise));await settle();await activate(ai(view));
    view.patch({tab:'carbon'});await settle();view.patch({tab:'renewables'});await settle();
    const button=ai(view);button.focus();const writes=view.writes();await finish(request,'Obsolete navigation result',reject);
    expect(view.writes()).toBe(writes);expect(panel(view).hidden).toBe(true);expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-busy')).toBe('false');
  });

  it.each([false,true])('does not update state or focus after unmount for late rejection=%s',async reject=>{
    const request=deferred(),view=mountTool(path,vi.fn(()=>request.promise));await settle();await activate(ai(view));
    view.unmount();const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();disposers.push(()=>outside.remove());
    const writes=view.writes();await finish(request,'An unmounted result',reject);
    expect(view.writes()).toBe(writes);expect(document.activeElement).toBe(outside);expect(view.state().badges?.aiConsultant).toBeFalsy();
  });
});
