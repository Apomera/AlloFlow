import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, expect, it } from 'vitest';
let dom,w,api,pad,pads,root,events;
function press(index){pad.buttons[index]={pressed:true,value:1};api.poll();pad.buttons[index]={pressed:false,value:0};api.poll();}
beforeEach(()=>{
  dom=new JSDOM('<div id="scope"><canvas tabindex="0"></canvas><button id="first">First</button><button disabled>Unavailable</button><details><summary>More</summary><button id="inside">Inside</button></details><select><option value="a">A</option><option disabled value="b">B</option><option value="c">C</option></select><input type="range" min="0" max="1" step="0.1" value="0.5"><input type="checkbox"></div><button id="outside">Outside</button>',{url:'https://navigation.test'});w=dom.window;root=w.document.getElementById('scope');
  w.HTMLElement.prototype.getClientRects=function(){return [{}];};
  Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
  pad={id:'Test pad',index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};pads=[pad];events=[];
  const source=readFileSync('stem_lab/stem_lab_module.js','utf8');
  vm.runInNewContext(source.slice(source.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),source.indexOf('// STEM_INPUT_RUNTIME_END')),{window:w,document:w.document,localStorage:w.localStorage,navigator:{getGamepads:()=>pads},KeyboardEvent:w.KeyboardEvent,MouseEvent:w.MouseEvent,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setInterval,clearInterval});
  api=w.StemInput;api.setScope('geometryWorld',root);root.querySelector('canvas').focus();
  ['keydown','keyup'].forEach(type=>w.document.addEventListener(type,e=>events.push(type+':'+e.code)));
});
afterEach(()=>dom.window.close());
it('uses R3 to release movement and enters focus navigation without forwarding D-pad keys',()=>{
  pad.axes[0]=1;api.poll();press(11);expect(api.isSuspended()).toBe(true);expect(events).toEqual(['keydown:KeyD','keyup:KeyD']);
  press(13);expect(w.document.activeElement.id).toBe('first');expect(events).toHaveLength(2);
});
it('skips disabled and collapsed controls, opens a section, and activates once while held',()=>{
  api.navigate(true);api.poll();root.querySelector('#first').focus();press(13);expect(w.document.activeElement.tagName).toBe('SUMMARY');
  press(0);expect(root.querySelector('details').open).toBe(true);press(13);expect(w.document.activeElement.id).toBe('inside');
  let clicks=0;w.document.activeElement.addEventListener('click',()=>clicks++);pad.buttons[0]={pressed:true,value:1};api.poll();api.poll();expect(clicks).toBe(1);
});
it('adjusts selects and sliders and toggles checkboxes without emitting activity keys',()=>{
  api.navigate(true);api.poll();const select=root.querySelector('select');select.focus();press(15);expect(select.value).toBe('c');
  const range=root.querySelector('[type=range]');range.focus();press(15);expect(range.value).toBe('0.6');press(14);expect(range.value).toBe('0.5');
  const checkbox=root.querySelector('[type=checkbox]');checkbox.focus();press(0);expect(checkbox.checked).toBe(true);expect(events).toEqual([]);
});
it('requires neutral movement after leaving navigation',()=>{
  api.navigate(true);api.poll();pad.axes[0]=1;press(1);expect(api.isSuspended()).toBe(false);api.poll();expect(events).toEqual([]);
  pad.axes[0]=0;api.poll();pad.axes[0]=1;api.poll();expect(events).toEqual(['keydown:KeyD']);
});
it('does not steal an existing custom R3 activity binding',()=>{
  api.bind('geometryWorld','buttons',{interact:'b11'});api.poll();press(11);expect(api.isSuspended()).toBe(false);expect(events).toEqual(['keydown:KeyE','keyup:KeyE']);
});
it('stays within the active scope and clears navigation on disconnect and tool exit',()=>{
  api.navigate(true);api.poll();root.querySelector('[type=checkbox]').focus();press(13);expect(root.contains(w.document.activeElement)).toBe(true);
  pads=[];api.poll();expect(api.isSuspended()).toBe(false);expect(root.querySelector('.stem-controller-navigation-hint')).toBeNull();
  api.navigate(true);api.setScope(null);expect(api.isSuspended()).toBe(false);
});
it('accepts stick drift inside a user-selected deadzone before arming',()=>{
  api.configure({deadzone:0.3});pad.axes[0]=0.22;api.poll();expect(api.state().waitingForNeutral).toBe(false);expect(events).toEqual([]);
  pad.axes[0]=0.5;api.poll();expect(events).toEqual(['keydown:KeyD']);
});
it('also suspends native Road Ready during navigation',()=>{
  api.setScope('roadReady',root);press(11);pad.buttons[7]={pressed:true,value:1};api.poll();expect(api.gamepad('roadReady')).toBeNull();expect(api.read('roadReady')).toEqual({});expect(events).toEqual([]);
});

it('does not activate focus outside the current navigation scope',()=>{
  api.navigate(true);api.poll();const outside=w.document.getElementById('outside');let clicks=0;outside.addEventListener('click',()=>clicks++);outside.focus();press(0);
  expect(clicks).toBe(0);expect(w.document.activeElement.id).toBe('first');
});
it('blocks keyboard movement during menu navigation and handles Escape locally',()=>{
  api.navigate(true);api.poll();const canvas=root.querySelector('canvas');
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));expect(events).toEqual([]);
  canvas.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true,cancelable:true}));expect(api.isSuspended()).toBe(false);expect(events).toEqual([]);
});
