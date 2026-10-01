import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor heading-independent camera bank',()=>{
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


  for(const direction of ['right','left'] as const)test('keeps '+direction+' turns banked consistently across the compass',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const result=await canvas.evaluate((c:any,direction:string)=>{
      const w=window as any,T=w.THREE,cam=w.huntCamera;
      w.readBank=()=>{const f=cam.getWorldDirection(new T.Vector3()),up=new T.Vector3(0,1,0).applyQuaternion(cam.quaternion),level=new T.Vector3(0,1,0);level.addScaledVector(f,-level.dot(f)).normalize();return Math.atan2(f.dot(level.clone().cross(up)),level.dot(up));};
      c._rhCommand('assist');c._rhCommand('hold',{key:direction==='right'?'d':'a',pressed:true});w.skipGroundRender=true;
      const samples=[];for(let i=0;i<220;i++){w.stepHunt(40);if(i>=25){const s=c._rhSnapshot();samples.push({heading:s.headingRadians,bank:w.readBank()});}}
      w.skipGroundRender=false;w.stepHunt(25);return {samples,snapshot:c._rhSnapshot()};
    },direction);
    expect(result.snapshot.landed).toBe(false);expect(result.snapshot.crashed).toBe(false);
    const quadrants=new Set(result.samples.map(s=>Math.floor((((s.heading%(Math.PI*2))+Math.PI*2)%(Math.PI*2))/(Math.PI/2))));expect(quadrants.size).toBe(4);
    const signed=result.samples.map(s=>s.bank*(direction==='right'?1:-1));expect(Math.min(...signed)).toBeGreaterThan(.12);expect(Math.max(...signed)).toBeLessThan(.31);expect(Math.max(...signed)-Math.min(...signed)).toBeLessThan(.025);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/consistent-bank-'+direction+'.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await canvas.evaluate((c:any)=>({state:c._rhSnapshot(),bank:(window as any).readBank(),direction:(window as any).huntCamera.getWorldDirection(new (window as any).THREE.Vector3()).toArray()}));await canvas.evaluate((c:any)=>(window as any).stepHunt(60000));
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().raptorPosition)).toEqual(before.state.raptorPosition);expect(await page.evaluate(()=>(window as any).readBank())).toBeCloseTo(before.bank,8);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>(window as any).readBank())).toBeCloseTo(0,7);
    const levelled=await canvas.evaluate((c:any)=>({state:c._rhSnapshot(),direction:(window as any).huntCamera.getWorldDirection(new (window as any).THREE.Vector3()).toArray()}));expect(levelled.state.cameraPosition).toEqual(before.state.cameraPosition);levelled.direction.forEach((value:number,i:number)=>expect(value).toBeCloseTo(before.direction[i],7));
    await canvas.evaluate((c:any)=>c._rhCommand('view'));expect(await canvas.evaluate((c:any)=>c._rhSnapshot().cameraMode)).toBe('fp');expect(await page.evaluate(()=>(window as any).readBank())).toBeCloseTo(0,7);
    expect(await canvas.evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(before.state.motionTimeMs);expect(await canvas.evaluate((c:any)=>c._rhSnapshot().raptorPosition)).toEqual(before.state.raptorPosition);
    await canvas.evaluate((c:any)=>{c._rhCommand('view');c._rhCommand('pause');(window as any).advanceHunt(300);});expect(await page.evaluate(()=>(window as any).readBank())).toBeCloseTo(0,7);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
