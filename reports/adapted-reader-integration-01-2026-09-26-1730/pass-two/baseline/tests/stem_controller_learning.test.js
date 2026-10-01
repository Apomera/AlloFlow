import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {beforeEach,afterEach,it,expect} from 'vitest';
let dom,w,api,pad,pads,results;
beforeEach(()=>{
  dom=new JSDOM('<div id="scope"><canvas tabindex="0"></canvas></div>',{url:'https://learn.test'});w=dom.window;Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
  pad={id:'Learn pad',index:0,mapping:'standard',axes:[0,0,0,0,-1],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};pads=[pad];results=[];
  const s=readFileSync('stem_lab/stem_lab_module.js','utf8');vm.runInNewContext(s.slice(s.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),s.indexOf('// STEM_INPUT_RUNTIME_END')),{window:w,document:w.document,localStorage:w.localStorage,navigator:{getGamepads:()=>pads},KeyboardEvent:w.KeyboardEvent,MouseEvent:w.MouseEvent,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setInterval,clearInterval});api=w.StemInput;api.setScope('roadReady',w.document.getElementById('scope'));
});
afterEach(()=>dom.window.close());
it('waits for the initiating button to release, then saves a new button',()=>{
  pad.buttons[0]={pressed:true,value:1};api.learnBinding('roadReady','horn',r=>results.push(r));api.poll();expect(results).toEqual([]);
  pad.buttons[0]={pressed:false,value:0};api.poll();pad.buttons[10]={pressed:true,value:1};api.poll();expect(results[0]).toMatchObject({ok:true,done:true,source:'b10'});
  expect(JSON.parse(w.localStorage.getItem('alloflow_stem_controls_v1')).profiles['roadReady|default'].buttons.horn).toBe('b10');expect(api.gamepad('roadReady')).toBeNull();
});
it('warns about a conflicting button without overwriting its action and allows retry',()=>{
  api.learnBinding('roadReady','horn',r=>results.push(r));api.poll();pad.buttons[7]={pressed:true,value:1};api.poll();expect(results[0]).toMatchObject({ok:false});expect(results[0].message).toContain('Accelerator');
  pad.buttons[7]={pressed:false,value:0};api.poll();pad.buttons[10]={pressed:true,value:1};api.poll();expect(results[1]).toMatchObject({ok:true,source:'b10'});
});
it('learns a pedal axis from its released endpoint',()=>{
  api.learnBinding('roadReady','throttle',r=>results.push(r));api.poll();pad.axes[4]=0.8;api.poll();expect(results[0]).toMatchObject({ok:true,source:'a4'});
});
it('detects overlapping signed/full axes but permits opposite directions',()=>{
  expect(api.assignBinding('roadReady','throttle','a2').ok).toBe(false);
  expect(api.assignBinding('roadReady','lookLeft','a2-').ok).toBe(true);expect(api.assignBinding('roadReady','lookRight','a2+').ok).toBe(true);
});
it('cancels on disconnect and ignores further input',()=>{
  api.learnBinding('roadReady','horn',r=>results.push(r));api.poll();pads=[];api.poll();expect(results[0]).toMatchObject({ok:false,done:true});pads=[pad];pad.buttons[10]={pressed:true,value:1};api.poll();expect(results).toHaveLength(1);
});
it('Escape cancels capture without closing the activity',()=>{
  api.learnBinding('roadReady','horn',r=>results.push(r));w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Escape',bubbles:true,cancelable:true}));expect(results[0].message).toContain('cancelled');expect(w.localStorage.getItem('alloflow_stem_controls_v1')).toBeNull();
});
it('maps the right stick to separate native shoulder-check values',()=>{
  pad.axes[4]=0;api.poll();pad.axes[2]=-0.8;api.poll();expect(api.gamepad('roadReady').buttons[10].value).toBe(0.8);expect(api.gamepad('roadReady').buttons[11].value).toBe(0);
  pad.axes[2]=0.7;api.poll();expect(api.gamepad('roadReady').buttons[11].value).toBe(0.7);
});

it('preserves axis 2 assignments from an older saved hardware profile',()=>{
  dom.window.close();dom=new JSDOM('<div></div>',{url:'https://migrate.test'});w=dom.window;
  w.localStorage.setItem('alloflow_stem_controls_v1',JSON.stringify({profiles:{'roadReady|default':{buttons:{throttle:'a2'},calibration:{throttle:{rest:-1,full:1}}}}}));
  const s=readFileSync('stem_lab/stem_lab_module.js','utf8');
  vm.runInNewContext(s.slice(s.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),s.indexOf('// STEM_INPUT_RUNTIME_END')),{window:w,document:w.document,localStorage:w.localStorage,navigator:{getGamepads:()=>[]},KeyboardEvent:w.KeyboardEvent,MouseEvent:w.MouseEvent,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setInterval,clearInterval});
  expect(w.StemInput.bindingLabel('roadReady','lookLeft')).toBe('Unassigned');expect(w.StemInput.bindingLabel('roadReady','lookRight')).toBe('Unassigned');expect(w.StemInput.bindingLabel('roadReady','throttle')).toBe('Axis 2');
});
it('stops capture if the selected profile changes',()=>{
  api.learnBinding('roadReady','horn',r=>results.push(r));api.poll();api.configure({device:'0:Learn pad'});expect(results.at(-1)).toMatchObject({ok:false,done:true});
});
