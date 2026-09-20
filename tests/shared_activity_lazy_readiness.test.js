import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const React=require('../desktop/web-app/node_modules/react');
const {createRoot}=require('../desktop/web-app/node_modules/react-dom/client');
const {act}=React;
const babel=require('@babel/core');
const shell=readFileSync('AlloFlowANTI.txt','utf8');
const from=shell.indexOf('const SharedAssignmentActivityPanel = React.memo('),to=shell.indexOf('const GlobalMuteButton',from);
const gateFrom=shell.indexOf('function _alloWatchModuleChanges('),gateTo=shell.indexOf('// Thin host adapters',gateFrom);
if([from,to,gateFrom,gateTo].some(value=>value<0))throw Error('Missing real shared activity wrapper/gate');
const compiled=babel.transformSync(shell.slice(from,to)+'\n'+shell.slice(gateFrom,gateTo),{plugins:['@babel/plugin-transform-react-jsx']}).code;
const Panel=new Function('React','window','document','_alloSharedActivityModule',compiled+'\nreturn SharedAssignmentActivityPanel;')(React,window,document,()=>window.AlloModules.SharedActivity);
let root,container;
const activity={type:'word_cloud',prompt:'Choose your next step'},mailbox={id:'fixture',url:'https://mailbox.example.invalid'},addToast=()=>{};
function register(){window.AlloModules.SharedActivity={SharedAssignmentActivityPanel:props=>React.createElement('div',{'data-ready':'true','data-mailbox':props.mailbox.id},props.activity.prompt)};window.__alloModuleRegistry.SharedActivity={status:'loaded'};}
const notify=()=>window.dispatchEvent(new Event('alloflow:module-registry-changed'));
async function mount(){container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);await act(async()=>root.render(React.createElement(Panel,{mode:'student',activity,mailbox,addToast})));}
beforeEach(()=>{
  vi.useFakeTimers();globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  window.AlloModules={};window.__alloModuleRegistry={};
  window.__alloLazySharedActivity=vi.fn(()=>{window.__alloModuleRegistry.SharedActivity={status:'pending'};notify();return true;});
  window.__alloRetryFailedModules=vi.fn();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());root=null;container?.remove();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__alloLazySharedActivity;});
describe('actual shared activity wrapper during cold registration',()=>{
  it('promotes its dependency on initial mount while showing an accessible loading state',async()=>{
    await mount();expect(window.__alloLazySharedActivity).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[role="status"]')).not.toBeNull();expect(container.textContent).toMatch(/Loading|loading/);
  });
  it('promotes a memoized loading panel on the real registration event without changing parent props',async()=>{
    await mount();await act(async()=>{register();notify();});
    expect(container.querySelector('[data-ready="true"]')?.textContent).toBe(activity.prompt);
    expect(container.querySelector('[data-ready="true"]')?.getAttribute('data-mailbox')).toBe(mailbox.id);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('shows module failure and allows explicit Retry to render the ready activity',async()=>{
    await mount();await act(async()=>{window.__alloModuleRegistry.SharedActivity={status:'failed'};notify();});
    expect(container.textContent).toMatch(/could not load/i);
    const retry=Array.from(container.querySelectorAll('button')).find(button=>/Retry/i.test(button.textContent));expect(retry).toBeTruthy();
    window.__alloLazySharedActivity.mockImplementation(()=>{register();notify();return true;});
    await act(async()=>retry.click());
    expect(window.__alloLazySharedActivity).toHaveBeenCalledTimes(2);expect(container.querySelector('[data-ready="true"]')).not.toBeNull();
  });
  it('recognizes registration without an event through the existing gate fallback check',async()=>{
    await mount();register();await act(async()=>vi.advanceTimersByTime(200));
    expect(container.querySelector('[data-ready="true"]')).not.toBeNull();expect(vi.getTimerCount()).toBe(0);
  });
  it('discovers a loader installed after the child mounts and then renders its export',async()=>{
    delete window.__alloLazySharedActivity;await mount();
    const lateLoader=vi.fn(()=>{register();notify();return true;});window.__alloLazySharedActivity=lateLoader;
    await act(async()=>vi.advanceTimersByTime(100));
    expect(lateLoader).toHaveBeenCalledTimes(1);expect(container.querySelector('[data-ready="true"]')).not.toBeNull();
  });
  it('does not request a load for an already registered activity panel',async()=>{
    register();await mount();expect(container.querySelector('[data-ready="true"]')).not.toBeNull();expect(window.__alloLazySharedActivity).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
  it('removes its registry listener and timers when the enclosing activity dialog closes',async()=>{
    const add=vi.spyOn(window,'addEventListener'),remove=vi.spyOn(window,'removeEventListener');await mount();
    const callbacks=add.mock.calls.filter(([name])=>name==='alloflow:module-registry-changed').map(([,callback])=>callback);
    expect(callbacks.length).toBeGreaterThan(0);expect(vi.getTimerCount()).toBeGreaterThan(0);
    await act(async()=>root.unmount());root=null;
    for(const callback of callbacks)expect(remove).toHaveBeenCalledWith('alloflow:module-registry-changed',callback);
    expect(vi.getTimerCount()).toBe(0);register();notify();expect(container.childNodes).toHaveLength(0);
  });
});
