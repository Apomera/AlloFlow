import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor wind direction guidance',()=>{
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


  test('shows wind travel relative to heading and keeps the cue stable when paused',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),wind=page.locator('.rh-flight-wind'),detail=wind.locator('.rh-flight-wind-detail');
    await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('assist');w.skipGroundRender=true;w.readWind=()=>{const el=document.querySelector('.rh-flight-wind') as HTMLElement,css=getComputedStyle(el,'::before'),matrix=new DOMMatrix(css.transform),s=c._rhSnapshot();return {flow:el.dataset.windFlow,text:el.textContent,angle:Math.atan2(matrix.b,matrix.a),heading:s.headingRadians,direction:s.windDir,position:s.raptorPosition,time:s.motionTimeMs,label:document.querySelector('[data-raptor-metric=weather]')!.getAttribute('aria-label')};};});
    for(const sample of [{offset:0,flow:'tail',text:'TAIL',description:'tailwind'},{offset:Math.PI,flow:'head',text:'HEAD',description:'headwind'},{offset:Math.PI/2,flow:'right',text:'DRIFT R',description:'drifting right'},{offset:-Math.PI/2,flow:'left',text:'DRIFT L',description:'drifting left'}]){
      const state=await canvas.evaluate((c:any,offset:number)=>{c._rhCommand('environment',{windSpeed:12,windDir:c._rhSnapshot().headingRadians+offset});(window as any).advanceHunt(200);return (window as any).readWind();},sample.offset);
      expect(state.flow).toBe(sample.flow);await expect(detail).toContainText(sample.text);expect(state.label).toContain(sample.description);await expect(wind.locator('.rh-flight-wind-main')).toContainText('WIND TO ');
      const error=Math.atan2(Math.sin(state.angle-sample.offset),Math.cos(state.angle-sample.offset));expect(Math.abs(error)).toBeLessThan(.002);
    }
    const turn=await canvas.evaluate((c:any)=>{const w=window as any,before=w.readWind();c._rhCommand('hold',{key:'d',pressed:true});w.advanceHunt(400);c._rhCommand('hold',{key:'d',pressed:false});return {before,after:w.readWind()};});expect(turn.after.direction).toBe(turn.before.direction);expect(Math.abs(turn.after.angle-turn.before.angle)).toBeGreaterThan(.2);
    const bearing=turn.after.direction-turn.after.heading;expect(Math.abs(Math.atan2(Math.sin(turn.after.angle-bearing),Math.cos(turn.after.angle-bearing)))).toBeLessThan(.002);
    await canvas.evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:0});(window as any).advanceHunt(200);});await expect(wind).toHaveAttribute('data-wind-flow','calm');await expect(detail).toBeHidden();expect(await wind.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('"·"');
    await canvas.evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:20,windDir:7*Math.PI/4});(window as any).advanceHunt(200);(window as any).skipGroundRender=false;(window as any).stepHunt(25);c._rhCommand('pause');});const paused=await canvas.evaluate(()=>(window as any).readWind());
    await canvas.evaluate(()=>(window as any).stepHunt(60000));expect(await canvas.evaluate(()=>(window as any).readWind())).toEqual(paused);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);expect(await canvas.evaluate(()=>(window as any).readWind())).toEqual(paused);
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    await page.waitForFunction(()=>{const c=document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!;return Math.abs(c.width-c.clientWidth)<2;},null,{polling:50});
    const reviewStyle=await page.addStyleTag({content:'.rh-flight-pause{visibility:hidden!important}'});
    await wind.screenshot({path:'scratch/raptor-flight-review/directional-wind-320.png',timeout:90000});
    await reviewStyle.evaluate(el=>el.remove());
    await page.emulateMedia({forcedColors:'active'});await expect(wind).toBeVisible();expect(await canvas.evaluate(()=>(window as any).readWind()).then(s=>s.flow)).toBe(paused.flow);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
