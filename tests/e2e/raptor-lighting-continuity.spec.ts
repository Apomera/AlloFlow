import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';

test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.flickerScene=scene;window.flickerRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor sunlight continuity',()=>{
  test.describe.configure({mode:'serial',timeout:180000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:760,height:540,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const quality of ['balanced','high','low'])test('keeps terrain lighting continuous between shadow refreshes: '+quality,async({page})=>{
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepFlicker=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'open',flightSession:{speciesId:'redTail',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:quality}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    const frames=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('assist');c._rhCommand('environment',{windSpeed:0,dayPhase:0.4,cloudCover:0.1});w.stepFlicker(60);
      const sun=w.flickerScene.children.find((o:any)=>o.isDirectionalLight&&o.shadow?.camera.far===900);
      const sample=()=>({direction:sun.position.clone().sub(sun.target.position).normalize().toArray(),refreshes:c._rhSnapshot().shadowRefreshCount,matrix:sun.shadow.matrix.toArray()});
      const frames=[sample()];for(let i=0;i<12;i++){w.stepFlicker(16);frames.push(sample());}return frames;
    });
    const jumps=frames.slice(1).map((f,i)=>Math.hypot(...f.direction.map((v:number,j:number)=>v-frames[i].direction[j])));
    console.log('Sunlight frame-to-frame maximum',quality,Math.max(...jumps));
    expect(Math.max(...jumps)).toBeLessThan(0.002);
    if(quality!=='low'){
      expect(frames.at(-1)!.refreshes).toBeGreaterThan(frames[0].refreshes);
      expect(frames.at(-1)!.refreshes-frames[0].refreshes).toBeLessThan(12);
      for(let i=1;i<frames.length;i++)if(frames[i].refreshes===frames[i-1].refreshes)expect(frames[i].matrix).toEqual(frames[i-1].matrix);
    }else expect(frames.at(-1)!.refreshes).toBe(0);
    const paused=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any,sun=w.flickerScene.children.find((o:any)=>o.isDirectionalLight&&o.shadow?.camera.far===900);c._rhCommand('pause');w.stepFlicker(16);const a={position:sun.position.toArray(),target:sun.target.position.toArray(),refreshes:c._rhSnapshot().shadowRefreshCount};w.stepFlicker(60000);return {a,b:{position:sun.position.toArray(),target:sun.target.position.toArray(),refreshes:c._rhSnapshot().shadowRefreshCount}};});
    expect(paused.b).toEqual(paused.a);expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
