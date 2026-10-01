import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require=createRequire(import.meta.url);
let React,createRoot,act,RulerHarness,root,host,frames,frameId,props;
const source=readFileSync('AlloFlowANTI.txt','utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw new Error('Ruler source section not found: '+start);return source.slice(a,b);}
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));act=React.act;
 global.IS_REACT_ACT_ENVIRONMENT=true;
 const state=section('  const [readingRuler, setReadingRuler]','  const [fontTheme, setFontTheme]');
 const effect=section('  // Reading Ruler input lifecycle:','  // End Reading Ruler input lifecycle.');
 const bands=section('{readingRuler && !rulerSuspended && (() => {','          {/* End Reading Ruler viewport bands. */}');
 const toggle=source.match(/^  const handleToggleReadingRuler = .*;$/m)?.[0];
 const persist=source.match(/^  useEffect\(\(\) => \{ safeSetItem\('allo_reading_ruler'.*;$/m)?.[0];
 if(!toggle||!persist)throw new Error('Production ruler toggle/persistence missing');
 const fixture=`function RulerHarness(props) {
 const {useState,useEffect}=React;
 ${state}\n${effect}\n${toggle}\n${persist}
 return <>
 {props.showTools ? <div id="alloflow-student-tools-panel" role="dialog" aria-label="Student tools"><button data-ruler-toggle onClick={handleToggleReadingRuler}>Toggle ruler</button></div> : <button data-ruler-toggle onClick={handleToggleReadingRuler}>Toggle ruler</button>}
 <main data-reading><p tabIndex="0" data-reading-text>First paragraph to read.</p><input aria-label="Reading response" /></main>
 <header><button data-header>Header settings</button></header>
 {props.showModal && <div role="dialog" aria-label="Settings" data-modal><button data-modal-control>Modal control</button></div>}
 ${bands}
 <output data-ruler-y>{rulerY}</output><output data-ruler-enabled>{String(readingRuler)}</output><output data-ruler-paused>{String(rulerSuspended)}</output>
 </>;
 }`;
 const {code}=require('@babel/core').transformSync(fixture,{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false});
 RulerHarness=new Function('React','safeGetItem','safeSetItem',code+'\nreturn RulerHarness;')(React,key=>localStorage.getItem(key),(key,value)=>localStorage.setItem(key,value));
});
beforeEach(()=>{
 localStorage.clear();frames=new Map();frameId=0;
 vi.stubGlobal('innerHeight',800);
 vi.stubGlobal('PointerEvent',MouseEvent);
 vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{const id=++frameId;frames.set(id,callback);return id;}));
 vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frames.delete(id)));
});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null;host=null;vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();});
async function mount(options={}){
 props={showTools:false,showModal:false,...options};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 await act(async()=>root.render(React.createElement(RulerHarness,props)));
}
async function render(update){props={...props,...update};await act(async()=>root.render(React.createElement(RulerHarness,props)));}
function flushFrames(){act(()=>{for(let pass=0;frames.size&&pass<10;pass++){const current=[...frames.values()];frames.clear();current.forEach(callback=>callback(performance.now()));}});}
const band=()=>host.querySelector('[data-allo-reading-ruler="band"]');
const y=()=>Number(host.querySelector('[data-ruler-y]').textContent);
function rect(element,top,height=24){element.getBoundingClientRect=()=>({top,height,bottom:top+height,left:0,right:200,width:200,x:0,y:top});}
function move(target,clientY,type='pointermove'){const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientY});act(()=>target.dispatchEvent(event));return event;}
async function savedOn(options={}){localStorage.setItem('allo_reading_ruler','1');await mount(options);}

describe('main Reading Ruler actual host lifecycle',()=>{
 it('restores the enabled preference with a centered, accessible passive window',async()=>{
  await savedOn();expect(y()).toBe(400);expect(band().style.top).toBe('350px');expect(band().style.height).toBe('100px');
  expect(localStorage.getItem('allo_reading_ruler')).toBe('1');
  for(const element of host.querySelectorAll('[data-allo-reading-ruler]')){expect(element.getAttribute('aria-hidden')).toBe('true');expect(element.className).toContain('pointer-events-none');}
 });
 it('retains centered reload and current position after modal close on a long page',async()=>{
  vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue({top:0,height:12000});
  await savedOn({showModal:true});flushFrames();expect(y()).toBe(400);
  move(host.querySelector('[data-reading]'),610);flushFrames();expect(y()).toBe(610);
  act(()=>host.querySelector('[data-modal-control]').focus());expect(band()).toBeNull();
  await render({showModal:false});flushFrames();expect(document.activeElement).toBe(document.body);
  expect(band()).not.toBeNull();expect(y()).toBe(610);
 });
 it('does not treat the document root as a focused reading line',async()=>{
  vi.spyOn(document.documentElement,'getBoundingClientRect').mockReturnValue({top:0,height:12000});
  await savedOn();act(()=>document.documentElement.dispatchEvent(new FocusEvent('focusin',{bubbles:true})));
  flushFrames();expect(y()).toBe(400);
 });
 it('coalesces pointer movement once per frame and clamps both viewport edges',async()=>{
  await savedOn();const reading=host.querySelector('[data-reading]');move(reading,300);move(reading,350);move(reading,380);
  expect(frames.size).toBe(1);flushFrames();expect(y()).toBe(380);
  move(reading,-100);flushFrames();expect(y()).toBe(50);expect(band().style.top).toBe('0px');
  move(reading,1200);flushFrames();expect(y()).toBe(750);expect(band().style.top).toBe('700px');
 });
 it('supports mouse events when PointerEvent is unavailable',async()=>{
  vi.stubGlobal('PointerEvent',undefined);await savedOn();move(host.querySelector('[data-reading]'),275,'mousemove');flushFrames();expect(y()).toBe(275);
 });
 it('follows one-finger touch without preventing native scrolling or zoom gestures',async()=>{
  await savedOn();const reading=host.querySelector('[data-reading]');
  const touch=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(touch,'touches',{value:[{clientY:620}]});
  act(()=>reading.dispatchEvent(touch));flushFrames();expect(y()).toBe(620);expect(touch.defaultPrevented).toBe(false);
  const pinch=new Event('touchmove',{bubbles:true,cancelable:true});Object.defineProperty(pinch,'touches',{value:[{clientY:100},{clientY:300}]});
  act(()=>reading.dispatchEvent(pinch));flushFrames();expect(y()).toBe(620);expect(pinch.defaultPrevented).toBe(false);
 });
 it('follows keyboard focus to the actual reading field without intercepting navigation keys',async()=>{
  const add=vi.spyOn(window,'addEventListener');await savedOn();const field=host.querySelector('input');rect(field,590,40);
  act(()=>field.focus());flushFrames();expect(y()).toBe(610);expect(band().style.top).toBe('560px');
  expect(add.mock.calls.some(([type])=>type==='keydown')).toBe(false);
  const key=new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});field.dispatchEvent(key);expect(key.defaultPrevented).toBe(false);
 });
 it('pauses over header controls and resumes when keyboard focus returns to reading',async()=>{
  await savedOn();const header=host.querySelector('[data-header]'),reading=host.querySelector('[data-reading-text]');rect(reading,360);
  act(()=>header.focus());expect(band()).toBeNull();
  act(()=>reading.focus());flushFrames();expect(band()).not.toBeNull();expect(y()).toBe(372);
 });
 it('resumes after enabling from Student tools and closing the panel without a mouse',async()=>{
  await mount({showTools:true});const toggle=host.querySelector('[data-ruler-toggle]');
  act(()=>{toggle.focus();toggle.click();});expect(localStorage.getItem('allo_reading_ruler')).toBe('1');expect(band()).toBeNull();
  await render({showTools:false});flushFrames();expect(band()).not.toBeNull();expect(y()).toBe(400);
 });
 it('keeps a focused modal unmasked over its backdrop and resumes on modal removal',async()=>{
  await savedOn({showModal:true});const modalControl=host.querySelector('[data-modal-control]');
  act(()=>modalControl.focus());expect(band()).toBeNull();move(host.querySelector('[data-reading]'),650);flushFrames();expect(band()).toBeNull();
  await render({showModal:false});flushFrames();expect(band()).not.toBeNull();expect(localStorage.getItem('allo_reading_ruler')).toBe('1');
 });
 it('resumes if a focused modal is hidden without being unmounted',async()=>{
  await savedOn({showModal:true});act(()=>host.querySelector('[data-modal-control]').focus());expect(band()).toBeNull();
  await act(async()=>{host.querySelector('[data-modal]').hidden=true;});flushFrames();expect(band()).not.toBeNull();
 });
 it('keeps the complete reading window inside tiny and resized viewports',async()=>{
  vi.stubGlobal('innerHeight',60);await savedOn();expect(y()).toBe(30);expect(band().style.top).toBe('0px');expect(band().style.height).toBe('60px');
  expect(host.querySelector('[data-allo-reading-ruler="above"]').style.height).toBe('0px');
  expect(host.querySelector('[data-allo-reading-ruler="below"]').style.top).toBe('60px');
  vi.stubGlobal('innerHeight',800);act(()=>window.dispatchEvent(new Event('resize')));move(host.querySelector('[data-reading]'),600);flushFrames();
  vi.stubGlobal('innerHeight',40);act(()=>window.dispatchEvent(new Event('resize')));expect(y()).toBe(20);expect(band().style.height).toBe('40px');
 });
 it('removes listeners and queued movement when disabled',async()=>{
  const add=vi.spyOn(window,'addEventListener'),remove=vi.spyOn(window,'removeEventListener');await savedOn();
  move(host.querySelector('[data-reading]'),700);const pending=[...frames.values()];const prior=y();
  act(()=>host.querySelector('[data-ruler-toggle]').click());expect(band()).toBeNull();expect(localStorage.getItem('allo_reading_ruler')).toBe('0');expect(frames.size).toBe(0);
  act(()=>pending.forEach(callback=>callback(performance.now())));expect(y()).toBe(prior);
  for(const [type,handler] of add.mock.calls.filter(([type])=>['pointermove','pointerdown','touchstart','touchmove','focusin','focusout','resize'].includes(type))) {
   expect(remove.mock.calls.some(([removedType,removedHandler])=>removedType===type&&removedHandler===handler)).toBe(true);
  }
 });
 it('disconnects the pause observer and cancels focus work on unmount',async()=>{
  const disconnect=vi.spyOn(window.MutationObserver.prototype,'disconnect');await savedOn({showModal:true});
  act(()=>host.querySelector('[data-modal-control]').focus());
  act(()=>host.querySelector('[data-modal-control]').blur());expect(frames.size).toBeGreaterThan(0);
  const before=disconnect.mock.calls.length;act(()=>root.unmount());root=null;expect(disconnect.mock.calls.length).toBeGreaterThan(before);expect(frames.size).toBe(0);
 });
});
