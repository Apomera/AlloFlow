import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// The live flight: a released nose keeps its descent, raptor focus slows the clock on the final
// approach, a click on the animal strikes it, and the bird pulls out with its catch.
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.huntScene=scene;return render(scene,camera);};return renderer;};})();`;
test.describe('Raptor catch feel',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  // Overridable so a mutation can run against a COPY; other sessions edit this file.
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:880,height:620,appStyles:true,probes});
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
      // One animal on the ground dead ahead; the rest far off.
      w.placeHuntPrey=(distance:number)=>{
        const s=c._rhSnapshot(),p=s.raptorPosition,yaw=s.headingRadians;
        const prey=w.huntScene.children.filter((o:any)=>o.children.some((child:any)=>child.name.startsWith('prey-')));
        prey.forEach((o:any,i:number)=>o.position.set(i===0?p.x+Math.sin(yaw)*distance:p.x+300+i*20,i===0?p.y-2:p.y,i===0?p.z-Math.cos(yaw)*distance:p.z+300));
      };
    });
  });
  const canvas=(page:any)=>page.locator('[data-raptor-canvas]');
  // Let go of a one-second nose-down and glide hands-off to the ground layer.
  async function glideDown(page:any){
    const trace=await canvas(page).evaluate((c:any)=>{
      const w=window as any,s=()=>{const x=c._rhSnapshot();return {pitch:x.pitchRadians,agl:x.altitudeAboveGround,state:document.querySelector('[data-raptor-flight-state]')!.getAttribute('data-flight-state')};};
      w.advanceHunt(300);c._rhCommand('hold',{key:'s',pressed:true});w.advanceHunt(1000);c._rhCommand('hold',{key:'s',pressed:false});
      const rows=[s()];for(let i=0;i<16;i++){w.advanceHunt(500);rows.push(s());}return rows;
    });
    await page.evaluate(()=>0);
    return trace;
  }
  const step=(page:any)=>canvas(page).evaluate((c:any)=>{(window as any).stepHunt(50);const x=c._rhSnapshot();return {...x,stateText:document.querySelector('[data-raptor-flight-state]')!.textContent,edge:Number((document.querySelector('[data-raptor-focus-edge]') as HTMLElement).style.opacity||0)};});

  test('a released nose keeps its descent and glides down to a skim instead of climbing back',async({page})=>{
    const trace=await glideDown(page);
    // The old 2.5/s return had the nose back to -4 degrees half a second after release.
    expect(trace[0].pitch).toBeLessThan(-0.6);
    expect(trace[1].pitch).toBeLessThan(-0.45);
    for(let i=1;i<trace.length;i++)expect(trace[i].pitch).toBeLessThanOrEqual(0.001);
    expect(trace.some((row:any)=>row.state==='stunned')).toBe(false);
    expect(trace[trace.length-1].agl).toBeLessThan(8);
    expect(trace[0].agl-trace[trace.length-1].agl).toBeGreaterThan(30);
  });

  test('raptor focus slows the final approach and a click on the animal catches it',async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await glideDown(page);
    const start=await canvas(page).evaluate((c:any)=>{(window as any).placeHuntPrey(22);return c._rhSnapshot();});
    let focused:any=null,clicked:any=null,caught:any=null,noseDown=false;
    for(let i=0;i<80&&!caught;i++){
      const s=await step(page);
      // Fly it as a player would: follow the steering cue, which asks for nose-down as the
      // prey slips below the flight line. The nose now stays where it is put.
      const wantNoseDown=s.targetCorrection==='pitchDown';
      if(wantNoseDown!==noseDown){noseDown=wantNoseDown;await canvas(page).evaluate((c:any,on:boolean)=>c._rhCommand('hold',{key:'s',pressed:on}),noseDown);}
      if(s.focusActive&&s.focusTimeScale<0.42&&!focused)focused={...s,motionBefore:s.motionTimeMs};
      if(focused&&!focused.next&&s.motionTimeMs>focused.motionBefore){focused.next=s.motionTimeMs-focused.motionBefore;}
      if(!clicked&&s.nearestPrey3dM<9&&s.targetProjectionState==='onscreen'){
        const box=(await canvas(page).boundingBox())!;
        await page.mouse.click(box.x+(s.targetNdcX+1)/2*box.width,box.y+(1-s.targetNdcY)/2*box.height);
        clicked=await canvas(page).evaluate((c:any)=>c._rhSnapshot());
      }
      if(s.missionCatches>start.missionCatches)caught=s;
    }
    // Focus: the flight clock ran at 0.4x (20 ms of flight per 50 ms), with the badge and edge.
    expect(focused).not.toBeNull();
    expect(focused.next).toBeLessThanOrEqual(21);
    expect(focused.stateText).toBe('Focus · slowed');
    expect(focused.edge).toBeGreaterThan(0.5);
    // The click threw the talons before the animal was in reach, and the catch followed.
    expect(clicked).not.toBeNull();
    expect(clicked.talonThrowActive||clicked.missionCatches>start.missionCatches).toBe(true);
    expect(caught).not.toBeNull();
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.huntStats.peregrine)).toMatchObject({catches:1,attempts:1});
    // With the catch the bird slows by its share of the combined mass and pulls out.
    expect(caught.catchPullOutMs).toBeGreaterThan(0);
    expect(caught.speedMps).toBeLessThan(start.speedMps*0.95);
    let after:any=caught,highestPitch=caught.pitchRadians;
    for(let i=0;i<30;i++){after=await step(page);highestPitch=Math.max(highestPitch,after.pitchRadians);}
    expect(highestPitch).toBeGreaterThan(0.1);
    expect(after.focusTimeScale).toBeGreaterThan(0.97);
    expect(after.focusActive).toBe(false);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a click on distant prey picks it without spending a strike',async({page})=>{
    const target=await canvas(page).evaluate((c:any)=>{const w=window as any;w.placeHuntPrey(70);w.stepHunt(50);return c._rhSnapshot();});
    expect(target.targetProjectionState).toBe('onscreen');
    const box=(await canvas(page).boundingBox())!;
    await page.mouse.click(box.x+(target.targetNdcX+1)/2*box.width,box.y+(1-target.targetNdcY)/2*box.height);
    const after=await canvas(page).evaluate((c:any)=>c._rhSnapshot());
    expect(after.talonThrowActive).toBe(false);
    expect(after.strikeReady).toBe(true);
    expect(after.strikeFeedbackKind).toBe('idle');
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.huntStats)).toBeUndefined();
    // A drag that starts on the animal steers, as before, and strikes nothing.
    const moved=await canvas(page).evaluate((c:any)=>c._rhSnapshot().headingRadians);
    const x=box.x+(target.targetNdcX+1)/2*box.width,y=box.y+(1-target.targetNdcY)/2*box.height;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+60,y,{steps:4});await page.mouse.up();
    const dragged=await canvas(page).evaluate((c:any)=>{(window as any).advanceHunt(200);return c._rhSnapshot();});
    expect(dragged.headingRadians).not.toBeCloseTo(moved,3);
    expect(dragged.talonThrowActive).toBe(false);
    expect(dragged.strikeFeedbackKind).toBe('idle');
  });

  test('raptor focus can be switched off in Settings and the approach runs in real time',async({page})=>{
    await page.getByLabel('Open flight view and sound settings',{exact:true}).click();
    const toggle=page.locator('[data-raptor-focus-toggle]');
    await expect(toggle).toHaveText('Raptor focus on');await expect(toggle).toHaveAttribute('aria-pressed','true');
    await toggle.click();
    await expect(toggle).toHaveText('Raptor focus off');await expect(toggle).toHaveAttribute('aria-pressed','false');
    expect(await page.evaluate(()=>(window as any).__toolData.raptorHunt.focusSlowmo)).toBe(false);
    await expect.poll(()=>canvas(page).evaluate((c:any)=>c._rhSnapshot().focusSlowmoEnabled)).toBe(false);
    await glideDown(page);
    await canvas(page).evaluate(()=>(window as any).placeHuntPrey(22));
    for(let i=0;i<40;i++){
      const s=await step(page);
      expect(s.focusActive).toBe(false);expect(s.focusTimeScale).toBe(1);
    }
  });
});
