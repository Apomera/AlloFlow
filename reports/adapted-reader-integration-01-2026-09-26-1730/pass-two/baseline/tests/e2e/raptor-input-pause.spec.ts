import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.pauseRenderCount=0;renderer.render=function(scene,camera){window.pauseRenderer=renderer;window.pauseScene=scene;window.pauseCamera=camera;window.pauseRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor input and paused presentation',()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  test.beforeEach(async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepControls=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  });
  test('keeps steering when one of two equivalent keys is released',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=()=>{for(let i=0;i<20;i++)w.stepControls(25);},key=(type:string,key:string,code:string)=>c.dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true}));
      c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0});key('keydown','a','KeyA');key('keydown','ArrowLeft','ArrowLeft');step();const both=c._rhSnapshot();key('keyup','a','KeyA');step();const alias=c._rhSnapshot();key('keyup','ArrowLeft','ArrowLeft');step();const released=c._rhSnapshot();
      key('keydown','a','KeyA');c._rhCommand('hold',{key:'a',pressed:true});key('keyup','a','KeyA');step();const button=c._rhSnapshot();c._rhCommand('hold',{key:'a',pressed:false});step();const buttonReleased=c._rhSnapshot();
      key('keydown','a','KeyA');c._rhCommand('hold',{key:'a',pressed:true});c.dispatchEvent(new Event('blur'));step();const blurred=c._rhSnapshot();
      key('keydown','a','KeyA');c._rhCommand('pause');c._rhCommand('pause');step();const resumed=c._rhSnapshot();
      key('keydown','a','KeyA');c._rhCommand('controls',{scheme:'arrows'});step();const remapped=c._rhSnapshot();
      key('keydown','ArrowLeft','ArrowLeft');step();const arrowPreset=c._rhSnapshot();key('keyup','ArrowLeft','ArrowLeft');
      return {both,alias,released,button,buttonReleased,blurred,resumed,remapped,arrowPreset};
    });
    expect(result.both.steeringTurn).toBeLessThan(-0.9);expect(result.alias.steeringTurn).toBeLessThan(-0.9);expect(Math.abs(result.released.steeringTurn)).toBeLessThan(0.02);
    expect(result.button.steeringTurn).toBeLessThan(-0.9);expect(Math.abs(result.buttonReleased.steeringTurn)).toBeLessThan(0.02);expect(result.blurred.steeringTurn).toBe(0);expect(result.resumed.steeringTurn).toBe(0);expect(result.remapped.steeringTurn).toBe(0);expect(result.arrowPreset.steeringTurn).toBeLessThan(-0.9);
  });
  test('redraws a resized paused scene and applies reduced motion without advancing flight',async({page})=>{
    const before=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).stepControls(25);c._rhCommand('pause');return {snapshot:c._rhSnapshot(),renders:(window as any).pauseRenderCount};});
    await page.addStyleTag({content:'#wrap{width:660px}'});
    await expect.poll(()=>page.evaluate(()=>(window as any).pauseRenderCount)).toBeGreaterThan(before.renders);
    const resized=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any,gl=w.pauseRenderer.getContext(),pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>20)lit++;return {snapshot:c._rhSnapshot(),renders:w.pauseRenderCount,lit,aspect:w.pauseCamera.aspect,width:c.clientWidth,height:c.clientHeight};});
    expect(resized.lit).toBeGreaterThan(10000);expect(resized.aspect).toBeCloseTo(resized.width/resized.height,6);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>(window as any).pauseRenderCount)).toBeGreaterThan(resized.renders);
    const after=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any,count=w.pauseRenderCount;w.stepControls(60000);return {snapshot:c._rhSnapshot(),count,afterCount:w.pauseRenderCount};});
    expect(after.afterCount).toBe(after.count);for(const s of [resized.snapshot,after.snapshot]){expect(s.motionTimeMs).toBe(before.snapshot.motionTimeMs);expect(s.raptorPosition).toEqual(before.snapshot.raptorPosition);}
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('changes paused camera and zoom without advancing the hunt, then resumes from the card',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0});
      for(let i=0;i<8;i++)w.stepControls(25);
      w.capturePaused=()=>({snapshot:c._rhSnapshot(),renders:w.pauseRenderCount,prey:w.pauseScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-'))).map((o:any)=>o.position.toArray())});
    });
    await page.getByRole('button',{name:'Pause flight',exact:true}).click();
    const card=page.getByRole('group',{name:'Paused flight controls',exact:true});
    await expect(card).toBeVisible();await expect(card).toContainText('Resume shortcut: P or Esc');
    await expect(page.getByRole('button',{name:/^Hold to dive and accelerate/})).toBeDisabled();
    await expect(page.getByRole('button',{name:'Strike paused',exact:true})).toBeDisabled();
    const frozen=await page.evaluate(()=>(window as any).capturePaused());
    expect(frozen.prey.length).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Change paused camera',exact:true}).click();
    const fp=await page.evaluate(()=>(window as any).capturePaused());
    expect(fp.snapshot.cameraMode).toBe('fp');expect(fp.snapshot.cameraDistanceToRaptor).toBeLessThan(1.5);expect(fp.renders-frozen.renders).toBe(1);
    await expect(page.getByRole('button',{name:'Change paused camera',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('button',{name:'Toggle paused zoom',exact:true}).click();
    const zoomed=await page.evaluate(()=>(window as any).capturePaused());
    expect(zoomed.snapshot.cameraFov).toBeLessThan(fp.snapshot.cameraFov-20);expect(zoomed.snapshot.cameraPosition).toEqual(fp.snapshot.cameraPosition);expect(zoomed.renders-fp.renders).toBe(1);
    await page.getByRole('button',{name:'Change paused camera',exact:true}).click();
    const chase=await page.evaluate(()=>(window as any).capturePaused());
    expect(chase.snapshot.cameraMode).toBe('chase');expect(chase.snapshot.cameraDistanceToRaptor).toBeGreaterThan(5);expect(chase.snapshot.cameraFov).toBe(zoomed.snapshot.cameraFov);expect(chase.renders-zoomed.renders).toBe(1);
    await page.getByRole('button',{name:'Toggle paused zoom',exact:true}).click();
    const wide=await page.evaluate(()=>(window as any).capturePaused());expect(wide.snapshot.cameraFov).toBe(70);expect(wide.snapshot.cameraPosition).toEqual(chase.snapshot.cameraPosition);
    for(const state of [fp,zoomed,chase,wide]){
      expect(state.snapshot.motionTimeMs).toBe(frozen.snapshot.motionTimeMs);expect(state.snapshot.raptorPosition).toEqual(frozen.snapshot.raptorPosition);expect(state.snapshot.calories).toBe(frozen.snapshot.calories);expect(state.snapshot.stamina).toBe(frozen.snapshot.stamina);expect(state.snapshot.wingAngle).toBe(frozen.snapshot.wingAngle);expect(state.prey).toEqual(frozen.prey);expect(state.snapshot.cameraFloorClearance).toBeGreaterThan(0);
    }
    const still=await page.evaluate(()=>{const w=window as any;w.stepControls(60000);return w.capturePaused();});
    expect(still.renders).toBe(wide.renders);expect(still.snapshot.motionTimeMs).toBe(frozen.snapshot.motionTimeMs);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('controls',{scheme:'custom',keys:{c:'view',x:'zoom'}}));
    await expect(card).toContainText('Use Resume flight to continue.');await expect(page.getByRole('button',{name:'Resume paused flight',exact:true})).not.toHaveAttribute('aria-keyshortcuts');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('controls',{scheme:'custom',keys:{r:'pause',c:'view',x:'zoom'}}));
    await expect(card).toContainText('Resume shortcut: R');await expect(page.getByRole('button',{name:'Resume paused flight',exact:true})).toHaveAttribute('aria-keyshortcuts','R');
    await page.getByRole('button',{name:'Change paused camera',exact:true}).focus();await page.keyboard.press('c');
    await expect(page.getByRole('button',{name:'Change paused camera',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('r');await expect(card).toBeHidden();await expect(page.locator('[data-raptor-canvas]')).toBeFocused();
    await expect(page.getByRole('button',{name:/^Hold to dive and accelerate/})).toBeEnabled();
    const resumed=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).stepControls(25);return c._rhSnapshot();});
    expect(resumed.motionTimeMs-frozen.snapshot.motionTimeMs).toBeCloseTo(25,5);expect(resumed.cameraMode).toBe('fp');expect(resumed.cameraQuaternion.every(Number.isFinite)).toBe(true);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('perchPractice');for(let i=0;i<10;i++)(window as any).stepControls(25);c._rhCommand('pause');});
    const perched=await page.evaluate(()=>(window as any).capturePaused());expect(perched.snapshot.perched).toBe(true);
    await page.getByRole('button',{name:'Change paused camera',exact:true}).click();
    const perchChase=await page.evaluate(()=>(window as any).capturePaused());expect(perchChase.snapshot.cameraMode).toBe('chase');expect(perchChase.snapshot.raptorPosition).toEqual(perched.snapshot.raptorPosition);expect(perchChase.snapshot.cameraFloorClearance).toBeGreaterThan(0);
    await page.setViewportSize({width:440,height:900});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>Math.abs(c.width-c.clientWidth))).toBeLessThan(2);
    const fit=await card.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('[data-raptor-flight-stage]')!.getBoundingClientRect();return {left:r.left-p.left,right:p.right-r.right,overflow:el.scrollWidth-el.clientWidth};});
    expect(fit.left).toBeGreaterThanOrEqual(0);expect(fit.right).toBeGreaterThanOrEqual(0);expect(fit.overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/paused-view-controls-narrow.png',timeout:90000});
    await page.getByRole('button',{name:'Resume paused flight',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(card).toBeHidden();await expect(page.locator('[data-raptor-canvas]')).toBeFocused();expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
