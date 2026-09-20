import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor time-based flight trail',()=>{
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


  for(const frameMs of [10,50])test('keeps the same trail history at '+frameMs+'ms frames',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const flight=await canvas.evaluate((c:any,frameMs:number)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('hold',{key:'shift',pressed:true});w.skipGroundRender=true;
      const history=[];for(let time=0;time<3000;time+=frameMs){w.stepHunt(frameMs);const s=c._rhSnapshot();history.push({time:s.motionTimeMs,...s.raptorPosition});}
      w.skipGroundRender=false;
      const trail=w.huntScene.getObjectByName('raptor-flight-trail'),a=trail.geometry.attributes.position;w.reviewTrail=trail;
      const tail={x:a.getX(a.count-1),y:a.getY(a.count-1),z:a.getZ(a.count-1)},closest=history.reduce((best:any,p:any)=>{const distance=Math.hypot(p.x-tail.x,p.y-tail.y,p.z-tail.z);return !best||distance<best.distance?{...p,distance}:best;},null);
      const s=c._rhSnapshot();return {age:s.motionTimeMs-closest.time,tailError:closest.distance,headError:Math.hypot(a.getX(0)-s.raptorPosition.x,a.getY(0)-s.raptorPosition.y,a.getZ(0)-s.raptorPosition.z),state:s,count:a.count,geometry:trail.geometry.uuid,visible:trail.visible};
    },frameMs);
    expect(flight.state.crashed).toBe(false);expect(flight.visible).toBe(true);expect(flight.count).toBe(12);expect(flight.headError).toBeLessThan(.001);expect(flight.age).toBeGreaterThanOrEqual(380);expect(flight.age).toBeLessThanOrEqual(480);expect(flight.tailError).toBeLessThan(1.5);
    await canvas.evaluate((c:any,ms:number)=>(window as any).stepHunt(ms),frameMs);
    const fade=await page.evaluate(()=>{const t=(window as any).reviewTrail;return {compiled:t.material.userData.trailFadeCompiled,values:Array.from(t.geometry.attributes.trailFade.array) as number[]};});expect(fade.compiled).toBe(true);expect(fade.values[0]).toBe(1);expect(fade.values.at(-1)).toBe(0);for(let i=1;i<fade.values.length;i++)expect(fade.values[i]).toBeLessThan(fade.values[i-1]);
    if(frameMs===10)await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/time-based-flight-trail.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await page.evaluate(()=>{const t=(window as any).reviewTrail;return {positions:Array.from(t.geometry.attributes.position.array),version:t.geometry.attributes.position.version};});
    await canvas.evaluate(()=>(window as any).stepHunt(60000));await page.getByRole('button',{name:'Scenic view',exact:true}).click();expect(await page.evaluate(()=>(window as any).reviewTrail.visible)).toBe(false);await page.getByRole('button',{name:'Scenic view',exact:true}).click();expect(await page.evaluate(()=>(window as any).reviewTrail.visible)).toBe(true);
    expect(await page.evaluate(()=>{const t=(window as any).reviewTrail;return {positions:Array.from(t.geometry.attributes.position.array),version:t.geometry.attributes.position.version};})).toEqual(before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>(window as any).reviewTrail.visible)).toBe(false);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).skipGroundRender=true;(window as any).advanceHunt(300);});await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    const fresh=await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:'shift',pressed:true});(window as any).stepHunt(25);const t=(window as any).reviewTrail,a=t.geometry.attributes.position;return {geometry:t.geometry.uuid,span:Math.hypot(a.getX(0)-a.getX(a.count-1),a.getY(0)-a.getY(a.count-1),a.getZ(0)-a.getZ(a.count-1))};});expect(fresh.geometry).toBe(flight.geometry);expect(fresh.span).toBeLessThan(.001);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
