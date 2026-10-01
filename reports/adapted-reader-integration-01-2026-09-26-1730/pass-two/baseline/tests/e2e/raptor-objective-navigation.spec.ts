import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor objective navigation',()=>{
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


  test('points instruments to each practice ring and restores paused prey guidance',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),heading=page.locator('.rh-flight-heading'),metric=page.locator('[data-raptor-metric=target]');
    await canvas.evaluate((c:any)=>{c._rhCommand('assist');c._rhCommand('trail');});
    await expect(metric.locator('.rh-flight-metric-label')).toHaveText('Ring 1');await expect(heading).toContainText('RING 1');
    const checkRing=async()=>{const s=await canvas.evaluate((c:any)=>c._rhSnapshot()),g=s.practiceNextGate,p=s.raptorPosition;expect(g).toBeTruthy();await expect(metric.locator('.rh-flight-metric-label')).toHaveText('Ring '+(s.practiceTrailIndex+1));await expect(metric.locator('.rh-flight-metric-value')).toHaveText(Math.round(Math.hypot(g.x-p.x,g.y-p.y,g.z-p.z))+' m');await expect(page.locator('.rh-practice-hud > strong')).toContainText(' / 5 · '+await metric.locator('.rh-flight-metric-value').textContent());const angle=Math.atan2(Math.sin(Math.atan2(g.x-p.x,-(g.z-p.z))-s.headingRadians),Math.cos(Math.atan2(g.x-p.x,-(g.z-p.z))-s.headingRadians))*180/Math.PI,rounded=Math.round(angle);await expect(heading).toContainText('RING '+(s.practiceTrailIndex+1)+' '+(rounded< -1?'L ':rounded>1?'R ':'A ')+Math.abs(rounded)+'°');};
    await checkRing();
    await canvas.evaluate((c:any)=>{c._rhCommand('hold',{key:'d',pressed:true});(window as any).advanceHunt(200);c._rhCommand('hold',{key:'d',pressed:false});(window as any).advanceHunt(150);});await checkRing();await expect(heading).toHaveAttribute('data-heading-state','left');
    const earned=await canvas.evaluate((c:any)=>{const w=window as any;w.skipGroundRender=true;for(let i=0;i<220&&c._rhSnapshot().practiceTrailIndex===0;i++){const s=c._rhSnapshot(),g=s.practiceNextGate,error=Math.atan2(Math.sin(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians),Math.cos(Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z))-s.headingRadians));for(const [key,pressed] of [['d',error>.035],['a',error<-.035],['e',g.y-s.raptorPosition.y>.7],['q',s.raptorPosition.y-g.y>.7]])c._rhCommand('hold',{key,pressed});w.stepHunt(40);}for(const key of ['a','d','e','q'])c._rhCommand('hold',{key,pressed:false});w.skipGroundRender=false;w.stepHunt(25);return c._rhSnapshot();});expect(earned.practiceTrailPassed).toBe(1);await checkRing();
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/ring-navigation.png',timeout:90000});
    await canvas.evaluate((c:any)=>c._rhCommand('pause'));const frozen=await canvas.evaluate((c:any)=>c._rhSnapshot()),text=await heading.textContent();await canvas.evaluate((c:any)=>{c._rhCommand('view');(window as any).stepHunt(60000);});await expect(heading).toHaveText(text!);await checkRing();expect(await canvas.evaluate((c:any)=>c._rhSnapshot().raptorPosition)).toEqual(frozen.raptorPosition);
    await canvas.evaluate((c:any)=>{c._rhCommand('pause');c._rhCommand('trail');});await expect(metric.locator('.rh-flight-metric-label')).toHaveText('Target');await expect(metric.locator('.rh-flight-metric-value')).toHaveText('Off');await expect(heading).toContainText('TGT —');
    await canvas.evaluate((c:any)=>{const w=window as any,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;const prey=w.huntScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*35+Math.cos(yaw)*6:2000+i*20,i===0?p.y:2000,i===0?p.z-Math.cos(yaw)*35+Math.sin(yaw)*6:2000));c._rhCommand('pause');c._rhCommand('assist');});await expect(heading).toContainText(/TGT R \d+°/);const before=await canvas.evaluate((c:any)=>c._rhSnapshot());
    await canvas.evaluate((c:any)=>c._rhCommand('assist'));await expect(heading).toContainText('TGT —');await expect(metric.locator('.rh-flight-metric-value')).toHaveText('Off');const after=await canvas.evaluate((c:any)=>c._rhSnapshot());for(const key of ['raptorPosition','motionTimeMs','calories','stamina','missionCatches'])expect(after[key]).toEqual(before[key]);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
