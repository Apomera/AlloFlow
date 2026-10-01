import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const { patchHost } = createRequire(import.meta.url)('../reports/reader-preview-followup/prepare-delta.cjs');
const current=readFileSync(resolve(process.env.ALLO_HOST_CANDIDATE || 'AlloFlowANTI.txt'),'utf8').replace(/\r\n/g,'\n');
// Exercise actual integrated source when available; otherwise only apply the
// bounded host delta in memory. Never write host files from this test.
const after=current.includes('const readingPreviewTimeRef = useRef') ? current : patchHost(current);
let cleanups=[];
afterEach(()=>{cleanups.reverse().forEach(fn=>fn?.());cleanups=[];document.body.replaceChildren();vi.restoreAllMocks();vi.useRealTimers();});
function effect(source,marker,deps){const point=source.indexOf(marker);expect(point).toBeGreaterThan(0);const start=source.lastIndexOf('  useEffect(() => {',point),end=source.indexOf('\n  },',point);const close=source.indexOf(');',end)+2;new Function('useEffect',...Object.keys(deps),source.slice(start,close))(fn=>cleanups.push(fn()),...Object.values(deps));}
function modal(){const node=document.createElement('div');node.setAttribute('data-student-preview','');node.setAttribute('data-help-ignore','');node.innerHTML='<button>Display</button>';document.body.append(node);return node;}
function preview(owner,active){window.dispatchEvent(new CustomEvent('alloflow:reading-preview',{detail:{owner,active}}));}
function mountClock(source){
 const focus={focusedMs:0,unfocusedMs:0,engagedMinutes:0,idleMinutes:0,currentStreak:0,longestStreak:0,lastVisibleTime:Date.now()};
 const refs={readingPreviewTimeRef:{current:{owners:new Set(),startedAt:null,excludedMs:0}},lastInteractionTimeRef:{current:Date.now()},focusStreakTimerRef:{current:null}};
 const deps={...refs,_ALLO_ENGAGEMENT_TIMEOUT_MS:300000,_openResourceRef:{current:{id:'reading',type:'simplified'}},isParentMode:false,addToast:vi.fn(),t:k=>k,setTimeOnTask:vi.fn(),setFocusData:vi.fn(fn=>Object.assign(focus,fn(focus)))};
 if(source.includes('const onReadingPreview = event =>'))effect(source,'const onReadingPreview = event =>',deps);
 effect(source,'const trackInteraction =',deps);effect(source,'focusStreakTimerRef.current = setInterval',deps);
 return {...deps,focus};
}
describe('preview host boundary (candidate until integrated)',()=>{
 it('contains capture-phase Help shortcuts and preserves host shortcuts',()=>{
   const node=modal(),toggle=vi.fn();const deps={isHelpMode:false,isSpotlightMode:false,setIsSpotlightMode:vi.fn(),handleToggleIsHelpMode:toggle};
   effect(after,'const onHelpKeyDown =',deps);node.firstChild.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true,cancelable:true}));expect(toggle).not.toHaveBeenCalled();
   node.remove();document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true,cancelable:true}));expect(toggle).toHaveBeenCalledOnce();
 });
 it('lets native preview controls work while the existing Help click-capture handler is active',()=>{
   const node=modal(),action=vi.fn(),spotlight=vi.fn();node.firstChild.addEventListener('click',action);
   effect(after,'const handleHelpClick =',{isHelpMode:true,tourSteps:[],showSpotlight:spotlight});
   node.firstChild.click();expect(action).toHaveBeenCalledOnce();expect(spotlight).not.toHaveBeenCalled();
 });
 it('does not credit progress, update focus metrics or report engagement during preview',()=>{
   vi.useFakeTimers();vi.setSystemTime(1000000);const clock=mountClock(after);const node=modal();preview('reader',true);
   expect(window.__alloEngagement.isEngaged()).toBe(false);vi.advanceTimersByTime(120000);expect(clock.setTimeOnTask).not.toHaveBeenCalled();expect(clock.setFocusData).not.toHaveBeenCalled();
   document.dispatchEvent(new Event('visibilitychange'));expect(clock.setFocusData).not.toHaveBeenCalled();
   node.remove();preview('reader',false);expect(window.__alloEngagement.isEngaged()).toBe(false);window.dispatchEvent(new Event('click'));expect(window.__alloEngagement.isEngaged()).toBe(true);
 });
 it('subtracts preview time from later visibility accounting and handles repeated lifecycle notifications',()=>{
   vi.useFakeTimers();vi.setSystemTime(1000000);const clock=mountClock(after);vi.advanceTimersByTime(10000);const node=modal();preview('reader',true);preview('reader',true);vi.advanceTimersByTime(70000);node.remove();preview('reader',false);preview('reader',false);vi.advanceTimersByTime(2000);
   vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));
   expect(clock.focus.focusedMs).toBe(12000);expect(clock.setTimeOnTask).not.toHaveBeenCalled();expect(clock.readingPreviewTimeRef.current.excludedMs).toBe(0);
 });
 it('keeps a second preview owner paused until its own cleanup',()=>{
   vi.useFakeTimers();vi.setSystemTime(1000000);const clock=mountClock(after);const node=modal();preview('one',true);vi.advanceTimersByTime(5000);preview('two',true);preview('one',false);vi.advanceTimersByTime(60000);expect(clock.setFocusData).not.toHaveBeenCalled();
   node.remove();preview('two',false);expect(clock.readingPreviewTimeRef.current.excludedMs).toBe(65000);
 });
});
