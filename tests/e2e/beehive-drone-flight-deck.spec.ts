import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_beehive.js',toolId:'beehive',preScripts:['stem_lab/stem_lab_module.js'],appStyles:true,width:1280,height:1000,probes:'window.__testHooks={};',extraScripts:['node_modules/axe-core/axe.min.js']});
test.describe.configure({timeout:180000});test.use({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
test.beforeAll(async()=>{mkdirSync('scratch/beehive-flight-deck',{recursive:true});await harness.start();});
test.beforeEach(async({page})=>{page.on('pageerror',e=>console.log('FLIGHT_PAGE_ERROR',e.message));});
test.afterAll(()=>harness.stop());test.afterEach(async({page})=>{await harness.destroy(page);});
async function mount(page:any, fallback=false, pacing='live') {
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
