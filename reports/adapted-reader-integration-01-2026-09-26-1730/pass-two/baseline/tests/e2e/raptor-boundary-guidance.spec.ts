import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntCamera=camera;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor flight area guidance',()=>{
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


  test('explains the edge, respects mappings, and restores hunting after returning',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),panel=page.locator('.rh-flight-mission-hud'),guide=page.locator('.rh-flight-key-guide');
    const edge=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('assist');w.skipGroundRender=true;for(let i=0;i<600;i++){w.stepHunt(50);const s=c._rhSnapshot();if(Math.max(Math.abs(s.raptorPosition.x),Math.abs(s.raptorPosition.z))>s.worldEdgeSoft+8)break;}w.skipGroundRender=false;w.advanceHunt(150);return c._rhSnapshot();});
    expect(edge.worldEdgeState).not.toBe('clear');expect(edge.landed).toBe(false);expect(edge.crashed).toBe(false);
    const error=Math.atan2(Math.sin(Math.atan2(-edge.raptorPosition.x,edge.raptorPosition.z)-edge.headingRadians),Math.cos(Math.atan2(-edge.raptorPosition.x,edge.raptorPosition.z)-edge.headingRadians));
    const action=error<0?'turnLeft':'turnRight',word=error<0?'left':'right';
    await expect(panel).toHaveAttribute('data-boundary-return',action);await expect(panel).toContainText('Flight area edge');await expect(panel).toContainText('turn '+word+' toward center');await expect(guide).toContainText('Return inward');
    await canvas.evaluate((c:any)=>c._rhCommand('controls',{scheme:'custom',keys:{j:'turnLeft',l:'turnRight',p:'pause'}}));await expect(guide).toContainText((word==='left'?'J':'L')+'Return inward');
    await canvas.evaluate((c:any)=>c._rhCommand('controls',{scheme:'custom',keys:{p:'pause'}}));await expect(panel).toContainText('drag '+word+' toward center');await expect(guide).not.toContainText('Return inward');
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const frozen=await canvas.evaluate((c:any)=>c._rhSnapshot());await expect(guide).toContainText('Resume');
    await page.setViewportSize({width:360,height:1100});await page.addStyleTag({content:'#wrap{width:320px}'});
    const fit=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {overflow:el.scrollWidth-el.clientWidth,left:r.left-host.left,right:host.right-r.right};});expect(fit.overflow).toBeLessThanOrEqual(1);expect(fit.left).toBeGreaterThanOrEqual(0);expect(fit.right).toBeGreaterThanOrEqual(0);
    const style=await page.addStyleTag({content:'.rh-flight-pause{visibility:hidden!important}'});await panel.screenshot({path:'scratch/raptor-flight-review/boundary-return-320.png',timeout:90000});await style.evaluate(el=>el.remove());
    await canvas.evaluate(()=>(window as any).stepHunt(60000));const paused=await canvas.evaluate((c:any)=>c._rhSnapshot());expect(paused.raptorPosition).toEqual(frozen.raptorPosition);expect(paused.motionTimeMs).toBe(frozen.motionTimeMs);
    const returned=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('controls',{scheme:'classic'});c._rhCommand('pause');w.skipGroundRender=true;let inwardSeen=false;for(let i=0;i<600;i++){const s=c._rhSnapshot();if(document.querySelector('.rh-flight-mission-hud').getAttribute('data-boundary-return')==='inward')inwardSeen=true;if(Math.max(Math.abs(s.raptorPosition.x),Math.abs(s.raptorPosition.z))<s.worldEdgeSoft-10)break;const e=Math.atan2(Math.sin(Math.atan2(-s.raptorPosition.x,s.raptorPosition.z)-s.headingRadians),Math.cos(Math.atan2(-s.raptorPosition.x,s.raptorPosition.z)-s.headingRadians));c._rhCommand('hold',{key:'a',pressed:e< -0.06});c._rhCommand('hold',{key:'d',pressed:e>0.06});w.stepHunt(50);}c._rhCommand('hold',{key:'a',pressed:false});c._rhCommand('hold',{key:'d',pressed:false});w.advanceHunt(200);w.skipGroundRender=false;w.stepHunt(25);return {...c._rhSnapshot(),inwardSeen};});
    expect(returned.inwardSeen).toBe(true);expect(returned.worldEdgeState).toBe('clear');expect(returned.landed).toBe(false);expect(returned.crashed).toBe(false);expect(returned.missionCatches).toBe(edge.missionCatches);
    await expect(panel).toHaveAttribute('data-boundary-return','');await expect(panel).not.toContainText('Flight area edge');await expect(guide).not.toContainText('Return inward');await expect(panel).toContainText('Explore freely');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
