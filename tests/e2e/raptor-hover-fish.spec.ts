import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// Wind Hover and Fish Dive are flown by a bot using the same held keys a student has, on the real wind and dive physics.
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
  // Held keys, as a keyboard would hold them.
  w.botHold=(c:any,key:string,on:boolean)=>{w.botKeys=w.botKeys||{};if(!!w.botKeys[key]!==on){w.botKeys[key]=on;c._rhCommand('hold',{key,pressed:on});}};
  w.botSteer=(c:any,error:number)=>{w.botHold(c,'a',error<-0.04);w.botHold(c,'d',error>0.04);};
  w.botPrey=()=>w.huntScene.children.filter((o:any)=>o.children.some((ch:any)=>String(ch.name).startsWith('prey-')));
  w.botBearing=(s:any,x:number,z:number)=>{const b=Math.atan2(x-s.raptorPosition.x,-(z-s.raptorPosition.z))-s.headingRadians;return Math.atan2(Math.sin(b),Math.cos(b));};
};
const nearestToAim=`(s)=>{let best=null,d=1e9;for(const f of window.botPrey()){const n=Math.hypot(f.position.x-s.plungeAim.x,f.position.z-s.plungeAim.z);if(n<d){d=n;best=f;}}return {fish:best,distance:d};}`;

test.describe('Raptor Wind Hover and Fish Dive',()=>{
  test.describe.configure({mode:'serial',timeout:300000});
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1100,height:900,appStyles:true,probes});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});

  test('hovering holds the bird over one spot only while it faces the wind',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('windHover','kestrel'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:7});
      for(let i=0;i<300;i++){const s=c._rhSnapshot();w.botSteer(c,s.hoverWindError);if(Math.abs(s.hoverWindError)<0.04)break;w.stepHunt(50);}
      w.botHold(c,'a',false);w.botHold(c,'d',false);
      w.botHold(c,' ',true);w.advanceHunt(1200);
      const a=c._rhSnapshot();let slowest=99,fastest=0;
      for(let i=0;i<60;i++){const s=c._rhSnapshot();w.botSteer(c,s.hoverWindError);w.stepHunt(50);const n=c._rhSnapshot();slowest=Math.min(slowest,n.groundSpeedMps);fastest=Math.max(fastest,n.groundSpeedMps);}
      w.botHold(c,'a',false);w.botHold(c,'d',false);
      const b=c._rhSnapshot();
      // Now turn side-on while still hovering: the same airspeed no longer cancels the wind.
      w.botHold(c,'d',true);w.advanceHunt(1000);w.botHold(c,'d',false);w.advanceHunt(600);const side=c._rhSnapshot();
      w.botHold(c,' ',false);w.skipGroundRender=false;w.stepHunt(25);
      return {moved:Math.hypot(b.raptorPosition.x-a.raptorPosition.x,b.raptorPosition.z-a.raptorPosition.z),dy:b.raptorPosition.y-a.raptorPosition.y,slowest,fastest,hover:b.hoverActive,speed:b.speedMps,still:b.hoverStillSeconds,staminaDrop:a.stamina-b.stamina,caloriesDrop:a.calories-b.calories,sideSpeed:side.groundSpeedMps};
    });
    expect(seen.hover).toBe(true);
    // Three seconds in a gusting 7 m/s wind: the bird is flying, yet barely moves over the ground.
    expect(seen.speed).toBeGreaterThan(3);expect(seen.fastest).toBeLessThan(3);expect(seen.moved).toBeLessThan(6);
    expect(Math.abs(seen.dy)).toBeLessThan(0.5);expect(seen.still).toBeGreaterThan(1);
    expect(seen.staminaDrop).toBeGreaterThan(10);expect(seen.caloriesDrop).toBeGreaterThan(0);
    expect(seen.sideSpeed).toBeGreaterThan(3);
    await expect(page.locator('.rh-hover-cue')).toHaveCount(1);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a vole appears only over an untouched runway, and three catches win',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('windHover','kestrel'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:7});
      const log:any[]=[];let firstVole:any=null;
      for(let i=0;i<3400;i++){
        const s=c._rhSnapshot();if(s.missionOutcome!=='active')break;
        const prey=w.botPrey(),p=s.raptorPosition;
        if(s.landed||s.crashed){w.botHold(c,'shift',false);w.botHold(c,' ',true);w.stepHunt(50);continue;}
        if(prey.length){
          if(!firstVole)firstVole={at:i,patches:s.volePatches.filter((x:any)=>x.spent).length,dist:Math.hypot(prey[0].position.x-p.x,prey[0].position.z-p.z)};
          const v=prey[0].position,across=Math.hypot(v.x-p.x,v.z-p.z),height=p.y-v.y;
          w.botHold(c,' ',false);w.botSteer(c,w.botBearing(s,v.x,v.z));
          w.botHold(c,'shift',across<height*1.05+6&&height>6);w.botHold(c,'e',height<12);
          if(Math.hypot(across,height)<7)c._rhCommand('strike');
        }else{
          w.botHold(c,'shift',false);
          const open=s.volePatches.filter((x:any)=>!x.spent).sort((a:any,b:any)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
          if(!open)break;
          const d=Math.hypot(open.x-p.x,open.z-p.z);
          const height=p.y-(s.terrainHeight??0);
          w.botHold(c,'e',s.altitudeAboveGround<30);
          if(d>26&&!s.hoverActive||d>40){w.botHold(c,' ',false);w.botSteer(c,w.botBearing(s,open.x,open.z));}
          else{w.botSteer(c,s.hoverWindError);w.botHold(c,' ',Math.abs(s.hoverWindError)<0.3&&s.stamina>12);}
        }
        w.stepHunt(50);
      }
      ['a','d','e','shift',' '].forEach(k=>w.botHold(c,k,false));
      const end=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {outcome:end.missionOutcome,catches:end.missionCatches,spent:end.volePatches.filter((x:any)=>x.spent).length,hoverSeconds:end.hoverTotalSeconds,firstVole,alt:end.altitudeAboveGround,cal:end.calories};
    });
    console.log('windHover bot',JSON.stringify(seen));
    expect(seen.firstVole.patches).toBe(0);
    expect(seen.catches).toBe(3);expect(seen.outcome).toBe('success');expect(seen.spent).toBe(2);expect(seen.hoverSeconds).toBeGreaterThan(5);
    await expect(page.getByText(/\d+ s hovering/).first()).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a missed plunge goes into the water, not through it, and the bird hauls itself out',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishDive','osprey'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:3});
      w.botPrey().forEach((f:any,i:number)=>f.position.set(600+i*10,-2,600));
      w.botHold(c,'shift',true);
      let plunged=null,lowest=99;
      for(let i=0;i<400;i++){w.stepHunt(50);const s=c._rhSnapshot();lowest=Math.min(lowest,s.raptorPosition.y);if(s.plunging&&!plunged){plunged={y:s.raptorPosition.y,dives:s.fishDives,catches:s.missionCatches,speed:s.speedMps};break;}}
      w.botHold(c,'shift',false);
      const during=c._rhSnapshot();w.advanceHunt(600);const held=c._rhSnapshot();w.advanceHunt(2800);const after=c._rhSnapshot();
      w.skipGroundRender=false;w.stepHunt(25);
      return {plunged,lowest,crashed:after.crashed,landed:after.landed,heldMoved:Math.hypot(held.raptorPosition.x-during.raptorPosition.x,held.raptorPosition.z-during.raptorPosition.z),afterY:after.raptorPosition.y,plungingAfter:after.plunging};
    });
    expect(seen.plunged.dives).toBe(1);expect(seen.plunged.catches).toBe(0);expect(seen.plunged.speed).toBe(0);
    expect(seen.lowest).toBeGreaterThan(-2.2);expect(seen.heldMoved).toBeLessThan(0.01);
    expect(seen.crashed).toBe(false);expect(seen.landed).toBe(false);expect(seen.plungingAfter).toBe(false);expect(seen.afterY).toBeGreaterThan(4);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a slow low entry cannot reach a deep fish that a fast high one can',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishDive','osprey'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:0});
      // One fish 0.95 m down, kept exactly under the dive's landing point, so only entry speed can decide the catch.
      const fish=w.botPrey();const keep=(s:any)=>fish.forEach((f:any,i:number)=>{if(i===0)f.position.set(s.plungeAim.x,-2.45,s.plungeAim.z);else f.position.set(600+i*10,-2,600);});
      const dive=()=>{w.botHold(c,'e',false);w.botHold(c,'q',false);w.botHold(c,'shift',true);let entry=0;for(let i=0;i<500;i++){const s=c._rhSnapshot();keep(s);entry=s.speedMps;w.stepHunt(50);if(c._rhSnapshot().plunging)break;}w.botHold(c,'shift',false);return entry;};
      const center=()=>{const s=c._rhSnapshot();w.botSteer(c,w.botBearing(s,0,0));};
      // Low and slow.
      w.botHold(c,'q',true);for(let i=0;i<400;i++){const s=c._rhSnapshot();center();keep(s);if(s.raptorPosition.y<5)break;w.stepHunt(50);}
      w.botHold(c,'a',false);w.botHold(c,'d',false);
      const slowEntry=dive();const slow=c._rhSnapshot();
      w.advanceHunt(3200);
      // High and fast, from over the middle of the lake.
      w.botHold(c,'e',true);for(let i=0;i<700;i++){const s=c._rhSnapshot();center();keep(s);if(s.raptorPosition.y>48&&Math.hypot(s.raptorPosition.x,s.raptorPosition.z)<45)break;w.stepHunt(50);}
      w.botHold(c,'a',false);w.botHold(c,'d',false);
      const fastEntry=dive();const fast=c._rhSnapshot();
      w.skipGroundRender=false;w.stepHunt(25);
      return {slowEntry,fastEntry,slowCatches:slow.missionCatches,slowDives:slow.fishDives,fastCatches:fast.missionCatches,fastDives:fast.fishDives};
    });
    console.log('depth rule',JSON.stringify(seen));
    expect(seen.slowDives).toBe(1);expect(seen.slowCatches).toBe(0);
    expect(seen.fastDives).toBe(2);expect(seen.fastCatches).toBe(1);expect(seen.fastEntry).toBeGreaterThan(seen.slowEntry);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('the white ring shows where an unsteered dive really comes down, wind included',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishDive','osprey'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const seen=await canvas.evaluate((c:any)=>{
      const w=window as any;w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:4});
      w.botPrey().forEach((f:any,i:number)=>f.position.set(600+i*10,-2,600));
      w.botHold(c,'e',true);w.advanceHunt(1500);w.botHold(c,'e',false);
      const before=c._rhSnapshot();w.botHold(c,'shift',true);
      for(let i=0;i<300;i++){w.stepHunt(50);if(c._rhSnapshot().plunging)break;}
      w.botHold(c,'shift',false);const after=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {miss:Math.hypot(after.raptorPosition.x-before.plungeAim.x,after.raptorPosition.z-before.plungeAim.z),plunged:after.plunging,startedAt:before.raptorPosition.y};
    });
    console.log('ring bot',JSON.stringify(seen));
    expect(seen.plunged).toBe(true);expect(seen.miss).toBeLessThan(3);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('three plunges on real fish win Fish Dive and the result counts the dives',async({page})=>{
    await page.setViewportSize({width:1200,height:900});await page.addInitScript(stepped);
    await harness.mount(page,session('fishDive','osprey'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    await expect(page.locator('[data-raptor-mission-progress]').first()).toContainText('/ 3 fish');
    const seen=await canvas.evaluate((c:any,pickSrc:string)=>{
      const w=window as any,pick=(0,eval)('('+pickSrc+')');w.skipGroundRender=true;w.advanceHunt(300);c._rhCommand('environment',{windSpeed:4});
      const trace:any[]=[];let peakCarry=false;
      for(let i=0;i<4400;i++){
        const s=c._rhSnapshot();if(s.missionOutcome!=='active')break;
        const p=s.raptorPosition;
        if(s.landed||s.crashed){w.botHold(c,'shift',false);w.botHold(c,' ',true);w.stepHunt(50);continue;}
        w.botHold(c,' ',false);
        if(s.plunging||s.carriedPreyLabel){peakCarry=peakCarry||!!s.carriedPreyLabel;w.botHold(c,'shift',false);w.botHold(c,'a',false);w.botHold(c,'d',false);w.botHold(c,'e',true);w.stepHunt(50);continue;}
        const t=pick(s);if(!t.fish){w.stepHunt(50);continue;}
        const fromCenter=Math.hypot(p.x,p.z),homing=fromCenter>85;
        const diving=!!w.botKeys&&w.botKeys.shift;
        if(diving||t.distance<3.4){w.botHold(c,'shift',true);w.botHold(c,'e',false);w.botSteer(c,w.botBearing(s,t.fish.position.x,t.fish.position.z));}
        else{
          const alt=p.y+1.5;w.botHold(c,'e',alt<30);
          if(homing)w.botSteer(c,w.botBearing(s,0,0));else w.botSteer(c,w.botBearing(s,t.fish.position.x,t.fish.position.z));
        }
        w.stepHunt(50);
      }
      ['a','d','e','shift',' '].forEach(k=>w.botHold(c,k,false));
      const end=c._rhSnapshot();w.skipGroundRender=false;w.stepHunt(25);
      return {outcome:end.missionOutcome,catches:end.missionCatches,dives:end.fishDives,peakCarry,time:0};
    },nearestToAim);
    console.log('fishDive bot',JSON.stringify(seen));
    expect(seen.peakCarry).toBe(true);expect(seen.catches).toBe(3);expect(seen.outcome).toBe('success');expect(seen.dives).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(/3 of \d+ dives/).first()).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
