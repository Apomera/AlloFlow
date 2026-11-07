import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// Fish Thief: a Bald Eagle presses an Osprey until it drops its fish, then catches it with the ordinary Strike.
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.huntScene=scene;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
const SIM="document.querySelector('[data-raptor-canvas]')?._rhSnapshot";
const session=(mission:string,species:string)=>({raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:mission,flightSession:{speciesId:species,missionId:mission},huntTutorialDismissed:true,graphicsQuality:'low'}});
const stepped=()=>{
  let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
  Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
  window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
  (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
  (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
  const w=window as any;
  w.botHold=(c:any,key:string,on:boolean)=>{w.botKeys=w.botKeys||{};if(!!w.botKeys[key]!==on){w.botKeys[key]=on;c._rhCommand('hold',{key,pressed:on});}};
  w.botSteer=(c:any,error:number)=>{w.botHold(c,'a',error<-0.04);w.botHold(c,'d',error>0.04);};
  w.botBearing=(s:any,x:number,z:number)=>{const b=Math.atan2(x-s.raptorPosition.x,-(z-s.raptorPosition.z))-s.headingRadians;return Math.atan2(Math.sin(b),Math.cos(b));};
};

test.describe('Raptor Fish Thief',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1100,height:900,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});

  test('pressure from close behind makes the Osprey drop a fish that falls, floats, sinks, and is replaced',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishThief','baldEagle'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});
      const osprey=w.huntScene.getObjectByName('mission-osprey-with-fish');
      const start=c._rhSnapshot();let dropAt=-1;
      // Keep the Osprey just ahead of the eagle and a little below, as a close chase would.
      for(let i=0;i<120;i++){const s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians;osprey.position.set(p.x+Math.sin(y)*9,p.y-2,p.z-Math.cos(y)*9);w.stepHunt(50);if(c._rhSnapshot().thief.fishState==='falling'){dropAt=i;break;}}
      const dropped=c._rhSnapshot();
      // Pressure from below does not count.
      let floated=null;for(let i=0;i<200;i++){w.stepHunt(50);const s=c._rhSnapshot();if(s.thief.fishState==='floating'){floated=s.thief.fish;break;}}
      // Once it sinks the state is 'none', or already 'carried' if the Osprey has caught its next fish.
      let sank=false;for(let i=0;i<140;i++){w.stepHunt(50);const st=c._rhSnapshot().thief.fishState;if(st!=='floating'&&st!=='falling'){sank=true;break;}}
      let caughtAgain=false;for(let i=0;i<600;i++){w.stepHunt(50);const s=c._rhSnapshot();if(s.thief.phase==='carry'&&s.thief.fishState==='carried'){caughtAgain=true;break;}}
      const end=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {startState:start.thief.fishState,dropSeconds:dropAt*0.05,drops:dropped.thief.drops,falling:dropped.thief.fishState,floatedY:floated&&floated.y,sank,caughtAgain,catches:end.missionCatches};
    });
    expect(seen.startState).toBe('carried');expect(seen.falling).toBe('falling');expect(seen.drops).toBe(1);
    expect(seen.dropSeconds).toBeGreaterThan(2.5);expect(seen.dropSeconds).toBeLessThan(4.5);
    expect(seen.floatedY).toBeCloseTo(-1.5,1);expect(seen.sank).toBe(true);expect(seen.caughtAgain).toBe(true);expect(seen.catches).toBe(0);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('pressing from below builds no pressure',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishThief','baldEagle'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});
      const osprey=w.huntScene.getObjectByName('mission-osprey-with-fish');
      for(let i=0;i<120;i++){const s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians;osprey.position.set(p.x+Math.sin(y)*6,p.y+8,p.z-Math.cos(y)*6);w.stepHunt(50);}
      const s=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);return {pressure:s.thief.pressure,state:s.thief.fishState};
    });
    expect(seen.pressure).toBe(0);expect(seen.state).toBe('carried');
  });

  test('a bot chases, forces a drop, and steals two fish to win',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishThief','baldEagle'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    await expect(page.locator('[data-raptor-mission-progress]').first()).toContainText('/ 2 fish stolen');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:2});
      let drops=0,lastState='carried',splashes=0,strikes=0;
      for(let i=0;i<4800;i++){
        const s=c._rhSnapshot();if(s.missionOutcome!=='active')break;
        const p=s.raptorPosition,t=s.thief;
        if(s.landed||s.crashed){w.botHold(c,'shift',false);w.botHold(c,' ',true);w.stepHunt(50);continue;}
        w.botHold(c,' ',false);
        if(t.fishState!==lastState){if(t.fishState==='falling')drops++;lastState=t.fishState;}
        if(s.plunging)splashes++;
        if(s.carriedPreyLabel){w.botHold(c,'shift',false);w.botHold(c,'q',false);w.botHold(c,'e',true);w.stepHunt(50);continue;}
        if(t.fish&&(t.fishState==='falling'||t.fishState==='floating')){
          const f=t.fish,across=Math.hypot(f.x-p.x,f.z-p.z),dy=p.y-f.y;
          w.botSteer(c,w.botBearing(s,f.x,f.z));
          w.botHold(c,'shift',dy>3&&across<dy*1.6+8);w.botHold(c,'e',dy<1.5&&t.fishState==='floating');w.botHold(c,'q',false);
          if(Math.hypot(across,dy)<8){c._rhCommand('strike');strikes++;}
        }else{
          // Lead the Osprey a little and hold a few metres above it.
          const lead=Math.min(12,t.distance*0.3),lx=t.x+Math.sin(t.heading)*lead,lz=t.z-Math.cos(t.heading)*lead;
          w.botSteer(c,w.botBearing(s,lx,lz));
          const above=p.y-t.y;w.botHold(c,'e',above<3);w.botHold(c,'q',above>9);
          w.botHold(c,'shift',t.distance>24&&above>6);
        }
        w.stepHunt(50);
      }
      ['a','d','e','q','shift',' '].forEach(k=>w.botHold(c,k,false));
      const end=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {outcome:end.missionOutcome,catches:end.missionCatches,drops,splashes,strikes};
    });
    console.log('thief bot',JSON.stringify(seen));
    expect(seen.drops).toBeGreaterThanOrEqual(2);expect(seen.catches).toBe(2);expect(seen.outcome).toBe('success');
    await expect(page.getByText(/2 stolen · \d+ drops?/).first()).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
