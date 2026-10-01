import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor mission results',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'feedChicks',flightSession:{speciesId:'peregrine',missionId:'feedChicks'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
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




  test('keeps results and next-flight actions usable in compact flight views',async({page})=>{
    for(let i=0;i<12;i++){
      const done=await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('strike');w.stepHunt(1);if(document.querySelector('[data-mission-state="success"]'))return true;w.advanceHunt(1000);return false;});if(done)break;
    }
    const dialog=page.getByRole('dialog',{name:'Mission complete',exact:true});await expect(dialog).toBeVisible();await expect(page.locator('.rh-flight-pause')).toBeHidden();
    for(const width of [880,420,320]){
      await page.setViewportSize({width:Math.max(360,width+40),height:1000});await page.addStyleTag({content:'#wrap{width:'+width+'px}[data-raptor-flight-stage]{height:460px!important;min-height:0!important}'});
      const bounds=await dialog.evaluate(el=>{const stage=el.getBoundingClientRect(),card=el.querySelector('.rh-flight-result-card')!.getBoundingClientRect();const buttons=[...el.querySelectorAll('button')].filter(b=>['Fly again','Next mission','Change setup'].includes(b.textContent||'')).map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent,left:r.left-stage.left,right:stage.right-r.right,top:r.top-stage.top,bottom:stage.bottom-r.bottom};});return {top:card.top-stage.top,bottom:stage.bottom-card.bottom,left:card.left-stage.left,right:stage.right-card.right,overflow:el.scrollWidth-el.clientWidth,buttons};});
      for(const k of ['top','bottom','left','right'] as const)expect(bounds[k]).toBeGreaterThanOrEqual(0);expect(bounds.overflow).toBeLessThanOrEqual(1);expect(bounds.buttons).toHaveLength(3);for(const b of bounds.buttons)for(const k of ['top','bottom','left','right'] as const)expect(b[k],b.label||'').toBeGreaterThanOrEqual(0);
      expect(await dialog.locator('#rh-flight-result-title').evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})).toBe(true);
      await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/results-'+width+'.png',timeout:90000});
    }
    const review=dialog.getByRole('region',{name:'Flight review details'});await expect(review).toHaveAttribute('tabindex','0');
    await review.evaluate(el=>{el.scrollTop=el.scrollHeight;});await expect(dialog.getByRole('button',{name:'Fly again',exact:true})).toBeVisible();
    await dialog.getByRole('button',{name:'Change setup',exact:true}).focus();await page.keyboard.press('Tab');await expect(review).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Change setup',exact:true})).toBeFocused();
    const frozen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('pause'));await page.evaluate(()=>{(window as any).advanceHunt(250);});
    const after=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());expect(after.motionTimeMs).toBe(frozen.motionTimeMs);expect(after.raptorPosition).toEqual(frozen.raptorPosition);
    await dialog.getByRole('button',{name:'Fly again',exact:true}).click();await expect(dialog).toHaveCount(0);
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot?.().missionCatches)).toBe(0);
    const start=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().motionTimeMs);await page.evaluate(()=>{(window as any).advanceHunt(200);});expect(await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().motionTimeMs)).toBeGreaterThan(start);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
