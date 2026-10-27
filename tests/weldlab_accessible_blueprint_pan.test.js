import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click } from './helpers/weldlab_interaction_mount.js';
import { React } from './helpers/stem_widgets_smoke_harness.js';

let outside;
beforeEach(freshTool);
afterEach(async()=>{await unmountState();outside?.remove();outside=null;});
const q=selector=>node().querySelector(selector);
const pan=direction=>q('[data-blueprint-pan="'+direction+'"]');
const viewport=()=>q('[data-blueprint-viewport]');
const reading=()=>q('[data-blueprint-reading]');
const box=()=>viewport().getAttribute('viewBox').split(' ').map(Number);
const retained={sym2_bp_ans:{c4:1},sym2_pr_ans:{'0_0':2},sym2_b_res:{b1:1},sym2_lib_side:'both',sym2_pr_score:3,sym2_pr_tries:5,car2_reflect:'Keep my reflection.',weldBadges:{ppeSafety:true}};
const state={...retained,view:'symbolsReader',sr_view:'blueprint'};
const dimensions={left:[0,0],right:[0,330],up:[1,0],down:[1,215]};
function expectUnavailable(button){
 expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');expect(button.disabled).toBe(false);
 expect(button.getAttribute('aria-disabled')).toBe('true');expect(button.tabIndex).toBe(0);
 expect(button.style.borderStyle).toBe('dashed');expect(button.style.cursor).toBe('not-allowed');
 // Dimming the whole button would also dim the focus outline at its boundary.
 expect(button.style.opacity).toBe('1');
}
async function zoom(value){const button=q('[data-blueprint-zoom="'+value+'"]');button.focus();await click(button);expect(document.activeElement).toBe(button);}
function observe(element){const records=[];const observer=new MutationObserver(items=>records.push(...items));observer.observe(element,{childList:true,characterData:true,subtree:true,attributes:true});return{records,observer,finish(){records.push(...observer.takeRecords());observer.disconnect();return records;}};}

describe('Blueprint magnifier keeps directional controls discoverable at drawing edges',()=>{
 for(const contrast of [false,true])for(const direction of ['left','right','up','down'])it('retains '+direction+' focus at the exact boundary and makes repeated activation inert, contrast='+contrast,async()=>{
  const app=await mountState(state,contrast),saved=structuredClone(app.latest()),drawingChildren=viewport().innerHTML,live=reading();
  expect(live.getAttribute('aria-live')).toBe('polite');expect(live.getAttribute('aria-atomic')).toBe('true');
  await zoom(2);const button=pan(direction);button.focus();
  for(let step=0;step<4;step++){
   expect(button.getAttribute('aria-disabled')).toBe('false');await click(button);
   expect(document.activeElement).toBe(button);expect(pan(direction)).toBe(button);expect(reading()).toBe(live);
  }
  expectUnavailable(button);const[axis,edge]=dimensions[direction];expect(box()[axis]).toBe(edge);
  const finalBox=box(),finalReading=live.textContent,mutation=observe(live),drawingMutation=observe(viewport());
  try{
   // Native keyboard Enter/Space activation dispatches the same guarded click.
   // Browser tests, rather than synthetic jsdom keydown, check those native keys.
   await click(button);await React.act(()=>{button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));});
   expect(document.activeElement).toBe(button);expect(box()).toEqual(finalBox);expect(live.textContent).toBe(finalReading);
   expect(mutation.finish()).toHaveLength(0);expect(drawingMutation.finish()).toHaveLength(0);
  }finally{mutation.observer.disconnect();drawingMutation.observer.disconnect();}
  expect(viewport().innerHTML).toBe(drawingChildren);expect(app.latest()).toEqual(saved);expect(app.writes).toHaveLength(0);
 });

 it.each([false,true])('does not autofocus or update readings when whole-drawing pan controls are unavailable, contrast=%s',async contrast=>{
  outside=document.createElement('button');document.body.append(outside);outside.focus();
  const app=await mountState(state,contrast),live=reading(),mutation=observe(live);expect(document.activeElement).toBe(outside);
  for(const direction of ['left','right','up','down']){const button=pan(direction);expectUnavailable(button);await click(button);expect(document.activeElement).toBe(outside);}
  expect(box()).toEqual([0,0,660,430]);expect(mutation.finish()).toHaveLength(0);expect(app.latest()).toEqual(state);expect(app.writes).toHaveLength(0);
 });

 it.each([false,true])('re-enables the opposite direction after moving away from an edge without moving focus or changing the drawing, contrast=%s',async contrast=>{
  const app=await mountState(state,contrast);await zoom(2);const original=viewport().innerHTML;
  const left=pan('left');left.focus();for(let i=0;i<4;i++)await click(left);expectUnavailable(left);
  const right=pan('right');right.focus();await click(right);expect(document.activeElement).toBe(right);
  expect(pan('left')).toBe(left);expect(left.getAttribute('aria-disabled')).toBe('false');expect(left.style.borderStyle).toBe('solid');expect(left.style.cursor).toBe('pointer');
  expect(box()[0]).toBeCloseTo(49.5,10);expect(viewport().innerHTML).toBe(original);expect(app.latest()).toEqual(state);expect(app.writes).toHaveLength(0);
 });

 it.each([false,true])('keeps reset and zoom focus after a boundary without introducing later focus requests, contrast=%s',async contrast=>{
  outside=document.createElement('button');document.body.append(outside);outside.focus();
  const app=await mountState(state,contrast);await zoom(2);const left=pan('left');left.focus();for(let i=0;i<4;i++)await click(left);expectUnavailable(left);
  const reset=q('[data-blueprint-reset]');reset.focus();await click(reset);expect(document.activeElement).toBe(reset);expect(box()).toEqual([0,0,660,430]);
  for(const direction of ['left','right','up','down'])expectUnavailable(pan(direction));
  outside.focus();await click(q('[data-blueprint-zoom="3"]'));expect(document.activeElement).toBe(outside);
  expect(box().slice(2)).toEqual([220,430/3]);expect(app.latest()).toEqual(state);expect(app.writes).toHaveLength(0);
 });
});
