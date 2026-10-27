// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Motion=require('../stem_lab/kitchen_studio/recipe_lab_one_shot_motion.js');
let browser,media,clock,queue,nextFrame,mounted,originalMedia;
beforeEach(()=>{
  browser=document.defaultView;originalMedia=Object.getOwnPropertyDescriptor(browser,'matchMedia');
  media=new browser.EventTarget();media.matches=false;
  Object.defineProperty(browser,'matchMedia',{configurable:true,value:vi.fn(()=>media)});
  Object.defineProperty(document,'hidden',{configurable:true,value:false});
  clock=100;queue=new Map();nextFrame=0;mounted=[];
  vi.spyOn(browser.performance,'now').mockImplementation(()=>clock);
  vi.spyOn(browser,'requestAnimationFrame').mockImplementation(callback=>{queue.set(++nextFrame,callback);return nextFrame;});
  vi.spyOn(browser,'cancelAnimationFrame').mockImplementation(id=>queue.delete(id));
});
afterEach(()=>{
  mounted.forEach(ui=>ui.dispose());vi.restoreAllMocks();delete document.hidden;
  if(originalMedia)Object.defineProperty(browser,'matchMedia',originalMedia);else delete browser.matchMedia;
});
function mount(){const ui=Motion.mount({document});mounted.push(ui);return ui;}
function effect(overrides={}){return {duration:1000,frame:vi.fn(),settle:vi.fn(),...overrides};}
function advance(milliseconds){clock+=milliseconds;const frames=Array.from(queue.values());queue.clear();frames.forEach(callback=>callback(clock));}
function reduce(value){media.matches=value;media.dispatchEvent(new browser.Event('change'));}
function hidden(value){Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new browser.Event('visibilitychange'));}
describe('One-shot visual feedback follows current motion and visibility preferences',()=>{
  it('animates using elapsed time, then settles once and stops scheduling frames',()=>{
    const ui=mount(),e=effect();expect(ui.play('pour',e)).toBe(true);expect(e.frame).not.toHaveBeenCalled();
    advance(250);expect(e.frame).toHaveBeenLastCalledWith(.25);advance(500);expect(e.frame).toHaveBeenLastCalledWith(.75);
    advance(250);expect(e.frame).toHaveBeenCalledTimes(2);expect(e.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);
    advance(1000);reduce(true);hidden(true);expect(e.settle).toHaveBeenCalledTimes(1);
  });
  it.each(['reduced','hidden','scene hidden'])('settles directly when starting with %s',condition=>{
    const ui=mount(),e=effect();if(condition==='reduced')reduce(true);else if(condition==='hidden')hidden(true);else ui.setVisible(false);
    expect(ui.play('mix',e)).toBe(false);expect(e.settle).toHaveBeenCalledTimes(1);expect(e.frame).not.toHaveBeenCalled();expect(queue.size).toBe(0);
  });
  it('settles an in-flight pour to its committed level and rest pose when reduced motion changes',()=>{
    const ui=mount(),visual={water:150,lift:0,stream:false},settle=vi.fn(()=>Object.assign(visual,{water:100,lift:0,stream:false}));
    ui.play('pour',effect({frame:t=>Object.assign(visual,{water:150-50*t,lift:Math.sin(Math.PI*t),stream:true}),settle}));
    advance(500);expect(visual).toEqual({water:125,lift:1,stream:true});const stale=Array.from(queue.values())[0];
    reduce(true);expect(visual).toEqual({water:100,lift:0,stream:false});expect(settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);
    stale(clock+100);expect(visual).toEqual({water:100,lift:0,stream:false});expect(settle).toHaveBeenCalledTimes(1);
    reduce(false);advance(1000);expect(queue.size).toBe(0);expect(settle).toHaveBeenCalledTimes(1);
  });
  it('settles a mix at its static pose when hidden, without replaying when visible',()=>{
    const ui=mount();let angle=0;const e=effect({duration:750,frame:t=>{angle=t*2*Math.PI;},settle:vi.fn(()=>{angle=0;})});
    ui.play('mix',e);advance(375);expect(angle).toBe(Math.PI);hidden(true);expect(angle).toBe(0);expect(e.settle).toHaveBeenCalledTimes(1);
    hidden(false);advance(1000);expect(angle).toBe(0);expect(queue.size).toBe(0);
    const next=effect();expect(ui.play('mix',next)).toBe(true);advance(100);expect(next.frame).toHaveBeenCalledWith(.1);
  });
  it('settles active effects when the 3D view is hidden and does not resume them on return',()=>{
    const ui=mount(),pour=effect(),mix=effect({duration:750});ui.play('pour',pour);ui.play('mix',mix);advance(250);
    ui.setVisible(false);expect(pour.settle).toHaveBeenCalledTimes(1);expect(mix.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);
    ui.setVisible(true);advance(1000);expect(pour.frame).toHaveBeenCalledTimes(1);expect(mix.frame).toHaveBeenCalledTimes(1);
  });
  it.each(['reduced','hidden'])('rechecks %s on each frame even before its change event arrives',condition=>{
    const ui=mount(),e=effect();ui.play('pour',e);advance(100);
    if(condition==='reduced')media.matches=true;else Object.defineProperty(document,'hidden',{configurable:true,value:true});
    advance(100);expect(e.frame).toHaveBeenCalledTimes(1);expect(e.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);
  });
  it('cancels an old render without applying its stale final appearance',()=>{
    const ui=mount(),e=effect();ui.play('pour',e);advance(100);const stale=Array.from(queue.values())[0];
    expect(ui.cancel('pour')).toBe(true);expect(ui.cancel('pour')).toBe(false);stale(clock+1000);
    expect(e.frame).toHaveBeenCalledTimes(1);expect(e.settle).not.toHaveBeenCalled();expect(queue.size).toBe(0);
  });
  it('replaces only the named effect and prevents an older callback from touching its replacement',()=>{
    const ui=mount(),old=effect(),next=effect(),mix=effect();ui.play('pour',old);const stale=Array.from(queue.values())[0];ui.play('mix',mix);ui.play('pour',next);
    stale(clock+100);advance(500);expect(old.frame).not.toHaveBeenCalled();expect(old.settle).not.toHaveBeenCalled();
    expect(next.frame).toHaveBeenCalledWith(.5);expect(mix.frame).toHaveBeenCalledWith(.5);ui.cancel('pour');advance(500);
    expect(mix.settle).toHaveBeenCalledTimes(1);expect(next.settle).not.toHaveBeenCalled();expect(queue.size).toBe(0);
  });
  it('does not queue another frame when a frame callback cancels its effect',()=>{
    const ui=mount(),e=effect({frame:()=>ui.cancel('mix')});ui.play('mix',e);advance(100);expect(queue.size).toBe(0);expect(e.settle).not.toHaveBeenCalled();
  });
  it('does not resurrect an effect when preference changes inside its frame callback',()=>{
    const ui=mount(),e=effect({frame:()=>reduce(true)});ui.play('mix',e);advance(100);
    expect(e.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);reduce(false);advance(1000);expect(e.settle).toHaveBeenCalledTimes(1);
  });
  it('clears the completed effect before its settle callback starts a new effect with the same name',()=>{
    const ui=mount(),next=effect(),first=effect({settle:vi.fn(()=>ui.play('mix',next))});ui.play('mix',first);advance(1000);
    expect(first.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(1);advance(500);expect(next.frame).toHaveBeenCalledWith(.5);
  });
  it('settles on pagehide including a bfcache visit, without resuming on return',()=>{
    const ui=mount(),e=effect();ui.play('mix',e);advance(100);const event=new browser.Event('pagehide');Object.defineProperty(event,'persisted',{value:true});browser.dispatchEvent(event);
    expect(e.settle).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);browser.dispatchEvent(new browser.Event('pageshow'));advance(1000);
    expect(e.frame).toHaveBeenCalledTimes(1);expect(ui.play('mix',effect())).toBe(true);
  });
  it('settles before disposal and removes listeners without allowing new or stale animation',()=>{
    const ui=mount(),e=effect(),removeMedia=vi.spyOn(media,'removeEventListener'),removeDoc=vi.spyOn(document,'removeEventListener'),removeWindow=vi.spyOn(browser,'removeEventListener');
    ui.play('pour',e);const stale=Array.from(queue.values())[0];ui.dispose();ui.dispose();stale(clock+100);reduce(true);hidden(true);
    expect(e.settle).toHaveBeenCalledTimes(1);expect(e.frame).not.toHaveBeenCalled();expect(queue.size).toBe(0);
    expect(removeMedia).toHaveBeenCalledWith('change',expect.any(Function));expect(removeDoc).toHaveBeenCalledWith('visibilitychange',expect.any(Function));expect(removeWindow).toHaveBeenCalledWith('pagehide',expect.any(Function));
    const next=effect();expect(ui.play('mix',next)).toBe(false);ui.setVisible(true);expect(next.frame).not.toHaveBeenCalled();expect(next.settle).not.toHaveBeenCalled();
  });
  it('supports legacy media-query change listeners and removes them on disposal',()=>{
    const oldMedia=media;media={matches:false,addListener:vi.fn(handler=>oldMedia.addEventListener('change',handler)),removeListener:vi.fn(handler=>oldMedia.removeEventListener('change',handler))};
    const ui=mount(),e=effect();ui.play('mix',e);media.matches=true;oldMedia.dispatchEvent(new browser.Event('change'));expect(e.settle).toHaveBeenCalledTimes(1);
    ui.dispose();expect(media.removeListener).toHaveBeenCalledWith(media.addListener.mock.calls[0][0]);
  });
  it('rejects invalid effect contracts before replacing a valid active effect',()=>{
    expect(()=>Motion.mount()).toThrow(TypeError);const ui=mount(),e=effect();ui.play('pour',e);
    for(const duration of [0,-1,NaN,Infinity])expect(()=>ui.play('pour',effect({duration}))).toThrow(TypeError);
    expect(()=>ui.play('',effect())).toThrow(TypeError);expect(()=>ui.play('pour',{duration:1})).toThrow(TypeError);
    advance(100);expect(e.frame).toHaveBeenCalledWith(.1);expect(e.settle).not.toHaveBeenCalled();
  });
});
