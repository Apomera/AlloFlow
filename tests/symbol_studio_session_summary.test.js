import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require=createRequire(import.meta.url);
const ReactDOM=require(resolve(process.cwd(),'desktop/web-app/node_modules/react-dom/client'));
const act=React.act;
let Studio,root,host;
const set=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
beforeAll(()=>{Studio=setupSymbolStudio().SymbolStudio;globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();});
function control(name){const el=[...host.querySelectorAll('[aria-label]')].find(el=>el.getAttribute('aria-label')===name);expect(el,name).toBeTruthy();return el;}
async function click(name){await act(async()=>control(name).click());}
async function mount(tab='board'){
  set('alloStudentProfiles',[{id:'a',name:'Learner A'},{id:'b',name:'Learner B'}]);set('alloActiveProfileId','a');
  set('alloSymbolBoards__a',[{id:'board',title:'Communication',cols:2,words:[{id:'water',label:'Water',category:'noun'}]}]);
  set('alloGardenWishSeeds',[{label:'Old A wish',profileId:'a',ts:new Date().toISOString()},{label:'Private B wish',profileId:'b',ts:new Date().toISOString()},{label:'Unassigned wish'}]);
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOM.createRoot(host);
  await act(async()=>root.render(React.createElement(Studio,baseProps({initialTab:tab,draftStorage:{read:async()=>null,write:async()=>{},remove:async()=>{}},onCallTTS:null}))));
}
describe('Symbol Studio session summaries and reports',()=>{
  it('counts only this session’s wishes, including those older than two minutes',async()=>{
    await mount();
    await click('Toggle saved boards gallery');await click('Use board in AAC mode');
    await click('Plant a wish seed — record a word the student wanted');
    const input=control('Wish seed word');
    await act(async()=>{
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'Session wish');
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await act(async()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    const stored=JSON.parse(localStorage.getItem('alloGardenWishSeeds')).find(w=>w.label==='Session wish');
    expect(stored).toMatchObject({profileId:'a',sessionId:expect.any(String)});
    await act(async()=>host.querySelector('[role=gridcell]').click());
    vi.spyOn(Date,'now').mockReturnValue(Date.now()+5*60000);
    await click('Exit AAC mode');
    expect(host.textContent).toContain('1 wish seed planted');
    expect(host.textContent).toContain('Session wish');
    expect(host.textContent).not.toContain('Private B wish');
    expect(host.textContent).not.toContain('Old A wish');
    expect(host.textContent).not.toContain('Unassigned wish');
    expect(host.querySelector('[role=dialog]').getAttribute('aria-modal')).toBe('true');
    const close=control('Close session summary');close.focus();
    act(()=>close.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true})));
    expect(document.activeElement).toBe(close);
    vi.useFakeTimers();await act(async()=>vi.advanceTimersByTimeAsync(6000));
    expect(control('Close session summary')).toBeTruthy();
    act(()=>close.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    expect(host.textContent).not.toContain('Session Complete!');
    expect(host.querySelector('.ss-main-modal')).toBeTruthy();
  });
  it('excludes other learners and unassigned wishes from the printed practice report',async()=>{
    await mount('garden');
    let html='';
    vi.spyOn(window,'open').mockReturnValue({document:{write:value=>{html=value;},close:vi.fn()},print:vi.fn()});
    await click('Print practice report');
    expect(html).toContain('Old A wish');
    expect(html).not.toContain('Private B wish');
    expect(html).not.toContain('Unassigned wish');
    expect(html).not.toContain('used spontaneously everywhere');
  });
});
