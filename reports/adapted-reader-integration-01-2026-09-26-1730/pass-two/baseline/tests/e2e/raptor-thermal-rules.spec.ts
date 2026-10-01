import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(!window.skipThermalRender)return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor thermal mission rules',()=>{
  test.describe.configure({mode:'serial',timeout:240000});
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'thermalKettle',flightSession:{speciesId:'redTail',missionId:'thermalKettle'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});
      w.placeHuntPrey=(distance:number,yawOffset=0,pitchOffset=0)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians+yawOffset,pitch=s.pitchRadians+pitchOffset;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });





  for(const input of ['keyboard','button'])test('enforces thermal-only flight for '+input+' input while allowing glide and turns',async({page})=>{
    const panel=page.locator('[data-raptor-mission-progress]'),route=panel.locator('[data-raptor-mission-route]');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;c._rhCommand('hold',{key:'d',pressed:true});w.advanceHunt(250);c._rhCommand('hold',{key:'d',pressed:false});w.advanceHunt(250);});
    await expect(route).toHaveAttribute('data-route-outcome','active');
    const before=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    const climbDisabled=await page.getByRole('button',{name:'Hold to climb',exact:true}).isDisabled();
    const guide=await page.locator('.rh-flight-key-guide').textContent();
    if(input==='keyboard')await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/thermal-mission-guidance.png',timeout:90000});
    await page.locator('[data-raptor-canvas]').evaluate((c:any,input)=>{if(input==='keyboard')c.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));else c._rhCommand('hold',{key:' ',pressed:true});(window as any).stepHunt(25);},input);
    await expect(page.getByRole('dialog',{name:'Mission ended',exact:true})).toBeVisible();await expect(route).toHaveAttribute('data-route-outcome','failed');await expect(page.getByRole('dialog')).toContainText('Pull-up flapping is not allowed');
    const after=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());expect(after.raptorPosition.y).toBe(before.raptorPosition.y);
    expect(climbDisabled).toBe(true);expect(guide).toContain('Turn toward lift');expect(guide).not.toContain('Strike');
    const frozen=after.motionTimeMs;await page.evaluate(()=>{(window as any).advanceHunt(1000);});expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBe(frozen);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('allows a legal glide into lift and updates the circling prompt',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,origin=w.huntScene.getObjectByName('mission-thermal-column').position;w.skipThermalRender=true;
      let entered=false,entryHeight=0;
      for(let i=0;i<350;i++){
        const s=c._rhSnapshot(),p=s.raptorPosition,wanted=Math.atan2(origin.x-p.x,-(origin.z-p.z)),error=Math.atan2(Math.sin(wanted-s.headingRadians),Math.cos(wanted-s.headingRadians));
        c._rhCommand('hold',{key:'d',pressed:error>.04});c._rhCommand('hold',{key:'a',pressed:error<-.04});w.stepHunt(50);
        if(c._rhSnapshot().thermalActive){entered=true;entryHeight=c._rhSnapshot().raptorPosition.y;break;}
      }
      c._rhCommand('hold',{key:'d',pressed:false});c._rhCommand('hold',{key:'a',pressed:false});w.advanceHunt(500);w.skipThermalRender=false;w.stepHunt(25);
      return {entered,entryHeight,after:c._rhSnapshot()};
    });expect(result.entered).toBe(true);expect(result.after.raptorPosition.y).toBeGreaterThan(result.entryHeight);expect(result.after.thermalActive).toBe(true);
    await expect(page.locator('[data-raptor-mission-route]')).toHaveAttribute('data-route-outcome','active');await expect(page.locator('.rh-flight-key-guide')).toContainText('Circle in lift');
    await expect(page.locator('[data-raptor-target-guidance]')).toContainText('IN LIFT');
    expect(result.after.targetState).toBe('lift');expect(result.after.activeTargetIndex).toBe(-1);expect(result.after.cameraTargetBlend).toBe(0);
    await expect(page.locator('.rh-flight-readout-lock')).toHaveCount(0);await expect(page.locator('[data-raptor-lock-meters]')).toHaveCount(0);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/thermal-legal-glide.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('keeps lift guidance free of prey cues through paused view changes and narrow layouts',async({page})=>{
    const canvas=page.locator('[data-raptor-canvas]'),cue=page.locator('[data-raptor-target-guidance]');
    const snap=await canvas.evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(4);w.advanceHunt(150);c._rhCommand('targetProbe',{ndcX:0,ndcY:0,ndcZ:0});c._rhCommand('pause');return c._rhSnapshot();});
    expect(snap.targetState).toBe('soar');expect(snap.activeTargetIndex).toBe(-1);expect(snap.cameraTargetBlend).toBe(0);
    expect(snap.targetGuideVisible).toBe(false);expect(snap.targetHaloVisible).toBe(false);
    await expect(cue).toContainText('FIND LIFT');await expect(page.locator('.rh-flight-heading')).toContainText('LIFT');
    await expect(page.locator('[data-raptor-metric=target]')).toContainText('Lift');
    await expect(page.locator('.rh-target-tracker')).toBeHidden();await expect(page.locator('.rh-flight-reticle')).toBeHidden();await expect(page.locator('.rh-flight-marker')).toBeHidden();
    await expect(page.locator('.rh-flight-readout-lock')).toHaveCount(0);await expect(page.locator('[data-readout-kind=strike]')).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Toggle target assist',exact:true})).toHaveCount(0);
    await expect(page.locator('.rh-flight-btn-strike')).toHaveCount(0);
    const beforeText=await cue.textContent();
    for(const action of ['assist','view','zoom']){
      const after=await canvas.evaluate((c:any,action)=>{c._rhCommand(action);(window as any).stepHunt(60000);return c._rhSnapshot();},action);
      expect(after.motionTimeMs).toBe(snap.motionTimeMs);expect(after.targetState).toBe('soar');expect(after.activeTargetIndex).toBe(-1);expect(after.targetGuideVisible).toBe(false);expect(after.targetHaloVisible).toBe(false);
      await expect(cue).toHaveText(beforeText!);await expect(page.locator('.rh-target-tracker')).toBeHidden();
    }
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeHidden();
    await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(cue).toBeVisible();
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:440,height:900});await page.addStyleTag({content:'#wrap{width:420px}'});await page.waitForFunction(()=>document.querySelector<HTMLCanvasElement>('[data-raptor-canvas]')!.width<420,null,{polling:50});
    await canvas.evaluate((c:any)=>{c._rhCommand('view');(window as any).stepHunt(25);});
    const bounds=await cue.evaluate(el=>{const r=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();return {left:r.left-host.left,right:r.right-host.left,width:host.width,height:r.height};});
    expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(bounds.width);expect(bounds.height).toBeGreaterThan(0);
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/thermal-guidance-paused-420.png',timeout:90000});
    await page.getByRole('button',{name:'Restart this flight',exact:true}).click();await page.waitForFunction(()=>!!(document.querySelector('[data-raptor-canvas]') as any)?._rhSnapshot,null,{polling:50});
    await page.evaluate(()=>{(window as any).advanceHunt(150);});await expect(cue).toContainText('FIND LIFT');await expect(page.locator('.rh-target-tracker')).toBeHidden();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

});
