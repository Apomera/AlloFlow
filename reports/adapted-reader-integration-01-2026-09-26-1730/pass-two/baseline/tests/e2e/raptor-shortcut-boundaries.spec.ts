import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor keyboard shortcut boundaries',()=>{
  test.describe.configure({timeout:240000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:960,height:1100});
    await page.addInitScript(()=>{
      let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
      Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
      window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
      (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
      (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
    });
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
  });


  test('leaves system shortcuts and composition alone without retaining held input',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const ignored=await canvas.evaluate((c:any)=>{
      const w=window as any;w.keyEvent=(type:string,key:string,code:string,modifiers:any={})=>{const e=new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true,...modifiers});c.dispatchEvent(e);return e.defaultPrevented;};
      const before=c._rhSnapshot(),cases=[{key:'p',code:'KeyP',ctrlKey:true},{key:'v',code:'KeyV',metaKey:true},{key:'z',code:'KeyZ',altKey:true},{key:'f',code:'KeyF',ctrlKey:true},{key:'d',code:'KeyD',isComposing:true}];
      const prevented=cases.map(k=>{const result=w.keyEvent('keydown',k.key,k.code,k);w.keyEvent('keyup',k.key,k.code,k);return result;});
      return {before,after:c._rhSnapshot(),prevented};
    });expect(ignored.prevented).toEqual([false,false,false,false,false]);for(const key of ['paused','cameraMode','cameraFov','raptorPosition','missionCatches','calories','stamina','strikeRecoveryMs','motionTimeMs'])expect(ignored.after[key]).toEqual(ignored.before[key]);
    const held=await canvas.evaluate((c:any)=>{const w=window as any;const prevented=w.keyEvent('keydown','d','KeyD');w.skipGroundRender=true;w.advanceHunt(400);const turning=c._rhSnapshot();w.keyEvent('keyup','d','KeyD',{ctrlKey:true});w.advanceHunt(800);const released=c._rhSnapshot();const shift=w.keyEvent('keydown','Shift','ShiftLeft',{shiftKey:true});w.keyEvent('keydown','D','KeyD',{shiftKey:true});w.advanceHunt(300);const diving=c._rhSnapshot();w.keyEvent('keyup','D','KeyD',{shiftKey:true});w.keyEvent('keyup','Shift','ShiftLeft');w.skipGroundRender=false;w.stepHunt(25);return {prevented,turning,released,shift,diving};});expect(held.prevented).toBe(true);expect(held.turning.steeringTurn).toBeGreaterThan(.9);expect(Math.abs(held.released.steeringTurn)).toBeLessThan(.01);expect(held.shift).toBe(true);expect(held.diving.diveActive).toBe(true);expect(held.diving.steeringTurn).toBeGreaterThan(.9);
    await canvas.evaluate((c:any)=>{c._rhCommand('controls',{scheme:'custom',keys:{r:'pause',c:'view',x:'zoom',j:'turnLeft'}});c._rhCommand('pause');});
    const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());const card=page.getByRole('group',{name:'Paused flight controls',exact:true});
    const pausedEvents=await card.evaluate(el=>{return [{key:'r',code:'KeyR',ctrlKey:true},{key:'c',code:'KeyC',metaKey:true},{key:'x',code:'KeyX',altKey:true}].map(k=>{const e=new KeyboardEvent('keydown',{...k,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});});expect(pausedEvents).toEqual([false,false,false]);await expect(card).toBeVisible();const after=await canvas.evaluate((c:any)=>c._rhSnapshot());for(const key of ['paused','cameraMode','cameraFov','raptorPosition','motionTimeMs'])expect(after[key]).toEqual(paused[key]);
    await card.getByRole('button',{name:'Change paused camera',exact:true}).focus();await page.keyboard.press('c');expect(await canvas.evaluate((c:any)=>c._rhSnapshot().cameraMode)).not.toBe(paused.cameraMode);await page.keyboard.press('r');await expect(card).toBeHidden();await expect(canvas).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
