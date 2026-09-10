import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.attentionScene=scene;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor attention continuity',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const species of ['redTail','greatHorned'])test('keeps reticle and head together and scans from rest: '+species,async({page})=>{
    await page.setViewportSize({width:species==='greatHorned'?440:1100,height:1200});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).stepAttention=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:species==='redTail'?'high':'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(species==='greatHorned')await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    const tracking=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=w.stepAttention;c._rhCommand('environment',{windSpeed:0,dayPhase:0.4,cloudCover:0.18});step(25);
      const scene=w.attentionScene,prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      w.placeAttention=(a:number,b:number,hidden=false)=>{const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;
        prey.forEach((o:any,i:number)=>{const d=i===0?a:b,side=i===0?-5:5;
          if(i>1||!Number.isFinite(d)){o.position.set(2000+i*20,2000,2000);return;}
          o.position.set(p.x+Math.sin(yaw)*d+Math.cos(yaw)*side,p.y+(hidden&&i===0?-100:0),p.z-Math.cos(yaw)*d+Math.sin(yaw)*side);
        });
      };
      const series=[];for(let i=0;i<24;i++){w.placeAttention(40,41);step(25);}const first=c._rhSnapshot();
      for(let i=0;i<20;i++){w.placeAttention(40,39+i%2);step(25);series.push(c._rhSnapshot());}
      w.placeAttention(40,25);step(25);const switched=c._rhSnapshot();
      for(let i=0;i<20;i++){w.placeAttention(40,25);step(25);}const settled=c._rhSnapshot();
      w.placeAttention(40,Infinity,true);step(25);const lost=c._rhSnapshot();
      return {first,series,switched,settled,lost};
    });
    expect(tracking.first.attendedTargetIndex).toBeGreaterThanOrEqual(0);
    for(const s of tracking.series){expect(s.attendedTargetIndex).toBe(tracking.first.attendedTargetIndex);expect(s.gazeTargetIndex).toBe(s.attendedTargetIndex);expect(s.cameraPosition.every(Number.isFinite)).toBe(true);}
    expect(tracking.switched.attendedTargetIndex).not.toBe(tracking.first.attendedTargetIndex);expect(tracking.switched.gazeTargetIndex).toBe(tracking.switched.attendedTargetIndex);
    expect(Math.abs(tracking.switched.gazeYaw-tracking.series.at(-1)!.gazeYaw)).toBeLessThan(0.12);expect(tracking.settled.gazeYaw*tracking.first.gazeYaw).toBeLessThan(0);
    expect(tracking.lost.attendedTargetIndex).toBe(-1);expect(tracking.lost.gazeTracking).toBe(false);
    const scan=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=w.stepAttention;c._rhCommand('hold',{key:'s',pressed:true});
      for(let i=0;i<12;i++){w.placeAttention(Infinity,Infinity);step(25);}c._rhCommand('hold',{key:'s',pressed:false});
      for(let i=0;i<30;i++){w.placeAttention(Infinity,Infinity);step(25);}const down=c._rhSnapshot();
      const head=w.attentionScene.getObjectByName('raptor-head-rig');c._rhCommand('pause');step(60000);
      return {down,paused:c._rhSnapshot(),bodyPitch:head.parent.rotation.x};
    });
    expect(scan.down.gazeTracking).toBe(false);expect(scan.down.gazePitch).toBeGreaterThan(0.25);expect(scan.bodyPitch).toBe(0);expect(scan.paused.gazePitch).toBe(scan.down.gazePitch);expect(scan.paused.raptorPosition).toEqual(scan.down.raptorPosition);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    await expect(page.locator('.rh-flight-state')).toHaveText('Perched');
    await page.screenshot({clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/attention-scan-'+species+'.png',timeout:90000});
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().gazePitch)).toBe(0);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('pause');(window as any).placeAttention(40,41);(window as any).stepAttention(25);c._rhCommand('assist');});
    expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().attendedTargetIndex)).toBe(-1);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
