import { beforeAll, afterEach, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R, detach, field;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); R = window.__RR_TEST_EXPORTS__.roadReady; });
afterEach(() => { if(detach) detach(); if(field) field.remove(); field = null; });
function harness() { const ref={current:{}}; let resets=0; detach=R.attachDrillKeys(ref,()=>resets++); return {ref,resets:()=>resets}; }
function key(target,type,key,extra={}) { const e=new window.KeyboardEvent(type,{key,bubbles:true,cancelable:true,...extra}); target.dispatchEvent(e); return e; }
it('clears held controls and queued actions on entering a form field', () => {
  const {ref}=harness(); key(document.body,'keydown','w'); key(document.body,'keydown','g');
  field=document.createElement('input'); document.body.appendChild(field); field.focus();
  expect(ref.current).toEqual({});
  key(field,'keyup','w'); key(field,'keydown','s'); expect(ref.current.s).toBeUndefined();
});
it('releases a held key even when its keyup originates in a select or has modifiers', () => {
  const {ref}=harness(); field=document.createElement('select'); document.body.appendChild(field);
  key(document.body,'keydown','a'); key(field,'keyup','a',{ctrlKey:true}); expect(ref.current.a).toBe(false);
  expect(key(field,'keydown','ArrowDown').defaultPrevented).toBe(false); expect(ref.current.arrowdown).toBeUndefined();
});
it('does not turn browser shortcuts into driving, gear, Park or reset actions', () => {
  const {ref,resets}=harness();
  for(const modifier of ['ctrlKey','metaKey','altKey']) for(const value of ['r','s','p','g','ArrowLeft']) {
    expect(key(document.body,'keydown',value,{[modifier]:true}).defaultPrevented).toBe(false);
    key(document.body,'keyup',value,{[modifier]:true});
  }
  expect(ref.current).toEqual({}); expect(resets()).toBe(0);
});
it('removes the focus listener on detach', () => {
  const {ref}=harness(); detach(); detach=null;
  ref.current.w=true; field=document.createElement('input'); document.body.appendChild(field); field.focus();
  expect(ref.current.w).toBe(true);
});
it('waits for held entry inputs, including pause, and then accepts fresh controls', () => {
  for(const actions of [{throttle:1},{steer:0.6},{reverse:1},{park:1},{pause:1}]) {
    const c={speed:0,steering:0,driveGear:'D',requireParkingNeutral:true},k={};
    for(let i=0;i<3;i++)expect(R.parkingControllerKeys(c,k,actions)._practiceInactive).toBe(true);
    expect(c.practicePaused).not.toBe(true); expect(c.driveGear).toBe('D'); expect(k._securePark).toBe(false);
    R.parkingControllerKeys(c,k,{}); expect(c.requireParkingNeutral).toBe(false);
    expect(R.parkingControllerKeys(c,k,{throttle:0.5})._gpThrottle).toBe(0.5);
  }
});
