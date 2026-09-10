import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.perchScene=scene;window.perchRenderer=renderer;return render(scene,camera);};return renderer;};})();`;
test.describe('Perched hunt gameplay',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1000,height:720,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});
  for(const species of ['redTail','greatHorned','peregrine','kestrel'])test('scans, rests, launches and strikes correctly: '+species,async({page})=>{
    await page.setViewportSize({width:species==='greatHorned'?440:1100,height:1200});
    await page.addInitScript(()=>{let time=1000,id=1,seed=731;const callbacks=new Map<number,FrameRequestCallback>();Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;window.requestAnimationFrame=cb=>{const next=id++;callbacks.set(next,cb);return next;};window.cancelAnimationFrame=key=>{callbacks.delete(key);};(window as any).advancePerch=(ms:number)=>{time+=ms;const pending=Array.from(callbacks.values());callbacks.clear();pending.forEach(cb=>cb(time));};});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:'open',flightSession:{speciesId:species,missionId:'open'},huntTutorialDismissed:true,graphicsQuality:species==='redTail'?'high':'low'}},"document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    if(species==='greatHorned')await page.addStyleTag({content:'#wrap{width:420px}'});
    await page.getByRole('button',{name:'Perched practice',exact:true}).click();
    const scan=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=w.advancePerch;c._rhCommand('environment',{windSpeed:12,dayPhase:0.38});
      for(let i=0;i<30;i++)step(25);const resting=c._rhSnapshot();
      c._rhCommand('hold',{key:'s',pressed:true});for(let i=0;i<12;i++)step(25);c._rhCommand('hold',{key:'s',pressed:false});for(let i=0;i<8;i++)step(25);
      const down=c._rhSnapshot();for(let i=0;i<20;i++)step(25);const held=c._rhSnapshot();
      const scene=w.perchScene,prey=scene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
      // Controlled scene fixtures exercise production acquisition and strike code, not the HUD-only target probe.
      w.placePerchPrey=(distance:number)=>{const state=c._rhSnapshot(),p=state.raptorPosition,yaw=state.headingRadians,pitch=state.pitchRadians;
        prey.filter((o:any)=>o.parent===scene).forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*Math.cos(pitch)*distance:2000+i*20,i===0?p.y+Math.sin(pitch)*distance:2000,i===0?p.z-Math.cos(yaw)*Math.cos(pitch)*distance:2000));};
      w.placePerchPrey(12);const groundState=c._rhSnapshot(),gp=groundState.raptorPosition;
      prey[0].position.set(gp.x+Math.sin(groundState.headingRadians)*3,gp.y-groundState.terrainClearance-2,gp.z-Math.cos(groundState.headingRadians)*3);
      const obscured=c._rhSnapshot();w.placePerchPrey(12);step(50);step(50);const watched=c._rhSnapshot();w.placePerchPrey(3);c._rhCommand('strike');const blocked=c._rhSnapshot();
      c._rhCommand('pause');step(60000);c._rhCommand('perchPractice');c._rhCommand('strike');const paused=c._rhSnapshot();c._rhCommand('pause');
      return {resting,down,held,watched,blocked,paused,obscured,lookout:!!scene.getObjectByName('raptor-practice-lookout')};
    });
    expect(scan.obscured.activeTargetIndex).toBe(-1);expect(scan.lookout).toBe(true);expect(scan.resting.perched).toBe(true);expect(scan.resting.landed).toBe(true);expect(scan.resting.wingFold).toBeGreaterThan(0.99);
    expect(scan.resting.visualGroundClearance).toBeGreaterThan(5);expect(scan.resting.speedMps).toBe(0);expect(scan.resting.groundSpeedMps).toBe(0);
    expect(scan.down.pitchRadians).toBeLessThan(scan.resting.pitchRadians-0.15);expect(scan.held.pitchRadians).toBeCloseTo(scan.down.pitchRadians,3);
    expect(scan.held.raptorPosition).toEqual(scan.resting.raptorPosition);expect(scan.held.stamina).toBeGreaterThanOrEqual(scan.resting.stamina);expect(scan.resting.calories-scan.held.calories).toBeLessThan(1);
    expect(scan.watched.activeTargetIndex).toBeGreaterThanOrEqual(0);expect(scan.watched.targetState).toBe('watch');expect(scan.blocked.targetCanStrike).toBe(false);expect(scan.blocked.missionCatches).toBe(scan.resting.missionCatches);
    expect(scan.paused.raptorPosition).toEqual(scan.blocked.raptorPosition);expect(scan.paused.motionTimeMs).toBe(scan.blocked.motionTimeMs);expect(scan.paused.calories).toBe(scan.blocked.calories);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{(window as any).placePerchPrey(12);(window as any).advancePerch(25);});
    if(species==='redTail'||species==='greatHorned')await page.screenshot({clip:(await page.locator('[data-raptor-flight-stage]').boundingBox())!,path:'scratch/raptor-flight-review/perch-hunt-'+species+'.png',timeout:90000});
    const hunt=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any,step=w.advancePerch;c._rhCommand('environment',{windSpeed:0});c._rhCommand('hold',{key:' ',pressed:true});step(25);const launch=c._rhSnapshot();
      for(let i=0;i<12;i++)step(25);c._rhCommand('hold',{key:' ',pressed:false});
      w.placePerchPrey(30);c._rhCommand('strike');const distant=c._rhSnapshot();step(450);
      w.placePerchPrey(-3);c._rhCommand('strike');const behind=c._rhSnapshot();step(450);
      w.placePerchPrey(3);const ready=c._rhSnapshot();c._rhCommand('strike');const caught=c._rhSnapshot();w.placePerchPrey(3);c._rhCommand('strike');const cooldown=c._rhSnapshot();
      return {launch,distant,behind,ready,caught,cooldown};
    });
    expect(hunt.launch.perched).toBe(false);expect(hunt.launch.landed).toBe(false);expect(hunt.launch.raptorPosition.y-scan.resting.raptorPosition.y).toBeCloseTo(0.08,5);expect(hunt.launch.cameraPosition.every(Number.isFinite)).toBe(true);
    expect(hunt.distant.missionCatches).toBe(scan.resting.missionCatches);expect(hunt.behind.missionCatches).toBe(scan.resting.missionCatches);
    expect(hunt.ready.targetCanStrike).toBe(true);expect(hunt.caught.missionCatches).toBe(hunt.ready.missionCatches+1);expect(hunt.caught.lastCatchCalories).toBeGreaterThan(0);expect(hunt.cooldown.missionCatches).toBe(hunt.caught.missionCatches);
    await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot().reducedMotion)).toBe(true);
    await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{c._rhCommand('perchPractice');for(let i=0;i<20;i++)(window as any).advancePerch(25);});
    const reduced=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>c._rhSnapshot());expect(reduced.perched).toBe(true);expect(reduced.wingFold).toBeGreaterThan(0.98);expect(reduced.touchdownActive).toBe(false);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
