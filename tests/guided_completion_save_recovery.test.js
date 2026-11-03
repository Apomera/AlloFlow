import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url),babel=require('@babel/core');
const candidate=process.env.GUIDED_COMPLETION_CANDIDATES||'.',factories={},views={},cleanups=[];
beforeAll(()=>{
  window.React=React;
  factories.source=new Function(readFileSync(resolve(candidate,'host_handlers_source.jsx'),'utf8')+'\nreturn createHostHandlers;')();
  const source=babel.transformSync(readFileSync(resolve(candidate,'view_guided_mode_banner_source.jsx'),'utf8'),{plugins:[['@babel/plugin-transform-react-jsx',{useBuiltIns:false}]],babelrc:false,configFile:false}).code;
  views.source=new Function('React',source+'\nreturn GuidedModeBanner;')(React);
  delete window.AlloModules.HostHandlers;delete window.AlloModules.GuidedModeBanner;
  loadAlloModule(resolve(candidate,'host_handlers_module.js'));loadAlloModule(resolve(candidate,'view_guided_mode_banner_module.js'));
  factories.runtime=window.AlloModules.HostHandlers;views.runtime=window.AlloModules.GuidedModeBanner.GuidedModeBanner;
},30000);
beforeEach(()=>localStorage.clear());
afterEach(()=>{cleanups.splice(0).reverse().forEach(fn=>fn());vi.restoreAllMocks();});
const ARCHIVE='allo_guided_completed_runs',LAST='allo_guided_last_completion',PROGRESS='allo_guided_progress',READINESS='allo_guided_readiness_checks';
const setters=['setGuidedMode','setGuidedStep','setGuidedSelectedIds','setGuidedCompletedIds','setGuidedSkippedIds','setGuidedCreatedHistoryIds','setGuidedDeliveryEvidence','setGuidedPlanBrief','setGuidedAdvanceNotice','setGuidedNavigationUndo','setGuidedProgressSaveState'];
const priorEntry={version:1,completionId:'older',completedAt:'2026-10-01T00:00:00.000Z',resourceCount:1};
function harness(lane){
  const deps={inputText:'Plants need water.',guidedSelectedIds:['analysis'],guidedCompletedIds:['source-input','analysis'],guidedSkippedIds:[],guidedCreatedHistoryIds:['check-1'],guidedDeliveryEvidence:{directionsSaved:true},t:()=>'',addToast:vi.fn()};
  setters.forEach(name=>deps[name]=vi.fn());
  return{deps,finish:factories[lane](deps).handleCompleteGuidedMode};
}
function seed(){localStorage.setItem(ARCHIVE,JSON.stringify([priorEntry]));localStorage.setItem(LAST,JSON.stringify(priorEntry));localStorage.setItem(PROGRESS,JSON.stringify({version:1,savedAt:'2026-11-03T12:00:00.000Z',guidedStep:4,stepId:'_final',selectedIds:['analysis'],completedSteps:['source-input','analysis'],skippedSteps:[],createdHistoryIds:['check-1'],deliveryEvidence:{directionsSaved:true},planBrief:null}));localStorage.setItem(READINESS,'{"checks":{"directions":true}}');}
function retained(h,progress){setters.forEach(name=>expect(h.deps[name]).not.toHaveBeenCalled());expect(localStorage.getItem(PROGRESS)).toBe(progress);expect(h.deps.addToast).not.toHaveBeenCalledWith(expect.anything(),'success');}
function blockSet(key){const original=Storage.prototype.setItem;return vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);});}
const summary={completedCount:2,resourceCount:1,readinessCount:6,readinessTotal:6};
describe.each(['source','runtime'])('Guided completion storage recovery (%s)',lane=>{
  it('archives the run and verifies both summaries before clearing active progress',()=>{
    seed();const h=harness(lane),result=h.finish(summary);expect(result?.ok).toBe(true);
    expect(JSON.parse(localStorage.getItem(ARCHIVE))).toEqual([result.entry,priorEntry]);expect(JSON.parse(localStorage.getItem(LAST))).toEqual(result.entry);
    expect(localStorage.getItem(PROGRESS)).toBeNull();expect(localStorage.getItem(READINESS)).toBeNull();expect(h.deps.setGuidedMode).toHaveBeenCalledWith(false);expect(h.deps.addToast).toHaveBeenCalledWith(expect.anything(),'success');
  });
  it.each([LAST,ARCHIVE])('retains the active run when writing %s fails and permits retry',key=>{
    seed();const progress=localStorage.getItem(PROGRESS),rawArchive=localStorage.getItem(ARCHIVE),h=harness(lane),block=blockSet(key);
    const result=h.finish(summary);expect(result?.ok).toBe(false);retained(h,progress);expect(localStorage.getItem(ARCHIVE)).toBe(rawArchive);expect(JSON.parse(localStorage.getItem(LAST))).toEqual(priorEntry);
    block.mockRestore();const retry=h.finish(result.entry);expect(retry?.ok).toBe(true);expect(retry.entry.completionId).toBe(result.entry.completionId);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
  });
  it.each([[ARCHIVE,'{broken'],[ARCHIVE,'{}'],[LAST,'{broken']])('preserves unreadable history %s=%s without replacing it', (key,raw)=>{
    seed();localStorage.setItem(key,raw);const progress=localStorage.getItem(PROGRESS),h=harness(lane),writes=vi.spyOn(Storage.prototype,'setItem');
    const result=h.finish(summary);expect(result?.ok).toBe(false);expect(result.reason).toBe('history-unreadable');retained(h,progress);expect(localStorage.getItem(key)).toBe(raw);expect(writes).not.toHaveBeenCalled();
  });
  it('retries a partial save after reopening rewrites savedAt and JSON key order without duplicating the archive',()=>{
    seed();const h=harness(lane),progress=localStorage.getItem(PROGRESS),get=Storage.prototype.getItem;let reads=0;
    const fault=vi.spyOn(Storage.prototype,'getItem').mockImplementation(function(k){if(k===ARCHIVE&&++reads===2)throw new DOMException('Read failed','SecurityError');return get.call(this,k);});
    const result=h.finish(summary);expect(result?.ok).toBe(false);fault.mockRestore();retained(h,progress);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
    const originalProgress=JSON.parse(progress);localStorage.setItem(PROGRESS,JSON.stringify(Object.fromEntries(Object.entries({...originalProgress,savedAt:'2026-11-03T12:05:00.000Z'}).reverse())));
    const reopened=harness(lane),retry=reopened.finish(summary);expect(retry?.ok).toBe(true);expect(retry.entry.completionId).toBe(result.entry.completionId);expect(retry.entry.completedAt).toBe(result.entry.completedAt);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
  });
  it('keeps separate successful identical runs as separate completion summaries',()=>{
    seed();const originalProgress=JSON.parse(localStorage.getItem(PROGRESS));
    const first=harness(lane).finish(summary);expect(first?.ok).toBe(true);
    expect(localStorage.getItem('allo_guided_pending_completion')).toBeNull();
    localStorage.setItem(PROGRESS,JSON.stringify({...originalProgress,savedAt:'2026-11-04T12:00:00.000Z'}));
    const second=harness(lane).finish(summary);expect(second?.ok).toBe(true);
    expect(second.entry.completionId).not.toBe(first.entry.completionId);
    expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(3);
    expect(localStorage.getItem('allo_guided_pending_completion')).toBeNull();
  });
  it('retains the active run when the pending completion marker cannot be saved',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),archive=localStorage.getItem(ARCHIVE),h=harness(lane),block=blockSet('allo_guided_pending_completion');
    expect(h.finish(summary)?.ok).toBe(false);retained(h,progress);expect(localStorage.getItem(ARCHIVE)).toBe(archive);
    block.mockRestore();expect(h.finish(summary)?.ok).toBe(true);
  });
  it('keeps active progress if pending-marker cleanup fails and retries once after reopening',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),h=harness(lane),remove=Storage.prototype.removeItem;
    const fault=vi.spyOn(Storage.prototype,'removeItem').mockImplementation(function(k){if(k==='allo_guided_pending_completion')throw new DOMException('Unavailable','SecurityError');return remove.call(this,k);});
    const first=h.finish(summary);expect(first?.ok).toBe(false);retained(h,progress);fault.mockRestore();
    const saved=JSON.parse(progress);localStorage.setItem(PROGRESS,JSON.stringify({...saved,savedAt:'2026-11-04T12:00:00.000Z'}));
    const retry=harness(lane).finish(summary);expect(retry?.ok).toBe(true);expect(retry.entry.completionId).toBe(first.entry.completionId);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
  });
  it('rejects a pending-marker write that did not persist',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),h=harness(lane),set=Storage.prototype.setItem;
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k!=='allo_guided_pending_completion')return set.call(this,k,v);});
    expect(h.finish(summary)?.ok).toBe(false);retained(h,progress);
  });
  it.each(['resources','source'])('gives a changed %s a different completion identity after an interrupted finish',change=>{
    seed();const h=harness(lane),remove=Storage.prototype.removeItem;
    const fault=vi.spyOn(Storage.prototype,'removeItem').mockImplementation(function(k){if(k===PROGRESS)throw new DOMException('Unavailable','SecurityError');return remove.call(this,k);});
    const interrupted=h.finish(summary);expect(interrupted?.ok).toBe(false);fault.mockRestore();const reopened=harness(lane);
    if(change==='resources'){const p=JSON.parse(localStorage.getItem(PROGRESS));p.createdHistoryIds=['check-2'];localStorage.setItem(PROGRESS,JSON.stringify(p));reopened.deps.guidedCreatedHistoryIds=['check-2'];}
    else reopened.deps.inputText='A different lesson passage.';
    const result=reopened.finish(summary);expect(result?.ok).toBe(true);expect(result.entry.completionId).not.toBe(interrupted.entry.completionId);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(3);
  });
  it('retains the run and restores readiness when removing active progress fails',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),readiness=localStorage.getItem(READINESS),h=harness(lane),remove=Storage.prototype.removeItem;
    const fault=vi.spyOn(Storage.prototype,'removeItem').mockImplementation(function(k){if(k===PROGRESS)throw new DOMException('Unavailable','SecurityError');return remove.call(this,k);});
    const result=h.finish(summary);expect(result?.ok).toBe(false);retained(h,progress);expect(localStorage.getItem(READINESS)).toBe(readiness);fault.mockRestore();
    expect(harness(lane).finish(summary)?.ok).toBe(true);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
  });
  it('does not finish when removing active progress silently fails',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),h=harness(lane),remove=Storage.prototype.removeItem;
    const fault=vi.spyOn(Storage.prototype,'removeItem').mockImplementation(function(k){if(k!==PROGRESS)return remove.call(this,k);});
    const first=h.finish(summary);expect(first?.ok).toBe(false);retained(h,progress);expect(localStorage.getItem('allo_guided_pending_completion')).not.toBeNull();
    fault.mockRestore();const retry=harness(lane).finish(summary);expect(retry?.ok).toBe(true);expect(retry.entry.completionId).toBe(first.entry.completionId);expect(JSON.parse(localStorage.getItem(ARCHIVE))).toHaveLength(2);
  });
  it('detects a write that did not persist before removing active progress',()=>{
    seed();const progress=localStorage.getItem(PROGRESS),h=harness(lane),set=Storage.prototype.setItem;
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(k,v){if(k!==ARCHIVE)return set.call(this,k,v);});
    expect(h.finish(summary)?.ok).toBe(false);retained(h,progress);
  });
});
function mount(lane,h){
  const steps=[{id:'_final',phase:'finish',label:'Review & Finish',action:'Review.',success:'All set.'}],host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);
  const props={GUIDED_STEPS:steps,allGuidedSteps:steps,guidedStep:0,GUIDED_TOUR_MAP:{},tourSteps:[],guidedSelectedIds:null,guidedCompletedIds:[],guidedSkippedIds:[],guidedCreatedHistoryIds:[],wordSoundsHistory:[],history:[],inputText:'',t:()=>'',getDefaultTitle:type=>type,setInputText:()=>{},handleExitGuidedMode:vi.fn(),handleGuidedSkip:()=>{},setGuidedStep:()=>{},setShowGuidedTip:()=>{},markGuidedStepDone:()=>{},guidedDeliveryEvidence:{},handleCompleteGuidedMode:h.finish};
  act(()=>root.render(React.createElement(views[lane],props)));cleanups.push(()=>{act(()=>root.unmount());host.remove();});
  const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent===text);
  return{host,button,finish:()=>{act(()=>button('Finish with checks remaining').click());act(()=>button('Finish anyway').click());}};
}
describe.each(['source','runtime'])('Guided completion recovery controls (%s)',lane=>{
  it('keeps the finish screen open with focused recovery controls and retries the actual host save',()=>{
    seed();const h=harness(lane),view=mount(lane,h),block=blockSet(ARCHIVE),progress=localStorage.getItem(PROGRESS);view.finish();
    const panel=view.host.querySelector('[aria-labelledby="guided-completion-save-title"]');expect(panel).toBeTruthy();expect(document.activeElement).toBe(panel);retained(h,progress);
    expect(view.button('Retry save')).toBeTruthy();expect(view.button('Download summary backup')).toBeTruthy();block.mockRestore();act(()=>view.button('Retry save').click());expect(h.deps.setGuidedMode).toHaveBeenCalledWith(false);expect(view.host.querySelector('[aria-labelledby="guided-completion-save-title"]')).toBeNull();
  });
  it('downloads the unsaved summary while preserving unreadable history and the active run',async()=>{
    seed();localStorage.setItem(ARCHIVE,'{unreadable');const h=harness(lane),view=mount(lane,h);view.finish();let blob;vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{blob=value;return'blob:guided-summary';});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    act(()=>view.button('Download summary backup').click());const payload=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(JSON.parse(r.result));r.onerror=reject;r.readAsText(blob);});
    expect(payload).toMatchObject({format:'alloflow-guided-completion',version:1,completion:{readinessTotal:6,completionId:expect.any(String)}});expect(click).toHaveBeenCalledOnce();expect(localStorage.getItem(ARCHIVE)).toBe('{unreadable');expect(localStorage.getItem(PROGRESS)).not.toBeNull();expect(h.deps.setGuidedMode).not.toHaveBeenCalled();expect(view.host.textContent).toContain('Summary backup download started.');
  });
  it('reports a failed backup download and keeps retry/export controls available',()=>{
    seed();const h=harness(lane),view=mount(lane,h);blockSet(ARCHIVE);view.finish();vi.spyOn(URL,'createObjectURL').mockImplementation(()=>{throw Error('Unavailable');});act(()=>view.button('Download summary backup').click());
    expect(view.host.textContent).toContain('The summary download could not start.');expect(view.button('Retry save')).toBeTruthy();expect(view.button('Download summary backup')).toBeTruthy();expect(h.deps.setGuidedMode).not.toHaveBeenCalled();
  });
});
