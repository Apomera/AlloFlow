import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor pointer steering ownership',()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  });

  test('keeps a drag with its original finger and ignores unrelated releases',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const captured=new Set<number>(),captures:number[]=[],releases:number[]=[];
      c.setPointerCapture=(id:number)=>{captured.add(id);captures.push(id);};
      c.hasPointerCapture=(id:number)=>captured.has(id);
      c.releasePointerCapture=(id:number)=>{captured.delete(id);releases.push(id);c.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:id}));};
      const pointer=(type:string,id:number,x:number,button=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button,clientX:x,clientY:220,bubbles:true,cancelable:true}));
      const pending=()=>c._rhSnapshot().pendingPointerYaw;
      pointer('pointerdown',11,100);pointer('pointermove',11,120);const first=pending();
      pointer('pointerdown',22,500);pointer('pointermove',22,700);const otherMove=pending();
      pointer('pointercancel',22,700);pointer('pointermove',11,140);const originalContinues=pending();
      pointer('pointerup',11,140);const released=pending();
      pointer('pointercancel',22,700);const unrelatedCancel=pending();
      pointer('pointermove',11,170);const afterRelease=pending();
      (window as any).stepControls(25);const smoothing=pending();
      pointer('pointerdown',33,200);pointer('pointermove',33,230);pointer('pointercancel',33,230);const cancelled=pending();
      pointer('pointermove',33,300);const afterCancel=pending();
      return {first,otherMove,originalContinues,released,unrelatedCancel,afterRelease,smoothing,cancelled,afterCancel,captures,releases,errors:(window as any).__events.errors};
    });
    expect(result.first).toBeGreaterThan(0);
    expect(result.otherMove).toBe(result.first);
    expect(result.originalContinues).toBeCloseTo(result.first*2,6);
    expect(result.released).toBe(result.originalContinues);
    expect(result.unrelatedCancel).toBe(result.released);
    expect(result.afterRelease).toBe(result.released);
    expect(result.smoothing).toBeGreaterThan(0);expect(result.smoothing).toBeLessThan(result.released);
    expect(result.cancelled).toBe(0);expect(result.afterCancel).toBe(0);
    expect(result.captures).toEqual([11,33]);expect(result.releases).toEqual([11,33]);expect(result.errors).toEqual([]);
  });

  test('uses primary mouse drags and releases real capture on pause or focus loss',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0});(window as any).stepControls(25);c.addEventListener('pointerdown',(event:PointerEvent)=>{(window as any).lastSteerPointer=event.pointerId;});});
    const box=(await canvas.boundingBox())!;
    const x=box.x+box.width*.42,y=box.y+box.height*.58;
    await page.mouse.move(x,y);await page.mouse.down({button:'right'});await page.mouse.move(x+35,y+10);
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().pendingPointerYaw)).toBe(0);
    await page.mouse.up({button:'right'});await page.keyboard.press('Escape');
    // Escape dismisses a native context menu or pauses flight depending on the browser.
    await canvas.evaluate((c:any)=>{if(document.querySelector('.rh-flight-pause')?.getAttribute('data-visible')==='true')c._rhCommand('pause');});
    for(const reset of ['pause','blur','controls']){
      await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+15);
      const dragging=await canvas.evaluate((c:any)=>({pending:c._rhSnapshot().pendingPointerYaw,captured:c.hasPointerCapture((window as any).lastSteerPointer),cursor:getComputedStyle(c).cursor}));
      expect(dragging.pending).toBeGreaterThan(0);expect(dragging.captured).toBe(true);expect(dragging.cursor).toBe('grabbing');
      const cleared=await canvas.evaluate((c:any,reset:string)=>{
        if(reset==='blur')c.dispatchEvent(new Event('blur'));
        else if(reset==='controls')c._rhCommand('controls',{scheme:'arrows'});
        else c._rhCommand('pause');
        return {pending:c._rhSnapshot().pendingPointerYaw,captured:c.hasPointerCapture((window as any).lastSteerPointer),cursor:getComputedStyle(c).cursor};
      },reset);
      expect(cleared.pending).toBe(0);expect(cleared.captured).toBe(false);expect(cleared.cursor).toBe('crosshair');
      await page.mouse.move(x+90,y+30);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().pendingPointerYaw)).toBe(0);
      await page.mouse.up();
      if(reset==='pause')await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    }
    // A fresh drag works after every reset; releasing keeps the existing smooth decay.
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y);await page.mouse.up();
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().pendingPointerYaw)).toBeGreaterThan(0);
    expect(await canvas.evaluate(c=>getComputedStyle(c).cursor)).toBe('crosshair');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
