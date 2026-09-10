import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, expect, it } from 'vitest';
let dom, win, api, pads, pad, events;
function frame(){return api.poll();}
beforeEach(()=>{
  const source=readFileSync('stem_lab/stem_lab_module.js','utf8');
  const begin=source.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),end=source.indexOf('// STEM_INPUT_RUNTIME_END');
  expect(begin).toBeGreaterThanOrEqual(0);
  dom=new JSDOM('<div id="scope"><canvas tabindex="0"></canvas><button>Action</button><input aria-label="Notes"></div>',{url:'https://controls.test'});win=dom.window;
  Object.defineProperty(win.document,'hidden',{value:false,configurable:true});
  pad={id:'Test standard pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};pads=[pad];events=[];
  vm.runInNewContext(source.slice(begin,end),{window:win,document:win.document,localStorage:win.localStorage,navigator:{getGamepads:()=>pads},KeyboardEvent:win.KeyboardEvent,MouseEvent:win.MouseEvent,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setInterval,clearInterval});
  api=win.StemInput;api.setScope('geometryWorld',win.document.getElementById('scope'));win.document.querySelector('canvas').focus();
  for(const name of ['keydown','keyup'])win.document.addEventListener(name,e=>events.push({type:e.type,code:e.code,key:e.key}));frame();
});
afterEach(()=>dom.window.close());
it('emits one standard Space press/release even with a focused canvas',()=>{
  pad.buttons[0]={pressed:true,value:1};frame();frame();pad.buttons[0]={pressed:false,value:0};frame();
  expect(events).toEqual([{type:'keydown',code:'Space',key:' '},{type:'keyup',code:'Space',key:' '}]);
});
it('releases held axes on disconnect and requires neutral after reconnect',()=>{
  pad.axes[0]=0.8;frame();pads=[];frame();
  expect(events.map(e=>e.type)).toEqual(['keydown','keyup']);pads=[pad];frame();expect(events).toHaveLength(2);
  pad.axes[0]=0;frame();pad.axes[0]=0.8;frame();expect(events).toHaveLength(3);
});
it('releases input on tool exit and emits nothing without an owner',()=>{
  pad.axes[1]=-1;frame();api.setScope(null);frame();expect(events.map(e=>e.type)).toEqual(['keydown','keyup']);
});
it('protects form input and requires centered controls after leaving a field',()=>{
  pad.axes[0]=1;frame();win.document.querySelector('input').focus();frame();expect(events.at(-1).type).toBe('keyup');
  win.document.querySelector('canvas').focus();frame();expect(events).toHaveLength(2);pad.axes[0]=0;frame();pad.axes[0]=1;frame();expect(events).toHaveLength(3);
});
it('gives Road Ready analog values without also emitting generic keys',()=>{
  api.setScope('roadReady',win.document.getElementById('scope'));frame();pad.axes[0]=0.5;pad.buttons[1]={pressed:true,value:1};pad.buttons[7]={pressed:true,value:0.4};frame();
  expect(api.gamepad('roadReady').axes[0]).toBeCloseTo((0.5-0.15)/0.85);expect(api.gamepad('roadReady').buttons[1].pressed).toBe(true);expect(api.read('roadReady').throttle).toBe(0.4);expect(events).toEqual([]);
});
it('supports custom axis pedals with saved released/full calibration',()=>{
  api.setScope('roadReady',win.document.getElementById('scope'));pad.axes=[0,0,0,0,-1];
  api.bind('roadReady','buttons',{throttle:'a4'});api.bind('roadReady','calibration',{throttle:{rest:-1,full:1}});frame();pad.axes[4]=0;frame();expect(api.read('roadReady').throttle).toBe(0.5);
  expect(JSON.parse(win.localStorage.getItem('alloflow_stem_controls_v1')).profiles['roadReady|default'].buttons.throttle).toBe('a4');
});
it('preserves a remapped keyboard hold even when no controller is connected',()=>{
  pads=[];api.bind('geometryWorld','keys',{KeyW:'KeyI'});const canvas=win.document.querySelector('canvas');
  canvas.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyI',key:'i',bubbles:true,cancelable:true}));frame();frame();
  expect(events).toEqual([{type:'keydown',code:'KeyW',key:'w'}]);canvas.dispatchEvent(new win.KeyboardEvent('keyup',{code:'KeyI',key:'i',bubbles:true,cancelable:true}));expect(events.at(-1)).toEqual({type:'keyup',code:'KeyW',key:'w'});
});
it('hides optional touch controls for explicit choices and restores them on disconnect',()=>{
  api.configure({mode:'keyboard'});frame();expect(api.showTouch()).toBe(false);
  api.configure({showTouch:true});frame();expect(api.showTouch()).toBe(true);
  api.configure({showTouch:false,mode:'controller'});frame();expect(api.showTouch()).toBe(false);pads=[];frame();expect(api.showTouch()).toBe(true);
  api.setScope(null);frame();expect(win.document.getElementById('scope').hasAttribute('data-stem-touch-visible')).toBe(false);
});
it('keeps gameplay input neutral while settings are open',()=>{
  api.setScope('roadReady',win.document.getElementById('scope'));frame();api.suspend(true);pad.buttons[7]={pressed:true,value:1};frame();expect(api.gamepad('roadReady')).toBeNull();api.suspend(false);frame();expect(api.gamepad('roadReady')).toBeNull();
  pad.buttons[7]={pressed:false,value:0};frame();expect(api.gamepad('roadReady')).not.toBeNull();
});
