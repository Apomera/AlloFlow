import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
for(const mission of ['feedChicks','silentStrike'])test.describe('Raptor mission clarity '+mission,()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:mission,flightSession:{speciesId:'peregrine',missionId:mission},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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





  test('distinguishes ordinary pause from a finished mission and explains its actual rules',async({page})=>{
    const readout=page.locator('[data-raptor-flight-readout]'),status=readout.locator('[data-readout-kind="status"]'),strike=readout.locator('[data-readout-kind="strike"]'),renderer=readout.locator('[data-readout-kind="renderer"]');
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));await expect(readout).toHaveAttribute('data-readout-state','paused');await expect(status).toContainText('Paused');await expect(strike).toContainText('Resume flight to strike');await expect(renderer).toContainText('Paused');
    await expect(page.getByRole('button',{name:'Resume flight',exact:true})).toBeEnabled();
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));
    if(mission==='silentStrike'){
      await expect(page.locator('[data-raptor-mission-focus]')).toContainText('48 m');
      const outcome=await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(49);c._rhCommand('hold',{key:' ',pressed:true});w.stepHunt(1);c._rhCommand('hold',{key:' ',pressed:false});const outside=document.querySelector('[data-raptor-mission-route]')!.getAttribute('data-route-outcome');w.placeHuntPrey(47);w.stepHunt(1);const glide=document.querySelector('[data-raptor-mission-route]')!.getAttribute('data-route-outcome');w.placeHuntPrey(47);c._rhCommand('hold',{key:' ',pressed:true});w.stepHunt(1);return {outside,glide};});expect(outcome).toEqual({outside:'active',glide:'active'});
    }else{
      for(let i=0;i<12;i++){
        const done=await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);if(document.querySelector('[data-mission-state="success"]'))return true;w.advanceHunt(1000);return false;});if(done)break;
      }
    }
    const outcome=mission==='silentStrike'?'failed':'success',label=outcome==='success'?'Mission complete':'Mission ended';
    await expect(page.getByRole('dialog',{name:label,exact:true})).toBeVisible();await expect(readout).toHaveAttribute('data-readout-state',outcome);await expect(status).toContainText(label);await expect(strike).toContainText('Flight ended');await expect(renderer).toContainText('Paused');
    await expect(page.getByRole('button',{name:'Flight ended',exact:true})).toBeDisabled();await expect(page.locator('.rh-flight-pause')).toBeHidden();
    await page.setViewportSize({width:440,height:1100});await page.addStyleTag({content:'#wrap{width:420px}'});await expect(readout.locator('.rh-flight-readout-copy')).toContainText('Review your results');expect(await readout.locator('.rh-flight-readout-detail').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1&&getComputedStyle(el).whiteSpace==='normal'))).toBe(true);await readout.screenshot({path:'scratch/raptor-flight-review/mission-instruments-'+outcome+'.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
