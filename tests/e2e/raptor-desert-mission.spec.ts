import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;if(!window.skipFlightRender)return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor desert mission',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'redTail',activeMission:'crossDesert',flightSession:{speciesId:'redTail',missionId:'crossDesert'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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






  const flyTo=(c:any,w:any,goal:any,climbTo:number)=>{for(let i=0;i<2400;i++){const s=c._rhSnapshot();if(s.missionOutcome&&s.missionOutcome!=='active')return;const bearing=Math.atan2(goal.x-s.raptorPosition.x,-(goal.z-s.raptorPosition.z)),error=Math.atan2(Math.sin(bearing-s.headingRadians),Math.cos(bearing-s.headingRadians)),across=Math.hypot(goal.x-s.raptorPosition.x,goal.z-s.raptorPosition.z);
      if(s.thermalActive&&s.altitudeAboveGround<climbTo&&across<16){c._rhCommand('hold',{key:'d',pressed:true});c._rhCommand('hold',{key:'a',pressed:false});}
      else{if(goal.leg!==undefined&&s.desertNext>goal.leg&&s.altitudeAboveGround>=climbTo)return;if(goal.leg===undefined&&across<5)return;c._rhCommand('hold',{key:'d',pressed:error>.05});c._rhCommand('hold',{key:'a',pressed:error<-.05});}
      w.stepHunt(40);}};
  test('sinks between thermals, climbs inside one, and only reaching the oasis wins',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any,src:string)=>{
      const w=window as any;w.skipFlightRender=true;const fly=(0,eval)('('+src+')');
      const a=c._rhSnapshot(),t=a.desertThermals;w.advanceHunt(4000);const b=c._rhSnapshot();
      const sink=(a.altitudeAboveGround-b.altitudeAboveGround)/4;
      const heights:number[]=[];
      for(let leg=0;leg<t.length;leg++){fly(c,w,{x:t[leg].x,z:t[leg].z,leg},150);heights.push(c._rhSnapshot().altitudeAboveGround);}
      const before=c._rhSnapshot();
      fly(c,w,{x:0,z:290},0);
      for(const key of ['a','d'])c._rhCommand('hold',{key,pressed:false});w.skipFlightRender=false;w.stepHunt(25);
      const end=c._rhSnapshot();return {sink,heights,next:before.desertNext,distance:end.desertOasisDistance,landed:end.landed,crashed:end.crashed,elapsed:end.motionTimeMs};
    },flyTo.toString());
    expect(result.sink).toBeGreaterThan(1.5);expect(result.next).toBe(4);
    for(const h of result.heights)expect(h).toBeGreaterThan(90);
    expect(result.landed).toBe(false);expect(result.crashed).toBe(false);expect(result.distance).toBeLessThan(40);
    await expect(page.getByRole('dialog',{name:'Mission complete',exact:true})).toContainText('You crossed.');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('gliding past the thermals without climbing lands short of the oasis',async({page})=>{
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;w.skipFlightRender=true;
      for(let i=0;i<4000&&!c._rhSnapshot().landed&&!c._rhSnapshot().crashed;i++){const s=c._rhSnapshot(),error=Math.atan2(Math.sin(Math.atan2(250-s.raptorPosition.x,-(290-s.raptorPosition.z))-s.headingRadians),Math.cos(Math.atan2(250-s.raptorPosition.x,-(290-s.raptorPosition.z))-s.headingRadians));c._rhCommand('hold',{key:'d',pressed:error>.05});c._rhCommand('hold',{key:'a',pressed:error<-.05});w.stepHunt(40);}
      for(const key of ['a','d'])c._rhCommand('hold',{key,pressed:false});w.skipFlightRender=false;w.stepHunt(25);const s=c._rhSnapshot();return {distance:s.desertOasisDistance,landed:s.landed||s.crashed};
    });
    expect(result.landed).toBe(true);expect(result.distance).toBeGreaterThan(36);
    await expect(page.getByRole('dialog',{name:'Mission ended',exact:true})).toContainText('crossing ended on the ground');
  });
  for(const contact of ['landing','crash'])test('ends the crossing after '+contact+' and keeps the result consistent',async({page})=>{
    const panel=page.locator('[data-raptor-mission-progress]'),route=panel.locator('[data-raptor-mission-route]');
    await expect(panel).toContainText('to the oasis');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);});
    expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().missionCatches)).toBe(1);await expect(route).toHaveAttribute('data-route-outcome','active');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));const frozen=await panel.textContent();await page.evaluate(()=>{(window as any).stepHunt(60000);});expect(await panel.textContent()).toBe(frozen);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));await page.evaluate(()=>{(window as any).advanceHunt(1200);});await expect(panel).toContainText('3:59 left');
    const result=await page.locator('[data-raptor-canvas]').evaluate((c:any,contact)=>{
      const w=window as any;w.skipFlightRender=true;const key=contact==='landing'?'q':'shift';c._rhCommand('hold',{key,pressed:true});
      for(let i=0;i<500&&!document.querySelector('[data-mission-state="failed"]');i++)w.stepHunt(50);
      c._rhCommand('hold',{key,pressed:false});w.skipFlightRender=false;c._rhCommand('view');return c._rhSnapshot();
    },contact);
    expect(contact==='landing'?result.landed:result.crashed).toBe(true);expect(result.calories).toBeGreaterThan(0);
    const dialog=page.getByRole('dialog',{name:'Mission ended',exact:true});await expect(dialog).toBeVisible();await expect(dialog).toContainText('crossing ended on the ground');await expect(dialog).not.toContainText('You crossed.');
    await expect(route).toHaveAttribute('data-route-outcome','failed');await expect(page.locator('.rh-flight-pause')).toBeHidden();
    await expect(page.locator('.rh-flight-state')).not.toContainText('Recovering');await expect(page.locator('.rh-flight-state')).not.toHaveAttribute('aria-label',/until takeoff/);
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.runHistory.at(-1).outcome)).toBe('failed');
    if(contact==='landing')await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/desert-grounded-result.png',timeout:90000});
    await dialog.getByRole('button',{name:'Fly again',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(route).toHaveAttribute('data-route-outcome','active');await expect(panel).toContainText('to the oasis');
    await page.evaluate(()=>{(window as any).advanceHunt(200);});await expect(route).toHaveAttribute('data-route-outcome','active');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
