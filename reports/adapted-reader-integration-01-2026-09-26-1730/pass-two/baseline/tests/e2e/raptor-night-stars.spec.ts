import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){if(!window.starReview){window.huntScene=scene;window.huntCamera=camera;}window.huntRenderer=renderer;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor independent night stars',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'greatHorned',activeMission:'open',flightSession:{speciesId:'greatHorned',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
  });


  test('twinkles independently in rendered pixels and stays steady with reduced motion',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0,dayPhase:.93,cloudCover:.1});(window as any).advanceHunt(200);c._rhCommand('pause');});
    const result=await canvas.evaluate((c:any)=>{
      const w=window as any,T=w.THREE,stars=w.huntScene.getObjectByName('raptor-night-stars');w.reviewStars=stars;
      const renderer=w.huntRenderer,material=stars.material,time=material.userData.starTime,motion=material.userData.starMotion,oldTime=time.value;
      const scene=new T.Scene();scene.background=new T.Color(0x030610);const points=new T.Points(stars.geometry,material);scene.add(points);
      const camera=new T.PerspectiveCamera(95,renderer.domElement.width/renderer.domElement.height,.1,1500);camera.up.set(0,0,-1);camera.lookAt(0,1,0);
      const gl=renderer.getContext(),width=renderer.domElement.width,height=renderer.domElement.height;
      const capture=(t:number)=>{time.value=t;renderer.render(scene,camera);const data=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
      w.starReview=true;const a=capture(0),png=renderer.domElement.toDataURL('image/png'),b=capture(3);let brighter=0,dimmer=0;for(let i=0;i<a.length;i+=4){const d=b[i]+b[i+1]+b[i+2]-a[i]-a[i+1]-a[i+2];if(d>3)brighter++;if(d< -3)dimmer++;}
      motion.value=0;const stillA=capture(0),stillB=capture(20);let steady=true;for(let i=0;i<stillA.length;i++)if(stillA[i]!==stillB[i]){steady=false;break;}
      motion.value=1;time.value=oldTime;renderer.render(w.huntScene,w.huntCamera);w.starReview=false;
      return {brighter,dimmer,steady,png,count:stars.geometry.attributes.position.count,compiled:material.userData.twinkleCompiled,geometry:stars.geometry.uuid,phaseVersion:stars.geometry.attributes.starTwinkle.version,state:c._rhSnapshot()};
    });expect(result.brighter).toBeGreaterThan(5);expect(result.dimmer).toBeGreaterThan(5);expect(result.steady).toBe(true);expect(result.compiled).toBe(true);expect(result.count).toBe(210);writeFileSync('scratch/raptor-flight-review/independent-night-stars.png',Buffer.from(result.png.split(',')[1],'base64'));
    const before=await page.evaluate(()=>{const s=(window as any).reviewStars;return {time:s.material.userData.starTime.value,position:s.position.toArray(),geometry:s.geometry.uuid,phaseVersion:s.geometry.attributes.starTwinkle.version};});
    await canvas.evaluate(()=>(window as any).stepHunt(60000));expect(await page.evaluate(()=>{const s=(window as any).reviewStars;return {time:s.material.userData.starTime.value,position:s.position.toArray(),geometry:s.geometry.uuid,phaseVersion:s.geometry.attributes.starTwinkle.version};})).toEqual(before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>(window as any).reviewStars.material.userData.starMotion.value)).toBe(0);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(result.state.motionTimeMs);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');(window as any).advanceHunt(300);});expect(await page.evaluate(()=>(window as any).reviewStars.material.userData.starMotion.value)).toBe(0);expect(await page.evaluate(()=>(window as any).reviewStars.geometry.attributes.starTwinkle.version)).toBe(before.phaseVersion);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');});await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>page.evaluate(()=>(window as any).reviewStars.material.userData.starMotion.value)).toBe(1);expect(await page.evaluate(()=>(window as any).reviewStars.geometry.uuid)).toBe(result.geometry);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('environment',{dayPhase:.4,cloudCover:.1});(window as any).advanceHunt(200);});expect(await page.evaluate(()=>(window as any).reviewStars.material.opacity)).toBe(0);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
