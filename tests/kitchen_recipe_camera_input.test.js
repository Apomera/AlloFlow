// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Input=require('../stem_lab/kitchen_studio/recipe_lab_camera_input.js');
let mounted=[];
function pointer(target,type,values={}){
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,buttons:type==='pointerdown'?1:0,...values});
  Object.defineProperties(event,{pointerId:{value:values.pointerId??1},pointerType:{value:values.pointerType??'mouse'}});
  target.dispatchEvent(event);return event;
}
function fixture(callback=vi.fn()){
  const canvas=document.createElement('canvas');document.body.append(canvas);
  const ui=Input.mount({canvas,onCancel:callback});mounted.push(ui);return {canvas,ui,cancel:callback};
}
function visibility(hidden){Object.defineProperty(document,'hidden',{configurable:true,value:hidden});document.dispatchEvent(new Event('visibilitychange'));}
beforeEach(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
afterEach(()=>{mounted.forEach(ui=>ui.dispose());mounted=[];delete document.hidden;document.body.replaceChildren();});
describe('Camera input interruptions and native zoom',()=>{
  it('requires a canvas event target and a cancellation callback',()=>{
    expect(()=>Input.mount()).toThrow(TypeError);
    expect(()=>Input.mount({canvas:document.createElement('canvas')})).toThrow(TypeError);
    expect(()=>Input.mount({canvas:{},onCancel(){}})).toThrow(TypeError);
  });
  it.each(['blur','pagehide'])('cancels pending input once on %s and accepts a fresh gesture',type=>{
    const m=fixture();window.dispatchEvent(new Event(type));expect(m.cancel).not.toHaveBeenCalled();
    pointer(m.canvas,'pointerdown');window.dispatchEvent(new Event(type));window.dispatchEvent(new Event(type));
    expect(m.cancel).toHaveBeenCalledTimes(1);
    pointer(m.canvas,'pointerdown',{pointerId:2});window.dispatchEvent(new Event(type));expect(m.cancel).toHaveBeenCalledTimes(2);
  });
  it('cancels when the document becomes hidden, without cancelling on a visible notification',()=>{
    const m=fixture();pointer(m.canvas,'pointerdown');visibility(false);expect(m.cancel).not.toHaveBeenCalled();
    visibility(true);visibility(true);visibility(false);expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('does not track input that began outside the canvas',()=>{
    const m=fixture();pointer(document.body,'pointerdown');window.dispatchEvent(new Event('blur'));
    pointer(m.canvas,'pointercancel');pointer(m.canvas,'lostpointercapture');expect(m.cancel).not.toHaveBeenCalled();
  });
  it('does not mistake a control losing focus within the page for window blur',()=>{
    const m=fixture(),button=document.createElement('button');document.body.append(button);button.focus();
    pointer(m.canvas,'pointerdown');m.canvas.tabIndex=-1;m.canvas.focus();
    expect(document.activeElement).toBe(m.canvas);expect(m.cancel).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('blur'));expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('ignores even bubbling element blur while observing a blur dispatched on its window',()=>{
    const m=fixture(),button=document.createElement('button');document.body.append(button);pointer(m.canvas,'pointerdown');
    button.dispatchEvent(new FocusEvent('blur',{bubbles:true}));expect(m.cancel).not.toHaveBeenCalled();
    const targets=[];const observe=event=>targets.push(event.target===event.currentTarget);
    document.defaultView.addEventListener('blur',observe,{once:true});window.dispatchEvent(new Event('blur'));
    expect(targets).toEqual([true]);expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('clears an ordinary release outside the canvas without cancelling it',()=>{
    const m=fixture();pointer(m.canvas,'pointerdown');pointer(document.body,'pointerup');
    pointer(m.canvas,'lostpointercapture');window.dispatchEvent(new Event('blur'));expect(m.cancel).not.toHaveBeenCalled();
  });
  it('clears only the released pointer while another touch remains pending',()=>{
    const m=fixture();pointer(m.canvas,'pointerdown',{pointerId:1,pointerType:'touch'});pointer(m.canvas,'pointerdown',{pointerId:2,pointerType:'touch'});
    pointer(document.body,'pointerup',{pointerId:1,pointerType:'touch'});pointer(m.canvas,'lostpointercapture',{pointerId:1,pointerType:'touch'});
    expect(m.cancel).not.toHaveBeenCalled();window.dispatchEvent(new Event('blur'));expect(m.cancel).toHaveBeenCalledTimes(1);
    pointer(m.canvas,'lostpointercapture',{pointerId:2,pointerType:'touch'});expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it.each(['pointercancel','lostpointercapture'])('cancels all pending pointers only for a matching %s',type=>{
    const m=fixture();pointer(m.canvas,'pointerdown',{pointerId:1});pointer(m.canvas,'pointerdown',{pointerId:2,pointerType:'touch'});
    pointer(m.canvas,type,{pointerId:3});expect(m.cancel).not.toHaveBeenCalled();
    pointer(m.canvas,type,{pointerId:1});pointer(m.canvas,type,{pointerId:2});window.dispatchEvent(new Event('blur'));expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('cancels an unpressed matching mouse move after a missed release, without consuming the move',()=>{
    const m=fixture();pointer(m.canvas,'pointerdown');
    pointer(document.body,'pointermove',{buttons:1});pointer(document.body,'pointermove',{pointerId:2});expect(m.cancel).not.toHaveBeenCalled();
    const next=vi.fn();document.body.addEventListener('pointermove',next,{once:true});
    const event=pointer(document.body,'pointermove');expect(m.cancel).toHaveBeenCalledTimes(1);expect(event.defaultPrevented).toBe(false);expect(next).toHaveBeenCalledTimes(1);
    pointer(document.body,'pointermove');expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('does not treat buttonless touch or pen moves as a lost mouse release',()=>{
    const m=fixture();for(const [id,type] of [[1,'touch'],[2,'pen']]){pointer(m.canvas,'pointerdown',{pointerId:id,pointerType:type});pointer(document.body,'pointermove',{pointerId:id,pointerType:type,buttons:0});}
    expect(m.cancel).not.toHaveBeenCalled();window.dispatchEvent(new Event('blur'));expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('tracks pointerdown before a later scene capture listener stops propagation',()=>{
    const m=fixture();m.canvas.addEventListener('pointerdown',event=>event.stopImmediatePropagation(),true);
    pointer(m.canvas,'pointerdown');window.dispatchEvent(new Event('blur'));expect(m.cancel).toHaveBeenCalledTimes(1);
  });
  it('observes pointerup before a scene handler releases capture and stops propagation',()=>{
    const m=fixture();m.canvas.addEventListener('pointerup',event=>{pointer(m.canvas,'lostpointercapture');event.stopImmediatePropagation();},true);
    pointer(m.canvas,'pointerdown');pointer(m.canvas,'pointerup');window.dispatchEvent(new Event('blur'));expect(m.cancel).not.toHaveBeenCalled();
  });
  it('clears pending input before calling the host, including reentrant cancellation and a new gesture',()=>{
    let canvas,calls=0;const m=fixture(()=>{calls++;if(calls===1){window.dispatchEvent(new Event('blur'));pointer(canvas,'pointerdown',{pointerId:2});}});canvas=m.canvas;
    pointer(canvas,'pointerdown');window.dispatchEvent(new Event('blur'));expect(calls).toBe(1);
    window.dispatchEvent(new Event('blur'));expect(calls).toBe(2);
  });
  it.each([{ctrlKey:true},{metaKey:true},{ctrlKey:true,metaKey:true}])('preserves browser zoom defaults and stops canvas camera wheel listeners for %j',modifiers=>{
    const m=fixture(),orbit=vi.fn(event=>event.preventDefault()),laterCapture=vi.fn();
    m.canvas.addEventListener('wheel',laterCapture,true);m.canvas.addEventListener('wheel',orbit);
    const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:40,...modifiers});
    expect(m.canvas.dispatchEvent(event)).toBe(true);expect(event.defaultPrevented).toBe(false);
    expect(laterCapture).not.toHaveBeenCalled();expect(orbit).not.toHaveBeenCalled();expect(m.cancel).not.toHaveBeenCalled();
  });
  it('leaves ordinary and shift wheel behavior to the existing camera listener',()=>{
    const m=fixture(),orbit=vi.fn(event=>event.preventDefault());m.canvas.addEventListener('wheel',orbit);
    for(const shiftKey of [false,true]){const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:40,shiftKey});expect(m.canvas.dispatchEvent(event)).toBe(false);expect(event.defaultPrevented).toBe(true);}
    expect(orbit).toHaveBeenCalledTimes(2);expect(m.cancel).not.toHaveBeenCalled();
  });
  it('does not intercept scrolling over help next to the canvas',()=>{
    const m=fixture(),help=document.createElement('div'),parentWheel=vi.fn();m.canvas.after(help);document.body.addEventListener('wheel',parentWheel,{once:true});
    const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:40,ctrlKey:true});help.dispatchEvent(event);
    expect(parentWheel).toHaveBeenCalledTimes(1);expect(event.defaultPrevented).toBe(false);expect(m.cancel).not.toHaveBeenCalled();
  });
  it('removes all lifecycle and wheel listeners on idempotent disposal without calling the host',()=>{
    const m=fixture(),orbit=vi.fn();m.canvas.addEventListener('wheel',orbit);pointer(m.canvas,'pointerdown');m.ui.dispose();m.ui.dispose();
    pointer(m.canvas,'pointerdown');pointer(document.body,'pointermove');pointer(m.canvas,'pointercancel');pointer(m.canvas,'lostpointercapture');
    window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('pagehide'));visibility(true);
    m.canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true}));expect(orbit).toHaveBeenCalledTimes(1);expect(m.cancel).not.toHaveBeenCalled();
  });
});
