import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_beehive.js',toolId:'beehive',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,width:1280,height:1000,probes:'window.__testHooks={};',extraScripts:['node_modules/axe-core/axe.min.js']});
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(async()=>{mkdirSync('scratch/beehive-flight-deck',{recursive:true});await harness.start();});
test.beforeEach(async({page})=>{page.on('pageerror',e=>console.log('FLIGHT_PAGE_ERROR',e.message));});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:any, fallback=false, pacing='live') {
  await page.addInitScript(()=>{(window as any).__RR_TEST_EXPORTS__={};});
  await page.goto(harness.url+'/__harness');
  await page.evaluate(({fallback,pacing})=>{
    const w=window as any;
    if(fallback)w.StemLab.ensureThree=()=>Promise.reject(new Error('Test fallback'));
    const after=w.THREE.Scene.prototype.onAfterRender;
    w.THREE.Scene.prototype.onAfterRender=function(renderer:any,scene:any,camera:any){if(renderer.domElement.hasAttribute('data-beehive-drone-webgl')){w.__flightCamera=camera;w.__flightWorld=scene;}return after.call(this,renderer,scene,camera);};
    w.__mount({beehive:{viewMode:'drone',tutorialDone:true,soundOn:false,honey:80,queenHealth:100,morale:90,varroaLevel:2,drone:{active:false,pacing,courseSeed:20260908,graphicsMode:'eco'}}});
    Object.assign(document.getElementById('wrap')!.style,{width:'100%',height:'auto',display:'block'});
  },{fallback,pacing});
  await page.locator('[data-mobile-rail="drone-difficulty"] button').first().click();
  const cv=page.locator('[data-beehive-drone-canvas]');await cv.scrollIntoViewIfNeeded();
  if(pacing==='live' && await page.locator('#beehive-drone-playfield').getAttribute('data-flight-state')!=='paused') await page.locator('[data-beehive-flight-pause]').click();
  await expect(page.locator('#beehive-drone-playfield')).toHaveAttribute('data-flight-state','paused');
  await expect(cv).toHaveAttribute('data-flight-renderer',fallback?'canvas-2d-fallback':'three-webgl');
  if(!fallback)await expect(cv).toHaveAttribute('data-flight-frame-health','verified',{timeout:45000});
}
async function physics(page:any){return page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return {x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,roll:s.roll,vx:s.vx,vy:s.vy,vz:s.vz,energy:s.energy,timer:s.timer,phase:s.phase,score:s.score,decisions:s.decisionCount||0};});}
async function audit(page:any,selector:string){const issues=await page.evaluate(async(selector:string)=>{const r=await(window as any).axe.run(document.querySelector(selector),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.failureSummary)}));},selector);expect(issues).toEqual([]);}

test('Drone deck shows a clear 3D flight view and updates camera and size while paused',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  const field=page.locator('#beehive-drone-playfield'),controls=page.locator('[data-beehive-touch-controls]'),world=page.locator('[data-beehive-drone-webgl]');
  await expect(field).toHaveAttribute('data-flight-hud','clear');await expect(field.locator('[data-flight-director]')).toBeVisible();
  expect(await controls.evaluate(el=>el.previousElementSibling?.id)).toBe('beehive-drone-playfield');
  await world.evaluate((c:any)=>{c.__sameFlightWorld=true;});
  await page.evaluate(()=>{
    const w=window as any,s=w.__testHooks.beehive.droneStateRef.current;Object.assign(s,{phase:'flight',x:75,y:85,z:-280,yaw:.08});
    const c=(document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement).getContext('2d')!,fill=c.fillText.bind(c);
    w.__targetLabels=[];c.fillText=function(t:string,x:number,y:number,...rest:any[]){if(t==='DCA VOLUME')w.__targetLabels.push({x,y});return (fill as any)(t,x,y,...rest);};
  });
  const frozen=await physics(page);
  await controls.locator('[data-flight-camera-toggle]').click();
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-camera','chase');
  await expect.poll(()=>page.evaluate(()=>(window as any).__targetLabels.length)).toBeGreaterThan(0);
  const alignment=await page.evaluate(()=>{const w=window as any,canvas=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement,p=new w.THREE.Vector3(0,115,-600).project(w.__flightCamera);return {actual:w.__targetLabels.at(-1).x,expected:(p.x+1)*canvas.clientWidth/2};});
  expect(Math.abs(alignment.actual-alignment.expected)).toBeLessThan(2);
  await expect(field.locator('[data-director-value="direction"]')).toContainText('Turn left');
  await audit(page,'[data-flight-training]');
  await field.screenshot({path:'scratch/beehive-flight-deck/clear-chase.png'});
  const clear=await world.screenshot();
  await controls.locator('[data-flight-comfort-details] > summary').click();
  await controls.locator('[data-flight-hud-toggle]').click();
  await expect(field).toHaveAttribute('data-flight-hud','detailed');await expect(field.locator('[data-flight-director]')).toBeHidden();
  await field.screenshot({path:'scratch/beehive-flight-deck/detailed-hud.png'});
  await controls.locator('[data-flight-hud-toggle]').click();
  await controls.locator('[data-flight-camera-toggle]').click();
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-camera','cockpit');
  const cockpit=await world.screenshot();expect(Buffer.compare(clear,cockpit)).not.toBe(0);
  expect(await physics(page)).toEqual(frozen);await expect(world).toHaveJSProperty('__sameFlightWorld',true);
  await page.setViewportSize({width:700,height:900});await field.scrollIntoViewIfNeeded();
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;return Math.abs(w.__flightCamera.aspect-c.clientWidth/c.clientHeight);})).toBeLessThan(.002);
  await expect.poll(()=>page.locator('[data-beehive-drone-canvas]').evaluate((c:HTMLCanvasElement)=>c.width===c.clientWidth*2&&c.height===c.clientHeight*2)).toBe(true);
  expect(await physics(page)).toEqual(frozen);await expect(world).toHaveJSProperty('__sameFlightWorld',true);
  await audit(page,'[data-flight-director]');await audit(page,'[data-beehive-touch-controls]');expect(errors).toEqual([]);
});

test('Drone deck supports narrow-screen fallback flight, held controls, and pausing when hidden',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  const field=page.locator('#beehive-drone-playfield'),controls=page.locator('[data-beehive-touch-controls]');
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-director]');await audit(page,'[data-beehive-touch-controls]');
  }
  await field.screenshot({path:'scratch/beehive-flight-deck/mobile-clear-view.png'});
  await controls.screenshot({path:'scratch/beehive-flight-deck/mobile-controls.png'});
  await page.locator('[data-beehive-flight-pause]').click();
  const thrust=controls.locator('[data-flight-control="ArrowUp"]');await thrust.scrollIntoViewIfNeeded();const box=(await thrust.boundingBox())!;
  const before=await physics(page);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  const moved=await physics(page);expect(Math.hypot(moved.x-before.x,moved.z-before.z)).toBeGreaterThan(.1);
  await expect(thrust).toHaveAttribute('data-control-active','false');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(field).toHaveAttribute('data-flight-state','paused');const held=await physics(page);await page.waitForTimeout(250);expect(await physics(page)).toEqual(held);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(field).toHaveAttribute('data-flight-state','paused');await page.emulateMedia({forcedColors:'active'});await expect(controls).toBeVisible();
});

test('Drone deck preserves deliberate maneuver evidence and refreshes its paused chase camera',async({page})=>{
  await mount(page,false,'steps');const panel=page.locator('[data-flight-decision-panel]');
  await panel.locator('input[value="climb"]').check();await panel.locator('[data-flight-advance-decision]').click();
  const held=await physics(page);expect(held.decisions).toBe(1);
  const canvas=page.locator('[data-beehive-drone-canvas]');
  await expect(canvas).toHaveAttribute('data-flight-camera','chase');
  await panel.getByRole('button',{name:'Chase camera',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-flight-camera','cockpit');expect(await physics(page)).toEqual(held);
  await panel.getByRole('button',{name:'Chase camera',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-flight-camera','chase');expect(await physics(page)).toEqual(held);
  await panel.getByRole('button',{name:'Record flight and debrief',exact:true}).click();
  await expect(page.getByRole('region',{name:'Saved flight decision evidence'})).toBeFocused();
  expect(await page.evaluate(()=>(window as any).__toolData.beehive.drone.lastRun.decisionLog)).toHaveLength(1);
});

test('Route inspection matches the 3D entry volume and records DCA only when flight advances',async({page})=>{
  await mount(page);const route=page.locator('[data-flight-route-panel]'),field=page.locator('#beehive-drone-playfield');
  await route.locator('summary').click();await expect(route).toHaveJSProperty('open',true);
  const volume=await page.evaluate(()=>{const w=window as any,v=w.__flightWorld.getObjectByName('drone-dca-entry-volume'),p=new w.THREE.Vector3();v.getWorldPosition(p);return {radius:v.geometry.parameters.radiusTop,height:v.geometry.parameters.height,y:p.y,z:p.z};});
  expect(volume).toEqual({radius:72,height:30,y:115,z:-600});
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{phase:'flight',reachedLaunch:true,x:0,y:90,z:-590,yaw:0,pitch:0,vx:0,vy:0,vz:0,speed:0,wind:{x:0,z:0,phase:0},windNow:{x:0,z:0},obstacles:[],birds:[],drones:[],flowers:[],thermals:[]});});
  await page.locator('[data-flight-camera-toggle]').click();
  await expect(route.locator('[data-route-condition="range"]')).toHaveAttribute('data-met','true');
  await expect(route.locator('[data-route-condition="altitude"]')).toHaveAttribute('data-met','false');
  await expect(route.locator('[data-route-advice]')).toContainText('Climb');
  await expect(route.locator('[data-route-checkpoint="dca"]')).toHaveAttribute('data-complete','false');
  const before=await physics(page);await page.waitForTimeout(250);expect(await physics(page)).toEqual(before);
  await audit(page,'[data-flight-route-panel]');await route.screenshot({path:'scratch/beehive-flight-deck/route-inspector.png'});
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:0,y:115,z:-350,pitch:0});});
  await page.locator('[data-flight-camera-toggle]').click();
  await field.screenshot({path:'scratch/beehive-flight-deck/dca-entry-band.png'});
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:0,y:115,z:-600});});
  await page.locator('[data-flight-camera-toggle]').click();
  await expect(route.locator('[data-route-condition="altitude"]')).toHaveAttribute('data-met','true');
  await expect(route.locator('[data-route-checkpoint="dca"]')).toHaveAttribute('data-complete','false');
  await page.locator('[data-beehive-flight-pause]').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.reachedDca)).toBe(true);
  await page.locator('[data-beehive-flight-pause]').click();await expect(field).toHaveAttribute('data-flight-state','paused');
  await expect(route.locator('[data-route-checkpoint="dca"]')).toHaveAttribute('data-complete','true');
  await expect(route.locator('[data-route-queen]')).toBeVisible();await expect(route.locator('[data-route-entry]')).toBeHidden();
  await expect(route.locator('[data-route-title]')).toHaveText('Queen cue unlocked');
});

test('Route inspection pauses from the keyboard and fits narrow screens in both themes',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  const field=page.locator('#beehive-drone-playfield'),route=page.locator('[data-flight-route-panel]');
  await page.locator('[data-beehive-flight-pause]').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.telemetry.length)).toBeGreaterThan(0);
  await route.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(route).toHaveJSProperty('open',true);await expect(field).toHaveAttribute('data-flight-state','paused');
  const held=await physics(page);await page.waitForTimeout(200);expect(await physics(page)).toEqual(held);
  expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.telemetry.every((t:any)=>Number.isFinite(t.x)&&Number.isFinite(t.z)))).toBe(true);
  expect((await route.locator('[data-route-trail]').getAttribute('points'))!.split(' ').length).toBeGreaterThan(1);
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-route-panel]');await route.screenshot({path:'scratch/beehive-flight-deck/route-mobile-'+(dark?'dark':'light')+'.png'});
  }
  await route.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(route).toHaveJSProperty('open',false);expect(await physics(page)).toEqual(held);
  await expect(field).toHaveAttribute('data-flight-state','paused');
});

test('Meadow art stays visible in Eco and scales detail without changing the paused flight',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),controls=page.locator('[data-beehive-touch-controls]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{phase:'flight',reachedLaunch:true,x:40,y:35,z:-180,yaw:.08,pitch:-.06});});
  await controls.locator('[data-flight-camera-toggle]').click();
  const held=await physics(page),random=await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.randomState);
  const plants=()=>page.evaluate(()=>{const scene=(window as any).__flightWorld;return {flowers:scene.getObjectByName('drone-meadow-blossoms')?.count,blades:scene.getObjectByName('drone-meadow-blades')?.count,canopies:scene.getObjectByName('drone-tree-canopies')?.count};});
  expect(await plants()).toMatchObject({flowers:550,blades:550});expect((await plants()).canopies).toBeGreaterThan(0);
  await field.screenshot({path:'scratch/beehive-flight-deck/meadow-eco-chase.png'});
  await controls.locator('[data-flight-comfort-details] > summary').click();
  await controls.locator('[data-flight-graphics-mode]').selectOption('high');
  await expect.poll(async()=>(await plants()).flowers).toBe(1600);
  expect(await physics(page)).toEqual(held);expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.randomState)).toBe(random);
  await field.screenshot({path:'scratch/beehive-flight-deck/meadow-high-chase.png'});
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:0,y:115,z:-350,yaw:0,pitch:0});});
  await controls.locator('[data-flight-camera-toggle]').click();
  await field.screenshot({path:'scratch/beehive-flight-deck/meadow-dca-approach.png'});
  await controls.locator('[data-flight-graphics-mode]').selectOption('eco');await expect.poll(async()=>(await plants()).flowers).toBe(550);
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-frame-health','verified');
  await page.setViewportSize({width:390,height:844});await field.screenshot({path:'scratch/beehive-flight-deck/meadow-mobile.png'});
  await audit(page,'[data-flight-director]');await audit(page,'[data-beehive-touch-controls]');
});

test('Approach guide separates range and altitude, preserves paused checkpoints, and fits a narrow view',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),guide=field.locator('[data-flight-approach]');
  const redraw=async(patch:any)=>{await page.evaluate(patch=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,patch);},patch);await page.locator('[data-flight-camera-toggle]').click();};
  await redraw({phase:'flight',reachedLaunch:true,x:0,y:80,z:-550,yaw:0,pitch:0,trainingStep:5});
  const held=await physics(page);
  await expect(guide.locator('[data-approach-range]')).toHaveAttribute('data-met','true');
  await expect(guide.locator('[data-approach-height]')).toHaveAttribute('data-met','false');
  await expect(guide.locator('[data-approach-height]')).toContainText('Climb 20');
  await expect(guide.locator('[data-approach-pointer]')).toHaveCSS('left',/px$/);
  await page.waitForTimeout(300);expect(await physics(page)).toEqual(held);
  await audit(page,'[data-flight-director]');await field.screenshot({path:'scratch/beehive-flight-deck/approach-height-guide.png'});
  await redraw({y:115,z:-400});
  await expect(guide.locator('[data-approach-height]')).toHaveAttribute('data-met','true');
  await expect(guide.locator('[data-approach-range]')).toHaveAttribute('data-met','false');
  await expect(guide.locator('[data-approach-range]')).toContainText('128 model m closer');
  await redraw({y:115,z:-600});
  await expect(guide.locator('[data-approach-status]')).toHaveText('Entry conditions met');
  await expect(guide).toHaveAttribute('data-approach-recorded','false');
  expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.reachedDca)).toBe(false);
  await redraw({reachedDca:true,phase:'congregation',x:100,y:140,z:-650});
  await expect(guide.locator('[data-approach-status]')).toHaveText('DCA recorded');
  await expect(guide.locator('[data-approach-chart]')).toBeHidden();
  await expect(guide.locator('[data-approach-recorded-note]')).toContainText('queen cue');
  await field.screenshot({path:'scratch/beehive-flight-deck/approach-checkpoint.png'});
  await redraw({reachedDca:false,phase:'flight',x:0,y:80,z:-420});
  await page.setViewportSize({width:320,height:844});
  await expect.poll(()=>page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]')!.getBoundingClientRect(),d=document.querySelector('[data-flight-director]')!.getBoundingClientRect(),p=new w.THREE.Vector3(s.x,s.y,s.z).project(w.__flightCamera);return d.top-(c.top+(1-p.y)*c.height/2);})).toBeGreaterThan(38);
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const layout=await guide.evaluate(el=>{const box=el.getBoundingClientRect();return [...el.querySelectorAll('[data-approach-range],[data-approach-height],.bee-flight-altitude-strip')].every(n=>{const r=n.getBoundingClientRect();return r.left>=box.left&&r.right<=box.right+1;});});expect(layout).toBe(true);
    await audit(page,'[data-flight-director]');
    await field.screenshot({path:'scratch/beehive-flight-deck/approach-mobile-'+(dark?'dark':'light')+'.png'});
  }
  await page.emulateMedia({forcedColors:'active'});await expect(guide.locator('[data-approach-pointer]')).toBeVisible();
});

test('Updraft geometry and airflow match the lift volume without changing a paused flight',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await mount(page);
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);const field=page.locator('#beehive-drone-playfield'),readout=page.locator('[data-flight-lift]');
  const thermal=await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.thermals[0]);
  const redraw=async(patch:any)=>{await page.evaluate(patch=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,patch),patch);await page.locator('[data-flight-camera-toggle]').click();};
  await redraw({phase:'flight',reachedLaunch:true,x:thermal.x+10,y:80,z:thermal.z+170,yaw:0,pitch:0});
  const volume=await page.evaluate(()=>{const w=window as any,g=w.__flightWorld.getObjectByName('drone-updraft-0'),v=g.getObjectByName('drone-updraft-volume'),p=new w.THREE.Vector3();v.getWorldPosition(p);return {height:v.geometry.parameters.height,radiusTop:v.geometry.parameters.radiusTop,radiusBottom:v.geometry.parameters.radiusBottom,y:p.y};});
  expect(volume).toEqual({height:250,radiusTop:thermal.radius,radiusBottom:thermal.radius,y:125});
  const arrows=()=>page.evaluate(()=>{const g=(window as any).__flightWorld.getObjectByName('drone-updraft-0'),a=g.getObjectByName('drone-updraft-arrows');return {active:g.userData.liftActive,count:a.geometry.drawRange.count,points:Array.from(a.geometry.attributes.position.array).filter((_,i)=>i%3===1)};});
  const held=await physics(page),before=await arrows();expect(before.count).toBe(36);
  await page.waitForTimeout(250);expect(await physics(page)).toEqual(held);expect(await arrows()).toEqual(before);
  await expect(readout).toHaveAttribute('data-lift-state','outside');await field.screenshot({path:'scratch/beehive-flight-deck/updraft-approach.png'});
  await page.locator('[data-flight-comfort-details] > summary').click();await page.locator('[data-flight-graphics-mode]').selectOption('high');
  await expect.poll(async()=>(await arrows()).count).toBe(81);expect(await physics(page)).toEqual(held);
  await redraw({x:thermal.x,y:120,z:thermal.z,simulationClock:20});
  await expect(readout).toHaveAttribute('data-lift-state','inside');await expect(readout).toContainText('paused');expect((await arrows()).active).toBe(true);
  const still=await arrows();await redraw({simulationClock:25});expect((await arrows()).points).toEqual(still.points);
  await page.emulateMedia({reducedMotion:'no-preference'});await redraw({simulationClock:30});expect((await arrows()).points).not.toEqual(still.points);
  await page.emulateMedia({reducedMotion:'reduce'});await redraw({simulationClock:35});expect((await arrows()).points).toEqual(still.points);
  await expect(readout).toContainText('never refills energy');await audit(page,'[data-flight-lift]');
  await readout.screenshot({path:'scratch/beehive-flight-deck/updraft-feedback.png'});
  await redraw({y:250});await expect(readout).toHaveAttribute('data-lift-state','above');expect((await arrows()).active).toBe(false);
  await expect(readout).toContainText('below 250 model ft');
});

test('Updraft feedback remains readable in mobile fallback and never refills the flight reserve',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  const readout=page.locator('[data-flight-lift]'),field=page.locator('#beehive-drone-playfield');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current,t=s.thermals[0];Object.assign(s,{x:t.x,y:120,z:t.z,phase:'flight',reachedLaunch:true,vx:0,vy:0,vz:0,speed:0,obstacles:[],birds:[],drones:[],flowers:[]});});
  await page.locator('[data-flight-camera-toggle]').click();await expect(readout).toHaveAttribute('data-lift-state','inside');
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-lift]');await readout.screenshot({path:'scratch/beehive-flight-deck/updraft-mobile-'+(dark?'dark':'light')+'.png'});
  }
  const energy=(await physics(page)).energy;await page.locator('[data-beehive-flight-pause]').click();
  await expect.poll(async()=>(await physics(page)).energy).toBeLessThan(energy);
  await expect(readout.locator('[data-lift-title]')).toHaveText('Updraft adding lift');
  await page.locator('[data-beehive-flight-pause]').click();await expect(field).toHaveAttribute('data-flight-state','paused');
  await expect(readout.locator('[data-lift-title]')).toContainText('paused');
  await page.emulateMedia({forcedColors:'active'});await expect(readout).toBeVisible();
});

test('Heading and motion cues track the actual 3D camera and do not invent stationary or rearward paths',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),camera=page.locator('[data-flight-camera-toggle]');
  const refresh=async(patch:any)=>{await page.evaluate(patch=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,patch),patch);await camera.click();await camera.click();};
  await camera.click();
  await refresh({x:50,y:90,z:-250,yaw:.05,pitch:.1,roll:.15,vx:.9,vy:.15,vz:-1.8,phase:'flight',reachedLaunch:true,trainingActive:false,trainingComplete:true,windNow:{x:.4,z:0}});
  const held=await physics(page);
  async function alignment(){return page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
    const origin=new w.THREE.Vector3(s.x,s.y,s.z),heading=new w.THREE.Vector3(Math.sin(s.yaw)*Math.cos(s.pitch),Math.sin(s.pitch),-Math.cos(s.yaw)*Math.cos(s.pitch)).multiplyScalar(12).add(origin).project(w.__flightCamera),motion=new w.THREE.Vector3(s.vx,s.vy,s.vz).normalize().multiplyScalar(12).add(origin).project(w.__flightCamera);
    return {error:Math.max(Math.abs(s.flightPathCue.heading.x-(heading.x+1)*c.clientWidth/2),Math.abs(s.flightPathCue.heading.y-(1-heading.y)*c.clientHeight/2),Math.abs(s.flightPathCue.motion.x-(motion.x+1)*c.clientWidth/2),Math.abs(s.flightPathCue.motion.y-(1-motion.y)*c.clientHeight/2)),visible:s.flightPathCue.visible};});}
  expect((await alignment()).error).toBeLessThan(1);expect((await alignment()).visible).toBe(true);
  await field.screenshot({path:'scratch/beehive-flight-deck/motion-chase.png'});
  const panel=page.locator('[data-flight-motion]');await panel.locator('summary').click();
  await expect(panel.locator('[data-motion-readout="direction"]')).toContainText('right of heading');await expect(panel.locator('[data-motion-readout="vertical"]')).toHaveText('Rising');
  await audit(page,'[data-flight-motion]');await panel.screenshot({path:'scratch/beehive-flight-deck/motion-explainer.png'});
  await camera.click();expect((await alignment()).error).toBeLessThan(1);expect(await physics(page)).toEqual(held);
  await field.screenshot({path:'scratch/beehive-flight-deck/motion-cockpit.png'});
  await refresh({vx:0,vy:0,vz:2,pitch:0,yaw:0});
  expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.flightPathCue)).toMatchObject({moving:true,visible:false,motion:null});
  await refresh({vx:0,vy:0,vz:0});
  expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.flightPathCue)).toMatchObject({moving:false,visible:false,motion:null});
  await expect(panel.locator('[data-motion-readout="direction"]')).toContainText('Too little motion');
});

test('Motion comparison supports keyboard inspection and rolled mobile fallback in both themes',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  await page.evaluate(()=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,{x:0,y:80,z:-250,yaw:.2,pitch:.1,roll:.3,vx:.5,vy:.2,vz:-2,phase:'flight',trainingActive:false,trainingComplete:true,windNow:{x:-.4,z:0}}));
  await page.locator('[data-flight-camera-toggle]').click();
  const projected=await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
    const rx=s.vx*Math.cos(s.yaw)+s.vz*Math.sin(s.yaw),rz=-s.vx*Math.sin(s.yaw)+s.vz*Math.cos(s.yaw),ry=s.vy*Math.cos(s.pitch)+rz*Math.sin(s.pitch),depth=-(-s.vy*Math.sin(s.pitch)+rz*Math.cos(s.pitch)),px=rx/depth*300,py=-ry/depth*300,roll=-s.roll*.35;
    return {actual:s.flightPathCue.motion,expected:{x:c.clientWidth/2+px*Math.cos(roll)-py*Math.sin(roll),y:c.clientHeight/2+px*Math.sin(roll)+py*Math.cos(roll)}};});
  expect(projected.actual.x).toBeCloseTo(projected.expected.x,4);expect(projected.actual.y).toBeCloseTo(projected.expected.y,4);
  const held=await physics(page),panel=page.locator('[data-flight-motion]');await panel.locator('summary').focus();await page.keyboard.press('Enter');await expect(panel).toHaveJSProperty('open',true);
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-motion]');await panel.screenshot({path:'scratch/beehive-flight-deck/motion-mobile-'+(dark?'dark':'light')+'.png'});
  }
  expect(await physics(page)).toEqual(held);await page.emulateMedia({forcedColors:'active'});await expect(panel).toBeVisible();
  await panel.locator('summary').focus();await page.keyboard.press('Enter');await expect(panel).toHaveJSProperty('open',false);
});

test('Recorded 3D flight trail preserves sampled geometry, paused physics, and visibility preference',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  const camera=page.locator('[data-flight-camera-toggle]'),field=page.locator('#beehive-drone-playfield');
  await page.evaluate(()=>{
    const w=window as any,s=w.__testHooks.beehive.droneStateRef.current;
    // A recorded bend approaching the current position; no procedural trail points.
    const telemetry=Array.from({length:24},(_,i)=>{const u=i/23;return {t:i*.5,x:150*Math.sin(u*Math.PI*.8),z:-300+100*Math.cos(u*Math.PI*.8),altitude:90+25*Math.sin(u*Math.PI),energy:100-i};});
    Object.assign(s,{x:telemetry[23].x,y:90,z:telemetry[23].z,yaw:-1.2,pitch:0,roll:0,vx:-1,vy:0,vz:-1,phase:'flight',flightElapsed:11.5,telemetry,reachedLaunch:true,trainingActive:false,trainingComplete:true});
  });
  await camera.click();const held=await physics(page);
  const shape=await page.evaluate(()=>{const w=window as any,g=w.__flightWorld.getObjectByName('drone-recorded-flight-trail'),r=g.children[1],p=r.geometry.attributes.position,s=w.__testHooks.beehive.droneStateRef.current;
    r.geometry.__trailIdentity=true;
    return {visible:g.visible,count:r.geometry.drawRange.count,vertices:p.count,depthTest:r.material.depthTest,center:[(p.getX(0)+p.getX(1))/2,(p.getY(0)+p.getY(1))/2,(p.getZ(0)+p.getZ(1))/2],expected:[s.telemetry[0].x,s.telemetry[0].altitude,s.telemetry[0].z],positions:Array.from(p.array)};
  });
  expect(shape).toMatchObject({visible:true,count:23*6,vertices:30*6,depthTest:true});shape.center.forEach((v,i)=>expect(v).toBeCloseTo(shape.expected[i],4));
  await field.screenshot({path:'scratch/beehive-flight-deck/trail-chase.png'});
  const panel=page.locator('[data-flight-motion]');await panel.locator('summary').click();const toggle=panel.locator('[data-flight-trail-toggle]');
  await expect(toggle).toHaveAttribute('aria-pressed','true');await expect(panel.locator('[data-flight-trail-status]')).toContainText('24 recorded positions');await audit(page,'[data-flight-motion]');
  await panel.screenshot({path:'scratch/beehive-flight-deck/trail-learning-panel.png'});
  await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-recorded-flight-trail').visible)).toBe(false);
  await camera.click();await camera.click();expect(await physics(page)).toEqual(held);await expect(toggle).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>(window as any).__toolData.beehive.drone.showFlightTrail)).toBe(false);
  await field.focus();await page.keyboard.press('v');await page.keyboard.press('v');await expect(toggle).toHaveAttribute('aria-pressed','false');expect(await physics(page)).toEqual(held);
  await toggle.click();const returned=await page.evaluate(()=>{const r=(window as any).__flightWorld.getObjectByName('drone-trail-ribbon');return {same:r.geometry.__trailIdentity,positions:Array.from(r.geometry.attributes.position.array)};});
  expect(returned.same).toBe(true);expect(returned.positions).toEqual(shape.positions);expect(await physics(page)).toEqual(held);
  expect(errors).toEqual([]);
});

test('Recorded flight trail has a keyboard-friendly mobile fallback and never draws missing evidence',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  await page.evaluate(()=>{
    const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=(document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement).getContext('2d')!,stroke=c.stroke.bind(c);
    w.__trailStrokes=[];c.stroke=function(...args:any[]){if(c.lineWidth===2&&c.strokeStyle==='#67e8f9')w.__trailStrokes.push(c.globalAlpha);return (stroke as any)(...args);};
    Object.assign(s,{x:0,y:90,z:-250,yaw:0,pitch:0,roll:.2,phase:'flight',flightElapsed:2,telemetry:[{t:0,x:-20,altitude:70,z:-330},{t:.5,x:0,altitude:85,z:-340},{t:1,x:20,altitude:100,z:-320},{t:1.5,x:10,altitude:95,z:-290}],trainingActive:false,trainingComplete:true});
  });
  await page.locator('[data-flight-camera-toggle]').click();expect(await page.evaluate(()=>(window as any).__trailStrokes.length)).toBeGreaterThan(0);
  const held=await physics(page),panel=page.locator('[data-flight-motion]');await panel.locator('summary').focus();await page.keyboard.press('Enter');
  const toggle=panel.locator('[data-flight-trail-toggle]');
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-motion]');await panel.screenshot({path:'scratch/beehive-flight-deck/trail-mobile-'+(dark?'dark':'light')+'.png'});
  }
  await page.locator('#beehive-drone-playfield').screenshot({path:'scratch/beehive-flight-deck/trail-fallback.png'});
  await toggle.click();await page.evaluate(()=>(window as any).__trailStrokes=[]);await page.locator('[data-flight-camera-toggle]').click();
  expect(await page.evaluate(()=>(window as any).__trailStrokes.length)).toBe(0);
  await page.evaluate(()=>{const w=window as any;w.__testHooks.beehive.droneStateRef.current.telemetry=[{t:1,x:0,z:-300},{t:1.5,x:10,z:-320}];});
  await toggle.click();await expect(panel.locator('[data-flight-trail-status]')).toHaveText('Fly to record a trail.');
  expect(await page.evaluate(()=>(window as any).__trailStrokes.length)).toBe(0);expect(await physics(page)).toEqual(held);
  await page.emulateMedia({forcedColors:'active'});await expect(toggle).toBeVisible();
});

test('Open approach frames preserve the DCA volume and distinguish optional guides from recorded checkpoints',async({page})=>{
  await mount(page);const camera=page.locator('[data-flight-camera-toggle]'),field=page.locator('#beehive-drone-playfield');
  async function pose(patch:any){await page.evaluate(patch=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,patch),patch);await camera.click();await camera.click();}
  await page.evaluate(()=>{const w=window as any,c=(document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement).getContext('2d')!,fill=c.fillText.bind(c);w.__frameLabels=[];c.fillText=function(text:string,x:number,y:number,...args:any[]){w.__frameLabels.push({text,x,y,width:c.measureText(text).width});return (fill as any)(text,x,y,...args);};});
  await camera.click();await pose({x:30,y:90,z:-220,yaw:0,pitch:0,roll:0,vx:0,vy:-1,vz:-1,phase:'flight',reachedLaunch:true,reachedDca:false,trainingActive:false,trainingComplete:true});
  const labels=await page.evaluate(()=>{const all=(window as any).__frameLabels;return {guide:all.findLast((l:any)=>l.text==='GUIDE 2 · OPTIONAL'),heading:all.findLast((l:any)=>l.text==='HEADING'),motion:all.findLast((l:any)=>l.text==='MOTION')};});
  expect(labels.guide).toBeTruthy();expect(labels.heading).toBeTruthy();expect(labels.motion).toBeTruthy();
  if(Math.abs(labels.heading.x-labels.motion.x)<(labels.heading.width+labels.motion.width)/2+14)expect(Math.abs(labels.heading.y-labels.motion.y)).toBeGreaterThan(20);
  const held=await physics(page);
  async function scene(){return page.evaluate(()=>{const w=window as any,T=w.THREE,scene=w.__flightWorld;
    const frames=[1,2,3].map(i=>{const g=scene.getObjectByName('drone-approach-guide-'+i);return {position:g.position.toArray(),visible:g.visible,active:g.userData.active,opacity:g.children[1].material.opacity,count:g.children[1].geometry.attributes.position.count,scale:g.scale.toArray()};});
    const v=scene.getObjectByName('drone-dca-entry-volume'),p=v.getWorldPosition(new T.Vector3());
    return {frames,volume:{radius:v.geometry.parameters.radiusTop,height:v.geometry.parameters.height,y:p.y,z:p.z,rotation:v.parent.rotation.toArray().slice(0,3)}};
  });}
  const initial=await scene();expect(initial.frames.map(f=>f.visible)).toEqual([false,true,true]);expect(initial.frames.map(f=>f.active)).toEqual([false,true,false]);
  expect(initial.frames.every(f=>f.count===288&&f.scale.every(v=>v===1))).toBe(true);expect(initial.frames[1].position).toEqual([0,100,-300]);
  expect(initial.volume).toMatchObject({radius:72,height:30,y:115,z:-600,rotation:[0,0,0]});
  await field.screenshot({path:'scratch/beehive-flight-deck/open-guides-chase.png'});
  await page.waitForTimeout(120);await camera.click();await camera.click();expect(await scene()).toEqual(initial);expect(await physics(page)).toEqual(held);
  await camera.click();await field.screenshot({path:'scratch/beehive-flight-deck/open-guides-cockpit.png'});
  const route=page.locator('[data-flight-route-panel]');await route.locator('summary').click();await audit(page,'[data-route-scene-key]');await expect(route.locator('[data-route-scene-key]')).toContainText('Passing through one does not record a checkpoint.');
  await route.locator('[data-route-scene-key]').screenshot({path:'scratch/beehive-flight-deck/flight-scene-key.png'});
  await pose({x:0,y:100,z:-140});
  expect(await page.evaluate(()=>(window as any).__testHooks.beehive.droneStateRef.current.reachedDca)).toBe(false);await expect(route.locator('[data-route-checkpoint="dca"]')).toHaveAttribute('data-complete','false');
  await pose({reachedDca:true});expect((await scene()).frames.every(f=>!f.visible)).toBe(true);
});

test('Optional approach frames and their legend remain readable in mobile fallback and both themes',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=(document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement).getContext('2d')!,fill=c.fillText.bind(c),stroke=c.stroke.bind(c);
    w.__optionalGuideLabels=[];w.__optionalGuideStrokes=0;c.fillText=function(text:string,...args:any[]){if(text.startsWith('GUIDE '))w.__optionalGuideLabels.push(text);return (fill as any)(text,...args);};c.stroke=function(...args:any[]){if(c.strokeStyle==='#22d3ee'&&Math.abs(c.lineWidth-1.8)<.001)w.__optionalGuideStrokes++;return (stroke as any)(...args);};
    Object.assign(s,{x:0,y:90,z:-210,yaw:0,pitch:0,roll:0,phase:'flight',reachedLaunch:true,reachedDca:false,trainingActive:false,trainingComplete:true});
  });
  await page.locator('[data-flight-camera-toggle]').click();const held=await physics(page);
  expect(await page.evaluate(()=>(window as any).__optionalGuideLabels)).toContain('GUIDE 2 · OPTIONAL');expect(await page.evaluate(()=>(window as any).__optionalGuideStrokes)).toBeGreaterThan(0);
  await page.locator('#beehive-drone-playfield').screenshot({path:'scratch/beehive-flight-deck/open-guides-fallback.png'});
  const route=page.locator('[data-flight-route-panel]');await route.locator('summary').focus();await page.keyboard.press('Enter');await expect(route).toHaveJSProperty('open',true);
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page,'[data-route-scene-key]');
    await route.locator('[data-route-scene-key]').screenshot({path:'scratch/beehive-flight-deck/flight-key-mobile-'+(dark?'dark':'light')+'.png'});
  }
  expect(await physics(page)).toEqual(held);await page.emulateMedia({forcedColors:'active'});await expect(route.locator('[data-route-scene-key]')).toBeVisible();
});

test('Paused inspection cameras reveal the scene without changing flight evidence and restore the flight camera',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),canvas=page.locator('[data-beehive-drone-canvas]'),panel=page.locator('[data-flight-inspection-controls]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:115,z:-500,yaw:.2,pitch:.05,roll:.1,vx:.6,vy:.1,vz:-1,phase:'flight',reachedLaunch:true,trainingActive:false,trainingComplete:true,flightElapsed:8,telemetry:Array.from({length:16},(_,i)=>({t:i*.5,x:-70+90*i/15,z:-450-50*i/15,altitude:90+25*i/15}))});});
  await page.locator('[data-flight-camera-toggle]').click();
  const held=await physics(page),evidence=await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({telemetry:s.telemetry,randomState:s.randomState,reachedDca:s.reachedDca,decisionLog:s.decisionLog,flightElapsed:s.flightElapsed});});
  async function camera(){return page.evaluate(()=>{const w=window as any,c=w.__flightCamera;return {position:c.position.toArray(),matrix:c.matrixWorld.toArray(),fov:c.fov};});}
  const normal=await camera();await page.locator('[data-beehive-drone-webgl]').evaluate((el:any)=>el.__inspectionWorld=true);
  for(const view of ['left','right','above']){
    await panel.locator('[data-flight-inspection-view="'+view+'"]').click();await expect(canvas).toHaveAttribute('data-flight-inspection-camera',view);await expect(panel.locator('[data-flight-inspection-view="'+view+'"]')).toHaveAttribute('aria-pressed','true');
    expect(await physics(page)).toEqual(held);expect(await camera()).not.toEqual(normal);
    const projected=await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement,p=new w.THREE.Vector3(s.x+Math.sin(s.yaw)*Math.cos(s.pitch)*12,s.y+Math.sin(s.pitch)*12,s.z-Math.cos(s.yaw)*Math.cos(s.pitch)*12).project(w.__flightCamera);return {x:(p.x+1)*c.clientWidth/2,y:(1-p.y)*c.clientHeight/2,actual:s.flightPathCue.heading};});
    expect(projected.actual.x).toBeCloseTo(projected.x,4);expect(projected.actual.y).toBeCloseTo(projected.y,4);
    await field.screenshot({path:'scratch/beehive-flight-deck/inspection-'+view+'.png'});
  }
  expect(await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({telemetry:s.telemetry,randomState:s.randomState,reachedDca:s.reachedDca,decisionLog:s.decisionLog,flightElapsed:s.flightElapsed});})).toBe(evidence);
  await audit(page,'[data-flight-inspection-controls]');await panel.screenshot({path:'scratch/beehive-flight-deck/inspection-controls.png'});
  await panel.locator('[data-flight-inspection-view="flight"]').click();const restored=await camera();expect(restored.fov).toBeCloseTo(normal.fov,10);restored.position.forEach((v,i)=>expect(v).toBeCloseTo(normal.position[i],9));restored.matrix.forEach((v,i)=>expect(v).toBeCloseTo(normal.matrix[i],9));await expect(page.locator('[data-beehive-drone-webgl]')).toHaveJSProperty('__inspectionWorld',true);
  await panel.locator('[data-flight-inspection-view="above"]').click();await field.focus();await page.keyboard.press('v');await expect(canvas).toHaveAttribute('data-flight-inspection-camera','flight');await expect(canvas).toHaveAttribute('data-flight-camera','cockpit');expect(await physics(page)).toEqual(held);
  await panel.locator('[data-flight-inspection-view="left"]').click();await field.focus();await page.keyboard.press('p');await expect(field).toHaveAttribute('data-flight-state','live');await expect(panel).toBeHidden();await expect(canvas).toHaveAttribute('data-flight-inspection-camera','flight');
  await page.locator('[data-beehive-flight-pause]').click();await expect(panel.locator('[data-flight-inspection-view="flight"]')).toHaveAttribute('aria-pressed','true');
});

test('Paused inspection supports mobile keyboard controls, a clear pause badge, and a fallback route map',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page);
  const field=page.locator('#beehive-drone-playfield'),panel=page.locator('[data-flight-inspection-controls]'),held=await physics(page);
  const above=panel.locator('[data-flight-inspection-view="above"]');await above.focus();await page.keyboard.press('Enter');await expect(above).toHaveAttribute('aria-pressed','true');
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page,'[data-flight-inspection-controls]');
    await panel.screenshot({path:'scratch/beehive-flight-deck/inspection-mobile-'+(dark?'dark':'light')+'.png'});
  }
  const badge=await field.locator('[data-beehive-flight-paused-overlay]').boundingBox(),box=await field.boundingBox();expect(badge!.height).toBeLessThan(34);expect(badge!.y+badge!.height).toBeLessThan(box!.y+58);
  await field.screenshot({path:'scratch/beehive-flight-deck/inspection-mobile-scene.png'});expect(await physics(page)).toEqual(held);
  // Context loss exits inspection and offers the existing equivalent top-down map.
  await page.locator('[data-beehive-drone-webgl]').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer','canvas-2d-fallback');await expect(panel.locator('[data-flight-inspection-view]')).toHaveCount(0);
  await expect(panel).toContainText('2D flight view');await panel.locator('[data-inspection-open-map]').click();await expect(page.locator('[data-flight-route-panel]')).toHaveJSProperty('open',true);await expect(page.locator('[data-flight-route-panel] > summary')).toBeFocused();expect(await physics(page)).toEqual(held);
  await page.emulateMedia({forcedColors:'active'});await expect(panel.locator('[data-inspection-open-map]')).toBeVisible();
});

test('Height inspection frames the bee and ground with an accurate ruler and restores flight',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),panel=page.locator('[data-flight-inspection-controls]'),canvas=page.locator('[data-beehive-drone-canvas]');
  await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:115,z:-500,yaw:.2,pitch:0,roll:0,phase:'flight',reachedLaunch:true,trainingActive:false,trainingComplete:true});
    const c=(document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement).getContext('2d')!,fill=c.fillText.bind(c);w.__heightLabels=[];
    c.fillText=function(text:string,x:number,y:number,...args:any[]){if(text.includes('above ground')||text==='GROUND · 0'||text==='BEE')w.__heightLabels.push({text,x,y});return (fill as any)(text,x,y,...args);};
  });
  const held=await physics(page),evidence=await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({telemetry:s.telemetry,randomState:s.randomState,elapsed:s.flightElapsed,decisions:s.decisionLog,reachedDca:s.reachedDca});});
  const height=panel.locator('[data-flight-inspection-view="height"]');await height.click();
  await expect(canvas).toHaveAttribute('data-flight-inspection-camera','height');await expect(height).toHaveAttribute('aria-pressed','true');await expect(field.locator('[data-flight-director]')).toBeHidden();
  await expect(panel.locator('[data-inspection-height-readout]')).toContainText('115 model ft above ground');await expect(panel.locator('[data-inspection-height-readout]')).toContainText('does not measure clearance');
  const geometry=await page.evaluate(()=>{const w=window as any,g=w.__flightWorld.getObjectByName('drone-height-ground-marker');g.__retained=true;return {visible:g.visible,position:g.position.toArray(),radius:g.children[0].geometry.parameters.radius};});
  expect(geometry).toEqual({visible:true,position:[20,0,-500],radius:6});
  const projection=await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
    const p=new w.THREE.Vector3(s.x,0,s.z).project(w.__flightCamera),label=w.__heightLabels.findLast((p:any)=>p.text==='GROUND · 0');return {expectedX:(p.x+1)*c.clientWidth/2,expectedY:(1-p.y)*c.clientHeight/2+27,label};});
  expect(projection.label.x).toBeCloseTo(projection.expectedX,4);expect(projection.label.y).toBeCloseTo(projection.expectedY,4);
  expect(await physics(page)).toEqual(held);expect(await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({telemetry:s.telemetry,randomState:s.randomState,elapsed:s.flightElapsed,decisions:s.decisionLog,reachedDca:s.reachedDca});})).toBe(evidence);
  await field.screenshot({path:'scratch/beehive-flight-deck/height-desktop.png'});await audit(page,'[data-flight-inspection-controls]');
  await panel.locator('[data-flight-inspection-view="right"]').click();expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-height-ground-marker').visible)).toBe(false);
  await expect(field.locator('[data-flight-director]')).toBeVisible();await expect(panel.locator('[data-inspection-height-readout]')).toHaveCount(0);
  await height.click();expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-height-ground-marker').__retained)).toBe(true);
  await field.focus();await page.keyboard.press('p');await expect(canvas).toHaveAttribute('data-flight-inspection-camera','flight');await expect(field).toHaveAttribute('data-flight-height-inspection','false');
  expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-height-ground-marker').visible)).toBe(false);
});

test('Height inspection stays readable across mobile altitudes, themes, keyboard use, and context loss',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page);
  const field=page.locator('#beehive-drone-playfield'),panel=page.locator('[data-flight-inspection-controls]'),height=panel.locator('[data-flight-inspection-view="height"]');
  await height.focus();await page.keyboard.press('Enter');await expect(height).toHaveAttribute('aria-pressed','true');
  for(const altitude of [5,115,500]){
    await page.evaluate(y=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,{x:20,y,z:-500,yaw:.2,phase:'flight',trainingActive:false,trainingComplete:true}),altitude);
    await panel.locator('[data-flight-inspection-view="above"]').click();const held=await physics(page);await height.click();
    const bounds=await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current,c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement;
      return {height:c.clientHeight,points:[0,s.y].map(y=>{const p=new w.THREE.Vector3(s.x,y,s.z).project(w.__flightCamera);return {x:(p.x+1)*c.clientWidth/2,y:(1-p.y)*c.clientHeight/2,z:p.z};})};});
    for(const p of bounds.points){expect(p.x).toBeGreaterThan(50);expect(p.x).toBeLessThan(270);expect(p.y).toBeGreaterThan(72);expect(p.y).toBeLessThan(bounds.height-110);expect(p.z).toBeLessThan(1);}
    expect(await physics(page)).toEqual(held);await expect(panel.locator('[data-inspection-height-readout]')).toContainText(altitude+' model ft above ground');
    await field.screenshot({path:'scratch/beehive-flight-deck/height-mobile-'+altitude+'.png'});
  }
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page,'[data-flight-inspection-controls]');
    await panel.screenshot({path:'scratch/beehive-flight-deck/height-controls-'+(dark?'dark':'light')+'.png'});
  }
  await page.emulateMedia({forcedColors:'active'});await expect(height).toBeVisible();await expect(panel.locator('[data-inspection-height-readout]')).toBeVisible();
  const held=await physics(page);await page.locator('[data-beehive-drone-webgl]').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(height).toHaveCount(0);await expect(panel.locator('[data-inspection-height-readout]')).toHaveCount(0);await expect(field).toHaveAttribute('data-flight-height-inspection','false');
  await panel.locator('[data-inspection-open-map]').click();await expect(page.locator('[data-flight-route-panel]')).toHaveJSProperty('open',true);expect(await physics(page)).toEqual(held);
});

test('Ecological meadow layers retain each habitat in Eco and show correctly oriented bee-eaters',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:95,y:58,z:-400,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});Object.assign(s.birds[0],{x:65,y:62,z:-430,vx:1,vy:0,vz:-1,wingPhase:.2});});
  await page.locator('[data-flight-inspection-view="height"]').click();const held=await physics(page);
  const before=await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current;return JSON.stringify({randomState:s.randomState,obstacles:s.obstacles,birds:s.birds,flowers:s.flowers,telemetry:s.telemetry});});
  const batches=await page.evaluate(()=>{const a:any[]=[];(window as any).__flightWorld.traverse((o:any)=>{if(o.name.startsWith('drone-habitat-')){o.geometry.__ecologyRetained=true;a.push({name:o.name,count:o.count,full:o.userData.fullCount});}});return a;});
  expect(batches).toHaveLength(7);expect(batches.every(b=>b.count===Math.floor(b.full*.4)&&b.count>0)).toBe(true);
  const bird=await page.evaluate(()=>{const w=window as any,g=w.__flightWorld.getObjectByName('drone-bee-eater-0'),s=w.__testHooks.beehive.droneStateRef.current.birds[0],f=new w.THREE.Vector3(0,0,-1).applyQuaternion(g.quaternion),v=new w.THREE.Vector3(s.vx,0,s.vz).normalize();return {alignment:f.dot(v),position:g.position.toArray(),wings:g.children.filter((c:any)=>c.type==='Group').map((c:any)=>c.rotation.z)};});
  expect(bird.alignment).toBeCloseTo(1,6);expect(bird.position).toEqual([65,62,-430]);
  await field.screenshot({path:'scratch/beehive-flight-deck/ecology-meadow-eco.png'});
  await page.locator('[data-flight-comfort-details] > summary').click();await page.locator('[data-flight-graphics-mode]').selectOption('high');
  expect(await page.evaluate(()=>{let ok=true;(window as any).__flightWorld.traverse((o:any)=>{if(o.name.startsWith('drone-habitat-'))ok=ok&&o.count===o.userData.fullCount&&o.geometry.__ecologyRetained;});return ok;})).toBe(true);
  await field.screenshot({path:'scratch/beehive-flight-deck/ecology-meadow-high.png'});
  expect(await physics(page)).toEqual(held);expect(await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({randomState:s.randomState,obstacles:s.obstacles,birds:s.birds,flowers:s.flowers,telemetry:s.telemetry});})).toBe(before);
  // Reeds follow the visible stream rather than a second, unrelated water course.
  await page.evaluate(()=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,{x:-290,y:45,z:-520}));await page.locator('[data-flight-inspection-view="right"]').click();await page.locator('[data-flight-inspection-view="height"]').click();
  await field.screenshot({path:'scratch/beehive-flight-deck/ecology-stream.png'});
  await page.evaluate(()=>Object.assign((window as any).__testHooks.beehive.droneStateRef.current,{x:20,y:115,z:-500}));await page.locator('[data-flight-inspection-view="above"]').click();await page.locator('[data-flight-inspection-view="height"]').click();await field.screenshot({path:'scratch/beehive-flight-deck/ecology-meadow-overview.png'});
  const guide=page.locator('[data-flight-ecology]');await guide.locator('summary').click();await expect(guide).toContainText('A successful capture kills the prey.');await expect(guide).toContainText('15 energy units');await audit(page,'[data-flight-ecology]');
});

test('Ecology field guide pauses flight and remains accessible with mobile fallback',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page,true);
  const field=page.locator('#beehive-drone-playfield'),guide=page.locator('[data-flight-ecology]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:0,y:40,z:-320,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});Object.assign(s.birds[0],{x:15,y:46,z:-410,vx:0,vz:-1});});
  await page.locator('[data-flight-camera-toggle]').click();await field.screenshot({path:'scratch/beehive-flight-deck/ecology-fallback.png'});
  await page.locator('[data-beehive-flight-pause]').click();await expect(field).toHaveAttribute('data-flight-state','live');
  await guide.locator('summary').focus();await page.keyboard.press('Enter');await expect(field).toHaveAttribute('data-flight-state','paused');const held=await physics(page);
  await expect(guide.locator('[data-ecology-predator-readout]')).toContainText('Paused observation');
  for(const dark of [false,true]){
    await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await audit(page,'[data-flight-ecology]');await guide.screenshot({path:'scratch/beehive-flight-deck/ecology-guide-'+(dark?'dark':'light')+'.png'});
  }
  expect(await physics(page)).toEqual(held);await page.emulateMedia({forcedColors:'active'});await expect(guide.getByRole('link',{name:'RSPB: bee-eaters'})).toBeVisible();
});

test('Predator contact remains a practice encounter with recorded maneuver evidence',async({page})=>{
  await mount(page,false,'steps');const panel=page.locator('[data-flight-decision-panel]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:0,y:80,z:-350,vx:0,vy:0,vz:0,speed:0,yaw:0,pitch:0,roll:0,phase:'flight',reachedLaunch:true,energy:90,score:30,obstacles:[],flowers:[],drones:[],thermals:[],wind:{x:0,z:0,phase:0},windNow:{x:0,z:0},trainingActive:false,trainingComplete:true});s.birds.forEach((b:any,i:number)=>Object.assign(b,{x:i?1000:0,y:i?500:80,z:i?-2000:-350,vx:0,vy:0,vz:0}));});
  await panel.locator('input[value="climb"]').check();await panel.locator('[data-flight-advance-decision]').click();
  const after=await physics(page);expect(after.score).toBe(20);expect(after.energy).toBeLessThan(76);expect(after.energy).toBeGreaterThan(0);expect(after.phase).not.toBe('end');expect(after.decisions).toBe(1);
  await expect(page.locator('[data-flight-ecology]')).toContainText('practice encounters');
  await expect(page.locator('[data-flight-ecology]')).toContainText('advance a short climb');
});

test('Wildlife observer frames an existing bee-eater without moving animals and restores the flight camera',async({page})=>{
  await mount(page);const field=page.locator('#beehive-drone-playfield'),canvas=page.locator('[data-beehive-drone-canvas]'),panel=page.locator('[data-flight-inspection-controls]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:115,z:-500,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});s.birds.forEach((b:any,i:number)=>Object.assign(b,{x:i?1000:65,y:i?180:100,z:i?-1800:-550,vx:1,vy:0,vz:-1,wingPhase:.3}));});
  await page.locator('[data-flight-camera-toggle]').click();const held=await physics(page);
  async function evidence(){return page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({birds:s.birds,telemetry:s.telemetry,randomState:s.randomState,elapsed:s.flightElapsed,decisions:s.decisionLog});});}
  async function camera(){return page.evaluate(()=>{const c=(window as any).__flightCamera;return {position:c.position.toArray(),matrix:c.matrixWorld.toArray(),fov:c.fov};});}
  const before=await evidence(),normal=await camera();await page.locator('[data-beehive-drone-webgl]').evaluate((c:any)=>c.__observerRetained=true);
  await panel.locator('[data-flight-inspection-view="bird"]').click();await expect(canvas).toHaveAttribute('data-flight-inspection-camera','bird');await expect(field).toHaveAttribute('data-flight-bird-inspection','true');await expect(field.locator('[data-flight-director]')).toBeHidden();
  await expect(panel.locator('[data-inspection-bird-readout]')).toContainText('Observing bee-eater 1');await expect(panel.locator('[data-inspection-bird-readout]')).toContainText('Only the camera has moved');
  const projection=await page.evaluate(()=>{const w=window as any,T=w.THREE,g=w.__flightWorld.getObjectByName('drone-bee-eater-0'),p=g.getWorldPosition(new T.Vector3()).project(w.__flightCamera);return {x:p.x,y:p.y,world:g.position.toArray(),alert:g.children.at(-1).visible};});
  expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-dca-entry-volume').parent.visible)).toBe(false);
  expect(projection).toMatchObject({world:[65,100,-550],alert:false});expect(projection.x).toBeCloseTo(0,8);expect(projection.y).toBeCloseTo(0,8);
  expect(await physics(page)).toEqual(held);expect(await evidence()).toBe(before);await field.screenshot({path:'scratch/beehive-flight-deck/wildlife-observer-desktop.png'});await audit(page,'[data-flight-inspection-controls]');
  await panel.locator('[data-flight-inspection-view="flight"]').click();const restored=await camera();expect(restored.fov).toBeCloseTo(normal.fov,9);restored.position.forEach((v,i)=>expect(v).toBeCloseTo(normal.position[i],9));restored.matrix.forEach((v,i)=>expect(v).toBeCloseTo(normal.matrix[i],9));await expect(field.locator('[data-flight-director]')).toBeVisible();expect(await physics(page)).toEqual(held);
  expect(await page.evaluate(()=>(window as any).__flightWorld.getObjectByName('drone-dca-entry-volume').parent.visible)).toBe(true);
  const guide=page.locator('[data-flight-ecology]');await guide.locator('summary').click();await guide.locator('[data-ecology-observe-bird]').click();await expect(field).toBeFocused();await expect(canvas).toHaveAttribute('data-flight-inspection-camera','bird');await expect(page.locator('[data-beehive-drone-webgl]')).toHaveJSProperty('__observerRetained',true);expect(await evidence()).toBe(before);
  await page.keyboard.press('p');await expect(field).toHaveAttribute('data-flight-state','live');await expect(canvas).toHaveAttribute('data-flight-inspection-camera','flight');await expect(field).toHaveAttribute('data-flight-bird-inspection','false');
  await page.locator('[data-beehive-flight-pause]').click();await expect(panel.locator('[data-flight-inspection-view="flight"]')).toHaveAttribute('aria-pressed','true');
});

test('Wildlife observer fits a mobile screen, handles missing subjects, and falls back accessibly',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page);
  const field=page.locator('#beehive-drone-playfield'),panel=page.locator('[data-flight-inspection-controls]'),button=panel.locator('[data-flight-inspection-view="bird"]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:80,z:-400,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});s.birds.forEach((b:any,i:number)=>Object.assign(b,{x:i?900:55,y:i?150:90,z:i?-1400:-490,vx:1,vz:-1}));});
  await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');const held=await physics(page);
  const bounds=await page.evaluate(()=>{const w=window as any,T=w.THREE,g=w.__flightWorld.getObjectByName('drone-bee-eater-0'),box=new T.Box3().setFromObject(g),c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement,points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(w.__flightCamera);points.push({x:(p.x+1)*c.clientWidth/2,y:(1-p.y)*c.clientHeight/2});}return {width:c.clientWidth,height:c.clientHeight,points};});
  for(const p of bounds.points){expect(p.x).toBeGreaterThan(18);expect(p.x).toBeLessThan(bounds.width-18);expect(p.y).toBeGreaterThan(100);expect(p.y).toBeLessThan(bounds.height-110);}
  await field.screenshot({path:'scratch/beehive-flight-deck/wildlife-observer-mobile.png'});
  for(const dark of [false,true]){await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page,'[data-flight-inspection-controls]');await panel.screenshot({path:'scratch/beehive-flight-deck/wildlife-controls-'+(dark?'dark':'light')+'.png'});}
  expect(await physics(page)).toEqual(held);await page.emulateMedia({forcedColors:'active'});await expect(button).toBeVisible();
  // A lost subject exits observation, instead of leaving an empty special view.
  await page.evaluate(()=>{const w=window as any,s=w.__testHooks.beehive.droneStateRef.current;w.__observerBirds=s.birds;s.birds=[];});
  await button.click();await page.setViewportSize({width:330,height:844});await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-inspection-camera','flight');await expect(button).toBeDisabled();await expect(field).toHaveAttribute('data-flight-bird-inspection','false');
  await page.evaluate(()=>{const w=window as any;w.__testHooks.beehive.droneStateRef.current.birds=w.__observerBirds;});await page.locator('[data-flight-camera-toggle]').click();await expect(button).toBeEnabled();await button.click();
  await page.locator('[data-beehive-drone-webgl]').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer','canvas-2d-fallback');await expect(button).toHaveCount(0);await expect(panel.locator('[data-inspection-bird-readout]')).toHaveCount(0);await expect(field).toHaveAttribute('data-flight-bird-inspection','false');await expect(page.locator('[data-ecology-observe-bird]')).toHaveCount(0);
  expect(await physics(page)).toEqual(held);await panel.locator('[data-inspection-open-map]').click();await expect(page.locator('[data-flight-route-panel]')).toHaveJSProperty('open',true);
});

test('Plant observer frames existing complete Eco clumps and preserves flight evidence across quality changes',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  const field=page.locator('#beehive-drone-playfield'),canvas=page.locator('[data-beehive-drone-canvas]'),panel=page.locator('[data-flight-inspection-controls]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:80,z:-500,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});});
  await page.locator('[data-flight-camera-toggle]').click();
  const held=await physics(page);
  async function evidence(){return page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({birds:s.birds,obstacles:s.obstacles,telemetry:s.telemetry,randomState:s.randomState,elapsed:s.flightElapsed,decisions:s.decisionLog});});}
  async function camera(){return page.evaluate(()=>{const c=(window as any).__flightCamera;return {position:c.position.toArray(),matrix:c.matrixWorld.toArray(),fov:c.fov};});}
  async function aids(){return page.evaluate(()=>{const result:any[]=[];(window as any).__flightWorld.traverse((node:any)=>{if(/^drone-(depth-marker|updraft)-\d+$/.test(node.name))result.push({name:node.name,visible:node.visible});});return result;});}
  const normalAids=await aids();expect(normalAids.some(a=>a.visible)).toBe(true);
  const before=await evidence(),normal=await camera();await page.locator('[data-beehive-drone-webgl]').evaluate((c:any)=>c.__plantWorldRetained=true);
  async function checkSubject(kind:string){
    await expect(canvas).toHaveAttribute('data-flight-inspection-camera',kind);
    const data=await page.evaluate(kind=>{
      const w=window as any,T=w.THREE,s=w.__testHooks.beehive.droneStateRef.current,BH=w.__RR_TEST_EXPORTS__.beehive,subject=BH.bhDronePlantSubject(s,kind),p=new T.Vector3(subject.point.x,subject.point.y,subject.point.z).project(w.__flightCamera);
      const names=kind==='shrub'?[['shrub-leaves',5],['shrub-flowers',15]]:kind==='grass'?[['seed-grasses',3],['seed-heads',3]]:[['reed-stems',3],['reed-heads',3],['reed-leaves',3]];
      const batches=names.map(([name,n])=>{const mesh=w.__flightWorld.getObjectByName('drone-habitat-'+name);return {name,count:mesh.count,last:(subject.kindIndex+1)*(n as number)};});
      const indexed=Number(document.querySelector('[data-beehive-drone-canvas]')!.getAttribute('data-flight-inspection-plant-index'));
      return {index:subject.index,indexed,x:p.x,y:p.y,batches};
    },kind);
    expect(data.indexed).toBe(data.index);expect(data.x).toBeCloseTo(0,7);expect(data.y).toBeCloseTo(0,7);for(const b of data.batches)expect(b.last).toBeLessThanOrEqual(b.count);
    await expect(panel.locator('[data-inspection-plant-readout]')).toHaveAttribute('data-inspection-plant-readout',kind);await expect(panel.locator('[data-inspection-plant-readout]')).toContainText('Plants do not refuel this male drone');
  }
  for(const kind of ['shrub','grass','reed']){
    await panel.locator('[data-flight-inspection-view="'+kind+'"]').click();await checkSubject(kind);
    await expect(field).toHaveAttribute('data-flight-plant-inspection','true');await expect(field.locator('[data-flight-director]')).toBeHidden();expect((await aids()).every(a=>!a.visible)).toBe(true);
    expect(await page.evaluate(()=>{const mesh=(window as any).__flightWorld.getObjectByName('drone-habitat-shrub-flowers');return mesh.material.vertexColors && mesh.geometry.attributes.color.count===mesh.geometry.attributes.position.count;})).toBe(true);
    expect(await physics(page)).toEqual(held);expect(await evidence()).toBe(before);
    await field.screenshot({path:'scratch/beehive-flight-deck/plant-observer-'+kind+'-desktop.png'});
  }
  await page.locator('[data-flight-comfort-details] > summary').click();await page.locator('[data-flight-graphics-mode]').selectOption('high');await checkSubject('reed');
  await page.locator('[data-flight-graphics-mode]').selectOption('eco');await checkSubject('reed');await expect(page.locator('[data-beehive-drone-webgl]')).toHaveJSProperty('__plantWorldRetained',true);
  await audit(page,'[data-flight-inspection-controls]');expect(await physics(page)).toEqual(held);expect(await evidence()).toBe(before);
  await panel.locator('[data-flight-inspection-view="flight"]').click();const restored=await camera();expect(restored.fov).toBeCloseTo(normal.fov,9);restored.position.forEach((v,i)=>expect(v).toBeCloseTo(normal.position[i],9));restored.matrix.forEach((v,i)=>expect(v).toBeCloseTo(normal.matrix[i],9));
  expect(await aids()).toEqual(normalAids);
  const guide=page.locator('[data-flight-ecology]');await guide.locator('summary').click();await guide.locator('[data-ecology-observe-plant="shrub"]').click();await expect(field).toBeFocused();await checkSubject('shrub');expect(await evidence()).toBe(before);
  await page.keyboard.press('p');await expect(field).toHaveAttribute('data-flight-state','live');await expect(canvas).toHaveAttribute('data-flight-inspection-camera','flight');await expect(field).toHaveAttribute('data-flight-plant-inspection','false');expect(errors).toEqual([]);
});

test('Plant observer fits mobile views and offers accessible controls with safe context-loss recovery',async({page})=>{
  await page.setViewportSize({width:320,height:844});await mount(page);
  const field=page.locator('#beehive-drone-playfield'),panel=page.locator('[data-flight-inspection-controls]'),canvas=page.locator('[data-beehive-drone-canvas]');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:80,z:-500,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});});
  await page.locator('[data-flight-camera-toggle]').click();const held=await physics(page);
  for(const kind of ['shrub','grass','reed']){
    const button=panel.locator('[data-flight-inspection-view="'+kind+'"]');await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');
    const bounds=await page.evaluate(kind=>{const w=window as any,T=w.THREE,s=w.__testHooks.beehive.droneStateRef.current,subject=w.__RR_TEST_EXPORTS__.beehive.bhDronePlantSubject(s,kind),c=document.querySelector('[data-beehive-drone-canvas]') as HTMLCanvasElement,points=[];
      for(const x of [-subject.width*1.8,subject.width*1.8])for(const y of [0,subject.height])for(const z of [-subject.width*1.8,subject.width*1.8]){const p=new T.Vector3(subject.point.x+x,y,subject.point.z+z).project(w.__flightCamera);points.push({x:(p.x+1)*c.clientWidth/2,y:(1-p.y)*c.clientHeight/2});}return {width:c.clientWidth,height:c.clientHeight,points};},kind);
    for(const p of bounds.points){expect(p.x).toBeGreaterThan(18);expect(p.x).toBeLessThan(bounds.width-18);expect(p.y).toBeGreaterThan(105);expect(p.y).toBeLessThan(bounds.height-105);}
    await field.screenshot({path:'scratch/beehive-flight-deck/plant-observer-'+kind+'-mobile.png'});expect(await physics(page)).toEqual(held);
  }
  for(const dark of [false,true]){await page.evaluate(dark=>{const w=window as any;w.__ctx.isDark=dark;w.__rerender();},dark);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(1);await audit(page,'[data-flight-inspection-controls]');await panel.screenshot({path:'scratch/beehive-flight-deck/plant-controls-'+(dark?'dark':'light')+'.png'});}
  const guide=page.locator('[data-flight-ecology]');await guide.locator('summary').click();await audit(page,'[data-flight-ecology]');await page.emulateMedia({forcedColors:'active'});await expect(panel.locator('[data-flight-inspection-view="reed"]')).toBeVisible();
  await page.locator('[data-beehive-drone-webgl]').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(canvas).toHaveAttribute('data-flight-renderer','canvas-2d-fallback');await expect(panel.locator('.bee-inspection-plants')).toHaveCount(0);await expect(panel.locator('[data-inspection-plant-readout]')).toHaveCount(0);await expect(field).toHaveAttribute('data-flight-plant-inspection','false');await expect(page.locator('[data-ecology-observe-plant]')).toHaveCount(0);expect(await physics(page)).toEqual(held);
  await panel.locator('[data-inspection-open-map]').click();await expect(page.locator('[data-flight-route-panel]')).toHaveJSProperty('open',true);
});

test('Natural foliage uses retained curved meshes and shoreline detail without altering the flight',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await mount(page);
  const field=page.locator('#beehive-drone-playfield');
  await page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;Object.assign(s,{x:20,y:80,z:-500,yaw:0,pitch:0,roll:0,phase:'flight',trainingActive:false,trainingComplete:true});});
  await page.locator('[data-flight-camera-toggle]').click();const held=await physics(page);
  async function evidence(){return page.evaluate(()=>{const s=(window as any).__testHooks.beehive.droneStateRef.current;return JSON.stringify({randomState:s.randomState,birds:s.birds,obstacles:s.obstacles,flowers:s.flowers,telemetry:s.telemetry,decisions:s.decisionLog});});}
  const before=await evidence();
  const geometry=await page.evaluate(()=>{
    const w=window as any,names=['drone-habitat-shrub-leaves','drone-habitat-seed-grasses','drone-habitat-reed-leaves','drone-habitat-seed-heads'];
    const result=names.map(name=>{const node=w.__flightWorld.getObjectByName(name),g=node.geometry;g.__naturalFoliageRetained=true;return {name,vertices:g.attributes.position.count,colored:g.attributes.color.count===g.attributes.position.count&&node.material.vertexColors,finite:[...g.attributes.normal.array].every(Number.isFinite)};});
    const stones=w.__flightWorld.getObjectByName('drone-stream-pebbles'),bank=w.__flightWorld.getObjectByName('drone-stream-shrubs');stones.geometry.__naturalStonesRetained=true;
    return {meshes:result,stones:stones.count,bankShrubs:bank.count,sharedCanopy:bank.geometry===w.__flightWorld.getObjectByName('drone-habitat-shrub-leaves').geometry,sharedGrass:w.__flightWorld.getObjectByName('drone-meadow-blades').geometry===w.__flightWorld.getObjectByName('drone-habitat-seed-grasses').geometry};
  });
  expect(geometry).toMatchObject({stones:280,bankShrubs:160,sharedCanopy:true,sharedGrass:true});expect(geometry.meshes.every(g=>g.vertices>30&&g.colored&&g.finite)).toBe(true);
  for(const kind of ['shrub','grass','reed']){
    await page.locator('[data-flight-inspection-view="'+kind+'"]').click();await field.screenshot({path:'scratch/beehive-flight-deck/natural-foliage-'+kind+'.png'});
    expect(await physics(page)).toEqual(held);expect(await evidence()).toBe(before);
  }
  await page.locator('[data-flight-comfort-details] > summary').click();await page.locator('[data-flight-graphics-mode]').selectOption('high');
  expect(await page.evaluate(()=>{const w=window as any;return ['drone-habitat-shrub-leaves','drone-habitat-seed-grasses','drone-habitat-reed-leaves','drone-habitat-seed-heads'].every(name=>{const node=w.__flightWorld.getObjectByName(name);return node.geometry.__naturalFoliageRetained&&node.count===node.userData.fullCount;})&&w.__flightWorld.getObjectByName('drone-stream-pebbles').geometry.__naturalStonesRetained;})).toBe(true);
  await page.locator('[data-flight-graphics-mode]').selectOption('eco');await page.locator('[data-flight-inspection-view="flight"]').click();await field.screenshot({path:'scratch/beehive-flight-deck/natural-foliage-flight.png'});
  expect(await physics(page)).toEqual(held);expect(await evidence()).toBe(before);expect(errors).toEqual([]);
});
