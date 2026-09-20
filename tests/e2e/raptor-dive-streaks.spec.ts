import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor dive streak continuity',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'highStoop',flightSession:{speciesId:'peregrine',missionId:'highStoop'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
  });


  test('keeps fading streaks attached and eases their return after a fast dive',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const samples=await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('hold',{key:'shift',pressed:true});w.skipGroundRender=true;w.advanceHunt(6000);
      const streak=w.huntScene.children.find((o:any)=>o.isLineSegments&&o.geometry.attributes.position.count===120&&o.material.isLineBasicMaterial);
      if(!streak)throw Error('Dive streak mesh missing');w.diveStreak=streak;
      const read=()=>({opacity:streak.material.opacity,gap:streak.position.distanceTo(w.huntCamera.position),angle:streak.quaternion.angleTo(w.huntCamera.quaternion),geometry:streak.geometry.uuid,material:streak.material.uuid});
      const active=read();c._rhCommand('hold',{key:'shift',pressed:false});c._rhCommand('hold',{key:'d',pressed:true});
      const released=[];for(let i=0;i<16;i++){w.stepHunt(25);released.push(read());}c._rhCommand('hold',{key:'d',pressed:false});
      const beforeReturn=read();c._rhCommand('hold',{key:'shift',pressed:true});w.stepHunt(25);const returned=read();
      w.advanceHunt(200);w.skipGroundRender=false;w.stepHunt(25);
      return {active,released,beforeReturn,returned,state:c._rhSnapshot()};
    });
    expect(samples.state.crashed).toBe(false);expect(samples.active.opacity).toBeGreaterThan(.2);
    const fading=samples.released.filter(s=>s.opacity>.001);expect(fading.length).toBeGreaterThan(2);
    for(const s of fading){expect(s.gap).toBeLessThan(.000001);expect(s.angle).toBeLessThan(.000001);expect(s.geometry).toBe(samples.active.geometry);expect(s.material).toBe(samples.active.material);}
    for(let i=1;i<samples.released.length;i++)expect(samples.released[i].opacity).toBeLessThanOrEqual(samples.released[i-1].opacity);
    expect(samples.beforeReturn.opacity).toBeLessThan(.01);expect(samples.returned.opacity).toBeGreaterThan(samples.beforeReturn.opacity);expect(samples.returned.opacity-samples.beforeReturn.opacity).toBeLessThan(.1);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/dive-streak-continuity.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const paused=await canvas.evaluate((c:any)=>({state:c._rhSnapshot(),opacity:(window as any).diveStreak.material.opacity}));expect(paused.opacity).toBe(0);
    await canvas.evaluate(()=>(window as any).advanceHunt(1000));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().raptorPosition)).toEqual(paused.state.raptorPosition);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const reduced=await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('hold',{key:'shift',pressed:true});(window as any).advanceHunt(200);const s=(window as any).diveStreak;return {opacity:s.material.opacity,visible:s.visible,state:c._rhSnapshot()};});expect(reduced.opacity).toBe(0);expect(reduced.visible).toBe(false);expect(reduced.state.motionTimeMs).toBeGreaterThan(paused.state.motionTimeMs);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
