import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor flight attitude instrument',()=>{
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


  test('shows the bird bank across camera modes and settles the perched instrument', async ({page}) => {
    const canvas=page.locator('[data-raptor-canvas]'), attitude=page.locator('.rh-flight-attitude');
    await canvas.evaluate((c:any)=>{
      const w=window as any,T=w.THREE,bird=w.huntScene.getObjectByName('raptor-head-rig').parent;
      w.attitudeReading=()=>{
        const s=c._rhSnapshot(),q=bird.getWorldQuaternion(new T.Quaternion()),forward=new T.Vector3(0,0,1).applyQuaternion(q),up=new T.Vector3(0,1,0).applyQuaternion(q),level=new T.Vector3(0,1,0).addScaledVector(forward,-forward.y).normalize();
        const bank=-Math.atan2(forward.dot(level.clone().cross(up)),level.dot(up))*180/Math.PI;
        const el=document.querySelector('.rh-flight-attitude');
        return {bank,text:el.textContent,status:el.getAttribute('data-attitude-state'),state:s};
      };
      c._rhCommand('assist');c._rhCommand('hold',{key:'d',pressed:true});w.skipGroundRender=true;w.advanceHunt(1500);w.skipGroundRender=false;w.stepHunt(25);
    });
    const chase=await page.evaluate(()=>(window as any).attitudeReading());
    expect(chase.status).toBe('bank');expect(chase.bank).toBeLessThan(-15);
    expect(chase.text).toContain('B '+Math.round(chase.bank)+'°');
    await canvas.evaluate((c:any)=>{c._rhCommand('view');(window as any).advanceHunt(300);});
    const fp=await page.evaluate(()=>(window as any).attitudeReading());
    expect(fp.state.cameraMode).toBe('fp');expect(fp.status).toBe('bank');expect(fp.text).toBe(chase.text);
    await attitude.screenshot({path:'scratch/raptor-flight-review/attitude-first-person.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await canvas.evaluate((c:any)=>c._rhSnapshot());
    await page.emulateMedia({reducedMotion:'reduce'});
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    await canvas.evaluate((c:any)=>{c._rhCommand('view');(window as any).stepHunt(60000);});
    expect(await attitude.textContent()).toBe(chase.text);
    const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(paused.motionTimeMs).toBe(before.motionTimeMs);expect(paused.raptorPosition).toEqual(before.raptorPosition);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('hold',{key:'d',pressed:true});(window as any).advanceHunt(1500);});
    const reduced=await page.evaluate(()=>(window as any).attitudeReading());expect(reduced.status).toBe('bank');expect(reduced.text).toContain('B '+Math.round(reduced.bank)+'°');
    await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:'d',pressed:false});(window as any).advanceHunt(1200);});
    await expect(attitude).toHaveAttribute('data-attitude-state','level');await expect(attitude).toHaveText('P 0° · B 0°');
    await canvas.evaluate((c:any)=>{c._rhCommand('perchPractice');(window as any).advanceHunt(400);c._rhCommand('hold',{key:'d',pressed:true});(window as any).advanceHunt(500);});
    const perched=await page.evaluate(()=>(window as any).attitudeReading());expect(perched.state.landed).toBe(true);expect(perched.status).toBe('level');expect(perched.text).toBe('P 0° · B 0°');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
