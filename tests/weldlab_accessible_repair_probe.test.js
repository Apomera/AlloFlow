import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {node,freshTool,mountState,unmountState,click,change} from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(()=>{
 vi.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){
  return new Proxy({canvas:this},{get(target,key){if(key in target)return target[key];if(key==='measureText')return()=>({width:20});if(key==='createLinearGradient'||key==='createRadialGradient')return()=>({addColorStop(){}});return()=>{};}});
 });
 freshTool();
});
afterEach(async()=>{await unmountState();outside?.remove();outside=null;vi.restoreAllMocks();});
const q=selector=>node().querySelector(selector);
const retained={car2_reflect:'Keep my repair notes.',qp_ans:{0:1},weldBadges:{ppeSafety:true},dd2Score:1,dd2Rounds:1};
const record={tries:3,best:.75,fixed:false,lastAt:'2026-10-20T12:00:00.000Z'};
const state={...retained,view:'defectDiagnose',dd2Idx:1,dd2Shown:[1],dd2Ans:true,dd2Pick:'heatHigh',dh2_ddSec:'travelFast',dh2_diag:{2:record,7:{tries:2,best:1,fixed:true,lastAt:'2026-10-19T12:00:00.000Z'}}};
const slider=()=>q('#repair6-candidate'),apply=()=>q('[data-repair-apply]'),current=()=>q('[data-repair-use-current]');
const panel=()=>q('[data-repair-probe]'),reading=()=>q('#repair6-preview-readings');
const axis=id=>q('[data-repair-axis="'+id+'"]');
const live=id=>q('input[aria-label="'+id+'"]');
function outsideFocus(){outside=document.createElement('button');document.body.append(outside);outside.focus();}
function summary(){
 const result=reading();expect(result).toBeTruthy();expect(result.tagName).toBe('DIV');expect(result.getAttribute('aria-live')).toBe('polite');expect(result.getAttribute('aria-atomic')).toBe('true');
 expect(node().querySelectorAll('#'+result.id)).toHaveLength(1);expect(slider().getAttribute('aria-describedby')).toBe(result.id);
 expect(result.querySelector('canvas,svg,input,select,button')).toBeNull();expect(q('[data-repair-preview] canvas')).toBeTruthy();
 for(const button of [apply(),current(),...node().querySelectorAll('[data-repair-axis]')])expect(button.getAttribute('aria-controls')).toBe(result.id);
 const p=panel(),model=window.__WeldLabCore.dhFixState({target:'undercut',P:'mig',TH:.25},Number(p.dataset.fixedV),Number(p.dataset.fixedA),Number(p.dataset.fixedTs));
 expect(Number(q('[data-repair-preview]').dataset.targetIndex)).toBeCloseTo(model.target,12);expect(Number(q('[data-repair-preview]').dataset.net)).toBeCloseTo(model.net,12);
 expect(result.textContent).toContain('Target index: '+(model.target*100).toFixed(1)+'%');expect(result.textContent).toContain('heat input: '+model.net.toFixed(2)+' kJ/in');
 const active=Object.entries(model.defects).filter(([,value])=>value>0);expect(result.querySelectorAll('[data-repair-defect]')).toHaveLength(active.length);
 for(const[key,value]of active){const item=result.querySelector('[data-repair-defect="'+key+'"]');expect(Number(item.dataset.index)).toBeCloseTo(value,12);expect(item.textContent).toContain((value*100).toFixed(1)+'%');}
 expect(result.textContent).toContain(model.cleared?'No defects reported by the lesson model at this candidate.':'Defects reported at this candidate:');return result;
}
function retainedScores(app){expect(app.latest()).toMatchObject(retained);expect(app.latest().dh2_diag[7]).toEqual(state.dh2_diag[7]);}

describe('Defect Diagnose candidate exploration and Apply focus',()=>{
 it.each([false,true])('applies a clean candidate then focuses the updated native slider, retaining first-fixed history and score semantics, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast),result=summary(),announcer=document.getElementById('allo-live-weldlab');announcer.textContent='Unchanged announcement';
  const saved=structuredClone(app.latest());slider().focus();await change(slider(),'220');expect(document.activeElement).toBe(slider());expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);expect(announcer.textContent).toBe('Unchanged announcement');
  expect(summary()).toBe(result);expect(result.textContent).toContain('No defects reported');apply().focus();await click(apply());
  expect(apply().disabled).toBe(true);expect(document.activeElement).toBe(slider());expect(slider().value).toBe('220');expect(live('Amperage').value).toBe('220');expect(panel().dataset.liveValue).toBe('220');
  expect(summary()).toBe(result);expect(app.latest().dh2_diag[2]).toEqual({...record,fixed:true});expect(announcer.textContent).toBe('Fixed: the defect model reports a clean weld.');
  expect(app.writes).toHaveLength(1);expect(app.writes[0][0]).toBe('dh2_diag');retainedScores(app);
  const writes=app.writes.length;await click(apply());expect(app.writes).toHaveLength(writes);expect(document.activeElement).toBe(slider());
 });

 it.each([false,true])('keeps preview readings stable and native exploration focus while candidate results change across all axes, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast),saved=structuredClone(app.latest()),result=summary(),mutations=[];
  const observer=new MutationObserver(items=>mutations.push(...items));observer.observe(result,{childList:true,characterData:true,subtree:true});
  try{
   const initial=result.textContent;
   for(const[id,value]of [['A',220],['TS',3],['V',20]]){
    axis(id).focus();await click(axis(id));expect(document.activeElement).toBe(axis(id));slider().focus();await change(slider(),String(value));expect(document.activeElement).toBe(slider());expect(summary()).toBe(result);
   }
   expect(result.textContent).not.toBe(initial);mutations.push(...observer.takeRecords());expect(mutations.length).toBeGreaterThan(0);
  }finally{observer.disconnect();}
  expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);expect(live('Voltage').value).toBe('28');expect(live('Amperage').value).toBe('280');expect(live('Travel speed').value).toBe('20');
 });

 it.each([false,true])('applies a changed candidate with remaining defects without claiming a fix or altering diagnosis history, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast),saved=structuredClone(app.latest()),announcer=document.getElementById('allo-live-weldlab');
  axis('TS').focus();await click(axis('TS'));slider().focus();await change(slider(),'3');summary();expect(q('[data-repair-preview]').dataset.cleared).toBe('false');announcer.textContent='Unchanged announcement';
  apply().focus();await click(apply());expect(document.activeElement).toBe(slider());expect(slider().value).toBe('3');expect(apply().disabled).toBe(true);expect(live('Travel speed').value).toBe('3');
  expect(summary()).toBe(reading());expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);expect(announcer.textContent).toBe('Unchanged announcement');
 });

 it.each([false,true])('updates the candidate summary from another live dial and retains focus on that live input, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast);slider().focus();await change(slider(),'220');const result=summary(),before=result.textContent;
  const voltage=live('Voltage');voltage.focus();await change(voltage,'20');expect(document.activeElement).toBe(voltage);expect(slider().value).toBe('220');expect(panel().dataset.fixedV).toBe('20');expect(summary()).toBe(result);expect(result.textContent).not.toBe(before);
  expect(live('Amperage').value).toBe('280');retainedScores(app);
 });

 it.each([false,true])('keeps Probe current focus and consumes an Apply focus request once without stealing later focus, contrast=%s',async contrast=>{
  outsideFocus();const app=await mountState(state,contrast);expect(document.activeElement).toBe(outside);
  await change(slider(),'220');apply().focus();await click(apply());expect(document.activeElement).toBe(slider());
  outside.focus();await change(slider(),'210');expect(document.activeElement).toBe(outside);const result=summary();
  current().focus();await click(current());expect(document.activeElement).toBe(current());expect(slider().value).toBe('220');expect(apply().disabled).toBe(true);expect(summary()).toBe(result);
  axis('V').focus();await click(axis('V'));expect(document.activeElement).toBe(axis('V'));expect(slider().value).toBe('28');
  outside.focus();await change(slider(),'26');expect(document.activeElement).toBe(outside);retainedScores(app);
 });

 it.each([false,true])('preserves clean/unfixed announcements and records the first fix only once across repeated repairs, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast),announcer=document.getElementById('allo-live-weldlab');
  await change(slider(),'220');apply().focus();await click(apply());expect(announcer.textContent).toBe('Fixed: the defect model reports a clean weld.');
  const first=structuredClone(app.latest().dh2_diag[2]),writes=app.writes.length;
  live('Amperage').focus();await change(live('Amperage'),'280');expect(document.activeElement).toBe(live('Amperage'));expect(announcer.textContent).toBe('A defect is back in the model.');expect(app.latest().dh2_diag[2]).toEqual(first);
  apply().focus();await click(apply());expect(document.activeElement).toBe(slider());expect(announcer.textContent).toBe('Fixed: the defect model reports a clean weld.');expect(app.latest().dh2_diag[2]).toEqual(first);expect(app.writes).toHaveLength(writes);retainedScores(app);
 });

 it.each([false,true])('keeps initial disabled Apply and saved-attempt mounting quiet without an automatic focus request, contrast=%s',async contrast=>{
  outsideFocus();const app=await mountState(state,contrast);expect(document.activeElement).toBe(outside);expect(apply().disabled).toBe(true);expect(slider().value).toBe('280');summary();
  await click(apply());expect(document.activeElement).toBe(outside);expect(app.latest()).toEqual(state);expect(app.writes).toHaveLength(0);
 });
});
