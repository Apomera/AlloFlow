import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// Lakes have a surface in every hunt. Birds used to fly through it to fish 2 to 4.5 m down.
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
  w.botPrey=()=>w.huntScene.children.filter((o:any)=>o.children.some((ch:any)=>String(ch.name).startsWith('prey-')));
  w.clearFish=()=>w.botPrey().forEach((f:any,i:number)=>f.position.set(600+i*10,-2,600));
};

test.describe('Raptor lake water surface',()=>{
  test.describe.configure({mode:'serial',timeout:240000});
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1100,height:900,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});

  test('Free Hunt fish swim in the top metre, where an eagle can reach them',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('open','baldEagle'),SIM);
    const depths=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;w.skipGroundRender=true;w.advanceHunt(400);const d=w.botPrey().filter((f:any)=>f.children.some((ch:any)=>String(ch.name).startsWith('prey-fish'))).map((f:any)=>-1.5-f.position.y);w.skipGroundRender=false;w.stepHunt(25);return d;});
    expect(depths.length).toBeGreaterThan(0);
    for(const d of depths){expect(d).toBeGreaterThan(0.2);expect(d).toBeLessThan(1.1);}
  });

  test('a steep Bald Eagle dive splashes and hauls out instead of flying through the lake',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('open','baldEagle'),SIM);
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});w.clearFish();
      // Face the middle of the lake first, so the dive comes down over deep water.
      for(let i=0;i<200;i++){const s=c._rhSnapshot(),b0=Math.atan2(-s.raptorPosition.x,s.raptorPosition.z)-s.headingRadians,b=Math.atan2(Math.sin(b0),Math.cos(b0));if(Math.abs(b)<0.05)break;w.botHold(c,b<0?'a':'d',true);w.stepHunt(50);w.botHold(c,'a',false);w.botHold(c,'d',false);}
      w.botHold(c,'shift',true);let lowest=99,splash=null;
      for(let i=0;i<400;i++){w.stepHunt(50);w.clearFish();const s=c._rhSnapshot();lowest=Math.min(lowest,s.raptorPosition.y);if(s.plunging){splash={speed:s.speedMps,y:s.raptorPosition.y};break;}}
      w.botHold(c,'shift',false);
      for(let i=0;i<90;i++){w.stepHunt(50);w.clearFish();const s=c._rhSnapshot();lowest=Math.min(lowest,s.raptorPosition.y);}
      const after=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {splash,lowest,after:{y:after.raptorPosition.y,crashed:after.crashed,landed:after.landed,plunging:after.plunging,catches:after.missionCatches}};
    });
    expect(seen.splash).not.toBeNull();expect(seen.splash.speed).toBe(0);
    expect(seen.lowest).toBeGreaterThan(-1.4);
    expect(seen.after.crashed).toBe(false);expect(seen.after.landed).toBe(false);expect(seen.after.plunging).toBe(false);expect(seen.after.y).toBeGreaterThan(1);expect(seen.after.catches).toBe(0);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a shallow pass skims the surface, loses speed, and can snatch a fish with Strike',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('open','baldEagle'),SIM);
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});w.clearFish();
      // Trim straight down to the water while flying level, so contact is a shallow pass.
      for(let i=0;i<200;i++){const s=c._rhSnapshot(),b0=Math.atan2(-s.raptorPosition.x,s.raptorPosition.z)-s.headingRadians,b=Math.atan2(Math.sin(b0),Math.cos(b0));if(Math.abs(b)<0.05)break;w.botHold(c,b<0?'a':'d',true);w.stepHunt(50);w.botHold(c,'a',false);w.botHold(c,'d',false);}
      w.botHold(c,'q',true);let skim=null;
      for(let i=0;i<500;i++){w.stepHunt(50);w.clearFish();const s=c._rhSnapshot();if(s.raptorPosition.y<0.2){skim=s;break;}}
      w.advanceHunt(600);w.clearFish();const a=c._rhSnapshot();w.advanceHunt(1000);w.clearFish();const b=c._rhSnapshot();
      w.botHold(c,'q',false);
      // A fish half a metre down, three metres ahead.
      const fish=w.botPrey()[0],p=b.raptorPosition,y=b.headingRadians;fish.position.set(p.x+Math.sin(y)*3,-2,p.z-Math.cos(y)*3);
      c._rhCommand('strike');for(let i=0;i<12;i++){fish.position.set(fish.position.x,-2,fish.position.z);w.stepHunt(50);}
      const caught=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {reached:!!skim,ya:a.raptorPosition.y,yb:b.raptorPosition.y,speedA:a.speedMps,speedB:b.speedMps,plunging:a.plunging||b.plunging,crashed:b.crashed,landed:b.landed,catches:caught.missionCatches};
    });
    expect(seen.reached).toBe(true);expect(seen.plunging).toBe(false);expect(seen.crashed).toBe(false);expect(seen.landed).toBe(false);
    expect(seen.ya).toBeGreaterThan(-0.7);expect(seen.yb).toBeGreaterThan(-0.7);expect(seen.yb).toBeLessThan(0.2);
    expect(seen.speedB).toBeLessThan(seen.speedA);
    expect(seen.catches).toBe(1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a Free Hunt Osprey plunges feet first and takes a fish it lands on',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('open','osprey'),SIM);
    const seen=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});
      const fish=w.botPrey();
      // Keep one fish 0.5 m down directly under the bird's path, so the plunge lands on it.
      const keep=()=>{const s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians,ahead=Math.max(0,(p.y+1.5)*0.6);fish.forEach((f:any,i:number)=>{if(i===0)f.position.set(p.x+Math.sin(y)*ahead,-2,p.z-Math.cos(y)*ahead);else f.position.set(600+i*10,-2,600);});};
      for(let i=0;i<200;i++){const s=c._rhSnapshot(),b0=Math.atan2(-s.raptorPosition.x,s.raptorPosition.z)-s.headingRadians,b=Math.atan2(Math.sin(b0),Math.cos(b0));if(Math.abs(b)<0.05)break;w.botHold(c,b<0?'a':'d',true);w.stepHunt(50);w.botHold(c,'a',false);w.botHold(c,'d',false);}
      w.botHold(c,'shift',true);let plunged=null;
      for(let i=0;i<400;i++){keep();w.stepHunt(50);const s=c._rhSnapshot();if(s.plunging){plunged=s;break;}}
      w.botHold(c,'shift',false);const end=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {plunged:!!plunged,catches:end.missionCatches,dives:end.fishDives,crashed:end.crashed};
    });
    expect(seen.plunged).toBe(true);expect(seen.dives).toBe(1);expect(seen.catches).toBe(1);expect(seen.crashed).toBe(false);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
