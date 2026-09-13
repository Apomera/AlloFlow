import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);window.huntRenderCount=0;renderer.render=function(scene,camera){window.huntScene=scene;window.huntRenderCount++;return render(scene,camera);};return renderer;};})();`;
for(const mission of ['open','feedChicks'])test.describe('Raptor flight HUD clearance '+mission,()=>{
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



  test('keeps progress readable and clear of practice controls at desktop and phone widths',async({page})=>{
    const panel=page.locator('.rh-flight-mission-hud');
    for(const width of [1100,880,760,420]){
      await page.setViewportSize({width:Math.max(440,width+40),height:1100});await page.addStyleTag({content:'#wrap{width:'+width+'px}'});
      await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:HTMLCanvasElement)=>c.clientWidth)).toBeLessThan(width);
      await page.evaluate(()=>{const w=window as any;w.placeHuntPrey(30,.95);w.stepHunt(25);});
      await expect(panel).toBeVisible();
      const layout=await panel.evaluate(el=>{const p=el.getBoundingClientRect(),host=el.parentElement!.getBoundingClientRect();const obstacles=[...el.parentElement!.querySelectorAll('.rh-practice-toggle,.rh-scenic-toggle,.rh-flight-altitude-gauge,.rh-flight-telemetry-strip')].map(node=>{const r=node.getBoundingClientRect();return {name:node.className,overlap:Math.max(0,Math.min(p.right,r.right)-Math.max(p.left,r.left))*Math.max(0,Math.min(p.bottom,r.bottom)-Math.max(p.top,r.top))};});return {obstacles,left:p.left-host.left,right:host.right-p.right,top:p.top-host.top,bottom:host.bottom-p.bottom,overflow:el.scrollWidth-el.clientWidth};});
      expect(layout.obstacles.filter(o=>o.overlap>0)).toEqual([]);expect(layout.overflow).toBeLessThanOrEqual(1);for(const key of ['left','right','top','bottom'] as const)expect(layout[key]).toBeGreaterThanOrEqual(0);
      if(width===1100||width===420)await page.locator('[data-raptor-flight-stage]').screenshot({path:'scratch/raptor-flight-review/hud-clearance-'+mission+'-'+width+'.png',timeout:90000});
    }
    if(mission==='open'){
      await page.getByRole('button',{name:'Flight trail',exact:true}).click();await expect(panel).toBeHidden();
      await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhCommand('trail'));
      await expect(panel).toBeVisible();await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(panel).toBeHidden();await page.getByRole('button',{name:'Scenic view',exact:true}).click();await expect(panel).toBeVisible();
    }
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
