import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor hold-control feedback',()=>{
  test.describe.configure({timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  });


  test('shows keyboard-held controls and clears them on pause, blur, and remapping',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),dive=page.getByRole('button',{name:/^Hold to dive and accelerate/});
    await canvas.focus();await page.keyboard.down('Shift');
    await expect(dive).toHaveAttribute('aria-pressed','true');await expect(dive).toHaveAttribute('data-active','true');
    await canvas.evaluate((c:any)=>{for(let i=0;i<6;i++)(window as any).stepControls(25);});
    await expect(page.locator('.rh-flight-state')).toHaveAttribute('data-flight-state','dive');
    expect(await dive.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(14, 116, 144)');
    for(const width of [880,320]){
      await page.setViewportSize({width:width+40,height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});
      const controls=page.locator('.rh-flight-controls-flight');
      await expect(dive).toHaveAttribute('aria-pressed','true');
      expect(await controls.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      for(const button of await controls.getByRole('button').all())expect(await button.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
      await controls.screenshot({path:'scratch/raptor-flight-review/held-controls-'+width+'.png',timeout:90000});
    }

    await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    await expect(dive).toBeDisabled();await expect(dive).toHaveAttribute('aria-pressed','false');await expect(dive).toHaveAttribute('data-active','false');
    await page.keyboard.up('Shift');await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    for(const action of ['blur','controls']){
      await canvas.focus();await page.keyboard.down('Shift');await expect(dive).toHaveAttribute('aria-pressed','true');
      await canvas.evaluate((c:any,action)=>{if(action==='blur')window.dispatchEvent(new Event('blur'));else c._rhCommand('controls',{scheme:'arrows'});},action);
      await expect(dive).toHaveAttribute('aria-pressed','false');await page.keyboard.up('Shift');
      if(action==='blur'){
        await expect(dive).toBeDisabled();await expect(page.locator('.rh-flight-pause')).toHaveAttribute('data-visible','true');
        await canvas.evaluate((c:any)=>c._rhCommand('pause'));await expect(dive).toBeEnabled();
      }
    }
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('keeps a focused hold button active until both activation keys are released',async({page})=>{
    const dive=page.getByRole('button',{name:/^Hold to dive and accelerate/});
    await dive.focus();await page.keyboard.down('Enter');await page.keyboard.down('Space');
    await expect(dive).toHaveAttribute('aria-pressed','true');await page.keyboard.up('Enter');
    await expect(dive).toHaveAttribute('aria-pressed','true');await page.keyboard.up('Space');
    await expect(dive).toHaveAttribute('aria-pressed','false');
    await page.keyboard.down('Enter');await expect(dive).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Hold to descend',exact:true}).focus();
    await expect(dive).toHaveAttribute('aria-pressed','false');await page.keyboard.up('Enter');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('combines touch holds with keyboard input and rejects secondary mouse activation',async({page})=>{
    const dive=page.getByRole('button',{name:/^Hold to dive and accelerate/}),canvas=page.locator('[data-raptor-canvas]');
    await dive.evaluate((b:any)=>{
      const captured=new Set<number>();b.setPointerCapture=(id:number)=>captured.add(id);b.hasPointerCapture=(id:number)=>captured.has(id);
      b.releasePointerCapture=(id:number)=>{captured.delete(id);b.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:id,bubbles:true}));};
      (window as any).holdPointer=(type:string,id:number,button=0)=>b.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button,bubbles:true,cancelable:true}));
    });
    await page.evaluate(()=>(window as any).holdPointer('pointerdown',9,2));await expect(dive).toHaveAttribute('aria-pressed','false');
    await page.evaluate(()=>(window as any).holdPointer('pointerup',9,2));
    await page.evaluate(()=>{const p=(window as any).holdPointer;p('pointerdown',1);p('pointerdown',2);});
    await expect(dive).toHaveAttribute('aria-pressed','true');
    await page.evaluate(()=>(window as any).holdPointer('pointerup',1));await expect(dive).toHaveAttribute('aria-pressed','true');
    await page.evaluate(()=>(window as any).holdPointer('pointercancel',2));await expect(dive).toHaveAttribute('aria-pressed','false');
    await canvas.focus();await page.keyboard.down('Shift');await page.evaluate(()=>(window as any).holdPointer('pointerdown',3));
    await page.keyboard.up('Shift');await expect(dive).toHaveAttribute('aria-pressed','true');
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('pause');});await expect(dive).toHaveAttribute('aria-pressed','false');
    await page.evaluate(()=>(window as any).holdPointer('pointerup',3));await expect(dive).toHaveAttribute('aria-pressed','false');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
