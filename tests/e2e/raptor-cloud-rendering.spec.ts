import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.cloudReviewScene=scene;window.cloudReviewRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor cloud light and continuity',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const quality of ['high','low'])test('shades clouds and preserves motion at '+quality+' quality',async({page})=>{
    await page.setViewportSize({width:quality==='low'?440:1100,height:1200});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).advanceClouds=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'baldEagle',activeMission:'open',flightSession:{speciesId:'baldEagle',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(quality==='low')await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();
    const before=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('environment',{windSpeed:10,windDir:Math.PI/2,dayPhase:0.4,cloudCover:0.5});for(let i=0;i<40;i++)(window as any).advanceClouds(25);return c._rhSnapshot();});
    expect(before.cloudStates.length).toBeGreaterThan(2);expect(before.cloudLightingPrograms).toBeGreaterThan(0);expect(before.drawCalls).toBeLessThan(150);
    for(const cloud of before.cloudStates){expect(cloud.fade).toBeGreaterThanOrEqual(0);expect(cloud.fade).toBeLessThanOrEqual(1);expect(cloud.opacity).toBeGreaterThanOrEqual(0);expect(cloud.opacity).toBeLessThanOrEqual(0.92);}
    const moving=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{for(let i=0;i<12;i++)(window as any).advanceClouds(25);return c._rhSnapshot();});
    expect(moving.cloudStates.some((s:any,i:number)=>Math.abs(s.x-before.cloudStates[i].x)>0.01)).toBe(true);
    const paused=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');const a=c._rhSnapshot();(window as any).advanceClouds(60000);return {a,b:c._rhSnapshot()};});
    expect(paused.b.cloudStates).toEqual(paused.a.cloudStates);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    const brightness:number[]=[];
    for(const lighting of [{label:'day',phase:0.4},{label:'sunset',phase:0.735},{label:'night',phase:0.93}]){
      const capture=await page.locator('[data-raptor-canvas]').evaluate((c:any,phase:number)=>{
        const w=window as any,T=w.THREE;c._rhCommand('environment',{dayPhase:phase,cloudCover:0.45,windSpeed:0});for(let i=0;i<30;i++)w.advanceClouds(25);
        const scene=w.cloudReviewScene,renderer=w.cloudReviewRenderer;
        const clouds=scene.children.filter((o:any)=>o.name.startsWith('raptor-weather-cloud-')).sort((a:any,b:any)=>b.material.opacity-a.material.opacity);
        const cloud=clouds[0],center=cloud.position.clone();
        const camera=new T.PerspectiveCamera(45,renderer.domElement.clientWidth/renderer.domElement.clientHeight,0.1,2000),framing=Math.max(1,1/camera.aspect);
        camera.position.copy(center).add(new T.Vector3(0,-12,-150*framing));camera.lookAt(center);
        renderer.render(scene,camera);const gl=renderer.getContext(),pixel=new Uint8Array(4);gl.readPixels(Math.floor(renderer.domElement.width/2),Math.floor(renderer.domElement.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
        const png=renderer.domElement.toDataURL('image/png'),litPixel=Array.from(pixel);cloud.visible=false;renderer.render(scene,camera);gl.readPixels(Math.floor(renderer.domElement.width/2),Math.floor(renderer.domElement.height/2),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);const hiddenPixel=Array.from(pixel);cloud.visible=true;renderer.render(scene,camera);
        return {png,litPixel,hiddenPixel,lightLength:cloud.material.userData.cloudLightView.value.length(),texturePixel:Array.from(cloud.material.map.image.getContext("2d").getImageData(128,64,1,1).data),pixel:Array.from(pixel),cloudColor:cloud.material.color.toArray(),cloudOpacity:cloud.material.opacity,cloudDay:c._rhSnapshot().dayPhase,brightness:pixel[0]+pixel[1]+pixel[2],compiled:cloud.material.userData.cloudLightingCompiled,snapshot:c._rhSnapshot()};
      },lighting.phase);
      expect(capture.lightLength).toBeCloseTo(1,6);
      if(lighting.label==='day')expect(capture.litPixel[0]).toBeGreaterThan(capture.hiddenPixel[0]+5);
      expect(capture.compiled).toBe(true);expect(capture.brightness).toBeGreaterThan(0);expect(capture.snapshot.drawCalls).toBeLessThan(150);brightness.push(capture.brightness);
      writeFileSync('scratch/raptor-flight-review/cloud-'+lighting.label+'-'+quality+'.png',Buffer.from(capture.png.split(',')[1],'base64'));
    }
    expect(brightness[0]).toBeGreaterThan(brightness[2]);
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const reduced=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:12});(window as any).advanceClouds(25);const a=c._rhSnapshot();for(let i=0;i<20;i++)(window as any).advanceClouds(25);return {a,b:c._rhSnapshot()};});
    expect(reduced.b.cloudStates.map((s:any)=>[s.x,s.y,s.z])).toEqual(reduced.a.cloudStates.map((s:any)=>[s.x,s.y,s.z]));
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
