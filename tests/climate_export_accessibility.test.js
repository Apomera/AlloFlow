import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const disposers = [];
let frames, clipboardDescriptor;

function clipboard(writeText) {
  const value = writeText ? { writeText } : undefined;
  Object.defineProperty(navigator,'clipboard',{ configurable:true,value });
  return value;
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((done,fail) => { resolve=done; reject=fail; });
  return { promise,resolve,reject };
}
function mountTool(path, seed={}, helper) {
  resetStemLab();
  const config = loadTool(path,'climateExplorer');
  if (helper !== undefined) window.StemLab.writeClipboard = helper;
  const host=document.createElement('div'); document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),announce=vi.fn(),award=vi.fn(),toast=vi.fn();
  let current,patch,mounted=true;
  function Host() {
    const [data,setData]=React.useState({ climateExplorer:{ tab:'solutions',heroMotionPaused:true,badges:{ reporter:1 },...seed } });
    current=data.climateExplorer;
    patch=value=>setData(previous=>({ ...previous,climateExplorer:{ ...previous.climateExplorer,...value } }));
    return config.render(makeCtx({ toolData:data,setToolData:setData,announceToSR:announce,awardXP:award,addToast:toast }));
  }
  act(()=>root.render(React.createElement(Host)));
  const unmount=()=>{ if(mounted){ act(()=>root.unmount()); host.remove(); mounted=false; } };
  disposers.push(unmount);
  return { host,announce,award,toast,unmount,state:()=>current,patch:value=>act(()=>patch(value)),
    one:selector=>host.querySelector(selector),all:selector=>[...host.querySelectorAll(selector)] };
}
async function settle() {
  await act(async()=>{
    await Promise.resolve(); await Promise.resolve(); vi.runOnlyPendingTimers();
  });
  // The browser's animation frame sees the committed promise result. Do not
  // fire our mocked frame while React is still batching that result in act.
  await act(async()=>{
    frames.splice(0).forEach(callback=>callback(16)); await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  button.focus(); act(()=>button.click()); await settle();
}
async function finish(pending,success=true,value) {
  await act(async()=>{
    if(success) pending.resolve(value); else pending.reject(new Error('Local clipboard test rejection'));
    await Promise.resolve(); await Promise.resolve();
  });
  await settle();
}
function expectStatus(view) {
  const status=view.one('#ce-export-status');
  expect(status).toBeTruthy(); expect(status.getAttribute('role')).toBe('status');
  expect(status.getAttribute('aria-live')).toBe('polite');
  return status;
}
function expectManualReport(view) {
  const panel=view.one('#ce-export-panel'),field=view.one('#ce-export-text');
  expect(panel).toBeTruthy(); expect(panel.hidden).toBe(false);
  expect(panel.getAttribute('role')).toBe('region'); expect(panel.getAttribute('aria-labelledby')).toBe('ce-export-title');
  expect(view.one('#ce-export-title')?.textContent.trim()).toBeTruthy();
  expect(field?.tagName).toBe('TEXTAREA'); expect(field.readOnly).toBe(true);
  expect(view.one('label[for="ce-export-text"]')?.textContent.trim()).toBeTruthy();
  expect(field.getAttribute('aria-describedby')?.split(/\s+/)).toContain('ce-export-help');
  expect(view.one('#ce-export-help')?.textContent).toMatch(/select|copy/i);
  expect(field.value).toContain('Climate');
  expect(view.one('#ce-panel').contains(panel)).toBe(false);
  return field;
}

beforeEach(()=>{
  vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true); frames=[];
  vi.stubGlobal('requestAnimationFrame',callback=>{ frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
  clipboardDescriptor=Object.getOwnPropertyDescriptor(navigator,'clipboard'); clipboard();
});
afterEach(async()=>{
  disposers.splice(0).forEach(dispose=>dispose()); await settle();
  if(clipboardDescriptor) Object.defineProperty(navigator,'clipboard',clipboardDescriptor); else delete navigator.clipboard;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Climate report export accessibility: %s',path=>{
  it('provides stable status and fallback targets without opening or moving focus on initial render',async()=>{
    const outside=document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(()=>outside.remove());
    const view=mountTool(path); await settle();
    expect(document.activeElement).toBe(outside);
    expectStatus(view); expect(view.one('#ce-export-panel').hidden).toBe(true);
    expect(view.one('#ce-export').type).toBe('button');
  });

  it('uses the host helper even when the native Clipboard API is unavailable',async()=>{
    const helper=vi.fn(()=>Promise.resolve(true)),view=mountTool(path,{},helper),button=view.one('#ce-export'),status=expectStatus(view);
    await activate(button);
    expect(helper).toHaveBeenCalledTimes(1); expect(helper.mock.calls[0][0]).toContain('Climate');
    expect(status.textContent).toMatch(/copied/i); expect(view.one('#ce-export-status')).toBe(status);
    expect(view.one('#ce-export-panel').hidden).toBe(true); expect(document.activeElement).toBe(button);
    expect(view.award).toHaveBeenCalledTimes(1); expect(view.award).toHaveBeenCalledWith('climateExplorer',10);
  });

  it('prefers the host helper over native clipboard and accepts its undefined success result',async()=>{
    const native=vi.fn(()=>Promise.reject(new Error('Native clipboard must not be called'))); clipboard(native);
    const helper=vi.fn(()=>Promise.resolve()),view=mountTool(path,{},helper);
    await activate(view.one('#ce-export'));
    expect(helper).toHaveBeenCalledTimes(1); expect(native).not.toHaveBeenCalled();
    expectStatus(view); expect(view.one('#ce-export-status').textContent).toMatch(/copied/i);
    expect(view.one('#ce-export-panel').hidden).toBe(true);
  });

  it('uses native clipboard with its receiver when no host helper is available',async()=>{
    let receiver;
    const native=vi.fn(function(){ receiver=this; return Promise.resolve(); }),api=clipboard(native),view=mountTool(path);
    await activate(view.one('#ce-export'));
    expect(native).toHaveBeenCalledTimes(1); expect(receiver).toBe(api);
    expect(view.one('#ce-export-status').textContent).toMatch(/copied/i);
    expect(view.one('#ce-export-panel').hidden).toBe(true);
  });

  it('offers an accessible manual copy on a non-Carbon tab when no clipboard route exists',async()=>{
    const view=mountTool(path,{ tab:'forceHunt',showClimateAdvanced:true,forceHunt:{ hypothesis:'A report-worthy hypothesis.',explanation:'A separate explanation.' } });
    await activate(view.one('#ce-export'));
    const field=expectManualReport(view);
    expect(field.value).toContain('A report-worthy hypothesis.'); expect(field.value).toContain('A separate explanation.');
    expect(document.activeElement).toBe(field); expect(view.state().tab).toBe('forceHunt');
    expect(view.one('#ce-export-status').textContent).toMatch(/manual|unavailable|could not|unable/i);
    expect(view.award).not.toHaveBeenCalled();
  });

  it.each(['reject','throw','false','resolved-false'])('recovers from a host helper that returns %s without claiming a successful copy',async outcome=>{
    const helper=vi.fn(()=>{
      if(outcome==='throw') throw new Error('Local synchronous clipboard failure');
      if(outcome==='reject') return Promise.reject(new Error('Local asynchronous clipboard failure'));
      return outcome==='false'?false:Promise.resolve(false);
    });
    const view=mountTool(path,{ tab:'renewables' },helper);
    await activate(view.one('#ce-export'));
    expect(helper).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(expectManualReport(view));
    expect(view.state().tab).toBe('renewables'); expect(view.one('#ce-export-status').textContent).toMatch(/manual|unavailable|could not|unable/i);
    expect(view.award).not.toHaveBeenCalled(); expect(view.toast.mock.calls.some(call=>/copied to clipboard/i.test(call[0]))).toBe(false);
  });

  it('recovers from native permission rejection through the same manual-copy flow',async()=>{
    const native=vi.fn(()=>Promise.reject(new Error('Clipboard permission denied'))); clipboard(native);
    const view=mountTool(path,{ tab:'keeling' }); await activate(view.one('#ce-export'));
    expect(native).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(expectManualReport(view));
    expect(view.state().tab).toBe('keeling'); expect(view.award).not.toHaveBeenCalled();
  });

  it('keeps pending Export focusable and prevents duplicate same-batch and later submissions',async()=>{
    const pending=deferred(),helper=vi.fn(()=>pending.promise),view=mountTool(path,{},helper),button=view.one('#ce-export');
    button.focus(); act(()=>{ button.click(); button.click(); }); await settle();
    expect(helper).toHaveBeenCalledTimes(1); expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('true'); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button); expect(view.one('#ce-export-status').textContent).toMatch(/copy|prepar/i);
    await activate(button); expect(helper).toHaveBeenCalledTimes(1); expect(view.award).not.toHaveBeenCalled();
    await finish(pending,true);
    expect(button.getAttribute('aria-busy')).not.toBe('true'); expect(button.getAttribute('aria-disabled')).not.toBe('true');
    expect(view.award).toHaveBeenCalledTimes(1); expect(view.award).toHaveBeenCalledWith('climateExplorer',10);
    expect(view.one('#ce-export-status').textContent).toMatch(/copied/i); expect(document.activeElement).toBe(button);
  });

  it('shows delayed recovery without changing tabs, newer writing, or the user’s new focus',async()=>{
    const pending=deferred(),view=mountTool(path,{ forceHunt:{ hypothesis:'Writing at export time.' } },vi.fn(()=>pending.promise));
    await activate(view.one('#ce-export'));
    const destination=view.one('#ce-tab-justice'); await activate(destination);
    view.patch({ forceHunt:{ hypothesis:'Newer writing that must survive.' } }); await settle();
    await finish(pending,false);
    const field=expectManualReport(view); expect(field.value).toContain('Writing at export time.');
    expect(view.state().tab).toBe('justice'); expect(view.state().forceHunt.hypothesis).toBe('Newer writing that must survive.');
    expect(document.activeElement).toBe(destination);
  });

  it('does not take focus if the user moves away after rejection but before its scheduled focus callback',async()=>{
    const pending=deferred(),view=mountTool(path,{},vi.fn(()=>pending.promise)); await activate(view.one('#ce-export'));
    await act(async()=>{ pending.reject(new Error('Clipboard rejection before a frame')); await Promise.resolve(); await Promise.resolve(); });
    const destination=view.one('#ce-quiz-toggle'); destination.focus(); await settle();
    expectManualReport(view); expect(document.activeElement).toBe(destination);
  });

  it('closes manual recovery, returns focus to Export, and keeps the status target available',async()=>{
    const view=mountTool(path),button=view.one('#ce-export'),status=expectStatus(view),panel=view.one('#ce-export-panel');
    await activate(button); expectManualReport(view);
    await activate(view.one('#ce-export-close'));
    expect(document.activeElement).toBe(button); expect(view.one('#ce-export-panel')).toBe(panel); expect(panel.hidden).toBe(true);
    expect(view.one('#ce-export-status')).toBe(status);
  });

  it('restores a report on any tab without initiating a copy or stealing focus',async()=>{
    const outside=document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(()=>outside.remove());
    const helper=vi.fn(),view=mountTool(path,{ tab:'tipping',exportedReport:'Climate report restored from saved work.' },helper); await settle();
    expect(expectManualReport(view).value).toContain('restored from saved work'); expect(document.activeElement).toBe(outside);
    expect(helper).not.toHaveBeenCalled(); expect(view.award).not.toHaveBeenCalled();
  });

  it('does not restore a permanent busy state from an interrupted saved copy operation',async()=>{
    const helper=vi.fn(()=>Promise.resolve()),view=mountTool(path,{ exportStatus:'copying' },helper),button=view.one('#ce-export');
    await settle();
    expect(button.disabled).toBe(false); expect(button.getAttribute('aria-busy')).not.toBe('true');
    expect(button.getAttribute('aria-disabled')).not.toBe('true'); expect(view.one('#ce-export-status').textContent).not.toMatch(/copying/i);
    expect(helper).not.toHaveBeenCalled(); await activate(button);
    expect(helper).toHaveBeenCalledTimes(1); expect(view.one('#ce-export-status').textContent).toMatch(/copied/i);
    expect(document.activeElement).toBe(button);
  });

  it.each([
    { hypothesis:{ stale:true },explanation:['stale'] },
    { hypothesis:12,explanation:false },
    7,
    null
  ])('exports safely when saved reflection work is malformed: %j',async forceHunt=>{
    const view=mountTool(path,{ forceHunt }); await activate(view.one('#ce-export'));
    const report=expectManualReport(view).value;
    expect(report).not.toContain('In My Own Words'); expect(report).not.toMatch(/\[object Object\]|NaN|undefined/);
  });

  it('retains valid trimmed multiline reflection text while ignoring a malformed companion field',async()=>{
    const view=mountTool(path,{ forceHunt:{ hypothesis:{ invalid:true },explanation:'  First line.\nSecond line.  ' } });
    await activate(view.one('#ce-export'));
    const report=expectManualReport(view).value;
    expect(report).toContain('In My Own Words'); expect(report).toContain('> First line.\n> Second line.');
    expect(report).not.toContain('[object Object]');
  });

  it.each(['resolve','reject'])('ignores a late %s clipboard result after the tool unmounts',async outcome=>{
    const pending=deferred(),view=mountTool(path,{},vi.fn(()=>pending.promise)); await activate(view.one('#ce-export'));
    view.unmount();
    const outside=document.createElement('button'); document.body.appendChild(outside); outside.focus(); disposers.push(()=>outside.remove());
    await finish(pending,outcome==='resolve');
    expect(view.award).not.toHaveBeenCalled(); expect(view.toast).not.toHaveBeenCalled(); expect(view.announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(outside); expect(document.getElementById('ce-export-panel')).toBeNull();
  });
});
