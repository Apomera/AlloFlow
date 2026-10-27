import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers=[];
let frames;
function mountTool(path,seed={}){
  resetStemLab();const config=loadTool(path,'climateExplorer');
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),announce=vi.fn(),award=vi.fn();let current;
  function Host(){
    const [data,setData]=React.useState({climateExplorer:{tab:'renewables',heroMotionPaused:true,...seed}});current=data.climateExplorer;
    return config.render(makeCtx({toolData:data,setToolData:setData,announceToSR:announce,awardXP:award}));
  }
  act(()=>root.render(React.createElement(Host)));
  disposers.push(()=>{act(()=>root.unmount());host.remove();});
  return {host,announce,award,state:()=>current,one:selector=>host.querySelector(selector),all:selector=>[...host.querySelectorAll(selector)]};
}
async function settle(){await act(async()=>{await Promise.resolve();vi.runOnlyPendingTimers();frames.splice(0).forEach(callback=>callback(16));await Promise.resolve();});}
async function activate(button){expect(button?.tagName).toBe('BUTTON');button.focus();act(()=>button.click());await settle();}
async function setRange(input,value){
  input.focus();act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,String(value));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await settle();
}
function nameOf(view,element){return element.getAttribute('aria-labelledby').split(/\s+/).map(id=>view.one('#'+id).textContent).join(' ');}
function shares(view){return ['solar','wind','hydro','nuclear'].map(source=>Number(view.one('#ce-renewables-'+source).value));}
beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);frames=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{frames.push(callback);return frames.length;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async()=>{disposers.splice(0).forEach(dispose=>dispose());await settle();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe.each(paths)('Climate Renewables controls: %s',path=>{
  it('names the activity and control groups without taking focus or announcing the initial custom mix',async()=>{
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();disposers.push(()=>outside.remove());
    const view=mountTool(path);await settle();expect(document.activeElement).toBe(outside);
    expect(view.one('#ce-renewables').getAttribute('role')).toBe('region');expect(nameOf(view,view.one('#ce-renewables'))).toContain('Renewables Impact Simulator');
    for(const id of ['ce-renewables-presets','ce-renewables-mix','ce-renewables-timespans']){expect(view.one('#'+id).getAttribute('role')).toBe('group');expect(nameOf(view,view.one('#'+id))).toBeTruthy();}
    expect(view.all('#ce-renewables-presets button[aria-pressed="true"]')).toHaveLength(0);expect(view.one('#ce-renewables-current-design').textContent).toContain('Custom mix');
    expect(view.one('#ce-renewables-timespan-25').getAttribute('aria-pressed')).toBe('true');expect(view.announce).not.toHaveBeenCalled();
    const status=view.one('#ce-renewables-status');expect(status.getAttribute('role')).toBe('status');expect(status.getAttribute('aria-live')).toBe('polite');expect(status.getAttribute('aria-atomic')).toBe('true');expect(status.textContent).toBe('');
  });

  it('selects a preset by its exact generation and storage values while retaining its stable name and focus',async()=>{
    const view=mountTool(path),button=view.one('#ce-renewables-preset-2'),name=nameOf(view,button),status=view.one('#ce-renewables-status');
    expect(name).toBe('Wind-Powered Future');await activate(button);
    expect(document.activeElement).toBe(button);expect(nameOf(view,button)).toBe(name);expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(shares(view)).toEqual([10,60,10,10]);expect(view.one('#ce-renewables-storage').value).toBe('55');
    expect(view.all('#ce-renewables-presets button[aria-pressed="true"]')).toHaveLength(1);expect(view.one('#ce-renewables-current-design').textContent).toBe('Current mix matches: Wind-Powered Future.');
    expect(view.one('#ce-renewables-status')).toBe(status);expect(status.textContent).toContain('Preset selected: Wind-Powered Future. Reliable.');expect(view.announce).not.toHaveBeenCalled();
    await setRange(view.one('#ce-renewables-storage'),54);
    expect(view.all('#ce-renewables-presets button[aria-pressed="true"]')).toHaveLength(0);expect(view.one('#ce-renewables-current-design').textContent).toContain('Custom mix');
    await setRange(view.one('#ce-renewables-storage'),55);expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('restores a matching preset from its values without trusting a saved selection label',()=>{
    const view=mountTool(path,{rsSolar:30,rsWind:30,rsHydro:20,rsNuclear:15,rsStorage:30});
    expect(view.one('#ce-renewables-preset-1').getAttribute('aria-pressed')).toBe('true');expect(view.one('#ce-renewables-current-design').textContent).toContain('Balanced Green Mix');
  });

  it('counts only known completed presets toward the exploration badge',async()=>{
    const view=mountTool(path,{scenariosTried:{0:'true',1:1,unknown1:true,unknown2:true,unknown3:true,unknown4:true}});
    await activate(view.one('#ce-renewables-preset-0'));expect(view.state().scenariosTried).toEqual({0:true});expect(view.state().badges?.scenarioTester).toBeUndefined();
    for(const index of [1,2,3])await activate(view.one('#ce-renewables-preset-'+index));
    expect(view.state().scenariosTried).toEqual({0:true,1:true,2:true,3:true});expect(view.state().badges.scenarioTester).toBeGreaterThan(0);
    const awarded=view.award.mock.calls.length;await activate(view.one('#ce-renewables-preset-3'));expect(view.award.mock.calls).toHaveLength(awarded);
  });

  it('associates every range with a visible label, its actual unit and available instructions',()=>{
    const view=mountTool(path);
    for(const source of ['solar','wind','hydro','nuclear','storage']){
      const input=view.one('#ce-renewables-'+source),label=view.one('label[for="'+input.id+'"]');
      expect(label.textContent).toBe(source[0].toUpperCase()+source.slice(1));expect(input.getAttribute('aria-label')).toBe(label.textContent+' slider');
      expect(input.min).toBe('0');expect(input.max).toBe('100');expect(input.step).toBe('1');expect(input.getAttribute('aria-valuetext')).toBe(source==='storage'?input.value+' of 100 storage points':input.value+'%');
      expect(view.one('#'+input.getAttribute('aria-describedby')).textContent).toBeTruthy();
    }
    expect(view.one('#ce-renewables-mix-help').textContent).toContain('arrow keys for 1% steps');expect(view.one('#ce-renewables-storage-help').textContent).toContain('manufacturing emissions');
    expect(view.one('#ce-renewables-storage-help').textContent).toContain('separate 0–100 support scale');expect(view.one('#ce-renewables-storage').parentElement.textContent).toContain('0 / 100');
  });

  it('rebalances other shares while preserving focus and exposing a plain-text explanation instead of live tick narration',async()=>{
    const view=mountTool(path,{rsSolar:30,rsWind:30,rsHydro:20,rsNuclear:15,rsStorage:30}),solar=view.one('#ce-renewables-solar');
    await setRange(solar,80);
    expect(document.activeElement).toBe(solar);expect(solar.getAttribute('aria-valuetext')).toBe('80%');expect(shares(view)).toEqual([80,9,6,5]);expect(view.one('#ce-renewables-fossil').textContent).toContain('0%');
    const feedback=view.one('#ce-renewables-mix-feedback');expect(feedback.textContent).toBe('Solar set to 80%. Other source shares adjusted to keep the grid total at 100%.');
    expect(feedback.closest('[aria-live],[role="status"]')).toBeNull();expect(view.one('#ce-renewables-status').textContent).toBe('');expect(view.announce).not.toHaveBeenCalled();
  });

  it('does not create a 101% grid when two other shares compete for the final percentage point',async()=>{
    const view=mountTool(path,{rsSolar:98,rsWind:1,rsHydro:1,rsNuclear:0,rsStorage:0});await setRange(view.one('#ce-renewables-solar'),99);
    expect(shares(view)).toEqual([99,1,0,0]);expect(shares(view).reduce((sum,value)=>sum+value,0)).toBe(100);expect(view.one('#ce-renewables-fossil').textContent).toContain('0%');
    expect(view.state()).toMatchObject({rsSolar:99,rsWind:1,rsHydro:0,rsNuclear:0});
  });

  it('returns a lowered clean share to fossil and updates the visible remainder',async()=>{
    const view=mountTool(path,{rsSolar:20,rsWind:15,rsHydro:10,rsNuclear:55});await setRange(view.one('#ce-renewables-nuclear'),0);
    expect(shares(view)).toEqual([20,15,10,0]);expect(view.one('#ce-renewables-fossil').textContent).toContain('55%');expect(view.one('#ce-renewables-mix-feedback').textContent).toBe('Nuclear set to 0%.');
  });

  it('announces a brownout crossing once across a twenty-step drag and leaves moving reliability outside live regions',async()=>{
    const view=mountTool(path,{rsSolar:5,rsWind:0,rsHydro:40,rsNuclear:55,rsStorage:0});
    for(let value=5;value<=100;value+=5)await setRange(view.one('#ce-renewables-solar'),value);
    expect(view.announce).toHaveBeenCalledTimes(1);expect(view.announce.mock.calls[0][0]).toContain('Brownout risk');
    expect(view.one('#ce-renewables-reliability').textContent).toContain('15%');expect(view.one('#ce-renewables-reliability-note').textContent).toContain('Brownout risk');
    for(const id of ['ce-renewables-reliability','ce-renewables-reliability-note'])expect(view.one('#'+id).closest('[aria-live],[role="status"]')).toBeNull();
    expect(view.one('#ce-renewables-status').textContent).toBe('');
  });

  it('announces the storage transition to reliable once, without changing generation shares',async()=>{
    const view=mountTool(path,{rsSolar:100,rsWind:0,rsHydro:0,rsNuclear:0,rsStorage:0});
    await setRange(view.one('#ce-renewables-storage'),100);expect(shares(view)).toEqual([100,0,0,0]);
    expect(view.one('#ce-renewables-storage').getAttribute('aria-valuetext')).toBe('100 of 100 storage points');expect(view.one('#ce-renewables-mix-feedback').textContent).toBe('Storage set to 100 of 100 support points.');
    expect(view.announce).toHaveBeenCalledTimes(1);expect(view.announce.mock.calls[0][0]).toContain('Reliable.');expect(view.one('#ce-renewables-reliability').textContent).toContain('92%');
    await setRange(view.one('#ce-renewables-storage'),99);expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.one('#ce-renewables-reliability-note').textContent).toContain('serve demand around the clock');
  });

  it('exposes the selected transition duration with a stable label and one contextual status update',async()=>{
    const view=mountTool(path),button=view.one('#ce-renewables-timespan-50'),name=nameOf(view,button),status=view.one('#ce-renewables-status');
    expect(name).toBe('50 years');await activate(button);
    expect(document.activeElement).toBe(button);expect(nameOf(view,button)).toBe(name);expect(button.getAttribute('aria-pressed')).toBe('true');expect(view.one('#ce-renewables-timespan-25').getAttribute('aria-pressed')).toBe('false');
    expect(view.state().rsTimespan).toBe(50);expect(view.one('#ce-renewables-status')).toBe(status);expect(status.textContent).toBe('Transition duration: 50 years. The timeline has been updated.');expect(view.announce).not.toHaveBeenCalled();
  });

  it.each([
    [{rsSolar:Infinity,rsWind:NaN,rsHydro:'15',rsNuclear:null,rsStorage:Infinity,rsTimespan:'oops'},[10,5,15,10],0,25],
    [{rsSolar:150,rsWind:-3,rsHydro:0,rsNuclear:0,rsStorage:-4},[100,0,0,0],0,25],
    [{rsSolar:100,rsWind:100,rsHydro:100,rsNuclear:100,rsStorage:500},[25,25,25,25],100,25],
    [{rsSolar:33,rsWind:33,rsHydro:33,rsNuclear:33,rsStorage:12.4,rsTimespan:'10'},[25,25,25,25],12,10],
    [{rsSolar:30,rsWind:30,rsHydro:20,rsNuclear:15,rsStorage:30,rsTimespan:5},[30,30,20,15],30,5]
  ])('restores finite bounded slider and duration values from %j', (seed,expectedShares,storage,span)=>{
    const view=mountTool(path,seed);expect(shares(view)).toEqual(expectedShares);expect(Number(view.one('#ce-renewables-storage').value)).toBe(storage);
    expect(view.one('#ce-renewables-timespan-'+span).getAttribute('aria-pressed')).toBe('true');expect(shares(view).reduce((sum,value)=>sum+value,0)).toBeLessThanOrEqual(100);
    expect(view.one('#ce-renewables-reliability').textContent).not.toMatch(/NaN|Infinity/);expect(view.one('#ce-renewables-fossil').textContent).not.toMatch(/NaN|Infinity/);
  });

  it.each(['solar','storage','preset','timespan'])('invalidates an analysis request when the %s control actually changes the design',async control=>{
    const view=mountTool(path,{rsAIRequestId:'pending-request',rsAIStatus:'pending'});
    if(control==='solar')await setRange(view.one('#ce-renewables-solar'),80);
    if(control==='storage')await setRange(view.one('#ce-renewables-storage'),40);
    if(control==='preset')await activate(view.one('#ce-renewables-preset-2'));
    if(control==='timespan')await activate(view.one('#ce-renewables-timespan-50'));
    expect(view.state().rsAIRequestId).toBeNull();expect(view.state().rsAIStatus).toBe('changed');
  });
});
