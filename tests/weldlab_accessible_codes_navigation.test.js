import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside=null; });
const q=selector=>node().querySelector(selector);
const retained={car2_reflect:'Keep my note.',insp2_sort:{amps:'ok'},insp2_clause:{0:0},qp_ans:{0:1},weldBadges:{ppeSafety:true}};
const base=(field='process')=>({...retained,view:'codes',insp2_codesTab:'flow',insp2_wpsField:field});
const select=()=>q('#wps3-field'),previous=()=>q('[data-wps-field-prev]'),next=()=>q('[data-wps-field-next]');
const step=n=>q('[data-codes-flow-step="'+n+'"]'),flowPrev=()=>q('[data-codes-flow-prev]'),flowNext=()=>q('[data-codes-flow-next]');
const route=id=>q('[data-codes-flow-route="'+id+'"]');
function outsideFocus(){outside=document.createElement('button');document.body.append(outside);outside.focus();}
function expectLive(element){expect(element.getAttribute('aria-live')).toBe('polite');expect(element.getAttribute('aria-atomic')).toBe('true');expect(element.querySelector('button,input,select,svg')).toBeNull();}
function expectWpsResult(){const result=q('#wps3-field-reading');expectLive(result);expect(select().getAttribute('aria-describedby')).toBe(result.id);expect(result.querySelector('[data-wps-field-label]').textContent).toBe(select().selectedOptions[0].textContent);expect(result.textContent).toContain(q('[data-wps-field-value]').textContent);return result;}
function expectFlowResult(){const result=q('#codes6-flow-result');expectLive(result);expect(result.contains(q('[data-codes-flow-reading]'))).toBe(true);expect(result.contains(q('[data-codes-flow-connection]'))).toBe(true);expect(result.contains(q('[data-codes-flow-next-target]'))).toBe(Boolean(q('[data-codes-flow-next-target]')));return result;}
const selectedStep=()=>Number(q('[data-codes-workflow]').dataset.step);

describe('WPS native field navigation and results',()=>{
 it.each([false,true])('retains interior navigation focus and transfers both endpoints to the updated select, contrast=%s',async contrast=>{
  const app=await mountState(base(),contrast);
  previous().focus();await click(previous());expect(select().value).toBe('pqr');expect(previous().disabled).toBe(true);expect(document.activeElement).toBe(select());
  next().focus();await click(next());expect(select().value).toBe('process');expect(document.activeElement).toBe(next());expect(next().disabled).toBe(false);
  await change(select(),'elec');next().focus();await click(next());expect(select().value).toBe('travel');expect(next().disabled).toBe(true);expect(document.activeElement).toBe(select());
  previous().focus();await click(previous());expect(select().value).toBe('elec');expect(document.activeElement).toBe(previous());
  expect(app.latest()).toMatchObject(retained);expect(app.writes.every(([key])=>key==='insp2_wpsField')).toBe(true);expectWpsResult();
 });
 it.each([false,true])('keeps one native result for select and form updates without duplicating the legacy announcement, contrast=%s',async contrast=>{
  const app=await mountState(base(),contrast),result=expectWpsResult(),records=[];
  const live=document.getElementById('allo-live-weldlab');live.textContent='unchanged announcement';
  const observer=new MutationObserver(items=>records.push(...items));observer.observe(result,{subtree:true,childList:true,characterData:true});
  try{
   const before=result.textContent;select().focus();await change(select(),'joint');expect(document.activeElement).toBe(select());expect(expectWpsResult()).toBe(result);expect(result.textContent).not.toBe(before);expect(result.textContent).toContain('Single-V groove');
   const form=q('[data-wps-form-field="gas"]');form.focus();await click(form);expect(document.activeElement).toBe(form);expect(select().value).toBe('gas');expect(expectWpsResult()).toBe(result);expect(result.textContent).toContain('90% argon / 10% CO2');expect(form.getAttribute('aria-controls')).toBe(result.id);
   expect(live.textContent).toBe('unchanged announcement');records.push(...observer.takeRecords());expect(records.length).toBeGreaterThan(0);
  }finally{observer.disconnect();}
  expect(app.latest()).toMatchObject(retained);expect(app.writes.every(([key])=>key==='insp2_wpsField')).toBe(true);
 });
 it.each(['pqr','travel','unknown'])('does not autofocus or rewrite saved field %s on initial render',async field=>{
  outsideFocus();const saved=base(field),app=await mountState(saved);expect(document.activeElement).toBe(outside);expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);expect(select().value).toBe(field==='unknown'?'process':field);
 });
 it.each([false,true])('does not replay a completed endpoint request after direct choice or a tab change, contrast=%s',async contrast=>{
  outsideFocus();const app=await mountState(base(),contrast);previous().focus();await click(previous());expect(document.activeElement).toBe(select());
  outside.focus();await change(select(),'joint');expect(document.activeElement).toBe(outside);
  const sort=button('🗂 Essential Variable Sorter');sort.focus();await click(sort);expect(document.activeElement).toBe(sort);
  const flow=button('🔁 WPS → PQR → WPQ');flow.focus();await click(flow);expect(document.activeElement).toBe(flow);expect(select().value).toBe('joint');expect(app.latest()).toMatchObject(retained);
 });
});

describe('Codes workflow navigation and connection feedback',()=>{
 it.each([false,true])('hands first and last endpoint navigation to the selected native step and retains interior focus, contrast=%s',async contrast=>{
  const saved=base(),app=await mountState(saved,contrast);flowNext().focus();await click(flowNext());expect(selectedStep()).toBe(2);expect(document.activeElement).toBe(flowNext());
  flowPrev().focus();await click(flowPrev());expect(selectedStep()).toBe(1);expect(flowPrev().disabled).toBe(true);expect(document.activeElement).toBe(step(1));expect(step(1).getAttribute('aria-pressed')).toBe('true');
  await click(step(6));flowNext().focus();await click(flowNext());expect(selectedStep()).toBe(7);expect(document.activeElement).toBe(flowNext());
  await click(flowNext());expect(selectedStep()).toBe(8);expect(flowNext().disabled).toBe(true);expect(document.activeElement).toBe(step(8));expect(step(8).getAttribute('aria-pressed')).toBe('true');
  expect(q('[data-codes-flow-connection]').dataset).toMatchObject({from:'7',to:'8',path:'forward',status:'followed'});expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
 });
 it.each([false,true])('keeps one stable native result for step and route changes with no controls in the live subtree, contrast=%s',async contrast=>{
  const saved=base(),app=await mountState(saved,contrast),result=expectFlowResult(),records=[];
  const observer=new MutationObserver(items=>records.push(...items));observer.observe(result,{subtree:true,childList:true,characterData:true});
  try{
   step(3).focus();await click(step(3));expect(document.activeElement).toBe(step(3));expect(expectFlowResult()).toBe(result);expect(result.textContent).toContain('Step 3 of 8');expect(result.textContent).toContain('Connection to explore: step 3 → step 4.');
   route('retry').focus();await click(route('retry'));expect(document.activeElement).toBe(route('retry'));expect(expectFlowResult()).toBe(result);expect(result.textContent).toContain('Connection to explore: step 3 → step 1.');
   flowNext().focus();await click(flowNext());expect(expectFlowResult()).toBe(result);expect(result.textContent).toContain('Last followed connection: step 3 → step 1.');expect(result.textContent).toContain('Next connection: step 1 → step 2.');
   for(const control of [...node().querySelectorAll('[data-codes-flow-step]'),flowPrev(),flowNext()])expect(control.getAttribute('aria-controls')).toBe(result.id);
   records.push(...observer.takeRecords());expect(records.length).toBeGreaterThan(0);
  }finally{observer.disconnect();}
  expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
 });
 it.each([false,true])('keeps Follow focus through both retry paths because that action remains available, contrast=%s',async contrast=>{
  const saved=base(),app=await mountState(saved,contrast);
  for(const[from,to]of [[3,1],[7,6]]){
   await click(step(from));await click(route('retry'));flowNext().focus();await click(flowNext());expect(selectedStep()).toBe(to);expect(flowNext().disabled).toBe(false);expect(document.activeElement).toBe(flowNext());
   expect(q('[data-codes-flow-connection]').dataset).toMatchObject({from:String(from),to:String(to),path:'retry',status:'followed'});
  }
  expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
 });
 it.each([false,true])('keeps initial and direct-choice focus and never replays a previous endpoint request on later tab renders, contrast=%s',async contrast=>{
  outsideFocus();const app=await mountState(base(),contrast);expect(document.activeElement).toBe(outside);expect(flowPrev().disabled).toBe(true);expect(app.writes).toHaveLength(0);
  await click(step(7));flowNext().focus();await click(flowNext());expect(document.activeElement).toBe(step(8));
  outside.focus();await click(step(2));expect(document.activeElement).toBe(outside);expect(selectedStep()).toBe(2);
  step(5).focus();await click(step(5));expect(document.activeElement).toBe(step(5));
  const sort=button('🗂 Essential Variable Sorter');sort.focus();await click(sort);expect(document.activeElement).toBe(sort);
  const flow=button('🔁 WPS → PQR → WPQ');flow.focus();await click(flow);expect(document.activeElement).toBe(flow);expect(selectedStep()).toBe(5);expect(app.latest()).toMatchObject(retained);
 });
});
