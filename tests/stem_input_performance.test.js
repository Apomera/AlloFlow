import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
let dom,w,api,pads,frames,nextId,root;
const device=()=>({id:'Performance pad',index:0,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
const step=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(16));};
beforeEach(()=>{
  const s=readFileSync('stem_lab/stem_lab_module.js','utf8');
  dom=new JSDOM('<div id="scope"><canvas tabindex="0"></canvas><button>Action</button></div>',{url:'https://performance.test'});w=dom.window;
  Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
  pads=[];frames=new Map();nextId=0;root=w.document.getElementById('scope');
  vm.runInNewContext(s.slice(s.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),s.indexOf('// STEM_INPUT_RUNTIME_END')),
    {window:w,document:w.document,localStorage:w.localStorage,navigator:{getGamepads:()=>pads},KeyboardEvent:w.KeyboardEvent,MouseEvent:w.MouseEvent,
      requestAnimationFrame:fn=>{frames.set(++nextId,fn);return nextId;},cancelAnimationFrame:id=>frames.delete(id),setInterval,clearInterval});
  api=w.StemInput;
});
afterEach(()=>dom.window.close());
it('does not schedule frames at boot or in a tool without a connected controller',()=>{
  expect(frames.size).toBe(0);api.setScope('heatLab',root);expect(frames.size).toBe(0);
  expect(root.getAttribute('data-stem-touch-visible')).toBe('true');
});
it('starts one loop on connection and stops immediately on disconnect',()=>{
  api.setScope('heatLab',root);pads=[device()];w.dispatchEvent(new w.Event('gamepadconnected'));w.dispatchEvent(new w.Event('gamepadconnected'));
  expect(frames.size).toBe(1);step();expect(frames.size).toBe(1);
  pads=[];w.dispatchEvent(new w.Event('gamepaddisconnected'));expect(frames.size).toBe(0);expect(api.state().connected).toBe(false);
});
it('preserves neutral gating and releases held input when hidden, then resumes',()=>{
  pads=[device()];api.setScope('heatLab',root);root.querySelector('canvas').focus();step();
  const events=[];w.document.addEventListener('keydown',e=>events.push(e.type+':'+e.code));w.document.addEventListener('keyup',e=>events.push(e.type+':'+e.code));
  pads[0].axes[0]=0.8;step();expect(events).toContain('keydown:KeyD');
  Object.defineProperty(w.document,'hidden',{value:true,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
  expect(frames.size).toBe(0);expect(events).toContain('keyup:KeyD');
  Object.defineProperty(w.document,'hidden',{value:false,configurable:true});w.document.dispatchEvent(new w.Event('visibilitychange'));
  expect(frames.size).toBe(1);expect(api.state().waitingForNeutral).toBe(true);
});
it('suspends frames on blur and removes all scheduled work when the owner closes',()=>{
  pads=[device()];api.setScope('heatLab',root);w.dispatchEvent(new w.Event('blur'));expect(frames.size).toBe(0);
  w.dispatchEvent(new w.Event('focus'));expect(frames.size).toBe(1);api.setScope(null);expect(frames.size).toBe(0);
  expect(root.hasAttribute('data-stem-input-mode')).toBe(false);
});
it('avoids rewriting unchanged control attributes and applies preferences without a device',()=>{
  api.setScope('heatLab',root);const writes=vi.spyOn(root,'setAttribute');
  api.poll();api.poll();expect(writes).not.toHaveBeenCalled();
  api.configure({large:true});expect(root.getAttribute('data-stem-large-controls')).toBe('true');expect(frames.size).toBe(0);
});
it('continues sampling analog input for a native Road Ready owner',()=>{
  pads=[device()];const release=api.claim('roadReady');step();pads[0].axes[0]=0.8;step();
  expect(api.gamepad('roadReady').axes[0]).toBeGreaterThan(0.7);expect(frames.size).toBe(1);release();expect(frames.size).toBe(0);
});
