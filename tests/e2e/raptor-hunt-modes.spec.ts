import {test,expect} from '@playwright/test';
import {GlHarness} from './helpers/stem_gl_harness';
test.use({video:'off'});
// The hunt is chosen before the flight, on a page that says what the behavior is and when it happens in the wild.
// Perch Hunt is a mode rather than a button inside the sim, and a catch stays visible in the talons.
const probes=`window.AlloPostFXEnabled=false;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Original({...options,preserveDrawingBuffer:true}),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.huntScene=scene;if(window.skipGroundRender)return;return render(scene,camera);};return renderer;};})();`;
const SIM="document.querySelector('[data-raptor-canvas]')?._rhSnapshot";
const SETUP="document.querySelector('[data-raptor-flight-setup]')";
const session=(mission:string,species:string,quality='low')=>({raptorHunt:{activeSection:'hunt',selectedSpecies:species,activeMission:mission,flightSession:{speciesId:species,missionId:mission},huntTutorialDismissed:true,graphicsQuality:quality}});
const stepped=()=>{
  let time=1000,id=1,seed=731;const frames=new Map<number,FrameRequestCallback>();
  Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};performance.now=()=>time;
  window.requestAnimationFrame=cb=>{const next=id++;frames.set(next,cb);return next;};window.cancelAnimationFrame=key=>{frames.delete(key);};
  (window as any).stepHunt=(ms:number)=>{time+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(cb=>cb(time));};
  (window as any).advanceHunt=(ms:number)=>{while(ms>0){const dt=Math.min(ms,50);(window as any).stepHunt(dt);ms-=dt;}};
};
test.describe('Raptor hunt modes',()=>{
  test.describe.configure({mode:'serial',timeout:240000});
  const harness=new GlHarness({toolFile:process.env.RAPTOR_SOURCE_E2E||'stem_lab/stem_tool_raptorhunt.js',toolId:'raptorHunt',width:1100,height:900,appStyles:true,probes,extraScripts:['node_modules/axe-core/axe.min.js']});
  test.beforeAll(async()=>{await harness.start();});test.afterAll(async()=>{await harness.stop();});test.afterEach(async({page})=>{await harness.destroy(page);});

  test('the setup page offers each hunt with an encyclopedia page, by mouse and keyboard',async({page})=>{
    await page.setViewportSize({width:1200,height:1400});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',huntTutorialDismissed:true,graphicsQuality:'low'}},SETUP,{expectCanvas:false});
    const cards=page.locator('[data-raptor-mode-card]'),guide=page.locator('[data-raptor-mode-guide]');
    const ids=await cards.evaluateAll(els=>els.map((el:any)=>el.getAttribute('data-raptor-mode-card')));
    expect(ids).toEqual(['open','perchHunt','flightTrail','feedChicks','windHover','fishDive','fishThief','crossDesert','silentStrike','thermalKettle','avoidPredator','highStoop']);
    expect(await page.locator('select[data-raptor-mission-select]').count()).toBe(0);
    for(const id of ids){
      await page.locator('[data-raptor-mode-card="'+id+'"] input').check();
      await expect(guide).toHaveAttribute('data-raptor-mode-guide',id);
      await expect(guide.locator('h5')).toHaveText(['What this represents','When it happens in the wild','What to notice','What the simulation simplifies']);
      for(const text of await guide.locator('p').allTextContents())expect(text.trim().length).toBeGreaterThan(40);
      await expect(guide.locator('.rh-mode-sources')).toContainText('Sources: ');
    }
    // The picker is one native radio group, so the arrow keys move through it.
    await page.locator('[data-raptor-mode-card="open"] input').check();await page.locator('[data-raptor-mode-card="open"] input').focus();
    await page.keyboard.press('ArrowRight');await expect(guide).toHaveAttribute('data-raptor-mode-guide','perchHunt');
    await expect(page.locator('[data-raptor-species-select]')).toHaveValue('redTail');
    await expect(guide).toContainText('Sit-and-wait');
    const axe=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-raptor-flight-setup]'),{runOnly:['wcag2a','wcag2aa','wcag21aa']});return r.violations.map((v:any)=>v.id+': '+v.nodes.slice(0,2).map((n:any)=>n.target.join(' ')).join(' | '));});
    expect(axe).toEqual([]);
    // Narrow phone: nothing runs off the side.
    await page.setViewportSize({width:360,height:900});await page.addStyleTag({content:'#wrap{width:340px}'});
    const over=await page.locator('[data-raptor-flight-setup]').evaluate((el:any)=>el.scrollWidth-el.clientWidth);expect(over).toBeLessThanOrEqual(1);
  });

  test('Perch Hunt starts on the lookout and offers a way back; Free Hunt has no lookout button',async({page})=>{
    await page.setViewportSize({width:1200,height:1400});
    await harness.mount(page,{raptorHunt:{activeSection:'hunt',selectedSpecies:'peregrine',activeMission:'open',huntTutorialDismissed:true,graphicsQuality:'low'}},SETUP,{expectCanvas:false});
    await page.locator('[data-raptor-mode-card="perchHunt"] input').check();await page.locator('[data-raptor-start-flight]').click();
    const canvas=page.locator('[data-raptor-canvas]');
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot?.().perched),{timeout:60000}).toBe(true);
    const back=page.locator('.rh-perch-toggle');await expect(back).toHaveText('At lookout');await expect(back).toBeDisabled();
    await expect(page.getByRole('button',{name:'Perched practice',exact:true})).toHaveCount(0);
    await canvas.evaluate((c:any)=>c._rhCommand('hold',{key:' ',pressed:true}));
    await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().perched),{timeout:15000}).toBe(false);
    await canvas.evaluate((c:any)=>c._rhCommand('hold',{key:' ',pressed:false}));
    await expect(back).toHaveText('Return to lookout');await expect(back).toBeEnabled();
    await expect(page.getByRole('group',{name:'Perch Hunt progress',exact:true})).toContainText('Perch Hunt');
    await back.click();await expect.poll(()=>canvas.evaluate((c:any)=>c._rhSnapshot().perched)).toBe(true);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
    await harness.destroy(page);
    await harness.mount(page,session('open','peregrine'),SIM);
    await expect(page.locator('.rh-perch-toggle')).toHaveCount(0);await expect(page.getByRole('button',{name:'Flight trail',exact:true})).toHaveCount(0);
  });

  test('Flight Trail starts its own course with no prey, grades up on 7 points, and has no toggle',async({page})=>{
    await page.setViewportSize({width:1200,height:1100});await page.addInitScript(stepped);
    await harness.mount(page,session('flightTrail','peregrine'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const fly=(aimOff:number)=>canvas.evaluate((c:any,off:number)=>{
      const w=window as any;w.skipGroundRender=true;
      for(let i=0;i<1400&&(c._rhSnapshot().practiceTrailActive||i<4);i++){
        const s=c._rhSnapshot(),g=s.practiceNextGate;
        if(g){const bearing=Math.atan2(g.x-s.raptorPosition.x,-(g.z-s.raptorPosition.z)),error=Math.atan2(Math.sin(bearing-s.headingRadians),Math.cos(bearing-s.headingRadians));
          for(const [key,pressed] of [['d',error>.035],['a',error<-.035],['e',g.y+off-s.raptorPosition.y>.7],['q',s.raptorPosition.y-g.y-off>.7]] as [string,boolean][])c._rhCommand('hold',{key,pressed});}
        w.stepHunt(40);
      }
      for(const key of ['d','a','e','q'])c._rhCommand('hold',{key,pressed:false});
      w.skipGroundRender=false;w.stepHunt(25);
      const s=c._rhSnapshot();return {complete:s.practiceTrailComplete,score:s.practiceTrailScore,passed:s.practiceTrailPassed,grade:s.practiceTrailGrade,prey:s.preyCount,attempts:s.practiceTrailAttempts};
    },aimOff);
    await canvas.evaluate((c:any)=>{c._rhCommand('environment',{windSpeed:0});(window as any).advanceHunt(60);});
    const start=await canvas.evaluate((c:any)=>{const s=c._rhSnapshot();return {active:s.practiceTrailActive,grade:s.practiceTrailGrade,prey:s.preyCount};});
    expect(start).toEqual({active:true,grade:0,prey:0});
    await expect(page.locator('.rh-practice-toggle')).toHaveCount(0);
    await expect(page.locator('.rh-practice-hud')).toBeVisible();
    const first=await fly(0);expect(first.complete).toBe(true);expect(first.passed).toBe(5);expect(first.score).toBeGreaterThanOrEqual(7);expect(first.prey).toBe(0);
    const retry=page.locator('.rh-practice-actions button').first();
    await expect(retry).toHaveText('Next trail: Juvenile');await expect(page.locator('.rh-practice-coach')).toContainText('You moved up');
    await expect(page.locator('.rh-practice-actions button:visible')).toHaveCount(1);
    await retry.evaluate((b:any)=>b.click());
    const second=await fly(0);expect(second.grade).toBe(1);expect(second.complete).toBe(true);expect(second.passed).toBe(5);
    await expect(retry).toHaveText('Next trail: Adult');
    await retry.evaluate((b:any)=>b.click());
    const third=await fly(0);expect(third.grade).toBe(2);expect(third.complete).toBe(true);expect(third.passed).toBe(5);
    await expect(retry).toHaveText('Fly trail again');await expect(page.locator('.rh-practice-coach')).toContainText('top grade');
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('Silent Strike shows hearing rings only while gliding, and Ride the Thermal has a kettle of hawks',async({page})=>{
    await page.setViewportSize({width:1200,height:1100});await page.addInitScript(stepped);
    await harness.mount(page,session('silentStrike','greatHorned'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const rings=await canvas.evaluate((c:any)=>{const w=window as any;c._rhCommand('environment',{windSpeed:0});
      const move=()=>{const s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians;w.huntScene.children.filter((o:any)=>o.children.some((ch:any)=>ch.name.startsWith('prey-')))[0].position.set(p.x+Math.sin(y)*120,p.y-20,p.z-Math.cos(y)*120);};
      move();w.advanceHunt(100);const gliding=c._rhSnapshot().hearingRingsVisible;
      c._rhCommand('hold',{key:' ',pressed:true});w.advanceHunt(100);const flapping=c._rhSnapshot().hearingRingsVisible;c._rhCommand('hold',{key:' ',pressed:false});
      return {gliding,flapping};});
    expect(rings).toEqual({gliding:true,flapping:false});
    await harness.destroy(page);
    await harness.mount(page,session('thermalKettle','redTail'),SIM);
    const kettle=await page.locator('[data-raptor-canvas]').evaluate((c:any)=>{const w=window as any;w.advanceHunt(100);const g=w.huntScene.getObjectByName('mission-kettle-hawks'),s=c._rhSnapshot(),d=s.thermalDistance;return {count:s.kettleBirdCount,children:g.children.length,y:g.children[0].position.y,d};});
    expect(kettle.count).toBe(7);expect(kettle.children).toBe(7);expect(kettle.y).toBeGreaterThan(50);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('the Perch Hunt energy claim matches what the sim burns',async({page})=>{
    await page.setViewportSize({width:1200,height:1100});await page.addInitScript(stepped);
    await harness.mount(page,session('perchHunt','redTail'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const rate=await canvas.evaluate((c:any)=>{const w=window as any;w.skipGroundRender=true;c._rhCommand('environment',{windSpeed:0});w.advanceHunt(300);
      const a=c._rhSnapshot();w.advanceHunt(20000);const b=c._rhSnapshot();const rest=(a.calories-b.calories)/20,perched=b.perched;
      c._rhCommand('hold',{key:' ',pressed:true});w.advanceHunt(1500);c._rhCommand('hold',{key:' ',pressed:false});c._rhCommand('hold',{key:'e',pressed:true});w.advanceHunt(5000);
      // Whole flap cycles (6 s + body mass), so the bursts are counted fairly.
      const cycle=6+1.1;const d=c._rhSnapshot();w.advanceHunt(cycle*4000);const e=c._rhSnapshot();c._rhCommand('hold',{key:'e',pressed:false});w.skipGroundRender=false;w.stepHunt(25);
      return {rest,cruise:(d.calories-e.calories)/(cycle*4),perched,flying:!e.landed};});
    expect(rate.perched).toBe(true);expect(rate.flying).toBe(true);
    const ratio=rate.cruise/rate.rest;expect(ratio).toBeGreaterThan(4);expect(ratio).toBeLessThan(6.5);
    await expect(page.locator('.rh-perch-saving')).toHaveCount(1);
  });

  const strikeNearest=()=>{const w=window as any,c=document.querySelector('[data-raptor-canvas]') as any,s=c._rhSnapshot(),p=s.raptorPosition,y=s.headingRadians;
    w.huntScene.children.filter((o:any)=>o.children.some((ch:any)=>ch.name.startsWith('prey-'))).forEach((o:any,i:number)=>{if(i===0)o.position.set(p.x+Math.sin(y)*3,p.y,p.z-Math.cos(y)*3);else o.position.set(2000+i*20,2000,2000);});
    c._rhCommand('strike');w.stepHunt(1);};

  test('a Free Hunt catch stays in the talons for seconds, with the camera low enough to see it',async({page})=>{
    await page.setViewportSize({width:1200,height:1100});await page.addInitScript(stepped);
    await harness.mount(page,session('open','peregrine'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c:any)=>c._rhCommand('environment',{windSpeed:0}));
    const seen=await canvas.evaluate((c:any,strike:string)=>{
      const w=window as any;w.advanceHunt(1200);const before=c._rhSnapshot();(0,eval)('('+strike+')')();
      const at=(ms:number)=>{w.advanceHunt(ms);const s=c._rhSnapshot();const root=w.huntScene.getObjectByName('raptor-feet').getObjectByName('raptor-carried-prey');return {label:s.carriedPreyLabel,calories:s.missionCaloriesCounted,cameraAbove:s.cameraPosition[1]-s.raptorPosition.y,visible:!!root,opacity:root?(()=>{let m=1;root.traverse((o:any)=>{if(o.material&&!Array.isArray(o.material))m=Math.min(m,o.material.opacity);});return m;})():0};};
      const early=at(1000),mid=at(2400),later=at(500),gone=at(500);
      return {before:before.cameraPosition[1]-before.raptorPosition.y,early,mid,later,gone};
    },strikeNearest.toString());
    expect(seen.early.label).toBeTruthy();expect(seen.early.calories).toBeGreaterThan(0);expect(seen.early.opacity).toBeGreaterThan(0.5);
    // Under the tail during the close-up, level with it after, and well above it in normal flight.
    expect(seen.before).toBeGreaterThan(0.5);expect(seen.early.cameraAbove).toBeLessThan(seen.before);expect(seen.mid.visible).toBe(true);expect(seen.mid.opacity).toBe(seen.early.opacity);
    expect(seen.gone.label).toBeNull();expect(seen.gone.visible).toBe(false);
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });

  test('a crash on the way home loses the catch and counts nothing',async({page})=>{
    await page.setViewportSize({width:1200,height:1100});await page.addInitScript(stepped);
    await harness.mount(page,session('feedChicks','redTail'),SIM);
    const canvas=page.locator('[data-raptor-canvas]');
    const result=await canvas.evaluate((c:any,strike:string)=>{
      const w=window as any;w.skipGroundRender=true;c._rhCommand('environment',{windSpeed:0});w.advanceHunt(300);(0,eval)('('+strike+')')();
      const caught=c._rhSnapshot();
      // Climb first: a hard crash needs real speed, and a low dive only lands the bird.
      c._rhCommand('hold',{key:'e',pressed:true});for(let i=0;i<2400&&c._rhSnapshot().altitudeAboveGround<160;i++)w.stepHunt(25);c._rhCommand('hold',{key:'e',pressed:false});
      c._rhCommand('hold',{key:'shift',pressed:true});c._rhCommand('hold',{key:'s',pressed:true});
      let crashed=false;for(let i=0;i<1600&&!crashed;i++){w.stepHunt(25);crashed=c._rhSnapshot().crashed;}
      c._rhCommand('hold',{key:'shift',pressed:false});c._rhCommand('hold',{key:'s',pressed:false});w.skipGroundRender=false;w.stepHunt(25);
      const after=c._rhSnapshot();return {carrying:caught.carryingToNest,crashed,after:{carrying:after.carryingToNest,kcal:after.missionCaloriesCounted,deliveries:after.nestDeliveries,label:after.carriedPreyLabel}};
    },strikeNearest.toString());
    expect(result.carrying).toBe(true);expect(result.crashed).toBe(true);
    expect(result.after).toEqual({carrying:false,kcal:0,deliveries:0,label:null});
    expect(await page.evaluate(()=>(window as any).__events.errors)).toEqual([]);
  });
});
