import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor consistent target feedback',()=>{
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
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',flightSession:{speciesId:'peregrine',missionId:'open'},huntTutorialDismissed:true,graphicsQuality:'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;c._rhCommand('environment',{windSpeed:0});
      // Refresh an exact geometric fixture without letting prey AI return it to terrain.
      // Moving-prey/frame-order coverage lives in raptor-live-target.spec.ts.
      w.refreshHuntTarget=()=>c._rhCommand('scenic',false);
      w.placeHuntPrey=(distance:number)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians,pitch=s.pitchRadians;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });

  test('keeps target readouts consistent at the strike boundary and shows real recovery readiness',async({page})=>{
    const range=page.locator('[data-raptor-metric="target"] .rh-flight-metric-value'),name=page.locator('.rh-target-name'),status=page.locator('.rh-target-status'),guidance=page.locator('[data-raptor-target-guidance]');
    for(const [distance,expected,state] of [[5.2,'5.2 m','CLOSE'],[5.2001,'5.3 m','CLOSE'],[4.8,'4.8 m','READY'],[30,'30 m','CLOSE'],[30.0001,'31 m','CLOSE'],[65,'~65 m','CLOSE']] as const){
      await page.evaluate(distance=>{const w=window as any;w.placeHuntPrey(distance);w.refreshHuntTarget();},distance);
      await expect(range).toHaveText(expected);await expect(name).toContainText(expected);await expect(guidance).toContainText(state);
      if(state==='CLOSE')await expect(guidance).toContainText(expected+' (need 5 m)');
    }
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(30);c._rhCommand('strike');w.placeHuntPrey(3);w.refreshHuntTarget();});
    await expect(status).toHaveText('RECOVERING');
    // Keep the exact target fixture fixed while testing paused recovery.
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('pause');w.stepHunt(60000);});await expect(status).toHaveText('RECOVERING');await expect(range).toHaveText('3.0 m');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('pause');w.advanceHunt(400);w.placeHuntPrey(3);w.refreshHuntTarget();});await expect(status).toHaveText('READY TO STRIKE');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;w.placeHuntPrey(3);c._rhCommand('strike');});await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText('Catch secured');
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('assist');w.refreshHuntTarget();});await expect(range).toHaveText('Off');await expect(page.locator('.rh-target-tracker')).toBeHidden();
    await page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('assist');w.placeHuntPrey(2000);w.refreshHuntTarget();});await expect(range).toHaveText('None');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('labels offscreen prey by screen position without conflicting steering commands',async({page})=>{
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThan(440);
    for(const [x,y,label] of [[-1.6,1.4,'PREY ABOVE LEFT'],[1.6,1.4,'PREY ABOVE RIGHT'],[-1.6,-1.4,'PREY BELOW LEFT'],[1.6,-1.4,'PREY BELOW RIGHT']] as const){
      await page.evaluate(({x,y})=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any;c._rhCommand('targetProbe',{ndcX:x,ndcY:y,ndcZ:0});w.stepHunt(25);},{x,y});
      const status=page.locator('.rh-target-status');await expect(status).toHaveText(label);await expect(status).toBeVisible();expect(await status.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    }
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/target-bearing-labels-narrow.png',timeout:90000});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
