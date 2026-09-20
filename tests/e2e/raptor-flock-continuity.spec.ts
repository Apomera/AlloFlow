import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor distant bird continuity',()=>{
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


  test('recycles invisibly, fades in smoothly, and freezes decorative motion',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]');
    const result=await canvas.evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');w.flock=w.huntScene.children.filter((o:any)=>o.name.startsWith('raptor-distant-bird-'));
      w.readFlock=()=>w.flock.map((o:any)=>({position:o.position.toArray(),opacity:o.material.opacity,geometry:o.geometry.uuid,material:o.material.uuid}));
      const bird=w.flock[0],initial=w.readFlock(),p=c._rhSnapshot().raptorPosition;
      bird.position.set(p.x+490,p.y+30,p.z);w.stepHunt(25);const edge=bird.material.opacity;
      bird.position.x=p.x+510;w.stepHunt(25);const recycled={opacity:bird.material.opacity,distance:Math.hypot(bird.position.x-c._rhSnapshot().raptorPosition.x,bird.position.z-c._rhSnapshot().raptorPosition.z)};
      // Inspect gradual re-entry within the full-opacity distance band.
      const next=c._rhSnapshot().raptorPosition;bird.position.set(next.x+220,next.y+30,next.z);
      const samples=[];w.skipGroundRender=true;for(let i=0;i<40;i++){w.stepHunt(25);samples.push(bird.material.opacity);}w.skipGroundRender=false;w.stepHunt(25);
      return {initial,edge,recycled,samples,after:w.readFlock(),state:c._rhSnapshot()};
    });
    expect(result.initial).toHaveLength(4);expect(result.edge).toBeLessThan(0.02);expect(result.recycled.opacity).toBe(0);expect(result.recycled.distance).toBeGreaterThanOrEqual(250);expect(result.recycled.distance).toBeLessThanOrEqual(450);
    expect(result.samples[0]).toBeGreaterThan(0);expect(result.samples[0]).toBeLessThan(0.05);expect(result.samples.at(-1)).toBeGreaterThan(0.55);
    for(let i=1;i<result.samples.length;i++){expect(result.samples[i]).toBeGreaterThanOrEqual(result.samples[i-1]);expect(result.samples[i]-result.samples[i-1]).toBeLessThan(0.04);}
    expect(result.after.map(s=>[s.geometry,s.material])).toEqual(result.initial.map(s=>[s.geometry,s.material]));
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const before=await page.evaluate(()=>(window as any).readFlock());await canvas.evaluate(()=>(window as any).stepHunt(60000));expect(await page.evaluate(()=>(window as any).readFlock())).toEqual(before);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    const reduced=await canvas.evaluate((c:any)=>{const w=window as any,p=c._rhSnapshot().raptorPosition;w.flock[0].position.x=p.x+610;const flock=w.readFlock(),state=c._rhSnapshot();c._rhCommand('pause');w.skipGroundRender=true;w.advanceHunt(800);w.skipGroundRender=false;w.stepHunt(25);return {flock,state,after:w.readFlock(),afterState:c._rhSnapshot()};});
    expect(reduced.after).toEqual(reduced.flock);expect(reduced.afterState.raptorPosition).not.toEqual(reduced.state.raptorPosition);
    await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(false);
    await canvas.evaluate(()=>(window as any).stepHunt(25));const resumed=await page.evaluate(()=>(window as any).readFlock());expect(resumed[0].opacity).toBe(0);expect(resumed[0].position).not.toEqual(reduced.after[0].position);
    await canvas.evaluate((c:any)=>{const w=window as any,p=c._rhSnapshot().raptorPosition,yaw=c._rhSnapshot().headingRadians;w.flock.forEach((b:any,i:number)=>b.position.set(p.x+Math.sin(yaw)*(110+i*25)+Math.cos(yaw)*(i-1.5)*18,p.y+25+i*7,p.z-Math.cos(yaw)*(110+i*25)+Math.sin(yaw)*(i-1.5)*18));w.advanceHunt(900);});
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/distant-bird-continuity.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
