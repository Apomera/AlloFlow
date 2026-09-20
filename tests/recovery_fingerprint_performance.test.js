import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {React,ReactDOMClient} from './helpers/stem_widgets_smoke_harness.js';
const require=createRequire(import.meta.url);
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const {extract,fixtureCode}=require('../dev-tools/recovery_fingerprint_fixture.cjs');
const sources=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'].map(file=>readFileSync(file,'utf8'));
const blocks=extract(sources[0]);
let root,host,previousActFlag;
const globals=['__alloflowSelStations','__alloflowSelToolData','__alloflowSelSnapshots'];
let previousGlobals;
afterEach(()=>{
  if(root)act(()=>root.unmount());root=null;host?.remove();host=null;
  if(previousGlobals)for(const key of globals){if(previousGlobals[key]===undefined)delete window[key];else window[key]=previousGlobals[key];}
  previousGlobals=null;globalThis.IS_REACT_ACT_ENVIRONMENT=previousActFlag;vi.useRealTimers();
});
function mount(props={}){
  previousActFlag=globalThis.IS_REACT_ACT_ENVIRONMENT;globalThis.IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();
  previousGlobals=Object.fromEntries(globals.map(key=>[key,window[key]]));
  window.__alloflowSelStations=[{id:'s1',title:'Station'}];window.__alloflowSelToolData={};window.__alloflowSelSnapshots=[];
  const calls=vi.fn();
  const Fixture=Function('React','onFingerprint','setInterval','clearInterval',fixtureCode(blocks))(React,calls,setInterval,clearInterval);
  host=document.createElement('div');document.body.appendChild(host);root=ReactDOMClient.createRoot(host);
  const render=next=>act(()=>root.render(React.createElement(Fixture,next)));
  render(props);return {calls,render,revision:()=>Number(host.firstChild.dataset.revision)};
}
describe('recovery fingerprint render work',()=>{
  it.each([{isCanvas:false},{canvasRecoveryDecisionMade:false}])('does no serialization before recovery is active: %j',props=>{
    const h=mount(props);for(let tick=0;tick<20;tick++)h.render({...props,tick});
    act(()=>vi.advanceTimersByTime(10000));expect(h.calls).not.toHaveBeenCalled();
  });
  it('initializes once when activated and never fingerprints unrelated renders',()=>{
    const h=mount({canvasRecoveryDecisionMade:false});h.render({canvasRecoveryDecisionMade:true});
    expect(h.calls).toHaveBeenCalledTimes(1);
    for(let tick=0;tick<100;tick++)h.render({tick});
    expect(h.calls).toHaveBeenCalledTimes(1);expect(h.revision()).toBe(0);
  });
  it('preserves all change and restore events without duplicate revision updates',()=>{
    const h=mount();let revision=0;
    for(const event of ['stations-changed','tooldata-changed','snapshots-changed','stations-restored','tooldata-restored','snapshots-restored']){
      window.__alloflowSelStations[0].title=event;
      act(()=>window.dispatchEvent(new Event('alloflow-sel-'+event)));
      expect(h.revision()).toBe(++revision);
      act(()=>window.dispatchEvent(new Event('alloflow-sel-'+event)));
      expect(h.revision()).toBe(revision);
    }
    expect(h.calls).toHaveBeenCalledTimes(13);
  });
  it('retains fallback polling and removes observers on disable and unmount',()=>{
    const h=mount();window.__alloflowSelToolData.quiz={answer:'changed without event'};
    act(()=>vi.advanceTimersByTime(2000));expect(h.revision()).toBe(1);expect(h.calls).toHaveBeenCalledTimes(2);
    act(()=>vi.advanceTimersByTime(2000));expect(h.revision()).toBe(1);
    h.render({isCanvas:false});h.calls.mockClear();
    act(()=>{window.dispatchEvent(new Event('alloflow-sel-tooldata-changed'));vi.advanceTimersByTime(4000);});expect(h.calls).not.toHaveBeenCalled();
    h.render({isCanvas:true});expect(h.calls).toHaveBeenCalledTimes(1);expect(h.revision()).toBe(1);
    act(()=>root.unmount());root=null;h.calls.mockClear();
    act(()=>{window.dispatchEvent(new Event('alloflow-sel-tooldata-changed'));vi.advanceTimersByTime(4000);});expect(h.calls).not.toHaveBeenCalled();
  });
  it('recovers from unserializable authoring state without throwing',()=>{
    const h=mount();const circular={};circular.self=circular;window.__alloflowSelToolData=circular;
    expect(()=>act(()=>window.dispatchEvent(new Event('alloflow-sel-tooldata-changed')))).not.toThrow();
    expect(h.revision()).toBe(1);window.__alloflowSelToolData={};
    act(()=>window.dispatchEvent(new Event('alloflow-sel-tooldata-changed')));expect(h.revision()).toBe(2);
  });
  it('keeps the relevant code identical in all three shells',()=>{
    for(const source of sources.slice(1))expect(extract(source)).toEqual(blocks);
  });
});
