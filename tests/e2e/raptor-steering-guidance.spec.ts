import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor directional hunting guidance',()=>{
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
      w.placeHuntPrey=(distance:number,yawOffset=0,pitchOffset=0)=>{
        const scene=w.huntScene,s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians+yawOffset,pitch=s.pitchRadians+pitchOffset;
        const prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        // Reposition real scene prey to exercise production acquisition and catch code.
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));
      };
    });
  });

  test('guides real prey approaches in all four directions and updates the highlighted control',async({page})=>{
    const guidance=page.locator('[data-raptor-target-guidance]'),keys=page.locator('.rh-flight-key-guide');
    for(const [yaw,pitch,distance,label] of [[.95,0,30,'Turn right'],[-.95,0,30,'Turn left'],[0,.95,4,'Pitch up'],[0,-.95,4,'Pitch down']] as const){
      await page.evaluate(({yaw,pitch,distance})=>{const w=window as any;w.placeHuntPrey(distance,yaw,pitch);w.stepHunt(1);},{yaw,pitch,distance});
      await expect(guidance).toContainText('ALIGN');await expect(guidance).toContainText(label);
      await expect(keys.locator('[data-primary="true"]')).toContainText(label);
      await expect(page.locator('[data-raptor-target-announcement]')).toContainText('Target alignment changed.');
    }
    await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(30,0,0);w.stepHunt(1);});await expect(guidance).toContainText('CLOSE');
    await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(3,0,0);w.stepHunt(1);});await expect(guidance).toContainText('READY');
    await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(3,0,0);(document.querySelector('[data-raptor-canvas]') as any)._rhCommand('strike');});
    await expect(page.getByRole('region',{name:'Last strike',exact:true})).toContainText('Catch secured');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
  test('keeps a lateral miss and its coaching consistent on a narrow screen',async({page})=>{
    await page.setViewportSize({width:440,height:1000});await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(4,.95,0);w.stepHunt(1);});
    await expect(page.locator('[data-raptor-target-guidance]')).toContainText('Turn right');
    await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.width)).toBeLessThan(440);
    // Resize clears the WebGL drawing buffer. Render after it settles before visual inspection.
    await page.evaluate(()=>{const w=window as any;for(let i=0;i<8;i++){w.placeHuntPrey(4,.95,0);w.stepHunt(25);}});
    await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/directional-guidance-narrow.png',timeout:90000});
    await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(4,.95,0);(document.querySelector('[data-raptor-canvas]') as any)._rhCommand('strike');});
    const review=page.getByRole('region',{name:'Last strike',exact:true});await expect(review).toContainText('TURN RIGHT');await expect(review).toContainText('Turn gently right');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
