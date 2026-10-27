// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Layout=require('../stem_lab/kitchen_studio/recipe_lab_movement_layout.js');
let ui,scene,coach,below,canvas,tail,width,height,observed,callback,disconnect;
beforeEach(()=>{
 document.documentElement.style.fontSize='16px';document.body.innerHTML='<button id="control">Tool control</button><div id="scene"><canvas data-phase="carry"></canvas><div id="coach" hidden><strong>Carry level</strong><progress value="65" max="100"></progress></div><span id="tail"></span></div><div id="below"><p role="status">Action status</p></div>';
 scene=document.querySelector('#scene');coach=document.querySelector('#coach');below=document.querySelector('#below');canvas=scene.firstElementChild;tail=document.querySelector('#tail');width=800;height=500;
 Object.defineProperties(scene,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});observed=[];disconnect=vi.fn();vi.stubGlobal('ResizeObserver',class{constructor(cb){callback=cb;}observe(e){observed.push(e);}disconnect(){disconnect();}});
 ui=Layout.mount({scene,coach,below});
});
afterEach(()=>{ui?.dispose();vi.unstubAllGlobals();document.body.replaceChildren();document.documentElement.style.fontSize='';});
describe('Movement guidance adapts without changing the work surface',()=>{
 it('keeps ordinary guidance in the scene and observes the surface and text context',()=>{expect(coach.parentNode).toBe(scene);expect(coach.dataset.layout).toBe('overlay');expect(observed).toEqual([scene,coach,document.documentElement]);});
 it.each([[600,500],[800,280],[639,320]])('places guidance below a %i by %i scene', (w,h)=>{width=w;height=h;callback();expect(below.firstElementChild).toBe(coach);expect(coach.dataset.layout).toBe('below');expect(scene.firstElementChild).toBe(canvas);expect(canvas.parentNode).toBe(scene);expect(canvas.getAttribute('style')).toBeNull();});
 it('uses root text size, including enlargement without a viewport change',()=>{document.documentElement.style.fontSize='32px';callback();expect(coach.parentNode).toBe(below);document.documentElement.style.fontSize='16px';callback();expect(coach.parentNode).toBe(scene);});
 it('keeps the exact same text, progress, visibility and keyboard focus when moving the card',()=>{const content=coach.innerHTML,control=document.querySelector('#control');control.focus();width=320;ui.refresh();expect(coach.innerHTML).toBe(content);expect(coach.hidden).toBe(true);expect(coach.querySelector('progress').value).toBe(65);expect(document.activeElement).toBe(control);expect(canvas.dataset.phase).toBe('carry');expect(coach.tabIndex).toBe(-1);expect(coach.querySelector('[aria-live],[role="status"]')).toBeNull();});
 it('returns to the original location when sufficient room is available',()=>{width=400;ui.refresh();width=800;ui.refresh();expect(coach.nextSibling).toBe(tail);expect(scene.firstElementChild).toBe(canvas);expect(below.querySelector('[role="status"]').textContent).toBe('Action status');});
 it('leaves layout unchanged while the scene is hidden and reevaluates when shown',()=>{width=400;ui.refresh();height=0;width=0;ui.refresh();expect(coach.parentNode).toBe(below);height=500;width=800;ui.refresh();expect(coach.parentNode).toBe(scene);});
 it('does not rewrite layout or contents during repeated observer callbacks',async()=>{width=400;ui.refresh();const mutations=[];const observer=new MutationObserver(records=>mutations.push(...records));observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});callback();callback();await Promise.resolve();expect(mutations).toEqual([]);observer.disconnect();});
 it('works from a window resize when ResizeObserver is unavailable',()=>{ui.dispose();vi.stubGlobal('ResizeObserver',undefined);ui=Layout.mount({scene,coach,below});width=400;window.dispatchEvent(new Event('resize'));expect(coach.parentNode).toBe(below);});
 it('restores placement and removes observers on disposal, ignoring stale callbacks',()=>{width=400;ui.refresh();const late=callback;ui.dispose();ui.dispose();expect(disconnect).toHaveBeenCalledOnce();expect(coach.nextSibling).toBe(tail);expect(coach.hasAttribute('data-layout')).toBe(false);late();window.dispatchEvent(new Event('resize'));expect(coach.nextSibling).toBe(tail);});
 it('does not put a detached coach or removed reading area back into the page',()=>{coach.remove();width=400;ui.refresh();expect(coach.isConnected).toBe(false);scene.append(coach);below.remove();ui.refresh();expect(coach.parentNode).toBe(scene);});
 it('appends safely if the old insertion anchor was removed',()=>{width=400;ui.refresh();tail.remove();width=800;ui.refresh();expect(scene.lastElementChild).toBe(coach);});
 it('rejects invalid mounting relationships',()=>{expect(()=>Layout.mount()).toThrow(TypeError);expect(()=>Layout.mount({scene,coach,below:coach})).toThrow(TypeError);coach.remove();expect(()=>Layout.mount({scene,coach,below})).toThrow(TypeError);});
});
