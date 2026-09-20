import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor heading-independent flight pose',()=>{
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


  for (const direction of ['right', 'left'] as const) test('keeps the climbing bird aligned through '+direction+' turns', async ({page}) => {
    const canvas = page.locator('[data-raptor-canvas]');
    const result = await canvas.evaluate((c:any, direction:string) => {
      const w=window as any, T=w.THREE, bird=w.huntScene.getObjectByName('raptor-head-rig').parent;
      w.readPose=()=>{
        const s=c._rhSnapshot(), q=bird.getWorldQuaternion(new T.Quaternion());
        const nose=new T.Vector3(0,0,1).applyQuaternion(q);
        const up=new T.Vector3(0,1,0).applyQuaternion(q);
        const level=new T.Vector3(0,1,0).addScaledVector(nose,-nose.y).normalize();
        const pitch=s.pitchRadians*0.6;
        const expected=new T.Vector3(Math.sin(s.headingRadians)*Math.cos(pitch),Math.sin(pitch),-Math.cos(s.headingRadians)*Math.cos(pitch));
        return {heading:s.headingRadians,pitch:s.pitchRadians,nose:nose.toArray(),alignment:nose.dot(expected),bank:Math.atan2(nose.dot(level.clone().cross(up)),level.dot(up)),quaternion:q.toArray(),state:s};
      };
      c._rhCommand('assist');c._rhCommand('hold',{key:direction==='right'?'d':'a',pressed:true});
      w.skipGroundRender=true;
      const samples=[];
      for(let i=0;i<220;i++){
        c._rhCommand('hold',{key:'w',pressed:c._rhSnapshot().pitchRadians<0.35});
        w.stepHunt(40);if(i>=25)samples.push(w.readPose());
      }
      c._rhCommand('hold',{key:'w',pressed:false});w.skipGroundRender=false;w.stepHunt(25);
      return {samples,last:w.readPose()};
    },direction);
    expect(result.last.state.landed).toBe(false);expect(result.last.state.crashed).toBe(false);
    const quadrants=new Set(result.samples.map(s=>Math.floor(((s.heading%(Math.PI*2)+Math.PI*2)%(Math.PI*2))/(Math.PI/2))));
    expect(quadrants.size).toBe(4);
    expect(Math.min(...result.samples.map(s=>s.pitch))).toBeGreaterThan(0.25);
    expect(Math.min(...result.samples.map(s=>s.alignment))).toBeGreaterThan(0.999999);
    expect(Math.min(...result.samples.map(s=>s.nose[1]))).toBeGreaterThan(0.14);
    const banks=result.samples.map(s=>s.bank*(direction==='right'?1:-1));
    expect(Math.min(...banks)).toBeGreaterThan(0.15);expect(Math.max(...banks)).toBeLessThan(0.33);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/aligned-climb-'+direction+'.png',timeout:90000});
    const dive=await canvas.evaluate((c:any,direction:string)=>{
      const w=window as any;c._rhCommand('hold',{key:direction==='right'?'d':'a',pressed:false});c._rhCommand('hold',{key:'s',pressed:true});w.skipGroundRender=true;
      for(let i=0;i<28;i++)w.stepHunt(40);
      c._rhCommand('hold',{key:'s',pressed:false});w.skipGroundRender=false;w.stepHunt(25);return w.readPose();
    },direction);
    expect(dive.state.landed).toBe(false);expect(dive.state.crashed).toBe(false);
    expect(dive.pitch).toBeLessThan(-0.3);expect(dive.nose[1]).toBeLessThan(-0.15);expect(dive.alignment).toBeGreaterThan(0.999999);expect(Math.abs(dive.bank)).toBeLessThan(0.002);
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));
    const frozen=await page.evaluate(()=>(window as any).readPose());
    await page.evaluate(()=>(window as any).stepHunt(60000));
    const paused=await page.evaluate(()=>(window as any).readPose());
    expect(paused.quaternion).toEqual(frozen.quaternion);expect(paused.state.raptorPosition).toEqual(frozen.state.raptorPosition);expect(paused.state.motionTimeMs).toBe(frozen.state.motionTimeMs);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
