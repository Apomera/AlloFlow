import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {beforeEach,afterEach,it,expect} from 'vitest';
let dom,w,api,pad;
beforeEach(()=>{
  dom=new JSDOM('<div id="scope"><canvas tabindex="0"></canvas></div>',{url:'https://profiles.test'});w=dom.window;Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
  pad={id:'Profile pad',index:0,mapping:'standard',axes:[0,0,0,0,-1],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
  const s=readFileSync('stem_lab/stem_lab_module.js','utf8');vm.runInNewContext(s.slice(s.indexOf('// STEM_INPUT_RUNTIME_BEGIN'),s.indexOf('// STEM_INPUT_RUNTIME_END')),{window:w,document:w.document,localStorage:w.localStorage,navigator:{getGamepads:()=>[pad]},KeyboardEvent:w.KeyboardEvent,MouseEvent:w.MouseEvent,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setInterval,clearInterval});api=w.StemInput;api.setScope('roadReady',w.document.getElementById('scope'));
});
afterEach(()=>dom.window.close());
const saved=()=>w.localStorage.getItem('alloflow_stem_controls_v1');
it('exports both keyboard contexts, effective controller bindings and calibrated pedals without hardware identity',()=>{
  api.bind('roadReady','keys',{KeyA:'KeyJ'});api.bind('roadReady','parkingKeys',{KeyW:'KeyI'});api.bind('roadReady','buttons',{throttle:'a4'});api.bind('roadReady','calibration',{throttle:{rest:-1,full:1}});api.setContext('parking');
  const file=api.exportProfile('roadReady');expect(file.profile.keys.KeyA).toBe('KeyJ');expect(file.profile.parkingKeys.KeyW).toBe('KeyI');expect(file.profile.buttons.park).toBe('b8');expect(file.profile.calibration.throttle).toEqual({rest:-1,full:1});expect(JSON.stringify(file)).not.toContain('Profile pad');
});
it('imports into the selected controller while preserving other profiles and global preferences by default',()=>{
  api.assignBinding('roadReady','horn','b10');api.configure({sensitivity:0.7,hand:'left'});const text=JSON.stringify(api.exportProfile('roadReady'));
  api.configure({device:'0:Profile pad',sensitivity:1.3,hand:'right',mode:'keyboard'});api.bind('geometryWorld','keys',{KeyW:'KeyI'});api.importProfile('roadReady',text,false);
  const store=JSON.parse(saved());expect(store.profiles['roadReady|0:Profile pad'].buttons.horn).toBe('b10');expect(store.profiles['roadReady|default'].buttons.horn).toBe('b10');expect(store.profiles['geometryWorld|0:Profile pad'].keys.KeyW).toBe('KeyI');expect(api.preferences()).toMatchObject({sensitivity:1.3,hand:'right',mode:'keyboard',device:'0:Profile pad'});
});
it('applies comfort settings only when selected, keeping input method and device',()=>{
  const file=api.exportProfile('roadReady');file.comfort={deadzone:0.25,sensitivity:0.6,invert:true,hand:'left',large:true};api.configure({mode:'controller'});api.importProfile('roadReady',JSON.stringify(file),true);expect(api.preferences()).toMatchObject({...file.comfort,mode:'controller',device:'auto'});
});
it.each([
  ['null controller map',f=>{f.profile.buttons=null;}],
  ['null keyboard map',f=>{f.profile.keys=null;}],
  ['null comfort settings',f=>{f.comfort=null;}],
  ['negative button calibration',f=>{f.profile.calibration={throttle:{rest:-1,full:1}};}],
  ['wrong tool',f=>{f.toolId='ratioLab';}],
  ['unknown action',f=>{f.profile.buttons.inject='b16';}],
  ['duplicate button',f=>{f.profile.buttons.horn='b7';}],
  ['overlapping axes',f=>{f.profile.buttons.throttle='a2';}],
  ['duplicate keyboard key',f=>{f.profile.keys={KeyA:'KeyW'};}],
  ['reserved key',f=>{f.profile.keys={KeyA:'Tab'};}],
  ['incomplete calibration',f=>{f.profile.calibration={throttle:{rest:0}};}],
  ['invalid sensitivity',f=>{f.comfort.sensitivity=100;}],
  ['unknown schema',f=>{f.version=2;}],
])('rejects %s without changing any saved state',(_,mutate)=>{
  api.assignBinding('roadReady','horn','b10');const before=saved(),file=api.exportProfile('roadReady');mutate(file);expect(()=>api.importProfile('roadReady',JSON.stringify(file),true)).toThrow();expect(saved()).toBe(before);expect(api.bindingLabel('roadReady','horn')).toBe('Button 10');
});
it('rejects malformed, oversized and unexpected prototype fields',()=>{
  expect(()=>api.validateProfile('roadReady','{')).toThrow();expect(()=>api.validateProfile('roadReady',' '.repeat(65537))).toThrow();
  const text=JSON.stringify(api.exportProfile('roadReady')).replace('"profile":{','"profile":{"__proto__":{},');expect(()=>api.importProfile('roadReady',text,false)).toThrow();expect({}.polluted).toBeUndefined();
});
it('allows button calibration and opposite axis directions',()=>{
  const f=api.exportProfile('roadReady');f.profile.calibration={throttle:{rest:0.1,full:0.9}};expect(()=>api.validateProfile('roadReady',JSON.stringify(f))).not.toThrow();
});
it('requires neutral controller input after applying a profile',()=>{
  const text=JSON.stringify(api.exportProfile('roadReady'));pad.buttons[7]={pressed:true,value:1};api.poll();api.importProfile('roadReady',text,false);expect(api.gamepad('roadReady')).toBeNull();pad.buttons[7]={pressed:false,value:0};api.poll();expect(api.gamepad('roadReady')).not.toBeNull();
});
it('uses readable labels and preserves numeric labels for nonstandard devices',()=>{
  expect(api.sourceLabel('b2|b14')).toContain('D-pad left');expect(api.sourceLabel('a0')).toContain('Left stick');pad.mapping='';expect(api.sourceLabel('a0')).toBe('Axis 0');expect(api.sourceLabel('b7')).toBe('Button 7');
});
